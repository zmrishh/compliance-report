import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  updateControlStateSchema,
  waiveControlSchema,
  WORKSPACE_ROLE,
  type AuthenticatedUser,
} from '@compliance/shared';

import { AuthGuard } from '../auth/auth.guard.js';
import { RbacGuard } from '../common/guards/rbac.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import { ReadinessService } from './readiness.service.js';

@Controller('workspaces/:workspaceId/readiness')
@UseGuards(AuthGuard, RbacGuard)
@Roles(WORKSPACE_ROLE.VIEWER)
export class ReadinessController {
  constructor(private readonly readinessService: ReadinessService) {}

  @Get()
  getSummary(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.readinessService.getSummary(workspaceId, user.orgId);
  }

  @Get('controls')
  getControlStates(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.readinessService.getControlStates(workspaceId, user.orgId);
  }

  @Post('evaluate')
  @HttpCode(HttpStatus.ACCEPTED)
  @Roles(WORKSPACE_ROLE.OWNER)
  async triggerEvaluation(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    // Fire and forget — returns 202 immediately
    void this.readinessService.triggerEvaluation(workspaceId, user.orgId);
    return { message: 'Evaluation started', workspaceId };
  }

  @Patch('controls/:controlStateId')
  @Roles(WORKSPACE_ROLE.EDITOR)
  updateControlState(
    @Param('workspaceId') workspaceId: string,
    @Param('controlStateId') controlStateId: string,
    @Body(new ZodValidationPipe(updateControlStateSchema)) body: unknown,
  ) {
    return this.readinessService.updateControlState(
      controlStateId,
      workspaceId,
      body as { ownerId?: string | null; notes?: string | null },
    );
  }

  @Post('controls/:controlStateId/waive')
  @Roles(WORKSPACE_ROLE.OWNER)
  waiveControl(
    @Param('workspaceId') workspaceId: string,
    @Param('controlStateId') controlStateId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(waiveControlSchema)) body: { reason: string },
  ) {
    return this.readinessService.waiveControl(
      controlStateId,
      workspaceId,
      user.userId,
      body.reason,
    );
  }
}
