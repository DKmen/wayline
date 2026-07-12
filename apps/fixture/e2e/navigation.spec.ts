import { expect, test } from '@playwright/test';

test.describe('navigation', () => {
  test(
    'click-through nav updates the URL and content without a full reload',
    { tag: '@smoke' },
    async ({ page }) => {
      await page.goto('/');
      const initialNavLoadCount = await page.evaluate(() => window.__navLoadCount);

      await page.getByRole('link', { name: 'Forms' }).click();
      await expect(page).toHaveURL('/forms');
      await expect(page.locator('h1')).toHaveText('Forms');

      await page.getByRole('link', { name: 'Shadow DOM' }).click();
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

  test(
    'browser back/forward re-renders the correct page via popstate',
    { tag: '@smoke' },
    async ({ page }) => {
      await page.goto('/');
      await page.getByRole('link', { name: 'Forms' }).click();
      await expect(page).toHaveURL('/forms');
      await page.getByRole('link', { name: 'Shadow DOM' }).click();
      await expect(page).toHaveURL('/shadow-dom');

      await page.goBack();
      await expect(page).toHaveURL('/forms');
      await expect(page.locator('h1')).toHaveText('Forms');

      await page.goForward();
      await expect(page).toHaveURL('/shadow-dom');
      await expect(page.locator('h1')).toHaveText('Shadow DOM');
    },
  );
});
