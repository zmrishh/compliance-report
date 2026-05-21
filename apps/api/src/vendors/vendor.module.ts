import { Module } from '@nestjs/common';

import { DatabaseModule } from '../database/database.module.js';
import { AuditModule } from '../audit/audit.module.js';
import { VendorService } from './vendor.service.js';
import { VendorController } from './vendor.controller.js';

@Module({
  imports: [DatabaseModule, AuditModule],
  providers: [VendorService],
  controllers: [VendorController],
  exports: [VendorService],
})
export class VendorModule {}
