'use strict';

// Persists the game window's size, position and fullscreen state between
// launches in <userData>/window-state.json. Kept free of Electron imports so
// the bounds validation can be unit tested with plain node.

const fs = require('fs');
const path = require('path');

const DEFAULT_WIDTH = 1440;
const DEFAULT_HEIGHT = 900;
const MIN_WIDTH = 960;
const MIN_HEIGHT = 620;

// Fresh installs start fullscreen, like most desktop/Steam games. After that
// the player's last choice (F11 / Alt+Enter / Ctrl+Cmd+F / Settings) wins.
const DEFAULT_STATE = Object.freeze({ fullscreen: true, maximized: false });

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function writeJsonAtomic(file, value) {
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const temp = `${file}.${process.pid}.tmp`;
    fs.writeFileSync(temp, JSON.stringify(value, null, 2));
    fs.renameSync(temp, file);
    return true;
  } catch {
    return false;
  }
}

const isFiniteNumber = (value) => typeof value === 'number' && Number.isFinite(value);

function intersectionArea(a, b) {
  const width = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
  const height = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
  return width > 0 && height > 0 ? width * height : 0;
}

// `workAreas` are the displays' work areas ({x, y, width, height}); the first
// entry is treated as the primary display. Returns window options with sane
// bounds: a saved window that is now off-screen (monitor unplugged,
// resolution changed) is re-centred on the primary display.
function resolveWindowState(saved, workAreas) {
  const primary = workAreas[0] || { x: 0, y: 0, width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT };
  const state = { ...DEFAULT_STATE, ...(saved && typeof saved === 'object' ? saved : {}) };

  const fitWidth = (width) => Math.max(MIN_WIDTH, Math.min(Math.round(width), primary.width));
  const fitHeight = (height) => Math.max(MIN_HEIGHT, Math.min(Math.round(height), primary.height));
  let width = isFiniteNumber(state.width) ? state.width : DEFAULT_WIDTH;
  let height = isFiniteNumber(state.height) ? state.height : DEFAULT_HEIGHT;

  let x;
  let y;
  if (isFiniteNumber(state.x) && isFiniteNumber(state.y)) {
    const bounds = { x: Math.round(state.x), y: Math.round(state.y), width: Math.round(width), height: Math.round(height) };
    const host = workAreas.find((area) => intersectionArea(bounds, area) >= Math.min(bounds.width * bounds.height * 0.5, 200 * 200));
    if (host) {
      width = Math.max(MIN_WIDTH, Math.min(bounds.width, host.width));
      height = Math.max(MIN_HEIGHT, Math.min(bounds.height, host.height));
      x = Math.min(Math.max(bounds.x, host.x), host.x + host.width - Math.min(width, host.width));
      y = Math.min(Math.max(bounds.y, host.y), host.y + host.height - Math.min(height, host.height));
    }
  }
  if (x === undefined) {
    width = fitWidth(width);
    height = fitHeight(height);
    x = Math.round(primary.x + (primary.width - width) / 2);
    y = Math.round(primary.y + (primary.height - height) / 2);
  }

  return {
    x,
    y,
    width: Math.round(width),
    height: Math.round(height),
    fullscreen: state.fullscreen === true,
    maximized: state.maximized === true,
  };
}

function loadWindowState(file, workAreas) {
  return resolveWindowState(readJson(file), workAreas);
}

// Captures a BrowserWindow-like object. Uses the *normal* (restored) bounds so
// leaving fullscreen / un-maximising next launch restores a sensible window.
function captureWindowState(win) {
  const bounds = typeof win.getNormalBounds === 'function' ? win.getNormalBounds() : win.getBounds();
  return {
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    fullscreen: win.isFullScreen(),
    maximized: win.isMaximized(),
  };
}

module.exports = {
  DEFAULT_WIDTH,
  DEFAULT_HEIGHT,
  MIN_WIDTH,
  MIN_HEIGHT,
  readJson,
  writeJsonAtomic,
  resolveWindowState,
  loadWindowState,
  captureWindowState,
};
