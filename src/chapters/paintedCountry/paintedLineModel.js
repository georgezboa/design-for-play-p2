// Chapter 4 // THE PAINTED COUNTRY — Part III, "paint the line ahead", as rules.
//
// Round 6 (George, G2): "the train runs one stretch per bell" was not fun.
// The painted train no longer waits for a bell. It rolls, continuously, and
// Butch rides its engine with the brush out over the line ahead:
//
//   the train   has weight: it gathers speed slowly (ACCEL) and stops well
//               inside what it can see (BRAKE), short of any break.
//   its pace    is the line's: on Rosa's pencil rails it runs at PENCIL; on
//               rails Butch has just painted (wet gouache) it runs at
//               PAINTED. The share of painted rail in the next few cells
//               sets the pace, so painting the line ahead is what drives it.
//   breaks      the archive's: torn gaps in the paper, rails rubbed out, and
//               grey paper (some varnished) across the line. Paint the track
//               in, paint the rails back, wash the paper off.
//
// Nothing fails. A train that reaches a break it cannot cross eases to a stop
// in front of it, whistling, and rolls on the moment the way is clear. Kept
// standing too long, the weather takes a coat of its borrowed paint (it only
// changes how the platform remembers the run). At the platform Butch washes
// each borrowed colour back to whoever lent it, and the pencil train that is
// left still runs on to the Museum.
//
// Pure: no Phaser. The scene steps it with real time.

export const LINE = Object.freeze({ cell: 20, cols: 300, rows: 30, trackRow: 22 });
export const LINE_WORLD = Object.freeze({ w: LINE.cols * LINE.cell, h: LINE.rows * LINE.cell });

// `startFront` is the column the engine's nose starts in; the train is
// `length` columns long, rows topRow..trackRow.
export const TRAIN = Object.freeze({ length: 14, topRow: 18, startFront: 16 });
export const FINISH_FRONT = 276;
export const VARNISH_COATS = 2;

export const RIDE = Object.freeze({
  pencil: 96, // px/s on Rosa's pencil rails
  painted: 158, // px/s on rails Butch has painted: wet gouache runs quick
  accel: 64, // px/s²: a heavy painted engine gathers speed slowly
  brake: 210, // px/s²: and stops well inside what it can see
  look: 240, // px of line ahead the driver reads
  ease: 150, // px: a break this close begins to slow it
  margin: 6, // px it stops short of a break
  paceCells: 6, // the cells ahead whose paint sets the pace
  rollAfter: 1.4, // s the train stands at the start before it rolls
});

// Standing at a break this long runs one coat of borrowed paint off the
// train, down to MAX_COATS_LOST (alpha round 1: "no pressure at all").
export const COAT_SECONDS = 6;
export const MAX_COATS_LOST = 3;

// Ground, in columns [from, to). The gaps between are the archive's tears.
export const GROUND_SPANS = Object.freeze([
  { from: 0, to: 34 }, // the first gap: three cells (the lesson)
  { from: 37, to: 88 },
  { from: 94, to: 118 }, // six cells
  { from: 121, to: 124 }, // three short gaps in a row: one long stroke
  { from: 127, to: 130 },
  { from: 133, to: 176 },
  { from: 183, to: 232 }, // seven cells: the train has to come close
  { from: 236, to: LINE.cols }, // a short gap with paper straight after it
]);

// Ground whose pencil rails the archive rubbed out: solid paper, no rails.
export const FADED_SPANS = Object.freeze([
  { from: 62, to: 70 },
  { from: 198, to: 210 },
  { from: 252, to: 258 },
]);

