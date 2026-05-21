import { boolean, index, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

import { organizations } from './organizations';

export const webhookConfigs = pgTable(
  'webhook_configs',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    orgId: text('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    workspaceId: text('workspace_id'),
    url: text('url').notNull(),
    // Secrets Manager ARN for the HMAC signing secret
    secretRef: text('secret_ref').notNull(),
    // Array of subscribed event type strings stored as JSON
    events: text('events').notNull().default('[]'),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    orgIdIdx: index('webhook_configs_org_id_idx').on(t.orgId),
    workspaceIdIdx: index('webhook_configs_workspace_id_idx').on(t.workspaceId),
  }),
);

export type WebhookConfig = typeof webhookConfigs.$inferSelect;
export type NewWebhookConfig = typeof webhookConfigs.$inferInsert;
