// Chapter 4 // THE PAINTED COUNTRY — the three gallery plates, drawn.
//
// Each plate (carLayout.js PAINTINGS) is a pencil drawing with its marks laid
// in at the cells carLayout gives them, plus a separate wash that blooms in
// when the plate comes clear (the "developed" moment). The archive's grey is
// still drawn over it cell by cell by the scene, never baked in, so washing
// reveals exactly this drawing.

import { HUE, INK, TAU, blob, handRect, hatch, makeCanvas, paperBase, pencil, rng, rule, scribble, tooth, wash, washBlob, washRect } from './pencilKit.js';
import { appleTree, artLayers, fence, house } from './countryArt.js';

export const PLATE_SIZE = Object.freeze({ w: 480, h: 280 });

function city(L) {
  const { p } = L;
  const r = rng(0xc17);
  // the window on the terminal: rain, the clock across the street, the roofs
  const win = handRect(292, 20, 164, 120, { seed: 1, amp: 0.8 });
  wash(L.w$('blue'), win, '#3f5878', { alpha: 0.75, seed: 2, bloom: 0.4 });
  washBlob(L.w$('orange'), 340, 52, 22, 22, HUE.lamp, { alpha: 0.7, seed: 3, blur: 3 });
  pencil(p, win, { closed: true, smooth: false, w: 2.2, seed: 4 });
  pencil(p, handRect(286, 14, 176, 132, { seed: 5, amp: 0.8 }), { closed: true, smooth: false, w: 1.2, alpha: 0.6, seed: 6 });
  rule(p, 374, 20, 374, 140, { w: 1.6, seed: 7, overshoot: 0 });
  rule(p, 292, 80, 456, 80, { w: 1.6, seed: 8, overshoot: 0 });
  // terminal roofline and clock
  pencil(p, [[296, 132], [312, 108], [338, 108], [350, 96], [370, 96], [370, 132]], { smooth: false, w: 1.1, alpha: 0.7, seed: 9 });
  pencil(p, blob(340, 52, 13, 13, { seed: 10, lobes: 10, irregular: 0.04 }), { closed: true, w: 1.3, seed: 11 });
  rule(p, 340, 52, 340, 43, { w: 1.2, overshoot: 0, seed: 12 });
  rule(p, 340, 52, 347, 55, { w: 1.2, overshoot: 0, seed: 13 });
  for (let i = 0; i < 26; i += 1) { const x = 296 + r() * 156; const y = 24 + r() * 108; rule(p, x, y, x - 3, y + 10, { w: 0.7, alpha: 0.45, overshoot: 0, seed: 20 + i, passes: 1 }); }
  // curtains
  [[284, 1], [464, -1]].forEach(([x, d], i) => {
    const cur = [[x, 12], [x + d * 16, 12], [x + d * 10, 90], [x + d * 18, 150], [x, 150]];
    wash(L.w$('red'), cur, HUE.vermilion, { alpha: 0.55, seed: 30 + i });
    pencil(p, cur, { closed: true, w: 1.3, seed: 32 + i });
    hatch(p, cur, { spacing: 3, angle: -1.45, alpha: 0.3, seed: 34 + i });
  });
  // the narrow bed and its blanket
  const blanket = [[24, 226], [246, 226], [252, 262], [20, 262]];
  wash(L.w$('violet'), blanket, HUE.mulberry, { alpha: 0.6, seed: 40 });
  pencil(p, [[20, 200], [20, 272]], { smooth: false, w: 2, seed: 41 });
  pencil(p, [[250, 214], [250, 272]], { smooth: false, w: 2, seed: 42 });
  pencil(p, blanket, { closed: true, smooth: false, w: 1.6, seed: 43 });
  const pillow = blob(52, 218, 24, 9, { seed: 44, lobes: 8, irregular: 0.15 });
  wash(L.w$('yellow'), pillow, HUE.plaster, { alpha: 0.7, seed: 45 });
  pencil(p, pillow, { closed: true, w: 1.3, seed: 46 });
  hatch(p, blanket, { spacing: 6, alpha: 0.25, seed: 47 });
  // nightstand with a lamp
  const stand = handRect(272, 200, 64, 70, { seed: 48, amp: 0.6 });
  wash(L.w$('red'), stand, HUE.bark, { alpha: 0.5, seed: 49 });
  pencil(p, stand, { closed: true, smooth: false, w: 1.6, seed: 50 });
  rule(p, 272, 228, 336, 228, { w: 1.2, seed: 51, overshoot: 0 });
  pencil(p, [[292, 200], [298, 176], [314, 176], [320, 200]], { smooth: false, w: 1.3, seed: 52 });
  washBlob(L.w$('orange'), 306, 186, 26, 20, HUE.lamp, { alpha: 0.6, seed: 53, blur: 4 });
  // floorboards
  [258, 270].forEach((y, i) => rule(p, 350, y, 474, y, { w: 1, alpha: 0.6, seed: 60 + i }));
  wash(L.w$('yellow'), [[0, 0], [480, 0], [480, 280], [0, 280]], HUE.plaster, { alpha: 0.18, seed: 70, bloom: 0.5 });
}

