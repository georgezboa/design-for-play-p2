import './uiKit.css';
import './pauseMenu.css';
import './canvasFocus.css';
import {
  CHECKPOINTS,
  TITLE_REQUEST_EVENT,
  applySettings,
  createSaveStore,
  readSettings,
  writeSettings,
} from './saveSystem.js';
import { getActiveCinematic } from './gameFlow.js';
import { SETTINGS_CONTROLS } from './settingsControls.js';
import {
  MAGIC_STONE_LINE, firstStoneNotice, magicStoneCountLabel, magicStoneRowHtml, magicStoneSnapshot,
} from './magicStones.js';
import { activateWithin, createMenuGamepadPoll, menuKeyAction, moveFocusWithin, navigableControls } from './menuNavigation.js';
import { installAudioRegistry, leaveForTitle } from './titleReturn.js';
import { installFramePacing } from './framePacing.js';
import { installPlayClock } from './playClock.js';

// Before any chapter code creates its renderer or asks for a frame (this
// module is imported ahead of every chapter's main body): see framePacing.js.
installFramePacing(globalThis.window);

const PAUSE_ID = 'nightfall-pause-menu';

// Generic fallback only; every chapter passes its own `controls` list.
export const DEFAULT_PAUSE_CONTROLS = Object.freeze([
  ['MOVE', 'WASD / ARROWS'],
  ['INTERACT', 'E / ENTER'],
  ['PAUSE', 'ESC'],
]);

export const RETURN_TO_TITLE_WARNING = 'Unsaved progress since the last checkpoint will be lost.';

// Describe the active slot's checkpoint for the pause card. The pause menu
// does not write saves: chapters record their own checkpoints as the player
// reaches them, so the card only reports where Continue will resume.
export function describeLastCheckpoint(storage = globalThis.localStorage) {
  const store = createSaveStore(storage);
  const save = store.readAll()[store.getActiveSlot()];
  if (store.scratch) return 'TEST ROUTE · YOUR SAVE SLOTS ARE NOT TOUCHED';
  if (!save) return 'NO ACTIVE JOURNEY · PROGRESS IS NOT BEING SAVED';
  const checkpoint = CHECKPOINTS.find(({ id }) => id === save.checkpointId) ?? CHECKPOINTS[0];
  return `LAST CHECKPOINT · CHAPTER ${checkpoint.chapter} · ${checkpoint.title}`;
}

// The eyebrow names the chapter of this page (alpha round 4: Chapter 2's
// pause read "NIGHT SERVICE · SUSPENDED", the name of Chapter 1).
export function pauseEyebrow(pathname = globalThis.location?.pathname ?? '/') {
  const raw = String(pathname).split('/').pop() || 'index.html';
  // pages that belong to a chapter without being its checkpoint route
  const page = { 'labyrinth.html': 'museum-3d.html', 'one-answer.html': 'museum-3d.html', 'hidden-final-boss.html': 'final-boss.html', 'true-ending.html': 'final-boss.html' }[raw] ?? raw;
  const checkpoint = CHECKPOINTS.find(({ route, legacy }) => !legacy && route.split('?')[0].split('/').pop() === page);
  if (!checkpoint) return 'THE NIGHT SERVICE · SUSPENDED';
  const name = checkpoint.title.split(' · ')[0];
  return `CHAPTER ${checkpoint.chapter} · ${name} · SUSPENDED`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);
}

function action(label, handler, className = '') {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `nf-pause-action ${className}`.trim();
  const text = document.createElement('span');
  text.className = 'nf-pause-action__label';
  text.textContent = label;
  button.append(text);
  button.addEventListener('click', handler);
  return button;
}

