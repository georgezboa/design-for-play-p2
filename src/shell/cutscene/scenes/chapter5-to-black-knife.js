// Cutscene 7 · `chapter5-to-black-knife` (Chapter 5 → THE LAST CARRIAGE, all
// five magic stones). docs/CUTSCENES_SPEC.md: the five stones, a door that
// was never on the timetable, a black ticket that is never punched, and the
// door closing behind Butch. It ends on one lamp in the dark, which the
// Black Ticket fight opens out of. (The code id keeps `black-knife`; nothing
// the player sees says it.)
//   1 the five magic stones glow in Butch's palm
//   2 at the end of the museum, a carriage door: LAST CARRIAGE
//   3 inside: dark, one seat; above it a black ticket floats, never punched
//   4 he steps in; the door closes behind him
//   5 black, into the fight

import paperUrl from '../../../assets/shared/painterly/paper-texture-ivory-v01.png?url';
import trainUrl from '../../../chapters/nightService/art/train-night.png?url';
import {
  PAL, brassFill, damaskWall, finishLayer, floorboards, glow, ink, inkRect, ramp, rivet, rng, roundRectPath, smooth, usePaintAssets, vgrad, wainscot, wood,
} from '../painters.js';
import {
  MAGIC_STONE_KINDS, drawBacklit, drawBlackTicket, drawButchStandingBack, drawMagicStone, hallLamps, paintMuseumHall,
} from '../painters-c3.js';

const TAU = Math.PI * 2;

function vignette(c, w, h, strength, cx = w / 2, cy = h / 2) {
  const g = c.createRadialGradient(cx, cy, Math.min(w, h) * 0.3, cx, cy, Math.max(w, h) * 0.75);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, `rgba(4, 3, 5, ${strength})`);
  c.fillStyle = g;
  c.fillRect(-20, -20, w + 40, h + 40);
}

function warmPool(c, x, y, r, alpha, squash = 1) {
  c.save();
  c.globalCompositeOperation = 'lighter';
  c.translate(x, y);
  c.scale(1, squash);
  const g = c.createRadialGradient(0, 0, 0, 0, 0, r);
  g.addColorStop(0, `rgba(255, 178, 98, ${alpha})`);
  g.addColorStop(0.5, `rgba(255, 168, 88, ${alpha * 0.35})`);
  g.addColorStop(1, 'rgba(255, 168, 88, 0)');
  c.fillStyle = g;
  c.fillRect(-r, -r, r * 2, r * 2);
  c.restore();
}

// ---------------------------------------------------------------------------
// shot 1: the five stones in his palm

/** Where each stone lies in the palm, in MAGIC_STONE_KINDS order, and when it lights (shot t). */
const STONES = Object.freeze([
  { x: 670, y: 424, r: 40, at: 0.1 },
  { x: 760, y: 404, r: 41, at: 0.2 },
  { x: 848, y: 426, r: 40, at: 0.3 },
  { x: 704, y: 522, r: 41, at: 0.4 },
  { x: 808, y: 532, r: 45, at: 0.52 },
]);

function paintPendingCase(c, w, h) {
  // the museum behind his hand, out of focus: the broken pending case, its lamps
  c.fillStyle = vgrad(c, 0, h, [[0, '#120b08'], [0.6, '#1c120b'], [1, '#0c0806']]);
  c.fillRect(-20, -20, w + 40, h + 40);
  // out of focus: painted small, then drawn back up smoothed (a filter blur
  // per stroke is far too slow on a software canvas)
  const k = 1 / 10;
  const soft = typeof document !== 'undefined' ? document.createElement('canvas') : null;
  if (soft) {
    soft.width = Math.ceil(w * k); soft.height = Math.ceil(h * k);
    const s = soft.getContext('2d');
    s.scale(k, k);
    wood(s, 80, 120, 1440, 520, { base: '#2a1a10', vertical: true, seed: 7601, grain: 'rgba(0,0,0,0.3)' });
    s.fillStyle = 'rgba(0,0,0,0.5)'; s.fillRect(80, 120, 1440, 520);
    s.strokeStyle = 'rgba(176, 138, 74, 0.6)'; s.lineWidth = 14;
    s.strokeRect(220, 180, 1160, 380);
    // the pigment vials still in the case
    ['#b0342a', '#7f9a6a', '#9ab8c8', '#e0a24a', '#6a4a8a'].forEach((col, i) => {
      s.fillStyle = col; s.globalAlpha = 0.5;
      s.fillRect(300 + i * 70, 420, 34, 90);
    });
    s.globalAlpha = 1;
    [[260, 110, 70], [1340, 140, 90], [1180, 90, 50], [480, 70, 40]].forEach(([x, y, r]) => { s.fillStyle = 'rgba(255, 196, 120, 0.22)'; s.beginPath(); s.arc(x, y, r, 0, TAU); s.fill(); });
    c.save();
    c.imageSmoothingEnabled = true;
    c.imageSmoothingQuality = 'high';
    c.drawImage(soft, 0, 0, soft.width, soft.height, 0, 0, soft.width / k, soft.height / k);
    c.restore();
  }
  // shards of the case's glass, catching the light
  const random = rng(7602);
  for (let i = 0; i < 26; i += 1) {
    const x = 120 + random() * 1360;
    const y = 120 + random() * 560;
    if (x > 480 && x < 1180 && y > 360) continue;
    const s = 6 + random() * 18;
    c.fillStyle = `rgba(214, 226, 236, ${0.05 + random() * 0.12})`;
    c.beginPath(); c.moveTo(x, y); c.lineTo(x + s, y + s * 0.3); c.lineTo(x + s * 0.2, y + s * 1.1); c.closePath(); c.fill();
  }
  finishLayer(c, w, h, { grain: 0.14, vig: 0.5 });
}

