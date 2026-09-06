// Chapter 3 // ECHO CITY — independent entry point.
// Builds a Phaser game whose only scene is EchoCityScene. Does not touch
// src/main.js, src/scenes/*, or any other chapter's code. The preserved
// MOVE AS ONE V2 scene (PresentCityScene) stays in the repository as
// reusable engineering evidence but is no longer the chapter entry.

import Phaser from 'phaser';
import { GAME_W, GAME_H, GRAVITY } from './constants.js';
import EchoCityScene from './cars/presentCity/EchoCityIsoScene.js';
import { installDevMenuReturnControl } from './devMenuReturn.js';

installDevMenuReturnControl();

const config = {
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_W,
  height: GAME_H,
  backgroundColor: '#03050a',
  render: {
    antialias: false,
    pixelArt: true,
    roundPixels: true,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: GRAVITY },
      debug: false,
    },
  },
  // NONE keeps the canvas at the literal 960×600 so the page chrome
  // and Phaser agree on the size. The browser's CSS scales the parent
  // #game div for layout, but Phaser itself never re-flows.
  scale: {
    mode: Phaser.Scale.NONE,
    autoCenter: Phaser.Scale.NO_CENTER,
  },
  scene: [EchoCityScene],
};

const game = new Phaser.Game(config);

game.canvas.setAttribute('tabindex', '0');
game.canvas.setAttribute('role', 'application');
game.canvas.setAttribute('aria-label', 'CHAPTER 3 ECHO CITY game canvas');
game.canvas.addEventListener('pointerdown', () => game.canvas.focus());

window.game = game;
window.__CAR03__ = { game };

// The EchoCityScene hooks `window.render_game_to_text` itself.
export default game;
