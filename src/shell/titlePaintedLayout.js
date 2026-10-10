// The painted title's layout (round 10): where George's carriage sits on a
// W × H screen, and from it where everything else goes. Pure (no DOM): the
// tests check every screen shape.
//
// The carriage (TT-carriage, 3 : 2) is one fixed composition: the big window
// on the left with Butch on the bench in front of it, a plain walnut wall in
// the middle where the departures board (the menu) hangs, the end door at
// the right. Wide screens see the whole picture cover-fitted (cropped at the
// top and bottom, or at the sides, never stretched); the board hangs on the
// painted wall. Narrow screens (phones, tall windows) see only the window and
// Butch, framed in Chapter 1's brass bezel at the top, with the board below
// on the walnut.
//
// The result has the round-6 layout's shape (titlePlate.js sceneLayout), so
// the motion model (frameState) and the page's CSS variables work unchanged:
// glass, wordmark, plaque, butch (x, head, lamp), poleGap. `view` maps plate
// px to the screen.

import { TITLE_GEOMETRY, TITLE_PLATES } from './titlePlates.generated.js';

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const round = (v) => Math.round(v * 100) / 100;
const rect = (x, y, w, h) => ({ x: round(x), y: round(y), w: round(w), h: round(h) });

/** Below this aspect the narrow layout is used. */
export const NARROW_BELOW = 1.1;
/** Where the cover-fit crop falls: 0 crops all from the left (top), 1 all from the right (bottom). */
export const ANCHOR = Object.freeze({ x: 0.72, y: 0.5 });
/** The board's width on the wall: the menu needs at least this many CSS px. */
export const PLAQUE_MIN = 336;
export const PLAQUE_MAX = 600;

function wordmarkBox(x, y, maxW, maxH) {
  // the mark is about 0.36 of its width tall (NIGHTFALL, the rule, the line)
  const w = Math.max(120, Math.min(maxW, maxH / 0.36));
  return { x: round(x), y: round(y), w: round(w), h: round(w * 0.36) };
}

function mapper(view) {
  return (fx, fy) => [view.ox + fx * view.pw * view.s, view.oy + fy * view.ph * view.s];
}

function parts({ map, s, ph, geometry, glass }) {
  const g = geometry;
  const [bx, by] = map(g.butch.x, g.butch.headY);
  const [hx, hy] = map(g.butch.headX, g.butch.headY);
  const capY = map(g.butch.headX, g.butch.capTop)[1];
  const [lx, ly] = map(g.lamp[0], g.lamp[1]);
  const headR = Math.max(6, (hy - capY) * 0.9);
  return {
    // his seat point: the motion model aims the passing lamp's band at x
    butch: {
      x: round(bx), y: round(by), s: round((ph * s) / 280),
      head: { x: round(hx), y: round(hy), r: round(headR) },
      capTop: round(capY),
      lamp: { x: round(lx), y: round(ly), glass: round(ly) },
    },
    // the moon behind his cap, glass-local
    moon: { x: round(hx - glass.x), y: round(capY - glass.y) },
  };
}

