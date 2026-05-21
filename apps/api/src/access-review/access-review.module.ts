import { Module } from '@nestjs/common';

import { DatabaseModule } from '../database/database.module.js';
import { AuditModule } from '../audit/audit.module.js';
import { AccessReviewService } from './access-review.service.js';
import { AccessReviewController } from './access-review.controller.js';

@Module({
  imports: [DatabaseModule, AuditModule],
  providers: [AccessReviewService],
  controllers: [AccessReviewController],
  exports: [AccessReviewService],
})
export class AccessReviewModule {}
