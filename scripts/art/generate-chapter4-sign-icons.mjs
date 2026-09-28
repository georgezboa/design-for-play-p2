// Chapter 4 // THE PAINTED COUNTRY — original door-sign icons.
//
// Renders the five vestibule-door signs of docs/STORY_BIBLE.md — HAWTHORN
// (Mara's small mark, the answer), TICKET, LANTERN and APPLE (the three large
// marks, one per gallery plate) and ROSE (Rosa's own mark, the decoy) — as
// pencil-and-ink marks on the chapter's paper, entirely from code: no source
// image, font or third-party art is involved.
//
// Two files per sign:
//   sign-<id>.webp  the square door plate (paper, deckle, four screws);
//   mark-<id>.webp  the bare mark on a transparent ground, which the gallery
//                   plates in PaintedCountryScene compose under the archive's
//                   grey, so the door and the plates share one drawing.
// The hawthorn is flat and open (five round petals, thorns, two haws) and the
// rose is cupped and spiralled, so the decoy never reads as the answer.
//
// Usage: node scripts/art/generate-chapter4-sign-icons.mjs [--svg]
// Output: public/assets/chapter04/icons/{sign,mark}-<id>.webp

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const outDir = path.join(root, 'public/assets/chapter04/icons');
const writeSvg = process.argv.includes('--svg');

// Colours from src/chapters/paintedCountry/paperPalette.js.
const C = {
  sheetHigh: '#fdfcf8',
  sheet: '#f7f4ec',
  sheetMid: '#efe9dc',
  fold: '#d8cfb9',
  deckle: '#c9bda3',
  graphite: '#4a4640',
  graphiteSoft: '#8d8579',
  graphiteFaint: '#b7af9f',
  boneBlack: '#2c2823',
  bookCloth: '#cc785c',
  cyan: '#2f8c9e',
  indigo: '#46618c',
};

// Deterministic PRNG so the icons are reproducible byte-for-byte.
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const f = (n) => Number(n.toFixed(2));

// Sample a parametric curve and wobble it with two low-frequency sines, the way
// a hand-held pencil drifts. Returns an SVG path "d".
function sketch(pointAt, { samples = 64, wobble = 1.6, seed = 1, closed = false } = {}) {
  const r = rng(seed);
  const p1 = r() * Math.PI * 2;
  const p2 = r() * Math.PI * 2;
  const k1 = 2 + Math.floor(r() * 3);
  const k2 = 5 + Math.floor(r() * 4);
  const pts = [];
  for (let i = 0; i <= samples; i += 1) {
    const t = i / samples;
    const [x, y] = pointAt(t);
    const d = wobble * (Math.sin(t * Math.PI * k1 + p1) * 0.7 + Math.sin(t * Math.PI * k2 + p2) * 0.3);
    const [x2, y2] = pointAt(Math.min(1, t + 1e-3));
    const nx = -(y2 - y);
    const ny = x2 - x;
    const len = Math.hypot(nx, ny) || 1;
    pts.push([x + (nx / len) * d, y + (ny / len) * d]);
  }
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 1; i < pts.length; i += 1) d += ` L${f(pts[i][0])} ${f(pts[i][1])}`;
  return closed ? `${d} Z` : d;
}

const line = (x1, y1, x2, y2, overshoot = 0) => (t) => {
  const s = -overshoot + t * (1 + overshoot * 2);
  return [x1 + (x2 - x1) * s, y1 + (y2 - y1) * s];
};
const ellipse = (cx, cy, rx, ry, a0 = 0, sweep = Math.PI * 2) => (t) => [
  cx + Math.cos(a0 + t * sweep) * rx,
  cy + Math.sin(a0 + t * sweep) * ry,
];
const polyline = (points) => {
  const segs = [];
  let total = 0;
  for (let i = 1; i < points.length; i += 1) {
    const l = Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
    segs.push(l);
    total += l;
  }
  return (t) => {
    let dist = t * total;
    for (let i = 0; i < segs.length; i += 1) {
      if (dist <= segs[i] || i === segs.length - 1) {
        const u = segs[i] ? Math.min(1, dist / segs[i]) : 0;
        return [
          points[i][0] + (points[i + 1][0] - points[i][0]) * u,
          points[i][1] + (points[i + 1][1] - points[i][1]) * u,
        ];
      }
      dist -= segs[i];
    }
    return points[points.length - 1];
  };
};

