import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module.js';
import { SecretsModule } from '../../secrets/secrets.module.js';
import { AuditModule } from '../../audit/audit.module.js';
import { JiraService } from './jira.service.js';
import { JiraController } from './jira.controller.js';

@Module({
  imports: [DatabaseModule, SecretsModule, AuditModule],
  providers: [JiraService],
  controllers: [JiraController],
  exports: [JiraService],
})
export class JiraModule {}
