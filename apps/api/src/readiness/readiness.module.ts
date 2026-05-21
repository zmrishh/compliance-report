import { Module } from '@nestjs/common';

import { DatabaseModule } from '../database/database.module.js';
import { ReadinessService } from './readiness.service.js';
import { ReadinessController } from './readiness.controller.js';
import { SnapshotService } from './snapshot.service.js';
import { RulesModule } from '../rules/rules.module.js';

@Module({
  imports: [RulesModule, DatabaseModule],
  providers: [ReadinessService, SnapshotService],
  controllers: [ReadinessController],
  exports: [ReadinessService, SnapshotService],
})
export class ReadinessModule {}
