// Chapter 1 fixes from the round-3 blind playtest (alpha R3 · R1–R5).
import test from 'node:test';
import assert from 'node:assert/strict';
import { ACTS, startCarry } from '../../src/chapters/nightService/acts/index.js';
import { ACT2 } from '../../src/chapters/nightService/acts/act2.js';
import { ACT3, SAFE_FAR, SAFE_NEAR, TRAIN_LENGTH, TRAIN_SCALE } from '../../src/chapters/nightService/acts/act3.js';
import { GAP_SPAN, HEDGE, PLATFORM_DY, RAIL_AT } from '../../src/chapters/nightService/art/act3Art.js';
import { FRAME_TAG_SEEN, frameTagFor, waitingWalkers } from '../../src/chapters/nightService/hints.js';
import { createPanelModel, layoutGrid } from '../../src/chapters/nightService/panelModel.js';
import { UNFOLD, createUnfold, planUnfold } from '../../src/chapters/nightService/unfold.js';
import { planGrowth } from '../../src/chapters/nightService/panelModel.js';
import { settle } from './helpers.mjs';

const TARGET = ['city', 'hawthorn', 'orchard', 'carriage', 'gap', 'platform'];

function arrange(model, target = TARGET) {
  for (let i = 0; i < target.length; i += 1) {
    if (model.state.slots[i] !== target[i]) model.swap(i, model.state.slots.indexOf(target[i]));
    settle(model);
  }
}

function lensAt(model, tile, u, v) {
  const r = model.slotRect(tile);
  model.moveLens(r.x + r.w * u, r.y + r.h * v);
}

// ---------------------------------------------------------------------------
// R1 · the frame lift is discoverable

test('R1: the first liftable frame wears HOLD · LIFT THE FRAME until a frame is lifted', () => {
  const model = createPanelModel(ACT2, { carry: startCarry('act2'), step: 'arrive' });
  settle(model);
  const seen = new Set();
  const tag = frameTagFor(model, seen);
  assert.ok(tag, 'the arrive step shows the tag');
  assert.equal(tag.tile, 'window');
  assert.equal(tag.frame, 'windowFrame');
  // it hangs on the top bar of the brass, inside the window
  assert.ok(tag.u > 0 && tag.u < 0.3 && tag.v > 0 && tag.v < 0.15, JSON.stringify(tag));
  // once any frame has been lifted it retires for the chapter
  seen.add(FRAME_TAG_SEEN);
  assert.equal(frameTagFor(model, seen), null);
  // and it never shows while the frame cannot be lifted (earlier steps)
  const early = createPanelModel(ACT2, { carry: startCarry('act2') });
  assert.equal(frameTagFor(early, new Set()), null);
});

test('R1: in Act 3 the tag hangs under the city window (when Act 2 did not retire it)', () => {
  const model = createPanelModel(ACT3, { carry: startCarry('act3') });
  const tag = frameTagFor(model, new Set());
  assert.equal(tag?.tile, 'city');
  assert.equal(tag.frame, 'cityWindow');
  assert.ok(tag.v > 0.56, 'below the sill, clear of the glass');
});

test('R1: once its job is done the frame rests, so a drag on the window moves the window', () => {
  // Act 2: after the arrival the brass frame no longer lifts
  const two = createPanelModel(ACT2, { carry: startCarry('act2'), step: 'firstWeight' });
  settle(two);
  assert.equal(two.canLiftFrame('windowFrame'), false);
  assert.equal(two.frameGripAt('window', 0.02, 0.5), null, 'the brass band is no longer a grip');
  assert.ok(two.canDrag('window'));
  // Act 3: the city window lifts at the start, and rests once the windows met
  const three = createPanelModel(ACT3, { carry: startCarry('act3') });
  assert.ok(three.canLiftFrame('cityWindow'));
  assert.equal(three.frameGripAt('city', 0.6, 0.3), 'cityWindow');
  assert.ok(three.liftFrame('cityWindow'));
  assert.ok(three.dropFrame('orchard'));
  settle(three);
  assert.equal(three.textState().step, 'hedge');
  assert.equal(three.canLiftFrame('cityWindow'), false);
  assert.equal(three.frameGripAt('city', 0.6, 0.3), null, 'the room drags from anywhere now');
  assert.ok(three.canDrag('city'));
  // a dev jump past the windows step lands in the same state
  const jumped = createPanelModel(ACT3, { carry: startCarry('act3'), step: 'hedge' });
  assert.equal(jumped.canLiftFrame('cityWindow'), false);
});

