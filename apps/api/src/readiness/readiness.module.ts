import { Module } from '@nestjs/common';

import { ReadinessService } from './readiness.service.js';
import { ReadinessController } from './readiness.controller.js';
import { RulesModule } from '../rules/rules.module.js';

@Module({
  imports: [RulesModule],
  providers: [ReadinessService],
  controllers: [ReadinessController],
  exports: [ReadinessService],
})
export class ReadinessModule {}
