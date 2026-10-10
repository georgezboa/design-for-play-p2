// Round 11 · Movement III · ECHO CITY as a skill fight
// (movements/echoCity.js): dodge his misreadings, strike both true things
// inside the pair window, echoes, the falling square, the front edge.
import test from 'node:test';
import assert from 'node:assert/strict';

import { FIGHT_BOUNDS } from '../../src/chapters/finalBoss/conductorFight.js';
import { FRONT_EDGE_Z, PAIR_DAMAGE, PAIR_S, SAID_DAMAGE, createArgument, createEchoFight } from '../../src/chapters/finalBoss/movements/echoCity.js';
import { ECHO_EXCHANGES } from '../../src/chapters/finalBoss/echoExchanges.js';
import { DT, harness } from './round11Harness.mjs';
// ------------------------------------------------------------ III

test('III: he throws his misreadings; the two true things come down far apart; both inside PAIR_S lands the answer', () => {
  const h = harness(createEchoFight, { x: 0, z: 2 });
  const opened = h.until((ev) => ev.some((e) => e.type === 'truths'), 8);
  const truthsEvent = opened.find((e) => e.type === 'truths');
  const say = h.events.find((e) => e.type === 'say' && e.kind === 'claim');
  assert.equal(say.cue, ECHO_EXCHANGES[0].claim, 'his claim, voiced');
  const misreads = h.events.filter((e) => e.type === 'telegraph' && e.attack.meta?.misread);
  assert.ok(misreads.length >= 1, 'a misreading on its way');
  assert.ok(misreads.every((e) => ECHO_EXCHANGES[0].facts.some((f) => f.id === e.attack.meta.misread && !f.holds && f.rebut === e.attack.meta.rebut)));
  const [a, b] = truthsEvent.truths;
  assert.ok(Math.hypot(a.x - b.x, a.z - b.z) >= 7, 'far apart');
  assert.ok(ECHO_EXCHANGES[0].facts.filter((f) => f.holds).every((f) => [a.factId, b.factId].includes(f.id)), 'they are the two true things');
  h.step(1);
  h.body.x = a.x; h.body.z = a.z;
  assert.ok(h.step(DT, { act: true }).some((e) => e.type === 'act' && e.result === 'held'));
  h.step(PAIR_S * 0.5);
  h.body.x = b.x; h.body.z = b.z;
  const ev = h.step(DT, { act: true });
  const pair = ev.find((e) => e.type === 'pair');
  assert.ok(pair && pair.reply.holdsBoth, 'the answer that holds both');
  assert.ok(ev.some((e) => e.type === 'say' && e.holdsBoth === true));
  const dmg = h.until((evs) => evs.some((e) => e.type === 'damage'), 2).find((e) => e.type === 'damage');
  assert.equal(dmg.amount, PAIR_DAMAGE);
  assert.deepEqual(h.director.argument.landed, ['brief']);
});

test('III: holding only one, the window closes: the half answer, his rebuttal, and the claim comes back later', () => {
  const h = harness(createEchoFight, { x: 0, z: 2 });
  const opened = h.until((ev) => ev.some((e) => e.type === 'truths'), 8);
  const [a] = opened.find((e) => e.type === 'truths').truths;
  h.step(1);
  h.body.x = a.x; h.body.z = a.z;
  h.step(DT, { act: true });
  const ev = h.until((evs) => evs.some((e) => e.type === 'deflected'), PAIR_S + 1);
  assert.ok(ev, 'deflected');
  const said = h.events.filter((e) => e.type === 'say').map((e) => e.kind);
  assert.deepEqual(said.slice(-2), ['reply', 'rebut']);
  assert.ok(h.events.find((e) => e.type === 'say' && e.kind === 'reply' && e.holdsBoth === false));
  assert.equal(h.director.argument.queue.at(-1), 'brief', 'back of the queue');
  assert.equal(h.director.track.hp, 100, 'no damage');
});

test('III: a misreading cracks the terrace; Butch walks round a crack, never into it', () => {
  const h = harness(createEchoFight, { x: 0, z: 2 });
  h.until((ev) => ev.some((e) => e.type === 'hole'), 8);
  const hole = h.director.holes[0];
  h.body.x = hole.x - hole.r - 0.6; h.body.z = hole.z;
  h.step(0.8, { dx: 1 });
  assert.ok(Math.hypot(h.body.x - hole.x, h.body.z - hole.z) >= hole.r - 0.02, 'the crack stops him');
  // the argument model: a NORMAL checkpoint unsays what the phase said
  const argument = createArgument(ECHO_EXCHANGES);
  argument.land('brief');
  argument.land('looked-east');
  argument.unsay(['looked-east']);
  assert.deepEqual(argument.landed, ['brief']);
  assert.equal(argument.queue[0], 'looked-east');
});

test('III: after the last pair he has no answer: the front edge lights, and E there finishes the movement', () => {
  const h = harness(createEchoFight, { x: 0, z: 2 });
  h.director.jumpToPhase(2);
  h.director.damage(28 - SAID_DAMAGE - 1);
  const opened = h.until((ev) => ev.some((e) => e.type === 'truths'), 10);
  const [a, b] = opened.find((e) => e.type === 'truths').truths;
  h.step(1);
  const at = (t) => h.director.truths.find((x) => x.factId === t.factId);
  h.body.x = at(a).x; h.body.z = at(a).z; h.step(DT, { act: true });
  h.body.x = at(b).x; h.body.z = at(b).z; h.step(DT, { act: true });
  assert.ok(h.until((evs) => evs.some((e) => e.type === 'no-answer'), 2));
  assert.equal(h.director.track.hp, SAID_DAMAGE);
  assert.equal(h.director.frontLit, true);
  assert.ok(h.step(DT, { act: true }).some((e) => e.type === 'act' && e.result === 'closer'), 'from behind the line: closer');
  h.body.z = FRONT_EDGE_Z - 1;
  h.step(DT, { act: true });
  assert.ok(h.until((evs) => evs.some((e) => e.type === 'finished'), 3));
  assert.ok(h.director.collapseZ < FIGHT_BOUNDS.maxZ, 'the square fell behind him');
});

