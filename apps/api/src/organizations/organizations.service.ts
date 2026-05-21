import { Inject, Injectable, Logger } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { organizations } from '@compliance/db';
import type { DbClient } from '@compliance/db';

import { DB_CLIENT } from '../database/database.module.js';

@Injectable()
export class OrganizationsService {
  private readonly logger = new Logger(OrganizationsService.name);

  constructor(@Inject(DB_CLIENT) private readonly db: DbClient) {}

  async findByWorkosOrgId(workosOrgId: string) {
    const [org] = await this.db
      .select()
      .from(organizations)
      .where(eq(organizations.workosOrgId, workosOrgId))
      .limit(1);
    return org ?? null;
  }

  async findById(id: string) {
    const [org] = await this.db
      .select()
      .from(organizations)
      .where(eq(organizations.id, id))
      .limit(1);
    return org ?? null;
  }

  async provisionOrg(workosOrgId: string, name: string): Promise<typeof organizations.$inferSelect> {
    const existing = await this.findByWorkosOrgId(workosOrgId);
    if (existing) return existing;

    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 100);

    const uniqueSlug = `${slug}-${workosOrgId.slice(-8)}`;

    const [created] = await this.db
      .insert(organizations)
      .values({ workosOrgId, name, slug: uniqueSlug })
      .returning();

    this.logger.log(`Provisioned new organization: ${created.id} (${workosOrgId})`);
    return created;
  }
}
