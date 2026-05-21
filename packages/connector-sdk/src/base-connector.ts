import type { RawFactInput } from '@compliance/shared';

export interface ConnectorHealthResult {
  healthy: boolean;
  message?: string;
}

/**
 * BaseConnector defines the lifecycle contract for all data connectors.
 *
 * TCredentials — the shape of the decrypted secret stored in Secrets Manager
 * TConfig — non-sensitive configuration (org login, region, etc.) from connector_configs.config
 */
export abstract class BaseConnector<TCredentials, TConfig> {
  protected credentials: TCredentials;
  protected config: TConfig;

  constructor(credentials: TCredentials, config: TConfig) {
    this.credentials = credentials;
    this.config = config;
  }

  /**
   * Optional setup step called before collect().
   * Use for initialising SDK clients, verifying credentials, etc.
   */
  async connect(): Promise<void> {}

  /**
   * Called after all facts have been yielded. Release resources here.
   */
  async disconnect(): Promise<void> {}

  /**
   * Verify the connector can reach its source system.
   * Must not throw — return { healthy: false, message } on failure.
   */
  abstract healthCheck(): Promise<ConnectorHealthResult>;

  /**
   * Yield normalised facts. Each yielded value becomes a raw_fact row.
   * Implementations must handle pagination internally.
   * Must not throw for transient errors — yield facts for what succeeds.
   */
  abstract collect(): AsyncGenerator<Omit<RawFactInput, 'connectorConfigId'>>;
}
