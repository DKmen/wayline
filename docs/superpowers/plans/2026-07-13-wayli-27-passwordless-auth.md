# WAYLI-27 — Passwordless Authentication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up `apps/api` from scratch with a working Better Auth passwordless (magic-link) flow — server sessions, 15-minute single-use tokens, per-email and per-IP rate limiting, and safe (no-secret) structured logs — verified end-to-end against local Mailpit.

**Architecture:** Hono app on Node, Drizzle (Postgres) for persistence, Better Auth's Drizzle adapter for `session`/`account`/`verification`, a hand-written `users` table for our own profile fields. Better Auth's `magicLink` plugin sends mail through a small injectable `Mailer` (nodemailer → Mailpit locally); a custom Postgres-backed rate-limit helper enforces the per-email limit the magic-link plugin doesn't cover on its own. Tests that need real Postgres semantics run against `@electric-sql/pglite` (embedded Postgres, WASM) rather than a Docker service, because `.github/workflows/ci.yml`'s `quality` job (which runs `pnpm test:coverage`) has no Postgres service container — a Docker-only test strategy would pass locally and fail in CI.

**Tech Stack:** Hono, `@hono/node-server`, Better Auth (`better-auth`), Drizzle ORM + Drizzle Kit, `postgres` (postgres-js, runtime), `@electric-sql/pglite` (test-only embedded Postgres), Nodemailer (SMTP → Mailpit), Zod, Vitest.

## Global Constraints

- 95% coverage thresholds (lines/branches/functions/statements) — `vitest.config.ts` already globs `apps/*/src/**/*.test.{ts,tsx}`, no config change needed once `apps/api/src` exists.
- Every **exported** function/handler gets a one-line doc-comment above it stating purpose (CLAUDE.md).
- Inline comments only for non-obvious "why" — never restate code (CLAUDE.md).
- One-thing-per-file convention for `apps/api` (not lint-enforced, but followed — `.claude/skills/wayline-backend/SKILL.md`).
- Every request body/query parsed via Zod; wire types that need sharing live in `packages/shared-types`, never hand-duplicated (`.claude/skills/wayline-backend/SKILL.md`).
- Magic links: single-use, 15-minute expiry, token hash stored (never plaintext), rate-limited per email **and** per IP (`docs/09-security-privacy.md` §2).
- Server sessions: Postgres-backed, 30-day rolling expiry, HttpOnly `Secure` cookie (`docs/03-architecture.md` §3.1, `docs/09-security-privacy.md` §2).
- Structured logs: explicit field allow-list — never log request bodies, tokens, or email addresses in the clear (`docs/09-security-privacy.md` §2).
- No Google OAuth in this ticket — deferred to WAYLI-90, last in S9 (ticket description, user decision recorded there).
- Positive + negative test requirement: every exported function/handler with branching needs ≥1 test proving intended behavior and ≥1 proving correct rejection (CLAUDE.md, `.claude/skills/wayline-testing/SKILL.md`).
- Co-locate unit tests as `Module.test.ts` next to source, no parallel `__tests__` tree (`.claude/skills/wayline-testing/SKILL.md`).

---

## File Structure

```
apps/api/
├── package.json                          # new — app manifest, deps, scripts
├── tsconfig.json                         # new — extends root tsconfig.base.json
├── drizzle.config.ts                     # new — Drizzle Kit config (migrations output)
├── .env.example                          # new — apps/api-local var documentation (mirrors root additions)
└── src/
    ├── env.ts                            # new — Zod-validated env for apps/api
    ├── db/
    │   ├── schema/
    │   │   ├── custom-types.ts           # new — Drizzle `citext` custom column type
    │   │   ├── users.ts                  # new — `users` table (docs/04-data-model.md §2)
    │   │   ├── auth.ts                   # new — Better Auth adapter tables: session, account, verification
    │   │   └── rate-limit.ts             # new — `rate_limit_attempts` table
    │   ├── client.ts                     # new — runtime Drizzle client (postgres-js)
    │   ├── client.test.ts                # new
    │   ├── test-client.ts                # new — test-only Drizzle client (PGlite), same schema
    │   └── schema/users.test.ts          # new — schema smoke test (insert/select via PGlite)
    ├── lib/
    │   ├── mailer.ts                     # new — SMTP mailer (nodemailer), injectable transport
    │   ├── mailer.test.ts                # new
    │   ├── rate-limit.ts                 # new — Postgres-backed sliding-window limiter
    │   ├── rate-limit.test.ts            # new
    │   ├── auth.ts                       # new — Better Auth server instance
    │   ├── auth.test.ts                  # new — construction smoke test
    │   ├── logger.ts                     # new — structured logger, field allow-list
    │   └── logger.test.ts                # new
    ├── app.ts                            # new — Hono app: health route, auth mount, logger middleware
    ├── app.test.ts                       # new — health check + auth-route mount test
    ├── app.auth-flow.test.ts             # new — the ticket's four required flow tests
    └── index.ts                          # new — Node entrypoint (`@hono/node-server` `serve()`)
```

Root-level files touched:

- `.env.example` — add `BETTER_AUTH_SECRET`, `APP_URL`, `SMTP_FROM`.
- `package.json` — add `db:generate`, `db:migrate` scripts (proxy into `apps/api`).
- `pnpm-lock.yaml` — updated by `pnpm install`.

---

### Task 1: Scaffold `apps/api` — package, tsconfig, env, minimal Hono app

**Files:**

