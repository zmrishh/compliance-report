import { createHash, randomBytes } from 'crypto';
import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { auditorShares, controlStates, controls, workspaces } from '@compliance/db';
import type { DbClient } from '@compliance/db';
import {
  AUDITOR_SHARE_MAX_EXPIRY_DAYS,
  CONTROL_STATUS,
  READINESS_SCORE_WEIGHTS,
  type Severity,
} from '@compliance/shared';

import { DB_CLIENT } from '../database/database.module.js';

export interface AuditorShareCreated {
  id: string;
  token: string; // returned once, never stored
  shareUrl: string;
  expiresAt: Date;
  label: string;
}

export interface PublicReadinessSnapshot {
  workspaceName: string;
  framework: string;
  score: number;
  breakdown: { pass: number; fail: number; unknown: number; waived: number };
  controls: Array<{
    controlId: string;
    title: string;
    severity: string;
    status: string;
    lastEvaluatedAt: Date | null;
    detail: string | null;
  }>;
  generatedAt: string;
  expiresAt: Date;
}

@Injectable()
export class AuditorShareService {
  constructor(@Inject(DB_CLIENT) private readonly db: DbClient) {}

  async createShare(
    workspaceId: string,
    orgId: string,
    userId: string,
    expiresInDays: number,
    label: string,
    appBaseUrl: string,
  ): Promise<AuditorShareCreated> {
    if (expiresInDays > AUDITOR_SHARE_MAX_EXPIRY_DAYS) {
      throw new BadRequestException(
        `Maximum expiry is ${AUDITOR_SHARE_MAX_EXPIRY_DAYS} days.`,
      );
    }

    // Verify workspace belongs to org
    const [workspace] = await this.db
      .select({ id: workspaces.id })
      .from(workspaces)
      .where(and(eq(workspaces.id, workspaceId), eq(workspaces.orgId, orgId)))
      .limit(1);

    if (!workspace) throw new NotFoundException('Workspace not found');

    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    const [share] = await this.db
      .insert(auditorShares)
      .values({ workspaceId, orgId, tokenHash, label, expiresAt, createdByUserId: userId })
      .returning();

    return {
      id: share!.id,
      token: rawToken,
      shareUrl: `${appBaseUrl}/share/${rawToken}`,
      expiresAt,
      label,
    };
  }

  async listShares(workspaceId: string, orgId: string) {
    return this.db
      .select({
        id: auditorShares.id,
        label: auditorShares.label,
        expiresAt: auditorShares.expiresAt,
        createdByUserId: auditorShares.createdByUserId,
        revokedAt: auditorShares.revokedAt,
        createdAt: auditorShares.createdAt,
      })
      .from(auditorShares)
      .where(
        and(
          eq(auditorShares.workspaceId, workspaceId),
          eq(auditorShares.orgId, orgId),
        ),
      );
  }

  async revokeShare(shareId: string, workspaceId: string, orgId: string) {
    const [share] = await this.db
      .select()
      .from(auditorShares)
      .where(
        and(
          eq(auditorShares.id, shareId),
          eq(auditorShares.workspaceId, workspaceId),
          eq(auditorShares.orgId, orgId),
        ),
      )
      .limit(1);

    if (!share) throw new NotFoundException('Share not found');
    if (share.revokedAt) throw new BadRequestException('Share is already revoked');

    await this.db
      .update(auditorShares)
      .set({ revokedAt: new Date() })
      .where(eq(auditorShares.id, shareId));

    return { revoked: true };
  }

  async getPublicSnapshot(rawToken: string): Promise<PublicReadinessSnapshot> {
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');

    const [share] = await this.db
      .select()
      .from(auditorShares)
      .where(
        and(
          eq(auditorShares.tokenHash, tokenHash),
          isNull(auditorShares.revokedAt),
          gt(auditorShares.expiresAt, new Date()),
        ),
      )
      .limit(1);

    if (!share) {
      throw new ForbiddenException('Invalid or expired share link.');
    }

    const [workspace] = await this.db
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, share.workspaceId))
      .limit(1);

    if (!workspace) throw new NotFoundException('Workspace not found');

    const states = await this.db
      .select({
        status: controlStates.status,
        detail: controlStates.detail,
        lastEvaluatedAt: controlStates.lastEvaluatedAt,
        controlId: controls.id,
        controlTitle: controls.title,
        severity: controls.severity,
        controlIdCode: controls.controlId,
      })
      .from(controlStates)
      .innerJoin(controls, eq(controlStates.controlId, controls.id))
      .where(eq(controlStates.workspaceId, share.workspaceId));

    const breakdown = { pass: 0, fail: 0, unknown: 0, waived: 0 };
    let totalWeight = 0;
    let passWeight = 0;

    for (const s of states) {
      const key = s.status.toLowerCase() as keyof typeof breakdown;
      if (key in breakdown) breakdown[key]++;
      const w = READINESS_SCORE_WEIGHTS[s.severity as Severity] ?? 1;
      totalWeight += w;
      if (s.status === CONTROL_STATUS.PASS || s.status === CONTROL_STATUS.WAIVED) {
        passWeight += w;
      }
    }

    const score =
      workspace.readinessScore ??
      (totalWeight === 0 ? 0 : Math.round((passWeight / totalWeight) * 1000) / 10);

    return {
      workspaceName: workspace.name,
      framework: workspace.framework,
      score,
      breakdown,
      controls: states.map((s) => ({
        controlId: s.controlIdCode,
        title: s.controlTitle,
        severity: s.severity,
        status: s.status,
        lastEvaluatedAt: s.lastEvaluatedAt,
        detail: s.detail,
      })),
      generatedAt: new Date().toISOString(),
      expiresAt: share.expiresAt,
    };
  }
}
