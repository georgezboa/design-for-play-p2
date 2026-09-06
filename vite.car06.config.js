import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  root: '.',
  base: './',
  server: { port: 5301, strictPort: true, open: '/car06.html' },
  build: {
    outDir: 'dist-car06',
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: { input: { main: resolve(__dirname, 'car06.html') } },
  },
});
