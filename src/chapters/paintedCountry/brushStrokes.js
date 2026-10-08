// Chapter 4 // THE PAINTED COUNTRY — painted cells, remembered as strokes.
//
// Feedback round 6, item 13: what the brush lays down read as laid tiles
// (hard-edged squares; a diagonal drag became a staircase). The collision
// stays on the 20 px grid, so the standing surface is exactly as stable and
// predictable as before; this module only remembers which cells one stroke
// made, and in what order, so the display layer (art/strokeArt.js,
// strokeLayer.js) can draw them as one continuous stroke of gouache.
//
// Pure: no Phaser, no canvas.
//
//   book.begin()          a press of the brush starts a stroke
//   book.add(c, r)        a cell that stroke painted
//   book.remove(c, r)     a cell washed off (from whichever stroke made it)
//   book.end()            the press is over
//   book.adopt(cells)     cells painted with no stroke on record (a resume,
//                         a QA route): grouped into row runs
//   book.runs()           every stroke, split into runs of touching cells in
//                         the order they were painted
//
// A run is what gets drawn as one stroke. Consecutive cells in a run are
// 8-neighbours (the scenes interpolate every drag, so a drag never skips a
// cell); a stroke that jumps (a refused cell, a stroke dragged back over its
// own paint and on somewhere new) starts a new run, and so does a very long
// drag, every MAX_RUN cells (the brush is reloaded).

// The longest run drawn as one stroke before the brush is reloaded.
export const MAX_RUN = 24;

export function createStrokeBook({ cols }) {
  const strokes = new Map(); // id -> { id, cells: [key] }
  const owner = new Map(); // cell key -> stroke id
  let nextId = 1;
  let current = null;
  let version = 0;

  const keyOf = (c, r) => r * cols + c;
  const colOf = (k) => k % cols;
  const rowOf = (k) => Math.floor(k / cols);

  function begin() {
    if (current && !current.cells.length) strokes.delete(current.id);
    current = { id: nextId, cells: [] };
    nextId += 1;
    strokes.set(current.id, current);
    return current.id;
  }

  function end() {
    if (current && !current.cells.length) strokes.delete(current.id);
    current = null;
  }

  function add(c, r) {
    const k = keyOf(c, r);
    if (owner.has(k)) return false;
    if (!current) begin();
    current.cells.push(k);
    owner.set(k, current.id);
    version += 1;
    return true;
  }

  function remove(c, r) {
    const k = keyOf(c, r);
    const id = owner.get(k);
    if (id == null) return false;
    owner.delete(k);
    const stroke = strokes.get(id);
    if (stroke) {
      stroke.cells = stroke.cells.filter((cell) => cell !== k);
      if (!stroke.cells.length && stroke !== current) strokes.delete(id);
    }
    version += 1;
    return true;
  }

  // Cells with no stroke on record, laid as the rows a hand would have
  // painted them in: left to right, one run per unbroken row.
  function adopt(keys) {
    const loose = [...keys].filter((k) => !owner.has(k)).sort((a, b) => a - b);
    let run = null;
    loose.forEach((k) => {
      const prev = run?.cells[run.cells.length - 1];
      if (!run || prev !== k - 1 || rowOf(prev) !== rowOf(k)) {
        run = { id: nextId, cells: [] };
        nextId += 1;
        strokes.set(run.id, run);
      }
      run.cells.push(k);
      owner.set(k, run.id);
    });
    if (loose.length) version += 1;
    return loose.length;
  }

  function clear() {
    strokes.clear();
    owner.clear();
    current = null;
    version += 1;
  }

  const touching = (a, b) => Math.abs(colOf(a) - colOf(b)) <= 1 && Math.abs(rowOf(a) - rowOf(b)) <= 1;

  function runs() {
    const out = [];
    strokes.forEach((stroke) => {
      let run = null;
      let part = 0;
      stroke.cells.forEach((k) => {
        const prev = run?.keys[run.keys.length - 1];
        // a long drag reloads the brush every MAX_RUN cells: a new stroke
        // starts, the way a painter's would (and only the newest is redrawn)
        if (!run || !touching(prev, k) || run.keys.length >= MAX_RUN) {
          run = { id: `${stroke.id}.${part}`, stroke: stroke.id, keys: [], cells: [] };
          part += 1;
          out.push(run);
        }
        run.keys.push(k);
        run.cells.push({ c: colOf(k), r: rowOf(k) });
      });
    });
    return out;
  }

  return {
    begin,
    end,
    add,
    remove,
    adopt,
    clear,
    runs,
    get version() { return version; },
    get drawing() { return Boolean(current); },
    strokeOf: (c, r) => owner.get(keyOf(c, r)) ?? null,
    size: () => owner.size,
  };
}

