import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import {
  COLLAPSE_BLACK_HOLD_MS,
  COLLAPSE_CHAPTER06_DELAY_MS,
  COLLAPSE_CHAPTER06_ROUTE,
  COLLAPSE_DOOR_PRESSURE_X,
  COLLAPSE_ENTRY,
  COLLAPSE_KEY_TOTAL,
  COLLAPSE_MAX_HITS,
  COLLAPSE_SLOT_SECONDS,
  COLLAPSE_THRESHOLD,
  COLLAPSE_ZONES,
  createCollapseState,
  reduceCollapse,
} from '../../src/chapters/museum3d/state/collapseGauntlet.js';
import { Chapter05Model, createInitialState } from '../../src/chapters/museum3d/state/chapter05Model.js';
import { PLAYER } from '../../src/chapters/museum3d/config.js';
import {
  COLLAPSE_DEBRIS_LEAD_METERS,
  COLLAPSE_DOOR_REPEAT_SECONDS,
  COLLAPSE_DOOR_WARNING_SECONDS,
  COLLAPSE_DOOR_PATTERN,
  COLLAPSE_FALL_SECONDS,
  COLLAPSE_HAZARD_SETS,
  COLLAPSE_HOLE_LEAD_METERS,
  COLLAPSE_HOLE_WARNING_SECONDS,
  COLLAPSE_SCRIPT,
  COLLAPSE_WARNING_SECONDS,
} from '../../src/chapters/museum3d/systems/CollapseGauntletDirector.js';

const corridorSource = fs.readFileSync(new URL('../../src/chapters/museum3d/scenes/ArchiveCorridor.js', import.meta.url), 'utf8');
const directorSource = fs.readFileSync(new URL('../../src/chapters/museum3d/systems/CollapseGauntletDirector.js', import.meta.url), 'utf8');
const audioSource = fs.readFileSync(new URL('../../src/chapters/museum3d/systems/AudioGuide.js', import.meta.url), 'utf8');
const appSource = fs.readFileSync(new URL('../../src/chapters/museum3d/Museum3DApp.js', import.meta.url), 'utf8');
const gameFlowSource = fs.readFileSync(new URL('../../src/shell/gameFlow.js', import.meta.url), 'utf8');
const designLock = fs.readFileSync(new URL('../../docs/CHAPTER_05_COLLAPSE_GAUNTLET_DESIGN_LOCK_V02.md', import.meta.url), 'utf8');

test('the gauntlet locks the eight-key, three-hit, and telegraph tuning', () => {
  assert.equal(COLLAPSE_KEY_TOTAL, 8);
  assert.equal(COLLAPSE_MAX_HITS, 3);
  assert.equal(COLLAPSE_SLOT_SECONDS, 0.6);
  assert.ok(COLLAPSE_WARNING_SECONDS >= 1.25);
  assert.ok(COLLAPSE_DOOR_WARNING_SECONDS >= 1.4);
  assert.ok(COLLAPSE_DOOR_REPEAT_SECONDS >= 3);
  assert.deepEqual(COLLAPSE_ZONES.map(({ minX, maxX }) => [minX, maxX]), [[8, 20], [20, 32], [32, 42]]);
});

test('world debris escalates only in the later zones', () => {
  assert.deepEqual(COLLAPSE_HAZARD_SETS[1], ['ceiling-tile', 'fixture']);
  assert.ok(COLLAPSE_HAZARD_SETS[2].includes('rail-plate'));
  assert.ok(COLLAPSE_HAZARD_SETS[2].includes('cable-spool'));
  assert.ok(COLLAPSE_HAZARD_SETS[3].includes('city-stone'));
  assert.ok(COLLAPSE_HAZARD_SETS[3].includes('paper-slab'));
});

test('collapse failures use authored coordinates instead of following the player', () => {
  assert.ok(COLLAPSE_SCRIPT.length >= 10);
  assert.ok(COLLAPSE_DOOR_PATTERN.length >= 3);
  assert.equal(new Set(COLLAPSE_SCRIPT.map(({ id }) => id)).size, COLLAPSE_SCRIPT.length);
  for (const event of [...COLLAPSE_SCRIPT, ...COLLAPSE_DOOR_PATTERN]) {
    assert.equal(Number.isFinite(event.x), true);
    assert.equal(Number.isFinite(event.z), true);
  }
  assert.ok(COLLAPSE_SCRIPT.filter(({ kind, scale }) => kind === 'debris' && scale >= 1.6).length >= 6);
  assert.ok(COLLAPSE_DOOR_PATTERN.some(({ z }) => Math.abs(z) >= 2.4));
});

