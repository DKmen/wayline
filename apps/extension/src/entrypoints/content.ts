import { browser } from 'wxt/browser';
import { defineContentScript } from 'wxt/utils/define-content-script';
import { createShadowRootUi } from 'wxt/utils/content-script-ui/shadow-root';
import { registerCaptureListeners } from '../lib/capture/listeners';

// registration: 'runtime' — no `matches`, so WXT neither adds a manifest content_scripts
// entry nor a host_permission for it (docs/06-extension-spec.md §1: no broad install-time
// grant). background.ts injects this script explicitly via chrome.scripting.executeScript,
// scoped to the active tab the user just acted on.
export default defineContentScript({
  registration: 'runtime',
  cssInjectionMode: 'ui',
  async main(ctx) {
    // The overlay mount doubles as the capture engine's "ignore clicks on our own UI"
    // boundary (docs/06 §3) — the real spotlight/pause/consent UI lands with the
    // walkthrough-engine tickets.
    const ui = await createShadowRootUi(ctx, {
      name: 'wayline-overlay',
      position: 'overlay',
      onMount: (uiContainer) => {
        uiContainer.setAttribute('data-wayline-overlay', 'ready');
      },
    });
    ui.mount();

    const stopCapture = registerCaptureListeners(
      document,
      (message) => {
        void browser.runtime.sendMessage(message);
      },
      ui.shadowHost,
    );
    ctx.onInvalidated(stopCapture);
  },
});
