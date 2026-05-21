import { Inject, Injectable, Logger } from '@nestjs/common';
import { and, desc, eq, gte } from 'drizzle-orm';
import {
  controlStateHistory,
  controlStates,
  readinessSnapshots,
  workspaces,
} from '@compliance/db';
import type { DbClient } from '@compliance/db';
import { CONTROL_STATUS, READINESS_SCORE_WEIGHTS, type Severity } from '@compliance/shared';

import { DB_CLIENT } from '../database/database.module.js';

@Injectable()
export class SnapshotService {
  private readonly logger = new Logger(SnapshotService.name);

  constructor(@Inject(DB_CLIENT) private readonly db: DbClient) {}

  async captureSnapshot(workspaceId: string, orgId: string): Promise<void> {
    const [workspace] = await this.db
      .select()
      .from(workspaces)
      .where(and(eq(workspaces.id, workspaceId), eq(workspaces.orgId, orgId)))
      .limit(1);

    if (!workspace) return;

    // Import controls lazily to avoid circular deps
    const { controls } = await import('@compliance/db');

    const states = await this.db
      .select({ status: controlStates.status, severity: controls.severity })
      .from(controlStates)
      .innerJoin(controls, eq(controlStates.controlId, controls.id))
      .where(eq(controlStates.workspaceId, workspaceId));

    if (states.length === 0) return;

    const counts = { pass: 0, fail: 0, unknown: 0, waived: 0 };
    let totalWeight = 0;
    let passWeight = 0;

    for (const s of states) {
      const key = s.status.toLowerCase() as keyof typeof counts;
      if (key in counts) counts[key]++;
      const w = READINESS_SCORE_WEIGHTS[s.severity as Severity] ?? 1;
      totalWeight += w;
      if (s.status === CONTROL_STATUS.PASS || s.status === CONTROL_STATUS.WAIVED) {
        passWeight += w;
      }
    }

    const score =
      workspace.readinessScore ??
      (totalWeight === 0 ? 0 : Math.round((passWeight / totalWeight) * 1000) / 10);

    await this.db.insert(readinessSnapshots).values({
      workspaceId,
      orgId,
      score,
      passCount: counts.pass,
      failCount: counts.fail,
      unknownCount: counts.unknown,
      waivedCount: counts.waived,
      totalCount: states.length,
    });
  }

  async recordControlStateChange(
    workspaceId: string,
    controlStateId: string,
    controlId: string,
    fromStatus: string | null,
    toStatus: string,
  ): Promise<void> {
    await this.db.insert(controlStateHistory).values({
      workspaceId,
      controlStateId,
      controlId,
      fromStatus: fromStatus ?? undefined,
      toStatus,
    });
  }

  async getSnapshots(
    workspaceId: string,
    orgId: string,
    days: number,
  ) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    return this.db
      .select()
      .from(readinessSnapshots)
      .where(
        and(
          eq(readinessSnapshots.workspaceId, workspaceId),
          eq(readinessSnapshots.orgId, orgId),
          gte(readinessSnapshots.snapshottedAt, since),
        ),
      )
      .orderBy(readinessSnapshots.snapshottedAt);
  }

  async getControlHistory(
    controlStateId: string,
    workspaceId: string,
  ) {
    return this.db
      .select()
      .from(controlStateHistory)
      .where(
        and(
          eq(controlStateHistory.controlStateId, controlStateId),
          eq(controlStateHistory.workspaceId, workspaceId),
        ),
      )
      .orderBy(desc(controlStateHistory.changedAt))
      .limit(50);
  }
}
