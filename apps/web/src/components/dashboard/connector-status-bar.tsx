'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { RefreshCw, CheckCircle2, XCircle, Clock, Loader2 } from 'lucide-react';

import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ConnectorConfig {
  id: string;
  type: string;
  displayName: string;
  isActive: boolean;
  lastSyncAt: string | null;
  lastSyncStatus: string | null;
}

export function ConnectorStatusBar({
  connectors,
  token,
  workspaceId,
}: {
  connectors: ConnectorConfig[];
  token: string;
  workspaceId: string;
}) {
  const queryClient = useQueryClient();

  const syncMutation = useMutation({
    mutationFn: (connectorId: string) =>
      apiClient.post(`/connector-configs/${connectorId}/sync`, {}, token),
    onSuccess: () => {
      setTimeout(() => {
        void queryClient.invalidateQueries({ queryKey: ['connectors'] });
        void queryClient.invalidateQueries({ queryKey: ['readiness', workspaceId] });
      }, 5000);
    },
  });

  return (
    <div className="flex items-center gap-3 flex-wrap p-3 bg-muted/30 rounded-lg border border-border">
      <span className="text-xs font-medium text-muted-foreground mr-1">Connectors:</span>
      {connectors.map((connector) => (
        <ConnectorStatusChip
          key={connector.id}
          connector={connector}
          onSync={() => syncMutation.mutate(connector.id)}
          isSyncing={syncMutation.isPending && syncMutation.variables === connector.id}
        />
      ))}
    </div>
  );
}

function ConnectorStatusChip({
  connector,
  onSync,
  isSyncing,
}: {
  connector: ConnectorConfig;
  onSync: () => void;
  isSyncing: boolean;
}) {
  const status = connector.lastSyncStatus;
  const lastSync = connector.lastSyncAt
    ? new Date(connector.lastSyncAt).toLocaleString(undefined, {
        dateStyle: 'short',
        timeStyle: 'short',
      })
    : 'Never';

  return (
    <div className="flex items-center gap-2 bg-background border border-border rounded-md px-3 py-1.5 text-xs">
      <StatusIcon status={status} isSyncing={isSyncing} />
      <span className="font-medium">{connector.displayName}</span>
      <span className="text-muted-foreground">·</span>
      <span className="text-muted-foreground">{lastSync}</span>
      <Button
        variant="ghost"
        size="icon"
        className="h-5 w-5 ml-1"
        onClick={(e) => { e.stopPropagation(); onSync(); }}
        disabled={isSyncing}
        title="Sync now"
      >
        <RefreshCw className={cn('h-3 w-3', isSyncing && 'animate-spin')} />
      </Button>
    </div>
  );
}

function StatusIcon({ status, isSyncing }: { status: string | null; isSyncing: boolean }) {
  if (isSyncing || status === 'running') {
    return <Loader2 className="h-3 w-3 text-blue-500 animate-spin" />;
  }
  if (status === 'completed') {
    return <CheckCircle2 className="h-3 w-3 text-green-500" />;
  }
  if (status === 'failed') {
    return <XCircle className="h-3 w-3 text-red-500" />;
  }
  return <Clock className="h-3 w-3 text-muted-foreground" />;
}
