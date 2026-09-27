import Phaser from 'phaser';
import { W, H } from './constants.js';
import PreloadScene from './scenes/PreloadScene.js';
import BossScene from './scenes/BossScene.js';
import { magicStoneSnapshot } from '../../shell/magicStones.js';
import { installPauseMenu } from '../../shell/pauseMenu.js';
import { CHAPTER_CONTROLS } from '../../shell/chapterControls.js';
import { createSaveStore, requestReturnToTitle } from '../../shell/saveSystem.js';
import { installPhaserMotionGuard, reducedMotionActive } from '../../shell/motion.js';

installPhaserMotionGuard(Phaser);

const params = new URLSearchParams(window.location.search);
const qaMode = params.get('qa') === '1';
const easterEggMode = params.get('easter-egg') === '1';
const stones = magicStoneSnapshot();

const redirectToConductor = !stones.allCollected && !import.meta.env.DEV && !qaMode && !easterEggMode;
if (redirectToConductor) {
  window.location.replace('/final-boss.html?from=chapter5');
} else {
  // The Black Knife fight is Chapter 6 too: Continue from this slot resumes
  // here (see resolveCheckpointRoute in finalBossRoute.js).
  createSaveStore().markCheckpoint('chapter-6-start');
}

// Shared pause menu (ESC): resume, global settings, and a confirmed return to
// the title. P keeps the fight's own battle-pause card.
installPauseMenu({ checkpointId: 'chapter-6-start', controls: CHAPTER_CONTROLS.blackKnife });

// Fight-local shake / flash toggles start from the global settings, and
// REDUCE MOTION (in-game or OS) switches both off.
window.__conductorSettings = { shake: !reducedMotionActive(), flash: false, sound: true };

const game = new Phaser.Game({
  type: Phaser.AUTO,
  width: W,
  height: H,
  parent: 'game',
  backgroundColor: '#050008',
  scene: [PreloadScene, BossScene],
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  render: { antialias: true, pixelArt: false },
  audio: { disableWebAudio: false },
});
window.game = game;

// ---------- DOM shell wiring ----------
const syncToggles = () => {
  const s = window.__conductorSettings;
  const reduced = reducedMotionActive();
  if (reduced) { s.shake = false; s.flash = false; }
  [['shake', s.shake], ['flash', s.flash], ['pause-shake', s.shake], ['pause-flash', s.flash]].forEach(([id, on]) => {
    document.querySelectorAll(`#${id} button`).forEach(b => {
      b.classList.toggle('active', (b.dataset.value === 'on') === on);
      b.disabled = reduced;
      b.title = reduced ? 'Reduce Motion is on in Settings' : '';
    });
  });
};
window.addEventListener('nightfall:settings', () => {
  syncToggles();
  window.__battleScene?.syncAudioSettings?.();
});
// The shared menu pauses the Phaser scenes; hold the score with them unless
// the fight's own pause card is still up (it owns that music pause).
window.addEventListener('nightfall:pause', (event) => {
  if (event.detail?.paused) game.sound.pauseAll();
  else if (document.querySelector('#pause-overlay').classList.contains('hidden')) game.sound.resumeAll();
});
document.querySelectorAll('.segmented').forEach(group => group.addEventListener('click', event => {
  if (!event.target.matches('button')) return;
  const value = event.target.dataset.value === 'on';
  if (group.id.endsWith('shake')) window.__conductorSettings.shake = value;
  if (group.id.endsWith('flash')) window.__conductorSettings.flash = value;
  syncToggles();
}));
syncToggles();

// ---------- pause ----------
document.querySelector('#pause').addEventListener('click', () => window.__pauseBattle?.());
document.querySelector('#resume').addEventListener('click', () => window.__resumeBattle?.());
document.querySelector('#title-exit')?.addEventListener('click', () => requestReturnToTitle());
document.querySelector('#quit').addEventListener('click', () => {
  document.querySelector('#pause-overlay').classList.add('hidden');
  window.__battleScene?.fullReset();
  document.querySelector('#menu').classList.remove('hidden');
});
// Battle pause / resume toggle on P. Handled at the DOM level so a tap between
// Phaser frames is never missed. Escape belongs to the shared pause menu.
document.addEventListener('keydown', e => {
  if (e.key !== 'p' && e.key !== 'P') return;
  if (globalThis.NIGHTFALL_PAUSED) return;
  const overlay = document.querySelector('#pause-overlay');
  const menuOpen = !document.querySelector('#menu').classList.contains('hidden');
  const resultOpen = !document.querySelector('#result').classList.contains('hidden');
  if (menuOpen || resultOpen) return;
  e.preventDefault();
  if (overlay.classList.contains('hidden')) window.__pauseBattle?.();
  else window.__resumeBattle?.();
});

document.querySelector('#start').addEventListener('click', () => {
  document.querySelector('#menu').classList.add('hidden');
  game.sound.unlock();
  window.__startBattle?.();
});

document.querySelector('#again').addEventListener('click', () => {
  document.querySelector('#result').classList.add('hidden');
  window.__battleScene?.fullReset();
  document.querySelector('#menu').classList.remove('hidden');
});

document.querySelector('#ending').addEventListener('click', () => window.location.assign(`/true-ending.html${qaMode ? '?qa=1' : ''}`));

document.querySelector('#mute').addEventListener('click', event => {
  const s = window.__conductorSettings;
  s.sound = !s.sound;
  game.sound.mute = !s.sound;
  event.currentTarget.textContent = s.sound ? 'SOUND ON' : 'SOUND OFF';
});

window.render_game_to_text = () => JSON.stringify({
  scene: 'black-knife-final',
  entry: easterEggMode ? 'title-easter-egg' : 'five-stone-route',
  access: { collected: stones.collected, required: stones.total, unlocked: stones.allCollected || import.meta.env.DEV || qaMode || easterEggMode },
  state: window.__battleScene?.stateFlag ?? 'loading',
  player: window.__battleScene?.player ? { x: Math.round(window.__battleScene.player.x), y: Math.round(window.__battleScene.player.y), lives: window.__battleScene.player.lives, shields: window.__battleScene.player.shieldCharges } : null,
  boss: window.__battleScene?.boss ? { hp: window.__battleScene.boss.hp, phase: window.__battleScene.boss.phase } : null,
});

if (import.meta.env.DEV || qaMode) {
  window.forceBlackKnifeWin = () => {
    const scene = window.__battleScene;
    if (scene?.stateFlag === 'play') scene.knockout();
  };
}
