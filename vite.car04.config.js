// Independent Vite config for the Car 04 (retro cyberpunk) isolated slice.
// Mirrors the established standalone-entry pattern without touching the main
// game build or any other car.

import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  root: '.',
  base: './',
  server: {
    port: 5299,
    strictPort: true,
    open: '/car04.html',
  },
  build: {
    outDir: 'dist-car04',
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'car04.html'),
      },
    },
  },
  resolve: {
    alias: {
      '@cars': resolve(__dirname, 'src/cars'),
    },
  },
});
