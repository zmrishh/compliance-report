import * as crypto from 'crypto';

import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

export const FACTS_NEW_EVENT = 'facts.new';

export interface FactsNewPayload {
  orgId: string;
  workspaceIds: string[];
  entityTypes: string[];
  connectorConfigId: string;
}

export function computeContentHash(data: Record<string, unknown>): string {
  const canonical = JSON.stringify(data, Object.keys(data).sort());
  return crypto.createHash('sha256').update(canonical).digest('hex');
}

@Injectable()
export class NormalizerService {
  constructor(private readonly eventEmitter: EventEmitter2) {}

  /**
   * Called by ConnectorRunner after a batch of facts are upserted.
   * Emits the facts.new event so the rules engine can re-evaluate affected controls.
   */
  notifyNewFacts(payload: FactsNewPayload): void {
    this.eventEmitter.emit(FACTS_NEW_EVENT, payload);
  }
}
