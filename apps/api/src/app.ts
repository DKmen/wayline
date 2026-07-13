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

  // better-call's router (inside auth.handler) already catches better-auth's APIError
  // — including the magic-link rate-limit case — and converts it to a proper Response
  // before returning, so no try/catch is needed here.
  app.on(['GET', 'POST'], '/api/auth/*', (c) => auth.handler(c.req.raw));

  return app;
}
