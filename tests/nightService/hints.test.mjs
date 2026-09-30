import test from 'node:test';
import assert from 'node:assert/strict';
import { ACTS, ACT_ORDER, startCarry } from '../../src/chapters/nightService/acts/index.js';
import { createPanelModel, framePoints, tilePoint } from '../../src/chapters/nightService/panelModel.js';
import {
  FIRST_USE_MS, HINT_TIERS, PULSE_REPEAT_MS, createHintDirector, pickGesture, resolveDrag, stepVerb,
} from '../../src/chapters/nightService/hints.js';
import { HINT_LINES, hintLine } from '../../src/chapters/nightService/hintLines.js';
import { ONE_ANSWER_ACT } from '../../src/chapters/nightService/acts/oneAnswer.js';
import { settle } from './helpers.mjs';

/** Advance a director in 100 ms frames; return [{ at, event }]. */
function run(director, ms, opts = {}) {
  const out = [];
  let t = 0;
  while (t < ms) {
    t += 100;
    director.update(100, opts).forEach((event) => out.push({ at: director.idle, event }));
  }
  return out;
}

test('hint tiers: pulse at 25 s, ghost hand at 60 s, the Conductor at 120 s', () => {
  assert.deepEqual(HINT_TIERS, { pulse: 25000, ghost: 60000, caption: 120000 });
  const seen = new Set(['zoom']);
  const d = createHintDirector({ seen });
  d.setStep('act0:bell', 'zoom');
  const events = run(d, 130000);
  const at = (name) => events.filter((e) => e.event === name).map((e) => e.at);
  assert.equal(at('pulse')[0], 25000);
  assert.equal(at('pulse')[1], 25000 + PULSE_REPEAT_MS, 'tier 1 repeats softly');
  assert.equal(at('ghost')[0], 60000);
  assert.deepEqual(at('caption'), [120000], 'tier 3 once per idle stretch');
  assert.equal(at('first').length, 0, 'a verb already shown is not demonstrated early');
  assert.equal(d.tier, 3);
});

test('hint tiers: any meaningful input resets the idle clock (and re-arms every tier)', () => {
  const d = createHintDirector({ seen: new Set(['drag']) });
  d.setStep('act1:floor-link', 'drag');
  run(d, 59000);
  assert.equal(d.tier, 1);
  d.input();
  assert.equal(d.idle, 0);
  assert.equal(d.tier, 0);
  const events = run(d, 61000);
  assert.equal(events.find((e) => e.event === 'pulse').at, 25000);
  assert.equal(events.find((e) => e.event === 'ghost').at, 60000);
});

test('hint tiers: the clock holds still while nothing waits for the player', () => {
  const d = createHintDirector();
  d.setStep('act2:punch', 'click');
  assert.deepEqual(run(d, 200000, { active: false }), []);
  assert.equal(d.idle, 0);
});

test('first use of a verb: the ghost hand after 8 s, once per verb across the chapter', () => {
  const seen = new Set();
  const d = createHintDirector({ seen });
  d.setStep('act0:bell', 'zoom');
  const events = run(d, 9000);
  assert.deepEqual(events.map((e) => e.event), ['first']);
  assert.equal(events[0].at, FIRST_USE_MS);
  assert.ok(seen.has('zoom'));
  // the next zoom step (and a later act sharing the set) waits for the full tiers
  const later = createHintDirector({ seen });
  later.setStep('act0:stub', 'zoom');
  assert.deepEqual(run(later, 20000), []);
  // solving a step before its demo still counts the verb as learned
  const d2 = createHintDirector({ seen });
  d2.setStep('act0:wake', 'zoomOut');
  run(d2, 3000);
  d2.setStep('act0:stub', 'zoom');
  assert.ok(seen.has('zoomOut'));
});

test('a verb that resolves late (after the step\'s opening beat) still gets its first-use demo', () => {
  const d = createHintDirector({ seen: new Set() });
  d.setStep('act2:stop', null); // the lens is not out yet: no gesture
  run(d, 3000);
  assert.equal(d.verb, null);
  assert.ok(d.refineVerb('lensClick'));
  assert.equal(d.refineVerb('zoom'), false, 'only once');
  const events = run(d, 6000);
  assert.deepEqual(events.map((e) => e.event), ['first']);
});

test('SHOW ME plays tier 2 at once without resetting the clock', () => {
  const d = createHintDirector({ seen: new Set() });
  assert.deepEqual(d.request(), [], 'nothing to show between steps');
  d.setStep('act2:stop', 'lensClick');
  run(d, 3000);
  assert.deepEqual(d.request(), ['ghost']);
  assert.equal(d.idle, 3000);
  assert.ok(d.seen.has('lensClick'));
  assert.ok(!run(d, 6000).some((e) => e.event === 'first'), 'no second demo after SHOW ME');
});

