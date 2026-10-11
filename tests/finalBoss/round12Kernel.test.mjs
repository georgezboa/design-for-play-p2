// Round 12 · the set-piece kernel, the side-view body and the order of the
// set pieces (src/chapters/finalBoss/setPieces/kernel.js, platformer.js,
// sequence.js). Pure rules, driven directly.
import test from 'node:test';
import assert from 'node:assert/strict';

import { createDeathLedger, difficultyPreset } from '../../src/chapters/finalBoss/finaleModel.js';
import { HIT_INV, createPieceBase, createPieceRunner, createRng, createSegments, pieceApi, pieceTuning } from '../../src/chapters/finalBoss/setPieces/kernel.js';
import { PLATFORM, createPlatformBody, hurtBox, placeBody, stepPlatformBody } from '../../src/chapters/finalBoss/setPieces/platformer.js';
import { MOVEMENT_TICKET, NIGHT_SERVICE_SHARE, SET_PIECES, createMovementRun, findPiece } from '../../src/chapters/finalBoss/setPieces/sequence.js';

const DT = 1 / 60;

// ------------------------------------------------------------------ tuning

test('pieceTuning reads the STORY / NORMAL presets', () => {
  const story = pieceTuning('story');
  const normal = pieceTuning('normal');
  assert.equal(story.layers, difficultyPreset('story').layers);
  assert.equal(normal.layers, 3);
  assert.ok(story.pace < 1 && normal.pace === 1);
  assert.ok(story.tele > 1 && normal.tele === 1);
  assert.ok(story.window > 1 && normal.window === 1);
  assert.equal(story.rollback, 'none');
  assert.equal(normal.rollback, 'segment');
  assert.equal(pieceTuning('bogus').id, 'normal');
});

test('the rng is deterministic for a seed', () => {
  const a = createRng(9); const b = createRng(9); const c = createRng(10);
  const seqA = Array.from({ length: 5 }, () => a());
  assert.deepEqual(seqA, Array.from({ length: 5 }, () => b()));
  assert.notDeepEqual(seqA, Array.from({ length: 5 }, () => c()));
  for (let i = 0; i < 200; i += 1) { const v = a.range(2, 3); assert.ok(v >= 2 && v < 3); }
});

// ---------------------------------------------------------------- segments

test('segments: shares sum to 1, the ticket is finished shares plus progress, and a restart keeps earlier ones', () => {
  assert.throws(() => createSegments([]), /none/);
  assert.throws(() => createSegments([{ share: 0.5 }, { share: 0.4 }]), /sum/);
  const seg = createSegments([{ id: 'a', share: 0.2 }, { id: 'b', share: 0.5 }, { id: 'c', share: 0.3 }]);
  seg.setProgress(0.5);
  assert.equal(seg.ticket(), 0.1);
  assert.equal(seg.advance(), true);
  seg.setProgress(0.4);
  assert.ok(Math.abs(seg.ticket() - 0.4) < 1e-9);
  assert.equal(seg.floor(), 0.7);
  seg.restart();
  assert.equal(seg.ticket(), 0.2, 'the stretch again; the first stays won');
  seg.advance();
  assert.equal(seg.last, true);
  assert.equal(seg.advance(), false);
  assert.equal(seg.finished, true);
  assert.equal(seg.ticket(), 1);
  seg.jump(1);
  assert.equal(seg.index, 1);
  assert.equal(seg.finished, false);
  assert.equal(createSegments([{ share: 1 }], { start: 9 }).index, 0, 'a start is clamped');
});

