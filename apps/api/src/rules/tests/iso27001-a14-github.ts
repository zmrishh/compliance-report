import type { RawFact } from '@compliance/db';
import type { ControlTestResult } from '@compliance/shared';
import { CONTROL_STATUS } from '@compliance/shared';

export function testIso27001A147BranchProtection(facts: RawFact[]): ControlTestResult {
  const branchFacts = facts.filter((f) => f.entityType === 'github:repo:branch_protection');

  if (branchFacts.length === 0) {
    return {
      status: CONTROL_STATUS.UNKNOWN,
      detail: 'No GitHub branch protection data. Connect the GitHub connector.',
      evidenceIds: [],
    };
  }

  const unprotected = branchFacts.filter((f) => {
    const data = f.data as {
      isProtected?: boolean;
      requiresPullRequest?: boolean;
      requiredApprovingReviewCount?: number;
    };
    return (
      !data.isProtected ||
      !data.requiresPullRequest ||
      (data.requiredApprovingReviewCount ?? 0) < 1
    );
  });

  if (unprotected.length > 0) {
    const names = unprotected.map((f) => f.entityId);
    return {
      status: CONTROL_STATUS.FAIL,
      detail: `${unprotected.length} branch(es) lack required PR reviews: ${names.slice(0, 5).join(', ')}`,
      evidenceIds: unprotected.map((f) => f.id),
    };
  }

  return {
    status: CONTROL_STATUS.PASS,
    detail: `All ${branchFacts.length} branches require pull request reviews.`,
    evidenceIds: branchFacts.map((f) => f.id),
  };
}

export function testIso27001A149RequiredStatusChecks(facts: RawFact[]): ControlTestResult {
  const branchFacts = facts.filter((f) => f.entityType === 'github:repo:branch_protection');

  if (branchFacts.length === 0) {
    return {
      status: CONTROL_STATUS.UNKNOWN,
      detail: 'No GitHub branch protection data. Connect the GitHub connector.',
      evidenceIds: [],
    };
  }

  const noChecks = branchFacts.filter((f) => {
    const data = f.data as { requiresStatusChecks?: boolean; requiredStatusCheckContexts?: string[] };
    return !data.requiresStatusChecks || (data.requiredStatusCheckContexts ?? []).length === 0;
  });

  if (noChecks.length > 0) {
    const names = noChecks.map((f) => f.entityId);
    return {
      status: CONTROL_STATUS.FAIL,
      detail: `${noChecks.length} branch(es) have no required CI status checks: ${names.slice(0, 5).join(', ')}`,
      evidenceIds: noChecks.map((f) => f.id),
    };
  }

  return {
    status: CONTROL_STATUS.PASS,
    detail: `All ${branchFacts.length} branches require CI status checks before merging.`,
    evidenceIds: branchFacts.map((f) => f.id),
  };
}