test('resolveDrag finds the panel to move and the slot to drop it on', () => {
  const model = createPanelModel(ACTS.act1, { carry: startCarry('act1') });
  // desk (TL) must be left of the door (BR): take the desk to BL
  assert.deepEqual(resolveDrag(model, { tile: 'desk', leftOf: 'door' }), { tile: 'desk', from: 0, to: 2 });
  model.swap(0, 2);
  assert.equal(resolveDrag(model, { tile: 'desk', leftOf: 'door' }), null);
  // 1×2: the door must go left of the desk — a straight swap
  const two = createPanelModel(ACTS.act05, { step: 'carrier' });
  assert.deepEqual(resolveDrag(two, { tile: 'door', leftOf: 'desk' }), { tile: 'door', from: 1, to: 0 });
  // the Act 2 drop: rack above the aisle (George's layout: rack moved to the bottom row)
  const act2 = createPanelModel(ACTS.act2, { carry: startCarry('act2') });
  act2.swap(0, 3); // board TL, window TR, aisle BL, rack BR
  act2.swap(1, 2); // board TL, aisle TR, window BL, rack BR  — aisle top-right, rack bottom-right
  const drag = resolveDrag(act2, { tile: 'rack', above: 'aisle' });
  assert.ok(drag);
  act2.swap(drag.from, drag.to);
  assert.ok(act2.evaluate({ above: { a: 'rack', b: 'aisle' } }), JSON.stringify(act2.state.slots));
});

test('every hinted step in acts 0–3 resolves a gesture at its start', () => {
  // walk each act by dev step jumps: every step with a hint shows something
  for (const actId of ACT_ORDER) {
    const act = ACTS[actId];
    act.steps.forEach((step) => {
      if (!step.hint) return;
      const model = createPanelModel(act, { carry: startCarry(actId), step: step.id });
      settle(model);
      const current = model.currentStep();
      if (current?.id !== step.id) return; // its trigger already held after the jump
      const gesture = pickGesture(model, current);
      assert.ok(gesture || current.hint.actor, `${actId}:${step.id} has no gesture`);
      if (gesture) assert.ok(stepVerb(model, current), `${actId}:${step.id} verb`);
    });
  }
});

test('the Museum exhibit (oneAnswer.js) gets the same ghost-hand gestures', () => {
  const carry = { bell: 0, items: [], flags: [], linkHistory: [], ...ONE_ANSWER_ACT.start };
  for (const id of ['punch', 'unfile', 'plate', 'tag', 'route']) {
    const model = createPanelModel(ONE_ANSWER_ACT, { carry, step: id });
    settle(model);
    if (model.currentStep()?.id !== id) continue;
    assert.ok(pickGesture(model), `oneAnswer:${id} has a gesture`);
  }
  const unfile = createPanelModel(ONE_ANSWER_ACT, { carry, step: 'unfile' });
  settle(unfile);
  assert.equal(pickGesture(unfile).verb, 'lensClick');
});

test('the gestures match the verbs of the lessons', () => {
  const act0 = createPanelModel(ACTS.act0, { step: 'wake' });
  assert.deepEqual(pickGesture(act0), { kind: 'zoomOut', verb: 'zoomOut', tile: 'office' });
  const stop = createPanelModel(ACTS.act2, { carry: startCarry('act2'), step: 'stop' });
  const lens = pickGesture(stop);
  assert.equal(lens.kind, 'lens');
  assert.equal(lens.verb, 'lensClick');
  assert.equal(lens.hotspot, 'request');
  assert.equal(lens.click, true);
  const arrive = createPanelModel(ACTS.act2, { carry: startCarry('act2'), step: 'arrive' });
  assert.deepEqual(pickGesture(arrive), { kind: 'frame', verb: 'frame', frame: 'windowFrame', from: 'window', to: 'rack' });
  const lane = createPanelModel(ACTS.act3, { carry: startCarry('act3'), step: 'hedge' });
  ['city', 'hawthorn', 'orchard', 'carriage', 'gap', 'platform'].forEach((tile, i) => {
    if (lane.state.slots[i] !== tile) lane.swap(i, lane.state.slots.indexOf(tile));
    settle(lane);
  });
  assert.equal(lane.textState().step, 'lane');
  const hedge = pickGesture(lane);
  assert.equal(hedge.kind, 'lens');
  assert.equal(hedge.verb, 'lens', 'hold, not click: the past-era edge');
});

test('tier-3 lines: one short, in-fiction line for every hinted Chapter 1 step', () => {
  for (const actId of ACT_ORDER) {
    ACTS[actId].steps.filter((step) => step.hint).forEach((step) => {
      const model = createPanelModel(ACTS[actId], { carry: startCarry(actId), step: step.id });
      const line = hintLine(actId, step.id, model);
      assert.ok(line, `${actId}:${step.id} has a line`);
      assert.ok(line.length <= 80, `${actId}:${step.id} is one line`);
      assert.doesNotMatch(line, /click|drag|press|button|mouse|tap/i, `${actId}:${step.id} stays diegetic`);
    });
  }
  assert.equal(HINT_LINES['act2:mark'], 'The tag says more in 1978 light.');
});

