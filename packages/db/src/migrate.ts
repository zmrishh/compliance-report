import { join } from 'path';

import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

export async function runMigrations(connectionString: string): Promise<void> {
  const sql = postgres(connectionString, { max: 1 });
  const db = drizzle(sql);

  // The drizzle folder lives at {package root}/drizzle relative to this compiled file
  // In both dev (ts-node/tsx) and prod (dist/) the relative path is consistent.
  const migrationsFolder = join(__dirname, '..', 'drizzle');

  try {
    await migrate(db, { migrationsFolder });
    console.warn('Database migrations completed successfully');
  } finally {
    await sql.end();
  }
}
