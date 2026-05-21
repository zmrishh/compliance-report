import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { and, eq, inArray } from 'drizzle-orm';
import { controlStates, controls, evidenceRecords, rawFacts, workspaces } from '@compliance/db';
import type { DbClient } from '@compliance/db';
import { CONTROL_STATUS, type ControlTestResult } from '@compliance/shared';
import type { RawFact as DbRawFact } from '@compliance/db';

import { DB_CLIENT } from '../database/database.module.js';
import { FACTS_NEW_EVENT, type FactsNewPayload } from '../normalizer/normalizer.service.js';
import { testRootMfa } from './tests/soc2-cc6-1-root-mfa.js';
import { testNoRootAccessKeys } from './tests/soc2-cc9-1-no-root-access-keys.js';
import { testIamKeyRotation } from './tests/soc2-cc6-1-iam-key-rotation.js';
import { testMfaAllUsers } from './tests/soc2-cc6-1-mfa-all-users.js';
import { testBranchProtection } from './tests/soc2-cc6-2-branch-protection.js';
import { testRequiredReviews } from './tests/soc2-cc6-2-required-reviews.js';
import { testSecurityHubCriticalFindings } from './tests/soc2-cc7-1-securityhub.js';
import { testConfigNoncompliant } from './tests/soc2-cc7-1-config-noncompliant.js';
import { testStatusChecks } from './tests/soc2-cc8-1-status-checks.js';
import { testNoDirectPush } from './tests/soc2-cc8-1-no-direct-push.js';
import { testStaleCredentials } from './tests/soc2-cc6-3-stale-credentials.js';
import {
  testCloudtrailEnabled,
  testOrgAuditLogRetained,
  testPasswordPolicy,
  testS3PublicAccessBlocked,
} from './tests/soc2-remaining.js';

type TestFn = (facts: DbRawFact[]) => ControlTestResult;

const TEST_REGISTRY: Record<string, TestFn> = {
  'soc2:cc6.1:root-mfa': testRootMfa,
  'soc2:cc6.1:iam-key-rotation': testIamKeyRotation,
  'soc2:cc6.1:mfa-all-users': testMfaAllUsers,
  'soc2:cc6.2:branch-protection': testBranchProtection,
  'soc2:cc6.2:required-reviews': testRequiredReviews,
  'soc2:cc6.3:stale-iam-credentials': testStaleCredentials,
  'soc2:cc7.1:cloudtrail-enabled': testCloudtrailEnabled,
  'soc2:cc7.1:securityhub-critical-findings': testSecurityHubCriticalFindings,
  'soc2:cc7.1:config-noncompliant': testConfigNoncompliant,
  'soc2:cc8.1:status-checks': testStatusChecks,
  'soc2:cc8.1:no-direct-push': testNoDirectPush,
  'soc2:cc9.1:s3-public-access-blocked': testS3PublicAccessBlocked,
  'soc2:cc9.1:no-root-access-keys': testNoRootAccessKeys,
  'soc2:cc9.1:password-policy': testPasswordPolicy,
  'soc2:cc9.1:org-audit-log-retained': testOrgAuditLogRetained,
};

@Injectable()
export class RulesEngineService implements OnModuleInit {
  private readonly logger = new Logger(RulesEngineService.name);

  constructor(@Inject(DB_CLIENT) private readonly db: DbClient) {}

  onModuleInit() {
    this.logger.log(`Rules engine initialized with ${Object.keys(TEST_REGISTRY).length} test functions`);
  }

  @OnEvent(FACTS_NEW_EVENT)
  async onNewFacts(payload: FactsNewPayload): Promise<void> {
    for (const workspaceId of payload.workspaceIds) {
      await this.evaluateAffectedControls(workspaceId, payload.entityTypes, payload.orgId);
    }
  }

  async evaluateWorkspace(workspaceId: string, orgId: string): Promise<void> {
    const [workspace] = await this.db
      .select()
      .from(workspaces)
      .where(and(eq(workspaces.id, workspaceId), eq(workspaces.orgId, orgId)))
      .limit(1);

    if (!workspace) {
      this.logger.warn(`Workspace ${workspaceId} not found for org ${orgId}`);
      return;
    }

    const allControls = await this.db.select().from(controls);
    await Promise.all(
      allControls.map((control) => this.evaluateControl(workspaceId, orgId, control)),
    );

    await this.updateReadinessScore(workspaceId);
  }