const SKIN = '#8c6a50';
const SKIN_LIGHT = '#a07e60';
const SKIN_DARK = '#5e4434';
const LINE = '#2a1a10';

/** A finger, palm side to us: from its base (x, y), `len` long, `wd` wide, leaning `rot`. */
function finger(c, x, y, len, wd, rot, seed) {
  c.save();
  c.translate(x, y);
  c.rotate(rot);
  const p = new Path2D();
  p.moveTo(-wd / 2, 20); p.lineTo(-wd * 0.46, -len + wd * 0.45);
  p.quadraticCurveTo(-wd * 0.44, -len, 0, -len); p.quadraticCurveTo(wd * 0.44, -len, wd * 0.46, -len + wd * 0.45);
  p.lineTo(wd / 2, 20); p.closePath();
  c.fillStyle = vgrad(c, -len, 20, [[0, SKIN_LIGHT], [0.6, SKIN], [1, SKIN_DARK]]);
  c.fill(p);
  // the pads between the creases, the fingertip lit by the stones
  c.fillStyle = 'rgba(255, 214, 170, 0.16)';
  c.beginPath(); c.ellipse(0, -len + wd * 0.5, wd * 0.32, wd * 0.42, 0, 0, TAU); c.fill();
  [0.36, 0.68].forEach((k, i) => ink(c, [[-wd * 0.36, -len * k], [0, -len * k + 3], [wd * 0.36, -len * k]], { w: 1.6, alpha: 0.42, bleed: false, jitter: 0.2, color: '#3a2216', seed: seed + i }));
  ink(c, [[-wd / 2, 20], [-wd * 0.46, -len + wd * 0.45], [-wd * 0.3, -len + 4], [0, -len], [wd * 0.3, -len + 4], [wd * 0.46, -len + wd * 0.45], [wd / 2, 20]], { w: 2.4, alpha: 0.75, bleed: false, jitter: 0.25, color: LINE, seed: seed + 5 });
  c.restore();
}

