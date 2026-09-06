// Chapter 3 // ECHO CITY — art helpers and asset-slot contract.
//
// SUPERSEDED 2026-08-05: replaced by echoCityIsoArt.js + the Blender-baked
// layers in assets-iso/ (Gate 5). Kept for reference only.
//
// Art direction target (docs/GAME_MASTER_V2_SIX_CHAPTERS.md §11): original
// hand-painted storybook language — soft urban watercolor, paper-cut crowd
// silhouettes, graphite contours, concrete warm grey + transit green + cyan
// relationship + amber transmission + red danger. Everything in this file is
// PROVISIONAL BLOCKOUT drawn with the project's 24-colour CAR palette; the
// ECHO_ASSET_SLOTS manifest below names every slot so Jason's later painted
// exports can replace blockout layers without touching mechanics.
//
// Layer separation contract (work package §6):
//   background(0) < middle-ground mechanisms(200) < far actors(450) <
//   near actors(550) < relationship graphics(600) < foreground(700) < UI(900)
// Collision and cycle data live in echoCityModel.js and never depend on the
// painted surfaces drawn here.
//
// Mechanism draw functions use LOCAL coordinates with the floor contact
// point at (0, 0); the scene positions/scales the graphics objects, so a
// painted replacement sprite can drop into the same origin/depth slot.

import { C, CAR } from '../../art/colors.js';
import { GAME_W, GAME_H, LANE_FAR, LANE_NEAR } from '../../constants.js';

// ---------------------------------------------------------------------------
// World + lane geometry (matches echoCityModel.js spaces).
// ---------------------------------------------------------------------------

export const ECHO_WORLD_LENGTH = 3600;
export const ECHO_SPACE_BOUNDS = Object.freeze({
  MARKET: Object.freeze({ x0: 0, x1: 1280 }),
  TRANSIT: Object.freeze({ x0: 1280, x1: 2640 }),
  SQUARE: Object.freeze({ x0: 2640, x1: 3600 }),
});

export const ECHO_LANE_Y = Object.freeze({ [LANE_FAR]: 478, [LANE_NEAR]: 546 });
export const ECHO_LANE_SCALE = Object.freeze({ [LANE_FAR]: 0.86, [LANE_NEAR]: 1.0 });
export const ECHO_LANE_DEPTH = Object.freeze({ [LANE_FAR]: 450, [LANE_NEAR]: 550 });

export function echoLaneToY(lane) {
  return ECHO_LANE_Y[lane] ?? ECHO_LANE_Y[LANE_NEAR];
}
export function echoLaneScale(lane) {
  return ECHO_LANE_SCALE[lane] ?? 1;
}
export function echoLaneDepth(lane) {
  return ECHO_LANE_DEPTH[lane] ?? ECHO_LANE_DEPTH[LANE_NEAR];
}
export function echoLerpLane(from, to, t) {
  const k = Math.max(0, Math.min(1, t));
  return {
    y: echoLaneToY(from) + (echoLaneToY(to) - echoLaneToY(from)) * k,
    scale: echoLaneScale(from) + (echoLaneScale(to) - echoLaneScale(from)) * k,
    depth: Math.round(echoLaneDepth(from) + (echoLaneDepth(to) - echoLaneDepth(from)) * k),
  };
}

export function echoEaseInOut(t) {
  const k = Math.max(0, Math.min(1, t));
  return k < 0.5 ? 2 * k * k : 1 - ((-2 * k + 2) ** 2) / 2;
}

// Palette hex strings for Phaser Text objects (same values as CAR.*).
export const ETXT = Object.freeze({
  white: '#dfe7f2',
  ok: '#75d4cd',
  warn: '#e4c276',
  alert: '#e45a5f',
  ink: '#0a1015',
  panel: '#17232b',
  steel: '#9fb7c0',
  tungsten: '#ffc98a',
});

// ---------------------------------------------------------------------------
// Asset-slot manifest — the replaceable-art contract. Every entry names the
// future painted file, its dimensions/origin/depth, repeat behavior, what
// gameplay status it visualizes, and whether it is placeholder or final.
// ---------------------------------------------------------------------------

