import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, isNull, lte, or, sql } from 'drizzle-orm';
import { controls, vendorControls, vendors } from '@compliance/db';
import type { DbClient } from '@compliance/db';
import { AUDIT_ACTION } from '@compliance/shared';
import type { CreateVendorDto, UpdateVendorDto } from '@compliance/shared';

import { DB_CLIENT } from '../database/database.module.js';
import { AuditService } from '../audit/audit.service.js';

@Injectable()
export class VendorService {
  constructor(
    @Inject(DB_CLIENT) private readonly db: DbClient,
    private readonly auditService: AuditService,
  ) {}

  async create(dto: CreateVendorDto, orgId: string, userId: string) {
    const [vendor] = await this.db
      .insert(vendors)
      .values({
        orgId,
        name: dto.name,
        website: dto.website ?? null,
        category: dto.category,
        riskRating: dto.riskRating,
        reviewCycleDays: dto.reviewCycleDays,
        notes: dto.notes ?? null,
      })
      .returning();

    await this.auditService.record({
      actorId: userId,
      orgId,
      action: AUDIT_ACTION.VENDOR_CREATED,
      resourceType: 'vendor',
      resourceId: vendor!.id,
      metadata: { name: dto.name, riskRating: dto.riskRating },
    });

    return vendor!;
  }

  async list(orgId: string) {
    return this.db
      .select()
      .from(vendors)
      .where(and(eq(vendors.orgId, orgId), isNull(vendors.deletedAt)));
  }

  async get(vendorId: string, orgId: string) {
    const [vendor] = await this.db
      .select()
      .from(vendors)
      .where(and(eq(vendors.id, vendorId), eq(vendors.orgId, orgId), isNull(vendors.deletedAt)))
      .limit(1);

    if (!vendor) throw new NotFoundException('Vendor not found');

    const linkedControls = await this.db
      .select({ controlId: controls.id, controlTitle: controls.title, framework: controls.framework })
      .from(vendorControls)
      .innerJoin(controls, eq(vendorControls.controlId, controls.id))
      .where(eq(vendorControls.vendorId, vendorId));

    return { ...vendor, controls: linkedControls };
  }

  async update(vendorId: string, dto: UpdateVendorDto, orgId: string, userId: string) {
    await this.assertExists(vendorId, orgId);

    const [updated] = await this.db
      .update(vendors)
      .set({
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.website !== undefined && { website: dto.website }),
        ...(dto.category !== undefined && { category: dto.category }),
        ...(dto.riskRating !== undefined && { riskRating: dto.riskRating }),
        ...(dto.reviewCycleDays !== undefined && { reviewCycleDays: dto.reviewCycleDays }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        ...(dto.lastReviewedAt !== undefined && { lastReviewedAt: new Date(dto.lastReviewedAt), reviewedBy: userId }),
        updatedAt: new Date(),
      })
      .where(and(eq(vendors.id, vendorId), eq(vendors.orgId, orgId)))
      .returning();

    await this.auditService.record({
      actorId: userId,
      orgId,
      action: AUDIT_ACTION.VENDOR_UPDATED,
      resourceType: 'vendor',
      resourceId: vendorId,
      metadata: { changes: dto },
    });

    return updated!;
  }

  async softDelete(vendorId: string, orgId: string) {
    await this.assertExists(vendorId, orgId);
    await this.db
      .update(vendors)
      .set({ deletedAt: new Date() })
      .where(and(eq(vendors.id, vendorId), eq(vendors.orgId, orgId)));
  }

  async linkControl(vendorId: string, controlId: string, orgId: string) {
    await this.assertExists(vendorId, orgId);

    const [ctrl] = await this.db
      .select({ id: controls.id })
      .from(controls)
      .where(eq(controls.id, controlId))
      .limit(1);

    if (!ctrl) throw new NotFoundException('Control not found');

    const [existing] = await this.db
      .select()
      .from(vendorControls)
      .where(and(eq(vendorControls.vendorId, vendorId), eq(vendorControls.controlId, controlId)))
      .limit(1);

    if (existing) throw new ConflictException('Control already linked to this vendor');

    await this.db.insert(vendorControls).values({ vendorId, controlId });
  }

  async unlinkControl(vendorId: string, controlId: string, orgId: string) {
    await this.assertExists(vendorId, orgId);
    await this.db
      .delete(vendorControls)
      .where(and(eq(vendorControls.vendorId, vendorId), eq(vendorControls.controlId, controlId)));
  }

  async listDueForReview(orgId: string) {
    const now = new Date();
    return this.db
      .select()
      .from(vendors)
      .where(
        and(
          eq(vendors.orgId, orgId),
          isNull(vendors.deletedAt),
          or(
            isNull(vendors.lastReviewedAt),
            // last_reviewed_at + review_cycle_days (as interval) < now
            lte(
              sql`${vendors.lastReviewedAt} + (${vendors.reviewCycleDays} || ' days')::interval`,
              now,
            ),
          ),
        ),
      );
  }

  private async assertExists(vendorId: string, orgId: string) {
    const [vendor] = await this.db
      .select({ id: vendors.id })
      .from(vendors)
      .where(and(eq(vendors.id, vendorId), eq(vendors.orgId, orgId), isNull(vendors.deletedAt)))
      .limit(1);
    if (!vendor) throw new NotFoundException('Vendor not found');
  }
}
