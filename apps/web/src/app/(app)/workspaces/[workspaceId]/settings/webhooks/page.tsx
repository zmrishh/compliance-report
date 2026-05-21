'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Webhook, Plus, Trash2, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { apiClient } from '@/lib/api-client';

const WEBHOOK_EVENTS = [
  { value: 'control.regression', label: 'Control regression' },
  { value: 'readiness.score_changed', label: 'Readiness score changed' },
  { value: 'connector.failed', label: 'Connector sync failed' },
  { value: 'access_review.completed', label: 'Access review completed' },
];

interface WebhookConfig {
  id: string;
  url: string;
  events: string[];
  isActive: boolean;
  createdAt: string;
}

interface CreateResult extends WebhookConfig {
  signingSecret: string;
}

export default function WebhooksSettingsPage() {
  const queryClient = useQueryClient();
  const [isNewOpen, setNewOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [newSecret, setNewSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const { data: webhooks = [], isLoading } = useQuery<WebhookConfig[]>({
    queryKey: ['webhooks'],
    queryFn: () => apiClient.get<WebhookConfig[]>('/webhooks'),
  });

  const createMutation = useMutation({
    mutationFn: (body: { url: string; events: string[] }) =>
      apiClient.post<CreateResult>('/webhooks', body),
    onSuccess: (data: CreateResult) => {
      setNewSecret(data.signingSecret);
      setUrl('');
      setSelectedEvents([]);
      void queryClient.invalidateQueries({ queryKey: ['webhooks'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/webhooks/${id}`),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['webhooks'] }),
  });

  const toggleEvent = (event: string) => {
    setSelectedEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event],
    );
  };

  const copySecret = async () => {
    if (!newSecret) return;
    await navigator.clipboard.writeText(newSecret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Webhook className="h-5 w-5" />
          <h2 className="text-lg font-semibold">Outbound Webhooks</h2>
        </div>
        <Button size="sm" onClick={() => setNewOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add webhook
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        Subscribe external systems to compliance events. Payloads are signed with HMAC-SHA256.
        Verify the <code className="text-xs font-mono bg-muted px-1 rounded">X-Compliance-Signature</code> header on your endpoint.
      </p>

      {isLoading && <div className="py-8 text-center text-sm text-muted-foreground">Loading…</div>}

      {!isLoading && webhooks.length === 0 && (
        <div className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">
          No webhooks configured.
        </div>
      )}

      <div className="space-y-3">
        {webhooks.map((wh) => (
          <div key={wh.id} className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-1">
              <p className="font-mono text-sm">{wh.url}</p>
              <div className="flex flex-wrap gap-1">
                {(Array.isArray(wh.events) ? wh.events : []).map((e: string) => (
                  <Badge key={e} variant="outline" className="text-xs">{e}</Badge>
                ))}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive hover:text-destructive"
              onClick={() => deleteMutation.mutate(wh.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      {/* Create dialog */}
      <Dialog open={isNewOpen} onOpenChange={(open) => { setNewOpen(open); if (!open) setNewSecret(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {newSecret ? 'Webhook created — save your signing secret' : 'Add webhook'}
            </DialogTitle>
          </DialogHeader>

          {newSecret ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Copy this signing secret now. It will <strong>not be shown again</strong>. Use it to verify
                webhook payloads with HMAC-SHA256.
              </p>
              <div className="flex items-center gap-2 rounded-md border bg-muted p-3">
                <code className="flex-1 text-xs font-mono break-all">{newSecret}</code>
                <Button variant="ghost" size="icon" onClick={copySecret}>
                  {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label>Endpoint URL</Label>
                <Input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com/webhook"
                  type="url"
                />
              </div>
              <div className="grid gap-3">
                <Label>Events to subscribe</Label>
                {WEBHOOK_EVENTS.map((ev) => (
                  <div key={ev.value} className="flex items-center gap-2">
                    <Checkbox
                      id={ev.value}
                      checked={selectedEvents.includes(ev.value)}
                      onCheckedChange={() => toggleEvent(ev.value)}
                    />
                    <label htmlFor={ev.value} className="text-sm cursor-pointer">
                      {ev.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          <DialogFooter>
            {newSecret ? (
              <Button onClick={() => { setNewOpen(false); setNewSecret(null); }}>Done</Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => setNewOpen(false)}>Cancel</Button>
                <Button
                  disabled={!url || selectedEvents.length === 0 || createMutation.isPending}
                  onClick={() => createMutation.mutate({ url, events: selectedEvents })}
                >
                  {createMutation.isPending ? 'Creating…' : 'Create webhook'}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