test('the final archive expands into a dark red dodge room', () => {
  assert.match(corridorSource, /root\.userData\.environment = null/);
  assert.match(corridorSource, /rendererExposure = 0\.80/);
  assert.match(corridorSource, /roomHalfDepth = 4\.2/);
  assert.match(corridorSource, /addOrientedBoxFromCenterSize/);
  assert.match(directorSource, /AmbientLight\(0xff160c/);
  assert.match(directorSource, /Math\.pow\(flashWave, 2\.2\)/);
});

test('key slotting has a visible hand animation and an oppressive layered score', () => {
  assert.match(directorSource, /first-person-key-insertion-animation/);
  assert.match(directorSource, /_startKeyInsertion/);
  assert.match(directorSource, /_updateKeyInsertion/);
  assert.match(audioSource, /_scheduleCollapseBeat/);
  assert.match(audioSource, /rumble\.loop = true/);
  assert.match(audioSource, /tension = \[207\.65, 220\]/);
});

test('the black threshold plays the resolved route film and starts its Boss preload with playback', () => {
  assert.match(appSource, /navigateAfterCinematic\(finalBoss\.cinematicId, finalBoss\.cinematicPath, finalBoss\.route/);
  assert.match(appSource, /preloadChapterId: finalBoss\.preloadChapterId/);
  assert.match(appSource, /requirePreloadReady: true/);
  assert.match(gameFlowSource, /video\.addEventListener\('playing', beginPreload, \{ once: true \}\)/);
  assert.match(gameFlowSource, /if \(waitForPreload\)[\s\S]*await preloadPromise/);
});

test('large floor holes announce themselves for a full second', () => {
  const holes = COLLAPSE_SCRIPT.filter(({ kind }) => kind === 'hole');
  assert.ok(holes.length >= 3);
  assert.ok(COLLAPSE_HOLE_WARNING_SECONDS >= 1.5);
  for (const hole of holes) {
    assert.ok(hole.radiusX >= 0.9);
    assert.ok(hole.radiusZ >= 0.75);
    assert.ok(hole.warningSeconds >= 1.5);
  }
});

test('warnings appear ahead of the player and the golden path clears on a first run', () => {
  for (const event of COLLAPSE_SCRIPT) {
    const lead = event.x - event.triggerX;
    const expectedLead = event.kind === 'hole' ? COLLAPSE_HOLE_LEAD_METERS : COLLAPSE_DEBRIS_LEAD_METERS;
    assert.ok(lead >= expectedLead - 0.01);
    const warning = event.warningSeconds ?? COLLAPSE_WARNING_SECONDS;
    const clearX = event.triggerX + PLAYER.walkSpeed * (warning + (event.kind === 'hole' ? 0 : COLLAPSE_FALL_SECONDS));
    if (event.kind === 'hole') {
      assert.ok(clearX - event.x > event.radiusX * 0.86);
    } else {
      assert.ok(clearX - event.x > event.radius + PLAYER.radius);
    }
  }
  assert.ok(PLAYER.walkSpeed * COLLAPSE_DOOR_WARNING_SECONDS > 4.5);
});

test('dust exists only as a short impact burst after debris lands', () => {
  assert.doesNotMatch(directorSource, /_buildDust/);
  assert.doesNotMatch(directorSource, /this\.dust\.visible = this\.active/);
  assert.match(directorSource, /_spawnImpactBurst\(hazard\)/);
  assert.match(directorSource, /collapse-impact-dust-burst/);
  assert.match(directorSource, /life: heavy \? 0\.88 : 0\.68/);
  assert.match(directorSource, /ambientDust: false/);
});

test('the collapse lock freezes every trigger while the stones may reveal the hidden ending', () => {
  assert.deepEqual(COLLAPSE_ENTRY, { x: 14.8, z: 0, yaw: -Math.PI / 2 });
  assert.equal(COLLAPSE_DOOR_PRESSURE_X, 38.75);
  assert.deepEqual(COLLAPSE_THRESHOLD, { x: 41.25, halfWidth: 1.3, doorOpenAmount: 0.82 });
  assert.equal(COLLAPSE_BLACK_HOLD_MS, 1200);
  assert.equal(COLLAPSE_CHAPTER06_DELAY_MS, 2400);
  assert.equal(COLLAPSE_CHAPTER06_ROUTE, '/final-boss.html?from=chapter5');
  assert.deepEqual(COLLAPSE_SCRIPT.map(({ id, triggerX, x, z }) => [id, triggerX, x, z]), [
    ['z1-ceiling-a', 13.85, 16.65, -0.72],
    ['z1-fixture-a', 15.55, 18.35, 0.78],
    ['z1-hole-a', 16.75, 20.15, -0.73],
    ['z2-wall-a', 19.4, 22.2, 0.72],
    ['z2-rail-a', 21.35, 24.15, -0.76],
    ['z2-ceiling-a', 23.15, 25.95, 0.7],
    ['z2-hole-a', 24.35, 27.75, 0.76],
    ['z2-grid-a', 26.85, 29.65, -0.7],
    ['z3-city-a', 30, 32.8, 0.72],
    ['z3-paper-a', 31.95, 34.75, -0.74],
    ['z3-hole-a', 33.25, 36.65, -0.74],
    ['z3-wall-a', 35.45, 38.25, 0.76],
  ]);
  assert.match(appSource, /const finalBoss = resolveFinalBossDestination\(\)/);
  assert.match(appSource, /navigateAfterCinematic\(finalBoss\.cinematicId, finalBoss\.cinematicPath, finalBoss\.route/);
  assert.match(appSource, /preloadChapterId: finalBoss\.preloadChapterId/);
  assert.match(appSource, /requirePreloadReady: true/);
  assert.match(designLock, /Status: \*\*FINAL LOCKED\*\*/);
  assert.match(designLock, /museum-labyrinth:complete/);
  assert.match(designLock, /with all (four|five) it.*BLACK KNIFE/s);
});

test('Labyrinth completion grants exactly eight keys and enters collapse directly', () => {
  const seed = createInitialState();
  seed.phase = 'corridor';
  seed.ticket.inspected = true;
  seed.ticket.carried = true;
  const model = new Chapter05Model(seed);
  const result = model.dispatch({ type: 'labyrinthComplete' });
  const state = model.getSnapshot();
  assert.equal(result.changed, true);
  assert.equal(state.phase, 'collapse');
  assert.equal(state.collapse.started, true);
  assert.equal(state.collapse.labyrinthKeys, 8);
  assert.equal(state.collapse.keysSlotted, 0);
  assert.equal(state.lobby.deskReclassified, true);
});

test('slotting is safely interruptible and opens the door only on key eight', () => {
  let state = createCollapseState();
  ({ state } = reduceCollapse(state, { type: 'collapse.start' }));
  for (let i = 1; i <= 7; i += 1) {
    ({ state } = reduceCollapse(state, { type: 'collapse.slotKey' }));
    assert.equal(state.keysSlotted, i);
    assert.equal(state.labyrinthKeys, 8 - i);
    assert.equal(state.doorOpen, false);
  }
  ({ state } = reduceCollapse(state, { type: 'collapse.slotKey' }));
  assert.equal(state.keysSlotted, 8);
  assert.equal(state.labyrinthKeys, 0);
  assert.equal(state.doorOpen, true);
});

test('death keeps slotted keys but resets the run hits and advances the run id', () => {
  let state = createCollapseState();
  ({ state } = reduceCollapse(state, { type: 'collapse.start' }));
  for (let i = 0; i < 3; i += 1) ({ state } = reduceCollapse(state, { type: 'collapse.slotKey' }));
  for (let i = 0; i < COLLAPSE_MAX_HITS; i += 1) ({ state } = reduceCollapse(state, { type: 'collapse.hit' }));
  assert.equal(state.keysSlotted, 3);
  assert.equal(state.labyrinthKeys, 5);
  assert.equal(state.hitsTaken, 0);
  assert.equal(state.totalHitsTaken, 3);
  assert.equal(state.deaths, 1);
  assert.equal(state.runId, 2);
});

test('the threshold refuses early entry and completes only after the eighth key', () => {
  let state = createCollapseState();
  ({ state } = reduceCollapse(state, { type: 'collapse.start' }));
  const early = reduceCollapse(state, { type: 'collapse.jump' });
  assert.equal(early.state.completed, false);
  for (let i = 0; i < 8; i += 1) ({ state } = reduceCollapse(state, { type: 'collapse.slotKey' }));
  ({ state } = reduceCollapse(state, { type: 'collapse.jump' }));
  assert.equal(state.jumped, true);
  assert.equal(state.completed, true);
});
