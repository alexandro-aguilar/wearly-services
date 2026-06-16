import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import Environment from '@src/core/utils/Environment';

const globalForDrizzle = globalThis as unknown as {
  drizzleDb?: ReturnType<typeof drizzle>;
  drizzlePool?: Pool;
};

if (!globalForDrizzle.drizzleDb) {
  globalForDrizzle.drizzlePool = new Pool({
    user: Environment.DB_USER,
    host: Environment.DB_HOST,
    database: Environment.DB_NAME,
    password: Environment.DB_PASSWORD,
    port: parseInt(Environment.DB_PORT || '5432', 10),
    // options: `-c search_path=${'' || 'public'}`,
    idleTimeoutMillis: 10000,
  });

  globalForDrizzle.drizzleDb = drizzle(globalForDrizzle.drizzlePool, {
    schema,
  });
}

export const db = globalForDrizzle.drizzleDb!;
export const pool = globalForDrizzle.drizzlePool!;
