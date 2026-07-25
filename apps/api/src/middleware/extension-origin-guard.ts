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