- Create: `apps/api/package.json`
- Create: `apps/api/tsconfig.json`
- Create: `apps/api/src/env.ts`
- Create: `apps/api/src/app.ts`
- Create: `apps/api/src/app.test.ts`
- Create: `apps/api/src/index.ts`
- Modify: `.env.example` (root)

**Interfaces:**

- Produces: `env` (typed object) exported from `apps/api/src/env.ts`, fields `{ PORT: number; DATABASE_URL: string; MAILER: 'smtp' | 'ses'; SMTP_HOST: string; SMTP_PORT: number; SMTP_FROM: string; BETTER_AUTH_SECRET: string; APP_URL: string }`.
- Produces: `createApp(): Hono` from `apps/api/src/app.ts` — later tasks mount routes onto the instance it returns.

- [ ] **Step 1: Create `apps/api/package.json`**

```json
{
  "name": "@wayline/api",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "main": "./src/index.ts",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc -p tsconfig.json --outDir dist",
    "lint": "eslint . --max-warnings=0",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate"
  },
  "dependencies": {
    "@wayline/config": "workspace:*",
    "@wayline/shared-types": "workspace:*",
    "hono": "^4.6.14",
    "@hono/node-server": "^1.13.7",
    "better-auth": "^1.2.2",
    "drizzle-orm": "^0.36.4",
    "postgres": "^3.4.5",
    "nodemailer": "^6.9.16",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "drizzle-kit": "^0.28.1",
    "@electric-sql/pglite": "^0.2.13",
    "@types/nodemailer": "^6.4.16",
    "tsx": "^4.19.2"
  }
}
```

- [ ] **Step 2: Create `apps/api/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist"
  },
  "include": ["src/**/*.ts", "drizzle.config.ts"]
}
```

- [ ] **Step 3: Install dependencies**

Run: `pnpm install`
Expected: lockfile updates, no errors; `apps/api` now resolves `@wayline/config`/`@wayline/shared-types` via workspace symlinks.

- [ ] **Step 4: Add API env vars to root `.env.example`**

Append to `/Users/dhrimilmendapara/Documents/flow-recorder/.env.example`:

```bash
# apps/api — Better Auth
APP_URL=http://localhost:3000
BETTER_AUTH_SECRET=dev-only-change-me-32-chars-min

# Mailer sender identity (used by both smtp and ses mailer modes)
SMTP_FROM="Wayline <no-reply@wayline.app>"

# apps/api server port
PORT=3000
```

- [ ] **Step 5: Write `apps/api/src/env.ts`**

```ts
import { createEnv, mailerModeSchema } from '@wayline/config';
import { z } from 'zod';

const schema = z.object({
  PORT: z.coerce.number().int().positive(),
  DATABASE_URL: z.string().url(),
  MAILER: mailerModeSchema,
  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.coerce.number().int().positive(),
  SMTP_FROM: z.string().min(1),
  BETTER_AUTH_SECRET: z.string().min(32),
  APP_URL: z.string().url(),
});

/** Zod-validated process env for apps/api — boot fails loudly on a missing/invalid var. */
export const env = createEnv(schema);
export type Env = z.infer<typeof schema>;
```

- [ ] **Step 6: Write the failing test for the app scaffold**

`apps/api/src/app.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { createApp } from './app';

describe('createApp', () => {
  it('responds 200 on GET /health', async () => {
    const app = createApp();
    const res = await app.request('/health');

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: 'ok' });
  });

  it('returns 404 for an unregistered route', async () => {
    const app = createApp();
    const res = await app.request('/does-not-exist');

    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 7: Run test to verify it fails**

Run: `pnpm --filter @wayline/api test -- app.test.ts`
Expected: FAIL — `./app` has no exported member `createApp` (file doesn't exist yet).

- [ ] **Step 8: Write `apps/api/src/app.ts`**

```ts
import { Hono } from 'hono';

/** Builds the Wayline API Hono app — routes are mounted onto the returned instance by later modules. */
export function createApp(): Hono {
  const app = new Hono();

  app.get('/health', (c) => c.json({ status: 'ok' }));

  return app;
}
```

- [ ] **Step 9: Run test to verify it passes**

Run: `pnpm --filter @wayline/api test -- app.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 10: Write `apps/api/src/index.ts`**

```ts
import { serve } from '@hono/node-server';
import { createApp } from './app';
import { env } from './env';

const app = createApp();

serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  console.log(`apps/api listening on http://localhost:${info.port}`);
});
```

- [ ] **Step 11: Commit**

```bash
git add apps/api/package.json apps/api/tsconfig.json apps/api/src/env.ts apps/api/src/app.ts apps/api/src/app.test.ts apps/api/src/index.ts .env.example pnpm-lock.yaml
git commit -m "feat(WAYLI-27): scaffold apps/api with health route"
```

---

### Task 2: Drizzle schema and DB clients (runtime + test)

**Files:**

- Create: `apps/api/src/db/schema/custom-types.ts`
- Create: `apps/api/src/db/schema/users.ts`
- Create: `apps/api/src/db/schema/auth.ts`
- Create: `apps/api/src/db/schema/rate-limit.ts`
- Create: `apps/api/src/db/client.ts`
- Create: `apps/api/src/db/client.test.ts`
- Create: `apps/api/src/db/test-client.ts`
- Create: `apps/api/src/db/schema/users.test.ts`
- Create: `apps/api/drizzle.config.ts`
- Modify: root `package.json` (add `db:generate`/`db:migrate` proxy scripts)

**Interfaces:**

- Consumes: `env.DATABASE_URL` from `apps/api/src/env.ts` (Task 1).
- Produces: `schema` object `{ users, session, account, verification, rateLimitAttempts }` from a barrel — Task 4/5/6 import table refs from here.
- Produces: `createDb(connectionString: string): NodePgDatabase<typeof schema>` from `client.ts` (runtime).
- Produces: `createTestDb(): Promise<{ db: PgliteDatabase<typeof schema>; close(): Promise<void> }>` from `test-client.ts` — every later test task uses this instead of a Docker Postgres.

- [ ] **Step 1: Write `apps/api/src/db/schema/custom-types.ts`**

```ts
import { customType } from 'drizzle-orm/pg-core';

