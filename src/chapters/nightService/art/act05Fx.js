// Act 0.5 presentation effects (see README.md → Custom fx). Round 7: on
// George's painted plates (positions from art/act05Plates.js).

import { ACT0_FX } from './act0Fx.js';
import {
  A05_FLOOR, CLIP_HANG, HOOK, KEY_LEN_CLOSE, KEYHOLE, LEAF, LEAF_EDGE, LOCK_AT, LOCK_LEAF_EDGE, WIRE_CLOSE,
} from './act05Plates.js';
import { PROP } from './ch1Plates.js';
import { propKey } from './plateKit.js';

/** Screen px per tile px in a tile right now (its window's size and zoom). */
const tileScale = (api, tile) => {
  const view = api.view(tile);
  const a = api.screen(tile, 0, 0);
  const b = api.screen(tile, 1, 0);
  return Math.hypot(b.x - a.x, b.y - a.y) / view.w;
};

export const ACT05_FX = {
  deskBell: ACT0_FX.deskBell,

  /**
   * The carrier runs the key line: the key lifts off the clip in the office
   * close-up, rides the rod out of its left edge, crosses the gutter on the
   * line, and slides along the wire to the lock's hook.
   */
  carrier(api) {
    // the path is read from the windows every frame, so it holds even while a
    // window is still settling into its slot
    const path = () => [
      api.screen('desk', CLIP_HANG[0], CLIP_HANG[1]),
      api.screen('desk', CLIP_HANG[0], WIRE_CLOSE),
      api.screen('desk', 0, WIRE_CLOSE),
      api.screen('door', 1, WIRE_CLOSE),
      api.screen('door', HOOK[0], WIRE_CLOSE),
    ];
    const reduce = api.reduceMotion();
    const key = propKey(api.scene, PROP['props/key']);
    const start = path()[0];
    let sprite;
    if (key) {
      sprite = api.topSprite(key, start.x, start.y);
      const width = KEY_LEN_CLOSE * api.view('desk').w * tileScale(api, 'desk');
      sprite.setOrigin(0.05, 0.5).setRotation(Math.PI / 2).setScale(width / PROP['props/key'].w);
    } else {
      sprite = api.topSprite('nsv-sprite-act05-trolley-present', start.x, start.y);
      sprite.setOrigin(0.5, 0.1);
    }
    api.audio.play('carrier');
    const p0 = path();
    api.lightRun([p0[1], p0[2], p0[3], p0[4]], { duration: 900, delay: 250, size: 40, trail: 8, color: 0xf2c88a });
    // segments: lift onto the line, run to the edge, cross the gutter, run to the hook
    const legs = [
      { ms: 220, ease: (t) => Math.sin((t * Math.PI) / 2), sway: 0 },
      { ms: reduce ? 280 : 420, ease: (t) => t * t, sway: 0.12 },
      { ms: 90, ease: (t) => t, sway: 0.12 },
      { ms: reduce ? 300 : 460, ease: (t) => 1 - (1 - t) * (1 - t), sway: 0 },
    ];
    const total = legs.reduce((sum, leg) => sum + leg.ms, 0);
    api.scene.tweens.addCounter({
      from: 0,
      to: total,
      duration: total,
      onUpdate: (tween) => {
        let t = tween.getValue();
        const pts = path();
        let i = 0;
        while (i < legs.length - 1 && t > legs[i].ms) { t -= legs[i].ms; i += 1; }
        const k = legs[i].ease(Math.min(1, t / legs[i].ms));
        sprite.setPosition(pts[i].x + (pts[i + 1].x - pts[i].x) * k, pts[i].y + (pts[i + 1].y - pts[i].y) * k);
        sprite.setRotation(Math.PI / 2 + legs[i].sway * Math.sin(k * Math.PI));
      },
      onComplete: () => api.scene.tweens.add({ targets: sprite, alpha: 0, duration: 160, onComplete: () => sprite.destroy() }),
    });
    api.scene.time.delayedCall(1250, () => {
      const d = path()[4];
      api.audio.play('clack');
      api.sparkle(d.x, d.y, 6);
    });
  },

  /**
   * The key turns in the lock (round 6 · item 4: held, so it reads): the turn
   * and its click, then the bolt drawing back with a warmer flash at the leaf
   * edge (drawLockPlate turns the key and opens the seam on `unlocked`).
   */
  keyTurn(api) {
    api.flash('door', KEYHOLE[0], KEYHOLE[1], { color: 0xffd27a, size: 200, duration: 700 });
    api.audio.play('lock');
    api.scene.time.delayedCall(620, () => {
      api.audio.play('unlatch');
      api.flash('door', LOCK_LEAF_EDGE, KEYHOLE[1], { color: 0xffc46a, size: 260, duration: 900 });
      const p = api.screen('door', LOCK_LEAF_EDGE, KEYHOLE[1]);
      api.sparkle(p.x, p.y, 7);
    });
  },

  /** The wide view: lamplight runs down the crack of the door, off its latch. */
  doorAjar(api) {
    const top = api.screen('door', LEAF_EDGE, LEAF[1] + 0.02);
    const bottom = api.screen('door', LEAF_EDGE, A05_FLOOR - 0.01);
    api.lightRun([top, bottom], { duration: 700, size: 34, trail: 8, color: 0xffd08a });
    api.flash('door', LOCK_AT[0], LOCK_AT[1], { color: 0xffd27a, size: 100, duration: 800 });
  },

  /** A glint on the stores lock: this is what Butch cannot open. */
  lockGlint(api) {
    api.flash('door', LOCK_AT[0], LOCK_AT[1], { color: 0xffc46a, size: 90, duration: 800, repeat: 1 });
  },
};
