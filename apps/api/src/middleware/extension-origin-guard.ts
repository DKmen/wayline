import { createMiddleware } from 'hono/factory';
import type { AppEnv } from '../app-env';
import { ForbiddenError } from '../lib/errors';

/**
 * Rejects any request whose Origin header doesn't match the dashboard's own origin or
 * the Wayline extension's — this closes the CSRF gap opened by making the session
 * cookie SameSite=None (required for the extension's cross-context fetch, but it also
 * means the cookie is now attached to genuinely cross-site requests from anywhere, so
 * an explicit allow-list is the only remaining defense for /v1/* routes, which aren't
 * covered by Better Auth's own trustedOrigins check — that only runs inside
 * auth.handler, i.e. only for /api/auth/* routes). A request with no Origin header at
 * all (same-origin GETs, non-browser callers) passes through unaffected — a real
 * cross-site state-changing request always carries Origin per the Fetch spec, so this
 * isn't a bypass. An extension-origin match additionally requires the X-Wayline-Client
 * header, matching the original narrower guard's behavior.
 */
export function extensionOriginGuard(expectedExtensionId: string, dashboardOrigin: string) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const origin = c.req.header('origin');
    if (!origin) {
      await next();
      return;
    }
    if (origin === dashboardOrigin) {
      await next();
      return;
    }

    const expectedExtensionOrigin = `chrome-extension://${expectedExtensionId}`;
    if (origin === expectedExtensionOrigin && c.req.header('x-wayline-client') === 'extension') {
      await next();
      return;
    }

    throw new ForbiddenError('invalid origin');
  });
}
