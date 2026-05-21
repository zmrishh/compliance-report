import { withAuth } from '@workos-inc/authkit-nextjs';

import { ReadinessDashboard } from '@/components/dashboard/readiness-dashboard';

export default async function ReadinessPage({
  params,
}: {
  params: { workspaceId: string };
}) {
  const { accessToken } = await withAuth({ ensureSignedIn: true });

  return (
    <div className="p-8">
      <ReadinessDashboard workspaceId={params.workspaceId} token={accessToken ?? ''} />
    </div>
  );
}