function orchard(L) {
  const { p } = L;
  // sky and the hill behind
  washRect(L.w$('blue'), 0, 0, 480, 120, HUE.sky, { alpha: 0.4, seed: 1, bloom: 0.5 });
  const hill = [[0, 150], [120, 120], [260, 132], [400, 112], [480, 126], [480, 280], [0, 280]];
  // the grass stops at the house walls
  [[[0, 150], [120, 120], [124, 120], [124, 280], [0, 280]], [[392, 116], [400, 112], [480, 126], [480, 280], [392, 280]], [[124, 240], [392, 240], [392, 280], [124, 280]]]
    .forEach((piece, i) => wash(L.w$('green'), piece, HUE.leaf, { alpha: 0.45, seed: 2 + i * 7 }));
  pencil(p, hill.slice(0, 5), { w: 1.2, alpha: 0.6, seed: 3 });
  // the orchard house from the gate, porch lantern lit
  house(L, 130, 240, 260, 120, 0x0c4, { roofH: 70, lit: true, porchLamp: true });
  appleTree(L, 46, 268, 1.05, 0x0c5, { apples: 8 });
  appleTree(L, 446, 262, 0.95, 0x0c6, { apples: 7 });
  // the path to the gate
  const path = [[236, 240], [292, 240], [340, 280], [190, 280]];
  wash(L.w$('yellow'), path, HUE.field, { alpha: 0.7, seed: 7 });
  pencil(p, [[236, 240], [190, 280]], { w: 1.2, alpha: 0.8, seed: 8 });
  pencil(p, [[292, 240], [340, 280]], { w: 1.2, alpha: 0.8, seed: 9 });
  fence(L, 10, 180, 266, 22, 0x0ca);
  fence(L, 350, 470, 266, 22, 0x0cb);
}

