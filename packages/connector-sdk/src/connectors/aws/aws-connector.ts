import {
  ConfigServiceClient,
  DescribeComplianceByResourceCommand,
} from '@aws-sdk/client-config-service';
import {
  GetAccountSummaryCommand,
  GetCredentialReportCommand,
  GenerateCredentialReportCommand,
  IAMClient,
} from '@aws-sdk/client-iam';
import {
  ListAccountsCommand,
  OrganizationsClient,
} from '@aws-sdk/client-organizations';
import {
  GetFindingsCommand,
  SecurityHubClient,
} from '@aws-sdk/client-securityhub';
import { AssumeRoleCommand, STSClient } from '@aws-sdk/client-sts';
import { SOURCE_TYPE } from '@compliance/shared';

interface AwsCredentialIdentity {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
}

import { BaseConnector } from '../../base-connector';
import type { AwsConfig, AwsCredentials } from './types';

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1_000;

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const isThrottle =
        err instanceof Error &&
        (err.name === 'ThrottlingException' ||
          err.name === 'TooManyRequestsException' ||
          err.message.includes('Rate exceeded'));

      if (!isThrottle) throw err;
      lastError = err;
      await new Promise((r) => setTimeout(r, BASE_DELAY_MS * 2 ** attempt));
    }
  }
  throw lastError;
}

export class AwsConnector extends BaseConnector<AwsCredentials, AwsConfig> {
  private awsCredentials: AwsCredentialIdentity | undefined;

  async connect(): Promise<void> {
    if (this.credentials.type === 'role') {
      const sts = new STSClient({
        region: this.config.region,
        ...(this.config.endpoint && { endpoint: this.config.endpoint }),
      });

      const assumed = await sts.send(
        new AssumeRoleCommand({
          RoleArn: this.credentials.roleArn,
          RoleSessionName: `compliance-connector-${Date.now()}`,
          ExternalId: this.credentials.externalId,
          DurationSeconds: 3600,
        }),
      );

      const creds = assumed.Credentials;
      if (!creds?.AccessKeyId || !creds.SecretAccessKey || !creds.SessionToken) {
        throw new Error('AssumeRole returned incomplete credentials');
      }

      this.awsCredentials = {
        accessKeyId: creds.AccessKeyId,
        secretAccessKey: creds.SecretAccessKey,
        sessionToken: creds.SessionToken,
      };
    } else {
      this.awsCredentials = {
        accessKeyId: this.credentials.accessKeyId,
        secretAccessKey: this.credentials.secretAccessKey,
      };
    }
  }

  async healthCheck() {
    try {
      const iam = this.buildIamClient();
      await iam.send(new GetAccountSummaryCommand({}));
      return { healthy: true };
    } catch (err) {
      return { healthy: false, message: err instanceof Error ? err.message : String(err) };
    }
  }

  async *collect() {
    yield* this.collectAccountSummary();
    yield* this.collectCredentialReport();
    yield* this.collectConfigCompliance();
    yield* this.collectSecurityHubFindings();
    yield* this.collectAccountMetadata();
  }

  private async *collectAccountSummary() {
    const iam = this.buildIamClient();
    const response = await withRetry(() => iam.send(new GetAccountSummaryCommand({})));

    yield {
      sourceType: SOURCE_TYPE.AWS,
      entityType: 'aws:iam:account_summary',
      entityId: this.config.accountId ?? 'default',
      data: response.SummaryMap as Record<string, unknown>,
      collectedAt: new Date(),
    };
  }

