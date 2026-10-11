// Round 12 · the seven set pieces' own rules: what each verb answers, its
// timing windows, what tears a layer, and how STORY widens it. Every piece
// is pure (src/chapters/finalBoss/setPieces/*.js) and driven directly here.
import test from 'node:test';
import assert from 'node:assert/strict';

import { CASE, CLAIM, GANTRY, ROOF, ROOF_GAPS, ROOF_TIMELINE, TRUNK, createRoofRun } from '../../src/chapters/finalBoss/setPieces/roofRun.js';
import { THROW, createReturnToSender } from '../../src/chapters/finalBoss/setPieces/returnToSender.js';
import { BELL_S, LAMPS, PLANKS, ROOFTOP, createBellRooftops } from '../../src/chapters/finalBoss/setPieces/bellRooftops.js';
import { TOWER, createBellTower } from '../../src/chapters/finalBoss/setPieces/bellTower.js';
import { WORDS } from '../../src/chapters/finalBoss/setPieces/falseClaims.js';
import { ANSWER, CARDS, createFalseClaims, slipDistance } from '../../src/chapters/finalBoss/setPieces/falseClaims.js';
import { DUEL, SLOTS, STANDOFF_SEGMENTS, createStandoff } from '../../src/chapters/finalBoss/setPieces/standoff.js';
import { LANES, LINE, createPaintedLine } from '../../src/chapters/finalBoss/setPieces/paintedLine.js';
import { placeBody } from '../../src/chapters/finalBoss/setPieces/platformer.js';

const DT = 1 / 60;
const GOD = { inv: 99 };
const MORTAL = { inv: 0 };

// Step a piece; `input` may be a function of (piece, t). Returns the events.
function play(piece, seconds, input = {}, vitals = MORTAL) {
  const events = [];
  for (let t = 0; t < seconds - 1e-9; t += DT) events.push(...piece.update(DT, typeof input === 'function' ? input(piece, t) : input, vitals));
  return events;
}
function until(piece, predicate, { input = {}, vitals = GOD, max = 60 } = {}) {
  const events = [];
  for (let t = 0; t < max; t += DT) {
    const step = piece.update(DT, typeof input === 'function' ? input(piece, t) : input, vitals);
    events.push(...step);
    if (predicate(step, piece)) return events;
  }
  throw new Error('never happened');
}
const toPlay = (piece) => until(piece, () => piece.state === 'play');
// A jump pressed once at `at` seconds and held for `hold`.
const tapAt = (at, hold = 1) => { let pressed = false; return (p, t) => { const jump = !pressed && t >= at - 1e-6; if (jump) pressed = true; return { jump, jumpHeld: t >= at - 1e-6 && t < at + hold }; }; };
const hits = (events, source = null) => events.filter((e) => e.type === 'hit' && (!source || e.source === source));
const acts = (events) => events.filter((e) => e.type === 'act').map((e) => e.result);

// ================================================================ fairness

test('every attack is warned before it can touch Butch: half a second at least on NORMAL', () => {
  const leads = {
    'a rolling case': CASE.warn, 'a brass claim': CLAIM.warn, 'a gantry': GANTRY.warn, 'a trunk\'s shadow': TRUNK.flight,
    'his quickest volley': THROW.minFlight, 'his stamp': THROW.stampTele, 'a sack (his wind-up)': 0.6,
    'the searchlight (aimed to fired)': BELL_S / 2 - ROOFTOP.beamAim, 'a counterweight\'s shadow': TOWER.weightWarn,
    'a pattern of words (his hand)': WORDS.windup, 'a wash stroke': LINE.strokeLead, 'his brush sweep': LINE.sweepLead,
    'a 1978 train\'s lamp': LINE.ghostLead, 'a falling word': LINE.wordLead,
  };
  for (const [what, lead] of Object.entries(leads)) assert.ok(lead >= 0.5, `${what}: ${lead} s`);
  // the roof run's combos: two arrivals in one combo are never closer than a jump can take
  const combos = new Map();
  for (const entry of ROOF_TIMELINE) if (entry.arrive !== undefined) combos.set(entry.at, [...(combos.get(entry.at) ?? []), entry.arrive]);
  for (const [at, arrivals] of combos) {
    const sorted = [...arrivals].sort((a, b) => a - b);
    for (let i = 1; i < sorted.length; i += 1) assert.ok(sorted[i] - sorted[i - 1] >= 0.39, `combo at ${at}: ${sorted.join(', ')}`);
  }
});