export const ECHO_ASSET_SLOTS = Object.freeze([
  // -- Shared skyline / backdrop -------------------------------------------
  Object.freeze({ id: 'echo-skyline', file: 'chapter03/background/skyline.png', width: 1920, height: 600, origin: { x: 0, y: 0 }, depth: 0, scrollFactor: 0.5, repeat: 'tile-x', statusUse: 'all-spaces-backdrop', status: 'placeholder' }),
  Object.freeze({ id: 'echo-street-floor', file: 'chapter03/background/street-floor.png', width: 3600, height: 600, origin: { x: 0, y: 0 }, depth: 300, scrollFactor: 1, repeat: 'none', statusUse: 'two-depth-lane-concrete', status: 'placeholder' }),
  Object.freeze({ id: 'echo-paper-grain', file: 'chapter03/background/paper-grain.png', width: 960, height: 600, origin: { x: 0.5, y: 0.5 }, depth: 5, scrollFactor: 0, repeat: 'stretch', statusUse: 'storybook-texture-overlay', status: 'placeholder' }),
  // -- Space A: LIVING MARKET ----------------------------------------------
  Object.freeze({ id: 'market-bg-stalls', file: 'chapter03/market/stalls-back.png', width: 1280, height: 600, origin: { x: 0, y: 0 }, depth: 100, scrollFactor: 1, repeat: 'none', statusUse: 'market-midground-stalls', status: 'placeholder' }),
  Object.freeze({ id: 'market-transit-sign', file: 'chapter03/market/transit-sign.png', width: 120, height: 220, origin: { x: 0.5, y: 1 }, depth: 210, scrollFactor: 1, repeat: 'none', statusUse: 'courier-loop-anchor', status: 'placeholder' }),
  Object.freeze({ id: 'market-inspection-strip', file: 'chapter03/market/inspection-strip.png', width: 80, height: 240, origin: { x: 0.5, y: 1 }, depth: 215, scrollFactor: 1, repeat: 'none', statusUse: 'unrecognized|recognized', status: 'placeholder' }),
  Object.freeze({ id: 'market-gate', file: 'chapter03/market/inspection-gate.png', width: 180, height: 320, origin: { x: 0.5, y: 1 }, depth: 220, scrollFactor: 1, repeat: 'none', statusUse: 'closed|opening|open', status: 'placeholder' }),
  Object.freeze({ id: 'market-foreground-crates', file: 'chapter03/market/foreground-crates.png', width: 1280, height: 160, origin: { x: 0, y: 1 }, depth: 700, scrollFactor: 1, repeat: 'none', statusUse: 'market-foreground-occluders', status: 'placeholder' }),
  // -- Space B: TRANSIT SQUARE ----------------------------------------------
  Object.freeze({ id: 'transit-bg-plaza', file: 'chapter03/transit/plaza-back.png', width: 1360, height: 600, origin: { x: 0, y: 0 }, depth: 100, scrollFactor: 1, repeat: 'none', statusUse: 'transit-midground', status: 'placeholder' }),
  Object.freeze({ id: 'transit-bus', file: 'chapter03/transit/bus.png', width: 300, height: 180, origin: { x: 0.5, y: 1 }, depth: 430, scrollFactor: 1, repeat: 'none', statusUse: 'stop|open|go-door-phase', status: 'placeholder' }),
  Object.freeze({ id: 'transit-crosswalk-pole', file: 'chapter03/transit/crosswalk-pole.png', width: 90, height: 260, origin: { x: 0.5, y: 1 }, depth: 210, scrollFactor: 1, repeat: 'none', statusUse: 'wait|walk-signal-head', status: 'placeholder' }),
  Object.freeze({ id: 'transit-barrier', file: 'chapter03/transit/road-barrier.png', width: 180, height: 200, origin: { x: 0.5, y: 1 }, depth: 230, scrollFactor: 1, repeat: 'none', statusUse: 'idle|cycling-open|stalled-stop', status: 'placeholder' }),
  Object.freeze({ id: 'transit-field-pylons', file: 'chapter03/transit/surveillance-pylons.png', width: 360, height: 300, origin: { x: 0, y: 1 }, depth: 240, scrollFactor: 1, repeat: 'none', statusUse: 'field-idle|warning|safe', status: 'placeholder' }),
  // -- Space C: SILENT CENTRAL SQUARE ----------------------------------------
  Object.freeze({ id: 'square-bg-monument', file: 'chapter03/square/monument-back.png', width: 960, height: 600, origin: { x: 0, y: 0 }, depth: 100, scrollFactor: 1, repeat: 'none', statusUse: 'silent-square-midground', status: 'placeholder' }),
  Object.freeze({ id: 'square-witness-gate', file: 'chapter03/square/witness-gate.png', width: 240, height: 360, origin: { x: 0.5, y: 1 }, depth: 230, scrollFactor: 1, repeat: 'none', statusUse: 'closed|opening|open', status: 'placeholder' }),
  Object.freeze({ id: 'square-resonance-bell', file: 'chapter03/square/resonance-bell.png', width: 120, height: 180, origin: { x: 0.5, y: 1 }, depth: 220, scrollFactor: 1, repeat: 'none', statusUse: 'idle|resonating|resonated', status: 'placeholder' }),
  Object.freeze({ id: 'square-record-mark', file: 'chapter03/square/record-mark.png', width: 120, height: 40, origin: { x: 0.5, y: 0.5 }, depth: 310, scrollFactor: 1, repeat: 'none', statusUse: 'idle|recording', status: 'placeholder' }),
  // -- Characters (A2 kit reused as provisional structural material) --------
  Object.freeze({ id: 'echo-hero', file: 'outputs/car03-a2-production-assets/characters/hero-spritesheet.png', width: 1152, height: 120, origin: { x: 0.5, y: 0.916 }, depth: 550, scrollFactor: 1, repeat: 'sheet', statusUse: 'butch-idle|walk', status: 'placeholder' }),
  Object.freeze({ id: 'echo-mara', file: 'outputs/car03-a2-production-assets/characters/companion-spritesheet.png', width: 1152, height: 120, origin: { x: 0.5, y: 0.916 }, depth: 550, scrollFactor: 1, repeat: 'sheet', statusUse: 'mara-waiting|performing|crossing|reunited', status: 'placeholder' }),
  Object.freeze({ id: 'echo-crowd', file: 'outputs/car03-a2-production-assets/characters/commuters-spritesheet.png', width: 1152, height: 120, origin: { x: 0.5, y: 0.916 }, depth: 550, scrollFactor: 1, repeat: 'sheet', statusUse: 'courier|market-group|lone-walker|crowd-island', status: 'placeholder' }),
]);

// ---------------------------------------------------------------------------
// Cycle pictogram icons — the shape language for carried cycles and receiver
// panels. Icons read at 40px+ without colour: each is a distinct glyph.
// ---------------------------------------------------------------------------

