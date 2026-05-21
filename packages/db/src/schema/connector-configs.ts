import {
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

import { organizations } from './organizations';

export const connectorConfigs = pgTable(
  'connector_configs',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    orgId: text('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    displayName: text('display_name').notNull(),
    // ARN or key reference in Secrets Manager — never plaintext credentials
    credentialsRef: text('credentials_ref').notNull(),
    // Non-sensitive connector configuration (org login, region, account ID, etc.)
    config: jsonb('config').notNull().default({}),
    isActive: boolean('is_active').notNull().default(true),
    lastSyncAt: timestamp('last_sync_at', { withTimezone: true }),
    lastSyncStatus: text('last_sync_status'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => ({
    orgIdIdx: index('connector_configs_org_id_idx').on(t.orgId),
    typeIdx: index('connector_configs_type_idx').on(t.type),
  }),
);

export type ConnectorConfig = typeof connectorConfigs.$inferSelect;
export type NewConnectorConfig = typeof connectorConfigs.$inferInsert;
