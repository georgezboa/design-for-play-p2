// Chapter 4 // THE PAINTED COUNTRY — standalone entry.
//
// Named for identity rather than sequence order, per the guardrail that the car
// order may still change. Touches no other chapter's code.

import Phaser from 'phaser';
import { PaintedCountryScene, PAINTED_COUNTRY_VIEW } from './chapters/paintedCountry/PaintedCountryScene.js';
import { DrawingStudioScene } from './chapters/paintedCountry/DrawingStudioScene.js';
import { PigmentTrainScene } from './chapters/paintedCountry/PigmentTrainScene.js';
import { PAPER_CSS } from './chapters/paintedCountry/paperPalette.js';
import { installDevMenuReturnControl } from './devMenuReturn.js';
import { installPauseMenu } from './shell/pauseMenu.js';
import { devRoutesEnabled } from './devMode.js';

installDevMenuReturnControl();
installPauseMenu({ checkpointId: 'chapter-4-start' });

const qa = devRoutesEnabled() ? new URLSearchParams(window.location.search).get('qa') : null;
const allScenes = [PaintedCountryScene, DrawingStudioScene, PigmentTrainScene];
const firstScene = ['drawing', 'drawing-start', 'drawing-ready', 'drawing-free', 'drawing-magic-stone'].includes(qa)
  ? DrawingStudioScene
  : ['pigments', 'build-train', 'ring-press', 'train-ready', 'fused-train', 'ignition', 'consequence'].includes(qa)
    ? PigmentTrainScene
    : PaintedCountryScene;
const sceneOrder = [firstScene, ...allScenes.filter((scene) => scene !== firstScene)];

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: PAINTED_COUNTRY_VIEW.w,
  height: PAINTED_COUNTRY_VIEW.h,
  backgroundColor: PAPER_CSS.sheet,
  render: {
    // Deliberately NOT pixelArt. Every other car crushes to a hard pixel grid;
    // this one is drawn media, and a paper edge needs its antialiasing.
    antialias: true,
    roundPixels: false,
  },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  physics: { default: 'arcade', arcade: { gravity: { y: 1700 }, debug: false } },
  scene: sceneOrder,
});

// The brush is aimed with the pointer, so the canvas has to be able to take
// focus and swallow the context menu.
game.canvas.setAttribute('tabindex', '0');
game.canvas.addEventListener('pointerdown', () => game.canvas.focus());
game.canvas.addEventListener('contextmenu', (event) => event.preventDefault());

window.game = game;

window.render_game_to_text = () => {
  const scene = ['PigmentTrain', 'DrawingStudio', 'PaintedCountry']
    .map((key) => game.scene.getScene(key))
    .find((candidate) => candidate?.sys?.isActive());
  return JSON.stringify(
    scene?.sys?.isActive() ? scene.textState() : { scene: 'booting' },
  );
};

export default game;
