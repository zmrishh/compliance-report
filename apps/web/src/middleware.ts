import { authkitMiddleware } from '@workos-inc/authkit-nextjs';

export default authkitMiddleware({
  // Routes that do not require authentication
  middlewareAuth: {
    enabled: true,
    unauthenticatedPaths: ['/login', '/auth/callback'],
  },
});

export const config = {
  // Apply to all routes except static files, Next.js internals, and health check
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/health).*)'],
};
