/// <reference types='vitest' />
import path from 'node:path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

/** Racine du monorepo (apps/frontend → ../..) */
const workspaceRoot = path.resolve(import.meta.dirname, '../..');

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, workspaceRoot, '');
  /** Backend Nest (`.env` racine : PORT, défaut 3000). */
  const apiDevTarget =
    env['VITE_API_PROXY_TARGET'] ??
    process.env['VITE_API_PROXY_TARGET'] ??
    'http://localhost:3000';

  return {
  root: import.meta.dirname,
  cacheDir: '../../node_modules/.vite/apps/frontend',
  resolve: {
    // Sans ça, Vite résout souvent @org/* vers dist/ (bundles avec React + RR en double).
    // BrowserRouter (app) et Routes (features) ne partagent plus le même contexte → useRoutes error.
    alias: {
      '@org/features': path.join(
        workspaceRoot,
        'libs/frontend/features/src/index.ts',
      ),
      '@org/ui': path.join(workspaceRoot, 'libs/frontend/ui/src/index.ts'),
      '@org/data-access': path.join(
        workspaceRoot,
        'libs/frontend/data-access/src/index.ts',
      ),
      '@org/types': path.join(workspaceRoot, 'libs/shared/types/src/index.ts'),
    },
    dedupe: ['react', 'react-dom', 'react-router-dom'],
  },
  server: {
    port: 4200,
    host: 'localhost',
    // Sans ça, `fetch('/api/...')` part sur le port 4200 (Vite) au lieu du Nest.
    proxy: {
      '/api': { target: apiDevTarget, changeOrigin: true },
      '/socket.io': { target: apiDevTarget, ws: true, changeOrigin: true },
    },
  },
  preview: {
    port: 4200,
    host: 'localhost',
  },
  plugins: [tailwindcss(), react()],
  // Uncomment this if you are using workers.
  // worker: {
  //  plugins: [],
  // },
  build: {
    outDir: './dist',
    emptyOutDir: true,
    reportCompressedSize: true,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
};
});
