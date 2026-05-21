import type { RawFact as DbRawFact } from '@compliance/db';
import type { ControlTestResult } from '@compliance/shared';
import { CONTROL_STATUS, IAM_KEY_MAX_AGE_DAYS } from '@compliance/shared';

export function testIamKeyRotation(facts: DbRawFact[]): ControlTestResult {
  const credentialFacts = facts.filter((f) => f.entityType === 'aws:iam:credential_report');

  if (credentialFacts.length === 0) {
    return {
      status: CONTROL_STATUS.UNKNOWN,
      evidenceIds: [],
      detail: 'No IAM credential report data collected yet.',
    };
  }

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - IAM_KEY_MAX_AGE_DAYS);

  const violations: string[] = [];
  const evidenceIds = credentialFacts.map((f) => f.id);

  for (const fact of credentialFacts) {
    const data = fact.data as Record<string, unknown>;
    const user = String(data['user'] ?? '');
    if (user === '<root_account>') continue;

    for (const keyNum of [1, 2] as const) {
      const active = data[`access_key_${keyNum}_active`];
      const lastRotated = data[`access_key_${keyNum}_last_rotated`];

      if (active !== 'true' && active !== true) continue;

      if (typeof lastRotated === 'string' && lastRotated !== 'N/A') {
        const rotatedDate = new Date(lastRotated);
        if (rotatedDate < cutoff) {
          violations.push(`${user} key ${keyNum} last rotated ${lastRotated}`);
        }
      }
    }
  }

  if (violations.length === 0) {
    return {
      status: CONTROL_STATUS.PASS,
      evidenceIds,
      detail: `All active IAM access keys have been rotated within ${IAM_KEY_MAX_AGE_DAYS} days.`,
    };
  }

  return {
    status: CONTROL_STATUS.FAIL,
    evidenceIds,
    detail: `${violations.length} IAM access key(s) exceed the ${IAM_KEY_MAX_AGE_DAYS}-day rotation policy: ${violations.slice(0, 5).join('; ')}${violations.length > 5 ? ` and ${violations.length - 5} more` : ''}.`,
  };
}
