# Dashboard Extension-Install Detection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the dashboard detect, live and without a page reload, whether the Wayline extension is installed (WAYLI-33).

**Architecture:** The extension gains a `browser.runtime.onMessageExternal` listener that answers a `{type:'ping'}` message with `{installed:true}`. The dashboard polls that listener via `chrome.runtime.sendMessage`, wrapped in a testable pure function, a TanStack Query hook (`refetchInterval`), and a small Badge in the signed-in shell header.

**Tech Stack:** WXT (MV3) background service worker; Vite + React 19 dashboard; TanStack Query; Vitest + React Testing Library; `@wayline/ui` Badge.

## Global Constraints

- No manual sender/origin check in the extension's new listener — `externally_connectable.matches: ['https://app.wayline.app/*']` (`apps/extension/wxt.config.ts`) already restricts who can reach it at the browser level.
- 95% coverage thresholds (lines/branches/functions/statements), v8 provider, enforced on `*.test.ts(x)`.
- Every exported function/component with branching logic needs ≥1 positive test and ≥1 negative test.
- One component/function per file convention.
- No hardcoded hex colors — Badge variants come from `packages/ui`'s existing tokens.
- Any state conveyed by color needs a non-color signifier too — satisfied here by the Badge's differing text, no icon needed.
- Exported functions/hooks/components get a one-line doc-comment stating purpose (root `CLAUDE.md`).

---

### Task 1: Extension-side install-ping responder

**Files:**

- Modify: `apps/extension/src/entrypoints/background/index.ts`
- Modify: `apps/extension/src/entrypoints/background/index.test.ts`

**Interfaces:**

- Produces: `isPingMessage(message: unknown): message is PingMessage` and a registered `browser.runtime.onMessageExternal` listener responding `{ installed: true }` to `{ type: 'ping' }`. Not consumed by any other task in this plan (the dashboard side is tested entirely through a mocked `chrome` global) — this task is independent of Tasks 2-4 and can be done in either order.

- [ ] **Step 1: Write the failing test**

Replace `apps/extension/src/entrypoints/background/index.test.ts` in full:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';

const addListener = vi.fn();
const addListenerExternal = vi.fn();
const executeScript = vi.fn().mockResolvedValue([]);
const containsPermission = vi.fn();

vi.mock('wxt/browser', () => ({
  browser: {
    runtime: {
      onMessage: { addListener },
      onMessageExternal: { addListener: addListenerExternal },
    },
    scripting: { executeScript },
    permissions: { contains: containsPermission },
  },
}));

