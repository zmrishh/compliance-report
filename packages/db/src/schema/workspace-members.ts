import { index, pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';

import { workspaces } from './workspaces';

export const workspaceMembers = pgTable(
  'workspace_members',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull(),
    role: text('role').notNull().default('viewer'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    workspaceUserIdx: uniqueIndex('workspace_members_workspace_user_idx').on(
      t.workspaceId,
      t.userId,
    ),
    workspaceIdIdx: index('workspace_members_workspace_id_idx').on(t.workspaceId),
    userIdIdx: index('workspace_members_user_id_idx').on(t.userId),
  }),
);

export type WorkspaceMember = typeof workspaceMembers.$inferSelect;
export type NewWorkspaceMember = typeof workspaceMembers.$inferInsert;
