import test from 'node:test';
import assert from 'node:assert/strict';
import { ACT05 } from '../../src/chapters/nightService/acts/act05.js';
import { ACTS, CHECKPOINT_ACTS, startCarry } from '../../src/chapters/nightService/acts/index.js';
import { createPanelModel, validateAct } from '../../src/chapters/nightService/panelModel.js';
import { apply, availableActions, record, settle, solveBfs } from './helpers.mjs';

const fresh = () => createPanelModel(ACT05, { carry: startCarry('act05') });
const LEFT = 0;
const RIGHT = 1;

test('Act 0.5 is two windows, starting in the wrong order', () => {
  assert.deepEqual(validateAct(ACT05), []);
  assert.equal(ACTS.act05, ACT05);
  assert.equal(CHECKPOINT_ACTS['chapter-1-act-05'], 'act05');
  const model = fresh();
  assert.equal(model.layout.cols, 2);
  assert.equal(model.layout.rows, 1);
  assert.deepEqual(model.state.slots, ['door', 'desk']);
  assert.equal(model.findLink('desk', 'door', 'floor'), null);
  // the only possible move is the swap
  assert.deepEqual(availableActions(model), [{ kind: 'swap', a: LEFT, b: RIGHT }]);
  // both floors run into the carriage wall: a boundary shimmer on each
  const floors = model.mismatches().filter((m) => m.type === 'floor');
  assert.deepEqual(floors.map((m) => `${m.tile}:${m.side}:${m.reason}`).sort(), ['desk:right:boundary', 'door:left:boundary']);
});

test('Act 0.5 puzzle 1: swap, and Butch walks across to the locked stores door', () => {
  const model = fresh();
  assert.ok(model.swap(LEFT, RIGHT));
  assert.ok(model.findLink('desk', 'door', 'floor'));
  settle(model);
  assert.equal(model.state.actors.butch.tile, 'door');
  assert.ok(model.hasFlag('butchAtStores'));
  assert.equal(model.textState().step, 'carrier');
});

test('Act 0.5 puzzle 2: zoom level changes which edges meet — only both close-ups, door left', () => {
  const model = createPanelModel(ACT05, { carry: startCarry('act05'), step: 'carrier' });
  // [desk | door] zoomed out: the key line leaves each picture on the far side
  assert.deepEqual(model.state.slots, ['door', 'desk'].reverse());
  assert.equal(model.findLink('door', 'desk', 'wire'), null);
  // swap only (both zoomed out): the wires face each other at different heights
  model.swap(LEFT, RIGHT);
  settle(model);
  assert.equal(model.findLink('door', 'desk', 'wire'), null);
  assert.ok(model.mismatches().some((m) => m.type === 'wire' && m.reason === 'offset'), 'an offset shimmer shows why');
  // zoom one only: still offset
  assert.ok(model.zoomIn('desk', 'keys'));
  assert.equal(model.findLink('door', 'desk', 'wire'), null);
  assert.ok(model.mismatches().some((m) => m.type === 'wire' && m.reason === 'offset'));
  model.zoomOut('desk');
  assert.ok(model.zoomIn('door', 'lock'));
  assert.equal(model.findLink('door', 'desk', 'wire'), null);
  // both zoomed in, but in the order puzzle 1 made: wires run into the wall
  model.swap(LEFT, RIGHT);
  assert.ok(model.zoomIn('desk', 'keys'));
  assert.deepEqual(model.state.slots, ['desk', 'door']);
  assert.equal(model.findLink('door', 'desk', 'wire'), null);
  assert.ok(model.mismatches().filter((m) => m.type === 'wire').every((m) => m.reason === 'boundary'));
  // both zoomed in, door left of the office: the carrier runs
  const log = record(model);
  model.swap(LEFT, RIGHT);
  assert.ok(model.findLink('door', 'desk', 'wire'));
  settle(model);
  assert.ok(model.hasFlag('keySent') && model.hasFlag('unlocked'));
  assert.equal(model.state.tiles.door.state, 'open');
  assert.equal(model.state.tiles.desk.state, 'office', 'both close-ups step back');
  const fx = log.filter(([n]) => n === 'fx').map(([, p]) => p.name);
  assert.deepEqual(fx, ['carrier', 'keyTurn', 'deskBell']);
  assert.equal(model.textState().step, 'home');
});

