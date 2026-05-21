export const FRAMEWORKS = {
  SOC2_SECURITY: 'soc2:security',
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

export const EVALUATE_RATE_LIMIT_HOURS = 1;
export const PRESIGNED_URL_TTL_SECONDS = 900; // 15 minutes
export const IAM_KEY_MAX_AGE_DAYS = 90;
export const DORMANT_USER_DAYS = 90;
