import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Vitest resolves `include`/coverage globs relative to `root`, which defaults to the
  // invoking process's cwd — Turborepo runs each package's own `test` script from inside
  // that package, not the repo root, so without this every per-package run finds zero tests.
  root: import.meta.dirname,
  test: {
    include: ['apps/*/src/**/*.test.{ts,tsx}', 'packages/*/src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html', 'lcov'],
      include: ['apps/*/src/**', 'packages/*/src/**'],
      exclude: ['**/*.d.ts', '**/*.config.*', '**/dist/**', '**/*.test.*', '**/*.spec.*'],
      thresholds: {
        lines: 95,
        branches: 95,
        functions: 95,
        statements: 95,
      },
    },
  },
});
