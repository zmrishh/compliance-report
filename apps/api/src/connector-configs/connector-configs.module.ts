import { Module, forwardRef } from '@nestjs/common';

import { ConnectorConfigsService } from './connector-configs.service.js';
import { ConnectorConfigsController } from './connector-configs.controller.js';
import { ConnectorSyncModule } from '../connector-sync/connector-sync.module.js';

@Module({
  imports: [forwardRef(() => ConnectorSyncModule)],
  providers: [ConnectorConfigsService],
  controllers: [ConnectorConfigsController],
  exports: [ConnectorConfigsService],
})
export class ConnectorConfigsModule {}
