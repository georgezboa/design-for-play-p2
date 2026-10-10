// Round 11 · Movement I · LOST PROPERTY as a skill fight
// (movements/lostProperty.js): claim cases read through the lens and
// volleyed back, trains in the seams, 1978 ghost trains, the OVERDUE stamp.
import test from 'node:test';
import assert from 'node:assert/strict';

import { INTRO_SECONDS } from '../../src/chapters/finalBoss/conductorFight.js';
import {
  CASE_DAMAGE, LENS_LEAD, LENS_WIDE, VOLLEY_DAMAGE, VOLLEY_S, createLostPropertyFight, panelOf, placeCase,
} from '../../src/chapters/finalBoss/movements/lostProperty.js';
import { DT, harness } from './round11Harness.mjs';
// ------------------------------------------------------------ I

test('I: a claim case reads only through the lens and is punched back; on the bounce is a volley', () => {
  const h = harness(createLostPropertyFight, { x: 0, z: 5 });
  h.step(INTRO_SECONDS + DT * 2);
  assert.equal(h.director.state, 'teach');
  const c = h.director.cases[0];
  assert.ok(c?.claim && c.teach, 'the phase opens with one claim case, thrown beside Butch');
  assert.ok(Math.hypot(c.x - h.body.x, c.z - h.body.z) > 2, 'never on him');
  assert.equal(h.director.attacks.length, 1, 'and nothing else');
  // stand at the ring's edge, lens on it, punch as it lands
  h.body.x = c.x - 1.7; h.body.z = c.z;
  h.until((ev) => ev.some((e) => e.type === 'case-landed'), 4, { aim: { x: c.x, z: c.z } });
  const ev = h.step(DT, { act: true, aim: { x: c.x, z: c.z } });
  assert.ok(ev.some((e) => e.type === 'act' && e.result === 'volley'));
  const dmg = h.until((evs) => evs.some((e) => e.type === 'damage'), 2);
  assert.equal(dmg.find((e) => e.type === 'damage').amount, VOLLEY_DAMAGE);
  assert.equal(h.director.state, 'fight', 'the lesson learned, the phase begins');
  assert.ok(VOLLEY_DAMAGE > CASE_DAMAGE * 1.5);
  assert.ok(VOLLEY_S >= 0.4);
});

test('I: the lens leads Butch the way he faces, follows the mouse when aimed, and widens in phase 3', () => {
  const h = harness(createLostPropertyFight, { x: 0, z: 4 });
  h.step(0.2, { dx: 1 });
  assert.ok(Math.abs(h.director.lens.x - (h.body.x + LENS_LEAD)) < 0.05, 'keyboard: it leads');
  h.step(DT, { aim: { x: -9, z: -5 } });
  assert.deepEqual([h.director.lens.x, h.director.lens.z, h.director.lens.aimed], [-9, -5, true]);
  h.director.jumpToPhase(2);
  h.step(DT);
  assert.equal(h.director.lens.radius, LENS_WIDE);
  // a punch with the lens elsewhere is refused, and an unclaimed case says so
  assert.equal(panelOf(0, 0.4), null, 'the seams are rails');
  assert.notEqual(panelOf(5, 4), null);
  const spot = placeCase(0.1, 0.5);
  assert.ok(Math.abs(spot.x) > 1.4 && Math.abs(spot.z - 0.4) > 1.4, 'no case lands on a rail');
});

test('I: phase 2 runs trains in the seams (sepia 1978 ghosts too); phase 3 stamps panels in chains', () => {
  const h = harness(createLostPropertyFight, { x: 5, z: 4 });
  h.director.jumpToPhase(1);
  const p2 = h.step(30).filter((e) => e.type === 'telegraph').map((e) => e.attack);
  assert.ok(p2.some((a) => a.kind === 'train' && !a.ghost));
  assert.ok(p2.some((a) => a.kind === 'train' && a.ghost), 'a 1978 train');
  assert.ok(p2.some((a) => a.source === 'stamp'));
  p2.filter((a) => a.kind === 'train').forEach((a) => assert.ok(a.tele >= 1, 'a train always warns for a second'));
  const h3 = harness(createLostPropertyFight, { x: 5, z: 4 });
  h3.director.jumpToPhase(2);
  const p3 = h3.step(4).filter((e) => e.type === 'telegraph' && e.attack.source === 'stamp');
  assert.ok(p3.length >= 2, 'a chain: two panels, one after the other');
  assert.ok(p3[1].attack.tele > p3[0].attack.tele, 'the second comes later');
  assert.notEqual(p3[0].attack.meta.panel, p3[1].attack.meta.panel);
});

test('I: the last return finishes the movement (the lens opens onto Borrowed Light)', () => {
  const h = harness(createLostPropertyFight);
  h.director.jumpToPhase(2);
  h.director.skipTeach();
  h.director.damage(40);
  const ev = h.until((evs) => evs.some((e) => e.type === 'finished'), 3);
  assert.ok(ev, 'finished');
  assert.equal(h.director.state, 'done');
});

