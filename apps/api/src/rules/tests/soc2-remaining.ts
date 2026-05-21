/**
 * Remaining SOC 2 test functions that rely on evidence types collected by later connectors
 * (Google Workspace, Okta) or are placeholder-completed for the launch catalog.
 * These return UNKNOWN until the relevant connector is connected.
 */
import type { RawFact as DbRawFact } from '@compliance/db';
import type { ControlTestResult } from '@compliance/shared';
import { CONTROL_STATUS } from '@compliance/shared';

export function testCloudtrailEnabled(facts: DbRawFact[]): ControlTestResult {
  const configFacts = facts.filter((f) => f.entityType === 'aws:config:compliance');
  if (configFacts.length === 0) {
    return { status: CONTROL_STATUS.UNKNOWN, evidenceIds: [], detail: 'No AWS Config data collected yet.' };
  }
  const evidenceIds = configFacts.map((f) => f.id);
  const trailCompliant = configFacts.filter((f) => {
    const data = f.data as Record<string, unknown>;
    return String(data['ConfigRuleName'] ?? '').toLowerCase().includes('cloudtrail') &&
           data['ComplianceType'] === 'COMPLIANT';
  });
  const trailNonCompliant = configFacts.filter((f) => {
    const data = f.data as Record<string, unknown>;
    return String(data['ConfigRuleName'] ?? '').toLowerCase().includes('cloudtrail') &&
           data['ComplianceType'] === 'NON_COMPLIANT';
  });
  if (trailNonCompliant.length > 0) {
    return { status: CONTROL_STATUS.FAIL, evidenceIds, detail: 'CloudTrail Config rule is NON_COMPLIANT. Verify CloudTrail is enabled in all regions.' };
  }
  if (trailCompliant.length > 0) {
    return { status: CONTROL_STATUS.PASS, evidenceIds, detail: 'CloudTrail Config rule is COMPLIANT.' };
  }
  return { status: CONTROL_STATUS.UNKNOWN, evidenceIds, detail: 'No CloudTrail-specific Config rule found. Ensure the cloudtrail-enabled managed rule is deployed.' };
}

export function testS3PublicAccessBlocked(facts: DbRawFact[]): ControlTestResult {
  const configFacts = facts.filter((f) => f.entityType === 'aws:config:compliance');
  if (configFacts.length === 0) {
    return { status: CONTROL_STATUS.UNKNOWN, evidenceIds: [], detail: 'No AWS Config data collected yet.' };
  }
  const evidenceIds = configFacts.map((f) => f.id);
  const s3Rules = configFacts.filter((f) => {
    const data = f.data as Record<string, unknown>;
    return String(data['ConfigRuleName'] ?? '').toLowerCase().includes('s3-account-level-public-access');
  });
  if (s3Rules.length === 0) {
    return { status: CONTROL_STATUS.UNKNOWN, evidenceIds, detail: 'No S3 public access Config rule found.' };
  }
  const failing = s3Rules.filter((f) => (f.data as Record<string, unknown>)['ComplianceType'] === 'NON_COMPLIANT');
  if (failing.length > 0) {
    return { status: CONTROL_STATUS.FAIL, evidenceIds, detail: 'S3 account-level public access block is NOT fully enabled.' };
  }
  return { status: CONTROL_STATUS.PASS, evidenceIds, detail: 'S3 account-level public access block is fully enabled.' };
}

export function testPasswordPolicy(facts: DbRawFact[]): ControlTestResult {
  const credFacts = facts.filter((f) => f.entityType === 'aws:iam:credential_report');
  if (credFacts.length === 0) {
    return { status: CONTROL_STATUS.UNKNOWN, evidenceIds: [], detail: 'No IAM credential report data collected yet.' };
  }
  return { status: CONTROL_STATUS.UNKNOWN, evidenceIds: credFacts.map((f) => f.id), detail: 'Password policy check requires GetAccountPasswordPolicy API — add to AWS connector in next iteration.' };
}

export function testOrgAuditLogRetained(facts: DbRawFact[]): ControlTestResult {
  const auditFacts = facts.filter((f) => f.entityType === 'github:org:audit_log');
  if (auditFacts.length === 0) {
    return { status: CONTROL_STATUS.UNKNOWN, evidenceIds: [], detail: 'No GitHub org audit log events collected yet. Connect and sync the GitHub connector.' };
  }
  const evidenceIds = auditFacts.map((f) => f.id);
  const mostRecent = new Date(Math.max(...auditFacts.map((f) => f.collectedAt.getTime())));
  const hoursSinceLastSync = (Date.now() - mostRecent.getTime()) / 3_600_000;
  if (hoursSinceLastSync > 12) {
    return { status: CONTROL_STATUS.FAIL, evidenceIds, detail: `GitHub audit log last collected ${hoursSinceLastSync.toFixed(0)} hours ago. Verify the GitHub connector is running on schedule.` };
  }
  return { status: CONTROL_STATUS.PASS, evidenceIds, detail: `GitHub org audit log is being actively ingested (${auditFacts.length} events stored). Last sync: ${mostRecent.toISOString()}.` };
}
