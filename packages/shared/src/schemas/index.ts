import { z } from 'zod';

import {
  CONNECTOR_TYPE,
  CONTROL_STATUS,
  FRAMEWORKS,
  INTEGRATION_TYPE,
  SEVERITY,
  WORKSPACE_ROLE,
} from '../constants/index';

// ─── Utility ──────────────────────────────────────────────────────────────────

export const uuidSchema = z.string().uuid();
export const cursorSchema = z.string().optional();
export const limitSchema = z.coerce.number().int().min(1).max(100).default(25);

// ─── Organization ─────────────────────────────────────────────────────────────

export const createOrganizationSchema = z.object({
  workosOrgId: z.string().min(1),
  name: z.string().min(1).max(200),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
});

// ─── Workspace ────────────────────────────────────────────────────────────────

export const createWorkspaceSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  framework: z.enum([FRAMEWORKS.SOC2_SECURITY]),
  systemBoundary: z.string().max(2000).optional(),
});

export const updateWorkspaceSchema = createWorkspaceSchema.partial();

export const listWorkspacesSchema = z.object({
  cursor: cursorSchema,
  limit: limitSchema,
});

// ─── Workspace Members ────────────────────────────────────────────────────────

export const addWorkspaceMemberSchema = z.object({
  userId: z.string().min(1),
  role: z.enum([WORKSPACE_ROLE.OWNER, WORKSPACE_ROLE.EDITOR, WORKSPACE_ROLE.VIEWER]),
});

export const updateWorkspaceMemberSchema = z.object({
  role: z.enum([WORKSPACE_ROLE.OWNER, WORKSPACE_ROLE.EDITOR, WORKSPACE_ROLE.VIEWER]),
});

// ─── Connector Configs ────────────────────────────────────────────────────────

const awsCredentialsSchema = z.union([
  z.object({
    type: z.literal('role'),
    roleArn: z.string().regex(/^arn:aws:iam::\d{12}:role\/.+$/, 'Invalid IAM role ARN'),
    externalId: z.string().min(1).optional(),
  }),
  z.object({
    type: z.literal('keys'),
    accessKeyId: z.string().min(16).max(128),
    secretAccessKey: z.string().min(1),
  }),
]);

const githubCredentialsSchema = z.union([
  z.object({
    type: z.literal('github_app'),
    appId: z.coerce.number().int().positive(),
    privateKey: z.string().min(1),
    installationId: z.coerce.number().int().positive(),
  }),
  z.object({
    type: z.literal('pat'),
    token: z.string().min(1),
  }),
]);

const googleWorkspaceCredentialsSchema = z.object({
  type: z.literal('service_account'),
  clientEmail: z.string().email(),
  privateKey: z.string().min(1),
  impersonateEmail: z.string().email(),
});

const oktaCredentialsSchema = z.object({
  type: z.literal('api_token'),
  token: z.string().min(1),
});

export const createConnectorConfigSchema = z.discriminatedUnion('connectorType', [
  z.object({
    connectorType: z.literal(CONNECTOR_TYPE.AWS),
    displayName: z.string().min(1).max(200),
    credentials: awsCredentialsSchema,
    config: z.object({
      region: z.string().default('us-east-1'),
      accountId: z.string().regex(/^\d{12}$/, 'AWS account ID must be 12 digits').optional(),
    }),
  }),
  z.object({
    connectorType: z.literal(CONNECTOR_TYPE.GITHUB),
    displayName: z.string().min(1).max(200),
    credentials: githubCredentialsSchema,
    config: z.object({
      orgLogin: z.string().min(1),
    }),
  }),
  z.object({
    connectorType: z.literal(CONNECTOR_TYPE.GOOGLE_WORKSPACE),
    displayName: z.string().min(1).max(200),
    credentials: googleWorkspaceCredentialsSchema,
    config: z.object({
      domain: z.string().min(1),
    }),
  }),
  z.object({
    connectorType: z.literal(CONNECTOR_TYPE.OKTA),
    displayName: z.string().min(1).max(200),
    credentials: oktaCredentialsSchema,
    config: z.object({
      orgUrl: z.string().url(),
    }),
  }),
]);

// ─── Control States ───────────────────────────────────────────────────────────

