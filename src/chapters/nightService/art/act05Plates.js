// Act 0.5 · TWO WINDOWS on George's painted plates (round 7): the desk corner
// of the office and the corridor to the stores door, the key line (a brass
// rod with its carrier clip) and the lock up close, the door off its latch,
// open, and the stores through it. Positions come from art/ch1Plates.js
// (generated from the measured paintings).
//
// The puzzle, as painted: the office's key line runs along the wall at rail
// height and out of the desk's LEFT edge behind the shelf (WIRE_OUT); the
// door's line comes down from the ceiling at its RIGHT edge, high up
// (DOOR_WIRE_OUT). Zoomed out they never meet. Zoomed into both, the rod with
// its clip and the wire to the lock cross their facing edges at one height
// (WIRE_CLOSE): door left of the desk, both zoomed, and the carrier runs.

import { ANCHOR, PLATE, PROP, ZOOM } from './ch1Plates.js';
import { doorCrack, lampGlow, propImage } from './plateKit.js';

const DESK = ANCHOR['act05/desk'];
const DOOR = ANCHOR['act05/door-locked'];
const OPEN = ANCHOR['act05/door-open'];
const KEYS = ANCHOR['act05/keys'];
const LOCKUP = ANCHOR['act05/lock'];
const STORES_A = ANCHOR['act05/stores'];

export const PLATES05 = Object.freeze({
  desk: PLATE['act05/desk'].url,
  doorLocked: PLATE['act05/door-locked'].url,
  doorOpen: PLATE['act05/door-open'].url,
  keys: PLATE['act05/keys'].url,
  lock: PLATE['act05/lock'].url,
  stores: PLATE['act05/stores'].url,
});
export const PROPS05 = Object.freeze([PROP['props/key'].url, PROP['props/key-bow'].url]);

/** The corridor floor: the desk's right edge meets the stores door's left edge here. */
export const A05_FLOOR = DESK.floorRight;
/** The key line, wide: the office's (desk, left edge) and the door's (right edge, high up). */
export const WIRE_OUT = DESK.wireLeft;
export const DOOR_WIRE_OUT = DOOR.wireRight[1];
/** ... and in the two close-ups, where both cross their facing edges. */
export const WIRE_CLOSE = KEYS.wireLeft;

/** Zoom boxes (each close-up in its parent painting). */
export const KEY_ZOOM = ZOOM['act05/keys'];
export const LOCK_ZOOM = ZOOM['act05/lock'];
export const DOORWAY_ZOOM = ZOOM['act05/stores'];

/** Click boxes on the painted carrier clip (the key on it) and the lock. */
export const KEYS_HIT = Object.freeze([DESK.clip[0] - 0.018, DESK.clip[1] - 0.02, DESK.clip[2] + 0.036, DESK.clip[3] + 0.09]);
export const LOCK_HIT = Object.freeze([DOOR.lock[0] - 0.016, DOOR.lock[1] - 0.035, DOOR.lock[2] + 0.032, DOOR.lock[3] + 0.06]);
export const LOCK_AT = Object.freeze([DOOR.knob[0], (DOOR.knob[1] + DOOR.keyhole[1]) / 2]);
/** The door leaf (its latch side is the right, by the lock), and the stores' lamp through the open door. */
export const LEAF = Object.freeze([...DOOR.leaf]);
export const LEAF_EDGE = LEAF[0] + LEAF[2];
export const STORES_LAMP = Object.freeze([...OPEN.storesLamp]);
/** Where the desk bell rings in this painting (the brass box on the desk: the counter bell). */
export const DESK_RING = Object.freeze([...DESK.deskTop]);

/**
 * Where Butch walks: on the boards a step in front of the wall (the painted
 * floor line is where the wall meets the boards, and the link height).
 */
export const A05_WALK = Math.round((A05_FLOOR + 0.03) * 10000) / 10000;
/** Where Butch stands by his desk (Act 0.5 opens here), waits at the locked door, steps aside, comes home. */
export const BUTCH_AT_DESK = Object.freeze({ x: 0.4, y: A05_WALK });
export const STORES_WAIT_X = 0.695;
export const STORES_ASIDE_X = 0.52;
/** Butch in this corridor: 1.75 m beside the painted 2 m door leaf (rig height 70 tile px at scale 1). */
export const A05_BUTCH_SCALE = Math.round(((LEAF[3] * 414 * 1.75) / 2 / 70) * 100) / 100;

/** In the close-ups: where the key hangs from the clip, the lock's hook, keyhole and leaf edge. */
export const CLIP_HANG = Object.freeze([...KEYS.clipHang]);
export const HOOK = Object.freeze([...LOCKUP.hookEnd]);
export const KEYHOLE = Object.freeze([...LOCKUP.keyhole]);
export const LOCK_LEAF_EDGE = LOCKUP.leafEdge;
/** The key's length (fraction of the panel width): up close, and as it hangs in the wide desk view. */
export const KEY_LEN_CLOSE = 0.15;
export const KEY_LEN_WIDE = Math.round(((KEY_LEN_CLOSE * DESK.clip[2]) / KEYS.clip[2]) * 10000) / 10000;

// ---------------------------------------------------------------------------

