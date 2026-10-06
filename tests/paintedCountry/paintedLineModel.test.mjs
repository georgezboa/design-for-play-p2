import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BARRIERS,
  BELL_MS,
  FINISH_FRONT,
  LINE,
  TRAIN,
  TRAIN_COLOURS,
  createPaintedLine,
} from '../../src/chapters/paintedCountry/paintedLineModel.js';
import { BELL_MS as CH2_BELL_MS } from '../../src/chapters/borrowedLight/timetableModel.js';

// Chapter 4 · Part III, "paint the line ahead": the painted train advances on
// Chapter 2's bell; Butch paints track and washes paper ahead of it. Nothing
// fails; the train waits at a gap with its whistle blowing.

// Clear whatever stops the train next, the way a player standing at it would.
function clearAt(line, col, reason) {
  if (reason === 'gap') {
    for (let c = col; !line.trackAt(c); c += 1) line.paint(c, LINE.trackRow);
  } else {
    for (let r = TRAIN.topRow; r < LINE.trackRow; r += 1) {
      let guard = 0;
      while (line.isSolid(col, r) && guard < 5) {
        line.wash(col, r);
        guard += 1;
      }
    }
  }
}

test('the line rings on Chapter 2\'s four-second bell', () => {
  assert.equal(BELL_MS, 4000);
  assert.equal(BELL_MS, CH2_BELL_MS);
});

test('a player who keeps ahead of the train finishes in 60–90 seconds', () => {
  const line = createPaintedLine();
  line.obstaclesAhead().forEach(({ col, reason }) => clearAt(line, col, reason));
  assert.equal(line.obstaclesAhead().length, 0);
  let bells = 0;
  while (!line.state.arrived && bells < 100) {
    line.bell();
    bells += 1;
  }
  const seconds = (bells * BELL_MS) / 1000;
  assert.ok(seconds >= 60 && seconds <= 90, `${seconds}s`);
  assert.equal(line.state.front, FINISH_FRONT);
});

test('nothing fails: an idle player leaves the train waiting, whistling, never lost', () => {
  const line = createPaintedLine();
  for (let i = 0; i < 40; i += 1) line.bell();
  const snap = line.snapshot();
  assert.equal(snap.arrived, false);
  assert.equal(snap.failed, false);
  assert.equal(snap.waiting.reason, 'gap');
  assert.ok(snap.whistles >= 39, 'it whistles on every bell it waits');
  const front = snap.front;
  line.bell();
  assert.equal(line.state.front, front, 'it waits at the gap rather than falling in');
});

test('a painted gap lets the train through on the next bell; a barrier stops it until washed', () => {
  const line = createPaintedLine();
  line.bell();
  line.bell();
  const gap = line.state.waiting;
  assert.equal(gap.reason, 'gap');
  clearAt(line, gap.at, 'gap');
  line.bell();
  assert.ok(line.state.front > gap.at);
  while (!line.state.waiting || line.state.waiting.reason !== 'barrier') {
    line.bell();
    if (line.state.waiting?.reason === 'gap') clearAt(line, line.state.waiting.at, 'gap');
  }
  const barrier = line.state.waiting.at;
  assert.equal(barrier, BARRIERS[0].col);
  const front = line.state.front;
  line.bell();
  assert.equal(line.state.front, front);
  clearAt(line, barrier, 'barrier');
  line.bell();
  assert.ok(line.state.front > front, 'one washed column lets it roll on to the next');
});

test('official-record barriers take two washes per cell', () => {
  const line = createPaintedLine();
  const varnished = BARRIERS.find((b) => b.varnish);
  const c = varnished.col;
  const r = TRAIN.topRow;
  assert.equal(line.wash(c, r), true);
  assert.equal(line.isBlock(c, r), true);
  assert.equal(line.wash(c, r), true);
  assert.equal(line.isBlock(c, r), false);
});

test('the train never runs backwards and its own track cannot be washed out from under it', () => {
  const line = createPaintedLine();
  line.obstaclesAhead().forEach(({ col, reason }) => clearAt(line, col, reason));
  let last = line.state.front;
  for (let i = 0; i < 6; i += 1) {
    line.bell();
    assert.ok(line.state.front >= last);
    last = line.state.front;
  }
  // a painted track cell now under the train
  const under = [...line.state.painted].map((k) => k % LINE.cols).find((c) => c >= line.rear() && c <= line.state.front);
  if (under !== undefined) {
    assert.equal(line.wash(under, LINE.trackRow), false);
    assert.ok(line.drainEvents().some((e) => e.type === 'wash-refused' && e.reason === 'train-on-it'));
  }
  assert.equal(line.paint(line.state.front, TRAIN.topRow), false, 'no painting inside the train');
});

