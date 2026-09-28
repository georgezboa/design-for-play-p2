// Chapter 4 // THE PAINTED COUNTRY — what is under the grey.
//
// Each gallery plate is a pencil drawing composed once into a texture: a
// scene (the city room, the orchard house, Rosa's own drawing) plus the marks
// from scripts/art/generate-chapter4-sign-icons.mjs at the rects carLayout.js
// gives them. The archive's grey is drawn over it cell by cell by the scene,
// never baked in, so washing reveals exactly this image.

import { PAPER } from './paperPalette.js';
import { draftLine, draftRect, hatchRect, makeRandom } from './paperSurface.js';
import { PLATE_GRID } from './carLayout.js';

export const PLATE_TEX = Object.freeze({ w: 480, h: 280 });
export const PLATE_CELL = PLATE_TEX.w / PLATE_GRID.cols; // 40

const cellRect = (rect) => ({
  x: rect.c * PLATE_CELL,
  y: rect.r * PLATE_CELL,
  w: rect.w * PLATE_CELL,
  h: rect.h * PLATE_CELL,
});

function drawCity(g, rnd) {
  // The rented room: a window on the terminal, rain, a clock, a narrow bed.
  g.lineStyle(2, PAPER.graphite, 0.8);
  draftRect(g, rnd, 300, 18, 150, 118, { overshoot: 6, jitter: 0.8 });
  draftLine(g, rnd, 375, 18, 375, 136, { overshoot: 3 });
  draftLine(g, rnd, 300, 77, 450, 77, { overshoot: 3 });
  g.lineStyle(1, PAPER.graphiteSoft, 0.6);
  for (let i = 0; i < 18; i += 1) {
    const x = 306 + rnd() * 138;
    const y = 24 + rnd() * 100;
    g.lineBetween(x, y, x - 4, y + 12);
  }
  // the terminal clock across the street
  g.lineStyle(1.4, PAPER.graphiteSoft, 0.8).strokeCircle(340, 48, 13);
  g.lineBetween(340, 48, 340, 39);
  g.lineBetween(340, 48, 347, 51);
  // the bed and nightstand
  g.lineStyle(2, PAPER.graphite, 0.7);
  draftLine(g, rnd, 20, 236, 250, 236, { overshoot: 5 });
  draftLine(g, rnd, 20, 236, 20, 270, { overshoot: 3 });
  draftLine(g, rnd, 250, 236, 250, 270, { overshoot: 3 });
  hatchRect(g, rnd, 24, 240, 222, 28, { spacing: 9, alpha: 0.35 });
  draftRect(g, rnd, 272, 196, 70, 74, { overshoot: 4, jitter: 0.6 });
  draftLine(g, rnd, 272, 226, 342, 226, { overshoot: 2 });
  // floorboards
  g.lineStyle(1, PAPER.graphiteFaint, 0.7);
  [258, 270].forEach((y) => draftLine(g, rnd, 350, y, 476, y, { overshoot: 0, jitter: 0.6 }));
}

function drawOrchard(g, rnd) {
  // The orchard house from the gate: roof, porch, trees, the path.
  g.lineStyle(2, PAPER.graphite, 0.78);
  draftLine(g, rnd, 110, 110, 190, 40, { overshoot: 5 });
  draftLine(g, rnd, 190, 40, 350, 40, { overshoot: 5 });
  draftLine(g, rnd, 350, 40, 420, 110, { overshoot: 5 });
  draftRect(g, rnd, 124, 110, 282, 130, { overshoot: 6, jitter: 0.7 });
  hatchRect(g, rnd, 128, 44, 270, 60, { spacing: 10, alpha: 0.3 });
  draftRect(g, rnd, 150, 140, 40, 40, { overshoot: 3 });
  draftRect(g, rnd, 350, 140, 40, 40, { overshoot: 3 });
  draftRect(g, rnd, 236, 170, 56, 70, { overshoot: 3 });
  // trees either side
  g.lineStyle(1.6, PAPER.graphiteSoft, 0.8);
  [[40, 150], [456, 130]].forEach(([x, y]) => {
    g.strokeCircle(x, y, 34);
    g.strokeCircle(x - 14, y - 16, 20);
    draftLine(g, rnd, x, y + 30, x, 270, { overshoot: 0, jitter: 0.8 });
  });
  // the path to the gate
  g.lineStyle(1.3, PAPER.graphiteFaint, 0.9);
  draftLine(g, rnd, 250, 240, 200, 280, { overshoot: 0 });
  draftLine(g, rnd, 280, 240, 330, 280, { overshoot: 0 });
  g.lineStyle(2, PAPER.graphite, 0.6);
  for (let x = 20; x < 470; x += 22) draftLine(g, rnd, x, 252, x, 276, { overshoot: 2, jitter: 0.5, segments: 3 });
  draftLine(g, rnd, 10, 258, 470, 258, { overshoot: 0, jitter: 0.6 });
}