// The chapter's controls as a compact two-column key legend (the main
// pause screen shows it; nothing is buried under SETTINGS any more).
export function controlsLegendHtml(rows = DEFAULT_PAUSE_CONTROLS) {
  const list = rows?.length ? rows : DEFAULT_PAUSE_CONTROLS;
  return list.map(([name, keys]) => `<div><dt>${escapeHtml(name)}</dt><dd>${escapeHtml(keys)}</dd></div>`).join('');
}

// `checkpointId` is still accepted from older call sites but no longer used:
// the pause menu reports the saved checkpoint rather than writing one.
export function installPauseMenu({
  checkpointId: _legacyCheckpointId = null,
  allowEmbedded = false,
  onEscape = null,
  controls = DEFAULT_PAUSE_CONTROLS,
  // Chapter-specific actions listed after RESUME, as [{ label, onSelect }].
  // Selecting one resumes play first, then runs it (e.g. Chapter 1's SHOW ME).
  extraActions = [],
} = {}) {
  if (typeof window === 'undefined' || (!allowEmbedded && window.top !== window) || document.getElementById(PAUSE_ID)) return null;
  applySettings(readSettings());
  // So a confirmed return to the title can silence every sound on the page.
  installAudioRegistry(window);
  // Time played, for the save slot (paused and hidden time do not count).
  installPlayClock();

  // The title screen's language (titleMenu.css): a brass-framed walnut
  // panel with rivets, the actions as departure-board lines that turn into a
  // punched paper ticket when selected, the controls as a key legend, and
  // the magic stones with their one-line meaning.
  const root = document.createElement('aside');
  root.id = PAUSE_ID;
  root.hidden = true;
  root.innerHTML = `
    <div class="nf-pause-backdrop"></div>
    <section class="nf-pause-card" role="dialog" aria-modal="true" aria-label="Pause menu">
      <div class="nf-pause-ornament" aria-hidden="true"><span></span><b>◇</b><span></span></div>
      <header class="nf-pause-head">
        <p class="nf-pause-eyebrow">${escapeHtml(pauseEyebrow())}</p>
        <h2>PAUSED</h2>
        <p class="nf-pause-checkpoint"></p>
      </header>
      <div class="nf-pause-body">
        <nav class="nf-pause-actions" aria-label="Pause menu"></nav>
        <section class="nf-pause-controls" aria-label="Controls">
          <p class="nf-pause-controls__title">CONTROLS</p>
          <dl class="nf-pause-controls-note"></dl>
        </section>
        <div class="nf-pause-settings" hidden></div>
        <div class="nf-pause-confirm" hidden role="alertdialog" aria-labelledby="nf-pause-confirm-title" aria-describedby="nf-pause-confirm-copy">
          <p class="nf-pause-confirm-title" id="nf-pause-confirm-title">RETURN TO TITLE?</p>
          <p class="nf-pause-confirm-copy" id="nf-pause-confirm-copy">${RETURN_TO_TITLE_WARNING}</p>
          <div class="nf-pause-confirm-actions"></div>
        </div>
      </div>
      <div class="nf-pause-stones" aria-live="polite"></div>
      <footer class="nf-pause-foot">
        <p class="nf-pause-status" role="status" aria-live="polite"></p>
        <p class="nf-pause-hint"><span><kbd>ESC</kbd> RESUME</span><span><kbd>↑</kbd><kbd>↓</kbd> SELECT</span><span><kbd>ENTER</kbd> CONFIRM</span></p>
      </footer>
    </section>
  `;
  document.body.append(root);
  const card = root.querySelector('.nf-pause-card');
  const actions = root.querySelector('.nf-pause-actions');
  const controlsBox = root.querySelector('.nf-pause-controls');
  const controlsNote = root.querySelector('.nf-pause-controls-note');
  const settingsPanel = root.querySelector('.nf-pause-settings');
  const confirmPanel = root.querySelector('.nf-pause-confirm');
  const checkpointLine = root.querySelector('.nf-pause-checkpoint');
  const stonesLine = root.querySelector('.nf-pause-stones');
  const renderControls = () => {
    const rows = typeof controls === 'function' ? controls() : controls;
    controlsNote.innerHTML = controlsLegendHtml(rows);
  };
  // The five-stone meta-goal is visible from the first pause of the game,
  // long before the Museum's last stone is offered: its name, the count and
  // what the stones are, in one visible line (no hover needed).
  const renderStones = () => {
    let snapshot;
    try { snapshot = magicStoneSnapshot(); } catch { return; }
    stonesLine.innerHTML = `<div class="nf-pause-stones__row"><span class="nf-pause-stones__label">${escapeHtml(magicStoneCountLabel(snapshot))}</span>${magicStoneRowHtml(snapshot)}</div><p class="nf-pause-stones__meaning">${escapeHtml(MAGIC_STONE_LINE)}</p>`;
  };
  // The carriage-wall textures of the title (titleCarriage.js), painted the
  // first time the menu opens; flat walnut until then.
  let dressed = false;
  const dress = () => {
    if (dressed) return;
    dressed = true;
    import('./titleCarriage.js').then(({ dressCarriageWall }) => dressCarriageWall(root)).catch(() => {});
  };
  const status = root.querySelector('.nf-pause-status');
  let paused = false;
  let inSettings = false;
  let inConfirm = false;
  let priorFocus = null;
  let pausedPhaserScenes = [];

  const setRuntimePaused = (next) => {
    globalThis.NIGHTFALL_PAUSED = next;
    const cinematic = getActiveCinematic()?.video;
    if (cinematic) {
      if (next) cinematic.pause();
      else cinematic.play().catch(() => {});
    }
    const game = globalThis.game;
    if (game?.scene?.getScenes) {
      if (next) {
        // getScenes(true) only returns RUNNING scenes. Capture that exact set
        // before pausing it: once paused, the same query returns an empty list,
        // which previously left gameplay permanently suspended after Resume.
        pausedPhaserScenes = game.scene.getScenes(true).filter((scene) => scene?.sys?.isActive?.());
        pausedPhaserScenes.forEach((scene) => scene.scene.pause());
      } else {
        pausedPhaserScenes.forEach((scene) => {
          if (scene?.sys?.isPaused?.()) scene.scene.resume();
        });
        pausedPhaserScenes = [];
      }
    }
    window.dispatchEvent(new CustomEvent('nightfall:pause', { detail: { paused: next } }));
  };

  // The controls ↑ ↓ / W S / the D-pad move through: the visible panel's
  // buttons (and, in SETTINGS, its sliders and checkboxes). The helper is the
  // one the title screen and its dialogs use (menuNavigation.js).
  const currentPanel = () => {
    const panel = inConfirm ? confirmPanel : inSettings ? settingsPanel : actions;
    return panel;
  };
  const moveFocus = (direction) => moveFocusWithin(currentPanel(), direction);
  const activateFocused = () => activateWithin(currentPanel());
  const back = () => {
    if (inSettings || inConfirm) showMain();
    else close();
  };
  const menuAction = (navAction) => {
    if (notice.open) { if (navAction === 'activate' || navAction === 'back') notice.close(); return; }
    if (!paused) return;
    root.dataset.nav = 'keys';
    if (navAction === 'prev' || navAction === 'next') moveFocus(navAction);
    else if (navAction === 'activate') activateFocused();
    else if (navAction === 'back') back();
  };
  // No shared gamepad poll exists in the shell (Phaser chapters poll their
  // own pads, and pause with the menu), so the menu reads the D-pad and A / B
  // itself, only while it is open.
  const padPoll = createMenuGamepadPoll(menuAction);

  const setView = (view) => {
    card.dataset.view = view;
    actions.hidden = view !== 'main';
    controlsBox.hidden = view !== 'main';
    settingsPanel.hidden = view !== 'settings';
    confirmPanel.hidden = view !== 'confirm';
  };
  const showMain = () => {
    inSettings = false;
    inConfirm = false;
    setView('main');
    actions.querySelector('button')?.focus();
  };
  const close = () => {
    if (!paused) return;
    paused = false;
    inSettings = false;
    inConfirm = false;
    root.hidden = true;
    setView('main');
    status.textContent = '';
    padPoll.stop();
    delete root.dataset.nav;
    setRuntimePaused(false);
    priorFocus?.focus?.();
  };
  const open = () => {
    if (paused) return;
    if (notice.open) notice.close();
    priorFocus = document.activeElement;
    paused = true;
    dress();
    root.hidden = false;
    setView('main');
    checkpointLine.textContent = describeLastCheckpoint();
    renderControls();
    renderStones();
    setRuntimePaused(true);
    actions.querySelector('button')?.focus();
    padPoll.start();
  };

  const showConfirm = () => {
    inConfirm = true;
    inSettings = false;
    setView('confirm');
    // Default to the safe choice so a stray Enter never discards progress.
    confirmPanel.querySelector('.nf-pause-confirm-actions button:last-child')?.focus();
  };
  confirmPanel.querySelector('.nf-pause-confirm-actions').append(
    // Fade to black at once, stop the page's frames and sound, then go.
    action('RETURN TO TITLE', () => leaveForTitle(), 'is-danger'),
    action('CANCEL', showMain),
  );

  const showSettings = () => {
    inSettings = true;
    setView('settings');
    settingsPanel.replaceChildren();
    const settings = readSettings();
    SETTINGS_CONTROLS.forEach(([key, label, type, min, max]) => {
      const row = document.createElement('label');
      row.className = 'nf-pause-setting';
      row.innerHTML = `<span>${label}</span>`;
      const input = document.createElement('input');
      input.type = type;
      // The brass slider's amber fill follows the value (as on the title).
      const fill = () => input.style.setProperty('--nf-range', `${((input.value - min) / (max - min)) * 100}%`);
      if (type === 'range') { input.min = min; input.max = max; input.value = settings[key]; fill(); }
      else input.checked = settings[key];
      input.addEventListener('input', () => {
        if (type === 'range') fill();
        const next = readSettings();
        next[key] = type === 'range' ? Number(input.value) : input.checked;
        writeSettings(next);
      });
      row.append(input);
      settingsPanel.append(row);
    });
    settingsPanel.append(action('BACK', showMain, 'is-back'));
    settingsPanel.querySelector('input, button')?.focus();
  };

  actions.append(
    action('RESUME', close, 'is-primary'),
    ...extraActions.map(({ label, onSelect }) => action(label, () => { close(); onSelect?.(); })),
    action('SETTINGS', showSettings),
    action('RETURN TO TITLE', showConfirm, 'is-danger'),
  );
  [...actions.children].forEach((button, index) => {
    button.dataset.index = String(index + 1).padStart(2, '0');
    // The pointer moves the one selection, so only one ticket is ever out.
    button.addEventListener('pointerenter', () => button.focus({ preventScroll: true }));
  });

  // ---------------------------------------------------------------- notices
  // A one-time archive card over the chapter (the first magic stone). It
  // holds the game like the pause menu does and closes on Enter / Space / E,
  // a click or the pad's A / B.
  const notice = {
    open: false,
    root: null,
    lockUntil: 0,
    show({ stamp, title, lines = [], socketsHtml = '' }) {
      if (this.open || paused) return false;
      const layer = document.createElement('div');
      layer.className = 'nf-card-backdrop nf-pause-notice';
      layer.setAttribute('role', 'dialog');
      layer.setAttribute('aria-modal', 'true');
      layer.innerHTML = `<article class="nf-card"><p class="nf-card__stamp"></p><h2 class="nf-card__title"></h2><div class="nf-card__lines"></div><div class="nf-pause-notice__stones">${socketsHtml}</div><button class="nf-card__close" type="button">ENTER · KEEP IT</button></article>`;
      layer.querySelector('.nf-card__stamp').textContent = stamp;
      layer.querySelector('.nf-card__title').textContent = title;
      const body = layer.querySelector('.nf-card__lines');
      lines.forEach((text) => { const p = document.createElement('p'); p.textContent = text; body.append(p); });
      layer.querySelector('.nf-card__close').addEventListener('click', () => this.close());
      document.body.append(layer);
      this.root = layer;
      this.open = true;
      this.lockUntil = performance.now() + 700;
      setRuntimePaused(true);
      padPoll.start();
      requestAnimationFrame(() => layer.querySelector('.nf-card__close')?.focus({ preventScroll: true }));
      return true;
    },
    close() {
      if (!this.open || performance.now() < this.lockUntil) return;
      this.open = false;
      this.root?.remove();
      this.root = null;
      if (!paused) { padPoll.stop(); setRuntimePaused(false); }
    },
  };
  window.addEventListener('nightfall:magic-stone', (event) => {
    let card = null;
    try { card = firstStoneNotice(event.detail?.id); } catch { card = null; }
    if (!card) return;
    // After the chapter's own pickup beat (a chime, a toast, a line), and
    // never over a film or the pause menu.
    const tryShow = (attempt = 0) => {
      if (getActiveCinematic() || paused || globalThis.NIGHTFALL_STONE_OFFER) {
        if (attempt < 120) window.setTimeout(() => tryShow(attempt + 1), 500);
        return;
      }
      if (notice.show(card)) {
        try { createSaveStore().markNoticeSeen(card.key); } catch { /* storage unavailable */ }
      }
    };
    window.setTimeout(() => tryShow(), 1100);
  });

  // Other title exits (for example the corner TITLE control) ask the pause
  // menu to run the same confirmation instead of leaving immediately.
  window.addEventListener(TITLE_REQUEST_EVENT, (event) => {
    event.preventDefault();
    open();
    showConfirm();
  });

  // While the menu (or a notice) is open it owns ↑ ↓ / W S / Enter / Space:
  // they never reach the paused game underneath. The key-up of a key it
  // consumed is swallowed too, so Space never also "clicks" the next
  // focused button.
  const consumed = new Set();
  window.addEventListener('keydown', (event) => {
    if (notice.open) {
      if (['Enter', 'NumpadEnter', 'Space', 'KeyE', 'Escape'].includes(event.code) || [' ', 'Enter', 'Escape'].includes(event.key)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        consumed.add(event.code || event.key);
        if (!event.repeat) notice.close();
      }
      return;
    }
    if (!paused || event.key === 'Escape') return;
    const navAction = menuKeyAction(event);
    if (!navAction) return;
    // ← → still adjust a focused slider natively; ↑ ↓ always move focus.
    event.preventDefault();
    event.stopImmediatePropagation();
    consumed.add(event.code || event.key);
    if (navAction === 'activate' && event.repeat) return;
    menuAction(navAction);
  }, true);
  window.addEventListener('keyup', (event) => {
    if (!consumed.delete(event.code || event.key)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);
  root.addEventListener('pointermove', () => { delete root.dataset.nav; });

  window.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || event.repeat || notice.open) return;
    // Films own Escape (hold to skip) while they are on screen.
    if (!paused && getActiveCinematic()) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (!paused && typeof onEscape === 'function') {
      // A route can become test-enabled after the page first mounted, so let
      // the caller decide at keypress time whether it handled Escape.
      if (onEscape() !== false) return;
    }
    if (!paused) open();
    else back();
  }, true);

  root.open = open;
  root.close = close;
  root.confirmReturnToTitle = () => {
    open();
    showConfirm();
  };
  // A chapter can show a one-time archive card through the same pause.
  root.showNotice = (spec) => notice.show(spec);
  root.navigable = () => navigableControls(currentPanel());
  return root;
}
