// Chapter 6 · the side-view body (round 12): Butch running and jumping in
// the three side-on pieces (THE ROOF RUN, ON THE BELL, THE BELL TOWER).
//
// Pure 2D (x along the screen, y up). The forgiveness a platformer needs,
// after Maddy Thorson's "Celeste & Forgiveness":
//   coyote time     a jump still works PLATFORM.coyote s after walking off
//   jump buffer     a jump pressed PLATFORM.buffer s before landing fires on
//                   the landing
//   apex hang       holding jump near the top of the arc lightens gravity
//   variable jump   letting go early falls sooner (a short hop)
//   ledge grace     feet land up to PLATFORM.ledge m past a surface's end
//   small hurt box  narrower and shorter than the painted figure
// Plus a dash (brief i-frames, once in the air) and a duck / slide.
//
// A world is { surfaces, solids, minX, maxX, killY }:
//   surface  { id, x0, x1, y, dx = 0, dy = 0, temp = false }  a top you land
//            on from above (dx/dy: how far it moved this step, so a rider
//            is carried; temp: a plank or bridge, never a respawn point)
//   solid    { x0, x1, y0, y1 }  a block you cannot walk through

import { approach, clamp } from './kernel.js';

export const PLATFORM = Object.freeze({
  run: 7.4,
  accel: 78,
  airAccel: 50,
  friction: 90,
  jumpV: 11.8,
  gravityUp: 31,
  gravityDown: 46,
  releaseGravity: 70, // rising with jump released: a short hop
  apexBand: 2.4,
  apexScale: 0.55,
  maxFall: 24,
  coyote: 0.11,
  buffer: 0.14,
  ledge: 0.22,
  dashSpeed: 17,
  dashTime: 0.16,
  dashInv: 0.22,
  dashCd: 0.55,
  standH: 1.7,
  duckH: 0.85,
  halfW: 0.3,
  duckSpeed: 0.5,
  slideTime: 0.42,
  slideFriction: 9,
});

export function createPlatformBody({ x = 0, y = 0, facing = 1 } = {}) {
  return {
    x, y, vx: 0, vy: 0, grounded: true, ground: null, coyote: 0, buffer: 0, jumpHeld: false, facing,
    dashT: 0, dashDir: facing, dashCd: 0, dashInv: 0, airDashUsed: false, duck: false, slideT: 0,
    lastSafe: { x, y }, speedScale: 1, landSpeed: 0, moving: false, punch: 0,
  };
}

export const bodyHeight = (body) => (body.duck ? PLATFORM.duckH : PLATFORM.standH);

// Butch's hurt box (generous: a little narrower and shorter than he is drawn).
export function hurtBox(body, scale = 1) {
  const half = PLATFORM.halfW * scale;
  const h = bodyHeight(body) * (0.86 + 0.08 * scale);
  return { x0: body.x - half, x1: body.x + half, y0: body.y + 0.06, y1: body.y + h };
}

export const boxesOverlap = (a, b) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
export function circleHitsBox(cx, cy, r, box) {
  const nx = clamp(cx, box.x0, box.x1);
  const ny = clamp(cy, box.y0, box.y1);
  return Math.hypot(cx - nx, cy - ny) < r;
}

const surfaceUnder = (surfaces, x, y, tol = 0.06) => {
  let best = null;
  for (const s of surfaces) {
    if (x < s.x0 - PLATFORM.ledge || x > s.x1 + PLATFORM.ledge) continue;
    if (Math.abs(s.y - y) > tol) continue;
    if (!best || s.y > best.y) best = s;
  }
  return best;
};

