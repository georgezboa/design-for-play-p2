// Act 2 presentation effects (see README.md → Custom fx).

import { BELLWETHER_LAMP, CASE_HELD, EMBER_GLOW, CASE_TEETER, DROP_AT, ORCHARD_TAG, PLATE, REQUEST_KNOB, UPSTAIRS } from './act2Art.js';
import { plateKey } from '../panelModel.js';
import { ensurePainted } from './act2PlateKit.js';

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
    const knob = REQUEST_KNOB;
    api.flash('board', knob.u, knob.v, { color: 0xffd27a, size: 200, duration: 700 });
    const p = api.screen('board', knob.u, knob.v);
    api.sparkle(p.x, p.y, 10);
    api.scene.time.delayedCall(450, () => {
      // BELLWETHER's lamp lights today
      api.flash('board', BELLWETHER_LAMP.u, BELLWETHER_LAMP.v, { color: 0xffb060, size: 150, duration: 900, repeat: 1 });
      api.audio.play('chime');
    });
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

  /** The orchard case falls through the torn net, across the gutter, into Butch's arms. */
  caseDrop(api) {
    const [tx, ty, tw, th] = CASE_TEETER;
    const a = api.screen('rack', tx + tw / 2, ty + th / 2);
    const edge = api.screen('rack', DROP_AT, 1);
    const top = api.screen('aisle', DROP_AT, 0);
    const arms = api.rigPoint('butch', 8, -34);
    const rackView = api.view('rack');
    const aisleView = api.view('aisle');
    // the painted case as it sits on the rack, then the size it is in his arms
    const key = ensurePainted(api.scene, PLATE.case) ?? plateKey(PLATE.case);
    const sprite = api.scene.textures.exists(key) ? api.topSprite(key, a.x, a.y) : api.topSprite('nsv-sprite-act2-orchard-case-present', a.x, a.y);
    const w0 = tw * rackView.w * rackView.base;
    const w1 = CASE_HELD[2] * aisleView.w * aisleView.base;
    sprite.setDisplaySize(w0, (w0 * sprite.height) / sprite.width);
    const s0 = sprite.scaleX;
    const s1 = s0 * (w1 / w0);
    api.audio.play('whoosh');
    api.scene.tweens.chain({
      targets: sprite,
      tweens: [
        { x: edge.x, y: edge.y, rotation: 0.25, duration: 320, ease: 'Sine.easeIn' },
        { x: top.x, y: top.y, rotation: 0.12, scale: (s0 + s1) / 2, duration: 120, ease: 'Linear' },
        { x: arms.x, y: arms.y, rotation: 0, scale: s1, duration: 360, ease: 'Quad.easeIn' },
        { alpha: 0, duration: 80, onComplete: () => sprite.destroy() },
      ],
    });
    api.scene.time.delayedCall(820, () => {
      api.audio.play('thud');
      if (!api.reduceMotion()) api.scene.cameras.main.shake(220, 0.004);
      api.sparkle(arms.x, arms.y + 20, 6);
    });
  },

  /** The Ember Stone leaves the lining; sockets appear on the carriage trim. */
  emberTaken(api) {
    api.flash('aisle', EMBER_GLOW.x, EMBER_GLOW.y, { color: 0xff8a3a, size: 420, duration: 1200 });
    const p = api.screen('aisle', EMBER_GLOW.x, EMBER_GLOW.y);
    api.sparkle(p.x, p.y, 12);
  },
};
