import { boolean, index, jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

import { organizations } from './organizations';

export const integrationConfigs = pgTable(
  'integration_configs',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    orgId: text('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    // null = org-level; set to a workspace ID when scoped to one workspace
    workspaceId: text('workspace_id'),
    type: text('type').notNull(), // 'jira' | 'slack'
    // Non-sensitive config: baseUrl, projectKey, channelName, etc.
    config: jsonb('config').notNull().default({}),
    // Secrets Manager ARN for API token / webhook URL
    credentialsRef: text('credentials_ref').notNull(),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    orgIdIdx: index('integration_configs_org_id_idx').on(t.orgId),
    typeIdx: index('integration_configs_type_idx').on(t.type),
    workspaceIdIdx: index('integration_configs_workspace_id_idx').on(t.workspaceId),
  }),
);

export type IntegrationConfig = typeof integrationConfigs.$inferSelect;
export type NewIntegrationConfig = typeof integrationConfigs.$inferInsert;
