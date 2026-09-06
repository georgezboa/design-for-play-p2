import assert from 'node:assert/strict';
import test from 'node:test';
import { createMechanicalTable, MECHANICAL_TABLE_TUNING } from '../../src/tutorial/phases/mechanicalTable.js';

const run = (table, ms = MECHANICAL_TABLE_TUNING.rollMs + 900) => {
  for (let t = 0; t < ms; t += 50) table.update(50);
};

const pumpFull = (table) => {
  table.interact('pump');
  table.interact('pump');
};

test('IV requires a visible launch; weight alone never completes', () => {
  const table = createMechanicalTable({ phase: 4 });
  table.enter();
  table.interact('weight-right');
  assert.equal(table.snapshot().stageComplete, false);
});

test('IV underpowered and misweighted launches recover without clearing the chosen detent', () => {
  const table = createMechanicalTable({ phase: 4 });
  table.enter();
  table.interact('release');
  run(table);
  assert.equal(table.snapshot().stageComplete, false);
  pumpFull(table);
  table.interact('weight-right');
  table.interact('release');
  run(table);
  assert.equal(table.snapshot().stageComplete, false);
  assert.equal(table.snapshot().weight, 'right');
});

test('a failed run leaves persistent physical evidence for the next plan', () => {
  const table = createMechanicalTable({ phase: 4 });
  table.enter();
  table.interact('release');
  run(table);
  assert.equal(table.snapshot().result, null);
  assert.equal(table.snapshot().lastObservation, 'underpowered');
  assert.equal(table.snapshot().attemptCount, 1);
  pumpFull(table);
  assert.equal(table.snapshot().lastObservation, 'underpowered');
});

test('IV makes pressure and load visibly balance before release', () => {
  const table = createMechanicalTable({ phase: 4 });
  table.enter();
  table.interact('pump');
  assert.equal(table.snapshot().balance.aligned, true);
  assert.equal(table.snapshot().balance.launchReady, false);
  table.interact('pump');
  assert.equal(table.snapshot().balance.aligned, false);
  table.interact('weight-center');
  assert.equal(table.snapshot().balance.aligned, true);
  assert.equal(table.snapshot().balance.launchReady, true);
});

test('IV completes only after a charged and mechanically aligned release', () => {
  const table = createMechanicalTable({ phase: 4 });
  table.enter();
  pumpFull(table);
  table.interact('weight-center');
  table.interact('release');
  run(table, MECHANICAL_TABLE_TUNING.rollMs);
  assert.equal(table.snapshot().stageComplete, true);
  assert.ok(table.drainEvents().some((event) => event.type === 'stage-complete'));
});

test('V makes the player prove A before the broken B bridge can be connected', () => {
  const table = createMechanicalTable({ phase: 5 });
  table.enter();
  table.interact('bridge');
  assert.equal(table.snapshot().bridgeConnected, false);
  pumpFull(table);
  table.interact('release');
  run(table);
  assert.equal(table.snapshot().referencePassed, true);
  pumpFull(table);
  table.interact('route');
  table.interact('release');
  run(table);
  assert.equal(table.snapshot().breakObserved, true);
  table.interact('bridge');
  assert.equal(table.snapshot().bridgeConnected, true);
});

test('V completes only after A reference, B break, bridge, and B proof', () => {
  const table = createMechanicalTable({ phase: 5 });
  table.enter();
  pumpFull(table);
  table.interact('release');
  run(table);
  pumpFull(table);
  table.interact('route');
  table.interact('release');
  run(table);
  table.interact('bridge');
  pumpFull(table);
  table.interact('release');
  run(table, MECHANICAL_TABLE_TUNING.rollMs);
  assert.equal(table.snapshot().stageComplete, true);
});

test('VI consumes player trace when valid and recovers from a mistimed release', () => {
  const trace = [{ t: 0, x: 0 }, { t: 2200, x: 0.45 }, { t: 4800, x: 1 }];
  const table = createMechanicalTable({ phase: 6, trace });
  table.enter();
  assert.equal(table.snapshot().ghost.traceSource, 'player');
  pumpFull(table);
  table.interact('weight-right');
  table.interact('route');
  table.interact('release');
  run(table);
  assert.equal(table.snapshot().stageComplete, false);
  assert.equal(table.snapshot().bearing, null);
});

test('IV exports a replayable trace even when the player moves the weight immediately', () => {
  const table = createMechanicalTable({ phase: 4 });
  table.enter();
  table.interact('weight-right');
  const trace = table.exportTrace();
  assert.equal(trace.at(-1).x, 1);
  assert.ok(trace.at(-1).t >= 1600);
  const sequel = createMechanicalTable({ phase: 6, trace });
  sequel.enter();
  assert.equal(sequel.snapshot().ghost.traceSource, 'player');
});

test('VI can be solved by releasing so the present bearing arrives with the past bearing', () => {
  const table = createMechanicalTable({ phase: 6 });
  table.enter();
  pumpFull(table);
  table.interact('weight-right');
  table.interact('route');
  // arrival = launch progress + 1450/4800; target = .62
  const launchAt = (MECHANICAL_TABLE_TUNING.couplingProgress
    - MECHANICAL_TABLE_TUNING.rollMs / MECHANICAL_TABLE_TUNING.canonicalLoopMs + 1) % 1;
  table.update(launchAt * MECHANICAL_TABLE_TUNING.canonicalLoopMs);
  table.interact('release');
  run(table, MECHANICAL_TABLE_TUNING.rollMs);
  assert.equal(table.snapshot().stageComplete, true);
});

test('VI exposes a physical launch cam exactly one travel time before coupling', () => {
  const table = createMechanicalTable({ phase: 6 });
  table.enter();
  const ghost = table.snapshot().ghost;
  const expected = (MECHANICAL_TABLE_TUNING.couplingProgress
    - MECHANICAL_TABLE_TUNING.rollMs / MECHANICAL_TABLE_TUNING.canonicalLoopMs
    + 1) % 1;
  assert.ok(Math.abs(ghost.releaseProgress - expected) < 1e-9);
  table.update(expected * MECHANICAL_TABLE_TUNING.canonicalLoopMs);
  assert.equal(table.snapshot().ghost.releaseWindowActive, true);
});

test('reset restores exact entry state', () => {
  const table = createMechanicalTable({ phase: 5 });
  table.enter();
  pumpFull(table);
  table.interact('route');
  table.reset();
  assert.deepEqual(table.snapshot(), createMechanicalTable({ phase: 5 }).snapshot());
});
