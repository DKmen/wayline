import { expect, test } from '@playwright/test';

test(
  'exactly three structurally identical Delete buttons exist, none with a distinguishing test ID',
  { tag: '@smoke' },
  async ({ page }) => {
    await page.goto('/ambiguous');

    const deleteButtons = page.getByRole('button', { name: 'Delete' });
    await expect(deleteButtons).toHaveCount(3);

    for (const button of await deleteButtons.all()) {
      expect(await button.getAttribute('data-testid')).toBeNull();
    }
  },
);
