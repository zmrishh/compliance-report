import { Queue, Worker, type Job } from 'bullmq';
import type { Redis } from 'ioredis';

export interface ConnectorJobData {
  connectorConfigId: string;
  orgId: string;
  connectorType: string;
  triggeredBy: 'scheduler' | 'manual';
}

export interface ConnectorJobResult {
  factCount: number;
  durationMs: number;
}

type ConnectorJobProcessor = (job: Job<ConnectorJobData>) => Promise<ConnectorJobResult>;

const QUEUE_NAME = 'connector-sync';

export class ConnectorScheduler {
  private readonly queue: Queue<ConnectorJobData, ConnectorJobResult>;
  private worker: Worker<ConnectorJobData, ConnectorJobResult> | null = null;

  constructor(private readonly redis: Redis) {
    this.queue = new Queue(QUEUE_NAME, {
      connection: redis,
      defaultJobOptions: {
        attempts: 5,
        backoff: { type: 'exponential', delay: 60_000 }, // starts at 1 min
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 100 },
      },
    });
  }

  async triggerManual(connectorConfigId: string, orgId: string, connectorType: string): Promise<string> {
    const job = await this.queue.add(
      `manual:${connectorConfigId}`,
      { connectorConfigId, orgId, connectorType, triggeredBy: 'manual' },
      { jobId: `manual:${connectorConfigId}:${Date.now()}` },
    );
    return job.id ?? connectorConfigId;
  }

  async scheduleConnector(
    connectorConfigId: string,
    orgId: string,
    connectorType: string,
    intervalHours: number,
  ): Promise<void> {
    const cronExpression = `0 */${intervalHours} * * *`;
    await this.queue.upsertJobScheduler(
      `cron:${connectorConfigId}`,
      { pattern: cronExpression },
      {
        name: `scheduled:${connectorConfigId}`,
        data: { connectorConfigId, orgId, connectorType, triggeredBy: 'scheduler' },
      },
    );
  }

  async removeSchedule(connectorConfigId: string): Promise<void> {
    await this.queue.removeJobScheduler(`cron:${connectorConfigId}`);
  }

  startWorker(processor: ConnectorJobProcessor, concurrency = 3): void {
    this.worker = new Worker<ConnectorJobData, ConnectorJobResult>(
      QUEUE_NAME,
      processor,
      {
        connection: this.redis,
        concurrency,
      },
    );

    this.worker.on('failed', (job, err) => {
      console.error(`Connector job failed: ${job?.id}`, err.message);
    });

    this.worker.on('completed', (job) => {
      console.warn(`Connector job completed: ${job.id} — ${job.returnvalue.factCount} facts in ${job.returnvalue.durationMs}ms`);
    });
  }

  async close(): Promise<void> {
    await this.worker?.close();
    await this.queue.close();
  }
}
