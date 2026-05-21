import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module.js';
import { SecretsModule } from '../../secrets/secrets.module.js';
import { SlackService } from './slack.service.js';

@Module({
  imports: [DatabaseModule, SecretsModule],
  providers: [SlackService],
  exports: [SlackService],
})
export class SlackModule {}