/**
 * Postgres `citext` (case-insensitive text) — used for email/slug columns per
 * docs/04-data-model.md §2. Drizzle has no first-class citext type.
 */
export const citext = customType<{ data: string }>({
  dataType() {
    return 'citext';
  },
});
```

- [ ] **Step 2: Write `apps/api/src/db/schema/users.ts`**

```ts
import { sql } from 'drizzle-orm';
import { boolean, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { citext } from './custom-types';

// Better Auth's core `user` model requires `emailVerified: boolean`; docs/04's
// `email_verified_at: timestamptz` intent is preserved via emailVerifiedAt, set
// alongside emailVerified in the same write (see lib/auth.ts databaseHooks).
export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: citext('email').notNull().unique(),
  name: text('name'),
  avatarUrl: text('avatar_url'),
  emailVerified: boolean('email_verified').notNull().default(false),
  emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});
```

- [ ] **Step 3: Write `apps/api/src/db/schema/auth.ts`**

```ts
import { sql } from 'drizzle-orm';
import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { users } from './users';

// Better Auth's Drizzle adapter owns these three tables as-is (docs/04-data-model.md
// §2: "Better Auth also owns sessions ... and accounts ... use its Drizzle adapter
// tables as-is") — field names/shapes follow Better Auth's core schema contract.
export const session = pgTable('session', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  password: text('password'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

// Magic-link tokens live here as `value` (Better Auth stores/verifies the token
// hash internally); docs/09-security-privacy.md §3: "Magic-link tokens: RDS,
// hashed, purged at expiry."
export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});
```

- [ ] **Step 4: Write `apps/api/src/db/schema/rate-limit.ts`**

```ts
import { sql } from 'drizzle-orm';
import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';

/** One row per rate-limited attempt (e.g. `magic-link:email:<address>`) — see lib/rate-limit.ts. */
export const rateLimitAttempts = pgTable('rate_limit_attempts', {
  id: text('id').primaryKey(),
  key: text('key').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});
```

- [ ] **Step 5: Create the schema barrel**

Create `apps/api/src/db/schema/index.ts`:

```ts
export * from './auth';
export * from './rate-limit';
export * from './users';
```

- [ ] **Step 6: Write `apps/api/src/db/client.ts`**

```ts
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

/** Runtime Drizzle client backed by postgres-js — one connection pool per process. */
export function createDb(connectionString: string): PostgresJsDatabase<typeof schema> {
  const client = postgres(connectionString);
  return drizzle(client, { schema });
}
```

- [ ] **Step 7: Write `apps/api/src/db/test-client.ts`**

```ts
import { drizzle, type PgliteDatabase } from 'drizzle-orm/pglite';
import { PGlite } from '@electric-sql/pglite';
import { sql } from 'drizzle-orm';
import * as schema from './schema';

/**
 * Test-only Drizzle client backed by PGlite (embedded Postgres, WASM) instead of a
 * Docker service — CI's `quality` job (pnpm test:coverage) has no Postgres container,
 * so any test needing real Postgres semantics must not depend on one being reachable.
 */
export async function createTestDb(): Promise<{
  db: PgliteDatabase<typeof schema>;
  close: () => Promise<void>;
}> {
  const client = new PGlite();
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

  return { db, close: () => client.close() };
}
```

- [ ] **Step 8: Write the schema smoke test**

`apps/api/src/db/schema/users.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { createTestDb } from '../test-client';
import { users } from './users';

describe('users schema', () => {
  it('inserts and reads back a user row with case-insensitive email lookup', async () => {
    const { db, close } = await createTestDb();

    try {
      await db.insert(users).values({ id: 'user_1', email: 'Person@Example.com', name: 'Ada' });
      const [found] = await db.select().from(users);

      expect(found.email).toBe('Person@Example.com');
      expect(found.emailVerified).toBe(false);
    } finally {
      await close();
    }
  });

  it('rejects a second user row with the same email in a different case (citext uniqueness)', async () => {
    const { db, close } = await createTestDb();

    try {
      await db.insert(users).values({ id: 'user_1', email: 'person@example.com' });

      await expect(
        db.insert(users).values({ id: 'user_2', email: 'PERSON@EXAMPLE.COM' }),
      ).rejects.toThrow();
    } finally {
      await close();
    }
  });
});
```

- [ ] **Step 9: Run test to verify it passes**

Run: `pnpm --filter @wayline/api test -- users.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 10: Write `apps/api/src/db/client.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { createDb } from './client';

describe('createDb', () => {
  it('returns a Drizzle instance without throwing given a well-formed connection string', () => {
    expect(() => createDb('postgres://wayline:wayline@localhost:5432/wayline')).not.toThrow();
  });

  it('throws on a malformed connection string', () => {
    expect(() => createDb('not-a-connection-string')).toThrow();
  });
});
```

- [ ] **Step 11: Run test to verify it passes**

Run: `pnpm --filter @wayline/api test -- client.test.ts`
Expected: PASS (2 tests) — postgres-js validates the URL shape synchronously without connecting.

