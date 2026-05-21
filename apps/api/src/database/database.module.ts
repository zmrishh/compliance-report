import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createDbClient } from '@compliance/db';

import type { Env } from '../config/config.schema.js';

export const DB_CLIENT = Symbol('DB_CLIENT');

@Global()
@Module({
  providers: [
    {
      provide: DB_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => {
        return createDbClient(config.get('DATABASE_URL', { infer: true }));
      },
    },
  ],
  exports: [DB_CLIENT],
})
export class DatabaseModule {}
