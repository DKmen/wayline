import { useQuery } from '@tanstack/react-query';
import { sessionQueryOptions } from '../lib/session';

/** The current signed-in session, or null once signed out — used by shell UI outside route guards. */
export function useSession() {
  return useQuery(sessionQueryOptions);
}
