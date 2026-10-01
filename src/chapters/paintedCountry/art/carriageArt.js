// Chapter 4 // THE PAINTED COUNTRY — the gallery car (Part I), drawn.
//
// The archive car the train can no longer render, as a draughtsman's
// interior: panelled wainscot, window frames with their curtains tied back,
// the luggage rack, the lamps, a stove at the cold end, a picture rail in
// the gallery. Pure decoration behind the level (carLayout.js is the level);
// it is drawn faint enough that nothing in it reads as something to stand on.
// Its washes (wood, curtains, brass, the lamp light) bloom in when the door
// opens: the car is finished by being seen.
//
// Also the vestibule door, as its own sheet (the scene fades it on opening).

import { HUE, INK, TAU, blob, handRect, hatch, pencil, rng, rule, scribble, wash, washBlob, washRect } from './pencilKit.js';
import { artLayers } from './countryArt.js';

// geometry: { w, h, ceilingY, rackY, wainscotY, floorY, windows: [{x,y,w,h}], skip: [{x0,x1}], stoveX, railFrom, railTo }
export function paintCarriage(geo) {
  const { w, h, ceilingY, rackY, wainscotY, floorY } = geo;
  const L = artLayers(w, h, { groups: ['red', 'orange', 'yellow', 'violet'], washScale: 0.5 });
  const { p } = L;
  const r = rng(0xca7);
  const skipped = (x) => (geo.skip ?? []).some(({ x0, x1 }) => x >= x0 && x <= x1);

  // the ceiling: tongue-and-groove boards, ribs, lamps
  for (let x = 12; x < w; x += 16) rule(p, x, 6, x - 1, ceilingY - 4, { w: 0.5, alpha: 0.22, overshoot: 0, passes: 1, seed: x });
  for (let x = 160; x < w; x += 320) {
    if (skipped(x)) continue;
    pencil(p, [[x - 4, ceilingY], [x - 4, ceilingY - 6], [x + 4, ceilingY - 6], [x + 4, ceilingY]], { smooth: false, w: 1, alpha: 0.7, seed: x + 1 });
    const lamp = blob(x, ceilingY + 12, 9, 7, { seed: x + 2, lobes: 8, irregular: 0.05 });
    pencil(p, lamp, { closed: true, w: 1, alpha: 0.75, seed: x + 3 });
    rule(p, x, ceilingY, x, ceilingY + 5, { w: 0.9, alpha: 0.7, overshoot: 0, seed: x + 4 });
    washBlob(L.w$('orange'), x, ceilingY + 12, 8, 6, HUE.lamp, { alpha: 0.95, seed: x + 5, bloom: 0 });
    washBlob(L.w$('orange'), x, ceilingY + 24, 60, 26, HUE.lamp, { alpha: 0.22, seed: x + 6, blur: 8, bloom: 0 });
  }
  // the luggage rack: a brass rail on brackets, netting hatched under it
  for (let x = 40; x < w - 20; x += 240) {
    if (skipped(x)) continue;
    pencil(p, [[x, ceilingY + 2], [x + 6, rackY - 2], [x + 18, rackY]], { w: 1.1, alpha: 0.7, seed: x + 10 });
    washRect(L.w$('yellow'), x, rackY - 2, 200, 4, '#b08a4a', { alpha: 0.5, seed: x + 11, bloom: 0 });
    hatch(p, handRect(x + 8, rackY - 12, 200, 10, { seed: x + 12, amp: 0.2 }), { spacing: 5, alpha: 0.18, angle: -0.7, cross: true, seed: x + 13 });
  }
  // windows: a moulded frame, a sill, curtains tied back
  geo.windows.forEach((win, i) => {
    const pad = 9;
    pencil(p, handRect(win.x - pad, win.y - pad, win.w + pad * 2, win.h + pad * 2, { seed: 30 + i, amp: 0.6 }), { closed: true, smooth: false, w: 1.3, alpha: 0.75, seed: 31 + i });
    washRect(L.w$('red'), win.x - pad, win.y - pad, win.w + pad * 2, pad, HUE.bark, { alpha: 0.55, seed: 32 + i, bloom: 0.2 });
    const sill = handRect(win.x - pad - 6, win.y + win.h + pad, win.w + pad * 2 + 12, 7, { seed: 33 + i, amp: 0.3 });
    pencil(p, sill, { closed: true, smooth: false, w: 1.2, alpha: 0.8, seed: 34 + i });
    wash(L.w$('red'), sill, HUE.bark, { alpha: 0.6, seed: 35 + i, bloom: 0.2 });
    // the sash bar
    rule(p, win.x, win.y + win.h * 0.32, win.x + win.w, win.y + win.h * 0.32, { w: 1.2, alpha: 0.7, overshoot: 0, seed: 36 + i });
    [[win.x - pad - 2, 1], [win.x + win.w + pad + 2, -1]].forEach(([x, d], k) => {
      const cur = [[x, win.y - pad - 4], [x + d * 26, win.y - pad - 4], [x + d * 14, win.y + win.h * 0.55], [x + d * 22, win.y + win.h + pad], [x, win.y + win.h + pad]];
      wash(L.w$('red'), cur, HUE.vermilion, { alpha: 0.7, seed: 40 + i * 2 + k, bloom: 0.35 });
      pencil(p, cur, { closed: true, w: 1.1, alpha: 0.8, seed: 42 + i * 2 + k });
      hatch(p, cur, { spacing: 3, angle: -1.48, alpha: 0.28, seed: 44 + i * 2 + k });
      // the tie-back
      rule(p, x, win.y + win.h * 0.55, x + d * 16, win.y + win.h * 0.55, { w: 1.4, alpha: 0.85, overshoot: 0, seed: 46 + i * 2 + k });
    });
  });
  // the wainscot: a dado rail and panels with their mouldings
  rule(p, 0, wainscotY + 6, w, wainscotY + 6, { w: 0.9, alpha: 0.5, overshoot: 0, seed: 60 });
  const panelW = 72;
  for (let x = 8; x < w - panelW; x += panelW + 10) {
    if (skipped(x) || skipped(x + panelW)) continue;
    const ph = floorY - wainscotY - 30;
    const panel = handRect(x, wainscotY + 16, panelW, ph, { seed: 61 + x, amp: 0.5 });
    pencil(p, panel, { closed: true, smooth: false, w: 0.9, alpha: 0.5, seed: 62 + x });
    pencil(p, handRect(x + 6, wainscotY + 22, panelW - 12, ph - 12, { seed: 63 + x, amp: 0.4 }), { closed: true, smooth: false, w: 0.7, alpha: 0.32, seed: 64 + x });
    wash(L.w$('red'), panel, HUE.bark, { alpha: 0.32, seed: 65 + x, bloom: 0.4 });
    hatch(p, handRect(x + panelW - 14, wainscotY + 18, 12, ph - 4, { seed: 66 + x, amp: 0.2 }), { spacing: 3.5, alpha: 0.15, seed: 67 + x });
  }
  // the picture rail in the gallery
  if (geo.railFrom !== undefined) {
    rule(p, geo.railFrom, rackY + 26, geo.railTo, rackY + 26, { w: 1.1, alpha: 0.55, seed: 80 });
    washRect(L.w$('yellow'), geo.railFrom, rackY + 24, geo.railTo - geo.railFrom, 4, '#b08a4a', { alpha: 0.5, seed: 81, bloom: 0 });
  }
  // the stove at the cold end: pot-bellied, its pipe up to the ceiling
  if (geo.stoveX !== undefined) {
    const sx = geo.stoveX;
    const body = blob(sx, floorY - 40, 24, 30, { seed: 90, lobes: 12, irregular: 0.04 });
    pencil(p, body, { closed: true, w: 1.3, alpha: 0.65, seed: 91 });
    hatch(p, body, { spacing: 3, alpha: 0.3, seed: 92 });
    pencil(p, [[sx - 5, floorY - 70], [sx - 5, ceilingY], [sx + 5, ceilingY], [sx + 5, floorY - 70]], { smooth: false, w: 1, alpha: 0.6, seed: 93 });
    pencil(p, handRect(sx - 9, floorY - 50, 18, 14, { seed: 94, amp: 0.3 }), { closed: true, smooth: false, w: 1, alpha: 0.6, seed: 95 });
    washRect(L.w$('orange'), sx - 9, floorY - 50, 18, 14, HUE.marigold, { alpha: 0.9, seed: 96, bloom: 0 });
    washBlob(L.w$('orange'), sx, floorY - 44, 50, 40, HUE.lamp, { alpha: 0.2, seed: 97, blur: 8, bloom: 0 });
    wash(L.w$('violet'), body, '#4a4640', { alpha: 0.35, seed: 98 });
    // the coal scuttle
    pencil(p, [[sx + 34, floorY], [sx + 30, floorY - 18], [sx + 52, floorY - 22], [sx + 54, floorY]], { smooth: false, w: 1, alpha: 0.6, seed: 99 });
    scribble(p, sx + 42, floorY - 20, 9, 3, { seed: 100, loops: 7, alpha: 0.5 });
  }
  void r; void INK; void TAU;
  return L.finish(0.4);
}

