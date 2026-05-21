import { index, integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

import { policies } from './policies';

export const policyVersions = pgTable(
  'policy_versions',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    policyId: text('policy_id')
      .notNull()
      .references(() => policies.id, { onDelete: 'cascade' }),
    version: integer('version').notNull(),
    content: text('content').notNull(),
    status: text('status').notNull(), // 'draft' | 'published'
    createdBy: text('created_by').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    policyIdIdx: index('policy_versions_policy_id_idx').on(t.policyId),
  }),
);

export type PolicyVersion = typeof policyVersions.$inferSelect;
export type NewPolicyVersion = typeof policyVersions.$inferInsert;
