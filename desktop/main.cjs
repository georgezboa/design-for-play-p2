'use strict';

const {
  app, BrowserWindow, Menu, dialog, ipcMain, powerSaveBlocker, screen, session, shell,
} = require('electron');
const path = require('path');
const { APP_HOST, APP_PORT, startGameServer, identifyPortOccupant } = require('./server.cjs');
const windowState = require('./windowState.cjs');

// ---------------------------------------------------------------------------
// Identity & save location
// ---------------------------------------------------------------------------
// NIGHTFALL saves live in Chromium localStorage, which is keyed by BOTH the
// userData directory and the page origin. Earlier builds used the npm package
// name ("nightfall") as the userData folder and http://127.0.0.1:41730 as the
// origin. Pin both explicitly so renaming the product, the appId or the
// package can never silently orphan a player's archive.
const APP_ORIGIN = `http://${APP_HOST}:${APP_PORT}`;
const IS_MAC = process.platform === 'darwin';
const IS_WINDOWS = process.platform === 'win32';

app.setName('NIGHTFALL');
app.setPath('userData', path.join(app.getPath('appData'), 'nightfall'));
if (IS_WINDOWS) app.setAppUserModelId('com.nightfall.lastarchiveline');

const STATE_FILE = () => path.join(app.getPath('userData'), 'window-state.json');
const DESKTOP_META_FILE = () => path.join(app.getPath('userData'), 'desktop-meta.json');

// A second launch (double-clicking the app again, Steam "Play" twice) must not
// start a second server on the fixed port; it focuses the running window.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const win = mainWindow;
    if (!win) return;
    if (win.isMinimized()) win.restore();
    win.show();
    win.focus();
  });
  app.whenReady().then(launch);
}

let mainWindow = null;
let server = null;
let displaySleepBlocker = null;
let saveStateTimer = null;

function gameDirectory() {
  return app.isPackaged ? path.join(process.resourcesPath, 'game') : path.join(__dirname, '..', 'dist');
}

function isAppUrl(url) {
  try {
    return new URL(url).origin === APP_ORIGIN;
  } catch {
    return false;
  }
}

function openExternally(url) {
  try {
    const { protocol } = new URL(url);
    if (protocol === 'https:' || protocol === 'http:' || protocol === 'mailto:') shell.openExternal(url);
  } catch { /* ignore malformed URLs */ }
}

// ---------------------------------------------------------------------------
// Local game server
// ---------------------------------------------------------------------------
async function startServerWithRecovery() {
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      return await startGameServer({ root: gameDirectory(), version: app.getVersion() });
    } catch (error) {
      if (error.code !== 'EADDRINUSE') throw error;
      const occupant = await identifyPortOccupant();
      if (occupant.kind === 'none') continue; // the port was just released; try again
      const message = occupant.kind === 'other'
        ? `NIGHTFALL needs local port ${APP_PORT} to run, but another program is using it.`
        : 'Another copy of NIGHTFALL appears to be running already.';
      const detail = occupant.kind === 'other'
        ? `Close the program that is using port ${APP_PORT} (for example a local development server) and choose Try Again.\n\n`
          + 'NIGHTFALL keeps this port fixed so your saved archives stay available between launches.'
        : `An older or separately installed NIGHTFALL${occupant.version ? ` (${occupant.version})` : ''} is using port ${APP_PORT}. `
          + 'Quit it (check the Dock / taskbar and system tray) and choose Try Again.';
      const { response } = await dialog.showMessageBox({
        type: 'warning',
        title: 'NIGHTFALL',
        message,
        detail,
        buttons: ['Try Again', 'Quit'],
        defaultId: 0,
        cancelId: 1,
        noLink: true,
      });
      if (response !== 0) return null;
    }
  }
}

// Hashed assets are cached forever and unhashed files revalidate, but the
// chapter preloader uses fetch(..., { cache: 'force-cache' }), which would
// happily reuse bytes cached by a previous game version. Start each new
// version with an empty HTTP cache (localStorage saves are NOT affected).
async function clearHttpCacheAfterUpdate() {
  const meta = windowState.readJson(DESKTOP_META_FILE()) || {};
  if (meta.lastVersion === app.getVersion()) return;
  try { await session.defaultSession.clearCache(); } catch { /* best effort */ }
  windowState.writeJsonAtomic(DESKTOP_META_FILE(), { ...meta, lastVersion: app.getVersion() });
}

// ---------------------------------------------------------------------------
// Window
// ---------------------------------------------------------------------------
function persistWindowState() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  windowState.writeJsonAtomic(STATE_FILE(), windowState.captureWindowState(mainWindow));
}

function schedulePersistWindowState() {
  clearTimeout(saveStateTimer);
  saveStateTimer = setTimeout(persistWindowState, 600);
}

