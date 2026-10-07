// Round 6 (playtest 2026-10-07): Chapter 1's panel engine and the Museum's
// one-answer exhibit. Model-level proofs where the rule is pure, source
// checks where it lives in the renderer (PanelScene.js).
//
//   item 3   the bezel moves a window; the painted frame lifts; distinct previews
//   item 1   look closer (magnifier) vs act (hand + verb); the first close-up
//            says how to step back; a click that does nothing says why
//   item 2   the unfold's wrong-way resistance, its rebound, the one demo nudge
//   item 4   the key / the ticket unlock is held, and the wide view keeps it
//   item 5   NEED A HINT? [H], once
//   item 14  the exhibit's evidence opens a large reading view (TEXT SIZE)
//   item 15  while a line is spoken, the windows dim and the line says CONTINUE
//   item G   links are light seams, not bars; painted plates per state

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  actPlates, bezelPad, bezelSlotAt, coverFit, createPanelModel, defineAct, hotspotAffordance, layoutGrid, plateKey, validateAct,
} from '../../src/chapters/nightService/panelModel.js';
import { FLAIL, NEED_HINT_SEEN, createFlailMeter } from '../../src/chapters/nightService/hints.js';
import { DEMO_NUDGE, UNFOLD, createUnfold, demoNudge, planUnfold, reboundOffset, wrongWayGive } from '../../src/chapters/nightService/unfold.js';
import { ACTS, startCarry } from '../../src/chapters/nightService/acts/index.js';
import { ONE_ANSWER_ACT } from '../../src/chapters/nightService/acts/oneAnswer.js';
import { planGrowth } from '../../src/chapters/nightService/panelModel.js';
import { readingFontPx } from '../../src/chapters/nightService/readingView.js';
import { chipSegments } from '../../src/chapters/nightService/chips.js';
import { readingInsets } from '../../src/chapters/nightService/art/readingArt.js';
import { settle, record } from './helpers.mjs';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const scene = read('src/chapters/nightService/PanelScene.js');
const oaCarry = () => ({ bell: 0, items: [], flags: [], linkHistory: [], ...ONE_ANSWER_ACT.start });

// ---------------------------------------------------------------------------
// item 3 · the bezel

test('item 3: a press on the brass bezel finds its window; the picture and the wall gap do not', () => {
  const layout = layoutGrid({ cols: 2, rows: 2 });
  const pad = bezelPad(layout);
  assert.ok(pad >= 13 && pad <= layout.gutter, `the bezel band (${pad}) covers the painted ring`);
  const [a, b, c, d] = layout.slots;
  // just above the top-left window's picture: its bezel
  assert.equal(bezelSlotAt(layout, a.x + a.w / 2, a.y - 6)?.index, 0);
  // just left of the bottom-right window
  assert.equal(bezelSlotAt(layout, d.x - 8, d.y + d.h / 2)?.index, 3);
  // inside a picture is not the bezel (the picture has its own rules)
  assert.equal(bezelSlotAt(layout, b.x + 40, b.y + 40), null);
  // far out on the wall: nothing
  assert.equal(bezelSlotAt(layout, a.x - 80, a.y - 80), null);
  // across the gutter the nearer window wins
  const gx = a.x + a.w;
  assert.equal(bezelSlotAt(layout, gx + 4, a.y + a.h / 2)?.index, 0);
  assert.equal(bezelSlotAt(layout, gx + layout.gutter - 4, a.y + a.h / 2)?.index, 1);
  void c;
  // a window shown larger (Act 0, display 1.7) has a wider ring, and a wider band to match
  const big = layoutGrid({ cols: 1, rows: 1, tile: { w: 745, h: 414 }, display: 1.7 });
  assert.ok(bezelPad(big) >= 13 * big.scale, 'the whole painted ring');
  assert.equal(bezelSlotAt(big, big.slots[0].x - 20, big.slots[0].y + 100)?.index, 0);
});