export const updateControlStateSchema = z.object({
  ownerId: z.string().uuid().nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

export const waiveControlSchema = z.object({
  reason: z.string().min(1).max(2000),
});

// ─── Evidence ─────────────────────────────────────────────────────────────────

export const listEvidenceSchema = z.object({
  controlStateId: z.string().uuid().optional(),
  cursor: cursorSchema,
  limit: limitSchema,
});

// ─── Audit Events ─────────────────────────────────────────────────────────────

export const listAuditEventsSchema = z.object({
  resourceType: z.string().optional(),
  resourceId: z.string().uuid().optional(),
  cursor: cursorSchema,
  limit: limitSchema,
});

// ─── Inferred types ───────────────────────────────────────────────────────────

export type CreateWorkspaceDto = z.infer<typeof createWorkspaceSchema>;
export type UpdateWorkspaceDto = z.infer<typeof updateWorkspaceSchema>;
export type CreateConnectorConfigDto = z.infer<typeof createConnectorConfigSchema>;
export type AddWorkspaceMemberDto = z.infer<typeof addWorkspaceMemberSchema>;
export type UpdateControlStateDto = z.infer<typeof updateControlStateSchema>;
export type WaiveControlDto = z.infer<typeof waiveControlSchema>;

// ─── AI Drafting ──────────────────────────────────────────────────────────────

export const aiDraftSchema = z.object({
  controlId: z.string().min(1),
  type: z.enum(['policy', 'procedure']),
});

export type AiDraftDto = z.infer<typeof aiDraftSchema>;

// ─── Jira Integration ─────────────────────────────────────────────────────────

export const createJiraTicketSchema = z.object({
  summary: z.string().min(1).max(255).optional(),
  description: z.string().max(10000).optional(),
});

export type CreateJiraTicketDto = z.infer<typeof createJiraTicketSchema>;

// ─── Integration Config ───────────────────────────────────────────────────────

const jiraIntegrationConfigSchema = z.object({
  type: z.literal(INTEGRATION_TYPE.JIRA),
  config: z.object({
    baseUrl: z.string().url(),
    projectKey: z.string().min(1).max(20),
    email: z.string().email(),
  }),
  apiToken: z.string().min(1),
});

const slackIntegrationConfigSchema = z.object({
  type: z.literal(INTEGRATION_TYPE.SLACK),
  config: z.object({
    channelName: z.string().min(1).optional(),
  }),
  webhookUrl: z.string().url(),
});

export const createIntegrationConfigSchema = z.discriminatedUnion('type', [
  jiraIntegrationConfigSchema,
  slackIntegrationConfigSchema,
]);

export type CreateIntegrationConfigDto = z.infer<typeof createIntegrationConfigSchema>;

// ─── Auditor Share ────────────────────────────────────────────────────────────

export const createAuditorShareSchema = z.object({
  label: z.string().min(1).max(200).default('Auditor access'),
  expiresInDays: z.coerce.number().int().min(1).max(90).default(30),
});

export type CreateAuditorShareDto = z.infer<typeof createAuditorShareSchema>;

// ─── Outbound schemas (strip sensitive fields) ────────────────────────────────

export const connectorConfigResponseSchema = z.object({
  id: z.string(),
  orgId: z.string(),
  type: z.enum([
    CONNECTOR_TYPE.AWS,
    CONNECTOR_TYPE.GITHUB,
    CONNECTOR_TYPE.GOOGLE_WORKSPACE,
    CONNECTOR_TYPE.OKTA,
    CONNECTOR_TYPE.JIRA,
  ]),
  displayName: z.string(),
  isActive: z.boolean(),
  lastSyncAt: z.date().nullable(),
  lastSyncStatus: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const controlStateResponseSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  controlId: z.string(),
  status: z.enum([
    CONTROL_STATUS.PASS,
    CONTROL_STATUS.FAIL,
    CONTROL_STATUS.UNKNOWN,
    CONTROL_STATUS.WAIVED,
  ]),
  ownerId: z.string().uuid().nullable(),
  lastEvaluatedAt: z.date().nullable(),
  detail: z.string().nullable(),
  notes: z.string().nullable(),
  waivedAt: z.date().nullable(),
  control: z.object({
    controlId: z.string(),
    title: z.string(),
    description: z.string(),
    severity: z.enum([SEVERITY.CRITICAL, SEVERITY.HIGH, SEVERITY.MEDIUM, SEVERITY.LOW]),
    remediationGuidance: z.string(),
  }),
});
