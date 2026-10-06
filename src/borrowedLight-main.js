// Chapter 2 // BORROWED LIGHT — standalone entry (borrowed-light.html).
//
// Its own Phaser game at 1920×1080, antialiased, FIT-scaled, Arcade physics.
// Uses the shared shell: pause menu with this chapter's controls, settings,
// saves, stones, cinematics and the desktop bridge.
//
// The start section comes from `?section=A|B|C`. A dev build honours it as a
// QA route; production honours it only when the active save has unlocked
// that section's checkpoint (the route a Continue / Load uses), so a
// hand-edited URL cannot skip ahead. `?timescale=`, `?intro=0` and
// `?lamp=<id>` (start at a lamp inside the section) are dev-only.
//
// Alpha round 4: a save standing on this section's checkpoint with a resume
// point (the last lamp lit, saveSystem markResume) starts at that lamp,
// unless a dev / QA parameter picks the start. Game time follows the wall
// clock (frameClock.js); LOW GRAPHICS renders at a smaller internal size.
// The pause menu's SHOW ME asks the scene for the current room's hint.

import Phaser from 'phaser';
import './fonts/fonts.css';
import { BorrowedLightScene, BORROWED_LIGHT_VIEW, VIEW_SCALE_LOW, playSectionMusic } from './chapters/borrowedLight/BorrowedLightScene.js';
import { SECTION_CHECKPOINTS, resolveResumeLamp, resolveStartLamp, resolveStartSection } from './chapters/borrowedLight/level.js';
import { MAX_FRAME_MS, QA_MAX_FRAME_MS, installWallClock } from './chapters/borrowedLight/frameClock.js';
import { installDevMenuReturnControl } from './devMenuReturn.js';
import { installPauseMenu } from './shell/pauseMenu.js';
import { DEV_MODE, devParam } from './devMode.js';
import { CHAPTER_CONTROLS } from './shell/chapterControls.js';
import { installPhaserMotionGuard } from './shell/motion.js';
import { createSaveStore } from './shell/saveSystem.js';

installPhaserMotionGuard(Phaser);
installDevMenuReturnControl();
installPauseMenu({
  controls: CHAPTER_CONTROLS.borrowedLight,
  // SHOW ME: the current room's hint at once (the scene's idle hints).
  extraActions: [{ label: 'SHOW ME', onSelect: () => window.dispatchEvent(new CustomEvent('nightfall:hint')) }],
});

const store = createSaveStore();
const activeSave = store.readAll()[store.getActiveSlot()];
// An old save may sit on a checkpoint without listing it as unlocked.
const section = resolveStartSection({
  search: window.location.search,
  devMode: DEV_MODE,
  unlocked: [...(activeSave?.unlocked ?? []), activeSave?.checkpointId].filter(Boolean),
});
// Dev QA only: ?lamp=<id> starts at a lamp inside the section (room routes).
const devLamp = resolveStartLamp({ search: window.location.search, devMode: DEV_MODE, section });
const qaTimescale = DEV_MODE && devParam('timescale') !== null;
const timescale = qaTimescale ? Number(devParam('timescale')) || 1 : 1;
const skipIntro = DEV_MODE && devParam('intro') === '0';
// A resume point inside this section's checkpoint (the last lamp lit), when
// the save stands on it and no QA parameter picks the start instead.
const checkpoint = SECTION_CHECKPOINTS[section];
const qaStart = DEV_MODE && ['lamp', 'qa', 'timescale', 'intro'].some((key) => devParam(key) !== null);
const resumeLamp = !qaStart && activeSave?.checkpointId === checkpoint
  ? resolveResumeLamp({ resume: store.readResume(checkpoint), section })
  : null;
const lamp = devLamp ?? resumeLamp;
const lowGraphics = globalThis.NIGHTFALL_SETTINGS?.lowGraphics === true;
const viewScale = lowGraphics ? VIEW_SCALE_LOW : 1;
// The score starts on arrival, through the shared music director (it plays
// as soon as the browser allows; the scene's own call is then a no-op).
playSectionMusic(section);

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
    width: Math.round(BORROWED_LIGHT_VIEW.w * viewScale),
    height: Math.round(BORROWED_LIGHT_VIEW.h * viewScale),
    backgroundColor: '#05080d',
    // LOW GRAPHICS: no multisampling (textures stay smoothly filtered).
    render: { antialias: true, antialiasGL: !lowGraphics, roundPixels: false, powerPreference: 'high-performance' },
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
  // Game time follows the wall clock: no slow motion on a weak laptop.
  installWallClock(game.loop, { maxMs: qaTimescale ? QA_MAX_FRAME_MS : MAX_FRAME_MS });
  game.scene.add('BorrowedLight', BorrowedLightScene, true, {
    section, lamp, resumed: Boolean(resumeLamp && !devLamp), devMode: DEV_MODE, timescale, skipIntro, qaTimescale, lowGraphics,
  });

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
      lamp: (id) => { const s = scene(); const node = s?.sectionNodes().find((n) => n.id === id); if (node) s.lampAction(node); return s?.tt.carried() ?? null; },
      snap: () => scene()?.snapCamera(),
      // Slow a scripted run down further for a precise beat (QA timescale only).
      timescale: (v) => scene()?.setQaTimescale(v),
    };
  }
}

boot();

export default game;
