import type { RawFact as DbRawFact } from '@compliance/db';
import type { ControlTestResult } from '@compliance/shared';
import { CONTROL_STATUS } from '@compliance/shared';

export function testRequiredReviews(facts: DbRawFact[]): ControlTestResult {
  const reviewFacts = facts.filter(
    (f) =>
      f.entityType === 'github:repo:required_reviews' ||
      f.entityType === 'github:repo:branch_protection',
  );

  if (reviewFacts.length === 0) {
    return {
      status: CONTROL_STATUS.UNKNOWN,
      evidenceIds: [],
      detail: 'No GitHub review requirement data collected yet.',
    };
  }

  const evidenceIds = reviewFacts.map((f) => f.id);
  const violations: string[] = [];

  for (const fact of reviewFacts) {
    const data = fact.data as Record<string, unknown>;
    const repoName = String(data['repo'] ?? fact.entityId);
    const requiredApprovals = Number(data['required_approving_review_count'] ?? 0);

    if (requiredApprovals < 1) {
      violations.push(`${repoName} (requires ${requiredApprovals} approvals)`);
    }
  }

  if (violations.length === 0) {
    return {
      status: CONTROL_STATUS.PASS,
      evidenceIds,
      detail: 'All scoped repositories require at least 1 approving review before merge.',
    };
  }

  return {
    status: CONTROL_STATUS.FAIL,
    evidenceIds,
    detail: `${violations.length} repository(ies) do not require pull request reviews: ${violations.slice(0, 5).join('; ')}.`,
  };
}
