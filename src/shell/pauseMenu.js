import './pauseMenu.css';
import {
  applySettings,
  createSaveStore,
  readSettings,
  returnToTitle,
  writeSettings,
} from './saveSystem.js';
import { getActiveCinematic } from './gameFlow.js';

const PAUSE_ID = 'nightfall-pause-menu';

function action(label, handler, className = '') {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `nf-pause-action ${className}`.trim();
  button.textContent = label;
  button.addEventListener('click', handler);
  return button;
}

export function installPauseMenu({ checkpointId = null, allowEmbedded = false, onEscape = null } = {}) {
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
      <nav class="nf-pause-actions"></nav>
      <div class="nf-pause-settings" hidden></div>
      <p class="nf-pause-status" role="status" aria-live="polite"></p>
      <small class="nf-pause-hint">ESC · RESUME &nbsp;&nbsp; ↑ ↓ · SELECT &nbsp;&nbsp; ENTER · CONFIRM</small>
    </section>
  `;
  document.body.append(root);
  const actions = root.querySelector('.nf-pause-actions');
  const settingsPanel = root.querySelector('.nf-pause-settings');
  const status = root.querySelector('.nf-pause-status');
  let paused = false;
  let inSettings = false;
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

  const close = () => {
    if (!paused) return;
    paused = false;
    inSettings = false;
    root.hidden = true;
    settingsPanel.hidden = true;
    actions.hidden = false;
    setRuntimePaused(false);
    priorFocus?.focus?.();
  };
  const open = () => {
    if (paused) return;
    priorFocus = document.activeElement;
    paused = true;
    root.hidden = false;
    setRuntimePaused(true);
    actions.querySelector('button')?.focus();
  };

  const saveNow = () => {
    const resolvedCheckpoint = typeof checkpointId === 'function' ? checkpointId() : checkpointId;
    if (!resolvedCheckpoint) {
      status.textContent = 'PROGRESS SAVES AT THE NEXT CHECKPOINT';
      return;
    }
    const saved = createSaveStore().markCheckpoint(resolvedCheckpoint);
    status.textContent = saved ? 'JOURNEY SAVED' : 'BEGIN A JOURNEY FROM THE TITLE TO ENABLE SAVING';
  };

  const showSettings = () => {
    inSettings = true;
    actions.hidden = true;
    settingsPanel.hidden = false;
    settingsPanel.replaceChildren();
    const settings = readSettings();
    const controls = [
      ['masterVolume', 'MASTER VOLUME', 'range', 0, 100],
      ['musicVolume', 'MUSIC VOLUME', 'range', 0, 100],
      ['sfxVolume', 'SFX VOLUME', 'range', 0, 100],
      ['textScale', 'TEXT SIZE', 'range', 90, 130],
      ['subtitles', 'SUBTITLES', 'checkbox'],
      ['reducedMotion', 'REDUCE MOTION', 'checkbox'],
    ];
    controls.forEach(([key, label, type, min, max]) => {
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
    const controlsNote = document.createElement('p');
    controlsNote.className = 'nf-pause-controls-note';
    controlsNote.textContent = 'MOVE · WASD / ARROWS    INTERACT · E / ENTER    PAUSE · ESC';
    settingsPanel.append(controlsNote, action('BACK', () => {
      inSettings = false;
      settingsPanel.hidden = true;
      actions.hidden = false;
      actions.querySelector('button')?.focus();
    }));
    settingsPanel.querySelector('input, button')?.focus();
  };

  actions.append(
    action('RESUME', close),
    action('SAVE', saveNow),
    action('SETTINGS', showSettings),
    action('RETURN TO TITLE', () => returnToTitle(), 'is-danger'),
  );

  window.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || event.repeat) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (!paused && typeof onEscape === 'function') {
      // A route can become test-enabled after the page first mounted, so let
      // the caller decide at keypress time whether it handled Escape.
      if (onEscape() !== false) return;
    }
    if (!paused) open();
    else if (inSettings) {
      inSettings = false;
      settingsPanel.hidden = true;
      actions.hidden = false;
      actions.querySelector('button')?.focus();
    } else close();
  }, true);

  root.open = open;
  root.close = close;
  return root;
}
