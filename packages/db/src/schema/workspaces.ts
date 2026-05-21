import { doublePrecision, index, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

import { organizations } from './organizations';

export const workspaces = pgTable(
  'workspaces',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    orgId: text('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    framework: text('framework').notNull().default('soc2:security'),
    systemBoundary: text('system_boundary'),
    readinessScore: doublePrecision('readiness_score'),
    readinessScoreUpdatedAt: timestamp('readiness_score_updated_at', {
      withTimezone: true,
    }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => ({
    orgIdIdx: index('workspaces_org_id_idx').on(t.orgId),
  }),
);

export type Workspace = typeof workspaces.$inferSelect;
export type NewWorkspace = typeof workspaces.$inferInsert;
