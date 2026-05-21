'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, ChevronRight, Layers } from 'lucide-react';
import Link from 'next/link';

import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface Workspace {
  id: string;
  name: string;
  description: string | null;
  framework: string;
  readinessScore: number | null;
  userRole: string;
  createdAt: string;
}

export function WorkspaceList({ token }: { token: string }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const { data: workspaces, isLoading } = useQuery({
    queryKey: ['workspaces'],
    queryFn: () => apiClient.get<Workspace[]>('/workspaces', token),
  });

  const createMutation = useMutation({
    mutationFn: (values: { name: string; description?: string }) =>
      apiClient.post<Workspace>('/workspaces', { ...values, framework: 'soc2:security' }, token),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      setOpen(false);
      setName('');
      setDescription('');
    },
  });

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    createMutation.mutate({ name: name.trim(), description: description.trim() || undefined });
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New workspace
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create workspace</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label htmlFor="ws-name">Name</Label>
                <Input
                  id="ws-name"
                  placeholder="e.g. Production API"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ws-desc">Description (optional)</Label>
                <Textarea
                  id="ws-desc"
                  placeholder="What system or product boundary does this workspace cover?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Creating…' : 'Create workspace'}
                </Button>
              </div>
              {createMutation.isError && (
                <p className="text-sm text-destructive">
                  {createMutation.error instanceof Error
                    ? createMutation.error.message
                    : 'Failed to create workspace'}
                </p>
              )}
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {!workspaces?.length ? (
        <div className="text-center py-16 border-2 border-dashed border-border rounded-lg">
          <Layers className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-medium text-lg mb-1">No workspaces yet</h3>
          <p className="text-muted-foreground text-sm mb-4">
            Create a workspace to start your SOC 2 readiness journey.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {workspaces.map((ws) => (
            <Link
              key={ws.id}
              href={`/workspaces/${ws.id}/readiness`}
              className="flex items-center justify-between p-5 bg-card border border-border rounded-lg hover:border-primary/50 hover:shadow-sm transition-all group"
            >
              <div className="flex items-start gap-4">
                <div className="mt-0.5">
                  <Shield className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{ws.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {ws.framework === 'soc2:security' ? 'SOC 2 Security' : ws.framework}
                    </Badge>
                    <Badge variant="secondary" className="text-xs capitalize">
                      {ws.userRole}
                    </Badge>
                  </div>
                  {ws.description && (
                    <p className="text-sm text-muted-foreground mt-0.5">{ws.description}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4">
                {ws.readinessScore !== null && (
                  <div className="text-right">
                    <div
                      className={`text-2xl font-bold ${
                        ws.readinessScore >= 75
                          ? 'text-green-600 dark:text-green-400'
                          : ws.readinessScore >= 40
                          ? 'text-yellow-600 dark:text-yellow-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {Math.round(ws.readinessScore)}%
                    </div>
                    <div className="text-xs text-muted-foreground">readiness</div>
                  </div>
                )}
                <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function Shield({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}
