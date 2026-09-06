import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { BORROWED_GRID_CHAPTER05_CONTRACT } from '../../src/chapters/borrowedGrid/chapter05BorrowedGridContract.js';
import { CHAPTER05_DIRECTIONS, PLAYABLE_DIRECTION_ORDER, directionDefinition } from '../../src/chapters/museum3d/directions/directionRegistry.js';
import { DIRECTION_DOORWAYS, directionAtDoorway, isAtLabyrinthDoor } from '../../src/chapters/museum3d/directions/directionDoorways.js';
import { ArchiveCorridor } from '../../src/chapters/museum3d/scenes/ArchiveCorridor.js';
import { Chapter05DirectionProgress } from '../../src/chapters/museum3d/state/chapter05DirectionProgress.js';
import { EmbeddedDirectionExhibit } from '../../src/chapters/museum3d/systems/EmbeddedDirectionExhibit.js';
import { buildLayout } from '../../src/chapters/museum/labyrinth/mazeGenerator.js';
import { ROUND_SPECS } from '../../src/chapters/borrowedGrid/model/districtDemand.js';

const read = (path) => fs.readFileSync(new URL(path, import.meta.url), 'utf8');
const corridor = read('../../src/chapters/museum3d/scenes/ArchiveCorridor.js');
const app = read('../../src/chapters/museum3d/Museum3DApp.js');
const html = read('../../museum-3d.html');
const vite = read('../../vite.museum3d.config.js');
const chapter2Entry = read('../../src/chapters/borrowedGrid/borrowed-grid-main.js');
const chapter2Contract = read('../../src/chapters/borrowedGrid/chapter05BorrowedGridContract.js');
const chapter4Entry = read('../../src/chapters/paintedCountry/painted-country-main.js');
const labyrinthEntry = read('../../src/chapters/museum/labyrinth/labyrinth-main.js');
const labyrinthScene = read('../../src/chapters/museum/labyrinth/LabyrinthScene.js');
const labyrinthAssets = read('../../src/chapters/museum/labyrinth/labyrinthAssets.js');
const borrowedGridCurrent = read('../../src/chapters/borrowedGrid/BorrowedGridCurrentScene.js');
const borrowedGridForeground = read('../../src/chapters/borrowedGrid/door2ForegroundArt.js');
const paintedCountryInhabitant = read('../../src/chapters/paintedCountry/PaintedCountryInhabitantScene.js');
const parallelArtLedger = read('../../docs/CHAPTER_05_PARALLEL_DIRECTION_ART_ASSET_LEDGER.md');
const model = read('../../src/chapters/museum3d/state/chapter05Model.js');
const directionProgress = read('../../src/chapters/museum3d/state/chapter05DirectionProgress.js');
const echoWalking = read('../../src/chapters/museum3d/scenes/EchoCityWalkingSim.js');
const directionBridge = read('../../src/chapters/museum3d/systems/EmbeddedDirectionExhibit.js');
const returnArtifacts = read('../../src/chapters/museum3d/assets/ReturnArtifacts.js');

test('the archive uses one Labyrinth door, three pre-display bays, and one eight-lock exit', () => {
  assert.match(corridor, /number: '4'/);
  assert.match(corridor, /RECORD SEALED/);
  assert.match(corridor, /final-archive-eight-keyholes/);
  assert.match(corridor, /exitDoorPlaqueLocked/);
  for (const verboseLabel of [
    'ARCHIVE WING — FOUR DIRECTIONS',
    'CHAPTER 2 — THE BORROWED GRID',
    'ECHO CITY RECONSTRUCTION',
    'CHAPTER 4 — THE PAINTED COUNTRY',
    'LABYRINTH WING',
    'ARCHIVE STORAGE',
    'STAFF ONLY',
    'PRESS E TO ENTER',
  ]) assert.doesNotMatch(corridor, new RegExp(verboseLabel));
});

