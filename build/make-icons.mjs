// Generates the desktop app icons from the title-screen key art.
//
//   node build/make-icons.mjs
//
// Outputs (committed, consumed by electron-builder via directories.buildResources):
//   build/icon.png   1024x1024 master (macOS-style rounded plate; also used on Linux)
//   build/icon.icns  macOS
//   build/icon.ico   Windows (tighter plate so it stays legible at 16-32 px)
//
// Needs `sharp` and `png2icons` (devDependencies). The artwork is a crop of
// the night train's cab from public/assets/ui/nightfall-title-background.png
// (the train alone: a pasted wordmark letter cluttered it at small sizes).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = process.env.NIGHTFALL_ROOT || path.resolve(here, '..');
const require = createRequire(process.env.NIGHTFALL_ICON_DEPS || import.meta.url);
const sharp = require('sharp');
const png2icons = require('png2icons');

const SOURCE = path.join(root, 'public/assets/ui/nightfall-title-background.png');
const OUT = path.join(root, 'build');
const SIZE = 1024;

// Region of the 1586x992 title art, and the two headlights inside it
// (fractions of the crop) which get a little extra bloom so the icon still
// reads as "a train at night" at 16-32 px.
const TRAIN_CROP = { left: 1136, top: 590, width: 396, height: 396 };
const HEADLIGHTS = [[0.419, 0.74], [0.702, 0.697]];

const roundedMask = (size, radius) => Buffer.from(
  `<svg width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${radius}" ry="${radius}" fill="#fff"/></svg>`,
);

async function artwork(plate) {
  const train = await sharp(SOURCE)
    .extract(TRAIN_CROP)
    .resize(plate, plate, { kernel: 'lanczos3' })
    .modulate({ brightness: 1.06, saturation: 1.18 })
    .linear(1.12, -10)
    .sharpen({ sigma: 1.1 })
    .toBuffer();

  // Vignette + top shade: focus on the cab and its headlights.
  const shade = Buffer.from(`
    <svg width="${plate}" height="${plate}">
      <defs>
        <radialGradient id="v" cx="55%" cy="62%" r="75%">
          <stop offset="45%" stop-color="#03050a" stop-opacity="0"/>
          <stop offset="100%" stop-color="#03050a" stop-opacity="0.88"/>
        </radialGradient>
        <linearGradient id="t" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#03050a" stop-opacity="0.78"/>
          <stop offset="38%" stop-color="#03050a" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#v)"/>
      <rect width="100%" height="100%" fill="url(#t)"/>
    </svg>`);

  const bloom = Buffer.from(`
    <svg width="${plate}" height="${plate}">
      <defs>
        <radialGradient id="h">
          <stop offset="0%" stop-color="#ffe3a3" stop-opacity="1"/>
          <stop offset="30%" stop-color="#ffb347" stop-opacity="0.45"/>
          <stop offset="100%" stop-color="#ff9a2e" stop-opacity="0"/>
        </radialGradient>
      </defs>
      ${HEADLIGHTS.map(([x, y]) => `<circle cx="${x * plate}" cy="${y * plate}" r="${plate * 0.1}" fill="url(#h)"/>`).join('')}
    </svg>`);

  // Thin brass keyline, echoing the title menu's gold rules.
  const inset = Math.round(plate * 0.028);
  const radius = Math.round(plate * 0.2);
  const keyline = Buffer.from(`
    <svg width="${plate}" height="${plate}">
      <rect x="${inset}" y="${inset}" width="${plate - inset * 2}" height="${plate - inset * 2}"
        rx="${radius - inset}" ry="${radius - inset}" fill="none"
        stroke="#d2ad72" stroke-opacity="0.55" stroke-width="${Math.max(2, Math.round(plate * 0.007))}"/>
    </svg>`);

  return sharp(train)
    .composite([
      { input: shade },
      { input: bloom, blend: 'screen' },
      { input: keyline },
    ])
    .png()
    .toBuffer();
}

async function plateIcon({ plate, radius, shadow }) {
  const art = await sharp(await artwork(plate))
    .composite([{ input: roundedMask(plate, radius), blend: 'dest-in' }])
    .png()
    .toBuffer();
  const offset = Math.round((SIZE - plate) / 2);
  const layers = [];
  if (shadow) {
    const shadowImg = await sharp({
      create: { width: SIZE, height: SIZE, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
    })
      .composite([{
        input: Buffer.from(`<svg width="${SIZE}" height="${SIZE}"><rect x="${offset}" y="${offset + 12}" width="${plate}" height="${plate}" rx="${radius}" fill="#000" fill-opacity="0.5"/></svg>`),
      }])
      .blur(14)
      .png()
      .toBuffer();
    layers.push({ input: shadowImg });
  }
  layers.push({ input: art, left: offset, top: offset });
  return sharp({ create: { width: SIZE, height: SIZE, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(layers)
    .png({ compressionLevel: 9 })
    .toBuffer();
}

fs.mkdirSync(OUT, { recursive: true });

// macOS Big Sur+ grid: 824 px plate, ~185 px corner radius, soft shadow.
const macIcon = await plateIcon({ plate: 824, radius: 185, shadow: true });
fs.writeFileSync(path.join(OUT, 'icon.png'), macIcon);
fs.writeFileSync(path.join(OUT, 'icon.icns'), png2icons.createICNS(macIcon, png2icons.BICUBIC2, 0));

// Windows: nearly full-bleed so small taskbar/desktop sizes stay readable.
// usePNG=false + forWinExe=true: PNG for 64-256 px, BMP for 16-48 px (what
// rcedit / NSIS and the Explorer properties dialog handle best).
const winIcon = await plateIcon({ plate: 984, radius: 150, shadow: false });
fs.writeFileSync(path.join(OUT, 'icon.ico'), png2icons.createICO(winIcon, png2icons.BICUBIC2, 0, false, true));

console.log('Wrote build/icon.png, build/icon.icns, build/icon.ico');
