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
