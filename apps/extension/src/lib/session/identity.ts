import {
  myWorkspacesResponseSchema,
  sessionResponseSchema,
  type MyWorkspaceMembership,
  type SessionUser,
} from '@wayline/shared-types';
import { API_BASE_URL } from './config';

export interface IdentityCache {
  user: SessionUser;
  workspaces: MyWorkspaceMembership[];
  cachedAt: string;
}

const EXTENSION_HEADERS = { 'x-wayline-client': 'extension' } as const;

/**
 * Fetches the signed-in identity via the two session-gated endpoints the dashboard
 * already uses, combining them for the extension's cache. Returns null (never throws)
 * for a missing session, a revoked-session 401 race on the second call, or any non-2xx
 * response — the caller treats "no identity" as the uniform failure mode.
 */
export async function fetchIdentity(
  fetchImpl: typeof fetch = fetch,
): Promise<IdentityCache | null> {
  const sessionRes = await fetchImpl(`${API_BASE_URL}/api/auth/get-session`, {
    headers: EXTENSION_HEADERS,
  });
  if (!sessionRes.ok) return null;

  const session = sessionResponseSchema.parse(await sessionRes.json());
  if (!session) return null;

  const workspacesRes = await fetchImpl(`${API_BASE_URL}/v1/me/workspaces`, {
    headers: EXTENSION_HEADERS,
  });
  if (!workspacesRes.ok) return null;

  const { workspaces } = myWorkspacesResponseSchema.parse(await workspacesRes.json());

  return { user: session.user, workspaces, cachedAt: new Date().toISOString() };
}
