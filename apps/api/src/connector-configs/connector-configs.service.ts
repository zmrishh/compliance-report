import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import { connectorConfigs } from '@compliance/db';
import type { DbClient } from '@compliance/db';
import type { CreateConnectorConfigDto } from '@compliance/shared';

import { DB_CLIENT } from '../database/database.module.js';
import { SecretsService } from '../secrets/secrets.service.js';

@Injectable()
export class ConnectorConfigsService {
  constructor(
    @Inject(DB_CLIENT) private readonly db: DbClient,
    private readonly secretsService: SecretsService,
  ) {}

  async create(orgId: string, dto: CreateConnectorConfigDto) {
    // Extract credentials and store in Secrets Manager
    const { connectorType, displayName, credentials, config } = dto as {
      connectorType: string;
      displayName: string;
      credentials: Record<string, unknown>;
      config: Record<string, unknown>;
    };

    const credentialsRef = await this.secretsService.storeConnectorCredentials(
      orgId,
      connectorType,
      credentials,
    );

    const [connector] = await this.db
      .insert(connectorConfigs)
      .values({
        orgId,
        type: connectorType,
        displayName,
        credentialsRef,
        config: config ?? {},
        isActive: true,
      })
      .returning();

    // Never return credentials ref in the response
    const { credentialsRef: _ref, ...safeConnector } = connector;
    return safeConnector;
  }

  async findAll(orgId: string) {
    const rows = await this.db
      .select({
        id: connectorConfigs.id,
        orgId: connectorConfigs.orgId,
        type: connectorConfigs.type,
        displayName: connectorConfigs.displayName,
        config: connectorConfigs.config,
        isActive: connectorConfigs.isActive,
        lastSyncAt: connectorConfigs.lastSyncAt,
        lastSyncStatus: connectorConfigs.lastSyncStatus,
        createdAt: connectorConfigs.createdAt,
        updatedAt: connectorConfigs.updatedAt,
      })
      .from(connectorConfigs)
      .where(and(eq(connectorConfigs.orgId, orgId), isNull(connectorConfigs.deletedAt)));

    return rows;
  }

  async findOne(id: string, orgId: string) {
    const [connector] = await this.db
      .select({
        id: connectorConfigs.id,
        orgId: connectorConfigs.orgId,
        type: connectorConfigs.type,
        displayName: connectorConfigs.displayName,
        config: connectorConfigs.config,
        isActive: connectorConfigs.isActive,
        lastSyncAt: connectorConfigs.lastSyncAt,
        lastSyncStatus: connectorConfigs.lastSyncStatus,
        createdAt: connectorConfigs.createdAt,
        updatedAt: connectorConfigs.updatedAt,
      })
      .from(connectorConfigs)
      .where(
        and(
          eq(connectorConfigs.id, id),
          eq(connectorConfigs.orgId, orgId),
          isNull(connectorConfigs.deletedAt),
        ),
      )
      .limit(1);

    if (!connector) throw new NotFoundException('Connector not found');
    return connector;
  }

  async findOneWithCredentials(id: string, orgId: string) {
    const [connector] = await this.db
      .select()
      .from(connectorConfigs)
      .where(
        and(
          eq(connectorConfigs.id, id),
          eq(connectorConfigs.orgId, orgId),
          isNull(connectorConfigs.deletedAt),
        ),
      )
      .limit(1);

    if (!connector) throw new NotFoundException('Connector not found');
    return connector;
  }

  async softDelete(id: string, orgId: string) {
    const connector = await this.findOneWithCredentials(id, orgId);

    await this.secretsService.deleteSecret(connector.credentialsRef);

    await this.db
      .update(connectorConfigs)
      .set({ isActive: false, deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(connectorConfigs.id, id));
  }

  async updateSyncStatus(
    id: string,
    status: 'running' | 'completed' | 'failed',
    syncAt: Date,
  ) {
    await this.db
      .update(connectorConfigs)
      .set({ lastSyncAt: syncAt, lastSyncStatus: status, updatedAt: new Date() })
      .where(eq(connectorConfigs.id, id));
  }
}
