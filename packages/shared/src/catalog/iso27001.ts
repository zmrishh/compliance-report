import { FRAMEWORKS, SEVERITY } from '../constants/index';
import type { CatalogControl } from './soc2-security';

export const ISO27001_CONTROLS: CatalogControl[] = [
  // ─── A.9 — Access Control ─────────────────────────────────────────────────────
  {
    id: 'iso27001:a9.1.1:access-control-policy',
    framework: FRAMEWORKS.ISO27001,
    controlId: 'A.9.1.1',
    title: 'Access control policy',
    description:
      'An access control policy shall be established, documented and reviewed based on business and information security requirements.',
    severity: SEVERITY.HIGH,
    testFnKey: 'iso27001:a9.1.1:mfa-all-users',
    remediationGuidance:
      'Ensure MFA is enforced for all user accounts across your identity providers (AWS IAM, Okta, Google Workspace). Document and review your access control policy annually.',
    evidenceSources: ['aws:iam:account_summary', 'okta:user:directory', 'google:user:directory'],
  },
  {
    id: 'iso27001:a9.2.1:user-registration',
    framework: FRAMEWORKS.ISO27001,
    controlId: 'A.9.2.1',
    title: 'User registration and de-registration',
    description:
      'A formal user registration and de-registration process shall be implemented to enable assignment of access rights.',
    severity: SEVERITY.MEDIUM,
    testFnKey: 'iso27001:a9.2.1:no-dormant-users',
    remediationGuidance:
      'Remove or suspend accounts for users who have left the organization. Review dormant accounts (inactive > 90 days) quarterly.',
    evidenceSources: ['google:user:directory', 'okta:user:directory'],
  },
  {
    id: 'iso27001:a9.2.6:removal-of-access',
    framework: FRAMEWORKS.ISO27001,
    controlId: 'A.9.2.6',
    title: 'Removal or adjustment of access rights',
    description:
      'The access rights of all employees and external party users to information and information processing facilities shall be removed upon termination of their employment.',
    severity: SEVERITY.HIGH,
    testFnKey: 'iso27001:a9.2.6:no-dormant-users',
    remediationGuidance:
      'Implement an offboarding process that immediately deactivates accounts in all identity providers upon employment termination. Automate with SCIM provisioning where possible.',
    evidenceSources: ['google:user:directory', 'okta:user:directory'],
  },
  {
    id: 'iso27001:a9.4.2:secure-logon',
    framework: FRAMEWORKS.ISO27001,
    controlId: 'A.9.4.2',
    title: 'Secure log-on procedures',
    description:
      'Where required by the access control policy, access to systems and applications shall be controlled by a secure log-on procedure including MFA.',
    severity: SEVERITY.HIGH,
    testFnKey: 'iso27001:a9.4.2:mfa-enrolled',
    remediationGuidance:
      'Enforce multi-factor authentication on all critical systems. Configure Okta or Google Workspace to require MFA enrollment for all active users.',
    evidenceSources: ['aws:iam:account_summary', 'okta:factor:enrollment', 'google:user:directory'],
  },
  // ─── A.10 — Cryptography ──────────────────────────────────────────────────────
  {
    id: 'iso27001:a10.1.1:cryptographic-policy',
    framework: FRAMEWORKS.ISO27001,
    controlId: 'A.10.1.1',
    title: 'Policy on the use of cryptographic controls',
    description:
      'A policy on the use of cryptographic controls for protection of information shall be developed and implemented.',
    severity: SEVERITY.MEDIUM,
    testFnKey: 'iso27001:a10.1.1:s3-encryption',
    remediationGuidance:
      'Ensure all S3 buckets are configured with SSE-KMS encryption. Block public access on all buckets containing sensitive data.',
    evidenceSources: ['aws:s3:bucket_policy'],
  },
  // ─── A.12 — Operations Security ───────────────────────────────────────────────
  {
    id: 'iso27001:a12.4.1:event-logging',
    framework: FRAMEWORKS.ISO27001,
    controlId: 'A.12.4.1',
    title: 'Event logging',
    description:
      'Event logs recording user activities, exceptions, faults and information security events shall be produced, kept and regularly reviewed.',
    severity: SEVERITY.HIGH,
    testFnKey: 'iso27001:a12.4.1:cloudtrail-enabled',
    remediationGuidance:
      'Enable AWS CloudTrail in all regions with log file validation. Configure an S3 bucket with MFA Delete for CloudTrail logs.',
    evidenceSources: ['aws:cloudtrail:status'],
  },
  {
    id: 'iso27001:a12.6.1:vulnerability-management',
    framework: FRAMEWORKS.ISO27001,
    controlId: 'A.12.6.1',
    title: 'Management of technical vulnerabilities',
    description:
      'Information about technical vulnerabilities of information systems being used shall be obtained in a timely fashion.',
    severity: SEVERITY.HIGH,
    testFnKey: 'iso27001:a12.6.1:no-critical-findings',
    remediationGuidance:
      'Enable AWS Security Hub and resolve all CRITICAL and HIGH findings within your SLA. Review findings weekly.',
    evidenceSources: ['aws:securityhub:findings'],
  },
  // ─── A.14 — System Acquisition, Development & Maintenance ────────────────────
  {
    id: 'iso27001:a14.2.7:outsourced-dev',
    framework: FRAMEWORKS.ISO27001,
    controlId: 'A.14.2.7',
    title: 'Outsourced development',
    description:
      'The organization shall supervise and monitor the activity of outsourced system development including code review controls.',
    severity: SEVERITY.MEDIUM,
    testFnKey: 'iso27001:a14.2.7:branch-protection',
    remediationGuidance:
      'Require pull request reviews on all default branches. Configure GitHub branch protection rules to prevent direct pushes and require at least one approving review.',
    evidenceSources: ['github:repo:branch_protection'],
  },
  {
    id: 'iso27001:a14.2.9:system-acceptance-testing',
    framework: FRAMEWORKS.ISO27001,
    controlId: 'A.14.2.9',
    title: 'System acceptance testing',
    description:
      'Acceptance testing programs and related criteria shall be established for new information systems, upgrades and new versions.',
    severity: SEVERITY.MEDIUM,
    testFnKey: 'iso27001:a14.2.9:required-status-checks',
    remediationGuidance:
      'Configure required status checks on GitHub branch protection rules to ensure CI passes before merging. This enforces automated testing as part of the acceptance process.',
    evidenceSources: ['github:repo:branch_protection'],
  },
  // ─── A.16 — Information Security Incident Management ─────────────────────────
  {
    id: 'iso27001:a16.1.2:reporting-events',
    framework: FRAMEWORKS.ISO27001,
    controlId: 'A.16.1.2',
    title: 'Reporting information security events',
    description:
      'Information security events shall be reported through appropriate management channels as quickly as possible.',
    severity: SEVERITY.MEDIUM,
    testFnKey: 'iso27001:a16.1.2:securityhub-events',
    remediationGuidance:
      'Configure AWS Security Hub findings to trigger alerts. Ensure there is a documented incident response process and that all team members know how to report security events.',
    evidenceSources: ['aws:securityhub:findings'],
  },
  // ─── A.18 — Compliance ────────────────────────────────────────────────────────
  {
    id: 'iso27001:a18.1.3:records-protection',
    framework: FRAMEWORKS.ISO27001,
    controlId: 'A.18.1.3',
    title: 'Protection of records',
    description:
      'Records shall be protected from loss, destruction, falsification, unauthorized access and unauthorized release.',
    severity: SEVERITY.MEDIUM,
    testFnKey: 'iso27001:a18.1.3:cloudtrail-log-integrity',
    remediationGuidance:
      'Enable CloudTrail log file validation and store logs in an S3 bucket with versioning and MFA Delete enabled.',
    evidenceSources: ['aws:cloudtrail:status'],
  },
  {
    id: 'iso27001:a18.2.2:compliance-with-policies',
    framework: FRAMEWORKS.ISO27001,
    controlId: 'A.18.2.2',
    title: 'Compliance with security policies and standards',
    description:
      'Managers shall regularly review the compliance of information processing and procedures within their area of responsibility.',
    severity: SEVERITY.LOW,
    testFnKey: 'iso27001:a18.2.2:config-compliance',
    remediationGuidance:
      'Enable AWS Config rules to continuously evaluate resources against your security policies. Review the compliance dashboard weekly.',
    evidenceSources: ['aws:config:compliance'],
  },
];

export const ISO27001_CATALOG_BY_ID = Object.fromEntries(
  ISO27001_CONTROLS.map((c) => [c.id, c]),
);

export const ISO27001_CATALOG_BY_TEST_FN_KEY = Object.fromEntries(
  ISO27001_CONTROLS.map((c) => [c.testFnKey, c]),
);
