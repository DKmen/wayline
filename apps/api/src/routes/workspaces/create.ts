import { createWorkspaceRequestSchema, workspaceSchema } from '@wayline/shared-types';
import type { Context } from 'hono';
import type { AppEnv } from '../../app-env';
import { createWorkspaceWithAdmin } from '../../db/workspaces';
import type { DbExecutor } from '../../db/scoped';
import { ValidationError } from '../../lib/errors';

/** POST /v1/workspaces — creates a workspace with the caller as first admin (docs/02 §2). */
export function createWorkspaceHandler(db: DbExecutor) {
  return async (c: Context<AppEnv>) => {
    const parsed = createWorkspaceRequestSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) throw new ValidationError(parsed.error);

    const user = c.get('user');
    const workspace = await createWorkspaceWithAdmin(db, { ...parsed.data, userId: user.id });

    return c.json(
      workspaceSchema.parse({
        id: workspace.id,
        name: workspace.name,
        slug: workspace.slug,
        plan: workspace.plan,
      }),
      201,
    );
  };
}
