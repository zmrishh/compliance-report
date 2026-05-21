import type { RawFactInput } from '@compliance/shared';
import { BaseConnector } from '../../base-connector';
import type { ConnectorHealthResult } from '../../base-connector';
import type { OktaConfig, OktaCredentials } from './types';

interface OktaUser {
  id: string;
  status: string;
  created: string;
  lastLogin: string | null;
  passwordChanged: string | null;
  profile: {
    login: string;
    email: string;
    firstName: string;
    lastName: string;
  };
}

interface OktaFactor {
  id: string;
  factorType: string;
  provider: string;
  status: string;
}

const MAX_RETRIES = 3;
const BASE_BACKOFF_MS = 1000;

export class OktaConnector extends BaseConnector<OktaCredentials, OktaConfig> {
  private baseUrl = '';

  async connect(): Promise<void> {
    this.baseUrl = this.config.orgUrl.replace(/\/$/, '');
    // Verify connectivity with a lightweight API call
    await this.fetchJson<{ id: string }>('/api/v1/org');
  }

  async disconnect(): Promise<void> {
    this.baseUrl = '';
  }

  async healthCheck(): Promise<ConnectorHealthResult> {
    try {
      await this.fetchJson<unknown>('/api/v1/org');
      return { healthy: true };
    } catch (err) {
      return { healthy: false, message: String(err) };
    }
  }

  async *collect(): AsyncGenerator<RawFactInput> {
    const users = await this.fetchAllUsers();
    for (const user of users) {
      yield {
        connectorConfigId: '',
        sourceType: 'okta',
        entityType: 'okta:user:directory',
        entityId: user.id,
        data: {
          id: user.id,
          status: user.status,
          login: user.profile.login,
          email: user.profile.email,
          firstName: user.profile.firstName,
          lastName: user.profile.lastName,
          lastLogin: user.lastLogin,
          passwordChanged: user.passwordChanged,
          created: user.created,
        },
        collectedAt: new Date(),
      };
    }

    // Collect MFA factors for ACTIVE users only
    const activeUsers = users.filter((u) => u.status === 'ACTIVE');
    for (const user of activeUsers) {
      const factors = await this.fetchUserFactors(user.id);
      for (const factor of factors) {
        yield {
          connectorConfigId: '',
          sourceType: 'okta',
          entityType: 'okta:factor:enrollment',
          entityId: `${user.id}:${factor.id}`,
          data: {
            userId: user.id,
            userLogin: user.profile.login,
            factorId: factor.id,
            factorType: factor.factorType,
            provider: factor.provider,
            status: factor.status,
          },
          collectedAt: new Date(),
        };
      }
    }
  }

  private async fetchAllUsers(): Promise<OktaUser[]> {
    const users: OktaUser[] = [];
    let url: string | null = `${this.baseUrl}/api/v1/users?limit=200&filter=status+eq+%22ACTIVE%22+or+status+eq+%22DEPROVISIONED%22`;

    while (url) {
      const response = await this.fetchWithRetry(url);
      const page = (await response.json()) as OktaUser[];
      users.push(...page);

      // Parse Link header for pagination
      const linkHeader = response.headers.get('link') ?? '';
      const nextMatch = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
      url = nextMatch ? nextMatch[1]! : null;
    }

    return users;
  }

  private async fetchUserFactors(userId: string): Promise<OktaFactor[]> {
    try {
      return await this.fetchJson<OktaFactor[]>(`/api/v1/users/${userId}/factors`);
    } catch {
      return [];
    }
  }

  private async fetchJson<T>(path: string): Promise<T> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`);
    return response.json() as Promise<T>;
  }

  private async fetchWithRetry(url: string, attempt = 0): Promise<Response> {
    const response = await fetch(url, {
      headers: {
        Authorization: `SSWS ${this.credentials.token}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });

    if (response.status === 429 && attempt < MAX_RETRIES) {
      const retryAfter = parseInt(response.headers.get('x-rate-limit-reset') ?? '0', 10);
      const waitMs = retryAfter
        ? Math.max(0, retryAfter * 1000 - Date.now())
        : BASE_BACKOFF_MS * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, waitMs));
      return this.fetchWithRetry(url, attempt + 1);
    }

    if (!response.ok) {
      throw new Error(`Okta API error ${response.status} for ${url}: ${await response.text()}`);
    }

    return response;
  }
}
