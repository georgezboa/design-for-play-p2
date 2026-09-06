// Car 03 // MOVE AS ONE — V2 art helpers (readable rebuild).
//
// Full replacement of the V1 art module. The A2 production kit
// (outputs/car03-a2-production-assets) supplies every raster layer and
// character; this file only owns the DYNAMIC VECTOR language the Design
// Lock requires: target outlines, floor ribbon, scanner beams, status
// icons, duo pips, luggage obstruction, calibration arch, final door.
//
// Colour rule (unchanged from V1): every fill/stroke literal goes through
// C() against the 24-colour CAR palette. Text colour strings mirror the
// same palette values.

import { C, CAR } from '../../art/colors.js';
import { GAME_W, GAME_H, LANE_FAR, LANE_NEAR } from '../../constants.js';

// ---------------------------------------------------------------------------
// Lane geometry (ASSET_MANIFEST floor_deck.lanes + Design Lock §3).
// Far lane: higher, 0.88 actor scale. Near lane: lower, 1.0 scale.
// ---------------------------------------------------------------------------
export const LANE_Y = Object.freeze({ [LANE_FAR]: 480, [LANE_NEAR]: 540 });
export const LANE_SCALE = Object.freeze({ [LANE_FAR]: 0.88, [LANE_NEAR]: 1.0 });
export const LANE_DEPTH = Object.freeze({ [LANE_FAR]: 450, [LANE_NEAR]: 550 });

export function laneToY(lane) {
  return LANE_Y[lane] ?? LANE_Y[LANE_NEAR];
}
export function laneScale(lane) {
  return LANE_SCALE[lane] ?? 1;
}
export function laneDepth(lane) {
  return LANE_DEPTH[lane] ?? LANE_DEPTH[LANE_NEAR];
}
export function lerp(a, b, t) {
  return a + (b - a) * t;
}
// Diagonal lane-change interpolation between the two lane baselines.
export function lerpLane(from, to, t) {
  const k = Math.max(0, Math.min(1, t));
  return {
    y: lerp(laneToY(from), laneToY(to), k),
    scale: lerp(laneScale(from), laneScale(to), k),
    depth: Math.round(lerp(laneDepth(from), laneDepth(to), k)),
  };
}

export function easeInOut(t) {
  const k = Math.max(0, Math.min(1, t));
  return k < 0.5 ? 2 * k * k : 1 - ((-2 * k + 2) ** 2) / 2;
}

// World geometry shared by the scene's vector overlays.
export const WORLD_LENGTH = 4800;
export const BAY_WIDTH = 960;
export const MAX_SCROLL = WORLD_LENGTH - GAME_W; // 3840
export const BEAM_FLOOR_Y = 560;
export const BEAM_HALF_W = 90; // ~180px scan volume at the floor
export const FINAL_DOOR_X = 4720;