// ============================================================ THE ROOF RUN

test('the roof run teaches by doing: the train holds at the first claim until one goes back', () => {
  const piece = createRoofRun({ difficulty: 'normal' });
  toPlay(piece);
  until(piece, () => piece.gated, { max: 40 });
  const held = piece.camX;
  play(piece, 6, {}, GOD);
  assert.equal(piece.camX, held, 'the train holds');
  assert.ok(piece.hint().includes('PUNCH IT BACK'), 'and says how');
  until(piece, (step) => step.some((e) => e.type === 'act' && (e.result === 'returned' || e.result === 'volley')), { input: { act: true }, max: 20 });
  play(piece, 1, {}, GOD);
  assert.ok(piece.camX > held, 'one claim back and the train runs on');
});

function rollingClaim(piece, rel) {
  piece.hazards.length = 0;
  piece.warnings.length = 0;
  const h = { id: `test-claim-${rel}`, kind: 'claim', x: piece.body.x + rel, y: CLAIM.r, r: CLAIM.r, vx: -CLAIM.speed, dashable: true, age: 1, done: false };
  piece.hazards.push(h);
  return h;
}

test('a brass claim punched as it reaches Butch goes back; close in is a volley; too far is too early; STORY widens the reach', () => {
  const result = (difficulty, rel) => {
    const piece = createRoofRun({ difficulty });
    toPlay(piece);
    rollingClaim(piece, rel);
    return acts(piece.update(DT, { act: true }, GOD))[0];
  };
  const sweet = (CLAIM.sweet[0] + CLAIM.sweet[1]) / 2;
  assert.equal(result('normal', sweet), 'volley');
  assert.equal(result('normal', CLAIM.sweet[1] + 0.3), 'returned');
  assert.equal(result('normal', CLAIM.reach[1] + 0.5), 'early');
  assert.equal(result('story', CLAIM.reach[1] + 0.5), 'returned', 'STORY: a wider reach');
  // a returned claim flies back to him and lands
  const piece = createRoofRun({ difficulty: 'normal' });
  toPlay(piece);
  rollingClaim(piece, sweet);
  const events = play(piece, 1.5, (p, t) => ({ act: t < DT }), GOD);
  assert.ok(events.some((e) => e.type === 'claim-hit' && e.perfect));
});

test('a gantry hits a standing Butch and passes over a ducking one', () => {
  const run = (duck) => {
    const piece = createRoofRun({ difficulty: 'normal' });
    toPlay(piece);
    piece.hazards.length = 0; piece.warnings.length = 0;
    piece.hazards.push({ id: 'g', kind: 'gantry', x: piece.body.x + 2, vx: -GANTRY.speed, dashable: false, age: 0, done: false });
    return hits(play(piece, 0.4, { duck }), 'gantry').length;
  };
  assert.ok(run(false) >= 1, 'standing: hit (the runner’s i-frames take the rest)');
  assert.equal(run(true), 0);
});

test('a rolling case hits a grounded Butch; a jump clears it', () => {
  const run = (jumpAt) => {
    const piece = createRoofRun({ difficulty: 'normal' });
    toPlay(piece);
    piece.hazards.length = 0; piece.warnings.length = 0;
    piece.hazards.push({ id: 'c', kind: 'case', x: piece.body.x + 4, y: CASE.r, r: CASE.r, vx: -CASE.speed, dashable: true, age: 1, done: false });
    return hits(play(piece, 0.8, jumpAt === null ? {} : tapAt(jumpAt)), 'case').length;
  };
  assert.equal(run(null), 1);
  assert.equal(run(0.25), 0);
});

