// Act 0 / Act 0.5 presentation effects (see README.md → Custom fx).

import { DESK_BELL } from './act1Art.js';
import { LIT_WINDOW_GLASS, PLUNGER } from './act0Plates.js';

/** Find a live image in a tile by its texture key (sprites painted by ctx.sprite). */
export function findSprite(view, key) {
  const walk = (obj) => {
    if (!obj) return null;
    if (obj.texture?.key === key) return obj;
    for (const child of obj.list ?? []) {
      const hit = walk(child);
      if (hit) return hit;
    }
    return null;
  };
  return walk(view?.current?.root);
}

/** Ink rings running out from a point in a tile (the sound, drawn). */
export function soundRings(api, tile, u, v, { count = 3, size = 260, color = 0xffd9a0 } = {}) {
  const view = api.view(tile);
  const reduce = api.reduceMotion();
  for (let i = 0; i < count; i += 1) {
    const g = api.scene.add.graphics();
    view.fxLayer.add(g);
    const state = { r: 8, a: 0.9 };
    api.scene.tweens.add({
      targets: state,
      r: size * (reduce ? 0.6 : 1),
      a: 0,
      delay: i * 160,
      duration: reduce ? 700 : 1100,
      ease: 'Sine.easeOut',
      onUpdate: () => {
        g.clear();
        g.lineStyle(reduce ? 1.5 : 2.2, color, state.a * 0.7);
        g.strokeEllipse(u * view.w, v * view.h, state.r * 2, state.r * 1.6);
      },
      onComplete: () => g.destroy(),
    });
  }
}

function wobble(api, sprite, amount = 0.14) {
  if (!sprite) return;
  const reduce = api.reduceMotion();
  const state = { t: 0 };
  const base = sprite.rotation;
  api.scene.tweens.add({
    targets: state,
    t: 1,
    duration: 900,
    onUpdate: () => { sprite.rotation = base + Math.sin(state.t * 40) * amount * (1 - state.t) * (reduce ? 0.3 : 1); },
    onComplete: () => { sprite.rotation = base; },
  });
}

export const ACT0_FX = {
  /** The close-up bell is struck: its sound rings out across the picture. */
  bellRing(api, { tile = 'office' } = {}) {
    // the painted plunger, struck; the ring runs out over the dome
    api.flash(tile, PLUNGER[0], PLUNGER[1] + 0.03, { color: 0xfff0c0, size: 220, duration: 600 });
    soundRings(api, tile, PLUNGER[0], 0.42, { count: 4, size: 420, color: 0xf2d6a0 });
    const p = api.screen(tile, PLUNGER[0], PLUNGER[1] + 0.03);
    api.sparkle(p.x, p.y, 8);
  },

  /** The desk bell on the office desk rings (on its own, or struck); `at` is where it stands. */
  deskBell(api, { tile = 'desk', at = null } = {}) {
    const view = api.view(tile);
    wobble(api, findSprite(view, 'nsv-sprite-office-bell-present'));
    const [u, v] = at ?? [DESK_BELL.x, DESK_BELL.y - 0.03];
    api.flash(tile, u, v, { color: 0xffe0a0, size: 110, duration: 700 });
    soundRings(api, tile, u, v, { count: 3, size: 90 });
    api.audio.play('deskBell');
  },

  /** Seen from outside, the office window glows: that is where we were. */
  litWindow(api, { tile = 'office' } = {}) {
    const [x, y, w, h] = LIT_WINDOW_GLASS;
    api.flash(tile, x + w / 2, y + h / 2, { color: 0xffc46a, size: 170, duration: 900, repeat: 1 });
  },
};
