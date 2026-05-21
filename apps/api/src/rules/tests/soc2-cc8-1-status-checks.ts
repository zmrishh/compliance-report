import type { RawFact as DbRawFact } from '@compliance/db';
import type { ControlTestResult } from '@compliance/shared';
import { CONTROL_STATUS } from '@compliance/shared';

export function testStatusChecks(facts: DbRawFact[]): ControlTestResult {
  const statusFacts = facts.filter(
    (f) =>
      f.entityType === 'github:repo:status_checks' ||
      f.entityType === 'github:repo:branch_protection',
  );

  if (statusFacts.length === 0) {
    return {
      status: CONTROL_STATUS.UNKNOWN,
      evidenceIds: [],
      detail: 'No GitHub status checks data collected yet.',
    };
  }

  const evidenceIds = statusFacts.map((f) => f.id);
  const violations: string[] = [];

  for (const fact of statusFacts) {
    const data = fact.data as Record<string, unknown>;
    const repoName = String(data['repo'] ?? fact.entityId);
    const requiredChecks = data['required_status_checks'];

    const hasChecks =
      Array.isArray(requiredChecks) && requiredChecks.length > 0;

    if (!hasChecks) {
      violations.push(repoName);
    }
  }

  if (violations.length === 0) {
    return {
      status: CONTROL_STATUS.PASS,
      evidenceIds,
      detail: 'All scoped repositories have required status checks configured.',
    };
  }

  return {
    status: CONTROL_STATUS.FAIL,
    evidenceIds,
    detail: `${violations.length} repository(ies) have no required status checks: ${violations.slice(0, 5).join(', ')}.`,
  };
}
