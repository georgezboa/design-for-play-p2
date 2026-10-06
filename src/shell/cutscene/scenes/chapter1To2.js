// Cutscene 2 · `chapter1To2` (Chapter 1 NIGHT SERVICE → Chapter 2 BORROWED
// LIGHT). docs/CUTSCENES_SPEC.md: Chapter 1 ended at Bellwether with two true
// things, the city room and the orchard; "She's always one stop ahead."
//   1 the night service pulls away from Bellwether; the orchard case is back on the rack
//   2 close on Butch's hand: a punched city-line ticket
//   3 through the window the fields turn into a city of rooftops in rain; its signs come on like a bell
//   4 CITY TERMINAL, a rooftop platform in the rain; on a far roof, a woman in a rose scarf turns away and is gone
// The last shot is Chapter 2's first screen (borrowedLight section A).

import paperUrl from '../../../assets/shared/painterly/paper-texture-ivory-v01.png?url';
import trainUrl from '../../../chapters/nightService/art/train-night.png?url';
import {
  PAL, amberGlint, brassFill, carriageCeiling, damaskWall, drawButch, drawCeilingLamp, drawClaimTag, drawMaraWalking, drawOilLamp, drawOrchardCase,
  drawRain, finishLayer, glow, ink, inkRect, paintCountry, paintNightSky, parcel, ramp, rng, roundRectPath, smooth, usePaintAssets, vgrad, wainscot, wood,
} from '../painters.js';
import { drawTicket } from '../painters.js';
import {
  drawLampPost, drawLitSign, drawPinchHand, drawStationClock, drawWaterTower, glassBeads, paintBrickFacade, paintCityFar,
} from '../painters-c1.js';

const TAU = Math.PI * 2;