// Palette hex strings for Phaser Text objects (same values as CAR.*).
export const TXT = Object.freeze({
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
// Footstep icon — the universal "match me / we move together" glyph.
// Two small offset foot ovals; reads at 24px and up.
// ---------------------------------------------------------------------------
export function drawFootsteps(g, x, y, color, alpha = 1, scale = 1) {
  g.fillStyle(color, alpha);
  // Left foot slightly behind, right foot leading — a mid-stride pair.
  g.fillEllipse(x - 5 * scale, y + 3 * scale, 7 * scale, 11 * scale);
  g.fillEllipse(x + 5 * scale, y - 3 * scale, 7 * scale, 11 * scale);
}

// Linked footprints — the "PATTERN OK / we are matched" glyph: two
// interlocked pairs sharing one rhythm line.
export function drawLinkedFootprints(g, x, y, color, alpha = 1, scale = 1, pulse = 0) {
  const s = scale * (1 + pulse * 0.15);
  g.lineStyle(2, color, alpha * 0.8);
  g.beginPath();
  g.moveTo(x - 22 * s, y + 8 * s);
  g.lineTo(x + 22 * s, y + 8 * s);
  g.strokePath();
  drawFootsteps(g, x - 12 * s, y, color, alpha, s * 0.8);
  drawFootsteps(g, x + 12 * s, y - 2 * s, color, alpha, s * 0.8);
}

// ---------------------------------------------------------------------------
// Target outline — high-contrast white/cyan frame around the eligible
// target. `w`/`h` are the formation extents; (x, yFeet) is the centre
// baseline of the target.
// ---------------------------------------------------------------------------
export function drawTargetOutline(g, x, yFeet, w, h, pulse = 0) {
  const white = C(CAR.HERO_BASE);
  const cyan = C(CAR.LAMP_OK);
  const left = x - w / 2;
  const top = yFeet - h;
  const a = 0.75 + pulse * 0.25;
  g.lineStyle(3, white, a);
  g.strokeRoundedRect(left, top, w, h, 8);
  // Cyan corner ticks so the outline is not colour-agnostic white only.
  g.lineStyle(4, cyan, 0.95);
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
// Match ribbon — cyan floor strip linking player and target while matched.
// Footfall pulse circles beat at both ends while the pair moves together.
// ---------------------------------------------------------------------------
export function drawRibbon(g, x1, x2, y, alpha, footfallPhase = 0) {
  if (alpha <= 0.01) return;
  const cyan = C(CAR.LAMP_OK);
  const lo = Math.min(x1, x2);
  const hi = Math.max(x1, x2);
  g.fillStyle(cyan, 0.30 * alpha);
  g.fillRect(lo, y - 3, hi - lo, 6);
  g.lineStyle(2, cyan, 0.85 * alpha);
  g.beginPath();
  g.moveTo(lo, y - 3);
  g.lineTo(hi, y - 3);
  g.moveTo(lo, y + 3);
  g.lineTo(hi, y + 3);
  g.strokePath();
  // End caps + alternating footfall pulses.
  const pulse = 4 + 3 * Math.sin(footfallPhase);
  const pulse2 = 4 + 3 * Math.sin(footfallPhase + Math.PI);
  g.fillStyle(cyan, 0.5 * alpha);
  g.fillCircle(lo, y, pulse);
  g.fillCircle(hi, y, pulse2);
}

// ---------------------------------------------------------------------------
// Scanner beam — one coherent world-space trapezoid, ~180px at the floor,
// drawn dynamically from the scanner's beam origin (Design Lock §5,
// PRODUCTION_NOTES §4).
// ---------------------------------------------------------------------------
export function drawBeam(g, x, topY, color, alpha) {
  if (alpha <= 0.005) return;
  const topHalf = 16;
  g.fillStyle(color, alpha);
  g.beginPath();
  g.moveTo(x - topHalf, topY);
  g.lineTo(x + topHalf, topY);
  g.lineTo(x + BEAM_HALF_W, BEAM_FLOOR_Y);
  g.lineTo(x - BEAM_HALF_W, BEAM_FLOOR_Y);
  g.closePath();
  g.fillPath();
  // Floor landing zone — the diegetic mark of the scan volume.
  g.lineStyle(2, color, Math.min(1, alpha * 3));
  g.strokeEllipse(x, BEAM_FLOOR_Y, BEAM_HALF_W * 2, 18);
}

// ---------------------------------------------------------------------------
// Scanner status icons — shape language that never relies on colour alone
// (Design Lock §5/§7):
//   flagged  -> red triangle            (+ word ALONE)
//   warning  -> amber narrowing brackets (+ word WARNING)
//   safe     -> cyan linked footprints   (+ words PATTERN OK)
// ---------------------------------------------------------------------------
export function drawStatusIcon(g, state, x, y, pulse = 0) {
  if (state === 'flagged') {
    const red = C(CAR.LAMP_ALERT);
    g.fillStyle(red, 0.95);
    g.fillTriangle(x - 11, y + 9, x + 11, y + 9, x, y - 11);
    g.fillStyle(C(CAR.VOID), 1);
    g.fillRect(x - 1.5, y - 5, 3, 7);
    g.fillRect(x - 1.5, y + 4, 3, 3);
  } else if (state === 'warning') {
    const amber = C(CAR.LAMP_WARN);
    const close = 3 + pulse * 5; // brackets narrow as the flag approaches
    g.lineStyle(3, amber, 0.95);
    g.beginPath();
    g.moveTo(x - 14 + close, y - 10);
    g.lineTo(x - 8 + close, y);
    g.lineTo(x - 14 + close, y + 10);
    g.moveTo(x + 14 - close, y - 10);
    g.lineTo(x + 8 - close, y);
    g.lineTo(x + 14 - close, y + 10);
    g.strokePath();
  } else if (state === 'safe') {
    drawLinkedFootprints(g, x, y, C(CAR.LAMP_OK), 0.95, 0.7, pulse);
  }
}

// ---------------------------------------------------------------------------
// Duo pips — three large footprint pips beside the pair: ○ ○ ○ → ● ● ●
// (Design Lock §4). steps = filled count 0..3.
// ---------------------------------------------------------------------------
export function drawDuoPips(g, x, y, steps, pulse = 0) {
  const cyan = C(CAR.LAMP_OK);
  const white = C(CAR.HERO_BASE);
  const gap = 42;
  const left = x - gap;
  for (let i = 0; i < 3; i++) {
    const px = left + i * gap;
    const filled = i < steps;
    const pop = filled && i === steps - 1 ? 1 + pulse * 0.3 : 1;
    const r = 15 * pop;
    g.fillStyle(C(CAR.VOID_LIFT), 0.75);
    g.fillCircle(px, y, r + 3);
    if (filled) {
      g.fillStyle(cyan, 1);
      g.fillCircle(px, y, r);
      drawFootsteps(g, px, y, C(CAR.VOID), 0.9, 0.75);
    } else {
      g.lineStyle(3, white, 0.9);
      g.strokeCircle(px, y, r);
      drawFootsteps(g, px, y, white, 0.5, 0.7);
    }
  }
}

// ---------------------------------------------------------------------------
// Beat 2 luggage obstruction — high-contrast blockout suitcases on the
// near lane with an arrow pointing up to the viable far lane.
// ---------------------------------------------------------------------------
export function drawLuggage(g, x, yFeet, blink = 0) {
  const vinyl = C(CAR.VINYL);
  const brass = C(CAR.BRASS_MID);
  const steel = C(CAR.STEEL_HI);
  const amber = C(CAR.LAMP_WARN);
  const a = 0.85 + blink * 0.15;
  // Two stacked suitcases.
  g.fillStyle(vinyl, a);
  g.fillRoundedRect(x - 34, yFeet - 40, 52, 40, 4);
  g.fillStyle(brass, a);
  g.fillRoundedRect(x - 22, yFeet - 66, 40, 28, 4);
  g.lineStyle(2, steel, 0.9);
  g.strokeRoundedRect(x - 34, yFeet - 40, 52, 40, 4);
  g.strokeRoundedRect(x - 22, yFeet - 66, 40, 28, 4);
  // Handle.
  g.strokeRoundedRect(x - 8, yFeet - 76, 14, 10, 3);
  // Arrow pointing UP to the far lane (far lane is visually higher).
  const ax = x + 46;
  const ay = yFeet - 34;
  g.lineStyle(4, amber, 0.95);
  g.beginPath();
  g.moveTo(ax, ay);
  g.lineTo(ax, ay - 52);
  g.strokePath();
  g.fillStyle(amber, 0.95);
  g.fillTriangle(ax - 9, ay - 48, ax + 9, ay - 48, ax, ay - 66);
}

// ---------------------------------------------------------------------------
// Beat 3 calibration arch — two pillars + crossbar framing the ARCH
// scanner. Turns cyan on `accepted`.
// ---------------------------------------------------------------------------
export function drawArch(g, x, accepted, pulse = 0) {
  const frame = accepted ? C(CAR.LAMP_OK) : C(CAR.STEEL_MID);
  const alpha = accepted ? 0.95 : 0.8;
  const halfW = 78;
  const top = 132;
  const bottom = BEAM_FLOOR_Y;
  // Chamfered corners — Phaser Graphics has no quadraticCurveTo; the
  // blockout arch reads as a gate with straight 45° shoulders.
  g.lineStyle(accepted ? 6 : 5, frame, alpha);
  g.beginPath();
  g.moveTo(x - halfW, bottom);
  g.lineTo(x - halfW, top + 22);
  g.lineTo(x - halfW + 22, top);
  g.lineTo(x + halfW - 22, top);
  g.lineTo(x + halfW, top + 22);
  g.lineTo(x + halfW, bottom);
  g.strokePath();
  // Foot pads.
  g.fillStyle(frame, alpha);
  g.fillRect(x - halfW - 8, bottom - 4, 16, 6);
  g.fillRect(x + halfW - 8, bottom - 4, 16, 6);
  if (accepted) {
    // Soft celebratory fill + linked footprints at the arch mouth.
    g.fillStyle(C(CAR.LAMP_OK), 0.10 + pulse * 0.08);
    g.fillRect(x - halfW + 4, top + 4, halfW * 2 - 8, bottom - top - 8);
    drawLinkedFootprints(g, x, bottom - 26, C(CAR.LAMP_OK), 0.9, 1, pulse);
  }
}

// ---------------------------------------------------------------------------
// Final door — double sliding panels at FINAL_DOOR_X + warm exterior
// light. openK 0..1 drives the slide and the light flood.
// ---------------------------------------------------------------------------
export function drawFinalDoor(g, lightG, openK, complete) {
  const k = Math.max(0, Math.min(1, openK));
  const steelMid = C(CAR.STEEL_MID);
  const steelHi = C(CAR.STEEL_HI);
  const enamel = C(CAR.ENAMEL_DARK);
  const tungsten = C(CAR.TUNGSTEN);
  const cx = FINAL_DOOR_X;
  const top = 180;
  const bottom = BEAM_FLOOR_Y + 8;
  const halfW = 64;
  // Door frame.
  g.fillStyle(enamel, 1);
  g.fillRect(cx - halfW - 12, top - 16, halfW * 2 + 24, bottom - top + 16);
  g.fillStyle(steelMid, 1);
  g.fillRect(cx - halfW - 6, top - 10, halfW * 2 + 12, 10);
  // Warm exterior light behind the panels (grows as the door opens).
  lightG.clear();
  if (k > 0.01) {
    const reach = 120 + 260 * k;
    const boost = complete ? 0.16 : 0;
    lightG.fillStyle(tungsten, 0.10 + 0.14 * k + boost);
    lightG.fillRect(cx - reach, top, reach + halfW, bottom - top);
    lightG.fillStyle(tungsten, 0.16 + 0.16 * k + boost);
    lightG.fillRect(cx - halfW, top, halfW * 2, bottom - top);
    // The visible exterior slice through the gap.
    lightG.fillStyle(C(CAR.HERO_BASE), 0.25 + 0.3 * k);
    lightG.fillRect(cx - 30 * k, top, 60 * k, bottom - top);
  }
  // Sliding panels.
  const slide = 56 * k;
  g.fillStyle(steelMid, 1);
  g.fillRect(cx - halfW - slide, top, halfW, bottom - top);
  g.fillRect(cx + slide, top, halfW, bottom - top);
  g.lineStyle(2, steelHi, 0.9);
  g.strokeRect(cx - halfW - slide, top, halfW, bottom - top);
  g.strokeRect(cx + slide, top, halfW, bottom - top);
  // Centre seam marker (closed state reads as a door, not a wall).
  if (k < 0.98) {
    g.fillStyle(steelHi, 0.9);
    g.fillRect(cx - slide - 2, top + 40, 4, 60);
  }
}

// ---------------------------------------------------------------------------
// Bay seams + boundary sweep — thin world-space seams at each bay door and
// the cyan sweep that plays when the camera eases across a boundary.
// ---------------------------------------------------------------------------
export function drawBaySeams(g) {
  const dark = C(CAR.ENAMEL_DARK);
  const steel = C(CAR.STEEL_DARK);
  for (let bx = BAY_WIDTH; bx < WORLD_LENGTH; bx += BAY_WIDTH) {
    g.fillStyle(dark, 0.55);
    g.fillRect(bx - 5, 96, 10, BEAM_FLOOR_Y - 96);
    g.fillStyle(steel, 0.8);
    g.fillRect(bx - 1, 96, 2, BEAM_FLOOR_Y - 96);
  }
}

export function drawBaySweep(g, x, alpha) {
  if (alpha <= 0.01) return;
  const cyan = C(CAR.LAMP_OK);
  g.fillStyle(cyan, 0.35 * alpha);
  g.fillRect(x - 14, 90, 28, BEAM_FLOOR_Y - 90);
  g.fillStyle(C(CAR.HERO_BASE), 0.75 * alpha);
  g.fillRect(x - 2, 90, 4, BEAM_FLOOR_Y - 90);
}

// ---------------------------------------------------------------------------
// Objective card icons — one glyph per objectiveId, drawn inside the
// top-left safe-area card (icon + text, never colour alone).
// ---------------------------------------------------------------------------
export function drawObjectiveIcon(g, objectiveId, x, y) {
  const white = C(CAR.HERO_BASE);
  const cyan = C(CAR.LAMP_OK);
  const amber = C(CAR.LAMP_WARN);
  g.lineStyle(2, white, 0.95);
  switch (objectiveId) {
    case 'REACH_THE_LAST_DOOR': {
      // A door.
      g.strokeRect(x - 8, y - 11, 16, 22);
      g.fillStyle(amber, 1);
      g.fillCircle(x + 4, y + 1, 2);
      break;
    }
    case 'MATCH_A_GROUP_THEN_WALK_THROUGH': {
      // Three figures + arrow.
      for (let i = -1; i <= 1; i++) {
        g.fillStyle(white, 1);
        g.fillCircle(x - 8 + i * 7, y - 6, 3);
        g.fillRect(x - 10 + i * 7, y - 3, 4, 9);
      }
      g.lineStyle(2, cyan, 1);
      g.beginPath();
      g.moveTo(x - 12, y + 10);
      g.lineTo(x + 12, y + 10);
      g.strokePath();
      g.fillStyle(cyan, 1);
      g.fillTriangle(x + 8, y + 6, x + 8, y + 14, x + 15, y + 10);
      break;
    }
    case 'RELEASE_CHANGE_LANE_MATCH_OTHER': {
      // Two lanes with a diagonal change arrow.
      g.lineStyle(2, white, 0.8);
      g.beginPath();
      g.moveTo(x - 13, y - 7);
      g.lineTo(x + 13, y - 7);
      g.moveTo(x - 13, y + 8);
      g.lineTo(x + 13, y + 8);
      g.strokePath();
      g.lineStyle(3, cyan, 1);
      g.beginPath();
      g.moveTo(x - 8, y + 8);
      g.lineTo(x + 6, y - 7);
      g.strokePath();
      g.fillStyle(cyan, 1);
      g.fillTriangle(x + 2, y - 11, x + 11, y - 9, x + 6, y - 1);
      break;
    }
    case 'MATCH_TEAL_SCARF_PASSENGER': {
      // A figure with a teal scarf.
      g.fillStyle(white, 1);
      g.fillCircle(x, y - 8, 4);
      g.fillRect(x - 4, y - 4, 8, 13);
      g.fillStyle(cyan, 1);
      g.fillRect(x - 5, y - 4, 10, 4);
      g.fillRect(x + 2, y, 4, 8);
      break;
    }
    case 'FIND_PARTNER_MATCH_THREE_STEPS': {
      // Three footprint pips.
      for (let i = 0; i < 3; i++) {
        g.lineStyle(2, cyan, 1);
        g.strokeCircle(x - 10 + i * 10, y, 4);
        if (i < 2) {
          g.fillStyle(cyan, 1);
          g.fillCircle(x - 10 + i * 10, y, 2);
        }
      }
      break;
    }
    default:
      break;
  }
}

// ---------------------------------------------------------------------------
// Flag stamp border — reduce-flash mode replaces the full red flash with
// this steady border pulse (Design Lock §7).
// ---------------------------------------------------------------------------
export function drawAlertBorder(g, alpha) {
  if (alpha <= 0.01) return;
  const red = C(CAR.LAMP_ALERT);
  g.lineStyle(8, red, alpha);
  g.strokeRect(6, 6, GAME_W - 12, GAME_H - 12);
}
