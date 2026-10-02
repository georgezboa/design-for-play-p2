// Chapter 4 // THE PAINTED COUNTRY — pencil for the flat fills (alpha R3 · R6).
//
// The archive's grey blocks and the torn holes in the floor were the only
// flat fills left on the sheet: a grey rectangle and a white one with no
// pencil edge. These Graphics helpers draft them like everything else:
//   blockEdgeRuns   the outline of a set of grey cells, as merged straight
//                   runs (pure: one run per uninterrupted edge, not per cell);
//   draftBlockEdges those runs drawn as overshooting graphite lines;
//   shadePit        a hole drafted as a hole: the lip's cast shadow hatched
//                   under the floor line, the torn underside, a few depth
//                   strokes fading down into the paper.
// Seeded throughout, so a redraw after a stroke lands every line where it was.

import { PAPER } from '../paperPalette.js';
import { draftLine, hatchRect, makeRandom } from '../paperSurface.js';

/**
 * The outline of a set of cells (keys = row * cols + col), as straight runs
 * in cell units: { x1, y1, x2, y2, side } with side 'top' | 'bottom' |
 * 'left' | 'right' (the side of the block the run bounds).
 */
export function blockEdgeRuns(keys, cols) {
  const set = keys instanceof Set ? keys : new Set(keys);
  const has = (c, r) => c >= 0 && c < cols && set.has(r * cols + c);
  const cells = [...set].map((k) => ({ c: k % cols, r: Math.floor(k / cols) }));
  const runs = [];
  const sides = [
    { side: 'top', open: (c, r) => !has(c, r - 1), horizontal: true, at: (r) => r },
    { side: 'bottom', open: (c, r) => !has(c, r + 1), horizontal: true, at: (r) => r + 1 },
    { side: 'left', open: (c, r) => !has(c - 1, r), horizontal: false, at: (c) => c },
    { side: 'right', open: (c, r) => !has(c + 1, r), horizontal: false, at: (c) => c + 1 },
  ];
  for (const s of sides) {
    // group open edges by the line they lie on, then merge neighbours
    const lines = new Map();
    for (const { c, r } of cells) {
      if (!s.open(c, r)) continue;
      const line = s.horizontal ? r : c;
      const along = s.horizontal ? c : r;
      if (!lines.has(line)) lines.set(line, []);
      lines.get(line).push(along);
    }
    for (const [line, list] of [...lines.entries()].sort((a, b) => a[0] - b[0])) {
      list.sort((a, b) => a - b);
      let start = list[0];
      let prev = list[0];
      const flush = (from, to) => {
        const fixed = s.at(line);
        runs.push(s.horizontal
          ? { x1: from, y1: fixed, x2: to + 1, y2: fixed, side: s.side }
          : { x1: fixed, y1: from, x2: fixed, y2: to + 1, side: s.side });
      };
      for (let i = 1; i < list.length; i += 1) {
        if (list[i] === prev + 1) { prev = list[i]; continue; }
        flush(start, prev);
        start = list[i];
        prev = list[i];
      }
      flush(start, prev);
    }
  }
  return runs;
}

/**
 * Draws the outline of a set of grey cells on a Graphics, in world pixels:
 * a graphite contour that overshoots its corners, with a softer second pass
 * on the shaded (bottom / right) sides, the way the car's panels are drafted.
 */
export function draftBlockEdges(g, keys, cols, cell, { seed = 0x6b10, alpha = 0.9 } = {}) {
  g.clear();
  const runs = blockEdgeRuns(keys, cols);
  const rnd = makeRandom(seed);
  for (const run of runs) {
    const len = Math.max(Math.abs(run.x2 - run.x1), Math.abs(run.y2 - run.y1));
    const opts = { overshoot: 3.5, jitter: 0.75, segments: Math.max(2, Math.round(len * 1.5)) };
    g.lineStyle(1.7, PAPER.graphite, alpha);
    draftLine(g, rnd, run.x1 * cell, run.y1 * cell, run.x2 * cell, run.y2 * cell, opts);
    if (run.side === 'bottom' || run.side === 'right') {
      // the pooled, darker edge of a heavy coat: a second, softer line
      const dx = run.side === 'right' ? -2.2 : 0;
      const dy = run.side === 'bottom' ? -2.2 : 0;
      g.lineStyle(1.1, PAPER.graphiteSoft, alpha * 0.6);
      draftLine(g, rnd, run.x1 * cell + dx, run.y1 * cell + dy, run.x2 * cell + dx, run.y2 * cell + dy, { ...opts, overshoot: 0 });
    }
  }
  return runs.length;
}

/**
 * Shades a torn hole (x, top, w, h in world pixels) on a Graphics: the
 * floor's lip casts a hatched shadow into it, its torn underside is drafted
 * just below the floor line, and a few depth strokes fall away into the
 * paper. Draw it over the hole's fill and under its deckle edges.
 */
export function shadePit(g, x, top, w, h, { seed = 0x9170 } = {}) {
  const rnd = makeRandom(seed);
  const inset = 3;
  // the lip's shadow: dense near the floor line, thinning below
  hatchRect(g, rnd, x + inset, top, w - inset * 2, Math.min(h, 30), { spacing: 5, alpha: 0.34, width: 1 });
  hatchRect(g, rnd, x + inset, top, w - inset * 2, Math.min(h, 16), { spacing: 6, alpha: 0.26, width: 1, flip: true });
  hatchRect(g, rnd, x + inset, top + 30, w - inset * 2, Math.min(h - 30, 26), { spacing: 9, alpha: 0.14, width: 1 });
  // the torn underside of the floor, just below its line
  g.lineStyle(1.3, PAPER.graphite, 0.55);
  draftLine(g, rnd, x + 2, top + 4, x + w - 2, top + 5, { overshoot: 0, jitter: 1.4, segments: Math.max(3, Math.round(w / 14)) });
  // depth: loose vertical strokes, fainter as they fall
  const n = Math.max(2, Math.round(w / 48));
  for (let i = 0; i < n; i += 1) {
    const sx = x + inset + 6 + ((i + 0.5) / n) * (w - inset * 2 - 12) + (rnd() - 0.5) * 8;
    const len = h * (0.22 + rnd() * 0.22);
    g.lineStyle(1, PAPER.graphiteSoft, 0.16 + rnd() * 0.08);
    draftLine(g, rnd, sx, top + 12, sx + (rnd() - 0.5) * 3, top + 12 + len, { overshoot: 0, jitter: 0.8, segments: 4 });
  }
  // the paper's tooth, so the hole is drawn-on paper, not a white rectangle
  for (let i = 0; i < Math.round((w * h) / 90); i += 1) {
    const px = x + inset + rnd() * (w - inset * 2);
    const py = top + 8 + rnd() * (h - 8);
    g.fillStyle(rnd() > 0.5 ? PAPER.graphiteFaint : PAPER.deckle, 0.35);
    g.fillRect(px, py, 1.2, 1.2);
  }
}
