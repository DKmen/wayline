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
