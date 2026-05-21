import type { Framework, Severity } from '../constants/index';
import { FRAMEWORKS, SEVERITY } from '../constants/index';

export interface CatalogControl {
  id: string;
  framework: Framework;
  controlId: string;
  title: string;
  description: string;
  severity: Severity;
  testFnKey: string;
  remediationGuidance: string;
  evidenceSources: string[];
}

export const SOC2_SECURITY_CONTROLS: CatalogControl[] = [
  // ─── CC6 — Logical and Physical Access ───────────────────────────────────────
  {
    id: 'soc2:cc6.1:root-mfa',
    framework: FRAMEWORKS.SOC2_SECURITY,
    controlId: 'CC6.1',
    title: 'Root / master account MFA enforced',
    description:
      'The AWS root account must have multi-factor authentication enabled to prevent unauthorized administrative access.',
    severity: SEVERITY.CRITICAL,
    testFnKey: 'soc2:cc6.1:root-mfa',
    remediationGuidance:
      'Sign in to the AWS console as root, navigate to Security Credentials, and enable a virtual or hardware MFA device. Do not create access keys for the root account.',
    evidenceSources: ['aws:iam:account_summary'],
  },
  {
    id: 'soc2:cc6.1:iam-key-rotation',
    framework: FRAMEWORKS.SOC2_SECURITY,
    controlId: 'CC6.1',
    title: 'IAM access keys rotated within 90 days',
    description:
      'Active IAM user access keys must be rotated at least every 90 days to limit the window of exposure for compromised credentials.',
    severity: SEVERITY.HIGH,
    testFnKey: 'soc2:cc6.1:iam-key-rotation',
    remediationGuidance:
      'Identify keys older than 90 days using the IAM credential report. Create a new key, update all consumers, then deactivate and delete the old key. Prefer IAM roles over long-lived access keys where possible.',
    evidenceSources: ['aws:iam:credential_report'],
  },
  {
    id: 'soc2:cc6.1:mfa-all-users',
    framework: FRAMEWORKS.SOC2_SECURITY,
    controlId: 'CC6.1',
    title: 'MFA enforced for all IAM users with console access',
    description:
      'Every IAM user with password-based console access must have MFA enabled to prevent account takeover.',
    severity: SEVERITY.HIGH,
    testFnKey: 'soc2:cc6.1:mfa-all-users',
    remediationGuidance:
      'Enable MFA for all IAM users. Consider enforcing MFA via an IAM policy that denies all actions except MFA enrollment until MFA is enabled. Prefer federated access via SSO over local IAM users.',
    evidenceSources: ['aws:iam:credential_report'],
  },
  {
    id: 'soc2:cc6.2:branch-protection',
    framework: FRAMEWORKS.SOC2_SECURITY,
    controlId: 'CC6.2',
    title: 'Branch protection enabled on default branches',
    description:
      'All in-scope repositories must have branch protection rules on their default branch to prevent unauthorized direct pushes.',
    severity: SEVERITY.HIGH,
    testFnKey: 'soc2:cc6.2:branch-protection',
    remediationGuidance:
      'In GitHub, navigate to each repository Settings > Branches and add a branch protection rule for the default branch. Enable "Require a pull request before merging" and "Require approvals" (minimum 1).',
    evidenceSources: ['github:repo:branch_protection'],
  },
  {
    id: 'soc2:cc6.2:required-reviews',
    framework: FRAMEWORKS.SOC2_SECURITY,
    controlId: 'CC6.2',
    title: 'Pull request reviews required before merge',
    description:
      'In-scope repositories must require at least one approving review before code can be merged to the default branch.',
    severity: SEVERITY.HIGH,
    testFnKey: 'soc2:cc6.2:required-reviews',
    remediationGuidance:
      'In GitHub branch protection settings, enable "Require approvals" and set the required number to at least 1. Enable "Dismiss stale pull request approvals when new commits are pushed" to prevent approval bypass.',
    evidenceSources: ['github:repo:branch_protection', 'github:repo:required_reviews'],
  },
  // ─── CC6.3 — Access Removal ───────────────────────────────────────────────────
  {
    id: 'soc2:cc6.3:stale-iam-credentials',
    framework: FRAMEWORKS.SOC2_SECURITY,
    controlId: 'CC6.3',
    title: 'No dormant IAM users with active credentials',
    description:
      'IAM users who have not logged in or used their access keys for more than 90 days represent unnecessary access risk and should be deactivated.',
    severity: SEVERITY.MEDIUM,
    testFnKey: 'soc2:cc6.3:stale-iam-credentials',
    remediationGuidance:
      'Review the IAM credential report for users with password_last_used or access_key_last_used older than 90 days. Disable console access and deactivate keys for dormant accounts. Remove accounts for departed employees.',
    evidenceSources: ['aws:iam:credential_report'],
  },
  // ─── CC7 — System Operations and Threat Detection ─────────────────────────────
  {
    id: 'soc2:cc7.1:cloudtrail-enabled',
    framework: FRAMEWORKS.SOC2_SECURITY,
    controlId: 'CC7.1',
    title: 'AWS CloudTrail enabled in all regions',
    description:
      'CloudTrail must be enabled and logging management events across all AWS regions to provide an audit trail of API activity.',
    severity: SEVERITY.CRITICAL,
    testFnKey: 'soc2:cc7.1:cloudtrail-enabled',
    remediationGuidance:
      'Create a multi-region CloudTrail trail that logs management events to an S3 bucket with MFA delete and versioning enabled. Enable CloudTrail log file integrity validation.',
    evidenceSources: ['aws:config:compliance'],
  },
  {
    id: 'soc2:cc7.1:securityhub-critical-findings',
    framework: FRAMEWORKS.SOC2_SECURITY,
    controlId: 'CC7.1',
    title: 'No open critical Security Hub findings',
    description:
      'AWS Security Hub must have no active CRITICAL severity findings. Critical findings represent immediate threats to account security.',
    severity: SEVERITY.CRITICAL,
    testFnKey: 'soc2:cc7.1:securityhub-critical-findings',
    remediationGuidance:
      'Enable AWS Security Hub and review all active CRITICAL findings. Remediate or suppress findings with documented justification. Enable Security Hub standards (AWS Foundational Security Best Practices, CIS AWS Foundations).',
    evidenceSources: ['aws:securityhub:findings'],
  },
  {
    id: 'soc2:cc7.1:config-noncompliant',
    framework: FRAMEWORKS.SOC2_SECURITY,
    controlId: 'CC7.1',
    title: 'No critical AWS Config rule violations',
    description:
      'AWS Config must have no NON_COMPLIANT resources for security-critical managed rules (encryption, public access, logging).',
    severity: SEVERITY.HIGH,
    testFnKey: 'soc2:cc7.1:config-noncompliant',
    remediationGuidance:
      'Enable AWS Config and deploy managed rules for common security baselines (S3 public access, RDS encryption, CloudTrail enabled, root MFA). Review and remediate NON_COMPLIANT resources.',
    evidenceSources: ['aws:config:compliance'],
  },
  // ─── CC8 — Change Management ──────────────────────────────────────────────────
  {
    id: 'soc2:cc8.1:status-checks',
    framework: FRAMEWORKS.SOC2_SECURITY,
    controlId: 'CC8.1',
    title: 'Required status checks enabled on default branches',
    description:
      'In-scope repositories must require status checks to pass before merging to ensure automated tests validate every change.',
    severity: SEVERITY.MEDIUM,
    testFnKey: 'soc2:cc8.1:status-checks',
    remediationGuidance:
      'In GitHub branch protection settings, enable "Require status checks to pass before merging" and add your CI workflow as a required check. This ensures code cannot be merged without passing automated tests.',
    evidenceSources: ['github:repo:branch_protection', 'github:repo:status_checks'],
  },
  {
    id: 'soc2:cc8.1:no-direct-push',
    framework: FRAMEWORKS.SOC2_SECURITY,
    controlId: 'CC8.1',
    title: 'Direct pushes to default branch restricted',
    description:
      'No contributor (including admins) should be able to push directly to the default branch without a pull request review.',
    severity: SEVERITY.HIGH,
    testFnKey: 'soc2:cc8.1:no-direct-push',
    remediationGuidance:
      'In GitHub branch protection settings, enable "Restrict who can push to matching branches" and enable "Include administrators" on the branch protection rule.',
    evidenceSources: ['github:repo:branch_protection'],
  },
  // ─── CC9 — Risk Mitigation ────────────────────────────────────────────────────
  {
    id: 'soc2:cc9.1:s3-public-access-blocked',
    framework: FRAMEWORKS.SOC2_SECURITY,
    controlId: 'CC9.1',
    title: 'S3 public access block enabled at account level',
    description:
      'The AWS account-level S3 public access block must be fully enabled to prevent accidental public exposure of S3 objects.',
    severity: SEVERITY.CRITICAL,
    testFnKey: 'soc2:cc9.1:s3-public-access-blocked',
    remediationGuidance:
      'In the S3 console, navigate to Block Public Access settings for the account and enable all four block settings: BlockPublicAcls, IgnorePublicAcls, BlockPublicPolicy, and RestrictPublicBuckets.',
    evidenceSources: ['aws:config:compliance'],
  },
  {
    id: 'soc2:cc9.1:no-root-access-keys',
    framework: FRAMEWORKS.SOC2_SECURITY,
    controlId: 'CC9.1',
    title: 'No active access keys for root account',
    description:
      'The AWS root account must not have active access keys. Root access keys cannot be scoped and represent the highest privilege credential.',
    severity: SEVERITY.CRITICAL,
    testFnKey: 'soc2:cc9.1:no-root-access-keys',
    remediationGuidance:
      'Sign in as root, navigate to Security Credentials, and delete all access keys. Use IAM roles with least-privilege policies for all programmatic access.',
    evidenceSources: ['aws:iam:account_summary'],
  },
  {
    id: 'soc2:cc9.1:password-policy',
    framework: FRAMEWORKS.SOC2_SECURITY,
    controlId: 'CC9.1',
    title: 'IAM account password policy meets minimum requirements',
    description:
      'The IAM account password policy must enforce minimum length (14+), complexity, and rotation to reduce brute-force risk.',
    severity: SEVERITY.MEDIUM,
    testFnKey: 'soc2:cc9.1:password-policy',
    remediationGuidance:
      'In IAM > Account Settings > Password policy, configure: minimum length 14, require uppercase, lowercase, numbers, and symbols, prevent password reuse (last 24), and set maximum age to 90 days.',
    evidenceSources: ['aws:iam:credential_report'],
  },
  {
    id: 'soc2:cc9.1:org-audit-log-retained',
    framework: FRAMEWORKS.SOC2_SECURITY,
    controlId: 'CC9.1',
    title: 'GitHub organization audit log events captured',
    description:
      'GitHub organization audit log events must be actively ingested and stored to ensure a durable record of access and configuration changes beyond GitHub\'s 180-day retention window.',
    severity: SEVERITY.MEDIUM,
    testFnKey: 'soc2:cc9.1:org-audit-log-retained',
    remediationGuidance:
      'Ensure the GitHub connector is active and running successfully. The connector ingests audit log events into the compliance platform evidence store, extending retention beyond GitHub\'s default 180-day window.',
    evidenceSources: ['github:org:audit_log'],
  },
];

export const CATALOG_BY_ID = Object.fromEntries(
  SOC2_SECURITY_CONTROLS.map((c) => [c.id, c]),
);

export const CATALOG_BY_TEST_FN_KEY = Object.fromEntries(
  SOC2_SECURITY_CONTROLS.map((c) => [c.testFnKey, c]),
);
