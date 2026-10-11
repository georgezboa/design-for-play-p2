// Chapter 3 · the arrival (round 11; George: "第三章任务一开始的站位不是很好
// 一直卡在一个地方 你要做出来那种正在下车 他便播报 下车动画结束之后就可以随意移动了":
// Butch's start spot was poor and he stood frozen in one place; make it a
// getting-off-the-train beat with the announcement playing, and let the
// player move freely once the alighting animation ends).
//
// Before: Butch stood by the post box while four captions (the conductor's
// call, then his own two lines) and the claim card all held him, then Lev's
// five lines held him again.
//
// Now: the night service's last carriage (the doorless carriage the finale
// boards, chapter3SceneBuilders makeFinalTrainDoor) stands at the platform
// with its end doorway toward the camera. Butch stands in the lit doorway,
// steps down onto the track bed and walks out to the open paving behind the
// carriage (about four seconds); the station announcement plays as he does.
// When he is down, control is his. Every line of the opening after that
// (the rest of the announcement, his own two lines with the claim card in
// his hand, Lev's introduction) is walk-and-talk: captions that never take
// the input, while Lev comes over and keeps beside him.
//
// Round 12 (George: "一开始是应该那个人走到前面必须聊天的", at the start that man
// should walk up in front of Butch and they must talk): the step down and the
// announcement over it stay as they were, but the opening is a conversation
// again, not walk-and-talk. Once Butch is on the paving he stays there (the
// runtime's arrival hold): the train pulls out, Lev walks over and stops in
// front of him, face to face (chapter3Entrance LEV_ENTRANCE.faceToFace), the
// two turn to each other, and when the announcement has finished the rest of
// the opening is one conversation the player clicks through (CONTINUE · E):
// the conductor's call-back as the train leaves, Butch's two lines with the
// claim card in his hand, then Lev's introduction. The oil line is the task
// when it ends. Before (round 11) Lev talked beside a Butch who was free to
// walk off, and the lines ran on their own.
//
// Pure: no THREE, no DOM. Points are { x, z } on the ground; yaw follows the
// runtime's convention (rotation.y = atan2(dx, dz), 0 faces +z).

import { ARRIVAL_DIALOGUE, LEV_INTRO_DIALOGUE, OPENING_POSITIONS } from './chapter3OpeningContent.js';

/** The carriage group (makeFinalTrainDoor): origin on the rail centreline, turned 55°. */
export const ARRIVAL_CARRIAGE = Object.freeze({
  origin: Object.freeze([-13.7, 34.0]),
  rotationY: (55 * Math.PI) / 180,
  // its shell runs ±3.96 m along the rails; the end doorway is at +z
  endZ: 3.96,
});

export const ALIGHTING = Object.freeze({
  // Carriage-local points (x across the rails, z along them).
  // just inside the end doorway, where the camera sees him in its frame
  doorway: Object.freeze([0, 3.62]),
  threshold: Object.freeze([0, 4.05]),
  landing: Object.freeze([0.05, 4.65]),
  // The station forecourt, a few steps from the carriage end: in the open,
  // clear of the station block and the post box, with the platform, the
  // departing train and the man waiting on the paving in one frame (the
  // chapter's start).
  standAt: Object.freeze([OPENING_POSITIONS.playerStart[0], OPENING_POSITIONS.playerStart[2]]),
  // The carriage floor over the track bed (m): the step down.
  floorLift: 0.48,
  // He stands a moment in the doorway, looking out.
  pause: 0.55,
  // m/s: the walk clip's own pace is 1.75; a careful step, then a walk out.
  // Round 12: the walk out is a little slower (2.6 -> 2.1), with Butch's new
  // walk (1.9); the whole step down still takes about four seconds.
  doorSpeed: 1.35,
  stepSpeed: 1.45,
  walkSpeed: 2.1,
  // the last metres ease to a stop
  settleMetres: 0.7,
});

/** World { x, z } of a carriage-local [x, z]. */
export function carriagePoint([lx, lz], carriage = ARRIVAL_CARRIAGE) {
  const [ox, oz] = carriage.origin;
  const c = Math.cos(carriage.rotationY);
  const s = Math.sin(carriage.rotationY);
  return { x: ox + lx * c + lz * s, z: oz - lx * s + lz * c };
}

