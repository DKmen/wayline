import { expect, test } from '@playwright/test';

test.describe('navigation', () => {
  test(
    'click-through nav updates the URL and content without a full reload',
    { tag: '@smoke' },
    async ({ page }) => {
      await page.goto('/');
      const initialNavLoadCount = await page.evaluate(() => window.__navLoadCount);

      await page.click('a[href="/forms"]');
      await expect(page).toHaveURL('/forms');
      await expect(page.locator('h1')).toHaveText('Forms');

      await page.click('a[href="/shadow-dom"]');
      await expect(page).toHaveURL('/shadow-dom');
      await expect(page.locator('h1')).toHaveText('Shadow DOM');

      const finalNavLoadCount = await page.evaluate(() => window.__navLoadCount);
      expect(finalNavLoadCount).toBe(initialNavLoadCount);
    },
  );

  test(
    'deep-linking directly to a route renders that page',
    { tag: '@smoke' },
    async ({ page }) => {
      await page.goto('/ambiguous');
      await expect(page.locator('h1')).toHaveText('Ambiguous targets');
    },
  );
});
