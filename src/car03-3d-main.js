import './fonts/fonts.css';
import './shell/uiKit.css';
import './cars/presentCity3d/chapter3Release.css';
import { EchoCity3DPreview } from './cars/presentCity3d/EchoCity3DPreview.js';
import { CHAPTER3_ARRIVAL_MUSIC, Chapter3OpeningRuntime } from './cars/presentCity3d/Chapter3OpeningRuntime.js';
import { chapter3ResumeStart, createChapter3OpeningModel } from './cars/presentCity3d/chapter3OpeningModel.js';
import { installDevMenuReturnControl } from './devMenuReturn.js';
import { installPauseMenu } from './shell/pauseMenu.js';
import { scheduleChapterControlsCard } from './shell/controlsCard.js';
import { CINEMATICS, navigateAfterCinematic, playCinematic } from './shell/gameFlow.js';
import { arrivalFrom, createArrivalGate, withoutArrival } from './shell/arrivalGate.js';
import { createSaveStore } from './shell/saveSystem.js';
import { DEV_MODE, devParams } from './devMode.js';
import { CHAPTER_CONTROLS } from './shell/chapterControls.js';
import { reducedMotionActive } from './shell/motion.js';
import { waitForFonts } from './shared/fonts.js';
// Round 6 type: start fetching the house faces now, so text painted into
// canvases and 3D labels a moment later is set in them, not the fallback.
waitForFonts();

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
      // Esc puts the board's filing off first (NOT YET · ESC), then steps away.
      board.escape();
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
// ?playtest= jumps to one Chapter 3 beat; dev builds only (devParams() is
// empty in production, so a shipped city always opens on the platform).
const query = devParams();
const playtest = query.get('playtest');
// Alpha round 4 (P1): a dev / router route (?playtest=, ?focus=) always
// wins over a resume point and never records one.
const qaOverride = Boolean(playtest || query.get('focus'));

// Round 11 (George: "第三章一开始要在动画的时候加载" — Chapter 3 should load
// during the cutscene; and the game stuck where he skipped after Chapter 2):
// Chapter 2 now comes straight here with ?from=chapter2, and the 2→3
// cutscene plays on this page while the city loads, warms its shaders and
// stages the arrival underneath. The overlay leaves when both the cutscene
// has ended (or been skipped) and the city is ready; if the city is still
// loading, the cutscene's last frame stays with the city's live progress;
// if the city stops making progress, the overlay hands over to the city's
// own loading card. The flag is taken off the address at once, so a reload
// or Continue opens the platform without the cutscene. A dev route wins.
const arrival = arrivalFrom(window.location.search, { expected: 'chapter2', override: qaOverride });
if (new URLSearchParams(window.location.search).has('from')) {
  try { window.history.replaceState(window.history.state, '', withoutArrival(window.location.href)); } catch { /* keep the address */ }
}
if (!arrival) document.documentElement.classList.remove('nf-arriving');
const arrivalGate = arrival ? createArrivalGate([
  { id: 'page', weight: 0.05 },
  { id: 'materials', weight: 0.1 },
  { id: 'models', weight: 0.55 },
  { id: 'cast', weight: 0.2 },
  { id: 'warm', weight: 0.1 },
], { now: () => performance.now() }) : null;
arrivalGate?.report('page');
let arrivalHandedOver = false;
let platformStarted = false;
// Round 6 (item 18): name this chapter's keys once, as play begins (round
// 11: as control comes to the player at the end of the step down, or 7 s in
// on any other start; round 12: at the end of the arrival's conversation
// with Lev, the first moment Butch can walk, so the card is not dismissed by
// the clicks that read the conversation).
const startPlatform = () => {
  if (platformStarted) return;
  platformStarted = true;
  // the city's clock starts from this frame, not from when it was covered
  preview.lastFrame = performance.now();
  if (gameplayRuntime.beginArrival()) gameplayRuntime.onArrivalControl = () => scheduleChapterControlsCard('chapter3', 900);
  else scheduleChapterControlsCard('chapter3', 7000);
};
if (arrival) {
  playCinematic({
    id: 'chapter-2-to-3',
    src: CINEMATICS.chapter2To3,
    label: 'Chapter 2 to Chapter 3 transition',
    arrival: {
      gate: arrivalGate,
      onReveal: () => {
        arrivalHandedOver = true;
        document.documentElement.classList.remove('nf-arriving');
        // Stalled (or failed) before the city was in: its own loading card
        // takes over, and the platform starts when it lifts (boot chain).
        if (arrivalGate.status !== 'ready') return;
        startPlatform();
      },
    },
    // The cutscene's Satie is the platform's arrival cue: it plays under that
    // cue's id and mix and carries on into the arrival.
    music: {
      id: CHAPTER3_ARRIVAL_MUSIC.id,
      volume: CHAPTER3_ARRIVAL_MUSIC.volume,
      dialogueDuckDb: CHAPTER3_ARRIVAL_MUSIC.dialogueDuckDb,
      outFade: CHAPTER3_ARRIVAL_MUSIC.outFade,
    },
    keepMusic: true,
  });
}

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

