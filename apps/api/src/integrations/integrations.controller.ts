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
  createIntegrationConfigSchema,
  WORKSPACE_ROLE,
  type AuthenticatedUser,
  type CreateIntegrationConfigDto,
} from '@compliance/shared';

import { AuthGuard } from '../auth/auth.guard.js';
import { RbacGuard } from '../common/guards/rbac.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import { IntegrationsService } from './integrations.service.js';

@Controller('workspaces/:workspaceId/integrations')
@UseGuards(AuthGuard, RbacGuard)
export class IntegrationsController {
  constructor(private readonly integrationsService: IntegrationsService) {}

  @Get()
  @Roles(WORKSPACE_ROLE.VIEWER)
  list(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.integrationsService.list(user.orgId, workspaceId);
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  @Roles(WORKSPACE_ROLE.OWNER)
  upsert(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createIntegrationConfigSchema)) body: CreateIntegrationConfigDto,
  ) {
    return this.integrationsService.upsert(user.orgId, workspaceId, body);
  }

  @Delete(':integrationId')
  @Roles(WORKSPACE_ROLE.OWNER)
  remove(
    @Param('workspaceId') workspaceId: string,
    @Param('integrationId') integrationId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.integrationsService.remove(user.orgId, workspaceId, integrationId);
  }
}