test('a piece base: timers run on game time, a cleared segment is a checkpoint, the last one opens the finisher', () => {
  const d = createPieceBase({ id: 'x', movement: 0, name: 'X', view: 'side', segments: [{ id: 'a', name: 'A', share: 0.5 }, { id: 'b', name: 'B', share: 0.5 }] });
  let fired = 0;
  d.after(0.5, () => { fired += 1; }, 'tag');
  d.after(0.5, () => { fired += 10; }, 'other');
  d.cancelTimers('other');
  for (let i = 0; i < 29; i += 1) d.stepClock(DT);
  assert.equal(fired, 0);
  d.stepClock(DT * 2);
  assert.equal(fired, 1);
  assert.equal(d.completeSegment(), true);
  let events = d.flush();
  assert.deepEqual(events.map((e) => e.type), ['segment-cleared', 'segment']);
  assert.equal(events[1].checkpoint, true);
  assert.equal(d.completeSegment(), false);
  events = d.flush();
  assert.deepEqual(events.map((e) => e.type), ['segment-cleared', 'state']);
  assert.equal(events[0].last, true);
  assert.equal(d.state, 'finisher');
  // STORY / NORMAL scaling helpers
  const story = createPieceBase({ id: 'y', movement: 0, name: 'Y', view: 'side', segments: [{ share: 1 }], difficulty: 'story' });
  assert.ok(story.tele(1) > 1 && story.win(1) > 1 && story.pace(10) < 10);
});

test('pieceApi keeps the base\'s getters live', () => {
  const d = createPieceBase({ id: 'x', movement: 0, name: 'X', view: 'side', segments: [{ share: 1 }] });
  let n = 1;
  const api = pieceApi(d, { get n() { return n; }, bump() { n += 1; } });
  api.bump();
  assert.equal(api.n, 2);
  d.stepClock(0.5);
  assert.equal(api.clock, 0.5, 'the base clock reads through');
  d.setState('play');
  assert.equal(api.state, 'play');
});

// ------------------------------------------------------------------ runner

function fakePiece({ hits = [] } = {}) {
  const d = createPieceBase({ id: 'fake', movement: 1, name: 'FAKE', view: 'side', segments: [{ id: 'a', name: 'A', share: 0.5 }, { id: 'b', name: 'B', share: 0.5 }] });
  let checkpoints = [];
  return pieceApi(d, {
    queue: hits,
    get checkpoints() { return checkpoints; },
    update(dt) { d.stepClock(dt); const out = this.queue.splice(0); return [...d.flush(), ...out]; },
    checkpoint(rollback) { checkpoints.push(rollback); if (rollback === 'segment') d.seg.restart(); return { rolledBack: rollback === 'segment' }; },
  });
}

test('the runner: a hit tears a layer and grants i-frames; a fall always costs one, except just after standing up', () => {
  const piece = fakePiece();
  const runner = createPieceRunner({ piece, difficulty: 'normal' });
  runner.vitals.inv = 0;
  piece.queue.push({ type: 'hit', source: 'case' });
  let out = runner.step(DT);
  assert.deepEqual(out.map((e) => e.type), ['hit', 'hurt']);
  assert.equal(out[1].layersLeft, 2);
  assert.ok(Math.abs(runner.vitals.inv - HIT_INV) < 1e-9);
  piece.queue.push({ type: 'hit', source: 'case' });
  out = runner.step(DT);
  assert.deepEqual(out.map((e) => e.type), ['blocked'], 'inside the i-frames');
  piece.queue.push({ type: 'fall', source: 'coupling' });
  out = runner.step(DT);
  assert.deepEqual(out.map((e) => e.type), ['fall', 'hurt'], 'a fall is not an i-frame matter');
  assert.equal(out[1].fall, true);
});

