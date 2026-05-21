import type { RawFact as DbRawFact } from '@compliance/db';
import type { ControlTestResult } from '@compliance/shared';
import { CONTROL_STATUS } from '@compliance/shared';

export function testSecurityHubCriticalFindings(facts: DbRawFact[]): ControlTestResult {
  const findingFacts = facts.filter((f) => f.entityType === 'aws:securityhub:findings');

  if (findingFacts.length === 0) {
    return {
      status: CONTROL_STATUS.UNKNOWN,
      evidenceIds: [],
      detail: 'No Security Hub findings data collected. Enable Security Hub and run a sync.',
    };
  }

  const evidenceIds = findingFacts.map((f) => f.id);
  const criticalFindings: string[] = [];

  for (const fact of findingFacts) {
    const data = fact.data as Record<string, unknown>;
    const severity = (data['Severity'] as Record<string, unknown>)?.['Label'];
    const recordState = data['RecordState'];
    const workflowState = (data['Workflow'] as Record<string, unknown>)?.['Status'];

    if (
      severity === 'CRITICAL' &&
      recordState === 'ACTIVE' &&
      workflowState !== 'SUPPRESSED'
    ) {
      const title = String(data['Title'] ?? fact.entityId);
      criticalFindings.push(title);
    }
  }

  if (criticalFindings.length === 0) {
    return {
      status: CONTROL_STATUS.PASS,
      evidenceIds,
      detail: 'No active CRITICAL Security Hub findings.',
    };
  }

  return {
    status: CONTROL_STATUS.FAIL,
    evidenceIds,
    detail: `${criticalFindings.length} active CRITICAL Security Hub finding(s): ${criticalFindings.slice(0, 3).join('; ')}${criticalFindings.length > 3 ? ` and ${criticalFindings.length - 3} more` : ''}.`,
  };
}
