import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { integrationConfigs } from '@compliance/db';
import type { DbClient } from '@compliance/db';
import type { CreateIntegrationConfigDto } from '@compliance/shared';

import { DB_CLIENT } from '../database/database.module.js';
import { SecretsService } from '../secrets/secrets.service.js';

@Injectable()
export class IntegrationsService {
  constructor(
    @Inject(DB_CLIENT) private readonly db: DbClient,
    private readonly secretsService: SecretsService,
  ) {}

  async list(orgId: string, workspaceId: string) {
    const rows = await this.db
      .select({
        id: integrationConfigs.id,
        type: integrationConfigs.type,
        config: integrationConfigs.config,
        isActive: integrationConfigs.isActive,
        workspaceId: integrationConfigs.workspaceId,
        createdAt: integrationConfigs.createdAt,
        updatedAt: integrationConfigs.updatedAt,
      })
      .from(integrationConfigs)
      .where(
        and(
          eq(integrationConfigs.orgId, orgId),
          eq(integrationConfigs.isActive, true),
        ),
      );

    return rows.filter(
      (r) => r.workspaceId === workspaceId || r.workspaceId === null,
    );
  }

  async upsert(
    orgId: string,
    workspaceId: string,
    dto: CreateIntegrationConfigDto,
  ) {
    // Extract the secret (webhook URL or API token) to store in Secrets Manager
    let secretValue: Record<string, string>;
    let nonSensitiveConfig: Record<string, unknown>;

    if (dto.type === 'jira') {
      const { apiToken, config } = dto;
      secretValue = { email: config.email, apiToken };
      nonSensitiveConfig = { baseUrl: config.baseUrl, projectKey: config.projectKey, email: config.email };
    } else {
      const { webhookUrl, config } = dto;
      secretValue = { webhookUrl };
      nonSensitiveConfig = { channelName: config.channelName ?? '' };
    }

    const credentialsRef = await this.secretsService.storeConnectorCredentials(
      orgId,
      dto.type,
      secretValue,
    );

    // Upsert: deactivate existing of same type+workspace, then insert new
    await this.db
      .update(integrationConfigs)
      .set({ isActive: false, updatedAt: new Date() })
      .where(
        and(
          eq(integrationConfigs.orgId, orgId),
          eq(integrationConfigs.type, dto.type),
        ),
      );

    const [created] = await this.db
      .insert(integrationConfigs)
      .values({
        orgId,
        workspaceId,
        type: dto.type,
        config: nonSensitiveConfig,
        credentialsRef,
        isActive: true,
      })
      .returning();

    return { id: created!.id, type: created!.type, config: created!.config, isActive: true };
  }

  async remove(orgId: string, workspaceId: string, integrationId: string) {
    const [row] = await this.db
      .select()
      .from(integrationConfigs)
      .where(
        and(
          eq(integrationConfigs.id, integrationId),
          eq(integrationConfigs.orgId, orgId),
        ),
      )
      .limit(1);

    if (!row) throw new NotFoundException('Integration config not found');

    await this.db
      .update(integrationConfigs)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(integrationConfigs.id, integrationId));

    return { deleted: true };
  }
}
