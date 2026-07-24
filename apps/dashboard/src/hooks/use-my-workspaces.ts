import { useQuery } from '@tanstack/react-query';
import { myWorkspacesQueryOptions } from '../lib/workspaces';

/** The current user's workspaces, used to route between workspace creation and the library. */
export function useMyWorkspaces() {
  return useQuery(myWorkspacesQueryOptions);
}
