import * as crypto from 'crypto';

import { connectorConfigs, connectorRuns, rawFacts } from '@compliance/db';
import type { DbClient } from '@compliance/db';
import { eq, and } from 'drizzle-orm';

import type { BaseConnector } from './base-connector';

interface ConnectorRunnerOptions {
  db: DbClient;
  connectorConfigId: string;
  orgId: string;
  triggeredBy: 'scheduler' | 'manual';
  onFactBatch?: (entityTypes: string[], orgId: string, workspaceIds: string[]) => void;
}

function computeContentHash(data: Record<string, unknown>): string {
  const sortedKeys = Object.keys(data).sort();
  const canonical = JSON.stringify(
    Object.fromEntries(sortedKeys.map((k) => [k, data[k]])),
  );
  return crypto.createHash('sha256').update(canonical).digest('hex');
}

export class ConnectorRunner {
  constructor(private readonly options: ConnectorRunnerOptions) {}

  async run<TCredentials, TConfig>(
    connector: BaseConnector<TCredentials, TConfig>,
  ): Promise<void> {
    const { db, connectorConfigId, orgId, triggeredBy, onFactBatch } = this.options;

    // Start run record
    const [run] = await db
      .insert(connectorRuns)
      .values({
        connectorConfigId,
        status: 'running',
        triggeredBy,
      })
      .returning();

    await db
      .update(connectorConfigs)
      .set({ lastSyncStatus: 'running', updatedAt: new Date() })
      .where(eq(connectorConfigs.id, connectorConfigId));

    let factCount = 0;
    const seenEntityTypes = new Set<string>();

    try {
      await connector.connect();

      const BATCH_SIZE = 50;
      const batch: Array<{
        connectorConfigId: string;
        sourceType: string;
        entityType: string;
        entityId: string;
        data: Record<string, unknown>;
        contentHash: string;
        collectedAt: Date;
      }> = [];

      for await (const fact of connector.collect()) {
        const contentHash = computeContentHash(fact.data);

        batch.push({
          connectorConfigId,
          sourceType: fact.sourceType,
          entityType: fact.entityType,
          entityId: fact.entityId,
          data: fact.data,
          contentHash,
          collectedAt: fact.collectedAt,
        });

        seenEntityTypes.add(fact.entityType);

        if (batch.length >= BATCH_SIZE) {
          await this.flushBatch(db, batch);
          factCount += batch.length;
          batch.length = 0;
        }
      }

      // Flush remaining
      if (batch.length > 0) {
        await this.flushBatch(db, batch);
        factCount += batch.length;
      }

      // Mark run complete
      await db
        .update(connectorRuns)
        .set({ status: 'completed', finishedAt: new Date(), factCount })
        .where(eq(connectorRuns.id, run.id));

      await db
        .update(connectorConfigs)
        .set({ lastSyncAt: new Date(), lastSyncStatus: 'completed', updatedAt: new Date() })
        .where(eq(connectorConfigs.id, connectorConfigId));

      // Notify normalizer/rules engine about new facts
      if (onFactBatch && seenEntityTypes.size > 0) {
        onFactBatch([...seenEntityTypes], orgId, []);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);

      await db
        .update(connectorRuns)
        .set({ status: 'failed', finishedAt: new Date(), factCount, errorMessage })
        .where(eq(connectorRuns.id, run.id));

      await db
        .update(connectorConfigs)
        .set({ lastSyncAt: new Date(), lastSyncStatus: 'failed', updatedAt: new Date() })
        .where(eq(connectorConfigs.id, connectorConfigId));

      throw err;
    } finally {
      await connector.disconnect();
    }
  }

  private async flushBatch(
    db: DbClient,
    batch: Array<{
      connectorConfigId: string;
      sourceType: string;
      entityType: string;
      entityId: string;
      data: Record<string, unknown>;
      contentHash: string;
      collectedAt: Date;
    }>,
  ): Promise<void> {
    // Insert new facts; skip rows where (connectorConfigId, entityType, entityId, contentHash) already exists
    // This is idempotent: identical data is never re-inserted.
    for (const fact of batch) {
      const [existing] = await db
        .select({ id: rawFacts.id })
        .from(rawFacts)
        .where(
          and(
            eq(rawFacts.connectorConfigId, fact.connectorConfigId),
            eq(rawFacts.entityType, fact.entityType),
            eq(rawFacts.entityId, fact.entityId),
            eq(rawFacts.contentHash, fact.contentHash),
          ),
        )
        .limit(1);

      if (!existing) {
        await db.insert(rawFacts).values(fact);
      }
    }
  }
}
