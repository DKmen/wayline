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
    const start = Date.now();
    await next();
    logSafe('http.request', {
      route: c.req.path,
      method: c.req.method,
      statusCode: c.res.status,
      durationMs: Date.now() - start,
    });
  });

  app.onError(apiErrorHandler);

  app.get('/health', (c) => c.json({ status: 'ok' }));

  // better-call's router (inside auth.handler) already catches better-auth's APIError
  // — including the magic-link rate-limit case — and converts it to a proper Response
  // before returning, so no try/catch is needed here.
  app.on(['GET', 'POST'], '/api/auth/*', (c) => auth.handler(c.req.raw));

  app.route('/v1', createV1Routes(auth, db));

  return app;
}
