import type { RawFact as DbRawFact } from '@compliance/db';
import type { ControlTestResult } from '@compliance/shared';
import { CONTROL_STATUS } from '@compliance/shared';

export function testConfigNoncompliant(facts: DbRawFact[]): ControlTestResult {
  const configFacts = facts.filter((f) => f.entityType === 'aws:config:compliance');

  if (configFacts.length === 0) {
    return {
      status: CONTROL_STATUS.UNKNOWN,
      evidenceIds: [],
      detail: 'No AWS Config compliance data collected. Enable AWS Config and run a sync.',
    };
  }

  const evidenceIds = configFacts.map((f) => f.id);
  const violations: string[] = [];

  for (const fact of configFacts) {
    const data = fact.data as Record<string, unknown>;
    const compliance = data['ComplianceType'];
    const resource = String(data['ResourceId'] ?? fact.entityId);
    const ruleId = String(data['ConfigRuleId'] ?? '');

    if (compliance === 'NON_COMPLIANT') {
      violations.push(`${resource} (${ruleId})`);
    }
  }

  if (violations.length === 0) {
    return {
      status: CONTROL_STATUS.PASS,
      evidenceIds,
      detail: `All ${configFacts.length} AWS Config evaluated resource(s) are compliant.`,
    };
  }

  return {
    status: CONTROL_STATUS.FAIL,
    evidenceIds,
    detail: `${violations.length} AWS Config NON_COMPLIANT resource(s): ${violations.slice(0, 5).join('; ')}${violations.length > 5 ? ` and ${violations.length - 5} more` : ''}.`,
  };
}
