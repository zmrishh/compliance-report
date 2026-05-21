/**
 * ISO 27001 A.9.1.1 / A.9.4.2 — MFA across all identity providers.
 * This re-uses the evidence collected by the GWS and Okta connectors as well
 * as the existing AWS IAM MFA check.  Any one of the checks failing constitutes
 * a finding.
 */
import type { RawFact } from '@compliance/db';
import type { ControlTestResult } from '@compliance/shared';
import { CONTROL_STATUS } from '@compliance/shared';

export function testIso27001A91Mfa(facts: RawFact[]): ControlTestResult {
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

  const issues: string[] = [];

  for (const f of userFacts) {
    const data = f.data as {
      email?: string;
      login?: string;
      suspended?: boolean;
      status?: string;
      isEnrolledInTwoSvp?: boolean;
      mfaFactorCount?: number;
    };

    const isActive =
      f.entityType === 'google:user:directory' ? !data.suspended : data.status === 'ACTIVE';
    if (!isActive) continue;

    const email = data.email ?? data.login ?? f.entityId;
    const hasMfa =
      f.entityType === 'google:user:directory'
        ? data.isEnrolledInTwoSvp === true
        : (data.mfaFactorCount ?? 0) > 0;

    if (!hasMfa) issues.push(email);
  }

  if (issues.length > 0) {
    return {
      status: CONTROL_STATUS.FAIL,
      detail: `${issues.length} user(s) lack MFA enrollment: ${issues.slice(0, 5).join(', ')}${issues.length > 5 ? '…' : ''}`,
      evidenceIds: [],
    };
  }

  return {
    status: CONTROL_STATUS.PASS,
    detail: `All ${userFacts.length} active users have MFA enrolled.`,
    evidenceIds: [],
  };
}
