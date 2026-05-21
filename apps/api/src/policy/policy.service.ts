import {
  Inject,
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { policies, policyVersions, workspaces } from '@compliance/db';
import type { DbClient } from '@compliance/db';
import { AUDIT_ACTION, POLICY_STATUS } from '@compliance/shared';
import type { CreatePolicyDto, UpdatePolicyDto } from '@compliance/shared';

import { DB_CLIENT } from '../database/database.module.js';
import { AuditService } from '../audit/audit.service.js';

@Injectable()
export class PolicyService {
  constructor(
    @Inject(DB_CLIENT) private readonly db: DbClient,
    private readonly auditService: AuditService,
  ) {}

  async create(
    dto: CreatePolicyDto,
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

    const [policy] = await this.db
      .insert(policies)
      .values({
        workspaceId,
        orgId,
        controlId: dto.controlId ?? null,
        title: dto.title,
        type: dto.type,
        status: POLICY_STATUS.DRAFT,
        version: 1,
        content: dto.content,
        createdBy: userId,
      })
      .returning();

    // Create initial version snapshot
    await this.db.insert(policyVersions).values({
      policyId: policy!.id,
      version: 1,
      content: dto.content,
      status: POLICY_STATUS.DRAFT,
      createdBy: userId,
    });

    return policy!;
  }

  async list(workspaceId: string, orgId: string) {
    await this.assertWorkspaceAccess(workspaceId, orgId);
    return this.db
      .select()
      .from(policies)
      .where(
        and(
          eq(policies.workspaceId, workspaceId),
          eq(policies.orgId, orgId),
        ),
      )
      .orderBy(desc(policies.updatedAt));
  }

  async get(policyId: string, workspaceId: string, orgId: string) {
    const [policy] = await this.db
      .select()
      .from(policies)
      .where(
        and(
          eq(policies.id, policyId),
          eq(policies.workspaceId, workspaceId),
          eq(policies.orgId, orgId),
        ),
      )
      .limit(1);
    if (!policy) throw new NotFoundException('Policy not found');
    return policy;
  }

  async update(
    policyId: string,
    dto: UpdatePolicyDto,
    workspaceId: string,
    orgId: string,
    userId: string,
  ) {
    const policy = await this.get(policyId, workspaceId, orgId);

    if (policy.status === POLICY_STATUS.ARCHIVED) {
      throw new ConflictException('Cannot edit an archived policy');
    }

    const [updated] = await this.db
      .update(policies)
      .set({
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.content !== undefined && { content: dto.content }),
        updatedAt: new Date(),
      })
      .where(eq(policies.id, policyId))
      .returning();

    // Save version snapshot for content changes
    if (dto.content !== undefined && dto.content !== policy.content) {
      await this.db.insert(policyVersions).values({
        policyId,
        version: policy.version,
        content: dto.content,
        status: policy.status,
        createdBy: userId,
      });
    }

    return updated!;
  }

  async publish(policyId: string, workspaceId: string, orgId: string, userId: string) {
    const policy = await this.get(policyId, workspaceId, orgId);

    if (policy.status === POLICY_STATUS.PUBLISHED) {
      throw new ConflictException('Policy is already published');
    }
    if (policy.status === POLICY_STATUS.ARCHIVED) {
      throw new ConflictException('Cannot publish an archived policy');
    }

    const newVersion = policy.version + 1;

    const [updated] = await this.db
      .update(policies)
      .set({
        status: POLICY_STATUS.PUBLISHED,
        version: newVersion,
        publishedBy: userId,
        publishedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(policies.id, policyId))
      .returning();

    await this.db.insert(policyVersions).values({
      policyId,
      version: newVersion,
      content: policy.content,
      status: POLICY_STATUS.PUBLISHED,
      createdBy: userId,
    });

    await this.auditService.record({
      actorId: userId,
      orgId,
      action: AUDIT_ACTION.POLICY_PUBLISHED,
      resourceType: 'policy',
      resourceId: policyId,
      metadata: { version: newVersion, workspaceId },
    });

    return updated!;
  }

  async archive(policyId: string, workspaceId: string, orgId: string, userId: string) {
    await this.get(policyId, workspaceId, orgId);

    const [updated] = await this.db
      .update(policies)
      .set({ status: POLICY_STATUS.ARCHIVED, updatedAt: new Date() })
      .where(eq(policies.id, policyId))
      .returning();

    await this.auditService.record({
      actorId: userId,
      orgId,
      action: AUDIT_ACTION.POLICY_ARCHIVED,
      resourceType: 'policy',
      resourceId: policyId,
      metadata: { workspaceId },
    });

    return updated!;
  }

  async listVersions(policyId: string, workspaceId: string, orgId: string) {
    await this.get(policyId, workspaceId, orgId);
    return this.db
      .select()
      .from(policyVersions)
      .where(eq(policyVersions.policyId, policyId))
      .orderBy(desc(policyVersions.version));
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
