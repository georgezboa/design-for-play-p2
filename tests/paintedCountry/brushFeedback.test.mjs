import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { chaikin, createStrokeBook, dryness, resample, runBounds, runPath, runSignature, strokeWidth } from '../../src/chapters/paintedCountry/brushStrokes.js';
import { edgeProximity, nearestOnReach, nibState, reachExit, withinReach } from '../../src/chapters/paintedCountry/brushReach.js';
import { PAINT_LESSON, createPaintLesson } from '../../src/chapters/paintedCountry/paintLesson.js';
import { FLOOR_ROW, FLOOR_SPANS, REACH } from '../../src/chapters/paintedCountry/carLayout.js';

// Round 6, playtest items 11-13: teach the brush before the first click, put
// its reach on the cursor, and draw paint as strokes over the grid.

const read = (path) => readFileSync(new URL(`../../src/chapters/paintedCountry/${path}`, import.meta.url), 'utf8');
const gallery = read('PaintedCountryScene.js');
const line = read('PaintedLineScene.js');
const nib = read('brushNib.js');
const strokeArt = read('art/strokeArt.js');
const layer = read('strokeLayer.js');

// ------------------------------------------------------------- item 13

test('item 13: a press of the brush is remembered as one stroke, in painting order', () => {
  const book = createStrokeBook({ cols: 100 });
  book.begin();
  [[3, 5], [4, 5], [5, 5], [6, 4]].forEach(([c, r]) => assert.equal(book.add(c, r), true));
  assert.equal(book.add(4, 5), false, 'a cell is only ever in one stroke');
  book.end();
  const runs = book.runs();
  assert.equal(runs.length, 1, 'a diagonal step stays in the same stroke');
  assert.deepEqual(runs[0].cells, [{ c: 3, r: 5 }, { c: 4, r: 5 }, { c: 5, r: 5 }, { c: 6, r: 4 }]);
  book.begin();
  book.add(20, 5);
  book.end();
  assert.equal(book.runs().length, 2, 'the next press is its own stroke');
});

test('item 13: a stroke that jumps, or is washed through, splits into runs drawn separately', () => {
  const book = createStrokeBook({ cols: 100 });
  book.begin();
  for (let c = 0; c < 10; c += 1) book.add(c, 8);
  book.add(14, 8); // a refused stretch between
  book.end();
  assert.equal(book.runs().length, 2);
  const v = book.version;
  assert.equal(book.remove(4, 8), true);
  assert.ok(book.version > v, 'a wash changes the drawing');
  const runs = book.runs();
  assert.deepEqual(runs.map((r) => r.cells.length), [4, 5, 1]);
  assert.notEqual(runSignature(runs[0]), runSignature(runs[1]));
  assert.equal(book.strokeOf(4, 8), null);
});

test('item 13: paint with no stroke on record (a resume, a dev route) is adopted as row runs', () => {
  const book = createStrokeBook({ cols: 50 });
  const key = (c, r) => r * 50 + c;
  book.adopt(new Set([key(1, 3), key(2, 3), key(3, 3), key(10, 3), key(2, 4)]));
  assert.deepEqual(book.runs().map((r) => r.cells.length).sort(), [1, 1, 3]);
  assert.equal(book.adopt(new Set([key(1, 3)])), 0, 'already on record');
});

test('item 13: the staircase of a diagonal drag is smoothed into one ramp-like line', () => {
  const run = { cells: [0, 1, 2, 3, 4, 5].map((i) => ({ c: 10 + i, r: 20 - i })) };
  const path = runPath(run, 20);
  assert.ok(path.length > run.cells.length, 'corner-cut');
  // every smoothed point lies close to the straight 45° line through the centres
  path.forEach(([x, y]) => {
    const along = (x - 210) - (410 - y);
    assert.ok(Math.abs(along) / Math.SQRT2 < 1e-6 + 0.01, `(${x}, ${y})`);
  });
  // and the ends stay on the first and last cells
  assert.deepEqual(path[0], [210, 410]);
  assert.deepEqual(path[path.length - 1], [310, 310]);
  // Chaikin keeps a straight row straight
  assert.ok(chaikin([[0, 0], [20, 0], [40, 0]]).every(([, y]) => y === 0));
});

