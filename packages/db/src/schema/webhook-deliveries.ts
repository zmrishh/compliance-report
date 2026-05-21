import { index, integer, jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

import { webhookConfigs } from './webhook-configs';

export const webhookDeliveries = pgTable(
  'webhook_deliveries',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    webhookConfigId: text('webhook_config_id')
      .notNull()
      .references(() => webhookConfigs.id, { onDelete: 'cascade' }),
    eventType: text('event_type').notNull(),
    payload: jsonb('payload').notNull(),
    responseStatus: integer('response_status'),
    responseBody: text('response_body'),
    attemptCount: integer('attempt_count').notNull().default(1),
    deliveredAt: timestamp('delivered_at', { withTimezone: true }),
    failedAt: timestamp('failed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    webhookConfigIdIdx: index('webhook_deliveries_config_id_idx').on(t.webhookConfigId),
    createdAtIdx: index('webhook_deliveries_created_at_idx').on(t.createdAt),
  }),
);

export type WebhookDelivery = typeof webhookDeliveries.$inferSelect;
export type NewWebhookDelivery = typeof webhookDeliveries.$inferInsert;
