import { sessionResponseSchema, type SessionResponse } from '@wayline/shared-types';
import { queryOptions } from '@tanstack/react-query';
import { fetchJson } from './api-client';

/** GET /api/auth/get-session — null once the session cookie is missing or expired. */
async function fetchSession(): Promise<SessionResponse> {
  const data = await fetchJson<unknown>('/api/auth/get-session');
  return sessionResponseSchema.parse(data);
}

/** Shared query definition for the current session — used by both route guards and useSession. */
export const sessionQueryOptions = queryOptions({
  queryKey: ['session'],
  queryFn: fetchSession,
  staleTime: 60_000,
  retry: false,
});
