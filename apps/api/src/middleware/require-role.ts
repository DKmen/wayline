import type { Role } from '@wayline/shared-types';
import { createMiddleware } from 'hono/factory';
import type { AppEnv } from '../app-env';
import { ForbiddenError } from '../lib/errors';

const ROLE_RANK: Record<Role, number> = { viewer: 0, creator: 1, admin: 2 };

/** Route-level guard (docs/03-architecture.md §3.3) — rejects members below the required role with 403. */
export function requireRole(minimum: Role) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const { role } = c.get('workspaceCtx');
    if (ROLE_RANK[role] < ROLE_RANK[minimum]) throw new ForbiddenError();

    await next();
  });
}