const {
  default: backgroundDefinition,
  handleStartRecording,
  isStartRecordingMessage,
  isPingMessage,
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

    expect(result).toEqual({ ok: false, reason: 'unsupported-page' });
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

describe('isPingMessage', () => {
  it('accepts a well-formed ping message', () => {
    expect(isPingMessage({ type: 'ping' })).toBe(true);
  });

  it('rejects malformed or unrelated messages', () => {
    expect(isPingMessage(null)).toBe(false);
    expect(isPingMessage('ping')).toBe(false);
    expect(isPingMessage({ type: 'something-else' })).toBe(false);
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

  it('registers an external message listener that responds to a ping', async () => {
    backgroundDefinition.main();
    const listener = addListenerExternal.mock.calls[0]![0] as (
      message: unknown,
    ) => Promise<unknown> | undefined;

    const result = await listener({ type: 'ping' });

    expect(result).toEqual({ installed: true });
  });

  it('ignores an unrelated external message', async () => {
    backgroundDefinition.main();
    const listener = addListenerExternal.mock.calls[0]![0] as (
      message: unknown,
    ) => Promise<unknown> | undefined;

    const result = await listener({ type: 'something-else' });

    expect(result).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- apps/extension/src/entrypoints/background/index.test.ts`
Expected: FAIL — `isPingMessage` is not exported yet, and `onMessageExternal` isn't registered.

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
  if (!pattern) return { ok: false, reason: 'unsupported-page' };
  if (!(await hasHostPermission(pattern))) {
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

export type PingMessage = { type: 'ping' };

export function isPingMessage(message: unknown): message is PingMessage {
  return (
    typeof message === 'object' &&
    message !== null &&
    (message as { type?: unknown }).type === 'ping'
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

  // externally_connectable restricts senders to https://app.wayline.app/* (wxt.config.ts) —
  // the browser enforces that boundary before this listener ever runs (WAYLI-33).
  browser.runtime.onMessageExternal.addListener((message: unknown) => {
    if (!isPingMessage(message)) return;
    return Promise.resolve({ installed: true });
  });

  // Exposed unconditionally for the Playwright build/load + restricted-page e2e suite
  // (apps/extension/e2e) — this is a pre-launch scaffold, not yet CWS-published, so there's
  // no hardening reason to gate this behind a dev-only build mode yet (revisit in S12).
  Object.assign(globalThis, { __wayline_testHandleStartRecording: handleStartRecording });
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- apps/extension/src/entrypoints/background/index.test.ts`
Expected: PASS (13 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/extension/src/entrypoints/background/index.ts apps/extension/src/entrypoints/background/index.test.ts
git commit -m "feat(WAYLI-33): respond to extension-install ping from the dashboard"
```

---

### Task 2: Dashboard extension-ID config + install-check util

**Files:**

- Modify: `apps/dashboard/src/env.ts`
- Modify: `apps/dashboard/src/env.test.ts`
- Create: `apps/dashboard/src/lib/extension.ts`
- Create: `apps/dashboard/src/lib/extension.test.ts`

**Interfaces:**

- Produces: `env.VITE_EXTENSION_ID: string` and `checkExtensionInstalled(extensionId: string): Promise<boolean>` — consumed by Task 3's hook.

- [ ] **Step 1: Write the failing tests**

Replace `apps/dashboard/src/env.test.ts` in full:

```ts
import { createEnv } from '@wayline/config';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

// Re-derive the same schema shape as env.ts rather than importing the module (which
// reads import.meta.env at import time) — this test exercises createEnv's behavior
// against controlled inputs instead of the ambient Vite env.
const schema = z.object({
  VITE_API_URL: z.string().default(''),
  VITE_EXTENSION_ID: z.string().default(''),
});

describe('dashboard env schema', () => {
  it('defaults VITE_API_URL and VITE_EXTENSION_ID to empty when unset', () => {
    expect(createEnv(schema, {})).toEqual({ VITE_API_URL: '', VITE_EXTENSION_ID: '' });
  });

  it('accepts an explicit cross-origin API URL', () => {
    expect(createEnv(schema, { VITE_API_URL: 'https://api.wayline.app' })).toEqual({
      VITE_API_URL: 'https://api.wayline.app',
      VITE_EXTENSION_ID: '',
    });
  });

  it('accepts an explicit extension ID', () => {
    expect(createEnv(schema, { VITE_EXTENSION_ID: 'abcdefghijklmnopabcdefghijklmnop' })).toEqual({
      VITE_API_URL: '',
      VITE_EXTENSION_ID: 'abcdefghijklmnopabcdefghijklmnop',
    });
  });

  it('throws with every invalid key listed when a var has the wrong type', () => {
    const badSchema = z.object({ VITE_API_URL: z.number() });
    expect(() => createEnv(badSchema, { VITE_API_URL: 'not-a-number' })).toThrowError(
      /VITE_API_URL/,
    );
  });
});
```

Create `apps/dashboard/src/lib/extension.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import { checkExtensionInstalled } from './extension';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('checkExtensionInstalled', () => {
  it('resolves true when the extension responds to the ping', async () => {
    vi.stubGlobal('chrome', {
      runtime: {
        sendMessage: (_id: string, _message: unknown, callback: (response: unknown) => void) =>
          callback({ installed: true }),
      },
    });

    await expect(checkExtensionInstalled('abc')).resolves.toBe(true);
  });

  it('resolves false when chrome is not present in the page at all', async () => {
    await expect(checkExtensionInstalled('abc')).resolves.toBe(false);
  });

  it('resolves false when the extension is unreachable (lastError set)', async () => {
    vi.stubGlobal('chrome', {
      runtime: {
        sendMessage: (_id: string, _message: unknown, callback: (response: unknown) => void) =>
          callback(undefined),
        lastError: { message: 'Could not establish connection. Receiving end does not exist.' },
      },
    });

    await expect(checkExtensionInstalled('abc')).resolves.toBe(false);
  });

  it('resolves false when the extension ID is empty', async () => {
    vi.stubGlobal('chrome', { runtime: { sendMessage: vi.fn() } });

    await expect(checkExtensionInstalled('')).resolves.toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test -- apps/dashboard/src/env.test.ts apps/dashboard/src/lib/extension.test.ts`
Expected: FAIL — `env.test.ts` fails on the new `VITE_EXTENSION_ID` assertions (schema doesn't produce that key yet in `env.ts`, though this test re-derives its own schema so it actually passes in isolation; the real signal is `extension.test.ts` failing with "Failed to resolve import './extension'" since the module doesn't exist).

- [ ] **Step 3: Write minimal implementation**

Replace `apps/dashboard/src/env.ts` in full:

```ts
import { createEnv } from '@wayline/config';
import { z } from 'zod';

const schema = z.object({
  // Empty default = same-origin, proxied through Vite's dev server / a same-origin
  // production deploy (see D1 in the WAYLI-29 plan) — set only if the API is genuinely
  // cross-origin.
  VITE_API_URL: z.string().default(''),
  // Empty default until the extension is CWS-published — the ID differs between a
  // dev-loaded unpacked build and the published Chrome Web Store ID (WAYLI-33).
  VITE_EXTENSION_ID: z.string().default(''),
});

/** Zod-validated import.meta.env for apps/dashboard — boot fails loudly on an invalid var. */
export const env = createEnv(schema, import.meta.env as unknown as NodeJS.ProcessEnv);
export type Env = z.infer<typeof schema>;
```

Create `apps/dashboard/src/lib/extension.ts`:

```ts
type ChromeRuntime = {
  sendMessage?: (
    extensionId: string,
    message: unknown,
    callback: (response: unknown) => void,
  ) => void;
  lastError?: { message: string };
};

/** Probes whether the Wayline extension is installed via its external-message ping — resolves false alike for "not installed" and "unreachable/blocked". */
export async function checkExtensionInstalled(extensionId: string): Promise<boolean> {
  const runtime = (globalThis as { chrome?: { runtime?: ChromeRuntime } }).chrome?.runtime;
  if (!extensionId || !runtime?.sendMessage) return false;

  return new Promise((resolve) => {
    runtime.sendMessage!(extensionId, { type: 'ping' }, (response) => {
      if (runtime.lastError) {
        resolve(false);
        return;
      }
      resolve((response as { installed?: boolean } | undefined)?.installed === true);
    });
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test -- apps/dashboard/src/env.test.ts apps/dashboard/src/lib/extension.test.ts`
Expected: PASS (8 tests total)

- [ ] **Step 5: Commit**

```bash
git add apps/dashboard/src/env.ts apps/dashboard/src/env.test.ts apps/dashboard/src/lib/extension.ts apps/dashboard/src/lib/extension.test.ts
git commit -m "feat(WAYLI-33): add VITE_EXTENSION_ID config and checkExtensionInstalled probe"
```

---

### Task 3: `useExtensionInstalled` hook

**Files:**

- Create: `apps/dashboard/src/hooks/use-extension-installed.ts`
- Create: `apps/dashboard/src/hooks/use-extension-installed.test.tsx`

**Interfaces:**

- Consumes: `checkExtensionInstalled` from Task 2 (`../lib/extension`), `env` from `../env`.
- Produces: `useExtensionInstalled()` returning a TanStack Query result whose `data` is `boolean | undefined` — consumed by Task 4's `AppShell`.

- [ ] **Step 1: Write the failing test**

Create `apps/dashboard/src/hooks/use-extension-installed.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../env', () => ({ env: { VITE_API_URL: '', VITE_EXTENSION_ID: 'test-extension-id' } }));

const { useExtensionInstalled } = await import('./use-extension-installed');

afterEach(() => {
  vi.unstubAllGlobals();
});

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('useExtensionInstalled', () => {
  it('resolves true when the extension responds to the ping', async () => {
    vi.stubGlobal('chrome', {
      runtime: {
        sendMessage: (_id: string, _message: unknown, callback: (response: unknown) => void) =>
          callback({ installed: true }),
      },
    });

    const { result } = renderHook(() => useExtensionInstalled(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe(true);
  });

  it('resolves false when the extension is not installed', async () => {
    const { result } = renderHook(() => useExtensionInstalled(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- apps/dashboard/src/hooks/use-extension-installed.test.tsx`
Expected: FAIL — `Failed to resolve import './use-extension-installed'` (module doesn't exist yet).

- [ ] **Step 3: Write minimal implementation**

Create `apps/dashboard/src/hooks/use-extension-installed.ts`:

```ts
import { useQuery } from '@tanstack/react-query';
import { env } from '../env';
import { checkExtensionInstalled } from '../lib/extension';

/** Polls the extension's install ping every few seconds so onboarding UI reflects install state live, without a reload. */
export function useExtensionInstalled() {
  return useQuery({
    queryKey: ['extension-installed'],
    queryFn: () => checkExtensionInstalled(env.VITE_EXTENSION_ID),
    refetchInterval: 3000,
    retry: false,
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- apps/dashboard/src/hooks/use-extension-installed.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/dashboard/src/hooks/use-extension-installed.ts apps/dashboard/src/hooks/use-extension-installed.test.tsx
git commit -m "feat(WAYLI-33): add useExtensionInstalled polling hook"
```

---

### Task 4: Shell Badge indicator

**Files:**

- Modify: `apps/dashboard/src/components/Shell/AppShell.tsx`
- Modify: `apps/dashboard/src/components/Shell/AppShell.test.tsx`

**Interfaces:**

- Consumes: `useExtensionInstalled` from Task 3 (`../../hooks/use-extension-installed`), `Badge` from `@wayline/ui`.

- [ ] **Step 1: Write the failing tests**

Replace `apps/dashboard/src/components/Shell/AppShell.test.tsx` in full:

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../env', () => ({ env: { VITE_API_URL: '', VITE_EXTENSION_ID: 'test-extension-id' } }));

const { AppShell } = await import('./AppShell');

afterEach(() => {
  vi.unstubAllGlobals();
});

function buildRouter() {
  const rootRoute = createRootRoute({ component: AppShell });
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => <p>Home content</p>,
  });
  const signInRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/sign-in',
    component: () => <p>Sign-in content</p>,
  });
  const routeTree = rootRoute.addChildren([indexRoute, signInRoute]);

  return createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: ['/'] }),
  });
}

function renderShell() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = buildRouter();

  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

describe('AppShell', () => {
  it('renders a primary nav landmark and main content area', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify(null), { status: 200 })),
    );

    renderShell();

    expect(await screen.findByText('Home content')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Primary' })).toBeInTheDocument();
  });

  it('shows the signed-in email and a working sign-out action', async () => {
    const sessionBody = JSON.stringify({
      session: { expiresAt: '2026-08-01T00:00:00.000Z' },
      user: { id: 'user_1', email: 'ada@example.com', name: 'Ada' },
    });
    // Each call needs its own Response instance — a body can only be consumed once,
    // and this flow calls fetch twice: get-session, then the sign-out POST.
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((input: RequestInfo | URL) => {
        const url = typeof input === 'string' ? input : input.toString();
        if (url.includes('/sign-out')) {
          return Promise.resolve(new Response(JSON.stringify({ status: true }), { status: 200 }));
        }
        return Promise.resolve(new Response(sessionBody, { status: 200 }));
      }),
    );

    renderShell();

    expect(await screen.findByText('ada@example.com')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    await waitFor(() => expect(screen.getByText('Sign-in content')).toBeInTheDocument());
  });

  it('shows an alert and stays signed in when sign-out fails', async () => {
    const sessionBody = JSON.stringify({
      session: { expiresAt: '2026-08-01T00:00:00.000Z' },
      user: { id: 'user_1', email: 'ada@example.com', name: 'Ada' },
    });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((input: RequestInfo | URL) => {
        const url = typeof input === 'string' ? input : input.toString();
        if (url.includes('/sign-out')) {
          return Promise.resolve(new Response('', { status: 500 }));
        }
        return Promise.resolve(new Response(sessionBody, { status: 200 }));
      }),
    );

    renderShell();

    expect(await screen.findByText('ada@example.com')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/couldn't sign out/i);
    expect(screen.getByText('Home content')).toBeInTheDocument();
    expect(screen.getByText('ada@example.com')).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify(null), { status: 200 })),
    );

    const { container } = renderShell();
    await screen.findByText('Home content');

    expect(await axe(container)).toHaveNoViolations();
  });

  it('shows "Extension installed" when the extension responds to the ping', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify(null), { status: 200 })),
    );
    vi.stubGlobal('chrome', {
      runtime: {
        sendMessage: (_id: string, _message: unknown, callback: (response: unknown) => void) =>
          callback({ installed: true }),
      },
    });

    renderShell();

    expect(await screen.findByText('Extension installed')).toBeInTheDocument();
  });

  it('shows "Extension not detected" when the extension is absent', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify(null), { status: 200 })),
    );

    renderShell();

    expect(await screen.findByText('Extension not detected')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `pnpm test -- apps/dashboard/src/components/Shell/AppShell.test.tsx`
Expected: FAIL — no "Extension installed"/"Extension not detected" text exists in the rendered shell yet; the 4 pre-existing tests still pass.

- [ ] **Step 3: Write minimal implementation**

Replace `apps/dashboard/src/components/Shell/AppShell.tsx` in full:

```tsx
import { useState } from 'react';
import { Link, Outlet, useNavigate } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { Badge, Button } from '@wayline/ui';
import { useExtensionInstalled } from '../../hooks/use-extension-installed';
import { useSession } from '../../hooks/use-session';
import { fetchJson } from '../../lib/api-client';
import { sessionQueryOptions } from '../../lib/session';
import { SkipLink } from './SkipLink';

/** Signed-in shell: skip link, primary nav, and the active route's content. */
export function AppShell() {
  const { data: session } = useSession();
  const { data: extensionInstalled } = useExtensionInstalled();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [signOutError, setSignOutError] = useState(false);

  async function handleSignOut() {
    setSignOutError(false);
    try {
      await fetchJson('/api/auth/sign-out', { method: 'POST' });
    } catch {
      setSignOutError(true);
      return;
    }
    // Sign-out just succeeded server-side, so the answer is already known — write it
    // directly instead of invalidateQueries, which would trigger a redundant refetch
    // of the still-active session query and delay the redirect below on it.
    queryClient.setQueryData(sessionQueryOptions.queryKey, null);
    await navigate({ to: '/sign-in' });
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <SkipLink />
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <nav aria-label="Primary">
          {/* TanStack Router stamps aria-current="page" on the active Link automatically. */}
          <Link to="/" className="font-medium text-foreground aria-[current=page]:text-primary">
            Wayline
          </Link>
        </nav>
        <div className="flex items-center gap-3">
          <Badge variant={extensionInstalled ? 'default' : 'outline'}>
            {extensionInstalled ? 'Extension installed' : 'Extension not detected'}
          </Badge>
          {session?.user ? (
            <>
              {signOutError ? (
                <span role="alert" className="text-sm text-destructive">
                  Couldn&apos;t sign out. Try again.
                </span>
              ) : null}
              <span className="text-sm text-muted-foreground">{session.user.email}</span>
              <Button variant="outline" onClick={handleSignOut}>
                Sign out
              </Button>
            </>
          ) : null}
        </div>
      </header>
      <main id="main" className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test -- apps/dashboard/src/components/Shell/AppShell.test.tsx`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/dashboard/src/components/Shell/AppShell.tsx apps/dashboard/src/components/Shell/AppShell.test.tsx
git commit -m "feat(WAYLI-33): show extension-install status badge in the dashboard shell"
```

---

## Final verification

- [ ] **Full suite + coverage**: `pnpm test:coverage` from repo root — green, 95% thresholds hold.
- [ ] **Lint + typecheck**: `pnpm lint && pnpm --filter @wayline/extension typecheck && pnpm --filter @wayline/dashboard typecheck`.
- [ ] **Manual smoke** (optional but recommended): `pnpm --filter @wayline/extension dev` to load the unpacked extension and note its dev extension ID from `chrome://extensions`, set `VITE_EXTENSION_ID` in `apps/dashboard/.env.local` to that ID, `pnpm --filter @wayline/dashboard dev`, confirm the Badge flips between states as the extension is enabled/disabled in `chrome://extensions` without reloading the dashboard tab.
- [ ] Move WAYLI-33 to `In Review` in Plane and open the PR per `wayline-workflow` (title includes `WAYLI-33`).
