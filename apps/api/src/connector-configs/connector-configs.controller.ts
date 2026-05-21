import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { createConnectorConfigSchema, type AuthenticatedUser } from '@compliance/shared';

import { AuthGuard } from '../auth/auth.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import { ConnectorConfigsService } from './connector-configs.service.js';
import { ConnectorSyncService } from '../connector-sync/connector-sync.service.js';

@Controller('connector-configs')
@UseGuards(AuthGuard)
export class ConnectorConfigsController {
  constructor(
    private readonly service: ConnectorConfigsService,
    private readonly syncService: ConnectorSyncService,
  ) {}

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createConnectorConfigSchema)) dto: unknown,
  ) {
    return this.service.create(user.orgId, dto as Parameters<typeof this.service.create>[1]);
  }

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.service.findAll(user.orgId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.findOne(id, user.orgId);
  }

  @Post(':id/sync')
  @HttpCode(HttpStatus.ACCEPTED)
  async triggerSync(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    const connector = await this.service.findOne(id, user.orgId);
    const jobId = await this.syncService.triggerManualSync(id, user.orgId, connector.type);
    return { message: 'Sync started', jobId };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    await this.syncService.removeSchedule(id);
    await this.service.softDelete(id, user.orgId);
  }
}
