// Chapter 4 // THE PAINTED COUNTRY — original door-sign icons.
//
// Renders the five vestibule-door signs (moon, eye, heir, rapture, oedon) as
// pencil-and-ink marks on the chapter's paper, entirely from code: no source
// image, font or third-party art is involved. The large marks deliberately
// echo the procedural archive plates in PaintedCountryScene.buildArchiveSymbol
// Textures() (eye = eye and pupil, heir = crowned head and shoulders, rapture =
// drop inside a burst, moon = the small crescent seal), so the gallery clue
// reads against the door. "oedon" is the distractor and gets a silhouette
// nothing in the gallery uses (an open spiral).
//
// Usage: node scripts/art/generate-chapter4-sign-icons.mjs
// Output: public/assets/chapter04/icons/sign-<id>.webp (+ .svg next to this
// script's output when --svg is passed, for review).

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

const GLYPHS = {
  // The small seal from every archive picture: a ring with a crescent.
  moon: () => {
    const ringR = 118;
    const outer = ellipse(CX, CY, 84, 84);
    const bite = ellipse(CX + 38, CY - 26, 70, 70);
    const crescentClip = `M${CX - 84} ${CY} a84 84 0 1 0 168 0 a84 84 0 1 0 -168 0 Z`;
    return [
      `<mask id="crescent"><path d="${crescentClip}" fill="#fff"/><circle cx="${CX + 38}" cy="${CY - 26}" r="70" fill="#000"/></mask>`,
      `<g mask="url(#crescent)">${blot(outer, { color: C.graphite, seed: 11 })}${hatch('moonHatch', crescentClip, { size: S, spacing: 9, angle: 52, seed: 12, color: C.boneBlack, opacity: 0.35 })}</g>`,
      stroke(ellipse(CX, CY, ringR, ringR), { width: 12, color: C.graphite, seed: 13, closed: true, samples: 96 }),
      stroke(bite, { width: 2.5, color: C.graphiteFaint, seed: 14, closed: true, construction: false }).replace('filter="url(#ink)"', 'opacity="0.6"'),
      // tick marks round the ring, like an accession stamp
      ...Array.from({ length: 12 }, (_, i) => {
        const a = (Math.PI * 2 * i) / 12;
        return stroke(line(CX + Math.cos(a) * (ringR + 16), CY + Math.sin(a) * (ringR + 16), CX + Math.cos(a) * (ringR + 30), CY + Math.sin(a) * (ringR + 30)), { width: 5, color: C.graphiteSoft, seed: 20 + i, samples: 6, construction: false });
      }),
    ].join('\n');
  },

  // THE NAVE: a broad almond eye with an iris and a filled pupil.
  eye: () => {
    const upper = (t) => {
      const x = CX - 150 + t * 300;
      const u = (x - CX) / 150;
      return [x, CY - 88 * (1 - u * u) ** 0.9];
    };
    const lower = (t) => {
      const x = CX + 150 - t * 300;
      const u = (x - CX) / 150;
      return [x, CY + 70 * (1 - u * u) ** 0.9];
    };
    const almond = `M${CX - 150} ${CY} Q${CX} ${CY - 176} ${CX + 150} ${CY} Q${CX} ${CY + 140} ${CX - 150} ${CY} Z`;
    return [
      hatch('eyeHatch', almond, { size: S, spacing: 12, angle: -30, seed: 31, opacity: 0.32 }),
      `<clipPath id="eyeClip"><path d="${almond}"/></clipPath>`,
      `<g clip-path="url(#eyeClip)">${blot(ellipse(CX, CY - 6, 64, 64), { color: C.bookCloth, seed: 32 })}</g>`,
      stroke(upper, { width: 14, color: C.graphite, seed: 33 }),
      stroke(lower, { width: 12, color: C.graphite, seed: 34 }),
      stroke(ellipse(CX, CY - 6, 64, 64), { width: 8, color: C.graphite, seed: 35, closed: true }),
      blot(ellipse(CX, CY - 6, 27, 27), { color: C.boneBlack, seed: 36, opacity: 0.95 }),
      `<circle cx="${CX - 12}" cy="${CY - 20}" r="8" fill="${C.sheetHigh}"/>`,
      // lashes on the upper lid only, so the mark is not symmetric
      ...[-0.62, -0.3, 0, 0.3, 0.62].map((u, i) => {
        const x = CX + u * 150;
        const y = CY - 88 * (1 - u * u) ** 0.9;
        return stroke(line(x, y - 10, x + u * 26, y - 40), { width: 6, color: C.graphite, seed: 40 + i, samples: 8, construction: false });
      }),
    ].join('\n');
  },

  // THE LISTENING FIELD: a crowned heir, reduced to head, shoulders and crown.
  heir: () => {
    const headY = CY + 18;
    const shoulders = polyline([[CX - 140, CY + 170], [CX - 104, CY + 104], [CX, CY + 84], [CX + 104, CY + 104], [CX + 140, CY + 170]]);
    const crown = polyline([[CX - 78, CY - 50], [CX - 90, CY - 150], [CX - 38, CY - 92], [CX, CY - 166], [CX + 38, CY - 92], [CX + 90, CY - 150], [CX + 78, CY - 50], [CX - 78, CY - 50]]);
    const crownD = `M${CX - 78} ${CY - 50} L${CX - 90} ${CY - 150} L${CX - 38} ${CY - 92} L${CX} ${CY - 166} L${CX + 38} ${CY - 92} L${CX + 90} ${CY - 150} L${CX + 78} ${CY - 50} Z`;
    return [
      hatch('crownHatch', crownD, { size: S, spacing: 10, angle: 35, seed: 51, color: C.graphiteSoft, opacity: 0.6 }),
      stroke(ellipse(CX, headY, 62, 62), { width: 13, color: C.graphite, seed: 52, closed: true }),
      stroke(shoulders, { width: 14, color: C.graphite, seed: 53, samples: 80 }),
      stroke(crown, { width: 12, color: C.graphite, seed: 54, samples: 96 }),
      ...[[CX - 90, CY - 150], [CX, CY - 166], [CX + 90, CY - 150]].map(([x, y], i) => blot(ellipse(x, y - 12, 11, 11), { color: C.graphiteSoft, seed: 55 + i })),
    ].join('\n');
  },

  // THE LAST CITY: a falling drop inside a radiating burst.
  rapture: () => {
    const drop = (t) => {
      // teardrop: point at the top, round belly below
      const a = -Math.PI / 2 + t * Math.PI * 2;
      const r = 70;
      const x = CX + Math.cos(a) * r * (1 - Math.sin(a)) * 0.62;
      const y = CY + 30 + Math.sin(a) * r * 1.02;
      return [x, y];
    };
    const dropPts = Array.from({ length: 49 }, (_, i) => drop(i / 48));
    const dropD = `M${dropPts.map(([x, y]) => `${f(x)} ${f(y)}`).join(' L')} Z`;
    return [
      `<clipPath id="dropClip"><path d="${dropD}"/></clipPath>`,
      `<g clip-path="url(#dropClip)">${blot(ellipse(CX, CY + 30, 90, 90), { color: C.cyan, seed: 61, opacity: 0.85 })}</g>`,
      hatch('dropHatch', dropD, { size: S, spacing: 9, angle: -55, seed: 62, color: C.boneBlack, opacity: 0.3 }),
      stroke(drop, { width: 12, color: C.graphite, seed: 63, closed: true, samples: 80 }),
      ...Array.from({ length: 8 }, (_, i) => {
        const a = (Math.PI * 2 * i) / 8 - Math.PI / 2;
        const r0 = 112;
        const r1 = i % 2 === 0 ? 162 : 146;
        return stroke(line(CX + Math.cos(a) * r0, CY + 14 + Math.sin(a) * r0, CX + Math.cos(a) * r1, CY + 14 + Math.sin(a) * r1, 0.04), { width: i % 2 === 0 ? 13 : 9, color: C.graphite, seed: 70 + i, samples: 10 });
      }),
    ].join('\n');
  },

  // Distractor: an open inward spiral with a single dot at its heart.
  oedon: () => {
    const turns = 2.6;
    const spiral = (t) => {
      const a = t * turns * Math.PI * 2 + Math.PI;
      const r = 150 - t * 128;
      return [CX + Math.cos(a) * r, CY + 10 + Math.sin(a) * r * 0.92];
    };
    return [
      stroke(spiral, { width: 13, color: C.indigo, seed: 81, samples: 160 }),
      blot(ellipse(CX + 4, CY + 12, 16, 16), { color: C.graphite, seed: 82 }),
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

// Output sizes follow the icons they replace, so nothing downstream changes.
export const SIGN_ICONS = [
  { id: 'moon', file: 'sign-moon.webp', width: 404, height: 405, seed: 101 },
  { id: 'eye', file: 'sign-eye.webp', width: 400, height: 400, seed: 202 },
  { id: 'heir', file: 'sign-heir.webp', width: 404, height: 405, seed: 303, glyphScale: 0.78 },
  { id: 'rapture', file: 'sign-rapture.webp', width: 404, height: 405, seed: 404, glyphScale: 0.9 },
  { id: 'oedon', file: 'sign-oedon.webp', width: 250, height: 251, seed: 505 },
];

function svgFor(icon) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${icon.width}" height="${icon.height}" viewBox="0 0 ${S} ${S}" preserveAspectRatio="none">
${DEFS}
${plate(icon.seed)}
<g transform="translate(${CX} ${S / 2}) scale(${icon.glyphScale ?? 0.86}) translate(${-CX} ${-S / 2})">
${GLYPHS[icon.id]()}
</g>
</svg>`;
}

await fs.mkdir(outDir, { recursive: true });
for (const icon of SIGN_ICONS) {
  const svg = svgFor(icon);
  if (writeSvg) await fs.writeFile(path.join(outDir, icon.file.replace(/\.webp$/, '.svg')), svg);
  await sharp(Buffer.from(svg), { density: 96 })
    .resize(icon.width, icon.height, { fit: 'fill' })
    .flatten({ background: C.sheet })
    .webp({ quality: 90, effort: 6 })
    .toFile(path.join(outDir, icon.file));
  const { size } = await fs.stat(path.join(outDir, icon.file));
  console.log(`[chapter4-icons] ${icon.file} ${icon.width}x${icon.height} ${size} bytes`);
}
