import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { controlStates, controls, workspaces } from '@compliance/db';
import type { DbClient } from '@compliance/db';
import { CONTROL_STATUS, READINESS_SCORE_WEIGHTS, type Severity } from '@compliance/shared';
import PdfPrinter from 'pdfmake';
import type { TDocumentDefinitions } from 'pdfmake/interfaces';

import { DB_CLIENT } from '../database/database.module.js';

interface ControlRow {
  controlId: string;
  title: string;
  severity: string;
  status: string;
  lastEvaluatedAt: Date | null;
  detail: string | null;
  remediationGuidance: string;
}

const FONTS = {
  Roboto: {
    normal: 'node_modules/pdfmake/build/vfs_fonts.js',
    bold: 'node_modules/pdfmake/build/vfs_fonts.js',
    italics: 'node_modules/pdfmake/build/vfs_fonts.js',
    bolditalics: 'node_modules/pdfmake/build/vfs_fonts.js',
  },
};

const STATUS_SYMBOL: Record<string, string> = {
  PASS: '✓',
  FAIL: '✗',
  UNKNOWN: '?',
  WAIVED: '~',
};

@Injectable()
export class ExportService {
  constructor(@Inject(DB_CLIENT) private readonly db: DbClient) {}

  async exportCsv(workspaceId: string, orgId: string): Promise<string> {
    const { workspace, rows } = await this.fetchData(workspaceId, orgId);

    const header = ['Control ID', 'Title', 'Severity', 'Status', 'Last Evaluated', 'Finding', 'Remediation Guidance'];
    const csvRows = rows.map((r) => [
      r.controlId,
      `"${r.title.replace(/"/g, '""')}"`,
      r.severity,
      r.status,
      r.lastEvaluatedAt ? r.lastEvaluatedAt.toISOString() : '',
      `"${(r.detail ?? '').replace(/"/g, '""')}"`,
      `"${r.remediationGuidance.replace(/"/g, '""')}"`,
    ]);

    const lines = [
      `# Readiness Export — ${workspace.name}`,
      `# Generated: ${new Date().toISOString()}`,
      `# Score: ${workspace.readinessScore ?? 0}%`,
      '',
      header.join(','),
      ...csvRows.map((r) => r.join(',')),
    ];

    return lines.join('\n');
  }

