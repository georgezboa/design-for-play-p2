'use strict';

// Sandboxed preload: exposes a tiny, promise-based desktop API to the game as
// window.nightfallDesktop. The web build never has this object, so game code
// must always keep its browser fallback (see src/shell/desktopBridge.js).

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('nightfallDesktop', Object.freeze({
  isDesktop: true,
  platform: process.platform, // 'darwin' | 'win32' | 'linux'
  quit: () => ipcRenderer.invoke('nightfall:quit'),
  toggleFullscreen: () => ipcRenderer.invoke('nightfall:toggle-fullscreen'),
  setFullscreen: (flag) => ipcRenderer.invoke('nightfall:set-fullscreen', Boolean(flag)),
  isFullscreen: () => ipcRenderer.invoke('nightfall:is-fullscreen'),
  getVersion: () => ipcRenderer.invoke('nightfall:version'),
  // Returns an unsubscribe function.
  onFullscreenChange: (callback) => {
    if (typeof callback !== 'function') return () => {};
    const listener = (_event, isFullscreen) => callback(Boolean(isFullscreen));
    ipcRenderer.on('nightfall:fullscreen-changed', listener);
    return () => ipcRenderer.removeListener('nightfall:fullscreen-changed', listener);
  },
}));
