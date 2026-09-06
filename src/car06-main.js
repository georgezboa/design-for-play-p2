import Phaser from 'phaser';
import { AllWorldsScene } from './chapters/allWorlds/AllWorldsScene.js';
import { installDevMenuReturnControl } from './devMenuReturn.js';

installDevMenuReturnControl();

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: 960,
  height: 600,
  backgroundColor: '#0d1727',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [AllWorldsScene],
});

window.game = game;

// Diagnostics exist from boot onward, rather than appearing only after the
// Scene create callback. This lets an isolated browser check distinguish
// "still booting" from a missing Chapter 6 route.
window.render_game_to_text = () => {
  const scene = game.scene.getScene('AllWorlds');
  return JSON.stringify(scene?.model ? scene.getDiagnosticSnapshot() : { chapter: 'ALL WORLDS AT ONCE', booting: true });
};

window.advanceTime = (ms) => {
  const scene = game.scene.getScene('AllWorlds');
  if (!scene?.model) return;
  scene.model.update(ms, {});
  scene.render(scene.model.snapshot());
};
