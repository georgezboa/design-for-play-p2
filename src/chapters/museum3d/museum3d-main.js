// Chapter 5 Dreamcore Museum P0 — standalone Three.js entry.
// Independent of the Phaser prototypes and of the main Nightfall game.

import { Museum3DApp } from './Museum3DApp.js';
import { createInitialState, createMuseumEntryState } from './state/chapter05Model.js';
import { installQaHooks } from './qa/museum3dQaState.js';
import { DEBUG_BEATS } from './config.js';
import { installDevMenuReturnControl } from '../../devMenuReturn.js';
import { installPauseMenu } from '../../shell/pauseMenu.js';
import { createCollapseState } from './state/collapseGauntlet.js';
import { COLLAPSE_SCRIPT, COLLAPSE_WARNING_SECONDS } from './systems/CollapseGauntletDirector.js';
import { preloadChapter } from '../../shell/chapterPreloader.js';
import { resolveFinalBossDestination } from '../../shell/finalBossRoute.js';

installDevMenuReturnControl();
installPauseMenu({ checkpointId: 'chapter-5-start' });

// Gate 1 debug routes: museum-3d.html?beat=corridor|echo|return starts at
// that beat with the minimum legal preceding state already applied.
function stateForBeat(beat) {
  const s = createInitialState();
  if (beat === 'corridor') {
    s.ticket.inspected = true;
    s.ticket.carried = true;
    s.phase = 'corridor';
  } else if (beat === 'echo') {
    s.ticket.inspected = true;
    s.ticket.carried = true;
    s.phase = 'echo-city';
    s.corridor.pass = 2;
    s.corridor.guideStandSide = 'north';
  } else if (beat === 'return') {
    s.ticket.inspected = true;
    s.ticket.returned = true;
    s.phase = 'return';
    s.corridor.pass = 2;
    s.corridor.guideStandSide = 'north';
    s.echoRecord = {
      nightKitTaken: true,
      marketPawlReleased: true,
      marketShuttersLocked: true,
      fountainGrateCleared: true,
      fountainCirculationRestored: true,
      archiveSlotUnlocked: true,
      archiveLedgerReturned: true,
      nightBadgeClaimed: true,
      stationPanelOpened: true,
      stationLampOn: true,
      returnWalkStarted: true,
      recordFiled: true,
    };
    s.lobby.deskReclassified = true;
  } else if (beat === 'collapse') {
    s.ticket.inspected = true;
    s.ticket.carried = true;
    s.phase = 'collapse';
    s.corridor.pass = 2;
    s.corridor.guideStandSide = 'north';
    s.lobby.deskReclassified = true;
    s.collapse = createCollapseState({ started: true });
  }
  return s;
}

const params = new URLSearchParams(window.location.search);
const beat = params.get('beat');
const initialState = beat && DEBUG_BEATS.includes(beat) ? stateForBeat(beat) : createMuseumEntryState();
const captureMode = params.get('capture') === '1' || params.get('simlock') === '1';
const standaloneDirectionId = beat === 'echo' ? 'echo-city' : null;

const app = new Museum3DApp({
  container: document.getElementById('app'),
  lockOverlay: document.getElementById('lock-overlay'),
  promptEl: document.getElementById('prompt'),
  subtitleEl: document.getElementById('subtitle'),
  coordinateEl: document.getElementById('runtime-coordinates'),
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
});

