'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ClipboardList, Plus, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { apiClient } from '@/lib/api-client';

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  open: 'default',
  completed: 'secondary',
  expired: 'destructive',
};

interface Campaign {
  id: string;
  name: string;
  connectorType: string;
  status: string;
  dueDate: string;
  createdAt: string;
}

export default function AccessReviewsPage() {
  const params = useParams<{ workspaceId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [isNewOpen, setNewOpen] = useState(false);
  const [form, setForm] = useState({ name: '', connectorType: 'google_workspace', dueDate: '' });

  const { data: campaigns = [], isLoading } = useQuery<Campaign[]>({
    queryKey: ['access-reviews', params.workspaceId],
    queryFn: () => apiClient.get<Campaign[]>(`/workspaces/${params.workspaceId}/access-reviews`),
  });

  const createMutation = useMutation({
    mutationFn: (body: typeof form) =>
      apiClient.post<Campaign>(`/workspaces/${params.workspaceId}/access-reviews`, {
        ...body,
        dueDate: new Date(body.dueDate).toISOString(),
      }),
    onSuccess: (data: Campaign) => {
      setNewOpen(false);
      void queryClient.invalidateQueries({ queryKey: ['access-reviews', params.workspaceId] });
      router.push(`/workspaces/${params.workspaceId}/access-reviews/${data.id}`);
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5" />
          <h1 className="text-xl font-semibold">Access Reviews</h1>
        </div>
        <Button size="sm" onClick={() => setNewOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New campaign
        </Button>
      </div>

      {isLoading && (
        <div className="py-16 text-center text-sm text-muted-foreground">Loading…</div>
      )}

      {!isLoading && campaigns.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-16">
          <ClipboardList className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No access review campaigns yet.</p>
          <Button size="sm" variant="outline" onClick={() => setNewOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New campaign
          </Button>
        </div>
      )}

      <div className="divide-y rounded-lg border">
        {campaigns.map((c) => (
          <button
            key={c.id}
            className="flex w-full items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors"
            onClick={() => router.push(`/workspaces/${params.workspaceId}/access-reviews/${c.id}`)}
          >
            <div className="flex items-center gap-3">
              <span className="font-medium">{c.name}</span>
              <Badge variant={STATUS_VARIANT[c.status] ?? 'outline'} className="capitalize text-xs">
                {c.status}
              </Badge>
              <span className="text-xs text-muted-foreground capitalize">
                {c.connectorType.replace('_', ' ')}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>Due {format(new Date(c.dueDate), 'MMM d, yyyy')}</span>
              <ChevronRight className="h-4 w-4" />
            </div>
          </button>
        ))}
      </div>

      <Dialog open={isNewOpen} onOpenChange={setNewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New access review campaign</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label>Campaign name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Q2 2026 User Access Review"
              />
            </div>
            <div className="grid gap-2">
              <Label>Identity provider</Label>
              <Select
                value={form.connectorType}
                onValueChange={(v) => setForm((f) => ({ ...f, connectorType: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="google_workspace">Google Workspace</SelectItem>
                  <SelectItem value="okta">Okta</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Due date</Label>
              <Input
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!form.name || !form.dueDate || createMutation.isPending}
              onClick={() => createMutation.mutate(form)}
            >
              {createMutation.isPending ? 'Creating…' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
