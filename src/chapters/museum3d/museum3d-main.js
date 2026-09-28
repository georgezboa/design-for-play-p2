// Chapter 5 · THE MUSEUM OF ONE ANSWER — the first-person museum entry
// (museum-3d.html). The lobby exhibit and the Labyrinth are framed pages
// (one-answer.html, labyrinth.html) opened from inside it.

import '../../fonts/fonts.css';
import '../../shell/uiKit.css';
import { Museum3DApp } from './Museum3DApp.js';
import { createMuseumEntryState } from './state/chapter05Model.js';
import { installQaHooks } from './qa/museum3dQaState.js';
import { DEBUG_BEATS } from './config.js';
import { installDevMenuReturnControl } from '../../devMenuReturn.js';
import { installPauseMenu } from '../../shell/pauseMenu.js';
import { CHAPTER_CONTROLS } from '../../shell/chapterControls.js';
import { createCollapseState } from './state/collapseGauntlet.js';
import { COLLAPSE_SCRIPT, COLLAPSE_WARNING_SECONDS } from './systems/CollapseGauntletDirector.js';
import { preloadChapter } from '../../shell/chapterPreloader.js';
import { resolveFinalBossDestination } from '../../shell/finalBossRoute.js';
import { DEV_MODE, devParams } from '../../devMode.js';

let app = null;
installDevMenuReturnControl();
installPauseMenu({
  checkpointId: 'chapter-5-start',
  controls: CHAPTER_CONTROLS.museum,
  // Escape first closes an open archive card.
  onEscape: () => (app?.cards?.isOpen ? app.cards.close() : false),
});

// Dev routes (museum-3d.html?beat=…): start at a beat with the minimum legal
// preceding state already applied. devParams() is empty in production, so a
// shipped museum always opens in the lobby.
function stateForBeat(beat) {
  const s = createMuseumEntryState();
  if (beat === 'corridor') {
    s.phase = 'corridor';
  } else if (beat === 'reveal') {
    // the exhibit is solved: the lost desk stands in the case
    s.exhibit.solved = true;
    s.lobby.deskReclassified = true;
  } else if (beat === 'labyrinth-done') {
    s.phase = 'corridor';
    s.labyrinth.complete = true;
  } else if (beat === 'echo') {
    s.phase = 'echo-city';
  } else if (beat === 'collapse') {
    s.phase = 'collapse';
    s.exhibit.solved = true;
    s.labyrinth.complete = true;
    s.lobby.deskReclassified = true;
    s.collapse = createCollapseState({ started: true });
  }
  return s;
}

const params = devParams();
const beat = params.get('beat');
if (DEV_MODE) {
  for (const id of ['version-label', 'runtime-coordinates']) document.getElementById(id).hidden = false;
}
const initialState = beat && DEBUG_BEATS.includes(beat) ? stateForBeat(beat) : createMuseumEntryState();
const captureMode = params.get('capture') === '1' || params.get('simlock') === '1';
const standaloneDirectionId = beat === 'echo' ? 'echo-city' : null;

app = new Museum3DApp({
  container: document.getElementById('app'),
  lockOverlay: document.getElementById('lock-overlay'),
  promptEl: document.getElementById('prompt'),
  subtitleEl: document.getElementById('subtitle'),
  coordinateEl: DEV_MODE ? document.getElementById('runtime-coordinates') : null,
  minimapRoot: document.getElementById('echo-minimap'),
  minimapCanvas: document.getElementById('echo-minimap-canvas'),
  fadeEl: document.getElementById('fade'),
  directionRoot: document.getElementById('direction-exhibit'),
  directionFrame: document.getElementById('direction-frame'),
  directionClose: document.getElementById('direction-close'),
  directionTitle: document.getElementById('direction-title'),
  directionStatus: document.getElementById('direction-status'),
  directionTranslation: document.getElementById('direction-translation'),
  directionMode: document.getElementById('direction-mode'),
  directionCopy: document.getElementById('direction-copy'),
  directionBegin: document.getElementById('direction-begin'),
  initialState,
  captureMode,
  standaloneDirectionId,
  includeEchoCity: beat === 'echo',
});

if (DEV_MODE) installQaHooks(app);
if (params.get('simlock') === '1') app.setSimulatedLock(true);
app.start().then(() => {
  if (captureMode && params.get('qa-view')) window.__qa.setView(params.get('qa-view'));
  if (beat === 'collapse') preloadChapter(resolveFinalBossDestination().preloadChapterId);
  if (captureMode && params.get('qa-safe') === '1') {
    app.scenes.get('corridor').gauntlet.qaHazardsDisabled = true;
  }
  const qaSlots = Math.max(0, Math.min(8, Number(params.get('qa-slots') ?? (params.get('qa-open') === '1' ? 8 : 0)) || 0));
  if (captureMode && beat === 'collapse' && qaSlots > 0) {
    for (let index = 0; index < qaSlots; index += 1) app.model.dispatch({ type: 'collapseSlotKey' });
    app.scenes.get('corridor').gauntlet.syncDoor(app.model.getSnapshot().collapse, { immediate: true });
  }
  if (captureMode && beat === 'collapse' && params.get('qa-insert') === '1' && qaSlots < 8) {
    const gauntlet = app.scenes.get('corridor').gauntlet;
    const result = app.model.dispatch({ type: 'collapseSlotKey' });
    const event = result.events.find(({ type }) => type === 'collapse.keySlotted');
    if (event) gauntlet._startKeyInsertion(event.payload.keysSlotted);
    window.__qa.advance(Math.max(0, Number(params.get('qa-insert-progress') ?? 0.3)) * 1000);
  }
  if (captureMode && beat === 'collapse' && params.get('qa-room') === '1') {
    window.__qa.lookAt(37.15, 0, 42, 0, params.get('qa-warning') === '1' ? -0.28 : -0.03);
  } else if (captureMode && beat === 'collapse' && params.get('qa-door') === '1') {
    window.__qa.lookAt(40.25, 0, 42, 0, params.get('qa-warning') === '1' ? -0.34 : 0);
  } else if (captureMode && beat === 'collapse' && params.get('qa-event')) {
    const event = COLLAPSE_SCRIPT.find(({ id }) => id === params.get('qa-event'));
    if (event) {
      const gauntlet = app.scenes.get('corridor').gauntlet;
      gauntlet._queueEvent(event);
      const resolvedImpact = params.get('qa-resolve') === '1' && event.kind !== 'hole';
      window.__qa.lookAt(event.triggerX, 0, event.x, event.z, resolvedImpact ? -0.24 : event.kind === 'hole' ? -0.12 : 0.34);
      if (params.get('qa-resolve') === '1') {
        const qaAfter = Math.max(0, Number(params.get('qa-after') ?? 0) || 0);
        window.__qa.advance((event.warningSeconds ?? COLLAPSE_WARNING_SECONDS) * 1000 + (event.kind === 'hole' ? 420 : 560) + qaAfter);
      }
    }
  }
  if (captureMode && params.get('qa-freeze') === '1') {
    app.controller.enabled = false;
    app.interaction.enabled = false;
    app.renderer.render(app.scene, app.camera);
  }
}).catch((error) => {
  console.error('[Museum3D] startup failed', error);
});
