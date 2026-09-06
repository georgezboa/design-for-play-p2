// Independent Vite config for the Car 03 isolated vertical slice.
// Builds the standalone entry point and emits a manifest so the
// production build can be inspected without touching dist/.

import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  root: '.',
  base: './',
  server: {
    port: 5179,
    strictPort: false,
    open: '/car03.html',
  },
  build: {
    outDir: 'dist-car03',
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'car03.html'),
      },
    },
  },
  resolve: {
    alias: {
      '@cars': resolve(__dirname, 'src/cars'),
    },
  },
});
