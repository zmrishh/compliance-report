import type { RawFact as DbRawFact } from '@compliance/db';
import type { ControlTestResult } from '@compliance/shared';
import { CONTROL_STATUS } from '@compliance/shared';

export function testNoDirectPush(facts: DbRawFact[]): ControlTestResult {
  const branchFacts = facts.filter((f) => f.entityType === 'github:repo:branch_protection');

  if (branchFacts.length === 0) {
    return {
      status: CONTROL_STATUS.UNKNOWN,
      evidenceIds: [],
      detail: 'No GitHub branch protection data collected yet.',
    };
  }

  const evidenceIds = branchFacts.map((f) => f.id);
  const violations: string[] = [];

  for (const fact of branchFacts) {
    const data = fact.data as Record<string, unknown>;
    const repoName = String(data['repo'] ?? fact.entityId);
    const includesAdmins = data['enforce_admins'];
    const enabled = data['enabled'];

    if (enabled === false) {
      violations.push(`${repoName} (no protection rule)`);
    } else if (!includesAdmins) {
      violations.push(`${repoName} (admins excluded)`);
    }
  }

  if (violations.length === 0) {
    return {
      status: CONTROL_STATUS.PASS,
      evidenceIds,
      detail: 'All scoped repositories enforce branch protection including for admins.',
    };
  }

  return {
    status: CONTROL_STATUS.FAIL,
    evidenceIds,
    detail: `${violations.length} repository(ies) allow direct pushes without PR: ${violations.slice(0, 5).join('; ')}.`,
  };
}