function drawChildDrawing(g, rnd) {
  // A nine-year-old's crayon: a sun in the corner, trees like lollipops, a
  // green ground line, and a tall figure walking up the path — seen from
  // behind, as Rosa drew her sister coming home.
  g.fillStyle(0xe7c35a, 0.35).fillCircle(456, 24, 30);
  g.lineStyle(2, 0xc8892f, 0.7);
  for (let i = 0; i < 9; i += 1) {
    const a = Math.PI * 0.5 + (i / 8) * Math.PI * 0.5;
    g.lineBetween(456 + Math.cos(a) * 36, 24 + Math.sin(a) * 36, 456 + Math.cos(a) * 52, 24 + Math.sin(a) * 52);
  }
  g.lineStyle(3, 0x7a9a62, 0.55);
  draftLine(g, rnd, 0, 262, 480, 256, { overshoot: 0, jitter: 3, segments: 14 });
  [[250, 150], [330, 170], [420, 150]].forEach(([x, y]) => {
    g.fillStyle(0x7a9a62, 0.28).fillCircle(x, y - 40, 34);
    g.lineStyle(2.4, PAPER.graphite, 0.55).strokeCircle(x, y - 40, 34);
    g.lineStyle(4, 0x8a6a4a, 0.5).lineBetween(x, y - 6, x, 258);
    g.fillStyle(0xb4453a, 0.55);
    for (let i = 0; i < 4; i += 1) g.fillCircle(x - 18 + rnd() * 36, y - 58 + rnd() * 34, 5);
  });
  // "my sister coming home": a tall figure, back turned, walking up the path
  const fx = 300;
  g.lineStyle(2.4, PAPER.graphite, 0.75);
  g.strokeCircle(fx, 196, 9);
  draftLine(g, rnd, fx, 205, fx, 236, { overshoot: 0, jitter: 1.2 });
  draftLine(g, rnd, fx, 214, fx - 12, 228, { overshoot: 0, jitter: 1.2 });
  draftLine(g, rnd, fx, 214, fx + 12, 228, { overshoot: 0, jitter: 1.2 });
  draftLine(g, rnd, fx, 236, fx - 8, 256, { overshoot: 0, jitter: 1.2 });
  draftLine(g, rnd, fx, 236, fx + 8, 256, { overshoot: 0, jitter: 1.2 });
  g.fillStyle(PAPER.graphite, 0.5).fillTriangle(fx - 10, 208, fx + 10, 208, fx, 240);
}

const SCENES = { city: drawCity, orchard: drawOrchard, drawing: drawChildDrawing };

// Builds `plate.key` once. Marks come from the MARK_ART images, which must be
// loaded as `mark-<sign>`.
export function buildPlateTexture(scene, plate) {
  if (scene.textures.exists(plate.key)) return plate.key;
  const { w, h } = PLATE_TEX;
  const rt = scene.add.renderTexture(0, 0, w, h).setOrigin(0).setVisible(false);
  const g = scene.make.graphics({ add: false });
  const rnd = makeRandom(0x9b1e + plate.id.length * 31);
  g.fillStyle(PAPER.sheetHigh, 1).fillRect(0, 0, w, h);
  g.lineStyle(1, PAPER.graphiteFaint, 0.25);
  for (let y = 22; y < h; y += 26) g.lineBetween(10, y, w - 10, y + (rnd() - 0.5) * 3);
  SCENES[plate.scene]?.(g, rnd);
  rt.draw(g);
  g.destroy();

  const place = (sign, rect, inset = 0) => {
    if (!rect || !scene.textures.exists(`mark-${sign}`)) return;
    const r = cellRect(rect);
    const size = Math.min(r.w, r.h) - inset * 2;
    const img = scene.make.image({ x: r.x + r.w / 2, y: r.y + r.h / 2, key: `mark-${sign}`, add: false });
    img.setDisplaySize(size, size);
    rt.draw(img);
    img.destroy();
  };
  place(plate.primarySign, plate.markRect, 2);
  place(plate.sharedSign, plate.hawthornRect, 1);
  if (plate.roseRect) place('rose', plate.roseRect, 3);
  rt.saveTexture(plate.key);
  return plate.key;
}

// The archive's grey gouache over one plate cell, with brush drag in it.
export const GREY = 0x8f8a82;
export const GREY_DARK = 0x77736c;

export function drawGreyCell(g, x, y, size, seed, { varnish = 0, alpha = 1 } = {}) {
  const rnd = makeRandom(seed);
  g.fillStyle(GREY, alpha).fillRect(x, y, size + 0.5, size + 0.5);
  g.lineStyle(Math.max(1, size / 14), GREY_DARK, 0.35 * alpha);
  for (let i = 0; i < 3; i += 1) {
    const yy = y + size * (0.2 + i * 0.3) + (rnd() - 0.5) * 3;
    g.lineBetween(x + 1, yy, x + size - 1, yy + (rnd() - 0.5) * 3);
  }
  if (varnish > 0) {
    // Official record: a hard gloss, brass-edged, one layer per coat.
    g.fillStyle(0xe9e1cf, (0.28 + 0.14 * varnish) * alpha).fillRect(x, y, size, size);
    g.lineStyle(Math.max(1, size / 16), 0xfffaf0, 0.7 * alpha);
    g.lineBetween(x + size * 0.15, y + size * 0.85, x + size * 0.85, y + size * 0.15);
    if (varnish > 1) g.lineBetween(x + size * 0.4, y + size * 0.95, x + size * 0.95, y + size * 0.4);
  }
}
