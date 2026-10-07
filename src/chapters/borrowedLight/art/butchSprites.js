// Chapter 2 · BORROWED LIGHT — who draws Butch: painted frames when they
// exist, the vector rig until then (round 6).
//
// The owner may supply painted frames later (George's image-generation
// pipeline). Load them as one texture keyed BUTCH_TEXTURE (an atlas or a
// spritesheet) with frames named `${set}-${index}` for the sets and counts in
// art/butchRig.js BUTCH_FRAME_SETS (idle-0…7, run-0…7, rise-0…1, apex-0,
// fall-0…1, land-0…2, float-0…1, crouch-0): facing right, feet at the bottom
// centre, any resolution (each frame is scaled to BUTCH_LOOK.height). The
// scene calls renderer.draw(graphics, frame, at) every frame either way, and
// gets back where the lantern's light is.

import { BUTCH_LOOK, butchLampAt, drawButch } from './butchRig.js';

export const BUTCH_TEXTURE = 'ch2-butch';

export const butchFrameName = (frame) => `${frame.sprite.set}-${frame.sprite.index}`;

export function createButchRenderer(scene, { depth = 0 } = {}) {
  let img = null;
  const painted = () => scene.textures?.exists?.(BUTCH_TEXTURE) === true;
  return {
    get painted() { return painted(); },
    hide() { img?.setVisible(false); },
    /**
     * Draw one frame. at: { x, y (feet, world), facing, alpha, rim }.
     * Returns the lantern's light point (world).
     */
    draw(g, frame, at) {
      if (!painted()) {
        img?.setVisible(false);
        return drawButch(g, frame, { ...at, look: BUTCH_LOOK });
      }
      img ??= scene.add.image(0, 0, BUTCH_TEXTURE).setOrigin(0.5, 1).setDepth(depth);
      const texture = scene.textures.get(BUTCH_TEXTURE);
      const name = butchFrameName(frame);
      img.setFrame(texture.has(name) ? name : texture.firstFrame);
      const k = BUTCH_LOOK.height / Math.max(1, img.frame.realHeight || img.height);
      const f = at.facing >= 0 ? 1 : -1;
      const sx = k * (1 + (1 - frame.squash) * 0.75) * frame.turnSx;
      const sy = k * frame.squash;
      img.setPosition(at.x, at.y).setScale(sx * f, sy).setAlpha(at.alpha ?? 1).setVisible(true);
      // The painted lantern swings with the frame's own art; its light stays
      // the rig's, so the scene's lamp glow and the blackout's light agree.
      const lamp = butchLampAt(frame);
      const s = BUTCH_LOOK.height / 118;
      return { x: at.x + lamp.x * f * s, y: at.y + lamp.y * s * frame.squash };
    },
  };
}
