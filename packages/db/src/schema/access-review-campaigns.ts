import { index, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

import { organizations } from './organizations';
import { workspaces } from './workspaces';

export const accessReviewCampaigns = pgTable(
  'access_review_campaigns',
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
    name: text('name').notNull(),
    connectorType: text('connector_type').notNull(), // 'google_workspace' | 'okta'
    status: text('status').notNull().default('open'), // 'open' | 'completed' | 'expired'
    dueDate: timestamp('due_date', { withTimezone: true }).notNull(),
    createdBy: text('created_by').notNull(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    workspaceIdIdx: index('access_review_campaigns_workspace_id_idx').on(t.workspaceId),
    statusIdx: index('access_review_campaigns_status_idx').on(t.status),
  }),
);

export type AccessReviewCampaign = typeof accessReviewCampaigns.$inferSelect;
export type NewAccessReviewCampaign = typeof accessReviewCampaigns.$inferInsert;
