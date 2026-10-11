// Chapter 3 · the opening choreography (round 6, owner note G5: "at the very
// start of Chapter 3 the characters' entrance animation is buggy").
//
// Pure: no THREE, no DOM. Points are { x, z } on the ground; yaw follows the
// runtime's convention (rotation.y = atan2(dx, dz), 0 faces +z).
//
// What was wrong at the start (frame-stepped captures, r6-ch3a):
//   * Lev covered 6.3 m in a fixed 1.9 s ease (peak ~5 m/s) on a walk clip
//     played up to 2.8× (feet skating), toward a point computed once from
//     where Butch stood when the train left: if Butch had walked during the
//     departure (allowed since alpha round 1), Lev stopped metres away. A
//     click during it skipped the walk, so Lev teleported. He finished
//     directly behind Butch in screen space and snapped to idle (no
//     crossfade) while still moving.
//   * Lev waited at the top edge of the frame in the scanner arch's shadow,
//     so "the man on the platform" walked in from off screen.
//   * Every scripted walk set Lev's facing to the whole walk's heading on its
//     first frame (a 126° snap before the walk to the oil line), Butch never
//     turned to the man talking to him, and Butch's own heading snapped on
//     every click.
//   * The walk to the oil line was 20 m in a 4 s ease: 7.6 m/s on a walk
//     clip (clamped at 3.4×), a skating sprint.
//   * The woman in the rose scarf blinked into existence mid-street 0.6 s
//     into the departure and blinked out in the open square; her first steps
//     played at 3.4× (her host jumped from its parked spot), and had her rig
//     not streamed in yet she would have been the capsule placeholder.
// The helpers below give each walker a speed that accelerates and settles,
// a turn rate, a stand-off beside Butch that reads side by side from the
// fixed camera, and a route for the glimpse that starts and ends hidden.

export const LEV_ENTRANCE = Object.freeze({
  // m/s: the walk clip's own pace is 1.75 (Chapter3AnimatedCharacters),
  // the jog's 3.4. Lev walks over unless Butch has wandered off.
  walkSpeed: 1.8,
  jogSpeed: 3.4,
  jogBeyond: 9,
  accel: 2.4,
  decel: 1.8,
  // Lev stops this far beside Butch, along the camera's right axis, so the
  // two never overlap on screen.
  standOff: 1.7,
  // A walker that keeps walking is called to a halt this close.
  callOut: 2.4,
  turnRate: 6.5,
  // Lev's walk to the oil line. Round 12 (George: Butch walks too fast;
  // the people who walk with him match): Butch's own walk pace, 1.9 m/s
  // (EchoCity3DPreview WALK_SPEED), so the two set off together (it was a
  // brisk 2.3 beside Butch's 5.4).
  guideSpeed: 1.9,
  // Round 12 (George: "一开始是应该那个人走到前面必须聊天的", at the start
  // the man should walk up in front of him and they must talk): Lev stops
  // this far from Butch, face to face, side on to the camera (besideTarget
  // along the camera's right axis), and the arrival's conversation opens.
  faceToFace: 1.45,
  // He gives up on a clear walk after this long and stands there (a blocked
  // route must never hold the opening).
  meetWithin: 7,
});

// Round 12 (George: "有时候我不在那个位置跟人说话它就不会正对着我", when he
// talks to someone from another spot they do not turn to face him): whoever
// Butch talks to turns to him at a turn rate (rad/s, turnToward), from
// whichever side he stands, and he turns to them; people at a post (Toma at
// the ministry door, Petar at the cut, Hana at the desk) turn back to it
// afterwards. 180° takes about 0.7 s for them, 0.5 s for Butch.
export const CONVERSATION_TURN = Object.freeze({
  npcRate: 5,
  butchRate: 7,
  // a speaker this far from Butch is not in the conversation (a voice from
  // the platform, Lev calling from across the square)
  reach: 7,
  // within this of the target yaw the turn is done (rad)
  settle: 0.01,
});

/**
 * The yaw each of a conversation's people turns to: every NPC toward Butch,
 * Butch toward `faceOf` (the person he talks to, or null to keep his own).
 * Points are { x, z }; returns { butch, npcs: [yaw] }.
 */
export function conversationYaws({ butch, npcs = [], faceOf = null }) {
  return {
    butch: faceOf ? yawToward(butch, faceOf) : null,
    npcs: npcs.map((npc) => yawToward(npc, butch)),
  };
}

