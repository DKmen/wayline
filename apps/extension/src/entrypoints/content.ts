import { defineContentScript } from 'wxt/utils/define-content-script';
import { createShadowRootUi } from 'wxt/utils/content-script-ui/shadow-root';

// registration: 'runtime' — no `matches`, so WXT neither adds a manifest content_scripts
// entry nor a host_permission for it (docs/06-extension-spec.md §1: no broad install-time
// grant). background.ts injects this script explicitly via chrome.scripting.executeScript,
// scoped to the active tab the user just acted on.
export default defineContentScript({
  registration: 'runtime',
  cssInjectionMode: 'ui',
  async main(ctx) {
    // Empty stub proving the shadow-root mount works — the real overlay (spotlight,
    // pause/consent cards) lands with the walkthrough-engine tickets (docs/06 §5).
    const ui = await createShadowRootUi(ctx, {
      name: 'wayline-overlay',
      position: 'overlay',
      onMount: (uiContainer) => {
        uiContainer.setAttribute('data-wayline-overlay', 'ready');
      },
    });
    ui.mount();
  },
});