test('item 13: the stroke starts loaded and ends dry; a single cell is a short dab', () => {
  assert.ok(strokeWidth(0.5, 23) > strokeWidth(1, 23), 'the tail thins');
  assert.ok(strokeWidth(0, 23) < strokeWidth(0.4, 23), 'a blunt touch-down');
  assert.ok(strokeWidth(0.5, 23) >= 20, 'the body covers its 20 px cells');
  assert.equal(dryness(0.2), 0);
  assert.equal(dryness(1), 1);
  const dab = runPath({ cells: [{ c: 4, r: 4 }] }, 20);
  assert.equal(dab.length, 2);
  assert.equal(dab[0][1], dab[1][1]);
  const samples = resample([[0, 0], [100, 0]], 2);
  assert.equal(samples.length, 51);
  assert.equal(samples[samples.length - 1].t, 1);
  assert.deepEqual([samples[10].nx, samples[10].ny], [-0, 1]);
  const box = runBounds({ cells: [{ c: 2, r: 3 }, { c: 3, r: 3 }] }, 20, 10);
  assert.deepEqual(box, { x: 30, y: 50, w: 60, h: 40 });
});

test('item 13: the display layer draws strokes over the unchanged grid collision', () => {
  // bristles, paper tooth, colour variation, the hatched "real" shadow
  for (const needle of [/bristle streaks/, /destination-out/, /strokeTones\(color, r\)/, /hatched shadow/, /splay/]) assert.match(strokeArt, needle);
  assert.match(layer, /createCanvas\(key/);
  assert.match(layer, /FLUSH_MS/);
  for (const scene of [gallery, line]) {
    assert.match(scene, /new StrokeLayer\(this, \{ book: this\.strokes/);
    assert.match(scene, /this\.strokes\.add\(/);
    assert.match(scene, /this\.strokes\.remove\(/);
    assert.match(scene, /this\.strokeLayer\.sync\(!this\.brush\.paintDown\)/);
    assert.doesNotMatch(scene, /`paint-\$\{/, 'no more per-cell paint stamps for Butch\'s paint');
  }
  // the collision is still the grid: a body per painted cell, one-way
  assert.match(gallery, /addCellBody\(cx, cy\);\n\s+this\.strokes\.add\(cx, cy\);/);
  assert.match(gallery, /object\.body\.checkCollision\.down = false;/);
});

// ------------------------------------------------------------- item 12

test('item 12: reach is measured from Butch; a drag that leaves it is cut exactly at the edge', () => {
  const c = { x: 100, y: 100 };
  assert.equal(withinReach(100, 100, 280, 100, 180), true);
  assert.equal(withinReach(100, 100, 281, 100, 180), false);
  const exit = reachExit({ x: 200, y: 100 }, { x: 400, y: 100 }, c, 180);
  assert.ok(Math.abs(exit.x - 280) < 1e-9 && exit.y === 100);
  assert.deepEqual([exit.dirX, exit.dirY], [1, 0]);
  assert.equal(reachExit({ x: 300, y: 100 }, { x: 400, y: 100 }, c, 180), null, 'already outside: no exit');
  assert.equal(reachExit({ x: 120, y: 100 }, { x: 130, y: 100 }, c, 180), null, 'still inside');
  const diag = reachExit({ x: 100, y: 100 }, { x: 400, y: 400 }, c, 180);
  assert.ok(Math.abs(Math.hypot(diag.x - 100, diag.y - 100) - 180) < 1e-9);
  const at = nearestOnReach(c, 100, -500, 180);
  assert.deepEqual([at.x, at.y], [100, -80]);
  assert.equal(edgeProximity(c, 100, 100, 180), 0);
  assert.equal(edgeProximity(c, 400, 100, 180), 1);
  assert.ok(edgeProximity(c, 260, 100, 180, 48) > 0.5);
});

test('item 12: the nib says what a click will do before the click', () => {
  assert.equal(nibState({ inReach: true, canPaint: true }), 'paint');
  assert.equal(nibState({ inReach: false, canPaint: true }), 'far', 'out of reach wins over paintable');
  assert.equal(nibState({ inReach: true, canPaint: false, canWash: true }), 'wash');
  assert.equal(nibState({ inReach: true }), 'refuse');
  assert.equal(nibState({ overObject: true, inReach: false }), 'look', 'a plate or a door sign is not paint');
});

test('item 12: out of reach the cursor is a struck nib with GET CLOSER; a cut stroke leaves a blot, a tick and a dry-brush scratch', () => {
  assert.match(nib, /struck through/);
  assert.match(nib, /'GET CLOSER'/);
  assert.match(nib, /'BRUSH REACH'/);
  assert.match(nib, /setDefaultCursor\(nibCursorCss\(state\)\)/);
  assert.match(nib, /the stop tick, across the direction of the stroke/);
  assert.match(nib, /dryBrush\(\)/);
  assert.match(read('lineAudio.js'), /export function dryBrush\(/);
  for (const scene of [gallery, line]) {
    assert.match(scene, /reachExit\(prev, \{ x: wx, y: wy \}/);
    assert.match(scene, /this\.nib\.stop\(exit\.x, exit\.y, exit\.dirX, exit\.dirY\)/);
    assert.match(scene, /THE BRUSH REACHES THIS FAR/);
    assert.match(scene, /this\.nib\.refuseFar\(\)/);
  }
});

// ------------------------------------------------------------- item 11

test('item 11: the lesson is a dotted step on the cold end\'s floor, in reach of where Butch starts', () => {
  const start = { x: 200, y: 410 };
  PAINT_LESSON.ghost.forEach(({ c, r }) => {
    assert.ok(Math.hypot(c * 20 + 10 - start.x, r * 20 + 10 - start.y) < REACH, `cell ${c},${r} in reach`);
    assert.ok(c < FLOOR_SPANS[0].to, 'over the first safe ground, before the gap');
    assert.ok(r < FLOOR_ROW && FLOOR_ROW - r <= 3, 'a step he can hop onto');
  });
  assert.equal(PAINT_LESSON.gap.from, FLOOR_SPANS[0].to);
  assert.equal(PAINT_LESSON.gap.to, FLOOR_SPANS[1].from);
});

test('item 11: ghost → hop → gap → done, and the gap gets its own ghost if he skipped the step', () => {
  const painted = new Set();
  const isPainted = (c, r) => painted.has(`${c},${r}`);
  const lesson = createPaintLesson();
  assert.equal(lesson.state.step, 'ghost');
  assert.equal(lesson.ghostCells().length, 5);
  assert.equal(lesson.showKeyHint, true, 'LEFT CLICK · PAINT rides the nib before the first click');
  PAINT_LESSON.ghost.slice(0, 3).forEach(({ c, r }) => painted.add(`${c},${r}`));
  lesson.update({ x: 200, isPainted });
  assert.equal(lesson.state.step, 'ghost');
  painted.add('16,20');
  assert.deepEqual(lesson.update({ x: 200, isPainted }), ['ghost-done']);
  assert.equal(lesson.state.step, 'hop');
  assert.deepEqual(lesson.update({ x: 300, standingOnPaint: true, isPainted }), ['hopped']);
  assert.equal(lesson.state.step, 'gap');
  assert.equal(lesson.gapCells().length, 0, 'the gap is the application: no ghost unless he stalls');
  for (let i = 0; i < 8; i += 1) lesson.update({ x: 390, dt: 1, isPainted });
  assert.equal(lesson.gapCells().length, 10, 'stalled at the gap: it gets a dotted stroke too');
  assert.deepEqual(lesson.update({ x: 640, isPainted }), ['across']);
  assert.equal(lesson.done, true);

  const skipper = createPaintLesson();
  assert.deepEqual(skipper.update({ x: 400, isPainted: () => false }), ['skipped-step']);
  assert.equal(skipper.state.step, 'gap');
  assert.equal(skipper.gapCells().length, 10, 'never painted: the lesson moves to the gap\'s edge');
});

test('item 11: a first paint off the dotted line is named once; the key hint retires after three strokes', () => {
  const lesson = createPaintLesson();
  assert.equal(lesson.onPaint(15, 20), null, 'on the ghost');
  assert.equal(lesson.onPaint(30, 10), 'named-off-ghost');
  assert.equal(lesson.onPaint(31, 10), null, 'once');
  for (let i = 0; i < PAINT_LESSON.keyStrokes; i += 1) lesson.onStroke();
  assert.equal(lesson.showKeyHint, false);
});

test('item 11: the gallery teaches before the first click, and a card-closing click never paints', () => {
  assert.match(gallery, /PAINT ALONG THE DOTTED LINE/);
  assert.match(gallery, /YOU PAINTED PAPER · IT IS SOLID NOW/);
  assert.match(gallery, /LEFT' : 'RIGHT'\} CLICK/);
  assert.match(gallery, /if \(clicked\) this\.brushHeldOff = true;/);
  assert.match(gallery, /if \(this\.brushHeldOff\) \{/);
  // the stove moved into the corner so the first ground is clear for the step
  assert.match(gallery, /stoveX: 40,/);
  assert.match(read('ghostStroke.js'), /drawNib\(g, at\.x, at\.y/);
  // the line ahead's first gap is taught the same way
  assert.match(line, /this\.ghost\.show\(cells\)/);
});

test('item 13: a very long drag reloads the brush every MAX_RUN cells (and redraws only the new stroke)', async () => {
  const { MAX_RUN } = await import('../../src/chapters/paintedCountry/brushStrokes.js');
  const book = createStrokeBook({ cols: 400 });
  book.begin();
  for (let c = 0; c < MAX_RUN * 2 + 3; c += 1) book.add(c, 22);
  book.end();
  assert.deepEqual(book.runs().map((r) => r.cells.length), [MAX_RUN, MAX_RUN, 3]);
  assert.ok(MAX_RUN >= 16, 'a gap-sized bridge is still one stroke');
});

test('item 13: an uneven staircase (two across, one up) is painted as an even slope, not a worm', async () => {
  const { relax } = await import('../../src/chapters/paintedCountry/brushStrokes.js');
  const cells = [];
  for (let i = 0; i < 12; i += 1) cells.push({ c: 10 + i, r: 20 - Math.floor(i / 2) });
  const path = runPath({ cells }, 20);
  const [x0, y0] = path[0];
  const [x1, y1] = path[path.length - 1];
  const off = (x, y) => Math.abs((y1 - y0) * x - (x1 - x0) * y + x1 * y0 - y1 * x0) / Math.hypot(x1 - x0, y1 - y0);
  const inner = path.slice(Math.floor(path.length * 0.2), Math.ceil(path.length * 0.8));
  const worst = Math.max(...inner.map(([x, y]) => off(x, y)));
  const raw = Math.max(...cells.map(({ c, r }) => off(c * 20 + 10, r * 20 + 10)));
  assert.ok(worst < 3, `within ${worst.toFixed(2)} px of the slope`);
  assert.ok(worst < raw, 'smoother than the cells');
  assert.deepEqual(relax([[0, 0], [1, 5]]), [[0, 0], [1, 5]], 'ends stay put');
});
