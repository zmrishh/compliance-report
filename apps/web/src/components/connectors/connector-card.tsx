'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { CheckCircle2, XCircle, Loader2, RefreshCw, Trash2, Plus, ExternalLink } from 'lucide-react';

import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

interface ConnectorConfig {
  id: string;
  type: string;
  displayName: string;
  isActive: boolean;
  lastSyncAt: string | null;
  lastSyncStatus: string | null;
}

interface ConnectorCardProps {
  connectorType: string;
  label: string;
  description: string;
  existing?: ConnectorConfig;
  token: string;
  onDelete?: () => void;
  onSync?: () => void;
  isSyncing?: boolean;
  isDeleting?: boolean;
  onConnected: () => void;
}

export function ConnectorCard({
  connectorType,
  label,
  description,
  existing,
  token,
  onDelete,
  onSync,
  isSyncing,
  isDeleting,
  onConnected,
}: ConnectorCardProps) {
  const [connectOpen, setConnectOpen] = useState(false);

  return (
    <Card className={cn('transition-all', existing ? 'border-primary/30' : '')}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-lg font-bold">
              {label.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">{label}</span>
                {existing ? (
                  <Badge variant="outline" className="text-xs text-green-600 border-green-300">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Connected
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs text-muted-foreground">
                    Not connected
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {existing ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onSync}
                  disabled={isSyncing}
                >
                  <RefreshCw className={cn('h-4 w-4 mr-1', isSyncing && 'animate-spin')} />
                  {isSyncing ? 'Syncing…' : 'Sync now'}
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" disabled={isDeleting}>
                      {isDeleting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Disconnect {label}?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will remove the connector and delete its credentials from Secrets Manager.
                        Previously collected evidence and facts are preserved.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={onDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        Disconnect
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            ) : (
              <Button size="sm" onClick={() => setConnectOpen(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Connect
              </Button>
            )}
          </div>
        </div>

        {existing?.lastSyncAt && (
          <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
            <SyncStatusBadge status={existing.lastSyncStatus} isSyncing={isSyncing ?? false} />
            <span>
              Last sync: {new Date(existing.lastSyncAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
            </span>
          </div>
        )}
      </CardHeader>

      <ConnectModal
        connectorType={connectorType}
        label={label}
        open={connectOpen}
        onClose={() => setConnectOpen(false)}
        token={token}
        onConnected={onConnected}
      />
    </Card>
  );
}

function SyncStatusBadge({ status, isSyncing }: { status: string | null; isSyncing: boolean }) {
  if (isSyncing || status === 'running') {
    return (
      <span className="flex items-center gap-1 text-blue-600">
        <Loader2 className="h-3 w-3 animate-spin" />
        Syncing
      </span>
    );
  }
  if (status === 'completed') {
    return (
      <span className="flex items-center gap-1 text-green-600">
        <CheckCircle2 className="h-3 w-3" />
        Sync successful
      </span>
    );
  }
  if (status === 'failed') {
    return (
      <span className="flex items-center gap-1 text-red-600">
        <XCircle className="h-3 w-3" />
        Sync failed
      </span>
    );
  }
  return null;
}

// ─── Connect modals per connector type ────────────────────────────────────────

function ConnectModal({
  connectorType,
  label,
  open,
  onClose,
  token,
  onConnected,
}: {
  connectorType: string;
  label: string;
  open: boolean;
  onClose: () => void;
  token: string;
  onConnected: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Connect {label}</DialogTitle>
        </DialogHeader>
        {connectorType === 'aws' ? (
          <AwsConnectForm token={token} onConnected={() => { onConnected(); onClose(); }} />
        ) : connectorType === 'github' ? (
          <GitHubConnectForm token={token} onConnected={() => { onConnected(); onClose(); }} />
        ) : (
          <p className="text-sm text-muted-foreground">Connector type not supported yet.</p>
        )}
      </DialogContent>
    </Dialog>
  );
}

function AwsConnectForm({
  token,
  onConnected,
}: {
  token: string;
  onConnected: () => void;
}) {
  const [authType, setAuthType] = useState<'role' | 'keys'>('role');
  const [displayName, setDisplayName] = useState('AWS');
  const [region, setRegion] = useState('us-east-1');
  const [roleArn, setRoleArn] = useState('');
  const [externalId, setExternalId] = useState('');
  const [accessKeyId, setAccessKeyId] = useState('');
  const [secretAccessKey, setSecretAccessKey] = useState('');

  const mutation = useMutation({
    mutationFn: () => {
      const credentials =
        authType === 'role'
          ? { type: 'role', roleArn, ...(externalId && { externalId }) }
          : { type: 'keys', accessKeyId, secretAccessKey };

      return apiClient.post(
        '/connector-configs',
        {
          connectorType: 'aws',
          displayName,
          credentials,
          config: { region },
        },
        token,
      );
    },
    onSuccess: onConnected,
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    mutation.mutate();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Display name</Label>
        <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label>AWS region</Label>
        <Input value={region} onChange={(e) => setRegion(e.target.value)} placeholder="us-east-1" required />
      </div>

      <div className="space-y-2">
        <Label>Authentication method</Label>
        <div className="flex gap-2">
          <Button type="button" variant={authType === 'role' ? 'default' : 'outline'} size="sm" onClick={() => setAuthType('role')}>
            IAM Role (recommended)
          </Button>
          <Button type="button" variant={authType === 'keys' ? 'default' : 'outline'} size="sm" onClick={() => setAuthType('keys')}>
            Access keys
          </Button>
        </div>
      </div>

      {authType === 'role' ? (
        <>
          <div className="space-y-2">
            <Label>Role ARN</Label>
            <Input
              value={roleArn}
              onChange={(e) => setRoleArn(e.target.value)}
              placeholder="arn:aws:iam::123456789012:role/ComplianceReadOnly"
              required
            />
            <p className="text-xs text-muted-foreground">
              Create a cross-account IAM role with ReadOnlyAccess and SecurityAudit policies.
            </p>
          </div>
          <div className="space-y-2">
            <Label>External ID (optional)</Label>
            <Input value={externalId} onChange={(e) => setExternalId(e.target.value)} placeholder="Optional" />
          </div>
        </>
      ) : (
        <>
          <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-md text-xs text-yellow-800 dark:text-yellow-300">
            We strongly recommend using an IAM role instead of long-lived access keys.
          </div>
          <div className="space-y-2">
            <Label>Access Key ID</Label>
            <Input value={accessKeyId} onChange={(e) => setAccessKeyId(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>Secret Access Key</Label>
            <Input type="password" value={secretAccessKey} onChange={(e) => setSecretAccessKey(e.target.value)} required />
          </div>
        </>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Connecting…' : 'Connect AWS'}
        </Button>
      </div>
      {mutation.isError && (
        <p className="text-sm text-destructive">
          {mutation.error instanceof Error ? mutation.error.message : 'Connection failed'}
        </p>
      )}
    </form>
  );
}

function GitHubConnectForm({
  token,
  onConnected,
}: {
  token: string;
  onConnected: () => void;
}) {
  const [authType, setAuthType] = useState<'github_app' | 'pat'>('pat');
  const [displayName, setDisplayName] = useState('GitHub');
  const [orgLogin, setOrgLogin] = useState('');
  const [patToken, setPatToken] = useState('');
  const [appId, setAppId] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [installationId, setInstallationId] = useState('');

  const mutation = useMutation({
    mutationFn: () => {
      const credentials =
        authType === 'pat'
          ? { type: 'pat', token: patToken }
          : {
              type: 'github_app',
              appId: Number(appId),
              privateKey,
              installationId: Number(installationId),
            };

      return apiClient.post(
        '/connector-configs',
        { connectorType: 'github', displayName, credentials, config: { orgLogin } },
        token,
      );
    },
    onSuccess: onConnected,
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    mutation.mutate();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Display name</Label>
        <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label>Organization login</Label>
        <Input value={orgLogin} onChange={(e) => setOrgLogin(e.target.value)} placeholder="my-org" required />
      </div>

      <div className="space-y-2">
        <Label>Authentication method</Label>
        <div className="flex gap-2">
          <Button type="button" variant={authType === 'github_app' ? 'default' : 'outline'} size="sm" onClick={() => setAuthType('github_app')}>
            GitHub App (recommended)
          </Button>
          <Button type="button" variant={authType === 'pat' ? 'default' : 'outline'} size="sm" onClick={() => setAuthType('pat')}>
            Personal access token
          </Button>
        </div>
      </div>

      {authType === 'pat' ? (
        <div className="space-y-2">
          <Label>Personal access token</Label>
          <Input
            type="password"
            value={patToken}
            onChange={(e) => setPatToken(e.target.value)}
            placeholder="ghp_..."
            required
          />
          <p className="text-xs text-muted-foreground">
            Requires: <code>read:org</code>, <code>repo</code>, <code>read:audit_log</code> scopes.
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            <Label>App ID</Label>
            <Input value={appId} onChange={(e) => setAppId(e.target.value)} type="number" required />
          </div>
          <div className="space-y-2">
            <Label>Installation ID</Label>
            <Input value={installationId} onChange={(e) => setInstallationId(e.target.value)} type="number" required />
          </div>
          <div className="space-y-2">
            <Label>Private key (PEM)</Label>
            <textarea
              className="w-full border border-input rounded-md p-2 text-xs font-mono h-28 bg-background resize-none"
              value={privateKey}
              onChange={(e) => setPrivateKey(e.target.value)}
              placeholder="-----BEGIN RSA PRIVATE KEY-----..."
              required
            />
          </div>
        </>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Connecting…' : 'Connect GitHub'}
        </Button>
      </div>
      {mutation.isError && (
        <p className="text-sm text-destructive">
          {mutation.error instanceof Error ? mutation.error.message : 'Connection failed'}
        </p>
      )}
    </form>
  );
}
