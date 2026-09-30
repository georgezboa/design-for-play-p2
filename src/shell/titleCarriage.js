// The title screen's carriage wall (titleMenu.css): the same walnut, brass and
// paper that Chapter 1 paints around its windows (spec §5), so the title reads
// as one more wall of the night train. Chapter 1's canvas kit
// (chapters/nightService/art/ink.js) paints a few small tiles once; the CSS
// uses them as custom properties on #nightfall-title:
//
//   --nf-tex-wall    vertical walnut planks with seams (the carriage wall)
//   --nf-tex-panel   horizontal walnut grain (the raised panel and the board)
//   --nf-tex-rain    fine rain streaks for the window glass (tiles vertically)
//   --nf-tex-drops   beads of water resting on the glass
//   --nf-tex-paper   ivory paper fibre for tickets, cards and the ledger
//
// Everything here is decoration: until (or unless) the tiles are ready the
// CSS falls back to flat walnut and paper colours.

import { PAL, rng, wood } from '../chapters/nightService/art/ink.js';

function canvas(w, h) {
  const element = document.createElement('canvas');
  element.width = w;
  element.height = h;
  return [element, element.getContext('2d')];
}

function paintWall() {
  const [element, c] = canvas(1024, 1024);
  wood(c, 0, 0, 1024, 1024, { base: PAL.walnut, seed: 101, vertical: true, grain: 'rgba(0,0,0,0.35)', light: 'rgba(255,210,160,0.035)' });
  const random = rng(102);
  for (let x = 0; x < 1024; x += 132 + Math.floor(random() * 30)) {
    c.fillStyle = 'rgba(0,0,0,0.4)';
    c.fillRect(x, 0, 2, 1024);
    c.fillStyle = 'rgba(255,220,170,0.03)';
    c.fillRect(x + 2, 0, 1, 1024);
  }
  return element;
}

function paintPanel() {
  const [element, c] = canvas(1024, 512);
  wood(c, 0, 0, 1024, 512, { base: '#2a1b11', seed: 103, vertical: false, grain: 'rgba(0,0,0,0.3)' });
  return element;
}

// Streaks wrap top to bottom so the tile can scroll forever without a seam.
function paintRain() {
  const size = 512;
  const [element, c] = canvas(size, size);
  const random = rng(401);
  c.lineCap = 'round';
  for (let i = 0; i < 210; i += 1) {
    const x = random() * size;
    const y = random() * size;
    const length = 14 + random() * 58;
    const slant = length * (0.1 + random() * 0.06);
    c.strokeStyle = `rgba(236, 226, 206, ${0.05 + random() * 0.22})`;
    c.lineWidth = 0.6 + random() * 0.9;
    for (const offset of [0, -size]) {
      c.beginPath();
      c.moveTo(x, y + offset);
      c.lineTo(x - slant, y + length + offset);
      c.stroke();
    }
  }
  return element;
}

function paintDrops() {
  const size = 512;
  const [element, c] = canvas(size, size);
  const random = rng(402);
  for (let i = 0; i < 150; i += 1) {
    const x = random() * size;
    const y = random() * size;
    const r = 0.8 + random() ** 2 * 3.6;
    // a bead: a dark lower rim, a lit upper edge and a bright point
    c.fillStyle = 'rgba(10, 6, 4, 0.30)';
    c.beginPath(); c.ellipse(x, y + r * 0.25, r, r * 1.1, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = 'rgba(240, 226, 196, 0.16)';
    c.beginPath(); c.ellipse(x, y, r * 0.86, r * 0.95, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = 'rgba(255, 238, 205, 0.55)';
    c.beginPath(); c.arc(x - r * 0.3, y - r * 0.35, Math.max(0.5, r * 0.26), 0, Math.PI * 2); c.fill();
    // some beads have already run and left a thin wet trail above them
    if (r > 2.4 && random() > 0.45) {
      c.strokeStyle = 'rgba(236, 222, 194, 0.10)';
      c.lineWidth = r * 0.7;
      c.lineCap = 'round';
      c.beginPath(); c.moveTo(x, y - r); c.lineTo(x + (random() - 0.5) * 3, y - r - 16 - random() * 40); c.stroke();
    }
  }
  return element;
}

function paintPaper() {
  const size = 256;
  const [element, c] = canvas(size, size);
  c.fillStyle = PAL.paper;
  c.fillRect(0, 0, size, size);
  const random = rng(403);
  for (let i = 0; i < 2600; i += 1) {
    c.fillStyle = random() > 0.5 ? 'rgba(90, 62, 30, 0.07)' : 'rgba(255, 252, 240, 0.16)';
    c.fillRect(random() * size, random() * size, 1 + random() * 1.6, 1 + random() * 1.6);
  }
  c.strokeStyle = 'rgba(110, 80, 44, 0.08)';
  c.lineWidth = 0.7;
  for (let i = 0; i < 70; i += 1) {
    const x = random() * size;
    const y = random() * size;
    const a = random() * Math.PI;
    const l = 4 + random() * 12;
    c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); c.stroke();
  }
  return element;
}

const TILES = {
  '--nf-tex-wall': paintWall,
  '--nf-tex-panel': paintPanel,
  '--nf-tex-rain': paintRain,
  '--nf-tex-drops': paintDrops,
  '--nf-tex-paper': paintPaper,
};

/** Paint the tiles once and hand them to `root` as CSS custom properties. */
export function dressCarriageWall(root) {
  if (typeof document === 'undefined' || !root) return;
  Object.entries(TILES).forEach(([property, paint]) => {
    try {
      const tile = paint();
      tile.toBlob((blob) => {
        if (!blob) return;
        root.style.setProperty(property, `url("${URL.createObjectURL(blob)}")`);
      }, 'image/png');
    } catch {
      // decoration only: the flat CSS fallback stays
    }
  });
}
