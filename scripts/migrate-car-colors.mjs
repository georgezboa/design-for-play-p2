// Rewrites the car-art files onto the 24-colour CAR palette.
//
// The audit's long tail is the reason this is a script and not a hand edit:
// about 150 of the project's 196 literals are used exactly once, and the two
// car-art files carry 90 distinct values between them. Only 39 of those have an
// explicit mapping in REMAP; the rest have to be folded into the nearest rung of
// the value ramp, and "nearest" has to mean nearest *perceptually*, not nearest
// as a 24-bit integer.
//
// Selection rule, in priority order:
//   1. An explicit REMAP entry always wins. Those were decided by eye.
//   2. Otherwise pick the CAR colour with the smallest CIE76 distance in Lab,
//      but only among candidates whose role is plausible for the source value
//      (see ROLE_FILTER) so a warm brass literal cannot land on a cold steel
//      rung just because the numbers are close.
//
// Run with --check to print the mapping and touch nothing.

import { readFile, writeFile } from 'node:fs/promises';
import { CAR, REMAP } from '../src/art/colors.js';

const TARGETS = [
  'src/art/tutorialCarArt.js',
  'src/art/tutorialTrainRoomsArt.js',
];

// Lamps and the hero are semantic, not decorative: a literal must not be folded
// onto them by accident, because area limits and the no-tint rule apply there.
const RESERVED = new Set(['LAMP_OK', 'LAMP_WARN', 'LAMP_ALERT', 'TUNGSTEN', 'HERO_BASE', 'HERO_TRIM', 'HERO_ACCENT', 'SKY_RIM']);

const srgbToLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);

function toLab(hex) {
  const r = srgbToLinear(((hex >> 16) & 0xff) / 255);
  const g = srgbToLinear(((hex >> 8) & 0xff) / 255);
  const b = srgbToLinear((hex & 0xff) / 255);
  // sRGB D65 -> XYZ, then XYZ -> Lab.
  const x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
  const y = r * 0.2126 + g * 0.7152 + b * 0.0722;
  const z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const [fx, fy, fz] = [f(x), f(y), f(z)];
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

// Hue-family guard. Warm literals may only fold onto warm rungs and cool onto
// cool, so the ramp keeps its material meaning.
// Red is tested before warm on purpose. A salmon like 0xd7776f satisfies the
// warm predicate too (it has positive b*), and when warm won first it folded
// onto BRASS_DARK at dE 35 -- a red pipe turning into dark brass. Vinyl is the
// only red material in the car, so a strong a* claims the literal first.
function family(hex) {
  const [l, a, bb] = toLab(hex);
  if (a > 14 && l > 25) return 'red'; // vinyl; dark maroons fall through to cool
  if (bb > 12 && a > -6) return 'warm'; // brass, tungsten
  return 'cool'; // steel, enamel, glass, void
}

const FAMILY_MEMBERS = {
  warm: ['BRASS_HI', 'BRASS_MID', 'BRASS_DARK', 'TUNGSTEN_REFLECT'],
  red: ['VINYL_HI', 'VINYL'],
  cool: ['STEEL_HI', 'STEEL_MID', 'STEEL_DARK', 'ENAMEL_HI', 'ENAMEL_MID',
    'ENAMEL_DARK', 'SKY_HORIZON', 'GLASS_DARK', 'VOID_LIFT', 'VOID'],
};

const CAR_LAB = Object.fromEntries(
  Object.entries(CAR).filter(([name]) => !RESERVED.has(name))
    .map(([name, value]) => [name, toLab(value)]),
);

// Literals whose ROLE overrides their value. Checked before REMAP and before
// the nearest-rung search, because distance cannot see intent:
//   0xb9fff8 is the serviceLamp stroke on the complete branch. By value it is
//   nearest STEEL_HI (dE 28), but it is a status lamp, and status lamps come
//   from the lamp rungs or the ramp loses its one reserved signal channel.
const ROLE_OVERRIDE = Object.freeze({
  0xb9fff8: 'LAMP_OK',
});

function nearest(hex) {
  const role = ROLE_OVERRIDE[hex];
  if (role) return { name: role, value: CAR[role], reason: 'role override' };
  const explicit = REMAP[hex];
  if (explicit !== undefined) {
    const name = Object.keys(CAR).find((k) => CAR[k] === explicit);
    return { name, value: explicit, reason: 'REMAP' };
  }
  const lab = toLab(hex);
  const pool = FAMILY_MEMBERS[family(hex)].filter((n) => CAR_LAB[n]);
  let best = null;
  for (const name of pool) {
    const d = dist(lab, CAR_LAB[name]);
    if (!best || d < best.d) best = { name, value: CAR[name], d };
  }
  return { ...best, reason: `nearest ${family(hex)} dE=${best.d.toFixed(1)}` };
}

const check = process.argv.includes('--check');
const seen = new Map();

for (const rel of TARGETS) {
  const src = await readFile(rel, 'utf8');
  const out = src.replace(/0x[0-9a-fA-F]{6}/g, (lit) => {
    const hex = parseInt(lit.slice(2), 16);
    const pick = nearest(hex);
    if (!seen.has(lit)) seen.set(lit, pick);
    return `C(CAR.${pick.name})`;
  });
  if (!check) await writeFile(rel, out);
}

const rows = [...seen.entries()].sort((a, b) => a[1].name.localeCompare(b[1].name));
for (const [lit, pick] of rows) {
  console.log(`${lit} -> CAR.${pick.name.padEnd(17)} (${pick.reason})`);
}
console.log(`\n${seen.size} distinct literals mapped onto ${new Set(rows.map(([, p]) => p.name)).size} CAR rungs.`);
console.log(check ? 'check only, no files written' : `rewrote ${TARGETS.length} files`);
