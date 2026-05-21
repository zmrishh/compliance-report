import { index, jsonb, pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';

import { controls } from './controls';
import { workspaces } from './workspaces';

export const controlStates = pgTable(
  'control_states',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    controlId: text('control_id')
      .notNull()
      .references(() => controls.id, { onDelete: 'cascade' }),
    status: text('status').notNull().default('UNKNOWN'),
    ownerId: text('owner_id'),
    lastEvaluatedAt: timestamp('last_evaluated_at', { withTimezone: true }),
    detail: text('detail'),
    notes: text('notes'),
    // IDs of evidence_records linked to this evaluation
    evidenceIds: jsonb('evidence_ids').notNull().default([]),
    waivedAt: timestamp('waived_at', { withTimezone: true }),
    waivedBy: text('waived_by'),
    waivedReason: text('waived_reason'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    workspaceControlIdx: uniqueIndex('control_states_workspace_control_idx').on(
      t.workspaceId,
      t.controlId,
    ),
    workspaceIdIdx: index('control_states_workspace_id_idx').on(t.workspaceId),
    statusIdx: index('control_states_status_idx').on(t.status),
    ownerIdIdx: index('control_states_owner_id_idx').on(t.ownerId),
  }),
);

export type ControlState = typeof controlStates.$inferSelect;
export type NewControlState = typeof controlStates.$inferInsert;
