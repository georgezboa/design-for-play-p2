// Chapter 5 · OBJECT PENDING CLASSIFICATION — the Museum's one-answer
// exhibit, a panel-engine act (src/chapters/nightService/acts/oneAnswer.js).
// Pure-model proofs: the intended route, the one arrangement that links,
// that the "duplicate" is what joins the city to the orchard, and that no
// reachable state strands the player.

import test from 'node:test';
import assert from 'node:assert/strict';
import { ONE_ANSWER_ACT, MARA_ROUTE } from '../../src/chapters/nightService/acts/oneAnswer.js';
import { ACTS, ACT_ORDER } from '../../src/chapters/nightService/acts/index.js';
import { OFFICE_LENS_AT } from '../../src/chapters/nightService/art/oneAnswerArt.js';
import { createPanelModel, validateAct } from '../../src/chapters/nightService/panelModel.js';
import { apply, availableActions, record, settle } from './helpers.mjs';

const SOLUTION = ['stub', 'duplicate', 'tag', 'plate'];
const carry = () => ({ bell: 0, items: [], flags: [], linkHistory: [], ...ONE_ANSWER_ACT.start });
const fresh = () => createPanelModel(ONE_ANSWER_ACT, { carry: carry() });

function lensAt(model, tile, u, v) {
  const r = model.slotRect(tile);
  return model.moveLens(r.x + u * r.w, r.y + v * r.h);
}

const lensOnOffice = (model) => lensAt(model, 'duplicate', OFFICE_LENS_AT[0], OFFICE_LENS_AT[1]);

/** Put the tiles into `order` (row-major) with swaps. */
function arrange(model, order = SOLUTION) {
  order.forEach((tile, index) => {
    const at = model.slotOf(tile);
    if (at !== index) assert.ok(model.swap(at, index), `swap ${tile} ${at}→${index}`);
  });
  settle(model);
}

function openIntro(model) {
  settle(model); // reads (closes) the Archivist's card
  assert.equal(model.state.card, null);
  assert.equal(model.state.inputLocked, false);
}

function punch(model) {
  assert.ok(model.activateHotspot('stub', 'hole'));
  settle(model);
}

function unfile(model) {
  const h = model.hotspots('duplicate').find((x) => x.id === 'seal');
  lensAt(model, 'duplicate', h.rect[0] + h.rect[2] / 2, h.rect[1] + h.rect[3] / 2);
  assert.ok(model.activateHotspot('duplicate', 'seal'));
  settle(model);
}

/**
 * Goal-directed solver from ANY reachable state: finish whatever is open,
 * punch, unfile, zoom the plate in, turn the tag, arrange, hold the lens.
 */
function solve(model) {
  for (let guard = 0; guard < 40 && !model.state.ended; guard += 1) {
    settle(model, { maxMs: 90000 });
    if (model.state.ended) break;
    const s = model.state;
    if (s.card) { model.closeCard(); continue; }
    if (s.blocking?.kind === 'dialogue') { model.advanceDialogue(); continue; }
    if (model.floatingFrame()) { model.dropFrame(null); continue; }
    if (!model.hasFlag('punched')) { punch(model); continue; }
    if (s.tiles.duplicate.state === 'filed') { unfile(model); continue; }
    if (s.tiles.plate.state !== 'drawing') {
      if (!model.zoomIn('plate', 'print')) assert.fail('plate cannot zoom back in');
      continue;
    }
    if (s.tiles.tag.state !== 'face') { assert.ok(model.activateHotspot('tag', 'turn')); continue; }
    if (s.slots.join() !== SOLUTION.join()) { arrange(model); continue; }
    lensOnOffice(model);
    settle(model, { maxMs: 120000 });
  }
  return model.state.ended?.kind === 'endChapter';
}

test('the exhibit act is valid, and lives outside the Chapter 1 act order', () => {
  assert.deepEqual(validateAct(ONE_ANSWER_ACT), []);
  assert.equal(ACTS.oneAnswer, undefined, 'not a Chapter 1 act: one-answer.html hands it to the engine directly');
  assert.ok(!ACT_ORDER.includes('oneAnswer'));
  assert.equal(ONE_ANSWER_ACT.heading, 'OBJECT PENDING CLASSIFICATION');
  assert.deepEqual(ONE_ANSWER_ACT.devSkip, [{ endChapter: true }], 'dev N never writes a Chapter 1 checkpoint');
});

