import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

/** Runtime Drizzle client backed by postgres-js — one connection pool per process. */
export function createDb(connectionString: string): PostgresJsDatabase<typeof schema> {
  const client = postgres(connectionString);
  return drizzle(client, { schema });
}
