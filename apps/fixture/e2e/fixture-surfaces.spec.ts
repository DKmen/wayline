import { expect, test } from '@playwright/test';

test.describe('fixture surfaces', () => {
  test('form inputs of every type are fillable', { tag: '@smoke' }, async ({ page }) => {
    await page.goto('/forms');

    await page.getByLabel('Full name').fill('Ada Lovelace');
    await page.getByLabel('Email').fill('ada@example.com');
    await page.getByLabel('Password').fill('correct horse battery staple');
    await page.getByLabel('Card number').fill('4242424242424242');
    await page.getByLabel('Country').selectOption('ca');
    await page.getByLabel('Bio').fill('Fixture test bio.');
    await page.getByLabel('Remember me').check();

    await page.getByTestId('fixture-form-submit').click();
    await expect(page.getByTestId('fixture-form-status')).toBeVisible();
  });

  test(
    'the shadow-DOM button is reachable and clickable through the shadow root',
    { tag: '@smoke' },
    async ({ page }) => {
      await page.goto('/shadow-dom');

      const shadowButton = page.getByTestId('shadow-button');
      await expect(shadowButton).toHaveText('Click me (in shadow root)');
      await shadowButton.click();
      await expect(shadowButton).toHaveText('Clicked!');
    },
  );

  test(
    'same-origin iframe content is reachable via frameLocator',
    { tag: '@smoke' },
    async ({ page }) => {
      await page.goto('/iframe');

      const iframeButton = page
        .frameLocator('[data-testid="fixture-iframe"]')
        .getByTestId('iframe-button');
      await expect(iframeButton).toBeVisible();
    },
  );
});
