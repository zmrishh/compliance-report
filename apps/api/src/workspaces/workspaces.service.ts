import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import { workspaces, workspaceMembers } from '@compliance/db';
import type { DbClient } from '@compliance/db';
import {
  WORKSPACE_ROLE,
  type CreateWorkspaceDto,
  type UpdateWorkspaceDto,
} from '@compliance/shared';

import { DB_CLIENT } from '../database/database.module.js';

@Injectable()
export class WorkspacesService {
  constructor(@Inject(DB_CLIENT) private readonly db: DbClient) {}

  async create(
    orgId: string,
    userId: string,
    dto: CreateWorkspaceDto,
  ) {
    const [workspace] = await this.db
      .insert(workspaces)
      .values({
        orgId,
        name: dto.name,
        description: dto.description ?? null,
        framework: dto.framework,
        systemBoundary: dto.systemBoundary ?? null,
      })
      .returning();

    // Creator is automatically an owner
    await this.db.insert(workspaceMembers).values({
      workspaceId: workspace.id,
      userId,
      role: WORKSPACE_ROLE.OWNER,
    });

    return workspace;
  }

  async findAll(orgId: string, userId: string) {
    // Return workspaces the user is a member of
    const rows = await this.db
      .select({ workspace: workspaces, role: workspaceMembers.role })
      .from(workspaces)
      .innerJoin(workspaceMembers, eq(workspaces.id, workspaceMembers.workspaceId))
      .where(
        and(
          eq(workspaces.orgId, orgId),
          eq(workspaceMembers.userId, userId),
          isNull(workspaces.deletedAt),
        ),
      )
      .orderBy(workspaces.createdAt);

    return rows.map(({ workspace, role }) => ({ ...workspace, userRole: role }));
  }

  async findOne(id: string, orgId: string) {
    const [workspace] = await this.db
      .select()
      .from(workspaces)
      .where(and(eq(workspaces.id, id), eq(workspaces.orgId, orgId), isNull(workspaces.deletedAt)))
      .limit(1);

    if (!workspace) throw new NotFoundException('Workspace not found');
    return workspace;
  }

  async update(id: string, orgId: string, dto: UpdateWorkspaceDto) {
    const workspace = await this.findOne(id, orgId);

    const [updated] = await this.db
      .update(workspaces)
      .set({
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.systemBoundary !== undefined && { systemBoundary: dto.systemBoundary }),
        updatedAt: new Date(),
      })
      .where(eq(workspaces.id, workspace.id))
      .returning();

    return updated;
  }

  async softDelete(id: string, orgId: string, userId: string) {
    const workspace = await this.findOne(id, orgId);

    // Verify caller is owner
    const [membership] = await this.db
      .select()
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, id),
          eq(workspaceMembers.userId, userId),
        ),
      )
      .limit(1);

    if (!membership || membership.role !== WORKSPACE_ROLE.OWNER) {
      throw new ForbiddenException('Only workspace owners can delete workspaces');
    }

    await this.db
      .update(workspaces)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(workspaces.id, workspace.id));
  }

  async addMember(workspaceId: string, orgId: string, targetUserId: string, role: string) {
    await this.findOne(workspaceId, orgId);

    const [member] = await this.db
      .insert(workspaceMembers)
      .values({ workspaceId, userId: targetUserId, role })
      .onConflictDoUpdate({
        target: [workspaceMembers.workspaceId, workspaceMembers.userId],
        set: { role, updatedAt: new Date() },
      })
      .returning();

    return member;
  }

  async removeMember(workspaceId: string, orgId: string, targetUserId: string, requestingUserId: string) {
    await this.findOne(workspaceId, orgId);

    if (targetUserId === requestingUserId) {
      throw new ForbiddenException('Cannot remove yourself from a workspace');
    }

    await this.db
      .delete(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.userId, targetUserId),
        ),
      );
  }
}
