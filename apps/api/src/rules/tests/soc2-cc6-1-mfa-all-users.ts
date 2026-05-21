import type { RawFact as DbRawFact } from '@compliance/db';
import type { ControlTestResult } from '@compliance/shared';
import { CONTROL_STATUS } from '@compliance/shared';

export function testMfaAllUsers(facts: DbRawFact[]): ControlTestResult {
  const credentialFacts = facts.filter((f) => f.entityType === 'aws:iam:credential_report');

  if (credentialFacts.length === 0) {
    return {
      status: CONTROL_STATUS.UNKNOWN,
      evidenceIds: [],
      detail: 'No IAM credential report data collected yet.',
    };
  }

  const evidenceIds = credentialFacts.map((f) => f.id);
  const violations: string[] = [];

  for (const fact of credentialFacts) {
    const data = fact.data as Record<string, unknown>;
    const user = String(data['user'] ?? '');
    if (user === '<root_account>') continue;

    const passwordEnabled = data['password_enabled'];
    const mfaActive = data['mfa_active'];

    if ((passwordEnabled === 'true' || passwordEnabled === true) &&
        mfaActive !== 'true' && mfaActive !== true) {
      violations.push(user);
    }
  }

  if (violations.length === 0) {
    return {
      status: CONTROL_STATUS.PASS,
      evidenceIds,
      detail: 'All IAM users with console access have MFA enabled.',
    };
  }

  return {
    status: CONTROL_STATUS.FAIL,
    evidenceIds,
    detail: `${violations.length} IAM user(s) have console access without MFA: ${violations.slice(0, 5).join(', ')}${violations.length > 5 ? ` and ${violations.length - 5} more` : ''}.`,
  };
}
