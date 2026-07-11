# 06 · Chrome Extension Specification (WXT · Manifest V3)

## 1. Structure

```
apps/extension/
├─ wxt.config.ts
├─ entrypoints/
│  ├─ background.ts          # service worker: session, capture orchestration, navigation
│  ├─ content.ts             # capture listeners + overlay UI (shadow root)
│  ├─ popup/                 # start/pause/finish, sign-in state
│  └─ sidepanel/             # live walkthrough UI
├─ lib/
│  ├─ capture/               # event normalization, step builder, screenshot queue
│  ├─ descriptor/            # build + score target descriptors
│  ├─ drafts/                # IndexedDB draft store
│  ├─ walkthrough/           # resolver, state machine, overlay driver
│  └─ api/                   # typed client (shared-types), cookie-session fetch
└─ public/icons/
```

### Manifest essentials

```jsonc
{
  "manifest_version": 3,
  "permissions": [
    "activeTab",
    "sidePanel",
    "storage",
    "unlimitedStorage",
    "webNavigation",
    "cookies",
    "scripting",
  ],
  "optional_host_permissions": ["https://*/*", "http://*/*"], // granted per-site at record/follow time
  "host_permissions": ["https://*.wayline.app/*"], // auth cookie + API
  "externally_connectable": { "matches": ["https://app.wayline.app/*"] },
}
```

- **Never request `<all_urls>` at install** — per-site optional grants keep CWS review fast (broad host permissions are the top trigger for weeks-long manual review) and honor the minimum-permission promise.
- Blocked surfaces: `chrome://*`, CWS pages, other extensions — detected before capture/walkthrough; show unsupported-page card.

## 2. MV3 discipline (service worker is ephemeral)

- **All recording/walkthrough state lives in `chrome.storage.session`** (10 MB, memory-only, not content-script-visible), keyed by tab ID. SW globals are cache only; every handler rehydrates.
- Long-lived coordination via alarms + storage, not timers. Side panel ↔ SW via `chrome.runtime.connect` port; content script ↔ SW via message passing with tab-scoped session state.
- Auth: session cookie on `.wayline.app` attached automatically to `fetch` (host permission); identity cached in `storage.session`; `chrome.cookies.onChanged` → signed-out broadcast. See [03-architecture.md §3.2](./03-architecture.md).

## 3. Capture engine

### Event capture (content script, `document_start`, `all_frames: true`)

- Capture-phase listeners on `document`: `pointerdown`/`click`, `change`, `submit`, `keydown` (Enter only, as submit signal). `composedPath()` for shadow-DOM targets; same-origin iframes report through frame messaging (cross-origin iframes → step marked limited).
- Noise filters: ignore focus-only, pointer-move, repeated clicks on same target <500ms, scroll, and events inside Wayline's own overlay.
- **Typed values are never read**: for `input`/`change` the handler reads element _metadata only_ (type, name, label, aria) and generates an instruction ("Enter work email"). Password/CC-type fields additionally auto-flag the step for redaction review. Enforced by a lint rule banning `.value` access in `lib/capture/` + a unit test suite asserting serialized steps contain no captured values ([09-security-privacy.md](./09-security-privacy.md)).

### Step assembly (service worker)

1. Content script sends `action-candidate` (event kind, descriptor, bounds, url, title, viewport).
2. SW debounces to one step per meaningful action; waits for page settle (network-quiet heuristic + 300ms) — SPA route changes tracked via `webNavigation.onHistoryStateUpdated` + content-script Navigation API listener.
3. Screenshot via `chrome.tabs.captureVisibleTab` (JPEG q80). **Hard Chrome quota: 2 captures/sec** — a queue coalesces bursts (rapid actions share the settled screenshot; capture-before-navigation snapshots the pre-click state for navigation steps).
4. Step + Blob written to IndexedDB draft store; pill toast confirms with Undo / ▨ Redact.

### Draft storage (IndexedDB, `unlimitedStorage`)

- `drafts` store: step records (shape mirrors server `steps` + local redaction state); `blobs` store: screenshots keyed by sha-256 (dedup). ~50-step draft ≈ 5–15 MB.
- Drafts are readable by the dashboard editor via the extension messaging bridge (dashboard is `externally_connectable`); step data leaves the device **only** on publish, already-redacted.

## 4. Target descriptors <a name="target-resolution"></a>

Recorded per step (Chrome-DevTools-Recorder-style bundle):