// Grey paper across the line, rows topRow..trackRow-1. `varnish` marks cells
// under the official record's gloss: one extra wash, so two in all.
export const BARRIERS = Object.freeze([
  { col: 50, cols: 2, varnish: 0 }, // the wash lesson
  { col: 104, cols: 2, varnish: VARNISH_COATS - 1 },
  { col: 146, cols: 1, varnish: 0 },
  { col: 147, cols: 2, varnish: VARNISH_COATS - 1 },
  { col: 220, cols: 2, varnish: 0 },
  { col: 239, cols: 1, varnish: 0 },
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

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export function createPaintedLine() {
  const C = LINE.cell;
  const ground = new Set();
  GROUND_SPANS.forEach(({ from, to }) => {
    for (let c = from; c < to; c += 1) for (let r = LINE.trackRow; r < LINE.rows; r += 1) ground.add(key(c, r));
  });
  const faded = new Set();
  FADED_SPANS.forEach(({ from, to }) => { for (let c = from; c < to; c += 1) faded.add(c); });
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
    // the engine's nose, in world px (the train is TRAIN.length cells behind it)
    x: (TRAIN.startFront + 1) * C,
    speed: 0,
    pace: 0,
    started: false,
    clock: 0,
    waiting: null,
    whistles: 0,
    standing: 0,
    stops: 0,
    arrived: false,
    painted: new Set(), // paper painted into a gap or the air: solid
    inked: new Set(), // fresh paint over a rail on the ground: no new solid
    blocks,
    varnish,
    returned: [],
    coatsLost: 0,
    distance: 0,
    complete: false,
    // Kept explicit for QA: there is no way to lose this.
    failed: false,
    events: [],
  };
  const emit = (type, detail = {}) => state.events.push({ type, ...detail });

  const finishX = (FINISH_FRONT + 1) * C;
  const inBounds = (c, r) => c >= 0 && r >= 0 && c < LINE.cols && r < LINE.rows;
  const isGround = (c, r) => ground.has(key(c, r));
  const isFaded = (c) => faded.has(c);
  const isPainted = (c, r) => state.painted.has(key(c, r));
  const isInked = (c, r) => state.inked.has(key(c, r));
  const isBlock = (c, r) => state.blocks.has(key(c, r));
  const varnishAt = (c, r) => state.varnish.get(key(c, r)) ?? 0;
  const isSolid = (c, r) => inBounds(c, r) && (isGround(c, r) || isPainted(c, r) || isBlock(c, r));
  // A rail the train can run on: Rosa's pencil, or Butch's paint.
  const trackAt = (c) => (isGround(c, LINE.trackRow) && !isFaded(c)) || isPainted(c, LINE.trackRow) || isInked(c, LINE.trackRow);
  // A rail of wet paint: the quick kind.
  const wetAt = (c) => isPainted(c, LINE.trackRow) || isInked(c, LINE.trackRow);
  const front = () => Math.floor((state.x - 1) / C);
  const rear = () => front() - TRAIN.length + 1;
  const underTrain = (c, r) => c >= rear() && c <= front() && r >= TRAIN.topRow && r <= LINE.trackRow;

  // What stops the train entering column c.
  function obstacleAt(c) {
    if (!trackAt(c)) return isGround(c, LINE.trackRow) ? 'faded' : 'gap';
    for (let r = TRAIN.topRow; r < LINE.trackRow; r += 1) if (isSolid(c, r)) return 'barrier';
    return null;
  }

  // The nearest break ahead of the nose, within the driver's sight.
  function nextBreak() {
    const from = Math.floor(state.x / C);
    const to = Math.min(FINISH_FRONT, Math.floor((state.x + RIDE.look) / C));
    for (let c = from; c <= to; c += 1) {
      const reason = obstacleAt(c);
      if (reason) return { col: c, reason, distance: Math.max(0, c * C - state.x) };
    }
    return null;
  }

  // How much of the line just ahead is wet paint (0..1).
  function paceAhead() {
    const from = Math.floor(state.x / C);
    let wet = 0;
    for (let c = from; c < from + RIDE.paceCells; c += 1) if (wetAt(c)) wet += 1;
    return wet / RIDE.paceCells;
  }

  function paintRefusal(c, r) {
    if (!inBounds(c, r)) return 'off-sheet';
    if (underTrain(c, r)) return 'train-there';
    if (r === LINE.trackRow && isGround(c, r)) return isInked(c, r) ? 'already-solid' : null;
    if (isSolid(c, r)) return 'already-solid';
    return null;
  }

  function paint(c, r) {
    const refusal = paintRefusal(c, r);
    if (refusal) {
      emit('paint-refused', { c, r, reason: refusal });
      return false;
    }
    if (r === LINE.trackRow && isGround(c, r)) {
      state.inked.add(key(c, r));
      emit('inked', { c, r, restored: isFaded(c) });
      return true;
    }
    state.painted.add(key(c, r));
    emit('painted', { c, r, track: r === LINE.trackRow });
    return true;
  }

  const canWash = (c, r) => inBounds(c, r) && !underTrain(c, r)
    && (varnishAt(c, r) > 0 || isPainted(c, r) || isInked(c, r) || isBlock(c, r));

  function wash(c, r) {
    if (!inBounds(c, r)) return false;
    if (underTrain(c, r) && (isPainted(c, r) || isInked(c, r) || isBlock(c, r))) {
      emit('wash-refused', { c, r, reason: 'train-on-it' });
      return false;
    }
    const k = key(c, r);
    // Paper across the line comes off a whole column at a time: one stroke
    // across a barrier clears it (alpha round 4: testers' strokes left single
    // cells behind the engine and Butch, and the train kept waiting).
    if (isBlock(c, r) && r >= TRAIN.topRow && r < LINE.trackRow) {
      const column = [];
      for (let row = TRAIN.topRow; row < LINE.trackRow; row += 1) if (isBlock(c, row)) column.push(row);
      const varnished = column.filter((row) => varnishAt(c, row) > 0);
      if (varnished.length) {
        varnished.forEach((row) => {
          const left = varnishAt(c, row) - 1;
          if (left > 0) state.varnish.set(key(c, row), left);
          else state.varnish.delete(key(c, row));
          emit('varnish-thinned', { c, r: row, coatsLeft: left });
        });
        return true;
      }
      column.forEach((row) => {
        state.blocks.delete(key(c, row));
        emit('barrier-washed', { c, r: row });
      });
      return true;
    }
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
    if (state.inked.delete(k)) {
      emit('unpainted', { c, r, ink: true });
      return true;
    }
    if (state.blocks.delete(k)) {
      emit('barrier-washed', { c, r });
      return true;
    }
    return false;
  }

  // One slice of real time.
  function step(dt) {
    if (state.arrived || dt <= 0) return state;
    state.clock += dt;
    if (!state.started) {
      if (state.clock < RIDE.rollAfter) return state;
      state.started = true;
      emit('train-rolling', { first: true });
      return state;
    }
    const brk = nextBreak();
    const room = brk ? Math.max(0, brk.distance - RIDE.margin) : Infinity;
    state.pace = paceAhead();
    const cruise = RIDE.pencil + (RIDE.painted - RIDE.pencil) * state.pace;
    let target = cruise;
    if (brk) target = Math.min(cruise * clamp(room / RIDE.ease, 0, 1), Math.sqrt(2 * RIDE.brake * room));
    // coming into the platform: a gentle stop on its mark
    const toFinish = Math.max(0, finishX - state.x);
    target = Math.min(target, Math.max(14, Math.sqrt(2 * RIDE.brake * 0.45 * toFinish)));
    const dv = clamp(target - state.speed, -RIDE.brake * dt, RIDE.accel * dt);
    state.speed = Math.max(0, state.speed + dv);
    let move = state.speed * dt;
    // never into a break, whatever the frame time
    if (move > room) {
      move = room;
      state.speed = Math.min(state.speed, room / dt);
    }
    if (move > toFinish) move = toFinish;
    state.x += move;
    state.distance += move;

    const stopped = brk && room - move < 1.5 && state.speed < 18;
    if (stopped) {
      if (!state.waiting || state.waiting.at !== brk.col) {
        state.waiting = { at: brk.col, reason: brk.reason };
        state.whistles += 1;
        state.stops += 1;
        state.standing = 0;
        emit('train-waiting', { at: brk.col, reason: brk.reason });
      }
      state.speed = Math.min(state.speed, 6);
      state.standing += dt;
      if (state.standing >= COAT_SECONDS) {
        state.standing = 0;
        if (state.coatsLost < MAX_COATS_LOST) {
          state.coatsLost += 1;
          emit('coat-lost', { coatsLost: state.coatsLost, at: front() });
        }
      }
    } else if (state.waiting && (!brk || brk.col !== state.waiting.at || room > 4)) {
      emit('train-rolling', { from: state.waiting.at, reason: state.waiting.reason });
      state.waiting = null;
      state.standing = 0;
    }
    if (state.x >= finishX - 0.5) {
      state.x = finishX;
      state.speed = 0;
      state.arrived = true;
      state.waiting = null;
      emit('train-arrived', { seconds: state.clock });
    }
    return state;
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
    for (let c = front() + 1; c <= FINISH_FRONT; c += 1) {
      const reason = obstacleAt(c);
      if (reason) out.push({ col: c, reason });
    }
    return out;
  }

  // Dev routes: put the nose at a column (clamped short of what blocks it).
  function placeAt(col) {
    state.x = (Math.min(col, FINISH_FRONT) + 1) * C;
    state.speed = 0;
    state.started = true;
  }

  return {
    state,
    finishX,
    inBounds,
    isGround,
    isFaded,
    isPainted,
    isInked,
    isBlock,
    isSolid,
    varnishAt,
    trackAt,
    wetAt,
    obstacleAt,
    obstaclesAhead,
    nextBreak,
    paceAhead,
    underTrain,
    front,
    rear,
    paintRefusal,
    canPaint: (c, r) => paintRefusal(c, r) === null,
    canWash,
    paint,
    wash,
    step,
    placeAt,
    returnColour,
    snapshot() {
      return {
        x: Math.round(state.x),
        front: front(),
        rear: rear(),
        speed: Math.round(state.speed),
        pace: Math.round(state.pace * 100) / 100,
        started: state.started,
        seconds: Math.round(state.clock * 10) / 10,
        waiting: state.waiting ? { ...state.waiting } : null,
        whistles: state.whistles,
        stops: state.stops,
        arrived: state.arrived,
        barriersLeft: state.blocks.size,
        varnishLeft: state.varnish.size,
        painted: state.painted.size,
        inked: state.inked.size,
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
