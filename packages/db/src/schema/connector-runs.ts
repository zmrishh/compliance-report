import { index, integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

import { connectorConfigs } from './connector-configs';

export const connectorRuns = pgTable(
  'connector_runs',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    connectorConfigId: text('connector_config_id')
      .notNull()
      .references(() => connectorConfigs.id, { onDelete: 'cascade' }),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    finishedAt: timestamp('finished_at', { withTimezone: true }),
    status: text('status').notNull().default('running'),
    factCount: integer('fact_count').notNull().default(0),
    errorMessage: text('error_message'),
    triggeredBy: text('triggered_by').notNull().default('scheduler'),
  },
  (t) => ({
    connectorConfigIdIdx: index('connector_runs_connector_config_id_idx').on(
      t.connectorConfigId,
    ),
    startedAtIdx: index('connector_runs_started_at_idx').on(t.startedAt),
    statusIdx: index('connector_runs_status_idx').on(t.status),
  }),
);

export type ConnectorRun = typeof connectorRuns.$inferSelect;
export type NewConnectorRun = typeof connectorRuns.$inferInsert;
