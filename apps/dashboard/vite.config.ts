import { fileURLToPath } from 'node:url';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [tanstackRouter({ routesDirectory: './src/routes' }), react(), tailwindcss()],
  resolve: {
    // @wayline/ui ships raw TS source (no build step) whose own components import
    // from its "@/*" alias — resolve that alias here too so Vite can bundle them.
    alias: {
      '@': fileURLToPath(new URL('../../packages/ui/src', import.meta.url)),
    },
  },
  server: {
    port: 4400,
    strictPort: true,
    // Same-origin in the browser so Better Auth's default session cookie (SameSite=Lax)
    // just works in dev — no CORS/credentials edge cases (see D1 in the WAYLI-29 plan).
    proxy: {
      '/api': 'http://localhost:3000',
      '/v1': 'http://localhost:3000',
    },
  },
});
