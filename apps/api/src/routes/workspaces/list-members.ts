import { memberListResponseSchema } from '@wayline/shared-types';
import type { Context } from 'hono';
import type { AppEnv } from '../../app-env';
import { listMembersWithUsers } from '../../db/memberships';
import type { DbExecutor } from '../../db/scoped';

/** GET /v1/workspaces/:workspaceId/members — the workspace's member list with joined identity. */
export function listMembersHandler(db: DbExecutor) {
  return async (c: Context<AppEnv>) => {
    const { workspace } = c.get('workspaceCtx');
    const rows = await listMembersWithUsers(db, workspace.id);

    return c.json(
      memberListResponseSchema.parse({
        members: rows.map((row) => ({ ...row, name: row.name ?? '' })),
      }),
    );
  };
}
