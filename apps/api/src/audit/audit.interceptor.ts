import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import type { FastifyRequest } from 'fastify';
import type { AuthenticatedUser, AuditAction } from '@compliance/shared';

import { AuditService } from './audit.service.js';

const METHOD_TO_ACTION: Record<string, AuditAction | undefined> = {
  POST: 'workspace.created',
  PATCH: 'workspace.updated',
  PUT: 'workspace.updated',
  DELETE: 'workspace.deleted',
};

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<
      FastifyRequest & { user?: AuthenticatedUser }
    >();

    const method = request.method.toUpperCase();
    const isMutation = ['POST', 'PATCH', 'PUT', 'DELETE'].includes(method);

    if (!isMutation || !request.user) {
      return next.handle();
    }

    const action = METHOD_TO_ACTION[method];
    if (!action) return next.handle();

    return next.handle().pipe(
      tap(() => {
        // Fire-and-forget; never await in the interceptor to avoid blocking
        void this.auditService.record({
          actorId: request.user!.userId,
          orgId: request.user!.orgId,
          action,
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'],
          metadata: {
            method,
            path: request.url,
          },
        });
      }),
    );
  }
}
