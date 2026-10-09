// Act 1 · LOST PROPERTY on George's painted plates (round 7): the desk at the
// end of the corridor, the wall of pigeonholes and the one pigeonhole up
// close, the window bay, the carriage door (locked, off its latch, open), and
// through it the next carriage, where the Conductor waits. Positions come
// from art/ch1Plates.js (generated from the measured paintings).
//
// As painted: the desk's floor runs out of its right edge at the door's
// threshold height (FLOOR); the window bay's floor is lower and never meets
// it. The wide wall of pigeonholes drops its chute out of the bottom edge
// left of the door's chute (they do not meet); the pigeonhole up close drops
// it right above it (CHUTE_AT): zoom in, and the ticket falls into the slot.

import { ANCHOR, PLATE, PROP, ZOOM } from './ch1Plates.js';
import { FONT_SERIF, FONT_UI, doorCrack, lampGlow, propKey, spacedText, whenFonts } from './plateKit.js';

const DESK = ANCHOR['act1/desk'];
const DOOR_A = ANCHOR['act1/door-locked'];
const OPEN = ANCHOR['act1/door-open'];
const LOCKERS = ANCHOR['act1/lockers'];
const CUBBY = ANCHOR['act1/cubby'];
const WINDOW = ANCHOR['act1/window'];
const CAR = ANCHOR['act1/conductor'];

export const PLATES1 = Object.freeze({
  desk: PLATE['act1/desk'].url,
  doorLocked: PLATE['act1/door-locked'].url,
  doorOpen: PLATE['act1/door-open'].url,
  lockers: PLATE['act1/lockers'].url,
  cubby: PLATE['act1/cubby'].url,
  window: PLATE['act1/window'].url,
  conductor: PLATE['act1/conductor'].url,
});
export const PROPS1 = Object.freeze([PROP['props/tag'].url]);

/** The corridor floor: the desk's right edge meets the carriage door's left edge here. */
export const A1_FLOOR = DESK.floorRight;
/** The window bay's floor (both edges): lower, so it never meets the corridor. */
export const WINDOW_FLOOR = WINDOW.floor;
/** The chute: the door's comes down from the top edge here; the pigeonhole's (up close) leaves its bottom edge here too. */
export const CHUTE_AT = DOOR_A.chute;
/** ... and the wide wall of pigeonholes drops its own chute further left (it does not meet). */
export const LOCKERS_CHUTE_AT = LOCKERS.chute;

/** The door leaf (latch on its right, by the knob), the ticket slot, the vestibule lantern. */
export const DOOR = Object.freeze({ x: DOOR_A.leaf[0], w: DOOR_A.leaf[2], top: DOOR_A.leaf[1] });
export const SLOT = Object.freeze([...DOOR_A.slot]);
export const SLOT_Y = SLOT[1] + SLOT[3] / 2;
export const KNOB = Object.freeze([...DOOR_A.knob]);
export const HANDLE_HIT = Object.freeze([KNOB[0] - 0.03, KNOB[1] - 0.09, 0.06, 0.16]);
/** The tagged pigeonhole in the wide wall (click), and the box the zoom flies into. */
export const TAGGED_HIT = Object.freeze([...LOCKERS.tagged]);
export const TAGGED_ZOOM = ZOOM['act1/cubby'];
export const CUBBY_TAG = Object.freeze([LOCKERS.envelope[0] + LOCKERS.envelope[2] * 0.55, LOCKERS.envelope[1] + LOCKERS.envelope[3] * 0.3]);
/** Through the open door: the box the zoom flies into (the doorway). */
export const DOORWAY_ZOOM = ZOOM['act1/conductor'];

/**
 * Up close in the pigeonhole: the claim tag stands on the far brass lip of
 * the chute's mouth (where the wall of pigeonholes shows it, above the
 * chute), leaning over the opening, ready to fall
 * (`x, y` is where its foot rests; `w` its width with the string).
 */
