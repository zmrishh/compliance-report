'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';
import { ConnectorCard } from './connector-card';

interface ConnectorConfig {
  id: string;
  type: string;
  displayName: string;
  isActive: boolean;
  lastSyncAt: string | null;
  lastSyncStatus: string | null;
  createdAt: string;
}

export function ConnectorManagement({
  token,
  workspaceId,
}: {
  token: string;
  workspaceId: string;
}) {
  const queryClient = useQueryClient();

  const { data: connectors = [], isLoading } = useQuery({
    queryKey: ['connectors'],
    queryFn: () => apiClient.get<ConnectorConfig[]>('/connector-configs', token),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/connector-configs/${id}`, token),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['connectors'] }),
  });

  const syncMutation = useMutation({
    mutationFn: (id: string) =>
      apiClient.post(`/connector-configs/${id}/sync`, {}, token),
    onSuccess: () =>
      setTimeout(() => {
        void queryClient.invalidateQueries({ queryKey: ['connectors'] });
      }, 5000),
  });

  const CONNECTOR_TYPES = [
    {
      type: 'aws',
      label: 'Amazon Web Services',
      description: 'IAM credential reports, Security Hub findings, Config compliance, and account metadata.',
      logoSrc: '/logos/aws.svg',
    },
    {
      type: 'github',
      label: 'GitHub',
      description: 'Organization audit log, repository branch protection rules, and required review settings.',
      logoSrc: '/logos/github.svg',
    },
  ];

  if (isLoading) {
    return <div className="text-muted-foreground text-sm">Loading connectors…</div>;
  }

  return (
    <div className="space-y-4">
      {CONNECTOR_TYPES.map((def) => {
        const existing = connectors.find((c) => c.type === def.type);
        return (
          <ConnectorCard
            key={def.type}
            connectorType={def.type}
            label={def.label}
            description={def.description}
            existing={existing}
            token={token}
            onDelete={existing ? () => deleteMutation.mutate(existing.id) : undefined}
            onSync={existing ? () => syncMutation.mutate(existing.id) : undefined}
            isSyncing={syncMutation.isPending && syncMutation.variables === existing?.id}
            isDeleting={deleteMutation.isPending && deleteMutation.variables === existing?.id}
            onConnected={() => void queryClient.invalidateQueries({ queryKey: ['connectors'] })}
          />
        );
      })}
    </div>
  );
}