const PLAYTEST_STARTS = Object.freeze({
  'chapter3-oil': 'oil-seam',
  'chapter3-ministry': 'ministry-walk',
  'chapter3-ministry-hall': 'ministry-hall',
  'chapter3-board': 'ticket-board',
  'chapter3-eda': 'market',
  'chapter3-market': 'market-scanner',
  'chapter3-dusk': 'cut-interface',
  // 3.4a: the optional laundry fire is pointed at by Petar once the cut feed
  // is read, so the route starts there (task: the Copper Heron), not before
  // the service joint (alpha round 4).
  'chapter3-magic-stone': 'hotel',
  'chapter3-hotel': 'hotel',
  'chapter3-hotel-lobby': 'hotel-lobby',
  'chapter3-hotel-room': 'hotel-room',
  'chapter3-night': 'night-fire',
  'chapter3-wire': 'wire',
  'chapter3-morning': 'morning',
  'chapter3-platform': 'platform-walk',
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
// Alpha round 4 (P1): mid-chapter resume points. The page's checkpoint is
// the dusk one when it was opened at `?stage=dusk`, otherwise the chapter
// start; when the active save stands on that checkpoint and holds a resume
// point for it, the chapter opens at the start of that beat. A dev / router
// route (?playtest=, ?focus=) always wins and never records one (qaOverride).
const pageCheckpoint = resumeAtDusk ? 'chapter-3-dusk' : 'chapter-3-start';
const resumeStage = !qaOverride && activeSave?.checkpointId === pageCheckpoint
  ? chapter3ResumeStart(pageCheckpoint, store.readResume(pageCheckpoint))
  : null;
window.addEventListener('nightfall:chapter3-checkpoint', (event) => {
  if (event.detail?.id) store.markCheckpoint(event.detail.id);
});
window.addEventListener('nightfall:chapter3-resume', (event) => {
  const { checkpointId, stage } = event.detail ?? {};
  if (!qaOverride && checkpointId && stage) store.markResume(checkpointId, { stage });
});
const startAt = PLAYTEST_STARTS[playtest] ?? resumeStage ?? (resumeAtDusk ? 'cut-interface' : null);
const gameplayRuntime = new Chapter3OpeningRuntime({
  preview,
  model: createChapter3OpeningModel({ startAt, resumed: Boolean(resumeStage) }),
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
preview.update = (dt, options) => {
  if (!globalThis.NIGHTFALL_PAUSED) runCityFrame(dt, options);
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
  window.chapter3Arrival = arrivalGate;
}

preview.onModelProgress = (completed, total) => arrivalGate?.report('models', total ? completed / total : 1);
// Alpha round 4: lift the loading card only once the city has drawn the
// chapter's first real frames (a slow GPU otherwise showed the stale
// platform frame, then the cut, for seconds after "loaded").
const firstDrawnFrames = () => new Promise((resolve) => {
  let frames = 0;
  const tick = () => (++frames >= 3 ? resolve() : requestAnimationFrame(tick));
  requestAnimationFrame(tick);
  window.setTimeout(resolve, 8000);
});

preview.initialize()
  .then(() => {
    arrivalGate?.report('materials');
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
  // The arrival is staged (Butch in the carriage door) but held until the
  // player can see it: the cutscene or the loading card lifting starts it.
  .then(() => gameplayRuntime.initialize({ holdArrival: true }))
  .then(async () => {
    if (arrival && !arrivalHandedOver) {
      // Under the cutscene: compile and draw the staged first frame now, so
      // the reveal is a drawn frame and not a shader compile.
      arrivalGate.report('cast');
      const warmMs = await preview.warmUp({ onProgress: (fraction) => arrivalGate.report('warm', fraction) });
      if (DEV_MODE) console.info(`[echo city] warmed under the cutscene in ${warmMs} ms`, JSON.stringify(preview.warmStats));
      // (the card never shows on an arrival: lift it while it is hidden)
      preview.loadingPanel.classList.add('done');
      // Settling the gate reveals the platform now if the cutscene is over
      // (gameFlow.js), or when it ends.
      arrivalGate.ready();
      // Handed over early (the city had stalled): its card was up; go now.
      if (arrivalHandedOver) startPlatform();
      return;
    }
    await firstDrawnFrames();
    preview.loadingPanel.classList.add('done');
    startPlatform();
  })
  .catch((error) => {
    console.error('Failed to initialize Echo City', error);
    document.querySelector('#runtime-status').textContent = 'ECHO CITY FAILED TO START';
    if (preview.loadingLabel) preview.loadingLabel.textContent = 'ECHO CITY FAILED TO START';
    arrivalGate?.fail(error);
  });
