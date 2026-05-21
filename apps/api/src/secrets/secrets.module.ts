import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { SecretsService } from './secrets.service.js';
import type { Env } from '../config/config.schema.js';

@Global()
@Module({
  providers: [
    {
      provide: SecretsService,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => {
        return new SecretsService(
          config.get('NODE_ENV', { infer: true }),
          config.get('AWS_REGION', { infer: true }),
          config.get('SECRETS_MANAGER_ENDPOINT', { infer: true }),
          // Redis URL for local dev store
          config.get('REDIS_URL', { infer: true }),
        );
      },
    },
  ],
  exports: [SecretsService],
})
export class SecretsModule {}