function paintHand(c, w, h) {
  // his coat sleeve from below, the cuff and its brass button
  c.fillStyle = vgrad(c, 660, 820, [[0, '#17282f'], [1, '#0b151a']]);
  c.beginPath(); c.moveTo(520, 840); c.quadraticCurveTo(560, 740, 590, 676); c.lineTo(900, 676); c.quadraticCurveTo(950, 740, 990, 840); c.closePath(); c.fill();
  c.fillStyle = '#0d181d';
  c.beginPath(); c.moveTo(588, 668); c.lineTo(904, 668); c.lineTo(916, 712); c.lineTo(578, 712); c.closePath(); c.fill();
  c.fillStyle = PAL.brassLight; c.beginPath(); c.arc(870, 690, 9, 0, TAU); c.fill();
  c.fillStyle = PAL.brassDark; c.beginPath(); c.arc(872, 692, 4, 0, TAU); c.fill();
  ink(c, [[578, 712], [588, 668], [904, 668], [916, 712]], { w: 2.4, alpha: 0.6, seed: 7611 });
  // the four fingers, a little apart, behind the palm's top edge
  [[648, 352, 150, 62, -0.16], [716, 334, 196, 68, -0.06], [792, 330, 214, 70, 0.03], [864, 344, 186, 66, 0.13]].forEach(([fx, fy, len, wd, rot], i) => finger(c, fx, fy, len, wd, rot, 7640 + i * 10));
  // the palm, cupped round the stones
  const palm = new Path2D();
  palm.moveTo(626, 676); palm.quadraticCurveTo(598, 560, 604, 440); palm.quadraticCurveTo(606, 360, 640, 340);
  palm.quadraticCurveTo(760, 312, 896, 344); palm.quadraticCurveTo(912, 420, 930, 520);
  palm.quadraticCurveTo(944, 620, 884, 676); palm.closePath();
  c.fillStyle = vgrad(c, 330, 680, [[0, SKIN_LIGHT], [0.45, SKIN], [1, SKIN_DARK]]);
  c.fill(palm);
  c.save();
  c.clip(palm);
  const g = c.createRadialGradient(762, 480, 30, 762, 480, 240);
  g.addColorStop(0, 'rgba(50, 26, 14, 0.42)');
  g.addColorStop(1, 'rgba(50, 26, 14, 0)');
  c.fillStyle = g; c.fillRect(560, 300, 420, 420);
  // the heel of the hand, catching light
  c.fillStyle = 'rgba(255, 210, 160, 0.1)';
  c.beginPath(); c.ellipse(660, 620, 70, 60, 0, 0, TAU); c.fill();
  c.restore();
  // palm lines
  [[[612, 420], [700, 400], [800, 404], [890, 380]], [[614, 470], [720, 460], [820, 480]], [[880, 640], [840, 560], [830, 460], [860, 360]]].forEach((pts, i) => ink(c, pts, { w: 1.6, alpha: 0.3, bleed: false, jitter: 0.4, color: '#3a2216', seed: 7613 + i }));
  ink(c, [[626, 676], [598, 560], [604, 440], [606, 360], [640, 340], [760, 312], [896, 344], [912, 420], [930, 520], [944, 620], [884, 676]], { w: 2.6, alpha: 0.75, bleed: false, jitter: 0.3, color: LINE, seed: 7616 });
  // the thumb, out to the right and curling in over the palm's edge
  c.save();
  c.translate(912, 600);
  c.rotate(0.62);
  const thumb = new Path2D();
  thumb.moveTo(-40, 30); thumb.lineTo(-36, -150); thumb.quadraticCurveTo(-34, -196, 0, -198); thumb.quadraticCurveTo(36, -196, 38, -150); thumb.lineTo(44, 40); thumb.closePath();
  c.fillStyle = vgrad(c, -198, 40, [[0, SKIN_LIGHT], [1, SKIN_DARK]]);
  c.fill(thumb);
  c.fillStyle = 'rgba(255, 214, 170, 0.16)';
  c.beginPath(); c.ellipse(0, -158, 24, 30, 0, 0, TAU); c.fill();
  ink(c, [[-26, -100], [0, -96], [26, -100]], { w: 1.6, alpha: 0.42, bleed: false, jitter: 0.2, color: '#3a2216', seed: 7650 });
  ink(c, [[-40, 30], [-36, -150], [-24, -192], [0, -198], [24, -192], [38, -150], [44, 40]], { w: 2.4, alpha: 0.75, bleed: false, jitter: 0.25, color: LINE, seed: 7651 });
  c.restore();
  // his lamp's light from the left, on the heel of the hand and the little finger
  const warm = c.createRadialGradient(420, 420, 40, 420, 420, 560);
  warm.addColorStop(0, 'rgba(255, 176, 96, 0.3)');
  warm.addColorStop(1, 'rgba(255, 176, 96, 0)');
  c.save(); c.globalCompositeOperation = 'lighter'; c.clip(palm); c.fillStyle = warm; c.fillRect(0, 0, w, h); c.restore();
  ink(c, [[628, 670], [600, 560], [606, 440], [610, 370]], { w: 2.4, alpha: 0.55, bleed: true, jitter: 0.2, color: '#ffc988', seed: 7630 });
}

/** The stones' names, typed down the dark beside the hand, each as its stone lights. */
const NAMES = Object.freeze({ x: 1090, y: 330, step: 54 });

function shotStones(c, t, w, h, env) {
  env.drawLayer(c, 'pending', paintPendingCase, { depth: 0.6 });
  env.drawLayer(c, 'hand', paintHand);
  const lit = STONES.map((s) => ramp(t, s.at, s.at + 0.07));
  // the stones' light, warming the palm as they come up
  const total = lit.reduce((a, b) => a + b, 0) / STONES.length;
  warmPool(c, 762, 480, 360, 0.22 * total, 0.8);
  STONES.forEach((s, i) => {
    const pulse = env.reducedMotion ? 0 : 0.08 * Math.sin(env.wall * 2.2 + i * 1.3);
    drawMagicStone(c, s.x, s.y, s.r, MAGIC_STONE_KINDS[i].kind, { on: lit[i] * (0.92 + pulse), wall: env.reducedMotion ? 0 : env.wall });
  });
  c.save();
  c.textBaseline = 'middle';
  c.font = '700 22px "Space Mono", monospace';
  STONES.forEach((s, i) => {
    const y = NAMES.y + i * NAMES.step;
    const k = lit[i];
    c.fillStyle = `rgba(176, 138, 74, ${0.25 + 0.5 * k})`;
    c.beginPath(); c.arc(NAMES.x, y, 8, 0, TAU); c.fill();
    if (k > 0) {
      c.fillStyle = `rgba(255, 207, 122, ${k})`;
      c.beginPath(); c.arc(NAMES.x, y, 5.5, 0, TAU); c.fill();
      c.fillStyle = `rgba(234, 214, 168, ${0.9 * k})`;
      c.fillText(MAGIC_STONE_KINDS[i].label, NAMES.x + 22, y + 1);
    }
  });
  c.restore();
  vignette(c, w, h, 0.45, 780, 470);
}

// ---------------------------------------------------------------------------
// shot 2: the door at the end of the museum

const DOOR = Object.freeze({ x: 640, y: 150, w: 320, h: 610, plate: { x: 672, y: 232, w: 256, h: 52 }, win: { x: 712, y: 306, w: 176, h: 140 } });
const FLOOR2 = 768;