test('a coupling drops a Butch who walks into it, and stands him back on a roof', () => {
  const piece = createRoofRun({ difficulty: 'normal', startSegment: 1 });
  toPlay(piece);
  const gap = ROOF_GAPS.find((g) => g.x0 > piece.body.x + 1);
  until(piece, () => piece.camX + ROOF.ahead > gap.x1 + 2, { max: 30 });
  placeBody(piece.body, gap.x0 - 0.4, 0, 1);
  const events = play(piece, 0.8, { x: 1 }, GOD);
  const fall = events.find((e) => e.type === 'fall');
  assert.ok(fall, 'he falls');
  assert.equal(fall.source, 'coupling');
  assert.ok(!(fall.x > gap.x0 && fall.x < gap.x1), 'stood back on a roof');
});

test('STORY leaves out the extra luggage; NORMAL throws all of it', () => {
  const throwsIn = (difficulty) => {
    const piece = createRoofRun({ difficulty });
    toPlay(piece);
    const events = until(piece, () => piece.seg.index === 1, { input: { act: true }, max: 120 });
    return events.filter((e) => e.type === 'throw' && e.kind === 'case').length;
  };
  assert.ok(throwsIn('normal') > throwsIn('story'));
  assert.ok(ROOF.end > 400, 'a long run');
});

// ======================================================== RETURN TO SENDER

function landingClaim(piece, before, { kind = 'claim' } = {}) {
  piece.hazards.length = 0;
  const h = { id: `test-${kind}-${before}`, kind, x: piece.body.x, T: 1, age: 1 - before, rallyIndex: 0, revealed: kind === 'decoy', punched: false, done: false };
  piece.hazards.push(h);
  return h;
}

test('return to sender: E as it lands punches it back; on the beat is a volley; too soon whiffs; STORY widens the window', () => {
  const result = (difficulty, before) => {
    const piece = createReturnToSender({ difficulty });
    toPlay(piece);
    landingClaim(piece, before);
    return acts(piece.update(DT, { act: true }, GOD))[0];
  };
  assert.equal(result('normal', 0.02), 'volley');
  assert.equal(result('normal', THROW.window - 0.04), 'returned');
  assert.equal(result('normal', 0.3), 'early');
  assert.equal(result('story', 0.2), 'returned', `STORY's window is ±${(THROW.window * 1.6).toFixed(2)} s`);
});

test('a whiffed punch locks the fist for a moment; a decoy punched tears a layer', () => {
  const piece = createReturnToSender({ difficulty: 'normal' });
  toPlay(piece);
  piece.hazards.length = 0;
  assert.deepEqual(acts(piece.update(DT, { act: true }, GOD)), ['none']);
  landingClaim(piece, 0.02);
  assert.deepEqual(acts(piece.update(DT, { act: true }, GOD)), [], 'the whiff lockout');
  play(piece, 0.3, {}, GOD);
  landingClaim(piece, 0.02, { kind: 'decoy' });
  const events = piece.update(DT, { act: true }, MORTAL);
  assert.deepEqual(acts(events), ['decoy']);
  assert.equal(hits(events, 'decoy').length, 1);
});

test('a grey ring hits a Butch inside it and misses one who stepped out', () => {
  const run = (offset) => {
    const piece = createReturnToSender({ difficulty: 'normal' });
    toPlay(piece);
    piece.hazards.length = 0;
    piece.hazards.push({ id: 'drop', kind: 'drop', x: piece.body.x + offset, T: 0.2, age: 0, done: false });
    return hits(play(piece, 0.4, {}), 'drop').length;
  };
  assert.equal(run(0), 1);
  assert.equal(run(THROW.ring + 0.5), 0);
});

