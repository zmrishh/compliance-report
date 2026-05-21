import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import {
  accessReviewCampaigns,
  accessReviewItems,
  rawFacts,
  workspaces,
} from '@compliance/db';
import type { DbClient } from '@compliance/db';
import {
  ACCESS_REVIEW_DECISION,
  ACCESS_REVIEW_STATUS,
  AUDIT_ACTION,
  CONNECTOR_TYPE,
} from '@compliance/shared';
import type { CreateAccessReviewCampaignDto, ReviewItemDto } from '@compliance/shared';

import { DB_CLIENT } from '../database/database.module.js';
import { AuditService } from '../audit/audit.service.js';

@Injectable()
export class AccessReviewService {
  constructor(
    @Inject(DB_CLIENT) private readonly db: DbClient,
    private readonly auditService: AuditService,
  ) {}

  async createCampaign(
    dto: CreateAccessReviewCampaignDto,
    workspaceId: string,
    orgId: string,
    userId: string,
  ) {
    const [workspace] = await this.db
      .select({ id: workspaces.id })
      .from(workspaces)
      .where(and(eq(workspaces.id, workspaceId), eq(workspaces.orgId, orgId)))
      .limit(1);
    if (!workspace) throw new NotFoundException('Workspace not found');

    const [campaign] = await this.db
      .insert(accessReviewCampaigns)
      .values({
        workspaceId,
        orgId,
        name: dto.name,
        connectorType: dto.connectorType,
        dueDate: new Date(dto.dueDate),
        createdBy: userId,
      })
      .returning();

    // Populate review items from the latest raw facts for the selected connector
    await this.populateItems(campaign!.id, workspaceId, dto.connectorType);

    await this.auditService.record({
      actorId: userId,
      orgId,
      action: AUDIT_ACTION.ACCESS_REVIEW_CREATED,
      resourceType: 'access_review_campaign',
      resourceId: campaign!.id,
      metadata: { workspaceId, connectorType: dto.connectorType },
    });

    return campaign!;
  }

  private async populateItems(
    campaignId: string,
    workspaceId: string,
    connectorType: string,
  ) {
    const entityType =
      connectorType === CONNECTOR_TYPE.GOOGLE_WORKSPACE
        ? 'google:user:directory'
        : 'okta:user:directory';

    const facts = await this.db
      .select()
      .from(rawFacts)
      .where(eq(rawFacts.entityType, entityType))
      .orderBy(rawFacts.collectedAt);

    if (facts.length === 0) return;

    // Deduplicate by entityId (keep most recent)
    const byId = new Map<string, typeof facts[number]>();
    for (const f of facts) {
      byId.set(f.entityId, f);
    }

    const itemValues = Array.from(byId.values())
      .filter((f) => {
        const data = f.data as { suspended?: boolean; status?: string };
        if (connectorType === CONNECTOR_TYPE.GOOGLE_WORKSPACE) return !data.suspended;
        return data.status === 'ACTIVE';
      })
      .map((f) => {
        const data = f.data as {
          email?: string;
          login?: string;
          name?: string;
          firstName?: string;
          lastName?: string;
          isAdmin?: boolean;
          status?: string;
        };
        const email = (data.email ?? data.login) ?? '';
        const nameParts = `${data.firstName ?? ''} ${data.lastName ?? ''}`.trim();
        const displayName = data.name ?? (nameParts || email);
        const accessLevel = data.isAdmin ? 'admin' : 'member';

        return {
          campaignId,
          workspaceId,
          userIdExternal: f.entityId,
          userEmail: email,
          userDisplayName: displayName,
          accessLevel,
        };
      });

    if (itemValues.length > 0) {
      await this.db.insert(accessReviewItems).values(itemValues);
    }
  }

  async listCampaigns(workspaceId: string, orgId: string) {
    await this.assertWorkspaceAccess(workspaceId, orgId);
    return this.db
      .select()
      .from(accessReviewCampaigns)
      .where(
        and(
          eq(accessReviewCampaigns.workspaceId, workspaceId),
          eq(accessReviewCampaigns.orgId, orgId),
        ),
      );
  }