// A run's signature: the same cells in the same order draw the same stroke.
export const runSignature = (run) => `${run.stroke}|${run.keys.join(',')}`;

// ------------------------------------------------------------------ geometry

// Chaikin corner-cutting, keeping the end points: turns a run's staircase of
// cell centres into one smooth line (a 45° stair becomes a straight ramp).
export function chaikin(points, iterations = 2) {
  let pts = points.map(([x, y]) => [x, y]);
  for (let it = 0; it < iterations; it += 1) {
    if (pts.length < 3) break;
    const out = [pts[0]];
    for (let i = 0; i < pts.length - 1; i += 1) {
      const [ax, ay] = pts[i];
      const [bx, by] = pts[i + 1];
      out.push([ax * 0.75 + bx * 0.25, ay * 0.75 + by * 0.25]);
      out.push([ax * 0.25 + bx * 0.75, ay * 0.25 + by * 0.75]);
    }
    out.push(pts[pts.length - 1]);
    pts = out;
  }
  return pts;
}

// A moving average over the cell centres (the window narrows at the ends, so
// the stroke still starts and ends on its first and last cells): an uneven
// staircase (two across, one up) becomes an even slope instead of a wave.
export function relax(points, reach = 2) {
  const n = points.length;
  return points.map((point, i) => {
    const w = Math.min(reach, i, n - 1 - i);
    if (w <= 0) return point;
    let sx = 0;
    let sy = 0;
    for (let j = i - w; j <= i + w; j += 1) {
      sx += points[j][0];
      sy += points[j][1];
    }
    return [sx / (2 * w + 1), sy / (2 * w + 1)];
  });
}

// The centre line one run is painted along, in world px: the cells'
// centres, relaxed and smoothed. A single cell is a short horizontal dab.
export function runPath(run, cell) {
  const centres = run.cells.map(({ c, r }) => [c * cell + cell / 2, r * cell + cell / 2]);
  if (centres.length === 1) {
    const [x, y] = centres[0];
    return [[x - cell * 0.28, y], [x + cell * 0.28, y]];
  }
  return chaikin(relax(centres, 2), 2);
}

// Arc-length resampling: points every `step` px along the path, each with its
// unit tangent, normal and arc position t in [0, 1].
export function resample(path, step = 2) {
  const out = [];
  if (path.length < 2) return out;
  const seg = [];
  let total = 0;
  for (let i = 0; i < path.length - 1; i += 1) {
    const len = Math.hypot(path[i + 1][0] - path[i][0], path[i + 1][1] - path[i][1]);
    seg.push(len);
    total += len;
  }
  if (total <= 0) return out;
  const n = Math.max(2, Math.ceil(total / step) + 1);
  let i = 0;
  let acc = 0;
  for (let k = 0; k < n; k += 1) {
    const d = (k / (n - 1)) * total;
    while (i < seg.length - 1 && acc + seg[i] < d) {
      acc += seg[i];
      i += 1;
    }
    const f = seg[i] > 0 ? (d - acc) / seg[i] : 0;
    const [ax, ay] = path[i];
    const [bx, by] = path[i + 1];
    const tx = (bx - ax) / (seg[i] || 1);
    const ty = (by - ay) / (seg[i] || 1);
    out.push({ x: ax + (bx - ax) * f, y: ay + (by - ay) * f, tx, ty, nx: -ty, ny: tx, t: d / total, s: d });
  }
  return out;
}

// How wide the stroke is at arc position t: a loaded, slightly blunt start,
// an even body and a dry tail that thins as the brush runs out.
export function strokeWidth(t, width, wobble = 0) {
  const start = 0.88 + 0.12 * smooth(0, 0.12, t);
  const tail = 1 - 0.3 * smooth(0.78, 1, t);
  return width * start * tail * (1 + wobble);
}

// How dry the bristles are at arc position t (0 loaded .. 1 dry).
export const dryness = (t) => smooth(0.55, 1, t);

function smooth(a, b, t) {
  const k = Math.min(1, Math.max(0, (t - a) / (b - a)));
  return k * k * (3 - 2 * k);
}

// The world-px box a run's stroke can paint into (with its splay and shadow).
export function runBounds(run, cell, pad = 12) {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  run.cells.forEach(({ c, r }) => {
    x0 = Math.min(x0, c * cell);
    y0 = Math.min(y0, r * cell);
    x1 = Math.max(x1, c * cell + cell);
    y1 = Math.max(y1, r * cell + cell);
  });
  return { x: Math.floor(x0 - pad), y: Math.floor(y0 - pad), w: Math.ceil(x1 - x0 + pad * 2), h: Math.ceil(y1 - y0 + pad * 2) };
}
