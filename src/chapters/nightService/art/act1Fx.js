// Act 1 presentation effects, run by PanelScene when the script emits
// `{ fx: { name } }`. Each receives the renderer's fx api (see README.md).

import { CHUTE_AT, SLOT_Y } from './act1Art.js';

export const ACT1_FX = {
  slotFlash(api) {
    api.flash('door', CHUTE_AT, SLOT_Y, { color: 0xffc46a, size: 150, duration: 900, repeat: 1 });
  },

  ticketDrop(api, { from, to }) {
    const a = api.screen(from.tile, from.x, from.y);
    const edge = api.screen(from.tile, from.x, 1);
    const top = api.screen(to.tile, to.x, 0);
    const b = api.screen(to.tile, to.x, to.y);
    const ticket = api.topSprite('nsv-sprite-act1-ticket-present', a.x + 6, a.y - 4);
    ticket.setRotation(-0.22).setScale(ticket.scaleX * api.zoomScale(from.tile));
    api.audio.play('ticket');
    const scene = api.scene;
    const light = api.lightRun([edge, top, b], { duration: 900, delay: 420 });
    void light;
    scene.tweens.chain({
      targets: ticket,
      tweens: [
        { y: a.y - 18, rotation: 0.1, duration: 220, ease: 'Sine.easeOut' },
        { y: edge.y, x: edge.x, rotation: 0.6, scale: ticket.scaleX * 0.5, duration: 380, ease: 'Sine.easeIn' },
        { y: top.y + 8, x: top.x, rotation: 1.2, duration: 160, ease: 'Linear' },
        { y: b.y, x: b.x, rotation: 1.57, alpha: 0.55, scale: ticket.scaleX * 0.34, duration: 520, ease: 'Sine.easeIn' },
        { alpha: 0, duration: 120, onComplete: () => ticket.destroy() },
      ],
    });
    scene.time.delayedCall(1300, () => {
      api.flash(to.tile, to.x, to.y, { color: 0xffd27a, size: 200, duration: 700 });
      api.sparkle(b.x, b.y, 6);
    });
  },

  punchHandover(api) {
    const conductor = api.rig('conductor');
    const butch = api.rig('butch');
    if (!conductor || !butch) return;
    conductor.gesture('offer');
    api.audio.play('paper');
    const scene = api.scene;
    scene.time.delayedCall(480, () => {
      const hand = api.rigPoint('conductor', 30, -48);
      const recv = api.rigPoint('butch', 14, -40);
      conductor.punch.setVisible(false);
      const punch = api.topSprite('nsv-conductor-punch', hand.x, hand.y);
      punch.setScale(api.rigScale('conductor') / 3);
      butch.gesture('receive');
      scene.tweens.add({
        targets: punch,
        x: recv.x,
        y: recv.y,
        duration: 520,
        ease: 'Sine.easeInOut',
        onComplete: () => {
          api.sparkle(recv.x, recv.y, 8);
          api.audio.play('glint');
          scene.tweens.add({ targets: punch, alpha: 0, duration: 260, onComplete: () => punch.destroy() });
        },
      });
    });
    scene.time.delayedCall(1100, () => conductor.gesture('rest'));
  },
};