  async getCampaignWithItems(campaignId: string, workspaceId: string, orgId: string) {
    const [campaign] = await this.db
      .select()
      .from(accessReviewCampaigns)
      .where(
        and(
          eq(accessReviewCampaigns.id, campaignId),
          eq(accessReviewCampaigns.workspaceId, workspaceId),
          eq(accessReviewCampaigns.orgId, orgId),
        ),
      )
      .limit(1);

    if (!campaign) throw new NotFoundException('Campaign not found');

    const items = await this.db
      .select()
      .from(accessReviewItems)
      .where(eq(accessReviewItems.campaignId, campaignId));

    const total = items.length;
    const reviewed = items.filter((i) => i.decision !== ACCESS_REVIEW_DECISION.PENDING).length;

    return { ...campaign, items, progress: { total, reviewed } };
  }

  async reviewItem(
    itemId: string,
    campaignId: string,
    workspaceId: string,
    orgId: string,
    dto: ReviewItemDto,
    reviewerId: string,
  ) {
    const campaign = await this.getCampaignById(campaignId, workspaceId, orgId);

    if (campaign.status !== ACCESS_REVIEW_STATUS.OPEN) {
      throw new ConflictException('Campaign is not open for review');
    }

    const [item] = await this.db
      .select()
      .from(accessReviewItems)
      .where(
        and(eq(accessReviewItems.id, itemId), eq(accessReviewItems.campaignId, campaignId)),
      )
      .limit(1);

    if (!item) throw new NotFoundException('Review item not found');

    const [updated] = await this.db
      .update(accessReviewItems)
      .set({
        decision: dto.decision,
        notes: dto.notes ?? null,
        reviewerId,
        reviewedAt: new Date(),
      })
      .where(eq(accessReviewItems.id, itemId))
      .returning();

    return updated!;
  }

  async completeCampaign(campaignId: string, workspaceId: string, orgId: string, userId: string) {
    const campaign = await this.getCampaignById(campaignId, workspaceId, orgId);

    if (campaign.status !== ACCESS_REVIEW_STATUS.OPEN) {
      throw new ConflictException('Campaign is already closed');
    }

    // Expire any still-pending items
    await this.db
      .update(accessReviewItems)
      .set({ decision: 'revoked', notes: 'Auto-revoked on campaign completion' })
      .where(
        and(
          eq(accessReviewItems.campaignId, campaignId),
          eq(accessReviewItems.decision, ACCESS_REVIEW_DECISION.PENDING),
        ),
      );

    const [updated] = await this.db
      .update(accessReviewCampaigns)
      .set({
        status: ACCESS_REVIEW_STATUS.COMPLETED,
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(accessReviewCampaigns.id, campaignId))
      .returning();

    await this.auditService.record({
      actorId: userId,
      orgId,
      action: AUDIT_ACTION.ACCESS_REVIEW_COMPLETED,
      resourceType: 'access_review_campaign',
      resourceId: campaignId,
      metadata: { workspaceId },
    });

    return updated!;
  }

  private async getCampaignById(campaignId: string, workspaceId: string, orgId: string) {
    const [campaign] = await this.db
      .select()
      .from(accessReviewCampaigns)
      .where(
        and(
          eq(accessReviewCampaigns.id, campaignId),
          eq(accessReviewCampaigns.workspaceId, workspaceId),
          eq(accessReviewCampaigns.orgId, orgId),
        ),
      )
      .limit(1);
    if (!campaign) throw new NotFoundException('Campaign not found');
    return campaign;
  }

  private async assertWorkspaceAccess(workspaceId: string, orgId: string) {
    const [ws] = await this.db
      .select({ id: workspaces.id })
      .from(workspaces)
      .where(and(eq(workspaces.id, workspaceId), eq(workspaces.orgId, orgId)))
      .limit(1);
    if (!ws) throw new NotFoundException('Workspace not found');
  }
}
