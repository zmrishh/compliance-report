import { index, integer, pgTable, real, text, timestamp } from 'drizzle-orm/pg-core';

import { organizations } from './organizations';
import { workspaces } from './workspaces';

export const readinessSnapshots = pgTable(
  'readiness_snapshots',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    orgId: text('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    score: real('score').notNull(),
    passCount: integer('pass_count').notNull().default(0),
    failCount: integer('fail_count').notNull().default(0),
    unknownCount: integer('unknown_count').notNull().default(0),
    waivedCount: integer('waived_count').notNull().default(0),
    totalCount: integer('total_count').notNull().default(0),
    snapshottedAt: timestamp('snapshotted_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    workspaceIdIdx: index('readiness_snapshots_workspace_id_idx').on(t.workspaceId),
    snapshottedAtIdx: index('readiness_snapshots_snapshotted_at_idx').on(t.snapshottedAt),
  }),
);

export type ReadinessSnapshot = typeof readinessSnapshots.$inferSelect;
export type NewReadinessSnapshot = typeof readinessSnapshots.$inferInsert;
