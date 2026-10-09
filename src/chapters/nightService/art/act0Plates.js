// Act 0 · ONE WINDOW on George's painted plates (round 7): the office seen
// through the rainy carriage window (Butch asleep, then awake: he is painted
// in), the desk bell, the claim stub on its spike, the punch hole become a
// porthole, the night train on the viaduct, and back in through its one lit
// window. Positions come from art/ch1Plates.js (generated from the measured
// paintings); the procedural pictures in act0Art.js stay as the fallback.

import { ANCHOR, PLATE, ZOOM } from './ch1Plates.js';
import { FONT_SERIF, FONT_UI, inkOnPaper, lampGlow, rainOnGlass, spacedText } from './plateKit.js';

const OFFICE = ANCHOR['act0/office'];
const AWAKE = ANCHOR['act0/office-awake'];
const BELL = ANCHOR['act0/bell'];
const TICKET = ANCHOR['act0/ticket'];
const PORT = ANCHOR['act0/porthole'];
const CAR = ANCHOR['act0/carriage'];

const clampRect = ([x, y, w, h]) => {
  const x0 = Math.max(0, x);
  const y0 = Math.max(0, y);
  return Object.freeze([x0, y0, Math.min(1, x + w) - x0, Math.min(1, y + h) - y0]);
};

export const PLATES0 = Object.freeze({
  office: PLATE['act0/office'].url,
  awake: PLATE['act0/office-awake'].url,
  bell: PLATE['act0/bell'].url,
  ticket: PLATE['act0/ticket'].url,
  porthole: PLATE['act0/porthole'].url,
  carriage: PLATE['act0/carriage'].url,
});

/** The painted desk bell and claim stub in the office: click boxes, and the boxes the zooms fly into. */
export const BELL_HIT = Object.freeze([...OFFICE.bellHit]);
export const BELL_ZOOM = ZOOM['act0/bell'];
export const BELL_AT = Object.freeze([OFFICE.bell[0] + OFFICE.bell[2] / 2, OFFICE.bell[1] + OFFICE.bell[3] * 0.45]);
export const SPIKE_HIT = Object.freeze([...OFFICE.stubHit]);
export const SPIKE_ZOOM = ZOOM['act0/ticket'];
/** In the bell close-up: the painted plunger. */
export const STRIKE_HIT = clampRect(BELL.strikeHit);
export const PLUNGER = Object.freeze([BELL.plunger[0] + BELL.plunger[2] / 2, BELL.plunger[1] + BELL.plunger[3] * 0.5]);
/** In the stub close-up: the conductor's punch hole (r as a fraction of the panel width). */
export const HOLE = Object.freeze({ x: TICKET.hole[0], y: TICKET.hole[1], r: TICKET.holeR });
export const HOLE_HIT = Object.freeze([HOLE.x - 0.03, HOLE.y - 0.055, 0.06, 0.11]);
export const HOLE_ZOOM = ZOOM['act0/porthole'];
/** The porthole's glass (a click anywhere on it), and the distant train the zoom flies into. */
const GR = PORT.glassR;
export const GLASS_HIT = clampRect([PORT.glass[0] - GR * 0.92, PORT.glass[1] - GR * 1.8 * 0.92, GR * 1.84, GR * 1.8 * 1.84]);
export const GLASS_ZOOM = ZOOM['act0/carriage'];
/** The carriage from outside: the one lit window, which the view dives back in through. */
export const LIT_WINDOW = ZOOM['act0/office-awake'];
export const LIT_WINDOW_GLASS = Object.freeze([...CAR.litWindow]);

// ---------------------------------------------------------------------------

/**
 * States `office` (through the rain) and `inside` (back in, no glass): the
 * green-shaded desk lamp and the oil lantern breathe; on the glass, fine rain.
 */
export function drawOfficePlate(ctx, { glass = true } = {}) {
  const a = glass ? OFFICE : AWAKE;
  // the light under the green shade, and the oil lantern beside it
  lampGlow(ctx, [a.lamp[0], a.lamp[1] + 0.012], 150, { alpha: 0.1, flicker: 0.05 });
  lampGlow(ctx, [a.lamp[0], a.lamp[1] + 0.07], 70, { alpha: 0.06, flicker: 0.05 });
  lampGlow(ctx, a.lantern, 46, { alpha: 0.08, flicker: 0.12, color: 0xffb060 });
  if (glass) rainOnGlass(ctx);
}

/**
 * The bell up close. Its polished curve holds a corridor and, far down it, a
 * lantern: the Conductor's, coming closer (the glow grows; it flares when the
 * bell is struck).
 */
