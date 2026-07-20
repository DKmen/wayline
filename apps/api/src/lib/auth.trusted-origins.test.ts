import { describe, expect, it, vi } from 'vitest';
import { createTestDb } from '../db/test-client';
import { createApp } from '../app';
import { createAuth } from './auth';

/**
 * Better Auth only runs its CSRF/origin check when a request carries a cookie header
 * (or forceValidate applies) — a bare cross-origin POST with no cookie is exempt by
 * design, so these tests attach a cookie header to force the check to actually run.
 */
function postWithOrigin(app: ReturnType<typeof createApp>, origin: string) {
  return app.request('/api/auth/sign-in/magic-link', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      origin,
      cookie: 'unrelated=1',
      'x-forwarded-for': '10.9.0.1',
    },
    body: JSON.stringify({ email: 'origin-check@example.com' }),
  });
}

describe('createAuth trustedOrigins', () => {
  it('accepts a request from an explicitly trusted dashboard origin', async () => {
    const { db, close } = await createTestDb();

    try {
      const auth = createAuth({
        db,
        mailer: { send: vi.fn().mockResolvedValue(undefined) },
        secret: 'a'.repeat(32),
        baseURL: 'http://localhost:3000',
        trustedOrigins: ['http://localhost:4400'],
      });
      const app = createApp(auth, db);

      const res = await postWithOrigin(app, 'http://localhost:4400');

      expect(res.status).toBe(200);
    } finally {
      await close();
    }
  });

  it('rejects a request from an origin outside baseURL and trustedOrigins', async () => {
    const { db, close } = await createTestDb();

    try {
      const auth = createAuth({
        db,
        mailer: { send: vi.fn().mockResolvedValue(undefined) },
        secret: 'a'.repeat(32),
        baseURL: 'http://localhost:3000',
        trustedOrigins: ['http://localhost:4400'],
      });
      const app = createApp(auth, db);

      const res = await postWithOrigin(app, 'http://evil.example.com');

      expect(res.status).toBe(403);
    } finally {
      await close();
    }
  });
});
