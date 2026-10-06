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

/** The first lens click: REQUEST STOP on the 1978 board. */
function requestStop(model) {
  const h = model.hotspots('board').find((x) => x.id === 'request');
  lensAt(model, 'board', h.rect[0] + h.rect[2] / 2, h.rect[1] + h.rect[3] / 2);
  assert.ok(model.activateHotspot('board', 'request'));
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
  // the lens-click lesson comes first, on the big REQUEST STOP plate
  // (`quiet` hotspots only answer a wrong guess: they never advance anything)
  const quiet = (a) => model.hotspots(a.tile).find((h) => h.id === a.id)?.quiet;
  const hot = availableActions(model).filter((a) => a.kind === 'hotspot' && !quiet(a));
  assert.deepEqual(hot.map((a) => `${a.tile}.${a.id}`), ['board.request']);
  const plate = model.hotspots('board').find((x) => x.id === 'request');
  // today's plate, outside the lens: it answers where it still works
  const said = record(model);
  assert.ok(model.clickTile('board', plate.rect[0] + 0.05, plate.rect[1] + 0.05));
  settle(model);
  assert.equal(model.hasFlag('stopRequested'), false, 'only in 1978 light');
  assert.match(said.find(([n]) => n === 'caption')[1].text, /1978/);
  requestStop(model);
  assert.ok(model.hasFlag('stopRequested'));
  assert.equal(model.state.tiles.board.state, 'requested');
  // then the second use of the verb: the BELLWETHER tag
  const next = availableActions(model).filter((a) => a.kind === 'hotspot');
  assert.deepEqual(next.map((a) => `${a.tile}.${a.id}`), ['rack.bellwether']);
  // present click on the tag does nothing: it is only readable in 1978
  const h = model.hotspots('rack').find((x) => x.id === 'bellwether');
  assert.equal(model.clickTile('rack', h.rect[0] + 0.05, h.rect[1] + 0.05), false);
});

test('Act 2: the frame over the orchard is not an arrival until the stop is requested', () => {
  const model = createPanelModel(ACT2, { carry: startCarry('act2'), step: 'orchard' });
  // a dev jump past the request would set it; clear it to test the gate itself
  model.state.flags = model.state.flags.filter((f) => f !== 'stopRequested');
  toOrchard(model);
  frameOntoOrchard(model);
  assert.equal(model.hasFlag('caseAtEdge'), false);
  assert.equal(model.textState().step, 'arrive');
  assert.equal(model.evaluate({ overlay: { frame: 'windowFrame', onto: 'rack', ontoState: 'orchard' } }), true);
});

test('Act 2: full scripted solution through to the act-3 checkpoint (without the stone)', () => {
  const model = fresh();
  const log = record(model);
  punch(model);
  requestStop(model);
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
  // the rack starts beside the window, not over the aisle: the case waits at
  // the edge until the player carries the rack over Butch's arms (alpha R4)
  assert.ok(model.hasFlag('caseAtEdge'));
  assert.equal(model.hasFlag('caseInArms'), false);
  assert.equal(model.textState().step, 'firstWeight');
  model.swap(TL, TR);
  settle(model);
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
  ['punchPop', 'requestStop', 'markCase', 'arrive', 'drift', 'caseDrop', 'fadeAll'].forEach((name) => assert.ok(fx.includes(name), name));
  assert.deepEqual(model.carry().items, ['punch', 'lens']);
  assert.equal(model.carry().bell, 3);
});

test('Act 2: the case waits at the drop point until the rack is above the aisle', () => {
  const model = fresh();
  punch(model);
  requestStop(model);
  markThroughLens(model);
  toOrchard(model);
  // the act starts with the rack over the board (TR), not over the aisle
  assert.deepEqual(model.state.slots, ['window', 'rack', 'aisle', 'board']);
  assert.equal(model.evaluate({ above: { a: 'rack', b: 'aisle' } }), false);
  frameOntoOrchard(model);
  assert.ok(model.hasFlag('caseAtEdge'));
  assert.equal(model.hasFlag('caseInArms'), false);
  assert.equal(model.textState().step, 'firstWeight');
  assert.ok(model.mismatches().some((m) => m.tile === 'rack' && m.type === 'drop'));
  model.swap(TL, TR);
  settle(model);
  assert.ok(model.hasFlag('caseInArms'));
});

