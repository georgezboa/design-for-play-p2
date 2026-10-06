import Phaser from 'phaser';
import { W, H, BOSS, phaseStartHp } from './constants.js';
import PreloadScene from './scenes/PreloadScene.js';
import BossScene from './scenes/BossScene.js';
import { magicStoneSnapshot } from '../../shell/magicStones.js';
import { DEV_MODE, devParams, devRoutesEnabled } from '../../devMode.js';
import { battle } from './battleBridge.js';
import { btDifficulty } from './constants.js';
import { completedEnding, showJourneyComplete } from '../finalBoss/journeyComplete.js';
import { lowGraphicsRequested } from '../finalBoss/finaleQuality.js';
import { installPauseMenu } from '../../shell/pauseMenu.js';
import { CHAPTER_CONTROLS } from '../../shell/chapterControls.js';
import { createSaveStore, readSettings } from '../../shell/saveSystem.js';
import { installPhaserMotionGuard, reducedMotionActive } from '../../shell/motion.js';

installPhaserMotionGuard(Phaser);

// ?qa=1 / ?easter-egg=1 are dev-only unlocks (devParams() is empty in a
// production build); players reach this page by holding all five stones.
const params = devParams();
const qaMode = params.get('qa') === '1';
const easterEggMode = params.get('easter-egg') === '1';
const stones = magicStoneSnapshot();

const redirectToConductor = !stones.allCollected && !DEV_MODE && !qaMode && !easterEggMode;
if (redirectToConductor) {
  window.location.replace('/final-boss.html?from=chapter5');
} else {
  // The Black Ticket fight is Chapter 6 too: Continue from this slot resumes
  // here (see resolveCheckpointRoute in finalBossRoute.js).
  createSaveStore().markCheckpoint('chapter-6-start');
}

// The shared pause menu (ESC or P), as on every other page (alpha round 4:
// the fight had its own P card and SOUND chip): resume, the global settings
// (volume included), RESTART THE FIGHT, and a confirmed return to the title.
const restartFight = () => {
  document.querySelector('#result').classList.add('hidden');
  battle.scene?.fullReset();
  document.querySelector('#menu').classList.remove('hidden');
  document.querySelector('#start')?.focus({ preventScroll: true });
};
const pauseMenu = installPauseMenu({
  checkpointId: 'chapter-6-start',
  controls: CHAPTER_CONTROLS.blackKnife,
  extraActions: [{ label: 'RESTART THE FIGHT', onSelect: restartFight }],
});

// Fight-local shake / flash toggles start from the global settings, and
// REDUCE MOTION (in-game or OS) switches both off. The difficulty is chosen
// on the start board (or taken when the result card offers STORY).
battle.settings = { shake: !reducedMotionActive(), flash: false, sound: true, difficulty: 'normal' };
const fightSettings = battle.settings;

const game = new Phaser.Game({
  type: Phaser.AUTO,
  width: W,
  height: H,
  parent: 'game',
  backgroundColor: '#0b0806',
  scene: [PreloadScene, BossScene],
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  // No 'panic' start: Phaser otherwise clamps the first 120 frames to
  // 1/60 s each, which on a 15 fps laptop played the opening at a quarter
  // speed. The scene caps and substeps its own frames (frameSteps).
  fps: { panicMax: 0 },
  // LOW GRAPHICS (alpha R4-1): no antialias; the scene also halves its
  // particles, and drops to that budget by itself on slow frames.
  render: { antialias: !lowGraphicsRequested(globalThis.NIGHTFALL_SETTINGS ?? readSettings()), pixelArt: false },
  audio: { disableWebAudio: false },
});
// QA / automation aliases only where dev routes are enabled: a production
// page exposes no game or scene object (alpha round 2).
if (devRoutesEnabled()) {
  window.game = game;
  Object.defineProperty(window, '__battleScene', { configurable: true, get: () => battle.scene });
}

// ---------- DOM shell wiring ----------
const syncToggles = () => {
  const s = fightSettings;
  const reduced = reducedMotionActive();
  if (reduced) { s.shake = false; s.flash = false; }
  [['shake', s.shake], ['flash', s.flash]].forEach(([id, on]) => {
    document.querySelectorAll(`#${id} button`).forEach(b => {
      b.classList.toggle('active', (b.dataset.value === 'on') === on);
      b.disabled = reduced;
      b.title = reduced ? 'Reduce Motion is on in Settings' : '';
    });
  });
};
window.addEventListener('nightfall:settings', () => {
  syncToggles();
  battle.scene?.syncAudioSettings?.();
});
// The shared menu pauses the fight and its score. (It pauses Phaser scenes
// itself only where a dev `window.game` exists, so the page does it here.)
window.addEventListener('nightfall:pause', (event) => {
  const scene = battle.scene;
  if (event.detail?.paused) {
    game.sound.pauseAll();
    if (scene?.sys?.isActive?.()) scene.scene.pause();
  } else {
    if (scene?.sys?.isPaused?.()) scene.scene.resume();
    game.sound.resumeAll();
  }
});
document.querySelectorAll('.nf-segmented[id]').forEach(group => group.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button) return;
  if (group.id === 'difficulty') {
    fightSettings.difficulty = btDifficulty(button.dataset.value).id;
    battle.scene?.setDifficulty(fightSettings.difficulty);
    group.querySelectorAll('button').forEach((entry) => entry.classList.toggle('active', entry === button));
    return;
  }
  const value = button.dataset.value === 'on';
  if (group.id.endsWith('shake')) fightSettings.shake = value;
  if (group.id.endsWith('flash')) fightSettings.flash = value;
  syncToggles();
}));
syncToggles();

