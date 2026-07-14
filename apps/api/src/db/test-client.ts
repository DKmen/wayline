import { drizzle, type PgliteDatabase } from 'drizzle-orm/pglite';
import { PGlite } from '@electric-sql/pglite';
import { citext } from '@electric-sql/pglite/contrib/citext';
import { sql } from 'drizzle-orm';
import * as schema from './schema';

/**
 * Test-only Drizzle client backed by PGlite (embedded Postgres, WASM) instead of a
 * Docker service — CI's `quality` job (pnpm test:coverage) has no Postgres container,
 * so any test needing real Postgres semantics must not depend on one being reachable.
 *
 * PGlite ships citext as an opt-in contrib extension bundle: unlike a real Postgres
 * install, `CREATE EXTENSION citext` fails unless the extension module is registered
 * on the instance up front via the `extensions` option.
 */
export async function createTestDb(): Promise<{
  db: PgliteDatabase<typeof schema>;
  close: () => Promise<void>;
}> {
  const client = new PGlite({ extensions: { citext } });
  const db = drizzle(client, { schema });

  await client.exec('CREATE EXTENSION IF NOT EXISTS citext;');
  await db.execute(sql`
    CREATE TABLE users (
      id text PRIMARY KEY,
      email citext NOT NULL UNIQUE,
      name text,
      avatar_url text,
      email_verified boolean NOT NULL DEFAULT false,
      email_verified_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `);
  await db.execute(sql`
    CREATE TABLE session (
      id text PRIMARY KEY,
      user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token text NOT NULL UNIQUE,
      expires_at timestamptz NOT NULL,
      ip_address text,
      user_agent text,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `);
  await db.execute(sql`
    CREATE TABLE account (
      id text PRIMARY KEY,
      user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      account_id text NOT NULL,
      provider_id text NOT NULL,
      access_token text,
      refresh_token text,
      id_token text,
      password text,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `);
  await db.execute(sql`
    CREATE TABLE verification (
      id text PRIMARY KEY,
      identifier text NOT NULL,
      value text NOT NULL,
      expires_at timestamptz NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `);
  await db.execute(sql`
    CREATE TABLE rate_limit_attempts (
      id text PRIMARY KEY,
      key text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    );
  `);
  await db.execute(sql`CREATE TYPE workspace_plan AS ENUM ('free', 'pro', 'team');`);
  await db.execute(sql`CREATE TYPE workspace_role AS ENUM ('viewer', 'creator', 'admin');`);
  await db.execute(sql`
    CREATE TABLE workspaces (
      id uuid PRIMARY KEY,
      name text NOT NULL,
      slug citext NOT NULL UNIQUE,
      plan workspace_plan NOT NULL DEFAULT 'free',
      deleted_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `);
  await db.execute(sql`
    CREATE TABLE workspace_members (
      workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role workspace_role NOT NULL,
      last_active_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (workspace_id, user_id)
    );
  `);
  await db.execute(sql`CREATE INDEX workspace_members_user_id_idx ON workspace_members (user_id);`);
  await db.execute(sql`
    CREATE TABLE invitations (
      id uuid PRIMARY KEY,
      workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      email citext NOT NULL,
      role workspace_role NOT NULL,
      invited_by text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash text NOT NULL UNIQUE,
      expires_at timestamptz NOT NULL,
      accepted_at timestamptz,
      revoked_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `);
  await db.execute(sql`
    CREATE TABLE audit_log (
      id uuid PRIMARY KEY,
      workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      actor_id text REFERENCES users(id) ON DELETE SET NULL,
      action text NOT NULL,
      target_type text NOT NULL,
      target_id text,
      meta jsonb NOT NULL DEFAULT '{}'::jsonb,
      created_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  return { db, close: () => client.close() };
}
