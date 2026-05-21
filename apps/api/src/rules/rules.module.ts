import { Module, forwardRef } from '@nestjs/common';

import { SlackModule } from '../integrations/slack/slack.module.js';
import { ReadinessModule } from '../readiness/readiness.module.js';
import { RulesEngineService } from './rules-engine.service.js';

@Module({
  imports: [forwardRef(() => SlackModule), forwardRef(() => ReadinessModule)],
  providers: [RulesEngineService],
  exports: [RulesEngineService],
})
export class RulesModule {}