installQaHooks(app);
if (params.get('simlock') === '1') app.setSimulatedLock(true);
app.start().then(() => {
  if (captureMode && params.get('qa-view')) window.__qa.setView(params.get('qa-view'));
  if (beat === 'collapse') preloadChapter(resolveFinalBossDestination().preloadChapterId);
  if (captureMode && !beat && params.get('qa-archive-wing') === '1') {
    // Deterministic browser proof for the real integrated lobby bootstrap:
    // starting inside the archive threshold must enter the corridor without
    // the legacy standalone ticket hunt.
    app.controller.setPose(7.1, 0, -Math.PI / 2);
  }
  const qaDirection = params.get('qa-direction');
  const qaArtifact = params.get('qa-artifact');
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
  if (captureMode && beat === 'echo' && params.get('qa-night') === 'complete') {
    for (const type of [
      'takeNightKit', 'openStationPanel', 'switchStationLamp',
      'releaseMarketPawl', 'lockMarketShutters',
      'clearFountainGrate', 'restoreFountainCirculation',
      'unlockArchiveSlot', 'returnArchiveLedger', 'claimNightBadge',
    ]) app.model.dispatch({ type });
    app.directionProgress.dispatch({ type: 'artifact.take', id: 'echo-city' });
    app._syncCarriedArtifact();
    window.__qa.lookAt(0, 12, 0, 0, -0.04);
  } else if (captureMode && beat === 'echo' && params.get('qa-night') === 'powered') {
    for (const type of ['takeNightKit', 'openStationPanel', 'switchStationLamp']) {
      app.model.dispatch({ type });
    }
    if (params.get('qa-market') === '1') {
      for (const type of ['releaseMarketPawl', 'lockMarketShutters']) {
        app.model.dispatch({ type });
      }
      window.__qa.lookAt(-25.5, 5.6, -20, 2.2, -0.08);
    } else if (params.get('qa-fountain') === '1' || params.get('qa-pump') === '1') {
      for (const type of [
        'releaseMarketPawl', 'lockMarketShutters',
        'clearFountainGrate', 'restoreFountainCirculation',
      ]) {
        app.model.dispatch({ type });
      }
      if (params.get('qa-pump') === '1') {
        window.__qa.lookAt(28, 4.5, 28, 8.5, -0.04);
      } else {
        window.__qa.lookAt(25.5, 5.8, 20, 0, -0.08);
      }
    } else {
      window.__qa.lookAt(0, 12, 0, 0, -0.04);
    }
  }
  const qaDirectionX = {
    labyrinth: 38,
    'borrowed-grid': 22,
    'echo-city': 30,
    'painted-country': 14,
  }[qaDirection];
  if (captureMode && beat === 'corridor' && ['labyrinth', 'borrowed-grid', 'painted-country'].includes(qaArtifact)) {
    app.directionProgress.dispatch({ type: 'artifact.take', id: qaArtifact });
    app._syncCarriedArtifact();
    const x = qaDirectionX ?? { labyrinth: 14, 'borrowed-grid': 22, 'painted-country': 38 }[qaArtifact];
    window.__qa.lookAt(x, qaDirectionX ? -1.66 : 0, x, qaDirectionX ? -2 : 1.7, 0);
  } else if (captureMode && beat === 'corridor' && qaDirection === 'lobby-return') {
    window.__qa.lookAt(8.7, 0, 7.8, 0, 0);
  } else if (captureMode && beat === 'corridor' && qaDirectionX) {
    window.__qa.lookAt(qaDirectionX, 0, qaDirectionX, -1.66, 0);
  } else if (captureMode && beat === 'collapse' && params.get('qa-room') === '1') {
    window.__qa.lookAt(37.15, 0, 42, 0, params.get('qa-warning') === '1' ? -0.28 : -0.03);
  } else if (captureMode && beat === 'collapse' && params.get('qa-door') === '1') {
    window.__qa.lookAt(40.25, 0, 42, 0, params.get('qa-warning') === '1' ? -0.34 : 0);
  } else if (captureMode && beat === 'collapse' && params.get('qa-event')) {
    const event = COLLAPSE_SCRIPT.find(({ id }) => id === params.get('qa-event'));
    if (event) {
      const gauntlet = app.scenes.get('corridor').gauntlet;
      gauntlet._queueEvent(event);
      // Preview the telegraph from the exact point where a live run first
      // triggers it, so captures reflect the real reaction distance.
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
