'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';

import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ReadinessScoreGauge } from './readiness-score-gauge';
import { ControlTable } from './control-table';
import { FailedControlsPanel } from './failed-controls-panel';
import { ConnectorStatusBar } from './connector-status-bar';
import type { ReadinessSummary, ControlStateWithControl } from '@/types/readiness';

export function ReadinessDashboard({
  workspaceId,
  token,
}: {
  workspaceId: string;
  token: string;
}) {
  const queryClient = useQueryClient();

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['readiness', workspaceId, 'summary'],
    queryFn: () =>
      apiClient.get<ReadinessSummary>(`/workspaces/${workspaceId}/readiness`, token),
    staleTime: 60_000,
  });

  const { data: controls, isLoading: controlsLoading } = useQuery({
    queryKey: ['readiness', workspaceId, 'controls'],
    queryFn: () =>
      apiClient.get<ControlStateWithControl[]>(
        `/workspaces/${workspaceId}/readiness/controls`,
        token,
      ),
    staleTime: 60_000,
  });

  const { data: connectors } = useQuery({
    queryKey: ['connectors', workspaceId],
    queryFn: () =>
      apiClient.get<ConnectorConfig[]>(`/connector-configs`, token),
    staleTime: 60_000,
  });

  const evaluateMutation = useMutation({
    mutationFn: () =>
      apiClient.post(`/workspaces/${workspaceId}/readiness/evaluate`, {}, token),
    onSuccess: () => {
      setTimeout(() => {
        void queryClient.invalidateQueries({ queryKey: ['readiness', workspaceId] });
      }, 3000);
    },
  });

  if (summaryLoading || controlsLoading) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64 lg:col-span-2" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Readiness Dashboard</h1>
          {summary?.updatedAt && (
            <p className="text-sm text-muted-foreground mt-1">
              Last evaluated:{' '}
              {new Date(summary.updatedAt).toLocaleString(undefined, {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
            </p>
          )}
        </div>
        <Button
          variant="outline"
          onClick={() => evaluateMutation.mutate()}
          disabled={evaluateMutation.isPending}
          size="sm"
        >
          <RefreshCw
            className={`h-4 w-4 mr-2 ${evaluateMutation.isPending ? 'animate-spin' : ''}`}
          />
          Re-evaluate
        </Button>
      </div>

      {connectors && connectors.length > 0 && (
        <ConnectorStatusBar connectors={connectors} token={token} workspaceId={workspaceId} />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ReadinessScoreGauge summary={summary ?? null} />
        {summary && summary.topFailures.length > 0 && (
          <div className="lg:col-span-2">
            <FailedControlsPanel failures={summary.topFailures} />
          </div>
        )}
      </div>

      {controls && controls.length > 0 && (
        <ControlTable
          controls={controls}
          workspaceId={workspaceId}
          token={token}
          onUpdate={() => void queryClient.invalidateQueries({ queryKey: ['readiness', workspaceId] })}
        />
      )}
    </div>
  );
}

interface ConnectorConfig {
  id: string;
  type: string;
  displayName: string;
  isActive: boolean;
  lastSyncAt: string | null;
  lastSyncStatus: string | null;
}
