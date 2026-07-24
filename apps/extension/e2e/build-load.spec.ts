import { expect, test } from './extension-fixtures';

test.describe('extension build/load (WAYLI-31 acceptance)', () => {
  test(
    'loads the built extension with a running service worker',
    { tag: '@smoke' },
    async ({ serviceWorker, extensionId }) => {
      expect(extensionId).toMatch(/^[a-p]{32}$/);
      expect(serviceWorker.url()).toBe(`chrome-extension://${extensionId}/background.js`);
    },
  );

  test(
    'opens the popup and shows the start-recording action',
    { tag: '@smoke' },
    async ({ context, extensionId }) => {
      const page = await context.newPage();
      await page.goto(`chrome-extension://${extensionId}/popup.html`);

      await expect(page.getByRole('button', { name: 'Start recording' })).toBeVisible();
    },
  );
});
