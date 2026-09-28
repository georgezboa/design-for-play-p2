// Chapter 4 // THE PAINTED COUNTRY — standalone entry.
//
// I   Under the gouache (PaintedCountryScene): paint and wash the gallery car.
// II  The still life (DrawingStudioScene): six colours, as Rosa remembered.
// III The painted train (PigmentTrainScene, the yard) and the line ahead
//     (PaintedLineScene, the chase on the four-second bell).

import Phaser from 'phaser';
import './fonts/fonts.css';
import { PaintedCountryScene, PAINTED_COUNTRY_VIEW } from './chapters/paintedCountry/PaintedCountryScene.js';
import { DrawingStudioScene } from './chapters/paintedCountry/DrawingStudioScene.js';
import { PigmentTrainScene } from './chapters/paintedCountry/PigmentTrainScene.js';
import { PaintedLineScene } from './chapters/paintedCountry/PaintedLineScene.js';
import { PAPER_CSS } from './chapters/paintedCountry/paperPalette.js';
import { installDevMenuReturnControl } from './devMenuReturn.js';
import { installPauseMenu } from './shell/pauseMenu.js';
import { DEV_MODE, devRoutesEnabled } from './devMode.js';
import { CHAPTER_CONTROLS } from './shell/chapterControls.js';
import { installPhaserMotionGuard } from './shell/motion.js';

installPhaserMotionGuard(Phaser);

installDevMenuReturnControl();
installPauseMenu({ checkpointId: 'chapter-4-start', controls: CHAPTER_CONTROLS.paintedCountry });

const qa = devRoutesEnabled() ? new URLSearchParams(window.location.search).get('qa') : null;
const allScenes = [PaintedCountryScene, DrawingStudioScene, PigmentTrainScene, PaintedLineScene];
const STUDIO_ROUTES = ['drawing', 'drawing-start', 'drawing-ready', 'drawing-wrong', 'drawing-done'];
const YARD_ROUTES = ['pigments', 'build-train', 'train-ready', 'fused-train', 'home-plate'];
const LINE_ROUTES = ['line', 'line-clear', 'line-end'];
const firstScene = STUDIO_ROUTES.includes(qa)
  ? DrawingStudioScene
  : YARD_ROUTES.includes(qa)
    ? PigmentTrainScene
    : LINE_ROUTES.includes(qa)
      ? PaintedLineScene
      : PaintedCountryScene;
const sceneOrder = [firstScene, ...allScenes.filter((scene) => scene !== firstScene)];

async function fontsReady() {
  if (!document.fonts?.load) return;
  const wait = Promise.all([
    document.fonts.load('400 16px "Space Mono"'),
    document.fonts.load('700 16px "Space Mono"'),
  ]).catch(() => {});
  await Promise.race([wait, new Promise((resolve) => setTimeout(resolve, 1500))]);
}

let game = null;

async function boot() {
  await fontsReady();
  game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: PAINTED_COUNTRY_VIEW.w,
    height: PAINTED_COUNTRY_VIEW.h,
    backgroundColor: PAPER_CSS.sheet,
    render: {
      // Deliberately NOT pixelArt: this chapter is drawn media, and a paper
      // edge needs its antialiasing.
      antialias: true,
      roundPixels: false,
    },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    physics: { default: 'arcade', arcade: { gravity: { y: 1700 }, debug: false } },
    // The brush has a keyboard and a gamepad hand as well as the mouse.
    input: { gamepad: true },
    scene: sceneOrder,
  });

  // The brush is aimed with the pointer, so the canvas has to be able to take
  // focus and swallow the context menu.
  game.canvas.setAttribute('tabindex', '0');
  game.canvas.addEventListener('pointerdown', () => game.canvas.focus());
  game.canvas.addEventListener('contextmenu', (event) => event.preventDefault());

  // Not dev-only: shell/pauseMenu.js pauses the scenes through globalThis.game.
  window.game = game;
}

if (DEV_MODE) window.render_game_to_text = () => {
  const scene = ['PaintedLine', 'PigmentTrain', 'DrawingStudio', 'PaintedCountry']
    .map((key) => game?.scene.getScene(key))
    .find((candidate) => candidate?.sys?.isActive());
  return JSON.stringify(scene?.sys?.isActive() ? scene.textState() : { scene: 'booting' });
};

boot();

export default game;
