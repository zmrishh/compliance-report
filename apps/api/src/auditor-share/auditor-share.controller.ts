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
  createAuditorShareSchema,
  AUDIT_ACTION,
  WORKSPACE_ROLE,
  type AuthenticatedUser,
  type CreateAuditorShareDto,
} from '@compliance/shared';
import { ConfigService } from '@nestjs/config';

import { AuthGuard } from '../auth/auth.guard.js';
import { RbacGuard } from '../common/guards/rbac.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Public } from '../auth/public.decorator.js';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import { AuditService } from '../audit/audit.service.js';
import type { Env } from '../config/config.schema.js';
import { AuditorShareService } from './auditor-share.service.js';

@Controller()
export class AuditorShareController {
  constructor(
    private readonly shareService: AuditorShareService,
    private readonly auditService: AuditService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  @Post('workspaces/:workspaceId/auditor-shares')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(AuthGuard, RbacGuard)
  @Roles(WORKSPACE_ROLE.OWNER)
  async createShare(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createAuditorShareSchema)) body: CreateAuditorShareDto,
  ) {
    const appBaseUrl = this.config.get('API_URL', { infer: true });
    const result = await this.shareService.createShare(
      workspaceId,
      user.orgId,
      user.userId,
      body.expiresInDays,
      body.label,
      appBaseUrl,
    );

    await this.auditService.record({
      actorId: user.userId,
      orgId: user.orgId,
      action: AUDIT_ACTION.SHARE_CREATED,
      resourceType: 'workspace',
      resourceId: workspaceId,
      metadata: { shareId: result.id, expiresInDays: body.expiresInDays, label: body.label },
    });

    return result;
  }

  @Get('workspaces/:workspaceId/auditor-shares')
  @UseGuards(AuthGuard, RbacGuard)
  @Roles(WORKSPACE_ROLE.OWNER)
  listShares(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.shareService.listShares(workspaceId, user.orgId);
  }

  @Delete('workspaces/:workspaceId/auditor-shares/:shareId')
  @UseGuards(AuthGuard, RbacGuard)
  @Roles(WORKSPACE_ROLE.OWNER)
  async revokeShare(
    @Param('workspaceId') workspaceId: string,
    @Param('shareId') shareId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const result = await this.shareService.revokeShare(shareId, workspaceId, user.orgId);

    await this.auditService.record({
      actorId: user.userId,
      orgId: user.orgId,
      action: AUDIT_ACTION.SHARE_REVOKED,
      resourceType: 'auditor_share',
      resourceId: shareId,
      metadata: { workspaceId },
    });

    return result;
  }

  // Public endpoint — no auth required
  @Public()
  @Get('share/:token')
  getPublicSnapshot(@Param('token') token: string) {
    return this.shareService.getPublicSnapshot(token);
  }
}
