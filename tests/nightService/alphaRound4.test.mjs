// Alpha round 4 (2026-10-05), Chapter 1 and the one-answer exhibit: the
// affordances a stranger missed, as model proofs where the rule lives in the
// model and as wiring checks where it lives in the renderer.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ACTS, startCarry } from '../../src/chapters/nightService/acts/index.js';
import { ONE_ANSWER_ACT } from '../../src/chapters/nightService/acts/oneAnswer.js';
import { BELL_HIT } from '../../src/chapters/nightService/art/act0Art.js';
import { TEXT_TAG, createPanelModel, tagRect, textTagWidth } from '../../src/chapters/nightService/panelModel.js';
import { HINT_TIERS, createHintDirector, pickGesture, unmetSeam } from '../../src/chapters/nightService/hints.js';
import { settle } from './helpers.mjs';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const scene = read('src/chapters/nightService/PanelScene.js');
const inRect = ([x, y, w, h], u, v) => u >= x && v >= y && u <= x + w && v <= y + h;
const exhibit = (options = {}) => createPanelModel(ONE_ANSWER_ACT, { carry: { bell: 0, items: [], flags: [], linkHistory: [], ...ONE_ANSWER_ACT.start }, ...options });

test('P1 · Act 0: the paper tag is clickable as well as the bell it hangs from', () => {
  const model = createPanelModel(ACTS.act0, { carry: startCarry('act0') });
  const bell = model.hotspots('office').find((h) => h.id === 'bell');
  const rect = tagRect(bell, model.layout.tileW, model.layout.tileH);
  assert.ok(rect, 'the bell hangs a tag');
  // a point on the paper, outside the bell's own click box
  let hit = null;
  for (let i = 1; i < 10 && !hit; i += 1) {
    for (let j = 1; j < 10 && !hit; j += 1) {
      const u = rect[0] + (rect[2] * i) / 10;
      const v = rect[1] + (rect[3] * j) / 10;
      if (!inRect(BELL_HIT, u, v)) hit = [u, v];
    }
  }
  assert.ok(hit, 'the tag reaches outside the bell');
  assert.equal(model.hotspotAt('office', hit[0], hit[1])?.id, 'bell');
  assert.ok(model.clickTile('office', hit[0], hit[1]));
  assert.equal(model.state.tiles.office.state, 'bell', 'the tag zooms in, like the bell');
  // nowhere near a tag: nothing
  assert.equal(model.hotspotAt('office', 0.95, 0.95), null);
});

test('P1 · Act 0: the first beat pulses its tag early (6 s), once; the hand over anything that answers', () => {
  const bell = ACTS.act0.steps.find((step) => step.id === 'bell');
  assert.equal(bell.hint.pulseAt, 6000);
  const hints = createHintDirector();
  hints.setStep('act0:bell', 'zoom', { pulseAt: bell.hint.pulseAt });
  assert.deepEqual(hints.update(5900), []);
  assert.ok(hints.update(200).includes('pulse'), 'at 6 s');
  assert.ok(hints.update(2000).includes('first'), 'the ghost hand at 8 s');
  // after the player's first input the usual tiers apply again
  hints.input();
  assert.deepEqual(hints.update(HINT_TIERS.pulse - 100), []);
  assert.ok(hints.update(200).includes('pulse'));
  assert.match(scene, /else if \(hit\) \{ cursor = 'pointer'; hovered = \{ tile, hotspot: hit \}; \}/);
});

