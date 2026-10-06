import test from 'node:test';
import assert from 'node:assert/strict';
import { ACT1 } from '../../src/chapters/nightService/acts/act1.js';
import { ACTS, ACT_ORDER, CHECKPOINT_ACTS, resolveActParam, startCarry } from '../../src/chapters/nightService/acts/index.js';
import { createPanelModel, validateAct } from '../../src/chapters/nightService/panelModel.js';
import { apply, availableActions, record, settle, solveBfs } from './helpers.mjs';

const TL = 0; const TR = 1; const BL = 2; const BR = 3;

function solveAct1(model) {
  const log = record(model);
  // 1. swap desk and window: desk lands left of the door, floor links
  assert.ok(model.swap(TL, BL));
  assert.ok(model.findLink('desk', 'door', 'floor'));
  settle(model);
  assert.equal(model.state.actors.butch.tile, 'door');
  assert.ok(model.hasFlag('butchAtDoor'));
  // 2. zoom into the tagged pigeonhole (lockers still above the door)
  assert.ok(model.zoomIn('lockers', 'tagged'));
  assert.ok(model.findLink('lockers', 'door', 'chute'));
  settle(model);
  return log;
}

test('Act 1 definition is valid and registered', () => {
  assert.deepEqual(validateAct(ACT1), []);
  assert.equal(ACTS.act1, ACT1);
  assert.deepEqual(ACT_ORDER, ['act0', 'act05', 'act1', 'act2', 'act3']);
  assert.equal(CHECKPOINT_ACTS['prologue-start'], 'act0', 'legacy saves resume at the chapter start');
  assert.equal(CHECKPOINT_ACTS['chapter-1-act-1'], 'act1');
  assert.equal(ACT1.checkpoint, 'chapter-1-act-1');
  assert.equal(CHECKPOINT_ACTS['chapter-1-act-3'], 'act3');
  assert.equal(resolveActParam('2'), 'act2');
  assert.equal(resolveActParam('act3'), 'act3');
  assert.equal(resolveActParam('9'), null);
  assert.equal(resolveActParam('0'), 'act0');
  assert.equal(resolveActParam('0.5'), 'act05');
  assert.deepEqual(startCarry('act2').items, ['punch']);
});

test('Act 1: scripted solution reaches the Conductor, bell #1 and the act-2 checkpoint', () => {
  const model = createPanelModel(ACT1);
  assert.equal(model.textState().step, 'floor-link');
  // awake and standing at the desk: Act 0.5 brought him home
  assert.equal(model.state.actors.butch.pose, 'idle');
  const log = solveAct1(model);
  assert.ok(model.hasFlag('ticketDropped'));
  assert.equal(model.state.tiles.door.state, 'conductor');
  assert.ok(model.hasItem('punch'));
  assert.equal(model.state.bell, 1);
  assert.equal(model.timeOfDay(), 'evening');
  assert.deepEqual(model.state.ended, { kind: 'nextAct', next: 'act2' });
  const names = log.map(([name]) => name);
  assert.ok(names.includes('dialogue'));
  assert.deepEqual(log.filter(([name]) => name === 'checkpoint').map(([, p]) => p.id), ['chapter-1-act-2']);
  const fx = log.filter(([name]) => name === 'fx').map(([, p]) => p.name);
  assert.deepEqual(fx, ['slotFlash', 'ticketDrop', 'punchHandover', 'fadeAll']);
  // the carried state for Act 2
  assert.deepEqual(model.carry().items, ['punch']);
  assert.equal(model.carry().bell, 1);
});

test('Act 1: the only move before the floor link is dragging (the zoom tag is hidden)', () => {
  const model = createPanelModel(ACT1);
  const actions = availableActions(model);
  assert.ok(actions.length > 0);
  assert.ok(actions.every((action) => action.kind === 'swap'), JSON.stringify(actions));
});

test('Act 1: swapping desk↔door or parking the desk elsewhere does nothing (with a mismatch shimmer)', () => {
  for (const [a, b] of [[TL, BR], [TL, TR]]) {
    const model = createPanelModel(ACT1);
    const log = record(model);
    model.swap(a, b);
    settle(model);
    assert.equal(model.findLink('desk', 'door', 'floor'), null);
    assert.equal(model.textState().step, 'floor-link');
    assert.equal(model.state.actors.butch.walk, null);
    assert.ok(log.some(([name, list]) => name === 'link:mismatch' && list.some((m) => m.type === 'floor')), `mismatch shown for ${a}↔${b}`);
  }
});

test('Act 1: the window floor sits too low — an offset mismatch, never a link', () => {
  const model = createPanelModel(ACT1);
  // window (BL) is already left of door (BR)
  assert.equal(model.findLink('window', 'door', 'floor'), null);
  assert.ok(model.mismatches().some((m) => m.tile === 'door' && m.reason === 'offset'));
});

test('Act 1: Butch stops at the edge if the floor link breaks mid-walk, and resumes', () => {
  const model = createPanelModel(ACT1);
  model.swap(TL, BL);
  model.update(600);
  model.update(300);
  assert.equal(model.state.actors.butch.tile, 'desk');
  // pick the desk up again (link breaks) and swap it back to the top
  model.swap(BL, TL);
  settle(model);
  assert.equal(model.state.actors.butch.tile, 'desk');
  assert.equal(model.state.actors.butch.blocked, true);
  assert.equal(model.hasFlag('butchAtDoor'), false);
  model.swap(TL, BL);
  settle(model);
  assert.equal(model.state.actors.butch.tile, 'door');
  assert.ok(model.hasFlag('butchAtDoor'));
});