function paintEndWall(c, w, h) {
  wood(c, -20, -20, w + 40, FLOOR2 + 40, { base: '#2a1a10', vertical: true, seed: 7701, grain: 'rgba(0,0,0,0.3)' });
  c.fillStyle = 'rgba(0,0,0,0.35)'; c.fillRect(-20, -20, w + 40, FLOOR2 + 40);
  c.fillStyle = brassFill(c, -20, 96, w + 40, 7); c.fillRect(-20, 96, w + 40, 6);
  wainscot(c, -20, w + 20, 560, FLOOR2, { seed: 7702, panelW: 160 });
  floorboards(c, -20, w + 20, FLOOR2, h, { seed: 7703 });
  // the timetable on the wall: every stop of the line, and no last carriage
  const tx = 200; const ty = 210; const tw = 300; const th = 290;
  c.fillStyle = PAL.walnutMid; c.fillRect(tx - 14, ty - 14, tw + 28, th + 28);
  c.fillStyle = '#b9ac8e'; c.fillRect(tx, ty, tw, th);
  c.fillStyle = 'rgba(42, 29, 20, 0.9)';
  c.font = '700 17px "Space Mono", monospace';
  c.fillText('NIGHT SERVICE', tx + 22, ty + 38);
  c.font = '400 13px "Space Mono", monospace';
  c.fillText('TIMETABLE · ALL STOPS', tx + 22, ty + 60);
  [['BELLWETHER', '23:10'], ['CITY TERMINAL', '23:40'], ['ECHO CITY', '14:20'], ['PAINTED COUNTRY', '—'], ['THE MUSEUM', '00:00']].forEach(([stop, time], i) => {
    const y = ty + 102 + i * 34;
    c.fillText(stop, tx + 22, y);
    c.textAlign = 'right'; c.fillText(time, tx + tw - 22, y); c.textAlign = 'left';
    c.strokeStyle = 'rgba(138, 42, 30, 0.35)'; c.lineWidth = 1; c.beginPath(); c.moveTo(tx + 22, y + 10); c.lineTo(tx + tw - 22, y + 10); c.stroke();
  });
  inkRect(c, tx - 14, ty - 14, tw + 28, th + 28, { w: 2, alpha: 0.6, seed: 7704 });
  // the pending case on the right, its glass broken, its socket empty
  const px = 1110; const py = 300; const pw = 320; const ph = 250;
  c.fillStyle = '#1a100a'; c.fillRect(px - 10, py - 10, pw + 20, ph + 20);
  c.fillStyle = 'rgba(80, 30, 28, 0.7)'; c.fillRect(px, py + ph * 0.55, pw, ph * 0.45);
  ['#b0342a', '#7f9a6a', '#9ab8c8', '#e0a24a'].forEach((col, i) => { c.fillStyle = col; c.globalAlpha = 0.55; roundRectPath(c, px + 30 + i * 46, py + 70, 26, 70, 6); c.fill(); });
  c.globalAlpha = 1;
  c.fillStyle = '#0a0605'; c.beginPath(); c.ellipse(px + pw * 0.72, py + ph * 0.72, 26, 14, 0, 0, TAU); c.fill();
  c.strokeStyle = brassFill(c, px, py, pw, ph); c.lineWidth = 8; c.strokeRect(px, py, pw, ph);
  c.strokeStyle = 'rgba(214, 226, 236, 0.35)'; c.lineWidth = 1.4;
  [[[px + 40, py], [px + 120, py + 90], [px + 90, py + 160]], [[px + 120, py + 90], [px + 220, py + 60], [px + pw, py + 110]], [[px + 220, py + 60], [px + 250, py]]].forEach((pts) => { c.beginPath(); pts.forEach(([x, y], k) => (k ? c.lineTo(x, y) : c.moveTo(x, y))); c.stroke(); });
  c.fillStyle = PAL.brassLight; c.font = '700 12px "Space Mono", monospace';
  c.fillText('PENDING', px + 12, py + ph + 30);
  // the gangway's bellows round the door: a carriage coupled to the building
  c.fillStyle = '#0a0807'; c.fillRect(DOOR.x - 60, DOOR.y - 50, DOOR.w + 120, FLOOR2 - DOOR.y + 50);
  for (let i = 0; i < 6; i += 1) {
    c.fillStyle = i % 2 ? '#15110e' : '#0d0a08';
    c.fillRect(DOOR.x - 60 + i * 10, DOOR.y - 50 + i * 8, 10, FLOOR2 - DOOR.y + 50 - i * 8);
    c.fillRect(DOOR.x + DOOR.w + 50 - i * 10, DOOR.y - 50 + i * 8, 10, FLOOR2 - DOOR.y + 50 - i * 8);
    c.fillRect(DOOR.x - 60 + i * 10, DOOR.y - 50 + i * 8, DOOR.w + 120 - i * 20, 8);
  }
  // the door: deep oxblood, brass-edged, riveted, never on any timetable
  c.fillStyle = vgrad(c, DOOR.y, FLOOR2, [[0, '#3a1410'], [1, '#22090a']]);
  c.fillRect(DOOR.x, DOOR.y, DOOR.w, FLOOR2 - DOOR.y);
  c.fillStyle = 'rgba(255, 210, 160, 0.06)'; c.fillRect(DOOR.x, DOOR.y, DOOR.w, 8);
  for (let y = DOOR.y + 20; y < FLOOR2 - 10; y += 40) { rivet(c, DOOR.x + 14, y, 4); rivet(c, DOOR.x + DOOR.w - 14, y, 4); }
  // the window, dark: nothing lit on the other side
  c.fillStyle = vgrad(c, DOOR.win.y, DOOR.win.y + DOOR.win.h, [[0, '#06080c'], [1, '#0c1018']]);
  roundRectPath(c, DOOR.win.x, DOOR.win.y, DOOR.win.w, DOOR.win.h, 18); c.fill();
  c.save(); c.lineWidth = 7; c.strokeStyle = brassFill(c, DOOR.win.x, DOOR.win.y, DOOR.win.w, DOOR.win.h); roundRectPath(c, DOOR.win.x, DOOR.win.y, DOOR.win.w, DOOR.win.h, 18); c.stroke(); c.restore();
  // the lower panel and kick plate, the handle
  inkRect(c, DOOR.x + 40, 500, DOOR.w - 80, 200, { w: 2, alpha: 0.4, seed: 7705 });
  c.fillStyle = brassFill(c, DOOR.x, FLOOR2 - 50, DOOR.w, 44); c.globalAlpha = 0.5; c.fillRect(DOOR.x + 6, FLOOR2 - 48, DOOR.w - 12, 42); c.globalAlpha = 1;
  c.fillStyle = brassFill(c, DOOR.x + DOOR.w - 48, 470, 22, 90, true); roundRectPath(c, DOOR.x + DOOR.w - 48, 470, 22, 90, 8); c.fill();
  // the brass plate
  const p = DOOR.plate;
  c.save();
  c.shadowColor = 'rgba(0,0,0,0.6)'; c.shadowBlur = 10; c.shadowOffsetY = 4;
  c.fillStyle = brassFill(c, p.x, p.y, p.w, p.h);
  roundRectPath(c, p.x, p.y, p.w, p.h, 8); c.fill();
  c.restore();
  c.strokeStyle = 'rgba(60, 40, 18, 0.8)'; c.lineWidth = 2; roundRectPath(c, p.x + 6, p.y + 6, p.w - 12, p.h - 12, 5); c.stroke();
  [[p.x + 14, p.y + p.h / 2], [p.x + p.w - 14, p.y + p.h / 2]].forEach(([x, y]) => rivet(c, x, y, 4));
  c.fillStyle = '#2a1a0a';
  c.font = '700 27px "Space Mono", monospace';
  c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText('LAST CARRIAGE', p.x + p.w / 2, p.y + p.h / 2 + 1, p.w - 44);
  c.textAlign = 'left'; c.textBaseline = 'alphabetic';
  ink(c, [[DOOR.x, FLOOR2], [DOOR.x, DOOR.y], [DOOR.x + DOOR.w, DOOR.y], [DOOR.x + DOOR.w, FLOOR2]], { w: 2.6, alpha: 0.7, seed: 7706 });
  finishLayer(c, w, h, { grain: 0.14, vig: 0.35 });
  // the end of the museum in the dark: his lamp will bring it up
  c.fillStyle = 'rgba(5, 4, 6, 0.45)'; c.fillRect(-20, -20, w + 40, h + 40);
}

