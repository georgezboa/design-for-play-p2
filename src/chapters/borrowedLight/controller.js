// Chapter 2 · BORROWED LIGHT — Butch's movement controller.
//
// Pure (no Phaser). The scene feeds it input and the body's post-collision
// velocity each frame and writes the returned velocity back to the Arcade
// body, whose own gravity is off. Keeping the numbers here means the level's
// gaps can be designed (and tested) against the real jump arc.
//
// Tuned feel (spec §6): max run ≈ 420 px/s, jump apex ≈ 180 px,
// coyote time 100 ms, jump buffer 120 ms, variable jump height.

export const CONTROLLER = Object.freeze({
  maxRun: 420,
  groundAccel: 3400,      // 0 → max in ~0.12 s
  groundDecel: 4600,
  airAccel: 2300,
  airDecel: 900,
  gravity: 2400,
  fallGravityScale: 1.25, // a touch heavier on the way down
  maxFall: 1400,
  jumpVelocity: 930,      // v²/2g = 180 px apex
  jumpCut: 0.45,          // releasing Space while rising keeps 45% of vy
  coyoteMs: 100,
  bufferMs: 120,
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
