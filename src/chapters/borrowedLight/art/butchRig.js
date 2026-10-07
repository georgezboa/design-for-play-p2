// Chapter 2 · BORROWED LIGHT — Butch, redrawn (round 6, owner G3).
//
// Pure (no Phaser import). Three parts with a clean seam between them, so
// painted sprite frames can replace the drawn figure later without touching
// the scene:
//
//   1. stepButchAnim(anim, input, dtMs)  — the animation state: run cycle,
//      jump anticipation and stretch, landing squash, the greatcoat's tail
//      following through on a spring, the lantern swinging on its bail.
//   2. butchFrame(anim)                  — one frame, as plain numbers: the
//      pose's joint angles, squash, coat sway, lantern angle, and a sprite
//      reference { set, index } (BUTCH_FRAME_SETS) for painted frames.
//   3. drawButch(g, frame, at)           — the vector renderer, onto any
//      object with Phaser Graphics' fill / line calls. It returns where the
//      lantern hangs (world), which the scene's light follows. A sprite
//      renderer only has to honour the same frame and return the same point
//      (butchLampAt gives the lantern's anchor for any frame).
//
// The figure (docs/CUTSCENES_SPEC.md: "cap with brim, long coat, lamp"): a
// peaked railway cap with a brass band and a black visor, a long navy
// greatcoat to the shins, double-breasted, collar up, and the lantern in his
// leading hand. Limited palette (ink black, deep navy, cold teal rim, one
// amber), matte, a crisp cold rim from the sky on his back edge.

const TAU = Math.PI * 2;

export const BUTCH_LOOK = Object.freeze({
  height: 118,
  coat: 0x1c2740,
  coatShade: 0x111a2c,
  coatEdge: 0x2b3a58,
  lining: 0x0a0e17,
  trousers: 0x12161f,
  boots: 0x07080b,
  skin: 0xb48a6e,
  skinShade: 0x8a6650,
  hair: 0x0c0a0a,
  cap: 0x161f33,
  capBand: 0xb08a4a,
  visor: 0x07080b,
  buttons: 0xc9a15a,
  lampFrame: 0x15110c,
  lampGlass: 0xf2c27a,
  lampCore: 0xfff1cf,
  rimCold: 0x7fbdb4,
  rimWarm: 0xf2c27a,
});

// Painted frames, when the owner supplies them: one sheet per set, frames
// 0…n-1, feet at the bottom centre, facing right. butchFrame() names the
// frame to show; butchLampAt() says where the lantern is in it.
export const BUTCH_FRAME_SETS = Object.freeze({ idle: 8, run: 8, rise: 2, apex: 1, fall: 2, land: 3, float: 2, crouch: 1 });

export const RIG = Object.freeze({
  hipY: -56,
  torso: 36,
  thigh: 29,
  shin: 28,
  upperArm: 21,
  foreArm: 20,
  headR: 9.8,
  // Animation timing.
  anticMs: 70,        // the crouch before a jump reads (visual only: the jump is never delayed)
  landMs: 170,
  turnMs: 110,
  // Springs.
  squashK: 520,
  squashC: 26,
  coatK: 70,
  coatC: 10,
  lampK: 62,
  lampC: 3.0,
});

export function createButchAnim() {
  return {
    t: 0,
    pose: 'idle',
    phase: 0,
    facing: 1,
    squash: 1,
    squashV: 0,
    coat: 0,
    coatV: 0,
    lamp: 0,
    lampV: 0,
    antic: 0,
    land: 0,
    landDepth: 0,
    turn: 0,
    speed: 0,
    vy: 0,
    airMs: 0,
    prevVx: 0,
    prevVy: 0,
    idleT: 0,
  };
}

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/**
 * input: { pose (controller pose), phase (run phase 0..1), vx, vy, facing,
 *          grounded, jumped, landed, maxRun }
 */
