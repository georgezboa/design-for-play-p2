// Round 7 · the overlays drawn on George's painted plates (Acts 0–1).
//
// A plate is the picture; these only add what has to live or move on top of
// it, inside its look (dark, hand-inked, matte gouache, one warm practical
// light): a lamp breathing where the painted lamp is, words inked onto the
// painted paper in the house type, a prop sprite cut from George's prop
// sheet, rain on the office glass. Thin, soft and matte, never glossy.

import { FONT_SERIF, FONT_UI, HOUSE_FACES } from '../../../shared/fonts.js';
import { plateKey } from '../panelModel.js';
import { rng } from './ink.js';
import { tr } from '../../../shared/i18n/runtime.js';

export { FONT_SERIF, FONT_UI };

/** A cut-out prop (art/ch1Plates.js PROP) drawn `width` tile px wide, or null when not loaded. */
export function propImage(ctx, prop, x, y, { width = prop?.w ?? 40, origin = [0.5, 0.5], angle = 0, alpha = 1 } = {}) {
  if (!prop) return null;
  const key = plateKey(prop.url);
  if (!ctx.scene?.textures?.exists(key)) return null;
  const image = ctx.image(key, x, y, { origin, scale: width / prop.w, alpha });
  image.setRotation(angle);
  return image;
}

/** The texture key of a prop (for the fx layer), or null when not loaded. */
export function propKey(scene, prop) {
  const key = plateKey(prop?.url);
  return prop && scene?.textures?.exists(key) ? key : null;
}

/**
 * A painted lamp breathing: a soft warm glow centred on the lamp the
 * painting already has (low alpha: it lifts the paint, it does not cover it).
 */
export function lampGlow(ctx, [u, v], size, { alpha = 0.1, flicker = 0.05, color = 0xffc27a } = {}) {
  return ctx.glow(u * ctx.w, v * ctx.h, size, { color, alpha, flicker });
}

/** Run `fn` once the house faces are in (or after a short wait): canvas text needs them first. */
export function whenFonts(fn, { timeoutMs = 1500 } = {}) {
  const fonts = globalThis.document?.fonts;
  const ready = () => HOUSE_FACES.every((face) => { try { return fonts.check(face); } catch { return true; } });
  if (!fonts?.load || ready()) { fn(); return; }
  let done = false;
  const go = () => { if (!done) { done = true; fn(); } };
  Promise.all(HOUSE_FACES.map((face) => fonts.load(face).catch(() => null))).then(go, go);
  setTimeout(go, timeoutMs);
}

/**
 * Words inked onto a painted paper. `quad` is the paper's corners (tile-
 * normalised: top-left, top-right, bottom-right, bottom-left); `draw(c, w, h)`
 * paints in the paper's own flat frame (w × h px, origin top-left), and that
 * frame is mapped onto the paper by the affine transform that best fits the
 * quad (its rotation and the slight shear of the painting's perspective).
 * Multiplied into the paper so the ink takes its grain and its light.
 */
export function inkOnPaper(ctx, key, quad, { w = 400, h = 200, alpha = 0.92 } = {}, draw) {
  const P = [0, 1, 2, 3].map((i) => [quad[i * 2] * ctx.w, quad[i * 2 + 1] * ctx.h]);
  // average edge vectors: across the paper (top and bottom edges) and down it (left and right)
  const ux = ((P[1][0] - P[0][0]) + (P[2][0] - P[3][0])) / 2 / w;
  const uy = ((P[1][1] - P[0][1]) + (P[2][1] - P[3][1])) / 2 / w;
  const vx = ((P[3][0] - P[0][0]) + (P[2][0] - P[1][0])) / 2 / h;
  const vy = ((P[3][1] - P[0][1]) + (P[2][1] - P[1][1])) / 2 / h;
  const cx = (P[0][0] + P[1][0] + P[2][0] + P[3][0]) / 4;
  const cy = (P[0][1] + P[1][1] + P[2][1] + P[3][1]) / 4;
  const holder = ctx.add(ctx.scene.add.container(0, 0));
  whenFonts(() => {
    if (!holder.active) return;
    const image = ctx.paint(key, (c) => {
      c.save();
      c.setTransform(c.getTransform().multiply(new DOMMatrix([ux, uy, vx, vy, cx - (ux * w + vx * h) / 2, cy - (uy * w + vy * h) / 2])));
      draw(c, w, h);
      c.restore();
    }, { bleed: 0 });
    image.setAlpha(alpha).setBlendMode('MULTIPLY');
    holder.add(image);
  });
  return holder;
}

/** Letter-spaced capitals (canvas letterSpacing where supported, else per glyph). */
export function spacedText(c, text, x, y, spacing) {
  text = tr(text);
  if ('letterSpacing' in c) {
    const before = c.letterSpacing;
    c.letterSpacing = `${spacing}px`;
    c.fillText(text, x, y);
    c.letterSpacing = before;
    return;
  }
  let cx = x;
  const align = c.textAlign;
  if (align === 'center') cx -= (c.measureText(text).width + spacing * (text.length - 1)) / 2;
  c.textAlign = 'left';
  for (const ch of text) { c.fillText(ch, cx, y); cx += c.measureText(ch).width + spacing; }
  c.textAlign = align;
}

