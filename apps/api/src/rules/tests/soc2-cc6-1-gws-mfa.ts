import type { ControlState as DbRawFact } from '@compliance/db';
import type { RawFact } from '@compliance/db';
import { CONTROL_STATUS } from '@compliance/shared';
import type { ControlTestResult } from '@compliance/shared';

export function testGwsMfaEnrolled(facts: RawFact[]): ControlTestResult {
  const userFacts = facts.filter((f) => f.entityType === 'google:user:directory');

  if (userFacts.length === 0) {
    return {
      status: CONTROL_STATUS.UNKNOWN,
      evidenceIds: [],
      detail: 'No Google Workspace user data collected. Ensure the Google Workspace connector is active.',
    };
  }

  const nonEnrolled: string[] = [];
  for (const fact of userFacts) {
    const data = fact.data as {
      email?: string;
      suspended?: boolean;
      isEnrolledIn2Sv?: boolean;
    };
    // Skip suspended users
    if (data.suspended) continue;
    if (!data.isEnrolledIn2Sv) {
      nonEnrolled.push(data.email ?? fact.entityId);
    }
  }

  if (nonEnrolled.length === 0) {
    return {
      status: CONTROL_STATUS.PASS,
      evidenceIds: userFacts.map((f) => f.id),
      detail: `All ${userFacts.length} active Google Workspace users are enrolled in 2-Step Verification.`,
    };
  }

  return {
    status: CONTROL_STATUS.FAIL,
    evidenceIds: userFacts.map((f) => f.id),
    detail: `${nonEnrolled.length} active user(s) are not enrolled in 2SV: ${nonEnrolled.slice(0, 5).join(', ')}${nonEnrolled.length > 5 ? ` and ${nonEnrolled.length - 5} more` : ''}.`,
  };
}
