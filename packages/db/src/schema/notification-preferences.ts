import { boolean, index, pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';

import { organizations } from './organizations';

export const notificationPreferences = pgTable(
  'notification_preferences',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text('user_id').notNull(),
    orgId: text('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    eventType: text('event_type').notNull(),
    enabled: boolean('enabled').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    uniqueUserEvent: uniqueIndex('notification_prefs_user_event_idx').on(
      t.userId,
      t.orgId,
      t.eventType,
    ),
    userIdIdx: index('notification_prefs_user_id_idx').on(t.userId),
  }),
);

export type NotificationPreference = typeof notificationPreferences.$inferSelect;
export type NewNotificationPreference = typeof notificationPreferences.$inferInsert;
