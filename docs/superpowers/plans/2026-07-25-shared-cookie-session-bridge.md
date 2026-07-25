# Shared Cookie Session Bridge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the extension a real identity that follows the dashboard's session, sharing the `api.wayline.app` cookie, never storing tokens (WAYLI-34).

**Architecture:** `apps/api`'s Better Auth cookie gets `SameSite=None; Secure` (explicit, not auto-derived) plus a new origin/CSRF guard for `chrome-extension://` callers. `apps/extension` gains a `lib/session/` module that fetches identity from the two existing session-gated endpoints and caches it in `storage.session`, triggered by `session-ready`/`session-ended` pings and independently by a `cookies.onChanged` watcher. `apps/dashboard` sends those two pings from the signed-in shell.

**Tech Stack:** Hono + Better Auth + Drizzle (apps/api); WXT MV3 service worker (apps/extension); Vite + React + TanStack Query (apps/dashboard); Vitest across all three.

## Global Constraints

- Cookie fix must set `secure: true` **explicitly** — `APP_URL=http://localhost:3000` locally means Better Auth's auto-derivation would otherwise disable `Secure`, and Chrome hard-rejects `SameSite=None` without `Secure` (drops the cookie, doesn't degrade it).
- The new origin/CSRF guard must only activate for `Origin: chrome-extension://...` — the dashboard's existing same-origin-proxied requests must be completely unaffected, still protected solely by Better Auth's existing `trustedOrigins`.
- No new error class — reuse the existing `ForbiddenError` (403/`forbidden`) from `apps/api/src/lib/errors/`.
- Reuse the two existing identity endpoints (`GET /api/auth/get-session`, `GET /v1/me/workspaces`) — no new combined `/me` endpoint, no entitlements.
- No hand-duplicated wire types — import `SessionResponse`/`sessionResponseSchema` and `MyWorkspacesResponse`/`myWorkspacesResponseSchema`/`MyWorkspaceMembership` from `@wayline/shared-types` on the extension side.
- No manifest changes needed in `apps/extension/wxt.config.ts` — `cookies` permission, `host_permissions: ['https://*.wayline.app/*']`, and `externally_connectable` already cover this ticket.
- 95% coverage thresholds (lines/branches/functions/statements), v8 provider, on `*.test.ts(x)`.
- Every exported function/component with branching logic needs ≥1 positive and ≥1 negative test.
- One component/function per file convention.
- Exported functions/hooks/components get a one-line doc-comment stating purpose.
- A mandatory manual browser-verification pass is required before merge (see plan's Final verification) — no unit test can observe real cookie/SameSite/`cookies.onChanged` enforcement.

---

### Task 1: apps/api — cookie attributes + EXTENSION_ID config

**Files:**

- Modify: `apps/api/src/lib/auth.ts`
- Modify: `apps/api/src/env.ts`
- Modify: `.env.example` (repo root)
- Modify: `apps/api/src/app.auth-flow.test.ts`

**Interfaces:**

- Produces: `env.EXTENSION_ID: string` (empty default) — consumed by Task 2's middleware and Task 3's `createApp`/`index.ts` wiring.

- [ ] **Step 1: Write the failing test**

Add this test to `apps/api/src/app.auth-flow.test.ts`, inside the existing `describe('passwordless auth flow', ...)` block, right after the first test (`'completes sign-in: ...'`):

```ts
it('sets the session cookie with SameSite=None and Secure so the extension can read it cross-context', async () => {
  const { app, sentMail, close } = await buildHarness();

  try {
    const requestRes = await requestMagicLink(app, 'cookie-attrs@example.com', '10.0.0.10');
    expect(requestRes.status).toBe(200);

    const magicLinkUrl = extractMagicLinkUrl(sentMail[0]!.html);
    const verifyPath = magicLinkUrl.replace('http://localhost:3000', '');
    const verifyRes = await followVerifyLink(app, verifyPath, '10.0.0.10');

    const setCookie = verifyRes.headers.get('set-cookie');
    expect(setCookie).toBeTruthy();
    expect(setCookie).toContain('SameSite=None');
    expect(setCookie).toContain('Secure');
  } finally {
    await close();
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run apps/api/src/app.auth-flow.test.ts`
Expected: FAIL — the new test's `SameSite=None`/`Secure` assertions fail because the cookie currently has neither attribute (Better Auth's bare defaults).

- [ ] **Step 3: Write minimal implementation**

In `apps/api/src/lib/auth.ts`, find:

```ts
    advanced: { disableOriginCheck: false },
```

Replace with:

```ts
    // sameSite:'none' is what lets the extension's service worker fetch() receive this
    // cookie at all (a cross-context request is not "first-party" for SameSite purposes,
    // regardless of host_permissions) — docs/03-architecture.md §3.2. secure:true is set
    // explicitly rather than left to Better Auth's protocol-based auto-derivation: with
    // APP_URL=http://localhost:3000 in local dev, auto-derivation would resolve to
    // secure:false, and Chrome hard-rejects (not degrades) a SameSite=None cookie lacking
    // Secure. Chrome's "localhost is a potentially trustworthy origin" exemption is what
    // lets secure:true still work over plain http://localhost.
    advanced: {
      disableOriginCheck: false,
      defaultCookieAttributes: { sameSite: 'none', secure: true },
    },
```

In `apps/api/src/env.ts`, find:

```ts
const schema = z.object({
  PORT: z.coerce.number().int().positive(),
  DATABASE_URL: z.string().url(),
  MAILER: mailerModeSchema,
  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.coerce.number().int().positive(),
  SMTP_FROM: z.string().min(1),
  BETTER_AUTH_SECRET: z.string().min(32),
  APP_URL: z.string().url(),
  DASHBOARD_URL: z.string().url(),
});
```

Replace with:

```ts
const schema = z.object({
  PORT: z.coerce.number().int().positive(),
  DATABASE_URL: z.string().url(),
  MAILER: mailerModeSchema,
  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.coerce.number().int().positive(),
  SMTP_FROM: z.string().min(1),
  BETTER_AUTH_SECRET: z.string().min(32),
  APP_URL: z.string().url(),
  DASHBOARD_URL: z.string().url(),
  // Empty default until a real extension build exists to configure — the ID differs
  // between a dev-loaded unpacked build and the published Chrome Web Store ID
  // (mirrors apps/dashboard's VITE_EXTENSION_ID, WAYLI-33). Used by the extension-origin
  // guard (WAYLI-34) to allow-list exactly one chrome-extension:// origin.
  EXTENSION_ID: z.string().default(''),
});
```

In `.env.example` (repo root), find:

```
# apps/dashboard origin — trusted by Better Auth for sign-in POST CSRF + magic-link callback (docs/03-architecture.md §3.2)
DASHBOARD_URL=http://localhost:4400
```

Replace with:

```
# apps/dashboard origin — trusted by Better Auth for sign-in POST CSRF + magic-link callback (docs/03-architecture.md §3.2)
DASHBOARD_URL=http://localhost:4400

# chrome-extension://<id> origin allow-listed for the extension's session-bridge fetches
# (docs/03-architecture.md §3.2) — leave empty until the extension's real ID is known;
# the origin guard rejects all chrome-extension:// callers while this is unset.
EXTENSION_ID=
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run apps/api/src/app.auth-flow.test.ts`
Expected: PASS (7 tests — 6 existing + 1 new)

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/lib/auth.ts apps/api/src/env.ts .env.example apps/api/src/app.auth-flow.test.ts
git commit -m "feat(WAYLI-34): set SameSite=None;Secure on the session cookie and add EXTENSION_ID config"
```

---

### Task 2: apps/api — extension-origin guard middleware

**Files:**

- Create: `apps/api/src/middleware/extension-origin-guard.ts`
- Create: `apps/api/src/middleware/extension-origin-guard.test.ts`

**Interfaces:**

- Consumes: `ForbiddenError` from `../lib/errors`, `AppEnv` from `../app-env`.
- Produces: `extensionOriginGuard(expectedExtensionId: string): MiddlewareHandler<AppEnv>` — consumed by Task 3's `app.ts`.

- [ ] **Step 1: Write the failing test**

Create `apps/api/src/middleware/extension-origin-guard.test.ts`:

```ts
import { Hono } from 'hono';
import { describe, expect, it } from 'vitest';
import type { AppEnv } from '../app-env';
import { apiErrorHandler } from '../lib/error-handler';
import { extensionOriginGuard } from './extension-origin-guard';

