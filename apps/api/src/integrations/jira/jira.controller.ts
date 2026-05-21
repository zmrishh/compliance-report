import { Body, Controller, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import { createJiraTicketSchema, AUDIT_ACTION, WORKSPACE_ROLE, type CreateJiraTicketDto, type AuthenticatedUser } from '@compliance/shared';

import { AuthGuard } from '../../auth/auth.guard.js';
import { RbacGuard } from '../../common/guards/rbac.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { AuditService } from '../../audit/audit.service.js';
import { JiraService } from './jira.service.js';

@Controller('workspaces/:workspaceId/controls/:controlStateId/jira-ticket')
@UseGuards(AuthGuard, RbacGuard)
@Roles(WORKSPACE_ROLE.EDITOR)
export class JiraController {
  constructor(
    private readonly jiraService: JiraService,
    private readonly auditService: AuditService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createTicket(
    @Param('workspaceId') workspaceId: string,
    @Param('controlStateId') controlStateId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createJiraTicketSchema)) body: CreateJiraTicketDto,
  ) {
    const result = await this.jiraService.createTicket(
      user.orgId,
      workspaceId,
      controlStateId,
      body.summary,
      body.description,
    );

    await this.auditService.record({
      actorId: user.userId,
      orgId: user.orgId,
      action: AUDIT_ACTION.JIRA_TICKET_CREATED,
      resourceType: 'control_state',
      resourceId: controlStateId,
      metadata: { ticketKey: result.ticketKey, ticketUrl: result.ticketUrl, workspaceId },
    });

    return result;
  }
}
