import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ACTS, ACT_ORDER } from '../../src/chapters/nightService/acts/index.js';
import { planGrowth } from '../../src/chapters/nightService/panelModel.js';
import { UNFOLD, createUnfold, onFold, peekOffset, planUnfold, unfoldLayout } from '../../src/chapters/nightService/unfold.js';

const { act0, act05, act1 } = ACTS;
const BEZEL = 13;
const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

const fold01 = () => planUnfold(planGrowth(act0, act05, { fromSlots: ['office'] }));
// Act 0.5 ends with the desk left of the door (the floor joins them)
const fold12 = () => planUnfold(planGrowth(act05, act1, { fromSlots: ['desk', 'door'] }));

/** Visible area of a window rect inside its clip. */
function visibleArea(r) {
  if (!r.clip) return r.w * r.h;
  const w = Math.max(0, Math.min(r.x + r.w, r.clip.x1) - Math.max(r.x, r.clip.x0));
  const h = Math.max(0, Math.min(r.y + r.h, r.clip.y1) - Math.max(r.y, r.clip.y0));
  return w * h;
}

/** Drag the pull by `fraction` of its pointer travel over `ms`, in `steps`. */
function drag(u, fold, fraction, ms = 600, steps = 12) {
  const start = { ...fold.pull };
  u.grab(start, 0);
  for (let i = 1; i <= steps; i += 1) {
    const d = fold.pointerTravel * fraction * (i / steps) * fold.sign;
    u.move(fold.axis === 'x' ? { x: start.x + d, y: start.y } : { x: start.x, y: start.y + d }, (ms * i) / steps);
  }
  return u.release();
}

function run(u, ms = 2000) {
  const events = [];
  for (let t = 0; t < ms; t += 16) { const e = u.update(16); if (e) events.push(e); }
  return events;
}

test('every growth transition is unfolded by the player, in the direction the new windows lie', () => {
  const growing = ACT_ORDER.map((id) => ACTS[id]).filter((act) => act.growFrom);
  assert.deepEqual(growing.map((act) => act.id), ['act05', 'act1'], 'only 0 → 0.5 → I grow (II → III changes car)');
  const a = fold01();
  // 1 → 2: the stores door unfolds out of the office window's left edge
  assert.equal(a.side, 'left');
  assert.equal(a.axis, 'x');
  assert.deepEqual(a.open.map((w) => w.tile), ['door']);
  assert.deepEqual(a.keep.map((w) => w.tile), ['desk']);
  assert.equal(a.seam.x0, a.seam.x1, 'a vertical seam');
  assert.equal(a.hinge, a.keptFrom.x);
  const b = fold12();
  // 2 → 4: the lower row unfolds below both windows, a horizontal seam across both
  assert.equal(b.side, 'bottom');
  assert.equal(b.seam.y0, b.seam.y1);
  assert.equal(b.seam.x0, b.keptFrom.x);
  assert.equal(b.seam.x1, b.keptFrom.x + b.keptFrom.w);
  assert.deepEqual(b.open.map((w) => w.tile).sort(), ['door', 'window']);
  [a, b].forEach((f) => {
    assert.ok(f.pointerTravel >= UNFOLD.minTravel);
    assert.ok(f.pointerTravel >= f.travel, 'a little resistance: the pointer travels further than the wall');
  });
});

test('folded, the new windows are wholly tucked behind the kept ones; open, every window is in its slot', () => {
  [fold01(), fold12()].forEach((fold) => {
    const closed = unfoldLayout(fold, 0, { bezel: BEZEL });
    fold.open.forEach((win) => assert.equal(visibleArea(closed.rects[win.tile]), 0, `${win.tile} hidden when folded`));
    fold.keep.forEach((win) => {
      const r = closed.rects[win.tile];
      assert.deepEqual([r.x, r.y, r.w, r.h], [win.from.x, win.from.y, win.from.w, win.from.h]);
      // ... and every tucked window really lies inside it
    });
    fold.open.forEach((win) => {
      const r = closed.rects[win.tile];
      const k = fold.keptFrom;
      assert.ok(r.x >= k.x - 1 && r.y >= k.y - 1 && r.x + r.w <= k.x + k.w + 1 && r.y + r.h <= k.y + k.h + 1, `${win.tile} inside the folded wall`);
    });
    const open = unfoldLayout(fold, 1, { bezel: BEZEL });
    [...fold.keep, ...fold.open].forEach((win) => {
      const r = open.rects[win.tile];
      assert.deepEqual([r.x, r.y, r.w, r.h], [win.to.x, win.to.y, win.to.w, win.to.h]);
      assert.equal(r.scale, 1);
      assert.equal(r.clip, null);
    });
    assert.deepEqual(open.pull, fold.pullEnd);
    // the reveal only grows
    let last = -1;
    for (let p = 0; p <= 1.0001; p += 0.05) {
      const lay = unfoldLayout(fold, p, { bezel: BEZEL });
      const area = fold.open.reduce((sum, win) => sum + visibleArea(lay.rects[win.tile]), 0);
      assert.ok(area >= last - 1e-6, `reveal grows at p=${p.toFixed(2)}`);
      last = area;
    }
  });
});

test('the drag follows the pointer 1:1 (with resistance); below the threshold it springs back', () => {
  const fold = fold01();
  const u = createUnfold(fold);
  assert.equal(u.state, 'folded');
  u.grab(fold.pull, 0);
  const half = fold.pointerTravel * 0.5;
  assert.equal(u.move({ x: fold.pull.x - half, y: fold.pull.y }, 400), 0.5);
  // dragging the wrong way never goes below closed
  assert.equal(u.move({ x: fold.pull.x + 500, y: fold.pull.y }, 800), 0);
  u.release();
  const v = createUnfold(fold);
  assert.equal(drag(v, fold, 0.3, 900), 'spring');
  assert.equal(v.state, 'springing');
  const events = run(v);
  assert.deepEqual(events, ['folded']);
  assert.equal(v.progress, 0);
  assert.equal(v.done, false);
});

