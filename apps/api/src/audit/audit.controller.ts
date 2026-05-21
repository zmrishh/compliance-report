import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import { listAuditEventsSchema } from '@compliance/shared';
import type { AuthenticatedUser } from '@compliance/shared';

import { AuditService } from './audit.service.js';

@Controller('audit-events')
@UseGuards(AuthGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(listAuditEventsSchema))
    query: { resourceType?: string; resourceId?: string; cursor?: string; limit?: number },
  ) {
    return this.auditService.list(user.orgId, query);
  }
}
