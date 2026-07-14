import { createMiddleware } from 'hono/factory';
import type { AppEnv } from '../app-env';
import type { createAuth } from '../lib/auth';
import { UnauthorizedError } from '../lib/errors';

type Auth = ReturnType<typeof createAuth>;

/** Rejects requests without a live Better Auth session (401) and attaches the user to context. */
export function requireSession(auth: Auth) {
  return createMiddleware<AppEnv>(async (c, next) => {
    // Better Auth validates expiry server-side: an expired session row returns null here.
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session) throw new UnauthorizedError();

    c.set('user', session.user);
    await next();
  });
}
