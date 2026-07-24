import { myWorkspacesResponseSchema, type MyWorkspacesResponse } from '@wayline/shared-types';
import { queryOptions } from '@tanstack/react-query';
import { fetchJson } from './api-client';

/** GET /v1/me/workspaces — the workspaces the current user belongs to, with their role in each. */
async function fetchMyWorkspaces(): Promise<MyWorkspacesResponse> {
  const data = await fetchJson<unknown>('/v1/me/workspaces');
  return myWorkspacesResponseSchema.parse(data);
}

/** Shared query definition for the caller's workspaces — the bootstrap for create-vs-library routing. */
export const myWorkspacesQueryOptions = queryOptions({
  queryKey: ['my-workspaces'],
  queryFn: fetchMyWorkspaces,
  staleTime: 60_000,
});