test('item 3: PanelScene — the bezel moves the window, the painted frame lifts it, with distinct cursors and previews', () => {
  // the bezel takes hold of the window (never arms the frame hold)
  assert.match(scene, /const rim = slot \? null : this\.bezelAt\(p\.x, p\.y\);/);
  assert.match(scene, /if \(rim\) this\.liftRim\(tile, this\.model\.canDrag\(tile\) \? 'press' : 'refuse'\);\s*else this\.armFrameHold\(tile, slot, p\);/);
  // move: the open hand and the whole window rising over its shadow
  assert.match(scene, /if \(this\.model\.canDrag\(tile\)\) \{ cursor = 'grab'; rimHover = tile; \}/);
  assert.match(scene, /const want = mode === 'press' \? 1\.022 : mode === 'hover' \? 1\.008 : 1;/);
  assert.match(scene, /const up = \(view\) => view\.lifted \|\| view\.raised;/);
  // lift: the frame cursor, and only the frame rising off the picture from its own shadow
  assert.match(scene, /else if \(frame\) \{ cursor = LIFT_CURSOR; grip = \{ tile, frame \}; \}/);
  assert.match(scene, /view\.frameLayer\.setY\(-next\);/);
  assert.match(scene, /obj\.setTintFill\?\.\(0x060403\)/);
  // a window that cannot move strains after the hand, says why, and springs back
  assert.match(scene, /if \(!press\.said && press\.far > 22\) \{ press\.said = true; this\.refuseDrag\(press\.tile, p\); \}/);
  // (a sloppy click on a window that cannot move is still a click)
  assert.match(scene, /if \(!press\.said && !press\.rim\) this\.clickAt\(press\.tile, press\.slot, \{ x: press\.x, y: press\.y \}\);/);
  assert.match(scene, /ease: 'Back\.easeOut', easeParams: \[2\.2\]/);
  // the lens still wins over a bezel inside its rim, and the ⤢ glyph over both
  const down = scene.slice(scene.indexOf('  onPointerDown(p) {'), scene.indexOf('  bezelAt(x, y) {'));
  assert.ok(down.indexOf('fromLens <= lens.r + 14') < down.indexOf('this.onGlyph(tile, p.x, p.y)'));
  assert.ok(down.indexOf('this.onGlyph(tile, p.x, p.y)') < down.indexOf('this.liftRim(tile'));
});

test('item 3: the bezel drag swaps like a picture drag (model: any slot press → beginDrag → dropOn)', () => {
  const model = createPanelModel(ACTS.act05, { carry: startCarry('act05') });
  settle(model);
  const layout = model.layout;
  const door = model.slotRect('door');
  const rim = bezelSlotAt(layout, door.x + door.w / 2, door.y - 5);
  assert.equal(model.tileAt(rim.index), 'door');
  assert.ok(model.beginDrag('door'));
  assert.ok(model.dropOn(1));
  assert.deepEqual(model.state.slots, ['desk', 'door']);
});

// ---------------------------------------------------------------------------
// item 1 · look closer vs use

test('item 1: zooms and reads are "look closer"; uses act, with a short verb', () => {
  assert.deepEqual(hotspotAffordance({ kind: 'zoom' }), { look: true, verb: null });
  assert.deepEqual(hotspotAffordance({ kind: 'read', card: 'A1' }), { look: true, verb: 'READ' });
  assert.deepEqual(hotspotAffordance({ kind: 'use' }), { look: false, verb: 'USE' });
  assert.deepEqual(hotspotAffordance({ kind: 'pickup' }), { look: false, verb: 'TAKE' });
  assert.deepEqual(hotspotAffordance({ readable: true }), { look: true, verb: 'READ' });
  // the acts name their verbs
  const verbOf = (act, tile, state, id) => act.tiles[tile].states[state].hotspots.find((h) => h.id === id).verb;
  assert.equal(verbOf(ACTS.act0, 'office', 'bell', 'strike'), 'RING');
  assert.equal(verbOf(ACTS.act2, 'aisle', 'aisle', 'ticket'), 'PUNCH');
  assert.equal(verbOf(ACTS.act2, 'aisle', 'stone', 'ember'), 'TAKE');
  assert.equal(verbOf(ACTS.act2, 'board', 'default', 'request'), 'PRESS');
  assert.equal(verbOf(ONE_ANSWER_ACT, 'stub', 'default', 'hole'), 'PUNCH');
  // every use hotspot in the chapter and the exhibit has a verb of one or two short words
  [...Object.values(ACTS), ONE_ANSWER_ACT].forEach((act) => Object.values(act.tiles).forEach((tile) => Object.values(tile.states).forEach((st) => (st.hotspots ?? []).forEach((h) => {
    const a = hotspotAffordance(h);
    if (!a.look) assert.ok(a.verb && a.verb.length <= 10 && a.verb === a.verb.toUpperCase(), `${act.id} ${h.id}: ${a.verb}`);
  }))));
});

