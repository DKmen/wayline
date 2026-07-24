import { flowListResponseSchema } from '@wayline/shared-types';
import type { Context } from 'hono';
import type { AppEnv } from '../../app-env';
import { listFlows } from '../../db/flows';

/** GET /v1/workspaces/:workspaceId/flows — the workspace's live flow library. */
export function listFlowsHandler() {
  return async (c: Context<AppEnv>) => {
    const { scoped } = c.get('workspaceCtx');
    const flows = await listFlows(scoped);

    return c.json(flowListResponseSchema.parse({ flows }));
  };
}
