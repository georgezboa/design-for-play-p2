// Dedicated Labyrinth Wing config — the experimental Chapter 5 chase-maze
// detour builds and serves without touching any other entry.
//
//   dev:   npx vite --config vite.labyrinth.config.js   → http://localhost:5186/labyrinth.html
//   build: npx vite build --config vite.labyrinth.config.js → dist-labyrinth/

import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LABYRINTH_CHAPTER05_CONTRACT } from './src/chapters/museum/labyrinth/chapter05LabyrinthContract.js';

const rootDir = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  server: {
    port: 5186,
    strictPort: true,
    open: false,
    headers: {
      'Cache-Control': 'no-store',
    },
    // This project is stored under an iCloud-managed Documents folder.
    // Hydration metadata must not restart a stateful maze playtest dozens of
    // times; refresh deliberately after source edits, just like the integrated
    // production server does.
    hmr: false,
    watch: {
      ignored: ['**/*'],
    },
  },
  build: {
    target: 'es2020',
    outDir: 'dist-labyrinth',
    assetsInlineLimit: 0,
    rollupOptions: {
      input: resolve(rootDir, LABYRINTH_CHAPTER05_CONTRACT.entryHtml),
    },
  },
});