test('a rally: he volleys each return back quicker, and the last return of the rally knocks him back', () => {
  const piece = createReturnToSender({ difficulty: 'normal', startSegment: 1 });
  toPlay(piece);
  // a perfect returner: stand under the soonest claim, punch on the landing
  const events = until(piece, (step) => step.some((e) => e.type === 'rally-won'), {
    input: (p) => {
      const claim = p.hazards.filter((h) => h.kind === 'claim' && !h.punched).sort((a, b) => (a.T - a.age) - (b.T - b.age))[0];
      if (!claim) return {};
      const dx = claim.x - p.body.x;
      return { x: Math.abs(dx) > 0.1 ? Math.sign(dx) : 0, act: claim.T - claim.age <= 0.02 };
    },
    max: 40,
  });
  const throws = events.filter((e) => e.type === 'throw' && e.kind === 'claim').map((e) => e.hazard.T);
  assert.ok(events.some((e) => e.type === 'volleyed'), 'he volleyed it');
  assert.ok(throws.length >= 2 && throws[1] < throws[0], 'quicker each time');
});

// ============================================================= ON THE BELL

test('the bell rooftops keep a four-second bell; amber planks are out from the bell, teal from the off-beat', () => {
  const piece = createBellRooftops({ difficulty: 'normal' });
  toPlay(piece);
  until(piece, (step) => step.some((e) => e.type === 'bell'));
  assert.equal(piece.period, BELL_S);
  const amber = PLANKS.find((p) => p.line === 'amber').id;
  const teal = PLANKS.find((p) => p.line === 'teal').id;
  assert.ok(Math.abs(piece.plankLeft(amber) - ROOFTOP.plankOut) < 0.05, 'an amber plank is out for its whole time on the bell');
  play(piece, 0.3, {}, GOD);
  assert.equal(piece.plankLeft(teal), 0, 'the teal plank folds just after the bell');
  play(piece, BELL_S / 2, {}, GOD);
  assert.ok(piece.plankLeft(teal) > 1.5, 'the teal plank on the off-beat');
  assert.equal(piece.plankLeft(amber), 0);
  // STORY: longer on the bell
  const story = createBellRooftops({ difficulty: 'story' });
  toPlay(story);
  until(story, (step) => step.some((e) => e.type === 'bell'));
  assert.ok(story.plankLeft(amber) > ROOFTOP.plankOut * 1.4);
});

test('Chapter 2\'s rule: E queues a lamp and its bridge lays on the next bell, not before', () => {
  const piece = createBellRooftops({ difficulty: 'normal' });
  toPlay(piece);
  const lamp = LAMPS.find((l) => l.id === 'amber-1');
  placeBody(piece.body, lamp.x, 0, 1);
  until(piece, (step) => step.some((e) => e.type === 'bell'));
  play(piece, 0.3, {}, GOD);
  const pressed = piece.update(DT, { act: true }, GOD);
  assert.deepEqual(acts(pressed), ['queued']);
  assert.deepEqual(acts(piece.update(DT, { act: true }, GOD)), ['already'], 'a second press is the same punch');
  play(piece, 2.5, {}, GOD);
  assert.equal(piece.machineLevel('amber-1'), 0, 'nothing until the bell');
  const events = until(piece, (step) => step.some((e) => e.type === 'bell'));
  assert.ok(events.some((e) => e.type === 'machine' && e.lamp === 'amber-1' && e.on));
  play(piece, ROOFTOP.travel + 0.05, {}, GOD);
  assert.equal(piece.machineLevel('amber-1'), 1);
  assert.ok(piece.surfaces().some((s) => s.id === 'bridge-amber-1'), 'a bridge to stand on');
});

test('a rose signal punched lights him on the bell, and that ends the stretch', () => {
  const piece = createBellRooftops({ difficulty: 'normal' });
  toPlay(piece);
  const rose = LAMPS.find((l) => l.id === 'rose-1');
  placeBody(piece.body, rose.x, rose.y, 1);
  assert.deepEqual(acts(piece.update(DT, { act: true }, GOD)), ['queued']);
  const events = until(piece, (step) => step.some((e) => e.type === 'bell'));
  assert.ok(events.some((e) => e.type === 'lit' && e.lamp === 'rose-1'));
  assert.ok(events.some((e) => e.type === 'segment-cleared' && e.index === 0));
  assert.equal(piece.seg.index, 1);
});

