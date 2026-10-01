import test from 'node:test';
import assert from 'node:assert/strict';
import { ACT3, SAFE_FAR, SAFE_NEAR, TRAIN_LENGTH } from '../../src/chapters/nightService/acts/act3.js';
import { ACTS, startCarry } from '../../src/chapters/nightService/acts/index.js';
import { GAP_SPAN, HEDGE, RAIL_AT } from '../../src/chapters/nightService/art/act3Art.js';
import { createPanelModel, validateAct } from '../../src/chapters/nightService/panelModel.js';
import { apply, availableActions, record, settle } from './helpers.mjs';

const TARGET = ['city', 'hawthorn', 'orchard', 'carriage', 'gap', 'platform'];
const fresh = () => createPanelModel(ACT3, { carry: startCarry('act3') });

function lensOnGap(model) {
  const r = model.slotRect('gap');
  model.moveLens(r.x + r.w * 0.5, r.y + r.h * RAIL_AT);
}

/** Hold 1978 over the lane's joint (the hedge is an open gate there). */
function lensOnHedge(model) {
  const r = model.slotRect('hawthorn');
  model.moveLens(r.x + r.w * HEDGE.lens[0], r.y + r.h * HEDGE.lens[1]);
}

function arrange(model, target = TARGET) {
  for (let i = 0; i < target.length; i += 1) {
    if (model.state.slots[i] !== target[i]) model.swap(i, model.state.slots.indexOf(target[i]));
    settle(model);
  }
}

/**
 * A goal-directed solver: from ANY reachable state it finishes the act, or
 * returns false. Act 3 has 720 layouts × zooms × frame × lens positions, too
 * many for a blind search, so the no-dead-end proof drives this strategy.
 */
function solveAct3(model) {
  for (let pass = 0; pass < 4 && !model.state.ended; pass += 1) {
    settle(model);
    if (model.floatingFrame()) model.dropFrame(null);
    if (model.state.stepIndex === 0) {
      if (model.state.tiles.orchard.state === 'overlook') model.zoomIn('orchard', 'house');
      if (model.state.frames.cityWindow.host !== 'orchard') {
        if (!model.liftFrame('cityWindow')) return false;
        model.dropFrame('orchard');
      }
      settle(model);
    }
    arrange(model);
    if (model.state.tiles.orchard.state === 'house') model.zoomOut('orchard');
    settle(model);
    if (!model.evaluate({ arrived: 'lane' }) && model.state.stepIndex > 0) {
      lensOnHedge(model);
      settle(model, { maxMs: 120000 });
    }
    lensOnGap(model);
    settle(model, { maxMs: 120000 });
  }
  return Boolean(model.state.ended);
}

test('Act 3 definition is valid, 3×2 and registered', () => {
  assert.deepEqual(validateAct(ACT3), []);
  assert.equal(ACTS.act3, ACT3);
  const model = fresh();
  assert.equal(model.layout.cols, 3);
  assert.ok(model.state.lens.enabled, 'the lens carries over from Act 2');
  assert.equal(model.state.bell, 3);
  assert.equal(model.state.tiles.orchard.state, 'house');
  assert.ok(model.canZoomOut('orchard'));
});

test('Act 3: two windows become one — Mara, card A3 with the red pencil, bell #4', () => {
  const model = fresh();
  const log = record(model);
  assert.ok(model.liftFrame('cityWindow'));
  assert.ok(model.dropFrame('orchard'));
  settle(model, { cards: false });
  assert.equal(model.state.card?.id, 'A3', 'the card pauses the scene');
  const card = log.find(([n]) => n === 'card')[1].card;
  assert.equal(card.strike, 2);
  assert.match(card.lines[card.strike], /Second claim/);
  assert.ok(card.lines.length <= 3);
  assert.equal(model.state.bell, 3);
  model.closeCard();
  settle(model);
  assert.equal(model.state.bell, 4);
  assert.equal(model.state.frames.cityWindow.host, 'city', 'the window goes back home');
  assert.ok(model.state.actors.mara.visible);
  const fx = log.filter(([n]) => n === 'fx').map(([, p]) => p.name);
  assert.deepEqual(fx.slice(0, 2), ['windowsJoin', 'maraWindow']);
});

