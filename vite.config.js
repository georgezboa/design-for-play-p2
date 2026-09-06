import { defineConfig } from 'vite';
import { resolve } from 'node:path';

// `command` and `mode` are the only two inputs that decide whether this build
// may skip ahead. `npm run dev` serves in development mode and gets the
// chapter select; `npm run prod` serves the same code in production mode and
// gets the real run; `npm run build` is a production bundle either way. Mode
// comes straight off the CLI flag, so this does not depend on NODE_ENV and
// behaves the same on every machine.
export default defineConfig(({ command, mode }) => {
  const devMode = command === 'serve' && mode !== 'production';

  return {
    define: {
      __DEV_MODE__: JSON.stringify(devMode),
    },
    server: {
      port: devMode ? 5180 : 5181,
      strictPort: true,
      open: false,
      // This project lives in an iCloud-managed Documents folder. Hydrating an
      // asset updates metadata on hundreds of files, which Vite previously
      // interpreted as source edits and turned into a reload storm. The game is
      // playtested in long, stateful sessions, so an unsolicited reload is much
      // more damaging than needing one deliberate browser refresh after a code
      // change. Keep preview sessions stable and manual-refresh only. Do not
      // force `no-store`: Chapter 3's 2→3 film fetches its full scene before
      // navigation, and Echo City must reuse those cached bytes on arrival.
      hmr: false,
      watch: {
        ignored: ['**/*'],
      },
    },
    build: {
      target: 'es2020',
      outDir: 'dist',
      assetsInlineLimit: 0,
      rollupOptions: {
        input: {
          main: resolve(import.meta.dirname, 'index.html'),
          chapter01Opening: resolve(import.meta.dirname, 'chapter01-opening.html'),
          chapter03: resolve(import.meta.dirname, 'car03-3d.html'),
          chapter04: resolve(import.meta.dirname, 'painted-country.html'),
          chapter05: resolve(import.meta.dirname, 'museum-3d.html'),
          finalBoss: resolve(import.meta.dirname, 'final-boss.html'),
          hiddenFinalBoss: resolve(import.meta.dirname, 'hidden-final-boss.html'),
          trueEnding: resolve(import.meta.dirname, 'true-ending.html'),
          borrowedGrid: resolve(import.meta.dirname, 'borrowed-grid.html'),
          labyrinth: resolve(import.meta.dirname, 'labyrinth.html'),
          chapter05PaintedCountry: resolve(import.meta.dirname, 'chapter05-painted-country.html'),
        },
      },
    },
  };
});