const FUNNEL = CUBBY.funnel;
export const TAG_AT = Object.freeze({ x: CHUTE_AT - 0.045, y: FUNNEL[1] + FUNNEL[3] * 0.16, w: 0.14, angle: -0.08 });
export const TAG_HIT = Object.freeze([TAG_AT.x - 0.085, TAG_AT.y - 0.28, 0.15, 0.3]);
export const TAG_DROP_Y = FUNNEL[1] + FUNNEL[3] * 0.5;

/** Where Butch walks: on the boards a step in front of the wall (the floor line is the link height). */
export const A1_WALK = Math.round((A1_FLOOR + 0.03) * 10000) / 10000;
/** Butch: home at the desk, waiting at the door, and his scale (1.75 m beside the painted 2 m leaf). */
export const BUTCH_HOME1 = Object.freeze({ x: DESK.deskEnd + 0.085, y: A1_WALK });
export const DOOR_WAIT_X = 0.62;
export const A1_BUTCH_SCALE = Math.round(((DOOR_A.leaf[3] * 414 * 1.75) / 2 / 70) * 100) / 100;
/**
 * The next carriage, in perspective: the Conductor waits at its far door
 * (on the aisle's floor there, CAR_FLOOR), Butch comes up the aisle a few
 * steps nearer (BUTCH_IN_CAR), so he stands larger. The eye is at about
 * 1.6 m: the horizon is 0.8 of the far door's 2 m above its threshold, and
 * a figure's height grows with its feet's distance below the horizon.
 */
export const CAR_FLOOR = Math.round((CAR.floor + 0.004) * 10000) / 10000;
const CAR_HORIZON = CAR.floor - CAR.door[3] * 0.8;
export const BUTCH_IN_CAR = Object.freeze({ x: 0.44, y: 0.83 });
export const CONDUCTOR_IN_CAR = Object.freeze({ x: 0.556, y: CAR_FLOOR });
/** How much nearer Butch stands than the far door (1 = at the door). */
export const CAR_DEPTH = Math.round(((BUTCH_IN_CAR.y - CAR_HORIZON) / (CAR.floor - CAR_HORIZON)) * 1000) / 1000;
export const CAR_ACTOR_SCALE = Math.round(((CAR.door[3] * 414 * 1.75 * CAR_DEPTH) / 2 / 70 / A1_BUTCH_SCALE) * 1000) / 1000;
export const CONDUCTOR_SCALE = Math.round(((CAR.door[3] * 414 * 1.95) / 2 / 110 / CAR_ACTOR_SCALE) * 100) / 100;

// ---------------------------------------------------------------------------

/** The claim tag, with its words inked in (a texture the cubby and the drop share). */
export const TAG_WORDS = Object.freeze({ kicker: 'CLAIM', year: '1978', number: '0412', name: 'Mara V—' });

export function claimTagKey(scene) {
  const out = 'nsv-plate-claim-tag';
  if (scene.textures.exists(out)) return out;
  const src = propKey(scene, PROP['props/tag']);
  if (!src) return null;
  const img = scene.textures.get(src).getSourceImage();
  const k = 2;
  const tex = scene.textures.createCanvas(out, img.width * k, img.height * k);
  const c = tex.getContext();
  c.drawImage(img, 0, 0, img.width * k, img.height * k);
  tex.refresh();
  whenFonts(() => {
    if (!scene.textures.exists(out)) return;
    // the paper of George's tag leans a few degrees: write along it
    c.save();
    c.scale(k, k);
    c.translate(img.width * 0.66, img.height * 0.57);
    c.rotate(-0.07);
    c.globalCompositeOperation = 'multiply';
    c.textAlign = 'center';
    c.fillStyle = 'rgba(128, 34, 26, 0.85)';
    c.font = `600 9px ${FONT_UI}`;
    spacedText(c, TAG_WORDS.kicker, 0, -40, 2.4);
    c.fillStyle = 'rgba(40, 28, 20, 0.92)';
    c.font = `600 15px ${FONT_SERIF}`;
    c.fillText(TAG_WORDS.year, 0, -18);
    c.font = `600 25px ${FONT_SERIF}`;
    c.fillText(TAG_WORDS.number, 0, 6);
    c.fillStyle = 'rgba(40, 28, 20, 0.7)';
    c.fillRect(-26, 13, 52, 1);
    c.font = `italic 400 15px ${FONT_SERIF}`;
    c.fillText(TAG_WORDS.name, 0, 33);
    c.restore();
    tex.refresh();
  });
  return out;
}

