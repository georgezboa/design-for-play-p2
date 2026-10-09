// The painted Chapter 1 figures as data and timing (round 7). No Phaser here:
// spriteRig.js turns what this decides into images. George's painted frames
// (public/assets/ch1-painted/sprites/, cut by scripts/ch1-art/sprites.py,
// described by spriteAtlas.js) replace the jointed figures of figures.js,
// which stay as the fallback when the frames fail to load.
//
// Units: a rig's local unit is one tile px at scale 1 (as before): Butch is
// 70 tall, the Conductor 110, Mara 66, the train 150 long. A frame px is
// `unit` local units; a frame's pivot is the feet (bottom centre of the
// figure); every frame of a character shares one figure scale.

import SPRITE_ATLAS from './spriteAtlas.js';

export const ATLAS = SPRITE_ATLAS;
export const SPRITE_KEY_PREFIX = 'nsv-paint-';

/**
 * Rig kinds with painted frames, and what each pose shows. `@walk` is the
 * character's walk cycle, played by distance walked. A pose not listed shows
 * the kind's `idle`. Poses the acts use today: sleep, sit, stand, idle, walk,
 * ticket (Butch); idle (the Conductor, with the gestures offer / rest);
 * idle, walk (Mara); the train has no poses.
 */
export const SPRITE_RIGS = Object.freeze({
  butch: Object.freeze({
    sheet: 'butch',
    idle: 'stand',
    poses: Object.freeze({
      idle: 'stand',
      stand: 'stand',
      walk: '@walk',
      sleep: 'sleep',
      sit: 'sit',
      // the same seat with the stool painted out, for a chair in the plate
      'sit-chair': 'sit-chair',
      ticket: 'ticket',
      lantern: 'lantern',
      reach: 'reach',
      receive: 'receive',
      carry: 'carry',
    }),
    // a carried thing with its own painted frames: [standing, walking]
    carry: Object.freeze({ case: Object.freeze(['carry', 'carry-walk']) }),
    gestures: Object.freeze({ receive: Object.freeze({ frame: 'receive', ms: 1300 }) }),
    // drawn over 'sit' once he has slept at the desk (see atDesk)
    desk: 'desk',
    glow: Object.freeze({ size: 30, alpha: 0.2, tint: 0xffc070 }),
    shadow: Object.freeze({ w: 30, h: 5, alpha: 0.32 }),
    breathe: Object.freeze({ amp: 0.0055, period: 3.1 }),
    // where an act's fx (written for the jointed figure) meant: [frame, anchor]
    legacyPoints: Object.freeze({
      '22,-63': Object.freeze(['ticket', 'ticket']), // act2 punchPop: the ticket held up
      '14,-40': Object.freeze(['receive', 'hand']), // act1 punchHandover: the open hand
      '8,-34': Object.freeze(['carry', 'case']), // act2 caseDrop: into his arms
    }),
  }),
  conductor: Object.freeze({
    sheet: 'conductor',
    // the lantern raised at the door; after the handover he lowers it
    idle: 'lantern',
    poses: Object.freeze({ idle: 'lantern', stand: 'lantern', lantern: 'lantern', offer: 'offer', walk: 'walk', rest: 'stand-empty' }),
    gestures: Object.freeze({ offer: Object.freeze({ frame: 'offer', hold: true }) }),
    glow: Object.freeze({ size: 62, alpha: 0.26, tint: 0xffb860 }),
    shadow: Object.freeze({ w: 52, h: 8, alpha: 0.34 }),
    breathe: Object.freeze({ amp: 0.0045, period: 3.9 }),
    legacyPoints: Object.freeze({ '30,-48': Object.freeze(['offer', 'punch']) }),
  }),
  mara: Object.freeze({
    sheet: 'mara',
    // never her face: a three-quarter back view at rest, side views walking
    idle: 'turn',
    poses: Object.freeze({ idle: 'turn', stand: 'turn', turn: 'turn', back: 'back', walk: '@walk' }),
    shadow: Object.freeze({ w: 26, h: 4.5, alpha: 0.3 }),
    breathe: Object.freeze({ amp: 0.005, period: 3.4 }),
  }),
  train: Object.freeze({ sheet: 'train', idle: 'lit', poses: Object.freeze({}), glow: Object.freeze({ size: 40, alpha: 0.35, tint: 0xffd890 }) }),
  trainDark: Object.freeze({ sheet: 'train', idle: 'dark', poses: Object.freeze({}) }),
});