// One mark = a faint overshooting construction pass, a soft graphite pass and
// a confident ink pass, each with its own wobble.
function stroke(curve, { width = 14, color = C.graphite, seed = 1, closed = false, samples = 72, construction = true } = {}) {
  const parts = [];
  if (construction) {
    parts.push(`<path d="${sketch(curve, { samples, wobble: 3.2, seed: seed + 101, closed })}" fill="none" stroke="${C.graphiteFaint}" stroke-width="${f(width * 0.22)}" stroke-linecap="round" stroke-linejoin="round" opacity="0.75"/>`);
  }
  parts.push(`<path d="${sketch(curve, { samples, wobble: 2.2, seed: seed + 202, closed })}" fill="none" stroke="${C.graphiteSoft}" stroke-width="${f(width * 1.18)}" stroke-linecap="round" stroke-linejoin="round" opacity="0.35"/>`);
  parts.push(`<path d="${sketch(curve, { samples, wobble: 1.1, seed: seed + 303, closed })}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" filter="url(#ink)"/>`);
  return parts.join('\n');
}

function blot(curve, { color, seed = 1, opacity = 0.92 } = {}) {
  return `<path d="${sketch(curve, { samples: 60, wobble: 1.4, seed, closed: true })}" fill="${color}" opacity="${opacity}" filter="url(#ink)"/>`;
}

// Hatching clipped to a shape: the graphite shading a draughtsman adds last.
function hatch(clipId, clipD, { size, spacing = 11, angle = -38, seed = 1, color = C.graphiteSoft, opacity = 0.55 } = {}) {
  const r = rng(seed);
  const lines = [];
  const reach = size * 1.6;
  for (let o = -reach; o <= reach; o += spacing) {
    const j = (r() - 0.5) * 3;
    lines.push(`M${f(-reach)} ${f(o + j)} L${f(reach)} ${f(o - j)}`);
  }
  return `<clipPath id="${clipId}"><path d="${clipD}"/></clipPath>
<g clip-path="url(#${clipId})"><path d="${lines.join(' ')}" transform="translate(${size / 2} ${size / 2}) rotate(${angle})" stroke="${color}" stroke-width="2.2" stroke-linecap="round" opacity="${opacity}"/></g>`;
}

// ------------------------------------------------------------------ the marks
// Every glyph is authored in a 400 x 400 box and scaled to the target size.
const S = 400;
const CX = 200;
const CY = 188; // a little high: the door prints a small label along the bottom

// Extra accents for the Chapter 4 set (docs/STORY_BIBLE.md): the apple red
// and the rose pink sit next to the palette's warm book cloth.
const APPLE_RED = '#b4453a';
const ROSE_PINK = '#c46a7a';
const AMBER = '#c8892f';

