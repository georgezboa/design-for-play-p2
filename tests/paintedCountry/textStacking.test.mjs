import test from 'node:test';
import assert from 'node:assert/strict';
import { SAFE, clampToSafe, rectsOverlap, stackRect } from '../../src/chapters/paintedCountry/chapterConstants.js';

// Alpha round 4 · text collisions in Chapter 4: a feedback slip that lands
// on the paper tag (or on another slip) is moved off it.

const slipAt = (x, y, w, h) => {
  const pos = clampToSafe(x, y, w, h);
  return { x: pos.x - w / 2, y: pos.y - h, w, h };
};

test('a slip under the tag is stacked just above it', () => {
  const tag = { x: 400, y: 300, w: 220, h: 30 };
  const slip = slipAt(510, 330, 120, 26);
  const placed = stackRect(slip, [tag]);
  assert.equal(rectsOverlap(placed, tag, 4), false);
  assert.ok(placed.y + placed.h <= tag.y, 'above the tag');
  assert.equal(placed.x, slip.x, 'it only moves up');
});

test('three slips at one spot become a stack', () => {
  const others = [];
  for (let i = 0; i < 3; i += 1) others.push(stackRect(slipAt(480, 400, 300, 26), others));
  for (let i = 0; i < others.length; i += 1) {
    for (let j = i + 1; j < others.length; j += 1) assert.equal(rectsOverlap(others[i], others[j], 4), false, `${i} / ${j}`);
  }
});

test('with no room above, the slip goes below; a clear slip is left alone', () => {
  const tag = { x: 300, y: SAFE.top, w: 400, h: 40 };
  const slip = { x: 320, y: SAFE.top + 4, w: 200, h: 26 };
  const placed = stackRect(slip, [tag]);
  assert.ok(placed.y >= tag.y + tag.h, 'below the tag');
  const clear = { x: 10, y: 400, w: 50, h: 20 };
  assert.deepEqual(stackRect(clear, [tag]), clear);
});
