import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BARRIERS,
  COAT_SECONDS,
  FADED_SPANS,
  FINISH_FRONT,
  GROUND_SPANS,
  LINE,
  MAX_COATS_LOST,
  RIDE,
  TRAIN,
  TRAIN_COLOURS,
  coatAlpha,
  createPaintedLine,
  platformLines,
} from '../../src/chapters/paintedCountry/paintedLineModel.js';

// Chapter 4 · Part III, "paint the line ahead" — round 6 (George, G2: "the
// train runs one stretch per bell" was not fun). The painted train rolls
// continuously; Butch rides the engine and paints the line ahead in real
// time. Its pace is the line's: faster on rails he has just painted. It eases
// to a stop in front of anything it cannot cross and never fails.

const CELL = LINE.cell;
const TRACK = LINE.trackRow;

// Clear one break the way a player would.
function clear(line, col) {
  const why = line.obstacleAt(col);
  if (why === 'gap' || why === 'faded') return line.paint(col, TRACK);
  if (why === 'barrier') {
    for (let r = TRAIN.topRow; r < TRACK; r += 1) {
      let guard = 0;
      while (line.isSolid(col, r) && guard < 5) {
        line.wash(col, r);
        guard += 1;
      }
    }
  }
  return true;
}

// A rider on the engine's boiler, with the brush's reach (200 px, measured
// from his middle ~90 px above the rails): clears what he can reach, after
// `react` seconds of seeing it; optionally paints the rails ahead as well.
function ride(line, { dt = 1 / 60, react = 0, ink = false, limit = 400 } = {}) {
  const seen = new Map();
  let t = 0;
  const reachX = () => line.state.x - 16 + Math.sqrt(200 ** 2 - 89 ** 2);
  while (!line.state.arrived && t < limit) {
    for (let c = Math.floor(line.state.x / CELL); (c + 1) * CELL <= reachX(); c += 1) {
      if (!seen.has(c)) seen.set(c, t);
      if (t - seen.get(c) < react) continue;
      if (line.obstacleAt(c)) clear(line, c);
      else if (ink && !line.wetAt(c)) line.paint(c, TRACK);
    }
    line.step(dt);
    t += dt;
  }
  return t;
}

test('no bell: the train rolls continuously once it has steamed up', () => {
  const line = createPaintedLine();
  line.step(RIDE.rollAfter * 0.5);
  assert.equal(line.state.speed, 0, 'it stands for a moment at the start');
  const xs = [];
  for (let i = 0; i < 120; i += 1) {
    line.step(1 / 60);
    xs.push(line.state.x);
  }
  for (let i = 1; i < xs.length; i += 1) assert.ok(xs[i] >= xs[i - 1], 'never backwards');
  const moving = xs.filter((x, i) => i > 0 && x > xs[i - 1]).length;
  assert.ok(moving > 60, `it moves on most frames (${moving}/119), not in one stretch per bell`);
  assert.ok(line.drainEvents().some((e) => e.type === 'train-rolling' && e.first));
});

test('it has weight: it gathers speed gradually and holds its pencil pace on pencil rails', () => {
  const line = createPaintedLine();
  line.step(RIDE.rollAfter);
  const speeds = [];
  for (let i = 0; i < 72; i += 1) {
    line.step(1 / 60);
    speeds.push(line.state.speed);
  }
  for (let i = 1; i < speeds.length; i += 1) assert.ok(speeds[i] - speeds[i - 1] <= RIDE.accel / 60 + 1e-6, 'no jump in speed');
  assert.ok(speeds[speeds.length - 1] <= RIDE.pencil + 1e-6);
  assert.ok(speeds[speeds.length - 1] > RIDE.pencil * 0.6);
});

test('the pace is the line\'s: painting the rails ahead makes it run faster', () => {
  const pencil = createPaintedLine();
  const painted = createPaintedLine();
  [pencil, painted].forEach((line) => {
    for (let c = GROUND_SPANS[0].to; c < GROUND_SPANS[1].from; c += 1) line.paint(c, TRACK);
    for (let c = BARRIERS[0].col; c < BARRIERS[0].col + BARRIERS[0].cols; c += 1) clear(line, c);
  });
  for (let c = 17; c < 62; c += 1) painted.paint(c, TRACK); // wet paint over the pencil rails
  [pencil, painted].forEach((line) => { for (let i = 0; i < 60 * 6; i += 1) line.step(1 / 60); });
  assert.ok(painted.state.x > pencil.state.x + 120, `${painted.state.x} vs ${pencil.state.x}`);
  assert.ok(painted.state.pace > 0.5);
  assert.ok(pencil.state.pace < 0.5);
  assert.ok(RIDE.painted > RIDE.pencil * 1.4);
});