/** The office key hanging by its bow (the prop, turned upright), with a slow sway. */
function hangingKey(ctx, [u, v], len, { hideWhen = () => false } = {}) {
  const key = propImage(ctx, PROP['props/key'], u * ctx.w, v * ctx.h, { width: len * ctx.w, origin: [0.05, 0.5], angle: Math.PI / 2 });
  if (!key) return null;
  const seed = Math.random() * 10;
  ctx.animate((time) => {
    key.setVisible(!hideWhen());
    key.setRotation(Math.PI / 2 + (ctx.reduceMotion() ? 0 : Math.sin(time / 900 + seed) * 0.035));
  });
  return key;
}

/** State desk `office`: the green lamp breathes; the office key hangs on the clip until it is sent. */
export function drawDeskPlate(ctx) {
  lampGlow(ctx, [DESK.lamp[0], DESK.lamp[1] + 0.012], 120, { alpha: 0.1, flicker: 0.05 });
  lampGlow(ctx, [DESK.lamp[0] + 0.02, DESK.lamp[1] + 0.07], 120, { alpha: 0.05, flicker: 0.04 });
  hangingKey(ctx, DESK.clipHang, KEY_LEN_WIDE, { hideWhen: () => ctx.flag('keySent') });
}

/** State desk `keys`: the rod and the clip up close; the key hangs there until the carrier takes it. */
export function drawKeysPlate(ctx) {
  hangingKey(ctx, CLIP_HANG, KEY_LEN_CLOSE, { hideWhen: () => ctx.flag('keyInFlight') || ctx.flag('keySent') });
  lampGlow(ctx, [0.05, 0.42], 260, { alpha: 0.05, flicker: 0.04 });
}

function sconces(ctx) {
  const [x0, y, w] = DOOR.sconces;
  [x0, x0 + w].forEach((x) => lampGlow(ctx, [x, y + 0.01], 46, { alpha: 0.05, flicker: 0.06, color: 0xffe2b0 }));
}

/** The lit crack down the latch side of the leaf, and the lamplight spilling from it. */
function crack(ctx) {
  const { w, h } = ctx;
  doorCrack(ctx, 'act05-crack', LEAF_EDGE * w, LEAF[1] * h + 4, A05_FLOOR * h - 2, { side: 1 });
  ctx.glow(LOCK_AT[0] * w, LOCK_AT[1] * h, 34, { color: 0xffd27a, alpha: 0.3, flicker: 0.05 });
}

/** The stores door, wide: `locked`, `unlocked` (off its latch: the crack lit) or `open`. */
export function drawDoorPlate(ctx, variant = 'locked') {
  sconces(ctx);
  if (variant === 'unlocked') crack(ctx);
  if (variant === 'open') {
    lampGlow(ctx, STORES_LAMP, 70, { alpha: 0.14, flicker: 0.07 });
    lampGlow(ctx, [STORES_LAMP[0] + 0.03, 0.42], 200, { alpha: 0.06, flicker: 0.05 });
  }
}

/**
 * The lock up close. Once the carrier has run, the key is in the lock; on
 * `unlocked` it turns a quarter, the plate warms and lamplight opens down the
 * crack between the leaf and the frame (held on screen: round 6 · item 4).
 */
export function drawLockPlate(ctx) {
  const { w, h } = ctx;
  const kx = KEYHOLE[0] * w;
  const ky = KEYHOLE[1] * h - 6;
  const bow = propImage(ctx, PROP['props/key-bow'], kx, ky, { width: 0.075 * w, origin: [0.95, 0.5], angle: -Math.PI / 2 });
  const ex = LOCK_LEAF_EDGE * w;
  const seam = ctx.paint('act05-lock-seam', (c) => {
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, 'rgba(255, 210, 140, 0)');
    g.addColorStop(0.25, 'rgba(255, 212, 146, 0.8)');
    g.addColorStop(0.75, 'rgba(255, 198, 120, 0.8)');
    g.addColorStop(1, 'rgba(255, 190, 110, 0)');
    c.fillStyle = g;
    c.fillRect(ex - 2, 0, 4, h);
  }, { bleed: 0 }).setBlendMode('ADD').setAlpha(0);
  const seamGlow = ctx.glow(ex, h * 0.5, h * 0.9, { color: 0xffc070, alpha: 0 });
  const plateGlow = ctx.glow(kx, h * 0.42, 220, { color: 0xffd27a, alpha: 0 });
  let turn = 0;
  let open = 0;
  ctx.animate((time, dt) => {
    const sent = ctx.flag('keySent');
    if (ctx.flag('unlocked')) turn = Math.min(1, turn + dt / 520);
    if (turn >= 1) open = Math.min(1, open + dt / (ctx.reduceMotion() ? 120 : 380));
    bow?.setVisible(sent).setRotation(-Math.PI / 2 + turn * (Math.PI / 2));
    const k = 1 - (1 - open) ** 3;
    seam.setAlpha(k * 0.85);
    seamGlow.setAlpha(k * 0.16);
    plateGlow.setAlpha(k * 0.13);
  });
  lampGlow(ctx, [0.2, 0.02], 300, { alpha: 0.05, flicker: 0.04 });
}

/** Through the open door: the stores, under its one lamp. */
export function drawStoresPlate(ctx) {
  lampGlow(ctx, [STORES_A.lamp[0], STORES_A.lamp[1] + 0.03], 120, { alpha: 0.12, flicker: 0.06 });
  ctx.dust(ctx.w * 0.3, ctx.h * 0.1, ctx.w * 0.3, ctx.h * 0.5, { count: 10, size: 2 });
}
