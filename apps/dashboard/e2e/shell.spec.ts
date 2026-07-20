import { expect, test, type Page } from '@playwright/test';

const LIVE_SESSION = {
  session: { expiresAt: '2026-08-01T00:00:00.000Z' },
  user: { id: 'user_1', email: 'ada@example.com', name: 'Ada' },
};

/** Stubs GET /api/auth/get-session so these specs never depend on a real API/DB. */
async function stubSession(page: Page, body: unknown, status = 200) {
  await page.route('**/api/auth/get-session', (route) =>
    route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) }),
  );
}

test.describe('dashboard shell (WAYLI-29 acceptance)', () => {
  test('redirects a signed-out visitor to /sign-in', { tag: '@smoke' }, async ({ page }) => {
    await stubSession(page, null);

    await page.goto('/');

    await expect(page).toHaveURL(/\/sign-in/);
    await expect(page.getByLabel('Email')).toBeVisible();
  });

  test(
    'lets a signed-in user navigate the shell keyboard-only',
    { tag: '@smoke' },
    async ({ page }) => {
      await stubSession(page, LIVE_SESSION);

      await page.goto('/');
      await expect(page.locator('header').getByText('ada@example.com')).toBeVisible();

      // Tab from the top of the document: skip link first, then the primary nav link.
      await page.keyboard.press('Tab');
      await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeFocused();
      await page.keyboard.press('Tab');
      await expect(page.getByRole('link', { name: 'Wayline' })).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(page).toHaveURL('/');
    },
  );

  test(
    'redirects to /sign-in once the session expires mid-visit',
    { tag: '@smoke' },
    async ({ page }) => {
      await stubSession(page, LIVE_SESSION);
      await page.goto('/');
      await expect(page.locator('header').getByText('ada@example.com')).toBeVisible();

      await stubSession(page, null);
      await page.reload();

      await expect(page).toHaveURL(/\/sign-in/);
    },
  );

  test(
    'shows the error boundary with a working retry when the API fails',
    { tag: '@smoke' },
    async ({ page }) => {
      let shouldFail = true;
      await page.route('**/api/auth/get-session', (route) => {
        if (shouldFail) return route.fulfill({ status: 500, body: 'internal error' });
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(LIVE_SESSION),
        });
      });

      await page.goto('/');

      await expect(page.getByRole('alert')).toBeVisible();
      shouldFail = false;
      await page.getByRole('button', { name: 'Retry' }).click();

      await expect(page.locator('header').getByText('ada@example.com')).toBeVisible();
    },
  );
});