const GLYPHS = {
  // THE SHARED SMALL MARK — Mara's hawthorn: a thorny twig, one flat
  // five-petal blossom and two haws. Deliberately flat and open, so it can
  // never be mistaken for Rosa's cupped, spiralled rose.
  hawthorn: () => {
    const twig = polyline([[CX - 150, CY + 120], [CX - 60, CY + 60], [CX + 20, CY + 30], [CX + 130, CY - 40]]);
    const thorns = [[CX - 100, CY + 88, CX - 118, CY + 44], [CX - 20, CY + 46, CX - 16, CY + 2], [CX + 70, CY - 8, CX + 104, CY + 20]];
    const bx = CX - 10;
    const by = CY - 70;
    const petals = Array.from({ length: 5 }, (_, i) => {
      const a = -Math.PI / 2 + (i * Math.PI * 2) / 5;
      const px = bx + Math.cos(a) * 44;
      const py = by + Math.sin(a) * 44;
      return [
        blot(ellipse(px, py, 30, 30), { color: C.sheetHigh, seed: 110 + i, opacity: 1 }),
        stroke(ellipse(px, py, 30, 30), { width: 6, color: C.graphite, seed: 120 + i, closed: true, samples: 40, construction: false }),
      ].join('\n');
    });
    const stamens = Array.from({ length: 7 }, (_, i) => {
      const a = (i * Math.PI * 2) / 7;
      return `<circle cx="${f(bx + Math.cos(a) * 16)}" cy="${f(by + Math.sin(a) * 16)}" r="5" fill="${APPLE_RED}"/>`;
    });
    const leaf = (t) => {
      const a = t * Math.PI * 2;
      const lobes = 1 + 0.18 * Math.sin(a * 3);
      return [CX + 96 + Math.cos(a) * 44 * lobes, CY + 70 + Math.sin(a) * 26 * lobes];
    };
    return [
      stroke(twig, { width: 13, color: C.graphite, seed: 101, samples: 80 }),
      ...thorns.map(([x1, y1, x2, y2], i) => stroke(line(x1, y1, x2, y2), { width: 7, color: C.graphite, seed: 104 + i, samples: 8, construction: false })),
      stroke(line(bx + 10, by + 40, CX + 20, CY + 30), { width: 7, color: C.graphite, seed: 108, samples: 10, construction: false }),
      blot(leaf, { color: '#7a9a62', seed: 109, opacity: 0.85 }),
      stroke(leaf, { width: 7, color: C.graphite, seed: 130, closed: true, samples: 60 }),
      ...petals,
      ...stamens,
      blot(ellipse(CX + 118, CY - 72, 17, 17), { color: APPLE_RED, seed: 140 }),
      blot(ellipse(CX + 144, CY - 52, 15, 15), { color: APPLE_RED, seed: 141 }),
      stroke(ellipse(CX + 118, CY - 72, 17, 17), { width: 4, color: C.graphite, seed: 142, closed: true, samples: 30, construction: false }),
      stroke(ellipse(CX + 144, CY - 52, 15, 15), { width: 4, color: C.graphite, seed: 143, closed: true, samples: 30, construction: false }),
    ].join('\n');
  },

  // 1978 · CITY ROOM: the early-shift ticket, notched and punched once.
  ticket: () => {
    const x0 = CX - 150;
    const y0 = CY - 84;
    const w = 300;
    const h = 168;
    const outline = polyline([
      [x0 + 18, y0], [x0 + w - 18, y0], [x0 + w, y0 + 18], [x0 + w, y0 + h / 2 - 16],
      [x0 + w - 14, y0 + h / 2], [x0 + w, y0 + h / 2 + 16], [x0 + w, y0 + h - 18], [x0 + w - 18, y0 + h],
      [x0 + 18, y0 + h], [x0, y0 + h - 18], [x0, y0 + h / 2 + 16], [x0 + 14, y0 + h / 2],
      [x0, y0 + h / 2 - 16], [x0, y0 + 18], [x0 + 18, y0],
    ]);
    const body = `M${x0} ${y0} H${x0 + w} V${y0 + h} H${x0} Z`;
    return [
      `<path d="${body}" fill="${C.sheetHigh}" opacity="0.9"/>`,
      `<rect x="${x0 + 6}" y="${y0 + 6}" width="${w - 12}" height="34" fill="${C.bookCloth}" opacity="0.82" filter="url(#ink)"/>`,
      hatch('ticketHatch', body, { size: S, spacing: 14, angle: -20, seed: 201, opacity: 0.18 }),
      stroke(outline, { width: 11, color: C.graphite, seed: 202, samples: 140, closed: true }),
      // perforation
      ...Array.from({ length: 7 }, (_, i) => `<circle cx="${x0 + 214}" cy="${f(y0 + 56 + i * 16)}" r="3.6" fill="${C.graphite}" opacity="0.8"/>`),
      // printed lines
      ...[70, 96, 122].map((y, i) => stroke(line(x0 + 30, y0 + y, x0 + 170 - i * 26, y0 + y), { width: 7, color: C.graphiteSoft, seed: 210 + i, samples: 10, construction: false })),
      // the punch
      blot(ellipse(x0 + 256, y0 + 104, 20, 20), { color: C.boneBlack, seed: 220, opacity: 0.95 }),
      stroke(ellipse(x0 + 256, y0 + 104, 20, 20), { width: 4, color: C.graphite, seed: 221, closed: true, samples: 30, construction: false }),
    ].join('\n');
  },

  // BELLWETHER ORCHARD: the porch lantern, lit.
  lantern: () => {
    const cap = polyline([[CX - 70, CY - 70], [CX - 36, CY - 118], [CX + 36, CY - 118], [CX + 70, CY - 70], [CX - 70, CY - 70]]);
    const glass = `M${CX - 58} ${CY - 70} H${CX + 58} V${CY + 96} H${CX - 58} Z`;
    return [
      stroke(ellipse(CX, CY - 142, 20, 20), { width: 8, color: C.graphite, seed: 301, closed: true, samples: 40 }),
      `<clipPath id="lanternClip"><path d="${glass}"/></clipPath>`,
      `<g clip-path="url(#lanternClip)">${blot(ellipse(CX, CY + 20, 70, 110), { color: '#f3dca4', seed: 302, opacity: 0.9 })}</g>`,
      blot((t) => {
        const a = t * Math.PI * 2;
        return [CX + Math.sin(a) * 22 * (1 - Math.cos(a) * 0.1), CY + 24 - Math.cos(a) * 44 + (Math.cos(a) > 0 ? 0 : 0)];
      }, { color: AMBER, seed: 303 }),
      blot(ellipse(CX, CY + 36, 10, 16), { color: '#f7e7b8', seed: 304 }),
      hatch('lanternHatch', glass, { size: S, spacing: 12, angle: 60, seed: 305, opacity: 0.22 }),
      stroke(cap, { width: 11, color: C.graphite, seed: 306, samples: 80, closed: true }),
      stroke(polyline([[CX - 58, CY - 70], [CX + 58, CY - 70], [CX + 58, CY + 96], [CX - 58, CY + 96], [CX - 58, CY - 70]]), { width: 11, color: C.graphite, seed: 307, samples: 100, closed: true }),
      stroke(line(CX, CY - 70, CX, CY + 96), { width: 5, color: C.graphiteSoft, seed: 308, samples: 12, construction: false }),
      stroke(polyline([[CX - 80, CY + 96], [CX + 80, CY + 96], [CX + 64, CY + 122], [CX - 64, CY + 122], [CX - 80, CY + 96]]), { width: 10, color: C.graphite, seed: 309, samples: 60, closed: true }),
    ].join('\n');
  },

  // ROSA'S DRAWING: a big round orchard apple, the way a child draws one.
  apple: () => {
    const body = (t) => {
      const a = t * Math.PI * 2 - Math.PI / 2;
      const r = 118 * (1 - 0.22 * Math.max(0, Math.cos(a + Math.PI / 2)) ** 6) * (1 + 0.05 * Math.sin(a * 2));
      return [CX + Math.cos(a) * r * 1.02, CY + 30 + Math.sin(a) * r * 0.94];
    };
    const pts = Array.from({ length: 73 }, (_, i) => body(i / 72));
    const d = `M${pts.map(([x, y]) => `${f(x)} ${f(y)}`).join(' L')} Z`;
    const leaf = `M${CX + 8} ${CY - 92} Q${CX + 70} ${CY - 150} ${CX + 118} ${CY - 112} Q${CX + 62} ${CY - 72} ${CX + 8} ${CY - 92} Z`;
    return [
      `<clipPath id="appleClip"><path d="${d}"/></clipPath>`,
      `<g clip-path="url(#appleClip)">${blot(ellipse(CX, CY + 30, 130, 120), { color: APPLE_RED, seed: 401, opacity: 0.86 })}</g>`,
      hatch('appleHatch', d, { size: S, spacing: 10, angle: -40, seed: 402, color: C.boneBlack, opacity: 0.22 }),
      `<ellipse cx="${CX - 44}" cy="${CY - 14}" rx="18" ry="30" fill="${C.sheetHigh}" opacity="0.7" transform="rotate(-24 ${CX - 44} ${CY - 14})"/>`,
      stroke(body, { width: 12, color: C.graphite, seed: 403, closed: true, samples: 90 }),
      stroke(polyline([[CX - 4, CY - 72], [CX + 2, CY - 110], [CX + 14, CY - 138]]), { width: 11, color: C.graphite, seed: 404, samples: 16 }),
      `<path d="${leaf}" fill="#7a9a62" opacity="0.85" filter="url(#ink)"/>`,
      stroke((t) => {
        const a = t;
        return [CX + 8 + a * 110, CY - 92 - Math.sin(a * Math.PI) * 30];
      }, { width: 7, color: C.graphite, seed: 405, samples: 20 }),
    ].join('\n');
  },

  // THE DECOY — Rosa's own mark: a cupped rose in a spiral, on a stem.
  rose: () => {
    const spiral = (t) => {
      const a = t * Math.PI * 2 * 2.4;
      const r = 6 + t * 58;
      return [CX + Math.cos(a) * r, CY - 34 + Math.sin(a) * r * 0.82];
    };
    const cup = (t) => {
      const a = Math.PI * (0.05 + t * 0.9);
      return [CX + Math.cos(a) * 70, CY - 30 + Math.sin(a) * 60];
    };
    const stem = polyline([[CX, CY + 50], [CX - 6, CY + 110], [CX + 4, CY + 170]]);
    // Five overlapping petals round the cup: a scalloped edge, not a disc.
    const bloom = (t) => {
      const a = t * Math.PI * 2;
      const r = 84 + 16 * Math.abs(Math.sin(a * 2.5));
      return [CX + Math.cos(a) * r, CY - 30 + Math.sin(a) * r * 0.86];
    };
    const bloomPts = Array.from({ length: 91 }, (_, i) => bloom(i / 90));
    const bloomD = `M${bloomPts.map(([x, y]) => `${f(x)} ${f(y)}`).join(' L')} Z`;
    const leaf = `M${CX - 2} ${CY + 118} Q${CX - 70} ${CY + 80} ${CX - 104} ${CY + 118} Q${CX - 56} ${CY + 150} ${CX - 2} ${CY + 118} Z`;
    return [
      blot(bloom, { color: ROSE_PINK, seed: 501, opacity: 0.8 }),
      hatch('roseHatch', bloomD, { size: S, spacing: 9, angle: 45, seed: 502, color: C.boneBlack, opacity: 0.2 }),
      stroke(bloom, { width: 10, color: C.graphite, seed: 509, closed: true, samples: 120 }),
      stroke(spiral, { width: 8, color: C.graphite, seed: 503, samples: 140 }),
      stroke(cup, { width: 9, color: C.graphite, seed: 504, samples: 60 }),
      stroke(stem, { width: 11, color: C.graphite, seed: 505, samples: 40 }),
      `<path d="${leaf}" fill="#7a9a62" opacity="0.8" filter="url(#ink)"/>`,
      stroke(line(CX - 4, CY + 118, CX - 96, CY + 118), { width: 5, color: C.graphite, seed: 506, samples: 12, construction: false }),
      ...[[CX + 6, CY + 84, CX + 26, CY + 74], [CX - 4, CY + 150, CX - 24, CY + 142]].map(([x1, y1, x2, y2], i) => stroke(line(x1, y1, x2, y2), { width: 5, color: C.graphite, seed: 507 + i, samples: 6, construction: false })),
    ].join('\n');
  },
};

