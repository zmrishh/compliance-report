import type { RawFact } from '@compliance/db';
import type { ControlTestResult } from '@compliance/shared';
import { CONTROL_STATUS } from '@compliance/shared';

export function testIso27001A124CloudtrailEnabled(facts: RawFact[]): ControlTestResult {
  const trailFacts = facts.filter((f) => f.entityType === 'aws:cloudtrail:status');

  if (trailFacts.length === 0) {
    return {
      status: CONTROL_STATUS.UNKNOWN,
      detail: 'No AWS CloudTrail data collected. Connect the AWS connector.',
      evidenceIds: [],
    };
  }

  const inactive = trailFacts.filter((f) => {
    const data = f.data as { isLogging?: boolean };
    return !data.isLogging;
  });

  if (inactive.length > 0) {
    const names = inactive.map((f) => f.entityId);
    return {
      status: CONTROL_STATUS.FAIL,
      detail: `${inactive.length} CloudTrail trail(s) are not logging: ${names.join(', ')}`,
      evidenceIds: inactive.map((f) => f.id),
    };
  }

  return {
    status: CONTROL_STATUS.PASS,
    detail: `${trailFacts.length} CloudTrail trail(s) are active and logging.`,
    evidenceIds: trailFacts.map((f) => f.id),
  };
}

export function testIso27001A1813CloudtrailLogIntegrity(facts: RawFact[]): ControlTestResult {
  const trailFacts = facts.filter((f) => f.entityType === 'aws:cloudtrail:status');

  if (trailFacts.length === 0) {
    return {
      status: CONTROL_STATUS.UNKNOWN,
      detail: 'No AWS CloudTrail data collected. Connect the AWS connector.',
      evidenceIds: [],
    };
  }

  const noValidation = trailFacts.filter((f) => {
    const data = f.data as { logFileValidationEnabled?: boolean };
    return !data.logFileValidationEnabled;
  });

  if (noValidation.length > 0) {
    const names = noValidation.map((f) => f.entityId);
    return {
      status: CONTROL_STATUS.FAIL,
      detail: `${noValidation.length} trail(s) have log file validation disabled: ${names.join(', ')}`,
      evidenceIds: noValidation.map((f) => f.id),
    };
  }

  return {
    status: CONTROL_STATUS.PASS,
    detail: `All ${trailFacts.length} CloudTrail trail(s) have log file validation enabled.`,
    evidenceIds: trailFacts.map((f) => f.id),
  };
}
