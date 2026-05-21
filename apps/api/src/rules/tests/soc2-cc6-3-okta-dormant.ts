import type { RawFact } from '@compliance/db';
import { CONTROL_STATUS, DORMANT_USER_DAYS } from '@compliance/shared';
import type { ControlTestResult } from '@compliance/shared';

export function testOktaDormantUsers(facts: RawFact[]): ControlTestResult {
  const userFacts = facts.filter((f) => f.entityType === 'okta:user:directory');

  if (userFacts.length === 0) {
    return {
      status: CONTROL_STATUS.UNKNOWN,
      evidenceIds: [],
      detail: 'No Okta user data collected. Ensure the Okta connector is active.',
    };
  }

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - DORMANT_USER_DAYS);

  const dormant: string[] = [];
  for (const fact of userFacts) {
    const data = fact.data as {
      login?: string;
      status?: string;
      lastLogin?: string | null;
    };
    if (data.status !== 'ACTIVE') continue;
    if (!data.lastLogin) {
      dormant.push(data.login ?? fact.entityId);
      continue;
    }
    if (new Date(data.lastLogin) < cutoff) {
      dormant.push(data.login ?? fact.entityId);
    }
  }

  if (dormant.length === 0) {
    return {
      status: CONTROL_STATUS.PASS,
      evidenceIds: userFacts.map((f) => f.id),
      detail: `No dormant active Okta users found (threshold: ${DORMANT_USER_DAYS} days).`,
    };
  }

  return {
    status: CONTROL_STATUS.FAIL,
    evidenceIds: userFacts.map((f) => f.id),
    detail: `${dormant.length} active Okta user(s) have not logged in for over ${DORMANT_USER_DAYS} days: ${dormant.slice(0, 5).join(', ')}${dormant.length > 5 ? ` and ${dormant.length - 5} more` : ''}.`,
  };
}
