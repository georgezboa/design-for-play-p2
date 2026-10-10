// Round 11 · Movement IV · THE PAINTED COUNTRY as a skill fight
// (movements/paintedCountry.js): wet colour absorbed, returns that land
// only while his brush is dry, dash-through sweeps, the heavy brush.
import test from 'node:test';
import assert from 'node:assert/strict';

import { createFightRunner } from '../../src/chapters/finalBoss/conductorFight.js';
import { paintReturnDamage } from '../../src/chapters/finalBoss/finaleModel.js';
import { ABSORB_S, BRUSH_WEIGHT, OPEN_S, RETURN_S, STROKE_FLIGHT_S, WET_S, createPaintFight } from '../../src/chapters/finalBoss/movements/paintedCountry.js';
import { DT, harness } from './round11Harness.mjs';
// ------------------------------------------------------------ IV

test('IV: wet colour is absorbed with a short hold; a return lands only while his brush is dry', () => {
  const h = harness(createPaintFight, { x: 0, z: 4 });
  h.until((ev) => ev.some((e) => e.type === 'wet'), 6);
  const puddle = h.director.puddles[0];
  assert.ok(puddle.teach, 'the first colour is a lesson: it lands beside him and does not hurt');
  h.body.x = puddle.x + 1; h.body.z = puddle.z;
  h.step(ABSORB_S * 0.6, { actHeld: true });
  assert.equal(h.body.color, 0, 'a tap is not enough');
  h.step(ABSORB_S, { actHeld: true });
  assert.equal(h.body.color, 1);
  assert.ok(Math.abs(h.body.speedScale - (1 - BRUSH_WEIGHT)) < 1e-9, 'the brush is heavier');
  // the teaching wash opens him
  const open = h.until((ev) => ev.some((e) => e.type === 'open'), 6);
  assert.ok(open && h.director.open);
  h.step(RETURN_S + DT, { retHeld: true });
  const landed = h.until((ev) => ev.some((e) => e.type === 'stroke-landed'), STROKE_FLIGHT_S + 0.2);
  assert.ok(landed);
  assert.equal(landed.find((e) => e.type === 'damage').amount, paintReturnDamage(1));
  assert.equal(h.body.color, 0);
  assert.ok(OPEN_S >= 2 && WET_S >= 1.5);
});

test('IV: a return while he is wet is painted out and flicked back as colour to take again', () => {
  const h = harness(createPaintFight, { x: 0, z: 4 });
  h.director.skipTeach();
  h.body.color = 2;
  h.step(RETURN_S + DT, { retHeld: true });
  const ev = h.until((evs) => evs.some((e) => e.type === 'stroke-blocked'), STROKE_FLIGHT_S + 0.2);
  assert.ok(ev);
  assert.equal(h.director.track.hp, 100);
  const flicks = h.step(1.2).filter((e) => e.type === 'telegraph' && e.attack.meta?.flicked);
  assert.equal(flicks.length, 2, 'two colours, flicked back');
  flicks.forEach((e) => assert.ok(Math.hypot(e.attack.x - h.body.x, e.attack.z - h.body.z) < 3));
});

test('IV: dashing through a sweep as it passes takes its colour; a hit spills the brush; IV ends at 12', () => {
  const h = harness(createPaintFight, { x: 0, z: 0 });
  h.director.jumpToPhase(1);
  const sweepEv = h.until((ev) => ev.some((e) => e.type === 'telegraph' && e.attack.kind === 'sweep'), 6);
  const sweep = sweepEv.find((e) => e.type === 'telegraph').attack;
  let took = false;
  for (let t = 0; t < 6 && !took; t += DT) {
    const along = sweep.axis === 'x' ? h.body.x : h.body.z;
    const near = sweep.state === 'live' && Math.abs(along - sweep.pos) < 1.2;
    const ev = h.step(DT, { dash: near && h.body.dashCd <= 0 });
    if (ev.some((e) => e.type === 'absorb' && e.via === 'dash')) took = true;
  }
  assert.ok(took, 'through the sweep');
  const runner = createFightRunner({ director: createPaintFight({ seed: 2 }) });
  runner.body.color = 3;
  runner.body.inv = 0;
  runner.hurt({ source: 'sweep' });
  assert.equal(runner.body.color, 0);
  const end = harness(createPaintFight);
  end.director.jumpToPhase(2);
  end.director.skipTeach();
  end.director.damage(99);
  assert.equal(end.director.track.hp, 12);
  assert.ok(end.until((ev) => ev.some((e) => e.type === 'finished'), 1), 'the night service arrives');
});
