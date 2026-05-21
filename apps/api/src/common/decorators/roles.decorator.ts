import { SetMetadata } from '@nestjs/common';
import type { WorkspaceRole } from '@compliance/shared';

export const ROLES_KEY = 'requiredRoles';
export const Roles = (...roles: WorkspaceRole[]) => SetMetadata(ROLES_KEY, roles);