/** Prop sprites drawn at a hand when something carried has no painted frame. */
export const PROP_SIZES = Object.freeze({ case: 22, tag: 7, key: 8, punch: 9, letter: 10, ember: 4.5 });

/** The flying punch of act1Fx (topSprite 'nsv-conductor-punch'): 3 texture px per tile px, as figures.js. */
export const PUNCH_TEXTURE = Object.freeze({ key: 'nsv-conductor-punch', w: 14, h: 10, res: 3 });

/** Crossfade between poses, and when a walk starts or stops (ms). */
export const FADE_MS = Object.freeze({ pose: 240, walk: 110 });

function sheetOf(kind) {
  const spec = SPRITE_RIGS[kind];
  if (!spec) return null;
  return spec.sheet === 'train' ? ATLAS.train : ATLAS.characters[spec.sheet];
}

/** Every frame name a kind can show (its own sheet's frames it maps to). */
export function framesOf(kind) {
  const spec = SPRITE_RIGS[kind];
  if (!spec) return [];
  const sheet = sheetOf(kind);
  const names = new Set([spec.idle]);
  Object.values(spec.poses).forEach((f) => { if (f !== '@walk') names.add(f); else (sheet.cycles?.walk?.frames ?? []).forEach((n) => names.add(n)); });
  Object.values(spec.carry ?? {}).forEach((pair) => pair.forEach((n) => names.add(n)));
  Object.values(spec.gestures ?? {}).forEach((g) => names.add(g.frame));
  if (spec.desk) names.add(spec.desk);
  if (kind === 'conductor') ['offer-empty', 'stand-empty'].forEach((n) => names.add(n));
  return [...names];
}

export function textureKey(kind, frame) {
  return `${SPRITE_KEY_PREFIX}${SPRITE_RIGS[kind].sheet}-${frame}`;
}

export function propKey(name) {
  return `${SPRITE_KEY_PREFIX}prop-${name}`;
}

function url(entry) {
  return `${ATLAS.urlBase}/${entry.file}${entry.v ? `?v=${entry.v}` : ''}`;
}

/** [{ key, url }] for a rig kind: its frames (and, for Butch and the Conductor, the props they can hold). */
export function spriteFiles(kind) {
  const spec = SPRITE_RIGS[kind];
  if (!spec) return [];
  const sheet = sheetOf(kind);
  const out = framesOf(kind).map((frame) => ({ key: textureKey(kind, frame), url: url(sheet.frames[frame]) }));
  const props = kind === 'butch' ? Object.keys(PROP_SIZES) : kind === 'conductor' ? ['punch'] : [];
  props.forEach((name) => out.push({ key: propKey(name), url: url(ATLAS.props[name]) }));
  return out;
}

/** Everything an act's actors need, deduplicated by key. */
export function spriteFilesForAct(act) {
  const out = new Map();
  Object.entries(act?.actors ?? {}).forEach(([id, def]) => {
    spriteFiles(def.rig ?? id).forEach((file) => out.set(file.key, file));
  });
  return [...out.values()];
}

/** A frame's anchor in local units, relative to the feet (facing right). */
export function anchorPoint(kind, frame, name) {
  const sheet = sheetOf(kind);
  const f = sheet?.frames[frame];
  const a = f?.anchors?.[name];
  if (!a) return null;
  return [(a[0] - f.pivot[0]) * sheet.unit, (a[1] - f.pivot[1]) * sheet.unit];
}

/** A frame's image geometry: origin (0..1) at the feet, and its scale (local units per frame px). */
export function frameGeometry(kind, frame) {
  const sheet = sheetOf(kind);
  const f = sheet.frames[frame];
  return { origin: [f.pivot[0] / f.w, f.pivot[1] / f.h], scale: sheet.unit, w: f.w * sheet.unit, h: f.h * sheet.unit };
}

/** The rig's height in tile px at scale 1 (the train: its rail-to-roof height; its length stays 150). */
export function rigHeight(kind) {
  const sheet = sheetOf(kind);
  if (SPRITE_RIGS[kind].sheet === 'train') {
    const f = sheet.frames[SPRITE_RIGS[kind].idle];
    return Math.round((f.pivot[1] - (ATLAS.pad ?? 0)) * sheet.unit * 10) / 10;
  }
  return sheet.rigHeight;
}

const smooth = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