// The Mara ahead's glimpse as the train pulls out: she steps out from under
// the station roof (hidden at first), crosses the platform paving and turns
// north for the boulevard, leaving the top of the frame. Speeds in m/s.
export const MARA_GLIMPSE = Object.freeze({
  delay: 0.6,
  speed: 2.0,
  route: Object.freeze([
    Object.freeze([-11.3, 0.5, 30.4]),
    Object.freeze([-6.9, 0.5, 25.6]),
    Object.freeze([-5.5, 0.5, 16.0]),
  ]),
  turnRate: 5,
});

// Butch's own turn toward his walk heading (rad/s scale of an exponential
// approach: 180° in about a quarter second).
export const PLAYER_TURN_RATE = 16;

export function wrapAngle(angle) {
  let a = angle % (Math.PI * 2);
  if (a > Math.PI) a -= Math.PI * 2;
  if (a < -Math.PI) a += Math.PI * 2;
  return a;
}

export function yawToward(from, to) {
  return Math.atan2(to.x - from.x, to.z - from.z);
}

// Exponential approach to `target` (shortest way round).
export function dampYaw(current, target, rate, dt) {
  const delta = wrapAngle(target - current);
  if (!(dt > 0)) return current;
  return wrapAngle(current + delta * (1 - Math.exp(-rate * dt)));
}

// A turn at most `maxRate` rad/s, easing over the last part.
export function turnToward(current, target, maxRate, dt) {
  const delta = wrapAngle(target - current);
  const eased = delta * (1 - Math.exp(-maxRate * 1.6 * dt));
  const limit = maxRate * dt;
  return wrapAngle(current + Math.max(-limit, Math.min(limit, eased)));
}

// The next speed of a walker `remaining` metres from where it stops:
// accelerate toward `cruise`, never faster than it can still settle.
export function approachSpeed(speed, remaining, { cruise, accel, decel, dt }) {
  const up = Math.min(cruise, speed + accel * dt);
  const settle = Math.sqrt(Math.max(0, 2 * decel * Math.max(0, remaining)));
  return Math.max(0, Math.min(up, settle));
}

// Where Lev stops beside Butch: `standOff` along the camera's right axis,
// on the side Lev comes from; the other side if that one is not walkable.
export function besideTarget(butch, from, cameraRight, { standOff = LEV_ENTRANCE.standOff, walkable = () => true } = {}) {
  const length = Math.hypot(cameraRight.x, cameraRight.z) || 1;
  const rx = cameraRight.x / length;
  const rz = cameraRight.z / length;
  const sideOf = (sign) => ({ x: butch.x + rx * standOff * sign, z: butch.z + rz * standOff * sign, side: sign });
  const fromSide = ((from.x - butch.x) * rx + (from.z - butch.z) * rz) >= 0 ? 1 : -1;
  const preferred = sideOf(fromSide);
  if (walkable(preferred.x, preferred.z)) return preferred;
  const other = sideOf(-fromSide);
  return walkable(other.x, other.z) ? other : preferred;
}

// A point `distance` metres along a polyline, with the heading of its
// segment and whether the end was reached.
export function pointAlongPolyline(points, distance) {
  if (!points.length) return { x: 0, z: 0, heading: 0, done: true };
  let left = Math.max(0, distance);
  for (let index = 0; index < points.length - 1; index += 1) {
    const a = points[index];
    const b = points[index + 1];
    const ax = a.x ?? a[0];
    const az = a.z ?? a[2];
    const bx = b.x ?? b[0];
    const bz = b.z ?? b[2];
    const length = Math.hypot(bx - ax, bz - az);
    const heading = Math.atan2(bx - ax, bz - az);
    if (left <= length || index === points.length - 2) {
      const t = length > 0 ? Math.min(1, left / length) : 1;
      return { x: ax + (bx - ax) * t, z: az + (bz - az) * t, heading, done: index === points.length - 2 && left >= length };
    }
    left -= length;
  }
  const last = points[points.length - 1];
  return { x: last.x ?? last[0], z: last.z ?? last[2], heading: 0, done: true };
}

export function polylineLength(points) {
  let total = 0;
  for (let index = 0; index < points.length - 1; index += 1) {
    const a = points[index];
    const b = points[index + 1];
    total += Math.hypot((b.x ?? b[0]) - (a.x ?? a[0]), (b.z ?? b[2]) - (a.z ?? a[2]));
  }
  return total;
}

// The gait a walker's speed reads as (the rig's clips).
export function gaitForSpeed(speed) {
  return speed > 2.7 ? 'jog' : 'walk';
}