const BUTCH2 = Object.freeze({ x: 790, y: 792, s: 1.78 });

function shotDoor(c, t, w, h, env) {
  env.drawLayer(c, 'end-wall', paintEndWall);
  const flicker = env.reducedMotion ? 0 : 0.05 * Math.sin(env.wall * 8.7) * Math.sin(env.wall * 3.4);
  const sway = env.reducedMotion ? 0 : Math.sin(env.wall * 1.2) * 10;
  // his lamp's light on the door and the plate
  warmPool(c, BUTCH2.x + 60 + sway, 520, 560, 0.2 + flicker, 1);
  // the plate catches it a beat later
  glow(c, DOOR.plate.x + DOOR.plate.w * 0.7, DOOR.plate.y + 10, 70, 'rgba(255, 228, 170, 1)', 0.35 * ramp(t, 0.3, 0.55));
  // his lamp in the door's dark window
  glow(c, DOOR.win.x + DOOR.win.w * 0.62 + sway * 0.3, DOOR.win.y + DOOR.win.h * 0.7, 26, 'rgba(255, 200, 130, 1)', 0.35);
  drawButchStandingBack(c, BUTCH2.x, BUTCH2.y, BUTCH2.s, { lampSide: 1, light: 1, glowAlpha: 0.7, phase: env.reducedMotion ? 0 : env.wall * 0.8, flame: 1 + flicker });
  vignette(c, w, h, 0.5, 800, 360);
}

// ---------------------------------------------------------------------------
// shot 3: inside: one seat, and the black ticket

const SEAT = Object.freeze({ x: 800, top: 330, w: 300, back: 300, floor: 742 });

