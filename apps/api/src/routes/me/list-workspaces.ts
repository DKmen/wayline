import { myWorkspacesResponseSchema } from '@wayline/shared-types';
import type { Context } from 'hono';
import type { AppEnv } from '../../app-env';
import { listMembershipsForUser } from '../../db/memberships';
import type { DbExecutor } from '../../db/scoped';

/** GET /v1/me/workspaces — the workspaces the caller belongs to, with their role in each. */
export function listMyWorkspacesHandler(db: DbExecutor) {
  return async (c: Context<AppEnv>) => {
    const user = c.get('user');
    const workspaces = await listMembershipsForUser(db, user.id);

    return c.json(myWorkspacesResponseSchema.parse({ workspaces }));
  };
}
