import type { Role } from '@wayline/shared-types';
import { Hono } from 'hono';
import { describe, expect, it } from 'vitest';
import type { AppEnv, WorkspaceContext } from '../app-env';
import { apiErrorHandler } from '../lib/error-handler';
import { requireRole } from './require-role';

function buildApp(actualRole: Role, minimum: Role) {
  const app = new Hono<AppEnv>();
  app.onError(apiErrorHandler);
  app.use('*', async (c, next) => {
    // Only role is read by requireRole — a stub context keeps this a true unit test.
    c.set('workspaceCtx', { role: actualRole } as WorkspaceContext);
    await next();
  });
  app.get('/guarded', requireRole(minimum), (c) => c.json({ ok: true }));
  return app;
}

describe('requireRole', () => {
  it.each([
    ['viewer', 'viewer'],
    ['creator', 'creator'],
    ['admin', 'creator'],
    ['admin', 'admin'],
  ] as const)('lets a %s through a %s guard', async (actual, minimum) => {
    const res = await buildApp(actual, minimum).request('/guarded');

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it.each([
    ['viewer', 'creator'],
    ['viewer', 'admin'],
    ['creator', 'admin'],
  ] as const)('rejects a %s below a %s guard with 403', async (actual, minimum) => {
    const res = await buildApp(actual, minimum).request('/guarded');

    expect(res.status).toBe(403);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe('forbidden');
  });
});
