// The worlds as Chapter 1's windows (round 9): the stack around Butch before
// the finale (chapter5-to-conductor) and the fold back into one carriage in
// the ending. The plates are the cutscenes' own paintings of each world.

import { drawFigure, drawFramedPlate, drawPlate, lampGlow, lampsDown, lerp, ramp, smooth } from './kit.js';

/** Office, rooftops, square, painted country: the four worlds Butch has ridden through. */
export const WORLDS = Object.freeze(['A0-office', 'C12-terminal', 'C23-echo', 'C34-arrive']);
/** Where each sits in the stack (stage units, 2 : 1 windows round the middle). */
export const STACK = Object.freeze([[110, 70, 520, 260], [970, 70, 520, 260], [110, 470, 520, 260], [970, 470, 520, 260]]);
const FROM = [[-700, 70], [2200, 70], [-700, 470], [2200, 470]];

/**
 * The worlds coming in round Butch, one at a time from either side
 * (`arrivals`: shot seconds), over `backdrop` dimmed to `dim`. `figure: false`
 * when the backdrop has Butch painted in; `lantern` is where his light is.
 */
export function drawWorldsStack(c, seconds, env, { backdrop = null, dim = 0.6, arrivals = [0.7, 1.9, 3.1, 4.2], butch = { x: 800, y: 700, h: 190 }, figure = true, lantern = null } = {}) {
  if (backdrop) {
    drawPlate(c, backdrop);
    lampsDown(c, dim, { pool: [butch.x, butch.y - butch.h * 0.4, 420] });
  }
  WORLDS.forEach((id, i) => {
    const k = smooth(ramp(seconds, arrivals[i] - 0.15, arrivals[i] + 0.75));
    if (k <= 0) return;
    const [x, y, w, h] = STACK[i];
    const [fx, fy] = FROM[i];
    const tilt = (1 - k) * (i % 2 ? 0.08 : -0.08);
    c.save();
    c.translate(lerp(fx, x, k) + w / 2, lerp(fy, y, k) + h / 2);
    c.rotate(tilt);
    drawFramedPlate(c, id, [-w / 2, -h / 2, w, h], { t: 13, light: 0.9 });
    c.restore();
  });
  // Butch with his lantern: drawn, unless the backdrop has him painted in already (`figure: false`)
  if (figure) drawFigure(c, 'butch:lantern', butch.x, butch.y, butch.h, { light: 0.9, glow: { alpha: 0.4, env } });
  const [lx, ly] = lantern ?? [butch.x + butch.h * 0.12, butch.y - butch.h * 0.62];
  lampGlow(c, lx, ly, butch.h * 0.9, { alpha: 0.22, env });
}

/**
 * The stack folding back, window by window (`departures`: shot seconds), into
 * the one carriage (`carriage`), which then opens out to the whole picture by
 * `open` (0..1).
 */
export function drawWorldsFold(c, seconds, env, { carriage = 'END-walk-a', departures = [1, 2.2, 3.4, 4.6], open = 0 } = {}) {
  c.fillStyle = '#050403';
  c.fillRect(-20, -20, 1640, 840);
  const center = [400, 200, 800, 400];
  const o = smooth(open);
  const cr = [lerp(center[0], 0, o), lerp(center[1], 0, o), lerp(center[2], 1600, o), lerp(center[3], 800, o)];
  WORLDS.forEach((id, i) => {
    const k = smooth(ramp(seconds, departures[i] - 0.2, departures[i] + 0.7));
    if (k >= 1) return;
    const [x, y, w, h] = STACK[i];
    const s = 1 - k;
    const cx = lerp(x + w / 2, 800, k);
    const cy = lerp(y + h / 2, 400, k);
    drawFramedPlate(c, id, [cx - (w * s) / 2, cy - (h * s) / 2, w * s, h * s], { t: 13 * Math.max(0.3, s), alpha: 1 - k * 0.3 });
  });
  if (o >= 0.999) drawPlate(c, carriage);
  else drawFramedPlate(c, carriage, cr, { t: 13 * (1 - o) + 0.01 });
}
