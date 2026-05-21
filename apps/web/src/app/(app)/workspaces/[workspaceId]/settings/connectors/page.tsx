import { withAuth } from '@workos-inc/authkit-nextjs';

import { ConnectorManagement } from '@/components/connectors/connector-management';

export default async function ConnectorsPage({
  params,
}: {
  params: { workspaceId: string };
}) {
  const { accessToken } = await withAuth({ ensureSignedIn: true });

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">Connectors</h1>
          <p className="text-muted-foreground mt-1">
            Connect your systems to automatically collect evidence. Credentials are encrypted
            and stored in AWS Secrets Manager — never in the database.
          </p>
        </div>
        <ConnectorManagement token={accessToken ?? ''} workspaceId={params.workspaceId} />
      </div>
    </div>
  );
}
