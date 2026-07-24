import { fileURLToPath } from 'node:url';
import { test as base, chromium, type BrowserContext, type Worker } from '@playwright/test';

const EXTENSION_PATH = fileURLToPath(new URL('../.output/chrome-mv3', import.meta.url));

interface ExtensionFixtures {
  context: BrowserContext;
  serviceWorker: Worker;
  extensionId: string;
}

/**
 * Loads the *built* extension into a persistent Chromium context — MV3 extension loading
 * needs `--load-extension`, which only `launchPersistentContext` supports (docs/06-extension-spec.md §8).
 * Run `pnpm build` before this suite; it loads `.output/chrome-mv3`, not a dev server.
 */
export const test = base.extend<ExtensionFixtures>({
  // eslint-disable-next-line no-empty-pattern -- Playwright's fixture API requires this destructure shape.
  context: async ({}, use) => {
    const context = await chromium.launchPersistentContext('', {
      // MV3 background service workers reliably register only in headed Chromium — headless
      // (including `--headless=new`) intermittently never starts the worker at all as of
      // Playwright 1.61/Chromium 1228. CI runs this under `xvfb-run` (see ci.yml) instead.
      headless: false,
      args: [
        `--disable-extensions-except=${EXTENSION_PATH}`,
        `--load-extension=${EXTENSION_PATH}`,
        '--no-sandbox',
      ],
    });
    await use(context);
    await context.close();
  },
  serviceWorker: async ({ context }, use) => {
    let [worker] = context.serviceWorkers();
    worker ??= await context.waitForEvent('serviceworker');
    await use(worker);
  },
  extensionId: async ({ serviceWorker }, use) => {
    await use(serviceWorker.url().split('/')[2]!);
  },
});

export const expect = test.expect;
