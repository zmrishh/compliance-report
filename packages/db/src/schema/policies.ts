import { index, integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

import { organizations } from './organizations';
import { workspaces } from './workspaces';

export const policies = pgTable(
  'policies',
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
    // null = org-level policy not tied to a specific control
    controlId: text('control_id'),
    title: text('title').notNull(),
    type: text('type').notNull().default('policy'), // 'policy' | 'procedure' | 'runbook'
    status: text('status').notNull().default('draft'), // 'draft' | 'published' | 'archived'
    version: integer('version').notNull().default(1),
    content: text('content').notNull().default(''),
    createdBy: text('created_by').notNull(),
    publishedBy: text('published_by'),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    workspaceIdIdx: index('policies_workspace_id_idx').on(t.workspaceId),
    orgIdIdx: index('policies_org_id_idx').on(t.orgId),
    statusIdx: index('policies_status_idx').on(t.status),
    controlIdIdx: index('policies_control_id_idx').on(t.controlId),
  }),
);

export type Policy = typeof policies.$inferSelect;
export type NewPolicy = typeof policies.$inferInsert;