test('P1 · worded tags: their size follows the text and their paper is clickable', () => {
  assert.ok(textTagWidth('PUNCH THE STUB') > textTagWidth('TURN IT OVER'));
  const hole = ONE_ANSWER_ACT.tiles.stub.states.default.hotspots.find((h) => h.id === 'hole');
  const rect = tagRect(hole, 756, 420);
  const w = textTagWidth('PUNCH THE STUB') * TEXT_TAG.scale;
  assert.ok(rect[2] * 756 >= w * 0.95, 'the box spans the typed paper');
  assert.match(scene, /ensureTextTag\(text\) \{/);
  assert.match(scene, /paintUnfoldTag\(c, this\.env\?\.paper \?\? null, text,/);
});

test('P2 · Act 0: a passing line never rides into a close-up; Act 0.5 says Locked and points at the key', () => {
  assert.match(scene, /if \(this\.caption\?\.auto && this\.clock - \(this\.caption\.at \?\? 0\) > 600\) this\.hideCaption\(\);/);
  const floor = ACTS.act05.steps.find((step) => step.id === 'floor');
  const caption = floor.do.find((effect) => effect.caption)?.caption;
  assert.match(caption.text, /^Locked\./);
  assert.match(caption.text, /key/);
  const pulse = floor.do.find((effect) => effect.fx?.name === 'pulse')?.fx;
  assert.deepEqual(pulse.hint, { tile: 'desk', hotspot: 'keys' });
  const model = createPanelModel(ACTS.act05, { step: 'carrier' });
  assert.ok(model.hotspots('desk').find((h) => h.id === 'keys').enabled, 'the pulse has a live target');
});

test('P2 · Acts II–III: the lens steps off a close-up with no 1978 layer', () => {
  assert.match(scene, /if \(dir === 'in'\) this\.lensAside\(tile, to\);/);
  assert.match(scene, /lensAside\(tileId, stateId\) \{/);
  assert.match(scene, /closeUpWithoutPast\(tileId\) \{/);
  // the close-ups it is for have no past layer; the ones with one keep the lens
  assert.equal(ACTS.act2.tiles.rack.states.orchard.drawPast, undefined);
  assert.equal(ACTS.act2.tiles.rack.states.tag.drawPast, undefined);
  assert.equal(ACTS.act3.tiles.orchard.states.house.drawPast, undefined);
  assert.equal(typeof ONE_ANSWER_ACT.tiles.plate.states.drawing.drawPast, 'function');
});

test('P2 · Act III: the hill is cued, and the zoomed-out house no longer pulls you back in', () => {
  const lane = ACTS.act3.steps.find((step) => step.id === 'lane');
  assert.equal(lane.hint.zoomOutTile, 'orchard');
  assert.match(scene, /cueHint\.zoomOutTile \?\? cueHint\.tile/);
  const model = createPanelModel(ACTS.act3, { carry: startCarry('act3'), step: 'lane' });
  assert.equal(model.state.tiles.orchard.state, 'house');
  assert.equal(model.evaluate(lane.hint.zoomOutCue), true, 'the glyph breathes while the house shows');
  assert.ok(model.zoomOut('orchard'));
  assert.equal(model.evaluate(lane.hint.zoomOutCue), false);
  assert.equal(model.hotspots('orchard').find((h) => h.id === 'house').enabled, false, 'no tag back into the house');
  // before the windows meet, the house still opens (the first lesson needs it)
  const first = createPanelModel(ACTS.act3, { carry: startCarry('act3') });
  first.zoomOut('orchard');
  assert.ok(first.hotspots('orchard').find((h) => h.id === 'house').enabled);
});

test('P1 · cards say how to put them down; quiet answers never wear a ring', () => {
  assert.match(scene, /'CLICK OR PRESS ENTER TO CLOSE'/);
  assert.match(scene, /if \(hotspot\.quiet\) return;/);
});

test('P1 · exhibit: one worded prompt at a time, along the intended chain', () => {
  const model = exhibit();
  settle(model);
  const hole = model.hotspots('stub').find((h) => h.id === 'hole');
  assert.equal(hole.tag.text, 'PUNCH THE STUB');
  assert.ok(hole.tag.ring);
  const live = () => Object.keys(model.state.tiles).flatMap((tile) => model.hotspots(tile).filter((h) => h.enabled && !h.quiet).map((h) => `${tile}.${h.id}`)).sort();
  assert.deepEqual(live(), ['stub.hole']);
  model.activateHotspot('stub', 'hole');
  settle(model);
  const today = model.hotspots('duplicate').find((h) => h.id === 'sealToday');
  assert.equal(today.tag.text, 'CARRY THE LENS HERE');
  assert.ok(today.enabled);
  const seal = model.hotspots('duplicate').find((h) => h.id === 'seal');
  const r = model.slotRect('duplicate');
  model.moveLens(r.x + (seal.rect[0] + seal.rect[2] / 2) * r.w, r.y + (seal.rect[1] + seal.rect[3] / 2) * r.h);
  assert.ok(model.activateHotspot('duplicate', 'seal'));
  settle(model);
  assert.deepEqual(live(), ['plate.print', 'tag.turn']);
  assert.equal(model.hotspots('plate').find((h) => h.id === 'print').tag.text, 'OPEN PLATE IV');
  assert.equal(model.hotspots('tag').find((h) => h.id === 'turn').tag.text, 'TURN IT OVER');
});

test('P1 · exhibit: hints come sooner (10 s on the first step), and the route shows its joints', () => {
  const steps = Object.fromEntries(ONE_ANSWER_ACT.steps.map((step) => [step.id, step]));
  assert.equal(steps.punch.hint.pulseAt, 10000);
  ['unfile', 'plate', 'tag', 'route'].forEach((id) => assert.ok(steps[id].hint.pulseAt <= 15000, id));
  const intro = steps.intro.do;
  assert.deepEqual(intro.at(-1), { fx: { name: 'pulse', hint: { tile: 'stub', hotspot: 'hole' } } }, 'the stub glows as the card goes down');
  const model = exhibit({ step: 'route' });
  settle(model);
  const seam = unmetSeam(model, steps.route.hint.seams);
  assert.ok(seam, 'the Archivist\'s order leaves a joint apart');
  assert.ok(pickGesture(model));
  assert.match(scene, /\{ pulseAt: step\?\.hint\?\.pulseAt \}/);
});
