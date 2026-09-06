import { EchoCity3DPreview } from './cars/presentCity3d/EchoCity3DPreview.js';
import { Chapter3OpeningRuntime } from './cars/presentCity3d/Chapter3OpeningRuntime.js';
import { createChapter3OpeningModel } from './cars/presentCity3d/chapter3OpeningModel.js';
import { installDevMenuReturnControl } from './devMenuReturn.js';
import { installPauseMenu } from './shell/pauseMenu.js';
import { CINEMATICS, navigateAfterCinematic } from './shell/gameFlow.js';
import { createSaveStore } from './shell/saveSystem.js';

installDevMenuReturnControl();
// Echo City is entered from the chapter list as a self-contained 3D page.
// Escape always returns there, so every city checkpoint has a reliable exit.
installPauseMenu({
  checkpointId: 'chapter-3-start',
  onEscape: () => {
    window.location.assign('/');
    return true;
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

const query = new URLSearchParams(window.location.search);
const playtest = query.get('playtest');
const openingStart = playtest === 'chapter3-time-transition'
  ? 'night-transition-qa'
  : ['chapter3-campfire', 'chapter3-alley', 'chapter3-magic-stone'].includes(playtest) ? 'dusk-campfire-qa'
  : playtest === 'chapter3-23'
  ? 'interaction-23'
  : playtest === 'chapter3-25' ? 'interaction-25'
  : playtest === 'chapter3-corridor' ? 'hotel-corridor-qa'
  : playtest === 'chapter3-26' ? 'interaction-26'
  : playtest === 'chapter3-27' ? 'interaction-27'
  : playtest === 'chapter3-lev-exit' ? 'lev-hotel-exit-qa'
  : playtest === 'chapter3-night-hotel' ? 'night-hotel-qa'
  : playtest === 'chapter3-night-lobby' ? 'night-lobby-qa'
  : playtest === 'chapter3-night-exterior' ? 'night-exterior-qa'
  : playtest === 'chapter3-npc-life' ? 'npc-life-qa'
  : playtest === 'chapter3-29' ? 'interaction-29'
  : playtest === 'chapter3-31' ? 'interaction-31'
  : playtest === 'chapter3-morning-exterior' ? 'morning-exterior-qa'
  : playtest === 'chapter3-sunrise' ? 'sunrise-overlook-qa'
  : playtest === 'chapter3-32' ? 'interaction-32'
  : playtest === 'chapter3-33' ? 'interaction-33'
  : playtest === 'chapter3-22'
  ? 'interaction-22'
  : playtest === 'chapter3-21'
    ? 'interaction-21'
    : playtest === 'chapter3-15'
      ? 'interaction-15'
  : playtest === 'chapter3-14'
      ? 'interaction-14'
      : playtest === 'chapter3-13'
    ? 'interaction-13'
  : playtest === 'chapter3-08'
      ? 'interaction-08'
      : playtest === 'chapter3-07'
        ? 'interaction-07'
        : null;
const gameplayRuntime = new Chapter3OpeningRuntime({
    preview,
    model: createChapter3OpeningModel({ startAt: openingStart }),
    elements: {
      statusElement: document.querySelector('#runtime-status'),
      flipClockElement: document.querySelector('#chapter-flip-clock'),
      objectiveTitle: document.querySelector('#objective-title'),
      objectiveDetail: document.querySelector('#objective-detail'),
      interactionLabel: document.querySelector('#interaction-label'),
      scannerReadout: document.querySelector('#scanner-readout'),
      walkBark: document.querySelector('#walk-bark'),
      blackout: document.querySelector('#chapter-blackout'),
      sunriseTableau: document.querySelector('#sunrise-tableau'),
      evidenceViewer: {
        root: document.querySelector('#evidence-viewer'),
        close: document.querySelector('#evidence-close'),
        kicker: document.querySelector('#evidence-kicker'),
        title: document.querySelector('#evidence-title'),
        body: document.querySelector('#evidence-body'),
        marks: document.querySelector('#evidence-marks'),
        slot: document.querySelector('#evidence-slot'),
      },
      dialogue: {
        panel: document.querySelector('#dialogue-panel'),
        speaker: document.querySelector('#dialogue-speaker'),
        text: document.querySelector('#dialogue-text'),
        choices: document.querySelector('#dialogue-choices'),
        hint: document.querySelector('#dialogue-hint'),
      },
    },
  });

preview.attachGameplayRuntime(gameplayRuntime);

window.render_game_to_text = () => {
  const city = JSON.parse(preview.textState());
  return JSON.stringify({
    ...city,
    chapterVersion: 'chapter3-temporary-final-v31-integrated-v35',
    gameplay: gameplayRuntime.initialized
      ? gameplayRuntime.textState()
      : { initialized: false, loading: true },
  });
};
window.advanceTime = (ms) => preview.advanceTime(ms);
window.echoCity3D = preview;
window.chapter3Runtime = gameplayRuntime;
window.chapter3Opening = gameplayRuntime;

preview.initialize()
  .then(() => {
    preview.start();
    if (playtest === 'chapter3-characters') {
      // The rig lab tests character loading/deformation, not the 22 landmark
      // GLBs. Skipping that unrelated stream keeps the bounded QA route fast
      // and prevents city-asset state from hiding a character failure.
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
    if (playtest !== 'chapter3-characters') return;
    preview.loadingPanel.classList.add('done');
  })
  .catch((error) => {
    console.error('Failed to initialize Echo City 3D preview', error);
    document.querySelector('#runtime-status').textContent = '3D INITIALIZATION FAILED';
  });
