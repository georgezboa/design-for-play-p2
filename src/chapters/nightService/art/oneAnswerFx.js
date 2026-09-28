// OBJECT PENDING CLASSIFICATION presentation effects (see README.md → Custom fx).

import { CITY_AT, DOWN_AT, DRAWING_LANE, ORCHARD_AT, ORCHARD_GATE, SLIP_RECT } from './oneAnswerArt.js';

function stampTexture(scene, key, text, { w = 520, h = 120, color = '#8a2a1e' } = {}) {
  if (scene.textures.exists(key)) return key;
  const tex = scene.textures.createCanvas(key, w, h);
  const c = tex.getContext();
  c.strokeStyle = color;
  c.lineWidth = 9;
  c.strokeRect(10, 10, w - 20, h - 20);
  c.lineWidth = 3;
  c.strokeRect(24, 24, w - 48, h - 48);
  c.fillStyle = color;
  c.font = '700 54px "Space Mono", monospace';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(text, w / 2, h / 2 + 2);
  // worn ink: knock a few holes out of the stamp
  c.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 90; i += 1) c.fillRect(Math.random() * w, Math.random() * h, 2 + Math.random() * 4, 2 + Math.random() * 3);
  tex.refresh();
  return key;
}

export const ONE_ANSWER_FX = {
  /** The Archivist files the arrangement: a red FILED stamp lands on the glass. */
  fileStamp(api) {
    const { scene, model } = api;
    const key = stampTexture(scene, 'oa-stamp-filed', 'FILED · ONE ANSWER');
    const layout = model.layout;
    const cx = layout.x + layout.w / 2;
    const cy = layout.y + layout.h / 2;
    const stamp = scene.add.image(cx, cy, key).setAlpha(0).setScale(1.6).setRotation(-0.08);
    api.top.add(stamp);
    scene.tweens.chain({
      targets: stamp,
      tweens: [
        { alpha: 0.95, scale: 1.05, duration: 220, ease: 'Quad.easeIn', onComplete: () => api.audio.play('thud') },
        { alpha: 0.95, duration: 500 },
        { alpha: 0, duration: 600, ease: 'Sine.easeIn', onComplete: () => stamp.destroy() },
      ],
    });
  },

  /** The seal cracks where the lens proved it never existed. */
  sealBreak(api) {
    const [x, y, w, h] = SLIP_RECT;
    api.flash('duplicate', x + w * 0.78, y + h * 0.5, { color: 0xffd28a, size: 220, duration: 700 });
    const p = api.screen('duplicate', x + w * 0.78, y + h * 0.5);
    api.sparkle(p.x, p.y, 12);
  },

  /** Both lives on one route: a light runs city → orchard, blooming at each joint. */
  bothLives(api) {
    const { scene } = api;
    const route = [
      api.screen('stub', 0.36, CITY_AT),
      api.screen('stub', 1, CITY_AT),
      api.screen('duplicate', 0, CITY_AT),
      api.screen('duplicate', DOWN_AT, CITY_AT),
      api.screen('duplicate', DOWN_AT, 1),
      ...DRAWING_LANE.map(([u, v]) => api.screen('plate', u, v)),
      api.screen('tag', 1, ORCHARD_AT),
      api.screen('tag', ORCHARD_GATE.x, ORCHARD_AT),
    ];
    api.lightRun(route, { duration: 2400, color: 0xffe2a8, trail: 90 });
    api.audio.play('reveal');
    [route[1], route[4], route[route.length - 2]].forEach((p, i) => {
      scene.time.delayedCall(500 + i * 700, () => {
        const bloom = scene.add.image(p.x, p.y, 'nsv-radial').setBlendMode('ADD').setTint(0xffd08a).setDisplaySize(40, 40).setAlpha(0.95);
        api.top.add(bloom);
        scene.tweens.add({ targets: bloom, displayWidth: 240, displayHeight: 240, alpha: 0, duration: 1300, ease: 'Sine.easeOut', onComplete: () => bloom.destroy() });
        api.sparkle(p.x, p.y, 10);
        api.audio.play('chime');
      });
    });
    api.flash('stub', 0.36, 0.5, { color: 0xffd28a, size: 380, duration: 1600 });
    scene.time.delayedCall(1800, () => api.flash('tag', 0.2, 0.3, { color: 0xffd28a, size: 380, duration: 1600 }));
  },
};
