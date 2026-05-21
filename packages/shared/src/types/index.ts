import type {
  AuditAction,
  ConnectorRunStatus,
  ConnectorType,
  ControlStatus,
  EvidenceSourceType,
  Framework,
  Severity,
  SourceType,
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