  private async evaluateAffectedControls(
    workspaceId: string,
    entityTypes: string[],
    orgId: string,
  ): Promise<void> {
    const allControls = await this.db.select().from(controls);

    const affectedControls = allControls.filter((c) => {
      const sources = c.evidenceSources as string[];
      return sources.some((s) => entityTypes.includes(s));
    });

    if (affectedControls.length === 0) return;

    await Promise.all(
      affectedControls.map((control) =>
        this.evaluateControl(workspaceId, orgId, control),
      ),
    );

    await this.updateReadinessScore(workspaceId);
  }

  private async evaluateControl(
    workspaceId: string,
    orgId: string,
    control: typeof controls.$inferSelect,
  ): Promise<void> {
    const testFn = TEST_REGISTRY[control.testFnKey];
    if (!testFn) {
      this.logger.warn(`No test function registered for key: ${control.testFnKey}`);
      return;
    }

    // Fetch relevant facts: all facts from connectors belonging to this org
    // that match the evidence sources declared by this control
    const evidenceSources = control.evidenceSources as string[];

    const facts = await this.db
      .select()
      .from(rawFacts)
      .where(inArray(rawFacts.entityType, evidenceSources))
      .orderBy(rawFacts.collectedAt);

    let result: ControlTestResult;
    try {
      result = testFn(facts);
    } catch (err) {
      this.logger.error(`Test function ${control.testFnKey} threw an error`, err);
      result = {
        status: CONTROL_STATUS.UNKNOWN,
        evidenceIds: [],
        detail: 'Control evaluation failed with an unexpected error. Check API logs.',
      };
    }

    // Upsert control_state
    const [existingState] = await this.db
      .select({ id: controlStates.id, ownerId: controlStates.ownerId, notes: controlStates.notes, waivedAt: controlStates.waivedAt })
      .from(controlStates)
      .where(
        and(
          eq(controlStates.workspaceId, workspaceId),
          eq(controlStates.controlId, control.id),
        ),
      )
      .limit(1);

    // Do not overwrite a waived control
    if (existingState?.waivedAt) return;

    if (existingState) {
      await this.db
        .update(controlStates)
        .set({
          status: result.status,
          lastEvaluatedAt: new Date(),
          detail: result.detail,
          evidenceIds: result.evidenceIds,
          updatedAt: new Date(),
        })
        .where(eq(controlStates.id, existingState.id));
    } else {
      await this.db.insert(controlStates).values({
        workspaceId,
        controlId: control.id,
        status: result.status,
        lastEvaluatedAt: new Date(),
        detail: result.detail,
        evidenceIds: result.evidenceIds,
      });
    }

    // Snapshot evidence records for PASS/FAIL states
    if (result.status !== CONTROL_STATUS.UNKNOWN && result.evidenceIds.length > 0) {
      const [stateRow] = await this.db
        .select({ id: controlStates.id })
        .from(controlStates)
        .where(
          and(
            eq(controlStates.workspaceId, workspaceId),
            eq(controlStates.controlId, control.id),
          ),
        )
        .limit(1);

      if (stateRow) {
        const factRows = await this.db
          .select()
          .from(rawFacts)
          .where(inArray(rawFacts.id, result.evidenceIds));

        for (const fact of factRows) {
          await this.db.insert(evidenceRecords).values({
            controlStateId: stateRow.id,
            workspaceId,
            sourceType: 'connector',
            contentHash: fact.contentHash,
            collectedAt: fact.collectedAt,
          }).onConflictDoNothing();
        }
      }
    }
  }

  private async updateReadinessScore(workspaceId: string): Promise<void> {
    const states = await this.db
      .select({
        status: controlStates.status,
        severity: controls.severity,
      })
      .from(controlStates)
      .innerJoin(controls, eq(controlStates.controlId, controls.id))
      .where(eq(controlStates.workspaceId, workspaceId));

    if (states.length === 0) return;

    const weights: Record<string, number> = { critical: 3, high: 2, medium: 1, low: 0.5 };
    let totalWeight = 0;
    let passWeight = 0;

    for (const state of states) {
      const w = weights[state.severity] ?? 1;
      totalWeight += w;
      if (state.status === CONTROL_STATUS.PASS || state.status === CONTROL_STATUS.WAIVED) {
        passWeight += w;
      }
    }

    const score = totalWeight === 0 ? 0 : (passWeight / totalWeight) * 100;

    await this.db
      .update(workspaces)
      .set({
        readinessScore: Math.round(score * 10) / 10,
        readinessScoreUpdatedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(workspaces.id, workspaceId));
  }
}