/** Carriage-local [x, z] of a world { x, z }. */
export function carriageLocal({ x, z }, carriage = ARRIVAL_CARRIAGE) {
  const [ox, oz] = carriage.origin;
  const dx = x - ox;
  const dz = z - oz;
  const c = Math.cos(carriage.rotationY);
  const s = Math.sin(carriage.rotationY);
  return [dx * c - dz * s, dx * s + dz * c];
}

const distance = (a, b) => Math.hypot(b.x - a.x, b.z - a.z);
const smooth = (t) => {
  const k = Math.max(0, Math.min(1, t));
  return k * k * (3 - 2 * k);
};

/**
 * The alighting as timed segments: the pause in the doorway, the walk to the
 * threshold, the step down (the lift falls to 0) and the walk out.
 */
export function alightingPlan(spec = ALIGHTING) {
  const doorway = carriagePoint(spec.doorway);
  const threshold = carriagePoint(spec.threshold);
  const landing = carriagePoint(spec.landing);
  const stand = { x: spec.standAt[0], z: spec.standAt[1] };
  const segments = [];
  let at = 0;
  const add = (kind, from, to, speed) => {
    const length = distance(from, to);
    const seconds = speed ? length / speed : spec.pause;
    segments.push({ kind, from, to, length, start: at, seconds });
    at += seconds;
  };
  add('pause', doorway, doorway, 0);
  add('door', doorway, threshold, spec.doorSpeed);
  add('step', threshold, landing, spec.stepSpeed);
  // the walk out eases into the stop: a little longer than at full pace
  const walkLength = distance(landing, stand);
  const settle = Math.min(spec.settleMetres, walkLength);
  const walkSeconds = (walkLength - settle) / spec.walkSpeed + (2 * settle) / spec.walkSpeed;
  segments.push({ kind: 'walk', from: landing, to: stand, length: walkLength, start: at, seconds: walkSeconds, settle });
  at += walkSeconds;
  return { segments, duration: at, doorway, threshold, landing, stand };
}

const PLAN = alightingPlan();

/** Seconds from the doorway to the paving. */
export const ALIGHTING_SECONDS = PLAN.duration;

// Distance covered `t` seconds into a walk of `length` at `speed` whose last
// `settle` metres decelerate uniformly to rest.
function walkDistance(t, { length, seconds, settle }) {
  const cruise = length - settle;
  const speed = (cruise + 2 * settle) / seconds;
  const cruiseSeconds = cruise / speed;
  if (t <= cruiseSeconds) return t * speed;
  const tail = Math.min(t - cruiseSeconds, (2 * settle) / speed);
  const a = (speed * speed) / (2 * Math.max(1e-6, settle));
  return Math.min(length, cruise + speed * tail - 0.5 * a * tail * tail);
}

/**
 * Butch's pose `t` seconds into the alighting: where he stands, how far his
 * feet are above the track bed (`lift`), which way he walks (`heading`, null
 * while he stands), whether he is moving, and whether he is down.
 */
export function alightingPose(t, plan = PLAN, spec = ALIGHTING) {
  const time = Math.max(0, Number(t) || 0);
  const outward = Math.atan2(plan.threshold.x - plan.doorway.x, plan.threshold.z - plan.doorway.z);
  if (time >= plan.duration) {
    return { x: plan.stand.x, z: plan.stand.z, lift: 0, heading: null, facing: null, moving: false, done: true, segment: 'done' };
  }
  const segment = plan.segments.find((entry) => time < entry.start + entry.seconds) ?? plan.segments.at(-1);
  const local = time - segment.start;
  let along;
  if (segment.kind === 'pause') along = 0;
  else if (segment.kind === 'walk') along = walkDistance(local, segment);
  else along = Math.min(segment.length, (local / segment.seconds) * segment.length);
  const k = segment.length > 0 ? along / segment.length : 0;
  const x = segment.from.x + (segment.to.x - segment.from.x) * k;
  const z = segment.from.z + (segment.to.z - segment.from.z) * k;
  let lift = 0;
  if (segment.kind === 'pause' || segment.kind === 'door') lift = spec.floorLift;
  else if (segment.kind === 'step') lift = spec.floorLift * (1 - smooth(k));
  const heading = segment.kind === 'pause'
    ? null
    : Math.atan2(segment.to.x - segment.from.x, segment.to.z - segment.from.z);
  return {
    x,
    z,
    lift,
    heading,
    // in the doorway he already faces out
    facing: heading ?? outward,
    moving: segment.kind !== 'pause',
    done: false,
    segment: segment.kind,
  };
}

