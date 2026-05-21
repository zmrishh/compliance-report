'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  BookOpen,
  ChevronRight,
  FilePlus,
  MoreHorizontal,
  Archive,
  Send,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { PolicyEditor } from '@/components/policies/policy-editor';
import { apiClient } from '@/lib/api-client';

const POLICY_TYPE_LABELS: Record<string, string> = {
  policy: 'Policy',
  procedure: 'Procedure',
  runbook: 'Runbook',
};

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'outline'> = {
  draft: 'outline',
  published: 'default',
  archived: 'secondary',
};

interface PolicyRow {
  id: string;
  title: string;
  type: string;
  status: string;
  version: number;
  updatedAt: string;
}

export default function PoliciesPage() {
  const params = useParams<{ workspaceId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [isNewOpen, setNewOpen] = useState(false);
  const [newForm, setNewForm] = useState({ title: '', type: 'policy', content: '' });

  const { data: policies = [], isLoading } = useQuery<PolicyRow[]>({
    queryKey: ['policies', params.workspaceId],
    queryFn: () => apiClient.get<PolicyRow[]>(`/workspaces/${params.workspaceId}/policies`),
  });

  const createMutation = useMutation({
    mutationFn: (body: typeof newForm) =>
      apiClient.post<PolicyRow>(`/workspaces/${params.workspaceId}/policies`, body),
    onSuccess: (data: PolicyRow) => {
      setNewOpen(false);
      void queryClient.invalidateQueries({ queryKey: ['policies', params.workspaceId] });
      router.push(`/workspaces/${params.workspaceId}/policies/${data.id}`);
    },
  });

  const publishMutation = useMutation({
    mutationFn: (policyId: string) =>
      apiClient.post(`/workspaces/${params.workspaceId}/policies/${policyId}/publish`, {}),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['policies', params.workspaceId] }),
  });

  const archiveMutation = useMutation({
    mutationFn: (policyId: string) =>
      apiClient.post(`/workspaces/${params.workspaceId}/policies/${policyId}/archive`, {}),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['policies', params.workspaceId] }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          <h1 className="text-xl font-semibold">Policy Library</h1>
        </div>
        <Button onClick={() => setNewOpen(true)} size="sm">
          <FilePlus className="mr-2 h-4 w-4" />
          New policy
        </Button>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
          Loading…
        </div>
      )}

      {!isLoading && policies.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 gap-3">
          <BookOpen className="h-8 w-8 text-muted-foreground" />
          <p className="text-muted-foreground text-sm">No policies yet. Create your first one.</p>
          <Button size="sm" variant="outline" onClick={() => setNewOpen(true)}>
            <FilePlus className="mr-2 h-4 w-4" />
            New policy
          </Button>
        </div>
      )}

      <div className="divide-y rounded-lg border">
        {policies.map((policy) => (
          <div key={policy.id} className="flex items-center justify-between p-4">
            <button
              className="flex items-center gap-3 text-left hover:text-primary transition-colors"
              onClick={() => router.push(`/workspaces/${params.workspaceId}/policies/${policy.id}`)}
            >
              <span className="font-medium">{policy.title}</span>
              <Badge variant={STATUS_VARIANT[policy.status] ?? 'outline'} className="capitalize text-xs">
                {policy.status}
              </Badge>
              <span className="text-xs text-muted-foreground">
                v{policy.version} · {POLICY_TYPE_LABELS[policy.type] ?? policy.type}
              </span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {policy.status === 'draft' && (
                  <DropdownMenuItem onClick={() => publishMutation.mutate(policy.id)}>
                    <Send className="mr-2 h-4 w-4" />
                    Publish
                  </DropdownMenuItem>
                )}
                {policy.status !== 'archived' && (
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => archiveMutation.mutate(policy.id)}
                  >
                    <Archive className="mr-2 h-4 w-4" />
                    Archive
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ))}
      </div>

      <Dialog open={isNewOpen} onOpenChange={setNewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>New policy</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label>Title</Label>
              <Input
                value={newForm.title}
                onChange={(e) => setNewForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Access Control Policy"
              />
            </div>
            <div className="grid gap-2">
              <Label>Type</Label>
              <Select
                value={newForm.type}
                onValueChange={(v: string) => setNewForm((f) => ({ ...f, type: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="policy">Policy</SelectItem>
                  <SelectItem value="procedure">Procedure</SelectItem>
                  <SelectItem value="runbook">Runbook</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Content (Markdown)</Label>
              <PolicyEditor
                value={newForm.content}
                onChange={(v) => setNewForm((f) => ({ ...f, content: v }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!newForm.title || createMutation.isPending}
              onClick={() => createMutation.mutate(newForm)}
            >
              {createMutation.isPending ? 'Creating…' : 'Create draft'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
