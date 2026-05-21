import { sql } from 'drizzle-orm';
import { SOC2_SECURITY_CONTROLS } from '@compliance/shared';
import type { DbClient } from '@compliance/db';
import { controls } from '@compliance/db';

export async function seedControls(db: DbClient): Promise<void> {
  const values = SOC2_SECURITY_CONTROLS.map((c) => ({
    id: c.id,
    framework: c.framework,
    controlId: c.controlId,
    title: c.title,
    description: c.description,
    severity: c.severity,
    testFnKey: c.testFnKey,
    remediationGuidance: c.remediationGuidance,
    evidenceSources: c.evidenceSources,
  }));

  await db
    .insert(controls)
    .values(values)
    .onConflictDoUpdate({
      target: controls.id,
      set: {
        title: sql`excluded.title`,
        description: sql`excluded.description`,
        severity: sql`excluded.severity`,
        testFnKey: sql`excluded.test_fn_key`,
        remediationGuidance: sql`excluded.remediation_guidance`,
        evidenceSources: sql`excluded.evidence_sources`,
        updatedAt: new Date(),
      },
    });

  console.warn(`Seeded ${values.length} SOC 2 Security controls`);
}
