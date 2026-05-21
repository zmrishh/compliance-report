import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { WORKSPACE_ROLE, listEvidenceSchema, type AuthenticatedUser } from '@compliance/shared';

import { AuthGuard } from '../auth/auth.guard.js';
import { RbacGuard } from '../common/guards/rbac.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import { EvidenceService } from './evidence.service.js';
import { z } from 'zod';

const requestUploadSchema = z.object({
  controlStateId: z.string().uuid(),
  fileName: z.string().min(1).max(255),
  mimeType: z.string().min(1),
  fileSizeBytes: z.number().int().positive(),
});

const confirmUploadSchema = z.object({
  contentHash: z.string().min(64).max(64),
});

@Controller('workspaces/:workspaceId/evidence')
@UseGuards(AuthGuard, RbacGuard)
@Roles(WORKSPACE_ROLE.VIEWER)
export class EvidenceController {
  constructor(private readonly evidenceService: EvidenceService) {}

  @Post('request-upload')
  @Roles(WORKSPACE_ROLE.EDITOR)
  requestUpload(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(requestUploadSchema))
    body: z.infer<typeof requestUploadSchema>,
  ) {
    return this.evidenceService.requestUpload({
      workspaceId,
      orgId: user.orgId,
      controlStateId: body.controlStateId,
      uploaderId: user.userId,
      fileName: body.fileName,
      mimeType: body.mimeType,
      fileSizeBytes: body.fileSizeBytes,
    });
  }

  @Patch(':evidenceId/confirm')
  @Roles(WORKSPACE_ROLE.EDITOR)
  confirmUpload(
    @Param('workspaceId') workspaceId: string,
    @Param('evidenceId') evidenceId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(confirmUploadSchema)) body: { contentHash: string },
  ) {
    return this.evidenceService.confirmUpload(
      evidenceId,
      workspaceId,
      body.contentHash,
      user.orgId,
      user.userId,
    );
  }

  @Get(':evidenceId/download-url')
  getDownloadUrl(
    @Param('workspaceId') workspaceId: string,
    @Param('evidenceId') evidenceId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.evidenceService.getDownloadUrl(
      evidenceId,
      workspaceId,
      user.orgId,
      user.userId,
    );
  }

  @Get()
  list(
    @Param('workspaceId') workspaceId: string,
    @Query(new ZodValidationPipe(listEvidenceSchema))
    query: { controlStateId?: string; cursor?: string; limit?: number },
  ) {
    return this.evidenceService.list(workspaceId, query);
  }
}
