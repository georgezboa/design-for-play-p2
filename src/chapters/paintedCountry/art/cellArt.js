// Chapter 4 // THE PAINTED COUNTRY — what the brush lays down, cell by cell.
//
// One small atlas of 20 px cell stamps with a 2 px bleed, drawn once:
//   paint-0..3     Butch's indigo gouache: two loaded strokes with bristle
//                  streaks (the bridge he paints across a gap);
//   grey-0..3      the archive's grey: a flat, heavy coat dragged sideways;
//   varnish-1, -2  the "official record" gloss over a cell, one per coat.
// The scenes place them with a Phaser Blitter, so a redraw after a stroke is
// a list of bobs, not a canvas repaint.

import { HUE, makeCanvas, rng } from './pencilKit.js';
import { dab } from './pencilKit.js';

export const CELL_STAMP = Object.freeze({ cell: 20, bleed: 2, size: 24, variants: 4 });

const INDIGO = '#46618c';
/** The grey coat's hatching period (px); divides the cell so it tiles. */
export const GREY_HATCH = 5;

// The atlas's frame names and rectangles (the same ones paintCellAtlas
// draws), without drawing it.
export function cellAtlasFrames() {
  const { size, variants } = CELL_STAMP;
  const frames = [];
  for (let v = 0; v < variants; v += 1) frames.push({ name: `paint-${v}`, x: v * size, y: 0, w: size, h: size });
  for (let v = 0; v < variants; v += 1) frames.push({ name: `grey-${v}`, x: (variants + v) * size, y: 0, w: size, h: size });
  [1, 2].forEach((coats, i) => frames.push({ name: `varnish-${coats}`, x: (variants * 2 + i) * size, y: 0, w: size, h: size }));
  return frames;
}

export function paintCellAtlas() {
  const { size, variants, bleed, cell } = CELL_STAMP;
  const frames = [];
  const cols = variants * 2 + 2;
  const canvas = makeCanvas(size * cols, size);
  const c = canvas.getContext('2d');
  const at = (i) => i * size;
  for (let v = 0; v < variants; v += 1) {
    const r = rng(0x9a1 + v * 13);
    const x = at(v);
    c.save();
    c.beginPath(); c.rect(x, 0, size, size); c.clip();
    // two overlapping horizontal strokes, slightly tilted
    const y1 = bleed + cell * 0.3 + (r() - 0.5) * 2;
    const y2 = bleed + cell * 0.72 + (r() - 0.5) * 2;
    dab(c, x + 0.5, y1, x + size - 0.5, y1 + (r() - 0.5) * 2, cell * 0.68, INDIGO, { alpha: 0.95, seed: 10 + v, streaks: 5 });
    dab(c, x + size - 0.5, y2, x + 0.5, y2 + (r() - 0.5) * 2, cell * 0.66, INDIGO, { alpha: 0.95, seed: 20 + v, streaks: 5 });
    // pooled pigment at the bottom edge
    c.globalAlpha = 0.22; c.fillStyle = '#1e2c44'; c.fillRect(x, bleed + cell - 2.5, size, 2.5);
    c.restore();
    frames.push({ name: `paint-${v}`, x, y: 0, w: size, h: size });
  }
  for (let v = 0; v < variants; v += 1) {
    const r = rng(0x6a3 + v * 17);
    const x = at(variants + v);
    c.save();
    c.beginPath(); c.rect(x, 0, size, size); c.clip();
    c.fillStyle = HUE.grey;
    c.fillRect(x + bleed - 1, bleed - 1, cell + 2, cell + 2);
    // the coat was dragged sideways: faint darker drag marks and a lighter one
    for (let k = 0; k < 3; k += 1) {
      const yy = bleed + cell * (0.2 + k * 0.3) + (r() - 0.5) * 3;
      c.globalAlpha = 0.16 + r() * 0.1;
      c.strokeStyle = k === 1 ? '#a39e95' : HUE.greyDark;
      c.lineWidth = 1 + r() * 1.5;
      c.beginPath(); c.moveTo(x, yy); c.quadraticCurveTo(x + size / 2, yy + (r() - 0.5) * 3, x + size, yy + (r() - 0.5) * 2); c.stroke();
    }
    // graphite hatching over the coat (alpha R3 · R6: it read as a flat grey
    // fill). 45° strokes on a 5 px period measured from the cell's corner:
    // 5 divides the 20 px cell, so the strokes run on unbroken from cell to
    // cell however a block is laid.
    c.beginPath(); c.rect(x + bleed - 1, bleed - 1, cell + 2, cell + 2); c.clip();
    c.globalAlpha = 0.4;
    c.strokeStyle = '#55514b';
    c.lineWidth = 0.9;
    for (let k = -size; k <= size * 2; k += GREY_HATCH) {
      // stamp-local x + y = 2 * bleed + k is world x + y ≡ 0 (mod GREY_HATCH)
      const s = 2 * bleed + k;
      c.beginPath(); c.moveTo(x + s, 0); c.lineTo(x + s - size, size); c.stroke();
    }
    // a lighter cross-hatch the other way on twice the period (also tiles:
    // world x - y ≡ 0 mod 10)
    c.globalAlpha = 0.22;
    for (let k = -size; k <= size * 2; k += GREY_HATCH * 2) {
      c.beginPath(); c.moveTo(x + k, 0); c.lineTo(x + k + size, size); c.stroke();
    }
    // the paper's tooth through the coat: a few lifted and a few dark grains
    for (let k = 0; k < 14; k += 1) {
      c.globalAlpha = 0.18 + r() * 0.2;
      c.fillStyle = k % 3 === 0 ? '#b9b4aa' : HUE.greyDark;
      c.fillRect(x + bleed + r() * cell, bleed + r() * cell, 1, 1);
    }
    c.globalAlpha = 1;
    c.restore();
    frames.push({ name: `grey-${v}`, x, y: 0, w: size, h: size });
  }
  [1, 2].forEach((coats, i) => {
    const x = at(variants * 2 + i);
    c.save();
    c.beginPath(); c.rect(x + bleed, bleed, cell, cell); c.clip();
    c.fillStyle = `rgba(255, 250, 240, ${0.3 + 0.16 * coats})`;
    c.fillRect(x + bleed, bleed, cell, cell);
    c.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    c.lineWidth = 1.4;
    c.beginPath(); c.moveTo(x + bleed + 2, bleed + cell - 2); c.lineTo(x + bleed + cell - 2, bleed + 2); c.stroke();
    if (coats > 1) { c.beginPath(); c.moveTo(x + bleed + 8, bleed + cell); c.lineTo(x + bleed + cell, bleed + 8); c.stroke(); }
    c.strokeStyle = 'rgba(176, 138, 74, 0.45)';
    c.lineWidth = 1;
    c.strokeRect(x + bleed + 0.5, bleed + 0.5, cell - 1, cell - 1);
    c.restore();
    frames.push({ name: `varnish-${coats}`, x, y: 0, w: size, h: size });
  });
  return { canvas, frames };
}
