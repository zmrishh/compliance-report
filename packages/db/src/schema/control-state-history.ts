import { index, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

import { workspaces } from './workspaces';
import { controlStates } from './control-states';

export const controlStateHistory = pgTable(
  'control_state_history',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    controlStateId: text('control_state_id')
      .notNull()
      .references(() => controlStates.id, { onDelete: 'cascade' }),
    controlId: text('control_id').notNull(),
    fromStatus: text('from_status'), // null on initial creation
    toStatus: text('to_status').notNull(),
    changedAt: timestamp('changed_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    workspaceIdIdx: index('control_state_history_workspace_id_idx').on(t.workspaceId),
    controlStateIdIdx: index('control_state_history_control_state_id_idx').on(t.controlStateId),
    changedAtIdx: index('control_state_history_changed_at_idx').on(t.changedAt),
  }),
);

export type ControlStateHistory = typeof controlStateHistory.$inferSelect;
export type NewControlStateHistory = typeof controlStateHistory.$inferInsert;
