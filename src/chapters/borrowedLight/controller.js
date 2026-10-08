// Chapter 2 · BORROWED LIGHT — Butch's movement controller.
//
// Pure (no Phaser). The scene feeds it input and the body's post-collision
// velocity each frame and writes the returned velocity back to the Arcade
// body, whose own gravity is off. Keeping the numbers here means the level's
// gaps can be designed (and tested) against the real jump arc.
//
// Tuned feel (spec §6): max run ≈ 420 px/s, jump apex ≈ 180 px, coyote time,
// a jump buffer, variable jump height.
//
// Round 6 (owner G3, "the controls have problems"), keeping the run speed and
// the 180 px apex every gap is designed against:
// - The arc was floaty: 0.39 s up and only 1.25× gravity on the way down.
//   Now 0.37 s up and 1.55× down, so the top of the jump does not hang and
//   the fall is decisive (air time 0.73 → 0.66 s; flat range 308 → 276 px,
//   still well over every jump gap, which are ≤ 107 px).
// - Letting go of a direction in the air drifted on: air decel 900 → 1700
//   px/s², so a landing can be placed on a narrow deck.
// - Air acceleration 2300 → 2400 for a slightly quicker mid-air turn.
// - Forgiveness a touch wider: coyote 100 → 110 ms, buffer 120 → 140 ms.

export const CONTROLLER = Object.freeze({
  maxRun: 420,
  groundAccel: 3400,      // 0 → max in ~0.12 s
  groundDecel: 4600,
  airAccel: 2400,
  airDecel: 1700,
  gravity: 2700,
  fallGravityScale: 1.55, // heavier on the way down: no floaty hang
  maxFall: 1400,
  jumpVelocity: 986,      // v²/2g = 180 px apex
  jumpCut: 0.45,          // releasing Space while rising keeps 45% of vy
  coyoteMs: 110,
  bufferMs: 140,
  landMs: 140,
  hardLandingVy: 620,
  updraftVy: -620,
  updraftAccel: 3600,
});

// The numbers the level is designed from. Written down so a reviewer can
// check every gap against them (tests/borrowedLight/controller.test.mjs).
export function jumpArc(c = CONTROLLER) {
  const up = c.gravity;
  const down = c.gravity * c.fallGravityScale;
  const apex = (c.jumpVelocity ** 2) / (2 * up);
  const timeToApex = c.jumpVelocity / up;
  const timeDown = Math.sqrt((2 * apex) / down);
  const airTime = timeToApex + timeDown;
  // Furthest horizontal distance at full run to land on a ledge `rise` px
  // higher (negative = lower): the time until the feet come back down
  // through that height, times max run.
  const reachAtRise = (rise) => {
    if (rise > apex) return 0;
    const tDown = timeToApex + Math.sqrt((2 * (apex - rise)) / down);
    return c.maxRun * tDown;
  };
  return {
    apex,
    timeToApex,
    airTime,
    flatRange: c.maxRun * airTime,
    reachAtRise,
    // Comfortable design limits (≈75% of the physical limit).
    safeGap: Math.floor(c.maxRun * airTime * 0.75),
    safeStepUp: Math.floor(apex * 0.8),
  };
}

export function createControllerState() {
  return {
    facing: 1,
    grounded: false,
    coyoteMs: 0,
    bufferMs: 0,
    jumping: false,
    jumpCutDone: false,
    landMs: 0,
    pose: 'fall',
    runPhase: 0,
    airMs: 0,
    lastJumpAt: -1,
  };
}

const approach = (value, target, delta) => (value < target
  ? Math.min(target, value + delta)
  : Math.max(target, value - delta));

// input: { left, right, jumpPressed, jumpHeld }
// body:  { grounded, vx, vy, inUpdraft }
// returns { vx, vy, jumped, landed, pose }
export function stepController(state, input, body, dtMs, c = CONTROLLER) {
  const dt = Math.min(0.05, Math.max(0, dtMs) / 1000);
  let { vx, vy } = body;
  let jumped = false;
  let landed = false;

  const wasGrounded = state.grounded;
  state.grounded = Boolean(body.grounded);
  if (state.grounded && !wasGrounded) {
    landed = true;
    if (state.airMs > 120) state.landMs = c.landMs;
    state.jumping = false;
    state.jumpCutDone = false;
  }
  if (state.grounded) {
    state.coyoteMs = c.coyoteMs;
    state.airMs = 0;
  } else {
    state.coyoteMs = Math.max(0, state.coyoteMs - dtMs);
    state.airMs += dtMs;
  }

  if (input.jumpPressed) state.bufferMs = c.bufferMs;
  else state.bufferMs = Math.max(0, state.bufferMs - dtMs);

  // Horizontal.
  const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  if (dir) state.facing = dir;
  const target = dir * c.maxRun;
  const accel = state.grounded
    ? (dir && Math.sign(vx) !== -dir ? c.groundAccel : c.groundDecel)
    : (dir ? c.airAccel : c.airDecel);
  vx = approach(vx, target, accel * dt);

  // Jump: buffered press + (grounded or coyote).
  if (state.bufferMs > 0 && (state.grounded || state.coyoteMs > 0) && !state.jumping) {
    vy = -c.jumpVelocity;
    state.jumping = true;
    state.jumpCutDone = false;
    state.bufferMs = 0;
    state.coyoteMs = 0;
    state.grounded = false;
    state.landMs = 0;
    jumped = true;
  }

  // Variable height: letting go while rising trims the jump once.
  if (state.jumping && !input.jumpHeld && vy < 0 && !state.jumpCutDone) {
    vy *= c.jumpCut;
    state.jumpCutDone = true;
  }

  // Gravity / updraft.
  if (body.inUpdraft) {
    vy = approach(vy, c.updraftVy, c.updraftAccel * dt);
    state.jumping = false;
  } else if (!state.grounded || jumped) {
    const g = vy > 0 ? c.gravity * c.fallGravityScale : c.gravity;
    vy = Math.min(c.maxFall, vy + g * dt);
  } else {
    // Keep a little downward pressure so Arcade reports blocked.down.
    vy = Math.max(vy, 40);
  }

  state.landMs = Math.max(0, state.landMs - dtMs);
  if (state.grounded && Math.abs(vx) > 20) state.runPhase = (state.runPhase + (Math.abs(vx) / c.maxRun) * dt * 1.65) % 1;

  state.pose = state.grounded
    ? (state.landMs > 0 ? 'land' : Math.abs(vx) > 30 ? 'run' : 'idle')
    : body.inUpdraft ? 'float' : vy < 0 ? 'jump' : 'fall';

  return { vx, vy, jumped, landed, pose: state.pose };
}

// How long (game ms) a jump key counts as held after a tap that was already
// released when its jump starts. On a slow frame (a weak machine, or QA's
// dev-only ?timescale= run, where one rendered frame can cover a whole hop)
// key-down and key-up arrive together, and without this every tap became the
// shortest cut hop (alpha round 2, R2-2). Timestamps are wall ms (DOM event
// timeStamp); `timescale` is game ms per wall ms.
export function tapHoldMs({ downAt, upAt, timescale = 1, max = 400 } = {}) {
  if (!Number.isFinite(downAt) || !Number.isFinite(upAt) || upAt < downAt) return 0;
  return Math.min(max, (upAt - downAt) * timescale);
}
