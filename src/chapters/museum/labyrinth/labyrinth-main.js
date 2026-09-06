import Phaser from 'phaser';
import { LabyrinthScene } from './LabyrinthScene.js';
import { CELL, VIEW } from './labyrinthData.js';
import { LABYRINTH_CHAPTER05_CONTRACT } from './chapter05LabyrinthContract.js';
import { installDevMenuReturnControl } from '../../../devMenuReturn.js';
import { installPauseMenu } from '../../../shell/pauseMenu.js';
import { music } from '../../../shared/musicDirector.js';
import { CHAPTER5_SCORE } from '../../museum3d/chapter05Score.js';
import { devRoutesEnabled } from '../../../devMode.js';

installDevMenuReturnControl();
// The Labyrinth is commonly embedded inside the Museum. Opt in explicitly so
// its own ESC handler pauses the Phaser scene before the iframe's old exit
// listener can consume the key.
installPauseMenu({ checkpointId: 'chapter-5-start', allowEmbedded: true });

const labyrinthScore = CHAPTER5_SCORE.labyrinth;
music.play(labyrinthScore.id, {
  ...labyrinthScore,
  loop: true,
  outFade: 1.2,
  dialogueDuckDb: -7,
});

const config = {
  type: Phaser.AUTO,
  parent: 'game',
  width: VIEW.w,
  height: VIEW.h,
  backgroundColor: '#07070a',
  render: { preserveDrawingBuffer: true },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  scene: [LabyrinthScene],
};

const game = new Phaser.Game(config);
window.game = game;

const params = new URLSearchParams(window.location.search);
const embedded = params.get('embedded') === '1';
const qaArtifact = params.get('qa-artifact') === '1';
let completionSent = false;
if (embedded) {
  document.documentElement.classList.add('embedded');
  window.addEventListener('keydown', (event) => {
    if (event.code !== 'Escape') return;
    event.preventDefault();
    window.parent.postMessage({ type: LABYRINTH_CHAPTER05_CONTRACT.exitMessage }, window.location.origin);
  });
  window.setInterval(() => {
    const scene = game.scene.getScene('MuseumLabyrinth');
    // artifactTaken flips the instant the player takes the fragment; keying
    // the report on it (rather than the cosmetic state timer that follows)
    // keeps completion reliable even when the embedded tab is throttled.
    if (!completionSent && scene?.artifactTaken === true) {
      completionSent = true;
      window.parent.postMessage({ type: LABYRINTH_CHAPTER05_CONTRACT.completeMessage }, window.location.origin);
    }
  }, 200);
}

if (qaArtifact) {
  const probe = window.setInterval(() => {
    const scene = game.scene.getScene('MuseumLabyrinth');
    if (!scene?.playerSprite || scene.state !== 'playing') return;
    window.clearInterval(probe);
    scene.onWin();
    scene.revealArtifact();
  }, 50);
}

// Deterministic, query-only browser setup for encounter and Wing-transition
// proof. It never appears in normal or embedded play.
const qaEnabled = devRoutesEnabled();
// Number(null) is 0. Treat a missing QA parameter as absent, not as a hidden
// request for Wing 0 with one life.
const qaWing = qaEnabled && params.has('qa-wing') ? Number(params.get('qa-wing')) : Number.NaN;
const qaLives = qaEnabled && params.has('qa-lives') ? Number(params.get('qa-lives')) : Number.NaN;
const qaDoubleHunter = qaEnabled && params.get('qa-double-hunter') === '1';
if (Number.isInteger(qaWing) && qaWing >= 0 && qaWing <= 3) {
  const probe = window.setInterval(() => {
    const scene = game.scene.getScene('MuseumLabyrinth');
    if (!scene?.playerSprite || scene.state !== 'playing') return;
    window.clearInterval(probe);
    if (Number.isFinite(qaLives)) scene.player.lives = Math.max(1, Math.min(3, Math.round(qaLives)));
    const wing = scene.layout.wings.find(({ id }) => id === qaWing);
    const excluded = new Set([
      ...scene.layout.keys.filter(({ wing: id }) => id === qaWing).map(({ cell }) => `${cell.x},${cell.y}`),
      ...scene.layout.shields.filter(({ wing: id }) => id === qaWing).map(({ cell }) => `${cell.x},${cell.y}`),
      ...scene.layout.statues.filter(({ wing: id }) => id === qaWing).map(({ spawnCell }) => `${spawnCell.x},${spawnCell.y}`),
    ]);
    let target = null;
    for (let y = Math.floor(wing.bounds.y0 / CELL) + 1; y < Math.floor(wing.bounds.y1 / CELL); y += 2) {
      for (let x = Math.floor(wing.bounds.x0 / CELL) + 1; x < Math.floor(wing.bounds.x1 / CELL); x += 2) {
        if (scene.layout.walls[y]?.[x] === false && !excluded.has(`${x},${y}`)) {
          target = { x: x * CELL + CELL / 2, y: y * CELL + CELL / 2 };
          break;
        }
      }
      if (target) break;
    }
    if (target) scene.playerSprite.body.reset(target.x, target.y);
    if (qaDoubleHunter && target) {
      const pair = scene.statues.filter((statue) => statue.wing === qaWing && (qaWing !== 3 || statue.floor === scene.activeFloor)).slice(0, 2);
      pair.forEach((statue, index) => {
        statue.state = 'hunting';
        statue.path = null;
        statue.repathAt = 0;
        statue.sprite.body.reset(target.x + (index === 0 ? -CELL * 1.4 : CELL * 1.4), target.y);
      });
    }
    window.__labyrinthQaReady = true;
  }, 50);
}

window.render_game_to_text = () => {
  const scene = game.scene.getScene('MuseumLabyrinth');
  if (!scene || !scene.renderToText) {
    return JSON.stringify({ chapter: 'chapter05-museum-labyrinth', booting: true, music: music.qa() });
  }
  return JSON.stringify({ ...scene.renderToText(), music: music.qa() });
};

export default game;