export function drawCycleIcon(g, icon, x, y, s, color, alpha = 1) {
  g.lineStyle(3, color, alpha);
  g.fillStyle(color, alpha);
  switch (icon) {
    case 'MOVE': { // right arrow over a footstep
      g.beginPath();
      g.moveTo(x - s * 0.55, y);
      g.lineTo(x + s * 0.3, y);
      g.strokePath();
      g.fillTriangle(x + s * 0.25, y - s * 0.3, x + s * 0.25, y + s * 0.3, x + s * 0.62, y);
      g.fillEllipse(x - s * 0.42, y + s * 0.42, s * 0.3, s * 0.44);
      break;
    }
    case 'WAIT': { // hourglass pause
      g.beginPath();
      g.moveTo(x - s * 0.4, y - s * 0.5);
      g.lineTo(x + s * 0.4, y - s * 0.5);
      g.lineTo(x - s * 0.4, y + s * 0.5);
      g.lineTo(x + s * 0.4, y + s * 0.5);
      g.closePath();
      g.strokePath();
      break;
    }
    case 'RETURN': { // left arrow looping back
      g.beginPath();
      g.moveTo(x + s * 0.55, y);
      g.lineTo(x - s * 0.3, y);
      g.strokePath();
      g.fillTriangle(x - s * 0.25, y - s * 0.3, x - s * 0.25, y + s * 0.3, x - s * 0.62, y);
      g.lineStyle(3, color, alpha * 0.8);
      g.strokeCircle(x + s * 0.32, y - s * 0.3, s * 0.2);
      break;
    }
    case 'STOP': { // octagon hand
      const r = s * 0.55;
      g.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = (Math.PI / 4) * i + Math.PI / 8;
        const px = x + Math.cos(a) * r;
        const py = y + Math.sin(a) * r;
        if (i === 0) g.moveTo(px, py);
        else g.lineTo(px, py);
      }
      g.closePath();
      g.strokePath();
      g.fillRect(x - s * 0.3, y - s * 0.08, s * 0.6, s * 0.16);
      break;
    }
    case 'OPEN': { // sliding doors apart
      g.strokeRect(x - s * 0.6, y - s * 0.5, s * 0.42, s);
      g.strokeRect(x + s * 0.18, y - s * 0.5, s * 0.42, s);
      g.fillTriangle(x - s * 0.08, y - s * 0.16, x - s * 0.08, y + s * 0.16, x - s * 0.3, y);
      g.fillTriangle(x + s * 0.08, y - s * 0.16, x + s * 0.08, y + s * 0.16, x + s * 0.3, y);
      break;
    }
    case 'GO': { // double chevron right
      g.lineStyle(4, color, alpha);
      g.beginPath();
      g.moveTo(x - s * 0.5, y - s * 0.4);
      g.lineTo(x - s * 0.1, y);
      g.lineTo(x - s * 0.5, y + s * 0.4);
      g.moveTo(x + s * 0.05, y - s * 0.4);
      g.lineTo(x + s * 0.45, y);
      g.lineTo(x + s * 0.05, y + s * 0.4);
      g.strokePath();
      break;
    }
    case 'WALK': { // walking figure
      g.fillCircle(x, y - s * 0.42, s * 0.16);
      g.lineStyle(4, color, alpha);
      g.beginPath();
      g.moveTo(x, y - s * 0.26);
      g.lineTo(x, y + s * 0.1);
      g.moveTo(x, y + s * 0.1);
      g.lineTo(x - s * 0.26, y + s * 0.5);
      g.moveTo(x, y + s * 0.1);
      g.lineTo(x + s * 0.26, y + s * 0.5);
      g.moveTo(x, y - s * 0.16);
      g.lineTo(x + s * 0.3, y + s * 0.02);
      g.strokePath();
      break;
    }
    case 'RESONATE': { // bell with waves
      g.lineStyle(3, color, alpha);
      g.strokeCircle(x, y, s * 0.24);
      g.strokeCircle(x, y, s * 0.45);
      g.strokeCircle(x, y, s * 0.64);
      g.fillCircle(x, y, s * 0.1);
      break;
    }
    default: {
      g.strokeCircle(x, y, s * 0.4);
      break;
    }
  }
}

// A horizontal strip of pictograms with arrows between them — used above the
// player while carrying and above installed receivers.
export function drawCycleStrip(g, icons, x, y, iconSize, color, alpha = 1) {
  if (!icons || icons.length === 0) return;
  const gap = iconSize * 1.7;
  const left = x - ((icons.length - 1) * gap) / 2;
  for (let i = 0; i < icons.length; i++) {
    const ix = left + i * gap;
    g.fillStyle(C(CAR.VOID_LIFT), 0.82 * alpha);
    g.fillRoundedRect(ix - iconSize * 0.8, y - iconSize * 0.8, iconSize * 1.6, iconSize * 1.6, 6);
    drawCycleIcon(g, icons[i], ix, y, iconSize, color, alpha);
    if (i < icons.length - 1) {
      g.fillStyle(color, 0.85 * alpha);
      g.fillTriangle(ix + gap * 0.42, y - 6, ix + gap * 0.42, y + 6, ix + gap * 0.58, y);
    }
  }
}

// ---------------------------------------------------------------------------
// Focus outline — the single highlighted target frame.
// ---------------------------------------------------------------------------

export function drawFocusOutline(g, x, yFeet, w, h, color, pulse = 0) {
  const white = C(CAR.HERO_BASE);
  const left = x - w / 2;
  const top = yFeet - h;
  const a = 0.7 + pulse * 0.3;
  g.lineStyle(3, white, a);
  g.strokeRoundedRect(left, top, w, h, 8);
  g.lineStyle(4, color, 0.95);
  const t = 14;
  g.beginPath();
  g.moveTo(left - 3, top + t);
  g.lineTo(left - 3, top - 3);
  g.lineTo(left + t, top - 3);
  g.moveTo(left + w - t, top - 3);
  g.lineTo(left + w + 3, top - 3);
  g.lineTo(left + w + 3, top + t);
  g.moveTo(left + w + 3, top + h - t);
  g.lineTo(left + w + 3, top + h + 3);
  g.lineTo(left + w - t, top + h + 3);
  g.moveTo(left + t, top + h + 3);
  g.lineTo(left - 3, top + h + 3);
  g.lineTo(left - 3, top + h - t);
  g.strokePath();
}

// ---------------------------------------------------------------------------
// Resonance rings — observation progress and the amber record mark.
// ---------------------------------------------------------------------------