function paintInterior(c, w, h) {
  damaskWall(c, -20, -20, w + 40, SEAT.floor + 40, { seed: 7801, tone: ['#070b0d', '#0d1517'] });
  // two windows either side of the seat: black, rain on the glass, nothing outside
  [[240, 170], [1100, 170]].forEach(([x, y], i) => {
    c.fillStyle = vgrad(c, y, y + 260, [[0, '#04060a'], [1, '#080c12']]);
    roundRectPath(c, x, y, 260, 260, 18); c.fill();
    c.strokeStyle = 'rgba(200, 220, 240, 0.07)'; c.lineWidth = 1;
    const random = rng(7802 + i);
    for (let k = 0; k < 28; k += 1) { const rx = x + random() * 260; const ry = y + random() * 260; c.beginPath(); c.moveTo(rx, ry); c.lineTo(rx - 4, ry + 16); c.stroke(); }
    c.save(); c.globalAlpha = 0.45; c.lineWidth = 7; c.strokeStyle = brassFill(c, x, y, 260, 260); roundRectPath(c, x, y, 260, 260, 18); c.stroke(); c.restore();
  });
  wainscot(c, -20, w + 20, 520, SEAT.floor, { seed: 7803, panelW: 170 });
  floorboards(c, -20, w + 20, SEAT.floor, h, { seed: 7804 });
  // the seat, facing us: a high tufted oxblood back, the cushion, its walnut frame
  const { x, top, w: sw, floor } = SEAT;
  c.save();
  c.shadowColor = 'rgba(0,0,0,0.7)'; c.shadowBlur = 30;
  c.fillStyle = '#1a0d09';
  roundRectPath(c, x - sw / 2 - 18, top - 16, sw + 36, floor - top + 16, 30); c.fill();
  c.restore();
  wood(c, x - sw / 2 - 18, top - 16, sw + 36, floor - top + 16, { base: '#2c1a10', vertical: true, seed: 7805 });
  c.fillStyle = vgrad(c, top, top + SEAT.back, [[0, '#6a2a20'], [1, '#3e1813']]);
  roundRectPath(c, x - sw / 2, top, sw, SEAT.back, 24); c.fill();
  c.fillStyle = 'rgba(0,0,0,0.25)';
  for (let r = 0; r < 4; r += 1) for (let k = 0; k < 4; k += 1) { c.beginPath(); c.arc(x - sw * 0.36 + k * sw * 0.24 + (r % 2) * sw * 0.12, top + 50 + r * 64, 4, 0, TAU); c.fill(); }
  // the lace antimacassar over the top of the back
  c.fillStyle = 'rgba(230, 220, 196, 0.85)';
  c.beginPath(); c.moveTo(x - 90, top + 4); c.lineTo(x + 90, top + 4); c.lineTo(x + 80, top + 70); c.quadraticCurveTo(x, top + 86, x - 80, top + 70); c.closePath(); c.fill();
  c.strokeStyle = 'rgba(120, 100, 70, 0.4)'; c.lineWidth = 1;
  for (let k = -3; k <= 3; k += 1) { c.beginPath(); c.arc(x + k * 24, top + 74 - Math.abs(k) * 2, 6, 0, Math.PI); c.stroke(); }
  // the cushion
  c.fillStyle = vgrad(c, top + SEAT.back - 10, top + SEAT.back + 60, [[0, '#7a3226'], [1, '#4a1c15']]);
  roundRectPath(c, x - sw / 2 - 10, top + SEAT.back - 10, sw + 20, 64, 16); c.fill();
  c.fillStyle = 'rgba(255, 210, 170, 0.12)'; c.fillRect(x - sw / 2, top + SEAT.back - 6, sw, 4);
  // its brass grab rail
  c.strokeStyle = brassFill(c, x - sw / 2, top - 30, sw, 20); c.lineWidth = 5;
  c.beginPath(); c.moveTo(x - sw * 0.35, top - 6); c.quadraticCurveTo(x, top - 30, x + sw * 0.35, top - 6); c.stroke();
  ink(c, [[x - sw / 2 - 18, floor], [x - sw / 2 - 18, top + 14], [x - sw / 2 + 12, top - 16], [x + sw / 2 - 12, top - 16], [x + sw / 2 + 18, top + 14], [x + sw / 2 + 18, floor]], { w: 2.6, alpha: 0.65, seed: 7806 });
  finishLayer(c, w, h, { grain: 0.14, vig: 0.6 });
  c.fillStyle = 'rgba(3, 3, 5, 0.4)'; c.fillRect(-20, -20, w + 40, h + 40);
}

/** The light through the open door behind us: a warm wedge on the floor and the seat's foot. */
function doorLight(c, w, h, k) {
  if (k <= 0) return;
  c.save();
  c.globalCompositeOperation = 'lighter';
  const g = c.createLinearGradient(0, h, 0, SEAT.floor - 120);
  g.addColorStop(0, `rgba(255, 186, 110, ${0.3 * k})`);
  g.addColorStop(1, 'rgba(255, 186, 110, 0)');
  c.fillStyle = g;
  c.beginPath(); c.moveTo(520, h + 20); c.lineTo(1080, h + 20); c.lineTo(960, SEAT.floor - 120); c.lineTo(640, SEAT.floor - 120); c.closePath(); c.fill();
  c.restore();
}

