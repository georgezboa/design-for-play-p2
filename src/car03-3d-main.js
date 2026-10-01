import './fonts/fonts.css';
import './shell/uiKit.css';
import './cars/presentCity3d/chapter3Release.css';
import { EchoCity3DPreview } from './cars/presentCity3d/EchoCity3DPreview.js';
import { Chapter3OpeningRuntime } from './cars/presentCity3d/Chapter3OpeningRuntime.js';
import { createChapter3OpeningModel } from './cars/presentCity3d/chapter3OpeningModel.js';
import { installDevMenuReturnControl } from './devMenuReturn.js';
import { installPauseMenu } from './shell/pauseMenu.js';
import { CINEMATICS, navigateAfterCinematic } from './shell/gameFlow.js';
import { createSaveStore } from './shell/saveSystem.js';
import { DEV_MODE, devParams } from './devMode.js';
import { CHAPTER_CONTROLS } from './shell/chapterControls.js';
import { reducedMotionActive } from './shell/motion.js';

installDevMenuReturnControl();
// Escape opens the shared pause menu like every other chapter; leaving for
// the title goes through its confirmation. An open evidence card or the
// ticket board closes first.
installPauseMenu({
  checkpointId: 'chapter-3-start',
  controls: CHAPTER_CONTROLS.echoCity,
  onEscape: () => {
    const runtime = gameplayRuntime;
    const board = runtime?.ticketBoard;
    if (board?.active) {
      board.close();
      return true;
    }
    const viewer = runtime?.evidenceViewer;
    if (viewer?.active) {
      viewer.close();
      return true;
    }
    return false;
  },
});

window.addEventListener('nightfall:chapter3-complete', () => {
  createSaveStore().markCheckpoint('chapter-4-start');
  window.setTimeout(() => {
    navigateAfterCinematic('chapter-3-to-4', CINEMATICS.chapter3To4, '/painted-country.html', {
      preloadChapterId: 'chapter4',
      label: 'ECHO CITY TO THE PAINTED COUNTRY',
    });
  }, 2400);
}, { once: true });

const preview = new EchoCity3DPreview({
  container: document.querySelector('#city-3d'),
  statusElement: document.querySelector('#runtime-status'),
  loadingPanel: document.querySelector('#loading-panel'),
  loadingLabel: document.querySelector('#loading-label'),
  loadingCount: document.querySelector('#loading-count'),
  loadingFill: document.querySelector('#loading-fill'),
});

// ?playtest= jumps to one Chapter 3 beat; dev builds only (devParams() is
// empty in production, so a shipped city always opens on the platform).
const query = devParams();
const playtest = query.get('playtest');
const PLAYTEST_STARTS = Object.freeze({
  'chapter3-oil': 'oil-seam',
  'chapter3-ministry': 'ministry-walk',
  'chapter3-board': 'ticket-board',
  'chapter3-market': 'market-scanner',
  'chapter3-dusk': 'cut-interface',
  'chapter3-magic-stone': 'cut-interface',
  'chapter3-hotel': 'hotel',
  'chapter3-night': 'night-fire',
  'chapter3-wire': 'wire',
  'chapter3-morning': 'morning',
  'chapter3-station': 'station',
});
// Continue / Load at the mid-chapter save opens `?stage=dusk`. Production
// honours it only when the active save unlocked that checkpoint, so a
// hand-edited URL cannot skip ahead.
const store = createSaveStore();
const activeSave = store.readAll()[store.getActiveSlot()];
const unlocked = [...(activeSave?.unlocked ?? []), activeSave?.checkpointId].filter(Boolean);
const requestedStage = new URLSearchParams(window.location.search).get('stage');
const resumeAtDusk = requestedStage === 'dusk' && (DEV_MODE || unlocked.includes('chapter-3-dusk'));
window.addEventListener('nightfall:chapter3-checkpoint', (event) => {
  if (event.detail?.id) store.markCheckpoint(event.detail.id);
});
const gameplayRuntime = new Chapter3OpeningRuntime({
  preview,
  model: createChapter3OpeningModel({ startAt: PLAYTEST_STARTS[playtest] ?? (resumeAtDusk ? 'cut-interface' : null) }),
  elements: {
    statusElement: document.querySelector('#runtime-status'),
    objectiveCard: document.querySelector('#objective-card'),
    objectiveTitle: document.querySelector('#objective-title'),
    blackout: document.querySelector('#chapter-blackout'),
    sunriseTableau: document.querySelector('#sunrise-tableau'),
    evidenceViewer: { root: document.querySelector('#evidence-viewer') },
    caption: document.querySelector('#dialogue-caption'),
  },
});

preview.attachGameplayRuntime(gameplayRuntime);

// While the pause menu is open the city holds still and ignores keys; camera
// shake respects REDUCE MOTION (in-game setting or OS preference).
const runCityFrame = preview.update.bind(preview);
preview.update = (dt) => {
  if (!globalThis.NIGHTFALL_PAUSED) runCityFrame(dt);
};
const handleCityKey = gameplayRuntime.handleKeyDown.bind(gameplayRuntime);
gameplayRuntime.handleKeyDown = (event) => (globalThis.NIGHTFALL_PAUSED ? true : handleCityKey(event));
const triggerCityShake = preview.triggerCameraShake.bind(preview);
preview.triggerCameraShake = (...args) => {
  if (!reducedMotionActive()) triggerCityShake(...args);
};

if (DEV_MODE) window.render_game_to_text = () => {
  const city = JSON.parse(preview.textState());
  return JSON.stringify({
    ...city,
    chapterVersion: 'chapter3-release-1.0-echo-city',
    gameplay: gameplayRuntime.initialized
      ? gameplayRuntime.textState()
      : { initialized: false, loading: true },
  });
};
if (DEV_MODE) {
  window.advanceTime = (ms) => preview.advanceTime(ms);
  window.echoCity3D = preview;
  window.chapter3Runtime = gameplayRuntime;
}

preview.initialize()
  .then(() => {
    preview.start();
    if (playtest === 'chapter3-characters') {
      // The rig lab tests character loading/deformation, not the landmark
      // GLBs, so it skips that unrelated stream.
      preview.modelsReady = true;
      preview.loadingFill.style.width = '100%';
      preview.loadingLabel.textContent = 'LOADING SHARED-RIG CAST';
      preview.loadingPanel.classList.remove('done');
      return null;
    }
    return preview.loadModels();
  })
  .then(() => gameplayRuntime.initialize())
  .then(() => {
    preview.loadingPanel.classList.add('done');
  })
  .catch((error) => {
    console.error('Failed to initialize Echo City', error);
    document.querySelector('#runtime-status').textContent = 'ECHO CITY FAILED TO START';
  });