test('past ~45% a release snaps it open, exactly once', () => {
  const fold = fold12();
  const u = createUnfold(fold);
  assert.equal(drag(u, fold, 0.5, 1200), 'snap');
  const events = run(u);
  assert.deepEqual(events, ['done']);
  assert.equal(u.progress, 1);
  assert.equal(u.done, true);
  assert.equal(u.opened, 1);
  // nothing more happens once it is open
  assert.equal(u.grab(fold.pull, 0), false);
  assert.equal(u.commit(), null);
  assert.deepEqual(run(u, 400), []);
});

test('a quick flick completes it; the same small drag, slowly, does not', () => {
  const fold = fold01();
  const quick = createUnfold(fold);
  assert.equal(drag(quick, fold, 0.2, 60, 6), 'snap');
  const slow = createUnfold(fold);
  assert.equal(drag(slow, fold, 0.2, 2000, 20), 'spring');
  // a twitch is not a flick
  const twitch = createUnfold(fold);
  assert.equal(drag(twitch, fold, 0.03, 20, 2), 'spring');
});

test('take hold again while it springs back: it continues from where it is', () => {
  const fold = fold01();
  const u = createUnfold(fold);
  drag(u, fold, 0.35, 900);
  u.update(60);
  const mid = u.progress;
  assert.ok(mid > 0 && mid < 0.35);
  const at = unfoldLayout(fold, mid).pull;
  u.grab(at, 0);
  assert.ok(Math.abs(u.move(at, 10) - mid) < 1e-9);
});

test('keyboard: hold the arrow to unfold (release past the threshold snaps), or Enter', () => {
  const fold = fold01();
  const u = createUnfold(fold);
  for (let t = 0; t < 300; t += 16) u.holdKey(16);
  assert.ok(u.progress < UNFOLD.threshold);
  assert.equal(u.releaseKey(), 'spring');
  run(u);
  for (let t = 0; t < 700; t += 16) u.holdKey(16);
  assert.ok(u.progress >= UNFOLD.threshold);
  assert.equal(u.releaseKey(), 'snap');
  assert.deepEqual(run(u), ['done']);
  // holding all the way opens it without letting go
  const held = createUnfold(fold);
  for (let t = 0; t < 1400; t += 16) held.holdKey(16);
  assert.deepEqual(run(held), ['done']);
  const enter = createUnfold(fold);
  assert.equal(enter.commit(), 'snap');
  assert.deepEqual(run(enter), ['done']);
});

test('Reduce Motion / dev skip: finish() opens it at once, once', () => {
  const u = createUnfold(fold01());
  assert.equal(u.finish(), 'done');
  assert.equal(u.finish(), null);
  assert.equal(u.opened, 1);
});

test('the pull (and the frame near the fold) can be taken hold of; the far side of the wall cannot', () => {
  const fold = fold01();
  assert.equal(onFold(fold, fold.pull.x - 40, fold.pull.y), 'pull');
  assert.equal(onFold(fold, fold.pull.x + 100, fold.pull.y + 200), 'frame');
  assert.equal(onFold(fold, fold.keptFrom.x + fold.keptFrom.w - 20, fold.pull.y), null);
  assert.equal(onFold(fold, fold.pull.x, fold.keptFrom.y - 200), null);
  const low = fold12();
  assert.equal(onFold(low, low.pull.x, low.pull.y + 50), 'pull');
  assert.equal(onFold(low, low.keptFrom.x + 60, low.hinge - 80), 'frame');
  assert.equal(onFold(low, low.keptFrom.x + 60, low.keptFrom.y + 20), null);
});

test('the idle tease only breathes the fold a little and never opens it', () => {
  let max = 0;
  for (let t = 0; t < 60000; t += 50) {
    max = Math.max(max, peekOffset(t, { teach: true }), peekOffset(t));
  }
  assert.ok(max > 0.03 && max < 0.1);
  assert.ok(max < UNFOLD.threshold / 4);
  assert.equal(peekOffset(500, { teach: true }), 0);
  assert.ok(peekOffset(2050, { teach: true }) > 0, 'the teaching unfold breathes within ~2 s');
});

test('PanelScene: the act waits folded; only a checkpoint-free handoff (or ?from=) starts folded', () => {
  const scene = read('src/chapters/nightService/PanelScene.js');
  assert.match(scene, /if \(this\.foldActive\(\)\) this\.updateFold\(delta\);\s*else this\.model\.update\(dt\);/);
  assert.match(scene, /if \(this\.growth\) \{ this\.startFold\(this\.growth\); return; \}/);
  // the fold needs the act we came from and no `?step=` jump
  assert.match(scene, /if \(!grow \|\| !from \|\| grow\.act !== this\.fromAct \|\| this\.startStep\) return null;/);
  assert.match(scene, /restart\(\{ actId: next, carry, services: this\.services, fromAct: this\.actId \}\)/);
  // a loaded checkpoint carries no `fromAct` (only the dev `?from=` does)
  const main = read('src/nightService-main.js');
  assert.match(main, /const fromAct = ACTS\[params\.get\('from'\)\] \? params\.get\('from'\) : null;/);
  // Reduce Motion: the snap is a crossfade
  const snap = scene.slice(scene.indexOf('  onFoldSnap() {'), scene.indexOf('  completeFold() {'));
  assert.match(snap, /reducedMotionActive\(\)/);
  assert.match(snap, /view\.cover/);
});
