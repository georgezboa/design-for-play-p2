// Dedicated Chapter 5 P0 config: the THREE.JS DREAMCORE MUSEUM slice builds and
// serves the packaged Chapter 5 shell plus its currently approved Door 1 and
// Door 2 directions. Echo City and the Chapter 5 Painted Country revisit stay
// buildable as sealed direct-review pages without replacing the course's
// separate Chapter 4 entry.
//
//   dev:   npx vite --config vite.museum3d.config.js   → http://localhost:5186/museum-3d.html
//   build: npx vite build --config vite.museum3d.config.js → dist-museum3d/

import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BORROWED_GRID_CHAPTER05_CONTRACT } from './src/chapters/borrowedGrid/chapter05BorrowedGridContract.js';
import { LABYRINTH_CHAPTER05_CONTRACT } from './src/chapters/museum/labyrinth/chapter05LabyrinthContract.js';

const rootDir = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  server: {
    port: 5186,
    strictPort: true,
    open: false,
  },
  build: {
    target: 'es2020',
    outDir: 'dist-museum3d',
    assetsInlineLimit: 0,
    rollupOptions: {
      input: {
        museum3d: resolve(rootDir, 'museum-3d.html'),
        borrowedGrid: resolve(rootDir, BORROWED_GRID_CHAPTER05_CONTRACT.entryHtml),
        paintedCountry: resolve(rootDir, 'chapter05-painted-country.html'),
        labyrinth: resolve(rootDir, LABYRINTH_CHAPTER05_CONTRACT.entryHtml), // labyrinth.html
      },
    },
  },
});