test('the runner: the last layer is a checkpoint; NORMAL restarts the stretch, STORY undoes nothing; STORY is offered after three deaths', () => {
  const ledger = createDeathLedger();
  const piece = fakePiece();
  const runner = createPieceRunner({ piece, difficulty: 'normal', ledger });
  piece.seg.advance();
  piece.seg.setProgress(0.6);
  const kill = () => {
    let death = null;
    while (!death) { runner.vitals.inv = 0; runner.vitals.respawnInv = 0; death = (runner.hurt({ source: 'beam' }) ?? []).find((e) => e.type === 'death') ?? null; }
    return death;
  };
  const first = kill();
  assert.equal(first.rollback, 'segment');
  assert.equal(first.rolledBack, true);
  assert.equal(first.segment, 1);
  assert.equal(first.segmentName, 'B');
  assert.equal(piece.seg.ticket(), 0.5, 'back to the stretch\'s start, the first stretch kept');
  assert.equal(runner.vitals.hp, 3);
  assert.equal(runner.vitals.respawnInv, difficultyPreset('normal').respawnInv);
  assert.equal(first.offerStory, false);
  kill();
  const third = kill();
  assert.equal(third.offerStory, true, 'the third death in the movement offers STORY');
  assert.equal(kill().offerStory, false, 'once');
  // STORY: nothing is undone
  const storyPiece = fakePiece();
  const story = createPieceRunner({ piece: storyPiece, difficulty: 'story' });
  storyPiece.seg.setProgress(0.7);
  assert.equal(story.vitals.maxHp, 6);
  let death = null;
  while (!death) { story.vitals.inv = 0; story.vitals.respawnInv = 0; death = (story.hurt({ source: 'beam' }) ?? []).find((e) => e.type === 'death') ?? null; }
  assert.equal(death.rolledBack, false);
  assert.ok(Math.abs(storyPiece.seg.ticket() - 0.35) < 1e-9);
  assert.deepEqual(storyPiece.checkpoints, ['none']);
  // switching difficulty mid-run refills the layers
  runner.setDifficulty('story');
  assert.equal(runner.vitals.hp, 6);
  assert.equal(runner.difficulty, 'story');
});

// --------------------------------------------------------- the side body

const flat = { surfaces: [{ id: 'a', x0: -50, x1: 0, y: 0 }, { id: 'b', x0: 4, x1: 50, y: 0 }], solids: [], killY: -10 };
const stepFor = (body, input, seconds, world = flat) => {
  const events = [];
  for (let t = 0; t < seconds - 1e-9; t += DT) events.push(...stepPlatformBody(body, typeof input === 'function' ? input(t) : input, DT, world));
  return events;
};

test('coyote time: a jump still works a moment after running off the edge, not later', () => {
  const late = (delay) => {
    const body = createPlatformBody({ x: -0.6 });
    body.vx = PLATFORM.run;
    stepFor(body, { x: 1 }, 0.1);
    // he is past the edge (0 + ledge grace) and falling
    while (body.grounded) stepPlatformBody(body, { x: 1 }, DT, flat);
    stepFor(body, { x: 1 }, delay);
    const events = stepPlatformBody(body, { x: 1, jump: true }, DT, flat);
    return events.some((e) => e.type === 'jump');
  };
  assert.equal(late(0.05), true, 'inside coyote time');
  assert.equal(late(PLATFORM.coyote + 0.05), false, 'too late');
});

test('jump buffer: a jump pressed just before landing fires on the landing', () => {
  const buffered = (early) => {
    const body = createPlatformBody({ x: 10 });
    body.grounded = false; body.y = 3; body.vy = 0;
    // fall until `early` seconds before touching down
    let fallT = 0; const probe = { ...body };
    while (probe.y > 0 && fallT < 3) { stepPlatformBody(probe, {}, DT, flat); fallT += DT; }
    stepFor(body, {}, Math.max(0, fallT - early - DT));
    const events = [...stepPlatformBody(body, { jump: true, jumpHeld: true }, DT, flat), ...stepFor(body, { jumpHeld: true }, early + 0.1)];
    return events.some((e) => e.type === 'jump' && e.buffered);
  };
  assert.equal(buffered(0.08), true);
  assert.equal(buffered(PLATFORM.buffer + 0.12), false);
});

test('variable jump: a held jump goes higher than a tapped one; holding at the apex hangs', () => {
  const peak = (holdS) => {
    const b = createPlatformBody({ x: 10 });
    let top = 0;
    for (let t = 0; t < 1.2; t += DT) { stepPlatformBody(b, { jump: t < DT, jumpHeld: t < holdS }, DT, flat); top = Math.max(top, b.y); }
    return top;
  };
  const tap = peak(0.05);
  const held = peak(1);
  assert.ok(held > tap * 1.5, `held ${held.toFixed(2)} vs tapped ${tap.toFixed(2)}`);
  assert.ok(held > 2 && held < 3.2, `a full jump clears about 2.5 m (${held.toFixed(2)})`);
});

