// Dedicated Chapter 5 config: THE MUSEUM OF ONE ANSWER builds and serves the
// first-person museum plus the two framed pages it opens — the lobby's
// OBJECT PENDING CLASSIFICATION exhibit and Door 4's Labyrinth.
//
//   dev:   npx vite --config vite.museum3d.config.js   → http://localhost:5186/museum-3d.html
//   build: npx vite build --config vite.museum3d.config.js → dist-museum3d/

import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LABYRINTH_CHAPTER05_CONTRACT } from './src/chapters/museum/labyrinth/chapter05LabyrinthContract.js';
import { ONE_ANSWER_CHAPTER05_CONTRACT } from './src/chapters/museum3d/oneAnswer/chapter05OneAnswerContract.js';

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
        oneAnswer: resolve(rootDir, ONE_ANSWER_CHAPTER05_CONTRACT.entryHtml), // one-answer.html
        labyrinth: resolve(rootDir, LABYRINTH_CHAPTER05_CONTRACT.entryHtml), // labyrinth.html
      },
    },
  },
});
