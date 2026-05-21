import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { AUDIT_ACTION, WORKSPACE_ROLE, type AuthenticatedUser } from '@compliance/shared';

import { AuthGuard } from '../auth/auth.guard.js';
import { RbacGuard } from '../common/guards/rbac.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { AuditService } from '../audit/audit.service.js';
import { ExportService } from './export.service.js';

@Controller('workspaces/:workspaceId/export')
@UseGuards(AuthGuard, RbacGuard)
@Roles(WORKSPACE_ROLE.VIEWER)
export class ExportController {
  constructor(
    private readonly exportService: ExportService,
    private readonly auditService: AuditService,
  ) {}

  @Get()
  async export(
    @Param('workspaceId') workspaceId: string,
    @Query('format') format: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res() reply: FastifyReply,
  ) {
    if (format !== 'pdf' && format !== 'csv') {
      throw new BadRequestException('format must be "pdf" or "csv"');
    }

    const timestamp = new Date().toISOString().slice(0, 10);

    await this.auditService.record({
      actorId: user.userId,
      orgId: user.orgId,
      action: AUDIT_ACTION.EXPORT_DOWNLOADED,
      resourceType: 'workspace',
      resourceId: workspaceId,
      metadata: { format },
    });

    if (format === 'csv') {
      const csv = await this.exportService.exportCsv(workspaceId, user.orgId);
      void reply
        .header('Content-Type', 'text/csv; charset=utf-8')
        .header('Content-Disposition', `attachment; filename="readiness-${timestamp}.csv"`)
        .send(csv);
      return;
    }

    const pdfBuffer = await this.exportService.exportPdf(workspaceId, user.orgId);
    void reply
      .header('Content-Type', 'application/pdf')
      .header('Content-Disposition', `attachment; filename="readiness-${timestamp}.pdf"`)
      .send(pdfBuffer);
  }
}