export function drawProgressRing(g, x, y, radius, progress, color, alpha = 1) {
  const k = Math.max(0, Math.min(1, progress));
  g.lineStyle(4, C(CAR.STEEL_MID), 0.4 * alpha);
  g.strokeCircle(x, y, radius);
  if (k > 0.001) {
    g.lineStyle(5, color, 0.95 * alpha);
    g.beginPath();
    g.arc(x, y, radius, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false);
    g.strokePath();
  }
}

// Record mark — local coordinates, floor centre at (0, 0).
export function drawRecordMark(g, active, pulse = 0) {
  const amber = C(CAR.LAMP_WARN);
  const a = active ? 0.95 : 0.45 + pulse * 0.25;
  g.lineStyle(4, amber, a);
  g.strokeEllipse(0, 0, 96, 26);
  g.lineStyle(2, amber, a * 0.7);
  g.strokeEllipse(0, 0, 58, 15);
  g.fillStyle(amber, a);
  g.fillCircle(0, 0, 6);
  // Small camera glyph floating above: recording semantics without words.
  const gy = -124 - pulse * 5;
  g.lineStyle(3, amber, a);
  g.strokeRoundedRect(-16, gy - 11, 32, 22, 4);
  g.fillStyle(amber, a);
  g.fillCircle(0, gy, 6);
}

// ---------------------------------------------------------------------------
// Relationship paths — cyan held, amber in-transit, red failed.
// ---------------------------------------------------------------------------

export function drawRelationshipPath(g, x1, x2, y, color, alpha, phase = 0) {
  if (alpha <= 0.01) return;
  const lo = Math.min(x1, x2);
  const hi = Math.max(x1, x2);
  g.lineStyle(3, color, 0.55 * alpha);
  g.beginPath();
  g.moveTo(lo, y);
  g.lineTo(hi, y);
  g.strokePath();
  // Traveling pulse dots — motion reinforces the relationship without words.
  const span = hi - lo;
  if (span > 8) {
    const p = ((phase % 1) + 1) % 1;
    for (let i = 0; i < 3; i++) {
      const t = (p + i / 3) % 1;
      g.fillStyle(color, 0.9 * alpha);
      g.fillCircle(lo + t * span, y, 4);
    }
  }
}

// ---------------------------------------------------------------------------
// Space A mechanisms — local coordinates, floor contact at (0, 0).
// ---------------------------------------------------------------------------

export function drawInspectionStrip(g, recognizes, flash = 0) {
  const color = recognizes ? C(CAR.LAMP_OK) : C(CAR.LAMP_ALERT);
  const a = 0.55 + flash * 0.4;
  g.fillStyle(color, 0.2 + flash * 0.2);
  g.fillRect(-26, -212, 52, 216);
  g.lineStyle(3, color, a);
  g.strokeRect(-26, -212, 52, 216);
  // Chevrons mark the crossing line (shape redundancy for colour).
  g.lineStyle(3, color, a);
  for (let i = 0; i < 3; i++) {
    const cy = -30 - i * 60;
    g.beginPath();
    g.moveTo(-14, cy + 10);
    g.lineTo(0, cy - 4);
    g.lineTo(14, cy + 10);
    g.strokePath();
  }
}

export function drawMarketGate(g, openK, pulse = 0) {
  const k = Math.max(0, Math.min(1, openK));
  const steel = C(CAR.STEEL_MID);
  const dark = C(CAR.ENAMEL_DARK);
  const hi = C(CAR.STEEL_HI);
  // Frame posts.
  g.fillStyle(dark, 1);
  g.fillRect(-84, -260, 20, 260);
  g.fillRect(64, -260, 20, 260);
  g.fillStyle(steel, 1);
  g.fillRect(-84, -274, 168, 16);
  // Lamp: round cyan when open, amber triangle while closed (shape + word
  // live on the scene-side panel; colour alone never carries the state).
  if (k >= 0.98) {
    g.fillStyle(C(CAR.LAMP_OK), 0.95);
    g.fillCircle(0, -288, 9 + pulse * 2);
  } else {
    g.fillStyle(C(CAR.LAMP_WARN), 0.95);
    g.fillTriangle(-10, -280, 10, -280, 0, -298);
  }
  // Sliding panels.
  const slide = 62 * k;
  g.fillStyle(steel, 1);
  g.fillRect(-62 - slide, -250, 58, 250);
  g.fillRect(4 + slide, -250, 58, 250);
  g.lineStyle(2, hi, 0.85);
  g.strokeRect(-62 - slide, -250, 58, 250);
  g.strokeRect(4 + slide, -250, 58, 250);
  if (k < 0.98) {
    g.fillStyle(hi, 0.9);
    g.fillRect(-2, -200, 4, 70);
  }
}

// Transit sign — the courier's loop anchor. Local, base at (0,0).
export function drawTransitSign(g, pulse = 0) {
  const steel = C(CAR.STEEL_MID);
  const dark = C(CAR.ENAMEL_DARK);
  const cyan = C(CAR.LAMP_OK);
  g.fillStyle(steel, 1);
  g.fillRect(-4, -190, 8, 190);
  g.fillStyle(dark, 1);
  g.fillRoundedRect(-52, -238, 104, 52, 6);
  g.lineStyle(2, steel, 0.9);
  g.strokeRoundedRect(-52, -238, 104, 52, 6);
  // Route glyph: footstep + arrow (the loop's anchor meaning).
  g.fillStyle(cyan, 0.9 + pulse * 0.1);
  g.fillEllipse(-24, -206, 10, 16);
  g.lineStyle(3, cyan, 0.95);
  g.beginPath();
  g.moveTo(-8, -212);
  g.lineTo(30, -212);
  g.strokePath();
  g.fillStyle(cyan, 0.95);
  g.fillTriangle(26, -220, 26, -204, 40, -212);
}

// ---------------------------------------------------------------------------
// Space B mechanisms — local coordinates, floor contact at (0, 0).
// ---------------------------------------------------------------------------

