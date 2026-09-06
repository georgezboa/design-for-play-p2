import Phaser from 'phaser';
import { PaintedCountryInhabitantScene, PAINTED_COUNTRY_INHABITANT_VIEW } from './PaintedCountryInhabitantScene.js';
import { installDevMenuReturnControl } from '../../devMenuReturn.js';

installDevMenuReturnControl();

const scene = new PaintedCountryInhabitantScene();
const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: PAINTED_COUNTRY_INHABITANT_VIEW.w,
  height: PAINTED_COUNTRY_INHABITANT_VIEW.h,
  backgroundColor: '#f7f4ec',
  render: { antialias: true, preserveDrawingBuffer: true },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [scene],
});

game.canvas.setAttribute('tabindex', '0');
game.canvas.addEventListener('pointerdown', () => game.canvas.focus());
window.game = game;

const embedded = new URLSearchParams(window.location.search).get('embedded') === '1';
let completionSent = false;
if (embedded) {
  document.documentElement.classList.add('embedded');
  window.addEventListener('keydown', (event) => {
    if (event.code !== 'Escape') return;
    event.preventDefault();
    window.parent.postMessage({ type: 'chapter05-direction:painted-country:exit' }, window.location.origin);
  });
}

scene.onArchiveComplete = () => {
  if (!embedded || completionSent) return;
  completionSent = true;
  window.parent.postMessage({ type: 'chapter05-direction:painted-country:complete' }, window.location.origin);
};

window.render_game_to_text = () => JSON.stringify(scene.state ? scene.renderToText() : { scene: 'painted-country-inhabitant', booting: true });
window.advanceTime = (ms) => scene.state && scene.advanceTime(ms);

if (new URLSearchParams(window.location.search).get('qa-artifact') === '1') {
  const probe = window.setInterval(() => {
    if (!scene.state) return;
    window.clearInterval(probe);
    scene.finish();
    scene.revealArtifact();
    scene.focusArtifactForQa();
  }, 50);
}

export default game;
