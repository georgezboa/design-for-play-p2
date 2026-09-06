// Independent Vite config for the Chapter 4 (Painted Country) isolated slice.
// Mirrors the established standalone-entry pattern without touching the main
// game build or any other car. The entry is named for identity rather than
// sequence order, because the car order may still change.

import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  root: '.',
  base: './',
  server: { port: 5302, strictPort: true, open: '/painted-country.html' },
  build: {
    outDir: 'dist-painted-country',
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: { input: { main: resolve(__dirname, 'painted-country.html') } },
  },
});
