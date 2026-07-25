# Shared Cookie Session Bridge Design (WAYLI-34)

## Goal

Give the extension a real identity that follows the dashboard's session — cookie-sharing with `api.wayline.app`, never storing tokens — the pattern `docs/03-architecture.md` §3.2 already designs but nothing implements yet.

## Design

Exploration found the mechanism this ticket depends on isn't wired up beyond manifest permissions: the session cookie has no explicit `SameSite`/`Secure` attributes (Better Auth's bare defaults), so a browser won't attach it to the extension service worker's cross-context `fetch()` against `api.wayline.app` — this is the ticket's single most important fix. There's no `X-Wayline-Client`/origin-allowlist check anywhere in `apps/api` (doc-only today), and the architecture doc's combined `/me` (user+workspace+entitlements) endpoint doesn't exist — only `GET /api/auth/get-session` (user) and `GET /v1/me/workspaces` (workspace+role) exist, both already session-gated.

Two scope decisions, confirmed with the user:

1. Fix the cookie attributes in this ticket (with a mandatory manual browser-verification step — no unit test can observe real SameSite/cookie-jar enforcement).
2. Reuse the two existing identity endpoints rather than building a new combined `/me` + entitlements endpoint — matches the ticket's literal acceptance criteria; entitlements deferred.

**apps/api**: `lib/auth.ts` gains `advanced.defaultCookieAttributes: { sameSite: 'none', secure: true }` — `secure: true` must be explicit, not auto-derived from `baseURL`'s protocol, because `APP_URL=http://localhost:3000` locally would otherwise auto-derive `secure: false`, and Chrome hard-rejects (not degrades) a `SameSite=None` cookie lacking `Secure`. Chrome's "localhost is a potentially trustworthy origin" exemption is what makes `secure: true` still work over plain `http://localhost`. A new env var `EXTENSION_ID` (empty default, mirrors the dashboard's `VITE_EXTENSION_ID`) feeds a new `middleware/extension-origin-guard.ts`: activates only when `Origin` starts with `chrome-extension://` (dashboard's same-origin-proxied requests are untouched, still protected solely by Better Auth's existing `trustedOrigins`), then requires an exact origin match plus `X-Wayline-Client: extension`, rejecting via the **existing** `ForbiddenError` (403) rather than a new error class. Mounted globally in `app.ts` (before `/api/auth/*` and `/v1`, since `get-session` lives inside Better Auth's own wildcard handler and can't be wrapped route-locally without also separately touching `/v1/me/workspaces`).

**apps/extension**: fully greenfield — no session/identity/cookie-watching code exists. New `src/lib/session/` module: `messages.ts` (message types/guards, same shape as the existing `isPingMessage`), `config.ts` (`API_BASE_URL` from a WXT env var), `identity.ts` (`fetchIdentity()` — calls both endpoints with `X-Wayline-Client: extension`, combines into an `IdentityCache` typed against `@wayline/shared-types`, returns `null` rather than throwing on a missing/401 session), `identity-store.ts` (`browser.storage.session` read/write/clear), `cookie-watcher.ts` (`browser.cookies.onChanged` + a pure `isWaylineSessionCookieRemoved` predicate matching `__Secure-better-auth.session_token`). `background/session.ts` wires these into `handleSessionReady()`/`handleSessionEnded()`; `background/index.ts`'s existing `onMessageExternal` listener (added in WAYLI-33) gains a branch for `session-ready`/`session-ended`, and the cookie watcher registers once inside `defineBackground`. A monotonic generation counter guards against an in-flight identity fetch resurrecting stale data after a sign-out lands first.

**apps/dashboard**: `lib/extension.ts` gains `sendSessionReadyPing()`/`sendSessionEndedPing()` (thin `chrome.runtime.sendMessage` wrappers, fire-and-forget). `AppShell.tsx` fires the ready-ping once per mount (via `useEffect`+`useRef`, guarding against the session query's 60s background refetch — there's no discrete "sign-in completed" event to hook since magic-link verification redirects server-side) when `session?.user` is present, and fires the ended-ping right after the sign-out POST succeeds, before the existing direct cache write.

`chrome.cookies.onChanged` is a **second, independent** sign-out path per the architecture doc's own design, not a fallback — it catches sign-outs the ping never reaches (tab closed mid-round-trip, cookie manually cleared).

## Data flow

1. **Session-ready**: dashboard renders signed-in → pings `session-ready` → extension's `onMessageExternal` → `fetchIdentity()` hits both endpoints with the shared cookie + `X-Wayline-Client` → API's origin guard validates → identity written to `storage.session`.
2. **Sign-out**: dashboard POSTs sign-out → pings `session-ended` → `clearIdentityCache()`. Independently, the cookie watcher observes the session cookie's removal and also clears.
3. **Revoked session**: no new API logic — a regression check that the two reused endpoints already reject a deleted session row correctly under the extension's calling convention.
4. **Invalid origin**: a `chrome-extension://` origin that doesn't match `EXTENSION_ID`, or is missing `X-Wayline-Client`, gets a 403 before Better Auth/session validation ever runs.

## Testing

- **apps/api**: middleware unit tests (valid/invalid origin, missing header, non-extension origin bypasses untouched), an app-level integration test through both identity endpoints, an extended cookie-attribute assertion on `app.auth-flow.test.ts`, and a revoked-session regression test (delete the `session` row directly, replay the cookie).
- **apps/extension**: type-guard tests, `fetchIdentity` with an injected fake `fetch` (success, null session, 401 race), `identity-store` with an injected fake storage object, `cookie-watcher`'s pure predicate — same DI/`vi.mock('wxt/browser', ...)` pattern already used for `handleStartRecording`.
- **apps/dashboard**: extend `lib/extension.test.ts` and `AppShell.test.tsx`'s existing `vi.stubGlobal` patterns for the two new pings.
- **Manual verification (mandatory, not optional)**: real cookie attachment to the service worker's fetch; `SameSite=None; Secure` actually working over `http://localhost:3000`; `chrome.cookies.onChanged` firing on a real sign-out; `externally_connectable` actually blocking a non-`app.wayline.app` sender. None of this is observable from Vitest/jsdom.