test('dead-end check: from any mid-run state the line can still be finished', () => {
  // Random play, then a clean-up solver: whatever was painted or washed,
  // clearing what blocks the train always gets it home.
  let seed = 7;
  const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  for (let run = 0; run < 12; run += 1) {
    const line = createPaintedLine();
    for (let i = 0; i < 400; i += 1) {
      const c = Math.floor(rnd() * LINE.cols);
      const r = TRAIN.topRow + Math.floor(rnd() * 5);
      if (rnd() < 0.5) line.paint(c, r);
      else line.wash(c, r);
      if (i % 40 === 0) line.bell();
    }
    let guard = 0;
    while (!line.state.arrived && guard < 200) {
      const { waiting } = line.bell();
      if (waiting) clearAt(line, waiting.at, waiting.reason);
      guard += 1;
    }
    assert.equal(line.state.arrived, true, `run ${run}`);
  }
});

test('at the platform each borrowed colour goes back to the resident who lent it', () => {
  const line = createPaintedLine();
  assert.equal(line.returnColour('green'), false, 'not before the train arrives');
  line.obstaclesAhead().forEach(({ col, reason }) => clearAt(line, col, reason));
  while (!line.state.arrived) line.bell();
  TRAIN_COLOURS.forEach((id, i) => {
    assert.equal(line.returnColour(id), true);
    assert.equal(line.state.complete, i === TRAIN_COLOURS.length - 1);
  });
  assert.equal(line.returnColour('green'), false);
  assert.ok(line.drainEvents().some((e) => e.type === 'colours-returned'));
});

// Alpha round 1 (P2): the chase had no pressure, because the train waits.
// Standing still for COAT_BELLS bells costs a coat of paint; nothing fails.
test('a train kept standing loses a coat of paint every few bells, never fails', async () => {
  const { COAT_BELLS, MAX_COATS_LOST, coatAlpha, createPaintedLine: create, platformLines } = await import('../../src/chapters/paintedCountry/paintedLineModel.js');
  const line = create();
  let bells = 0;
  while (!line.state.waiting && bells < 20) { line.bell(); bells += 1; }
  assert.ok(line.state.waiting, 'reached a break');
  line.drainEvents();
  for (let i = 0; i < COAT_BELLS - 1; i += 1) line.bell();
  assert.equal(line.state.coatsLost, 0, 'a short wait costs nothing');
  line.bell();
  assert.equal(line.state.coatsLost, 1);
  assert.ok(line.drainEvents().some((e) => e.type === 'coat-lost' && e.coatsLost === 1));
  for (let i = 0; i < COAT_BELLS * 10; i += 1) line.bell();
  assert.equal(line.state.coatsLost, MAX_COATS_LOST, 'capped');
  assert.equal(line.snapshot().failed, false);
  assert.equal(line.snapshot().coatsLost, MAX_COATS_LOST);
  assert.ok(coatAlpha(MAX_COATS_LOST) >= 0.35 && coatAlpha(0) === 1);
  // A train that keeps moving loses nothing.
  const quick = create();
  quick.obstaclesAhead().forEach(({ col, reason }) => {
    if (reason === 'gap') quick.paint(col, 22);
    else for (let r = 18; r < 22; r += 1) while (quick.isSolid(col, r)) quick.wash(col, r);
  });
  while (!quick.state.arrived) quick.bell();
  assert.equal(quick.state.coatsLost, 0);
  assert.notEqual(platformLines(0).departure, platformLines(2).departure);
  assert.equal(platformLines(0).arrival, 'THE PLATFORM. THE COLOURS WERE ONLY BORROWED.');
});

test('one wash takes a whole column of paper off the line (varnish first)', () => {
  const line = createPaintedLine();
  const plain = BARRIERS.find((b) => !b.varnish);
  assert.equal(line.wash(plain.col, TRAIN.topRow + 2), true);
  for (let r = TRAIN.topRow; r < LINE.trackRow; r += 1) assert.equal(line.isBlock(plain.col, r), false, `row ${r}`);
  assert.equal(line.isBlock(plain.col + 1, TRAIN.topRow), true, 'the next column is still there');
  const varnished = BARRIERS.find((b) => b.varnish);
  assert.equal(line.wash(varnished.col, TRAIN.topRow), true);
  assert.equal(line.isBlock(varnished.col, LINE.trackRow - 1), true, 'the first wash only strips the record');
  assert.equal(line.varnishAt(varnished.col, LINE.trackRow - 1), 0);
  assert.equal(line.wash(varnished.col, LINE.trackRow - 1), true);
  for (let r = TRAIN.topRow; r < LINE.trackRow; r += 1) assert.equal(line.isBlock(varnished.col, r), false);
});
