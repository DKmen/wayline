import { defineConfig } from 'wxt';

// docs/06-extension-spec.md §1 — the exact permission set. `optional_host_permissions` is
// how per-site access is granted at record time (WAYLI-32); `host_permissions` here stays
// scoped to Wayline's own domain for the auth cookie/API, never a broad install-time grant.
export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Wayline',
    description: 'Record a walkthrough of any task and share it as a live, guided flow.',
    permissions: [
      'activeTab',
      'sidePanel',
      'storage',
      'unlimitedStorage',
      'webNavigation',
      'cookies',
      'scripting',
    ],
    optional_host_permissions: ['https://*/*', 'http://*/*'],
    host_permissions: ['https://*.wayline.app/*'],
    externally_connectable: { matches: ['https://app.wayline.app/*'] },
  },
});
