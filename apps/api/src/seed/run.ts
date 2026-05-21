import 'dotenv/config';
import { createDbClient } from '@compliance/db';
import { runMigrations } from '@compliance/db';

import { seedControls } from './controls.seed.js';

async function main() {
  const databaseUrl = process.env['DATABASE_URL'];
  if (!databaseUrl) throw new Error('DATABASE_URL is required');

  console.warn('Running migrations...');
  await runMigrations(databaseUrl);

  const db = createDbClient(databaseUrl);
  console.warn('Seeding controls...');
  await seedControls(db);

  console.warn('Seed complete.');
  process.exit(0);
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