function shotSeat(c, t, w, h, env) {
  env.drawLayer(c, 'interior', paintInterior);
  doorLight(c, w, h, 1);
  // dust in the door's light
  if (!env.reducedMotion) {
    const random = rng(7810);
    const n = env.lowGraphics ? 8 : 18;
    c.fillStyle = 'rgba(255, 226, 180, 0.28)';
    for (let i = 0; i < n; i += 1) {
      const x = 560 + random() * 480 + Math.sin(env.wall * 0.4 + i) * 16;
      const y = h + 10 - ((random() * 160 + env.wall * (5 + random() * 6)) % 170);
      c.beginPath(); c.arc(x, y, 0.8 + random(), 0, TAU); c.fill();
    }
  }
  // the ticket over the seat: black, turning slowly, never punched
  const bob = env.reducedMotion ? 0 : Math.sin(env.wall * 0.9) * 9;
  const turn = env.reducedMotion ? 1 : 0.8 + 0.2 * Math.cos(env.wall * 0.7);
  const tx = SEAT.x; const ty = 214 + bob;
  glow(c, tx, ty, 260, 'rgba(255, 210, 150, 0.9)', 0.12);
  drawBlackTicket(c, tx, ty, { w: 300, angle: -0.04 + (env.reducedMotion ? 0 : 0.03 * Math.sin(env.wall * 0.5)), turn, glint: 0.6 + 0.4 * Math.sin(env.wall * 1.7) });
  vignette(c, w, h, 0.5, 800, 330);
  void t;
}

// ---------------------------------------------------------------------------
// shot 4: he steps in; the door closes

const WAY = Object.freeze({ x: 650, y: 150, w: 300, h: 610 });

function paintDoorwayBeyond(c, w, h) {
  // through the doorway: the museum hall he has just left, lamplit, its inlay running away
  const k = WAY.h / 800;
  c.save();
  c.beginPath(); c.rect(WAY.x, WAY.y, WAY.w, WAY.h); c.clip();
  c.translate(WAY.x + WAY.w / 2 - 800 * k, WAY.y);
  c.scale(k, k);
  paintMuseumHall(c, 1600, 800, { end: 'doors' });
  hallLamps().forEach((lamp) => glow(c, lamp.hood[0], lamp.hood[1] + 8 * lamp.scale, 90 * lamp.scale, 'rgba(255, 214, 150, 1)', 0.6));
  c.restore();
  c.save();
  c.beginPath(); c.rect(WAY.x, WAY.y, WAY.w, WAY.h); c.clip();
  c.globalCompositeOperation = 'lighter';
  c.fillStyle = vgrad(c, WAY.y, WAY.y + WAY.h, [[0, 'rgba(255, 190, 120, 0.12)'], [0.5, 'rgba(255, 196, 130, 0.3)'], [1, 'rgba(255, 180, 110, 0.22)']]);
  c.fillRect(WAY.x, WAY.y, WAY.w, WAY.h);
  c.restore();
}

function paintCarriageEnd(c, w, h) {
  damaskWall(c, -20, -20, w + 40, h + 40, { seed: 7910, tone: ['#06090b', '#0b1113'] });
  wainscot(c, -20, w + 20, 520, 760, { seed: 7911, panelW: 170 });
  floorboards(c, -20, w + 20, 760, h, { seed: 7912 });
  // the door frame, the doorway cut clear
  c.fillStyle = brassFill(c, WAY.x - 22, WAY.y - 22, WAY.w + 44, WAY.h + 22);
  c.fillRect(WAY.x - 20, WAY.y - 20, WAY.w + 40, WAY.h + 20);
  c.fillStyle = '#1a0d09'; c.fillRect(WAY.x - 12, WAY.y - 12, WAY.w + 24, WAY.h + 12);
  finishLayer(c, w, h, { grain: 0.14, vig: 0.55 });
  c.fillStyle = 'rgba(3, 3, 5, 0.45)'; c.fillRect(-20, -20, w + 40, h + 40);
  c.clearRect(WAY.x, WAY.y, WAY.w, WAY.h);
}

