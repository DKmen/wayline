import { flowListResponseSchema, type FlowListResponse } from '@wayline/shared-types';
import { queryOptions } from '@tanstack/react-query';
import { fetchJson } from './api-client';

/** GET /v1/workspaces/:workspaceId/flows — the workspace's flow library, empty until S3 ships creation. */
async function fetchFlows(workspaceId: string): Promise<FlowListResponse> {
  const data = await fetchJson<unknown>(`/v1/workspaces/${workspaceId}/flows`);
  return flowListResponseSchema.parse(data);
}

/** Shared query definition for one workspace's flow library. */
export function flowsQueryOptions(workspaceId: string) {
  return queryOptions({
    queryKey: ['flows', workspaceId],
    queryFn: () => fetchFlows(workspaceId),
    staleTime: 60_000,
  });
}
