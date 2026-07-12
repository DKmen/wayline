import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, mergeConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import viteConfig from './vite.config';

const dirname = path.dirname(fileURLToPath(import.meta.url));

// Separate, non-coverage-gated config for the real-browser a11y/contrast tier (docs/05
// "Tests" requirement — jsdom's axe-core color-contrast rule doesn't work at all, per
// the axe-core/jsdom createRange() gap). Deliberately NOT folded into the shared root
// vitest.config.ts's `projects` array: that array has no opt-out, so every contributor's
// `pnpm test`/pre-push — including people only touching packages/config — would suddenly
// need a local Playwright/Chromium install. This mirrors how Playwright e2e already sits
// outside the coverage-gated story in this repo (WAYLI-22).
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      projects: [
        {
          extends: true,
          plugins: [
            storybookTest({
              configDir: path.join(dirname, '.storybook'),
            }),
          ],
          test: {
            name: 'storybook',
            browser: {
              enabled: true,
              provider: playwright({}),
              headless: true,
              instances: [{ browser: 'chromium' }],
            },
            setupFiles: ['./.storybook/vitest.setup.ts'],
          },
        },
      ],
      coverage: {
        enabled: false,
      },
    },
  }),
);
