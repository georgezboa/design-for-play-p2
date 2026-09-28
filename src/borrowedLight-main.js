// Chapter 2 // BORROWED LIGHT — standalone entry (borrowed-light.html).
//
// Its own Phaser game at 1920×1080, antialiased, FIT-scaled, Arcade physics.
// Uses the shared shell: pause menu with this chapter's controls, settings,
// saves, stones, cinematics and the desktop bridge.
//
// The start section comes from `?section=A|B|C`. A dev build honours it as a
// QA route; production honours it only when the active save has unlocked
// that section's checkpoint (the route a Continue / Load uses), so a
// hand-edited URL cannot skip ahead. `?timescale=` and `?intro=0` are
// dev-only.

import Phaser from 'phaser';
import './fonts/fonts.css';
import { BorrowedLightScene, BORROWED_LIGHT_VIEW } from './chapters/borrowedLight/BorrowedLightScene.js';
import { resolveStartSection } from './chapters/borrowedLight/level.js';
import { installDevMenuReturnControl } from './devMenuReturn.js';
import { installPauseMenu } from './shell/pauseMenu.js';
import { DEV_MODE, devParam } from './devMode.js';
import { CHAPTER_CONTROLS } from './shell/chapterControls.js';
import { installPhaserMotionGuard } from './shell/motion.js';
import { createSaveStore } from './shell/saveSystem.js';

installPhaserMotionGuard(Phaser);
installDevMenuReturnControl();
installPauseMenu({ controls: CHAPTER_CONTROLS.borrowedLight });

const store = createSaveStore();
const activeSave = store.readAll()[store.getActiveSlot()];
// An old save may sit on a checkpoint without listing it as unlocked.
const section = resolveStartSection({
  search: window.location.search,
  devMode: DEV_MODE,
  unlocked: [...(activeSave?.unlocked ?? []), activeSave?.checkpointId].filter(Boolean),
});
const qaTimescale = DEV_MODE && devParam('timescale') !== null;
const timescale = qaTimescale ? Number(devParam('timescale')) || 1 : 1;
const skipIntro = DEV_MODE && devParam('intro') === '0';

async function fontsReady() {
  if (!document.fonts?.load) return;
  const wait = Promise.all([
    document.fonts.load('400 16px "Space Mono"'),
    document.fonts.load('700 16px "Space Mono"'),
    document.fonts.load('400 32px Anton'),
  ]).catch(() => {});
  await Promise.race([wait, new Promise((resolve) => setTimeout(resolve, 1500))]);
}

let game = null;

async function boot() {
  await fontsReady();
  game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: BORROWED_LIGHT_VIEW.w,
    height: BORROWED_LIGHT_VIEW.h,
    backgroundColor: '#05080d',
    render: { antialias: true, roundPixels: false, powerPreference: 'high-performance' },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    input: { gamepad: true },
    // QA (dev + ?timescale= only): a slow headless renderer must not have
    // its frames clamped, so game time follows the wall clock × timescale
    // and scripted input stays in step with the game.
    ...(qaTimescale ? { fps: { min: 1, smoothStep: false, panicMax: 0 } } : {}),
    // Butch's gravity lives in controller.js; Arcade only resolves contacts.
    physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 }, debug: false, fps: 60 } },
    scene: [],
  });
  game.scene.add('BorrowedLight', BorrowedLightScene, true, { section, devMode: DEV_MODE, timescale, skipIntro, qaTimescale });

  game.canvas.setAttribute('tabindex', '0');
  game.canvas.setAttribute('role', 'application');
  game.canvas.setAttribute('aria-label', 'NIGHTFALL — Borrowed Light');
  game.canvas.addEventListener('pointerdown', () => game.canvas.focus());
  game.canvas.addEventListener('contextmenu', (event) => event.preventDefault());
  game.canvas.focus();

  // Not dev-only: shell/pauseMenu.js pauses the scenes through globalThis.game.
  window.game = game;

  if (DEV_MODE) {
    const scene = () => game.scene.getScene('BorrowedLight');
    window.render_game_to_text = () => {
      const active = scene();
      return JSON.stringify(active?.sys?.isActive() && active.tt ? active.textState() : { scene: 'booting' });
    };
    // QA helpers for scripted screenshots. Dev build only.
    window.__borrowedLight = {
      scene,
      teleport: (x, feetY) => scene()?.placePlayer(x, feetY),
      punch: (id) => scene()?.tt.punch(id),
      hold: (id) => scene()?.tt.hold(id),
      snap: () => scene()?.snapCamera(),
    };
  }
}

boot();

export default game;
