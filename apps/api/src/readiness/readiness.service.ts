import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { controlStates, controls, workspaces } from '@compliance/db';
import type { DbClient } from '@compliance/db';
import { CONTROL_STATUS, READINESS_SCORE_WEIGHTS, type ReadinessSummary, type Severity } from '@compliance/shared';

import { DB_CLIENT } from '../database/database.module.js';
import { RulesEngineService } from '../rules/rules-engine.service.js';

@Injectable()
export class ReadinessService {
  constructor(
    @Inject(DB_CLIENT) private readonly db: DbClient,
    private readonly rulesEngine: RulesEngineService,
  ) {}

  async getSummary(workspaceId: string, orgId: string): Promise<ReadinessSummary> {
    const [workspace] = await this.db
      .select()
      .from(workspaces)
      .where(and(eq(workspaces.id, workspaceId), eq(workspaces.orgId, orgId)))
      .limit(1);

    if (!workspace) throw new NotFoundException('Workspace not found');

    const states = await this.db
      .select({
        status: controlStates.status,
        detail: controlStates.detail,
        severity: controls.severity,
        controlId: controls.id,
        title: controls.title,
        remediationGuidance: controls.remediationGuidance,
      })
      .from(controlStates)
      .innerJoin(controls, eq(controlStates.controlId, controls.id))
      .where(eq(controlStates.workspaceId, workspaceId));

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

    const topFailures = states
      .filter((s) => s.status === CONTROL_STATUS.FAIL)
      .sort(
        (a, b) =>
          (READINESS_SCORE_WEIGHTS[b.severity as Severity] ?? 1) -
          (READINESS_SCORE_WEIGHTS[a.severity as Severity] ?? 1),
      )
      .slice(0, 5)
      .map((s) => ({
        controlId: s.controlId,
        title: s.title,
        severity: s.severity as Severity,
        detail: s.detail,
        remediationGuidance: s.remediationGuidance,
      }));

    return {
      workspaceId,
      score,
      updatedAt: workspace.readinessScoreUpdatedAt,
      breakdown,
      topFailures,
    };
  }

  async getControlStates(workspaceId: string, orgId: string) {
    const [workspace] = await this.db
      .select({ id: workspaces.id })
      .from(workspaces)
      .where(and(eq(workspaces.id, workspaceId), eq(workspaces.orgId, orgId)))
      .limit(1);

    if (!workspace) throw new NotFoundException('Workspace not found');

    return this.db
      .select({
        id: controlStates.id,
        workspaceId: controlStates.workspaceId,
        controlId: controlStates.controlId,
        status: controlStates.status,
        ownerId: controlStates.ownerId,
        lastEvaluatedAt: controlStates.lastEvaluatedAt,
        detail: controlStates.detail,
        notes: controlStates.notes,
        waivedAt: controlStates.waivedAt,
        evidenceIds: controlStates.evidenceIds,
        control: {
          controlId: controls.controlId,
          title: controls.title,
          description: controls.description,
          severity: controls.severity,
          remediationGuidance: controls.remediationGuidance,
          evidenceSources: controls.evidenceSources,
        },
      })
      .from(controlStates)
      .innerJoin(controls, eq(controlStates.controlId, controls.id))
      .where(eq(controlStates.workspaceId, workspaceId))
      .orderBy(desc(controls.severity));
  }

  async triggerEvaluation(workspaceId: string, orgId: string): Promise<void> {
    await this.rulesEngine.evaluateWorkspace(workspaceId, orgId);
  }

  async updateControlState(
    controlStateId: string,
    workspaceId: string,
    update: { ownerId?: string | null; notes?: string | null },
  ) {
    const [updated] = await this.db
      .update(controlStates)
      .set({
        ...(update.ownerId !== undefined && { ownerId: update.ownerId }),
        ...(update.notes !== undefined && { notes: update.notes }),
        updatedAt: new Date(),
      })
      .where(and(eq(controlStates.id, controlStateId), eq(controlStates.workspaceId, workspaceId)))
      .returning();

    return updated;
  }

  async waiveControl(
    controlStateId: string,
    workspaceId: string,
    actorId: string,
    reason: string,
  ) {
    const [updated] = await this.db
      .update(controlStates)
      .set({
        status: CONTROL_STATUS.WAIVED,
        waivedAt: new Date(),
        waivedBy: actorId,
        waivedReason: reason,
        updatedAt: new Date(),
      })
      .where(and(eq(controlStates.id, controlStateId), eq(controlStates.workspaceId, workspaceId)))
      .returning();

    return updated;
  }
}
