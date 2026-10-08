// Chapter 4 // THE PAINTED COUNTRY — which pencil frame Butch is in, and how
// the frame moves. Pure (no Phaser, no assets), so the node tests can drive it.
//
// The sheet (assets/butch-pencil/butch-pencil-sheet.png): 0-3 the walk (0 is
// the standing pose, and the walk's passing pose), 4 JUMP (rising), 5 FALL.
// The walk advances with distance travelled, not time, so his feet never
// skate.
//
// Round 6 (George, G2: "the characters are drawn well, but many animations
// look unnatural"). Six frames cannot carry weight on their own, so the frame
// itself now moves (createButchMotion):
//   · the walk bobs: lowest on the two contact frames, highest on passing,
//     with a hint of squash on contact;
//   · he leans into his speed through a soft spring, so starting has a small
//     anticipation (a lean back before the lean forward) and stopping has
//     follow-through (he tips past upright and settles);
//   · idle breathes, and his weight shifts slowly from foot to foot;
//   · turning round is a quick turn (the figure narrows through side-on and
//     opens the other way), not a mirror snap;
//   · a jump stretches on take-off and squashes on landing, with the landing
//     reported so the room can kick up graphite dust;
//   · the brush arm follows the cursor on a damped spring (it swings and
//     settles rather than snapping), and scrubs while it paints.

export const BUTCH_FRAMES = Object.freeze({ walk: [0, 1, 2, 3], idle: 0, jump: 4, fall: 5 });
// Px of travel per walk frame: the pencil stride is ~25 px a step (two
// frames), so the feet stay planted.
export const STRIDE_PX = 13;

export function butchPose({ vx = 0, vy = 0, grounded = true, stride = 0, facing = 1, aimX = null, x = 0 } = {}) {
  let nextFacing = facing;
  if (vx < -8) nextFacing = -1;
  else if (vx > 8) nextFacing = 1;
  else if (aimX !== null && Math.abs(aimX - x) > 24) nextFacing = aimX < x ? -1 : 1;
  if (!grounded) {
    const rising = vy < -40;
    return { frame: rising ? BUTCH_FRAMES.jump : BUTCH_FRAMES.fall, facing: nextFacing, animation: rising ? 'jump' : 'fall' };
  }
  if (Math.abs(vx) > 8) {
    const i = Math.floor(stride / STRIDE_PX) % BUTCH_FRAMES.walk.length;
    return { frame: BUTCH_FRAMES.walk[i], facing: nextFacing, animation: 'walk' };
  }
  return { frame: BUTCH_FRAMES.idle, facing: nextFacing, animation: 'idle' };
}

// ----------------------------------------------------------------- motion

export const MOTION = Object.freeze({
  turnSeconds: 0.14,
  walkBob: 1.3, // px
  leanDeg: 4.5, // at full walking speed
  airLeanDeg: 6,
  maxSpeed: 220,
  breathSeconds: 3.4,
  breath: 0.013,
  swaySeconds: 5.2,
  swayDeg: 0.7,
  landSpeed: 240, // vy (px/s) above which a landing squashes and dusts
});

const DEG = Math.PI / 180;

// A damped spring toward `target`; returns the new [value, velocity].
export function spring(value, velocity, target, dt, stiffness, damping) {
  // semi-implicit Euler, sub-stepped so a 10 fps frame is still stable
  let v = velocity;
  let x = value;
  const steps = Math.max(1, Math.ceil(dt / (1 / 120)));
  const h = dt / steps;
  for (let i = 0; i < steps; i += 1) {
    v += (-stiffness * (x - target) - damping * v) * h;
    x += v * h;
  }
  return [x, v];
}

const wrapAngle = (a) => Math.atan2(Math.sin(a), Math.cos(a));

