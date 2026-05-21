import { Inject, Injectable, Logger } from '@nestjs/common';
import { and, desc, eq, lt } from 'drizzle-orm';
import { auditEvents } from '@compliance/db';
import type { DbClient } from '@compliance/db';
import type { AuditAction } from '@compliance/shared';

import { DB_CLIENT } from '../database/database.module.js';

interface CreateAuditEventInput {
  actorId?: string;
  orgId: string;
  action: AuditAction;
  resourceType?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(@Inject(DB_CLIENT) private readonly db: DbClient) {}

  async record(input: CreateAuditEventInput): Promise<void> {
    try {
      await this.db.insert(auditEvents).values({
        actorId: input.actorId ?? null,
        orgId: input.orgId,
        action: input.action,
        resourceType: input.resourceType ?? null,
        resourceId: input.resourceId ?? null,
        metadata: input.metadata ?? {},
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
      });
    } catch (err) {
      // Audit log failures must never break the main request flow
      this.logger.error('Failed to write audit event', err);
    }
  }

  async list(
    orgId: string,
    opts: {
      resourceType?: string;
      resourceId?: string;
      cursor?: string;
      limit?: number;
    },
  ) {
    const limit = Math.min(opts.limit ?? 25, 100);

    const conditions = [eq(auditEvents.orgId, orgId)];
    if (opts.resourceType) conditions.push(eq(auditEvents.resourceType, opts.resourceType));
    if (opts.resourceId) conditions.push(eq(auditEvents.resourceId, opts.resourceId));

    if (opts.cursor) {
      // Cursor is the createdAt ISO string of the last item
      conditions.push(lt(auditEvents.createdAt, new Date(opts.cursor)));
    }

    const rows = await this.db
      .select()
      .from(auditEvents)
      .where(and(...conditions))
      .orderBy(desc(auditEvents.createdAt))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const data = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? data[data.length - 1]?.createdAt.toISOString() ?? null : null;

    return { data, nextCursor, hasMore };
  }
}