export function drawBus(g, stepKind, progress, pulse = 0) {
  const body = C(CAR.ENAMEL_MID);
  const trim = C(CAR.STEEL_HI);
  const glass = C(CAR.GLASS_DARK);
  const lamp = C(CAR.LAMP_OK);
  const amber = C(CAR.LAMP_WARN);
  // Body.
  g.fillStyle(body, 1);
  g.fillRoundedRect(-130, -122, 260, 96, 10);
  g.lineStyle(2, trim, 0.9);
  g.strokeRoundedRect(-130, -122, 260, 96, 10);
  // Windows.
  g.fillStyle(glass, 1);
  for (let i = 0; i < 3; i++) {
    g.fillRoundedRect(-118 + i * 56, -110, 42, 34, 4);
  }
  // Wheels.
  g.fillStyle(C(CAR.VOID), 1);
  g.fillCircle(-82, -18, 18);
  g.fillCircle(82, -18, 18);
  // Door (right side): opens during the OPEN step.
  const openK = stepKind === 'open'
    ? Math.min(1, progress / 0.15) * (progress > 0.85 ? Math.max(0, (1 - progress) / 0.15) : 1)
    : 0;
  const doorX = 46;
  const doorW = 52;
  g.fillStyle(C(CAR.ENAMEL_DARK), 1);
  g.fillRect(doorX - doorW / 2, -108, doorW, 80);
  g.fillStyle(lamp, 0.14 + openK * 0.32);
  g.fillRect(doorX - doorW / 2, -108, doorW, 80);
  const dSlide = 22 * openK;
  g.fillStyle(body, 1);
  g.fillRect(doorX - doorW / 2 - dSlide, -108, doorW / 2, 80);
  g.fillRect(doorX + dSlide, -108, doorW / 2, 80);
  // Status lamp above the door: STOP triangle / OPEN circle / GO chevron.
  const ly = -140;
  if (stepKind === 'wait') {
    g.fillStyle(C(CAR.LAMP_ALERT), 0.95);
    g.fillTriangle(doorX - 8, ly + 7, doorX + 8, ly + 7, doorX, ly - 8);
  } else if (stepKind === 'open') {
    g.fillStyle(lamp, 0.95);
    g.fillCircle(doorX, ly, 8 + pulse * 2);
  } else {
    g.fillStyle(amber, 0.95);
    g.fillTriangle(doorX - 7, ly - 8, doorX - 7, ly + 8, doorX + 9, ly);
  }
}

export function drawCrosswalkSignal(g, stepKind, progress) {
  const steel = C(CAR.STEEL_MID);
  const dark = C(CAR.ENAMEL_DARK);
  // Pole.
  g.fillStyle(steel, 1);
  g.fillRect(-5, -190, 10, 190);
  // Signal head.
  g.fillStyle(dark, 1);
  g.fillRoundedRect(-26, -262, 52, 76, 8);
  g.lineStyle(2, steel, 0.9);
  g.strokeRoundedRect(-26, -262, 52, 76, 8);
  const walk = stepKind === 'move';
  const cy = -238;
  if (!walk) {
    const amber = C(CAR.LAMP_WARN);
    g.fillStyle(amber, 0.95);
    g.fillCircle(0, cy, 5);
    g.fillRect(-4, cy + 5, 8, 14);
  } else {
    const cyan = C(CAR.LAMP_OK);
    g.fillStyle(cyan, 0.95);
    g.fillCircle(0, cy - 4, 5);
    g.lineStyle(3, cyan, 0.95);
    g.beginPath();
    g.moveTo(0, cy + 1);
    g.lineTo(0, cy + 10);
    g.moveTo(0, cy + 10);
    g.lineTo(-7, cy + 20);
    g.moveTo(0, cy + 10);
    g.lineTo(7, cy + 20);
    g.strokePath();
  }
  // Phase countdown bar.
  g.fillStyle(C(CAR.STEEL_DARK), 0.9);
  g.fillRect(-20, -180, 40, 6);
  g.fillStyle(walk ? C(CAR.LAMP_OK) : C(CAR.LAMP_WARN), 0.95);
  g.fillRect(-20, -180, 40 * (1 - Math.max(0, Math.min(1, progress))), 6);
}

export function drawBarrier(g, resultState, stepKind, progress, pulse = 0) {
  const steel = C(CAR.STEEL_MID);
  const dark = C(CAR.ENAMEL_DARK);
  const hi = C(CAR.STEEL_HI);
  // Base pedestal.
  g.fillStyle(dark, 1);
  g.fillRoundedRect(-24, -58, 48, 58, 6);
  g.lineStyle(2, steel, 0.9);
  g.strokeRoundedRect(-24, -58, 48, 58, 6);
  // Arm angle: open step raises the arm; stalled-stop jitters, never opens.
  let angle = 0; // 0 = closed (horizontal), -70 = raised open
  if (resultState === 'cycling-open') {
    if (stepKind === 'open') {
      const k = progress < 0.15 ? progress / 0.15 : (progress > 0.85 ? (1 - progress) / 0.15 : 1);
      angle = -70 * Math.max(0, Math.min(1, k));
    }
  } else if (resultState === 'stalled-stop') {
    const t = (progress * 6) % 1;
    angle = -8 * Math.sin(t * Math.PI);
  }
  const rad = (angle * Math.PI) / 180;
  const armLen = 120;
  const ax = 0;
  const ay = -52;
  const ex = ax + Math.cos(rad) * armLen;
  const ey = ay + Math.sin(rad) * armLen;
  // Striped arm — hazard stripes keep the barrier readable without colour.
  g.lineStyle(10, C(CAR.HERO_BASE), 0.95);
  g.beginPath();
  g.moveTo(ax, ay);
  g.lineTo(ex, ey);
  g.strokePath();
  g.lineStyle(10, resultState === 'stalled-stop' ? C(CAR.LAMP_ALERT) : C(CAR.LAMP_WARN), 0.9);
  const stripes = 4;
  for (let i = 0; i < stripes; i++) {
    const t0 = (i + 0.15) / (stripes + 0.4);
    const t1 = t0 + 0.1;
    g.beginPath();
    g.moveTo(ax + (ex - ax) * t0, ay + (ey - ay) * t0);
    g.lineTo(ax + (ex - ax) * t1, ay + (ey - ay) * t1);
    g.strokePath();
  }
  // Pivot + status lamp.
  g.fillStyle(hi, 1);
  g.fillCircle(ax, ay, 8);
  const lampColor = resultState === 'cycling-open'
    ? (stepKind === 'open' ? C(CAR.LAMP_OK) : C(CAR.LAMP_WARN))
    : (resultState === 'stalled-stop' ? C(CAR.LAMP_ALERT) : C(CAR.STEEL_HI));
  g.fillStyle(lampColor, 0.95);
  g.fillCircle(0, -76, 6 + (resultState === 'cycling-open' && stepKind === 'open' ? pulse * 2 : 0));
}

