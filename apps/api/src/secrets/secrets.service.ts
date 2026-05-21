import {
  CreateSecretCommand,
  GetSecretValueCommand,
  SecretsManagerClient,
  UpdateSecretCommand,
} from '@aws-sdk/client-secrets-manager';
import { Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class SecretsService {
  private readonly logger = new Logger(SecretsService.name);
  private readonly client: SecretsManagerClient | null;
  private readonly redis: Redis | null;
  private readonly isDev: boolean;

  constructor(
    nodeEnv: string,
    region: string,
    endpoint?: string,
    redisUrl?: string,
  ) {
    this.isDev = nodeEnv !== 'production';

    if (this.isDev) {
      // In dev, use Redis as a simple secret store (LocalStack also works but Redis is lighter)
      this.redis = redisUrl ? new Redis(redisUrl) : null;
      this.client = endpoint
        ? new SecretsManagerClient({ region, endpoint })
        : null;
    } else {
      this.client = new SecretsManagerClient({ region, ...(endpoint && { endpoint }) });
      this.redis = null;
    }
  }

  async storeConnectorCredentials(
    orgId: string,
    connectorType: string,
    credentials: Record<string, unknown>,
  ): Promise<string> {
    const secretName = `compliance/connectors/${orgId}/${connectorType}/${crypto.randomUUID()}`;
    const secretString = JSON.stringify(credentials);

    if (this.isDev && this.redis) {
      await this.redis.set(`secret:${secretName}`, secretString);
      return secretName;
    }

    if (!this.client) {
      throw new Error('Secrets Manager client not available');
    }

    try {
      await this.client.send(
        new CreateSecretCommand({ Name: secretName, SecretString: secretString }),
      );
    } catch (err: unknown) {
      if (
        err instanceof Error &&
        err.name === 'ResourceExistsException'
      ) {
        await this.client.send(
          new UpdateSecretCommand({ SecretId: secretName, SecretString: secretString }),
        );
      } else {
        throw err;
      }
    }

    this.logger.log(`Stored connector credentials: ${secretName}`);
    return secretName;
  }

  async getConnectorCredentials(secretRef: string): Promise<Record<string, unknown>> {
    if (this.isDev && this.redis) {
      const raw = await this.redis.get(`secret:${secretRef}`);
      if (!raw) throw new Error(`Secret not found: ${secretRef}`);
      return JSON.parse(raw) as Record<string, unknown>;
    }

    if (!this.client) {
      throw new Error('Secrets Manager client not available');
    }

    const response = await this.client.send(
      new GetSecretValueCommand({ SecretId: secretRef }),
    );

    if (!response.SecretString) {
      throw new Error(`Secret has no string value: ${secretRef}`);
    }

    return JSON.parse(response.SecretString) as Record<string, unknown>;
  }

  async deleteSecret(secretRef: string): Promise<void> {
    if (this.isDev && this.redis) {
      await this.redis.del(`secret:${secretRef}`);
      return;
    }

    // In production, schedule deletion (7-day recovery window)
    if (this.client) {
      const { DeleteSecretCommand } = await import('@aws-sdk/client-secrets-manager');
      await this.client.send(
        new DeleteSecretCommand({
          SecretId: secretRef,
          RecoveryWindowInDays: 7,
        }),
      );
    }
  }
}
