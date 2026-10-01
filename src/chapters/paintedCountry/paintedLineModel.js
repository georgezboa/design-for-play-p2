// Chapter 4 // THE PAINTED COUNTRY — Part III, "paint the line ahead", as rules.
//
// The painted train runs on the same bell as Chapter 2's city (BELL_MS, 4 s).
// On every bell it rolls up to STEP_CELLS forward along the track row of a
// Part I paper grid. Ahead of it the archive has left gaps in the line and
// grey paper barriers across it, some varnished. Butch runs ahead and PAINTS
// the track in and WASHES the barriers away.
//
// Nothing fails. A train that reaches a gap or a barrier stops there and
// blows its whistle until the next bell finds the way clear. At the platform
// Butch washes each borrowed colour off the train and back to the resident
// who lent it; the pencil train that is left still runs.

import { BELL_MS } from '../borrowedLight/timetableModel.js';

export { BELL_MS };

export const LINE = Object.freeze({ cell: 20, cols: 160, rows: 30, trackRow: 22 });
export const LINE_WORLD = Object.freeze({ w: LINE.cols * LINE.cell, h: LINE.rows * LINE.cell });

export const TRAIN = Object.freeze({ length: 14, topRow: 18, startFront: 16, stepCells: 7 });
export const FINISH_FRONT = 136;
export const VARNISH_COATS = 2;

// Gentle stakes (alpha round 1: "the train waits, so there is no pressure").
// A train kept standing for COAT_BELLS bells in a row loses one coat of its
// borrowed paint to the weather, down to MAX_COATS_LOST. Nothing fails: it
// only shows on the train and in how the platform remembers the run.
export const COAT_BELLS = 3;
export const MAX_COATS_LOST = 3;

// Ground and track, in columns [from, to). The gaps between are the archive's.
export const GROUND_SPANS = Object.freeze([
  { from: 0, to: 26 },
  { from: 30, to: 52 },
  { from: 58, to: 78 },
  { from: 82, to: 96 },
  { from: 103, to: LINE.cols },
]);

// Grey paper across the line, rows topRow..trackRow-1. `varnish` marks cells
// under the official record's gloss: one extra wash, so two in all.
export const BARRIERS = Object.freeze([
  { col: 40, cols: 3, varnish: 0 },
  { col: 66, cols: 2, varnish: VARNISH_COATS - 1 },
  { col: 86, cols: 2, varnish: 0 },
  { col: 112, cols: 1, varnish: 0 },
  { col: 113, cols: 2, varnish: VARNISH_COATS - 1 },
]);

// The six parts and the places that lent their colours (chapter4ExpansionModel).
export const TRAIN_COLOURS = Object.freeze(['green', 'red', 'blue', 'yellow', 'orange', 'violet']);

export const key = (c, r) => r * LINE.cols + c;

// What the train's paint looks like after `coatsLost` coats (1 = fresh).
export const coatAlpha = (coatsLost) => 1 - 0.2 * Math.min(MAX_COATS_LOST, Math.max(0, coatsLost));

// The platform remembers the run: the same ending, told slightly differently.
export function platformLines(coatsLost = 0) {
  const kept = coatsLost <= 0;
  return {
    coatLost: coatsLost <= 1 ? 'THE TRAIN STANDS TOO LONG · A COAT OF PAINT RUNS OFF' : 'ANOTHER COAT RUNS OFF WHILE IT WAITS',
    arrival: kept
      ? 'THE PLATFORM. THE COLOURS WERE ONLY BORROWED.'
      : 'THE PLATFORM. THE COLOURS WERE ONLY BORROWED, AND SOME RAN OFF ON THE WAY.',
    departure: kept ? 'A PENCIL TRAIN STILL RUNS.' : 'A PENCIL TRAIN STILL RUNS. THE DAMP KEEPS WHAT IT TOOK.',
  };
}