// ---------- pause ----------
// P opens the same shared menu as ESC (handled at the DOM level so a tap
// between Phaser frames is never missed).
document.addEventListener('keydown', e => {
  if (e.code !== 'KeyP' || e.repeat || globalThis.NIGHTFALL_PAUSED) return;
  e.preventDefault();
  pauseMenu?.open?.();
});

document.querySelector('#start').addEventListener('click', () => {
  document.querySelector('#menu').classList.add('hidden');
  game.sound.unlock();
  battle.start?.();
});

document.querySelector('#again').addEventListener('click', restartFight);

// Phase checkpoint: retry from the phase the passenger reached.
document.querySelector('#retry-phase').addEventListener('click', () => {
  document.querySelector('#result').classList.add('hidden');
  game.sound.unlock();
  battle.scene?.retryFromPhase();
});

// STORY (six lives, slower tickets) is offered after the first failure.
document.querySelector('#story-offer [data-story]').addEventListener('click', () => {
  const scene = battle.scene;
  const next = scene?.difficulty === 'story' ? 'normal' : 'story';
  fightSettings.difficulty = next;
  scene?.setDifficulty(next);
});

document.querySelector('#ending').addEventListener('click', () => window.location.assign(`/true-ending.html${qaMode ? '?qa=1' : ''}`));

// After the Unfiled Ending, Continue lands here on THE JOURNEY IS COMPLETE
// (alpha round 4) instead of the fight's board.
const journeyEnding = !redirectToConductor && new URLSearchParams(window.location.search).get('from') !== 'chapter5' ? completedEnding() : null;
if (journeyEnding) {
  showJourneyComplete({
    menu: document.querySelector('#menu'),
    ending: journeyEnding,
    actions: [
      { label: 'THE UNFILED ENDING AGAIN', onSelect: () => window.location.assign('/true-ending.html') },
      { label: 'FIGHT THE BLACK TICKET AGAIN', onSelect: ({ restore }) => { restore(); document.querySelector('#start')?.focus({ preventScroll: true }); }, quiet: true },
    ],
  });
}

if (DEV_MODE) window.render_game_to_text = () => JSON.stringify({
  scene: 'black-ticket-final',
  quality: { ...(battle.quality?.snapshot() ?? {}), antialias: game.config.antialias },
  entry: easterEggMode ? 'title-easter-egg' : 'five-stone-route',
  access: { collected: stones.collected, required: stones.total, unlocked: stones.allCollected || DEV_MODE || qaMode || easterEggMode },
  state: battle.scene?.stateFlag ?? 'loading',
  player: battle.scene?.player ? { x: Math.round(battle.scene.player.x), y: Math.round(battle.scene.player.y), lives: battle.scene.player.lives, shields: battle.scene.player.shieldCharges } : null,
  boss: battle.scene?.boss ? { hp: battle.scene.boss.hp, maxHp: BOSS.maxHp, phase: battle.scene.boss.phase, enraged: battle.scene.boss.enraged } : null,
  failures: battle.scene?.failures ?? 0,
  assist: Boolean(battle.scene?.assist),
  difficulty: battle.scene?.difficulty ?? fightSettings.difficulty,
  journeyComplete: Boolean(document.querySelector('.nf-journey')),
  maxLives: battle.scene?.maxLives ?? null,
  checkpointPhase: battle.scene?.checkpointPhase ?? null,
  parries: battle.scene?.parries ?? 0,
  bellClock: battle.scene ? +battle.scene.bellClock.toFixed(2) : 0,
  announce: battle.scene?.lastAnnounce ?? null,
  hint: battle.scene?.lastHint ?? null,
  result: document.querySelector('#result').classList.contains('hidden') ? null : {
    kicker: document.querySelector('#result-kicker').textContent,
    title: document.querySelector('#result-title').textContent,
    copy: document.querySelector('#result-copy').textContent,
    retry: !document.querySelector('#retry-phase').classList.contains('hidden'),
    storyOffered: !document.querySelector('#story-offer').classList.contains('hidden'),
    ending: !document.querySelector('#ending').classList.contains('hidden'),
  },
});

if (DEV_MODE) {
  window.forceBlackKnifeWin = () => {
    const scene = battle.scene;
    if (scene?.stateFlag === 'play') scene.knockout();
  };
  // Drop the Black Ticket to just above a phase break, then cross it.
  window.forceBlackTicketPhase = (phase) => {
    const scene = battle.scene;
    if (scene?.stateFlag !== 'play' || phase < 1 || phase > 4) return;
    scene.boss.hp = phaseStartHp(phase) + 1;
    scene.onBossDamaged(scene.boss.damage(2));
  };
  window.damageBlackTicket = (amount = 100) => {
    const scene = battle.scene;
    if (scene?.stateFlag === 'play') scene.onBossDamaged(scene.boss.damage(amount));
  };
  window.failBlackTicket = () => {
    const scene = battle.scene;
    if (scene?.stateFlag !== 'play') return;
    scene.player.lives = 1; scene.player.invuln = 0; scene.player.shieldTime = 0;
    if (scene.player.hit()) scene.onPlayerHit();
  };
  window.setBlackTicketBell = (seconds) => { if (battle.scene) battle.scene.bellClock = Number(seconds); };
  window.raiseBlackTicketShield = () => { const scene = battle.scene; if (scene?.stateFlag === 'play' && scene.player.tryShield()) return scene.onShieldRaised(); return null; };
}
