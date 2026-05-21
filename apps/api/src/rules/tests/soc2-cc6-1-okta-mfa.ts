import type { RawFact } from '@compliance/db';
import { CONTROL_STATUS } from '@compliance/shared';
import type { ControlTestResult } from '@compliance/shared';

export function testOktaMfaEnrolled(facts: RawFact[]): ControlTestResult {
  const userFacts = facts.filter((f) => f.entityType === 'okta:user:directory');
  const factorFacts = facts.filter((f) => f.entityType === 'okta:factor:enrollment');

  if (userFacts.length === 0) {
    return {
      status: CONTROL_STATUS.UNKNOWN,
      evidenceIds: [],
      detail: 'No Okta user data collected. Ensure the Okta connector is active.',
    };
  }

  // Build a set of userIds who have at least one ACTIVE factor
  const usersWithActiveFactor = new Set<string>();
  for (const fact of factorFacts) {
    const data = fact.data as { userId?: string; status?: string };
    if (data.status === 'ACTIVE' && data.userId) {
      usersWithActiveFactor.add(data.userId);
    }
  }

  const noMfa: string[] = [];
  for (const fact of userFacts) {
    const data = fact.data as { id?: string; login?: string; status?: string };
    if (data.status !== 'ACTIVE') continue;
    if (data.id && !usersWithActiveFactor.has(data.id)) {
      noMfa.push(data.login ?? fact.entityId);
    }
  }

  if (noMfa.length === 0) {
    return {
      status: CONTROL_STATUS.PASS,
      evidenceIds: [...userFacts, ...factorFacts].map((f) => f.id),
      detail: 'All active Okta users have at least one enrolled MFA factor.',
    };
  }

  return {
    status: CONTROL_STATUS.FAIL,
    evidenceIds: [...userFacts, ...factorFacts].map((f) => f.id),
    detail: `${noMfa.length} active Okta user(s) have no enrolled MFA factor: ${noMfa.slice(0, 5).join(', ')}${noMfa.length > 5 ? ` and ${noMfa.length - 5} more` : ''}.`,
  };
}