function setFullscreen(win, flag) {
  if (!win || win.isDestroyed()) return false;
  win.setFullScreen(Boolean(flag));
  return Boolean(flag);
}

function toggleFullscreen(win = mainWindow) {
  if (!win || win.isDestroyed()) return false;
  return setFullscreen(win, !win.isFullScreen());
}

function updateDisplaySleepBlocker() {
  // Keep the display awake while the player is looking at the game (long
  // cinematics have no input). Released when the window is hidden/unfocused.
  const wantAwake = Boolean(mainWindow && !mainWindow.isDestroyed() && mainWindow.isFocused() && !mainWindow.isMinimized());
  const active = displaySleepBlocker !== null && powerSaveBlocker.isStarted(displaySleepBlocker);
  if (wantAwake && !active) displaySleepBlocker = powerSaveBlocker.start('prevent-display-sleep');
  if (!wantAwake && active) { powerSaveBlocker.stop(displaySleepBlocker); displaySleepBlocker = null; }
}

function buildMenu() {
  if (!IS_MAC) {
    // Windows / Linux: no menu bar at all (this also removes the default
    // reload / devtools / zoom accelerators).
    Menu.setApplicationMenu(null);
    return;
  }
  const template = [
    {
      label: app.name,
      submenu: [
        { role: 'about', label: 'About NIGHTFALL' },
        { type: 'separator' },
        { role: 'hide', label: 'Hide NIGHTFALL' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit', label: 'Quit NIGHTFALL' },
      ],
    },
    // Edit roles keep Cmd+C / Cmd+V working in any text field.
    { role: 'editMenu' },
    {
      label: 'View',
      submenu: [
        { label: 'Toggle Full Screen', accelerator: 'Ctrl+Command+F', click: () => toggleFullscreen() },
        ...(app.isPackaged ? [] : [
          { type: 'separator' },
          { role: 'reload' },
          { role: 'toggleDevTools' },
        ]),
      ],
    },
    { role: 'windowMenu' },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function installKeyboardShortcuts(win) {
  win.webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown' || input.isAutoRepeat) return;
    const key = input.key;
    const fullscreenShortcut = key === 'F11'
      || (!IS_MAC && input.alt && !input.control && !input.meta && key === 'Enter');
    // (macOS Ctrl+Cmd+F is handled by the application menu accelerator.)
    if (fullscreenShortcut) {
      event.preventDefault();
      toggleFullscreen(win);
      return;
    }
    if (!app.isPackaged) {
      if (key === 'F12' || ((input.control || input.meta) && input.shift && key.toLowerCase() === 'i')) {
        event.preventDefault();
        win.webContents.toggleDevTools();
      } else if (!IS_MAC && input.control && key.toLowerCase() === 'r') {
        event.preventDefault();
        win.webContents.reload();
      }
    }
  });
}

function installNavigationGuards(contents) {
  // Links with target=_blank (credits) and window.open(): never open a new
  // Electron window. External web links go to the system browser.
  contents.setWindowOpenHandler(({ url }) => {
    if (!isAppUrl(url)) openExternally(url);
    return { action: 'deny' };
  });
  const guard = (event, url) => {
    if (isAppUrl(url)) return;
    event.preventDefault();
    openExternally(url);
  };
  contents.on('will-navigate', guard);
  contents.on('will-redirect', guard);
  contents.on('will-attach-webview', (event) => event.preventDefault());
}

function installPermissionPolicy() {
  const allowed = new Set(['fullscreen', 'pointerLock', 'keyboardLock', 'clipboard-sanitized-write']);
  session.defaultSession.setPermissionRequestHandler((contents, permission, callback, details) => {
    callback(allowed.has(permission) && isAppUrl(details.requestingUrl || contents.getURL()));
  });
  session.defaultSession.setPermissionCheckHandler((contents, permission, requestingOrigin) => (
    allowed.has(permission) && requestingOrigin === APP_ORIGIN
  ));
}

// Windows/macOS take the window icon from the executable / app bundle. Linux
// needs it explicitly (packaged: resources/icon.png via linux.extraResources).
function windowIcon() {
  if (IS_MAC || (IS_WINDOWS && app.isPackaged)) return undefined;
  return app.isPackaged ? path.join(process.resourcesPath, 'icon.png') : path.join(__dirname, '..', 'build', 'icon.png');
}

function createWindow() {
  const workAreas = [screen.getPrimaryDisplay(), ...screen.getAllDisplays()].map((display) => display.workArea);
  const state = windowState.loadWindowState(STATE_FILE(), workAreas);

  const win = new BrowserWindow({
    x: state.x,
    y: state.y,
    width: state.width,
    height: state.height,
    minWidth: windowState.MIN_WIDTH,
    minHeight: windowState.MIN_HEIGHT,
    // Fullscreen is applied after the first show: creating a hidden window
    // with fullscreen: true is unreliable on macOS.
    fullscreenable: true,
    show: false,
    title: 'NIGHTFALL',
    backgroundColor: '#03050a',
    autoHideMenuBar: true,
    icon: windowIcon(),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      devTools: !app.isPackaged,
      spellcheck: false,
      // The game is a single focused window: keep timers/audio running at full
      // rate even when it is partially covered.
      backgroundThrottling: false,
      // Desktop players already launched the game on purpose; do not require
      // an extra click before music / cinematics may start.
      autoplayPolicy: 'no-user-gesture-required',
    },
  });
  installNavigationGuards(win.webContents);
  installKeyboardShortcuts(win);
  Promise.resolve(win.webContents.setVisualZoomLevelLimits(1, 1)).catch(() => {});
  // A stray beforeunload handler must never make Quit silently do nothing.
  win.webContents.on('will-prevent-unload', (event) => event.preventDefault());

  win.once('ready-to-show', () => {
    if (state.maximized && !state.fullscreen) win.maximize();
    win.show();
    if (state.fullscreen) win.setFullScreen(true);
    win.focus();
  });
  for (const eventName of ['resize', 'move', 'maximize', 'unmaximize', 'enter-full-screen', 'leave-full-screen']) {
    win.on(eventName, schedulePersistWindowState);
  }
  const notifyFullscreen = () => {
    if (!win.isDestroyed()) win.webContents.send('nightfall:fullscreen-changed', win.isFullScreen());
  };
  win.on('enter-full-screen', notifyFullscreen);
  win.on('leave-full-screen', notifyFullscreen);
  for (const eventName of ['focus', 'blur', 'minimize', 'restore', 'show', 'hide']) {
    win.on(eventName, updateDisplaySleepBlocker);
  }
  win.on('close', () => { clearTimeout(saveStateTimer); persistWindowState(); });
  win.on('closed', () => { mainWindow = null; updateDisplaySleepBlocker(); });

  win.webContents.on('render-process-gone', async (_event, details) => {
    if (details.reason === 'clean-exit' || win.isDestroyed()) return;
    const { response } = await dialog.showMessageBox(win, {
      type: 'error',
      title: 'NIGHTFALL',
      message: 'NIGHTFALL stopped unexpectedly.',
      detail: `Your archive is saved at the latest checkpoint. (${details.reason})`,
      buttons: ['Reload', 'Quit'],
      defaultId: 0,
      cancelId: 1,
      noLink: true,
    });
    if (response === 0 && !win.isDestroyed()) win.loadURL(`${APP_ORIGIN}/`);
    else app.quit();
  });

  return win;
}