test('ledge grace: feet land a little past a surface\'s end; a dash grants i-frames once in the air', () => {
  const body = createPlatformBody({ x: 2 });
  body.grounded = false; body.y = 0.5; body.vy = -2; body.x = 4 - PLATFORM.ledge + 0.05;
  const events = stepFor(body, {}, 0.3);
  assert.ok(events.some((e) => e.type === 'land'), 'caught by the ledge');
  // high over the gap between the two roofs
  const air = createPlatformBody({ x: 2 });
  placeBody(air, 2, 30);
  air.grounded = false;
  let dashes = stepPlatformBody(air, { dash: true }, DT, flat).filter((e) => e.type === 'dash');
  assert.equal(dashes.length, 1);
  assert.ok(air.dashInv > 0);
  stepFor(air, {}, PLATFORM.dashCd + 0.05);
  assert.equal(air.grounded, false, 'still in the air');
  dashes = stepPlatformBody(air, { dash: true }, DT, flat).filter((e) => e.type === 'dash');
  assert.equal(dashes.length, 0, 'one dash per air time');
});

test('ducking halves the hurt box; STORY\'s hurt scale shrinks it; falling past killY reports it', () => {
  const body = createPlatformBody({ x: 10 });
  const stand = hurtBox(body, 1);
  stepPlatformBody(body, { duck: true }, DT, flat);
  const duck = hurtBox(body, 1);
  assert.ok(duck.y1 < 1.0 && stand.y1 > 1.5, 'a gantry at 1 m clears a duck, not a stand');
  assert.ok(hurtBox(body, 0.8).x1 - hurtBox(body, 0.8).x0 < duck.x1 - duck.x0);
  const faller = createPlatformBody({ x: 2 });
  placeBody(faller, 2, 0);
  faller.grounded = false;
  const events = stepFor(faller, {}, 2);
  assert.ok(events.some((e) => e.type === 'fell'));
});

// -------------------------------------------------------------- sequence

test('the set pieces: four movements, seven pieces, each movement 100 of his ticket (IV leaves 12 to the night service)', () => {
  assert.equal(SET_PIECES.length, 4);
  assert.deepEqual(SET_PIECES.map((list) => list.map((p) => p.id)), [['roof-run', 'return-to-sender'], ['on-the-bell', 'bell-tower'], ['false-claims', 'standoff'], ['painted-line']]);
  SET_PIECES.forEach((list, m) => assert.equal(list.reduce((sum, p) => sum + p.share, 0) + (m === 3 ? NIGHT_SERVICE_SHARE : 0), MOVEMENT_TICKET));
  // every piece plays a different way (its own view)
  const views = SET_PIECES.flat().map((p) => p.view);
  assert.equal(new Set(views).size, views.length);
  assert.deepEqual(findPiece('standoff'), { movement: 2, index: 1, spec: SET_PIECES[2][1] });
  assert.equal(findPiece('nope'), null);
});

test('a movement run hands its layers and ledger from piece to piece', () => {
  const run = createMovementRun({ movement: 0, difficulty: 'normal' });
  assert.equal(run.piece.id, 'roof-run');
  assert.equal(run.ticket(), 0);
  run.runner.vitals.hp = 1;
  assert.equal(run.next(), true);
  assert.equal(run.piece.id, 'return-to-sender');
  assert.equal(run.runner.vitals.hp, 1, 'the layers carry over');
  assert.equal(run.ticket(), 40);
  assert.equal(run.next(), false);
  run.jump(0, 2);
  assert.equal(run.piece.seg.index, 2);
  assert.ok(Math.abs(run.ticket() - 40 * (0.15 + 0.28)) < 1e-9);
  assert.throws(() => createMovementRun({ movement: 9 }), /no set pieces/);
});
