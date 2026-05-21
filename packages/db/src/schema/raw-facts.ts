import { index, jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

import { connectorConfigs } from './connector-configs';

export const rawFacts = pgTable(
  'raw_facts',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    connectorConfigId: text('connector_config_id')
      .notNull()
      .references(() => connectorConfigs.id, { onDelete: 'cascade' }),
    sourceType: text('source_type').notNull(),
    entityType: text('entity_type').notNull(),
    entityId: text('entity_id').notNull(),
    data: jsonb('data').notNull(),
    // SHA-256 of the canonical JSON of `data` — used for deduplication
    contentHash: text('content_hash').notNull(),
    collectedAt: timestamp('collected_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    // Primary lookup: latest facts for a connector + entity
    connectorEntityIdx: index('raw_facts_connector_entity_idx').on(
      t.connectorConfigId,
      t.entityType,
      t.entityId,
      t.collectedAt,
    ),
    sourceTypeIdx: index('raw_facts_source_type_idx').on(t.sourceType),
    entityTypeIdx: index('raw_facts_entity_type_idx').on(t.entityType),
    collectedAtIdx: index('raw_facts_collected_at_idx').on(t.collectedAt),
    contentHashIdx: index('raw_facts_content_hash_idx').on(
      t.connectorConfigId,
      t.entityType,
      t.entityId,
      t.contentHash,
    ),
  }),
);

export type RawFact = typeof rawFacts.$inferSelect;
export type NewRawFact = typeof rawFacts.$inferInsert;