// The plate the sign is cut into: warm paper, a faint deckled border and a
// soft fold shadow, matching the door face it is screwed to.
function plate(seed) {
  const r = rng(seed);
  const edge = polyline([[14, 16], [S - 15, 13], [S - 13, S - 15], [16, S - 13], [14, 16]]);
  const screws = [[34, 34], [S - 34, 34], [S - 34, S - 34], [34, S - 34]].map(([x, y]) => {
    const a = r() * Math.PI;
    return `<circle cx="${x}" cy="${y}" r="9" fill="${C.sheetMid}" stroke="${C.graphiteSoft}" stroke-width="2.4"/>
<path d="M${f(x - Math.cos(a) * 6)} ${f(y - Math.sin(a) * 6)} L${f(x + Math.cos(a) * 6)} ${f(y + Math.sin(a) * 6)}" stroke="${C.graphiteSoft}" stroke-width="2.4" stroke-linecap="round"/>`;
  });
  return [
    `<rect width="${S}" height="${S}" fill="${C.sheet}"/>`,
    `<rect width="${S}" height="${S}" fill="${C.graphiteSoft}" filter="url(#grain)" opacity="0.16"/>`,
    `<rect x="6" y="6" width="${S - 12}" height="${S - 12}" fill="none" stroke="${C.fold}" stroke-width="10" opacity="0.6"/>`,
    stroke(edge, { width: 3, color: C.deckle, seed: seed + 1, samples: 120, construction: false }),
    ...screws,
  ].join('\n');
}

