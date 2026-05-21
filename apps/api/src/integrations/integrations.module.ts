import { Module } from '@nestjs/common';

import { DatabaseModule } from '../database/database.module.js';
import { SecretsModule } from '../secrets/secrets.module.js';
import { AuditModule } from '../audit/audit.module.js';
import { SlackModule } from './slack/slack.module.js';
import { JiraModule } from './jira/jira.module.js';
import { IntegrationsService } from './integrations.service.js';
import { IntegrationsController } from './integrations.controller.js';

@Module({
  imports: [DatabaseModule, SecretsModule, AuditModule, SlackModule, JiraModule],
  providers: [IntegrationsService],
  controllers: [IntegrationsController],
  exports: [IntegrationsService, SlackModule, JiraModule],
})
export class IntegrationsModule {}
