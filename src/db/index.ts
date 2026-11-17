import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL?.trim();

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
};

const max = Number(process.env.PG_POOL_MAX ?? 10);
const needsSsl = process.env.DATABASE_SSL === "true";

export const pool: Pool | null = databaseUrl
  ? (globalForDb.__arenaNextJsPostgresqlPool ??
    new Pool({
      connectionString: databaseUrl,
      max: Number.isFinite(max) && max > 0 ? max : 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 8_000,
      ...(needsSsl ? { ssl: { rejectUnauthorized: false } } : {}),
    }))
  : null;

if (pool && process.env.NODE_ENV !== "production") {
  globalForDb.__arenaNextJsPostgresqlPool = pool;
}

export const hasDatabase = Boolean(pool);

export const db: NodePgDatabase = pool
  ? drizzle(pool)
  : (null as unknown as NodePgDatabase);