test('all Phaser siblings use one framed exhibit bridge and return to the archive', () => {
  assert.match(html, /id="direction-exhibit"/);
  assert.match(app, /new EmbeddedDirectionExhibit/);
  assert.match(chapter2Contract, /chapter05-direction:borrowed-grid:complete/);
  assert.match(chapter2Contract, /chapter05-direction:borrowed-grid:exit/);
  assert.match(chapter4Entry, /chapter05-direction:painted-country:complete/);
  assert.match(chapter4Entry, /chapter05-direction:painted-country:exit/);
});

test('Door 2 exposes one formal Chapter 5 route, message, and artifact contract', () => {
  const definition = directionDefinition(CHAPTER05_DIRECTIONS.BORROWED_GRID);
  assert.equal(BORROWED_GRID_CHAPTER05_CONTRACT.doorNumber, 2);
  assert.equal(definition.src, BORROWED_GRID_CHAPTER05_CONTRACT.embeddedSrc);
  assert.equal(definition.completeMessage, BORROWED_GRID_CHAPTER05_CONTRACT.completeMessage);
  assert.equal(definition.exitMessage, BORROWED_GRID_CHAPTER05_CONTRACT.exitMessage);
  assert.equal(definition.artifactId, BORROWED_GRID_CHAPTER05_CONTRACT.artifactId);
  assert.match(chapter2Entry, /BORROWED_GRID_CHAPTER05_CONTRACT\.completeMessage/);
  assert.match(chapter2Entry, /BORROWED_GRID_CHAPTER05_CONTRACT\.exitMessage/);
});

test('Door 2 stays directly buildable but cannot open inside the V02 museum route', () => {
  const previousWindow = globalThis.window;
  const parentWindow = {};
  let messageListener = null;
  globalThis.window = {
    location: { origin: 'http://127.0.0.1:5186' },
    addEventListener: (type, listener) => { if (type === 'message') messageListener = listener; },
    removeEventListener: () => {},
  };

  try {
    const classes = new Set();
    const root = {
      classList: {
        add: (name) => classes.add(name),
        remove: (name) => classes.delete(name),
        toggle: (name, enabled) => enabled ? classes.add(name) : classes.delete(name),
      },
      setAttribute: () => {},
    };
    const iframe = { contentWindow: parentWindow, dataset: {}, focus: () => {}, src: '' };
    const progress = new Chapter05DirectionProgress();
    const exhibit = new EmbeddedDirectionExhibit({
      root,
      iframe,
      closeButton: { addEventListener: () => {} },
      titleEl: { textContent: '' },
      statusEl: { textContent: '' },
      progress,
    });

    assert.equal(exhibit.open(CHAPTER05_DIRECTIONS.BORROWED_GRID), false);
    assert.equal(iframe.src, '');
    const snapshot = progress.getSnapshot();
    assert.equal(exhibit.opened, false);
    assert.equal(snapshot.carriedArtifact, null);
    assert.equal(snapshot.completed[BORROWED_GRID_CHAPTER05_CONTRACT.id], false);
    assert.equal(snapshot.artifacts[BORROWED_GRID_CHAPTER05_CONTRACT.artifactId].displayed, true);
  } finally {
    globalThis.window = previousWindow;
  }
});