function buildApp(expectedExtensionId: string) {
  const app = new Hono<AppEnv>();
  app.onError(apiErrorHandler);
  app.use('*', extensionOriginGuard(expectedExtensionId));
  app.get('/guarded', (c) => c.json({ ok: true }));
  return app;
}

describe('extensionOriginGuard', () => {
  it('lets a request with no Origin header through unaffected', async () => {
    const res = await buildApp('abcdefghijklmnopabcdefghijklmnop').request('/guarded');

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it('lets a dashboard-style (non chrome-extension) Origin through unaffected', async () => {
    const res = await buildApp('abcdefghijklmnopabcdefghijklmnop').request('/guarded', {
      headers: { origin: 'http://localhost:4400' },
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it('lets a matching extension origin with the required header through', async () => {
    const res = await buildApp('abcdefghijklmnopabcdefghijklmnop').request('/guarded', {
      headers: {
        origin: 'chrome-extension://abcdefghijklmnopabcdefghijklmnop',
        'x-wayline-client': 'extension',
      },
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it('rejects a chrome-extension origin that does not match the configured ID', async () => {
    const res = await buildApp('abcdefghijklmnopabcdefghijklmnop').request('/guarded', {
      headers: {
        origin: 'chrome-extension://zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz',
        'x-wayline-client': 'extension',
      },
    });

    expect(res.status).toBe(403);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe('forbidden');
  });

  it('rejects a matching extension origin missing the X-Wayline-Client header', async () => {
    const res = await buildApp('abcdefghijklmnopabcdefghijklmnop').request('/guarded', {
      headers: { origin: 'chrome-extension://abcdefghijklmnopabcdefghijklmnop' },
    });

    expect(res.status).toBe(403);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe('forbidden');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run apps/api/src/middleware/extension-origin-guard.test.ts`
Expected: FAIL — `Failed to resolve import './extension-origin-guard'` (module doesn't exist yet).

- [ ] **Step 3: Write minimal implementation**

Create `apps/api/src/middleware/extension-origin-guard.ts`:

```ts
import { createMiddleware } from 'hono/factory';
import type { AppEnv } from '../app-env';
import { ForbiddenError } from '../lib/errors';

/**
 * Rejects requests claiming to be the Wayline extension unless both the Origin and a
 * custom header match exactly — activates only for chrome-extension:// origins, so the
 * dashboard's own same-origin-proxied requests are entirely unaffected and stay covered
 * solely by Better Auth's existing trustedOrigins check (docs/03-architecture.md §3.2).
 */
export function extensionOriginGuard(expectedExtensionId: string) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const origin = c.req.header('origin');
    if (!origin?.startsWith('chrome-extension://')) {
      await next();
      return;
    }

    const expectedOrigin = `chrome-extension://${expectedExtensionId}`;
    if (origin !== expectedOrigin || c.req.header('x-wayline-client') !== 'extension') {
      throw new ForbiddenError('invalid origin');
    }

    await next();
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run apps/api/src/middleware/extension-origin-guard.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/middleware/extension-origin-guard.ts apps/api/src/middleware/extension-origin-guard.test.ts
git commit -m "feat(WAYLI-34): add extension-origin guard middleware"
```

---

### Task 3: apps/api — wire the guard in, extend integration tests

**Files:**

- Modify: `apps/api/src/app.ts`
- Modify: `apps/api/src/index.ts`
- Modify: `apps/api/src/app.auth-flow.test.ts` (its `buildHarness` helper)
- Create: `apps/api/src/app.extension-session.test.ts`

**Interfaces:**

- Consumes: `extensionOriginGuard` from Task 2, `env.EXTENSION_ID` from Task 1.
- Produces: `createApp(auth, db, extensionId)` — the 3rd parameter is new; every existing call site must be updated.

- [ ] **Step 1: Write the failing test**

Create `apps/api/src/app.extension-session.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import { createTestDb } from './db/test-client';
import { createAuth } from './lib/auth';
import { createApp } from './app';
import { session } from './db/schema/auth';

const EXTENSION_ID = 'abcdefghijklmnopabcdefghijklmnop';

async function buildHarness() {
  const { db, close } = await createTestDb();
  const mailer = { send: vi.fn(async () => {}) };
  const auth = createAuth({ db, mailer, secret: 'a'.repeat(32), baseURL: 'http://localhost:3000' });
  const app = createApp(auth, db, EXTENSION_ID);
  return { app, db, close };
}

function extensionHeaders(cookie: string) {
  return {
    cookie,
    origin: `chrome-extension://${EXTENSION_ID}`,
    'x-wayline-client': 'extension',
  };
}

describe('extension session endpoints (WAYLI-34 acceptance)', () => {
  it('rejects get-session for a chrome-extension origin that does not match EXTENSION_ID', async () => {
    const { app, close } = await buildHarness();
    try {
      const res = await app.request('/api/auth/get-session', {
        headers: {
          origin: 'chrome-extension://zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz',
          'x-wayline-client': 'extension',
        },
      });
      expect(res.status).toBe(403);
    } finally {
      await close();
    }
  });

  it('rejects /v1/me/workspaces for a chrome-extension origin missing X-Wayline-Client', async () => {
    const { app, close } = await buildHarness();
    try {
      const res = await app.request('/v1/me/workspaces', {
        headers: { origin: `chrome-extension://${EXTENSION_ID}` },
      });
      expect(res.status).toBe(403);
    } finally {
      await close();
    }
  });

  it('allows get-session through for a matching extension origin, returning null for no session', async () => {
    const { app, close } = await buildHarness();
    try {
      const res = await app.request('/api/auth/get-session', { headers: extensionHeaders('') });
      expect(res.status).toBe(200);
      expect(await res.json()).toBeNull();
    } finally {
      await close();
    }
  });

  it('rejects get-session for a revoked (deleted) session row the same way as no session', async () => {
    const { app, db, close } = await buildHarness();
    try {
      // No session ever existed in this fresh db — deleting an empty table proves the
      // "revoked/absent session" path get-session takes under extension headers is the
      // same successful-null-body path as never having signed in, not a guard rejection.
      await db.delete(session);

      const res = await app.request('/api/auth/get-session', { headers: extensionHeaders('') });
      expect(res.status).toBe(200);
      expect(await res.json()).toBeNull();
    } finally {
      await close();
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run apps/api/src/app.extension-session.test.ts`
Expected: FAIL — `createApp(auth, db, EXTENSION_ID)` is called with 3 arguments but `createApp` only accepts 2 (TypeScript error) and the guard doesn't exist in `app.ts` yet, so the 403 assertions would fail even if it compiled.

- [ ] **Step 3: Write minimal implementation**

In `apps/api/src/app.ts`, find:

```ts
import { Hono } from 'hono';
import type { AppEnv } from './app-env';
import type { DbExecutor } from './db/scoped';
import type { createAuth } from './lib/auth';
import { apiErrorHandler } from './lib/error-handler';
import { logSafe } from './lib/logger';
import { createV1Routes } from './routes';

type Auth = ReturnType<typeof createAuth>;

/** Builds the Wayline API Hono app: Better Auth under /api/auth, tenant routes under /v1. */
export function createApp(auth: Auth, db: DbExecutor): Hono<AppEnv> {
  const app = new Hono<AppEnv>();

  app.use('*', async (c, next) => {
```

Replace with:

```ts
import { Hono } from 'hono';
import type { AppEnv } from './app-env';
import type { DbExecutor } from './db/scoped';
import type { createAuth } from './lib/auth';
import { apiErrorHandler } from './lib/error-handler';
import { logSafe } from './lib/logger';
import { extensionOriginGuard } from './middleware/extension-origin-guard';
import { createV1Routes } from './routes';

type Auth = ReturnType<typeof createAuth>;

/**
 * Builds the Wayline API Hono app: Better Auth under /api/auth, tenant routes under /v1.
 * extensionId configures the origin guard (WAYLI-34) — pass '' to reject every
 * chrome-extension:// caller (the same fail-closed default as env.EXTENSION_ID).
 */
export function createApp(auth: Auth, db: DbExecutor, extensionId: string): Hono<AppEnv> {
  const app = new Hono<AppEnv>();

  app.use('*', extensionOriginGuard(extensionId));

  app.use('*', async (c, next) => {
```

In `apps/api/src/index.ts`, find:

```ts
const app = createApp(auth, db);
```

Replace with:

```ts
const app = createApp(auth, db, env.EXTENSION_ID);
```

In `apps/api/src/app.auth-flow.test.ts`, find `buildHarness`:

```ts
async function buildHarness() {
  const { db, close } = await createTestDb();
  const sentMail: { to: string; html: string }[] = [];
  const mailer = {
    send: vi.fn(async (message: { to: string; subject: string; html: string }) => {
      sentMail.push({ to: message.to, html: message.html });
    }),
  };
  const auth = createAuth({ db, mailer, secret: 'a'.repeat(32), baseURL: 'http://localhost:3000' });
  const app = createApp(auth, db);

  return { app, db, sentMail, close };
}
```

Replace with:

```ts
async function buildHarness() {
  const { db, close } = await createTestDb();
  const sentMail: { to: string; html: string }[] = [];
  const mailer = {
    send: vi.fn(async (message: { to: string; subject: string; html: string }) => {
      sentMail.push({ to: message.to, html: message.html });
    }),
  };
  const auth = createAuth({ db, mailer, secret: 'a'.repeat(32), baseURL: 'http://localhost:3000' });
  // '' means every chrome-extension:// origin is rejected — this file only exercises
  // the dashboard-style magic-link flow, which the guard never touches.
  const app = createApp(auth, db, '');

  return { app, db, sentMail, close };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm exec vitest run apps/api/src/app.extension-session.test.ts apps/api/src/app.auth-flow.test.ts`
Expected: PASS (4 new tests + 7 existing = 11 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/app.ts apps/api/src/index.ts apps/api/src/app.auth-flow.test.ts apps/api/src/app.extension-session.test.ts
git commit -m "feat(WAYLI-34): mount the extension-origin guard and cover the reused identity endpoints"
```

---

### Task 4: apps/extension — session message types + API base URL config

**Files:**

- Create: `apps/extension/src/lib/session/messages.ts`
- Create: `apps/extension/src/lib/session/messages.test.ts`
- Create: `apps/extension/src/lib/session/config.ts`
- Create: `apps/extension/src/lib/session/config.test.ts`

**Interfaces:**

- Produces: `SessionReadyMessage`, `SessionEndedMessage`, `isSessionReadyMessage`, `isSessionEndedMessage`, `API_BASE_URL: string` — consumed by Task 5 (`identity.ts`) and Task 8 (`background/session.ts`, `background/index.ts`).

- [ ] **Step 1: Write the failing tests**

Create `apps/extension/src/lib/session/messages.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { isSessionEndedMessage, isSessionReadyMessage } from './messages';

describe('isSessionReadyMessage', () => {
  it('accepts a well-formed session-ready message', () => {
    expect(isSessionReadyMessage({ type: 'session-ready' })).toBe(true);
  });

  it('rejects malformed or unrelated messages', () => {
    expect(isSessionReadyMessage(null)).toBe(false);
    expect(isSessionReadyMessage('session-ready')).toBe(false);
    expect(isSessionReadyMessage({ type: 'session-ended' })).toBe(false);
  });
});

describe('isSessionEndedMessage', () => {
  it('accepts a well-formed session-ended message', () => {
    expect(isSessionEndedMessage({ type: 'session-ended' })).toBe(true);
  });

  it('rejects malformed or unrelated messages', () => {
    expect(isSessionEndedMessage(null)).toBe(false);
    expect(isSessionEndedMessage('session-ended')).toBe(false);
    expect(isSessionEndedMessage({ type: 'session-ready' })).toBe(false);
  });
});
```

Create `apps/extension/src/lib/session/config.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { API_BASE_URL } from './config';

describe('API_BASE_URL', () => {
  it('is a non-empty absolute URL', () => {
    expect(API_BASE_URL.length).toBeGreaterThan(0);
    expect(() => new URL(API_BASE_URL)).not.toThrow();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run apps/extension/src/lib/session/messages.test.ts apps/extension/src/lib/session/config.test.ts`
Expected: FAIL — neither `./messages` nor `./config` exists yet.

- [ ] **Step 3: Write minimal implementation**

Create `apps/extension/src/lib/session/messages.ts`:

```ts
export type SessionReadyMessage = { type: 'session-ready' };

/** True if `message` is the dashboard's "a session now exists" ping (docs/03-architecture.md §3.2). */
export function isSessionReadyMessage(message: unknown): message is SessionReadyMessage {
  return (
    typeof message === 'object' &&
    message !== null &&
    (message as { type?: unknown }).type === 'session-ready'
  );
}

export type SessionEndedMessage = { type: 'session-ended' };

/** True if `message` is the dashboard's "sign-out just happened" ping. */
export function isSessionEndedMessage(message: unknown): message is SessionEndedMessage {
  return (
    typeof message === 'object' &&
    message !== null &&
    (message as { type?: unknown }).type === 'session-ended'
  );
}
```

Create `apps/extension/src/lib/session/config.ts`:

```ts
// WXT exposes vars prefixed WXT_ to import.meta.env — set WXT_API_BASE_URL in
// apps/extension/.env.local to http://localhost:3000 for local manual verification
// (docs/03-architecture.md §3.2); production defaults to the real API origin.
/** Absolute origin the extension calls for its session-bridge identity fetch. */
export const API_BASE_URL: string = import.meta.env.WXT_API_BASE_URL || 'https://api.wayline.app';
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm exec vitest run apps/extension/src/lib/session/messages.test.ts apps/extension/src/lib/session/config.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/extension/src/lib/session/messages.ts apps/extension/src/lib/session/messages.test.ts apps/extension/src/lib/session/config.ts apps/extension/src/lib/session/config.test.ts
git commit -m "feat(WAYLI-34): add session-bridge message types and API base URL config"
```

---

### Task 5: apps/extension — identity fetch

**Files:**

- Modify: `apps/extension/package.json` (add `@wayline/shared-types` dependency)
- Create: `apps/extension/src/lib/session/identity.ts`
- Create: `apps/extension/src/lib/session/identity.test.ts`

**Interfaces:**

- Consumes: `API_BASE_URL` from Task 4's `./config`.
- Produces: `IdentityCache` type, `fetchIdentity(fetchImpl?: typeof fetch): Promise<IdentityCache | null>` — consumed by Task 8 (`background/session.ts`).

- [ ] **Step 1: Add the dependency**

In `apps/extension/package.json`, find:

```json
  "dependencies": {
    "@wayline/ui": "workspace:*",
    "react": "^19.2.7",
    "react-dom": "^19.2.7"
  },
```

Replace with:

```json
  "dependencies": {
    "@wayline/shared-types": "workspace:*",
    "@wayline/ui": "workspace:*",
    "react": "^19.2.7",
    "react-dom": "^19.2.7"
  },
```

Run: `pnpm install` (repo root) to link the new workspace dependency.

- [ ] **Step 2: Write the failing test**

Create `apps/extension/src/lib/session/identity.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchIdentity } from './identity';

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('fetchIdentity', () => {
  it('combines get-session and me/workspaces into an identity cache', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          session: { expiresAt: '2026-08-01T00:00:00.000Z' },
          user: { id: 'user_1', email: 'ada@example.com', name: 'Ada' },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          workspaces: [
            {
              workspace: {
                id: '123e4567-e89b-12d3-a456-426614174000',
                name: 'Acme',
                slug: 'acme',
                plan: 'free',
              },
              role: 'admin',
            },
          ],
        }),
      );

    const identity = await fetchIdentity(fetchImpl);

    expect(identity).toEqual({
      user: { id: 'user_1', email: 'ada@example.com', name: 'Ada' },
      workspaces: [
        {
          workspace: {
            id: '123e4567-e89b-12d3-a456-426614174000',
            name: 'Acme',
            slug: 'acme',
            plan: 'free',
          },
          role: 'admin',
        },
      ],
      cachedAt: expect.any(String),
    });
    expect(fetchImpl).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('/api/auth/get-session'),
      expect.objectContaining({ headers: { 'x-wayline-client': 'extension' } }),
    );
    expect(fetchImpl).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('/v1/me/workspaces'),
      expect.objectContaining({ headers: { 'x-wayline-client': 'extension' } }),
    );
  });

  it('returns null when there is no session', async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(jsonResponse(null));

    await expect(fetchIdentity(fetchImpl)).resolves.toBeNull();
    expect(fetchImpl).toHaveBeenCalledTimes(1); // never calls me/workspaces without a session
  });

  it('returns null when me/workspaces rejects a revoked session with 401', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          session: { expiresAt: '2026-08-01T00:00:00.000Z' },
          user: { id: 'user_1', email: 'ada@example.com', name: 'Ada' },
        }),
      )
      .mockResolvedValueOnce(jsonResponse({ error: { code: 'unauthorized' } }, 401));

    await expect(fetchIdentity(fetchImpl)).resolves.toBeNull();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm exec vitest run apps/extension/src/lib/session/identity.test.ts`
Expected: FAIL — `Failed to resolve import './identity'` (module doesn't exist yet).

- [ ] **Step 4: Write minimal implementation**

Create `apps/extension/src/lib/session/identity.ts`:

```ts
import {
  myWorkspacesResponseSchema,
  sessionResponseSchema,
  type MyWorkspaceMembership,
  type SessionUser,
} from '@wayline/shared-types';
import { API_BASE_URL } from './config';

export interface IdentityCache {
  user: SessionUser;
  workspaces: MyWorkspaceMembership[];
  cachedAt: string;
}

const EXTENSION_HEADERS = { 'x-wayline-client': 'extension' } as const;

/**
 * Fetches the signed-in identity via the two session-gated endpoints the dashboard
 * already uses, combining them for the extension's cache. Returns null (never throws)
 * for a missing session, a revoked-session 401 race on the second call, or any non-2xx
 * response — the caller treats "no identity" as the uniform failure mode.
 */
export async function fetchIdentity(
  fetchImpl: typeof fetch = fetch,
): Promise<IdentityCache | null> {
  const sessionRes = await fetchImpl(`${API_BASE_URL}/api/auth/get-session`, {
    headers: EXTENSION_HEADERS,
  });
  if (!sessionRes.ok) return null;

  const session = sessionResponseSchema.parse(await sessionRes.json());
  if (!session) return null;

  const workspacesRes = await fetchImpl(`${API_BASE_URL}/v1/me/workspaces`, {
    headers: EXTENSION_HEADERS,
  });
  if (!workspacesRes.ok) return null;

  const { workspaces } = myWorkspacesResponseSchema.parse(await workspacesRes.json());

  return { user: session.user, workspaces, cachedAt: new Date().toISOString() };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm exec vitest run apps/extension/src/lib/session/identity.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 6: Commit**

```bash
git add apps/extension/package.json pnpm-lock.yaml apps/extension/src/lib/session/identity.ts apps/extension/src/lib/session/identity.test.ts
git commit -m "feat(WAYLI-34): fetch and combine identity from the two session-gated endpoints"
```

---

### Task 6: apps/extension — identity store

**Files:**

- Create: `apps/extension/src/lib/session/identity-store.ts`
- Create: `apps/extension/src/lib/session/identity-store.test.ts`

**Interfaces:**

- Consumes: `IdentityCache` from Task 5.
- Produces: `writeIdentityCache`, `readIdentityCache`, `clearIdentityCache` — consumed by Task 8.

- [ ] **Step 1: Write the failing test**

Create `apps/extension/src/lib/session/identity-store.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import { clearIdentityCache, readIdentityCache, writeIdentityCache } from './identity-store';
import type { IdentityCache } from './identity';

function fakeStorage() {
  const data = new Map<string, unknown>();
  return {
    get: vi.fn(async (key: string) => ({ [key]: data.get(key) })),
    set: vi.fn(async (items: Record<string, unknown>) => {
      for (const [key, value] of Object.entries(items)) data.set(key, value);
    }),
    remove: vi.fn(async (key: string) => {
      data.delete(key);
    }),
  };
}

const identity: IdentityCache = {
  user: { id: 'user_1', email: 'ada@example.com', name: 'Ada' },
  workspaces: [],
  cachedAt: '2026-07-25T00:00:00.000Z',
};

describe('identity-store', () => {
  it('writes and reads back the identity cache', async () => {
    const storage = fakeStorage();

    await writeIdentityCache(identity, storage);

    await expect(readIdentityCache(storage)).resolves.toEqual(identity);
  });

  it('returns null when nothing has been cached yet', async () => {
    const storage = fakeStorage();

    await expect(readIdentityCache(storage)).resolves.toBeNull();
  });

  it('clears the cache so a subsequent read returns null', async () => {
    const storage = fakeStorage();
    await writeIdentityCache(identity, storage);

    await clearIdentityCache(storage);

    await expect(readIdentityCache(storage)).resolves.toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run apps/extension/src/lib/session/identity-store.test.ts`
Expected: FAIL — `Failed to resolve import './identity-store'` (module doesn't exist yet).

- [ ] **Step 3: Write minimal implementation**

Create `apps/extension/src/lib/session/identity-store.ts`:

```ts
import type { IdentityCache } from './identity';

const STORAGE_KEY = 'wayline_identity';

type SessionStorage = {
  get: (key: string) => Promise<Record<string, unknown>>;
  set: (items: Record<string, unknown>) => Promise<void>;
  remove: (key: string) => Promise<void>;
};

/** Persists the identity cache in chrome.storage.session — memory-only, cleared on browser exit. */
export async function writeIdentityCache(
  identity: IdentityCache,
  storage: SessionStorage,
): Promise<void> {
  await storage.set({ [STORAGE_KEY]: identity });
}

/** Reads the cached identity, or null if none has been written (or it's been cleared). */
export async function readIdentityCache(storage: SessionStorage): Promise<IdentityCache | null> {
  const result = await storage.get(STORAGE_KEY);
  return (result[STORAGE_KEY] as IdentityCache | undefined) ?? null;
}

/** Clears the cached identity — called on sign-out, via either the ping or the cookie watcher. */
export async function clearIdentityCache(storage: SessionStorage): Promise<void> {
  await storage.remove(STORAGE_KEY);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run apps/extension/src/lib/session/identity-store.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/extension/src/lib/session/identity-store.ts apps/extension/src/lib/session/identity-store.test.ts
git commit -m "feat(WAYLI-34): add chrome.storage.session identity cache wrapper"
```

---

### Task 7: apps/extension — cookie watcher

**Files:**

- Create: `apps/extension/src/lib/session/cookie-watcher.ts`
- Create: `apps/extension/src/lib/session/cookie-watcher.test.ts`

**Interfaces:**

- Produces: `WAYLINE_SESSION_COOKIE_NAME`, `isWaylineSessionCookieRemoved`, `registerCookieWatcher` — consumed by Task 8.

- [ ] **Step 1: Write the failing test**

Create `apps/extension/src/lib/session/cookie-watcher.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import {
  isWaylineSessionCookieRemoved,
  registerCookieWatcher,
  WAYLINE_SESSION_COOKIE_NAME,
} from './cookie-watcher';

// Plain structural object, not chrome.cookies.CookieChangeInfo — apps/extension has no
// @types/chrome dependency (it types the browser via wxt/browser's webextension-polyfill
// typings instead), and cookie-watcher.ts's own CookieChangeInfo type is intentionally
// this same narrow shape, not the full chrome.* ambient type.
function changeInfo(removed: boolean, cookieName: string) {
  return { removed, cookie: { name: cookieName } };
}

describe('isWaylineSessionCookieRemoved', () => {
  it('is true when the Wayline session cookie is removed', () => {
    expect(isWaylineSessionCookieRemoved(changeInfo(true, WAYLINE_SESSION_COOKIE_NAME))).toBe(true);
  });

  it('is false when the cookie is set/updated rather than removed', () => {
    expect(isWaylineSessionCookieRemoved(changeInfo(false, WAYLINE_SESSION_COOKIE_NAME))).toBe(
      false,
    );
  });

  it('is false for a different cookie being removed', () => {
    expect(isWaylineSessionCookieRemoved(changeInfo(true, 'some-other-cookie'))).toBe(false);
  });
});

describe('registerCookieWatcher', () => {
  it('calls onSignedOut when the Wayline session cookie is removed', () => {
    const addListener = vi.fn();
    const onSignedOut = vi.fn();

    registerCookieWatcher(onSignedOut, { addListener });

    const listener = addListener.mock.calls[0]![0] as (info: unknown) => void;
    listener(changeInfo(true, WAYLINE_SESSION_COOKIE_NAME));

    expect(onSignedOut).toHaveBeenCalledOnce();
  });

  it('does not call onSignedOut for an unrelated cookie change', () => {
    const addListener = vi.fn();
    const onSignedOut = vi.fn();

    registerCookieWatcher(onSignedOut, { addListener });

    const listener = addListener.mock.calls[0]![0] as (info: unknown) => void;
    listener(changeInfo(true, 'some-other-cookie'));

    expect(onSignedOut).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run apps/extension/src/lib/session/cookie-watcher.test.ts`
Expected: FAIL — `Failed to resolve import './cookie-watcher'` (module doesn't exist yet).

- [ ] **Step 3: Write minimal implementation**

Create `apps/extension/src/lib/session/cookie-watcher.ts`:

```ts
type CookieChangeInfo = { removed: boolean; cookie: { name: string } };
type OnChanged = { addListener: (listener: (info: CookieChangeInfo) => void) => void };

// Coupled to lib/auth.ts's advanced.defaultCookieAttributes.secure:true (WAYLI-34),
// which makes Better Auth always use its __Secure- prefixed cookie name in every
// environment, not just production — must be updated in lockstep if that ever changes.
export const WAYLINE_SESSION_COOKIE_NAME = '__Secure-better-auth.session_token';

/** True if `changeInfo` reports the Wayline session cookie being removed (vs. set/updated). */
export function isWaylineSessionCookieRemoved(changeInfo: CookieChangeInfo): boolean {
  return changeInfo.removed && changeInfo.cookie.name === WAYLINE_SESSION_COOKIE_NAME;
}

/**
 * Watches for the Wayline session cookie's removal — a second, independent sign-out
 * signal alongside the session-ended ping (docs/03-architecture.md §3.2), catching
 * sign-outs the ping never reaches (tab closed mid-round-trip, cookie cleared manually).
 */
export function registerCookieWatcher(onSignedOut: () => void, onChanged: OnChanged): void {
  onChanged.addListener((changeInfo) => {
    if (isWaylineSessionCookieRemoved(changeInfo)) onSignedOut();
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run apps/extension/src/lib/session/cookie-watcher.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/extension/src/lib/session/cookie-watcher.ts apps/extension/src/lib/session/cookie-watcher.test.ts
git commit -m "feat(WAYLI-34): add cookies.onChanged sign-out watcher"
```

---

### Task 8: apps/extension — background orchestration

**Files:**

- Create: `apps/extension/src/entrypoints/background/session.ts`
- Create: `apps/extension/src/entrypoints/background/session.test.ts`
- Modify: `apps/extension/src/entrypoints/background/index.ts`
- Modify: `apps/extension/src/entrypoints/background/index.test.ts`

**Interfaces:**

- Consumes: `isSessionReadyMessage`/`isSessionEndedMessage` (Task 4), `fetchIdentity` (Task 5), `writeIdentityCache`/`clearIdentityCache` (Task 6), `registerCookieWatcher` (Task 7).
- Produces: `handleSessionReady()`, `handleSessionEnded()` — wired into `background/index.ts`'s existing `onMessageExternal` listener and `defineBackground`.

- [ ] **Step 1: Write the failing test**

Create `apps/extension/src/entrypoints/background/session.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const fetchIdentity = vi.fn();
const writeIdentityCache = vi.fn();
const clearIdentityCache = vi.fn();

vi.mock('../../lib/session/identity', () => ({ fetchIdentity }));
vi.mock('../../lib/session/identity-store', () => ({ writeIdentityCache, clearIdentityCache }));

afterEach(() => {
  vi.clearAllMocks();
});

describe('session orchestration', () => {
  // Fresh module per test — the generation counter is module-level state used to guard
  // against an in-flight identity fetch resurrecting stale data after a sign-out lands
  // first, so each test needs its own untouched counter.
  beforeEach(() => {
    vi.resetModules();
  });

  it('writes the fetched identity to the cache on session-ready', async () => {
    const identity = {
      user: { id: 'u1', email: 'a@example.com', name: null },
      workspaces: [],
      cachedAt: 'x',
    };
    fetchIdentity.mockResolvedValue(identity);
    const { handleSessionReady } = await import('./session');

    await handleSessionReady();

    expect(writeIdentityCache).toHaveBeenCalledWith(identity, expect.anything());
    expect(clearIdentityCache).not.toHaveBeenCalled();
  });

  it('clears the cache on session-ready when fetchIdentity resolves null (no/revoked session)', async () => {
    fetchIdentity.mockResolvedValue(null);
    const { handleSessionReady } = await import('./session');

    await handleSessionReady();

    expect(clearIdentityCache).toHaveBeenCalledOnce();
    expect(writeIdentityCache).not.toHaveBeenCalled();
  });

  it('clears the cache on session-ended', async () => {
    const { handleSessionEnded } = await import('./session');

    await handleSessionEnded();

    expect(clearIdentityCache).toHaveBeenCalledOnce();
  });

  it('does not resurrect identity if session-ended lands while a session-ready fetch is in flight', async () => {
    let resolveFetch!: (value: unknown) => void;
    fetchIdentity.mockReturnValue(new Promise((resolve) => (resolveFetch = resolve)));
    const { handleSessionReady, handleSessionEnded } = await import('./session');

    const readyPromise = handleSessionReady();
    await handleSessionEnded(); // lands first, bumping the generation counter
    resolveFetch({
      user: { id: 'u1', email: 'a@example.com', name: null },
      workspaces: [],
      cachedAt: 'x',
    });
    await readyPromise;

    // handleSessionEnded's clear, then handleSessionReady's fetch resolves too late —
    // its write must be skipped, not layered on top of the clear.
    expect(clearIdentityCache).toHaveBeenCalledOnce();
    expect(writeIdentityCache).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run apps/extension/src/entrypoints/background/session.test.ts`
Expected: FAIL — `Failed to resolve import './session'` (module doesn't exist yet).

- [ ] **Step 3: Write minimal implementation**

Create `apps/extension/src/entrypoints/background/session.ts`:

```ts
import { browser } from 'wxt/browser';
import { fetchIdentity } from '../../lib/session/identity';
import { clearIdentityCache, writeIdentityCache } from '../../lib/session/identity-store';

// Guards against a session-ready fetch that's still in flight resurrecting identity
// after a session-ended (or cookie-removal) event has already cleared it — bumped by
// handleSessionEnded, checked by handleSessionReady before it writes.
let generation = 0;

/** Fetches identity for a just-signed-in session and caches it, or clears the cache if none exists. */
export async function handleSessionReady(): Promise<void> {
  const startedAtGeneration = generation;
  const identity = await fetchIdentity();
  if (generation !== startedAtGeneration) return;

  if (identity) await writeIdentityCache(identity, browser.storage.session);
  else await clearIdentityCache(browser.storage.session);
}

/** Clears the cached identity on sign-out. */
export async function handleSessionEnded(): Promise<void> {
  generation += 1;
  await clearIdentityCache(browser.storage.session);
}
```

Replace `apps/extension/src/entrypoints/background/index.ts` in full:

```ts
import { browser } from 'wxt/browser';
import { defineBackground } from 'wxt/utils/define-background';
import { hostPermissionPatternFor } from '../../utils/hostPermissionPattern';
import { isRestrictedUrl } from '../../utils/isRestrictedUrl';
import { isSessionEndedMessage, isSessionReadyMessage } from '../../lib/session/messages';
import { registerCookieWatcher } from '../../lib/session/cookie-watcher';
import { handleSessionEnded, handleSessionReady } from './session';

export type StartRecordingResult =
  | { ok: true }
  | { ok: false; reason: 'unsupported-page' }
  | { ok: false; reason: 'permission-missing' };

type ExecuteScript = typeof browser.scripting.executeScript;
type HasHostPermission = (pattern: string) => Promise<boolean>;

/**
 * Decides whether the active tab can be recorded and, if so, injects the (runtime-registered,
 * not manifest-declared) content script — docs/06-extension-spec.md §1, §6. Takes
 * `executeScript` and `hasHostPermission` as parameters so this branching logic is testable
 * without a browser.
 */
export async function handleStartRecording(
  url: string,
  tabId: number,
  executeScript: ExecuteScript,
  hasHostPermission: HasHostPermission,
): Promise<StartRecordingResult> {
  if (isRestrictedUrl(url)) return { ok: false, reason: 'unsupported-page' };

  const pattern = hostPermissionPatternFor(url);
  if (!pattern) return { ok: false, reason: 'unsupported-page' };
  if (!(await hasHostPermission(pattern))) {
    return { ok: false, reason: 'permission-missing' };
  }

  await executeScript({ target: { tabId }, files: ['content-scripts/content.js'] });
  return { ok: true };
}

export type StartRecordingMessage = { type: 'start-recording'; tabId: number; url: string };

export function isStartRecordingMessage(message: unknown): message is StartRecordingMessage {
  return (
    typeof message === 'object' &&
    message !== null &&
    (message as { type?: unknown }).type === 'start-recording' &&
    typeof (message as { tabId?: unknown }).tabId === 'number' &&
    typeof (message as { url?: unknown }).url === 'string'
  );
}

export type PingMessage = { type: 'ping' };

export function isPingMessage(message: unknown): message is PingMessage {
  return (
    typeof message === 'object' &&
    message !== null &&
    (message as { type?: unknown }).type === 'ping'
  );
}

export default defineBackground(() => {
  // Sent from the popup (not a content script), so there's no `sender.tab` to read from —
  // the popup queries the active tab itself and passes tabId/url explicitly.
  browser.runtime.onMessage.addListener((message: unknown) => {
    if (!isStartRecordingMessage(message)) return;

    return handleStartRecording(
      message.url,
      message.tabId,
      browser.scripting.executeScript,
      (pattern) => browser.permissions.contains({ origins: [pattern] }),
    );
  });

  // externally_connectable restricts senders to https://app.wayline.app/* (wxt.config.ts) —
  // the browser enforces that boundary before this listener ever runs (WAYLI-33, WAYLI-34).
  browser.runtime.onMessageExternal.addListener((message: unknown) => {
    if (isPingMessage(message)) return Promise.resolve({ installed: true });
    if (isSessionReadyMessage(message)) return handleSessionReady();
    if (isSessionEndedMessage(message)) return handleSessionEnded();
  });

  registerCookieWatcher(handleSessionEnded, browser.cookies.onChanged);

  // Exposed unconditionally for the Playwright build/load + restricted-page e2e suite
  // (apps/extension/e2e) — this is a pre-launch scaffold, not yet CWS-published, so there's
  // no hardening reason to gate this behind a dev-only build mode yet (revisit in S12).
  Object.assign(globalThis, { __wayline_testHandleStartRecording: handleStartRecording });
});
```

Replace `apps/extension/src/entrypoints/background/index.test.ts` in full:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';

const addListener = vi.fn();
const addListenerExternal = vi.fn();
const addCookieChangedListener = vi.fn();
const executeScript = vi.fn().mockResolvedValue([]);
const containsPermission = vi.fn();

vi.mock('wxt/browser', () => ({
  browser: {
    runtime: {
      onMessage: { addListener },
      onMessageExternal: { addListener: addListenerExternal },
    },
    scripting: { executeScript },
    permissions: { contains: containsPermission },
    cookies: { onChanged: { addListener: addCookieChangedListener } },
  },
}));

const handleSessionReady = vi.fn().mockResolvedValue(undefined);
const handleSessionEnded = vi.fn().mockResolvedValue(undefined);
vi.mock('./session', () => ({ handleSessionReady, handleSessionEnded }));

const {
  default: backgroundDefinition,
  handleStartRecording,
  isStartRecordingMessage,
  isPingMessage,
} = await import('./index');

const hasHostPermission = vi.fn();

afterEach(() => {
  vi.clearAllMocks();
});

describe('handleStartRecording', () => {
  it('injects the content script and reports ok when permission is granted', async () => {
    hasHostPermission.mockResolvedValue(true);

    const result = await handleStartRecording(
      'https://example.com/',
      7,
      executeScript,
      hasHostPermission,
    );

    expect(result).toEqual({ ok: true });
    expect(hasHostPermission).toHaveBeenCalledWith('https://example.com/*');
    expect(executeScript).toHaveBeenCalledWith({
      target: { tabId: 7 },
      files: ['content-scripts/content.js'],
    });
  });

  it('refuses a restricted page without injecting anything or checking permission', async () => {
    const result = await handleStartRecording(
      'chrome://extensions/',
      7,
      executeScript,
      hasHostPermission,
    );

    expect(result).toEqual({ ok: false, reason: 'unsupported-page' });
    expect(hasHostPermission).not.toHaveBeenCalled();
    expect(executeScript).not.toHaveBeenCalled();
  });

  it('blocks a normal page whose host permission has not been granted', async () => {
    hasHostPermission.mockResolvedValue(false);

    const result = await handleStartRecording(
      'https://example.com/',
      7,
      executeScript,
      hasHostPermission,
    );

    expect(result).toEqual({ ok: false, reason: 'permission-missing' });
    expect(executeScript).not.toHaveBeenCalled();
  });

  it('blocks a page whose URL cannot be turned into a host permission pattern', async () => {
    const result = await handleStartRecording(
      'file:///Users/x/notes.html',
      7,
      executeScript,
      hasHostPermission,
    );

    expect(result).toEqual({ ok: false, reason: 'unsupported-page' });
    expect(hasHostPermission).not.toHaveBeenCalled();
    expect(executeScript).not.toHaveBeenCalled();
  });
});

describe('isStartRecordingMessage', () => {
  it('accepts a well-formed start-recording message', () => {
    expect(
      isStartRecordingMessage({ type: 'start-recording', tabId: 1, url: 'https://example.com/' }),
    ).toBe(true);
  });

  it('rejects malformed or unrelated messages', () => {
    expect(isStartRecordingMessage(null)).toBe(false);
    expect(isStartRecordingMessage('start-recording')).toBe(false);
    expect(isStartRecordingMessage({ type: 'something-else' })).toBe(false);
    expect(
      isStartRecordingMessage({ type: 'start-recording', tabId: '1', url: 'https://example.com/' }),
    ).toBe(false);
    expect(isStartRecordingMessage({ type: 'start-recording', tabId: 1 })).toBe(false);
  });
});

describe('isPingMessage', () => {
  it('accepts a well-formed ping message', () => {
    expect(isPingMessage({ type: 'ping' })).toBe(true);
  });

  it('rejects malformed or unrelated messages', () => {
    expect(isPingMessage(null)).toBe(false);
    expect(isPingMessage('ping')).toBe(false);
    expect(isPingMessage({ type: 'something-else' })).toBe(false);
  });
});

describe('background main()', () => {
  it('registers a message listener that forwards a valid start-recording message and checks permission', async () => {
    containsPermission.mockResolvedValue(true);
    backgroundDefinition.main();
    const listener = addListener.mock.calls[0]![0] as (
      message: unknown,
    ) => Promise<unknown> | undefined;

    const result = await listener({
      type: 'start-recording',
      tabId: 3,
      url: 'https://example.com/',
    });

    expect(result).toEqual({ ok: true });
    expect(containsPermission).toHaveBeenCalledWith({ origins: ['https://example.com/*'] });
    expect(executeScript).toHaveBeenCalledWith({
      target: { tabId: 3 },
      files: ['content-scripts/content.js'],
    });
  });

  it('ignores an unrelated message instead of forwarding it', async () => {
    backgroundDefinition.main();
    const listener = addListener.mock.calls[0]![0] as (
      message: unknown,
    ) => Promise<unknown> | undefined;

    const result = await listener({ type: 'something-else' });

    expect(result).toBeUndefined();
    expect(executeScript).not.toHaveBeenCalled();
  });

  it('exposes the dev-only test hook used by the Playwright suite', () => {
    backgroundDefinition.main();

    expect(
      (globalThis as { __wayline_testHandleStartRecording?: unknown })
        .__wayline_testHandleStartRecording,
    ).toBe(handleStartRecording);
  });

  it('registers an external message listener that responds to a ping', async () => {
    backgroundDefinition.main();
    const listener = addListenerExternal.mock.calls[0]![0] as (
      message: unknown,
    ) => Promise<unknown> | undefined;

    const result = await listener({ type: 'ping' });

    expect(result).toEqual({ installed: true });
  });

  it('delegates a session-ready external message to handleSessionReady', async () => {
    backgroundDefinition.main();
    const listener = addListenerExternal.mock.calls[0]![0] as (
      message: unknown,
    ) => Promise<unknown> | undefined;

    await listener({ type: 'session-ready' });

    expect(handleSessionReady).toHaveBeenCalledOnce();
  });

  it('delegates a session-ended external message to handleSessionEnded', async () => {
    backgroundDefinition.main();
    const listener = addListenerExternal.mock.calls[0]![0] as (
      message: unknown,
    ) => Promise<unknown> | undefined;

    await listener({ type: 'session-ended' });

    expect(handleSessionEnded).toHaveBeenCalledOnce();
  });

  it('ignores an unrelated external message', async () => {
    backgroundDefinition.main();
    const listener = addListenerExternal.mock.calls[0]![0] as (
      message: unknown,
    ) => Promise<unknown> | undefined;

    const result = await listener({ type: 'something-else' });

    expect(result).toBeUndefined();
  });

  it('registers the cookie watcher on startup', () => {
    backgroundDefinition.main();

    expect(addCookieChangedListener).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm exec vitest run apps/extension/src/entrypoints/background/session.test.ts apps/extension/src/entrypoints/background/index.test.ts`
Expected: PASS (4 + 17 = 21 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/extension/src/entrypoints/background/session.ts apps/extension/src/entrypoints/background/session.test.ts apps/extension/src/entrypoints/background/index.ts apps/extension/src/entrypoints/background/index.test.ts
git commit -m "feat(WAYLI-34): wire session-ready/session-ended handling and the cookie watcher into the background worker"
```

---

### Task 9: apps/dashboard — ping-sending functions

**Files:**

- Modify: `apps/dashboard/src/lib/extension.ts`
- Modify: `apps/dashboard/src/lib/extension.test.ts`

**Interfaces:**

- Produces: `sendSessionReadyPing(extensionId: string): void`, `sendSessionEndedPing(extensionId: string): void` — consumed by Task 10 (`AppShell.tsx`).

- [ ] **Step 1: Write the failing test**

Add to `apps/dashboard/src/lib/extension.test.ts`, at the end of the file (inside the existing `describe('checkExtensionInstalled', ...)`'s file, as new top-level `describe` blocks after it):

```ts
describe('sendSessionReadyPing', () => {
  it('sends a session-ready message when an extension ID is configured', () => {
    const sendMessage = vi.fn();
    vi.stubGlobal('chrome', { runtime: { sendMessage } });

    sendSessionReadyPing('abc');

    expect(sendMessage).toHaveBeenCalledWith(
      'abc',
      { type: 'session-ready' },
      expect.any(Function),
    );
  });

  it('does nothing when chrome.runtime is unavailable (extension not installed)', () => {
    expect(() => sendSessionReadyPing('abc')).not.toThrow();
  });

  it('does nothing when the extension ID is empty', () => {
    const sendMessage = vi.fn();
    vi.stubGlobal('chrome', { runtime: { sendMessage } });

    sendSessionReadyPing('');

    expect(sendMessage).not.toHaveBeenCalled();
  });
});

describe('sendSessionEndedPing', () => {
  it('sends a session-ended message when an extension ID is configured', () => {
    const sendMessage = vi.fn();
    vi.stubGlobal('chrome', { runtime: { sendMessage } });

    sendSessionEndedPing('abc');

    expect(sendMessage).toHaveBeenCalledWith(
      'abc',
      { type: 'session-ended' },
      expect.any(Function),
    );
  });

  it('does not throw when sendMessage itself throws synchronously', () => {
    vi.stubGlobal('chrome', {
      runtime: {
        sendMessage: () => {
          throw new TypeError('Invalid extension id');
        },
      },
    });

    expect(() => sendSessionEndedPing('abc')).not.toThrow();
  });
});
```

Update the file's imports at the top — find:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import { checkExtensionInstalled } from './extension';
```

Replace with:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import { checkExtensionInstalled, sendSessionEndedPing, sendSessionReadyPing } from './extension';
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run apps/dashboard/src/lib/extension.test.ts`
Expected: FAIL — `sendSessionReadyPing`/`sendSessionEndedPing` are not exported yet.

- [ ] **Step 3: Write minimal implementation**

In `apps/dashboard/src/lib/extension.ts`, find the end of the existing file (after `checkExtensionInstalled`'s closing brace) and append:

```ts
function sendPing(extensionId: string, message: { type: 'session-ready' | 'session-ended' }): void {
  const runtime = (globalThis as { chrome?: { runtime?: ChromeRuntime } }).chrome?.runtime;
  if (!extensionId || !runtime?.sendMessage) return;

  try {
    // Fire-and-forget: the dashboard doesn't act on the extension's response, and an
    // absent/unreachable extension is a normal, silent no-op, not an error.
    runtime.sendMessage(extensionId, message, () => {
      void runtime.lastError; // read to prevent an "unchecked runtime.lastError" console warning
    });
  } catch {
    // Malformed extension ID or similar synchronous throw — nothing to recover, ignore.
  }
}

/** Tells the extension a session now exists, so it can fetch and cache identity (WAYLI-34). */
export function sendSessionReadyPing(extensionId: string): void {
  sendPing(extensionId, { type: 'session-ready' });
}

/** Tells the extension sign-out just happened, so it can clear its cached identity. */
export function sendSessionEndedPing(extensionId: string): void {
  sendPing(extensionId, { type: 'session-ended' });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run apps/dashboard/src/lib/extension.test.ts`
Expected: PASS (10 tests — 5 existing + 5 new)

- [ ] **Step 5: Commit**

```bash
git add apps/dashboard/src/lib/extension.ts apps/dashboard/src/lib/extension.test.ts
git commit -m "feat(WAYLI-34): add session-ready/session-ended ping senders"
```

---

### Task 10: apps/dashboard — wire the pings into AppShell

**Files:**

- Modify: `apps/dashboard/src/components/Shell/AppShell.tsx`
- Modify: `apps/dashboard/src/components/Shell/AppShell.test.tsx`

**Interfaces:**

- Consumes: `sendSessionReadyPing`/`sendSessionEndedPing` from Task 9, `env.VITE_EXTENSION_ID`.

- [ ] **Step 1: Write the failing tests**

Add these two tests to `apps/dashboard/src/components/Shell/AppShell.test.tsx`, at the end of the `describe('AppShell', ...)` block:

```ts
it('sends a session-ready ping once when the shell mounts with a signed-in session', async () => {
  const sessionBody = JSON.stringify({
    session: { expiresAt: '2026-08-01T00:00:00.000Z' },
    user: { id: 'user_1', email: 'ada@example.com', name: 'Ada' },
  });
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(sessionBody, { status: 200 })));
  const sendMessage = vi.fn();
  vi.stubGlobal('chrome', { runtime: { sendMessage } });

  renderShell();
  await screen.findByText('ada@example.com');

  expect(sendMessage).toHaveBeenCalledWith(
    'test-extension-id',
    { type: 'session-ready' },
    expect.any(Function),
  );
  expect(sendMessage).toHaveBeenCalledTimes(1);
});

it('sends a session-ended ping right after a successful sign-out', async () => {
  const sessionBody = JSON.stringify({
    session: { expiresAt: '2026-08-01T00:00:00.000Z' },
    user: { id: 'user_1', email: 'ada@example.com', name: 'Ada' },
  });
  vi.stubGlobal(
    'fetch',
    vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.includes('/sign-out')) {
        return Promise.resolve(new Response(JSON.stringify({ status: true }), { status: 200 }));
      }
      return Promise.resolve(new Response(sessionBody, { status: 200 }));
    }),
  );
  const sendMessage = vi.fn();
  vi.stubGlobal('chrome', { runtime: { sendMessage } });

  renderShell();
  await screen.findByText('ada@example.com');
  await userEvent.click(screen.getByRole('button', { name: 'Sign out' }));
  await waitFor(() => expect(screen.getByText('Sign-in content')).toBeInTheDocument());

  expect(sendMessage).toHaveBeenCalledWith(
    'test-extension-id',
    { type: 'session-ended' },
    expect.any(Function),
  );
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run apps/dashboard/src/components/Shell/AppShell.test.tsx`
Expected: FAIL — no `sendMessage` calls happen yet; the 2 new tests fail, the 6 pre-existing ones still pass.

- [ ] **Step 3: Write minimal implementation**

Replace `apps/dashboard/src/components/Shell/AppShell.tsx` in full:

```tsx
import { useEffect, useRef, useState } from 'react';
import { Link, Outlet, useNavigate } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { Badge, Button } from '@wayline/ui';
import { env } from '../../env';
import { useExtensionInstalled } from '../../hooks/use-extension-installed';
import { useSession } from '../../hooks/use-session';
import { fetchJson } from '../../lib/api-client';
import { sendSessionEndedPing, sendSessionReadyPing } from '../../lib/extension';
import { sessionQueryOptions } from '../../lib/session';
import { SkipLink } from './SkipLink';

/** Signed-in shell: skip link, primary nav, and the active route's content. */
export function AppShell() {
  const { data: session } = useSession();
  const { data: extensionInstalled } = useExtensionInstalled();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [signOutError, setSignOutError] = useState(false);
  const sentReadyPing = useRef(false);

  useEffect(() => {
    // Fires once per mount, not on every 60s background refetch of the session query —
    // there's no discrete "sign-in just completed" event to hook (magic-link
    // verification redirects server-side), so "the signed-in shell rendered" is the
    // trigger (docs/03-architecture.md §3.2).
    if (session?.user && !sentReadyPing.current) {
      sentReadyPing.current = true;
      sendSessionReadyPing(env.VITE_EXTENSION_ID);
    }
  }, [session]);

  async function handleSignOut() {
    setSignOutError(false);
    try {
      await fetchJson('/api/auth/sign-out', { method: 'POST' });
    } catch {
      setSignOutError(true);
      return;
    }
    sendSessionEndedPing(env.VITE_EXTENSION_ID);
    // Sign-out just succeeded server-side, so the answer is already known — write it
    // directly instead of invalidateQueries, which would trigger a redundant refetch
    // of the still-active session query and delay the redirect below on it.
    queryClient.setQueryData(sessionQueryOptions.queryKey, null);
    await navigate({ to: '/sign-in' });
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <SkipLink />
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <nav aria-label="Primary">
          {/* TanStack Router stamps aria-current="page" on the active Link automatically. */}
          <Link to="/" className="font-medium text-foreground aria-[current=page]:text-primary">
            Wayline
          </Link>
        </nav>
        <div className="flex items-center gap-3">
          <Badge variant={extensionInstalled ? 'default' : 'outline'}>
            {extensionInstalled ? 'Extension installed' : 'Extension not detected'}
          </Badge>
          {session?.user ? (
            <>
              {signOutError ? (
                <span role="alert" className="text-sm text-destructive">
                  Couldn&apos;t sign out. Try again.
                </span>
              ) : null}
              <span className="text-sm text-muted-foreground">{session.user.email}</span>
              <Button variant="outline" onClick={handleSignOut}>
                Sign out
              </Button>
            </>
          ) : null}
        </div>
      </header>
      <main id="main" className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm exec vitest run apps/dashboard/src/components/Shell/AppShell.test.tsx`
Expected: PASS (8 tests — 6 existing + 2 new)

- [ ] **Step 5: Commit**

```bash
git add apps/dashboard/src/components/Shell/AppShell.tsx apps/dashboard/src/components/Shell/AppShell.test.tsx
git commit -m "feat(WAYLI-34): send session-ready/session-ended pings from the dashboard shell"
```

---

## Final verification

- [ ] **Full suite + coverage**: `pnpm test:coverage` from repo root — green, 95% thresholds hold.
- [ ] **Lint + typecheck**: `pnpm lint && pnpm --filter @wayline/api typecheck && pnpm --filter @wayline/extension typecheck && pnpm --filter @wayline/dashboard typecheck`.
- [ ] **Mandatory manual browser verification** (not optional — see plan's Global Constraints): build the extension (`pnpm --filter @wayline/extension build`), load it unpacked, note its dev extension ID; set `EXTENSION_ID` in `apps/api/.env.local` and `VITE_EXTENSION_ID` in `apps/dashboard/.env.local` to that ID; set `apps/extension/.env.local`'s `WXT_API_BASE_URL=http://localhost:3000`; run the local stack (`pnpm dev`); sign in via the dashboard; confirm (via `chrome://extensions` → inspect service worker → Application → Storage) the identity cache populates in `chrome.storage.session`; sign out and confirm it clears; separately, delete the session cookie manually via DevTools and confirm the cookie-watcher path also clears it.
- [ ] Move WAYLI-34 to `In Review` in Plane and open the PR per `wayline-workflow` (title includes `WAYLI-34`; flag `/security-review` given the auth/CSRF/cookie scope).
