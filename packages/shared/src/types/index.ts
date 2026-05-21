import type {
  AccessReviewDecision,
  AccessReviewStatus,
  AuditAction,
  ConnectorRunStatus,
  ConnectorType,
  ControlStatus,
  EvidenceSourceType,
  Framework,
  IntegrationType,
  NotificationEvent,
  PolicyStatus,
  PolicyType,
  Severity,
  SourceType,
  VendorCategory,
  VendorRiskRating,
  WebhookEvent,
  WorkspaceRole,
} from '../constants/index';

// ─── Core domain types ────────────────────────────────────────────────────────

export interface Organization {
  id: string;
  workosOrgId: string;
  name: string;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface Workspace {
  id: string;
  orgId: string;
  name: string;
  description: string | null;
  framework: Framework;
  systemBoundary: string | null;
  readinessScore: number | null;
  readinessScoreUpdatedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface WorkspaceMember {
  id: string;
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConnectorConfig {
  id: string;
  orgId: string;
  type: ConnectorType;
  displayName: string;
  credentialsRef: string;
  config: Record<string, unknown>;
  isActive: boolean;
  lastSyncAt: Date | null;
  lastSyncStatus: ConnectorRunStatus | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface ConnectorRun {
  id: string;
  connectorConfigId: string;
  startedAt: Date;
  finishedAt: Date | null;
  status: ConnectorRunStatus;
  factCount: number;
  errorMessage: string | null;
  triggeredBy: 'scheduler' | 'manual';
}

export interface RawFact {
  id: string;
  connectorConfigId: string;
  sourceType: SourceType;
  entityType: string;
  entityId: string;
  data: Record<string, unknown>;
  contentHash: string;
  collectedAt: Date;
}

export interface Control {
  id: string;
  framework: Framework;
  controlId: string;
  title: string;
  description: string;
  severity: Severity;
  testFnKey: string;
  remediationGuidance: string;
  evidenceSources: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ControlState {
  id: string;
  workspaceId: string;
  controlId: string;
  status: ControlStatus;
  ownerId: string | null;
  lastEvaluatedAt: Date | null;
  detail: string | null;
  notes: string | null;
  waivedAt: Date | null;
  waivedBy: string | null;
  waivedReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface EvidenceRecord {
  id: string;
  controlStateId: string;
  workspaceId: string;
  sourceType: EvidenceSourceType;
  storageKey: string | null;
  contentHash: string;
  fileName: string | null;
  mimeType: string | null;
  fileSizeBytes: number | null;
  collectedAt: Date;
  uploaderId: string | null;
  expiresAt: Date | null;
  createdAt: Date;
}

export interface AuditEvent {
  id: string;
  actorId: string | null;
  orgId: string;
  action: AuditAction;
  resourceType: string | null;
  resourceId: string | null;
  metadata: Record<string, unknown>;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
}

// ─── Authenticated request context ───────────────────────────────────────────

export interface AuthenticatedUser {
  userId: string;
  orgId: string;
  workosUserId: string;
  email: string;
}

// ─── Connector runtime types ──────────────────────────────────────────────────

export interface RawFactInput {
  connectorConfigId: string;
  sourceType: SourceType;
  entityType: string;
  entityId: string;
  data: Record<string, unknown>;
  collectedAt: Date;
}

export interface ControlTestResult {
  status: ControlStatus;
  evidenceIds: string[];
  detail: string;
}

// ─── API response shapes ──────────────────────────────────────────────────────

export interface ReadinessSummary {
  workspaceId: string;
  score: number;
  updatedAt: Date | null;
  breakdown: {
    pass: number;
    fail: number;
    unknown: number;
    waived: number;
  };
  topFailures: Array<{
    controlId: string;
    title: string;
    severity: Severity;
    detail: string | null;
    remediationGuidance: string;
  }>;
}

export interface PaginatedResponse<T> {
  data: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface IntegrationConfig {
  id: string;
  orgId: string;
  workspaceId: string | null;
  type: IntegrationType;
  config: Record<string, unknown>;
  credentialsRef: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuditorShare {
  id: string;
  workspaceId: string;
  orgId: string;
  label: string;
  expiresAt: Date;
  createdByUserId: string;
  revokedAt: Date | null;
  createdAt: Date;
}

export interface AiDraftResult {
  type: 'policy' | 'procedure';
  controlId: string;
  content: string;
  model: string;
  generatedAt: Date;
}

export interface Policy {
  id: string;
  workspaceId: string;
  orgId: string;
  controlId: string | null;
  title: string;
  type: PolicyType;
  status: PolicyStatus;
  version: number;
  content: string;
  createdBy: string;
  publishedBy: string | null;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReadinessSnapshotPoint {
  snapshottedAt: Date;
  score: number;
  passCount: number;
  failCount: number;
  unknownCount: number;
  waivedCount: number;
  totalCount: number;
}

export interface AccessReviewCampaign {
  id: string;
  workspaceId: string;
  orgId: string;
  name: string;
  connectorType: string;
  status: AccessReviewStatus;
  dueDate: Date;
  createdBy: string;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AccessReviewItem {
  id: string;
  campaignId: string;
  workspaceId: string;
  userIdExternal: string;
  userEmail: string;
  userDisplayName: string;
  accessLevel: string;
  reviewerId: string | null;
  decision: AccessReviewDecision;
  reviewedAt: Date | null;
  notes: string | null;
  createdAt: Date;
}

export interface NotificationPreference {
  id: string;
  userId: string;
  orgId: string;
  eventType: NotificationEvent;
  enabled: boolean;
}

export interface WebhookConfig {
  id: string;
  orgId: string;
  workspaceId: string | null;
  url: string;
  events: WebhookEvent[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Vendor {
  id: string;
  orgId: string;
  name: string;
  website: string | null;
  category: VendorCategory;
  riskRating: VendorRiskRating;
  reviewCycleDays: number;
  lastReviewedAt: Date | null;
  reviewedBy: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}
