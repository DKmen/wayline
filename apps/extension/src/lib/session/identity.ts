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
 * for any failure: missing session, revoked-session 401, non-2xx response, network error,
 * malformed JSON, or schema mismatch — the caller treats "no identity" as the uniform failure mode.
 */
export async function fetchIdentity(
  fetchImpl: typeof fetch = fetch,
): Promise<IdentityCache | null> {
  try {
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
  } catch {
    // Network failure, malformed JSON, or a schema-mismatched response body — all
    // collapse to "no identity available" rather than propagating, per this function's
    // never-throws contract.
    return null;
  }
}
