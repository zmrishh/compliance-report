import { Body, Controller, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import { aiDraftSchema, AUDIT_ACTION, WORKSPACE_ROLE, type AiDraftDto, type AuthenticatedUser } from '@compliance/shared';

import { AuthGuard } from '../auth/auth.guard.js';
import { RbacGuard } from '../common/guards/rbac.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import { AuditService } from '../audit/audit.service.js';
import { AiService } from './ai.service.js';

@Controller('workspaces/:workspaceId/ai')
@UseGuards(AuthGuard, RbacGuard)
@Roles(WORKSPACE_ROLE.EDITOR)
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly auditService: AuditService,
  ) {}

  @Post('draft')
  @HttpCode(HttpStatus.OK)
  async draft(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(aiDraftSchema)) body: AiDraftDto,
  ) {
    const result = await this.aiService.draft(
      body.controlId,
      body.type,
      workspaceId,
      user.orgId,
    );

    await this.auditService.record({
      actorId: user.userId,
      orgId: user.orgId,
      action: AUDIT_ACTION.AI_DRAFT,
      resourceType: 'control',
      resourceId: body.controlId,
      metadata: { type: body.type, workspaceId, model: result.model },
    });

    return result;
  }
}