```ts
type TargetDescriptor = {
  testId?: string; // data-testid & friends — weight 1.0
  domId?: string; // weight 0.9 (if not auto-generated-looking)
  role?: { role: string; name: string }; // ARIA role + accessible name — weight 0.85
  label?: string; // associated form label — weight 0.8
  text?: { content: string; tag: string }; // visible text + element type — weight 0.7
  css?: string; // stable-ized CSS path — weight 0.4
  pierce?: string; // shadow-piercing path — weight 0.4
  nth?: number; // disambiguator among equals
  bbox: { x: number; y: number; w: number; h: number; vw: number; vh: number }; // validation only
};
```

### Resolution (walkthrough)

1. Query candidates per signal; score = Σ(weight × match quality) with fuzzy text matching (normalized, trimmed, case-folded; token overlap ≥0.8).
2. Geometry is a **validator, not a selector**: position within 30% of recorded relative position adds +0.1; wildly off subtracts.
3. Thresholds: best ≥ **0.75** _and_ lead over runner-up ≥ **0.2** → highlight. Otherwise → pause card (target-missing or ambiguous). **Never highlight a guess; never auto-act.**
4. Re-resolve on DOM mutation (throttled MutationObserver) while waiting, and after Retry.

## 5. Live walkthrough state machine

```
idle → loading(step) → resolving → { spotlight | paused(reason) }
spotlight --user performs expected action--> verifying → advance | paused
paused --retry--> resolving   paused --skip--> next step   paused --report--> report + next/exit
```

- **Advance detection** (never act for the viewer): click steps — click event on resolved element (or descendant); input steps — change/blur on the field (value never read; only that it changed); navigate steps — `webNavigation` to expected URL pattern.
- Navigation between steps: extension may open/update the tab to the step's recorded URL (the one allowed automation), only with the per-site permission granted.
- Progress persisted in `storage.session` per flow; completion POSTs `session_end + completed` ([10-analytics-spec.md](./10-analytics-spec.md)).
- Overlay: WXT shadow-root UI; dim layer `pointer-events: none` except the pause/consent cards; spotlight cutout leaves the real element fully interactive.

## 6. Failure handling (canonical taxonomy)

| Failure                    | Detection                                      | UX                                                                |
| -------------------------- | ---------------------------------------------- | ----------------------------------------------------------------- |
| Permission missing         | `permissions.contains` before inject           | Permission card, Allow & retry                                    |
| Unsupported page           | URL scheme / CWS / extension page              | Unsupported card                                                  |
| Target missing             | score < threshold after settle + 2 re-resolves | Pause card + reference screenshot, Retry/Skip/Report              |
| Ambiguous match            | lead < 0.2                                     | Same pause card ("we found several similar elements")             |
| Navigation failed          | webNavigation error/timeout 15s                | Pause card with open-URL button                                   |
| SW killed mid-recording    | rehydrate from storage.session on wake         | seamless; pill re-renders                                         |
| Tab closed mid-walkthrough | tabs.onRemoved                                 | side panel offers resume-in-new-tab                               |
| Draft quota/write error    | IDB exception                                  | pause recording, prompt export/publish                            |
| API unreachable            | fetch fail                                     | walkthrough continues (data already loaded); events queue & flush |

## 7. Release engineering

- CWS publish via `chrome-webstore-upload-cli` in GitHub Actions ([07-aws-infrastructure.md §CI/CD](./07-aws-infrastructure.md)); keep the GCP OAuth consent screen in **Production** status (else refresh token dies in 7 days) and run a monthly scheduled dry-run (unused refresh tokens expire ~6 months).
- Review-time posture: minimal permissions + unminified-friendly build (no obfuscation — banned) → aims for the fast automated track; still assume days-to-weeks: **extension must tolerate API skew** (versioned API, additive changes, server feature flags).
- No staged rollout below 10k users — every publish is all-or-nothing; keep a kill-switch feature flag server-side for capture and walkthrough independently.
- Store listing needs: privacy policy URL (landing site), single-purpose description, data-use disclosures matching [09-security-privacy.md](./09-security-privacy.md).

## 8. Testing

- Unit: descriptor build/score (fixture DOMs), step normalization/dedup, **no-typed-values serialization tests**, quota-queue behavior.
- Integration: Playwright + `chromium.launchPersistentContext` with the built extension against a local fixture web app (SPA nav, shadow DOM, iframes) — record → draft → publish → walkthrough happy path + each failure card.
- Manual matrix before each CWS submit: top-20 common SaaS apps checklist (capture + walkthrough).
