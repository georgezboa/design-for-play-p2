import test from 'node:test';
import assert from 'node:assert/strict';
import { ACT2 } from '../../src/chapters/nightService/acts/act2.js';
import { ACTS, startCarry } from '../../src/chapters/nightService/acts/index.js';
import { createPanelModel, validateAct } from '../../src/chapters/nightService/panelModel.js';
import { apply, availableActions, record, settle, solveBfs } from './helpers.mjs';

const TL = 0; const TR = 1; const BL = 2; const BR = 3;
const fresh = () => createPanelModel(ACT2, { carry: startCarry('act2') });

/** Put the lens over a tile-local point. */
function lensAt(model, tile, u, v) {
  const r = model.slotRect(tile);
  model.moveLens(r.x + u * r.w, r.y + v * r.h);
}

function punch(model) {
  assert.ok(model.activateHotspot('aisle', 'ticket'));
  settle(model);
}

function markThroughLens(model) {
  const h = model.hotspots('rack').find((x) => x.id === 'bellwether');
  lensAt(model, 'rack', h.rect[0] + h.rect[2] / 2, h.rect[1] + h.rect[3] / 2);
  assert.ok(model.activateHotspot('rack', 'bellwether'));
  settle(model);
}

function toOrchard(model) {
  assert.ok(model.zoomIn('rack', 'caseTag'));
  assert.ok(model.zoomIn('rack', 'postcard'));
  settle(model);
}

function frameOntoOrchard(model) {
  assert.ok(model.liftFrame('windowFrame'));
  assert.ok(model.dropFrame('rack'));
  settle(model);
}

test('Act 2 definition is valid and registered', () => {
  assert.deepEqual(validateAct(ACT2), []);
  assert.equal(ACTS.act2, ACT2);
  assert.deepEqual(startCarry('act2').items, ['punch']);
});

test('Act 2: only the ticket can be acted on at first; nothing lifts, no lens', () => {
  const model = fresh();
  const hotspots = availableActions(model).filter((a) => a.kind !== 'swap');
  assert.deepEqual(hotspots, [{ kind: 'hotspot', tile: 'aisle', id: 'ticket', era: 'present' }]);
  assert.equal(model.state.lens.enabled, false);
  assert.equal(model.canLiftFrame('windowFrame'), false);
  assert.equal(model.state.actors.butch.pose, 'ticket');
});

test('Act 2: punching the ticket makes the lens (bell #2); the only new act is through it', () => {
  const model = fresh();
  const log = record(model);
  punch(model);
  assert.ok(model.state.lens.enabled);
  assert.ok(model.hasItem('lens'));
  assert.equal(model.state.bell, 2);
  assert.ok(log.some(([n, p]) => n === 'fx' && p.name === 'punchPop'));
  // the lens starts over the aisle, not over the rack
  const lens = model.state.lens;
  const aisle = model.slotRect('aisle');
  assert.ok(lens.y > aisle.y && lens.x > aisle.x);
  const hot = availableActions(model).filter((a) => a.kind === 'hotspot');
  assert.deepEqual(hot.map((a) => `${a.tile}.${a.id}`), ['rack.bellwether']);
  // present click on the tag does nothing: it is only readable in 1978
  const h = model.hotspots('rack').find((x) => x.id === 'bellwether');
  assert.equal(model.clickTile('rack', h.rect[0] + 0.05, h.rect[1] + 0.05), false);
});

test('Act 2: full scripted solution through to the act-3 checkpoint (without the stone)', () => {
  const model = fresh();
  const log = record(model);
  punch(model);
  markThroughLens(model);
  assert.ok(model.hasFlag('orchardMarked'));
  assert.equal(model.canLiftFrame('windowFrame'), false, 'the frame waits for the orchard');
  toOrchard(model);
  assert.equal(model.state.tiles.rack.state, 'orchard');
  assert.ok(model.canLiftFrame('windowFrame'));
  frameOntoOrchard(model);
  assert.equal(model.state.tiles.board.state, 'arrived');
  assert.equal(model.state.tiles.rack.state, 'tilting');
  assert.equal(model.state.tiles.rack.zoomStack.length, 0);
  assert.equal(model.state.frames.windowFrame.host, 'window', 'frame goes home after the stop');
  // rack is still above the aisle: the case falls straight into Butch's arms
  assert.ok(model.hasFlag('caseInArms'));
  assert.equal(model.state.actors.butch.carrying, 'case');
  assert.equal(model.state.bell, 3);
  // look inside once, then back out: the act ends
  assert.ok(model.zoomIn('aisle', 'case'));
  settle(model);
  assert.equal(model.state.ended, null);
  assert.ok(model.zoomOut('aisle'));
  settle(model);
  assert.deepEqual(model.state.ended, { kind: 'nextAct', next: 'act3' });
  assert.deepEqual(log.filter(([n]) => n === 'checkpoint').map(([, p]) => p.id), ['chapter-1-act-3']);
  const fx = log.filter(([n]) => n === 'fx').map(([, p]) => p.name);
  ['punchPop', 'markCase', 'arrive', 'drift', 'caseDrop', 'fadeAll'].forEach((name) => assert.ok(fx.includes(name), name));
  assert.deepEqual(model.carry().items, ['punch', 'lens']);
  assert.equal(model.carry().bell, 3);
});