// ---------------------------------------------------------------------------
// R2 · a waiting walker is cued

test('R2: Mara waiting at the hedge, then at the close-up house: the model says why', () => {
  const model = createPanelModel(ACT3, { carry: startCarry('act3'), step: 'hedge' });
  arrange(model, ['city', 'hawthorn', 'orchard', 'gap', 'platform', 'carriage']);
  const mara = model.state.actors.mara;
  assert.equal(mara.tile, 'hawthorn');
  let wait = model.waitingFor('mara');
  assert.equal(wait?.reason, 'requires', 'the hedge: the lens is the way through');
  assert.equal(wait.to, null);
  assert.equal(wait.zoomOut, null);
  lensAt(model, 'hawthorn', HEDGE.lens[0], HEDGE.lens[1]);
  settle(model);
  wait = model.waitingFor('mara');
  assert.equal(wait?.reason, 'link', 'she stands at the edge: the close-up house has no lane');
  assert.equal(wait.to, 'orchard');
  assert.equal(wait.zoomOut, 'orchard', 'one step back out of the orchard is the way on');
  const cues = waitingWalkers(model);
  assert.deepEqual(cues.map((c) => [c.actor, c.zoomOut]), [['mara', 'orchard']]);
  model.zoomOut('orchard');
  settle(model);
  assert.equal(mara.tile, 'orchard');
  assert.notEqual(model.waitingFor('mara')?.zoomOut, 'orchard');
});

test('R2: walkers on the move, and trains, get no waiting cue', () => {
  const model = createPanelModel(ACT3, { carry: startCarry('act3'), step: 'bridge' });
  arrange(model);
  settle(model);
  assert.equal(model.waitingFor('mara'), null, 'she has arrived at the stair');
  // the train waits on the abutment for the lens: the lens and seams cue it
  lensAt(model, 'gap', 0.5, RAIL_AT);
  for (let i = 0; i < 400 && !(model.state.actors.train.tile === 'gap' && model.state.actors.train.x > 0.3); i += 1) model.update(50);
  model.moveLens(300, 300);
  for (let i = 0; i < 40; i += 1) model.update(50);
  assert.ok(model.state.actors.train.blocked);
  assert.ok(model.waitingFor('train'));
  assert.deepEqual(waitingWalkers(model), []);
});

// ---------------------------------------------------------------------------
// R3 · a fold drag never outlives its release

test('R3: cancel lets go of a drag whose release never came (pause, blur)', () => {
  const plan = planGrowth(ACTS.act0, ACTS.act05);
  const fold = planUnfold(plan);
  const sign = fold.sign;
  const along = (d) => (fold.axis === 'x' ? { x: fold.pull.x + sign * d, y: fold.pull.y } : { x: fold.pull.x, y: fold.pull.y + sign * d });
  // part way: it springs back and follows nothing
  const u = createUnfold(fold);
  assert.ok(u.grab(along(0), 0));
  u.move(along(fold.pointerTravel * 0.2), 100);
  assert.equal(u.cancel(), 'spring');
  for (let i = 0; i < 40; i += 1) u.update(50);
  assert.equal(u.state, 'folded');
  assert.equal(u.progress, 0);
  u.move(along(fold.pointerTravel * 0.9), 2000);
  assert.equal(u.progress, 0, 'moving the pointer afterwards drags nothing');
  // a fast flick that was never released does not count as a flick
  const flick = createUnfold(fold);
  flick.grab(along(0), 0);
  flick.move(along(fold.pointerTravel * (UNFOLD.flickMin + 0.05)), 40);
  assert.equal(flick.cancel(), 'spring');
  // past the threshold it still opens
  const far = createUnfold(fold);
  far.grab(along(0), 0);
  far.move(along(fold.pointerTravel * 0.7), 500);
  assert.equal(far.cancel(), 'snap');
  for (let i = 0; i < 40; i += 1) far.update(50);
  assert.ok(far.done);
  // nothing held: nothing to cancel
  assert.equal(createUnfold(fold).cancel(), null);
});