export function stepButchAnim(anim, input, dtMs) {
  const dt = clamp(dtMs, 0, 50) / 1000;
  const a = anim;
  a.t += dt;
  const maxRun = input.maxRun ?? 420;
  const vx = input.vx ?? 0;
  const vy = input.vy ?? 0;
  const facing = input.facing >= 0 ? 1 : -1;
  if (facing !== a.facing) { a.facing = facing; a.turn = 1; a.coatV += 3.2; }
  a.turn = Math.max(0, a.turn - dtMs / RIG.turnMs);
  a.pose = input.pose ?? 'idle';
  a.phase = input.phase ?? a.phase;
  a.speed = clamp(Math.abs(vx) / maxRun, 0, 1.2);
  a.vy = vy;
  a.airMs = input.grounded ? 0 : a.airMs + dtMs;
  a.idleT = a.pose === 'idle' ? a.idleT + dt : 0;
  // Local (facing) acceleration of the body, px/s².
  const ax = dt > 0 ? ((vx - a.prevVx) / dt) * facing : 0;
  a.prevVx = vx;
  a.prevVy = vy;

  // Jump: a short crouch, then the stretch (the body is already rising).
  if (input.jumped) { a.antic = 1; a.squash = 0.86; a.squashV = 0; a.lampV -= 2.4; }
  if (a.antic > 0) {
    a.antic = Math.max(0, a.antic - dtMs / RIG.anticMs);
    if (a.antic === 0) { a.squash = 1.12; a.squashV = 0; }
  }
  // Landing: squash by how hard he came down, and the lantern jolts.
  if (input.landed) {
    const impact = clamp((input.impactVy ?? 600) / 1400, 0.25, 1);
    a.land = 1;
    a.landDepth = impact;
    a.squash = 1 - 0.2 * impact;
    a.squashV = 0;
    a.lampV += facing * (1.6 + 2.4 * impact) * (a.lamp >= 0 ? 1 : -1);
    a.coatV -= 2.5 * impact;
  }
  a.land = Math.max(0, a.land - dtMs / RIG.landMs);

  // Squash spring back to 1.
  if (a.antic === 0) {
    const f = -RIG.squashK * (a.squash - 1) - RIG.squashC * a.squashV;
    a.squashV += f * dt;
    a.squash = clamp(a.squash + a.squashV * dt, 0.72, 1.25);
  }

  // The greatcoat's tail: trails behind a run, swings forward on a stop,
  // lifts on a fall, billows in the updraft. Positive = toward his back.
  let target = a.speed * 0.42 - ax * 0.00011;
  if (!input.grounded) target += clamp(vy / 1400, -0.5, 1) * 0.42 + 0.08;
  if (a.pose === 'float') target = 0.55 + Math.sin(a.t * 7) * 0.12;
  if (a.pose === 'run') target += Math.sin(a.t * 13.5) * 0.05 * a.speed + Math.sin(a.phase * TAU * 2) * 0.05;
  target += Math.sin(a.t * 1.7) * 0.025; // the wind on the roofs
  target = clamp(target, -0.45, 0.95);
  a.coatV += (-RIG.coatK * (a.coat - target) - RIG.coatC * a.coatV) * dt;
  a.coat = clamp(a.coat + a.coatV * dt, -0.6, 1.1);

  // The lantern on its bail: a damped pendulum driven by the hand.
  let push = -ax * 0.0065;
  if (a.pose === 'run') push += Math.sin(a.phase * TAU * 2 + 0.6) * 1.6 * a.speed;
  a.lampV += (-RIG.lampK * Math.sin(a.lamp) - RIG.lampC * a.lampV + push) * dt;
  a.lamp = clamp(a.lamp + a.lampV * dt, -1.1, 1.1);
  return a;
}

// ---- poses ---------------------------------------------------------------

// One leg at its own cycle phase u (0 = the foot strikes in front; 0–0.5 the
// stance pushes it back; 0.5–1 it swings through, knee high).
function runLeg(u, speed) {
  const w = ((u % 1) + 1) % 1;
  const reach = 0.42 + 0.18 * speed;
  const thigh = reach * Math.cos(TAU * w) + 0.08;
  let knee;
  if (w < 0.5) knee = 0.18 + 0.32 * Math.sin(Math.PI * (w / 0.5)) * 0.6;
  else knee = 0.25 + (1.05 + 0.35 * speed) * Math.pow(Math.sin(Math.PI * ((w - 0.5) / 0.5)), 0.85);
  return [thigh, knee];
}

