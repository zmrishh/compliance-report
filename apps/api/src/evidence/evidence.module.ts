import { Module } from '@nestjs/common';

import { EvidenceService } from './evidence.service.js';
import { EvidenceController } from './evidence.controller.js';
import { S3StorageService } from './s3-storage.service.js';

@Module({
  providers: [EvidenceService, S3StorageService],
  controllers: [EvidenceController],
  exports: [EvidenceService, S3StorageService],
})
export class EvidenceModule {}