test('his searchlight stabs on the off-beat where Butch stands still', () => {
  const piece = createBellRooftops({ difficulty: 'normal', startSegment: 1 });
  toPlay(piece);
  placeBody(piece.body, 64, 0.2, 1);
  const events = play(piece, 2 * BELL_S, {});
  assert.ok(events.some((e) => e.type === 'beam'), 'it fired');
  assert.ok(hits(events, 'beam').length >= 1, 'and found him');
});

test('the street drops a Butch who misses the plank, back to the last safe roof', () => {
  const piece = createBellRooftops({ difficulty: 'normal' });
  toPlay(piece);
  placeBody(piece.body, 11.5, 0, 1);
  const events = play(piece, 1.2, (p, t) => ({ x: t < 0.3 ? 1 : 0 }), GOD);
  const fall = events.find((e) => e.type === 'fall');
  assert.ok(fall);
  assert.ok(fall.x <= 12, 'back on the roof he left');
});

test('the quickening: three seconds a bell on NORMAL, gentler on STORY', () => {
  assert.equal(createBellRooftops({ difficulty: 'normal', startSegment: 3 }).period, ROOFTOP.quickBell);
  assert.ok(createBellRooftops({ difficulty: 'story', startSegment: 3 }).period > ROOFTOP.quickBell);
});

// =========================================================== THE BELL TOWER

test('the bell\'s ring runs down the stones: it knocks a standing Butch, and passes under one in the air', () => {
  const run = (jump) => {
    const piece = createBellTower({ difficulty: 'normal', startSegment: 1 });
    toPlay(piece);
    let pressed = false;
    return hits(play(piece, 6, (p) => {
      const ring = p.rings[0];
      if (!jump || !ring || pressed || !p.body.grounded) return {};
      if (ring.y - p.body.y < TOWER.ringSpeed * 0.28) { pressed = true; return { jump: true, jumpHeld: true }; }
      return {};
    }), 'bell-ring').length;
  };
  assert.equal(run(false), 1);
  assert.equal(run(true), 0);
});

test('under the bell: E as it strikes lands; late misses; twice cracks it; standing there unpunched knocks him down', () => {
  const piece = createBellTower({ difficulty: 'normal', startSegment: 3 });
  toPlay(piece);
  placeBody(piece.body, 0, TOWER.topY, 1);
  until(piece, () => piece.bellClock < 0.02 && piece.bells > 0);
  assert.deepEqual(acts(piece.update(DT, { act: true }, GOD)), ['on-the-bell']);
  play(piece, 0.5, {}, GOD);
  assert.deepEqual(acts(piece.update(DT, { act: true }, GOD)), ['late']);
  until(piece, () => piece.bellClock > BELL_S - 0.05);
  const events = play(piece, 0.08, { act: true }, GOD);
  assert.ok(acts(events).includes('on-the-bell'));
  assert.ok(events.some((e) => e.type === 'finisher' && e.kind === 'bell-cracks'));
  // unpunched, the strike knocks him down
  const idle = createBellTower({ difficulty: 'normal', startSegment: 3 });
  toPlay(idle);
  placeBody(idle.body, 0, TOWER.topY, 1);
  assert.equal(hits(play(idle, BELL_S + 0.5, {}), 'bell').length, 1);
  // STORY's window is wider
  const story = createBellTower({ difficulty: 'story', startSegment: 3 });
  toPlay(story);
  placeBody(story.body, 0, TOWER.topY, 1);
  until(story, () => story.bells > 0 && story.bellClock > TOWER.punchWindow + 0.03 && story.bellClock < TOWER.punchWindow + 0.06);
  assert.deepEqual(acts(story.update(DT, { act: true }, GOD)), ['on-the-bell']);
});