test('tier-3 lines: the Museum exhibit has its own (Butch thinking aloud)', () => {
  const carry = { bell: 0, items: [], flags: [], linkHistory: [], ...ONE_ANSWER_ACT.start };
  assert.equal(ONE_ANSWER_ACT.hintSpeaker, 'BUTCH');
  ONE_ANSWER_ACT.steps.filter((step) => step.hint).forEach((step) => {
    const model = createPanelModel(ONE_ANSWER_ACT, { carry, step: step.id });
    const line = hintLine('oneAnswer', step.id, model);
    assert.ok(line, `oneAnswer:${step.id} has a line`);
    assert.ok(line.length <= 80, `oneAnswer:${step.id} is one line`);
    assert.doesNotMatch(line, /click|drag|press|button|mouse|tap/i, `oneAnswer:${step.id} stays diegetic`);
  });
});

/** Can the player really do what the ghost hand shows, with the lens where it is? */
function reachable(model, g) {
  if (g.kind === 'click' || (g.kind === 'lens' && g.click && g.hotspot)) {
    const slot = model.slotRect(g.tile);
    const pt = tilePoint(slot, g.u, g.v);
    if (g.kind === 'lens') model.moveLens(pt.x, pt.y); // the gesture carries the lens there first
    return model.hotspotAt(g.tile, g.u, g.v, pt)?.id === g.hotspot;
  }
  if (g.kind === 'frame') return framePoints(model.frameGrip(g.frame)).some(([u, v]) => model.frameGripAt(g.from, u, v) === g.frame);
  if (g.kind === 'zoomOut') return model.canZoomOut(g.tile);
  if (g.kind === 'drag') return model.canDrag(g.tile);
  return model.state.lens.enabled;
}

test('the ghost hand never points at a target the player cannot use (lens anywhere)', () => {
  const acts = [...ACT_ORDER.map((id) => [id, ACTS[id], startCarry(id)]), ['oneAnswer', ONE_ANSWER_ACT, { bell: 0, items: [], flags: [], linkHistory: [], ...ONE_ANSWER_ACT.start }]];
  let checked = 0;
  acts.forEach(([actId, act, carry]) => act.steps.filter((step) => step.hint).forEach((step) => {
    const base = createPanelModel(act, { carry, step: step.id });
    settle(base);
    if (base.currentStep()?.id !== step.id) return;
    const g = pickGesture(base);
    if (!g) return;
    assert.ok(reachable(createPanelModel(act, { carry, step: step.id }), g), `${actId}:${step.id} ${g.kind}`);
    // and with the lens parked right on top of the target (alpha #1)
    if (base.state.lens.enabled && (g.kind === 'click' || g.kind === 'frame')) {
      const model = createPanelModel(act, { carry, step: step.id });
      settle(model);
      const tile = g.kind === 'frame' ? g.from : g.tile;
      const [u, v] = g.kind === 'frame' ? framePoints(model.frameGrip(g.frame))[0] : [g.u, g.v];
      const pt = tilePoint(model.slotRect(tile), u, v);
      model.moveLens(pt.x, pt.y);
      assert.ok(reachable(model, pickGesture(model)), `${actId}:${step.id} under the lens`);
    }
    checked += 1;
  }));
  assert.ok(checked >= 15, `${checked} gestures checked`);
});

test('alpha #1: after marking BELLWETHER, the case tag under the lens takes the click', () => {
  const model = createPanelModel(ACTS.act2, { carry: startCarry('act2'), step: 'mark' });
  settle(model);
  // mark it through the lens, as a player does
  const mark = model.hotspots('rack').find((h) => h.id === 'bellwether');
  const rack = model.slotRect('rack');
  const at = tilePoint(rack, mark.rect[0] + mark.rect[2] / 2, mark.rect[1] + mark.rect[3] / 2);
  model.moveLens(at.x, at.y);
  assert.ok(model.clickTile('rack', mark.rect[0] + mark.rect[2] / 2, mark.rect[1] + mark.rect[3] / 2, at));
  settle(model);
  assert.equal(model.currentStep().id, 'orchard');
  // the ghost hand points at the case tag, which is under the lens: a click there zooms
  const g = pickGesture(model);
  assert.equal(g.hotspot, 'caseTag');
  const pt = tilePoint(rack, g.u, g.v);
  assert.ok(model.lensCovers(pt), 'the lens still sits over the case');
  assert.ok(model.clickTile('rack', g.u, g.v, pt));
  assert.equal(model.state.tiles.rack.state, 'tag');
});
