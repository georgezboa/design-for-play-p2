// Round 13 · George got stuck twice in the boss not knowing what to do next
// (II · THE OFF-BEAT four metres short of the rose signal; III · THE CLAIM
// with the two true things down). Each piece now says its next step on the
// plaque (objective()), and a press that does nothing says why.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import { LAMPS, ROOFTOP, createBellRooftops } from '../../src/chapters/finalBoss/setPieces/bellRooftops.js';
import { ANSWER, CARDS, createFalseClaims } from '../../src/chapters/finalBoss/setPieces/falseClaims.js';
import { TOWER, createBellTower } from '../../src/chapters/finalBoss/setPieces/bellTower.js';
import { placeBody } from '../../src/chapters/finalBoss/setPieces/platformer.js';

const DT = 1 / 60;
const GOD = { inv: 99 };
function play(piece, seconds, input = {}) {
  const events = [];
  for (let t = 0; t < seconds - 1e-9; t += DT) events.push(...piece.update(DT, input, GOD));
  return events;
}
function until(piece, predicate, max = 60) {
  const events = [];
  for (let t = 0; t < max; t += DT) {
    const step = piece.update(DT, {}, GOD);
    events.push(...step);
    if (predicate(step, piece)) return events;
  }
  throw new Error('never happened');
}
const acts = (events) => events.filter((e) => e.type === 'act');

test('the off-beat: E short of the rose signal says closer; the plaque says where it is and what to do', () => {
  for (const difficulty of ['story', 'normal']) {
    const piece = createBellRooftops({ difficulty, startSegment: 2 });
    until(piece, () => piece.state === 'play');
    const rose = LAMPS.find((l) => l.line === 'rose' && l.segment === 2);
    // where George stood: on the roof, nearly five metres short
    placeBody(piece.body, rose.x - 4.8, rose.y, 1);
    play(piece, 0.1);
    assert.match(piece.objective(), /rose signal ends this stretch, 5 m ahead/);
    const far = acts(piece.update(DT, { act: true }, GOD));
    assert.deepEqual(far.map((e) => e.result), ['reach'], difficulty);
    assert.equal(far[0].line, 'rose');
    // a step or two short now answers
    placeBody(piece.body, rose.x - ROOFTOP.reach + 0.1, rose.y, 1);
    play(piece, 0.3);
    assert.match(piece.objective(), /At the rose signal: E/);
    assert.deepEqual(acts(piece.update(DT, { act: true }, GOD)).map((e) => e.result), ['queued']);
    assert.match(piece.objective(), /set: it lights him on the next bell · \d\.\d s/);
    const events = until(piece, (step) => step.some((e) => e.type === 'bell'));
    assert.ok(events.some((e) => e.type === 'segment-cleared' && e.index === 2), difficulty);
  }
});

test('the rooftops: a lamp nearby names itself on the plaque; far from every lamp, the stretch rule shows', () => {
  const piece = createBellRooftops({ difficulty: 'normal' });
  until(piece, () => piece.state === 'play');
  const amber = LAMPS.find((l) => l.id === 'amber-1');
  placeBody(piece.body, amber.x - 3, amber.y, 1);
  play(piece, 0.1);
  assert.match(piece.objective(), /An amber lamp: E beside it/);
  placeBody(piece.body, 2, 0, 1);
  play(piece, 0.1);
  assert.equal(piece.objective(), null);
});

