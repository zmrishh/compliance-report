import { index, integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

import { controlStates } from './control-states';
import { workspaces } from './workspaces';

export const evidenceRecords = pgTable(
  'evidence_records',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    controlStateId: text('control_state_id')
      .notNull()
      .references(() => controlStates.id, { onDelete: 'cascade' }),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    sourceType: text('source_type').notNull(),
    // S3 object key for file-based evidence; null for inline/connector snapshots
    storageKey: text('storage_key'),
    // SHA-256 of the file or canonical JSON
    contentHash: text('content_hash').notNull(),
    fileName: text('file_name'),
    mimeType: text('mime_type'),
    fileSizeBytes: integer('file_size_bytes'),
    collectedAt: timestamp('collected_at', { withTimezone: true }).notNull().defaultNow(),
    uploaderId: text('uploader_id'),
    // Pre-signed URL expires at this time (null = connector-generated, does not expire)
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    controlStateIdIdx: index('evidence_records_control_state_id_idx').on(t.controlStateId),
    workspaceIdIdx: index('evidence_records_workspace_id_idx').on(t.workspaceId),
    collectedAtIdx: index('evidence_records_collected_at_idx').on(t.collectedAt),
  }),
);

export type EvidenceRecord = typeof evidenceRecords.$inferSelect;
export type NewEvidenceRecord = typeof evidenceRecords.$inferInsert;