test('the borrowed light rises after a few seconds and lifts a Butch it catches onto the next ledge', () => {
  const piece = createBellTower({ difficulty: 'normal', startSegment: 2 });
  toPlay(piece);
  const startY = piece.body.y;
  const events = play(piece, 20, {});
  assert.ok(hits(events, 'light').length >= 1);
  assert.ok(piece.body.y > startY, 'lifted up out of it');
});

// ============================================================ FALSE CLAIMS

test('a word\'s slip is what hits: a capsule as long as the word', () => {
  const b = { x: 0, z: 0, half: 0.5 };
  assert.equal(slipDistance(b, 0.4, 0), 0);
  assert.ok(Math.abs(slipDistance(b, 0.8, 0) - 0.3) < 1e-9);
  assert.ok(Math.abs(slipDistance(b, 0, 0.5) - 0.5) < 1e-9);
  const piece = createFalseClaims({ difficulty: 'normal' });
  toPlay(piece);
  piece.bullets.push({ id: 'w', word: 'FORGED', fact: 'x', rebut: 'From the record.', x: piece.body.x + 0.45, z: piece.body.z, vx: 0, vz: 0, r: 1, half: 0.5, R: 0.3, bounce: 0, age: 0, life: 9, done: false });
  const events = piece.update(DT, {}, MORTAL);
  assert.equal(hits(events, 'misreading').length, 1);
  assert.ok(events.some((e) => e.type === 'misread-hit'));
});

test('two true things: hold one and the other within the window, then say it under him', () => {
  const piece = createFalseClaims({ difficulty: 'normal' });
  toPlay(piece);
  until(piece, () => piece.cards.length === 2);
  play(piece, 1, {}, GOD);
  const [a, b] = piece.cards;
  piece.body.x = a.x; piece.body.z = a.z;
  let events = play(piece, 0.05, {}, GOD);
  assert.ok(events.some((e) => e.type === 'held'));
  assert.ok(piece.pairLeft > 0 && piece.pairLeft <= CARDS.pair);
  piece.body.x = b.x; piece.body.z = b.z;
  events = play(piece, 0.05, {}, GOD);
  assert.ok(events.some((e) => e.type === 'ready'));
  // off to the side: he steps aside
  piece.body.x = piece.bossAt(ANSWER.flight) + ANSWER.half + 2.5;
  assert.deepEqual(acts(piece.update(DT, { act: true }, GOD)), ['aside']);
  play(piece, ANSWER.cooldown + 0.05, {}, GOD);
  piece.body.x = piece.bossAt(ANSWER.flight + DT);
  events = piece.update(DT, { act: true }, GOD);
  assert.deepEqual(acts(events), ['pair']);
  assert.ok(events.some((e) => e.type === 'segment-cleared' && e.index === 0));
});

test('only one true thing held too long is a half answer: the cards come down again', () => {
  const run = (difficulty) => {
    const piece = createFalseClaims({ difficulty });
    toPlay(piece);
    until(piece, () => piece.cards.length === 2);
    play(piece, 1, {}, GOD);
    const [a] = piece.cards;
    piece.body.x = a.x; piece.body.z = a.z;
    play(piece, 0.05, {}, GOD);
    piece.body.x = a.x > 0 ? -8 : 8;
    const t0 = piece.clock;
    const events = until(piece, (step) => step.some((e) => e.type === 'half'), { max: 10 });
    assert.ok(events.find((e) => e.type === 'half').line.length > 0);
    assert.equal(piece.cards.length, 0);
    return piece.clock - t0;
  };
  const normal = run('normal');
  const story = run('story');
  assert.ok(Math.abs(normal - CARDS.pair) < 0.15, `NORMAL: ${normal.toFixed(2)} s`);
  assert.ok(story > normal * 1.4, 'STORY: a longer window');
});

test('each stretch of the square makes you dodge longer before the true things come down', () => {
  const firstCards = (startSegment) => {
    const piece = createFalseClaims({ difficulty: 'normal', startSegment });
    toPlay(piece);
    const t0 = piece.clock;
    until(piece, () => piece.cards.length === 2);
    return piece.clock - t0;
  };
  assert.ok(firstCards(2) > firstCards(0));
});

