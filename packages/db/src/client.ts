import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import * as schema from './schema/index';

export type DbClient = ReturnType<typeof createDbClient>;

export function createDbClient(connectionString: string): ReturnType<typeof drizzle> {
  const sql = postgres(connectionString, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
  });
  return drizzle(sql, { schema });
}

// Re-export schema for convenience
export { schema };
