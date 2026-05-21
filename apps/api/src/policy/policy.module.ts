import { Module } from '@nestjs/common';

import { DatabaseModule } from '../database/database.module.js';
import { AuditModule } from '../audit/audit.module.js';
import { PolicyService } from './policy.service.js';
import { PolicyController } from './policy.controller.js';

@Module({
  imports: [DatabaseModule, AuditModule],
  providers: [PolicyService],
  controllers: [PolicyController],
  exports: [PolicyService],
})
export class PolicyModule {}
