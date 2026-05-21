import {
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Queue, Worker } from 'bullmq';
import { and, eq } from 'drizzle-orm';
import { webhookConfigs, webhookDeliveries } from '@compliance/db';
import type { DbClient } from '@compliance/db';
import type { CreateWebhookConfigDto, WebhookEvent } from '@compliance/shared';
import { createHmac } from 'crypto';

import { DB_CLIENT } from '../database/database.module.js';
import { SecretsService } from '../secrets/secrets.service.js';

export const WEBHOOK_DELIVERY_QUEUE = 'webhook-delivery';

export interface WebhookDeliveryJob {
  webhookConfigId: string;
  deliveryId: string;
  url: string;
  secretRef: string;
  eventType: string;
  payload: Record<string, unknown>;
  attemptNumber: number;
}

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);
  private readonly queue: Queue;
  // In-process secret cache: secretRef -> { secret, fetchedAt }
  private readonly secretCache = new Map<string, { secret: string; fetchedAt: number }>();
  private static readonly SECRET_TTL_MS = 5 * 60 * 1000;

  constructor(
    @Inject(DB_CLIENT) private readonly db: DbClient,
    private readonly secretsService: SecretsService,
  ) {
    const redisUrl = process.env['REDIS_URL'] ?? 'redis://localhost:6379';
    const connection = { url: redisUrl };

    this.queue = new Queue(WEBHOOK_DELIVERY_QUEUE, { connection });

    // Worker runs in-process — retries are configured per-job at enqueue time
    new Worker<WebhookDeliveryJob>(
      WEBHOOK_DELIVERY_QUEUE,
      async (job) => this.processDelivery(job.data),
      { connection },
    );
  }

  async createConfig(dto: CreateWebhookConfigDto, orgId: string) {
    const rawSecret = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');
    const secretRef = await this.secretsService.storeConnectorCredentials(
      orgId,
      `webhook-${Date.now()}`,
      { secret: rawSecret },
    );

    const [config] = await this.db
      .insert(webhookConfigs)
      .values({
        orgId,
        workspaceId: dto.workspaceId ?? null,
        url: dto.url,
        secretRef,
        events: JSON.stringify(dto.events),
      })
      .returning();

    return { ...config!, signingSecret: rawSecret, events: dto.events };
  }

  async listConfigs(orgId: string) {
    const configs = await this.db
      .select()
      .from(webhookConfigs)
      .where(eq(webhookConfigs.orgId, orgId));

    return configs.map((c) => ({ ...c, events: this.parseEvents(c.events) }));
  }

  async deleteConfig(configId: string, orgId: string) {
    const [config] = await this.db
      .select()
      .from(webhookConfigs)
      .where(and(eq(webhookConfigs.id, configId), eq(webhookConfigs.orgId, orgId)))
      .limit(1);

    if (!config) throw new NotFoundException('Webhook config not found');

    await this.db.delete(webhookConfigs).where(eq(webhookConfigs.id, configId));

    try {
      await this.secretsService.deleteSecret(config.secretRef);
    } catch (err) {
      this.logger.warn(`Could not delete webhook secret ${config.secretRef}: ${String(err)}`);
    }
  }

  async dispatch(
    orgId: string,
    workspaceId: string | null,
    eventType: WebhookEvent,
    payload: Record<string, unknown>,
  ): Promise<void> {
    const allConfigs = await this.db
      .select()
      .from(webhookConfigs)
      .where(and(eq(webhookConfigs.orgId, orgId), eq(webhookConfigs.isActive, true)));

    const matching = allConfigs.filter((c) => {
      const events = this.parseEvents(c.events);
      const scopeOk = !c.workspaceId || c.workspaceId === workspaceId;
      return scopeOk && events.includes(eventType);
    });

    if (matching.length === 0) return;

    await Promise.all(
      matching.map(async (config) => {
        const [delivery] = await this.db
          .insert(webhookDeliveries)
          .values({
            webhookConfigId: config.id,
            eventType,
            payload,
            attemptCount: 0,
          })
          .returning();

        await this.queue.add(
          WEBHOOK_DELIVERY_QUEUE,
          {
            webhookConfigId: config.id,
            deliveryId: delivery!.id,
            url: config.url,
            secretRef: config.secretRef,
            eventType,
            payload,
            attemptNumber: 1,
          } satisfies WebhookDeliveryJob,
          { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
        );
      }),
    );
  }

  async getDeliveries(configId: string, orgId: string) {
    const [config] = await this.db
      .select({ id: webhookConfigs.id })
      .from(webhookConfigs)
      .where(and(eq(webhookConfigs.id, configId), eq(webhookConfigs.orgId, orgId)))
      .limit(1);

    if (!config) throw new NotFoundException('Webhook config not found');

    return this.db
      .select()
      .from(webhookDeliveries)
      .where(eq(webhookDeliveries.webhookConfigId, configId))
      .orderBy(webhookDeliveries.createdAt);
  }

  private async processDelivery(data: WebhookDeliveryJob): Promise<void> {
    const { deliveryId, url, secretRef, eventType, payload, attemptNumber } = data;
    const secret = await this.getCachedSecret(secretRef);

    const body = JSON.stringify({
      event: eventType,
      timestamp: new Date().toISOString(),
      data: payload,
    });

    const signature = createHmac('sha256', secret).update(body).digest('hex');

    let responseStatus: number | undefined;
    let responseBody: string | undefined;
    let deliveredAt: Date | undefined;
    let failedAt: Date | undefined;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Compliance-Signature': `sha256=${signature}`,
          'X-Compliance-Event': eventType,
        },
        body,
        signal: AbortSignal.timeout(15_000),
      });

      responseStatus = response.status;
      responseBody = (await response.text()).slice(0, 2000);

      if (response.ok) {
        deliveredAt = new Date();
      } else {
        failedAt = new Date();
        throw new Error(`Non-2xx response: ${responseStatus}`);
      }
    } catch (err) {
      failedAt = failedAt ?? new Date();
      this.logger.error(`Delivery ${deliveryId} failed (attempt ${attemptNumber}): ${String(err)}`);
      throw err;
    } finally {
      await this.db
        .update(webhookDeliveries)
        .set({
          responseStatus: responseStatus ?? null,
          responseBody: responseBody ?? null,
          attemptCount: attemptNumber,
          deliveredAt: deliveredAt ?? null,
          failedAt: failedAt ?? null,
        })
        .where(eq(webhookDeliveries.id, deliveryId));
    }
  }

  private async getCachedSecret(secretRef: string): Promise<string> {
    const cached = this.secretCache.get(secretRef);
    if (cached && Date.now() - cached.fetchedAt < WebhookService.SECRET_TTL_MS) {
      return cached.secret;
    }
    const credentials = await this.secretsService.getConnectorCredentials(secretRef);
    const secret = String((credentials as Record<string, unknown>).secret ?? '');
    this.secretCache.set(secretRef, { secret, fetchedAt: Date.now() });
    return secret;
  }

  private parseEvents(raw: string): string[] {
    try {
      return JSON.parse(raw) as string[];
    } catch {
      return [];
    }
  }
}
