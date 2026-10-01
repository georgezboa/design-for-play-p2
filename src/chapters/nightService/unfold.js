// Chapter 1 // NIGHT SERVICE — the player unfolds the carriage wall (pure logic).
//
// Between Acts 0 → 0.5 → 1 the wall no longer opens by itself (owner note,
// round 3). The next act starts *folded*: its kept windows sit where the last
// act left them, and each new window is tucked behind them. A line of
// lamplight leaks out of the fold and a brass pull with a paper tag sits on
// the edge the wall will open towards. The player presses the pull (or the
// frame near the fold) and drags: the kept windows slide to their new slots
// and the new ones slide out from behind them, 1:1 with the pointer and a
// little resistance. Past THRESHOLD a release completes it with a snap; below
// it the wall springs back; a quick flick also completes it.
//
// This file is geometry and a small state machine only (no Phaser), so node
// tests can drive it. PanelScene draws it (`startFold`).

export const UNFOLD = Object.freeze({
  /** Release past this much of the travel and the wall snaps open. */
  threshold: 0.45,
  /** Progress per pixel of pointer travel, relative to 1:1 (slight resistance). */
  resistance: 0.88,
  /** A release this fast (px/ms, in the opening direction) is a flick. */
  flickSpeed: 0.7,
  /** ... once the wall has moved at least this much. */
  flickMin: 0.08,
  /** Spring back from fully open (scaled by how far it was). */
  springMs: 360,
  /** Snap open from closed (scaled by how far is left; at least snapMinMs). */
  snapMs: 420,
  snapMinMs: 140,
  /** Holding the arrow key: progress per millisecond. */
  keyRate: 1 / 1100,
  /** The pointer never needs less travel than this (screen px) to open fully. */
  minTravel: 220,
  /** Velocity window for the flick (ms). */
  flickWindowMs: 90,
});

const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const easeOut = (t) => 1 - (1 - t) ** 3;

