import { Module, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

import { ConnectorSyncService } from './connector-sync.service.js';
import { ConnectorConfigsModule } from '../connector-configs/connector-configs.module.js';
import { SecretsModule } from '../secrets/secrets.module.js';
import { NormalizerModule } from '../normalizer/normalizer.module.js';
import { SlackModule } from '../integrations/slack/slack.module.js';
import type { Env } from '../config/config.schema.js';

export const REDIS_CLIENT = Symbol('REDIS_CLIENT');

@Module({
  imports: [ConnectorConfigsModule, SecretsModule, NormalizerModule, SlackModule],
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => {
        return new Redis(config.get('REDIS_URL', { infer: true }));
      },
    },
    ConnectorSyncService,
  ],
  exports: [ConnectorSyncService, REDIS_CLIENT],
})
export class ConnectorSyncModule implements OnModuleInit, OnModuleDestroy {
  constructor(private readonly syncService: ConnectorSyncService) {}

  async onModuleInit() {
    await this.syncService.startWorker();
  }

  async onModuleDestroy() {
    await this.syncService.shutdown();
  }
}