test('nothing fails: left alone it eases to a stop before the first gap and waits there, whistling', () => {
  const line = createPaintedLine();
  for (let i = 0; i < 60 * 40; i += 1) line.step(1 / 60);
  const snap = line.snapshot();
  assert.equal(snap.arrived, false);
  assert.equal(snap.failed, false);
  assert.deepEqual(snap.waiting, { at: GROUND_SPANS[0].to, reason: 'gap' });
  assert.ok(line.state.x <= GROUND_SPANS[0].to * CELL, 'the nose never enters the gap');
  assert.ok(line.state.x >= GROUND_SPANS[0].to * CELL - RIDE.margin - 2, 'it comes right up to it');
  assert.equal(snap.whistles, 1);
  const events = line.drainEvents();
  assert.ok(events.some((e) => e.type === 'train-waiting' && e.reason === 'gap'));
});

test('it never runs into a break, at any frame rate', () => {
  for (const dt of [1 / 144, 1 / 60, 1 / 20, 1 / 10]) {
    const line = createPaintedLine();
    for (let i = 0; i < 40 / dt; i += 1) {
      line.step(dt);
      const brk = line.nextBreak();
      if (brk) assert.ok(line.state.x <= brk.col * CELL + 1e-6, `dt ${dt}: nose ${line.state.x} past ${brk.col * CELL}`);
    }
    assert.ok(line.state.waiting, `dt ${dt}`);
  }
});

test('a painted gap lets it roll on at once; a barrier stops it until washed (one column per wash)', () => {
  const line = createPaintedLine();
  for (let i = 0; i < 60 * 12; i += 1) line.step(1 / 60);
  const gap = line.state.waiting;
  assert.equal(gap.reason, 'gap');
  for (let c = GROUND_SPANS[0].to; c < GROUND_SPANS[1].from; c += 1) assert.equal(line.paint(c, TRACK), true);
  line.drainEvents();
  line.step(1 / 60);
  assert.ok(line.drainEvents().some((e) => e.type === 'train-rolling'), 'it rolls on the moment the way is clear');
  for (let i = 0; i < 60 * 20; i += 1) line.step(1 / 60);
  assert.equal(line.state.waiting.reason, 'barrier');
  assert.equal(line.state.waiting.at, BARRIERS[0].col);
  assert.equal(line.wash(BARRIERS[0].col, TRAIN.topRow + 1), true);
  for (let r = TRAIN.topRow; r < TRACK; r += 1) assert.equal(line.isBlock(BARRIERS[0].col, r), false, 'the whole column comes off');
  for (let i = 0; i < 60 * 5; i += 1) line.step(1 / 60);
  assert.ok(line.state.x <= (BARRIERS[0].col + 1) * CELL, 'the second column still holds it');
  assert.equal(line.state.waiting.at, BARRIERS[0].col + 1);
  const x = line.state.x;
  line.wash(BARRIERS[0].col + 1, TRAIN.topRow);
  for (let i = 0; i < 60; i += 1) line.step(1 / 60);
  assert.ok(line.state.x > x + 10);
});

test('rubbed-out rails are ground without track: paint them back', () => {
  const line = createPaintedLine();
  const { from } = FADED_SPANS[0];
  assert.equal(line.isGround(from, TRACK), true);
  assert.equal(line.trackAt(from), false);
  assert.equal(line.obstacleAt(from), 'faded');
  assert.equal(line.paint(from, TRACK), true);
  assert.equal(line.trackAt(from), true);
  assert.equal(line.isPainted(from, TRACK), false, 'no new solid: the ground was already there');
  assert.equal(line.isInked(from, TRACK), true);
  assert.equal(line.paint(from, TRACK), false, 'once is enough');
  assert.equal(line.wash(from, TRACK), true, 'and it washes off again');
  assert.equal(line.trackAt(from), false);
});

test('official-record barriers take two washes per cell', () => {
  const line = createPaintedLine();
  const varnished = BARRIERS.find((b) => b.varnish);
  const c = varnished.col;
  assert.equal(line.wash(c, TRAIN.topRow), true);
  assert.equal(line.isBlock(c, TRAIN.topRow), true);
  assert.equal(line.wash(c, TRAIN.topRow), true);
  assert.equal(line.isBlock(c, TRAIN.topRow), false);
});