/**
 * The frame: joint angles (radians; 0 = straight down, + = forward) and the
 * figure's offsets, plus the sprite reference.
 */
export function butchFrame(anim) {
  const a = anim;
  const s = a.speed;
  const t = a.t;
  let legA;
  let legB;
  let armB;
  let armA;
  let lean = 0.03;
  let hip = 0;
  let headNod = 0;
  let set = 'idle';
  let index = 0;
  switch (a.pose) {
    case 'run': {
      const p = a.phase;
      legA = runLeg(p, s);
      legB = runLeg(p + 0.5, s);
      // Lowest just after each foot strikes, highest in flight.
      hip = 2.6 * Math.cos(TAU * 2 * (p - 0.1)) * (0.5 + 0.5 * s);
      lean = 0.1 + 0.14 * s;
      // The free arm swings against the near leg; the lantern arm holds the
      // lamp out a little and swings less.
      armB = [-0.85 * Math.cos(TAU * p) * (0.5 + 0.5 * s) + 0.1, 0.55 + 0.35 * s];
      armA = [0.28 + 0.18 * Math.cos(TAU * p), 0.75];
      headNod = 0.04 * Math.sin(TAU * 2 * p);
      set = 'run';
      index = Math.floor(((p % 1) + 1) % 1 * BUTCH_FRAME_SETS.run) % BUTCH_FRAME_SETS.run;
      break;
    }
    case 'jump': {
      const apex = Math.abs(a.vy) < 160;
      legA = apex ? [1.05, 1.55] : [0.92, 1.35];
      legB = apex ? [-0.2, 1.1] : [-0.42, 0.45];
      armB = [-1.1, 0.5];
      armA = [0.55, 0.9];
      lean = 0.12;
      hip = apex ? -2 : 0;
      set = apex ? 'apex' : 'rise';
      index = apex ? 0 : a.airMs < 120 ? 0 : 1;
      break;
    }
    case 'fall': {
      legA = [0.42, 0.55];
      legB = [-0.12, 0.85];
      armB = [-1.6 + Math.sin(t * 9) * 0.08, 0.35];
      armA = [0.95, 0.55];
      lean = 0.0;
      set = 'fall';
      index = a.airMs > 420 ? 1 : 0;
      break;
    }
    case 'float': {
      legA = [0.25 + Math.sin(t * 3) * 0.1, 0.4];
      legB = [-0.15 + Math.sin(t * 3 + 1) * 0.1, 0.55];
      armB = [-1.9, 0.25];
      armA = [1.55, 0.35];
      lean = -0.02;
      set = 'float';
      index = Math.floor(t * 4) % 2;
      break;
    }
    case 'land': {
      const d = a.landDepth;
      legA = [0.55 + 0.2 * d, 1.25 + 0.45 * d];
      legB = [-0.1, 1.05 + 0.4 * d];
      armB = [0.35, 0.9];
      armA = [0.6, 0.9];
      lean = 0.2 + 0.1 * d;
      hip = (9 + 9 * d) * a.land;
      set = 'land';
      index = Math.min(2, Math.floor((1 - a.land) * 3));
      break;
    }
    default: {
      // Idle: breathing, the lantern settling, now and then a look along
      // the roofs and a shift of weight.
      const breathe = Math.sin(t * 1.9);
      const shift = Math.sin(t * 0.45) > 0.85 ? 1 : 0;
      legA = [0.12 + 0.03 * shift, 0.08];
      legB = [-0.1, 0.1 + 0.08 * shift];
      armB = [-0.06 + 0.03 * breathe, 0.22];
      armA = [0.36, 0.95];
      lean = 0.02;
      hip = 0.6 * breathe;
      headNod = Math.sin(t * 0.45) > 0.85 ? -0.06 : 0.02 * breathe;
      set = 'idle';
      index = Math.floor(((t * 4) % BUTCH_FRAME_SETS.idle));
      break;
    }
  }
  // The crouch before a jump overrides the legs for its few frames.
  if (a.antic > 0) {
    const k = a.antic;
    legA = [legA[0] * (1 - k) + 0.6 * k, legA[1] * (1 - k) + 1.35 * k];
    legB = [legB[0] * (1 - k) - 0.15 * k, legB[1] * (1 - k) + 1.2 * k];
    hip += 11 * k;
    lean += 0.18 * k;
    set = 'crouch';
    index = 0;
  }
  // A turn: narrower for a beat.
  const turnSx = 1 - 0.22 * Math.sin(Math.PI * a.turn);
  return {
    pose: a.pose,
    ground: ['idle', 'run', 'land', 'talk', 'look'].includes(a.pose) || a.antic > 0,
    legA,
    legB,
    armA,
    armB,
    lean,
    hip,
    headNod,
    squash: a.squash,
    turnSx,
    coat: a.coat,
    lamp: a.lamp,
    run: a.pose === 'run' ? a.phase : 0,
    t,
    speed: s,
    sprite: { set, index },
  };
}