test('Act 3: overlaying the frame on the house from the hill does nothing until zoomed in', () => {
  const model = fresh();
  model.zoomOut('orchard');
  model.liftFrame('cityWindow');
  model.dropFrame('orchard');
  settle(model);
  assert.equal(model.textState().step, 'windows');
  assert.ok(model.zoomIn('orchard', 'house'));
  settle(model);
  assert.equal(model.textState().step, 'hedge');
});

test('Act 3: Mara follows the lane only in city → hawthorn → orchard order, and only from the hill', () => {
  const model = createPanelModel(ACT3, { carry: startCarry('act3'), step: 'hedge' });
  settle(model);
  const mara = model.state.actors.mara;
  assert.equal(mara.tile, 'city');
  assert.ok(mara.blocked, 'the city room is not left of the lane yet');
  // city | hawthorn | orchard across the top, but the orchard still close-up
  arrange(model, ['city', 'hawthorn', 'orchard', 'gap', 'platform', 'carriage']);
  assert.equal(mara.tile, 'hawthorn');
  assert.ok(mara.blocked, 'the hedge: today the lane stops here');
  assert.ok(Math.abs(mara.x - HEDGE.wait) < 1e-6);
  assert.equal(model.textState().step, 'lane');
  assert.equal(model.findLink('hawthorn', 'orchard', 'path'), null, 'no lane from the close-up house, nor in the present');
  lensOnHedge(model);
  settle(model);
  assert.equal(mara.tile, 'hawthorn');
  assert.ok(mara.blocked, 'the close-up house has no lane: zoom out');
  model.zoomOut('orchard');
  settle(model);
  assert.equal(mara.tile, 'orchard');
  assert.equal(mara.state, 'overlook');
  // she waits at the top of the stair until the platform is below the hill
  assert.equal(model.evaluate({ arrived: 'lane' }), false);
  model.swap(3, 5); // carriage | platform | gap: nothing below the orchard is the platform
  model.swap(4, 5); // carriage | gap | platform
  settle(model);
  assert.ok(model.findLink('orchard', 'platform', 'stair'));
  assert.ok(model.evaluate({ arrived: 'lane' }));
});

test('Act 3: the hedge is a 1978 edge — Mara crosses only while the lens holds the joint', () => {
  const model = createPanelModel(ACT3, { carry: startCarry('act3'), step: 'hedge' });
  arrange(model);
  model.zoomOut('orchard');
  settle(model);
  const mara = model.state.actors.mara;
  assert.equal(mara.tile, 'hawthorn');
  assert.ok(mara.blocked);
  // the past-era edge lives only under the lens
  assert.equal(model.findLink('hawthorn', 'orchard', 'path'), null);
  lensOnHedge(model);
  assert.equal(model.findLink('hawthorn', 'orchard', 'path')?.era, 'past');
  // take the lens away mid-hedge: she steps back to the gap in the hedge
  for (let i = 0; i < 400 && mara.x < HEDGE.x + 0.05; i += 1) model.update(50);
  assert.equal(mara.tile, 'hawthorn');
  model.moveLens(200, 900);
  for (let i = 0; i < 200; i += 1) model.update(50);
  assert.ok(mara.blocked);
  assert.ok(Math.abs(mara.x - HEDGE.wait) < 1e-6, `she backs off to the hedge (x ${mara.x})`);
  lensOnHedge(model);
  settle(model, { maxMs: 60000 });
  assert.ok(model.evaluate({ arrived: 'lane' }));
  assert.equal(model.textState().step, 'bridge');
});

