# Per-Site Permission Disclosure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gate content-script injection on a per-site host permission, requested only at record time, with an inline disclosure of what is/isn't collected (WAYLI-32).

**Architecture:** A new pure util derives a minimal per-site match pattern from a tab URL. `handleStartRecording` in the background service worker checks `browser.permissions.contains` for that pattern (injected as a testable parameter, same style as its existing `executeScript` parameter) and returns a new `permission-missing` result instead of injecting when it's absent. The popup renders an inline disclosure card on that result, and its "Allow" button calls `browser.permissions.request` directly inside the click handler (the user gesture the browser requires) before retrying.

**Tech Stack:** WXT (MV3), React 19, `wxt/browser` (webextension-polyfill types), Vitest + React Testing Library, Playwright.

## Global Constraints

- Never request `<all_urls>` or any broad host permission at install — only `optional_host_permissions` requested per-site at use time (docs/06-extension-spec.md §1, root `CLAUDE.md`).
- No `.value`/`textContent` reads in `apps/extension/lib/capture/` — not touched by this plan, but stays true of any code added here (root `CLAUDE.md`).
- 95% coverage thresholds (lines/branches/functions/statements), v8 provider, enforced on `*.test.ts(x)` — Playwright `*.spec.ts` files are not coverage-gated (`.claude/skills/wayline-testing/SKILL.md`).
- Every exported function/component with branching logic needs ≥1 positive test and ≥1 negative test (`.claude/skills/wayline-testing/SKILL.md`).
- One component/function per file convention — this plan keeps each new/modified file to a single responsibility.

---

### Task 1: Host permission pattern util

**Files:**

- Create: `apps/extension/src/utils/hostPermissionPattern.ts`
- Test: `apps/extension/src/utils/hostPermissionPattern.test.ts`

**Interfaces:**

- Produces: `hostPermissionPatternFor(url: string): string | null` — consumed by Task 2 (`background/index.ts`) and Task 3 (`popup/App.tsx`).

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { hostPermissionPatternFor } from './hostPermissionPattern';