// ---------------------------------------------------------------------------
// Renderer bridge (see preload.cjs)
// ---------------------------------------------------------------------------
function installIpc() {
  const fromGame = (event) => isAppUrl(event.senderFrame?.url ?? '');
  const windowFor = (event) => BrowserWindow.fromWebContents(event.sender);
  ipcMain.handle('nightfall:quit', (event) => { if (fromGame(event)) app.quit(); });
  ipcMain.handle('nightfall:toggle-fullscreen', (event) => (fromGame(event) ? toggleFullscreen(windowFor(event)) : false));
  ipcMain.handle('nightfall:set-fullscreen', (event, flag) => (fromGame(event) ? setFullscreen(windowFor(event), flag) : false));
  ipcMain.handle('nightfall:is-fullscreen', (event) => Boolean(fromGame(event) && windowFor(event)?.isFullScreen()));
  ipcMain.handle('nightfall:version', () => app.getVersion());
}

// ---------------------------------------------------------------------------
// Startup
// ---------------------------------------------------------------------------
async function launch() {
  try {
    app.setAboutPanelOptions({
      applicationName: 'NIGHTFALL',
      applicationVersion: app.getVersion(),
      copyright: 'The Last Archive Line — free to play.',
    });
    buildMenu();
    installPermissionPolicy();
    installIpc();

    server = await startServerWithRecovery();
    if (!server) { app.quit(); return; }
    await clearHttpCacheAfterUpdate();

    mainWindow = createWindow();
    await mainWindow.loadURL(`${APP_ORIGIN}/`);
  } catch (error) {
    dialog.showErrorBox('NIGHTFALL could not start', `${error.message}\n\nGame files: ${gameDirectory()}`);
    app.quit();
  }
}

app.on('window-all-closed', () => app.quit());
app.on('before-quit', () => {
  persistWindowState();
  if (displaySleepBlocker !== null && powerSaveBlocker.isStarted(displaySleepBlocker)) powerSaveBlocker.stop(displaySleepBlocker);
  server?.close();
});