// ---------------------------------------------------------------------------
// R4 · the lens stays on the board

test('R4: the lens centre is clamped to the board of windows (never on the bezel or the caption bar)', () => {
  for (const act of [ACTS.act2, ACTS.act3]) {
    const model = createPanelModel(act, { carry: startCarry(act.id) });
    if (!model.state.lens.enabled) {
      model.state.lens.enabled = true;
    }
    const b = model.lensBounds();
    const L = model.layout;
    assert.deepEqual(b, { x0: L.x, y0: L.y, x1: L.x + L.w, y1: L.y + L.h });
    [[-500, -500], [5000, 5000], [960, 1070], [5, 540]].forEach(([x, y]) => {
      model.moveLens(x, y);
      const { x: lx, y: ly } = model.state.lens;
      assert.ok(lx >= b.x0 && lx <= b.x1 && ly >= b.y0 && ly <= b.y1, `${act.id}: (${x}, ${y}) → (${lx}, ${ly})`);
    });
    // the caption bar (bottom of the 1080 canvas) lies below the board
    assert.ok(b.y1 < 1080 - 124, `${act.id}: the board ends above the caption bar`);
  }
});

// ---------------------------------------------------------------------------
// R5 · the finale reads at a glance

test('R5: the viaduct stands higher and the bottom row still lines up at the rail', () => {
  assert.ok(RAIL_AT <= 0.8, 'raised from 0.85');
  assert.ok(Math.abs(PLATFORM_DY - (RAIL_AT - 0.85)) < 1e-9);
  const rails = [];
  ['carriage', 'gap', 'platform'].forEach((tile) => {
    Object.values(ACT3.tiles[tile].states.default.edges).flat().filter((e) => e.type === 'rail').forEach((e) => rails.push(e.at));
  });
  assert.ok(rails.length >= 4);
  rails.forEach((at) => assert.equal(at, RAIL_AT));
});

test('R5: our train is larger, and where it waits its whole length is on good track', () => {
  assert.ok(TRAIN_SCALE >= 1.3);
  const { tileW } = layoutGrid(ACT3.grid);
  assert.ok(Math.abs(TRAIN_LENGTH - (150 * TRAIN_SCALE) / tileW) < 1e-9, 'TRAIN_LENGTH matches the 3×2 tile width');
  assert.equal(ACT3.actors.train.scale, TRAIN_SCALE);
  const half = TRAIN_LENGTH / 2;
  // rails end 0.02 short of the deck's broken ends
  assert.ok(SAFE_NEAR + half <= GAP_SPAN[0] - 0.02 + 1e-9, `near: ${SAFE_NEAR} + ${half}`);
  assert.ok(SAFE_FAR - half >= GAP_SPAN[1] + 0.02 - 1e-9, `far: ${SAFE_FAR} - ${half}`);
  assert.ok(SAFE_NEAR - half > -0.05, 'and it is still (mostly) in the gap window');
});

test('R5: the whole act still plays through with the raised rail and the larger train', () => {
  const model = createPanelModel(ACT3, { carry: startCarry('act3'), step: 'bridge' });
  arrange(model);
  lensAt(model, 'gap', 0.5, RAIL_AT);
  settle(model, { maxMs: 120000 });
  assert.equal(model.state.ended?.kind, 'endChapter');
  assert.ok(model.hasFlag('caseOnBench'));
  const butch = model.state.actors.butch;
  assert.ok(Math.abs(butch.y - (0.8 + PLATFORM_DY)) < 1e-9, 'Butch walks on the raised platform');
});
