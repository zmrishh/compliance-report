import { Module } from '@nestjs/common';

import { DatabaseModule } from '../database/database.module.js';
import { AuditModule } from '../audit/audit.module.js';
import { AuditorShareService } from './auditor-share.service.js';
import { AuditorShareController } from './auditor-share.controller.js';

@Module({
  imports: [DatabaseModule, AuditModule],
  providers: [AuditorShareService],
  controllers: [AuditorShareController],
  exports: [AuditorShareService],
})
export class AuditorShareModule {}
