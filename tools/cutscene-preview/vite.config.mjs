// The cutscene preview (tools/cutscene-preview): the eight cutscenes in the
// game's own player, as one static page that can be hosted anywhere (the
// public/ files it needs are copied beside it by build.mjs; NF_ASSET_BASE
// points the runtime at them). Not part of the game build.
import { defineConfig } from 'vite';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
export default defineConfig({
  root,
  base: './',
  publicDir: false,
  define: { __DEV_MODE__: 'false', __PLAYTEST_MODE__: 'false' },
  build: {
    outDir: process.env.NF_PREVIEW_OUT || '/tmp/claude-0/cs-preview',
    emptyOutDir: true,
    assetsInlineLimit: 0,
    rollupOptions: { input: resolve(import.meta.dirname, 'index.html') },
  },
});