// One step. input: { x (-1..1), jump (pressed), jumpHeld, dash (pressed),
// duck (held) }. Returns the step's events: 'jump', 'land', 'dash', 'fell'.
export function stepPlatformBody(body, input, dt, world) {
  const P = PLATFORM;
  const events = [];
  const surfaces = world.surfaces ?? [];
  const solids = world.solids ?? [];
  body.dashCd = Math.max(0, body.dashCd - dt);
  body.dashInv = Math.max(0, body.dashInv - dt);
  body.coyote = Math.max(0, body.coyote - dt);
  body.buffer = Math.max(0, body.buffer - dt);
  body.punch = Math.max(0, body.punch - dt);
  const ix = clamp(Number(input?.x) || 0, -1, 1);
  if (input?.jump) body.buffer = P.buffer;
  body.jumpHeld = Boolean(input?.jumpHeld ?? input?.jump);

  // Carried by the ground (a moving plank, a swinging beam).
  if (body.grounded && body.ground) {
    const s = surfaces.find((entry) => entry.id === body.ground);
    if (s && body.x >= s.x0 - P.ledge - Math.abs(s.dx ?? 0) && body.x <= s.x1 + P.ledge + Math.abs(s.dx ?? 0)) {
      body.x += s.dx ?? 0;
      body.y = s.y;
    } else {
      body.grounded = false;
      body.ground = null;
      body.coyote = P.coyote;
    }
  }

  // Duck and slide (only on the ground).
  const wantDuck = Boolean(input?.duck) && body.grounded;
  if (wantDuck && !body.duck && Math.abs(body.vx) > P.run * 0.7) body.slideT = P.slideTime;
  body.duck = wantDuck;
  if (!body.duck) body.slideT = 0;

  // Dash: once on the ground's cooldown, once per air time.
  if (input?.dash && body.dashCd <= 0 && (body.grounded || !body.airDashUsed)) {
    body.dashT = P.dashTime;
    body.dashCd = P.dashCd;
    body.dashInv = P.dashInv;
    body.dashDir = ix ? Math.sign(ix) : body.facing;
    if (!body.grounded) body.airDashUsed = true;
    body.slideT = 0;
    events.push({ type: 'dash', dir: body.dashDir });
  }
  if (ix && body.dashT <= 0) body.facing = Math.sign(ix);

  // Horizontal speed.
  if (body.dashT > 0) {
    body.dashT = Math.max(0, body.dashT - dt);
    body.vx = body.dashDir * P.dashSpeed;
    if (!body.grounded) body.vy = Math.max(body.vy, 0) * 0.2;
  } else if (body.slideT > 0) {
    body.slideT = Math.max(0, body.slideT - dt);
    body.vx = approach(body.vx, 0, P.slideFriction * dt);
  } else {
    const top = P.run * (body.speedScale ?? 1) * (body.duck ? P.duckSpeed : 1);
    const target = ix * top;
    const accel = body.grounded ? (ix === 0 ? P.friction : P.accel) : P.airAccel;
    body.vx = approach(body.vx, target, accel * dt);
  }
  body.moving = Math.abs(body.vx) > 0.4;

  // Jump (buffered, with coyote time).
  if (body.buffer > 0 && (body.grounded || body.coyote > 0)) {
    body.vy = P.jumpV;
    body.grounded = false;
    body.ground = null;
    body.coyote = 0;
    body.buffer = 0;
    body.duck = false;
    body.slideT = 0;
    events.push({ type: 'jump' });
  }

  // Gravity (not during an air dash).
  if (!body.grounded && body.dashT <= 0) {
    let g = body.vy > 0 ? (body.jumpHeld ? P.gravityUp : P.releaseGravity) : P.gravityDown;
    if (Math.abs(body.vy) < P.apexBand && body.jumpHeld) g *= P.apexScale;
    body.vy = Math.max(-P.maxFall, body.vy - g * dt);
  }

  // Horizontal move and walls.
  const h = bodyHeight(body);
  let nx = body.x + body.vx * dt;
  for (const w of solids) {
    if (body.y + h <= w.y0 + 0.02 || body.y >= w.y1 - 0.02) continue;
    if (nx + P.halfW > w.x0 && nx - P.halfW < w.x1) {
      if (body.x <= (w.x0 + w.x1) / 2) nx = Math.min(nx, w.x0 - P.halfW);
      else nx = Math.max(nx, w.x1 + P.halfW);
      body.vx = 0;
      body.dashT = 0;
    }
  }
  nx = clamp(nx, world.minX ?? -Infinity, world.maxX ?? Infinity);
  body.x = nx;

  // Vertical move: land on a surface from above; bump a block from below.
  const wasGrounded = body.grounded;
  if (!body.grounded) {
    const ny = body.y + body.vy * dt;
    let landed = null;
    if (body.vy <= 0) {
      for (const s of surfaces) {
        if (body.x < s.x0 - P.ledge || body.x > s.x1 + P.ledge) continue;
        const prev = body.y - (s.dy ?? 0);
        if (prev >= s.y - 0.08 && ny <= s.y + 0.001 && (!landed || s.y > landed.y)) landed = s;
      }
      for (const w of solids) {
        if (body.x < w.x0 - P.halfW * 0.6 || body.x > w.x1 + P.halfW * 0.6) continue;
        if (body.y >= w.y1 - 0.08 && ny <= w.y1 + 0.001 && (!landed || w.y1 > landed.y)) landed = { id: null, y: w.y1, solid: true };
      }
    } else {
      for (const w of solids) {
        if (body.x < w.x0 - P.halfW * 0.5 || body.x > w.x1 + P.halfW * 0.5) continue;
        if (body.y + h <= w.y0 + 0.02 && ny + h > w.y0) { body.vy = 0; body.y = w.y0 - h; }
      }
    }
    if (landed) {
      body.landSpeed = -body.vy;
      body.y = landed.y;
      body.vy = 0;
      body.grounded = true;
      body.ground = landed.id ?? null;
      body.airDashUsed = false;
      if (body.buffer > 0) {
        // A buffered jump fires on the landing.
        body.vy = P.jumpV; body.grounded = false; body.ground = null; body.buffer = 0;
        events.push({ type: 'land', speed: body.landSpeed, buffered: true }, { type: 'jump', buffered: true });
      } else events.push({ type: 'land', speed: body.landSpeed });
    } else body.y = ny;
  } else {
    // Still supported where he now stands?
    const s = body.ground ? surfaces.find((entry) => entry.id === body.ground) : null;
    const onSolid = !s && solids.some((w) => body.x >= w.x0 - P.halfW * 0.6 && body.x <= w.x1 + P.halfW * 0.6 && Math.abs(w.y1 - body.y) < 0.06);
    const stillOn = s ? body.x >= s.x0 - P.ledge && body.x <= s.x1 + P.ledge : onSolid || surfaceUnder(surfaces, body.x, body.y);
    if (!stillOn) {
      body.grounded = false;
      body.ground = null;
      body.coyote = P.coyote;
    } else if (!s && !onSolid) {
      const under = surfaceUnder(surfaces, body.x, body.y);
      body.ground = under?.id ?? null;
    }
  }
  if (wasGrounded && !body.grounded && body.vy <= 0 && body.coyote <= 0) body.coyote = P.coyote;

  // The last safe ground: a fixed surface (never a plank), away from its edge.
  if (body.grounded) {
    const s = body.ground ? surfaces.find((entry) => entry.id === body.ground) : null;
    if (s && !s.temp && body.x > s.x0 + 0.7 && body.x < s.x1 - 0.7) body.lastSafe = { x: body.x, y: body.y };
    else if (!s && !body.ground) body.lastSafe = { x: body.x, y: body.y };
  }
  if (body.y < (world.killY ?? -Infinity)) events.push({ type: 'fell' });
  return events;
}

// Stand Butch up somewhere safe (after a fall, or a checkpoint).
export function placeBody(body, x, y, facing = body.facing) {
  Object.assign(body, {
    x, y, vx: 0, vy: 0, grounded: true, ground: null, coyote: 0, buffer: 0, dashT: 0, dashCd: 0, dashInv: 0,
    airDashUsed: false, duck: false, slideT: 0, facing, lastSafe: { x, y },
  });
}
