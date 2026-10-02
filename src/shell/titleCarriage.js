// The walnut and paper of the title's dialogs, the credits roll and the
// pause menu: the same materials Chapter 1 paints around its windows (spec
// §5). Chapter 1's canvas kit (chapters/nightService/art/ink.js) paints a few
// small tiles once; the CSS uses them as custom properties on the root it is
// given (#nightfall-title, the pause menu):
//
//   --nf-tex-wall    vertical walnut planks with seams (credits, exit screen,
//                    the title's wall until its scene is painted)
//   --nf-tex-panel   horizontal walnut grain (dialog panels)
//   --nf-tex-paper   ivory paper fibre for tickets, cards and the ledger
//
// The title's carriage itself, rain and all, is painted by titlePlateArt.js.
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
