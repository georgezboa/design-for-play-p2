import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  // This encounter has no public assets of its own. Avoid copying the whole
  // multi-gigabyte game asset tree into the standalone QA bundle.
  publicDir: false,
  build: {
    target: 'es2020',
    outDir: 'dist-hidden-final-boss',
    emptyOutDir: true,
    rollupOptions: { input: resolve(import.meta.dirname, 'hidden-final-boss.html') },
  },
  server: { port: 5186, strictPort: true, open: '/hidden-final-boss.html?qa=1' },
});
