import { Inject, Injectable, Logger } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { integrationConfigs } from '@compliance/db';
import type { DbClient } from '@compliance/db';
import { INTEGRATION_TYPE } from '@compliance/shared';

import { DB_CLIENT } from '../../database/database.module.js';
import { SecretsService } from '../../secrets/secrets.service.js';

interface SlackCredentials {
  webhookUrl: string;
}

@Injectable()
export class SlackService {
  private readonly logger = new Logger(SlackService.name);

  constructor(
    @Inject(DB_CLIENT) private readonly db: DbClient,
    private readonly secretsService: SecretsService,
  ) {}

  async notifyRegression(
    workspaceId: string,
    orgId: string,
    controlTitle: string,
    severity: string,
    fromStatus: string,
    toStatus: string,
    remediationGuidance: string,
  ): Promise<void> {
    const webhookUrl = await this.getWebhookUrl(orgId, workspaceId);
    if (!webhookUrl) return;

    const severityEmoji: Record<string, string> = {
      critical: '🔴',
      high: '🟠',
      medium: '🟡',
      low: '🔵',
    };
    const emoji = severityEmoji[severity] ?? '⚠️';

    const payload = {
      text: `${emoji} *Control regression detected*`,
      blocks: [
        {
          type: 'header',
          text: { type: 'plain_text', text: `${emoji} Control Regression Detected` },
        },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*Control:*\n${controlTitle}` },
            { type: 'mrkdwn', text: `*Severity:*\n${severity.toUpperCase()}` },
            { type: 'mrkdwn', text: `*Previous status:*\n${fromStatus}` },
            { type: 'mrkdwn', text: `*New status:*\n${toStatus}` },
          ],
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Remediation:*\n${remediationGuidance.slice(0, 300)}`,
          },
        },
      ],
    };

    await this.sendWebhook(webhookUrl, payload);
  }

  async notifyConnectorFailure(
    workspaceId: string,
    orgId: string,
    connectorName: string,
    errorMessage: string,
  ): Promise<void> {
    const webhookUrl = await this.getWebhookUrl(orgId, workspaceId);
    if (!webhookUrl) return;

    const payload = {
      text: `🔌 *Connector sync failed: ${connectorName}*`,
      blocks: [
        {
          type: 'header',
          text: { type: 'plain_text', text: `🔌 Connector Sync Failed` },
        },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*Connector:*\n${connectorName}` },
            { type: 'mrkdwn', text: `*Error:*\n${errorMessage.slice(0, 300)}` },
          ],
        },
      ],
    };

    await this.sendWebhook(webhookUrl, payload);
  }

  private async getWebhookUrl(orgId: string, workspaceId: string): Promise<string | null> {
    // Try workspace-scoped config first, then org-level
    const configs = await this.db
      .select()
      .from(integrationConfigs)
      .where(
        and(
          eq(integrationConfigs.orgId, orgId),
          eq(integrationConfigs.type, INTEGRATION_TYPE.SLACK),
          eq(integrationConfigs.isActive, true),
        ),
      )
      .limit(2);

    const config =
      configs.find((c) => c.workspaceId === workspaceId) ?? configs.find((c) => !c.workspaceId);

    if (!config) return null;

    try {
      const creds = await this.secretsService.getConnectorCredentials(config.credentialsRef) as unknown as SlackCredentials;
      return creds.webhookUrl ?? null;
    } catch (err) {
      this.logger.warn(`Failed to fetch Slack credentials for config ${config.id}: ${String(err)}`);
      return null;
    }
  }

  private async sendWebhook(url: string, payload: unknown): Promise<void> {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        this.logger.warn(`Slack webhook returned ${res.status}: ${await res.text()}`);
      }
    } catch (err) {
      this.logger.warn(`Failed to send Slack webhook: ${String(err)}`);
    }
  }
}