test('the claim: the plaque walks through dodge, the two rings, the other ring, the gold lane', () => {
  for (const difficulty of ['story', 'normal']) {
    const piece = createFalseClaims({ difficulty });
    until(piece, () => piece.state === 'play');
    assert.match(piece.objective(), /Dodge his words/);
    // E before the cards: says why
    assert.deepEqual(acts(piece.update(DT, { act: true }, GOD)).map((e) => e.result), ['nothing']);
    until(piece, () => piece.cards.length === 2);
    play(piece, 1);
    assert.match(piece.objective(), /Walk into one brass ring, then the other/);
    const [a, b] = piece.cards;
    // the ring is what Butch walks into: its edge counts
    piece.body.x = a.x + CARDS.reach - 0.05; piece.body.z = a.z;
    play(piece, 0.05);
    assert.equal(piece.held.length, 1);
    assert.match(piece.objective(), /Now walk into the other brass ring · \d\.\d s/);
    assert.ok(piece.pairTotal >= piece.pairLeft);
    assert.equal(piece.lane, null);
    piece.body.x = b.x; piece.body.z = b.z;
    play(piece, 0.05);
    assert.equal(piece.ready, true);
    // the lane: where the answer lands if said now
    const lane = piece.lane;
    assert.ok(lane && lane.half >= ANSWER.half);
    piece.body.x = lane.x + lane.half + 1.5;
    play(piece, DT);
    assert.equal(piece.lane.under, false);
    assert.match(piece.objective(), /Step (left|right) onto the gold lane/);
    piece.body.x = piece.bossAt(ANSWER.flight + DT);
    play(piece, DT);
    assert.equal(piece.lane.under, true);
    assert.match(piece.objective(), /you are under him: E/);
    const said = acts(piece.update(DT, { act: true }, GOD)).map((e) => e.result);
    assert.deepEqual(said, ['pair'], difficulty);
  }
});

test('the claim: STORY widens the gold lane; the cards hint comes back if they lie untouched', () => {
  const story = createFalseClaims({ difficulty: 'story' });
  const normal = createFalseClaims({ difficulty: 'normal' });
  for (const p of [story, normal]) {
    until(p, () => p.state === 'play');
    until(p, () => p.cards.length === 2);
    play(p, 1);
    const [a, b] = p.cards;
    p.body.x = a.x; p.body.z = a.z; play(p, 0.05);
    p.body.x = b.x; p.body.z = b.z; play(p, 0.05);
  }
  assert.ok(story.lane.half > normal.lane.half);
  assert.equal(normal.lane.half, ANSWER.half);

  const piece = createFalseClaims({ difficulty: 'normal' });
  until(piece, () => piece.state === 'play');
  until(piece, () => piece.cards.length === 2);
  piece.body.x = 8.6; piece.body.z = 6.6; // away from both
  let shown = 0;
  let last = '';
  for (let t = 0; t < CARDS.reteach * 2.5; t += DT) {
    if (piece.cards.length === 0) break;
    piece.update(DT, {}, GOD);
    const h = piece.hint();
    if (h.startsWith('TWO TRUE THINGS') && last !== h) shown += 1;
    last = h;
  }
  assert.ok(shown >= 2, `the cards hint showed ${shown} time(s)`);
});

test('under the bell: the plaque says where to stand and counts down to the strike', () => {
  const piece = createBellTower({ difficulty: 'normal', startSegment: 3 });
  until(piece, () => piece.state === 'play');
  placeBody(piece.body, TOWER.punchReach + 2, TOWER.topY, 1);
  play(piece, 0.1);
  assert.match(piece.objective(), /Walk under the bell/);
  placeBody(piece.body, 0, TOWER.topY, 1);
  play(piece, 0.1);
  assert.match(piece.objective(), /Under the bell: E as it strikes · \d\.\d s · 0 \/ 2/);
  const tower = createBellTower({ difficulty: 'normal' });
  until(tower, () => tower.state === 'play');
  assert.equal(tower.objective(), null);
});

test('the battle shows a piece\'s next step on the plaque, and says why a press did nothing', () => {
  const src = fs.readFileSync(new URL('../../src/chapters/finalBoss/spectacleBattle.js', import.meta.url), 'utf8');
  assert.ok(src.includes('piece.objective?.()'));
  assert.ok(src.includes("r === 'nothing'") && src.includes("r === 'reach'"));
  const view = fs.readFileSync(new URL('../../src/chapters/finalBoss/stage/squareView.js', import.meta.url), 'utf8');
  assert.ok(view.includes('piece.lane') && view.includes('TO THE GOLD LANE'));
});
