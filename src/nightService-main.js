// Chapter 1 // NIGHT SERVICE — standalone entry (night-service.html).
//
// A Gorogoa-style panel puzzle on its own 1920×1080 antialiased Phaser game.
// The shared shell supplies the pause menu (with Chapter 1 controls),
// settings, reduce motion, text size, saves, magic stones and cinematics.
//
// Which act opens:
//   production — the active save slot's checkpoint (chapter-1-start → Act 0,
//                chapter-1-act-05 → Act 0.5, chapter-1-act-1 → Act 1,
//                chapter-1-act-2 → Act 2, chapter-1-act-3 → Act 3; the legacy
//                prologue-start resumes Act 0). URL parameters are ignored.
//   development — `?act=0|0.5|1|2|3` and `?step=<step id>` override the save.

import Phaser from 'phaser';
import './fonts/fonts.css';
import { PANEL_SCENE, PanelScene } from './chapters/nightService/PanelScene.js';
import { ACTS, CHECKPOINT_ACTS, FIRST_ACT, resolveActParam, startCarry } from './chapters/nightService/acts/index.js';
import { createNightServiceAudio } from './chapters/nightService/audio.js';
import { installDevMenuReturnControl } from './devMenuReturn.js';
import { installPauseMenu } from './shell/pauseMenu.js';
import { CHAPTER_CONTROLS } from './shell/chapterControls.js';
import { installPhaserMotionGuard } from './shell/motion.js';
import { DEV_MODE, devParams } from './devMode.js';
import { applySettings, createSaveStore, launchCheckpoint, readSettings } from './shell/saveSystem.js';
import { collectMagicStone } from './shell/magicStones.js';
import { CINEMATICS, playCinematic } from './shell/gameFlow.js';

installPhaserMotionGuard(Phaser);
applySettings(readSettings());
installDevMenuReturnControl();

const store = createSaveStore();

function savedAct() {
  const save = store.readAll()[store.getActiveSlot()];
  return CHECKPOINT_ACTS[save?.checkpointId] ?? FIRST_ACT;
}

const params = devParams();
const startStep = params.get('step');
// `?step=` alone opens whichever act owns that step id
const stepAct = startStep ? Object.values(ACTS).find((act) => act.steps.some((step) => step.id === startStep))?.id : null;
const startAct = resolveActParam(params.get('act')) ?? stepAct ?? savedAct();

let scene = null;
const pause = installPauseMenu({
  checkpointId: 'chapter-1-start',
  controls: CHAPTER_CONTROLS.nightServicePanels,
  // SHOW ME: the ghost hand performs the current step's gesture once (tier 2)
  extraActions: [{ label: 'SHOW ME', onSelect: () => window.dispatchEvent(new CustomEvent('nightfall:hint')) }],
  // Escape first backs out of whatever is in the player's hands.
  onEscape: () => (scene?.sys?.isActive() ? scene.escape() : false),
});
void pause;

const audio = createNightServiceAudio();

// Chapter 2 · BORROWED LIGHT is its own page; the checkpoint owns the route.
function launchChapter2() {
  launchCheckpoint('chapter-2-start');
}

const services = {
  audio,
  devMode: DEV_MODE,
  // dev-only QA knob: headless software GL can render under 1 fps, so solve
  // scripts pass `?dtmax=1000` to step the simulation (and tweens, below) in
  // real time. Production is fixed at 50 ms with Phaser's smoothed delta.
  maxDt: Math.min(2000, Number(params.get('dtmax')) || 50),
  onCheckpoint(id) {
    const slot = store.getActiveSlot();
    if (!store.readAll()[slot]) store.startNew(slot);
    store.markCheckpoint(id, { slot });
  },
  onStone(id) {
    collectMagicStone(id);
  },
  onActChange(actId) {
    document.documentElement.dataset.nightServiceAct = actId;
  },
  onChapterEnd() {
    services.onCheckpoint('chapter-2-start');
    audio.destroy();
    playCinematic({
      id: 'chapter-1-to-2',
      src: CINEMATICS.chapter1To2,
      label: 'Chapter 1 to Chapter 2 transition',
      preloadChapterId: 'chapter2',
      onComplete: launchChapter2,
    });
  },
};

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: 1920,
  height: 1080,
  backgroundColor: '#0b0705',
  render: { antialias: true, pixelArt: false, roundPixels: false, powerPreference: 'high-performance' },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  ...(params.has('dtmax') ? { fps: { smoothStep: false } } : {}),
  scene: [],
});

game.canvas.setAttribute('tabindex', '0');
game.canvas.setAttribute('role', 'application');
game.canvas.setAttribute('aria-label', 'Night Service panel puzzle');
game.canvas.addEventListener('pointerdown', () => game.canvas.focus());
game.canvas.addEventListener('contextmenu', (event) => event.preventDefault());

// Not dev-only: shell/pauseMenu.js pauses the scenes through globalThis.game.
window.game = game;

const boot = async () => {
  // captions use the bundled Space Mono; wait briefly so the first line never
  // renders in a fallback face
  try { await Promise.race([document.fonts?.load('700 22px "Space Mono"'), new Promise((r) => setTimeout(r, 1200))]); } catch { /* fonts optional */ }
  // dev only: `?from=act0` opens the act as if the previous one just ended
  // (so the carriage wall grows in place) — params are empty in production
  const fromAct = ACTS[params.get('from')] ? params.get('from') : null;
  const carry = fromAct ? { ...startCarry(startAct), slots: ACTS[fromAct].endSlots ?? ACTS[fromAct].slots } : undefined;
  game.scene.add(PANEL_SCENE, PanelScene, true, { actId: startAct, step: startStep, services, fromAct, carry });
  scene = game.scene.getScene(PANEL_SCENE);
  document.documentElement.dataset.nightServiceAct = startAct;
};
if (game.isBooted) boot(); else game.events.once('ready', boot);

if (DEV_MODE) {
  window.render_game_to_text = () => {
    const active = game.scene.getScene(PANEL_SCENE);
    return JSON.stringify(active?.sys?.isActive() && active.model ? active.textState() : { scene: 'booting' });
  };
  window.__nightService = {
    get scene() { return game.scene.getScene(PANEL_SCENE); },
    get model() { return game.scene.getScene(PANEL_SCENE)?.model; },
  };
}

export default game;
