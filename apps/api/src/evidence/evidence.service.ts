import * as crypto from 'crypto';

import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq, lt } from 'drizzle-orm';
import { evidenceRecords, controlStates } from '@compliance/db';
import type { DbClient } from '@compliance/db';
import {
  ALLOWED_EVIDENCE_MIME_TYPES,
  EVIDENCE_SOURCE_TYPE,
  MAX_EVIDENCE_FILE_SIZE_BYTES,
  PRESIGNED_URL_TTL_SECONDS,
} from '@compliance/shared';

import { DB_CLIENT } from '../database/database.module.js';
import { S3StorageService } from './s3-storage.service.js';
import { AuditService } from '../audit/audit.service.js';

interface RequestUploadInput {
  workspaceId: string;
  orgId: string;
  controlStateId: string;
  uploaderId: string;
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
}

@Injectable()
export class EvidenceService {
  constructor(
    @Inject(DB_CLIENT) private readonly db: DbClient,
    private readonly s3: S3StorageService,
    private readonly auditService: AuditService,
  ) {}

  async requestUpload(input: RequestUploadInput) {
    if (!(ALLOWED_EVIDENCE_MIME_TYPES as readonly string[]).includes(input.mimeType)) {
      throw new Error(`Unsupported MIME type: ${input.mimeType}`);
    }
    if (input.fileSizeBytes > MAX_EVIDENCE_FILE_SIZE_BYTES) {
      throw new Error(`File exceeds 50 MB limit`);
    }

    // Verify controlState belongs to the workspace/org
    const [state] = await this.db
      .select({ id: controlStates.id, controlId: controlStates.controlId })
      .from(controlStates)
      .where(
        and(
          eq(controlStates.id, input.controlStateId),
          eq(controlStates.workspaceId, input.workspaceId),
        ),
      )
      .limit(1);

    if (!state) throw new NotFoundException('Control state not found');

    const storageKey = this.s3.buildStorageKey(
      input.orgId,
      input.workspaceId,
      state.controlId,
      input.fileName,
    );

    const presigned = await this.s3.createPresignedUpload(
      storageKey,
      input.mimeType,
      input.fileSizeBytes,
    );

    // Create evidence record (pending — no content hash yet until upload confirmed)
    const [record] = await this.db
      .insert(evidenceRecords)
      .values({
        controlStateId: input.controlStateId,
        workspaceId: input.workspaceId,
        sourceType: EVIDENCE_SOURCE_TYPE.MANUAL_UPLOAD,
        storageKey,
        contentHash: 'pending',
        fileName: input.fileName,
        mimeType: input.mimeType,
        fileSizeBytes: input.fileSizeBytes,
        uploaderId: input.uploaderId,
        expiresAt: new Date(Date.now() + PRESIGNED_URL_TTL_SECONDS * 1000),
      })
      .returning();

    return { evidenceId: record.id, presigned };
  }

  async confirmUpload(
    evidenceId: string,
    workspaceId: string,
    contentHash: string,
    orgId: string,
    uploaderId: string,
  ) {
    const [record] = await this.db
      .select()
      .from(evidenceRecords)
      .where(
        and(
          eq(evidenceRecords.id, evidenceId),
          eq(evidenceRecords.workspaceId, workspaceId),
        ),
      )
      .limit(1);

    if (!record) throw new NotFoundException('Evidence record not found');

    const [updated] = await this.db
      .update(evidenceRecords)
      .set({ contentHash, expiresAt: null })
      .where(eq(evidenceRecords.id, evidenceId))
      .returning();

    void this.auditService.record({
      actorId: uploaderId,
      orgId,
      action: 'evidence.uploaded',
      resourceType: 'evidence_record',
      resourceId: evidenceId,
      metadata: { fileName: record.fileName, mimeType: record.mimeType, contentHash },
    });

    return updated;
  }

  async getDownloadUrl(
    evidenceId: string,
    workspaceId: string,
    orgId: string,
    actorId: string,
  ): Promise<{ url: string; expiresAt: Date }> {
    const [record] = await this.db
      .select()
      .from(evidenceRecords)
      .where(
        and(
          eq(evidenceRecords.id, evidenceId),
          eq(evidenceRecords.workspaceId, workspaceId),
        ),
      )
      .limit(1);

    if (!record || !record.storageKey) throw new NotFoundException('Evidence not found');

    const url = await this.s3.getDownloadUrl(record.storageKey);
    const expiresAt = new Date(Date.now() + PRESIGNED_URL_TTL_SECONDS * 1000);

    void this.auditService.record({
      actorId,
      orgId,
      action: 'evidence.downloaded',
      resourceType: 'evidence_record',
      resourceId: evidenceId,
      metadata: {
        contentHash: record.contentHash,
        userAgent: '',
      },
    });

    return { url, expiresAt };
  }

  async list(
    workspaceId: string,
    opts: { controlStateId?: string; cursor?: string; limit?: number },
  ) {
    const limit = Math.min(opts.limit ?? 25, 100);
    const conditions = [eq(evidenceRecords.workspaceId, workspaceId)];
    if (opts.controlStateId) {
      conditions.push(eq(evidenceRecords.controlStateId, opts.controlStateId));
    }
    if (opts.cursor) {
      conditions.push(lt(evidenceRecords.createdAt, new Date(opts.cursor)));
    }

    const rows = await this.db
      .select()
      .from(evidenceRecords)
      .where(and(...conditions))
      .orderBy(desc(evidenceRecords.createdAt))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const data = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? data[data.length - 1]?.createdAt.toISOString() ?? null : null;

    return { data, nextCursor, hasMore };
  }

  static computeHash(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }
}
