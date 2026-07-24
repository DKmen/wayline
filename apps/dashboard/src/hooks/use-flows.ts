import { useQuery } from '@tanstack/react-query';
import { flowsQueryOptions } from '../lib/flows';

/** One workspace's flow library. */
export function useFlows(workspaceId: string) {
  return useQuery(flowsQueryOptions(workspaceId));
}