- [ ] **Step 12: Write `apps/api/drizzle.config.ts`**

```ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema/index.ts',
  out: './drizzle',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgres://wayline:wayline@localhost:5432/wayline',
  },
});
```

- [ ] **Step 13: Add root `db:generate`/`db:migrate` proxy scripts**

Modify root `/Users/dhrimilmendapara/Documents/flow-recorder/package.json` `scripts` block — add after `"test:e2e"`:

```json
    "db:generate": "pnpm --filter @wayline/api db:generate",
    "db:migrate": "pnpm --filter @wayline/api db:migrate",
```

- [ ] **Step 14: Generate and sanity-check the initial migration**

Run: `pnpm db:generate`
Expected: a new SQL file under `apps/api/drizzle/` creating `users`, `session`, `account`, `verification`, `rate_limit_attempts`. Read the generated SQL once to confirm it matches the table defs above (Drizzle Kit sometimes needs an explicit `CREATE EXTENSION IF NOT EXISTS citext;` prepended manually — add it to the generated file if absent).

- [ ] **Step 15: Commit**

```bash
git add apps/api/src/db apps/api/drizzle.config.ts apps/api/drizzle package.json pnpm-lock.yaml
git commit -m "feat(WAYLI-27): add Drizzle schema for users, Better Auth tables, rate limits"
```

---

### Task 3: SMTP mailer (Mailpit-backed, injectable transport)

**Files:**

- Create: `apps/api/src/lib/mailer.ts`
- Create: `apps/api/src/lib/mailer.test.ts`

**Interfaces:**

- Consumes: `env.SMTP_HOST`, `env.SMTP_PORT`, `env.SMTP_FROM` (Task 1).
- Produces: `createMailer(config: { host: string; port: number; from: string }, transportFactory?: typeof nodemailer.createTransport): Mailer` where `Mailer = { send(message: { to: string; subject: string; html: string }): Promise<void> }` — consumed by `lib/auth.ts` (Task 5).

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it, vi } from 'vitest';
import { createMailer } from './mailer';

