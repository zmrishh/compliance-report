import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { controlStates, controls, integrationConfigs, workspaces } from '@compliance/db';
import type { DbClient } from '@compliance/db';
import { CATALOG_BY_ID, INTEGRATION_TYPE } from '@compliance/shared';

import { DB_CLIENT } from '../../database/database.module.js';
import { SecretsService } from '../../secrets/secrets.service.js';

interface JiraCredentials {
  email: string;
  apiToken: string;
}

interface JiraConfig {
  baseUrl: string;
  projectKey: string;
  email?: string;
}

export interface JiraTicketResult {
  ticketId: string;
  ticketKey: string;
  ticketUrl: string;
}

@Injectable()
export class JiraService {
  private readonly logger = new Logger(JiraService.name);

  constructor(
    @Inject(DB_CLIENT) private readonly db: DbClient,
    private readonly secretsService: SecretsService,
  ) {}

  async createTicket(
    orgId: string,
    workspaceId: string,
    controlStateId: string,
    overrideSummary?: string,
    overrideDescription?: string,
  ): Promise<JiraTicketResult> {
    const integration = await this.getIntegrationConfig(orgId, workspaceId);

    // Fetch control state with control details
    const [row] = await this.db
      .select({
        status: controlStates.status,
        detail: controlStates.detail,
        existingTicketId: controlStates.jiraTicketId,
        controlTitle: controls.title,
        controlDescription: controls.description,
        controlId: controls.id,
        controlSeverity: controls.severity,
        remediationGuidance: controls.remediationGuidance,
        workspaceName: workspaces.name,
      })
      .from(controlStates)
      .innerJoin(controls, eq(controlStates.controlId, controls.id))
      .innerJoin(workspaces, eq(controlStates.workspaceId, workspaces.id))
      .where(
        and(
          eq(controlStates.id, controlStateId),
          eq(controlStates.workspaceId, workspaceId),
        ),
      )
      .limit(1);

    if (!row) throw new NotFoundException('Control state not found');

    if (row.existingTicketId) {
      throw new BadRequestException(
        `A Jira ticket already exists for this control: ${row.existingTicketId}`,
      );
    }

    const catalogEntry = CATALOG_BY_ID[row.controlId];
    const summary =
      overrideSummary ??
      `[SOC 2] ${row.controlTitle} — ${row.controlSeverity.toUpperCase()} severity (${row.workspaceName})`;

    const description = overrideDescription ?? this.buildDescription(row, catalogEntry);

    const config = integration.config as JiraConfig;
    const creds = await this.secretsService.getConnectorCredentials(
      integration.credentialsRef,
    ) as unknown as JiraCredentials;

    const authHeader = `Basic ${Buffer.from(`${creds.email}:${creds.apiToken}`).toString('base64')}`;

    const response = await fetch(`${config.baseUrl}/rest/api/3/issue`, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        fields: {
          project: { key: config.projectKey },
          summary,
          description: {
            type: 'doc',
            version: 1,
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: description }],
              },
            ],
          },
          issuetype: { name: 'Task' },
          priority: { name: this.mapSeverityToPriority(row.controlSeverity) },
          labels: ['compliance', 'soc2', row.controlId],
        },
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      this.logger.error(`Jira API error ${response.status}: ${body}`);
      throw new ServiceUnavailableException(
        `Failed to create Jira ticket: ${response.status} ${body.slice(0, 200)}`,
      );
    }

    const data = (await response.json()) as { id: string; key: string; self: string };
    const ticketUrl = `${config.baseUrl}/browse/${data.key}`;

    // Persist ticket reference on control state
    await this.db
      .update(controlStates)
      .set({ jiraTicketId: data.id, jiraTicketUrl: ticketUrl, updatedAt: new Date() })
      .where(eq(controlStates.id, controlStateId));

    return { ticketId: data.id, ticketKey: data.key, ticketUrl };
  }

  private async getIntegrationConfig(orgId: string, workspaceId: string) {
    const configs = await this.db
      .select()
      .from(integrationConfigs)
      .where(
        and(
          eq(integrationConfigs.orgId, orgId),
          eq(integrationConfigs.type, INTEGRATION_TYPE.JIRA),
          eq(integrationConfigs.isActive, true),
        ),
      )
      .limit(2);

    const config =
      configs.find((c) => c.workspaceId === workspaceId) ?? configs.find((c) => !c.workspaceId);

    if (!config) {
      throw new ServiceUnavailableException(
        'Jira integration is not configured. Add a Jira integration in workspace settings.',
      );
    }

    return config;
  }

  private buildDescription(
    row: {
      controlTitle: string;
      controlDescription: string;
      detail: string | null;
      remediationGuidance: string;
      controlId: string;
      workspaceName: string;
    },
    catalogEntry: (typeof CATALOG_BY_ID)[string] | undefined,
  ): string {
    const lines = [
      `Control: ${row.controlTitle}`,
      `Workspace: ${row.workspaceName}`,
      `Control ID: ${catalogEntry?.controlId ?? row.controlId}`,
      '',
      'Description:',
      row.controlDescription,
      '',
    ];

    if (row.detail) {
      lines.push('Finding:', row.detail, '');
    }

    lines.push('Remediation Guidance:', row.remediationGuidance);

    return lines.join('\n');
  }

  private mapSeverityToPriority(severity: string): string {
    const map: Record<string, string> = {
      critical: 'Highest',
      high: 'High',
      medium: 'Medium',
      low: 'Low',
    };
    return map[severity] ?? 'Medium';
  }
}