test('it starts as the Archivist\'s one clean record, locked: only the ticket stub can be acted on', () => {
  const model = fresh();
  const log = record(model);
  settle(model, { cards: false });
  assert.equal(model.state.card?.id, 'P1');
  assert.deepEqual(ONE_ANSWER_ACT.cards.P1.lines, ['Resident of the city. One claim, collected.', 'Orchard case: unclaimed.', 'Second claim: duplicate. Discard.']);
  assert.ok(log.some(([n, p]) => n === 'fx' && p.name === 'fileStamp'));
  model.closeCard();
  settle(model);
  assert.equal(model.state.lens.enabled, false);
  assert.ok(Object.keys(model.state.tiles).every((tile) => !model.canDrag(tile)), 'every window is locked');
  const hot = availableActions(model).filter((a) => a.kind === 'hotspot').map((a) => `${a.tile}.${a.id}`).sort();
  assert.deepEqual(hot, ['plate.print', 'stub.hole', 'tag.turn']);
  assert.deepEqual(model.links(), []);
});

test('the punch-hole lens comes out of Mara\'s ticket stub; the seal is only removable in 1978', () => {
  const model = fresh();
  openIntro(model);
  punch(model);
  assert.ok(model.state.lens.enabled);
  assert.ok(model.hasFlag('punched'));
  // the seal cannot be clicked in the present
  const seal = model.hotspots('duplicate').find((h) => h.id === 'seal');
  model.moveLens(40, 40);
  assert.equal(model.clickTile('duplicate', seal.rect[0] + 0.05, seal.rect[1] + 0.05), false);
  unfile(model);
  assert.equal(model.state.tiles.duplicate.state, 'open');
  assert.ok(Object.keys(model.state.tiles).every((tile) => model.canDrag(tile)), 'unfiled: the windows move');
  assert.equal(model.state.actors.mara.walk?.id, 'route', 'Mara starts along her route');
});

test('the duplicate\'s floor only exists in 1978: no lens, no crossing', () => {
  const model = createPanelModel(ONE_ANSWER_ACT, { carry: carry(), step: 'route' });
  assert.ok(model.moveLens(40, 40));
  arrange(model);
  assert.ok(model.findLink('plate', 'tag', 'route'));
  assert.equal(model.findLink('stub', 'duplicate', 'route'), null, 'the present office floor is torn');
  assert.equal(model.findLink('duplicate', 'plate', 'route'), null);
  const mara = model.state.actors.mara;
  for (let i = 0; i < 400; i += 1) model.update(50);
  assert.equal(mara.tile, 'stub');
  assert.ok(mara.blocked, 'she waits at the edge of the city platform');
  lensOnOffice(model);
  settle(model);
  assert.ok(model.findLink('stub', 'duplicate', 'route'));
  assert.ok(model.findLink('duplicate', 'plate', 'route'));
});

test('exactly one arrangement links city → orchard, and it keeps the duplicate in the route', () => {
  const tiles = ['stub', 'duplicate', 'plate', 'tag'];
  const perms = [];
  const permute = (rest, acc) => {
    if (!rest.length) { perms.push(acc); return; }
    rest.forEach((t, i) => permute([...rest.slice(0, i), ...rest.slice(i + 1)], [...acc, t]));
  };
  permute(tiles, []);
  const route = ONE_ANSWER_ACT.steps.find((step) => step.id === 'route').when;
  const linking = perms.filter((order) => {
    const model = createPanelModel(ONE_ANSWER_ACT, { carry: carry(), step: 'route' });
    arrange(model, order);
    lensOnOffice(model);
    return model.evaluate(route);
  });
  assert.deepEqual(linking, [SOLUTION]);
  // the stub and the tag never link without the office between them
  const model = createPanelModel(ONE_ANSWER_ACT, { carry: carry(), step: 'route' });
  arrange(model);
  lensOnOffice(model);
  const types = model.links().map((l) => `${l.a}>${l.b}`).sort();
  assert.deepEqual(types, ['duplicate>plate', 'stub>duplicate', 'tag>plate']);
});

