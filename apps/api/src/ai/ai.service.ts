import { Inject, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { and, desc, eq } from 'drizzle-orm';
import { controlStates, controls, rawFacts } from '@compliance/db';
import type { DbClient } from '@compliance/db';
import { CATALOG_BY_ID } from '@compliance/shared';

import { DB_CLIENT } from '../database/database.module.js';
import type { Env } from '../config/config.schema.js';

export interface AiDraftResult {
  type: 'policy' | 'procedure';
  controlId: string;
  content: string;
  model: string;
  generatedAt: string;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly openai: OpenAI | null = null;

  constructor(
    @Inject(DB_CLIENT) private readonly db: DbClient,
    private readonly config: ConfigService<Env, true>,
  ) {
    const apiKey = this.config.get('OPENAI_API_KEY', { infer: true });
    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
    }
  }

  async draft(
    controlId: string,
    type: 'policy' | 'procedure',
    workspaceId: string,
    orgId: string,
  ): Promise<AiDraftResult> {
    if (!this.openai) {
      throw new ServiceUnavailableException(
        'AI drafting is not configured. Set OPENAI_API_KEY to enable this feature.',
      );
    }

    const catalogEntry = CATALOG_BY_ID[controlId];
    if (!catalogEntry) {
      throw new ServiceUnavailableException(`Control '${controlId}' not found in catalog.`);
    }

    // Fetch current control state for this workspace
    const [stateRow] = await this.db
      .select({
        status: controlStates.status,
        detail: controlStates.detail,
        notes: controlStates.notes,
        lastEvaluatedAt: controlStates.lastEvaluatedAt,
      })
      .from(controlStates)
      .innerJoin(controls, eq(controlStates.controlId, controls.id))
      .where(
        and(
          eq(controlStates.workspaceId, workspaceId),
          eq(controlStates.controlId, controlId),
        ),
      )
      .limit(1);

    // Fetch the 3 most recent raw facts for this control's evidence sources
    const recentFacts = await this.db
      .select({ entityType: rawFacts.entityType, data: rawFacts.data, collectedAt: rawFacts.collectedAt })
      .from(rawFacts)
      .where(eq(rawFacts.connectorConfigId, orgId))
      .orderBy(desc(rawFacts.collectedAt))
      .limit(3);

    const stateContext = stateRow
      ? `Current status: ${stateRow.status}${stateRow.detail ? `\nFinding: ${stateRow.detail}` : ''}${stateRow.notes ? `\nNotes: ${stateRow.notes}` : ''}`
      : 'Status: Not yet evaluated';

    const factsContext =
      recentFacts.length > 0
        ? `\n\nRecent evidence facts (last 3):\n${recentFacts
            .map((f) => `- ${f.entityType} (${f.collectedAt?.toISOString() ?? 'unknown'}): ${JSON.stringify(f.data).slice(0, 300)}`)
            .join('\n')}`
        : '';

    const docType = type === 'policy' ? 'Information Security Policy' : 'Operational Procedure';
    const systemPrompt = `You are a compliance expert helping a B2B SaaS company prepare SOC 2 documentation.
Generate a concise, professional ${docType} document in Markdown format.
The document must be practical and specific to the control described.
Always include: Purpose, Scope, Policy/Procedure statements, Roles & Responsibilities, and Review Frequency.
End with a clear watermark: "⚠️ AI-GENERATED DRAFT — Requires review and approval by a qualified compliance officer before use."`;

    const userPrompt = `Write a ${docType} for the following SOC 2 control:

Control ID: ${catalogEntry.controlId}
Title: ${catalogEntry.title}
Description: ${catalogEntry.description}
Remediation Guidance: ${catalogEntry.remediationGuidance}
Evidence Sources: ${catalogEntry.evidenceSources.join(', ')}

${stateContext}${factsContext}`;

    this.logger.log(`Drafting ${type} for control ${controlId} in workspace ${workspaceId}`);

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 2000,
      temperature: 0.3,
    });

    const content = response.choices[0]?.message?.content ?? '';

    return {
      type,
      controlId,
      content,
      model: response.model,
      generatedAt: new Date().toISOString(),
    };
  }
}
