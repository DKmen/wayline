# Per-Site Permission Disclosure Design (WAYLI-32)

## Goal

Request the extension's per-site host permission only at record time, with an inline explanation of what is and isn't collected — never `<all_urls>` at install, nothing read before the grant.

## Design

`optional_host_permissions` (`https://*/*`, `http://*/*`) is already declared in `wxt.config.ts`; this ticket wires the check/request flow around it.

- **`background/index.ts`**: `handleStartRecording` gains a permission check (injected as a parameter, same pattern already used for `executeScript`) run after the existing `isRestrictedUrl` check and before script injection. If `browser.permissions.contains` is `false` for the tab's origin, return `{ ok: false, reason: 'permission-missing' }` instead of injecting. This is the single source of truth for "has this site been granted" — a revoked permission simply makes the next check fail again, so no separate revocation-detection path is needed.
- **New util `apps/extension/src/utils/hostPermissionPattern.ts`**: `hostPermissionPatternFor(url): string | null` derives a minimal per-site match pattern (e.g. `https://example.com/*`) from a tab URL; returns `null` for unparsable input. Pure and unit-testable without any browser API.
- **`popup/App.tsx`**: adds a `needs-permission` status next to the existing `unsupported-page` one. On that result it renders an inline disclosure card (plain markup, consistent with the current scaffold — no new shared `packages/ui` component for a single call site) stating what's collected (URLs, clicks, screenshots, only during explicit recording) and what isn't (no typed values, nothing sold or shared), with an **Allow** button. The click handler calls `browser.permissions.request(...)` directly (a real user gesture, required by the browser for permission prompts), and on success re-sends `start-recording`. On denial, it shows a "permission needed" message and does not auto-retry.
- No manifest changes.

## Data flow

1. Popup sends `start-recording` → background.
2. Background: restricted-page check (unchanged) → permission check (new) → inject content script.
3. `permission-missing` → popup renders disclosure card → user clicks Allow → `permissions.request` → on grant, resend `start-recording` (now passes the background check); on deny, show blocked state.

## Testing

- Vitest: `hostPermissionPatternFor` (valid URL → pattern; malformed input → `null`).
- Vitest: `background/index.test.ts` extended — contains=false → `permission-missing`, `executeScript` not called; contains=true → unchanged existing "accepts a normal page" behavior.
- Vitest: `popup/App.test.tsx` extended — allow flow (request resolves true → recording starts) and denial (request resolves false → blocked message, no retry).
- Playwright: new case alongside `restricted-page.spec.ts` exercising the exposed test hook with the injected contains-fn stubbed false (first grant / revoked) and confirming the flow does not inject the content script until permission is present.