// ============================================================= THE STANDOFF

function toStage(piece, stage, { max = 20 } = {}) {
  return until(piece, () => piece.duel?.stage === stage, { max });
}
const trueSlots = (piece) => SLOTS.filter((s) => piece.slots()[s].holds);
const falseSlot = (piece) => SLOTS.find((s) => !piece.slots()[s].holds);

test('the standoff: drawing before the clock is too soon, and his answer tears a layer', () => {
  const piece = createStandoff({ difficulty: 'normal' });
  toPlay(piece);
  toStage(piece, 'wait');
  const events = piece.update(DT, { dir: 'up' }, MORTAL);
  assert.deepEqual(acts(events), ['soon']);
  assert.equal(hits(events, 'too-soon').length, 1);
  assert.equal(piece.duel.stage, 'answered');
});

test('the draw: one true thing on the clock, the other on its second stroke; a misreading or a late draw fails', () => {
  const piece = createStandoff({ difficulty: 'normal' });
  toPlay(piece);
  toStage(piece, 'draw');
  const [first, second] = trueSlots(piece);
  assert.deepEqual(acts(piece.update(DT, { dir: first }, GOD)), ['first']);
  until(piece, () => piece.duel.age >= DUEL.beat - DT);
  const events = piece.update(DT, { dir: second }, GOD);
  assert.deepEqual(acts(events), ['second', 'pair']);
  // a misreading
  const wrong = createStandoff({ difficulty: 'normal' });
  toPlay(wrong);
  toStage(wrong, 'draw');
  assert.deepEqual(acts(wrong.update(DT, { dir: falseSlot(wrong) }, MORTAL)), ['misreading']);
  // late: the window passes
  const late = createStandoff({ difficulty: 'normal' });
  toPlay(late);
  toStage(late, 'draw');
  const lateEvents = play(late, DUEL.draw * STANDOFF_SEGMENTS[0].window + 0.1, {}, MORTAL);
  assert.ok(acts(lateEvents).includes('late'));
  assert.equal(hits(lateEvents, 'too-late').length, 1);
});

test('the second stroke has a window: early or late on it fails', () => {
  const run = (offset, difficulty = 'normal') => {
    const piece = createStandoff({ difficulty });
    toPlay(piece);
    toStage(piece, 'draw');
    const [first, second] = trueSlots(piece);
    piece.update(DT, { dir: first }, GOD);
    const target = piece.duel.secondAt + offset;
    until(piece, () => piece.duel.age >= target - DT, { max: 3 });
    return acts(piece.update(DT, { dir: second }, GOD))[0];
  };
  const win = DUEL.second * STANDOFF_SEGMENTS[0].window;
  assert.equal(run(0), 'second');
  assert.equal(run(-(win + 0.08)), 'early');
  assert.equal(run(win * 1.25, 'story'), 'second', 'STORY widens it');
});

test('feints come before the clock from the second stretch on; the last stretch shuffles the record before the draw', () => {
  const piece = createStandoff({ difficulty: 'normal', startSegment: 1 });
  toPlay(piece);
  let events = toStage(piece, 'draw');
  assert.ok(events.filter((e) => e.type === 'feint').length >= 1);
  const last = createStandoff({ difficulty: 'normal', startSegment: 2 });
  toPlay(last);
  events = toStage(last, 'draw');
  const swap = events.find((e) => e.type === 'swap');
  assert.ok(swap, 'the record shuffles');
  assert.notEqual(last.slots()[swap.a].holds, last.slots()[swap.b].holds, 'a true thing and a misreading trade places');
  // STORY: at most one feint
  const story = createStandoff({ difficulty: 'story', startSegment: 2 });
  toPlay(story);
  events = toStage(story, 'draw');
  assert.ok(events.filter((e) => e.type === 'feint').length <= 1);
});

// ========================================================= THE PAINTED LINE

