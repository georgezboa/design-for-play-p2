import { defineConfig } from 'vite';
import { createReadStream, statSync } from 'node:fs';
import { extname, resolve, sep } from 'node:path';

// The Chapter 1 opening storyboard, PDFs, QA frames and preview film are
// production reference, not runtime assets, so they live in
// docs/archive/chapter01-opening/ and never ship in dist/. The dev-only
// preview page chapter01-opening.html still asks for them under
// /chapter01-opening/, so the dev server maps that prefix onto the archive.
const OPENING_ARCHIVE = resolve(import.meta.dirname, 'docs/archive/chapter01-opening');
const ARCHIVE_TYPES = { '.png': 'image/png', '.mp4': 'video/mp4', '.pdf': 'application/pdf', '.json': 'application/json' };

function serveOpeningArchiveInDev() {
  return {
    name: 'nightfall-dev-opening-archive',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/chapter01-opening', (req, res, next) => {
        const relative = decodeURIComponent((req.url || '/').split('?')[0]);
        const file = resolve(OPENING_ARCHIVE, `.${relative}`);
        if (!file.startsWith(OPENING_ARCHIVE + sep)) return next();
        let stat;
        try { stat = statSync(file); } catch { return next(); }
        if (!stat.isFile()) return next();
        res.setHeader('Content-Type', ARCHIVE_TYPES[extname(file).toLowerCase()] || 'application/octet-stream');
        res.setHeader('Content-Length', stat.size);
        createReadStream(file).pipe(res);
      });
    },
  };
}

// `command` and `mode` are the only two inputs that decide whether this build
// may skip ahead. `npm run dev` serves in development mode and gets the
// chapter select; `npm run prod` serves the same code in production mode and
// gets the real run; `npm run build` is a production bundle either way. Mode
// comes straight off the CLI flag, so this does not depend on NODE_ENV and
// behaves the same on every machine.
export default defineConfig(({ command, mode }) => {
  const devMode = command === 'serve' && mode !== 'production';

  return {
    plugins: [serveOpeningArchiveInDev()],
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
          // chapter01-opening.html is a dev-only storyboard preview (served by
          // `npm run dev`); it is intentionally not a production entry.
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