export function drawFieldPylons(g, width, fieldState, safe, pulse = 0) {
  // Local: left pylon at x=0, right pylon at x=width; floor at y=0.
  const color = safe ? C(CAR.LAMP_OK) : fieldState === 'warning' ? C(CAR.LAMP_WARN) : C(CAR.LAMP_ALERT);
  const a = safe && fieldState === 'idle' ? 0.4 : 0.6 + pulse * 0.25;
  // Floor band: dashed scan line (dash shape distinguishes it from solid
  // relationship paths even without colour).
  g.lineStyle(3, color, a * 0.8);
  const dashes = 8;
  for (let i = 0; i < dashes; i++) {
    const dx = (width / dashes) * i + 6;
    g.beginPath();
    g.moveTo(dx, 12);
    g.lineTo(dx + width / dashes - 14, 12);
    g.strokePath();
  }
  for (const px of [0, width]) {
    g.fillStyle(C(CAR.ENAMEL_DARK), 1);
    g.fillRect(px - 8, -150, 16, 150);
    g.lineStyle(2, C(CAR.STEEL_MID), 0.9);
    g.strokeRect(px - 8, -150, 16, 150);
    g.fillStyle(color, 0.9);
    g.fillCircle(px, -158, 7);
    if (!safe && fieldState !== 'idle') {
      g.fillStyle(color, 0.12 + pulse * 0.1);
      g.fillTriangle(px, -158, px - 40, -260, px + 40, -260);
    }
  }
}

// ---------------------------------------------------------------------------
// Space C mechanisms — local coordinates, floor contact at (0, 0).
// ---------------------------------------------------------------------------

export function drawBell(g, resonanceState, k = 0, pulse = 0) {
  const brass = C(CAR.BRASS_MID);
  const dark = C(CAR.BRASS_DARK);
  const cyan = C(CAR.LAMP_OK);
  const amber = C(CAR.LAMP_WARN);
  // Stand.
  g.fillStyle(C(CAR.ENAMEL_DARK), 1);
  g.fillRect(-34, -12, 68, 12);
  g.lineStyle(3, dark, 0.95);
  g.beginPath();
  g.moveTo(-26, -12);
  g.lineTo(0, -118);
  g.lineTo(26, -12);
  g.strokePath();
  // Bell body.
  g.fillStyle(brass, 1);
  g.beginPath();
  g.moveTo(-24, -40);
  g.lineTo(-16, -96);
  g.lineTo(16, -96);
  g.lineTo(24, -40);
  g.closePath();
  g.fillPath();
  g.lineStyle(2, dark, 0.9);
  g.strokePath();
  g.fillStyle(dark, 1);
  g.fillCircle(0, -36, 6);
  // Resonance rings expand while resonating; steady cyan once resonated.
  if (resonanceState === 'resonating' || resonanceState === 'resonated') {
    const color = resonanceState === 'resonated' ? cyan : amber;
    const rings = resonanceState === 'resonated' ? 3 : 2;
    for (let i = 0; i < rings; i++) {
      const rr = 26 + i * 22 + (resonanceState === 'resonating' ? k * 18 + pulse * 5 : 0);
      g.lineStyle(3, color, Math.max(0.12, 0.75 - i * 0.22));
      g.strokeCircle(0, -70, rr);
    }
  }
}

export function drawWitnessGate(g, state, pulse = 0) {
  const openK = state === 'open' ? 1 : state === 'opening' ? 0.5 : 0;
  const stone = C(CAR.STEEL_DARK);
  const hi = C(CAR.STEEL_HI);
  const cyan = C(CAR.LAMP_OK);
  const amber = C(CAR.LAMP_WARN);
  // Monumental frame.
  g.fillStyle(stone, 1);
  g.fillRect(-104, -300, 26, 300);
  g.fillRect(78, -300, 26, 300);
  g.fillRect(-104, -322, 208, 26);
  g.lineStyle(2, hi, 0.7);
  g.strokeRect(-104, -300, 26, 300);
  g.strokeRect(78, -300, 26, 300);
  // Witness eye on the lintel: closed = amber slit, open = cyan circle.
  if (state === 'open' || state === 'opening') {
    g.fillStyle(cyan, 0.95);
    g.fillCircle(0, -309, 8 + pulse * 2);
    g.lineStyle(2, cyan, 0.8);
    g.strokeCircle(0, -309, 13);
  } else {
    g.fillStyle(amber, 0.95);
    g.fillRect(-12, -312, 24, 5);
  }
  // Gate panels slide apart.
  const slide = 74 * openK;
  g.fillStyle(C(CAR.ENAMEL_DARK), 0.96);
  g.fillRect(-76 - slide, -292, 76, 292);
  g.fillRect(slide, -292, 76, 292);
  g.lineStyle(2, hi, 0.55);
  g.strokeRect(-76 - slide, -292, 76, 292);
  g.strokeRect(slide, -292, 76, 292);
  if (openK >= 0.98) {
    g.fillStyle(C(CAR.TUNGSTEN), 0.1 + pulse * 0.06);
    g.fillRect(-70, -292, 140, 292);
  }
}