function wideLayout(W, H, plates, geometry) {
  if (W / H < NARROW_BELOW) return null;
  const [pw, ph] = plates.carriage.size;
  const s = Math.max(W / pw, H / ph);
  // what must stay on screen: the window's frame on the left to the board's wall on the right
  const span0 = plates.carriage.glass[0] - pw * 0.012;
  const span1 = (geometry.wall[0] + geometry.wall[2]) * pw + pw * 0.012;
  if ((span1 - span0) * s > W) return null;
  let ox = (W - pw * s) * ANCHOR.x;
  if (ox + span0 * s < 0) ox = -span0 * s;
  if (ox + span1 * s > W) ox = W - span1 * s;
  ox = clamp(ox, W - pw * s, 0);
  const view = { s, pw, ph, ox, oy: (H - ph * s) * ANCHOR.y, crop: null };
  const map = mapper(view);
  const px = (r) => {
    const [x, y] = map(r[0] / pw, r[1] / ph);
    return rect(x, y, r[2] * s, r[3] * s);
  };
  const glass = { ...px(plates.carriage.glass), r: round(Math.min(plates.carriage.glass[2], plates.carriage.glass[3]) * s * 0.05) };
  const door = px(plates.carriage.door);
  // the wall for the board, on screen and inside it
  const [wx, wy, ww, wh] = geometry.wall;
  const [x0, y0] = map(wx, wy);
  const [x1, y1] = map(wx + ww, wy + wh);
  const margin = clamp(H * 0.04, 12, 40);
  const top = Math.max(y0, margin);
  const bottom = Math.min(y1, H - margin);
  const wallW = x1 - x0;
  const plaqueW = clamp(wallW * 0.9, PLAQUE_MIN, PLAQUE_MAX);
  // the menu needs the room: below it, the narrow layout is better
  if (plaqueW > wallW * 1.12 || bottom - top < Math.min(360, H * 0.6)) return null;
  // centred on the wall, but never over the window, and on screen
  const gap = Math.max(6, glass.w * 0.012);
  const left = clamp((x0 + x1) / 2 - plaqueW / 2, glass.x + glass.w + gap, W - plaqueW - margin);
  const plaque = rect(left, top, plaqueW, bottom - top);
  if (plaque.x < glass.x + glass.w) return null;
  const { butch, moon } = parts({ map, s, ph, geometry, glass });
  // NIGHTFALL on the glass, top left, beside his head or above it
  const gTop = Math.max(glass.y, margin);
  const markX = glass.x + glass.w * 0.065;
  const markY = gTop + glass.h * 0.07;
  const beside = butch.head.x - butch.head.r * 1.6 - markX - glass.w * 0.05;
  const above = (butch.capTop - glass.h * 0.06 - markY) / 0.36;
  const mark = wordmarkBox(markX, markY, Math.min(glass.w * 0.52, Math.max(beside, Math.min(glass.w * 0.5, above))), glass.h * 0.29);
  const [pdx, pdy] = map(geometry.pendant[0], geometry.pendant[1]);
  return {
    mode: 'wide', painted: true, W, H, view,
    glass, door,
    plaque,
    wordmark: mark,
    butch, moon,
    pendant: { x: round(pdx), y: round(pdy), size: round(ph * s * 0.04) },
    poleGap: round(Math.max(300, glass.w * 0.62)),
    frame: null,
  };
}

function narrowLayout(W, H, plates, geometry) {
  const [pw, ph] = plates.carriage.size;
  const m = clamp(W * 0.04, 12, 40);
  const dw = W - m * 2;
  let [cx, cy, cw, ch] = geometry.narrow.map((v, i) => v * (i % 2 ? ph : pw));
  let dh = (dw * ch) / cw;
  const maxH = H * (W > H ? 0.44 : 0.46);
  if (dh > maxH) {
    // a short screen: widen the crop to the frame's shape, about its middle, inside the plate
    dh = maxH;
    const want = Math.min(pw, (ch * dw) / dh);
    const mid = cx + cw / 2;
    cw = want;
    cx = clamp(mid - want / 2, 0, pw - want);
  }
  const s = dw / cw;
  const frame = rect(m, m, dw, dh);
  const view = { s, pw, ph, ox: m - cx * s, oy: m - cy * s, crop: frame };
  const map = mapper(view);
  const g = plates.carriage.glass;
  const [gx0, gy0] = map(g[0] / pw, g[1] / ph);
  const [gx1, gy1] = map((g[0] + g[2]) / pw, (g[1] + g[3]) / ph);
  // the glass, as much of it as the frame shows
  const gx = Math.max(gx0, frame.x);
  const gy = Math.max(gy0, frame.y);
  const glass = { ...rect(gx, gy, Math.min(gx1, frame.x + frame.w) - gx, Math.min(gy1, frame.y + frame.h) - gy), r: round(Math.min(dw, dh) * 0.03) };
  const { butch, moon } = parts({ map, s, ph, geometry, glass });
  const markX = glass.x + glass.w * 0.06;
  const markY = glass.y + glass.h * 0.07;
  const mark = wordmarkBox(markX, markY, glass.w * 0.86, Math.min(glass.h * 0.3, butch.capTop - markY - glass.h * 0.05));
  const plaqueW = Math.min(dw, 560);
  const top = frame.y + frame.h + clamp(H * 0.022, 12, 26);
  return {
    mode: 'narrow', painted: true, W, H, view,
    glass, door: null,
    plaque: rect((W - plaqueW) / 2, top, plaqueW, H - top - clamp(H * 0.015, 8, 18)),
    wordmark: mark,
    butch, moon,
    pendant: null,
    poleGap: round(clamp(glass.w * 0.7, 260, 640)),
    frame,
  };
}

/** Where everything sits on a W × H screen (CSS px), for the painted carriage. */
export function paintedLayout(width, height, { plates = TITLE_PLATES, geometry = TITLE_GEOMETRY } = {}) {
  const W = Math.max(320, Math.round(width));
  const H = Math.max(320, Math.round(height));
  return wideLayout(W, H, plates, geometry) ?? narrowLayout(W, H, plates, geometry);
}
