import { expect, test } from '@playwright/test';

test(
  'the original target element is replaced by a genuinely different element on trigger',
  { tag: '@smoke' },
  async ({ page }) => {
    await page.goto('/target-change');

    await expect(page.getByTestId('original-target')).toBeVisible();
    await expect(page.getByTestId('replacement-target')).not.toBeAttached();

    await page.getByTestId('trigger-change').click();

    await expect(page.getByTestId('original-target')).not.toBeAttached();
    await expect(page.getByTestId('replacement-target')).toBeVisible();
  },
);
