import { expect, test } from '@playwright/test';

test(
  'exactly three structurally identical Delete buttons exist, with no distinguishing signal',
  { tag: '@smoke' },
  async ({ page }) => {
    await page.goto('/ambiguous');

    const deleteButtons = page.getByRole('button', { name: 'Delete' });
    await expect(deleteButtons).toHaveCount(3);

    // Full markup equality, not just "no data-testid" — proves none of the three carries
    // ANY distinguishing signal (id, aria-label, name, title, ...), not only the one
    // signal this assertion happens to name. A future edit that gave just one button a
    // stray id/aria-label would fail this, where a data-testid-only check would not.
    const outerHtmls = await deleteButtons.evaluateAll((buttons) =>
      buttons.map((button) => button.outerHTML),
    );
    expect(new Set(outerHtmls).size).toBe(1);
  },
);
