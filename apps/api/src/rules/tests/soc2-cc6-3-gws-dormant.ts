import type { RawFact } from '@compliance/db';
import { CONTROL_STATUS, DORMANT_USER_DAYS } from '@compliance/shared';
import type { ControlTestResult } from '@compliance/shared';

export function testGwsDormantUsers(facts: RawFact[]): ControlTestResult {
  const userFacts = facts.filter((f) => f.entityType === 'google:user:directory');

  if (userFacts.length === 0) {
    return {
      status: CONTROL_STATUS.UNKNOWN,
      evidenceIds: [],
      detail: 'No Google Workspace user data collected. Ensure the Google Workspace connector is active.',
    };
  }

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - DORMANT_USER_DAYS);

  const dormant: string[] = [];
  for (const fact of userFacts) {
    const data = fact.data as {
      email?: string;
      suspended?: boolean;
      lastLoginTime?: string | null;
    };
    if (data.suspended) continue;
    if (!data.lastLoginTime) {
      // Never logged in — treat as dormant
      dormant.push(data.email ?? fact.entityId);
      continue;
    }
    const lastLogin = new Date(data.lastLoginTime);
    if (lastLogin < cutoff) {
      dormant.push(data.email ?? fact.entityId);
    }
  }

  if (dormant.length === 0) {
    return {
      status: CONTROL_STATUS.PASS,
      evidenceIds: userFacts.map((f) => f.id),
      detail: `No dormant active Google Workspace users found (threshold: ${DORMANT_USER_DAYS} days).`,
    };
  }

  return {
    status: CONTROL_STATUS.FAIL,
    evidenceIds: userFacts.map((f) => f.id),
    detail: `${dormant.length} active user(s) have not logged in for over ${DORMANT_USER_DAYS} days: ${dormant.slice(0, 5).join(', ')}${dormant.length > 5 ? ` and ${dormant.length - 5} more` : ''}.`,
  };
}