test('Act 0.5 is solvable only by combining the two verbs', () => {
  // swaps alone never open the door
  const swaps = createPanelModel(ACT05, { carry: startCarry('act05'), step: 'carrier' });
  for (let i = 0; i < 4; i += 1) { swaps.swap(LEFT, RIGHT); settle(swaps); }
  assert.equal(swaps.hasFlag('keySent'), false);
  // zooms alone, in the arrangement puzzle 1 leaves, never open it either
  const zooms = createPanelModel(ACT05, { carry: startCarry('act05'), step: 'carrier' });
  zooms.zoomIn('desk', 'keys');
  zooms.zoomIn('door', 'lock');
  settle(zooms);
  assert.equal(zooms.hasFlag('keySent'), false);
  zooms.zoomOut('desk');
  zooms.zoomOut('door');
  settle(zooms);
  assert.equal(zooms.hasFlag('keySent'), false);
});

test('Act 0.5: the full solve — swap, zoom + swap, swap home; the wall grows into Act 1', () => {
  const model = fresh();
  const log = record(model);
  model.swap(LEFT, RIGHT);
  settle(model);
  model.zoomIn('desk', 'keys');
  model.zoomIn('door', 'lock');
  model.swap(LEFT, RIGHT);
  settle(model);
  assert.equal(model.state.actors.butch.facing, -1, 'the counter bell: he turns toward the desk');
  assert.ok(model.swap(LEFT, RIGHT));
  settle(model);
  const butch = model.state.actors.butch;
  assert.equal(butch.tile, 'desk');
  assert.equal(butch.pose, 'idle', 'home at the desk, awake');
  assert.equal(model.state.tiles.door.state, 'stores', 'through the open door: the pigeonholes');
  assert.deepEqual(model.state.ended, { kind: 'nextAct', next: 'act1' });
  assert.deepEqual(log.filter(([n]) => n === 'checkpoint').map(([, p]) => p.id), ['chapter-1-act-1']);
  assert.deepEqual(model.carry().slots, ['desk', 'door'], 'desk and stores above the two new windows');
});

test('Act 0.5: dev ?step= jumps land in consistent states', () => {
  const carrier = createPanelModel(ACT05, { step: 'carrier' });
  assert.equal(carrier.state.actors.butch.tile, 'door');
  assert.ok(carrier.hasFlag('butchAtStores'));
  const home = createPanelModel(ACT05, { step: 'home' });
  assert.equal(home.state.tiles.door.state, 'open');
  assert.equal(home.textState().step, 'home');
});

test('Act 0.5: no dead ends — every reachable state can still finish (BFS)', () => {
  let seed = 5150;
  const random = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
  for (let trial = 0; trial < 16; trial += 1) {
    const model = fresh();
    const moves = 1 + Math.floor(random() * 12);
    for (let i = 0; i < moves && !model.state.ended; i += 1) {
      const actions = availableActions(model);
      if (!actions.length) break;
      apply(model, actions[Math.floor(random() * actions.length)]);
      settle(model);
    }
    if (model.state.ended) continue;
    const solution = solveBfs(ACT05, model.snapshot(), { maxStates: 3000 });
    assert.ok(solution, `trial ${trial} stranded at ${JSON.stringify(model.state.slots)} step ${model.textState().step}`);
  }
  // the shortest solve: three swaps and two zooms, both verbs required
  const best = solveBfs(ACT05, fresh().snapshot()).map((a) => a.kind);
  assert.equal(best.length, 5);
  assert.equal(best.filter((k) => k === 'swap').length, 3);
  assert.equal(best.filter((k) => k === 'hotspot').length, 2);
});
