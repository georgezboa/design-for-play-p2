import test from 'node:test';
import assert from 'node:assert/strict';
import { ACTS, startCarry } from '../../src/chapters/nightService/acts/index.js';
import { CARRIAGE_TILE, createPanelModel, layoutGrid, planGrowth } from '../../src/chapters/nightService/panelModel.js';
import { settle } from './helpers.mjs';

const { act0, act05, act1, act2 } = ACTS;

test('the carriage wall grows 1×1 → 1×2 → 2×2 with one painted window size throughout', () => {
  const sizes = [act0, act05, act1].map((act) => layoutGrid(act.grid));
  sizes.forEach((layout) => {
    assert.equal(layout.tileW, CARRIAGE_TILE.w);
    assert.equal(layout.tileH, CARRIAGE_TILE.h);
  });
  // alpha #13: the few windows of the first acts are shown large, shrinking as the wall grows
  const widths = sizes.map((l) => l.slots[0].w);
  assert.ok(widths[0] > widths[1] && widths[1] > widths[2]);
  assert.ok(widths[0] / 1920 > 0.6, `Act 0's window is ${Math.round((widths[0] / 1920) * 100)}% of the screen`);
  sizes.forEach((l) => assert.ok(l.x >= 40 && l.y >= 60 && l.y + l.h <= 1080 - 140, 'every wall fits the carriage'));
  assert.deepEqual(sizes.map((l) => [l.cols, l.rows]), [[1, 1], [2, 1], [2, 2]]);
  // every grid stays centred on the carriage wall
  sizes.forEach((l) => assert.ok(Math.abs(l.x + l.w / 2 - 960) <= 1));
});

test('Act 0 → 0.5: the office slides aside and one new window opens beside it', () => {
  const plan = planGrowth(act0, act05, { fromSlots: ['office'] });
  const keep = plan.windows.filter((w) => w.kind === 'keep');
  const open = plan.windows.filter((w) => w.kind === 'open');
  assert.deepEqual(keep.map((w) => [w.tile, w.continues]), [['desk', 'office']]);
  assert.deepEqual(open.map((w) => w.tile), ['door']);
  const [desk] = keep;
  // from the centre of the wall to the right-hand slot, shrinking a little as it goes
  assert.equal(desk.from.x, plan.from.slots[0].x);
  assert.equal(desk.to.x, plan.to.slots[1].x);
  assert.ok(desk.from.w > desk.to.w);
  assert.ok(Math.abs(desk.from.w / desk.from.h - desk.to.w / desk.to.h) < 0.01, 'same shape');
  assert.ok(desk.to.x + desk.to.w / 2 > desk.from.x + desk.from.w / 2, 'it moves right; the new window opens on its left');
  assert.equal(open[0].to.x, plan.to.slots[0].x);
});

test('Act 0.5 → 1: the top row rises and two windows open below it', () => {
  const plan = planGrowth(act05, act1, { fromSlots: ['desk', 'door'] });
  const byTile = Object.fromEntries(plan.windows.map((w) => [w.tile, w]));
  assert.equal(byTile.desk.kind, 'keep');
  assert.equal(byTile.lockers.kind, 'keep');
  assert.equal(byTile.lockers.continues, 'door', 'the stores door zoomed through into the pigeonholes');
  assert.equal(byTile.window.kind, 'open');
  assert.equal(byTile.door.kind, 'open');
  // no sideways jump: the pair rises into the top row, closing in on the
  // gutter between them as it shrinks to the 2×2 size
  assert.equal(byTile.desk.from.x + byTile.desk.from.w, byTile.desk.to.x + byTile.desk.to.w);
  assert.equal(byTile.lockers.from.x, byTile.lockers.to.x);
  assert.ok(byTile.desk.to.y < byTile.desk.from.y);
  assert.equal(byTile.desk.to.y, plan.to.slots[0].y);
  assert.ok(byTile.window.to.y > byTile.desk.to.y && byTile.door.to.y > byTile.desk.to.y);
});

test('growth follows the real end state of the previous act (its carried slots)', () => {
  // a real playthrough of Act 0.5 ends with the desk left of the stores
  const model = createPanelModel(act05, { carry: startCarry('act05') });
  model.swap(0, 1); settle(model);
  model.zoomIn('desk', 'keys'); model.zoomIn('door', 'lock');
  model.swap(0, 1); settle(model);
  model.swap(0, 1); settle(model);
  const carry = model.carry();
  assert.deepEqual(carry.slots, ['desk', 'door']);
  const plan = planGrowth(act05, act1, { fromSlots: carry.slots });
  assert.deepEqual(plan.windows.filter((w) => w.kind === 'keep').map((w) => w.tile), ['desk', 'lockers']);
  // the carry still opens Act 1 cleanly (slots is informational only)
  const next = createPanelModel(act1, { carry });
  assert.deepEqual(next.state.slots, act1.slots);
  assert.equal(next.state.actors.butch.pose, 'idle');
});

test('acts that do not grow keep the plain title-card intro', () => {
  assert.equal(act2.growFrom, undefined);
  assert.equal(act0.growFrom, undefined);
  assert.deepEqual(act05.growFrom, { act: 'act0', keep: { desk: 'office' } });
  assert.deepEqual(act1.growFrom, { act: 'act05', keep: { desk: 'desk', lockers: 'door' } });
});
