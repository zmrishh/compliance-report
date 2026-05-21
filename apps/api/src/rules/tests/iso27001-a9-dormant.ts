import type { RawFact } from '@compliance/db';
import type { ControlTestResult } from '@compliance/shared';
import { CONTROL_STATUS, DORMANT_USER_DAYS } from '@compliance/shared';

export function testIso27001A92DormantUsers(facts: RawFact[]): ControlTestResult {
  const userFacts = facts.filter(
    (f) =>
      f.entityType === 'google:user:directory' || f.entityType === 'okta:user:directory',
  );

  if (userFacts.length === 0) {
    return {
      status: CONTROL_STATUS.UNKNOWN,
      detail: 'No identity provider data collected. Connect Google Workspace or Okta.',
      evidenceIds: [],
    };
  }

  const dormantThreshold = new Date();
  dormantThreshold.setDate(dormantThreshold.getDate() - DORMANT_USER_DAYS);
  const dormant: string[] = [];

  for (const f of userFacts) {
    const data = f.data as {
      email?: string;
      login?: string;
      suspended?: boolean;
      status?: string;
      lastLoginTime?: string;
      lastLogin?: string;
    };

    const isActive =
      f.entityType === 'google:user:directory' ? !data.suspended : data.status === 'ACTIVE';
    if (!isActive) continue;

    const lastLogin = data.lastLoginTime ?? data.lastLogin;
    if (!lastLogin) continue;

    if (new Date(lastLogin) < dormantThreshold) {
      dormant.push(data.email ?? data.login ?? f.entityId);
    }
  }

  if (dormant.length > 0) {
    return {
      status: CONTROL_STATUS.FAIL,
      detail: `${dormant.length} active user(s) have not logged in for more than ${DORMANT_USER_DAYS} days: ${dormant.slice(0, 5).join(', ')}${dormant.length > 5 ? '…' : ''}`,
      evidenceIds: [],
    };
  }

  return {
    status: CONTROL_STATUS.PASS,
    detail: `No dormant active users found (threshold: ${DORMANT_USER_DAYS} days).`,
    evidenceIds: [],
  };
}