test('a drawn stretch derails the train unless it is painted first; painting holds the lean', () => {
  const run = (paint) => {
    const piece = createPaintedLine({ difficulty: 'normal' });
    toPlay(piece);
    const gap = piece.gaps.find((g) => g.lane === 1);
    return { events: until(piece, () => piece.at > gap.d1 + 1, { input: { actHeld: paint }, vitals: MORTAL, max: 20 }), gap };
  };
  const { events: dry } = run(false);
  assert.equal(hits(dry, 'drawn-line').length, 1);
  const { events: wet } = run(true);
  assert.equal(hits(wet, 'drawn-line').length, 0);
  assert.ok(wet.some((e) => e.type === 'painted'));
  // both hands on the brush: barely steering
  const piece = createPaintedLine({ difficulty: 'normal' });
  toPlay(piece);
  play(piece, 0.5, { x: 1, actHeld: true }, GOD);
  assert.ok(piece.body.vx <= LINE.lean * LINE.painting + 1e-9);
});

test('his wash on a line smashes a train that stays on it; leaning to another line avoids it', () => {
  const run = (lean) => {
    const piece = createPaintedLine({ difficulty: 'normal' });
    toPlay(piece);
    const barrier = piece.barriers.find((b) => b.lane === 1);
    return hits(until(piece, () => piece.at > barrier.d1 + 1, {
      input: (p) => ({ x: lean && barrier.d0 - p.at < 30 ? (p.body.x < LANES[2] - 0.1 ? 1 : 0) : 0, actHeld: !lean || barrier.d0 - p.at > 30 }),
      vitals: MORTAL,
      max: 20,
    }), 'wash-barrier').length;
  };
  assert.equal(run(false), 1);
  assert.equal(run(true), 0);
});

test('his low sweep: jump it', () => {
  const run = (jump) => {
    const piece = createPaintedLine({ difficulty: 'normal' });
    toPlay(piece);
    piece.sweeps.push({ id: 'w', left: 0.3, lead: 1 });
    return hits(play(piece, 0.5, (p, t) => ({ jump: jump && t < DT, jumpHeld: jump })), 'brush-sweep').length;
  };
  assert.equal(run(false), 1);
  assert.equal(run(true), 0);
});

test('bell planks on the line: the outer lines on the bell, the middle line on the off-beat', () => {
  const piece = createPaintedLine({ difficulty: 'normal' });
  const offset = BELL_S - piece.bellClock;
  assert.equal(piece.plankOut(0, offset + 0.4), true);
  assert.equal(piece.plankOut(2, offset + 0.4), true);
  assert.equal(piece.plankOut(1, offset + 0.4), false);
  assert.equal(piece.plankOut(1, offset + BELL_S / 2 + 0.1), true);
  assert.equal(piece.plankOut(0, offset + BELL_S / 2 + 0.4), false);
});

test('the finisher: the night service runs alongside; lean left and jump aboard', () => {
  const piece = createPaintedLine({ difficulty: 'normal', startSegment: 2 });
  toPlay(piece);
  piece.jumpToSegment(2);
  until(piece, () => piece.service, { input: { actHeld: true }, max: 60 });
  play(piece, 0.5, { x: -1 }, GOD);
  assert.equal(piece.boarded, false, 'not until it is ready, and he jumps');
  const events = until(piece, () => piece.boarded, { input: (p) => ({ x: -1, jump: p.service.ready && p.body.grounded && p.body.x < -2.7, jumpHeld: true }), max: 10 });
  assert.ok(events.some((e) => e.type === 'boarded'));
  assert.ok(events.some((e) => e.type === 'damage' && e.cause === 'night-service'));
  if (!events.some((e) => e.type === 'finished')) until(piece, (step) => step.some((e) => e.type === 'finished'), { max: 3 });
  assert.equal(piece.state, 'done');
});

test('STORY runs the line slower and leaves out the extra throws', () => {
  const normal = createPaintedLine({ difficulty: 'normal' });
  const story = createPaintedLine({ difficulty: 'story' });
  assert.ok(story.speed < normal.speed);
});