/** The warm pool of a lamp over the whole stage (live: it flickers and swings). */
function pool(c, w, h, x, y, r, alpha) {
  c.save();
  c.globalCompositeOperation = 'lighter';
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(255, 176, 96, ${alpha})`);
  g.addColorStop(0.4, `rgba(255, 160, 80, ${alpha * 0.35})`);
  g.addColorStop(1, 'rgba(255, 150, 70, 0)');
  c.fillStyle = g;
  c.fillRect(0, 0, w, h);
  c.restore();
}

function vignette(c, w, h, strength) {
  const g = c.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.72);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, `rgba(5, 4, 8, ${strength})`);
  c.fillStyle = g;
  c.fillRect(0, 0, w, h);
}

// ---------------------------------------------------------------------------
// shot 1: Bellwether slides away behind the glass; the case on the rack

const GLASS1 = Object.freeze({ x: 230, y: 300, w: 1140, h: 330, r: 22 });
const RACK = Object.freeze({ y: 232, x0: 110, x1: 1490 });
const CASE1 = Object.freeze({ x: 590, s: 4.2 });
const NEAR_W = 3700;
/** Where Bellwether's sign stands on the platform strip; the strip starts with it mid-window. */
const SIGN_AT = 1460;
const START_OFF = GLASS1.x + GLASS1.w / 2 - SIGN_AT;
const PULL = 1500;

function paintBellwetherFar(c, w, h) {
  paintNightSky(c, w, h, { horizon: 540, moon: [1230, 360], seed: 9901, warm: 0.06 });
  paintCountry(c, w, h, { horizon: 552, seed: 9902 });
}

function orchardTree(c, x, ground, r, seed) {
  c.fillStyle = '#0b1218';
  c.fillRect(x - r * 0.08, ground - r * 1.1, r * 0.16, r * 1.1);
  const random = rng(seed);
  for (let i = 0; i < 6; i += 1) {
    c.beginPath(); c.ellipse(x + (random() - 0.5) * r * 1.2, ground - r * 1.3 - random() * r * 0.6, r * (0.45 + random() * 0.3), r * (0.35 + random() * 0.2), 0, 0, TAU); c.fill();
  }
}

/** The near strip: Bellwether's platform, its shelter and sign, then the orchard and the fields. */
function paintBellwetherNear(c, w, h) {
  const ground = 596;
  // the orchard rows behind the station and past it
  for (let x = -40; x < w; x += 120) orchardTree(c, x + (x % 240 ? 30 : 0), 560, 46 + (x % 360 ? 0 : 10), 9910 + x);
  c.fillStyle = vgrad(c, 560, h, [[0, '#0d151c'], [1, '#070b0f']]);
  c.fillRect(0, 560, w, h - 560);
  // the platform, its ivory edge
  c.fillStyle = vgrad(c, ground - 6, h, [[0, '#2a3138'], [1, '#14181d']]);
  c.fillRect(200, ground - 6, 2100, h - ground + 6);
  ink(c, [[200, ground - 6], [2300, ground - 6]], { w: 2.2, alpha: 0.75, jitter: 0.5, seed: 9920 });
  c.fillStyle = 'rgba(200, 200, 180, 0.18)';
  c.fillRect(200, ground + 2, 2100, 4);
  // the shelter: a lit waiting room, its roof overhanging
  const sx = 640; const sw = 420; const roof = 430;
  c.fillStyle = '#1a1f24';
  c.fillRect(sx, roof + 20, sw, ground - 6 - roof - 20);
  [[sx + 40, 120], [sx + 200, 120]].forEach(([wx, ww]) => {
    c.fillStyle = vgrad(c, roof + 60, roof + 140, [[0, '#ffd28a'], [1, '#d48a44']]);
    c.fillRect(wx, roof + 60, ww, 80);
    c.fillStyle = 'rgba(60, 30, 14, 0.75)';
    for (let k = 1; k < 4; k += 1) c.fillRect(wx + (ww * k) / 4 - 2, roof + 60, 4, 80);
    c.fillRect(wx, roof + 96, ww, 4);
    glow(c, wx + ww / 2, roof + 100, 160, 'rgba(255, 186, 104, 0.9)', 0.3);
  });
  c.fillStyle = '#5a2a22'; c.fillRect(sx + 350, roof + 70, 48, ground - 6 - roof - 70);
  c.fillStyle = '#10141a';
  c.beginPath(); c.moveTo(sx - 30, roof + 22); c.lineTo(sx + sw / 2, roof - 16); c.lineTo(sx + sw + 30, roof + 22); c.closePath(); c.fill();
  ink(c, [[sx - 30, roof + 22], [sx + sw / 2, roof - 16], [sx + sw + 30, roof + 22]], { w: 2, alpha: 0.6, jitter: 0.4, seed: 9921 });
  ink(c, [[sx, roof + 22], [sx, ground - 6]], { w: 1.4, alpha: 0.4, bleed: false, seed: 9922 });
  ink(c, [[sx + sw, roof + 22], [sx + sw, ground - 6]], { w: 1.4, alpha: 0.4, bleed: false, seed: 9923 });
  // the bench
  c.fillStyle = '#2a1d14'; c.fillRect(1120, ground - 40, 140, 10); c.fillRect(1126, ground - 30, 6, 24); c.fillRect(1248, ground - 30, 6, 24);
  // BELLWETHER, the green board on its two posts (Chapter 1's sign)
  const bw = 300; const bx = SIGN_AT - bw / 2; const by = 462;
  c.fillStyle = '#0a0d10'; c.fillRect(bx + 24, by + 50, 7, ground - by - 56); c.fillRect(bx + bw - 31, by + 50, 7, ground - by - 56);
  c.fillStyle = '#24594a';
  roundRectPath(c, bx, by, bw, 58, 6); c.fill();
  c.strokeStyle = '#d8ccb0'; c.lineWidth = 3;
  roundRectPath(c, bx + 6, by + 6, bw - 12, 46, 4); c.stroke();
  c.fillStyle = '#efe6cf';
  c.font = '700 34px "Space Mono", monospace'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText('BELLWETHER', SIGN_AT, by + 31, bw - 30);
  c.textAlign = 'left';
  // past the station: the fence along the fields
  for (let x = 2320; x < w; x += 70) { c.fillStyle = '#05080b'; c.fillRect(x, 560, 5, 50); }
  c.fillStyle = '#05080b'; c.fillRect(2320, 572, w - 2320, 3);
}

/** Lamps along the platform (their glow is live). */
const PLATFORM_LAMPS = [420, 1240, 1800, 2240];

function paintRackRoom(c, w, h) {
  damaskWall(c, -20, 0, w + 40, h, { seed: 9931, tone: ['#0e1a1f', '#162a2f'] });
  carriageCeiling(c, -20, w + 20, 44, { seed: 9932 });
  // the window's walnut surround, the glass cut clear
  c.save();
  c.shadowColor = 'rgba(0,0,0,0.55)'; c.shadowBlur = 18;
  c.fillStyle = '#3a2416';
  roundRectPath(c, GLASS1.x - 22, GLASS1.y - 22, GLASS1.w + 44, GLASS1.h + 44, GLASS1.r + 18); c.fill();
  c.restore();
  wood(c, GLASS1.x - 22, GLASS1.y - 22, GLASS1.w + 44, 22, { base: '#432a1a', seed: 9933 });
  c.globalCompositeOperation = 'destination-out';
  roundRectPath(c, GLASS1.x, GLASS1.y, GLASS1.w, GLASS1.h, GLASS1.r); c.fill();
  c.globalCompositeOperation = 'source-over';
  c.save(); c.lineWidth = 6; c.strokeStyle = brassFill(c, GLASS1.x, GLASS1.y, GLASS1.w, GLASS1.h); roundRectPath(c, GLASS1.x, GLASS1.y, GLASS1.w, GLASS1.h, GLASS1.r); c.stroke(); c.restore();
  wood(c, GLASS1.x - 40, GLASS1.y + GLASS1.h + 16, GLASS1.w + 80, 18, { base: '#5a3a22', seed: 9934 });
  ink(c, [[GLASS1.x - 40, GLASS1.y + GLASS1.h + 16], [GLASS1.x + GLASS1.w + 40, GLASS1.y + GLASS1.h + 16]], { w: 2.2, alpha: 0.7, seed: 9935 });
  wainscot(c, -20, w + 20, 690, h + 20, { seed: 9936, panelW: 160 });
  // the luggage rack: brackets, slats, two brass rails
  const { y, x0, x1 } = RACK;
  for (let bx = x0 + 20; bx < x1; bx += 300) {
    c.fillStyle = brassFill(c, bx, y - 4, 10, 60, true);
    c.beginPath(); c.moveTo(bx, y); c.lineTo(bx + 10, y); c.lineTo(bx + 10, y + 50); c.quadraticCurveTo(bx + 6, y + 20, bx - 30, y + 6); c.closePath(); c.fill();
  }
  c.fillStyle = '#1a110b'; c.fillRect(x0, y, x1 - x0, 10);
  c.fillStyle = 'rgba(0,0,0,0.4)'; c.fillRect(x0, y + 10, x1 - x0, 14);
  c.fillStyle = brassFill(c, x0, y - 3, x1 - x0, 6); c.fillRect(x0, y - 2, x1 - x0, 5);
  c.fillStyle = brassFill(c, x0, y + 8, x1 - x0, 5); c.fillRect(x0, y + 9, x1 - x0, 4);
  ink(c, [[x0, y - 2], [x1, y - 2]], { w: 1.8, alpha: 0.55, seed: 9937 });
  // what else rides up there, in the dark: a hat box, a parcel, an umbrella
  c.fillStyle = '#3a1c18'; c.fillRect(190, y - 90, 140, 90);
  c.beginPath(); c.ellipse(260, y - 90, 70, 14, 0, 0, TAU); c.fillStyle = '#4e2420'; c.fill();
  inkRect(c, 190, y - 90, 140, 90, { w: 1.6, alpha: 0.45, bleed: false, seed: 9938 });
  parcel(c, 1080, y - 64, 120, 64, { seed: 9939, tone: '#6e5236' });
  parcel(c, 1220, y - 40, 80, 40, { seed: 9940, tone: '#5a4430' });
  c.save(); c.translate(1380, y); c.rotate(-1.4);
  c.fillStyle = '#121822'; c.beginPath(); c.moveTo(0, -4); c.lineTo(150, -10); c.lineTo(150, 6); c.closePath(); c.fill();
  c.restore();
  // the orchard case, back in its place
  drawOrchardCase(c, CASE1.x, y - 2, CASE1.s, { lamp: { x: 470, y: 90 }, light: 0.7 });
  finishLayer(c, w, h, { grain: 0.15, vig: 0.4 });
  // the room sinks into the dark away from the lamp over the case
  const shade = c.createRadialGradient(680, 160, 160, 680, 160, 1100);
  shade.addColorStop(0, 'rgba(6, 8, 14, 0.05)');
  shade.addColorStop(1, 'rgba(6, 8, 14, 0.55)');
  c.fillStyle = shade;
  c.fillRect(0, 0, w, h);
}

function paintGlass1(c) {
  glassBeads(c, GLASS1, { seed: 9941, count: 320 });
}

function shotPullsAway(c, t, w, h, env) {
  // the train pulls away: slowly, then faster
  const move = env.reducedMotion ? 0 : PULL * t * t;
  const off = START_OFF - move;
  c.save();
  roundRectPath(c, GLASS1.x, GLASS1.y, GLASS1.w, GLASS1.h, GLASS1.r);
  c.clip();
  env.drawLayer(c, 'far', paintBellwetherFar, { x: -move * 0.06 - 40, w: w + 120, h: 700 });
  const near = env.layer('near', paintBellwetherNear, { w: NEAR_W, h: 700 });
  c.drawImage(near.canvas, off, 0, near.w, near.h);
  PLATFORM_LAMPS.forEach((lx) => {
    const x = lx + off;
    if (x < GLASS1.x - 80 || x > GLASS1.x + GLASS1.w + 80) return;
    drawLampPost(c, x, 590, 150, { on: 1, side: 1, coneAlpha: 0.16 });
  });
  drawRain(c, env, { alpha: 0.5, rect: GLASS1, speed: 520, drift: -0.9 });
  c.restore();
  env.drawLayer(c, 'room', paintRackRoom);
  env.drawLayer(c, 'glass', paintGlass1);
  // the carriage lamp over the rack, swinging a little as the train moves off
  const swing = env.reducedMotion ? 0 : 0.05 * Math.sin(env.wall * 1.2) + 0.08 * ramp(t, 0, 0.3) * Math.sin(env.wall * 2.1);
  const lamp = drawCeilingLamp(c, 470, 0, 58, 50, swing, { lit: 0.9 });
  pool(c, w, h, lamp.x + 170, lamp.y + 40, 560, 0.3);
  // the case's claim tag hangs over the rack edge, swaying
  const handle = { x: CASE1.x + 21 * CASE1.s, y: RACK.y - 2 - 36 * CASE1.s + 4 };
  const sway = env.reducedMotion ? 0 : 0.06 * Math.sin(env.wall * 1.6 + 0.4) + 0.05 * ramp(t, 0.05, 0.4) * Math.sin(env.wall * 3.1);
  const tag = { x: handle.x + 128 + Math.sin(sway) * 30, y: RACK.y + 74 };
  ink(c, [[handle.x, handle.y], [handle.x + 40, RACK.y - 30], [tag.x - 46, tag.y - 2]], { w: 2, alpha: 0.8, bleed: false, jitter: 0.6, color: '#e6d6b0', seed: 9945 });
  drawClaimTag(c, tag.x, tag.y, { w: 128, angle: 0.18 + sway, string: false, glint: false });
  amberGlint(c, CASE1.x + 30 * CASE1.s, RACK.y - 30 * CASE1.s, 7, 0.5 + 0.5 * ramp(t, 0.2, 0.6));
}

// ---------------------------------------------------------------------------
// shot 2: his hand, the city-line ticket

const TICKET = Object.freeze({ x: 560, y: 360, w: 620 });
const LAMP2 = Object.freeze({ x: 1430, y: 690, s: 7.4 });

function paintTicketDesk(c, w, h) {
  // the dark window behind, then the walnut sill-table he leans on
  c.fillStyle = vgrad(c, 0, 520, [[0, '#0b1220'], [1, '#17283a']]);
  c.fillRect(0, 0, w, 540);
  const random = rng(9951);
  c.strokeStyle = 'rgba(200, 220, 240, 0.08)'; c.lineWidth = 1.2;
  for (let i = 0; i < 70; i += 1) { const x = random() * w; const y = random() * 520; c.beginPath(); c.moveTo(x, y); c.lineTo(x - 6, y + 30); c.stroke(); }
  c.fillStyle = '#3a2416'; c.fillRect(-20, 520, w + 40, 30);
  c.fillStyle = brassFill(c, -20, 516, w + 40, 6); c.fillRect(-20, 516, w + 40, 5);
  wood(c, -20, 548, w + 40, h - 548, { base: '#4a2f1d', seed: 9952 });
  c.fillStyle = vgrad(c, 548, h, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.45)']]);
  c.fillRect(-20, 548, w + 40, h - 548);
  ink(c, [[-20, 548], [w + 20, 548]], { w: 2.6, alpha: 0.75, seed: 9953 });
  finishLayer(c, w, h, { grain: 0.15, vig: 0 });
}

function paintTicket(c, w, h) {
  drawTicket(c, w / 2, h / 2, { w: TICKET.w, lines: ['CITY LINE', 'ONE WAY · 1978'], punched: true });
}

function shotTicket(c, t, w, h, env) {
  env.drawLayer(c, 'desk', paintTicketDesk);
  const flicker = env.reducedMotion ? 0 : 0.05 * Math.sin(env.wall * 9.3) * Math.sin(env.wall * 3.1 + 1);
  const rock = env.reducedMotion ? 0 : 0.012 * Math.sin(env.wall * 1.3);
  // he turns it to the lamp
  const angle = -0.13 + 0.09 * smooth(t) + rock;
  const lampGlass = drawOilLamp(c, LAMP2.x, LAMP2.y, LAMP2.s, { flame: 0.95 + flicker });
  const lamp = { x: lampGlass.x, y: lampGlass.y };
  drawPinchHand(c, TICKET.x, TICKET.y, 0.82, { angle, part: 'back', lamp });
  const tk = env.layer('ticket', paintTicket, { w: TICKET.w + 80, h: TICKET.w * 0.46 + 80 });
  c.save();
  c.translate(TICKET.x, TICKET.y);
  c.rotate(angle);
  c.drawImage(tk.canvas, -40, -tk.h / 2, tk.w, tk.h);
  c.restore();
  // the lamp's light warming the paper from the right
  c.save();
  c.translate(TICKET.x, TICKET.y);
  c.rotate(angle);
  c.globalCompositeOperation = 'lighter';
  const g = c.createRadialGradient(TICKET.w * 1.1, -40, 0, TICKET.w * 1.1, -40, TICKET.w * 1.05);
  g.addColorStop(0, `rgba(255, 170, 90, ${0.26 + flicker})`);
  g.addColorStop(1, 'rgba(255, 170, 90, 0)');
  c.fillStyle = g;
  c.fillRect(0, -TICKET.w * 0.23, TICKET.w, TICKET.w * 0.46);
  c.restore();
  drawPinchHand(c, TICKET.x, TICKET.y, 0.82, { angle, part: 'front', lamp });
  pool(c, w, h, lamp.x, lamp.y, 900, 0.24 + flicker);
  // the night's lamps sweeping past outside, across him (the title's sweep)
  if (!env.reducedMotion) {
    [0.22, 0.66].forEach((at) => {
      const p = (t - at) / 0.22;
      if (p <= 0 || p >= 1) return;
      const strength = Math.sin(Math.PI * p) ** 0.8;
      const bandX = w * (1.2 - p * 1.4);
      c.save(); c.globalCompositeOperation = 'lighter';
      const grad = c.createLinearGradient(bandX - 220, 0, bandX + 380, 0);
      [[0, 0], [0.3, 0.06], [0.55, 0.18], [0.8, 0.05], [1, 0]].forEach(([k, a]) => grad.addColorStop(k, `rgba(255, 170, 90, ${(a * strength).toFixed(3)})`));
      c.fillStyle = grad;
      c.beginPath(); c.moveTo(bandX - 60, 0); c.lineTo(bandX + 380, 0); c.lineTo(bandX + 160, h); c.lineTo(bandX - 280, h); c.closePath(); c.fill();
      c.restore();
    });
  }
  vignette(c, w, h, 0.5);
}

// ---------------------------------------------------------------------------
// shot 3: the fields become a city of rooftops in the rain

const GLASS3 = Object.freeze({ x: 120, y: 70, w: 1360, h: 520, r: 26 });
const FIELD_TILE = 1600;
const CITY_W = 3500;
/** How far the city has come by shot time t (its left edge starts at the window's right edge). */
const cityEdge = (t) => {
  const p = Math.max(0, Math.min(1, t));
  return GLASS3.x + GLASS3.w - 180 - 2560 * (1 - (1 - p) ** 1.6);
};

const CITY_SIGNS = Object.freeze([
  { x: 330, y: 330, w: 250, h: 50, text: 'HOTEL MERIDIAN', tone: 'amber' },
  { x: 760, y: 292, w: 180, h: 44, text: 'CITY LINE', tone: 'teal' },
  { x: 1120, y: 352, w: 170, h: 42, text: 'TELEGRAPH', tone: 'amber' },
  { x: 1500, y: 280, w: 220, h: 52, text: 'TERMINAL', tone: 'amber' },
  { x: 1900, y: 330, w: 160, h: 42, text: 'ALL NIGHT', tone: 'rose' },
  { x: 2300, y: 300, w: 240, h: 50, text: 'CITY TERMINAL', tone: 'amber' },
  { x: 2780, y: 340, w: 160, h: 42, text: 'LAMPS', tone: 'teal' },
]);
const SIGN_ON = (i) => 0.34 + i * 0.075;

function paintSkyFar(c, w, h) {
  // the rain sky, then the far city's towers rising on the right as it nears
  c.fillStyle = vgrad(c, 0, 520, [[0, '#0a1420'], [0.6, '#132836'], [1, '#1d3a44']]);
  c.fillRect(-20, -20, w + 40, 640);
  glow(c, w * 0.75, 520, 520, 'rgba(214, 150, 80, 0.9)', 0.14);
  const random = rng(9961);
  for (let i = 0; i < 14; i += 1) {
    const y = 40 + random() * 300; const x = random() * w; const len = 200 + random() * 400;
    c.fillStyle = `rgba(20, 34, 48, ${0.4 + random() * 0.3})`;
    c.beginPath(); c.ellipse(x, y, len / 2, 8 + random() * 14, 0, 0, TAU); c.fill();
  }
  paintCountry(c, w * 0.6, h, { horizon: 470, seed: 9962, lights: false });
  // the far city, faded in from the left so it rises out of the country
  const res = c.getTransform().a || 1;
  const tmp = document.createElement('canvas');
  tmp.width = Math.ceil(w * res); tmp.height = Math.ceil(h * res);
  const tc = tmp.getContext('2d');
  tc.setTransform(res, 0, 0, res, 0, 0);
  paintCityFar(tc, w + 20, h, { horizon: 470, seed: 9963, layers: 2, x0: w * 0.36 });
  tc.globalCompositeOperation = 'destination-in';
  const fade = tc.createLinearGradient(w * 0.36, 0, w * 0.6, 0);
  fade.addColorStop(0, 'rgba(0,0,0,0)'); fade.addColorStop(1, 'rgba(0,0,0,1)');
  tc.fillStyle = fade; tc.fillRect(0, 0, w, h);
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(tmp, 0, 0); c.restore();
}

function paintFields(c, w, h) {
  // night fields and a hedge line, a farmhouse light: one tile, it repeats
  c.fillStyle = vgrad(c, 470, h, [[0, '#101a20'], [1, '#070b0e']]);
  c.fillRect(0, 470, w, h - 470);
  const random = rng(9971);
  for (let i = 0; i < 9; i += 1) {
    const x = random() * w; const r = 26 + random() * 30;
    c.fillStyle = '#081016';
    c.beginPath(); c.ellipse(x, 480, r * 1.4, r * 0.7, 0, Math.PI, 0); c.fill();
  }
  c.fillStyle = '#0d151b';
  c.fillRect(900, 452, 60, 30);
  c.beginPath(); c.moveTo(894, 452); c.lineTo(930, 430); c.lineTo(966, 452); c.closePath(); c.fill();
  c.fillStyle = '#f2b866'; c.fillRect(912, 462, 7, 8);
  glow(c, 916, 466, 40, 'rgba(255, 186, 104, 0.95)', 0.4);
  for (let x = 20; x < w; x += 160) { c.fillStyle = '#04070a'; c.fillRect(x, 520, 8, 120); }
  c.fillStyle = '#04070a'; c.fillRect(0, 540, w, 3);
  ink(c, [[0, 470], [w * 0.3, 466], [w * 0.6, 472], [w, 468]], { w: 1.2, alpha: 0.25, bleed: false, jitter: 0.6, seed: 9972 });
}

function paintCity(c, w, h) {
  // seen from the viaduct: a hazy row of far blocks, then the near roofs low in the window
  const random = rng(9981);
  let mx = 120;
  const far = new Path2D();
  while (mx < w) {
    const bw = 120 + random() * 160;
    const top = 250 + random() * 90;
    far.rect(mx, top - 30, bw, h - top + 30);
    c.fillStyle = random() > 0.5 ? '#1c2c33' : '#18262d';
    c.fillRect(mx, top, bw, h - top);
    if (random() > 0.5) { c.beginPath(); c.moveTo(mx, top); c.lineTo(mx + bw / 2, top - 28); c.lineTo(mx + bw, top); c.fill(); }
    for (let wy = top + 14; wy < 520; wy += 22) for (let wx = mx + 10; wx < mx + bw - 10; wx += 18) {
      if (random() > 0.78) { c.fillStyle = random() > 0.3 ? 'rgba(242, 184, 102, 0.55)' : 'rgba(127, 208, 200, 0.45)'; c.fillRect(wx, wy, 6, 9); c.fillStyle = '#1c2c33'; }
    }
    mx += bw + 6 + random() * 20;
  }
  c.save(); c.clip(far);
  c.fillStyle = vgrad(c, 240, 520, [[0, 'rgba(22, 48, 58, 0.1)'], [1, 'rgba(22, 48, 58, 0.55)']]);
  c.fillRect(0, 240, w, 300);
  c.restore();
  const blocks = [];
  let x = 0;
  while (x < w) {
    const bw = 200 + random() * 240;
    const top = x < 300 ? 470 : 340 + random() * 110;
    blocks.push({ x, w: bw, top, tone: random() > 0.5 ? ['#3b2d27', '#1d1613'] : ['#2f2a2c', '#181518'] });
    x += bw + 14 + random() * 40;
  }
  blocks.forEach((b, i) => {
    paintBrickFacade(c, b.x, b.x + b.w, b.top, h, { seed: 9982 + i * 7, lit: 0.3, bay: 70, win: [28, 48], rowGap: 86, tone: b.tone, edge: true });
    if (random() > 0.4) drawWaterTower(c, b.x + b.w * (0.2 + random() * 0.5), b.top, 64 + random() * 26, { seed: 9990 + i });
    if (random() > 0.45) { c.fillStyle = '#120d0b'; c.fillRect(b.x + b.w * 0.8, b.top - 40, 22, 40); c.fillStyle = '#5a2a22'; c.fillRect(b.x + b.w * 0.8 - 2, b.top - 44, 26, 6); }
  });
  // the wires between the roofs
  c.strokeStyle = 'rgba(4, 6, 8, 0.8)'; c.lineWidth = 1.4;
  for (let i = 0; i < blocks.length - 1; i += 1) {
    const a = blocks[i]; const b = blocks[i + 1];
    c.beginPath(); c.moveTo(a.x + a.w - 10, a.top - 20); c.quadraticCurveTo((a.x + a.w + b.x) / 2, Math.max(a.top, b.top) + 30, b.x + 10, b.top - 20); c.stroke();
  }
  // the signs' brackets (the boxes themselves are live: they come on)
  CITY_SIGNS.forEach((s) => { c.fillStyle = '#07090b'; c.fillRect(s.x + 10, s.y + s.h, 4, 30); c.fillRect(s.x + s.w - 14, s.y + s.h, 4, 30); });
  // no paper grain here: the strip moves, and its clear sky must stay clear
}

function paintWindowWall(c, w, h) {
  damaskWall(c, -20, -20, w + 40, h + 40, { seed: 9991, tone: ['#0d191d', '#142529'] });
  c.save();
  c.shadowColor = 'rgba(0,0,0,0.55)'; c.shadowBlur = 20;
  c.fillStyle = '#3a2416';
  roundRectPath(c, GLASS3.x - 24, GLASS3.y - 24, GLASS3.w + 48, GLASS3.h + 48, GLASS3.r + 22); c.fill();
  c.restore();
  wood(c, GLASS3.x - 24, GLASS3.y - 24, GLASS3.w + 48, 24, { base: '#432a1a', seed: 9992 });
  c.globalCompositeOperation = 'destination-out';
  roundRectPath(c, GLASS3.x, GLASS3.y, GLASS3.w, GLASS3.h, GLASS3.r); c.fill();
  c.globalCompositeOperation = 'source-over';
  c.save(); c.lineWidth = 7; c.strokeStyle = brassFill(c, GLASS3.x, GLASS3.y, GLASS3.w, GLASS3.h); roundRectPath(c, GLASS3.x, GLASS3.y, GLASS3.w, GLASS3.h, GLASS3.r); c.stroke(); c.restore();
  // the curtains, tied back at either side
  [[GLASS3.x - 40, 1], [GLASS3.x + GLASS3.w + 40, -1]].forEach(([cx, dir], i) => {
    c.fillStyle = vgrad(c, 0, GLASS3.y + GLASS3.h, [[0, '#5a1f1a'], [1, '#2a0d0b']]);
    c.beginPath();
    c.moveTo(cx - dir * 30, GLASS3.y - 40);
    c.lineTo(cx + dir * 110, GLASS3.y - 40);
    c.quadraticCurveTo(cx + dir * 70, GLASS3.y + GLASS3.h * 0.4, cx + dir * 30, GLASS3.y + GLASS3.h * 0.62);
    c.quadraticCurveTo(cx + dir * 60, GLASS3.y + GLASS3.h * 0.85, cx + dir * 70, GLASS3.y + GLASS3.h + 30);
    c.lineTo(cx - dir * 30, GLASS3.y + GLASS3.h + 30);
    c.closePath(); c.fill();
    ink(c, [[cx + dir * 110, GLASS3.y - 40], [cx + dir * 70, GLASS3.y + GLASS3.h * 0.4], [cx + dir * 30, GLASS3.y + GLASS3.h * 0.62], [cx + dir * 60, GLASS3.y + GLASS3.h * 0.85], [cx + dir * 70, GLASS3.y + GLASS3.h + 30]], { w: 2, alpha: 0.4, bleed: false, jitter: 0.5, seed: 9993 + i });
    c.fillStyle = PAL.brass; c.fillRect(cx + dir * 10, GLASS3.y + GLASS3.h * 0.6, dir * 40, 8);
  });
  c.fillStyle = brassFill(c, GLASS3.x - 60, GLASS3.y - 46, GLASS3.w + 120, 8); c.fillRect(GLASS3.x - 60, GLASS3.y - 46, GLASS3.w + 120, 6);
  wood(c, GLASS3.x - 50, GLASS3.y + GLASS3.h + 18, GLASS3.w + 100, 22, { base: '#5a3a22', seed: 9996 });
  ink(c, [[GLASS3.x - 50, GLASS3.y + GLASS3.h + 18], [GLASS3.x + GLASS3.w + 50, GLASS3.y + GLASS3.h + 18]], { w: 2.4, alpha: 0.7, seed: 9997 });
  wainscot(c, -20, w + 20, GLASS3.y + GLASS3.h + 60, h + 20, { seed: 9998, panelW: 170 });
  finishLayer(c, w, h, { grain: 0.14, vig: 0.45 });
}

function paintGlass3(c) {
  glassBeads(c, GLASS3, { seed: 9999, count: 420 });
}

/** A sign's light as it comes on: dark, two quick flickers, then steady. */
function signOn(t, at) {
  const p = (t - at) / 0.05;
  if (p <= 0) return 0;
  if (p >= 1) return 1;
  return p < 0.3 ? 0.9 : p < 0.5 ? 0.1 : p < 0.7 ? 1 : 0.4 + p * 0.6;
}

function shotCity(c, t, w, h, env) {
  const edge = env.reducedMotion ? GLASS3.x + 200 : cityEdge(t);
  const travel = GLASS3.x + GLASS3.w - 180 - edge;
  c.save();
  roundRectPath(c, GLASS3.x, GLASS3.y, GLASS3.w, GLASS3.h, GLASS3.r);
  c.clip();
  env.drawLayer(c, 'sky', paintSkyFar, { x: -travel * 0.12 - 40, w: w + 400, h: 700 });
  // the fields, left of where the city begins
  const fields = env.layer('fields', paintFields, { w: FIELD_TILE, h: 700 });
  const fx = -(travel % FIELD_TILE);
  c.save();
  c.beginPath(); c.rect(GLASS3.x - 10, 0, Math.max(0, edge - GLASS3.x + 10), h); c.clip();
  for (let x = fx - FIELD_TILE; x < w; x += FIELD_TILE) c.drawImage(fields.canvas, x, 0, fields.w, fields.h);
  c.restore();
  const city = env.layer('city', paintCity, { w: CITY_W, h: 700 });
  c.drawImage(city.canvas, edge, 0, city.w, city.h);
  // the signs come on one after another, like a bell
  CITY_SIGNS.forEach((s, i) => {
    const x = edge + s.x;
    if (x > w + 40 || x + s.w < -40) return;
    const on = env.reducedMotion ? (t > SIGN_ON(i) ? 1 : 0) : signOn(t, SIGN_ON(i));
    drawLitSign(c, x, s.y, s.w, s.h, s.text, { on, tone: s.tone });
  });
  // the train's own light along the cutting: the light the city borrows
  c.save(); c.globalCompositeOperation = 'lighter';
  c.fillStyle = vgrad(c, 520, 600, [[0, 'rgba(255, 180, 100, 0)'], [1, 'rgba(255, 180, 100, 0.14)']]);
  c.fillRect(GLASS3.x, 520, GLASS3.w, 80);
  c.restore();
  drawRain(c, env, { alpha: 0.55, rect: GLASS3, speed: 560, drift: -0.8 });
  c.restore();
  env.drawLayer(c, 'wall', paintWindowWall);
  env.drawLayer(c, 'glass', paintGlass3);
}

// ---------------------------------------------------------------------------
// shot 4: CITY TERMINAL, the rooftop platform; the Mara ahead on the far roof

const DECK = 530;
const FAR_ROOF = 452;
const BUTCH4 = Object.freeze({ x: 640, s: 2.25 });
const MARA4 = Object.freeze({ x0: 1056, x1: 1220, h: 96 });
const HUT = Object.freeze({ x: 1170, w: 110, h: 104 });
const ROSE_LAMP = Object.freeze({ x: 988, y: FAR_ROOF - 96 });

function paintTerminalBack(c, w, h) {
  // the layer starts 60 left of the stage: paint in stage units
  c.translate(60, 0);
  c.fillStyle = vgrad(c, 0, h, [[0, '#0a141b'], [0.5, '#122630'], [1, '#183038']]);
  c.fillRect(-20, -20, w + 40, h + 40);
  paintCityFar(c, w + 40, h, { horizon: 600, seed: 10011, layers: 3, x0: -40 });
  // behind the far roof, a hotel's sign: its glow is what she stands against
  c.fillStyle = '#122129';
  c.fillRect(990, 236, 300, h);
  c.beginPath(); c.moveTo(990, 236); c.lineTo(1140, 200); c.lineTo(1290, 236); c.closePath(); c.fill();
  glow(c, 1120, 330, 330, 'rgba(255, 170, 96, 0.95)', 0.32);
  glow(c, 1120, 300, 120, 'rgba(255, 196, 120, 0.95)', 0.3);
  drawLitSign(c, 1020, 268, 220, 46, 'HOTEL MERIDIAN', { on: 1, tone: 'amber' });
  // the far roof's building, across the street: hazier, its own lit windows
  paintBrickFacade(c, 930, w + 40, FAR_ROOF, h + 20, { seed: 10012, lit: 0.35, bay: 86, win: [34, 58], rowGap: 104, tone: ['#2f2622', '#1a1513'] });
  c.fillStyle = 'rgba(22, 48, 58, 0.42)';
  c.fillRect(930, FAR_ROOF + 14, w, h);
  drawWaterTower(c, 1330, FAR_ROOF, 120, { seed: 10013 });
  // the street between, a dark drop with a lit window far down
  c.fillStyle = vgrad(c, DECK, h, [[0, '#0c161c'], [1, '#05090c']]);
  c.fillRect(890, DECK - 20, 66, h);
}

function paintTerminalFront(c, w, h) {
  // the terminal's building: the roof is the platform
  paintBrickFacade(c, -40, 902, DECK, h + 20, { seed: 10021, lit: 0.34, bay: 100, win: [44, 76], rowGap: 128 });
  // the canopy: posts, its thin curved roof, the wires
  const posts = [70, 270, 470, 670, 860];
  posts.forEach((x, i) => {
    c.fillStyle = '#0a0c0f'; c.fillRect(x - 4, 322, 8, DECK - 322);
    c.fillRect(x - 10, DECK - 6, 20, 6);
    ink(c, [[x - 4, DECK], [x - 4, 322]], { w: 1.2, alpha: 0.35, bleed: false, seed: 10022 + i });
  });
  c.strokeStyle = '#0b0d10'; c.lineWidth = 6;
  c.beginPath(); c.moveTo(-40, 340); c.quadraticCurveTo(430, 296, 900, 330); c.stroke();
  ink(c, [[-40, 336], [220, 316], [430, 308], [680, 312], [900, 326]], { w: 1.6, alpha: 0.5, jitter: 0.4, seed: 10027 });
  c.strokeStyle = 'rgba(4, 6, 8, 0.9)'; c.lineWidth = 1.4;
  c.beginPath(); c.moveTo(-40, 250); c.quadraticCurveTo(500, 330, w + 40, 230); c.stroke();
  // the hanging board's rods
  [268, 472].forEach((x) => { c.fillStyle = '#0a0c0f'; c.fillRect(x - 1.5, 312, 3, 70); });
  // the booth at the platform's end: a red awning, a lit window
  const bx = 712;
  c.fillStyle = '#1a1714'; c.fillRect(bx + 10, 430, 160, DECK - 430);
  c.fillStyle = vgrad(c, 444, 500, [[0, '#ffd28a'], [1, '#c98244']]);
  c.fillRect(bx + 30, 448, 64, 46);
  glow(c, bx + 62, 470, 90, 'rgba(255, 186, 104, 0.9)', 0.34);
  c.fillStyle = '#7a2a22';
  c.beginPath(); c.moveTo(bx - 6, 410); c.lineTo(bx + 186, 410); c.lineTo(bx + 192, 436);
  for (let k = 0; k <= 8; k += 1) { const sx = bx + 192 - k * 24.75; c.quadraticCurveTo(sx - 6, 446, sx - 12.4, 436); }
  c.lineTo(bx - 6, 436); c.closePath(); c.fill();
  c.fillStyle = 'rgba(240, 200, 170, 0.5)';
  for (let k = 0; k < 8; k += 2) c.fillRect(bx - 6 + k * 24.75, 412, 24.75, 22);
  ink(c, [[bx - 6, 410], [bx + 186, 410], [bx + 192, 436]], { w: 1.8, alpha: 0.55, bleed: false, seed: 10028 });
  c.fillStyle = '#4a2018'; c.fillRect(bx + 120, DECK - 34, 50, 34);
  // the deck edge: Chapter 2's ivory line along the roof
  c.fillStyle = 'rgba(234, 223, 198, 0.12)'; c.fillRect(-40, DECK - 4, 942, 4);
  finishLayer(c, w, h, { grain: 0.13, vig: 0 });
}

function paintFarRoofFront(c) {
  // the stair hut on the far roof: she goes behind it and is gone
  c.fillStyle = '#16120f';
  c.fillRect(HUT.x, FAR_ROOF - HUT.h, HUT.w, HUT.h);
  c.fillStyle = '#0d0a08';
  c.beginPath(); c.moveTo(HUT.x - 8, FAR_ROOF - HUT.h); c.lineTo(HUT.x + HUT.w + 8, FAR_ROOF - HUT.h - 12); c.lineTo(HUT.x + HUT.w + 8, FAR_ROOF - HUT.h + 4); c.lineTo(HUT.x - 8, FAR_ROOF - HUT.h + 8); c.closePath(); c.fill();
  c.fillStyle = '#2a1d16'; c.fillRect(HUT.x + 18, FAR_ROOF - HUT.h + 20, 34, HUT.h - 20);
  ink(c, [[HUT.x, FAR_ROOF], [HUT.x, FAR_ROOF - HUT.h + 8], [HUT.x + HUT.w + 8, FAR_ROOF - HUT.h - 4]], { w: 1.4, alpha: 0.4, bleed: false, jitter: 0.3, seed: 10031 });
  // the rose signal pole she stood by
  c.fillStyle = '#0a0c0f'; c.fillRect(ROSE_LAMP.x - 2, ROSE_LAMP.y, 4, FAR_ROOF - ROSE_LAMP.y);
  c.fillStyle = '#1a1416'; c.fillRect(ROSE_LAMP.x - 8, ROSE_LAMP.y - 12, 16, 14);
}

function shotTerminal(c, t, w, h, env) {
  env.drawLayer(c, 'back', paintTerminalBack, { depth: 0.55, x: -60, w: w + 120 });
  // the rose signal on the far roof, and her by it
  const gone = env.reducedMotion ? ramp(t, 0.55, 0.7) : 0;
  const walk = env.reducedMotion ? 0 : ramp(t, 0.4, 0.7);
  const off = env.parallax(0.55);
  const mx = MARA4.x0 + (MARA4.x1 - MARA4.x0) * walk + off.x;
  const roseOn = 1 - 0.75 * ramp(t, 0.7, 0.8);
  glow(c, ROSE_LAMP.x + off.x, ROSE_LAMP.y - 5 + off.y, 120, 'rgba(230, 140, 150, 0.95)', 0.45 * roseOn);
  if (gone < 1) {
    c.save();
    c.globalAlpha = 1 - gone;
    const phase = walk * (MARA4.x1 - MARA4.x0) / (9.5 * MARA4.h / 66);
    drawMaraWalking(c, mx, FAR_ROOF + off.y, MARA4.h, { phase, light: 1, lampSide: -1, flutter: env.reducedMotion ? 0.3 : 0.5 + 0.4 * Math.sin(env.wall * 3.2) });
    c.restore();
  }
  c.save(); c.translate(off.x, off.y);
  paintFarRoofFront(c);
  c.fillStyle = `rgba(240, 160, 172, ${0.3 + 0.7 * roseOn})`;
  c.fillRect(ROSE_LAMP.x - 5, ROSE_LAMP.y - 9, 10, 8);
  c.restore();
  // the platform: the building, the canopy, the booth
  env.drawLayer(c, 'front', paintTerminalFront);
  drawLitSign(c, 220, 382, 300, 54, 'CITY TERMINAL', { on: 1, tone: 'amber' });
  c.fillStyle = '#0a0c0f'; c.fillRect(778, 318, 4, 30);
  drawStationClock(c, 780, 372, 25, { hours: 4, minutes: 12, hang: 0, light: 0.6 });
  drawLampPost(c, 500, DECK, 172, { on: 1, side: 1, coneAlpha: 0.18 });
  // Butch, just off the train, his lamp held up toward the far roof
  const breath = env.reducedMotion ? 0 : env.wall;
  drawButch(c, BUTCH4.x, DECK, BUTCH4.s, { pose: 'stand', phase: breath, facing: 1, lamp: 'hand', glowAlpha: 0.3 });
  drawRain(c, env, { alpha: 0.62, speed: 700 });
  vignette(c, w, h, 0.4);
}

// ---------------------------------------------------------------------------

export const chapter1To2 = {
  id: 'chapter1To2',
  title: 'Borrowed light',
  length: [25, 40],
  music: { id: 'cutscene-1-2', src: '/assets/music/ch1/1.2_train_resonance.mp3', volume: 0.42, fade: 3, outFade: 3 },
  prepare: () => usePaintAssets({ paper: paperUrl, train: trainUrl }),
  shots: [
    {
      id: 'pulls-away',
      duration: 9,
      draw: shotPullsAway,
      camera: { from: { x: 0.5, y: 0.52, zoom: 1.06 }, to: { x: 0.46, y: 0.4, zoom: 1.3 }, still: { x: 0.5, y: 0.47, zoom: 1.1 } },
      transition: { type: 'fade', duration: 1.1 },
      captions: [{ text: 'The orchard case stayed on the rack.\nHer other ticket did not.', at: 2.2, end: 7.4 }],
      cues: [{ at: 0, sfx: 'rail', level: 0.7 }, { at: 0, sfx: 'rain', level: 0.5 }, { at: 0.5, sfx: 'whistle' }, { at: 3, sfx: 'rail', level: 1 }],
    },
    {
      id: 'city-ticket',
      duration: 6.6,
      draw: shotTicket,
      camera: { from: { x: 0.5, y: 0.5, zoom: 1.04 }, to: { x: 0.55, y: 0.48, zoom: 1.18 } },
      transition: { type: 'slide', duration: 1.1 },
      cues: [{ at: 0.6, sfx: 'paper' }, { at: 0, sfx: 'rain', level: 0.35 }],
    },
    {
      id: 'city-ahead',
      duration: 9.4,
      draw: shotCity,
      camera: { from: { x: 0.5, y: 0.47, zoom: 1.1 }, to: { x: 0.55, y: 0.42, zoom: 1.22 }, still: { x: 0.5, y: 0.45, zoom: 1.12 } },
      transition: { type: 'ink', duration: 1.1 },
      captions: [{ text: 'The city ahead ran on light\nit had borrowed from the train.', at: 1.4, end: 6.2 }],
      cues: [
        { at: 0, sfx: 'rain', level: 0.7 },
        ...CITY_SIGNS.slice(0, 5).map((_, i) => ({ at: +(SIGN_ON(i) * 9.4).toFixed(2), sfx: 'softBell' })),
      ],
    },
    {
      id: 'city-terminal',
      duration: 9.6,
      draw: shotTerminal,
      camera: { from: { x: 0.42, y: 0.52, zoom: 1.16 }, to: { x: 0.55, y: 0.5, zoom: 1.28 }, still: { x: 0.52, y: 0.5, zoom: 1.16 } },
      captions: [{ text: 'One roof ahead.\nAlways one roof ahead.', at: 4.6, end: 9.3 }],
      cues: [
        { at: 0, sfx: 'brake' }, { at: 0, sfx: 'rain', level: 1 }, { at: 0.4, sfx: 'rail', level: 0.4 },
        { at: 6.2, stopMusic: true, fade: 3.4 }, { at: 7, stopSfx: 'rail', fade: 2.4 },
      ],
    },
  ],
};

export default chapter1To2;