describe('createMailer', () => {
  it('sends mail through the configured transport with the configured from address', async () => {
    const sendMail = vi.fn().mockResolvedValue({ messageId: 'abc' });
    const transportFactory = vi.fn().mockReturnValue({ sendMail });

    const mailer = createMailer(
      { host: 'localhost', port: 1025, from: 'Wayline <no-reply@wayline.app>' },
      transportFactory,
    );
    await mailer.send({ to: 'person@example.com', subject: 'Sign in', html: '<p>link</p>' });

    expect(transportFactory).toHaveBeenCalledWith({ host: 'localhost', port: 1025, secure: false });
    expect(sendMail).toHaveBeenCalledWith({
      from: 'Wayline <no-reply@wayline.app>',
      to: 'person@example.com',
      subject: 'Sign in',
      html: '<p>link</p>',
    });
  });

  it('propagates a transport failure instead of swallowing it', async () => {
    const sendMail = vi.fn().mockRejectedValue(new Error('smtp connection refused'));
    const transportFactory = vi.fn().mockReturnValue({ sendMail });

    const mailer = createMailer(
      { host: 'localhost', port: 1025, from: 'Wayline <no-reply@wayline.app>' },
      transportFactory,
    );

    await expect(
      mailer.send({ to: 'person@example.com', subject: 'Sign in', html: '<p>link</p>' }),
    ).rejects.toThrow('smtp connection refused');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @wayline/api test -- mailer.test.ts`
Expected: FAIL — `./mailer` has no exported member `createMailer`.

- [ ] **Step 3: Write `apps/api/src/lib/mailer.ts`**

```ts
import nodemailer from 'nodemailer';

export type MailerConfig = { host: string; port: number; from: string };
export type MailMessage = { to: string; subject: string; html: string };
export type Mailer = { send(message: MailMessage): Promise<void> };

/**
 * SMTP mailer — points at Mailpit locally (docs/08-local-dev.md §2) and any SMTP-
 * compatible relay in other environments. The `transportFactory` param exists purely
 * so tests can inject a fake transport instead of opening a real socket.
 */
export function createMailer(
  config: MailerConfig,
  transportFactory: typeof nodemailer.createTransport = nodemailer.createTransport,
): Mailer {
  const transport = transportFactory({ host: config.host, port: config.port, secure: false });

  return {
    async send(message) {
      await transport.sendMail({ from: config.from, ...message });
    },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @wayline/api test -- mailer.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/lib/mailer.ts apps/api/src/lib/mailer.test.ts
git commit -m "feat(WAYLI-27): add SMTP mailer with injectable transport"
```

---

### Task 4: Postgres-backed rate limiter

**Files:**

- Create: `apps/api/src/lib/rate-limit.ts`
- Create: `apps/api/src/lib/rate-limit.test.ts`

**Interfaces:**

- Consumes: `rateLimitAttempts` table from `db/schema/rate-limit.ts` (Task 2), `createTestDb` from `db/test-client.ts` (Task 2).
- Produces: `checkAndRecordAttempt(db: DrizzleLike, key: string, opts: { max: number; windowMs: number }): Promise<{ allowed: boolean }>` — consumed by `lib/auth.ts` (Task 5) to enforce the per-email magic-link limit.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { createTestDb } from '../db/test-client';
import { checkAndRecordAttempt } from './rate-limit';

describe('checkAndRecordAttempt', () => {
  it('allows attempts up to the configured max within the window', async () => {
    const { db, close } = await createTestDb();

    try {
      const results = await Promise.all(
        Array.from({ length: 3 }, () =>
          checkAndRecordAttempt(db, 'magic-link:email:person@example.com', {
            max: 3,
            windowMs: 60_000,
          }),
        ),
      );

      expect(results.every((r) => r.allowed)).toBe(true);
    } finally {
      await close();
    }
  });

  it('rejects the attempt once the max is exceeded within the window', async () => {
    const { db, close } = await createTestDb();
    const key = 'magic-link:email:person@example.com';

    try {
      for (let i = 0; i < 3; i += 1) {
        await checkAndRecordAttempt(db, key, { max: 3, windowMs: 60_000 });
      }
      const fourth = await checkAndRecordAttempt(db, key, { max: 3, windowMs: 60_000 });

      expect(fourth.allowed).toBe(false);
    } finally {
      await close();
    }
  });

  it('scopes the limit per key — a different key is unaffected by another key’s attempts', async () => {
    const { db, close } = await createTestDb();

    try {
      for (let i = 0; i < 3; i += 1) {
        await checkAndRecordAttempt(db, 'magic-link:email:a@example.com', {
          max: 3,
          windowMs: 60_000,
        });
      }
      const other = await checkAndRecordAttempt(db, 'magic-link:email:b@example.com', {
        max: 3,
        windowMs: 60_000,
      });

      expect(other.allowed).toBe(true);
    } finally {
      await close();
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @wayline/api test -- rate-limit.test.ts`
Expected: FAIL — `./rate-limit` has no exported member `checkAndRecordAttempt`.

- [ ] **Step 3: Write `apps/api/src/lib/rate-limit.ts`**

```ts
import { randomUUID } from 'node:crypto';
import { and, gte, count, eq } from 'drizzle-orm';
import type { PgliteDatabase } from 'drizzle-orm/pglite';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '../db/schema';
import { rateLimitAttempts } from '../db/schema/rate-limit';

type DrizzleLike = PostgresJsDatabase<typeof schema> | PgliteDatabase<typeof schema>;

/**
 * Sliding-window limiter: counts rows for `key` created within the last `windowMs`,
 * then records this attempt regardless of outcome (docs/09-security-privacy.md §2 —
 * auth endpoints are rate-limited per email/IP). Postgres-backed per docs/03-architecture.md
 * §7 ("Rate limiting ... Postgres-backed at v1; Redis only if it becomes hot").
 */
export async function checkAndRecordAttempt(
  db: DrizzleLike,
  key: string,
  opts: { max: number; windowMs: number },
): Promise<{ allowed: boolean }> {
  const windowStart = new Date(Date.now() - opts.windowMs);

  const [{ value: recent }] = await db
    .select({ value: count() })
    .from(rateLimitAttempts)
    .where(and(eq(rateLimitAttempts.key, key), gte(rateLimitAttempts.createdAt, windowStart)));

  await db.insert(rateLimitAttempts).values({ id: randomUUID(), key });

  return { allowed: recent < opts.max };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @wayline/api test -- rate-limit.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/lib/rate-limit.ts apps/api/src/lib/rate-limit.test.ts
git commit -m "feat(WAYLI-27): add Postgres-backed per-key rate limiter"
```

---

### Task 5: Structured logger with field allow-list

**Files:**

- Create: `apps/api/src/lib/logger.ts`
- Create: `apps/api/src/lib/logger.test.ts`

**Interfaces:**

- Produces: `logSafe(event: string, fields: Record<string, string | number | boolean>): void` — consumed by `app.ts` (Task 7) request-logging middleware and by `lib/auth.ts` (Task 6) database hooks.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it, vi, afterEach } from 'vitest';
import { logSafe } from './logger';

describe('logSafe', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('logs a JSON line containing only the event name and allow-listed fields', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});

    logSafe('auth.magic_link.requested', {
      route: '/api/auth/sign-in/magic-link',
      statusCode: 200,
    });

    expect(spy).toHaveBeenCalledTimes(1);
    const line = JSON.parse(spy.mock.calls[0][0] as string);
    expect(line).toEqual({
      event: 'auth.magic_link.requested',
      route: '/api/auth/sign-in/magic-link',
      statusCode: 200,
    });
  });

  it('drops a field whose key is not on the allow-list instead of logging it', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});

    logSafe('auth.magic_link.requested', {
      route: '/api/auth/sign-in/magic-link',
      // @ts-expect-error — exercising the runtime guard against a disallowed key
      email: 'person@example.com',
    });

    const line = JSON.parse(spy.mock.calls[0][0] as string);
    expect(line).not.toHaveProperty('email');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @wayline/api test -- logger.test.ts`
Expected: FAIL — `./logger` has no exported member `logSafe`.

- [ ] **Step 3: Write `apps/api/src/lib/logger.ts`**

```ts
// Explicit allow-list, not a deny-list — docs/09-security-privacy.md §2: "structured
// logs with an explicit field allow-list; no request bodies, no screenshots, no email
// contents." Adding a field here is a deliberate decision, not an accident of what a
// caller happened to pass in.
const ALLOWED_FIELDS = new Set(['route', 'statusCode', 'method', 'durationMs', 'userId']);

type SafeFields = Partial<
  Record<'route' | 'statusCode' | 'method' | 'durationMs' | 'userId', string | number | boolean>
>;

/** Emits one JSON log line containing only the event name and allow-listed fields. */
export function logSafe(event: string, fields: SafeFields): void {
  const safeFields = Object.fromEntries(
    Object.entries(fields).filter(([key]) => ALLOWED_FIELDS.has(key)),
  );

  console.log(JSON.stringify({ event, ...safeFields }));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @wayline/api test -- logger.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/lib/logger.ts apps/api/src/lib/logger.test.ts
git commit -m "feat(WAYLI-27): add allow-listed structured logger"
```

---

### Task 6: Better Auth server instance (magic link, sessions, rate limit wiring)

**Files:**

- Create: `apps/api/src/lib/auth.ts`
- Create: `apps/api/src/lib/auth.test.ts`

**Interfaces:**

- Consumes: `createDb`/schema (Task 2), `createMailer`/`Mailer` (Task 3), `checkAndRecordAttempt` (Task 4), `logSafe` (Task 5), `env` (Task 1).
- Produces: `createAuth(deps: { db: DrizzleLike; mailer: Mailer; secret: string; baseURL: string }): ReturnType<typeof betterAuth>` — consumed by `app.ts` (Task 7) and directly by the flow tests (Task 8).

**Note before starting:** Better Auth's plugin/adapter surface moves fast. Before writing Step 3, run `pnpm --filter @wayline/api exec tsc --noEmit --listFiles 2>/dev/null | grep better-auth` is not reliable — instead open `node_modules/better-auth/dist/index.d.ts` and `node_modules/better-auth/dist/plugins/magic-link/index.d.ts` (paths may differ slightly by version) to confirm: the `magicLink()` option names (`expiresIn`, `sendMagicLink`), the verify route path, and whether `rateLimit.customRules` keys are literal paths or route IDs. Adjust the code below to match if the installed version differs — the tests in Task 8 are the actual source of truth once they're running against the real package.

- [ ] **Step 1: Write the failing construction test**

```ts
import { describe, expect, it, vi } from 'vitest';
import { createTestDb } from '../db/test-client';
import { createAuth } from './auth';

describe('createAuth', () => {
  it('constructs a Better Auth instance exposing a handler', async () => {
    const { db, close } = await createTestDb();

    try {
      const auth = createAuth({
        db,
        mailer: { send: vi.fn().mockResolvedValue(undefined) },
        secret: 'a'.repeat(32),
        baseURL: 'http://localhost:3000',
      });

      expect(auth.handler).toBeTypeOf('function');
    } finally {
      await close();
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @wayline/api test -- auth.test.ts`
Expected: FAIL — `./auth` has no exported member `createAuth`.

- [ ] **Step 3: Write `apps/api/src/lib/auth.ts`**

```ts
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { magicLink } from 'better-auth/plugins';
import type { PgliteDatabase } from 'drizzle-orm/pglite';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '../db/schema';
import type { Mailer } from './mailer';
import { checkAndRecordAttempt } from './rate-limit';
import { logSafe } from './logger';

type DrizzleLike = PostgresJsDatabase<typeof schema> | PgliteDatabase<typeof schema>;

const MAGIC_LINK_EXPIRY_SECONDS = 60 * 15; // docs/09-security-privacy.md §2: 15-min expiry
const SESSION_EXPIRY_SECONDS = 60 * 60 * 24 * 30; // 30d rolling (docs/09-security-privacy.md §2)
const SESSION_UPDATE_AGE_SECONDS = 60 * 60 * 24; // refresh the rolling window once per day

/**
 * Builds the Better Auth server instance: magic-link-only sign-in (no password, no
 * OAuth — Google deferred to WAYLI-90), Postgres sessions, and a per-email rate limit
 * layered on top of Better Auth's own per-IP limiting.
 */
export function createAuth(deps: {
  db: DrizzleLike;
  mailer: Mailer;
  secret: string;
  baseURL: string;
}) {
  return betterAuth({
    secret: deps.secret,
    baseURL: deps.baseURL,
    database: drizzleAdapter(deps.db, {
      provider: 'pg',
      schema: {
        user: schema.users,
        session: schema.session,
        account: schema.account,
        verification: schema.verification,
      },
    }),
    emailAndPassword: { enabled: false },
    session: {
      expiresIn: SESSION_EXPIRY_SECONDS,
      updateAge: SESSION_UPDATE_AGE_SECONDS,
    },
    rateLimit: {
      enabled: true,
      window: 60,
      max: 10,
      customRules: {
        '/sign-in/magic-link': { window: 60, max: 5 },
      },
    },
    plugins: [
      magicLink({
        expiresIn: MAGIC_LINK_EXPIRY_SECONDS,
        sendMagicLink: async ({ email, url }) => {
          const { allowed } = await checkAndRecordAttempt(deps.db, `magic-link:email:${email}`, {
            max: 3,
            windowMs: 60_000,
          });

          if (!allowed) {
            logSafe('auth.magic_link.rate_limited', { route: '/sign-in/magic-link' });
            throw new Error('rate_limited');
          }

          logSafe('auth.magic_link.sent', { route: '/sign-in/magic-link' });
          await deps.mailer.send({
            to: email,
            subject: 'Sign in to Wayline',
            html: `<p>Click to sign in: <a href="${url}">${url}</a></p><p>This link expires in 15 minutes and can only be used once.</p>`,
          });
        },
      }),
    ],
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @wayline/api test -- auth.test.ts`
Expected: PASS (1 test) — adjust option names per the Step-0 note above if the installed `better-auth` version's types disagree.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/lib/auth.ts apps/api/src/lib/auth.test.ts
git commit -m "feat(WAYLI-27): configure Better Auth magic-link, sessions, rate limiting"
```

---

### Task 7: Mount Better Auth on the Hono app with request logging

**Files:**

- Modify: `apps/api/src/app.ts`
- Modify: `apps/api/src/app.test.ts`
- Modify: `apps/api/src/index.ts`

**Interfaces:**

- Consumes: `createAuth` (Task 6), `createDb` (Task 2), `createMailer` (Task 3), `logSafe` (Task 5), `env` (Task 1).
- Produces: `createApp(auth: ReturnType<typeof createAuth>): Hono` — signature changes from Task 1 (now takes the auth instance so tests can inject a PGlite-backed one); consumed directly by Task 8's flow tests.

- [ ] **Step 1: Update the app test for the new signature and auth mount**

Replace `apps/api/src/app.test.ts` in full:

```ts
import { describe, expect, it, vi } from 'vitest';
import { createTestDb } from './db/test-client';
import { createAuth } from './lib/auth';
import { createApp } from './app';

async function buildTestApp() {
  const { db, close } = await createTestDb();
  const auth = createAuth({
    db,
    mailer: { send: vi.fn().mockResolvedValue(undefined) },
    secret: 'a'.repeat(32),
    baseURL: 'http://localhost:3000',
  });

  return { app: createApp(auth), close };
}

describe('createApp', () => {
  it('responds 200 on GET /health', async () => {
    const { app, close } = await buildTestApp();

    try {
      const res = await app.request('/health');
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ status: 'ok' });
    } finally {
      await close();
    }
  });

  it('returns 404 for an unregistered route', async () => {
    const { app, close } = await buildTestApp();

    try {
      const res = await app.request('/does-not-exist');
      expect(res.status).toBe(404);
    } finally {
      await close();
    }
  });

  it('routes /api/auth/** to the Better Auth handler instead of 404ing', async () => {
    const { app, close } = await buildTestApp();

    try {
      const res = await app.request('/api/auth/sign-in/magic-link', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: 'person@example.com' }),
      });
      expect(res.status).not.toBe(404);
    } finally {
      await close();
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @wayline/api test -- app.test.ts`
Expected: FAIL — `createApp` still takes zero arguments and has no auth mount.

- [ ] **Step 3: Rewrite `apps/api/src/app.ts`**

```ts
import { Hono } from 'hono';
import type { createAuth } from './lib/auth';
import { logSafe } from './lib/logger';

type Auth = ReturnType<typeof createAuth>;

/** Builds the Wayline API Hono app, mounting Better Auth's routes under /api/auth. */
export function createApp(auth: Auth): Hono {
  const app = new Hono();

  app.use('*', async (c, next) => {
    const start = Date.now();
    await next();
    logSafe('http.request', {
      route: c.req.path,
      method: c.req.method,
      statusCode: c.res.status,
      durationMs: Date.now() - start,
    });
  });

  app.get('/health', (c) => c.json({ status: 'ok' }));

  app.on(['GET', 'POST'], '/api/auth/*', async (c) => {
    try {
      return await auth.handler(c.req.raw);
    } catch (error) {
      if (error instanceof Error && error.message === 'rate_limited') {
        return c.json({ error: 'rate_limited' }, 429);
      }
      throw error;
    }
  });

  return app;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @wayline/api test -- app.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Update `apps/api/src/index.ts`**

```ts
import { serve } from '@hono/node-server';
import { createApp } from './app';
import { createAuth } from './lib/auth';
import { createDb } from './db/client';
import { createMailer } from './lib/mailer';
import { env } from './env';

const db = createDb(env.DATABASE_URL);
const mailer = createMailer({ host: env.SMTP_HOST, port: env.SMTP_PORT, from: env.SMTP_FROM });
const auth = createAuth({ db, mailer, secret: env.BETTER_AUTH_SECRET, baseURL: env.APP_URL });
const app = createApp(auth);

serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  console.log(`apps/api listening on http://localhost:${info.port}`);
});
```

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/app.ts apps/api/src/app.test.ts apps/api/src/index.ts
git commit -m "feat(WAYLI-27): mount Better Auth routes with safe request logging"
```

---

### Task 8: End-to-end magic-link flow tests (the ticket's required test list)

**Files:**

- Create: `apps/api/src/app.auth-flow.test.ts`

**Interfaces:**

- Consumes: `createApp` (Task 7), `createAuth` (Task 6), `createTestDb` (Task 2) — no new interfaces produced; this task only asserts behavior.

- [ ] **Step 1: Write the magic-link success test**

```ts
import { describe, expect, it, vi } from 'vitest';
import { eq } from 'drizzle-orm';
import { createTestDb } from './db/test-client';
import { createAuth } from './lib/auth';
import { createApp } from './app';
import { verification } from './db/schema/auth';

async function buildHarness() {
  const { db, close } = await createTestDb();
  const sentMail: { to: string; html: string }[] = [];
  const mailer = {
    send: vi.fn(async (message: { to: string; subject: string; html: string }) => {
      sentMail.push({ to: message.to, html: message.html });
    }),
  };
  const auth = createAuth({ db, mailer, secret: 'a'.repeat(32), baseURL: 'http://localhost:3000' });
  const app = createApp(auth);

  return { app, db, sentMail, close };
}

function extractMagicLinkUrl(html: string): string {
  const match = html.match(/href="([^"]+)"/);
  if (!match) throw new Error('no link found in mail body');
  return match[1];
}

describe('passwordless auth flow', () => {
  it('completes sign-in: request a magic link, verify it, and receive a session cookie', async () => {
    const { app, sentMail, close } = await buildHarness();

    try {
      const requestRes = await app.request('/api/auth/sign-in/magic-link', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: 'person@example.com' }),
      });
      expect(requestRes.status).toBe(200);
      expect(sentMail).toHaveLength(1);

      const magicLinkUrl = extractMagicLinkUrl(sentMail[0].html);
      const verifyPath = magicLinkUrl.replace('http://localhost:3000', '');

      const verifyRes = await app.request(verifyPath);
      expect(verifyRes.status).toBeLessThan(400);
      expect(verifyRes.headers.get('set-cookie')).toBeTruthy();
    } finally {
      await close();
    }
  });

  it('rejects an expired magic-link token', async () => {
    const { app, db, sentMail, close } = await buildHarness();

    try {
      await app.request('/api/auth/sign-in/magic-link', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: 'expired@example.com' }),
      });

      // Force the stored verification row into the past instead of waiting 15 real minutes.
      await db.update(verification).set({ expiresAt: new Date(Date.now() - 1000) });

      const magicLinkUrl = extractMagicLinkUrl(sentMail[0].html);
      const verifyPath = magicLinkUrl.replace('http://localhost:3000', '');
      const verifyRes = await app.request(verifyPath);

      expect(verifyRes.status).toBeGreaterThanOrEqual(400);
    } finally {
      await close();
    }
  });

  it('rejects reusing a magic-link token a second time', async () => {
    const { app, sentMail, close } = await buildHarness();

    try {
      await app.request('/api/auth/sign-in/magic-link', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: 'reuse@example.com' }),
      });

      const magicLinkUrl = extractMagicLinkUrl(sentMail[0].html);
      const verifyPath = magicLinkUrl.replace('http://localhost:3000', '');

      const first = await app.request(verifyPath);
      expect(first.status).toBeLessThan(400);

      const second = await app.request(verifyPath);
      expect(second.status).toBeGreaterThanOrEqual(400);
    } finally {
      await close();
    }
  });

  it('rejects magic-link requests once the per-email rate limit is exceeded', async () => {
    const { app, close } = await buildHarness();
    const requestOnce = () =>
      app.request('/api/auth/sign-in/magic-link', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: 'rate-limited@example.com' }),
      });

    try {
      await requestOnce();
      await requestOnce();
      await requestOnce();
      const fourth = await requestOnce();

      expect(fourth.status).toBe(429);
    } finally {
      await close();
    }
  });
});
```

- [ ] **Step 2: Run tests to verify they fail or reveal API mismatches**

Run: `pnpm --filter @wayline/api test -- app.auth-flow.test.ts`
Expected: Likely fails on first run — this is the point where Better Auth's actual magic-link request/verify route shapes get confirmed against reality. Fix `lib/auth.ts` / `app.ts` route paths per the installed package's types (see Task 6's pre-flight note), not this test file, unless the test itself has a wrong assumption.

- [ ] **Step 3: Iterate until all four tests pass**

Run: `pnpm --filter @wayline/api test -- app.auth-flow.test.ts`
Expected: PASS (4 tests) — magic-link success, expired-token rejection, reused-token rejection, rate-limit rejection all green.

- [ ] **Step 4: Run the full apps/api suite with coverage**

Run: `pnpm --filter @wayline/api test`
Then: `pnpm test:coverage` (full-repo gate, since coverage is root-level per `vitest.config.ts`)
Expected: all apps/api tests pass; coverage thresholds (95% lines/branches/functions/statements) hold repo-wide.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/app.auth-flow.test.ts
git commit -m "test(WAYLI-27): cover magic-link success, expiry, reuse, and rate-limit rejection"
```

---

## Self-Review

**1. Spec coverage:**

- "Configure Better Auth with magic links" → Task 6.
- "server sessions" → Task 6 (`session.expiresIn`/`updateAge`), verified in Task 8's success test (`set-cookie` header).
- "expiry" → magic-link 15-min expiry (Task 6), tested in Task 8; session 30-day rolling expiry (Task 6).
- "rate limits" → per-email (Task 4, wired in Task 6) + per-IP (Better Auth's own `rateLimit.customRules`, Task 6); tested in Task 8.
- "safe logs" → Task 5 (allow-list logger), wired into request middleware and auth events in Task 7/6.
- "Google OAuth is deliberately deferred" → not implemented anywhere in this plan; `emailAndPassword: { enabled: false }` and no OAuth plugin registered.
- "Local Mailpit and dev authentication complete without passwords or token exposure" → `createMailer` targets SMTP host/port (Mailpit locally per `.env.example`); no password fields on the `users` table; tokens never logged (`logSafe` allow-list excludes them) or returned in API responses beyond the one-time link Better Auth itself emails.
- "Magic-link success; expired/reused token and rate-limit rejection" tests → all four in Task 8.
- "Closeout proof: passing CI and coverage ... merged PR link" → handled by the wayline-workflow skill's steps 5–8 (verification, PR, Plane update), outside this plan's scope by design (this skill is intentionally thin per its own doc).

**2. Placeholder scan:** No TBD/"add error handling later" phrasing. The one open item (Task 6's pre-flight note) is a verification instruction against a real installed package, not a content placeholder — every code block is complete and runnable as written.

**3. Type consistency:** `DrizzleLike` (Task 4, 6) matches the return types of `createDb` (Task 2) and `createTestDb` (Task 2) exactly. `Mailer`/`MailMessage` (Task 3) match the `mailer.send(...)` call shape used in Task 6 and the harness in Task 8. `createApp(auth: Auth)` signature is introduced once (Task 7) and used consistently in Task 8; Task 1's zero-arg version is explicitly superseded, not left dangling (Task 7 Step 1 replaces `app.test.ts` in full).

---

Plan complete and saved to `docs/superpowers/plans/2026-07-13-wayli-27-passwordless-auth.md`. Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

**Which approach?**
