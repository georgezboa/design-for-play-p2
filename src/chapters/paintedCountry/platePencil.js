// Chapter 4 // THE PAINTED COUNTRY — what is under the grey.
//
// Each gallery plate is a pencil drawing composed once into a texture
// (art/plateArt.js): a scene (the city room, the orchard house, Rosa's own
// drawing) plus the five marks (art/marksArt.js) at the rects carLayout.js
// gives them. A second texture, `<key>-painted`, is the same plate with
// Rosa's colour back in it; the scene blooms it in when the plate comes
// clear. The archive's grey is drawn over it cell by cell by the scene, never
// baked in, so washing reveals exactly this image.

import { PLATE_GRID, SIGN } from './carLayout.js';
import { makeRandom } from './paperSurface.js';
import { paintMark, paintSign } from './art/marksArt.js';
import { paintPlate } from './art/plateArt.js';

export const PLATE_TEX = Object.freeze({ w: 480, h: 280 });
export const PLATE_CELL = PLATE_TEX.w / PLATE_GRID.cols; // 40

// `mark-<sign>` (the bare mark) and `sign-<sign>` (the door's pinned card),
// drawn once per game.
export function ensureMarkTextures(scene) {
  Object.values(SIGN).forEach((sign) => {
    if (!scene.textures.exists(`mark-${sign}`)) scene.textures.addCanvas(`mark-${sign}`, paintMark(sign));
    if (!scene.textures.exists(`sign-${sign}`)) scene.textures.addCanvas(`sign-${sign}`, paintSign(sign));
  });
}

export const paintedPlateKey = (plate) => `${plate.key}-painted`;

// Builds `plate.key` (pencil) and `<key>-painted` once.
export function buildPlateTexture(scene, plate) {
  if (scene.textures.exists(plate.key)) return plate.key;
  ensureMarkTextures(scene);
  const marks = Object.fromEntries(Object.values(SIGN).map((sign) => [sign, scene.textures.get(`mark-${sign}`).getSourceImage()]));
  const art = paintPlate(plate, marks, PLATE_CELL);
  scene.textures.addCanvas(plate.key, art.pencil);
  scene.textures.addCanvas(paintedPlateKey(plate), art.painted);
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