// ---------------------------------------------------------------------------
// Objective icons — one glyph per objective id (shape + word, never colour
// alone). Drawn inside the top-left objective card.
// ---------------------------------------------------------------------------

export function drawObjectiveIcon(g, objectiveId, x, y) {
  const white = C(CAR.HERO_BASE);
  const cyan = C(CAR.LAMP_OK);
  const amber = C(CAR.LAMP_WARN);
  g.lineStyle(2, white, 0.95);
  switch (objectiveId) {
    case 'OBSERVE_AND_COPY_A_CYCLE': {
      drawCycleIcon(g, 'MOVE', x - 8, y, 10, cyan, 1);
      g.lineStyle(2, white, 0.9);
      g.strokeCircle(x + 10, y, 7);
      break;
    }
    case 'TRANSPLANT_TO_THE_MARKET_GROUP': {
      drawCycleIcon(g, 'OPEN', x - 8, y, 9, cyan, 1);
      g.fillStyle(white, 1);
      g.fillCircle(x + 10, y - 4, 3);
      g.fillRect(x + 8, y - 1, 4, 8);
      break;
    }
    case 'CROSS_THE_OPEN_GATE': {
      g.strokeRect(x - 10, y - 10, 8, 20);
      g.strokeRect(x + 2, y - 10, 8, 20);
      g.lineStyle(2, cyan, 1);
      g.beginPath();
      g.moveTo(x - 14, y + 12);
      g.lineTo(x + 14, y + 12);
      g.strokePath();
      break;
    }
    case 'COPY_AND_PLANT_BOTH_CYCLES': {
      drawCycleIcon(g, 'STOP', x - 10, y, 8, amber, 1);
      drawCycleIcon(g, 'WALK', x + 10, y, 8, cyan, 1);
      break;
    }
    case 'CROSS_WHEN_BOTH_CYCLES_RUN': {
      g.lineStyle(2, cyan, 1);
      g.beginPath();
      g.moveTo(x - 13, y + 8);
      g.lineTo(x + 13, y + 8);
      g.strokePath();
      drawCycleIcon(g, 'GO', x, y - 4, 9, cyan, 1);
      break;
    }
    case 'RECORD_YOUR_OWN_CYCLE': {
      g.lineStyle(2, amber, 1);
      g.strokeCircle(x, y, 9);
      g.fillStyle(amber, 1);
      g.fillCircle(x, y, 4);
      break;
    }
    case 'THE_ECHO_SHOWS_YOUR_CYCLE': {
      g.lineStyle(2, amber, 0.9);
      g.strokeCircle(x - 6, y, 6);
      g.strokeCircle(x + 7, y, 6);
      break;
    }
    case 'SHARE_YOUR_CYCLE_WITH_MARA': {
      g.fillStyle(white, 1);
      g.fillCircle(x - 8, y - 6, 4);
      g.fillRect(x - 11, y - 2, 6, 11);
      g.fillStyle(cyan, 1);
      g.fillCircle(x + 8, y - 6, 4);
      g.fillRect(x + 5, y - 2, 6, 11);
      g.lineStyle(2, cyan, 1);
      g.beginPath();
      g.moveTo(x - 3, y + 2);
      g.lineTo(x + 3, y + 2);
      g.strokePath();
      break;
    }
    case 'REUNION': {
      g.fillStyle(cyan, 1);
      g.fillCircle(x, y, 7);
      g.lineStyle(2, cyan, 0.9);
      g.strokeCircle(x, y, 11);
      break;
    }
    default:
      break;
  }
}

// ---------------------------------------------------------------------------
// Alert border — reduce-flash accessibility replacement for full flashes.
// ---------------------------------------------------------------------------

export function drawEchoAlertBorder(g, alpha) {
  if (alpha <= 0.01) return;
  const red = C(CAR.LAMP_ALERT);
  g.lineStyle(8, red, alpha);
  g.strokeRect(6, 6, GAME_W - 12, GAME_H - 12);
}

// ---------------------------------------------------------------------------
// Static blockout backdrops — provisional storybook shapes per space. The
// scene draws these once into layer containers; Jason's painted exports
// replace them slot-by-slot later.
// ---------------------------------------------------------------------------

function building(g, x, w, h, baseY, tone, windowTone) {
  g.fillStyle(tone, 1);
  g.fillRect(x, baseY - h, w, h);
  g.lineStyle(2, C(CAR.VOID), 0.35);
  g.strokeRect(x, baseY - h, w, h);
  // Paper-cut windows.
  g.fillStyle(windowTone, 0.55);
  const cols = Math.max(1, Math.floor(w / 42));
  const rows = Math.max(1, Math.floor(h / 70));
  for (let cx = 0; cx < cols; cx++) {
    for (let ry = 0; ry < rows; ry++) {
      g.fillRect(x + 12 + cx * 38, baseY - h + 18 + ry * 64, 15, 22);
    }
  }
}

export function drawMarketBlockout(g) {
  const baseY = 430;
  const toneA = C(CAR.ENAMEL_MID);
  const toneB = C(CAR.STEEL_DARK);
  const toneC = C(CAR.ENAMEL_DARK);
  const win = C(CAR.GLASS_DARK);
  building(g, 20, 150, 240, baseY, toneB, win);
  building(g, 190, 110, 180, baseY, toneA, win);
  building(g, 330, 170, 260, baseY, toneC, win);
  building(g, 530, 120, 200, baseY, toneB, win);
  building(g, 670, 150, 230, baseY, toneA, win);
  building(g, 850, 130, 190, baseY, toneC, win);
  building(g, 1000, 150, 250, baseY, toneB, win);
  building(g, 1170, 110, 200, baseY, toneA, win);
  // Market awnings (wine vinyl) along the stall line.
  const vinyl = C(CAR.VINYL);
  const vinylHi = C(CAR.VINYL_HI);
  for (const ax of [150, 460, 940]) {
    g.fillStyle(vinyl, 0.95);
    g.fillTriangle(ax - 56, baseY + 28, ax + 56, baseY + 28, ax, baseY - 8);
    g.fillStyle(vinylHi, 0.8);
    g.fillTriangle(ax - 56, baseY + 28, ax, baseY + 28, ax - 20, baseY + 6);
    g.fillStyle(C(CAR.BRASS_DARK), 0.9);
    g.fillRect(ax - 2, baseY + 28, 4, 40);
  }
}

