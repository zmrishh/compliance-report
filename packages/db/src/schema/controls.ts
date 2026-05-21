import { index, jsonb, pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';

export const controls = pgTable(
  'controls',
  {
    id: text('id').primaryKey(),
    framework: text('framework').notNull(),
    controlId: text('control_id').notNull(),
    title: text('title').notNull(),
    description: text('description').notNull(),
    severity: text('severity').notNull(),
    testFnKey: text('test_fn_key').notNull(),
    remediationGuidance: text('remediation_guidance').notNull(),
    // Array of entity type strings this control reads from raw_facts
    evidenceSources: jsonb('evidence_sources').notNull().default([]),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    frameworkIdx: index('controls_framework_idx').on(t.framework),
    testFnKeyIdx: uniqueIndex('controls_test_fn_key_idx').on(t.testFnKey),
  }),
);

export type Control = typeof controls.$inferSelect;
export type NewControl = typeof controls.$inferInsert;
