// Act 2 presentation effects (see README.md → Custom fx).

import { DROP_AT, ORCHARD_CASE, ORCHARD_TAG, RACK_Y, CASE_TOP, REQUEST_STOP, UPSTAIRS } from './act2Art.js';

export const ACT2_FX = {
  /** The punched hole pops out of the ticket and floats up to become the lens. */
  punchPop(api, { to: where }) {
    const to = api.screen(where.tile, where.u, where.v);
    const from = api.rigPoint('butch', 22, -63);
    const disc = api.scene.add.image(from.x, from.y, 'nsv-lens-rim').setScale(0.08).setAlpha(0.95);
    api.top.add(disc);
    api.sparkle(from.x, from.y, 8);
    api.scene.tweens.add({
      targets: disc,
      x: to.x,
      y: to.y,
      scale: 1,
      angle: 200,
      duration: 900,
      ease: 'Back.easeOut',
      onComplete: () => {
        api.sparkle(to.x, to.y, 10);
        api.audio.play('glint');
        api.scene.tweens.add({ targets: disc, alpha: 0, duration: 200, onComplete: () => disc.destroy() });
      },
    });
  },

  /** REQUEST STOP punched in 1978: the plate answers, and BELLWETHER lights today. */
  requestStop(api) {
    const [x, y, w, h] = REQUEST_STOP;
    const knob = { u: x + (h * 0.5 * (414 / 745)), v: y + h / 2 };
    api.flash('board', knob.u, knob.v, { color: 0xffd27a, size: 200, duration: 700 });
    const p = api.screen('board', knob.u, knob.v);
    api.sparkle(p.x, p.y, 10);
    api.scene.time.delayedCall(450, () => {
      api.flash('board', 0.194, 0.697, { color: 0xffb060, size: 150, duration: 900, repeat: 1 });
      api.audio.play('chime');
    });
    void w;
  },

  /** Through the lens the Bellwether tag was marked: the present case answers. */
  markCase(api) {
    api.flash('rack', ORCHARD_TAG.x, ORCHARD_TAG.y, { color: 0xffc46a, size: 220, duration: 900 });
    const p = api.screen('rack', ORCHARD_TAG.x, ORCHARD_TAG.y);
    api.sparkle(p.x, p.y, 10);
    api.audio.play('chime');
  },

  /** The orchard fills the carriage window: hold, then the train arrives. */
  arrive(api) {
    const view = api.view('rack');
    const wash = api.scene.add.rectangle(0, 0, view.w, view.h, 0xffc88a, 0).setOrigin(0, 0).setBlendMode('ADD');
    view.fxLayer.add(wash);
    api.scene.tweens.add({ targets: wash, alpha: 0.22, duration: 900, yoyo: true, hold: 600, ease: 'Sine.easeInOut', onComplete: () => wash.destroy() });
    api.flash('rack', UPSTAIRS.x, UPSTAIRS.y, { color: 0xffd28a, size: 180, duration: 1600 });
    api.audio.play('reveal');
    api.scene.time.delayedCall(700, () => api.audio.play('brake'));
  },

  /** The orchard case falls through the gutter into Butch's arms. */
  caseDrop(api) {
    const startU = DROP_AT;
    const startV = CASE_TOP + (RACK_Y - CASE_TOP) / 2;
    const a = api.screen('rack', startU, startV);
    const edge = api.screen('rack', startU, 1);
    const top = api.screen('aisle', startU, 0);
    const arms = api.rigPoint('butch', 8, -34);
    const sprite = api.topSprite('nsv-sprite-act2-orchard-case-present', a.x, a.y);
    const s0 = sprite.scaleX;
    const s1 = s0 * 0.68;
    api.audio.play('whoosh');
    api.scene.tweens.chain({
      targets: sprite,
      tweens: [
        { x: edge.x, y: edge.y, rotation: -0.4, duration: 320, ease: 'Sine.easeIn' },
        { x: top.x, y: top.y, rotation: -0.2, scale: (s0 + s1) / 2, duration: 120, ease: 'Linear' },
        { x: arms.x, y: arms.y, rotation: 0, scale: s1, duration: 360, ease: 'Quad.easeIn' },
        { alpha: 0, duration: 80, onComplete: () => sprite.destroy() },
      ],
    });
    api.scene.time.delayedCall(820, () => {
      api.audio.play('thud');
      if (!api.reduceMotion()) api.scene.cameras.main.shake(220, 0.004);
      api.sparkle(arms.x, arms.y + 20, 6);
    });
    void ORCHARD_CASE;
  },

  /** The Ember Stone leaves the lining; sockets appear on the carriage trim. */
  emberTaken(api) {
    api.flash('aisle', 0.5, 0.55, { color: 0xff8a3a, size: 420, duration: 1200 });
    const p = api.screen('aisle', 0.5, 0.55);
    api.sparkle(p.x, p.y, 12);
  },
};
