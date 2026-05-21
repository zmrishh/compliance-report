import { withAuth } from '@workos-inc/authkit-nextjs';

import { WorkspaceList } from '@/components/workspaces/workspace-list';

export default async function WorkspacesPage() {
  const { accessToken } = await withAuth({ ensureSignedIn: true });
  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">Workspaces</h1>
          <p className="text-muted-foreground mt-1">
            Each workspace is a scoped compliance project. Create one per product or system boundary.
          </p>
        </div>
        <WorkspaceList token={accessToken ?? ''} />
      </div>
    </div>
  );
}
