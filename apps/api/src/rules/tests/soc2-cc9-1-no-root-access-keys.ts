import type { RawFact as DbRawFact } from '@compliance/db';
import type { ControlTestResult } from '@compliance/shared';
import { CONTROL_STATUS } from '@compliance/shared';

export function testNoRootAccessKeys(facts: DbRawFact[]): ControlTestResult {
  const accountSummaryFact = facts.find(
    (f) => f.entityType === 'aws:iam:account_summary',
  );

  if (!accountSummaryFact) {
    return {
      status: CONTROL_STATUS.UNKNOWN,
      evidenceIds: [],
      detail: 'No AWS account summary data collected yet.',
    };
  }

  const data = accountSummaryFact.data as Record<string, unknown>;
  const accessKeysPresent = data['AccountAccessKeysPresent'];

  if (accessKeysPresent === 0 || accessKeysPresent === false) {
    return {
      status: CONTROL_STATUS.PASS,
      evidenceIds: [accountSummaryFact.id],
      detail: 'No active access keys exist for the AWS root account.',
    };
  }

  return {
    status: CONTROL_STATUS.FAIL,
    evidenceIds: [accountSummaryFact.id],
    detail:
      'The AWS root account has active access keys. Root access keys cannot be scoped and must be deleted.',
  };
}
