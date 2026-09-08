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
  var __wayline_testActionCandidates: unknown[] | undefined;

  // No @types/chrome dependency in this repo (WXT types `browser`, not raw `chrome`) — this
  // spec is the first to call the real chrome.* APIs inside a serviceWorker.evaluate callback,
  // so it declares only the minimal shape it actually uses.
  const chrome: {
    tabs: {
      query: (info: {
        active?: boolean;
        lastFocusedWindow?: boolean;
      }) => Promise<{ id?: number; url?: string }[]>;
    };
    scripting: {
      executeScript: (injection: {
        target: { tabId: number };
        files: string[];
      }) => Promise<unknown>;
    };
  };
}

test.describe('capture engine — no typed values leak (WAYLI-35 acceptance)', () => {
  test(
    'captures form interactions on the fixture page without leaking the typed password',
    { tag: '@smoke' },
    async ({ context, serviceWorker }) => {
      const page = await context.newPage();
      await page.goto('/forms');

      // build:e2e (see extension-fixtures.ts) pre-grants http://localhost:4300/* as a real
      // host_permission, so this injects the real built content script via the real
      // chrome.scripting.executeScript — hasHostPermission is stubbed only because this spec
      // isn't re-testing the popup permission-prompt UX (that's WAYLI-31/32's coverage).
      const injectionResult = await serviceWorker.evaluate(async () => {
        const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
        if (!tab?.id || !tab.url) return { ok: false, reason: 'tab-not-found' as const };

        return globalThis.__wayline_testHandleStartRecording!(
          tab.url,
          tab.id,
          chrome.scripting.executeScript.bind(chrome.scripting),
          async () => true,
        );
      });

      expect(injectionResult.ok, JSON.stringify(injectionResult)).toBe(true);

      await page.waitForSelector('[data-wayline-overlay="ready"]', { state: 'attached' });

      await page.fill('input[name="password"]', 'hunter2-e2e-probe');
      await page.click('[data-testid="fixture-form-submit"]');

      const candidates = await serviceWorker.evaluate(
        () => globalThis.__wayline_testActionCandidates,
      );

      expect(candidates?.length ?? 0).toBeGreaterThan(0);
      expect(JSON.stringify(candidates)).not.toContain('hunter2-e2e-probe');
    },
  );
});
