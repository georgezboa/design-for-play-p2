// Chapter 4 // THE PAINTED COUNTRY — how the other figures move.
//
// Round 6 (G2, "many animations look unnatural"). The residents used to glide
// after the train on an exponential lerp with a run cycle ticking on the
// clock, so their feet skated at every start and stop; Mara walked through
// the gallery door on a time-based stride while an ease moved her, so she
// slid in and out of the walk. Here the figures have a speed: they speed up
// and slow down with real acceleration, and their cycles follow the ground
// they cover. Pure, so the node tests can check it.

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/**
 * One frame of a figure running after `targetX` along the ground.
 * `p` carries { x, v, stride, facing }; returns p.
 */
export function stepFollower(p, targetX, dt, { maxSpeed = 175, accel = 420, brake = 620, gain = 3.2 } = {}) {
  const d = Math.min(0.1, Math.max(0, dt));
  const dx = targetX - p.x;
  const want = clamp(dx * gain, -maxSpeed, maxSpeed);
  const speedingUp = Math.abs(want) > Math.abs(p.v) && Math.sign(want || 1) === Math.sign(p.v || want || 1);
  const rate = speedingUp ? accel : brake;
  const dv = clamp(want - p.v, -rate * d, rate * d);
  p.v += dv;
  // never overshoot the mark
  let step = p.v * d;
  if (Math.abs(step) > Math.abs(dx) && Math.sign(step) === Math.sign(dx)) {
    step = dx;
    p.v = Math.abs(dx) < 0.5 ? 0 : p.v;
  }
  p.x += step;
  p.stride = (p.stride ?? 0) + Math.abs(step);
  if (Math.abs(p.v) > 8) p.facing = Math.sign(p.v);
  return p;
}

/**
 * A walk cycle driven by distance: `phase` (radians) advances one stride
 * per `strideLength` px covered. Returns the pose numbers a drawn figure
 * needs: leg swing (-1..1), the body's bob (px, negative is up: highest on
 * passing, lowest on contact) and the coat hem's swing, a beat behind the
 * legs (secondary motion).
 */
export function gait(distance, { strideLength = 34, bob = 1.8, speed = 1 } = {}) {
  const phase = (distance / strideLength) * Math.PI * 2;
  const s = clamp(speed, 0, 1);
  return {
    phase,
    swing: Math.sin(phase) * s,
    bob: -Math.abs(Math.cos(phase)) * bob * s,
    hem: Math.sin(phase - 0.9) * s,
    arm: -Math.sin(phase) * s,
  };
}
