# Dashboard Extension-Install Detection Design (WAYLI-33)

## Goal

Let the dashboard detect, live and without a page reload, whether the Wayline extension is installed — the underlying signal the S9 onboarding checklist will later consume. This ticket ships the detection primitive and one small real UI surface for it, not the checklist itself.

## Design

There is no push channel from extension to page — `externally_connectable` only lets a matching page _initiate_ `chrome.runtime.sendMessage(extensionId, ...)` to the extension, which responds. Detection is therefore a polled probe, not an event.

- **Extension** (`apps/extension/src/entrypoints/background/index.ts`): add `isPingMessage` (mirrors the existing `isStartRecordingMessage` type-guard pattern) and a `browser.runtime.onMessageExternal.addListener` that responds `{ installed: true }` to `{ type: 'ping' }` and ignores anything else. No manual sender/origin check — the manifest's `externally_connectable.matches: ['https://app.wayline.app/*']` already restricts who can reach this listener.
- **`apps/dashboard/src/env.ts`**: add `VITE_EXTENSION_ID` (empty-string default, same reasoning as the existing `VITE_API_URL` — differs per environment: dev unpacked ID vs. the published CWS ID).
- **`apps/dashboard/src/lib/extension.ts`**: `checkExtensionInstalled(extensionId): Promise<boolean>` wraps `chrome.runtime.sendMessage` in a Promise. Resolves `false` if `chrome`/`chrome.runtime` is absent, `extensionId` is empty, or `chrome.runtime.lastError` is set after the callback fires (Chrome calls back immediately with `lastError` for an unreachable/unknown extension ID — no manual timeout needed, and this path covers both "not installed" and "blocked" uniformly). Resolves `true` only when the response is exactly `{ installed: true }`.
- **`apps/dashboard/src/hooks/use-extension-installed.ts`**: `useQuery` calling `checkExtensionInstalled(env.VITE_EXTENSION_ID)` with a `refetchInterval` (3s) and `retry: false` — same shape as `useSession`. Polling is what makes "changes without reload" true; TanStack Query's existing conventions (`Server-derived data → useQuery`) cover an external-system probe like this.
- **`apps/dashboard/src/components/Shell/AppShell.tsx`**: one `<Badge>` in the header driven by the hook, text reading "Extension installed" / "Extension not detected" — the differing text itself satisfies the "color must have a non-color signifier" accessibility rule; no icon needed.

## Data flow

1. `AppShell` renders → `useExtensionInstalled` fires `checkExtensionInstalled` immediately and every 3s after.
2. `checkExtensionInstalled` calls `chrome.runtime.sendMessage(extensionId, {type:'ping'}, callback)`.
3. If the extension is installed and its `onMessageExternal` listener responds `{installed:true}` → hook resolves `true` → Badge reads "Extension installed".
4. Any other outcome (extension absent, wrong ID, `lastError`) → hook resolves `false` → Badge reads "Extension not detected".

## Testing

- Extension: `background/index.test.ts` extended — ping → `{installed:true}`; non-ping external message ignored.
- Dashboard: `lib/extension.test.ts` — success (`chrome.runtime.sendMessage` responds `{installed:true}`), `chrome` entirely absent, and `chrome.runtime.lastError` set (the "missing" and "blocked" cases the ticket names, both resolving to `false`). Mocking follows `useSession.test.tsx`'s established `vi.stubGlobal` pattern.
- `use-extension-installed.test.tsx` and an `AppShell.test.tsx` addition covering both Badge states, same `vi.stubGlobal('chrome', ...)` approach.
