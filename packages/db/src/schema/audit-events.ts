import { index, jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

import { organizations } from './organizations';

// audit_events is insert-only — no updatedAt, no deletedAt
export const auditEvents = pgTable(
  'audit_events',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    actorId: text('actor_id'),
    orgId: text('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    action: text('action').notNull(),
    resourceType: text('resource_type'),
    resourceId: text('resource_id'),
    metadata: jsonb('metadata').notNull().default({}),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    orgIdIdx: index('audit_events_org_id_idx').on(t.orgId),
    actorIdIdx: index('audit_events_actor_id_idx').on(t.actorId),
    createdAtIdx: index('audit_events_created_at_idx').on(t.createdAt),
    resourceIdx: index('audit_events_resource_idx').on(t.resourceType, t.resourceId),
  }),
);

export type AuditEvent = typeof auditEvents.$inferSelect;
export type NewAuditEvent = typeof auditEvents.$inferInsert;
