import { z } from 'zod';
import { createMiddleware } from 'hono/factory';
import type { AppEnv } from '../app-env';
import { findMembershipWithWorkspace, touchLastActiveAt } from '../db/memberships';
import { scopedDb, type DbExecutor } from '../db/scoped';
import { ForbiddenError, ValidationError } from '../lib/errors';

const workspaceIdParamSchema = z.string().uuid();

/**
 * Resolves (user, workspace, role) from the session user + membership row and attaches
 * the workspace-scoped db (docs/03-architecture.md §3.3). Non-members and unknown or
 * soft-deleted workspaces both get 403 so responses never reveal workspace existence.
 */
export function workspaceContext(db: DbExecutor) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const parsed = workspaceIdParamSchema.safeParse(c.req.param('workspaceId'));
    if (!parsed.success) throw new ValidationError(parsed.error);

    const workspaceId = parsed.data;
    const user = c.get('user');
    const membership = await findMembershipWithWorkspace(db, workspaceId, user.id);
    if (!membership) throw new ForbiddenError();

    const scoped = scopedDb(db, workspaceId);
    c.set('workspaceCtx', { workspace: membership.workspace, role: membership.role, scoped });

    await touchLastActiveAt(scoped, user.id);
    await next();
  });
}
