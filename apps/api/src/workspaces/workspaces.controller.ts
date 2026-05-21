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
  addWorkspaceMemberSchema,
  createWorkspaceSchema,
  updateWorkspaceSchema,
  WORKSPACE_ROLE,
  type AddWorkspaceMemberDto,
  type CreateWorkspaceDto,
  type UpdateWorkspaceDto,
  type AuthenticatedUser,
} from '@compliance/shared';

import { AuthGuard } from '../auth/auth.guard.js';
import { RbacGuard } from '../common/guards/rbac.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import { WorkspacesService } from './workspaces.service.js';

@Controller('workspaces')
@UseGuards(AuthGuard)
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createWorkspaceSchema)) dto: CreateWorkspaceDto,
  ) {
    return this.workspacesService.create(user.orgId, user.userId, dto);
  }

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.workspacesService.findAll(user.orgId, user.userId);
  }

  @Get(':workspaceId')
  @UseGuards(RbacGuard)
  @Roles(WORKSPACE_ROLE.VIEWER)
  findOne(
    @Param('workspaceId') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.workspacesService.findOne(id, user.orgId);
  }

  @Patch(':workspaceId')
  @UseGuards(RbacGuard)
  @Roles(WORKSPACE_ROLE.EDITOR)
  update(
    @Param('workspaceId') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(updateWorkspaceSchema)) dto: UpdateWorkspaceDto,
  ) {
    return this.workspacesService.update(id, user.orgId, dto);
  }

  @Delete(':workspaceId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(RbacGuard)
  @Roles(WORKSPACE_ROLE.OWNER)
  async delete(
    @Param('workspaceId') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.workspacesService.softDelete(id, user.orgId, user.userId);
  }

  @Post(':workspaceId/members')
  @UseGuards(RbacGuard)
  @Roles(WORKSPACE_ROLE.OWNER)
  addMember(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(addWorkspaceMemberSchema)) dto: AddWorkspaceMemberDto,
  ) {
    return this.workspacesService.addMember(workspaceId, user.orgId, dto.userId, dto.role);
  }

  @Delete(':workspaceId/members/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(RbacGuard)
  @Roles(WORKSPACE_ROLE.OWNER)
  async removeMember(
    @Param('workspaceId') workspaceId: string,
    @Param('userId') targetUserId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.workspacesService.removeMember(workspaceId, user.orgId, targetUserId, user.userId);
  }
}
