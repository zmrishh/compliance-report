import type { RawFact as DbRawFact } from '@compliance/db';
import type { ControlTestResult } from '@compliance/shared';
import { CONTROL_STATUS } from '@compliance/shared';

export function testRootMfa(facts: DbRawFact[]): ControlTestResult {
  const accountSummaryFact = facts.find(
    (f) => f.entityType === 'aws:iam:account_summary',
  );

  if (!accountSummaryFact) {
    return {
      status: CONTROL_STATUS.UNKNOWN,
      evidenceIds: [],
      detail: 'No AWS account summary data collected yet. Connect the AWS connector and run a sync.',
    };
  }

  const data = accountSummaryFact.data as Record<string, unknown>;
  const mfaEnabled = data['AccountMFAEnabled'];

  if (mfaEnabled === 1 || mfaEnabled === true) {
    return {
      status: CONTROL_STATUS.PASS,
      evidenceIds: [accountSummaryFact.id],
      detail: 'AWS root account has MFA enabled.',
    };
  }

  return {
    status: CONTROL_STATUS.FAIL,
    evidenceIds: [accountSummaryFact.id],
    detail: 'AWS root account does NOT have MFA enabled. This is a critical security risk.',
  };
}
