import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import Redis from 'ioredis';
import type { Job } from 'bullmq';
import {
  AwsConnector,
  ConnectorRunner,
  ConnectorScheduler,
  GitHubConnector,
  GoogleWorkspaceConnector,
  OktaConnector,
} from '@compliance/connector-sdk';
import type { ConnectorJobData, ConnectorJobResult } from '@compliance/connector-sdk';
import type { DbClient } from '@compliance/db';
import { CONNECTOR_SCHEDULE_HOURS, CONNECTOR_TYPE } from '@compliance/shared';

import { DB_CLIENT } from '../database/database.module.js';
import { SecretsService } from '../secrets/secrets.service.js';
import { ConnectorConfigsService } from '../connector-configs/connector-configs.service.js';
import { NormalizerService } from '../normalizer/normalizer.service.js';
import type { SlackService } from '../integrations/slack/slack.service.js';
import { REDIS_CLIENT } from './connector-sync.module.js';

@Injectable()
export class ConnectorSyncService {
  private readonly logger = new Logger(ConnectorSyncService.name);
  private scheduler!: ConnectorScheduler;

  constructor(
    @Inject(DB_CLIENT) private readonly db: DbClient,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly secretsService: SecretsService,
    private readonly connectorConfigsService: ConnectorConfigsService,
    private readonly normalizerService: NormalizerService,
    @Optional() private readonly slackService?: SlackService,
  ) {
    this.scheduler = new ConnectorScheduler(redis);
  }

  async startWorker(): Promise<void> {
    this.scheduler.startWorker(
      (job: Job<ConnectorJobData>) => this.processJob(job),
      3,
    );
    this.logger.log('Connector sync worker started');
  }

  private async processJob(
    job: Job<ConnectorJobData>,
  ): Promise<ConnectorJobResult> {
    const { connectorConfigId, orgId, connectorType, triggeredBy } = job.data;
    const startedAt = Date.now();

    this.logger.log(`Processing connector job: ${connectorConfigId} (${connectorType})`);

    const connectorConfig = await this.connectorConfigsService.findOneWithCredentials(
      connectorConfigId,
      orgId,
    );
    const credentials = await this.secretsService.getConnectorCredentials(
      connectorConfig.credentialsRef,
    );

    const connector = this.buildConnector(
      connectorType,
      credentials,
      connectorConfig.config as Record<string, unknown>,
    );

    const runner = new ConnectorRunner({
      db: this.db,
      connectorConfigId,
      orgId,
      triggeredBy,
      onFactBatch: (entityTypes, factOrgId, workspaceIds) => {
        this.normalizerService.notifyNewFacts({
          orgId: factOrgId,
          workspaceIds,
          entityTypes,
          connectorConfigId,
        });
      },
    });

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await runner.run(connector as any);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      if (this.slackService) {
        void this.slackService
          .notifyConnectorFailure(
            // workspaceId is org-level for connectors; pass orgId as placeholder
            orgId,
            orgId,
            connectorConfig.displayName,
            errorMsg,
          )
          .catch((e) => this.logger.warn(`Slack notification failed: ${String(e)}`));
      }
      throw err;
    }

    return {
      factCount: 0, // Updated by the runner via DB
      durationMs: Date.now() - startedAt,
    };
  }

  private buildConnector(
    connectorType: string,
    credentials: Record<string, unknown>,
    config: Record<string, unknown>,
  ) {
    // Credentials and config are validated at connector-config creation time.
    // We cast to the required type here since they are stored as opaque JSON.
    /* eslint-disable @typescript-eslint/no-explicit-any */
    switch (connectorType) {
      case CONNECTOR_TYPE.AWS:
        return new AwsConnector(credentials as any, config as any);
      case CONNECTOR_TYPE.GITHUB:
        return new GitHubConnector(credentials as any, config as any);
      case CONNECTOR_TYPE.GOOGLE_WORKSPACE:
        return new GoogleWorkspaceConnector(credentials as any, config as any);
      case CONNECTOR_TYPE.OKTA:
        return new OktaConnector(credentials as any, config as any);
      default:
        throw new Error(`Unsupported connector type: ${connectorType}`);
    }
    /* eslint-enable @typescript-eslint/no-explicit-any */
  }

  async triggerManualSync(
    connectorConfigId: string,
    orgId: string,
    connectorType: string,
  ): Promise<string> {
    return this.scheduler.triggerManual(connectorConfigId, orgId, connectorType);
  }

  async scheduleConnector(
    connectorConfigId: string,
    orgId: string,
    connectorType: string,
  ): Promise<void> {
    const intervalHours =
      CONNECTOR_SCHEDULE_HOURS[connectorType as keyof typeof CONNECTOR_SCHEDULE_HOURS] ?? 6;
    await this.scheduler.scheduleConnector(
      connectorConfigId,
      orgId,
      connectorType,
      intervalHours,
    );
    this.logger.log(
      `Scheduled ${connectorType} connector ${connectorConfigId} every ${intervalHours}h`,
    );
  }

  async removeSchedule(connectorConfigId: string): Promise<void> {
    await this.scheduler.removeSchedule(connectorConfigId);
  }

  async shutdown(): Promise<void> {
    await this.scheduler.close();
  }
}
