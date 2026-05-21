import { Module, forwardRef } from '@nestjs/common';

import { SlackModule } from '../integrations/slack/slack.module.js';
import { RulesEngineService } from './rules-engine.service.js';

@Module({
  imports: [forwardRef(() => SlackModule)],
  providers: [RulesEngineService],
  exports: [RulesEngineService],
})
export class RulesModule {}
