import { Hono } from 'hono';
import type { AppEnv } from '../app-env';
import type { DbExecutor } from '../db/scoped';
import type { createAuth } from '../lib/auth';
import { requireSession } from '../middleware/require-session';
import { workspaceContext } from '../middleware/workspace-context';
import { createWorkspaceHandler } from './workspaces/create';
import { listMembersHandler } from './workspaces/list-members';

type Auth = ReturnType<typeof createAuth>;

/** Mounts every /v1 route with its middleware chain — wiring only, handlers live one-per-file. */
export function createV1Routes(auth: Auth, db: DbExecutor) {
  const v1 = new Hono<AppEnv>();

  v1.post('/workspaces', requireSession(auth), createWorkspaceHandler(db));
  v1.get(
    '/workspaces/:workspaceId/members',
    requireSession(auth),
    workspaceContext(db),
    listMembersHandler(db),
  );

  return v1;
}
