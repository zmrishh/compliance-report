import type { RawFact as DbRawFact } from '@compliance/db';
import type { ControlTestResult } from '@compliance/shared';
import { CONTROL_STATUS } from '@compliance/shared';

export function testBranchProtection(facts: DbRawFact[]): ControlTestResult {
  const branchFacts = facts.filter((f) => f.entityType === 'github:repo:branch_protection');

  if (branchFacts.length === 0) {
    return {
      status: CONTROL_STATUS.UNKNOWN,
      evidenceIds: [],
      detail: 'No GitHub branch protection data collected yet. Connect the GitHub connector.',
    };
  }

  const evidenceIds = branchFacts.map((f) => f.id);
  const unprotected: string[] = [];

  for (const fact of branchFacts) {
    const data = fact.data as Record<string, unknown>;
    const enabled = data['enabled'];
    const repoName = String(data['repo'] ?? fact.entityId);

    if (enabled === false || enabled === 'false') {
      unprotected.push(repoName);
    }
  }

  if (unprotected.length === 0) {
    return {
      status: CONTROL_STATUS.PASS,
      evidenceIds,
      detail: `Branch protection is enabled on all ${branchFacts.length} scoped repository default branch(es).`,
    };
  }

  return {
    status: CONTROL_STATUS.FAIL,
    evidenceIds,
    detail: `${unprotected.length} repository default branch(es) lack branch protection: ${unprotected.slice(0, 5).join(', ')}.`,
  };
}
