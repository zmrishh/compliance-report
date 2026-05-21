import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { eq, and } from 'drizzle-orm';
import { workspaceMembers, workspaces } from '@compliance/db';
import type { DbClient } from '@compliance/db';
import { WORKSPACE_ROLE, type AuthenticatedUser, type WorkspaceRole } from '@compliance/shared';

import { DB_CLIENT } from '../../database/database.module.js';
import { ROLES_KEY } from '../decorators/roles.decorator.js';

const ROLE_HIERARCHY: Record<WorkspaceRole, number> = {
  [WORKSPACE_ROLE.OWNER]: 3,
  [WORKSPACE_ROLE.EDITOR]: 2,
  [WORKSPACE_ROLE.VIEWER]: 1,
};

@Injectable()
export class RbacGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(DB_CLIENT) private readonly db: DbClient,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<WorkspaceRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = context.switchToHttp().getRequest<{
      user: AuthenticatedUser;
      params: Record<string, string>;
    }>();

    const { user, params } = request;
    const workspaceId = params['workspaceId'] ?? params['id'];

    if (!workspaceId) {
      throw new ForbiddenException('Workspace context required');
    }

    // Verify workspace belongs to the user's org (tenant isolation)
    const [workspace] = await this.db
      .select({ id: workspaces.id, orgId: workspaces.orgId })
      .from(workspaces)
      .where(and(eq(workspaces.id, workspaceId), eq(workspaces.orgId, user.orgId)))
      .limit(1);

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    const [membership] = await this.db
      .select({ role: workspaceMembers.role })
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.userId, user.userId),
        ),
      )
      .limit(1);

    if (!membership) {
      throw new ForbiddenException('Not a member of this workspace');
    }

    const userLevel = ROLE_HIERARCHY[membership.role as WorkspaceRole] ?? 0;
    const minRequired = Math.min(
      ...requiredRoles.map((r) => ROLE_HIERARCHY[r] ?? 99),
    );

    if (userLevel < minRequired) {
      throw new ForbiddenException('Insufficient workspace role');
    }

    return true;
  }
}
