// Act 0.5 presentation effects (see README.md → Custom fx).

import { ACT0_FX } from './act0Fx.js';
import { KEY_HOOK, WIRE_OUT } from './act1Art.js';
import { CATCH, KEY_ZOOM, LOCK, LOCK_ZOOM, WIRE_CLOSE } from './act05Art.js';

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

  /** The key turns in the lock. */
  keyTurn(api) {
    const lock = toClose(LOCK_ZOOM, LOCK.x, LOCK.y);
    api.flash('door', lock.u, lock.v, { color: 0xffd27a, size: 220, duration: 700 });
    api.audio.play('lock');
  },

  /** A glint on the stores lock: this is what Butch cannot open. */
  lockGlint(api) {
    api.flash('door', LOCK.x, LOCK.y, { color: 0xffc46a, size: 110, duration: 800, repeat: 1 });
  },
};