describe('hostPermissionPatternFor', () => {
  it('derives a per-site pattern from an https URL with a path and query', () => {
    expect(hostPermissionPatternFor('https://example.com/checkout?x=1')).toBe(
      'https://example.com/*',
    );
  });

  it('derives a per-site pattern from an http URL, dropping the port', () => {
    expect(hostPermissionPatternFor('http://localhost:4300/')).toBe('http://localhost/*');
  });

  it('returns null for a non-http(s) scheme', () => {
    expect(hostPermissionPatternFor('chrome://extensions/')).toBeNull();
  });

  it('returns null for a string that is not a valid URL', () => {
    expect(hostPermissionPatternFor('not a url')).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- apps/extension/src/utils/hostPermissionPattern.test.ts`
Expected: FAIL — `Failed to resolve import "./hostPermissionPattern"` (module doesn't exist yet).

- [ ] **Step 3: Write minimal implementation**

```ts
/** Derives the minimal per-site host-permission match pattern for a URL — never `<all_urls>`. */
export function hostPermissionPatternFor(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;

  return `${parsed.protocol}//${parsed.hostname}/*`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- apps/extension/src/utils/hostPermissionPattern.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/extension/src/utils/hostPermissionPattern.ts apps/extension/src/utils/hostPermissionPattern.test.ts
git commit -m "feat(WAYLI-32): add per-site host permission pattern util"
```

---

### Task 2: Background permission gate

**Files:**

- Modify: `apps/extension/src/entrypoints/background/index.ts`
- Modify: `apps/extension/src/entrypoints/background/index.test.ts`

**Interfaces:**

- Consumes: `hostPermissionPatternFor` from Task 1 (`../../utils/hostPermissionPattern`).
- Produces: `StartRecordingResult = { ok: true } | { ok: false; reason: 'unsupported-page' } | { ok: false; reason: 'permission-missing' }`; `handleStartRecording(url: string, tabId: number, executeScript: ExecuteScript, hasHostPermission: (pattern: string) => Promise<boolean>): Promise<StartRecordingResult>` — the added 4th parameter is consumed by Task 3's popup indirectly (via the `sendMessage` contract's `reason: 'permission-missing'`) and directly by Task 4's Playwright suite.

- [ ] **Step 1: Write the failing test**

Replace `apps/extension/src/entrypoints/background/index.test.ts` in full:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';

const addListener = vi.fn();
const executeScript = vi.fn().mockResolvedValue([]);
const containsPermission = vi.fn();

vi.mock('wxt/browser', () => ({
  browser: {
    runtime: { onMessage: { addListener } },
    scripting: { executeScript },
    permissions: { contains: containsPermission },
  },
}));

const {
  default: backgroundDefinition,
  handleStartRecording,
  isStartRecordingMessage,
} = await import('./index');

const hasHostPermission = vi.fn();

afterEach(() => {
  vi.clearAllMocks();
});

describe('handleStartRecording', () => {
  it('injects the content script and reports ok when permission is granted', async () => {
    hasHostPermission.mockResolvedValue(true);

    const result = await handleStartRecording(
      'https://example.com/',
      7,
      executeScript,
      hasHostPermission,
    );

    expect(result).toEqual({ ok: true });
    expect(hasHostPermission).toHaveBeenCalledWith('https://example.com/*');
    expect(executeScript).toHaveBeenCalledWith({
      target: { tabId: 7 },
      files: ['content-scripts/content.js'],
    });
  });

  it('refuses a restricted page without injecting anything or checking permission', async () => {
    const result = await handleStartRecording(
      'chrome://extensions/',
      7,
      executeScript,
      hasHostPermission,
    );

    expect(result).toEqual({ ok: false, reason: 'unsupported-page' });
    expect(hasHostPermission).not.toHaveBeenCalled();
    expect(executeScript).not.toHaveBeenCalled();
  });

  it('blocks a normal page whose host permission has not been granted', async () => {
    hasHostPermission.mockResolvedValue(false);

    const result = await handleStartRecording(
      'https://example.com/',
      7,
      executeScript,
      hasHostPermission,
    );

    expect(result).toEqual({ ok: false, reason: 'permission-missing' });
    expect(executeScript).not.toHaveBeenCalled();
  });

  it('blocks a page whose URL cannot be turned into a host permission pattern', async () => {
    const result = await handleStartRecording(
      'file:///Users/x/notes.html',
      7,
      executeScript,
      hasHostPermission,
    );

    expect(result).toEqual({ ok: false, reason: 'permission-missing' });
    expect(hasHostPermission).not.toHaveBeenCalled();
    expect(executeScript).not.toHaveBeenCalled();
  });
});

describe('isStartRecordingMessage', () => {
  it('accepts a well-formed start-recording message', () => {
    expect(
      isStartRecordingMessage({ type: 'start-recording', tabId: 1, url: 'https://example.com/' }),
    ).toBe(true);
  });

  it('rejects malformed or unrelated messages', () => {
    expect(isStartRecordingMessage(null)).toBe(false);
    expect(isStartRecordingMessage('start-recording')).toBe(false);
    expect(isStartRecordingMessage({ type: 'something-else' })).toBe(false);
    expect(
      isStartRecordingMessage({ type: 'start-recording', tabId: '1', url: 'https://example.com/' }),
    ).toBe(false);
    expect(isStartRecordingMessage({ type: 'start-recording', tabId: 1 })).toBe(false);
  });
});

describe('background main()', () => {
  it('registers a message listener that forwards a valid start-recording message and checks permission', async () => {
    containsPermission.mockResolvedValue(true);
    backgroundDefinition.main();
    const listener = addListener.mock.calls[0]![0] as (
      message: unknown,
    ) => Promise<unknown> | undefined;

    const result = await listener({
      type: 'start-recording',
      tabId: 3,
      url: 'https://example.com/',
    });

    expect(result).toEqual({ ok: true });
    expect(containsPermission).toHaveBeenCalledWith({ origins: ['https://example.com/*'] });
    expect(executeScript).toHaveBeenCalledWith({
      target: { tabId: 3 },
      files: ['content-scripts/content.js'],
    });
  });

  it('ignores an unrelated message instead of forwarding it', async () => {
    backgroundDefinition.main();
    const listener = addListener.mock.calls[0]![0] as (
      message: unknown,
    ) => Promise<unknown> | undefined;

    const result = await listener({ type: 'something-else' });

    expect(result).toBeUndefined();
    expect(executeScript).not.toHaveBeenCalled();
  });

  it('exposes the dev-only test hook used by the Playwright suite', () => {
    backgroundDefinition.main();

    expect(
      (globalThis as { __wayline_testHandleStartRecording?: unknown })
        .__wayline_testHandleStartRecording,
    ).toBe(handleStartRecording);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- apps/extension/src/entrypoints/background/index.test.ts`
Expected: FAIL — `handleStartRecording` is still 3-arg and `browser.permissions` doesn't exist yet, so calls resolve/behave differently than the new assertions expect (e.g. permission-missing cases still return `{ ok: true }`).

- [ ] **Step 3: Write minimal implementation**

Replace `apps/extension/src/entrypoints/background/index.ts` in full:

```ts
import { browser } from 'wxt/browser';
import { defineBackground } from 'wxt/utils/define-background';
import { hostPermissionPatternFor } from '../../utils/hostPermissionPattern';
import { isRestrictedUrl } from '../../utils/isRestrictedUrl';

export type StartRecordingResult =
  | { ok: true }
  | { ok: false; reason: 'unsupported-page' }
  | { ok: false; reason: 'permission-missing' };

type ExecuteScript = typeof browser.scripting.executeScript;
type HasHostPermission = (pattern: string) => Promise<boolean>;

/**
 * Decides whether the active tab can be recorded and, if so, injects the (runtime-registered,
 * not manifest-declared) content script — docs/06-extension-spec.md §1, §6. Takes
 * `executeScript` and `hasHostPermission` as parameters so this branching logic is testable
 * without a browser.
 */
export async function handleStartRecording(
  url: string,
  tabId: number,
  executeScript: ExecuteScript,
  hasHostPermission: HasHostPermission,
): Promise<StartRecordingResult> {
  if (isRestrictedUrl(url)) return { ok: false, reason: 'unsupported-page' };

  const pattern = hostPermissionPatternFor(url);
  if (!pattern || !(await hasHostPermission(pattern))) {
    return { ok: false, reason: 'permission-missing' };
  }

  await executeScript({ target: { tabId }, files: ['content-scripts/content.js'] });
  return { ok: true };
}

export type StartRecordingMessage = { type: 'start-recording'; tabId: number; url: string };

export function isStartRecordingMessage(message: unknown): message is StartRecordingMessage {
  return (
    typeof message === 'object' &&
    message !== null &&
    (message as { type?: unknown }).type === 'start-recording' &&
    typeof (message as { tabId?: unknown }).tabId === 'number' &&
    typeof (message as { url?: unknown }).url === 'string'
  );
}

export default defineBackground(() => {
  // Sent from the popup (not a content script), so there's no `sender.tab` to read from —
  // the popup queries the active tab itself and passes tabId/url explicitly.
  browser.runtime.onMessage.addListener((message: unknown) => {
    if (!isStartRecordingMessage(message)) return;

    return handleStartRecording(
      message.url,
      message.tabId,
      browser.scripting.executeScript,
      (pattern) => browser.permissions.contains({ origins: [pattern] }),
    );
  });

  // Exposed unconditionally for the Playwright build/load + restricted-page e2e suite
  // (apps/extension/e2e) — this is a pre-launch scaffold, not yet CWS-published, so there's
  // no hardening reason to gate this behind a dev-only build mode yet (revisit in S12).
  Object.assign(globalThis, { __wayline_testHandleStartRecording: handleStartRecording });
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- apps/extension/src/entrypoints/background/index.test.ts`
Expected: PASS (9 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/extension/src/entrypoints/background/index.ts apps/extension/src/entrypoints/background/index.test.ts
git commit -m "feat(WAYLI-32): gate content-script injection on host permission"
```

---

### Task 3: Popup disclosure card

**Files:**

- Modify: `apps/extension/src/entrypoints/popup/App.tsx`
- Modify: `apps/extension/src/entrypoints/popup/App.test.tsx`

**Interfaces:**

- Consumes: `hostPermissionPatternFor` (Task 1), `StartRecordingResult` type incl. `reason: 'permission-missing'` (Task 2).
- Produces: n/a (leaf UI component).

- [ ] **Step 1: Write the failing test**

Replace `apps/extension/src/entrypoints/popup/App.test.tsx` in full:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

const tabsQuery = vi.fn();
const sendMessage = vi.fn();
const permissionsRequest = vi.fn();

vi.mock('wxt/browser', () => ({
  browser: {
    tabs: { query: tabsQuery },
    runtime: { sendMessage },
    permissions: { request: permissionsRequest },
  },
}));

const { App } = await import('./App');

afterEach(() => {
  vi.clearAllMocks();
});

describe('popup App', () => {
  it('starts recording on a normal page', async () => {
    tabsQuery.mockResolvedValue([{ id: 7, url: 'https://example.com/' }]);
    sendMessage.mockResolvedValue({ ok: true });

    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: /start recording/i }));

    expect(sendMessage).toHaveBeenCalledWith({
      type: 'start-recording',
      tabId: 7,
      url: 'https://example.com/',
    });
    expect(await screen.findByRole('button', { name: /start recording/i })).toBeInTheDocument();
  });

  it('shows the unsupported-page empty state for a restricted page', async () => {
    tabsQuery.mockResolvedValue([{ id: 7, url: 'chrome://extensions/' }]);
    sendMessage.mockResolvedValue({ ok: false, reason: 'unsupported-page' });

    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: /start recording/i }));

    expect(await screen.findByText("This page can't be recorded")).toBeInTheDocument();
  });

  it('shows the unsupported-page empty state when there is no active tab to query', async () => {
    tabsQuery.mockResolvedValue([]);

    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: /start recording/i }));

    expect(await screen.findByText("This page can't be recorded")).toBeInTheDocument();
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it('shows the permission disclosure card and starts recording after the user allows', async () => {
    tabsQuery.mockResolvedValue([{ id: 7, url: 'https://example.com/' }]);
    sendMessage
      .mockResolvedValueOnce({ ok: false, reason: 'permission-missing' })
      .mockResolvedValueOnce({ ok: true });
    permissionsRequest.mockResolvedValue(true);

    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: /start recording/i }));

    expect(await screen.findByText('Wayline needs access to this site')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /allow/i }));

    expect(permissionsRequest).toHaveBeenCalledWith({ origins: ['https://example.com/*'] });
    expect(sendMessage).toHaveBeenCalledTimes(2);
    expect(await screen.findByRole('button', { name: /start recording/i })).toBeInTheDocument();
  });

  it('shows a denial message and does not retry when the permission request is refused', async () => {
    tabsQuery.mockResolvedValue([{ id: 7, url: 'https://example.com/' }]);
    sendMessage.mockResolvedValue({ ok: false, reason: 'permission-missing' });
    permissionsRequest.mockResolvedValue(false);

    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: /start recording/i }));
    await userEvent.click(screen.getByRole('button', { name: /allow/i }));

    expect(await screen.findByText(/permission was denied/i)).toBeInTheDocument();
    expect(sendMessage).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- apps/extension/src/entrypoints/popup/App.test.tsx`
Expected: FAIL — no "Wayline needs access to this site" text and no "Allow" button exist yet; `permissionsRequest` is never called.

- [ ] **Step 3: Write minimal implementation**

Replace `apps/extension/src/entrypoints/popup/App.tsx` in full:

```tsx
import { useState } from 'react';
import { Button, EmptyState } from '@wayline/ui';
import { browser } from 'wxt/browser';
import { hostPermissionPatternFor } from '../../utils/hostPermissionPattern';
import type { StartRecordingResult } from '../background';

type Status = 'idle' | 'starting' | 'unsupported-page' | 'needs-permission' | 'permission-denied';

type ActiveTab = { id: number; url: string };

async function requestStart(tabId: number, url: string): Promise<StartRecordingResult> {
  return (await browser.runtime.sendMessage({
    type: 'start-recording',
    tabId,
    url,
  })) as StartRecordingResult;
}

/** Popup — start/pause/finish, sign-in state (docs/06-extension-spec.md §1). Sign-in and pause/finish land with the auth bridge and capture-engine tickets; this is the start-recording scaffold. */
export function App() {
  const [status, setStatus] = useState<Status>('idle');
  const [tab, setTab] = useState<ActiveTab | null>(null);

  async function handleStart() {
    setStatus('starting');
    const [activeTab] = await browser.tabs.query({ active: true, currentWindow: true });
    if (!activeTab?.id || !activeTab.url) {
      setStatus('unsupported-page');
      return;
    }

    setTab({ id: activeTab.id, url: activeTab.url });
    const result = await requestStart(activeTab.id, activeTab.url);

    if (result.ok) {
      setStatus('idle');
      return;
    }
    setStatus(result.reason === 'permission-missing' ? 'needs-permission' : 'unsupported-page');
  }

  async function handleAllow() {
    if (!tab) return;

    const pattern = hostPermissionPatternFor(tab.url);
    const granted = pattern ? await browser.permissions.request({ origins: [pattern] }) : false;

    if (!granted) {
      setStatus('permission-denied');
      return;
    }

    setStatus('starting');
    const result = await requestStart(tab.id, tab.url);
    setStatus(result.ok ? 'idle' : 'unsupported-page');
  }

  if (status === 'unsupported-page') {
    return <EmptyState title="This page can't be recorded" description="Try a different tab." />;
  }

  if (status === 'needs-permission' || status === 'permission-denied') {
    return (
      <div style={{ padding: 16 }}>
        <p>Wayline needs access to this site</p>
        <p>
          While you're recording, Wayline captures the page URL, clicks, and screenshots. It never
          reads what you type, and nothing is sold or shared.
        </p>
        {status === 'permission-denied' && (
          <p>Permission was denied — try again when you're ready.</p>
        )}
        <Button onClick={handleAllow}>Allow</Button>
      </div>
    );
  }

  return (
    <div style={{ padding: 16 }}>
      <p>Wayline</p>
      <Button onClick={handleStart} disabled={status === 'starting'}>
        {status === 'starting' ? 'Starting…' : 'Start recording'}
      </Button>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- apps/extension/src/entrypoints/popup/App.test.tsx`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/extension/src/entrypoints/popup/App.tsx apps/extension/src/entrypoints/popup/App.test.tsx
git commit -m "feat(WAYLI-32): show per-site permission disclosure card in popup"
```

---

### Task 4: Playwright e2e coverage

**Files:**

- Modify: `apps/extension/e2e/restricted-page.spec.ts`
- Create: `apps/extension/e2e/permission-disclosure.spec.ts`

**Interfaces:**

- Consumes: `__wayline_testHandleStartRecording` exposed by Task 2's `background/index.ts`, now a 4-arg function. Requires a fresh build (`pnpm build` in `apps/extension`) before running, per `e2e/extension-fixtures.ts`'s comment.

- [ ] **Step 1: Update the existing restricted-page spec's test-hook signature**

Replace `apps/extension/e2e/restricted-page.spec.ts` in full:

```ts
import { expect, test } from './extension-fixtures';

declare global {
  var __wayline_testHandleStartRecording:
    | ((
        url: string,
        tabId: number,
        executeScript: unknown,
        hasHostPermission: (pattern: string) => Promise<boolean>,
      ) => Promise<{ ok: boolean; reason?: string }>)
    | undefined;
}

test.describe('restricted-page failure state (WAYLI-31 acceptance)', () => {
  test('refuses to record a chrome:// page', { tag: '@smoke' }, async ({ serviceWorker }) => {
    const result = await serviceWorker.evaluate(async () => {
      const executeScript = async () => [];
      const hasHostPermission = async () => true;
      return globalThis.__wayline_testHandleStartRecording!(
        'chrome://extensions/',
        1,
        executeScript,
        hasHostPermission,
      );
    });

    expect(result).toEqual({ ok: false, reason: 'unsupported-page' });
  });

  test('accepts a normal page', { tag: '@smoke' }, async ({ serviceWorker }) => {
    const result = await serviceWorker.evaluate(async () => {
      const calls: unknown[] = [];
      const executeScript = async (...args: unknown[]) => {
        calls.push(args);
        return [];
      };
      const hasHostPermission = async () => true;
      const outcome = await globalThis.__wayline_testHandleStartRecording!(
        'http://localhost:4300/',
        1,
        executeScript,
        hasHostPermission,
      );
      return { outcome, calls };
    });

    expect(result.outcome).toEqual({ ok: true });
    expect(result.calls).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Write the new permission-disclosure spec**

Create `apps/extension/e2e/permission-disclosure.spec.ts`:

```ts
import { expect, test } from './extension-fixtures';

declare global {
  var __wayline_testHandleStartRecording:
    | ((
        url: string,
        tabId: number,
        executeScript: unknown,
        hasHostPermission: (pattern: string) => Promise<boolean>,
      ) => Promise<{ ok: boolean; reason?: string }>)
    | undefined;
}

test.describe('per-site permission disclosure (WAYLI-32 acceptance)', () => {
  test(
    'blocks capture on a normal page until the host permission is granted',
    { tag: '@smoke' },
    async ({ serviceWorker }) => {
      const result = await serviceWorker.evaluate(async () => {
        const executeScript = async () => [];
        const hasHostPermission = async () => false;
        return globalThis.__wayline_testHandleStartRecording!(
          'https://example.com/',
          1,
          executeScript,
          hasHostPermission,
        );
      });

      expect(result).toEqual({ ok: false, reason: 'permission-missing' });
    },
  );

  test(
    'proceeds and injects once the host permission has been granted',
    { tag: '@smoke' },
    async ({ serviceWorker }) => {
      const result = await serviceWorker.evaluate(async () => {
        const calls: unknown[] = [];
        const executeScript = async (...args: unknown[]) => {
          calls.push(args);
          return [];
        };
        const hasHostPermission = async () => true;
        const outcome = await globalThis.__wayline_testHandleStartRecording!(
          'https://example.com/',
          1,
          executeScript,
          hasHostPermission,
        );
        return { outcome, calls };
      });

      expect(result.outcome).toEqual({ ok: true });
      expect(result.calls).toHaveLength(1);
    },
  );
});
```

- [ ] **Step 3: Build the extension and run the e2e suite**

Run: `pnpm --filter @wayline/extension build && pnpm --filter @wayline/extension test:e2e`
Expected: PASS — all `restricted-page.spec.ts` and `permission-disclosure.spec.ts` tests green.

- [ ] **Step 4: Commit**

```bash
git add apps/extension/e2e/restricted-page.spec.ts apps/extension/e2e/permission-disclosure.spec.ts
git commit -m "test(WAYLI-32): cover permission-missing/granted flow in e2e suite"
```

---

## Final verification

- [ ] **Full suite + coverage**: `pnpm test:coverage` from repo root — green, 95% thresholds hold.
- [ ] **Lint + typecheck**: `pnpm lint && pnpm --filter @wayline/extension typecheck`.
- [ ] **Manual smoke** (optional but recommended given the extension can't run in CI headless): `pnpm --filter @wayline/extension dev`, load the unpacked extension, open the popup on a fresh site, confirm the disclosure card text and Allow flow render as expected.
- [ ] Move WAYLI-32 to `In Review` in Plane and open the PR per `wayline-workflow` (title includes `WAYLI-32`; flag `/security-review` given the `privacy`/`security` labels).
