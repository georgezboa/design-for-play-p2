import test from 'node:test';
import assert from 'node:assert/strict';
import { ACT0 } from '../../src/chapters/nightService/acts/act0.js';
import { ACTS, CHECKPOINT_ACTS, FIRST_ACT, startCarry } from '../../src/chapters/nightService/acts/index.js';
import { CARRIAGE_TILE, createPanelModel, validateAct } from '../../src/chapters/nightService/panelModel.js';
import { apply, availableActions, record, settle, solveBfs } from './helpers.mjs';

const fresh = () => createPanelModel(ACT0, { carry: startCarry('act0') });
const kinds = (model) => availableActions(model).map((a) => (a.kind === 'hotspot' ? `${a.tile}.${a.id}` : a.kind));

function solveAct0(model) {
  assert.ok(model.zoomIn('office', 'bell'));
  settle(model);
  assert.ok(model.activateHotspot('office', 'strike'));
  settle(model);
  assert.ok(model.zoomOut('office'));
  settle(model);
  assert.ok(model.zoomIn('office', 'ticket'));
  settle(model);
  assert.ok(model.zoomIn('office', 'hole'));
  settle(model);
  assert.ok(model.zoomIn('office', 'glass'));
  settle(model);
}

test('Act 0 is one carriage window, registered as the chapter start', () => {
  assert.deepEqual(validateAct(ACT0), []);
  assert.equal(ACTS.act0, ACT0);
  assert.equal(FIRST_ACT, 'act0');
  assert.equal(CHECKPOINT_ACTS['chapter-1-start'], 'act0');
  assert.equal(ACT0.checkpoint, 'chapter-1-start');
  const model = fresh();
  assert.equal(model.layout.cols * model.layout.rows, 1);
  assert.equal(model.layout.tileW, CARRIAGE_TILE.w, 'the same window size as Act 1: the wall can grow around it');
  assert.equal(model.layout.tileH, CARRIAGE_TILE.h);
  assert.equal(model.state.actors.butch.pose, 'sleep');
});

test('Act 0: one move at a time — the bell, then its plunger, then stepping back', () => {
  const model = fresh();
  assert.deepEqual(kinds(model), ['office.bell'], 'only the desk bell at first (the stub waits for Butch)');
  model.zoomIn('office', 'bell');
  settle(model);
  assert.deepEqual(kinds(model), ['office.strike'], 'inside the bell the plunger is the only thing to do');
  assert.equal(model.canZoomOut('office'), false);
  const log = record(model);
  model.activateHotspot('office', 'strike');
  settle(model);
  assert.ok(log.some(([n, p]) => n === 'fx' && p.name === 'bellRing'));
  assert.ok(log.some(([n, p]) => n === 'sfx' && p.name === 'deskBell'));
  assert.deepEqual(kinds(model), ['zoomOut'], 'the zoom-out lesson: nothing else is possible');
  assert.equal(model.textState().step, 'wake');
  model.zoomOut('office');
  settle(model);
  assert.equal(model.state.actors.butch.pose, 'sit', 'the ring woke him: he sits up');
  assert.ok(model.hasFlag('butchAwake'));
  assert.deepEqual(kinds(model), ['office.ticket'], 'the bell is done; the claim stub is next');
});

test('Act 0: stub 1978-0412 → the punch hole → a porthole → the whole carriage; the wall grows', () => {
  const model = fresh();
  const log = record(model);
  solveAct0(model);
  assert.equal(model.state.tiles.office.state, 'inside', 'the view dives back in through the lit window');
  assert.deepEqual(model.state.tiles.office.zoomStack.map((z) => z.state), ['office', 'ticket', 'porthole', 'carriage']);
  assert.deepEqual(model.state.ended, { kind: 'nextAct', next: 'act05' });
  assert.deepEqual(log.filter(([n]) => n === 'checkpoint').map(([, p]) => p.id), ['chapter-1-act-05']);
  assert.ok(log.some(([n, p]) => n === 'fx' && p.name === 'litWindow'));
  assert.equal(model.state.actors.butch.state, 'inside');
  assert.equal(model.carry().bell, 0, 'the desk bell is not the chapter bell');
  assert.deepEqual(model.carry().slots, ['office']);
});

test('Act 0: the zoom rect of each picture is an even square (panel aspect)', () => {
  const office = ACT0.tiles.office.states;
  const rects = [
    office.office.hotspots.find((h) => h.id === 'bell').zoomRect,
    office.office.hotspots.find((h) => h.id === 'ticket').zoomRect,
    office.ticket.hotspots[0].zoomRect,
    office.porthole.hotspots[0].rect,
  ];
  rects.forEach((r) => assert.ok(Math.abs(r[2] - r[3]) < 1e-9, JSON.stringify(r)));
});

test('Act 0: dev ?step= jumps land in consistent states', () => {
  for (const step of ['ring', 'wake', 'stub', 'porthole', 'carriage']) {
    const model = createPanelModel(ACT0, { carry: startCarry('act0'), step });
    assert.equal(model.textState().step, step, step);
  }
  assert.equal(createPanelModel(ACT0, { step: 'stub' }).state.tiles.office.state, 'office');
  assert.equal(createPanelModel(ACT0, { step: 'carriage' }).state.tiles.office.state, 'porthole');
});

test('Act 0: no dead ends — every reachable state can still finish (BFS)', () => {
  let seed = 1234;
  const random = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
  for (let trial = 0; trial < 12; trial += 1) {
    const model = fresh();
    const moves = 1 + Math.floor(random() * 9);
    for (let i = 0; i < moves && !model.state.ended; i += 1) {
      const actions = availableActions(model);
      if (!actions.length) break;
      apply(model, actions[Math.floor(random() * actions.length)]);
      settle(model);
    }
    if (model.state.ended) continue;
    const solution = solveBfs(ACT0, model.snapshot(), { maxStates: 2000 });
    assert.ok(solution, `trial ${trial} stranded at step ${model.textState().step}`);
  }
  assert.ok(solveBfs(ACT0, fresh().snapshot()).length <= 6, 'six clicks at best');
});
