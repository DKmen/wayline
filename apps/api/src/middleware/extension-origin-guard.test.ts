import { Hono } from 'hono';
import { describe, expect, it } from 'vitest';
import type { AppEnv } from '../app-env';
import { apiErrorHandler } from '../lib/error-handler';
import { extensionOriginGuard } from './extension-origin-guard';

const EXTENSION_ID = 'abcdefghijklmnopabcdefghijklmnop';
const DASHBOARD_ORIGIN = 'http://localhost:4400';

function buildApp() {
  const app = new Hono<AppEnv>();
  app.onError(apiErrorHandler);
  app.use('*', extensionOriginGuard(EXTENSION_ID, DASHBOARD_ORIGIN));
  app.get('/guarded', (c) => c.json({ ok: true }));
  return app;
}

describe('extensionOriginGuard', () => {
  it('lets a request with no Origin header through unaffected', async () => {
    const res = await buildApp().request('/guarded');

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it('lets the dashboard origin through without requiring any extra header', async () => {
    const res = await buildApp().request('/guarded', {
      headers: { origin: DASHBOARD_ORIGIN },
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it('lets a matching extension origin with the required header through', async () => {
    const res = await buildApp().request('/guarded', {
      headers: {
        origin: `chrome-extension://${EXTENSION_ID}`,
        'x-wayline-client': 'extension',
      },
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it('rejects a chrome-extension origin that does not match the configured ID', async () => {
    const res = await buildApp().request('/guarded', {
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
    const res = await buildApp().request('/guarded', {
      headers: { origin: `chrome-extension://${EXTENSION_ID}` },
    });

    expect(res.status).toBe(403);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe('forbidden');
  });

  it('rejects an arbitrary third-party origin (the CSRF case this guard exists to close)', async () => {
    const res = await buildApp().request('/guarded', {
      headers: { origin: 'https://evil.example' },
    });

    expect(res.status).toBe(403);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe('forbidden');
  });
});