// The vestibule door: four fielded panels, a brass handle, a glazed top.
export function paintDoor(w, h) {
  const L = artLayers(w, h, { groups: ['red', 'yellow'], washScale: 1 });
  const { p } = L;
  const body = handRect(2, 2, w - 4, h - 4, { seed: 1, amp: 0.6 });
  wash(L.w$('red'), body, HUE.bark, { alpha: 0.4, seed: 2, bloom: 0.4 });
  pencil(p, body, { closed: true, smooth: false, w: 2.4, seed: 3 });
  const inset = 18;
  const glassH = h * 0.18;
  pencil(p, handRect(inset, inset - 6, w - inset * 2, glassH, { seed: 4, amp: 0.4 }), { closed: true, smooth: false, w: 1.3, alpha: 0.7, seed: 5 });
  hatch(p, handRect(inset, inset - 6, w - inset * 2, glassH, { seed: 6, amp: 0.2 }), { spacing: 9, alpha: 0.18, angle: -0.8, seed: 7 });
  // the fielded panels behind the signs, low-contrast
  const top = inset + glassH + 8;
  const ph = (h - top - inset) / 2 - 6;
  [0, 1].forEach((row) => [0, 1].forEach((col) => {
    const pw = (w - inset * 2) / 2 - 6;
    const x = inset + col * (pw + 12);
    const y = top + row * (ph + 12);
    pencil(p, handRect(x, y, pw, ph, { seed: 10 + row * 2 + col, amp: 0.4 }), { closed: true, smooth: false, w: 1, alpha: 0.42, seed: 20 + row * 2 + col });
  }));
  const hx = w - 16;
  const hy = h * 0.6;
  pencil(p, blob(hx, hy, 5, 5, { seed: 30, lobes: 8 }), { closed: true, w: 1.2, seed: 31 });
  washBlob(L.w$('yellow'), hx, hy, 5, 5, '#b08a4a', { alpha: 1, seed: 32, bloom: 0 });
  rule(p, hx - 12, hy, hx, hy, { w: 2, seed: 33, overshoot: 0 });
  return L.finish(0.35);
}
