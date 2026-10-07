// Act 0.5 presentation effects (see README.md → Custom fx).

import { ACT0_FX } from './act0Fx.js';
import { KEY_HOOK, WIRE_OUT } from './act1Art.js';
import { CATCH, KEY_ZOOM, LOCK, LOCK_ZOOM, STORES, WIRE_CLOSE } from './act05Art.js';

const toClose = (rect, x, y) => ({ u: (x - rect[0]) / rect[2], v: (y - rect[1]) / rect[3] });

export const ACT05_FX = {
  deskBell: ACT0_FX.deskBell,

  /** The carrier runs the key line: office close-up → gutter → the lock's catch. */
  carrier(api) {
    const hook = toClose(KEY_ZOOM, KEY_HOOK.x, WIRE_OUT);
    const catchPt = toClose(LOCK_ZOOM, CATCH.x, CATCH.y);
    const a = api.screen('desk', hook.u, WIRE_CLOSE);
    const b = api.screen('desk', 0, WIRE_CLOSE);
    const c = api.screen('door', 1, WIRE_CLOSE);
    const d = api.screen('door', catchPt.u - 0.035, WIRE_CLOSE);
    const sprite = api.topSprite('nsv-sprite-act05-trolley-present', a.x, a.y);
    sprite.setOrigin(0.5, 0.1);
    const reduce = api.reduceMotion();
    api.audio.play('carrier');
    api.lightRun([a, b, c, d], { duration: 900, delay: 150 });
    api.scene.tweens.chain({
      targets: sprite,
      tweens: [
        { x: a.x + 10, duration: 160, ease: 'Sine.easeOut' },
        { x: b.x, duration: reduce ? 300 : 420, ease: 'Sine.easeIn' },
        { x: c.x, duration: 90, ease: 'Linear' },
        { x: d.x, duration: reduce ? 300 : 460, ease: 'Sine.easeOut' },
        { alpha: 0, duration: 140, onComplete: () => sprite.destroy() },
      ],
    });
    api.scene.time.delayedCall(1150, () => {
      api.audio.play('clack');
      api.sparkle(d.x, d.y, 6);
    });
  },

  /**
   * The key turns in the lock (round 6 · item 4: held, so it reads): the
   * turn and its click, then the bolt drawing back with a warmer flash and
   * the leaf easing off its latch (drawLockClose animates the bolt and the
   * seam of light from the `unlocked` flag).
   */
  keyTurn(api) {
    const lock = toClose(LOCK_ZOOM, LOCK.x, LOCK.y);
    const edge = toClose(LOCK_ZOOM, STORES.x + STORES.w, LOCK.y);
    api.flash('door', lock.u, lock.v, { color: 0xffd27a, size: 220, duration: 700 });
    api.audio.play('lock');
    api.scene.time.delayedCall(620, () => {
      api.audio.play('unlatch');
      api.flash('door', edge.u, lock.v, { color: 0xffc46a, size: 300, duration: 900 });
      const p = api.screen('door', edge.u, lock.v);
      api.sparkle(p.x, p.y, 7);
    });
  },

  /** The wide view: lamplight runs down the crack of the door, off its latch. */
  doorAjar(api) {
    const x = STORES.x + STORES.w;
    const top = api.screen('door', x, STORES.top + 0.02);
    const bottom = api.screen('door', x, 0.84);
    api.lightRun([top, bottom], { duration: 700, size: 40, trail: 8, color: 0xffd08a });
    api.flash('door', LOCK.x, LOCK.y, { color: 0xffd27a, size: 120, duration: 800 });
  },

  /** A glint on the stores lock: this is what Butch cannot open. */
  lockGlint(api) {
    api.flash('door', LOCK.x, LOCK.y, { color: 0xffc46a, size: 110, duration: 800, repeat: 1 });
  },
};