test('its own track cannot be washed out from under it, and nothing is painted inside it', () => {
  const line = createPaintedLine();
  for (let c = 17; c < 30; c += 1) assert.equal(line.paint(c, TRACK), true);
  assert.equal(line.paint(10, TRACK), false, 'not under the train');
  for (let i = 0; i < 60 * 4; i += 1) line.step(1 / 60);
  const under = line.front() - 2;
  assert.equal(line.isInked(under, TRACK), true, 'the train has rolled onto the paint');
  assert.equal(line.wash(under, TRACK), false);
  assert.ok(line.drainEvents().some((e) => e.type === 'wash-refused' && e.reason === 'train-on-it'));
  assert.equal(line.paint(line.front(), TRAIN.topRow), false);
});

test('a good ride lasts about a minute: 30-60 s painting ahead, under 90 s for a slow player', () => {
  const sharp = ride(createPaintedLine(), { ink: true });
  const steady = ride(createPaintedLine(), { react: 0.6 });
  const slow = ride(createPaintedLine(), { react: 2 });
  assert.ok(sharp >= 30 && sharp <= 60, `sharp ${sharp.toFixed(1)}s`);
  assert.ok(steady > sharp, 'painting the rails ahead is faster than only mending breaks');
  assert.ok(slow <= 95, `slow ${slow.toFixed(1)}s`);
});

test('dead-end check: from any mid-run state the line can still be finished', () => {
  let seed = 7;
  const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  for (let run = 0; run < 12; run += 1) {
    const line = createPaintedLine();
    for (let i = 0; i < 400; i += 1) {
      const c = Math.floor(rnd() * LINE.cols);
      const r = TRAIN.topRow + Math.floor(rnd() * 5);
      if (rnd() < 0.5) line.paint(c, r);
      else line.wash(c, r);
      if (i % 20 === 0) line.step(0.25);
    }
    const t = ride(line, { react: 0.3 });
    assert.equal(line.state.arrived, true, `run ${run} (${t.toFixed(1)}s)`);
  }
});

test('standing at a break runs a coat of paint off every few seconds, never fails', () => {
  const line = createPaintedLine();
  while (!line.state.waiting) line.step(1 / 30);
  line.drainEvents();
  for (let i = 0; i < (COAT_SECONDS - 0.5) * 30; i += 1) line.step(1 / 30);
  assert.equal(line.state.coatsLost, 0, 'a short wait costs nothing');
  for (let i = 0; i < 30; i += 1) line.step(1 / 30);
  assert.equal(line.state.coatsLost, 1);
  assert.ok(line.drainEvents().some((e) => e.type === 'coat-lost' && e.coatsLost === 1));
  for (let i = 0; i < COAT_SECONDS * 30 * 10; i += 1) line.step(1 / 30);
  assert.equal(line.state.coatsLost, MAX_COATS_LOST, 'capped');
  assert.equal(line.snapshot().failed, false);
  assert.ok(coatAlpha(MAX_COATS_LOST) >= 0.35 && coatAlpha(0) === 1);
  // a train that keeps moving loses nothing
  const quick = createPaintedLine();
  ride(quick, { ink: true });
  assert.equal(quick.state.coatsLost, 0);
  assert.notEqual(platformLines(0).departure, platformLines(2).departure);
  assert.equal(platformLines(0).arrival, 'THE PLATFORM. THE COLOURS WERE ONLY BORROWED.');
});

test('it stops on its mark at the platform, and each borrowed colour goes back to whoever lent it', () => {
  const line = createPaintedLine();
  assert.equal(line.returnColour('green'), false, 'not before the train arrives');
  ride(line, { ink: true });
  assert.equal(line.state.arrived, true);
  assert.equal(line.state.x, (FINISH_FRONT + 1) * CELL);
  assert.equal(line.front(), FINISH_FRONT);
  assert.ok(line.drainEvents().some((e) => e.type === 'train-arrived'));
  TRAIN_COLOURS.forEach((id, i) => {
    assert.equal(line.returnColour(id), true);
    assert.equal(line.state.complete, i === TRAIN_COLOURS.length - 1);
  });
  assert.equal(line.returnColour('green'), false);
  assert.ok(line.drainEvents().some((e) => e.type === 'colours-returned'));
});

test('every break on the line can be reached from the engine before the train has to stop', () => {
  // The widest gap must fit inside the brush's reach from the nose when the
  // train stands at its edge (200 px reach, measured ~90 px above the rails).
  const reachAhead = -16 + Math.sqrt(200 ** 2 - 89 ** 2) + RIDE.margin;
  for (let i = 0; i < GROUND_SPANS.length - 1; i += 1) {
    const width = (GROUND_SPANS[i + 1].from - GROUND_SPANS[i].to) * CELL;
    assert.ok(width <= reachAhead, `gap ${i}: ${width}px > ${reachAhead.toFixed(0)}px`);
  }
});