  async exportPdf(workspaceId: string, orgId: string): Promise<Buffer> {
    const { workspace, rows, score, breakdown } = await this.fetchData(workspaceId, orgId);

    const styles = {
      header: { fontSize: 20, bold: true, margin: [0, 0, 0, 8] as [number, number, number, number] },
      subheader: { fontSize: 14, bold: true, margin: [0, 16, 0, 4] as [number, number, number, number] },
      meta: { fontSize: 10, color: '#666666', margin: [0, 0, 0, 4] as [number, number, number, number] },
      tableHeader: { bold: true, fontSize: 10, fillColor: '#f3f4f6' },
      pass: { color: '#16a34a' },
      fail: { color: '#dc2626' },
      unknown: { color: '#ca8a04' },
      waived: { color: '#6b7280' },
    };

    const docDefinition: TDocumentDefinitions = {
      pageSize: 'A4',
      pageMargins: [40, 60, 40, 60] as [number, number, number, number],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      styles: styles as any,
      content: [
        { text: `SOC 2 Readiness Report`, style: 'header' },
        { text: workspace.name, style: 'subheader' },
        { text: `Generated: ${new Date().toLocaleString()}`, style: 'meta' },
        { text: `Framework: ${workspace.framework}`, style: 'meta' },
        { text: '\n' },
        {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          columns: [
            this.scoreBox('Readiness Score', `${Math.round(score)}%`),
            this.scoreBox('Pass', String(breakdown.pass)),
            this.scoreBox('Fail', String(breakdown.fail)),
            this.scoreBox('Unknown', String(breakdown.unknown)),
            this.scoreBox('Waived', String(breakdown.waived)),
          ] as unknown as import('pdfmake/interfaces').Column[],
          columnGap: 8,
          margin: [0, 0, 0, 20] as [number, number, number, number],
        },
        { text: 'Controls', style: 'subheader' },
        {
          table: {
            headerRows: 1,
            widths: ['auto', '*', 'auto', 'auto', 'auto'],
            body: [
              [
                { text: 'ID', style: 'tableHeader' },
                { text: 'Control Title', style: 'tableHeader' },
                { text: 'Severity', style: 'tableHeader' },
                { text: 'Status', style: 'tableHeader' },
                { text: 'Last Checked', style: 'tableHeader' },
              ],
              ...rows.map((r) => [
                { text: r.controlId, fontSize: 9 },
                { text: r.title, fontSize: 9 },
                { text: r.severity.toUpperCase(), fontSize: 9 },
                { text: `${STATUS_SYMBOL[r.status] ?? ''} ${r.status}`, fontSize: 9 },
                { text: r.lastEvaluatedAt ? r.lastEvaluatedAt.toLocaleDateString() : '—', fontSize: 9 },
              ]),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ] as any,
          },
          layout: 'lightHorizontalLines',
        },
        { text: '\n' },
        {
          text: 'This report was generated automatically. Review with a qualified compliance officer before submission.',
          fontSize: 8,
          color: '#9ca3af',
          italics: true,
        },
      ],
    };

    return new Promise((resolve, reject) => {
      try {
        // pdfmake with built-in vfs fonts
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { vfs } = require('pdfmake/build/vfs_fonts') as { vfs: Record<string, string> };
        const printer = new PdfPrinter({ Roboto: { normal: Buffer.from(vfs['Roboto-Regular.ttf'] ?? '', 'base64'), bold: Buffer.from(vfs['Roboto-Medium.ttf'] ?? '', 'base64'), italics: Buffer.from(vfs['Roboto-Italic.ttf'] ?? '', 'base64'), bolditalics: Buffer.from(vfs['Roboto-MediumItalic.ttf'] ?? '', 'base64') } } as never);
        const pdfDoc = printer.createPdfKitDocument(docDefinition);
        const chunks: Buffer[] = [];
        pdfDoc.on('data', (chunk: Buffer) => chunks.push(chunk));
        pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
        pdfDoc.on('error', reject);
        pdfDoc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  private scoreBox(label: string, value: string) {
    return {
      stack: [
        { text: value, fontSize: 18, bold: true, alignment: 'center' as const },
        { text: label, fontSize: 9, color: '#6b7280', alignment: 'center' as const },
      ],
      fillColor: '#f9fafb',
      margin: [4, 8, 4, 8] as [number, number, number, number],
    };
  }

  private async fetchData(workspaceId: string, orgId: string) {
    const [workspace] = await this.db
      .select()
      .from(workspaces)
      .where(and(eq(workspaces.id, workspaceId), eq(workspaces.orgId, orgId)))
      .limit(1);

    if (!workspace) throw new NotFoundException('Workspace not found');

    const states = await this.db
      .select({
        status: controlStates.status,
        detail: controlStates.detail,
        lastEvaluatedAt: controlStates.lastEvaluatedAt,
        severity: controls.severity,
        controlIdCode: controls.controlId,
        title: controls.title,
        remediationGuidance: controls.remediationGuidance,
      })
      .from(controlStates)
      .innerJoin(controls, eq(controlStates.controlId, controls.id))
      .where(eq(controlStates.workspaceId, workspaceId));

    const breakdown = { pass: 0, fail: 0, unknown: 0, waived: 0 };
    let totalWeight = 0;
    let passWeight = 0;

    for (const s of states) {
      const key = s.status.toLowerCase() as keyof typeof breakdown;
      if (key in breakdown) breakdown[key]++;
      const w = READINESS_SCORE_WEIGHTS[s.severity as Severity] ?? 1;
      totalWeight += w;
      if (s.status === CONTROL_STATUS.PASS || s.status === CONTROL_STATUS.WAIVED) {
        passWeight += w;
      }
    }

    const score =
      workspace.readinessScore ??
      (totalWeight === 0 ? 0 : Math.round((passWeight / totalWeight) * 1000) / 10);

    const rows: ControlRow[] = states.map((s) => ({
      controlId: s.controlIdCode,
      title: s.title,
      severity: s.severity,
      status: s.status,
      lastEvaluatedAt: s.lastEvaluatedAt,
      detail: s.detail,
      remediationGuidance: s.remediationGuidance,
    }));

    // Sort: FAIL first, then by severity
    const severityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    rows.sort((a, b) => {
      if (a.status === 'FAIL' && b.status !== 'FAIL') return -1;
      if (b.status === 'FAIL' && a.status !== 'FAIL') return 1;
      return (severityOrder[a.severity] ?? 9) - (severityOrder[b.severity] ?? 9);
    });

    return { workspace, rows, score, breakdown };
  }
}