function drawing(L) {
  // A nine-year-old's crayon: a sun in the corner, lollipop trees, a green
  // ground line, and a tall figure walking up the path, back turned: "my
  // sister coming home".
  const { p } = L;
  const crayon = (pts, color, w, seed, alpha = 0.8) => pencil(p, pts, { w, color, alpha, seed, jitter: 1.4, passes: 3 });
  washBlob(L.w$('yellow'), 452, 26, 30, 30, HUE.ochre, { alpha: 0.75, seed: 1 });
  for (let i = 0; i < 9; i += 1) {
    const a = Math.PI * 0.5 + (i / 8) * Math.PI * 0.5;
    crayon([[452 + Math.cos(a) * 38, 26 + Math.sin(a) * 38], [452 + Math.cos(a) * 56, 26 + Math.sin(a) * 56]], '#c8892f', 2.6, 2 + i);
  }
  crayon(blob(452, 26, 30, 30, { seed: 12, lobes: 8, irregular: 0.12 }), '#c8892f', 2.4, 13);
  washRect(L.w$('blue'), 0, 0, 400, 70, HUE.sky, { alpha: 0.45, seed: 14, bloom: 0.6 });
  const ground = [[0, 262], [120, 258], [260, 263], [480, 255]];
  crayon(ground, '#5e8a52', 3.4, 15);
  wash(L.w$('green'), [...ground, [480, 280], [0, 280]], HUE.leaf, { alpha: 0.6, seed: 16 });
  [[250, 150], [330, 170], [420, 150]].forEach(([x, y], i) => {
    const crown = blob(x, y - 40, 34, 34, { seed: 20 + i, lobes: 8, irregular: 0.15 });
    wash(L.w$('green'), crown, HUE.leaf, { alpha: 0.7, seed: 21 + i });
    crayon(crown, INK.graphite, 2.2, 22 + i, 0.6);
    crayon([[x, y - 6], [x + 1, 258]], '#8a6a4a', 4, 25 + i, 0.7);
    const r = rng(30 + i);
    for (let k = 0; k < 4; k += 1) washBlob(L.w$('red'), x - 18 + r() * 36, y - 58 + r() * 34, 5, 5, HUE.vermilion, { alpha: 0.9, seed: 40 + i * 5 + k, bloom: 0 });
  });
  // "my sister coming home"
  const fx = 300;
  crayon(blob(fx, 196, 9, 9, { seed: 60, lobes: 7, irregular: 0.1 }), INK.graphite, 2.4, 61);
  const coat = [[fx - 10, 208], [fx + 10, 208], [fx + 13, 240], [fx - 13, 240]];
  wash(L.w$('violet'), coat, '#3b3a48', { alpha: 0.7, seed: 62 });
  crayon(coat, INK.graphite, 2.2, 63);
  crayon([[fx - 4, 240], [fx - 8, 256]], INK.graphite, 2.2, 64);
  crayon([[fx + 4, 240], [fx + 8, 256]], INK.graphite, 2.2, 65);
  // Rosa's path, scribbled in
  scribble(p, 220, 268, 60, 8, { seed: 66, loops: 22, w: 1.4, alpha: 0.35 });
}

const SCENES = { city, orchard, drawing };

// plate: a carLayout PAINTINGS entry. marks: { sign: canvas } (marksArt).
// cell: the plate's wash-cell size in px.
export function paintPlate(plate, marks, cell) {
  const { w, h } = PLATE_SIZE;
  const L = artLayers(w, h, { washScale: 1 });
  const ground = makeCanvas(w, h);
  const g = ground.getContext('2d');
  paperBase(g, 0, 0, w, h, { tone: INK.sheetHigh, seed: plate.id.length * 7, mottle: 0.04 });
  // the ruled guide lines the child drew first
  const r = rng(0x9b1e + plate.id.length * 31);
  g.save(); g.strokeStyle = INK.faint; g.globalAlpha = 0.25; g.lineWidth = 1;
  for (let y = 22; y < h; y += 26) { g.beginPath(); g.moveTo(10, y); g.lineTo(w - 10, y + (r() - 0.5) * 3); g.stroke(); }
  g.restore();
  SCENES[plate.scene]?.(L);
  L.finish(0.32);
  const compose = (painted) => {
    const out = makeCanvas(w, h);
    const c = out.getContext('2d');
    c.drawImage(ground, 0, 0);
    if (painted) Object.values(L.washes).forEach(({ canvas }) => c.drawImage(canvas, 0, 0));
    c.drawImage(L.pencil, 0, 0);
    placeMarks(c);
    return out;
  };
  const placeMarks = (c) => {
  const place = (sign, rect, inset = 0) => {
    if (!rect || !marks[sign]) return;
    const size = Math.min(rect.w, rect.h) * cell - inset * 2;
    const cx = (rect.c + rect.w / 2) * cell;
    const cy = (rect.r + rect.h / 2) * cell;
    // a little paper ground under each mark so it reads over the drawing
    c.save(); c.globalAlpha = 0.5; c.fillStyle = INK.sheetHigh; c.filter = 'blur(4px)';
    c.beginPath(); c.ellipse(cx, cy, size * 0.4, size * 0.4, 0, 0, TAU); c.fill(); c.restore();
    c.drawImage(marks[sign], cx - size / 2, cy - size / 2, size, size);
  };
  place(plate.primarySign, plate.markRect, 2);
  place(plate.sharedSign, plate.hawthornRect, 1);
  if (plate.roseRect) place('rose', plate.roseRect, 3);
  };
  // pencil: what the wash reveals under the grey; painted: the plate once it
  // has come clear and Rosa's colour blooms back in.
  return { pencil: compose(false), painted: compose(true) };
}
