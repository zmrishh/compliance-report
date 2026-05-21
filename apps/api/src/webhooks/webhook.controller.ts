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
import {
  createWebhookConfigSchema,
  WORKSPACE_ROLE,
  type AuthenticatedUser,
  type CreateWebhookConfigDto,
} from '@compliance/shared';

import { AuthGuard } from '../auth/auth.guard.js';
import { RbacGuard } from '../common/guards/rbac.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import { WebhookService } from './webhook.service.js';

@Controller('webhooks')
@UseGuards(AuthGuard)
export class WebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createWebhookConfigSchema)) body: CreateWebhookConfigDto,
  ) {
    return this.webhookService.createConfig(body, user.orgId);
  }

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.webhookService.listConfigs(user.orgId);
  }

  @Delete(':configId')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(
    @Param('configId') configId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.webhookService.deleteConfig(configId, user.orgId);
  }

  @Get(':configId/deliveries')
  getDeliveries(
    @Param('configId') configId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.webhookService.getDeliveries(configId, user.orgId);
  }
}
