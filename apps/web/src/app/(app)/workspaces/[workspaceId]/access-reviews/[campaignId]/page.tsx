'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ArrowLeft, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { apiClient } from '@/lib/api-client';

const DECISION_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  approved: 'default',
  revoked: 'destructive',
  pending: 'outline',
};

interface ReviewItem {
  id: string;
  userEmail: string;
  userDisplayName: string;
  accessLevel: string;
  decision: string;
  reviewedAt: string | null;
}

interface CampaignDetail {
  id: string;
  name: string;
  connectorType: string;
  status: string;
  dueDate: string;
  items: ReviewItem[];
  progress: { total: number; reviewed: number };
}

export default function AccessReviewCampaignPage() {
  const params = useParams<{ workspaceId: string; campaignId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: campaign, isLoading } = useQuery<CampaignDetail>({
    queryKey: ['access-review-campaign', params.campaignId],
    queryFn: () =>
      apiClient.get<CampaignDetail>(`/workspaces/${params.workspaceId}/access-reviews/${params.campaignId}`),
  });

  const reviewMutation = useMutation({
    mutationFn: ({ itemId, decision }: { itemId: string; decision: 'approved' | 'revoked' }) =>
      apiClient.post(
        `/workspaces/${params.workspaceId}/access-reviews/${params.campaignId}/items/${itemId}/review`,
        { decision },
      ),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: ['access-review-campaign', params.campaignId] }),
  });

  const completeMutation = useMutation({
    mutationFn: () =>
      apiClient.post(
        `/workspaces/${params.workspaceId}/access-reviews/${params.campaignId}/complete`,
        {},
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['access-review-campaign', params.campaignId] });
      void queryClient.invalidateQueries({ queryKey: ['access-reviews', params.workspaceId] });
    },
  });

  if (isLoading || !campaign) {
    return <div className="py-16 text-center text-sm text-muted-foreground">Loading…</div>;
  }

  const pct = campaign.progress.total > 0
    ? Math.round((campaign.progress.reviewed / campaign.progress.total) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <button
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          onClick={() => router.push(`/workspaces/${params.workspaceId}/access-reviews`)}
        >
          <ArrowLeft className="h-4 w-4" />
          Access Reviews
        </button>
      </div>

      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">{campaign.name}</h1>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="capitalize">{campaign.connectorType.replace('_', ' ')}</span>
            <span>·</span>
            <span>Due {format(new Date(campaign.dueDate), 'MMM d, yyyy')}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge
            variant={
              campaign.status === 'open'
                ? 'default'
                : campaign.status === 'completed'
                ? 'secondary'
                : 'destructive'
            }
            className="capitalize"
          >
            {campaign.status}
          </Badge>
          {campaign.status === 'open' && (
            <Button
              size="sm"
              variant="outline"
              disabled={completeMutation.isPending}
              onClick={() => completeMutation.mutate()}
            >
              {completeMutation.isPending ? 'Completing…' : 'Complete campaign'}
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Progress</span>
          <span>
            {campaign.progress.reviewed} / {campaign.progress.total} reviewed
          </span>
        </div>
        <Progress value={pct} className="h-2" />
      </div>

      {campaign.items.length === 0 && (
        <div className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">
          No users to review. Ensure the connector has synced at least once.
        </div>
      )}

      {campaign.items.length > 0 && (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Access level</TableHead>
                <TableHead>Decision</TableHead>
                <TableHead>Reviewed at</TableHead>
                {campaign.status === 'open' && <TableHead className="w-24">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaign.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{item.userDisplayName}</p>
                      <p className="text-xs text-muted-foreground">{item.userEmail}</p>
                    </div>
                  </TableCell>
                  <TableCell className="capitalize text-xs">{item.accessLevel}</TableCell>
                  <TableCell>
                    <Badge variant={DECISION_VARIANT[item.decision] ?? 'outline'} className="capitalize text-xs">
                      {item.decision}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {item.reviewedAt ? format(new Date(item.reviewedAt), 'MMM d, HH:mm') : '—'}
                  </TableCell>
                  {campaign.status === 'open' && (
                    <TableCell>
                      {item.decision === 'pending' && (
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-green-600 hover:text-green-700"
                            disabled={reviewMutation.isPending}
                            onClick={() => reviewMutation.mutate({ itemId: item.id, decision: 'approved' })}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            disabled={reviewMutation.isPending}
                            onClick={() => reviewMutation.mutate({ itemId: item.id, decision: 'revoked' })}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
