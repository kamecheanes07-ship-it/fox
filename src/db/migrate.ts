import { sql } from "drizzle-orm";
import { db } from "@/db";

// Idempotent DDL that mirrors src/db/schema.ts so a fresh database is usable
// immediately (also applied by `npx drizzle-kit push` when available).
const STATEMENTS = [
  `CREATE EXTENSION IF NOT EXISTS pgcrypto`,
  `CREATE TABLE IF NOT EXISTS users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    email text NOT NULL UNIQUE,
    password_hash text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    token text NOT NULL UNIQUE,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at timestamptz NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions (user_id)`,
  `CREATE INDEX IF NOT EXISTS sessions_token_idx ON sessions (token)`,
  `CREATE TABLE IF NOT EXISTS search_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    query text NOT NULL,
    tab text NOT NULL DEFAULT 'all',
    result_count integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS search_history_user_idx ON search_history (user_id)`,
  `CREATE INDEX IF NOT EXISTS search_history_created_idx ON search_history (created_at)`,
  `CREATE TABLE IF NOT EXISTS collections (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name text NOT NULL,
    description text NOT NULL DEFAULT '',
    color text NOT NULL DEFAULT '#4285f4',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS collections_user_idx ON collections (user_id)`,
  `CREATE TABLE IF NOT EXISTS saved_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    collection_id uuid REFERENCES collections(id) ON DELETE SET NULL,
    kind text NOT NULL DEFAULT 'web',
    title text NOT NULL,
    url text NOT NULL,
    snippet text NOT NULL DEFAULT '',
    thumbnail text NOT NULL DEFAULT '',
    source text NOT NULL DEFAULT '',
    query text NOT NULL DEFAULT '',
    note text NOT NULL DEFAULT '',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS saved_items_user_idx ON saved_items (user_id)`,
  `CREATE INDEX IF NOT EXISTS saved_items_collection_idx ON saved_items (collection_id)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS saved_items_user_url_uidx ON saved_items (user_id, url)`,
];

export async function migrate(): Promise<void> {
  for (const statement of STATEMENTS) {
    await db.execute(sql.raw(statement));
  }
}