test('the two framed playable echoes use one forgiving doorway-sized interaction target', () => {
  assert.match(corridor, /return hitProxy\(g, \{/);
  assert.match(corridor, /z: -1\.82, w: 2\.4, h: 2\.3, d: 0\.12/);
  assert.match(corridor, /name: `\$\{id\}-interaction-proxy`/);
});

test('all four numbers retain a doorway band while Door 4 is the only museum interaction', () => {
  assert.equal(DIRECTION_DOORWAYS.length, 4);
  for (const zone of DIRECTION_DOORWAYS) {
    assert.equal(directionAtDoorway({
      x: (zone.minX + zone.maxX) / 2,
      z: (zone.minZ + zone.maxZ) / 2,
    }), zone.id);
  }
  assert.equal(directionAtDoorway({ x: 18, z: 0 }), null);
  assert.equal(directionAtDoorway({ x: 38, z: 0 }), CHAPTER05_DIRECTIONS.LABYRINTH);
  assert.equal(directionAtDoorway({ x: 38, z: -1.9 }), CHAPTER05_DIRECTIONS.LABYRINTH);
  assert.doesNotMatch(corridor, /registerDirection\(CHAPTER05_DIRECTIONS\.ECHO_CITY/);
  assert.doesNotMatch(corridor, /registerDirection\(CHAPTER05_DIRECTIONS\.PAINTED_COUNTRY/);
  assert.match(corridor, /id: 'echo-city'/);
  assert.doesNotMatch(corridor, /echo-city-interaction-proxy/);
  assert.doesNotMatch(corridor, /echo-case/);
  assert.match(corridor, /if \(!isDirectionPlayable\(id\)\) return false/);
  assert.match(corridor, /door-4-interaction-point/);
  assert.match(corridor, /setFallback\([\s\S]*direction-\$\{CHAPTER05_DIRECTIONS\.LABYRINTH\}/);
  assert.deepEqual(DIRECTION_DOORWAYS.map(({ id }) => id), [
    'sealed-record-1',
    CHAPTER05_DIRECTIONS.BORROWED_GRID,
    CHAPTER05_DIRECTIONS.ECHO_CITY,
    CHAPTER05_DIRECTIONS.LABYRINTH,
  ]);
});

test('sealed bays cannot open and the Labyrinth remains the only embedded route', () => {
  const calls = [];
  const corridorHarness = {
    ctx: {
      openDirection: (id) => calls.push(['open', id]),
    },
  };

  ArchiveCorridor.prototype._enterDirection.call(corridorHarness, CHAPTER05_DIRECTIONS.BORROWED_GRID);
  ArchiveCorridor.prototype._enterDirection.call(corridorHarness, CHAPTER05_DIRECTIONS.LABYRINTH);

  assert.deepEqual(calls, [['open', CHAPTER05_DIRECTIONS.LABYRINTH]]);
  assert.deepEqual(PLAYABLE_DIRECTION_ORDER, [CHAPTER05_DIRECTIONS.LABYRINTH]);
});

test('Door 4 owns a direct proximity input path even when pointer lock drops', () => {
  assert.match(app, /this\._atLabyrinthDoor = \(\) =>/);
  assert.match(app, /isAtLabyrinthDoor\(this\.controller\.position, state\.phase\)/);
  assert.match(app, /if \(this\._enterLabyrinthFromDoor\(\)\) return;/);
  assert.doesNotMatch(app, /allowCorridorFallback/);
  assert.doesNotMatch(corridor, /player\.x >= 35\.8 && player\.x <= 39\.4/);
  assert.match(app, /door-4-direct-interact/);
  assert.match(app, /ENTER DOOR 4 · THE LABYRINTH/);
  assert.equal(isAtLabyrinthDoor({ x: 38, z: -1.3 }, 'corridor'), true);
  // A normal player presses E from the readable full-door view, not only from
  // the QA camera's closer z=0 pose.
  assert.equal(isAtLabyrinthDoor({ x: 38, z: 0.8 }, 'corridor'), true);
  assert.equal(isAtLabyrinthDoor({ x: 38, z: 1.2 }, 'corridor'), false);
  assert.equal(isAtLabyrinthDoor({ x: 38, z: -1.3 }, 'collapse'), false);
});

test('doors 2 and 4 revisit their original worlds from new roles while door 1 preserves the first full maze run', () => {
  assert.match(chapter2Entry, /BorrowedGridCurrentScene/);
  assert.match(borrowedGridCurrent, /role: 'grid-runner'/);
  assert.match(borrowedGridCurrent, /preloadDoor2DemandIcons/);
  assert.match(borrowedGridCurrent, /pulseAfterimages/);
  assert.doesNotMatch(borrowedGridCurrent, /world-04-retro-cyberpunk/);
  assert.match(chapter4Entry, /PaintedCountryInhabitantScene/);
  assert.match(paintedCountryInhabitant, /role: 'small-inhabitant'/);
  assert.match(paintedCountryInhabitant, /paperPalette/);
  assert.match(paintedCountryInhabitant, /foldedHill/);
  assert.match(labyrinthEntry, /LabyrinthScene/);
  assert.doesNotMatch(chapter2Entry, /RetroCyberpunkScene/);
  assert.doesNotMatch(chapter4Entry, /PaintedCountryScene/);
  assert.doesNotMatch(labyrinthEntry, /LabyrinthEcho/);
});

test('Door 2 preserves its original city and current-runner game with a minimal line-art foreground', () => {
  assert.match(borrowedGridCurrent, /originalBackdropTexture/);
  for (const chunk of ['chunk-00.jpg', 'chunk-01.jpg', 'chunk-02.jpg']) assert.match(borrowedGridForeground, new RegExp(chunk));
  assert.doesNotMatch(borrowedGridCurrent, /parallaxTexture/);
  assert.match(borrowedGridCurrent, /preloadDoor2Foreground/);
  assert.match(borrowedGridCurrent, /buildSubstationBody/);
  assert.match(borrowedGridCurrent, /minimal-hand-drawn-grid-over-original-city/);
  assert.doesNotMatch(borrowedGridForeground, /substation-static\.png/);
  assert.match(borrowedGridForeground, /playable layer is/);
  assert.doesNotMatch(borrowedGridForeground, /structure-sheet\.png/);
  assert.doesNotMatch(borrowedGridForeground, /machine-sheet\.png/);
  assert.match(borrowedGridCurrent, /timerText/);
  assert.match(borrowedGridCurrent, /fontSize: '28px'/);
  assert.match(borrowedGridCurrent, /timerUrgencyBar/);
  assert.match(borrowedGridCurrent, /remainingMs <= 10_000/);
  assert.match(borrowedGridCurrent, /activeDemands/);
  assert.doesNotMatch(borrowedGridCurrent, /night-shift-worker/);
});

test('Door 2 separates the hand-drawn electrical diagram into animated gameplay layers', () => {
  for (const layer of [
    'pipe-bound-current-fluid',
    'line-current-flow',
    'feed-coil',
    'transformer-rise',
    'district-power-lights',
  ]) assert.match(borrowedGridCurrent, new RegExp(layer));
  assert.match(borrowedGridCurrent, /updateStationAnimation/);
  assert.match(borrowedGridCurrent, /edgeRoute/);
  assert.match(borrowedGridCurrent, /roundPolylineCorners/);
  assert.match(borrowedGridCurrent, /quadratic-rounded-24px-shared-by-current-and-glow/);
  assert.match(borrowedGridCurrent, /thin-bidirectional-route-wakes-with-stationary-branch-flow/);
  assert.match(borrowedGridCurrent, /updateCurrentFluid/);
  assert.match(borrowedGridCurrent, /const baseWakeTail = Math\.max\(0, head - 0\.34\)/);
  assert.match(borrowedGridCurrent, /const wakeFront = Math\.min\(1, head \+ 0\.34\)/);
  assert.match(borrowedGridCurrent, /upperWake/);
  assert.match(borrowedGridCurrent, /lowerWake/);
  assert.match(borrowedGridCurrent, /stroke\(body, center, 2\.7 \+ this\.state\.carriedUnits \* 0\.2/);
  assert.match(borrowedGridCurrent, /const connected = this\.edgeViews\.filter/);
  assert.match(borrowedGridCurrent, /pointAlongRoute/);
  assert.doesNotMatch(borrowedGridCurrent, /add\.circle\(node\.x, node\.y, 13/);
});

test('Door 2 keeps movement animation allocation-light to avoid visible hitches', () => {
  assert.match(borrowedGridCurrent, /const ROUTE_METRICS = new WeakMap\(\)/);
  assert.match(borrowedGridCurrent, /reverseRoute: \[\.\.\.route\]\.reverse\(\)/);
  assert.match(borrowedGridCurrent, /offsetRoute\(center,/);
  assert.match(borrowedGridCurrent, /this\.orderCardSignature = ''/);
  assert.match(borrowedGridCurrent, /cardSignature !== this\.orderCardSignature/);
});

test('Door 2 crossfades the moving wake into stationary branch flow at arrival', () => {
  assert.match(borrowedGridCurrent, /this\.arrivalFlow = \{/);
  assert.match(borrowedGridCurrent, /arrivalMix \* arrivalMix \* \(3 - 2 \* arrivalMix\)/);
  assert.match(borrowedGridCurrent, /const stationaryAlpha = arrivalFlow \? arrivalEase : 1/);
  assert.match(borrowedGridCurrent, /const movingAlpha = arrivalFlow \? 1 - arrivalEase : 1/);
  assert.doesNotMatch(borrowedGridCurrent, /this\.travel = null;\n\s*this\.pulse\.setRotation\(0\)/);
});

test('Door 2 keeps meaningful up and down traversal in all three progressively opened rounds', () => {
  assert.match(borrowedGridCurrent, /left: 'LEFT', right: 'RIGHT', up: 'UP', down: 'DOWN'/);
  assert.match(borrowedGridCurrent, /w: 'W', s: 'S'/);
  for (const verticalEdge of [
    '\\[1, 2\\]', '\\[2, 3\\]', '\\[3, 4\\]',
    '\\[9, 10\\]', '\\[9, 11\\]', '\\[10, 12\\]', '\\[11, 12\\]',
    '\\[14, 15\\]', '\\[15, 16\\]',
  ]) assert.match(borrowedGridCurrent, new RegExp(verticalEdge));
});

test('Door 2 Round 3 adds cross-linked routing and ten overlapping calls without changing the first two rounds', () => {
  assert.match(borrowedGridCurrent, /\[13, 16\], \[14, 16\]/);
  assert.match(borrowedGridCurrent, /ROUND 3 · FULL GRID · CROSS-LINKS LIVE · 10 CALLS/);
  assert.deepEqual(ROUND_SPECS.map((round) => round.demands.length), [3, 5, 10]);
  assert.deepEqual(ROUND_SPECS.slice(0, 2).map((round) => round.durationMs), [45_000, 60_000]);
});

test('Door 2 holds the blackout feedback briefly and then restarts the current round automatically', () => {
  assert.match(borrowedGridCurrent, /const LOSS_RESTART_DELAY_MS = 2_800/);
  assert.match(borrowedGridCurrent, /updateLossRestart\(dt\)/);
  assert.match(borrowedGridCurrent, /GRID DROPPED · RECOVERING THIS ROUND/);
  assert.match(borrowedGridCurrent, /autoRestartMs:/);
  assert.doesNotMatch(borrowedGridCurrent, /keydown-R/);
  assert.doesNotMatch(borrowedGridCurrent, /ENTER TO RESTART THIS ROUND/);
});

test('Door 2 communicates the current loop with shape, capacity, and contextual next-action cues', () => {
  for (const grammar of [
    'hand-drawn-circular-feed-coil',
    'quiet-hollow-ring',
    'hand-drawn-three-stage-step-up-coil',
    'hand-drawn-flying-car-or-cutaway-home',
    'dim-waiting-cable-live-fully-lit',
    'three-fixed-cells-below-current',
  ]) assert.match(borrowedGridCurrent, new RegExp(grammar));
  assert.doesNotMatch(borrowedGridCurrent, /interactionTexture/);
  assert.match(borrowedGridCurrent, /entryLights/);
  assert.match(borrowedGridCurrent, /poweredLights/);
  assert.match(borrowedGridCurrent, /nextVisualCue/);
  assert.match(borrowedGridCurrent, /urgencyLevel/);
  assert.match(borrowedGridCurrent, /urgencyBars/);
  assert.match(borrowedGridCurrent, /demand\.maintenance \? '  ↻'/);
  assert.doesNotMatch(borrowedGridCurrent, /Math\.ceil\(demand\.remainingMs \/ 1000\).*s/);
  assert.match(borrowedGridCurrent, /UNIT\$\{missing === 1/);
  assert.match(borrowedGridCurrent, /available: false/);
  assert.match(borrowedGridCurrent, /action\.available === false/);
  assert.doesNotMatch(borrowedGridCurrent, /NEXT  /);
});

test('doors 2 and 4 contain multi-beat play, embedded narrative, and held completion feedback', () => {
  assert.match(borrowedGridCurrent, /storyBeats/);
  assert.match(borrowedGridCurrent, /const HOLD_MS = 700/);
  for (const beat of ['lift', 'market', 'clinic', 'shelter', 'pump', 'kitchen']) assert.match(borrowedGridCurrent, new RegExp(`${beat}:`));
  assert.match(borrowedGridCurrent, /ROUND_SPECS/);
  assert.match(borrowedGridCurrent, /EVERY CALL ANSWERED/);
  assert.match(borrowedGridCurrent, /THREE-DISTRICT BYPASS COIL/);
  assert.match(paintedCountryInhabitant, /const HOLES/);
  assert.match(paintedCountryInhabitant, /const MONEY_STOPS/);
  assert.match(paintedCountryInhabitant, /LEFT PAINT/);
  assert.match(paintedCountryInhabitant, /RIGHT WASH/);
  assert.match(paintedCountryInhabitant, /drawCreationStream/);
  assert.match(paintedCountryInhabitant, /wishShapePoints/);
  assert.match(paintedCountryInhabitant, /createPaintedCountryInflationModel/);
  assert.match(paintedCountryInhabitant, /leftButtonDown/);
  assert.match(paintedCountryInhabitant, /rightButtonDown/);
  assert.match(paintedCountryInhabitant, /THERE IS MORE MONEY\. THERE IS NOT MORE BREAD/);
  for (const supply of ['mill-wheel', 'water-pump', 'freight-cart']) {
    assert.match(paintedCountryInhabitant, new RegExp(supply));
  }
  assert.match(paintedCountryInhabitant, /HE DREW EVERY WISH THEY NAMED/);
  assert.match(paintedCountryInhabitant, /THEY DREW A WAY TO MAKE ENOUGH/);
  assert.match(paintedCountryInhabitant, /drawBrushCursor\(\)/);
  assert.match(paintedCountryInhabitant, /redrawInteractionRegions\(\)/);
  assert.match(paintedCountryInhabitant, /drawGood\(g, good/);
  assert.match(paintedCountryInhabitant, /drawRepairCoverage\(g, region/);
  assert.doesNotMatch(paintedCountryInhabitant, /river-fold|roof-fold|meeting-fold|THE COUNTRY HOLDS ITSELF/);
  assert.match(parallelArtLedger, /night-shift-theatrical-2d-v1/);
});

test('all four artifacts are pre-displayed and the Labyrinth returns the eight-key route instead', () => {
  assert.match(directionProgress, /displayed: true/);
  assert.match(directionProgress, /gallery artifacts are pre-displayed/);
  assert.doesNotMatch(directionBridge, /type: 'artifact\.take'/);
  assert.match(directionBridge, /type: 'direction\.complete'/);
  assert.match(corridor, /gallery-artifact-\$\{id\}/);
  assert.match(corridor, /createReturnArtifact/);
  assert.match(returnArtifacts, /artifact-looking-fragment/);
  assert.match(returnArtifacts, /artifact-three-district-bypass-coil/);
  assert.match(returnArtifacts, /artifact-common-fold/);
  assert.match(borrowedGridCurrent, /artifactReady/);
  assert.match(paintedCountryInhabitant, /artifactReady/);
  assert.match(labyrinthScene, /artifact-ready/);
});

test('labyrinth torches cannot be mistaken for collectible keys', () => {
  assert.match(labyrinthScene, /textureKey\('torch'\)/);
  assert.match(labyrinthScene, /textureKey\('key'\)/);
  assert.doesNotMatch(labyrinthScene, /textureKey\('key'\)\)\.setTint\(PAL\.torch/);
  assert.match(labyrinthAssets, /id: 'torch'/);
});

test('each labyrinth connector opens on the first key of its wing', () => {
  const layout = buildLayout(() => 0.5);
  assert.deepEqual(layout.gates.map((gate) => gate.requiredKeys), [1, 3, 5]);
  assert.equal(layout.keys.length, 8);
});

test('the corridor has a warm physical route back to the front lobby', () => {
  assert.match(corridor, /lobby-return-frame/);
  assert.match(corridor, /goBackToLobby/);
  assert.match(app, /async goBackToLobby\(\)/);
  assert.match(model, /case 'leaveCorridor'/);
});

test('the museum title card appears only before the first entry', () => {
  assert.match(app, /this\._hasEnteredMuseum = false/);
  assert.match(app, /title\.hidden = this\._hasEnteredMuseum/);
  assert.match(app, /classList\.toggle\('resume', this\._hasEnteredMuseum\)/);
});

test('the combined Museum build owns all four direction entry pages', () => {
  for (const input of ['museum-3d.html', 'painted-country.html', 'labyrinth.html']) {
    assert.match(vite, new RegExp(input.replace('.', '\\.')));
  }
  assert.equal(BORROWED_GRID_CHAPTER05_CONTRACT.entryHtml, 'borrowed-grid.html');
  assert.match(vite, /BORROWED_GRID_CHAPTER05_CONTRACT\.entryHtml/);
});

test('Echo remains directly runnable while its cassette is only a pre-display inside the museum', () => {
  assert.match(directionProgress, /CHAPTER05_DIRECTIONS\.ECHO_CITY/);
  assert.match(echoWalking, /artifact\.take', id: CHAPTER05_DIRECTIONS\.ECHO_CITY/);
  assert.match(corridor, /\[CHAPTER05_DIRECTIONS\.ECHO_CITY, 30\]/);
  assert.doesNotMatch(corridor, /registerDirection\(CHAPTER05_DIRECTIONS\.ECHO_CITY/);
  assert.match(app, /this\.standaloneDirectionId === CHAPTER05_DIRECTIONS\.ECHO_CITY/);
  assert.match(app, /museum route remains unchanged/);
});

test('Door 3 stays inert in the museum even if standalone Echo is already complete', () => {
  const calls = [];
  const corridorHarness = {
    ctx: {
      directionProgress: {
        getSnapshot: () => ({
          carriedArtifact: null,
          allComplete: false,
          completed: { [CHAPTER05_DIRECTIONS.ECHO_CITY]: true },
        }),
      },
      dialogue: { play: (lines) => calls.push(['dialogue', lines[0].text]) },
      goToEchoCity: () => calls.push(['echo']),
      openDirection: (id) => calls.push(['open', id]),
    },
    _syncArtifacts: () => calls.push(['sync']),
  };

  const entered = ArchiveCorridor.prototype._enterDirection.call(
    corridorHarness,
    CHAPTER05_DIRECTIONS.ECHO_CITY,
  );

  assert.equal(entered, false);
  assert.deepEqual(calls, []);
  assert.match(app, /completed\[CHAPTER05_DIRECTIONS\.ECHO_CITY\]\) return false/);
  assert.match(corridor, /id: 'echo-city'/);
});
