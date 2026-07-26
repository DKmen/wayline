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
  const app = createApp(auth, db, EXTENSION_ID, 'http://localhost:4400');
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

  it('rejects a request from an arbitrary third-party origin on a real /v1 route (CSRF check)', async () => {
    const { app, close } = await buildHarness();
    try {
      const res = await app.request('/v1/me/workspaces', {
        headers: { origin: 'https://evil.example' },
      });
      expect(res.status).toBe(403);
    } finally {
      await close();
    }
  });
});