const DEFS = `<defs>
<filter id="grain" x="0" y="0" width="100%" height="100%">
  <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" seed="7" result="n"/>
  <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.4 1.05" in="n"/>
</filter>
<filter id="ink" x="-10%" y="-10%" width="120%" height="120%">
  <feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="2" seed="3" result="w"/>
  <feDisplacementMap in="SourceGraphic" in2="w" scale="3.2" xChannelSelector="R" yChannelSelector="G"/>
</filter>
</defs>`;

// Door plates (square, on paper, with screws) and the bare marks the gallery
// plates are composed from (transparent, no plate), one of each per sign.
export const SIGN_ICONS = [
  { id: 'hawthorn', seed: 101, glyphScale: 0.84 },
  { id: 'ticket', seed: 202, glyphScale: 0.82 },
  { id: 'lantern', seed: 303, glyphScale: 0.8 },
  { id: 'apple', seed: 404, glyphScale: 0.84 },
  { id: 'rose', seed: 505, glyphScale: 0.82 },
];
const PLATE_SIZE = 256;
const MARK_SIZE = 256;

function svgFor(icon, { bare = false } = {}) {
  const size = bare ? MARK_SIZE : PLATE_SIZE;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${S} ${S}">
${DEFS}
${bare ? '' : plate(icon.seed)}
<g transform="translate(${CX} ${S / 2}) scale(${bare ? 0.98 : icon.glyphScale ?? 0.86}) translate(${-CX} ${-S / 2})">
${GLYPHS[icon.id]()}
</g>
</svg>`;
}

await fs.mkdir(outDir, { recursive: true });
for (const icon of SIGN_ICONS) {
  for (const bare of [false, true]) {
    const file = `${bare ? 'mark' : 'sign'}-${icon.id}.webp`;
    const svg = svgFor(icon, { bare });
    if (writeSvg) await fs.writeFile(path.join(outDir, file.replace(/\.webp$/, '.svg')), svg);
    let image = sharp(Buffer.from(svg), { density: 96 }).resize(bare ? MARK_SIZE : PLATE_SIZE, bare ? MARK_SIZE : PLATE_SIZE, { fit: 'fill' });
    image = bare ? image : image.flatten({ background: C.sheet });
    await image.webp({ quality: 90, alphaQuality: 90, effort: 6 }).toFile(path.join(outDir, file));
    const { size } = await fs.stat(path.join(outDir, file));
    console.log(`[chapter4-icons] ${file} ${size} bytes`);
  }
}
