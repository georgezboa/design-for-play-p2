// Act 1 presentation effects, run by PanelScene when the script emits
// `{ fx: { name } }`. Each receives the renderer's fx api (see README.md).

// Round 7: on George's painted plates (positions from art/act1Plates.js).

import { A1_FLOOR as FLOOR, DOOR, KNOB, SLOT, SLOT_Y, TAG_AT, claimTagKey } from './act1Plates.js';

/** Screen px per tile px in a tile right now (its window's size and zoom). */
const tileScale = (api, tile) => {
  const view = api.view(tile);
  const a = api.screen(tile, 0, 0);
  const b = api.screen(tile, 1, 0);
  return Math.hypot(b.x - a.x, b.y - a.y) / view.w;
};
const SLOT_X = SLOT[0] + SLOT[2] / 2;

export const ACT1_FX = {
  slotFlash(api) {
    api.flash('door', SLOT_X, SLOT_Y, { color: 0xffc46a, size: 110, duration: 900, repeat: 1 });
  },

  /**
   * The claim tag tips off the chute's lip, falls out of the pigeonhole's
   * bottom edge, across the gutter, down the door's chute and into the slot.
   */
  ticketDrop(api, { from, to }) {
    // read from the windows every frame (they may still be settling)
    const path = () => [
      api.screen(from.tile, from.x, from.y),
      api.screen(from.tile, from.chute ?? from.x, from.mouth ?? from.y),
      api.screen(from.tile, from.chute ?? from.x, 1),
      api.screen(to.tile, to.x, 0),
      api.screen(to.tile, to.x, to.y),
    ];
    const a = path()[0];
    const key = claimTagKey(api.scene);
    let ticket;
    if (key) {
      ticket = api.topSprite(key, a.x, a.y);
      const width = TAG_AT.w * api.view(from.tile).w * tileScale(api, from.tile);
      ticket.setOrigin(0.62, 0.97).setScale(width / ticket.width).setRotation(TAG_AT.angle);
    } else {
      ticket = api.topSprite('nsv-sprite-act1-ticket-present', a.x + 6, a.y - 4);
      ticket.setRotation(-0.22);
    }
    const s0 = ticket.scaleX;
    api.audio.play('ticket');
    const p0 = path();
    api.lightRun([p0[2], p0[3], p0[4]], { duration: 900, delay: 520, size: 40, trail: 8 });
    // tip off the lip, into the mouth, out of the bottom edge, down the door's chute into the slot
    const legs = [
      { ms: 260, rot: [TAG_AT.angle, 0.5], scale: [1, 1], ease: (t) => t * t },
      { ms: 300, rot: [0.5, 1.1], scale: [1, 0.75], ease: (t) => t * t },
      { ms: 140, rot: [1.1, 1.4], scale: [0.75, 0.4], ease: (t) => t },
      { ms: 460, rot: [1.4, 1.57], scale: [0.4, 0.22], ease: (t) => t * t },
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
        const leg = legs[i];
        ticket.setPosition(pts[i].x + (pts[i + 1].x - pts[i].x) * k, pts[i].y + (pts[i + 1].y - pts[i].y) * k);
        ticket.setRotation(leg.rot[0] + (leg.rot[1] - leg.rot[0]) * k);
        ticket.setScale(s0 * (leg.scale[0] + (leg.scale[1] - leg.scale[0]) * k));
        if (i === legs.length - 1) ticket.setAlpha(1 - 0.4 * k);
      },
      onComplete: () => api.scene.tweens.add({ targets: ticket, alpha: 0, duration: 120, onComplete: () => ticket.destroy() }),
    });
    api.scene.time.delayedCall(1300, () => {
      const b = path()[4];
      api.flash(to.tile, SLOT_X, to.y, { color: 0xffd27a, size: 140, duration: 700 });
      api.sparkle(b.x, b.y, 6);
    });
  },

  /**
   * Round 6 · item 4: the ticket in the slot unlocks the door, and that is
   * held on screen: the lock lamp flips red → amber with a flash, the bolt
   * clacks back, and lamplight runs down the crack of the door.
   */
  doorUnlocked(api) {
    api.audio.play('unlatch');
    api.flash('door', SLOT_X, SLOT_Y, { color: 0xffcf7a, size: 100, duration: 900 });
    api.flash('door', KNOB[0], KNOB[1], { color: 0xffd27a, size: 70, duration: 900 });
    const x = DOOR.x + DOOR.w;
    const top = api.screen('door', x, DOOR.top + 0.02);
    const bottom = api.screen('door', x, FLOOR - 0.01);
    api.scene.time.delayedCall(260, () => api.lightRun([top, bottom], { duration: 700, size: 34, trail: 8 }));
    const p = api.screen('door', SLOT_X, SLOT_Y);
    api.sparkle(p.x, p.y, 6);
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