function shotClose(c, t, w, h, env) {
  const close = smooth(ramp(t, 0.42, 0.72));
  const open = 1 - close;
  // the museum through the doorway, the door sliding across it from the right
  env.drawLayer(c, 'beyond', paintDoorwayBeyond);
  const doorX = WAY.x + WAY.w * open;
  c.save();
  c.beginPath(); c.rect(WAY.x, WAY.y, WAY.w, WAY.h); c.clip();
  c.fillStyle = vgrad(c, WAY.y, WAY.y + WAY.h, [[0, '#1c0a08'], [1, '#100605']]);
  c.fillRect(doorX, WAY.y, WAY.w + 4, WAY.h);
  c.fillStyle = 'rgba(255, 200, 140, 0.25)'; c.fillRect(doorX, WAY.y, 3, WAY.h);
  c.restore();
  env.drawLayer(c, 'carriage-end', paintCarriageEnd);
  // the doorway's light on the carriage floor, narrowing with the door
  if (open > 0.001) {
    c.save();
    c.globalCompositeOperation = 'lighter';
    const g = c.createLinearGradient(0, 760, 0, h + 40);
    g.addColorStop(0, `rgba(255, 190, 120, ${0.32 * Math.min(1, open * 1.6)})`);
    g.addColorStop(1, 'rgba(255, 190, 120, 0)');
    c.fillStyle = g;
    const x0 = WAY.x; const x1 = WAY.x + WAY.w * open;
    c.beginPath(); c.moveTo(x0, 760); c.lineTo(x1, 760); c.lineTo(x1 + (x1 - 800) * 0.7, h + 40); c.lineTo(x0 - 100, h + 40); c.closePath(); c.fill();
    glow(c, WAY.x + WAY.w * open * 0.5, WAY.y + WAY.h * 0.5, 420 * Math.max(0.3, open), 'rgba(255, 196, 130, 0.9)', 0.18 * open);
    c.restore();
  }
  // Butch, backlit, steps in out of the doorway
  const step = smooth(ramp(t, 0.04, 0.4)); // he walks in under Reduce Motion too: it is the story, not decoration
  const bx = 800 + 150 * step;
  const by = 762 + 34 * step;
  const bs = 1.8 + 0.3 * step;
  const phase = env.reducedMotion ? 0 : step * 6;
  let lamp = null;
  drawBacklit(c, { x: bx - 160, y: by - 200 * bs, w: 320, h: 200 * bs + 20 }, Math.min(2, env.res), (oc) => {
    lamp = drawButchStandingBack(oc, bx, by, bs, { lampSide: 1, light: 0.6, glowAlpha: 0, phase }).lamp;
  }, { shade: 0.9 });
  // his lamp: the one light left
  if (lamp) {
    glow(c, lamp.x, lamp.y, 60 * bs, 'rgba(255, 210, 140, 1)', 0.8);
    warmPool(c, lamp.x, 780, 320, 0.12 + 0.1 * close, 0.25);
  }
  vignette(c, w, h, 0.45 + 0.25 * close, 800, 420);
}

function shotBlack(c, t, w, h) {
  c.fillStyle = '#020306';
  c.fillRect(-10, -10, w + 20, h + 20);
}

// ---------------------------------------------------------------------------

export const chapter5ToBlackKnife = {
  id: 'chapter5-to-black-knife',
  title: 'The last carriage',
  length: [25, 40],
  music: { id: 'cutscene-5-6-last-carriage', src: '/assets/music/ch1/1.1_train_undertow.mp3', volume: 0.4, fade: 3, outFade: 2.5 },
  prepare: () => usePaintAssets({ paper: paperUrl, train: trainUrl }),
  shots: [
    {
      id: 'five-stones',
      duration: 8.6,
      draw: shotStones,
      camera: { from: { x: 0.52, y: 0.5, zoom: 1.04 }, to: { x: 0.53, y: 0.53, zoom: 1.14 }, still: { x: 0.52, y: 0.52, zoom: 1.08 } },
      transition: { type: 'ink', duration: 1.1 },
      captions: [{ text: 'Five things the archive could not file.', at: 4.6, end: 8.4 }],
      cues: [
        { at: 0.9, sfx: 'softBell' }, { at: 1.7, sfx: 'softBell' }, { at: 2.6, sfx: 'softBell' }, { at: 3.4, sfx: 'softBell' }, { at: 4.5, sfx: 'bell' },
      ],
    },
    {
      id: 'last-carriage',
      duration: 8,
      draw: shotDoor,
      camera: { from: { x: 0.5, y: 0.5, zoom: 1.0 }, to: { x: 0.5, y: 0.37, zoom: 1.55 }, still: { x: 0.5, y: 0.45, zoom: 1.15 } },
      transition: { type: 'fade', duration: 1.2 },
      cues: [{ at: 0.4, sfx: 'rail', level: 0.35 }],
    },
    {
      id: 'one-seat',
      duration: 8.4,
      draw: shotSeat,
      camera: { from: { x: 0.5, y: 0.55, zoom: 1.0 }, to: { x: 0.5, y: 0.42, zoom: 1.3 }, still: { x: 0.5, y: 0.48, zoom: 1.1 } },
      transition: { type: 'slide', duration: 1.1 },
      captions: [{ text: 'A ticket that is never punched…', at: 2.0, end: 6.6 }],
      cues: [{ at: 0, sfx: 'rail', level: 0.6 }, { at: 1.6, sfx: 'paper' }],
    },
    {
      id: 'door-closes',
      duration: 7.6,
      draw: shotClose,
      camera: { from: { x: 0.5, y: 0.5, zoom: 1.08 }, to: { x: 0.52, y: 0.52, zoom: 1.18 }, still: { x: 0.5, y: 0.5, zoom: 1.1 } },
      transition: { type: 'cut' },
      captions: [{ text: '…never ends its journey.', at: 1.6, end: 6.4 }],
      cues: [{ at: 5.3, sfx: 'thud' }, { at: 4.6, stopMusic: true, fade: 3.4 }, { at: 5.5, sfx: 'rail', level: 1 }],
    },
    {
      id: 'black',
      duration: 2.2,
      draw: shotBlack,
      blackout: true,
      cues: [{ at: 0.2, stopSfx: 'rail', fade: 1.6 }],
    },
  ],
};

export default chapter5ToBlackKnife;
