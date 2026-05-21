'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Clock, Send, Archive, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { PolicyEditor } from '@/components/policies/policy-editor';
import { apiClient } from '@/lib/api-client';

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'outline'> = {
  draft: 'outline',
  published: 'default',
  archived: 'secondary',
};

interface PolicyDetail {
  id: string;
  title: string;
  type: string;
  status: string;
  version: number;
  content: string;
  publishedAt: string | null;
  updatedAt: string;
}

interface PolicyVersion {
  id: string;
  version: number;
  status: string;
  createdBy: string;
  createdAt: string;
}

export default function PolicyDetailPage() {
  const params = useParams<{ workspaceId: string; policyId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isDirty, setDirty] = useState(false);

  const { data: policy, isLoading } = useQuery<PolicyDetail>({
    queryKey: ['policy', params.policyId],
    queryFn: () => apiClient.get<PolicyDetail>(`/workspaces/${params.workspaceId}/policies/${params.policyId}`),
  });

  const { data: versions = [] } = useQuery<PolicyVersion[]>({
    queryKey: ['policy-versions', params.policyId],
    queryFn: () => apiClient.get<PolicyVersion[]>(`/workspaces/${params.workspaceId}/policies/${params.policyId}/versions`),
  });

  useEffect(() => {
    if (policy) {
      setTitle(policy.title);
      setContent(policy.content);
      setDirty(false);
    }
  }, [policy]);

  const saveMutation = useMutation({
    mutationFn: () =>
      apiClient.patch(`/workspaces/${params.workspaceId}/policies/${params.policyId}`, { title, content }),
    onSuccess: () => {
      setDirty(false);
      void queryClient.invalidateQueries({ queryKey: ['policy', params.policyId] });
    },
  });

  const publishMutation = useMutation({
    mutationFn: () =>
      apiClient.post(`/workspaces/${params.workspaceId}/policies/${params.policyId}/publish`, {}),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['policy', params.policyId] }),
  });

  const archiveMutation = useMutation({
    mutationFn: () =>
      apiClient.post(`/workspaces/${params.workspaceId}/policies/${params.policyId}/archive`, {}),
    onSuccess: () => router.push(`/workspaces/${params.workspaceId}/policies`),
  });

  if (isLoading || !policy) {
    return <div className="py-16 text-center text-muted-foreground text-sm">Loading…</div>;
  }

  const isArchived = policy.status === 'archived';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => router.push(`/workspaces/${params.workspaceId}/policies`)}
        >
          <ArrowLeft className="h-4 w-4" />
          Policy Library
        </button>

        <div className="flex items-center gap-2">
          <Badge variant={STATUS_VARIANT[policy.status] ?? 'outline'} className="capitalize">
            {policy.status}
          </Badge>
          <span className="text-xs text-muted-foreground">v{policy.version}</span>

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm">
                <History className="mr-1 h-4 w-4" />
                History
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Version history</SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-3">
                {versions.map((v) => (
                  <div key={v.id} className="rounded-md border p-3 text-sm space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">v{v.version}</span>
                      <Badge variant={STATUS_VARIANT[v.status] ?? 'outline'} className="capitalize text-xs">
                        {v.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {new Date(v.createdAt).toLocaleString()}
                    </div>
                  </div>
                ))}
                {versions.length === 0 && (
                  <p className="text-sm text-muted-foreground">No versions yet.</p>
                )}
              </div>
            </SheetContent>
          </Sheet>

          {!isArchived && (
            <>
              <Button
                variant="outline"
                size="sm"
                disabled={saveMutation.isPending || !isDirty}
                onClick={() => saveMutation.mutate()}
              >
                {saveMutation.isPending ? 'Saving…' : 'Save draft'}
              </Button>

              {policy.status !== 'published' && (
                <Button
                  size="sm"
                  disabled={publishMutation.isPending}
                  onClick={() => publishMutation.mutate()}
                >
                  <Send className="mr-1 h-4 w-4" />
                  {publishMutation.isPending ? 'Publishing…' : 'Publish'}
                </Button>
              )}

              <Button
                size="sm"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                disabled={archiveMutation.isPending}
                onClick={() => archiveMutation.mutate()}
              >
                <Archive className="mr-1 h-4 w-4" />
                Archive
              </Button>
            </>
          )}
        </div>
      </div>

      <Input
        className="text-2xl font-bold border-0 px-0 focus-visible:ring-0 focus-visible:ring-offset-0"
        value={title}
        onChange={(e) => { setTitle(e.target.value); setDirty(true); }}
        placeholder="Policy title"
        disabled={isArchived}
      />

      <PolicyEditor
        value={content}
        onChange={(v) => { setContent(v); setDirty(true); }}
        disabled={isArchived}
      />
    </div>
  );
}
