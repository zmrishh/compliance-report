import { index, integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

import { organizations } from './organizations';

export const vendors = pgTable(
  'vendors',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    orgId: text('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    website: text('website'),
    category: text('category').notNull().default('other'), // 'saas'|'infrastructure'|'payments'|'hr'|'other'
    riskRating: text('risk_rating').notNull().default('medium'), // 'low'|'medium'|'high'|'critical'
    reviewCycleDays: integer('review_cycle_days').notNull().default(365),
    lastReviewedAt: timestamp('last_reviewed_at', { withTimezone: true }),
    reviewedBy: text('reviewed_by'),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => ({
    orgIdIdx: index('vendors_org_id_idx').on(t.orgId),
    riskRatingIdx: index('vendors_risk_rating_idx').on(t.riskRating),
  }),
);

export type Vendor = typeof vendors.$inferSelect;
export type NewVendor = typeof vendors.$inferInsert;
