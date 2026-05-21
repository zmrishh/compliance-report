import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  createPolicySchema,
  updatePolicySchema,
  WORKSPACE_ROLE,
  type AuthenticatedUser,
  type CreatePolicyDto,
  type UpdatePolicyDto,
} from '@compliance/shared';

import { AuthGuard } from '../auth/auth.guard.js';
import { RbacGuard } from '../common/guards/rbac.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import { PolicyService } from './policy.service.js';

@Controller('workspaces/:workspaceId/policies')
@UseGuards(AuthGuard, RbacGuard)
export class PolicyController {
  constructor(private readonly policyService: PolicyService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(WORKSPACE_ROLE.EDITOR)
  create(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createPolicySchema)) body: CreatePolicyDto,
  ) {
    return this.policyService.create(body, workspaceId, user.orgId, user.userId);
  }

  @Get()
  @Roles(WORKSPACE_ROLE.VIEWER)
  list(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.policyService.list(workspaceId, user.orgId);
  }

  @Get(':policyId')
  @Roles(WORKSPACE_ROLE.VIEWER)
  get(
    @Param('workspaceId') workspaceId: string,
    @Param('policyId') policyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.policyService.get(policyId, workspaceId, user.orgId);
  }

  @Patch(':policyId')
  @Roles(WORKSPACE_ROLE.EDITOR)
  update(
    @Param('workspaceId') workspaceId: string,
    @Param('policyId') policyId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(updatePolicySchema)) body: UpdatePolicyDto,
  ) {
    return this.policyService.update(policyId, body, workspaceId, user.orgId, user.userId);
  }

  @Post(':policyId/publish')
  @HttpCode(HttpStatus.OK)
  @Roles(WORKSPACE_ROLE.OWNER)
  publish(
    @Param('workspaceId') workspaceId: string,
    @Param('policyId') policyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.policyService.publish(policyId, workspaceId, user.orgId, user.userId);
  }

  @Post(':policyId/archive')
  @HttpCode(HttpStatus.OK)
  @Roles(WORKSPACE_ROLE.OWNER)
  archive(
    @Param('workspaceId') workspaceId: string,
    @Param('policyId') policyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.policyService.archive(policyId, workspaceId, user.orgId, user.userId);
  }

  @Get(':policyId/versions')
  @Roles(WORKSPACE_ROLE.VIEWER)
  listVersions(
    @Param('workspaceId') workspaceId: string,
    @Param('policyId') policyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.policyService.listVersions(policyId, workspaceId, user.orgId);
  }

  @Delete(':policyId')
  @Roles(WORKSPACE_ROLE.OWNER)
  archive2(
    @Param('workspaceId') workspaceId: string,
    @Param('policyId') policyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.policyService.archive(policyId, workspaceId, user.orgId, user.userId);
  }
}
