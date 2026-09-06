// CAR 04 // THE BORROWED GRID — standalone entry.
// Isolated from the main game boot: own config, own scene, own text hook.

import Phaser from 'phaser';
import { RetroCyberpunkScene } from './cars/retroCyberpunk/RetroCyberpunkScene.js';
import { VIEW } from './cars/retroCyberpunk/levelData.js';
import { installDevMenuReturnControl } from './devMenuReturn.js';

installDevMenuReturnControl();

const config = {
  type: Phaser.AUTO,
  parent: 'game',
  width: VIEW.w,
  height: VIEW.h,
  pixelArt: true,
  backgroundColor: '#05070c',
  scene: [RetroCyberpunkScene],
};

const game = new Phaser.Game(config);
window.game = game;

window.render_game_to_text = () => {
  const scene = game.scene.getScene('RetroCyberpunk');
  if (!scene || !scene.renderToText) return JSON.stringify({ scene: 'car04', booting: true });
  return JSON.stringify(scene.renderToText());
};