export function drawBellPlate(ctx) {
  const { w, h } = ctx;
  const x = BELL.lantern[0] * w;
  const y = BELL.lantern[1] * h;
  const halo = ctx.glow(x, y, 30, { color: 0xffb860, alpha: 0 });
  const core = ctx.glow(x, y, 10, { color: 0xffe2a8, alpha: 0 });
  let t0 = null;
  let flare = 0;
  ctx.animate((time, dt) => {
    if (t0 === null) t0 = time;
    const k = Math.min(1, Math.max(0, (time - t0 - 400) / 3600));
    const e = 0.5 - Math.cos(Math.PI * k) / 2;
    if (ctx.flag('rung')) flare = Math.min(1, flare + dt / 600);
    const breathe = 1 + Math.sin(time / 230) * 0.04 + Math.sin(time / 97) * 0.02;
    halo.setDisplaySize(26 + e * 46 + flare * 30, 26 + e * 46 + flare * 30).setAlpha((0.08 + e * 0.22 + flare * 0.12) * breathe);
    core.setDisplaySize(8 + e * 10, 8 + e * 10).setAlpha((0.15 + e * 0.35) * breathe);
  });
  // the desk lamp's warmth on the dome's shoulder
  lampGlow(ctx, [0.62, 0.28], 220, { alpha: 0.05, flicker: 0.04 });
}

/** The claim stub up close: CLAIM 1978-0412 printed on the painted card. */
export const STUB_WORDS = Object.freeze({ kicker: 'NIGHT SERVICE · LOST PROPERTY', stamp: 'CLAIM', number: '1978-0412' });

export function drawTicketPlate(ctx) {
  // the card: printed and stamped in the house type, multiplied into its paper
  inkOnPaper(ctx, 'act0-stub-words', TICKET.card, { w: 420, h: 214, alpha: 0.9 }, (c, w, h) => {
    c.textBaseline = 'alphabetic';
    // a line of small capitals along the top border
    c.fillStyle = 'rgba(52, 38, 28, 0.78)';
    c.font = `500 11px ${FONT_UI}`;
    c.textAlign = 'left';
    spacedText(c, STUB_WORDS.kicker, w * 0.1, h * 0.24, 2.1);
    // the number, printed large (left of the punch hole)
    c.fillStyle = 'rgba(38, 27, 20, 0.95)';
    c.font = `600 54px ${FONT_SERIF}`;
    spacedText(c, STUB_WORDS.number, w * 0.09, h * 0.67, 1.5);
    // a rule under it, and the clerk's tick
    c.fillStyle = 'rgba(52, 38, 28, 0.5)';
    c.fillRect(w * 0.1, h * 0.75, w * 0.52, 1.4);
    c.fillRect(w * 0.1, h * 0.81, w * 0.3, 1.1);
    // CLAIM: a rubber stamp in oxblood, a touch crooked, ink thin at one end
    c.save();
    c.translate(w * 0.585, h * 0.395);
    c.rotate(-0.07);
    const g = c.createLinearGradient(-60, 0, 60, 0);
    g.addColorStop(0, 'rgba(128, 34, 26, 0.88)');
    g.addColorStop(1, 'rgba(128, 34, 26, 0.55)');
    c.strokeStyle = g;
    c.fillStyle = g;
    c.lineWidth = 2.2;
    c.strokeRect(-50, -17, 100, 31);
    c.font = `600 20px ${FONT_UI}`;
    c.textAlign = 'center';
    spacedText(c, STUB_WORDS.stamp, 0, 7, 4);
    c.restore();
  });
  // the lamp above, and the night showing through the punch hole
  lampGlow(ctx, [TICKET.lamp[0], 0.02], 340, { alpha: 0.07, flicker: 0.04 });
  ctx.glow(HOLE.x * ctx.w, HOLE.y * ctx.h, 26, { color: 0x9db8e0, alpha: 0.1, flicker: 0.25 });
}

/** The porthole: the night outside, the train on the viaduct; its windows breathe faintly. */
export function drawPortholePlate(ctx) {
  const [x, y, w, h] = PORT.train;
  ctx.glow((x + w * 0.45) * ctx.w, (y + h * 0.5) * ctx.h, 120, { color: 0xffc070, alpha: 0.05, flicker: 0.2 });
}

/** The carriage from outside: the office window's lamplight. */
export function drawCarriagePlate(ctx) {
  const [x, y, w, h] = CAR.litWindow;
  ctx.glow((x + w / 2) * ctx.w, (y + h * 0.6) * ctx.h, 150, { color: 0xffc070, alpha: 0.12, flicker: 0.06 });
  lampGlow(ctx, CAR.litLamp, 34, { alpha: 0.12, flicker: 0.1 });
}