test('zoom level and the turned tag are part of the solution', () => {
  const model = createPanelModel(ONE_ANSWER_ACT, { carry: carry(), step: 'unfile' });
  unfile(model);
  arrange(model);
  lensOnOffice(model);
  assert.equal(model.findLink('duplicate', 'plate', 'route'), null, 'Plate IV on the wall has no lane yet');
  assert.ok(model.zoomIn('plate', 'print'));
  settle(model);
  assert.ok(model.findLink('duplicate', 'plate', 'route'));
  assert.equal(model.findLink('plate', 'tag', 'route'), null, 'the orchard is behind its UNCLAIMED tag');
  assert.ok(model.activateHotspot('tag', 'turn'));
  settle(model);
  assert.ok(model.findLink('plate', 'tag', 'route'));
});

test('full scripted solution: Mara reaches the orchard, the duplicate line is struck, the exhibit ends', () => {
  const model = fresh();
  const log = record(model);
  assert.ok(solve(model));
  assert.equal(model.state.actors.mara.tile, 'tag');
  assert.ok(model.state.arrivals.includes('route'));
  const cards = log.filter(([n]) => n === 'card').map(([, p]) => p.id);
  assert.deepEqual(cards, ['P1', 'P2']);
  assert.equal(ONE_ANSWER_ACT.cards.P2.strike, 2);
  assert.equal(ONE_ANSWER_ACT.cards.P2.lines[2], 'Second claim: duplicate. Discard.');
  const lines = log.filter(([n]) => n === 'dialogue').map(([, p]) => p.line.text);
  assert.deepEqual(lines, [
    'That record is a duplicate.',
    'Not in 1978. In 1978 it was her.',
    'The archive does not issue duplicates.',
    'It didn\'t. There was only ever one of her.',
  ]);
  assert.ok(log.some(([n, p]) => n === 'fx' && p.name === 'bothLives'));
  assert.ok(log.some(([n]) => n === 'bell'), 'the train bell rings for both lives');
  assert.ok(log.some(([n]) => n === 'chapter:end'));
  assert.ok(!log.some(([n]) => n === 'checkpoint'), 'needs and writes no save data');
});

test('Mara stops safely when the lens leaves the office and resumes when 1978 returns', () => {
  const model = createPanelModel(ONE_ANSWER_ACT, { carry: carry(), step: 'route' });
  assert.ok(model.moveLens(40, 40));
  arrange(model);
  lensOnOffice(model);
  const mara = model.state.actors.mara;
  for (let i = 0; i < 600 && !(mara.tile === 'duplicate' && mara.x > 0.3); i += 1) model.update(50);
  assert.equal(mara.tile, 'duplicate');
  model.moveLens(40, 40);
  for (let i = 0; i < 200; i += 1) model.update(50);
  assert.ok(mara.blocked, 'she waits while the floor is torn');
  const safe = MARA_ROUTE[2].x;
  assert.ok(Math.abs(mara.x - safe) < 0.01 || mara.y > 0.62, `backs off the torn boards (x ${mara.x})`);
  lensOnOffice(model);
  settle(model, { maxMs: 120000 });
  assert.equal(model.state.ended?.kind, 'endChapter');
});

test('no dead ends: from random reachable states the exhibit is still solvable', () => {
  let seed = 5150412;
  const random = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
  for (let trial = 0; trial < 40; trial += 1) {
    const model = fresh();
    const moves = 2 + Math.floor(random() * 26);
    for (let i = 0; i < moves && !model.state.ended; i += 1) {
      if (random() < 0.25 && model.state.lens.enabled && !model.isLocked()) {
        model.moveLens(random() * 1920, random() * 1080);
      } else {
        const actions = availableActions(model);
        if (!actions.length) break;
        apply(model, actions[Math.floor(random() * actions.length)]);
      }
      if (random() < 0.6) settle(model);
    }
    const where = `${JSON.stringify(model.textState().grid.slots)} step ${model.textState().step}`;
    assert.ok(solve(model), `trial ${trial} stranded at ${where}`);
  }
});

test('every reachable action stays reversible: nothing locks a window again after unfiling', () => {
  const model = createPanelModel(ONE_ANSWER_ACT, { carry: carry(), step: 'plate' });
  const before = Object.keys(model.state.tiles).filter((tile) => model.canDrag(tile));
  assert.equal(before.length, 4);
  // zooming the plate back out is always allowed
  assert.ok(model.zoomIn('plate', 'print'));
  settle(model);
  assert.ok(model.canZoomOut('plate'));
  assert.ok(model.zoomOut('plate'));
  settle(model);
  assert.ok(model.zoomIn('plate', 'print'));
});