export function drawTransitBlockout(g) {
  const baseY = 430;
  const toneA = C(CAR.ENAMEL_MID);
  const toneB = C(CAR.STEEL_DARK);
  const toneC = C(CAR.ENAMEL_DARK);
  const win = C(CAR.GLASS_DARK);
  building(g, 1300, 170, 250, baseY, toneC, win);
  building(g, 1500, 130, 200, baseY, toneA, win);
  building(g, 1660, 180, 270, baseY, toneB, win);
  building(g, 1870, 140, 210, baseY, toneC, win);
  building(g, 2040, 170, 240, baseY, toneA, win);
  building(g, 2240, 150, 190, baseY, toneB, win);
  building(g, 2420, 180, 260, baseY, toneC, win);
  // Transit-green band (LAMP_OK reads as the transit accent here).
  g.fillStyle(C(CAR.LAMP_OK), 0.14);
  g.fillRect(1280, baseY - 40, 1360, 12);
  // Bus shelter roof over the far-lane stop.
  g.fillStyle(C(CAR.STEEL_MID), 0.95);
  g.fillRect(1400, 320, 210, 10);
  g.fillStyle(C(CAR.ENAMEL_DARK), 0.95);
  g.fillRect(1408, 330, 8, 90);
  g.fillRect(1594, 330, 8, 90);
}

export function drawSquareBlockout(g) {
  const baseY = 430;
  const toneB = C(CAR.STEEL_DARK);
  const toneC = C(CAR.ENAMEL_DARK);
  const win = C(CAR.GLASS_DARK);
  // Silent monumental colonnade.
  building(g, 2660, 120, 280, baseY, toneC, win);
  building(g, 2810, 90, 220, baseY, toneB, win);
  building(g, 2930, 120, 300, baseY, toneC, win);
  building(g, 3090, 100, 240, baseY, toneB, win);
  building(g, 3220, 130, 290, baseY, toneC, win);
  building(g, 3390, 110, 230, baseY, toneB, win);
  building(g, 3510, 90, 260, baseY, toneC, win);
}

// Frozen paper-cut crowd silhouettes for the silent square — drawn by the
// scene so the completion transformation can wake them (tint + sway).
export function drawFrozenCrowd(g, awake, sway = 0) {
  const baseY = 430;
  const color = awake ? C(CAR.LAMP_OK) : C(CAR.VOID_LIFT);
  const alpha = awake ? 0.55 : 0.9;
  g.fillStyle(color, alpha);
  const figures = [[2740, 46], [2890, 52], [3150, 48], [3460, 44]];
  for (let i = 0; i < figures.length; i++) {
    const [cx, ch] = figures[i];
    const dx = awake ? Math.sin(sway + i * 1.7) * 3 : 0;
    g.fillCircle(cx + dx, baseY - ch, 8);
    g.fillTriangle(cx - 12 + dx, baseY, cx + 12 + dx, baseY, cx + dx, baseY - ch + 6);
  }
}

// ---------------------------------------------------------------------------
// Floor — two depth lanes across the whole street, warm concrete grey.
// ---------------------------------------------------------------------------

export function drawStreetFloor(g) {
  const farY = ECHO_LANE_Y[LANE_FAR];
  const nearY = ECHO_LANE_Y[LANE_NEAR];
  // Far lane band.
  g.fillStyle(C(CAR.ENAMEL_DARK), 1);
  g.fillRect(0, farY - 4, ECHO_WORLD_LENGTH, (nearY - farY) + 8);
  // Near lane band (slightly lighter — value separation between lanes).
  g.fillStyle(C(CAR.ENAMEL_MID), 0.55);
  g.fillRect(0, nearY - 4, ECHO_WORLD_LENGTH, GAME_H - nearY + 4);
  // Lane divider — dashed so the two depth planes read without colour.
  g.lineStyle(2, C(CAR.STEEL_MID), 0.5);
  const midY = (farY + nearY) / 2 + 12;
  for (let x = 0; x < ECHO_WORLD_LENGTH; x += 64) {
    g.beginPath();
    g.moveTo(x + 6, midY);
    g.lineTo(x + 40, midY);
    g.strokePath();
  }
  // Curb line under the near lane.
  g.fillStyle(C(CAR.STEEL_DARK), 0.8);
  g.fillRect(0, GAME_H - 18, ECHO_WORLD_LENGTH, 4);
}

// ---------------------------------------------------------------------------
// Skyline — parallax backdrop drawn once at scrollFactor 0.5.
// ---------------------------------------------------------------------------

export function drawSkyline(g) {
  const horizon = 300;
  const span = Math.ceil(ECHO_WORLD_LENGTH * 0.5) + GAME_W;
  // Distant city wash.
  g.fillStyle(C(CAR.SKY_HORIZON), 0.5);
  g.fillRect(0, horizon - 130, span, 130);
  // Silhouette towers.
  const tone = C(CAR.GLASS_DARK);
  for (let x = 0; x < span; x += 90) {
    const h = 60 + ((x * 7) % 120);
    g.fillStyle(tone, 0.75);
    g.fillRect(x, horizon - h, 62, h);
  }
  // Horizon haze into the street.
  g.fillStyle(C(CAR.ENAMEL_DARK), 0.55);
  g.fillRect(0, horizon, span, 60);
}