test('Act 1: zoomed pigeonhole away from the door holds the ticket until swapped back above it', () => {
  const model = createPanelModel(ACT1);
  model.swap(TL, BL); // desk BL, window TL
  settle(model);
  // move the lockers away from above the door: lockers ↔ window
  model.swap(TR, TL);
  assert.equal(model.slotOf('lockers'), TL);
  model.zoomIn('lockers', 'tagged');
  settle(model);
  assert.equal(model.hasFlag('ticketDropped'), false, 'ticket waits at the opening');
  assert.equal(model.textState().step, 'ticket-chute');
  // swap it back above the door
  model.swap(TL, TR);
  assert.ok(model.findLink('lockers', 'door', 'chute'));
  settle(model);
  assert.ok(model.hasFlag('ticketDropped'));
  assert.equal(model.state.ended?.next, 'act2');
});

test('Act 1 (alpha #4): card A1 opens by itself when the chute fires, and holds the scene until read', () => {
  const model = createPanelModel(ACT1);
  model.swap(TL, BL);
  settle(model);
  const log = record(model);
  model.zoomIn('lockers', 'tagged');
  settle(model, { cards: false });
  assert.ok(model.hasFlag('ticketDropped'));
  assert.equal(model.state.card?.id, 'A1', 'the claim card is up');
  assert.equal(log.find(([name]) => name === 'card')[1].card.title, 'MARA V——', 'the torn surname (alpha R4)');
  assert.equal(model.state.ended, null, 'nothing moves on under the card');
  model.closeCard();
  settle(model);
  assert.equal(model.state.ended?.next, 'act2');
  // read already (the envelope): not shown twice
  const read = createPanelModel(ACT1);
  read.swap(TL, BL);
  settle(read);
  read.swap(TR, TL);
  read.zoomIn('lockers', 'tagged');
  read.activateHotspot('lockers', 'envelope');
  read.closeCard();
  const again = record(read);
  read.swap(TR, TL);
  settle(read, { cards: false });
  assert.equal(again.filter(([name]) => name === 'card').length, 0);
  assert.equal(read.state.ended?.next, 'act2');
});

test('Act 1: reading the claim envelope early shows card A1', () => {
  const model = createPanelModel(ACT1);
  model.swap(TL, BL);
  settle(model);
  model.swap(TR, TL); // keep the chute unlinked so we can read first
  model.zoomIn('lockers', 'tagged');
  const log = record(model);
  assert.ok(model.activateHotspot('lockers', 'envelope'));
  const card = log.find(([name]) => name === 'card')[1];
  assert.equal(card.id, 'A1');
  assert.equal(card.card.title, 'MARA V——');
  model.closeCard();
  assert.equal(model.state.card, null);
});

test('Act 1: zooming out of the pigeonhole is always possible before the ticket drops', () => {
  const model = createPanelModel(ACT1);
  model.swap(TL, BL);
  settle(model);
  model.swap(TR, TL);
  model.zoomIn('lockers', 'tagged');
  assert.ok(model.canZoomOut('lockers'));
  assert.ok(model.zoomOut('lockers'));
  assert.equal(model.state.tiles.lockers.state, 'wall');
});

test('Act 1: no dead ends — from random reachable states the act is still solvable', () => {
  let seed = 1234;
  const random = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
  for (let trial = 0; trial < 25; trial += 1) {
    const model = createPanelModel(ACT1);
    const moves = 1 + Math.floor(random() * 10);
    for (let i = 0; i < moves && !model.state.ended; i += 1) {
      const actions = availableActions(model);
      if (!actions.length) break;
      apply(model, actions[Math.floor(random() * actions.length)]);
      if (random() < 0.5) settle(model);
    }
    settle(model);
    if (model.state.ended) continue;
    const solution = solveBfs(ACT1, model.snapshot(), { maxStates: 3000 });
    assert.ok(solution, `trial ${trial} stranded at ${JSON.stringify(model.textState().grid.slots)} step ${model.textState().step}`);
  }
});

test('Act 1: the shortest solution from a fresh load is two moves', () => {
  const model = createPanelModel(ACT1);
  const solution = solveBfs(ACT1, model.snapshot());
  assert.ok(solution);
  assert.equal(solution.length, 2, JSON.stringify(solution));
  assert.equal(solution[0].kind, 'swap');
  assert.deepEqual(solution[1], { kind: 'hotspot', tile: 'lockers', id: 'tagged', era: 'present' });
});

test('Act 1: dev ?step= skip lands on each step with a consistent world', () => {
  const ticket = createPanelModel(ACT1, { step: 'ticket-chute' });
  assert.equal(ticket.textState().step, 'ticket-chute');
  assert.equal(ticket.state.actors.butch.tile, 'door');
  assert.ok(ticket.hasFlag('butchAtDoor'));
  const conductor = createPanelModel(ACT1, { step: 'conductor' });
  settle(conductor);
  assert.equal(conductor.state.ended?.next, 'act2');
});

test('the A1 stub is torn after the V; the full surname is first read on A3 (alpha R4)', async () => {
  const { ACT3 } = await import('../../src/chapters/nightService/acts/act3.js');
  const a1 = ACTS.act1.cards.A1;
  assert.equal(a1.title, 'MARA V——');
  assert.ok(!a1.title.includes('VELEZ'), 'the torn card never prints the name it says is torn');
  assert.match(a1.lines.join(' '), /surname was torn/);
  assert.equal(ACT3.cards.A3.title, 'MARA VELEZ');
});
