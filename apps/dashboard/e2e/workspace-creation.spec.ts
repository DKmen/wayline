import { expect, test, type Page } from '@playwright/test';

const LIVE_SESSION = {
  session: { expiresAt: '2026-08-01T00:00:00.000Z' },
  user: { id: 'user_1', email: 'ada@example.com', name: 'Ada' },
};

const CREATED_WORKSPACE = {
  id: '018f4f9e-7a3b-7c4d-9e1f-2a3b4c5d6e7f',
  name: 'Acme Corp',
  slug: 'acme-corp',
  plan: 'free',
};

/** Stubs GET /api/auth/get-session so these specs never depend on a real API/DB. */
async function stubSession(page: Page, body: unknown, status = 200) {
  await page.route('**/api/auth/get-session', (route) =>
    route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) }),
  );
}

async function stubMyWorkspaces(page: Page, body: unknown) {
  await page.route('**/v1/me/workspaces', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) }),
  );
}

test.describe('workspace creation and empty library (WAYLI-30 acceptance)', () => {
  test(
    'creates a workspace as first admin and lands directly on the empty library, no reload',
    { tag: '@smoke' },
    async ({ page }) => {
      await stubSession(page, LIVE_SESSION);
      await stubMyWorkspaces(page, { workspaces: [] });
      await page.route('**/v1/workspaces', (route) =>
        route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify(CREATED_WORKSPACE),
        }),
      );

      await page.goto('/');
      await expect(page.getByText('Create your workspace')).toBeVisible();

      await page.getByLabel('Workspace name').fill('Acme Corp');
      await expect(page.getByLabel('Workspace URL')).toHaveValue('acme-corp');
      await page.getByRole('button', { name: 'Create workspace' }).click();

      await expect(page.getByText('No flows yet')).toBeVisible();
      await expect(page).toHaveURL('/');
    },
  );

  test(
    'shows an inline duplicate-slug error and keeps the form on a 409',
    { tag: '@smoke' },
    async ({ page }) => {
      await stubSession(page, LIVE_SESSION);
      await stubMyWorkspaces(page, { workspaces: [] });
      await page.route('**/v1/workspaces', (route) => route.fulfill({ status: 409 }));

      await page.goto('/');
      await page.getByLabel('Workspace name').fill('Acme Corp');
      await page.getByRole('button', { name: 'Create workspace' }).click();

      await expect(page.getByRole('alert')).toHaveText(/is taken/i);
      await expect(page.getByText('Create your workspace')).toBeVisible();
    },
  );

  test(
    'lands a returning member directly on the library, with no creation-form flash',
    { tag: '@smoke' },
    async ({ page }) => {
      await stubSession(page, LIVE_SESSION);
      await stubMyWorkspaces(page, {
        workspaces: [{ workspace: CREATED_WORKSPACE, role: 'admin' }],
      });
      await page.route('**/v1/workspaces/*/flows', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ flows: [] }),
        }),
      );

      await page.goto('/');

      await expect(page.getByText('No flows yet')).toBeVisible();
      await expect(page.getByText('Create your workspace')).toHaveCount(0);
    },
  );
});
