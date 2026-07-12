import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 4300,
    strictPort: true,
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        iframeContent: resolve(import.meta.dirname, 'iframe-content.html'),
      },
    },
  },
});
