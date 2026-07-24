import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // Workers each launch their own persistent extension context — no shared browser/page
  // fixture to configure via `use`/`projects` (see extension-fixtures.ts).
  reporter: [['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:4300',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'pnpm --filter @wayline/fixture dev',
    port: 4300,
    reuseExistingServer: !process.env.CI,
  },
});
