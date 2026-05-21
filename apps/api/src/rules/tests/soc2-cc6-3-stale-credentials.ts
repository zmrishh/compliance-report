import type { RawFact as DbRawFact } from '@compliance/db';
import type { ControlTestResult } from '@compliance/shared';
import { CONTROL_STATUS, DORMANT_USER_DAYS } from '@compliance/shared';

export function testStaleCredentials(facts: DbRawFact[]): ControlTestResult {
  const credentialFacts = facts.filter((f) => f.entityType === 'aws:iam:credential_report');

  if (credentialFacts.length === 0) {
    return {
      status: CONTROL_STATUS.UNKNOWN,
      evidenceIds: [],
      detail: 'No IAM credential report data collected yet.',
    };
  }

  const evidenceIds = credentialFacts.map((f) => f.id);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - DORMANT_USER_DAYS);

  const dormantUsers: string[] = [];

  for (const fact of credentialFacts) {
    const data = fact.data as Record<string, unknown>;
    const user = String(data['user'] ?? '');
    if (user === '<root_account>') continue;

    const passwordEnabled = data['password_enabled'];
    const passwordLastUsed = data['password_last_used'];
    const key1Active = data['access_key_1_active'];
    const key1LastUsed = data['access_key_1_last_used_date'];
    const key2Active = data['access_key_2_active'];
    const key2LastUsed = data['access_key_2_last_used_date'];

    const hasConsole = passwordEnabled === 'true' || passwordEnabled === true;
    const hasKey1 = key1Active === 'true' || key1Active === true;
    const hasKey2 = key2Active === 'true' || key2Active === true;

    if (!hasConsole && !hasKey1 && !hasKey2) continue;

    const lastUsedDates = [
      hasConsole && typeof passwordLastUsed === 'string' && passwordLastUsed !== 'no_information' ? new Date(passwordLastUsed) : null,
      hasKey1 && typeof key1LastUsed === 'string' && key1LastUsed !== 'N/A' ? new Date(key1LastUsed) : null,
      hasKey2 && typeof key2LastUsed === 'string' && key2LastUsed !== 'N/A' ? new Date(key2LastUsed) : null,
    ].filter(Boolean) as Date[];

    if (lastUsedDates.length === 0) {
      dormantUsers.push(`${user} (never used)`);
      continue;
    }

    const mostRecent = new Date(Math.max(...lastUsedDates.map((d) => d.getTime())));
    if (mostRecent < cutoff) {
      dormantUsers.push(user);
    }
  }

  if (dormantUsers.length === 0) {
    return {
      status: CONTROL_STATUS.PASS,
      evidenceIds,
      detail: `No dormant IAM users with active credentials found (threshold: ${DORMANT_USER_DAYS} days).`,
    };
  }

  return {
    status: CONTROL_STATUS.FAIL,
    evidenceIds,
    detail: `${dormantUsers.length} dormant IAM user(s) with active credentials: ${dormantUsers.slice(0, 5).join(', ')}.`,
  };
}