export function createPaintedLine() {
  const ground = new Set();
  GROUND_SPANS.forEach(({ from, to }) => {
    for (let c = from; c < to; c += 1) for (let r = LINE.trackRow; r < LINE.rows; r += 1) ground.add(key(c, r));
  });
  const blocks = new Set();
  const varnish = new Map();
  BARRIERS.forEach(({ col, cols, varnish: coats }) => {
    for (let c = col; c < col + cols; c += 1) {
      for (let r = TRAIN.topRow; r < LINE.trackRow; r += 1) {
        blocks.add(key(c, r));
        if (coats) varnish.set(key(c, r), coats);
      }
    }
  });

  const state = {
    front: TRAIN.startFront,
    bells: 0,
    waiting: null,
    whistles: 0,
    arrived: false,
    painted: new Set(),
    blocks,
    varnish,
    returned: [],
    standingBells: 0,
    coatsLost: 0,
    complete: false,
    // Kept explicit for QA: there is no way to lose this.
    failed: false,
    events: [],
  };
  const emit = (type, detail = {}) => state.events.push({ type, ...detail });

  const inBounds = (c, r) => c >= 0 && r >= 0 && c < LINE.cols && r < LINE.rows;
  const isGround = (c, r) => ground.has(key(c, r));
  const isPainted = (c, r) => state.painted.has(key(c, r));
  const isBlock = (c, r) => state.blocks.has(key(c, r));
  const varnishAt = (c, r) => state.varnish.get(key(c, r)) ?? 0;
  const isSolid = (c, r) => inBounds(c, r) && (isGround(c, r) || isPainted(c, r) || isBlock(c, r));
  const trackAt = (c) => isGround(c, LINE.trackRow) || isPainted(c, LINE.trackRow);
  const rear = () => state.front - TRAIN.length + 1;
  const underTrain = (c, r) => c >= rear() && c <= state.front && r >= TRAIN.topRow && r <= LINE.trackRow;

  // What stops the train entering column c.
  function obstacleAt(c) {
    if (!trackAt(c)) return 'gap';
    for (let r = TRAIN.topRow; r < LINE.trackRow; r += 1) if (isSolid(c, r)) return 'barrier';
    return null;
  }

  function paintRefusal(c, r) {
    if (!inBounds(c, r)) return 'off-sheet';
    if (isSolid(c, r)) return 'already-solid';
    if (underTrain(c, r)) return 'train-there';
    return null;
  }

  function paint(c, r) {
    const refusal = paintRefusal(c, r);
    if (refusal) {
      emit('paint-refused', { c, r, reason: refusal });
      return false;
    }
    state.painted.add(key(c, r));
    emit('painted', { c, r, track: r === LINE.trackRow });
    return true;
  }

  const canWash = (c, r) => inBounds(c, r) && !underTrain(c, r) && (varnishAt(c, r) > 0 || isPainted(c, r) || isBlock(c, r));

  function wash(c, r) {
    if (!inBounds(c, r)) return false;
    if (underTrain(c, r) && (isPainted(c, r) || isBlock(c, r))) {
      emit('wash-refused', { c, r, reason: 'train-on-it' });
      return false;
    }
    const k = key(c, r);
    const coats = varnishAt(c, r);
    if (coats > 0) {
      if (coats > 1) state.varnish.set(k, coats - 1);
      else state.varnish.delete(k);
      emit('varnish-thinned', { c, r, coatsLeft: coats - 1 });
      return true;
    }
    if (state.painted.delete(k)) {
      emit('unpainted', { c, r });
      return true;
    }
    if (state.blocks.delete(k)) {
      emit('barrier-washed', { c, r });
      return true;
    }
    return false;
  }

  // One bell: roll forward while the way is clear, up to STEP_CELLS.
  function bell() {
    if (state.arrived) return { moved: 0, waiting: null };
    state.bells += 1;
    const from = state.front;
    let reason = null;
    for (let step = 0; step < TRAIN.stepCells; step += 1) {
      if (state.front >= FINISH_FRONT) break;
      reason = obstacleAt(state.front + 1);
      if (reason) break;
      state.front += 1;
    }
    const moved = state.front - from;
    emit('bell', { index: state.bells, moved, from, to: state.front });
    if (state.front >= FINISH_FRONT) {
      state.arrived = true;
      state.waiting = null;
      emit('train-arrived', { bells: state.bells });
    } else if (reason) {
      state.waiting = { at: state.front + 1, reason };
      state.whistles += 1;
      emit('train-waiting', { at: state.front + 1, reason });
    } else {
      state.waiting = null;
    }
    // Standing still at a break the player has not cleared yet.
    if (moved === 0 && state.waiting) {
      state.standingBells += 1;
      if (state.standingBells >= COAT_BELLS && state.coatsLost < MAX_COATS_LOST) {
        state.standingBells = 0;
        state.coatsLost += 1;
        emit('coat-lost', { coatsLost: state.coatsLost, at: state.front });
      }
    } else {
      state.standingBells = 0;
    }
    return { moved, waiting: state.waiting };
  }

  // At the platform: one borrowed colour back to the resident who lent it.
  function returnColour(id) {
    if (!state.arrived || !TRAIN_COLOURS.includes(id) || state.returned.includes(id)) return false;
    state.returned.push(id);
    emit('colour-returned', { id, left: TRAIN_COLOURS.length - state.returned.length });
    if (state.returned.length === TRAIN_COLOURS.length) {
      state.complete = true;
      emit('colours-returned');
    }
    return true;
  }

  // Every obstacle still between the train and the platform, nearest first.
  function obstaclesAhead() {
    const out = [];
    for (let c = state.front + 1; c <= FINISH_FRONT; c += 1) {
      const reason = obstacleAt(c);
      if (reason) out.push({ col: c, reason });
    }
    return out;
  }

  return {
    state,
    inBounds,
    isGround,
    isPainted,
    isBlock,
    isSolid,
    varnishAt,
    trackAt,
    obstacleAt,
    obstaclesAhead,
    underTrain,
    rear,
    paintRefusal,
    canPaint: (c, r) => paintRefusal(c, r) === null,
    canWash,
    paint,
    wash,
    bell,
    returnColour,
    snapshot() {
      return {
        front: state.front,
        rear: rear(),
        bells: state.bells,
        waiting: state.waiting ? { ...state.waiting } : null,
        whistles: state.whistles,
        arrived: state.arrived,
        barriersLeft: state.blocks.size,
        varnishLeft: state.varnish.size,
        painted: state.painted.size,
        returned: [...state.returned],
        coatsLost: state.coatsLost,
        complete: state.complete,
        failed: state.failed,
        obstaclesAhead: obstaclesAhead().length,
      };
    },
    drainEvents() {
      const events = state.events.slice();
      state.events.length = 0;
      return events;
    },
  };
}