test('item 1: PanelScene shows the magnifier over look-closer, the hand and its verb over act', () => {
  assert.match(scene, /export const LOOK_CURSOR = /);
  assert.match(scene, /cursor = a\.look \? LOOK_CURSOR : 'pointer';/);
  assert.match(scene, /label = a\.verb;/);
  // the verb follows the pointer (and sits over the keyboard focus, with its key)
  assert.match(scene, /chip\.show\(hover\.text, hover\.x \+ 30 \+ chip\.w \/ 2, hover\.y \+ 40, \{ s \}\);/);
  assert.match(scene, /chip\.show\(`\[E\] \$\{a\.verb \?\? 'LOOK CLOSER'\}`/);
});

test('item 1: why a hotspot does not answer — later (NOT YET), done, or used', () => {
  const model = createPanelModel(ACTS.act0, { carry: startCarry('act0') });
  settle(model);
  const ticket = model.hotspots('office').find((h) => h.id === 'ticket');
  assert.equal(model.hotspotBlock('office', ticket), 'later', 'the claim spike waits for Butch to wake');
  const [x, y, w, h] = ticket.rect;
  assert.equal(model.waitingSpotAt('office', x + w / 2, y + h / 2)?.hotspot.id, 'ticket');
  // once rung, the bell's zoom is done (not "not yet")
  model.state.flags.push('rung');
  const bell = model.hotspots('office').find((spot) => spot.id === 'bell');
  assert.equal(model.hotspotBlock('office', bell), 'gone');
  assert.equal(model.waitingSpotAt('office', bell.rect[0] + 0.01, bell.rect[1] + 0.01), null);
  // a one-shot already used
  const m2 = createPanelModel(ACTS.act0, { carry: startCarry('act0'), step: 'ring' });
  assert.ok(m2.activateHotspot('office', 'strike'));
  settle(m2);
  const strike = m2.sceneOf('office', 'bell').hotspots.find((spot) => spot.id === 'strike');
  m2.state.tiles.office.state = 'bell';
  assert.equal(m2.hotspotBlock('office', { ...strike }), 'used');
});

test('item 1: dead clicks say why, the first close-up says how to step back (and Esc does)', () => {
  assert.match(scene, /this\.say\(waiting\.hotspot\.notYet \?\? 'NOT YET', p\)/);
  assert.match(scene, /const DEAD_CLICK_WORDS = 3;/);
  assert.match(scene, /hopTags\(tile\) \{/);
  assert.match(scene, /const ZOOM_BACK_TEXT = 'TO STEP BACK:  \[ESC\] · RIGHT-CLICK · OR THIS';/);
  assert.match(scene, /if \(kind === 'zoom' && !this\.hintSeen\.has\(ZOOM_BACK_SEEN\) && !this\.zoomBack\) this\.zoomBack = \{ tile, shownAt: null \};/);
  // what it promises works: right-click, the glyph, and Esc (Back, unified controls)
  assert.match(scene, /if \(p\.rightButtonDown\(\)\) \{\s*if \(tile && !this\.busyView\(tile\) && !this\.model\.zoomOut\(tile\)\)/);
  assert.match(scene, /const tile = this\.backTarget\(\);\s*if \(tile && m\.zoomOut\(tile\)\)/);
  // only out of close-ups the player opened; the exhibit keeps Esc for leaving the case
  assert.match(scene, /\(m\.state\.tiles\[tile\]\?\.zoomStack\.length \?\? 0\) > home && m\.canZoomOut\(tile\)/);
  assert.equal(ONE_ANSWER_ACT.escapeZoomsOut, false);
  // E is Enter
  assert.match(scene, /const keyOf = \(event\) => \(event\.key === 'e' \|\| event\.key === 'E' \? 'Enter' : event\.key\);/);
});

// ---------------------------------------------------------------------------
// item 2 · the unfold

const foldFor = (fromId, toId) => planUnfold(planGrowth(ACTS[fromId], ACTS[toId]));
const along = (fold, d) => (fold.axis === 'x' ? { x: fold.pull.x + d * fold.sign, y: fold.pull.y } : { x: fold.pull.x, y: fold.pull.y + d * fold.sign });

test('item 2: a wrong-way pull meets resistance (a few px, ever stiffer) and rebounds on release', () => {
  assert.equal(wrongWayGive(0), 0);
  assert.ok(wrongWayGive(30) > 4 && wrongWayGive(30) < 9);
  assert.ok(wrongWayGive(400) <= UNFOLD.backMaxPx + 1e-9, 'never more than a few px');
  assert.ok(wrongWayGive(200) - wrongWayGive(100) < wrongWayGive(100) - wrongWayGive(0), 'stiffer the further');
  const fold = foldFor('act0', 'act05');
  const u = createUnfold(fold);
  u.grab(along(fold, 0), 0);
  u.move(along(fold, -80), 40);
  assert.equal(u.progress, 0, 'the wall does not open the wrong way');
  assert.ok(u.back < -UNFOLD.wrongPx && u.back >= -UNFOLD.backMaxPx, `the pull gives (${u.back})`);
  assert.ok(u.wrongWay);
  assert.equal(u.release(), 'rebound');
  assert.equal(u.state, 'folded');
  assert.equal(u.wrongPulls, 1);
  // a springy settle: it overshoots the other way once, then rests at 0
  const seen = [];
  for (let t = 0; t < UNFOLD.reboundMs + 40; t += 20) { u.update(20); seen.push(u.back); }
  assert.ok(seen.some((v) => v > 0.5), 'rings past its rest');
  assert.equal(u.back, 0);
  // the right way still opens it afterwards
  u.grab(along(fold, 0), 1000);
  u.move(along(fold, fold.pointerTravel * 0.6), 1100);
  assert.equal(u.release(), 'snap');
});

test('item 2: the opposite arrow key kicks the pull the wrong way and it rebounds; a tiny wrong-way wobble is not a pull', () => {
  const fold = foldFor('act05', 'act1');
  const u = createUnfold(fold);
  assert.equal(u.kick(), 'rebound');
  assert.ok(u.back < 0);
  for (let i = 0; i < 40; i += 1) u.update(20);
  assert.equal(u.back, 0);
  u.grab(along(fold, 0), 0);
  u.move(along(fold, -1), 10);
  assert.equal(u.release(), 'spring', 'a hair the wrong way is just a let-go');
  assert.equal(reboundOffset(-10, 0), -10);
  assert.equal(reboundOffset(-10, UNFOLD.reboundMs), 0);
});

test('item 2: the teaching unfold nudges the right way once, after ~3 s idle', () => {
  assert.equal(demoNudge(DEMO_NUDGE.at - 10), 0);
  assert.equal(demoNudge(DEMO_NUDGE.at + DEMO_NUDGE.ms + 10), 0);
  const peak = Math.max(...Array.from({ length: 60 }, (_, i) => demoNudge(DEMO_NUDGE.at + (i * DEMO_NUDGE.ms) / 60)));
  assert.ok(peak > 0.1 && peak <= DEMO_NUDGE.amp + 1e-9, `a short way open (${peak})`);
  assert.ok(peak < UNFOLD.threshold, 'never far enough to open it');
  assert.equal(demoNudge(DEMO_NUDGE.at + 300, { teach: false }), 0, 'only the teaching unfold');
  assert.ok(demoNudge(DEMO_NUDGE.at + 300, { reduce: true }) < demoNudge(DEMO_NUDGE.at + 300), 'gentler under Reduce Motion');
  // PanelScene plays it once and with a sound; a wrong-way pull rings back softly
  assert.match(scene, /if \(this\.foldTeach && !this\.foldNudged && resting\) \{/);
  assert.match(scene, /this\.audio\.play\('unfoldNudge'\)/);
  assert.match(scene, /else if \(result === 'rebound'\) this\.foldRebound\(\);/);
  assert.match(scene, /this\.audio\.play\('unfoldRebound'\);/);
  assert.match(read('src/chapters/nightService/audio.js'), /unfoldRebound\(\) \{/);
});

// ---------------------------------------------------------------------------
// item 4 · success leaves evidence

test('item 4: Act 0.5 holds the turned key, steps back onto the door off its latch, then names the next goal', () => {
  const steps = ACTS.act05.steps.find((step) => step.id === 'carrier').do;
  const at = (pred) => steps.findIndex(pred);
  const unlocked = at((e) => e.setFlag === 'unlocked');
  const turn = at((e) => e.fx?.name === 'keyTurn');
  const out = at((e) => e.zoomOut && typeof e.zoomOut === 'object' && e.zoomOut.to === 'unlocked');
  assert.ok(unlocked >= 0 && turn > unlocked && out > turn, 'the turn plays before the camera steps back');
  const held = steps[turn].fx.ms;
  assert.ok(held >= 1200 && held <= 1800, `held ${held} ms in the close-up`);
  assert.ok(ACTS.act05.tiles.door.states.unlocked, 'the wide view has an unlocked (ajar) door');
  const caption = steps.filter((e) => e.caption).at(-1).caption;
  assert.equal(caption.speaker, 'BUTCH');
  assert.match(caption.text, /desk/i);
  // the model plays it through: wide view ajar, then open, Butch visible throughout
  const model = createPanelModel(ACTS.act05, { carry: startCarry('act05'), step: 'carrier' });
  const states = [];
  model.on('zoom', ({ tile, dir, to }) => { if (tile === 'door' && dir === 'out') states.push(to); });
  model.on('state', ({ tile, to }) => { if (tile === 'door') states.push(to); });
  model.state.slots = ['door', 'desk'];
  assert.ok(model.zoomIn('desk', 'keys'));
  assert.ok(model.zoomIn('door', 'lock'));
  settle(model);
  assert.deepEqual(states, ['unlocked', 'open']);
  assert.equal(model.state.actors.butch.state, 'open');
});

test('item 4: zoomOut { tile, to } steps back into a different wide state', () => {
  const model = createPanelModel(ACTS.act05, { carry: startCarry('act05'), step: 'carrier' });
  model.state.slots = ['door', 'desk'];
  model.state.flags = model.state.flags.filter((f) => f !== 'butchAtStores');
  model.state.flags.push('butchAtStores');
  assert.ok(model.zoomIn('door', 'lock'));
  model.state.queue.push({ zoomOut: { tile: 'door', to: 'unlocked' } });
  model.update(0);
  assert.equal(model.state.tiles.door.state, 'unlocked');
  assert.equal(model.state.tiles.door.zoomStack.length, 0);
});

test('item 4: Act 1 holds the unlocked door (lamp amber, the crack lit) before the claim card', () => {
  const steps = ACTS.act1.steps.find((step) => step.id === 'ticket-chute').do;
  const unlock = steps.findIndex((e) => e.setState?.state === 'unlocked');
  const fx = steps.findIndex((e) => e.fx?.name === 'doorUnlocked');
  const card = steps.findIndex((e) => e.showCard);
  assert.ok(unlock >= 0 && fx > unlock && card > fx);
  assert.ok(steps[fx].fx.ms >= 1200);
  assert.match(read('src/chapters/nightService/art/act1Art.js'), /if \(variant === 'unlocked'\) \{/);
});

// ---------------------------------------------------------------------------
// item 5 · NEED A HINT? [H]

test('item 5: three ineffective tries within 20 s offer the hint key, once; never after H', () => {
  assert.deepEqual(FLAIL, { count: 3, windowMs: 20000 });
  const seen = new Set();
  const meter = createFlailMeter({ seen });
  assert.equal(meter.miss(0), false);
  assert.equal(meter.miss(25000), false, 'the first try has gone stale');
  assert.equal(meter.miss(30000), false);
  assert.equal(meter.miss(31000), true, 'the third within 20 s');
  assert.ok(seen.has(NEED_HINT_SEEN));
  assert.equal(meter.miss(32000), false);
  assert.equal(meter.miss(33000), false);
  assert.equal(meter.miss(34000), false, 'never again');
  // a second act on the same page shares the memory
  assert.equal(createFlailMeter({ seen }).miss(0) || createFlailMeter({ seen }).retired, true);
  // H first: it never shows
  const other = createFlailMeter();
  other.miss(0); other.miss(1);
  other.retire();
  assert.equal(other.miss(2), false);
  // a finished step breaks the run
  const run = createFlailMeter();
  run.miss(0); run.miss(1); run.progress();
  assert.equal(run.miss(2), false);
  assert.match(scene, /const NEED_HINT_TEXT = 'NEED A HINT\?  \[H\]';/);
  assert.match(scene, /this\.flail\?\.retire\(\);/);
  assert.match(scene, /if \(this\.needChip\?\.contains\(p\.x, p\.y\)\) \{ this\.requestHint\(\); return; \}/);
});

// ---------------------------------------------------------------------------
// item 14 · the exhibit's evidence, readable

const oaModel = (step) => createPanelModel(ONE_ANSWER_ACT, { carry: oaCarry(), ...(step ? { step } : {}) });

test('item 14: the exhibit\'s key papers are readables, with their 1978 words through the lens', () => {
  assert.deepEqual(validateAct(ONE_ANSWER_ACT), []);
  const model = oaModel();
  settle(model);
  // the slip: today M. VENN, DUPLICATE, FILED; in 1978 Mara Velez → Bellwether
  const slip = model.readables('duplicate').find((r) => r.id === 'slip');
  assert.ok(slip.enabled);
  const [x, y, w, h] = slip.rect;
  const hit = model.readableAt('duplicate', x + w * 0.3, y + h * 0.4);
  assert.equal(hit.id, 'slip');
  assert.equal(hit.past, false);
  assert.ok(model.openReading('duplicate', 'slip'));
  assert.equal(model.state.card.reading, true);
  assert.equal(model.textState().reading, 'read:duplicate.slip');
  model.closeCard();
  assert.equal(model.state.card, null);
  // the words mirror the painting
  const words = (r) => JSON.stringify(r);
  assert.match(words(slip.reading), /M\. VENN/);
  assert.match(words(slip.reading), /DUPLICATE/);
  assert.match(words(slip.past), /Mara Velez/);
  assert.match(words(slip.past), /BELLWETHER/);
  // the others: the stub, Plate IV's label (ROSA VELEZ in 1978), the case tag
  const stub = model.readables('stub').find((r) => r.enabled);
  assert.match(words(stub.reading), /Terminal Row/);
  const label = model.readables('plate').find((r) => r.id === 'label');
  assert.match(words(label.reading), /PLATE IV/);
  assert.match(words(label.past), /ROSA VELEZ/);
  const tag = model.readables('tag').find((r) => r.id === 'tag');
  assert.match(words(tag.reading), /UNCLAIMED/);
  assert.match(words(tag.past), /M\. VELEZ/);
});

test('item 14: through the lens a reading shows 1978; a hotspot under the same point still wins', () => {
  const model = oaModel('unfile');
  const slip = model.readables('duplicate').find((r) => r.id === 'slip');
  const rect = model.slotRect('duplicate');
  const [x, y, w, h] = slip.rect;
  const u = x + w * 0.4;
  const v = y + h * 0.5;
  const screen = { x: rect.x + u * rect.w, y: rect.y + v * rect.h };
  model.moveLens(screen.x, screen.y);
  // filed: the 1978 seal hotspot is the move (it unfiles), not a reading
  assert.equal(model.hotspotAt('duplicate', u, v, screen)?.id, 'seal');
  assert.ok(model.activateHotspot('duplicate', 'seal'));
  settle(model);
  assert.equal(model.state.tiles.duplicate.state, 'open');
  // unfiled: the same click reads the slip in 1978 light
  assert.equal(model.hotspotAt('duplicate', u, v, screen), null);
  const hit = model.readableAt('duplicate', u, v, screen);
  assert.equal(hit?.past, true);
  const log = record(model);
  assert.ok(model.openReading('duplicate', 'slip', { past: hit.past }));
  const card = log.find(([n]) => n === 'card')[1];
  assert.equal(card.id, 'read:duplicate.slip:1978');
  assert.equal(card.card.era, 'past');
  assert.equal(card.card.reading, true);
  assert.deepEqual(card.card.source.tile, 'duplicate');
});

test('item 14: today the FILED slip opens its reading, then Butch says where the lens goes', () => {
  const model = oaModel('unfile');
  model.moveLens(40, 40);
  const log = record(model);
  const h = model.hotspots('duplicate').find((spot) => spot.id === 'sealToday');
  assert.ok(model.clickTile('duplicate', h.rect[0] + 0.05, h.rect[1] + 0.05));
  assert.equal(model.state.card?.reading, true, 'the slip is held up first');
  assert.ok(!log.some(([n]) => n === 'caption'), 'the line waits for the reading to close');
  model.closeCard();
  settle(model);
  assert.match(log.find(([n]) => n === 'caption')[1].text, /1978/);
});

test('item 14: the stub reads before and after the punch (two readables, one id: the live one opens)', () => {
  const model = oaModel();
  settle(model);
  const log = record(model);
  assert.ok(model.openReading('stub', 'stub'));
  model.closeCard();
  assert.ok(model.activateHotspot('stub', 'hole'));
  settle(model);
  assert.ok(model.openReading('stub', 'stub'), 'after the punch too');
  const cards = log.filter(([n]) => n === 'card').map(([, p]) => p.card.hole);
  assert.deepEqual(cards, [false, true], 'the punched stub shows its hole');
  // the FILED slip's click acts by reading: it is "look closer" too
  const sealToday = ONE_ANSWER_ACT.tiles.duplicate.states.filed.hotspots.find((h) => h.id === 'sealToday');
  assert.deepEqual(hotspotAffordance(sealToday), { look: true, verb: 'READ' });
});

test('item 14: readings never block the puzzle: not hotspots, not prompts, no state change', () => {
  const model = oaModel();
  settle(model);
  const before = JSON.stringify(model.state.slots) + model.state.stepIndex;
  model.state.slots.forEach((tile) => model.readables(tile).filter((r) => r.enabled).forEach((r) => {
    assert.ok(model.openReading(tile, r.id));
    model.closeCard();
  }));
  assert.equal(JSON.stringify(model.state.slots) + model.state.stepIndex, before);
  assert.ok(model.state.read.length >= 3);
  // they are refused while the script holds the player
  model.state.inputLocked = true;
  assert.equal(model.openReading('duplicate', 'slip'), false);
});

test('item 14: the reading view is large and follows TEXT SIZE', () => {
  assert.ok(readingFontPx({ size: 'xl' }, 1) >= 72, 'a name reads big at 1920×1080');
  assert.ok(readingFontPx({ size: 'm', font: 'mono' }, 1) >= 28);
  assert.ok(readingFontPx({ size: 'xl' }, 1.3) > readingFontPx({ size: 'xl' }, 1));
  assert.ok(readingFontPx({ size: 'xl' }, 0.9) < readingFontPx({ size: 'xl' }, 1));
  assert.ok(readingInsets('tag', 1)[0] > readingInsets('paper', 1)[0], 'a tag keeps its eyelet clear');
  // PanelScene opens it for `reading` cards, re-lays it out on a settings change, and closes it like a card
  assert.match(scene, /m\.on\('card', \(\{ card \}\) => \(card\?\.reading \? this\.showReading\(card\) : this\.showCard\(card\)\)\);/);
  assert.match(scene, /this\.reader\?\.relayout\(this\.textScale\);/);
  assert.match(scene, /if \(this\.reader\?\.isOpen\) \{\s*this\.reader\.close/);
  const view = read('src/chapters/nightService/readingView.js');
  assert.match(view, /CLICK · \[E\] · \[ESC\]  TO PUT IT BACK/);
  assert.match(view, /1978 · THROUGH THE PUNCH HOLE/);
});

// ---------------------------------------------------------------------------
// item 15 · dialogue

test('item 15: while a line is spoken the windows and tags step back and the line says CONTINUE', () => {
  assert.match(scene, /this\.captionNext = this\.add\.text\(592, -14, '▸ CONTINUE'/);
  assert.match(scene, /'CLICK · E'/);
  assert.match(scene, /view\.dim\.setAlpha\(0\.26 \* this\.dialogueDim\)/);
  assert.match(scene, /entry\.holder\.setAlpha\(1 - 0\.8 \* this\.dialogueDim\)/);
  assert.match(scene, /this\.drawRing\(view, ring, live, current, 1 - this\.dialogueDim\)/);
  // a click anywhere moves the line on, and shows that it did
  assert.match(scene, /if \(this\.caption && !this\.caption\.auto\) \{ this\.advanceCaption\(\{ at: p \}\); return; \}/);
  assert.match(scene, /cueContinue\(at\) \{/);
  // the exhibit's first dialogue starts while the plate and the tag become live: they must not look operable
  const unfile = ONE_ANSWER_ACT.steps.find((step) => step.id === 'unfile').do;
  assert.ok(unfile.findIndex((e) => e.dialogue) > unfile.findIndex((e) => e.unlockInput));
});

// ---------------------------------------------------------------------------
// item G · links and painted plates

test('item G: links are light seams with pooled glow, not flat bars', () => {
  const draw = scene.slice(scene.indexOf('  drawLinks(dt = 16) {'), scene.indexOf('  linkPool(key) {'));
  assert.ok(draw.length > 200);
  assert.doesNotMatch(draw, /fillRect/, 'no flat bars across the gutter');
  assert.match(draw, /g\.lineBetween\(s0\.x, s0\.y, s1\.x, s1\.y\)/);
  assert.match(draw, /const pools = this\.linkPool\(link\.key\);/);
  assert.match(scene, /this\.fxApi\(\)\.lightRun\(points, \{ duration: 560, size: 46, trail: 9 \}\);/);
});

test('item G: a tile state may declare a painted plate (cover-fit, under its draw)', () => {
  const fit = coverFit(2000, 1000, 745, 414);
  assert.ok(Math.abs(fit.h - 414) < 1e-6 && fit.w >= 745, 'covers the tile');
  assert.ok(fit.x <= 0 && Math.abs(fit.x + (fit.w - 745) / 2) < 1e-6, 'centred');
  const tall = coverFit(500, 1000, 745, 414);
  assert.ok(Math.abs(tall.w - 745) < 1e-6 && tall.h >= 414);
  assert.equal(plateKey('/a.png'), plateKey('/a.png'));
  assert.notEqual(plateKey('/a.png'), plateKey('/b.png'));
  const act = defineAct({
    id: 'plates', grid: { cols: 1, rows: 1 }, slots: ['a'],
    tiles: { a: { states: { one: { plate: '/one.png', platePast: '/one-1978.png', draw() {} }, two: { plate: '/one.png' } } } },
    steps: [],
  });
  assert.deepEqual(actPlates(act).map((p) => p.url).sort(), ['/one-1978.png', '/one.png']);
  assert.deepEqual(actPlates(ACTS.act1), [], 'no act ships plates yet');
  assert.match(scene, /actPlates\(act\)\.forEach\(\(\{ key, url \}\) => \{ if \(!this\.textures\.exists\(key\)\) this\.load\.image\(key, url\); \}\);/);
  assert.match(scene, /pctx\.plate = this\.drawPlate\(view, present, sceneDef\?\.plate\);\s*sceneDef\?\.draw\?\.\(pctx\);/);
  assert.match(read('src/chapters/nightService/README.md'), /plate: '/);
});

test('chips: [KEY] is a key cap, the rest plain words', () => {
  assert.deepEqual(chipSegments('NEED A HINT?  [H]'), [{ text: 'NEED A HINT?', cap: false }, { text: 'H', cap: true }]);
  assert.deepEqual(chipSegments('[ENTER] RING'), [{ text: 'ENTER', cap: true }, { text: 'RING', cap: false }]);
});