/**
 * The frame choice and the small motions of one figure, advanced each tick.
 * `update(dt, { pose, moving, time, carrying, travelled })` where
 * `travelled` is the distance walked since the last tick in local units
 * (spriteRig measures it from the figure's movement on screen, so the
 * stride follows the walk at any pace or scale).
 */
export function createAnimator(kind) {
  const spec = SPRITE_RIGS[kind];
  const sheet = sheetOf(kind);
  if (!spec || !sheet) throw new Error(`no painted frames for rig kind ${kind}`);
  const cycle = sheet.cycles?.walk ?? null;
  const st = {
    frame: spec.idle,
    prev: null,
    fade: 1,
    fadeMs: FADE_MS.pose,
    phase: 0, // distance into the walk cycle, local units
    walking: false,
    gesture: null, // { frame, until }
    rest: null, // the Conductor's frame after the handover
    punchHidden: false,
    stagger: 0,
    wasCarrying: false,
    clock: 0,
    // Butch woken at his desk sits up at it: the sleep frame's desk (cut
    // out as the `desk` overlay) stays while he sits there
    atDesk: false,
    deskAlpha: 0,
  };

  function poseFrame(pose, moving, carrying) {
    if (pose === 'sleep') return spec.poses.sleep;
    const carried = carrying ? spec.carry?.[carrying] : null;
    if (carried) return moving ? carried[1] : carried[0];
    if (moving) return spec.poses.walk ?? spec.idle;
    // a walker held at an edge keeps the pose 'walk' but stands
    if (pose === 'walk' || pose == null) return st.rest ?? spec.idle;
    if (st.rest && (pose === 'idle' || pose === 'stand')) return st.rest;
    return spec.poses[pose] ?? spec.idle;
  }

  function cycleFrame() {
    const L = cycle.stride;
    const p = ((st.phase % L) + L) % L;
    const at = cycle.at;
    let i = at.length - 1;
    while (i > 0 && at[i] * L > p) i -= 1;
    const end = (i + 1 < at.length ? at[i + 1] : 1) * L;
    const mid = (at[i] * L + end) / 2;
    // held back within the frame (as the solver assumed): the planted foot
    // slides less, the body moves in small surges
    return { frame: cycle.frames[i], lock: -(cycle.lock ?? 0) * (p - mid) };
  }

  function setFrame(frame, ms) {
    if (frame === st.frame) return;
    st.prev = ms > 0 ? st.frame : null;
    st.frame = frame;
    st.fade = ms > 0 ? 0 : 1;
    st.fadeMs = ms;
  }

  const api = {
    kind,
    state: st,
    get frame() { return st.frame; },
    /** Gesture: Butch 'receive'; the Conductor 'offer' / 'rest'. */
    gesture(name, now = st.clock) {
      if (kind === 'conductor' && name === 'rest') {
        st.gesture = null;
        st.rest = st.punchHidden ? 'stand-empty' : null;
        return true;
      }
      const g = spec.gestures?.[name];
      if (!g) return false;
      st.gesture = { frame: g.frame, until: g.hold ? Infinity : now + g.ms };
      return true;
    },
    /** The Conductor lets go of the punch (act1Fx hides it as it flies). */
    hidePunch(hidden = true) {
      st.punchHidden = hidden;
      if (kind !== 'conductor') return;
      const swap = { offer: 'offer-empty', lantern: 'lantern', stand: 'stand-empty' };
      if (hidden && swap[st.frame] && swap[st.frame] !== st.frame) setFrame(swap[st.frame], 0);
    },
    update(dt, { pose = 'idle', moving = false, time = st.clock + dt, carrying = null, travelled = 0 } = {}) {
      st.clock = time;
      const t = time / 1000;
      const holding = Boolean(carrying && spec.carry?.[carrying]);
      if (holding && !st.wasCarrying) st.stagger = 1;
      st.wasCarrying = holding;
      st.stagger = Math.max(0, st.stagger - dt / 1400);
      if (st.gesture && time >= st.gesture.until) st.gesture = null;

      let want = st.gesture && !moving ? st.gesture.frame : poseFrame(pose, moving, carrying);
      if (kind === 'conductor' && st.punchHidden && want === 'offer') want = 'offer-empty';
      let lock = 0;
      let bob = 0;
      const startWalk = want === '@walk' && !st.walking;
      if (want === '@walk' && cycle) {
        if (startWalk) st.phase = 0; // every walk sets off from a contact frame
        st.phase += Math.max(0, travelled);
        const c = cycleFrame();
        lock = c.lock;
        want = c.frame;
      } else if (want === '@walk') {
        want = spec.idle;
      }
      const wasWalking = st.walking;
      st.walking = Boolean(cycle) && cycle.frames.includes(want) && moving;
      if (st.walking && wasWalking) setFrame(want, 0); // walk frames cut, never blend
      else setFrame(want, st.walking || wasWalking ? FADE_MS.walk : FADE_MS.pose);
      if (st.fade < 1) st.fade = Math.min(1, st.fade + dt / Math.max(1, st.fadeMs));

      // a frame held while walking with no cycle (the Conductor, a carried
      // case): the step's dip, in time with the distance walked
      if (moving && !st.walking && (spec.carry || kind === 'conductor')) {
        st.phase += Math.max(0, travelled);
        const step = (spec.carry ? 15 : 22);
        bob = -Math.abs(Math.sin((st.phase / step) * Math.PI)) * 0.9;
      }
      // the desk he slept at stays when he sits up at it (Butch)
      if (spec.desk) {
        const before = st.atDesk;
        if (st.frame === spec.poses.sleep) st.atDesk = true;
        else if (moving || carrying || pose !== 'sit') st.atDesk = false;
        const on = st.atDesk && st.frame === spec.poses.sit;
        if (on && !before) st.deskAlpha = 1; // the same desk, exactly over the sleep frame's own
        else st.deskAlpha = on ? 1 : Math.max(0, st.deskAlpha - dt / FADE_MS.pose);
      }
      const breathing = !moving && spec.breathe;
      const slow = st.frame === 'sleep' ? 1.7 : 1;
      const b = breathing ? Math.sin((t * Math.PI * 2) / (spec.breathe.period * slow)) : 0;
      const amp = breathing ? spec.breathe.amp * (st.frame === 'sleep' ? 1.6 : 1) : 0;
      const view = {
        frame: st.frame,
        prev: st.fade < 1 ? st.prev : null,
        fade: smooth(st.fade),
        x: lock,
        y: bob + st.stagger * 1.6 * Math.abs(Math.sin(st.stagger * 9)),
        rotation: st.stagger ? Math.sin(st.stagger * 16) * 0.035 * st.stagger : 0,
        scaleX: 1 - amp * 0.35 * b,
        scaleY: 1 + amp * b,
        glow: null,
      };
      view.overlay = spec.desk && st.deskAlpha > 0 ? { frame: spec.desk, alpha: st.deskAlpha } : null;
      if (spec.glow) {
        const lampOf = (frame) => anchorPoint(kind, frame, kind.startsWith('train') ? 'lamp' : 'glow')
          ?? (view.overlay && frame === st.frame ? anchorPoint(kind, spec.desk, 'glow') : null);
        const g = lampOf(st.frame);
        const gp = view.prev ? lampOf(view.prev) : null;
        const flicker = 1 + Math.sin(t * 13) * 0.06 + Math.sin(t * 3.1) * 0.08;
        if (g || gp) {
          const k = view.prev ? view.fade : 1;
          const a = g ?? gp;
          const b2 = gp ?? g;
          view.glow = {
            x: b2[0] + (a[0] - b2[0]) * k + lock,
            y: b2[1] + (a[1] - b2[1]) * k + view.y,
            alpha: spec.glow.alpha * flicker * (g && gp ? 1 : g ? k : 1 - k),
            size: spec.glow.size,
          };
        }
      }
      if (kind.startsWith('train')) {
        view.y = moving ? Math.sin(time / 60) * 0.35 : 0;
        view.scaleX = 1;
        view.scaleY = 1;
      }
      // something carried with no painted frame: its prop sprite at the hand
      view.prop = null;
      if (carrying && !holding && PROP_SIZES[carrying]) {
        const hand = anchorPoint(kind, st.frame, 'hand') ?? anchorPoint(kind, st.frame, 'glow') ?? [6, -30];
        view.prop = { name: carrying, x: hand[0] + lock, y: hand[1] + view.y, size: PROP_SIZES[carrying] };
      }
      return view;
    },
    /**
     * A point an fx asks for in the jointed figure's coordinates, moved onto
     * the painted frame it meant (e.g. the punch in the Conductor's hand).
     */
    mapPoint(lx, ly) {
      const hit = spec.legacyPoints?.[`${lx},${ly}`];
      if (!hit) return [lx, ly];
      return anchorPoint(kind, hit[0], hit[1]) ?? [lx, ly];
    },
  };
  return api;
}
