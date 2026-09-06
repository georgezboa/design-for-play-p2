import { defineConfig } from 'vite';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const projectRoot = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: '.',
  base: './',
  publicDir: process.env.CH03_SKIP_PUBLIC === '1' ? false : 'public',
  server: {
    port: 5181,
    strictPort: false,
    open: '/car03-3d.html',
    // The project lives in an iCloud-managed folder with a large generated
    // asset tree. Watching that tree can stall the lightweight Chapter 3
    // playtest server for minutes. These reviews use deliberate reloads after
    // edits, so keep file watching disabled just like the main game server.
    hmr: false,
    watch: {
      ignored: ['**/*'],
    },
  },
  build: {
    outDir: 'dist-car03-3d',
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      input: {
        main: resolve(projectRoot, 'car03-3d.html'),
      },
    },
  },
});
