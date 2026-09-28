import './uiKit.css';
import './pauseMenu.css';
import './canvasFocus.css';
import {
  CHECKPOINTS,
  TITLE_REQUEST_EVENT,
  applySettings,
  createSaveStore,
  readSettings,
  returnToTitle,
  writeSettings,
} from './saveSystem.js';
import { getActiveCinematic } from './gameFlow.js';
import { SETTINGS_CONTROLS } from './settingsControls.js';
import { MAGIC_STONE_MEANING, magicStoneRowHtml, magicStoneSnapshot } from './magicStones.js';

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
  if (!save) return 'NO ACTIVE JOURNEY · PROGRESS IS NOT BEING SAVED';
  const checkpoint = CHECKPOINTS.find(({ id }) => id === save.checkpointId) ?? CHECKPOINTS[0];
  return `LAST CHECKPOINT · CHAPTER ${checkpoint.chapter} · ${checkpoint.title}`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);
}

function action(label, handler, className = '') {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `nf-pause-action ${className}`.trim();
  button.textContent = label;
  button.addEventListener('click', handler);
  return button;
}

// `checkpointId` is still accepted from older call sites but no longer used:
// the pause menu reports the saved checkpoint rather than writing one.
export function installPauseMenu({
  checkpointId: _legacyCheckpointId = null,
  allowEmbedded = false,
  onEscape = null,
  controls = DEFAULT_PAUSE_CONTROLS,
} = {}) {
  if (typeof window === 'undefined' || (!allowEmbedded && window.top !== window) || document.getElementById(PAUSE_ID)) return null;
  applySettings(readSettings());

  const root = document.createElement('aside');
  root.id = PAUSE_ID;
  root.hidden = true;
  root.innerHTML = `
    <div class="nf-pause-backdrop"></div>
    <section class="nf-pause-card" role="dialog" aria-modal="true" aria-label="Pause menu">
      <p class="nf-pause-eyebrow">NIGHT SERVICE SUSPENDED</p>
      <h2>PAUSED</h2>
      <p class="nf-pause-checkpoint"></p>
      <div class="nf-pause-stones" aria-live="polite"></div>
      <nav class="nf-pause-actions"></nav>
      <div class="nf-pause-settings" hidden></div>
      <div class="nf-pause-confirm" hidden role="alertdialog" aria-labelledby="nf-pause-confirm-title" aria-describedby="nf-pause-confirm-copy">
        <p class="nf-pause-confirm-title" id="nf-pause-confirm-title">RETURN TO TITLE?</p>
        <p class="nf-pause-confirm-copy" id="nf-pause-confirm-copy">${RETURN_TO_TITLE_WARNING}</p>
        <div class="nf-pause-confirm-actions"></div>
      </div>
      <p class="nf-pause-status" role="status" aria-live="polite"></p>
      <small class="nf-pause-hint">ESC · RESUME &nbsp;&nbsp; ↑ ↓ · SELECT &nbsp;&nbsp; ENTER · CONFIRM</small>
    </section>
  `;
  document.body.append(root);
  const actions = root.querySelector('.nf-pause-actions');
  const settingsPanel = root.querySelector('.nf-pause-settings');
  const confirmPanel = root.querySelector('.nf-pause-confirm');
  const checkpointLine = root.querySelector('.nf-pause-checkpoint');
  const stonesLine = root.querySelector('.nf-pause-stones');
  // The five-stone meta-goal is visible from the first pause of the game,
  // long before the Museum's last stone is offered.
  const renderStones = () => {
    let snapshot;
    try { snapshot = magicStoneSnapshot(); } catch { return; }
    stonesLine.innerHTML = `<span class="nf-pause-stones__label">UNFILED OBJECTS</span>${magicStoneRowHtml(snapshot)}<span class="nf-pause-stones__count">${snapshot.count} / ${snapshot.total}</span>`;
    stonesLine.title = MAGIC_STONE_MEANING.join(' ');
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

  const showMain = () => {
    inSettings = false;
    inConfirm = false;
    settingsPanel.hidden = true;
    confirmPanel.hidden = true;
    actions.hidden = false;
    actions.querySelector('button')?.focus();
  };
  const close = () => {
    if (!paused) return;
    paused = false;
    inSettings = false;
    inConfirm = false;
    root.hidden = true;
    settingsPanel.hidden = true;
    confirmPanel.hidden = true;
    actions.hidden = false;
    status.textContent = '';
    setRuntimePaused(false);
    priorFocus?.focus?.();
  };
  const open = () => {
    if (paused) return;
    priorFocus = document.activeElement;
    paused = true;
    root.hidden = false;
    checkpointLine.textContent = describeLastCheckpoint();
    renderStones();
    setRuntimePaused(true);
    actions.querySelector('button')?.focus();
  };

  const showConfirm = () => {
    inConfirm = true;
    inSettings = false;
    actions.hidden = true;
    settingsPanel.hidden = true;
    confirmPanel.hidden = false;
    // Default to the safe choice so a stray Enter never discards progress.
    confirmPanel.querySelector('.nf-pause-confirm-actions button:last-child')?.focus();
  };
  confirmPanel.querySelector('.nf-pause-confirm-actions').append(
    action('RETURN TO TITLE', () => returnToTitle(), 'is-danger'),
    action('CANCEL', showMain),
  );

  const showSettings = () => {
    inSettings = true;
    actions.hidden = true;
    settingsPanel.hidden = false;
    settingsPanel.replaceChildren();
    const settings = readSettings();
    SETTINGS_CONTROLS.forEach(([key, label, type, min, max]) => {
      const row = document.createElement('label');
      row.className = 'nf-pause-setting';
      row.innerHTML = `<span>${label}</span>`;
      const input = document.createElement('input');
      input.type = type;
      if (type === 'range') { input.min = min; input.max = max; input.value = settings[key]; }
      else input.checked = settings[key];
      input.addEventListener('input', () => {
        const next = readSettings();
        next[key] = type === 'range' ? Number(input.value) : input.checked;
        writeSettings(next);
      });
      row.append(input);
      settingsPanel.append(row);
    });
    const controlsNote = document.createElement('dl');
    controlsNote.className = 'nf-pause-controls-note';
    controlsNote.setAttribute('aria-label', 'Controls');
    const rows = typeof controls === 'function' ? controls() : controls;
    controlsNote.innerHTML = (rows?.length ? rows : DEFAULT_PAUSE_CONTROLS)
      .map(([name, keys]) => `<div><dt>${escapeHtml(name)}</dt><dd>${escapeHtml(keys)}</dd></div>`)
      .join('');
    settingsPanel.append(controlsNote, action('BACK', showMain));
    settingsPanel.querySelector('input, button')?.focus();
  };

  actions.append(
    action('RESUME', close),
    action('SETTINGS', showSettings),
    action('RETURN TO TITLE', showConfirm, 'is-danger'),
  );

  // Other title exits (for example the corner TITLE control) ask the pause
  // menu to run the same confirmation instead of leaving immediately.
  window.addEventListener(TITLE_REQUEST_EVENT, (event) => {
    event.preventDefault();
    open();
    showConfirm();
  });

  window.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || event.repeat) return;
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
    else if (inSettings || inConfirm) showMain();
    else close();
  }, true);

  root.open = open;
  root.close = close;
  root.confirmReturnToTitle = () => {
    open();
    showConfirm();
  };
  return root;
}
