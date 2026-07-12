import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Vitest resolves `include`/coverage globs relative to `root`, which defaults to the
  // invoking process's cwd — Turborepo runs each package's own `test` script from inside
  // that package, not the repo root, so without this every per-package run finds zero tests.
  root: import.meta.dirname,
  test: {
    // Two projects, one shared coverage gate (coverage is process-wide in Vitest 4, not
    // per-project, so it stays configured once below). packages/ui needs jsdom + RTL/
    // jest-axe setup; everything else is plain Node. The real-browser Storybook/Playwright
    // a11y+contrast tier lives in packages/ui/vitest.storybook.config.ts entirely — kept
    // out of this shared config so it doesn't force a Playwright/Chromium install on every
    // contributor's `pnpm test` (see that file's own comment for the full reasoning).
    projects: [
      {
        extends: true,
        test: {
          name: 'node',
          include: ['apps/*/src/**/*.test.{ts,tsx}', 'packages/*/src/**/*.test.{ts,tsx}'],
          exclude: ['packages/ui/**'],
        },
      },
      {
        extends: true,
        // packages/ui's own vite.config.ts defines this same `@` alias for Storybook and
        // its browser-mode test config — repeated here because this root project doesn't
        // load that file, so the alias has to be resolvable from the repo root instead.
        resolve: {
          alias: { '@': fileURLToPath(new URL('./packages/ui/src', import.meta.url)) },
        },
        test: {
          name: 'ui',
          environment: 'jsdom',
          include: ['packages/ui/src/**/*.test.{ts,tsx}'],
          setupFiles: ['./packages/ui/vitest-setup.ts'],
        },
      },
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html', 'lcov'],
      include: ['apps/*/src/**', 'packages/*/src/**'],
      exclude: [
        '**/*.d.ts',
        '**/*.config.*',
        '**/dist/**',
        '**/*.test.*',
        '**/*.spec.*',
        // Thin CLI entrypoints (console.log + exit code) — the branching they do add
        // (e.g. exit-code-from-results) is verified manually per docs/08-local-dev.md §5,
        // not coverage-gated.
        '**/*.cli.ts',
        // Storybook stories render components for visual/manual review (screenshots,
        // the real-browser a11y/contrast tier in vitest.storybook.config.ts) — they aren't
        // exercised by the jsdom unit-test tier and have no logic of their own to cover.
        '**/*.stories.tsx',
        '**/*.stories.ts',
        // apps/fixture is Playwright-only test-fixture content (docs/06 §8) — exercised
        // exclusively by its own e2e suite, never imported by a Vitest/jsdom test. Vitest 4's
        // coverage.include (above) force-includes unimported files, so without this every
        // fixture source file would count as 0%-covered dead weight against the threshold.
        'apps/fixture/**',
      ],
      thresholds: {
        lines: 95,
        branches: 95,
        functions: 95,
        statements: 95,
      },
    },
  },
});
