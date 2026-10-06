// Chapter 5 · OBJECT PENDING CLASSIFICATION (one-answer.html).
//
// The Museum lobby's central-case exhibit, built on the Chapter 1 panel
// engine (src/chapters/nightService/): the same PanelScene, audio and verbs,
// hosting the act in src/chapters/nightService/acts/oneAnswer.js.
//
// Embedded contract (chapter05OneAnswerContract.js), like the Labyrinth's:
//   museum-3d.html frames `?embedded=1`; when the act ends the page posts
//   `completeMessage`; Escape first backs out of whatever is in the player's
//   hands, then posts `exitMessage` (the frame keeps its state, so the player
//   can step back into the case where they left it).
// It needs no save data: the museum has "already filed" these objects.

import Phaser from 'phaser';
import '../../../fonts/fonts.css';
import { PANEL_SCENE, PanelScene } from '../../nightService/PanelScene.js';
import { ONE_ANSWER_ACT } from '../../nightService/acts/oneAnswer.js';
import { createNightServiceAudio } from '../../nightService/audio.js';
import { ONE_ANSWER_CHAPTER05_CONTRACT } from './chapter05OneAnswerContract.js';
import { installDevMenuReturnControl } from '../../../devMenuReturn.js';
import { installPauseMenu } from '../../../shell/pauseMenu.js';
import { CHAPTER_CONTROLS } from '../../../shell/chapterControls.js';
import { installPhaserMotionGuard } from '../../../shell/motion.js';
import { followLowGraphics } from '../../../shared/phaserRenderScale.js';
import { installWallClock } from '../../../shared/phaserWallClock.js';
import { applySettings, readSettings } from '../../../shell/saveSystem.js';
import { leaveForTitle } from '../../../shell/titleReturn.js';
import { DEV_MODE, devParams } from '../../../devMode.js';

installPhaserMotionGuard(Phaser);
applySettings(readSettings());

const embedded = new URLSearchParams(window.location.search).get('embedded') === '1';
// the Museum frames this page; opened on its own there is no one to tell
const framed = (() => { try { return window.parent !== window; } catch { return true; } })();
const params = devParams();
const startStep = params.get('step');
let scene = null;
let completionSent = false;

const post = (type) => {
  if (!embedded) return;
  window.parent.postMessage({ type }, window.location.origin);
};

if (embedded) {
  document.documentElement.classList.add('embedded');
  // Escape: drop what is in hand, else return to the museum.
  window.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || event.repeat) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (scene?.sys?.isActive() && scene.escape()) return;
    post(ONE_ANSWER_CHAPTER05_CONTRACT.exitMessage);
  }, true);
} else {
  installDevMenuReturnControl();
  installPauseMenu({
    checkpointId: 'chapter-5-start',
    controls: CHAPTER_CONTROLS.oneAnswer,
    onEscape: () => (scene?.sys?.isActive() ? scene.escape() : false),
  });
}

const audio = createNightServiceAudio({ music: false });

const services = {
  audio,
  devMode: DEV_MODE,
  // dev-only: headless QA steps the simulation in real time (see nightService-main.js)
  // Wall-clock time down to 10 fps (alpha round 4: frame-rate independence).
  maxDt: Math.min(2000, Number(params.get('dtmax')) || 100),
  onChapterEnd() {
    if (completionSent) return;
    completionSent = true;
    // standalone (no Museum around it): the exhibit ends at the title, not on black
    if (!embedded || !framed) { leaveForTitle(); return; }
    post(ONE_ANSWER_CHAPTER05_CONTRACT.completeMessage);
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
game.canvas.setAttribute('aria-label', 'Object pending classification: four evidence windows');
game.canvas.addEventListener('pointerdown', () => { game.canvas.focus(); audio.unlock(); });
game.canvas.addEventListener('contextmenu', (event) => event.preventDefault());
window.addEventListener('keydown', () => audio.unlock(), { once: true });
// Not dev-only: shell/pauseMenu.js pauses the scenes through globalThis.game.
window.game = game;
// LOW GRAPHICS: the exhibit's 1920×1080 stage drawn at half resolution
// (alpha round 4: it ran at 2.8 fps framed in the museum on software GL).
followLowGraphics(game, { low: 0.5 });
installWallClock(game);

const boot = async () => {
  try { await Promise.race([document.fonts?.load('700 22px "Space Mono"'), new Promise((r) => setTimeout(r, 1200))]); } catch { /* fonts optional */ }
  game.scene.add(PANEL_SCENE, PanelScene, true, { act: ONE_ANSWER_ACT, actId: ONE_ANSWER_ACT.id, step: startStep, services });
  scene = game.scene.getScene(PANEL_SCENE);
  game.canvas.focus();
};
if (game.isBooted) boot(); else game.events.once('ready', boot);

if (DEV_MODE) {
  window.render_game_to_text = () => {
    const active = game.scene.getScene(PANEL_SCENE);
    const state = active?.sys?.isActive() && active.model ? active.textState() : { scene: 'booting' };
    return JSON.stringify({ exhibit: 'one-answer', embedded, completionSent, ...state });
  };
  window.__oneAnswer = {
    get scene() { return game.scene.getScene(PANEL_SCENE); },
    get model() { return game.scene.getScene(PANEL_SCENE)?.model; },
  };
}

export default game;