  private async *collectCredentialReport() {
    const iam = this.buildIamClient();

    // Trigger report generation — may take up to 4 hours for large accounts
    await withRetry(() => iam.send(new GenerateCredentialReportCommand({})));

    // Wait for report readiness (up to 30s)
    let reportContent: string | null = null;
    for (let i = 0; i < 6; i++) {
      try {
        const response = await withRetry(() => iam.send(new GetCredentialReportCommand({})));
        if (response.Content) {
          reportContent = Buffer.from(response.Content).toString('utf-8');
          break;
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'ReportNotPresent') {
          await new Promise((r) => setTimeout(r, 5_000));
          continue;
        }
        throw err;
      }
      await new Promise((r) => setTimeout(r, 5_000));
    }

    if (!reportContent) return;

    const lines = reportContent.trim().split('\n');
    if (lines.length < 2) return;
    const headers = lines[0]!.split(',');

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i]!.split(',');
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => {
        row[h.trim()] = (values[idx] ?? '').trim();
      });

      yield {
        sourceType: SOURCE_TYPE.AWS,
        entityType: 'aws:iam:credential_report',
        entityId: row['arn'] ?? row['user'] ?? `user-${i}`,
        data: row as Record<string, unknown>,
        collectedAt: new Date(),
      };
    }
  }

  private async *collectConfigCompliance() {
    const configClient = this.buildConfigClient();
    let nextToken: string | undefined;

    do {
      const response = await withRetry(() =>
        configClient.send(
          new DescribeComplianceByResourceCommand({
            NextToken: nextToken,
            Limit: 100,
          }),
        ),
      );

      for (const item of response.ComplianceByResources ?? []) {
        yield {
          sourceType: SOURCE_TYPE.AWS,
          entityType: 'aws:config:compliance',
          entityId: `${item.ResourceType ?? 'unknown'}::${item.ResourceId ?? 'unknown'}`,
          data: {
            ResourceType: item.ResourceType,
            ResourceId: item.ResourceId,
            ComplianceType: item.Compliance?.ComplianceType,
            ConfigRuleId: undefined,
            ConfigRuleName: undefined,
          } as Record<string, unknown>,
          collectedAt: new Date(),
        };
      }

      nextToken = response.NextToken;
    } while (nextToken);
  }

  private async *collectSecurityHubFindings() {
    const hub = this.buildSecurityHubClient();
    let nextToken: string | undefined;

    do {
      const response = await withRetry(() =>
        hub.send(
          new GetFindingsCommand({
            Filters: {
              RecordState: [{ Value: 'ACTIVE', Comparison: 'EQUALS' }],
            },
            MaxResults: 100,
            NextToken: nextToken,
          }),
        ),
      );

      for (const finding of response.Findings ?? []) {
        yield {
          sourceType: SOURCE_TYPE.AWS,
          entityType: 'aws:securityhub:findings',
          entityId: finding.Id ?? finding.GeneratorId ?? crypto.randomUUID(),
          data: finding as unknown as Record<string, unknown>,
          collectedAt: new Date(),
        };
      }

      nextToken = response.NextToken;
    } while (nextToken);
  }

  private async *collectAccountMetadata() {
    try {
      const org = new OrganizationsClient({
        region: this.config.region,
        credentials: this.awsCredentials,
        ...(this.config.endpoint && { endpoint: this.config.endpoint }),
      });

      let nextToken: string | undefined;
      do {
        const response = await withRetry(() =>
          org.send(new ListAccountsCommand({ NextToken: nextToken })),
        );

        for (const account of response.Accounts ?? []) {
          yield {
            sourceType: SOURCE_TYPE.AWS,
            entityType: 'aws:account:metadata',
            entityId: account.Id ?? 'unknown',
            data: account as unknown as Record<string, unknown>,
            collectedAt: new Date(),
          };
        }
        nextToken = response.NextToken;
      } while (nextToken);
    } catch {
      // ListAccounts requires Organizations access — skip silently if not available
    }
  }

  private buildIamClient(): IAMClient {
    return new IAMClient({
      region: this.config.region,
      credentials: this.awsCredentials,
      ...(this.config.endpoint && { endpoint: this.config.endpoint }),
    });
  }

  private buildConfigClient(): ConfigServiceClient {
    return new ConfigServiceClient({
      region: this.config.region,
      credentials: this.awsCredentials,
      ...(this.config.endpoint && { endpoint: this.config.endpoint }),
    });
  }

  private buildSecurityHubClient(): SecurityHubClient {
    return new SecurityHubClient({
      region: this.config.region,
      credentials: this.awsCredentials,
      ...(this.config.endpoint && { endpoint: this.config.endpoint }),
    });
  }
}
