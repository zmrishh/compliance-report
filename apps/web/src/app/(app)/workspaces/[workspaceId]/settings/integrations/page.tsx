import { withAuth } from '@workos-inc/authkit-nextjs';
import { IntegrationSettings } from '@/components/integrations/integration-settings';

export default async function IntegrationsPage({
  params,
}: {
  params: { workspaceId: string };
}) {
  const { accessToken } = await withAuth({ ensureSignedIn: true });

  return (
    <div className="p-6">
      <IntegrationSettings workspaceId={params.workspaceId} token={accessToken ?? ''} />
    </div>
  );
}
