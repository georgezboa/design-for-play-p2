import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const windowState = require('../../desktop/windowState.cjs');

const primary = { x: 0, y: 25, width: 1920, height: 1055 };
const secondary = { x: 1920, y: 0, width: 2560, height: 1440 };

test('first launch starts fullscreen with a centred 1440x900 window behind it', () => {
  const state = windowState.resolveWindowState(null, [primary]);
  assert.equal(state.fullscreen, true);
  assert.equal(state.width, 1440);
  assert.equal(state.height, 900);
  assert.equal(state.x, 240);
  assert.equal(state.y, 25 + Math.round((1055 - 900) / 2));
});

test('saved bounds on a connected display are kept', () => {
  const saved = { x: 2000, y: 100, width: 1600, height: 1000, fullscreen: false, maximized: true };
  assert.deepEqual(windowState.resolveWindowState(saved, [primary, secondary]), saved);
});

test('a window on a disconnected monitor is re-centred on the primary display', () => {
  const saved = { x: 5000, y: 100, width: 1600, height: 1000, fullscreen: false };
  const state = windowState.resolveWindowState(saved, [primary]);
  assert.equal(state.x, Math.round((1920 - 1600) / 2));
  assert.ok(state.y >= primary.y);
  assert.equal(state.fullscreen, false);
});

test('oversized or tiny windows are clamped to the display and minimum size', () => {
  const huge = windowState.resolveWindowState({ width: 9000, height: 9000, fullscreen: false }, [primary]);
  assert.equal(huge.width, primary.width);
  assert.equal(huge.height, primary.height);
  const tiny = windowState.resolveWindowState({ width: 10, height: 10 }, [primary]);
  assert.equal(tiny.width, windowState.MIN_WIDTH);
  assert.equal(tiny.height, windowState.MIN_HEIGHT);
});

test('corrupt state files fall back to defaults and saves are atomic', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nightfall-window-'));
  const file = path.join(dir, 'nested', 'window-state.json');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, '{not json');
  assert.equal(windowState.loadWindowState(file, [primary]).fullscreen, true);
  assert.equal(windowState.writeJsonAtomic(file, { x: 10, y: 30, width: 1200, height: 800, fullscreen: false }), true);
  const loaded = windowState.loadWindowState(file, [primary]);
  assert.deepEqual(loaded, { x: 10, y: 30, width: 1200, height: 800, fullscreen: false, maximized: false });
  assert.deepEqual(fs.readdirSync(path.dirname(file)), ['window-state.json']);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('captureWindowState prefers the restored (normal) bounds', () => {
  const fake = {
    getNormalBounds: () => ({ x: 1, y: 2, width: 1300, height: 800 }),
    getBounds: () => ({ x: 0, y: 0, width: 1920, height: 1080 }),
    isFullScreen: () => true,
    isMaximized: () => false,
  };
  assert.deepEqual(windowState.captureWindowState(fake), { x: 1, y: 2, width: 1300, height: 800, fullscreen: true, maximized: false });
});