export function createButchMotion() {
  const m = {
    facing: 1,
    shownFacing: 1,
    turn: 1, // 0..1 through a turn; 1 = settled
    lean: 0,
    leanV: 0,
    sx: 1,
    sxV: 0,
    sy: 1,
    syV: 0,
    idle: 0,
    t: 0,
    grounded: true,
    lastVy: 0,
    moving: false,
    arm: null,
    armV: 0,
  };

  /**
   * One frame. `frame` / `facing` / `animation` come from butchPose; `stride`
   * is the distance walked. `aim` is the brush angle (radians, screen) the arm
   * wants; `painting` whether a stroke is down; `lean` an extra lean (-1..1)
   * the room asks for (riding the engine).
   */
  function step({ dt = 1 / 60, vx = 0, vy = 0, grounded = true, facing = 1, animation = 'idle', frame = 0, stride = 0, aim = 0, painting = false, lean = 0 } = {}) {
    const d = Math.min(0.1, Math.max(0, dt));
    m.t += d;
    const events = [];

    // turning round: narrow through side-on, open the other way
    if (facing !== m.facing) {
      m.facing = facing;
      m.turn = 0;
    }
    if (m.turn < 1) {
      m.turn = Math.min(1, m.turn + d / MOTION.turnSeconds);
      m.shownFacing = m.turn < 0.5 ? -m.facing : m.facing;
    } else {
      m.shownFacing = m.facing;
    }
    const k = m.turn;
    const turnWidth = k >= 1 ? 1 : Math.max(0.16, Math.abs(Math.cos(Math.PI * (k < 0.5 ? k * k * 2 : 1 - ((-2 * k + 2) ** 2) / 2))));

    // take-off and landing
    if (m.grounded && !grounded && vy < -100) {
      m.syV += 5.5;
      m.sxV -= 3.2;
    }
    if (!m.grounded && grounded && m.lastVy > MOTION.landSpeed) {
      const hit = Math.min(1, (m.lastVy - MOTION.landSpeed) / 700 + 0.35);
      m.syV -= 7 * hit;
      m.sxV += 5 * hit;
      events.push({ type: 'land', strength: hit });
    }
    m.grounded = grounded;
    m.lastVy = vy;

    // lean into the speed; anticipation on starting, follow-through on stopping
    const moving = grounded && Math.abs(vx) > 8;
    if (moving && !m.moving) m.leanV -= Math.sign(vx) * 38 * DEG;
    m.moving = moving;
    const speedK = Math.max(-1, Math.min(1, vx / MOTION.maxSpeed));
    const leanTarget = (grounded ? speedK * MOTION.leanDeg : speedK * MOTION.airLeanDeg) * DEG + lean * 5 * DEG;
    [m.lean, m.leanV] = spring(m.lean, m.leanV, leanTarget, d, 140, 15);

    // squash and stretch settle back to 1
    [m.sx, m.sxV] = spring(m.sx, m.sxV, 1, d, 320, 20);
    [m.sy, m.syV] = spring(m.sy, m.syV, 1, d, 320, 20);

    // the walk's bob and contact squash, idle's breath and weight shift
    let offsetY = 0;
    let breathe = 1;
    let sway = 0;
    if (animation === 'walk') {
      m.idle = 0;
      const phase = stride / STRIDE_PX - 0.5;
      const up = 0.5 + 0.5 * Math.cos(Math.PI * phase); // 1 on passing, 0 on contact
      offsetY = -MOTION.walkBob * up;
      breathe = 0.988 + 0.022 * up;
    } else if (animation === 'idle') {
      m.idle += d;
      const settle = Math.min(1, m.idle / 0.6);
      breathe = 1 + MOTION.breath * Math.sin((m.idle / MOTION.breathSeconds) * Math.PI * 2) * settle;
      sway = MOTION.swayDeg * DEG * Math.sin((m.idle / MOTION.swaySeconds) * Math.PI * 2) * settle;
    } else {
      m.idle = 0;
    }

    // the brush arm swings to the cursor and settles; it scrubs as it paints
    if (m.arm === null) m.arm = aim;
    const delta = wrapAngle(aim - m.arm);
    let armV = m.armV;
    let armRel = 0;
    [armRel, armV] = spring(-delta, armV, 0, d, 210, 19);
    m.arm = wrapAngle(aim + armRel);
    m.armV = armV;
    const scrub = painting ? Math.sin(m.t * Math.PI * 2 * 7.5) * 0.09 : 0;
    const reach = painting ? 1 + 0.06 * Math.sin(m.t * Math.PI * 2 * 7.5 + 1.2) : 1;

    return {
      frame: m.turn < 1 && grounded ? BUTCH_FRAMES.idle : frame,
      facing: m.shownFacing,
      scaleX: m.sx * turnWidth,
      scaleY: m.sy * breathe,
      rotation: m.lean + sway,
      offsetY,
      turning: m.turn < 1,
      arm: m.arm + scrub,
      armReach: reach,
      events,
    };
  }

  return { step, state: m };
}