test('Act 2: the frame dropped early elsewhere, or on the tag, still works when the orchard shows', () => {
  const model = fresh();
  punch(model);
  requestStop(model);
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
  assert.ok(model.hasFlag('caseAtEdge'));
  model.swap(TL, TR);
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
  assert.ok(model.hasFlag('stone:chapter-1'));
  assert.ok(log.some(([n, p]) => n === 'stone' && p.id === 'chapter-1'));
  // taking the stone ends the act: the scene steps all three levels back out
  // by itself (no silent three-level zoom-out for the player), and the stone travels on
  settle(model);
  assert.equal(log.filter(([n, p]) => n === 'zoom' && p.dir === 'out').length, 3);
  assert.equal(model.state.tiles.aisle.state, 'aisle');
  assert.equal(model.state.ended?.next, 'act3');
  assert.deepEqual(model.carry().flags, ['stone:chapter-1']);
});

test('Act 2 end (alpha #5): closing the case once ends the act, however deep the player went', () => {
  // straight back out of the open case
  const shallow = createPanelModel(ACT2, { carry: startCarry('act2'), step: 'end' });
  assert.ok(shallow.zoomIn('aisle', 'case'));
  settle(shallow);
  assert.equal(shallow.state.ended, null, 'looking inside does not end it');
  assert.ok(shallow.zoomOut('aisle'));
  settle(shallow);
  assert.equal(shallow.state.ended?.next, 'act3');
  // from the letter: reading it keeps the act open (the stone is still below it) ...
  const deep = createPanelModel(ACT2, { carry: startCarry('act2'), step: 'end' });
  deep.zoomIn('aisle', 'case');
  deep.zoomIn('aisle', 'letter');
  deep.activateHotspot('aisle', 'read');
  settle(deep);
  assert.equal(deep.state.ended, null);
  assert.ok(deep.hotspots('aisle').find((h) => h.id === 'beneath').enabled, 'the stone can still be found');
  // ... and one step back out (the case closes) finishes it, the scene doing the rest
  assert.ok(deep.zoomOut('aisle'));
  settle(deep);
  assert.equal(deep.state.tiles.aisle.state, 'aisle');
  assert.equal(deep.state.ended?.next, 'act3');
  // the ⤢ glyph is cued once the letter has been seen
  const end = ACT2.steps.find((x) => x.id === 'end');
  assert.deepEqual(end.hint.zoomOutCue, { hotspot: 'aisle.letter' });
});

test('Act 2: dev ?step= jumps produce consistent worlds', () => {
  for (const step of ['stop', 'mark', 'orchard', 'arrive', 'firstWeight', 'end']) {
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

test('Act 2 (alpha R4): the rack tag through the lens before the stop says why not, and SHOW ME moves on to it after', async () => {
  const { pickGesture } = await import('../../src/chapters/nightService/hints.js');
  const model = fresh();
  punch(model);
  const early = model.hotspots('rack').find((x) => x.id === 'bellwetherEarly');
  assert.ok(early.enabled && early.quiet && early.era === 'past');
  lensAt(model, 'rack', early.rect[0] + early.rect[2] / 2, early.rect[1] + early.rect[3] / 2);
  const log = record(model);
  const r = model.slotRect('rack');
  const u = early.rect[0] + early.rect[2] / 2;
  const v = early.rect[1] + early.rect[3] / 2;
  assert.ok(model.clickTile('rack', u, v, { x: r.x + u * r.w, y: r.y + v * r.h }));
  settle(model);
  assert.match(log.find(([n]) => n === 'caption')[1].text, /Not yet — the train hasn.t been asked to stop/);
  assert.ok(log.some(([n, p]) => n === 'fx' && p.name === 'pulse' && p.hint.hotspot === 'request'), 'the plate is pointed out');
  assert.equal(model.hasFlag('orchardMarked'), false);
  // SHOW ME before the stop: the plate; right after it: the rack tag (the `mark` step)
  assert.equal(pickGesture(model).hotspot, 'request');
  requestStop(model);
  assert.equal(model.currentStep().id, 'mark');
  const g = pickGesture(model);
  assert.equal(g.tile, 'rack');
  assert.equal(g.hotspot, 'bellwether');
  assert.equal(model.hotspots('rack').find((x) => x.id === 'bellwetherEarly').enabled, false);
  assert.equal(model.hotspots('board').find((x) => x.id === 'requestDead')?.enabled ?? false, false);
});
