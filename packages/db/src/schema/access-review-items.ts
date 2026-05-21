import { index, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

import { workspaces } from './workspaces';
import { accessReviewCampaigns } from './access-review-campaigns';

export const accessReviewItems = pgTable(
  'access_review_items',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    campaignId: text('campaign_id')
      .notNull()
      .references(() => accessReviewCampaigns.id, { onDelete: 'cascade' }),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    userIdExternal: text('user_id_external').notNull(),
    userEmail: text('user_email').notNull(),
    userDisplayName: text('user_display_name').notNull(),
    accessLevel: text('access_level').notNull(),
    reviewerId: text('reviewer_id'),
    decision: text('decision').notNull().default('pending'), // 'pending' | 'approved' | 'revoked'
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    campaignIdIdx: index('access_review_items_campaign_id_idx').on(t.campaignId),
    workspaceIdIdx: index('access_review_items_workspace_id_idx').on(t.workspaceId),
    decisionIdx: index('access_review_items_decision_idx').on(t.decision),
  }),
);

export type AccessReviewItem = typeof accessReviewItems.$inferSelect;
export type NewAccessReviewItem = typeof accessReviewItems.$inferInsert;
