import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  createAccessReviewCampaignSchema,
  reviewItemSchema,
  WORKSPACE_ROLE,
  type AuthenticatedUser,
  type CreateAccessReviewCampaignDto,
  type ReviewItemDto,
} from '@compliance/shared';

import { AuthGuard } from '../auth/auth.guard.js';
import { RbacGuard } from '../common/guards/rbac.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import { AccessReviewService } from './access-review.service.js';

@Controller('workspaces/:workspaceId/access-reviews')
@UseGuards(AuthGuard, RbacGuard)
export class AccessReviewController {
  constructor(private readonly accessReviewService: AccessReviewService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(WORKSPACE_ROLE.OWNER)
  createCampaign(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createAccessReviewCampaignSchema)) body: CreateAccessReviewCampaignDto,
  ) {
    return this.accessReviewService.createCampaign(body, workspaceId, user.orgId, user.userId);
  }

  @Get()
  @Roles(WORKSPACE_ROLE.VIEWER)
  listCampaigns(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.accessReviewService.listCampaigns(workspaceId, user.orgId);
  }

  @Get(':campaignId')
  @Roles(WORKSPACE_ROLE.VIEWER)
  getCampaign(
    @Param('workspaceId') workspaceId: string,
    @Param('campaignId') campaignId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.accessReviewService.getCampaignWithItems(campaignId, workspaceId, user.orgId);
  }

  @Post(':campaignId/items/:itemId/review')
  @HttpCode(HttpStatus.OK)
  @Roles(WORKSPACE_ROLE.EDITOR)
  reviewItem(
    @Param('workspaceId') workspaceId: string,
    @Param('campaignId') campaignId: string,
    @Param('itemId') itemId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(reviewItemSchema)) body: ReviewItemDto,
  ) {
    return this.accessReviewService.reviewItem(
      itemId,
      campaignId,
      workspaceId,
      user.orgId,
      body,
      user.userId,
    );
  }

  @Post(':campaignId/complete')
  @HttpCode(HttpStatus.OK)
  @Roles(WORKSPACE_ROLE.OWNER)
  completeCampaign(
    @Param('workspaceId') workspaceId: string,
    @Param('campaignId') campaignId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.accessReviewService.completeCampaign(campaignId, workspaceId, user.orgId, user.userId);
  }
}
