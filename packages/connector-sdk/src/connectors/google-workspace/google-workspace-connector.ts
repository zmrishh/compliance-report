import { google } from 'googleapis';
import type { RawFactInput } from '@compliance/shared';
import { BaseConnector } from '../../base-connector';
import type { ConnectorHealthResult } from '../../base-connector';
import type { GoogleWorkspaceConfig, GoogleWorkspaceCredentials } from './types';

export class GoogleWorkspaceConnector extends BaseConnector<
  GoogleWorkspaceCredentials,
  GoogleWorkspaceConfig
> {
  private auth: ReturnType<typeof google.auth.JWT.prototype.createScoped> | null = null;

  async connect(): Promise<void> {
    const jwt = new google.auth.JWT({
      email: this.credentials.clientEmail,
      key: this.credentials.privateKey,
      subject: this.credentials.impersonateEmail,
      scopes: [
        'https://www.googleapis.com/auth/admin.directory.user.readonly',
        'https://www.googleapis.com/auth/admin.directory.group.readonly',
      ],
    });
    await jwt.authorize();
    this.auth = jwt as unknown as ReturnType<typeof google.auth.JWT.prototype.createScoped>;
  }

  async disconnect(): Promise<void> {
    this.auth = null;
  }

  async healthCheck(): Promise<ConnectorHealthResult> {
    return { healthy: this.auth !== null };
  }

  async *collect(): AsyncGenerator<RawFactInput> {
    yield* this.collectUsers();
    yield* this.collectGroups();
  }

  private async *collectUsers(): AsyncGenerator<RawFactInput> {
    const admin = google.admin({ version: 'directory_v1', auth: this.auth as never });
    let pageToken: string | undefined;

    do {
      const response = await admin.users.list({
        domain: this.config.domain,
        maxResults: 500,
        orderBy: 'email',
        pageToken,
        projection: 'full',
      });

      const users = response.data.users ?? [];
      for (const user of users) {
        yield {
          connectorConfigId: '',
          sourceType: 'google_workspace',
          entityType: 'google:user:directory',
          entityId: user.id ?? user.primaryEmail ?? '',
          data: {
            id: user.id,
            email: user.primaryEmail,
            name: user.name?.fullName,
            suspended: user.suspended ?? false,
            isEnrolledIn2Sv: user.isEnrolledIn2Sv ?? false,
            isEnforcedIn2Sv: user.isEnforcedIn2Sv ?? false,
            lastLoginTime: user.lastLoginTime,
            creationTime: user.creationTime,
            isAdmin: user.isAdmin ?? false,
            isDelegatedAdmin: user.isDelegatedAdmin ?? false,
          },
          collectedAt: new Date(),
        };
      }

      pageToken = response.data.nextPageToken ?? undefined;
    } while (pageToken);
  }

  private async *collectGroups(): AsyncGenerator<RawFactInput> {
    const admin = google.admin({ version: 'directory_v1', auth: this.auth as never });
    let pageToken: string | undefined;

    do {
      const response = await admin.groups.list({
        domain: this.config.domain,
        maxResults: 200,
        pageToken,
      });

      const groups = response.data.groups ?? [];
      for (const group of groups) {
        yield {
          connectorConfigId: '',
          sourceType: 'google_workspace',
          entityType: 'google:group:directory',
          entityId: group.id ?? group.email ?? '',
          data: {
            id: group.id,
            email: group.email,
            name: group.name,
            directMembersCount: group.directMembersCount,
          },
          collectedAt: new Date(),
        };
      }

      pageToken = response.data.nextPageToken ?? undefined;
    } while (pageToken);
  }
}
