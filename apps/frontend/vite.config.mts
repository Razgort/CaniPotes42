/// <reference types='vitest' />
import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

/** Racine du monorepo (apps/frontend → ../..) */
const workspaceRoot = path.resolve(import.meta.dirname, '../..');

export default defineConfig(() => ({
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
}));
