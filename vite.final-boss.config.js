import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  publicDir: false,
  server: { port: 5187, strictPort: true, open: false },
  build: {
    target: 'es2020',
    outDir: 'dist-final-boss',
    assetsInlineLimit: 0,
    rollupOptions: { input: resolve(import.meta.dirname, 'final-boss.html') },
  },
});