// ---- the vector renderer ----------------------------------------------------

function limb(ax, ay, l1, a1, l2, a2) {
  const kx = ax + Math.sin(a1) * l1;
  const ky = ay + Math.cos(a1) * l1;
  const fx = kx + Math.sin(a1 + a2) * l2;
  const fy = ky + Math.cos(a1 + a2) * l2;
  return { kx, ky, fx, fy };
}

// A tapered limb segment as a quad (w0 at the start, w1 at the end).
function taper(x0, y0, x1, y1, w0, w1) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  return [
    [x0 + nx * w0 / 2, y0 + ny * w0 / 2],
    [x1 + nx * w1 / 2, y1 + ny * w1 / 2],
    [x1 - nx * w1 / 2, y1 - ny * w1 / 2],
    [x0 - nx * w0 / 2, y0 - ny * w0 / 2],
  ];
}

// The rig's joints, in the figure's local space (feet at 0, facing right).
export function butchJoints(frame) {
  const hipY = RIG.hipY + frame.hip;
  const lean = frame.lean;
  const hip = [0, hipY];
  const shoulder = [Math.sin(lean) * RIG.torso, hipY - Math.cos(lean) * RIG.torso];
  const neck = [shoulder[0] + Math.sin(lean) * 4, shoulder[1] - 4];
  const head = [neck[0] + 2 + Math.sin(lean + frame.headNod) * 6, neck[1] - 9.5];
  // Legs: the knee bends the shin back; the near leg (A) is in front.
  const LA = limb(hip[0] + 1, hip[1], RIG.thigh, frame.legA[0], RIG.shin, -Math.abs(frame.legA[1]));
  const LB = limb(hip[0] - 1, hip[1], RIG.thigh, frame.legB[0], RIG.shin, -Math.abs(frame.legB[1]));
  // Arms: the elbow bends the forearm forward. A holds the lantern.
  const sh = [shoulder[0], shoulder[1] + 3];
  const AA = limb(sh[0] + 2, sh[1], RIG.upperArm, frame.armA[0] + lean, RIG.foreArm, Math.abs(frame.armA[1]));
  const AB = limb(sh[0] - 2, sh[1], RIG.upperArm, frame.armB[0] + lean, RIG.foreArm, Math.abs(frame.armB[1]));
  const joints = { hip, shoulder, neck, head, LA, LB, AA, AB };
  // On the ground the lower boot stands exactly on the roof: the body rides
  // on its legs (the run's bob comes out of the stride), no foot sinks in.
  if (frame.ground) {
    const dy = -(Math.max(LA.fy, LB.fy) + 0.5);
    for (const p of [hip, shoulder, neck, head]) p[1] += dy;
    for (const l of [LA, LB, AA, AB]) { l.ky += dy; l.fy += dy; }
  }
  return joints;
}

// Where the lantern hangs for a frame, in the figure's local space: the bail
// from the leading hand, swung by frame.lamp. A painted frame set can use it
// as-is (the lantern is drawn by the renderer either way).
export function butchLampAt(frame) {
  const j = butchJoints(frame);
  const bail = 9;
  return { hand: [j.AA.fx, j.AA.fy], x: j.AA.fx + Math.sin(frame.lamp) * bail, y: j.AA.fy + Math.cos(frame.lamp) * bail };
}