test('Act 2: the case waits at the drop point until the rack is above the aisle', () => {
  const model = fresh();
  punch(model);
  markThroughLens(model);
  toOrchard(model);
  // move the aisle away from under the rack before the train stops
  model.swap(BL, BR);
  frameOntoOrchard(model);
  assert.ok(model.hasFlag('caseAtEdge'));
  assert.equal(model.hasFlag('caseInArms'), false);
  assert.equal(model.textState().step, 'firstWeight');
  assert.ok(model.mismatches().some((m) => m.tile === 'rack' && m.type === 'drop'));
  model.swap(BR, BL);
  settle(model);
  assert.ok(model.hasFlag('caseInArms'));
});

test('Act 2: the frame dropped early elsewhere, or on the tag, still works when the orchard shows', () => {
  const model = fresh();
  punch(model);
  markThroughLens(model);
  toOrchard(model);
  model.liftFrame('windowFrame');
  model.dropFrame('board');
  assert.equal(model.overlayOn('board'), 'windowFrame');
  assert.equal(model.hasFlag('caseAtEdge'), false);
  model.zoomOut('rack');
  // lift it off the board and put it on the rack while it shows the tag
  model.liftFrame('windowFrame');
  model.dropFrame('rack');
  settle(model);
  assert.equal(model.hasFlag('caseAtEdge'), false);
  model.zoomIn('rack', 'postcard');
  settle(model);
  assert.ok(model.hasFlag('caseInArms'));
});

test('Act 2: the optional Ember Stone — open case, letter A2, beneath the letter', () => {
  const model = createPanelModel(ACT2, { carry: startCarry('act2'), step: 'end' });
  const log = record(model);
  assert.ok(model.zoomIn('aisle', 'case'));
  assert.ok(model.zoomIn('aisle', 'letter'));
  assert.ok(model.activateHotspot('aisle', 'read'));
  const card = log.find(([n]) => n === 'card')[1];
  assert.equal(card.id, 'A2');
  assert.ok(card.card.lines.length <= 3);
  model.closeCard();
  assert.ok(model.zoomIn('aisle', 'beneath'));
  assert.ok(model.activateHotspot('aisle', 'ember'));
  settle(model);
  assert.ok(model.hasFlag('stone:chapter-1'));
  assert.ok(log.some(([n, p]) => n === 'stone' && p.id === 'chapter-1'));
  assert.equal(model.hotspots('aisle').find((h) => h.id === 'ember').enabled, false);
  // back out three levels: the act ends, and the stone travels on
  model.zoomOut('aisle');
  model.zoomOut('aisle');
  model.zoomOut('aisle');
  settle(model);
  assert.equal(model.state.ended?.next, 'act3');
  assert.deepEqual(model.carry().flags, ['stone:chapter-1']);
});

test('Act 2: dev ?step= jumps produce consistent worlds', () => {
  for (const step of ['mark', 'orchard', 'arrive', 'firstWeight', 'end']) {
    const model = createPanelModel(ACT2, { carry: startCarry('act2'), step });
    // a jump may run straight on when its trigger already holds (firstWeight)
    const at = ACT2.steps.findIndex((x) => x.id === step);
    assert.ok(model.state.stepIndex >= at, step);
    assert.ok(model.state.lens.enabled, `${step}: lens`);
  }
  const arrive = createPanelModel(ACT2, { carry: startCarry('act2'), step: 'arrive' });
  assert.equal(arrive.state.tiles.rack.state, 'orchard');
  assert.ok(arrive.canLiftFrame('windowFrame'));
});

test('Act 2: no dead ends — random reachable states can still finish the act', () => {
  let seed = 4321;
  const random = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
  for (let trial = 0; trial < 14; trial += 1) {
    const model = fresh();
    const moves = 2 + Math.floor(random() * 14);
    for (let i = 0; i < moves && !model.state.ended; i += 1) {
      const actions = availableActions(model);
      if (!actions.length) break;
      apply(model, actions[Math.floor(random() * actions.length)]);
      settle(model);
    }
    settle(model);
    if (model.state.ended) continue;
    const solution = solveBfs(ACT2, model.snapshot(), { maxStates: 6000 });
    assert.ok(solution, `trial ${trial} stranded at ${JSON.stringify(model.textState().grid.slots)} step ${model.textState().step}`);
  }
});