function bounds(rects) {
  const x0 = Math.min(...rects.map((r) => r.x));
  const y0 = Math.min(...rects.map((r) => r.y));
  const x1 = Math.max(...rects.map((r) => r.x + r.w));
  const y1 = Math.max(...rects.map((r) => r.y + r.h));
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

const edgeOf = (b, side) => (side === 'left' ? b.x : side === 'right' ? b.x + b.w : side === 'top' ? b.y : b.y + b.h);

/**
 * The fold for a growth plan (`planGrowth` in panelModel.js): which way the
 * wall opens, the fold line, where the pull sits and how far it travels.
 * Returns null when the plan has nothing to unfold (no kept or no new window).
 *
 * @returns {null | {
 *   side: 'left'|'right'|'top'|'bottom', axis: 'x'|'y', sign: 1|-1,
 *   hinge: number, end: number, travel: number, pointerTravel: number,
 *   seam: {x0:number,y0:number,x1:number,y1:number},
 *   pull: {x:number,y:number}, pullEnd: {x:number,y:number},
 *   keep: Array, open: Array, keptFrom: object, keptTo: object, openTo: object,
 * }}
 */
export function planUnfold(plan, { minTravel = UNFOLD.minTravel } = {}) {
  const keep = plan?.windows?.filter((w) => w.kind === 'keep') ?? [];
  const open = plan?.windows?.filter((w) => w.kind === 'open') ?? [];
  if (!keep.length || !open.length) return null;
  const keptFrom = bounds(keep.map((w) => w.from));
  const keptTo = bounds(keep.map((w) => w.to));
  const openTo = bounds(open.map((w) => w.to));
  // the new windows open on the side of the kept ones they end up on
  const dx = openTo.x + openTo.w / 2 - (keptTo.x + keptTo.w / 2);
  const dy = openTo.y + openTo.h / 2 - (keptTo.y + keptTo.h / 2);
  const axis = Math.abs(dx) >= Math.abs(dy) ? 'x' : 'y';
  const sign = (axis === 'x' ? dx : dy) < 0 ? -1 : 1;
  const side = axis === 'x' ? (sign < 0 ? 'left' : 'right') : (sign < 0 ? 'top' : 'bottom');
  // the fold: the kept windows' edge on that side, where the new ones are tucked
  const hinge = edgeOf(keptFrom, side);
  // ... and where the free edge of the new windows ends up
  const end = edgeOf(openTo, side);
  const travel = Math.max(1, Math.abs(end - hinge));
  const seam = axis === 'x'
    ? { x0: hinge, y0: keptFrom.y, x1: hinge, y1: keptFrom.y + keptFrom.h }
    : { x0: keptFrom.x, y0: hinge, x1: keptFrom.x + keptFrom.w, y1: hinge };
  const mid = axis === 'x' ? keptFrom.y + keptFrom.h / 2 : keptFrom.x + keptFrom.w / 2;
  const pull = axis === 'x' ? { x: hinge, y: mid } : { x: mid, y: hinge };
  const pullEnd = axis === 'x' ? { x: end, y: mid } : { x: mid, y: end };
  return {
    side, axis, sign, hinge, end, travel,
    pointerTravel: Math.max(minTravel, travel / UNFOLD.resistance),
    seam, pull, pullEnd, keep, open, keptFrom, keptTo, openTo,
  };
}

/**
 * Where every window is at progress `p` (0 folded … 1 open).
 * Kept windows move (and shrink) from their old slot to the new one; new
 * windows slide out from behind them, rigid, their free edge on the pull.
 * `clip` is the screen region of a new window not yet hidden behind the kept
 * ones (null once it is clear of them).
 * @returns {{ rects: Object<string, {x,y,w,h,scale,clip}>, fold: number, pull: {x,y}, kept: {x,y,w,h} }}
 */
export function unfoldLayout(fold, p, { bezel = 13 } = {}) {
  const t = clamp(p, 0, 1.04);
  const rects = {};
  const kept = fold.keep.map((win) => {
    const r = {
      x: lerp(win.from.x, win.to.x, t),
      y: lerp(win.from.y, win.to.y, t),
      w: lerp(win.from.w, win.to.w, t),
      h: lerp(win.from.h, win.to.h, t),
    };
    // a window shown larger in the smaller wall shrinks as it slides
    r.scale = lerp(win.from.w / win.to.w, 1, t);
    r.clip = null;
    rects[win.tile] = r;
    return r;
  });
  const keptNow = bounds(kept);
  // the live fold line: the kept windows' edge on the opening side (plus their bezel)
  const foldEdge = edgeOf(keptNow, fold.side) + fold.sign * bezel;
  const shift = (fold.hinge - fold.end) * (1 - t);
  fold.open.forEach((win) => {
    const r = { ...win.to, scale: 1 };
    if (fold.axis === 'x') r.x += shift;
    else r.y += shift;
    const x1 = r.x + r.w;
    const y1 = r.y + r.h;
    let clip = null;
    if (fold.side === 'left' && x1 + bezel > foldEdge) clip = { x0: -1e6, y0: -1e6, x1: foldEdge, y1: 1e6 };
    if (fold.side === 'right' && r.x - bezel < foldEdge) clip = { x0: foldEdge, y0: -1e6, x1: 1e6, y1: 1e6 };
    if (fold.side === 'top' && y1 + bezel > foldEdge) clip = { x0: -1e6, y0: -1e6, x1: 1e6, y1: foldEdge };
    if (fold.side === 'bottom' && r.y - bezel < foldEdge) clip = { x0: -1e6, y0: foldEdge, x1: 1e6, y1: 1e6 };
    r.clip = clip;
    rects[win.tile] = r;
  });
  const along = lerp(fold.hinge, fold.end, t);
  const pull = fold.axis === 'x' ? { x: along, y: fold.pull.y } : { x: fold.pull.x, y: along };
  return { rects, fold: foldEdge, pull, kept: keptNow };
}

/**
 * Is a screen point somewhere a hand can take hold of the fold? On the pull
 * (generously), or on the kept windows within `band` px of the fold line.
 */
export function onFold(fold, x, y, { progress = 0, pullRadius = 96, band = 150 } = {}) {
  const { pull } = unfoldLayout(fold, progress);
  if (Math.hypot(x - pull.x, y - pull.y) <= pullRadius) return 'pull';
  const k = fold.keptFrom;
  const live = edgeOf(k, fold.side) + (fold.axis === 'x' ? pull.x - fold.hinge : pull.y - fold.hinge);
  if (fold.axis === 'x') {
    if (y < k.y || y > k.y + k.h) return null;
    return Math.abs(x - live) <= band ? 'frame' : null;
  }
  if (x < k.x || x > k.x + k.w) return null;
  return Math.abs(y - live) <= band ? 'frame' : null;
}

/**
 * The drag / spring / snap state machine for one unfold.
 *   folded → (grab) dragging → (release) snapping → done
 *                                       ↘ springing → folded
 * Keyboard: `holdKey(dt)` while the arrow is down, `releaseKey()` on key up,
 * `commit()` (Enter) snaps it open from wherever it is. `cancel()` lets go
 * of a drag whose release never arrived (pause, blur).
 */
export function createUnfold(fold, options = {}) {
  const o = { ...UNFOLD, ...options };
  let state = 'folded';
  let progress = 0;
  let grabAt = null;
  let grabProgress = 0;
  let samples = [];
  let anim = null; // { from, to, ms, t }
  let opened = 0; // completions (a guard for callers: exactly one 'done')
  const along = (pos) => (fold.axis === 'x' ? pos.x : pos.y) * fold.sign;
  const animate = (to, ms) => { anim = { from: progress, to, ms: Math.max(1, ms), t: 0 }; };
  const snap = () => {
    state = 'snapping';
    animate(1, Math.max(o.snapMinMs, o.snapMs * (1 - progress)));
    return 'snap';
  };
  const spring = () => {
    if (progress <= 0) { state = 'folded'; progress = 0; return 'spring'; }
    state = 'springing';
    animate(0, Math.max(120, o.springMs * progress));
    return 'spring';
  };
  return {
    get state() { return state; },
    get progress() { return progress; },
    get done() { return state === 'done'; },
    get busy() { return state === 'dragging' || state === 'snapping'; },
    get opened() { return opened; },
    /** Take hold (pointer down on the pull or the frame). */
    grab(pos, timeMs = 0) {
      if (state === 'done' || state === 'snapping') return false;
      state = 'dragging';
      anim = null;
      grabAt = along(pos);
      grabProgress = progress;
      samples = [{ a: grabAt, t: timeMs }];
      return true;
    },
    /** The pointer moved: progress follows it 1:1 (with resistance). */
    move(pos, timeMs = 0) {
      if (state !== 'dragging') return progress;
      const a = along(pos);
      progress = clamp(grabProgress + ((a - grabAt) / fold.pointerTravel), 0, 1);
      samples.push({ a, t: timeMs });
      samples = samples.filter((s) => timeMs - s.t <= o.flickWindowMs);
      return progress;
    },
    /** Speed along the opening direction over the last few samples (px/ms). */
    velocity() {
      if (samples.length < 2) return 0;
      const first = samples[0];
      const last = samples[samples.length - 1];
      const dt = last.t - first.t;
      return dt > 0 ? (last.a - first.a) / dt : 0;
    },
    /** Let go: past the threshold (or flicked) it snaps open, else it springs back. */
    release() {
      if (state !== 'dragging') return null;
      const flick = this.velocity() >= o.flickSpeed && progress >= o.flickMin;
      return progress >= o.threshold || flick ? snap() : spring();
    },
    /**
     * The hand went away without a release we saw (the game paused mid-drag,
     * the window lost focus, the button came up outside the page): let go
     * where it is. Past the threshold it still opens; a flick never counts.
     * Nothing to do (null) unless a drag or a held key is in progress.
     */
    cancel() {
      if (state !== 'dragging') return null;
      samples = [];
      return progress >= o.threshold ? snap() : spring();
    },
    /** Arrow held in the opening direction. */
    holdKey(dt) {
      if (state === 'done' || state === 'snapping') return progress;
      state = 'dragging';
      anim = null;
      samples = [];
      progress = clamp(progress + dt * o.keyRate, 0, 1);
      if (progress >= 1) snap();
      return progress;
    },
    releaseKey() {
      if (state !== 'dragging') return null;
      return progress >= o.threshold ? snap() : spring();
    },
    /** Enter: open it now. */
    commit() {
      if (state === 'done' || state === 'snapping') return null;
      return snap();
    },
    /** Advance the snap / spring. Returns 'done' the frame the wall is open. */
    update(dt) {
      if (!anim) return null;
      anim.t = Math.min(anim.ms, anim.t + dt);
      const k = easeOut(anim.t / anim.ms);
      progress = lerp(anim.from, anim.to, k);
      if (anim.t < anim.ms) return null;
      progress = anim.to;
      anim = null;
      if (state === 'snapping') { state = 'done'; opened += 1; return 'done'; }
      state = 'folded';
      return 'folded';
    },
    /** Jump straight to the end (reduced-motion snap, dev skips). */
    finish() {
      if (state === 'done') return null;
      anim = null;
      progress = 1;
      state = 'done';
      opened += 1;
      return 'done';
    },
  };
}

/**
 * The wordless tease while nobody touches it: the fold breathes open a little
 * and settles, so the wall looks like it wants to open. The first unfold of
 * the chapter (the one that teaches it) breathes sooner and wider.
 * @returns {number} extra progress to show (0 most of the time)
 */
export function peekOffset(idleMs, { teach = false, reduce = false } = {}) {
  const period = teach ? 3400 : 7000;
  const start = teach ? 1600 : 5000;
  if (idleMs < start) return 0;
  const t = (idleMs - start) % period;
  const ms = 900;
  if (t > ms) return 0;
  const amp = (teach ? 0.07 : 0.04) * (reduce ? 0.5 : 1);
  return Math.sin((t / ms) * Math.PI) * amp;
}