/**
 * Draw Butch into `g` (not cleared). at: { x, y (feet, world), facing,
 * alpha, rim (0..1), lampLit (bool), silhouette (bool) }. Returns the
 * lantern's light point in world space.
 */
export function drawButch(g, frame, { x, y, facing = 1, alpha = 1, rim = 0.6, lampLit = true, silhouette = false, look = BUTCH_LOOK } = {}) {
  const scale = look.height / 118;
  const f = facing >= 0 ? 1 : -1;
  const sq = frame.squash;
  const sx = (1 + (1 - sq) * 0.75) * frame.turnSx;
  const X = (lx) => x + lx * f * scale * sx;
  const Y = (ly) => y + ly * scale * sq;
  const P = (pts, ox = 0, oy = 0) => pts.map(([px, py]) => ({ x: X(px) + ox, y: Y(py) + oy }));
  const j = butchJoints(frame);
  const { hip, shoulder, neck, head, LA, LB, AA, AB } = j;
  const hipY = hip[1];

  // ---- the greatcoat's outline ----
  // Hem at mid-shin; the back panel (tail) swings on the coat spring about
  // the waist, the front panel follows the leading knee.
  // Mid-shin standing; it rides up a little with the stride.
  const hemY = Math.min(-7, hipY + 39 - 4 * frame.speed);
  const sway = frame.coat;
  const rot = ([px, py], k) => {
    const ang = sway * k;
    const dx = px;
    const dy = py - hipY;
    return [dx * Math.cos(ang) - dy * Math.sin(ang), hipY + dx * Math.sin(ang) + dy * Math.cos(ang)];
  };
  const flutter = Math.sin(frame.t * 17 + 1.3) * 1.6 * frame.speed;
  const tailBack = rot([-14 - frame.speed * 3, hemY + 1], 1.0);
  const hem = [
    [tailBack[0] - 2, tailBack[1] + flutter],
    rot([-8, hemY + 2], 0.8),
    rot([-1, hemY + 1.5], 0.55),
    rot([6, hemY + 0.5], 0.3),
  ];
  // The front edge rides on the leading thigh (A, or B when it is ahead).
  const leadKnee = LA.kx > LB.kx ? LA : LB;
  const frontX = Math.max(11, leadKnee.kx + 4.5);
  const frontY = Math.min(hemY - 1, leadKnee.ky + 14);
  hem.push([frontX, frontY]);
  const sh = shoulder;
  const coatPts = [
    [sh[0] - 7, sh[1] - 4],          // collar, back
    [sh[0] - 12.5, sh[1] + 2],       // shoulder, back
    [hip[0] - 11, hipY - 2],         // the back at the waist
    ...hem,
    [hip[0] + 11.5, hipY + 3],       // front at the waist
    [sh[0] + 11, sh[1] + 14],        // chest
    [sh[0] + 9, sh[1] + 1],          // shoulder, front
    [sh[0] + 4, sh[1] - 5],          // collar, front
  ];

  const colors = silhouette
    ? { coat: 0x0b0c10, coatShade: 0x08090c, coatEdge: 0x0b0c10, lining: 0x060709, trousers: 0x08090c, boots: 0x050506, skin: 0x0d0c0c, skinShade: 0x0b0a0a, hair: 0x060606, cap: 0x09090c, capBand: 0x2a2418, visor: 0x050506, buttons: 0x2a2418 }
    : look;

  // One pass of every shape: `c(name)` gives its colour (the rim pass paints
  // them all in the rim colour, offset toward the sky).
  const pass = (c, ox, oy, a) => {
    const fill = (name, pts) => g.fillStyle(c(name), a).fillPoints(P(pts, ox, oy), true);
    const disc = (name, px, py, r) => g.fillStyle(c(name), a).fillCircle(X(px) + ox, Y(py) + oy, r * scale);
    // Back leg and boot.
    fill('trousersBack', taper(hip[0] - 1, hipY, LB.kx, LB.ky, 9.5, 8));
    fill('trousersBack', taper(LB.kx, LB.ky, LB.fx, LB.fy, 8, 6.5));
    fill('boots', [[LB.fx - 4, LB.fy - 4], [LB.fx + 9, LB.fy - 3], [LB.fx + 10, LB.fy + 0.5], [LB.fx - 4.5, LB.fy + 0.5]]);
    // Back arm (behind the coat).
    fill('coatShade', taper(sh[0] - 2, sh[1] + 3, AB.kx, AB.ky, 8.5, 7));
    fill('coatShade', taper(AB.kx, AB.ky, AB.fx, AB.fy, 7, 6));
    disc('skinShade', AB.fx + Math.sin(frame.armB[0]) * 1.5, AB.fy + 1, 3.2);
    // Near leg (its shin shows below the coat, its thigh inside it).
    fill('trousers', taper(hip[0] + 1, hipY, LA.kx, LA.ky, 10, 8.5));
    fill('trousers', taper(LA.kx, LA.ky, LA.fx, LA.fy, 8.5, 7));
    fill('boots', [[LA.fx - 4.5, LA.fy - 4.5], [LA.fx + 10, LA.fy - 3.5], [LA.fx + 11, LA.fy + 0.5], [LA.fx - 5, LA.fy + 0.5]]);
    // The coat.
    fill('coat', coatPts);
    // Its shadowed back half and the lining showing at the open front.
    fill('coatShade', [coatPts[0], coatPts[1], coatPts[2], hem[0], hem[1], [hip[0] - 3, hipY + 4], [sh[0] - 3, sh[1] + 6]]);
    fill('lining', [[hip[0] + 8, hipY + 6], hem[4], hem[3], [hip[0] + 5, hipY + 8]]);
    // Half-belt at the back.
    fill('coatEdge', [[hip[0] - 11.5, hipY - 5], [hip[0] - 3, hipY - 5], [hip[0] - 3, hipY - 1.5], [hip[0] - 11.2, hipY - 1.5]]);
    // Head: neck in the collar, face, hair under the cap.
    disc('skin', head[0], head[1], RIG.headR);
    fill('skinShade', [[head[0] - 9, head[1] - 1], [head[0] - 2, head[1] + 2], [head[0] - 3, head[1] + 9], [head[0] - 9, head[1] + 4]]);
    fill('hair', [[head[0] - 10, head[1] - 5], [head[0] - 3, head[1] - 4], [head[0] - 6, head[1] + 4], [head[0] - 10.5, head[1] + 2]]);
    // Nose and jaw: the profile says which way he faces.
    fill('skin', [[head[0] + 8, head[1] - 2], [head[0] + 12.5, head[1] + 2.5], [head[0] + 8.5, head[1] + 3.5]]);
    fill('skinShade', [[head[0] + 1, head[1] + 7], [head[0] + 8, head[1] + 5.5], [head[0] + 6, head[1] + 9.5], [head[0], head[1] + 9.5]]);
    // Collar up round the jaw.
    fill('coat', [[sh[0] - 8, sh[1] - 3], [neck[0] - 7, neck[1] - 7], [neck[0] + 1, neck[1] - 3], [sh[0] + 5, sh[1] - 4]]);
    // The peaked railway cap: flat crown, brass band, black visor forward.
    const cy = head[1] - 6.5;
    fill('cap', [[head[0] - 11, cy - 1], [head[0] - 13.5, cy - 8.5], [head[0] + 11, cy - 8], [head[0] + 10, cy - 1]]);
    fill('capBand', [[head[0] - 10.6, cy - 3.2], [head[0] + 10, cy - 3.2], [head[0] + 10, cy - 0.6], [head[0] - 10.6, cy - 0.6]]);
    fill('visor', [[head[0] + 6, cy - 1.2], [head[0] + 19, cy + 1.2], [head[0] + 18, cy + 3], [head[0] + 4, cy + 1.4]]);
    // Front arm (the lantern arm), over the coat.
    fill('coat', taper(sh[0] + 2, sh[1] + 3, AA.kx, AA.ky, 9, 7.5));
    fill('coat', taper(AA.kx, AA.ky, AA.fx, AA.fy, 7.5, 6.5));
    fill('coatEdge', taper(AA.kx + (AA.fx - AA.kx) * 0.8, AA.ky + (AA.fy - AA.ky) * 0.8, AA.fx, AA.fy, 7.2, 7.2));
    disc('skin', AA.fx, AA.fy + 0.5, 3.4);
  };

  // 1. The cold rim: the whole silhouette, nudged toward the sky (up and
  //    back), so his back edge and cap read against the dark roofs.
  const rimA = rim * alpha * (silhouette ? 0.7 : 0.5);
  if (rimA > 0.01) {
    const back = -f * 1.5 * scale;
    pass(() => look.rimCold, back, -1.4 * scale, rimA);
  }
  // 2. The figure.
  const col = (name) => colors[name] ?? (name === 'trousersBack' ? (silhouette ? colors.trousers : 0x0d1017) : colors.coat);
  pass(col, 0, 0, alpha);
  // Coat details: double-breasted buttons and the seam of the front edge.
  if (!silhouette) {
    for (let i = 0; i < 3; i += 1) {
      const by = sh[1] + 8 + i * 9;
      const bx = sh[0] + 6 + (hip[0] - sh[0]) * (i / 3) + 1;
      g.fillStyle(look.buttons, alpha * 0.9).fillCircle(X(bx), Y(by), 1.25 * scale);
      g.fillStyle(look.buttons, alpha * 0.9).fillCircle(X(bx - 5), Y(by), 1.25 * scale);
    }
    g.lineStyle(1.2 * scale, look.lining, alpha * 0.8);
    g.beginPath();
    g.moveTo(X(sh[0] + 9), Y(sh[1] + 2));
    g.lineTo(X(hip[0] + 10), Y(hipY + 3));
    g.lineTo(X(hem[4][0]), Y(hem[4][1]));
    g.strokePath();
  }

  // ---- the lantern ----
  const L = butchLampAt(frame);
  const hx = L.hand[0];
  const hy = L.hand[1];
  const swing = frame.lamp;
  const lx = L.x;
  const ly = L.y;
  const c = Math.cos(swing);
  const s = Math.sin(swing);
  // Local lantern box points rotated with the bail.
  const lp = (px, py) => ({ x: X(lx + px * c + py * s), y: Y(ly - px * s + py * c) });
  g.lineStyle(1.3 * scale, look.lampFrame, alpha).lineBetween(X(hx), Y(hy), X(lx), Y(ly));
  g.fillStyle(look.lampFrame, alpha).fillPoints([lp(-4.5, 0), lp(4.5, 0), lp(5.5, 3), lp(-5.5, 3)], true);
  const lit = lampLit && !silhouette;
  g.fillStyle(lit ? look.lampGlass : 0x3a2a14, alpha).fillPoints([lp(-4.2, 3), lp(4.2, 3), lp(4.2, 13), lp(-4.2, 13)], true);
  if (lit) g.fillStyle(look.lampCore, alpha * 0.9).fillPoints([lp(-1.6, 5.5), lp(1.6, 5.5), lp(1.4, 11), lp(-1.4, 11)], true);
  g.lineStyle(1.1 * scale, look.lampFrame, alpha);
  const b0 = lp(0, 3);
  const b1 = lp(0, 13);
  g.lineBetween(b0.x, b0.y, b1.x, b1.y);
  g.fillStyle(look.lampFrame, alpha).fillPoints([lp(-5.5, 13), lp(5.5, 13), lp(4.5, 16), lp(-4.5, 16)], true);
  // The lantern's warm light on the coat beside it.
  if (lit) {
    g.lineStyle(1.6 * scale, look.rimWarm, alpha * 0.55);
    g.beginPath();
    g.moveTo(X(sh[0] + 11), Y(sh[1] + 14));
    g.lineTo(X(hip[0] + 11.5), Y(hipY + 3));
    g.lineTo(X(hem[4][0]), Y(hem[4][1]));
    g.strokePath();
  }
  const at = lp(0, 8);
  return { x: at.x, y: at.y };
}
