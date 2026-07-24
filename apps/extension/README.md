# apps/extension

Chrome MV3 extension (WXT). See [docs/06-extension-spec.md](/docs/06-extension-spec.md) for the full surface spec and [docs/11-roadmap-sprints.md](/docs/11-roadmap-sprints.md) for sprint scope.

## Develop

```sh
pnpm --filter @wayline/extension dev
```

WXT launches a Chromium instance with the extension pre-loaded and hot-reloads on change.

## Load the built extension manually

```sh
pnpm --filter @wayline/extension build
```

Then in Chrome: `chrome://extensions` → enable Developer mode → **Load unpacked** → select `apps/extension/.output/chrome-mv3/`.

## Test

```sh
pnpm --filter @wayline/extension test        # Vitest unit tests
pnpm --filter @wayline/extension build        # required first — e2e loads the built output, not a dev server
pnpm --filter @wayline/extension test:e2e     # Playwright, launches a persistent headed Chromium context with the extension loaded
```

The e2e suite (`e2e/`) uses `chromium.launchPersistentContext` (the only way to load an unpacked MV3 extension) via the shared `extension-fixtures.ts` fixture. MV3 background service workers only reliably register in **headed** Chromium as of Playwright 1.61/Chromium 1228 — CI runs this suite under `xvfb-run` for a virtual display.
