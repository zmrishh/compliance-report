import { Module } from '@nestjs/common';

import { DatabaseModule } from '../database/database.module.js';
import { SecretsModule } from '../secrets/secrets.module.js';
import { WebhookService } from './webhook.service.js';
import { WebhookController } from './webhook.controller.js';

@Module({
  imports: [DatabaseModule, SecretsModule],
  providers: [WebhookService],
  controllers: [WebhookController],
  exports: [WebhookService],
})
export class WebhookModule {}
