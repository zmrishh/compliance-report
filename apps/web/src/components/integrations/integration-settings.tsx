'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Trash2 } from 'lucide-react';

import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface IntegrationConfig {
  id: string;
  type: string;
  config: Record<string, string>;
  isActive: boolean;
}

export function IntegrationSettings({
  workspaceId,
  token,
}: {
  workspaceId: string;
  token: string;
}) {
  const queryClient = useQueryClient();

  const { data: integrations = [] } = useQuery({
    queryKey: ['integrations', workspaceId],
    queryFn: () => apiClient.get<IntegrationConfig[]>(`/workspaces/${workspaceId}/integrations`, token),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/workspaces/${workspaceId}/integrations/${id}`, token),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['integrations', workspaceId] }),
  });

  const jiraConfig = integrations.find((i) => i.type === 'jira');
  const slackConfig = integrations.find((i) => i.type === 'slack');

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-lg font-semibold">Integrations</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Connect Jira and Slack to streamline remediation workflows.
        </p>
      </div>

      <JiraIntegrationCard
        workspaceId={workspaceId}
        token={token}
        existing={jiraConfig}
        onDelete={jiraConfig ? () => deleteMutation.mutate(jiraConfig.id) : undefined}
        onConnected={() => void queryClient.invalidateQueries({ queryKey: ['integrations', workspaceId] })}
        isDeleting={deleteMutation.isPending && deleteMutation.variables === jiraConfig?.id}
      />

      <SlackIntegrationCard
        workspaceId={workspaceId}
        token={token}
        existing={slackConfig}
        onDelete={slackConfig ? () => deleteMutation.mutate(slackConfig.id) : undefined}
        onConnected={() => void queryClient.invalidateQueries({ queryKey: ['integrations', workspaceId] })}
        isDeleting={deleteMutation.isPending && deleteMutation.variables === slackConfig?.id}
      />
    </div>
  );
}

function JiraIntegrationCard({
  workspaceId,
  token,
  existing,
  onDelete,
  onConnected,
  isDeleting,
}: {
  workspaceId: string;
  token: string;
  existing?: IntegrationConfig;
  onDelete?: () => void;
  onConnected: () => void;
  isDeleting?: boolean;
}) {
  const [showForm, setShowForm] = useState(false);
  const [baseUrl, setBaseUrl] = useState('');
  const [projectKey, setProjectKey] = useState('');
  const [email, setEmail] = useState('');
  const [apiToken, setApiToken] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      apiClient.post(
        `/workspaces/${workspaceId}/integrations`,
        { type: 'jira', config: { baseUrl, projectKey, email }, apiToken },
        token,
      ),
    onSuccess: () => {
      setShowForm(false);
      onConnected();
    },
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center text-white text-xs font-bold">J</div>
            <div>
              <p className="font-medium">Jira</p>
              <p className="text-xs text-muted-foreground">Create tickets from failed controls</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {existing ? (
              <>
                <div className="flex items-center gap-1 text-xs text-green-600">
                  <CheckCircle2 className="h-3 w-3" />
                  Connected to {existing.config['baseUrl']}
                </div>
                <Button variant="outline" size="sm" onClick={onDelete} disabled={isDeleting}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <Button size="sm" variant="outline" onClick={() => setShowForm(!showForm)}>
                {showForm ? 'Cancel' : 'Connect'}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      {showForm && !existing && (
        <CardContent>
          <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }} className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Jira base URL</Label>
              <Input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://your-org.atlassian.net" required />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Default project key</Label>
              <Input value={projectKey} onChange={(e) => setProjectKey(e.target.value)} placeholder="SEC" required />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Atlassian email</Label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">API token</Label>
              <Input type="password" value={apiToken} onChange={(e) => setApiToken(e.target.value)} required />
              <p className="text-xs text-muted-foreground">Generate at id.atlassian.com/manage-profile/security/api-tokens</p>
            </div>
            <Button type="submit" size="sm" disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving…' : 'Save'}
            </Button>
            {mutation.isError && <p className="text-xs text-destructive">{String(mutation.error)}</p>}
          </form>
        </CardContent>
      )}
    </Card>
  );
}

function SlackIntegrationCard({
  workspaceId,
  token,
  existing,
  onDelete,
  onConnected,
  isDeleting,
}: {
  workspaceId: string;
  token: string;
  existing?: IntegrationConfig;
  onDelete?: () => void;
  onConnected: () => void;
  isDeleting?: boolean;
}) {
  const [showForm, setShowForm] = useState(false);
  const [channelName, setChannelName] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      apiClient.post(
        `/workspaces/${workspaceId}/integrations`,
        { type: 'slack', config: { channelName }, webhookUrl },
        token,
      ),
    onSuccess: () => {
      setShowForm(false);
      onConnected();
    },
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-[#4A154B] flex items-center justify-center text-white text-xs font-bold">S</div>
            <div>
              <p className="font-medium">Slack</p>
              <p className="text-xs text-muted-foreground">Alerts on control regressions and connector failures</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {existing ? (
              <>
                <div className="flex items-center gap-1 text-xs text-green-600">
                  <CheckCircle2 className="h-3 w-3" />
                  Connected{existing.config['channelName'] ? ` to #${existing.config['channelName']}` : ''}
                </div>
                <Button variant="outline" size="sm" onClick={onDelete} disabled={isDeleting}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <Button size="sm" variant="outline" onClick={() => setShowForm(!showForm)}>
                {showForm ? 'Cancel' : 'Connect'}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      {showForm && !existing && (
        <CardContent>
          <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }} className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Slack webhook URL</Label>
              <Input value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} placeholder="https://hooks.slack.com/services/..." required />
              <p className="text-xs text-muted-foreground">Create an Incoming Webhook at api.slack.com/apps</p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Channel name (optional)</Label>
              <Input value={channelName} onChange={(e) => setChannelName(e.target.value)} placeholder="#compliance-alerts" />
            </div>
            <Button type="submit" size="sm" disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving…' : 'Save'}
            </Button>
            {mutation.isError && <p className="text-xs text-destructive">{String(mutation.error)}</p>}
          </form>
        </CardContent>
      )}
    </Card>
  );
}