/**
 * Where the camera looks during the alighting: between the doorway and the
 * spot he walks to, so the carriage end, the step and the paving share the
 * frame, set `lift` metres further from the camera (CAMERA_HOME's ground
 * direction, `away`) so the action sits a little below the middle of the
 * screen, under the chapter title.
 */
export const ALIGHTING_FOCUS_LIFT = 1.7;
export function alightingFocus(plan = PLAN, { lift = ALIGHTING_FOCUS_LIFT, away = { x: -0.697, z: -0.717 } } = {}) {
  return {
    x: (plan.doorway.x + plan.stand.x) / 2 + away.x * lift,
    z: (plan.doorway.z + plan.stand.z) / 2 + away.z * lift,
  };
}

// ---------------------------------------------------------------------------
// walk-and-talk: the opening's captions, one after another, that never take
// the input (the dialogue controller's bark()).

/** Seconds a caption of `text` stays up: a comfortable reading pace. */
export function lineSeconds(text, { base = 1.4, perChar = 1 / 17, min = 2.8, max = 8 } = {}) {
  const length = String(text ?? '').length;
  return Math.max(min, Math.min(max, base + length * perChar));
}

/**
 * A queue of captions shown one at a time. Each entry is { line, at?, onShow? }:
 * `at` (seconds since the queue started) holds an entry back until then.
 * tick(dt, { free, speaking }) returns the entry to show now (or null):
 * `free` is false while a blocking conversation has the caption bar (the
 * queue waits), `speaking` is true while the current line's voice still
 * plays (its caption stays up until the voice ends).
 */
export function createLineQueue(entries, { gap = 0.35, hold = lineSeconds } = {}) {
  const queue = entries.map((entry) => ({ ...entry }));
  let index = 0;
  let clock = 0;
  let current = null;
  let shownFor = 0;
  let wait = 0;
  let done = queue.length === 0;
  return {
    tick(dt, { free = true, speaking = false } = {}) {
      const step = Math.max(0, Number(dt) || 0);
      clock += step;
      if (done) return null;
      if (current) {
        shownFor += step;
        if (shownFor < current.seconds || speaking) return null;
        current = null;
        wait = gap;
        if (index >= queue.length) { done = true; return null; }
      }
      wait -= step;
      if (wait > 0 || !free) return null;
      const next = queue[index];
      if (next.at !== undefined && clock < next.at) return null;
      index += 1;
      current = { ...next, seconds: hold(next.line?.text) };
      shownFor = 0;
      return current;
    },
    /** The caption on screen was taken by a conversation: move on when it ends. */
    interrupt() {
      if (!current) return;
      current = null;
      wait = gap;
      if (index >= queue.length) done = true;
    },
    get done() { return done; },
    get current() { return current; },
    get remaining() { return queue.length - index + (current ? 1 : 0); },
    get clock() { return clock; },
  };
}

// ---------------------------------------------------------------------------
// Round 12: the opening conversation.

/** The announcement, over the step down (a caption that takes no input). */
export const ARRIVAL_ANNOUNCEMENT = Object.freeze(ARRIVAL_DIALOGUE.slice(0, 1));

/**
 * Everything after it, as one conversation once Lev stands in front of
 * Butch: the call-back, Butch's two lines (the claim card in his hand), then
 * Lev's introduction.
 */
export const ARRIVAL_CONVERSATION = Object.freeze([...ARRIVAL_DIALOGUE.slice(1), ...LEV_INTRO_DIALOGUE]);

/** The line that brings the claim card out (Butch's first). */
export const ARRIVAL_CARD_OUT = ARRIVAL_CONVERSATION.findIndex((line) => line.speaker === 'BUTCH');

/** The line it goes away on: Butch's "Why?", once Lev has asked him to keep it out. */
export const ARRIVAL_CARD_AWAY = (ARRIVAL_DIALOGUE.length - ARRIVAL_ANNOUNCEMENT.length) + 1;

/**
 * Whether the arrival conversation opens now: Butch is down, the
 * announcement has finished, Lev stands in front of him (the runtime places
 * him there if his walk takes longer than LEV_ENTRANCE.meetWithin), it has
 * not opened yet, and nothing else holds the screen (`busy`).
 */
export function arrivalTalkDue({ landed = false, announcementDone = false, levArrived = false, opened = false, busy = false } = {}) {
  return landed && announcementDone && levArrived && !opened && !busy;
}
