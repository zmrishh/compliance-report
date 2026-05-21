import { index, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

import { organizations } from './organizations';
import { workspaces } from './workspaces';

export const auditorShares = pgTable(
  'auditor_shares',
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
    // SHA-256 hex digest of the raw token — raw token is never persisted
    tokenHash: text('token_hash').notNull().unique(),
    label: text('label').notNull().default('Auditor access'),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdByUserId: text('created_by_user_id').notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    workspaceIdIdx: index('auditor_shares_workspace_id_idx').on(t.workspaceId),
    orgIdIdx: index('auditor_shares_org_id_idx').on(t.orgId),
    tokenHashIdx: index('auditor_shares_token_hash_idx').on(t.tokenHash),
  }),
);

export type AuditorShare = typeof auditorShares.$inferSelect;
export type NewAuditorShare = typeof auditorShares.$inferInsert;
