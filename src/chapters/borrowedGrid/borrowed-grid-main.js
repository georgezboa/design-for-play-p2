import Phaser from 'phaser';
import { BorrowedGridCurrentScene, BORROWED_GRID_CURRENT_VIEW } from './BorrowedGridCurrentScene.js';
import { BORROWED_GRID_CHAPTER05_CONTRACT } from './chapter05BorrowedGridContract.js';
import { installDevMenuReturnControl } from '../../devMenuReturn.js';

installDevMenuReturnControl();

const scene = new BorrowedGridCurrentScene();
const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: BORROWED_GRID_CURRENT_VIEW.w,
  height: BORROWED_GRID_CURRENT_VIEW.h,
  backgroundColor: '#05090d',
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
    window.parent.postMessage({ type: BORROWED_GRID_CHAPTER05_CONTRACT.exitMessage }, window.location.origin);
  });
}

scene.onArchiveComplete = () => {
  if (!embedded || completionSent) return;
  completionSent = true;
  window.parent.postMessage({ type: BORROWED_GRID_CHAPTER05_CONTRACT.completeMessage }, window.location.origin);
};

window.render_game_to_text = () => JSON.stringify(scene.state ? scene.renderToText() : { scene: 'borrowed-grid-current', booting: true });
window.advanceTime = (ms) => scene.state && scene.advanceTime(ms);

const params = new URLSearchParams(window.location.search);
const qaRound = Number(params.get('qa-round'));
const qaNode = params.has('qa-node') ? Number(params.get('qa-node')) : Number.NaN;
const qaCarry = params.has('qa-carry') ? Number(params.get('qa-carry')) : Number.NaN;
const qaFail = params.get('qa-fail') === '1';
const qaClear = params.get('qa-clear') === '1';
const qaSummary = params.get('qa-summary') === '1';
const qaTerminalState = params.get('qa-terminal-state');
const qaDistrict = params.get('qa-district');
const qaDemand = params.get('qa-demand');
const qaDemandUnits = Number(params.get('qa-demand-units'));
if ([2, 3].includes(qaRound) || Number.isInteger(qaNode) || Number.isInteger(qaCarry) || qaFail || qaClear || qaSummary || qaTerminalState || qaDemand) {
  const probe = window.setInterval(() => {
    if (!scene.state) return;
    window.clearInterval(probe);
    if ([2, 3].includes(qaRound)) scene.jumpToRoundForQa(qaRound);
    if (Number.isInteger(qaNode)) scene.focusNodeForQa(qaNode);
    if (Number.isInteger(qaCarry)) {
      scene.state.carriedUnits = Math.max(0, Math.min(3, qaCarry));
      scene.syncArtState();
    }
    if (qaDemand && Number.isInteger(qaDemandUnits)) {
      scene.state.active = [{ district: qaDemand, units: Math.max(1, Math.min(3, qaDemandUnits)), remainingMs: 24000 }];
      scene.syncArtState();
    }
    if (qaFail) scene.forceLossForQa();
    if (qaClear) scene.completeCurrentRoundForQa();
    if (qaSummary) scene.showRoundSummary();
    if (qaTerminalState && qaDistrict) scene.previewTerminalStateForQa(qaDistrict, qaTerminalState);
  }, 50);
}

if (params.get('qa-artifact') === '1') {
  const probe = window.setInterval(() => {
    if (!scene.state) return;
    window.clearInterval(probe);
    scene.finish();
    scene.revealArtifact();
    scene.focusArtifactForQa();
  }, 50);
}

export default game;
