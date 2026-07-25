type CookieChangeInfo = { removed: boolean; cookie: { name: string } };
type OnChanged = { addListener: (listener: (info: CookieChangeInfo) => void) => void };

// Coupled to lib/auth.ts's advanced.useSecureCookies:true (WAYLI-34), which forces the
// __Secure- cookie name prefix in every environment (not just when baseURL is https://)
// — must be updated in lockstep if that ever changes.
export const WAYLINE_SESSION_COOKIE_NAME = '__Secure-better-auth.session_token';

/** True if `changeInfo` reports the Wayline session cookie being removed (vs. set/updated). */
export function isWaylineSessionCookieRemoved(changeInfo: CookieChangeInfo): boolean {
  return changeInfo.removed && changeInfo.cookie.name === WAYLINE_SESSION_COOKIE_NAME;
}

/**
 * Watches for the Wayline session cookie's removal — a second, independent sign-out
 * signal alongside the session-ended ping (docs/03-architecture.md §3.2), catching
 * sign-outs the ping never reaches (tab closed mid-round-trip, cookie cleared manually).
 */
export function registerCookieWatcher(onSignedOut: () => void, onChanged: OnChanged): void {
  onChanged.addListener((changeInfo) => {
    if (isWaylineSessionCookieRemoved(changeInfo)) onSignedOut();
  });
}