test('Act 3: the rail links only through the lens; the train stops safely if it moves', () => {
  const model = createPanelModel(ACT3, { carry: startCarry('act3'), step: 'bridge' });
  arrange(model);
  assert.equal(model.findLink('carriage', 'gap', 'rail'), null, 'present viaduct is broken');
  lensOnGap(model);
  assert.ok(model.findLink('carriage', 'gap', 'rail'));
  assert.ok(model.findLink('gap', 'platform', 'rail'));
  const train = model.state.actors.train;
  for (let i = 0; i < 400 && !(train.tile === 'gap' && train.x > 0.3); i += 1) model.update(50);
  assert.equal(train.tile, 'gap');
  model.moveLens(200, 200);
  settle(model);
  assert.equal(train.tile, 'gap');
  assert.ok(train.blocked, 'waits while 1978 is out of view');
  for (let i = 0; i < 200; i += 1) model.update(50);
  assert.ok(Math.abs(train.x - SAFE_NEAR) < 0.001, `backs off the missing span to the abutment (x ${train.x})`);
  lensOnGap(model);
  settle(model, { maxMs: 60000 });
  assert.equal(model.state.ended?.kind, 'endChapter');
});

test('Act 3: the finale does not depend on the hill staying above the platform', () => {
  const model = createPanelModel(ACT3, { carry: startCarry('act3'), step: 'bridge' });
  // bottom row right, top row scrambled after Mara reached the stair
  arrange(model, ['orchard', 'city', 'hawthorn', 'carriage', 'gap', 'platform']);
  lensOnGap(model);
  settle(model, { maxMs: 120000 });
  assert.equal(model.state.ended?.kind, 'endChapter');
  assert.equal(model.state.actors.mara.visible, false);
});

test('Act 3: full scripted solution — bell #5, memory lights, the bench, the Conductor, chapter end', () => {
  const model = fresh();
  const log = record(model);
  assert.ok(solveAct3(model));
  assert.equal(model.state.ended.kind, 'endChapter');
  assert.equal(model.state.bell, 5);
  assert.equal(model.timeOfDay(), 'deep-night');
  assert.ok(model.hasFlag('caseOnBench'));
  assert.equal(model.state.actors.mara.visible, false, 'she boarded the other train');
  assert.ok(model.state.actors.farTrain.x > 1, 'and it pulled away');
  const lines = log.filter(([n]) => n === 'dialogue').map(([, p]) => p.line.text);
  assert.deepEqual(lines, ['She\'s always one stop ahead.', 'The line keeps going.']);
  assert.ok(log.some(([n, p]) => n === 'fx' && p.name === 'memoryLights'));
  const bells = log.filter(([n]) => n === 'bell');
  assert.ok(bells.at(-1)[1].memory.some((m) => m.type === 'rail'), 'the bell remembers the line');
  assert.ok(log.some(([n]) => n === 'chapter:end'));
});

test('Act 3: carries the whole chapter memory from Acts 1–2 into the finale', () => {
  const carry = { ...startCarry('act3'), linkHistory: [{ key: 'desk|door|floor', a: 'desk', b: 'door', type: 'floor' }, { key: 'rack|aisle|drop', a: 'rack', b: 'aisle', type: 'drop' }] };
  const model = createPanelModel(ACT3, { carry });
  const log = record(model);
  assert.ok(solveAct3(model));
  const finale = log.filter(([n]) => n === 'bell').at(-1)[1];
  assert.ok(finale.memory.some((m) => m.type === 'floor') && finale.memory.some((m) => m.type === 'drop'));
});

test('Act 3: no dead ends — from random reachable states the strategy still finishes', () => {
  let seed = 98765;
  const random = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
  for (let trial = 0; trial < 30; trial += 1) {
    const model = fresh();
    const moves = 3 + Math.floor(random() * 22);
    for (let i = 0; i < moves && !model.state.ended; i += 1) {
      if (random() < 0.2 && model.state.lens.enabled && !model.isLocked()) {
        model.moveLens(random() * 1920, random() * 1080);
      } else {
        const actions = availableActions(model);
        if (!actions.length) break;
        apply(model, actions[Math.floor(random() * actions.length)]);
      }
      if (random() < 0.6) settle(model);
    }
    const snap = JSON.stringify(model.textState().grid.slots);
    assert.ok(solveAct3(model), `trial ${trial} stranded at ${snap} step ${model.textState().step}`);
  }
});
