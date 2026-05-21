export const FRAMEWORKS = {
  SOC2_SECURITY: 'soc2:security',
  ISO27001: 'iso27001',
} as const;

export type Framework = (typeof FRAMEWORKS)[keyof typeof FRAMEWORKS];

export const CONTROL_STATUS = {
  PASS: 'PASS',
  FAIL: 'FAIL',
  UNKNOWN: 'UNKNOWN',
  WAIVED: 'WAIVED',
} as const;

export type ControlStatus = (typeof CONTROL_STATUS)[keyof typeof CONTROL_STATUS];

export const SEVERITY = {
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
} as const;

export type Severity = (typeof SEVERITY)[keyof typeof SEVERITY];

export const CONNECTOR_TYPE = {
  AWS: 'aws',
  GITHUB: 'github',
  GOOGLE_WORKSPACE: 'google_workspace',
  OKTA: 'okta',
  JIRA: 'jira',
} as const;

export type ConnectorType = (typeof CONNECTOR_TYPE)[keyof typeof CONNECTOR_TYPE];

export const CONNECTOR_RUN_STATUS = {
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const;

export type ConnectorRunStatus =
  (typeof CONNECTOR_RUN_STATUS)[keyof typeof CONNECTOR_RUN_STATUS];

export const WORKSPACE_ROLE = {
  OWNER: 'owner',
  EDITOR: 'editor',
  VIEWER: 'viewer',
} as const;

export type WorkspaceRole = (typeof WORKSPACE_ROLE)[keyof typeof WORKSPACE_ROLE];

export const AUDIT_ACTION = {
  WORKSPACE_CREATED: 'workspace.created',
  WORKSPACE_UPDATED: 'workspace.updated',
  WORKSPACE_DELETED: 'workspace.deleted',
  CONNECTOR_CREATED: 'connector.created',
  CONNECTOR_DELETED: 'connector.deleted',
  CONNECTOR_SYNCED: 'connector.synced',
  EVIDENCE_UPLOADED: 'evidence.uploaded',
  EVIDENCE_DOWNLOADED: 'evidence.downloaded',
  EVIDENCE_SHARED: 'evidence.shared',
  CONTROL_STATE_UPDATED: 'control_state.updated',
  CONTROL_WAIVED: 'control.waived',
  MEMBER_ADDED: 'member.added',
  MEMBER_REMOVED: 'member.removed',
  EVALUATE_TRIGGERED: 'evaluate.triggered',
  AI_DRAFT: 'ai.draft',
  JIRA_TICKET_CREATED: 'jira.ticket_created',
  SHARE_CREATED: 'share.created',
  SHARE_REVOKED: 'share.revoked',
  EXPORT_DOWNLOADED: 'export.downloaded',
  POLICY_PUBLISHED: 'policy.published',
  POLICY_ARCHIVED: 'policy.archived',
  ACCESS_REVIEW_CREATED: 'access_review.created',
  ACCESS_REVIEW_COMPLETED: 'access_review.completed',
  VENDOR_CREATED: 'vendor.created',
  VENDOR_UPDATED: 'vendor.updated',
} as const;

export type AuditAction = (typeof AUDIT_ACTION)[keyof typeof AUDIT_ACTION];

export const SOURCE_TYPE = {
  AWS: 'aws',
  GITHUB: 'github',
  GOOGLE_WORKSPACE: 'google_workspace',
  OKTA: 'okta',
  JIRA: 'jira',
  MANUAL: 'manual',
} as const;

export type SourceType = (typeof SOURCE_TYPE)[keyof typeof SOURCE_TYPE];

export const EVIDENCE_SOURCE_TYPE = {
  CONNECTOR: 'connector',
  MANUAL_UPLOAD: 'manual_upload',
} as const;

export type EvidenceSourceType =
  (typeof EVIDENCE_SOURCE_TYPE)[keyof typeof EVIDENCE_SOURCE_TYPE];

export const ALLOWED_EVIDENCE_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/gif',
  'text/plain',
  'text/csv',
  'application/json',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip',
] as const;

export const MAX_EVIDENCE_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

export const READINESS_SCORE_WEIGHTS: Record<Severity, number> = {
  critical: 3,
  high: 2,
  medium: 1,
  low: 0.5,
};

export const CONNECTOR_SCHEDULE_HOURS: Record<ConnectorType, number> = {
  aws: 6,
  github: 4,
  google_workspace: 6,
  okta: 6,
  jira: 12,
};

export const INTEGRATION_TYPE = {
  JIRA: 'jira',
  SLACK: 'slack',
} as const;

export type IntegrationType = (typeof INTEGRATION_TYPE)[keyof typeof INTEGRATION_TYPE];

export const POLICY_STATUS = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  ARCHIVED: 'archived',
} as const;

export type PolicyStatus = (typeof POLICY_STATUS)[keyof typeof POLICY_STATUS];

export const POLICY_TYPE = {
  POLICY: 'policy',
  PROCEDURE: 'procedure',
  RUNBOOK: 'runbook',
} as const;

export type PolicyType = (typeof POLICY_TYPE)[keyof typeof POLICY_TYPE];

export const ACCESS_REVIEW_STATUS = {
  OPEN: 'open',
  COMPLETED: 'completed',
  EXPIRED: 'expired',
} as const;

export type AccessReviewStatus = (typeof ACCESS_REVIEW_STATUS)[keyof typeof ACCESS_REVIEW_STATUS];

export const ACCESS_REVIEW_DECISION = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REVOKED: 'revoked',
} as const;

export type AccessReviewDecision = (typeof ACCESS_REVIEW_DECISION)[keyof typeof ACCESS_REVIEW_DECISION];

export const NOTIFICATION_EVENT = {
  CONTROL_REGRESSION: 'control.regression',
  CONNECTOR_FAILED: 'connector.failed',
  ACCESS_REVIEW_ASSIGNED: 'access_review.assigned',
  ACCESS_REVIEW_DUE: 'access_review.due',
  EXPORT_READY: 'export.ready',
} as const;

export type NotificationEvent = (typeof NOTIFICATION_EVENT)[keyof typeof NOTIFICATION_EVENT];

export const WEBHOOK_EVENT = {
  CONTROL_REGRESSION: 'control.regression',
  READINESS_SCORE_CHANGED: 'readiness.score_changed',
  CONNECTOR_FAILED: 'connector.failed',
  ACCESS_REVIEW_COMPLETED: 'access_review.completed',
} as const;

export type WebhookEvent = (typeof WEBHOOK_EVENT)[keyof typeof WEBHOOK_EVENT];

export const VENDOR_CATEGORY = {
  SAAS: 'saas',
  INFRASTRUCTURE: 'infrastructure',
  PAYMENTS: 'payments',
  HR: 'hr',
  OTHER: 'other',
} as const;

export type VendorCategory = (typeof VENDOR_CATEGORY)[keyof typeof VENDOR_CATEGORY];

export const VENDOR_RISK_RATING = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
} as const;

export type VendorRiskRating = (typeof VENDOR_RISK_RATING)[keyof typeof VENDOR_RISK_RATING];

export const EVALUATE_RATE_LIMIT_HOURS = 1;
export const PRESIGNED_URL_TTL_SECONDS = 900; // 15 minutes
export const IAM_KEY_MAX_AGE_DAYS = 90;
export const DORMANT_USER_DAYS = 90;
export const AUDITOR_SHARE_MAX_EXPIRY_DAYS = 90;
