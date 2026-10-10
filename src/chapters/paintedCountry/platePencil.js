// Chapter 4 // THE PAINTED COUNTRY — what is under the grey.
//
// Each gallery plate is a pencil drawing composed once into a texture
// (art/plateArt.js): a scene (the city room, the orchard house, Rosa's own
// drawing) plus the five marks (art/marksArt.js) at the rects carLayout.js
// gives them. A second texture, `<key>-painted`, is the same plate with
// Rosa's colour back in it; the scene blooms it in when the plate comes
// clear. The archive's grey is drawn over it square by square by the scene,
// never baked in, so where a thread of Rosa's colour runs (threadBoard.js)
// the grey lifts off exactly this image.

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

// The archive's grey gouache over one square of a plate (`size` wide, `h`
// tall), with brush drag in it.
export const GREY = 0x8f8a82;
export const GREY_DARK = 0x77736c;

export function drawGreyCell(g, x, y, size, seed, { h = size, alpha = 1 } = {}) {
  const rnd = makeRandom(seed);
  g.fillStyle(GREY, alpha).fillRect(x, y, size + 0.5, h + 0.5);
  g.lineStyle(Math.max(1, Math.min(size, h) / 14), GREY_DARK, 0.35 * alpha);
  const strokes = Math.max(3, Math.round(h / 22));
  for (let i = 0; i < strokes; i += 1) {
    const yy = y + h * ((i + 0.6) / (strokes + 0.2)) + (rnd() - 0.5) * 3;
    g.lineBetween(x + 1, yy, x + size - 1, yy + (rnd() - 0.5) * 3);
  }
}
