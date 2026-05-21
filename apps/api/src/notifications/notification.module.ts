import { Module } from '@nestjs/common';

import { DatabaseModule } from '../database/database.module.js';
import { ResendService } from './resend.service.js';
import { NotificationService } from './notification.service.js';
import { NotificationController } from './notification.controller.js';

@Module({
  imports: [DatabaseModule],
  providers: [ResendService, NotificationService],
  controllers: [NotificationController],
  exports: [NotificationService],
})
export class NotificationModule {}
