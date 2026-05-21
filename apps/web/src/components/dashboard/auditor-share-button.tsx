'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Share2, Copy, Check, Trash2, Clock } from 'lucide-react';

import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface AuditorShare {
  id: string;
  label: string;
  expiresAt: string;
  revokedAt: string | null;
  createdAt: string;
}

interface AuditorShareCreated {
  id: string;
  token: string;
  shareUrl: string;
  expiresAt: string;
  label: string;
}

const EXPIRY_OPTIONS = [
  { label: '7 days', value: 7 },
  { label: '30 days', value: 30 },
  { label: '90 days', value: 90 },
];

export function AuditorShareButton({
  workspaceId,
  token,
}: {
  workspaceId: string;
  token: string;
}) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState('Auditor access');
  const [expiresInDays, setExpiresInDays] = useState(30);
  const [createdShare, setCreatedShare] = useState<AuditorShareCreated | null>(null);
  const [copied, setCopied] = useState(false);
  const queryClient = useQueryClient();

  const { data: shares = [] } = useQuery({
    queryKey: ['auditor-shares', workspaceId],
    queryFn: () => apiClient.get<AuditorShare[]>(`/workspaces/${workspaceId}/auditor-shares`, token),
    enabled: open,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      apiClient.post<AuditorShareCreated>(
        `/workspaces/${workspaceId}/auditor-shares`,
        { label, expiresInDays },
        token,
      ),
    onSuccess: (data) => {
      setCreatedShare(data);
      void queryClient.invalidateQueries({ queryKey: ['auditor-shares', workspaceId] });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: (shareId: string) =>
      apiClient.delete(`/workspaces/${workspaceId}/auditor-shares/${shareId}`, token),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['auditor-shares', workspaceId] }),
  });

  function copyToClipboard(url: string) {
    void navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleClose() {
    setOpen(false);
    setCreatedShare(null);
    setLabel('Auditor access');
    setExpiresInDays(30);
  }

  const activeShares = shares.filter((s) => !s.revokedAt && new Date(s.expiresAt) > new Date());

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Share2 className="h-4 w-4 mr-2" />
        Share with auditor
      </Button>

      <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Share with auditor</DialogTitle>
          </DialogHeader>

          {createdShare ? (
            <div className="space-y-4">
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-md">
                <p className="text-sm font-medium text-green-800 dark:text-green-300 mb-1">
                  Share link created. Copy it now — it will not be shown again.
                </p>
                <p className="text-xs text-green-700 dark:text-green-400">
                  Expires: {new Date(createdShare.expiresAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Input value={createdShare.shareUrl} readOnly className="text-xs font-mono" />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(createdShare.shareUrl)}
                >
                  {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <Button variant="outline" className="w-full" onClick={handleClose}>
                Done
              </Button>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Label (shown to you, not auditor)</Label>
                  <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. KPMG SOC 2 audit 2026" />
                </div>
                <div className="space-y-2">
                  <Label>Expiry</Label>
                  <div className="flex gap-2">
                    {EXPIRY_OPTIONS.map((opt) => (
                      <Button
                        key={opt.value}
                        type="button"
                        variant={expiresInDays === opt.value ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setExpiresInDays(opt.value)}
                      >
                        {opt.label}
                      </Button>
                    ))}
                  </div>
                </div>
                <Button
                  className="w-full"
                  onClick={() => createMutation.mutate()}
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? 'Creating…' : 'Generate share link'}
                </Button>
              </div>

              {activeShares.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Active share links</p>
                  {activeShares.map((share) => (
                    <div key={share.id} className="flex items-center justify-between p-2 border border-border rounded-md">
                      <div>
                        <p className="text-sm font-medium">{share.label}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Expires {new Date(share.expiresAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => revokeMutation.mutate(share.id)}
                        disabled={revokeMutation.isPending}
                        title="Revoke"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