/** State desk `default`: the green lamp breathes. */
export function drawDeskPlate1(ctx) {
  lampGlow(ctx, [DESK.lamp[0], DESK.lamp[1] + 0.012], 110, { alpha: 0.1, flicker: 0.05 });
  lampGlow(ctx, [DESK.lamp[0] + 0.03, DESK.lamp[1] + 0.09], 130, { alpha: 0.05, flicker: 0.04 });
}

/** The wall of pigeonholes: the sconce breathes. */
export function drawLockersPlate(ctx) {
  lampGlow(ctx, [LOCKERS.sconce[0], LOCKERS.sconce[1] + 0.03], 90, { alpha: 0.08, flicker: 0.05 });
}

/** The one pigeonhole up close: the claim tag on the chute's lip until it drops. */
export function drawCubbyPlate(ctx) {
  const key = claimTagKey(ctx.scene);
  if (key) {
    const tex = ctx.scene.textures.get(key).getSourceImage();
    const tag = ctx.image(key, TAG_AT.x * ctx.w, TAG_AT.y * ctx.h, { origin: [0.62, 0.97], scale: (TAG_AT.w * ctx.w) / tex.width });
    tag.setRotation(TAG_AT.angle);
    ctx.animate(() => tag.setVisible(!ctx.flag('ticketDropped')));
  }
  lampGlow(ctx, CUBBY.glow, 260, { alpha: 0.05, flicker: 0.05 });
}

/** The window bay: the oil lantern by the curtain breathes. */
export function drawWindowPlate(ctx) {
  lampGlow(ctx, [WINDOW.lantern[0], WINDOW.lantern[1] + 0.02], 70, { alpha: 0.12, flicker: 0.1, color: 0xffb060 });
}

/** The carriage door: `locked`, `unlocked` (the slot lit, the crack of lamplight) or `open`. */
export function drawDoorPlate1(ctx, variant = 'locked') {
  const { w, h } = ctx;
  if (variant === 'unlocked') {
    // off its latch: the crack of the vestibule's light down the knob side
    doorCrack(ctx, 'act1-crack', (DOOR.x + DOOR.w) * w, DOOR.top * h + 4, A1_FLOOR * h - 2, { side: 1 });
    // the slot lit from inside: the ticket is in
    const [sx, sy, sw, sh] = SLOT;
    ctx.paint('act1-slot-lit', (c) => {
      c.fillStyle = 'rgba(255, 208, 130, 0.55)';
      c.fillRect((sx + sw * 0.12) * w, (sy + sh * 0.25) * h, sw * 0.76 * w, Math.max(1.5, sh * 0.5 * h));
    }, { bleed: 0 }).setBlendMode('ADD');
    ctx.glow((SLOT[0] + SLOT[2] / 2) * w, SLOT_Y * h, 60, { color: 0xffd08a, alpha: 0.22, flicker: 0.05 });
  }
  if (variant === 'open') {
    lampGlow(ctx, OPEN.lantern, 54, { alpha: 0.14, flicker: 0.1, color: 0xffb060 });
  }
}

/** The next carriage, through the open door: its two lamps breathe. */
export function drawConductorPlate(ctx) {
  const [x0, y, span] = CAR.lamps;
  [x0, x0 + span].forEach((x) => lampGlow(ctx, [x, y + 0.02], 80, { alpha: 0.1, flicker: 0.05 }));
  ctx.dust(ctx.w * 0.3, ctx.h * 0.15, ctx.w * 0.4, ctx.h * 0.5, { count: 10, size: 2 });
}