// ---------------------------------------------------------------------------
// rain on the glass at night (Act 0: the panel is the carriage window)

function paintBead(c, x, y, r, random) {
  // a bead is a tiny lens: darker below, one soft catch-light above
  c.fillStyle = `rgba(6, 12, 20, ${0.16 + random() * 0.08})`;
  c.beginPath(); c.ellipse(x, y + r * 0.18, r * 1.05, r * 1.15, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = `rgba(200, 216, 230, ${0.1 + random() * 0.06})`;
  c.beginPath(); c.ellipse(x, y, r * 0.82, r * 0.9, 0, 0, Math.PI * 2); c.fill();
  // the lamp caught in it (warm, upper left) and the cold night under it
  c.fillStyle = `rgba(255, 232, 196, ${0.45 + random() * 0.25})`;
  c.beginPath(); c.arc(x - r * 0.3, y - r * 0.36, Math.max(0.4, r * 0.26), 0, Math.PI * 2); c.fill();
  c.strokeStyle = 'rgba(190, 206, 222, 0.12)';
  c.lineWidth = 0.5;
  c.beginPath(); c.arc(x, y + r * 0.1, r * 0.78, 0.35, Math.PI - 0.35); c.stroke();
}

/**
 * Fine, translucent rain on the glass: a faint cool sheen, a few dozen beads
 * (most tiny), hair-thin dried trails, a breath of condensation low in the
 * corners, and now and then a bead letting go and running down (still under
 * Reduce Motion: the beads stay, nothing runs).
 */
export function rainOnGlass(ctx, { seed = 7101, beads = 95, runners = 6 } = {}) {
  const { w, h } = ctx;
  ctx.paint('plate-rain-glass', (c) => {
    const random = rng(seed);
    // the glass: a barely-there cool sheen, two soft diagonal bands
    c.save();
    c.globalCompositeOperation = 'lighter';
    [[0.06, 0.15, 0.022], [0.62, 0.68, 0.014]].forEach(([a, b, alpha]) => {
      const g = c.createLinearGradient(w * a, 0, w * b, 0);
      g.addColorStop(0, 'rgba(170, 196, 220, 0)');
      g.addColorStop(0.5, `rgba(170, 196, 220, ${alpha})`);
      g.addColorStop(1, 'rgba(170, 196, 220, 0)');
      c.fillStyle = g;
      c.beginPath(); c.moveTo(w * a, -10); c.lineTo(w * b, -10); c.lineTo(w * (b - 0.16), h + 10); c.lineTo(w * (a - 0.16), h + 10); c.closePath(); c.fill();
    });
    c.restore();
    // condensation breathing up from the sill corners
    [[0, h, h * 0.7, 0.07], [w, h, h * 0.55, 0.05]].forEach(([x, y, r, alpha]) => {
      const g = c.createRadialGradient(x, y, 4, x, y, r);
      g.addColorStop(0, `rgba(150, 170, 186, ${alpha})`);
      g.addColorStop(1, 'rgba(150, 170, 186, 0)');
      c.fillStyle = g;
      c.fillRect(0, 0, w, h);
    });
    // hair-thin trails where earlier drops ran
    c.lineCap = 'round';
    for (let i = 0; i < 12; i += 1) {
      const x = random() * w;
      const y0 = random() * h * 0.6;
      const len = h * (0.12 + random() * 0.35);
      c.strokeStyle = `rgba(196, 212, 226, ${0.05 + random() * 0.04})`;
      c.lineWidth = 0.55 + random() * 0.45;
      c.beginPath();
      c.moveTo(x, y0);
      for (let k = 1; k <= 6; k += 1) c.lineTo(x + Math.sin(k * 1.7 + i) * 1.6 - k * 0.5, y0 + (len * k) / 6);
      c.stroke();
    }
    // beads, most of them tiny, a few of them fat enough to hold the lamp
    for (let i = 0; i < beads; i += 1) {
      const r = i < 18 ? 2 + random() * 1.7 : 0.55 + random() * random() * 2.2;
      paintBead(c, random() * w, random() * h, r, random);
    }
  }, { bleed: 0 });
  // the rain itself, beyond the glass: hairlines, slanting, barely there
  const hair = 'plate-rain-hair';
  const fine = [];
  const rnd = rng(seed + 2);
  for (let i = 0; i < 44; i += 1) {
    const line = ctx.sprite(hair, 2, 40, (c) => {
      const g = c.createLinearGradient(0, 0, 0, 40);
      g.addColorStop(0, 'rgba(200, 216, 232, 0)');
      g.addColorStop(0.6, 'rgba(200, 216, 232, 0.5)');
      g.addColorStop(1, 'rgba(225, 235, 245, 0.8)');
      c.fillStyle = g;
      c.fillRect(0.6, 0, 0.8, 40);
    }, rnd() * w, rnd() * h, { origin: [0.5, 1], angle: 0.16 });
    const len = 0.35 + rnd() * 0.6;
    line.setScale(1 / 3, len / 3).setAlpha(0.2 + rnd() * 0.2);
    fine.push({ line, v: 0.55 + rnd() * 0.35 });
  }
  ctx.animate((time, dt) => {
    const off = ctx.reduceMotion();
    fine.forEach((d) => {
      d.line.setVisible(!off);
      if (off) return;
      d.line.y += d.v * dt;
      d.line.x -= d.v * dt * 0.16;
      if (d.line.y > h + 20) { d.line.y = -10; d.line.x = rnd() * w * 1.1; }
    });
  });
  if (!runners) return;
  // a few beads that let go and run down the pane, slowly, then rest
  const random = rng(seed + 1);
  const trailKey = 'plate-rain-trail';
  const drops = [];
  for (let i = 0; i < runners; i += 1) {
    const trail = ctx.sprite(trailKey, 3, 40, (c) => {
      const g = c.createLinearGradient(0, 0, 0, 40);
      g.addColorStop(0, 'rgba(200, 214, 228, 0)');
      g.addColorStop(1, 'rgba(200, 214, 228, 0.26)');
      c.fillStyle = g;
      c.fillRect(1, 0, 1, 40);
    }, 0, 0, { origin: [0.5, 1] });
    const head = ctx.sprite('plate-rain-bead', 8, 8, (c) => paintBead(c, 4, 4, 2.2, () => 0.5), 0, 0);
    drops.push({ trail, head, x: random() * w, y: random() * h, v: 0, wait: random() * 6000, wob: random() * 10 });
  }
  ctx.animate((time, dt) => {
    const still = ctx.reduceMotion();
    drops.forEach((d) => {
      if (still) { d.trail.setVisible(false); d.head.setPosition(d.x, d.y).setScale(0.32); return; }
      d.trail.setVisible(true);
      if (d.wait > 0) { d.wait -= dt; d.v = 0; } else {
        d.v = Math.min(0.06, d.v + dt * 0.00002);
        d.y += d.v * dt;
        d.x += Math.sin(time / 700 + d.wob) * 0.012 * dt * d.v * 10;
        if (Math.random() < 0.0008 * dt) d.wait = 400 + Math.random() * 1800;
      }
      if (d.y > h + 12) { d.y = -10 - Math.random() * h * 0.3; d.x = Math.random() * w; d.wait = 1500 + Math.random() * 5000; }
      d.head.setPosition(d.x, d.y).setScale(0.4);
      d.trail.setPosition(d.x, d.y - 1).setDisplaySize(1, Math.min(60, 8 + d.v * 900)).setAlpha(d.v > 0 ? 1 : 0.4);
    });
  });
}

/**
 * A door off its latch: a dark gap down the latch edge (x, in tile px) with
 * lamplight in it, a little spill onto the frame and a fan of warm light
 * across the boards, fading as it reaches the viewer. `side` is where the
 * frame (and the spill) lies: 1 to the right of the edge, -1 to the left.
 */
export function doorCrack(ctx, key, x, top, bottom, { side = 1 } = {}) {
  const { h } = ctx;
  ctx.paint(`${key}-gap`, (c) => {
    c.fillStyle = 'rgba(0, 0, 0, 0.5)';
    c.fillRect(x - 2.3, top, 4.6, bottom - top);
  }, { bleed: 0 });
  const light = ctx.paint(`${key}-light`, (c) => {
    const g = c.createLinearGradient(0, top, 0, bottom);
    g.addColorStop(0, 'rgba(255, 210, 140, 0.45)');
    g.addColorStop(0.45, 'rgba(255, 206, 132, 0.95)');
    g.addColorStop(1, 'rgba(255, 190, 110, 0.7)');
    c.fillStyle = g;
    c.fillRect(x - 1, top, 2, bottom - top);
    const spill = c.createLinearGradient(x, 0, x + side * 30, 0);
    spill.addColorStop(0, 'rgba(255, 180, 96, 0.16)');
    spill.addColorStop(1, 'rgba(255, 180, 96, 0)');
    c.fillStyle = spill;
    c.fillRect(Math.min(x, x + side * 30), top + 6, 30, bottom - top - 10);
    // the fan across the boards, widening and fading towards the viewer (soft-edged)
    const fan = c.createLinearGradient(0, bottom, 0, h);
    fan.addColorStop(0, 'rgba(255, 176, 92, 0.16)');
    fan.addColorStop(1, 'rgba(255, 176, 92, 0)');
    c.filter = 'blur(4px)';
    c.fillStyle = fan;
    c.beginPath();
    c.moveTo(x - 1.5, bottom);
    c.lineTo(x + 1.5, bottom);
    c.lineTo(x + side * 44, h);
    c.lineTo(x - side * 14, h);
    c.closePath();
    c.fill();
    c.filter = 'none';
  }, { bleed: 0 });
  light.setBlendMode('ADD');
  ctx.glow(x, (top + bottom) / 2, (bottom - top) * 0.75, { color: 0xffc070, alpha: 0.12, flicker: 0.08 });
}
