// Phaser rigs for George's painted Chapter 1 figures (round 7). Same
// interface as actorRig.js's jointed rigs, which remain the fallback:
//   { root, height, update(dt, { pose, moving, time, carrying, speed }), gesture(name), ... }
// What each pose shows, the walk timing and the small motions are decided in
// spriteAnimator.js; this file only draws them. PanelScene places `root` (at
// the feet, facing by its x scale); the rig never moves itself.

import {
  PUNCH_TEXTURE, SPRITE_RIGS, anchorPoint, createAnimator, frameGeometry, propKey, rigHeight, spriteFiles, spriteFilesForAct, textureKey,
} from './spriteAnimator.js';

/**
 * `?figures=procedural` (dev, QA): skip the painted frames and show the
 * jointed figures, e.g. to compare the two.
 */
export function paintedFiguresEnabled() {
  try {
    return new URLSearchParams(globalThis.location?.search ?? '').get('figures') !== 'procedural';
  } catch {
    return true;
  }
}

/** Queue an act's painted figures on a scene's loader (PanelScene.preload). */
export function queueSpriteTextures(scene, act) {
  if (!paintedFiguresEnabled()) return [];
  const files = spriteFilesForAct(act).filter(({ key }) => !scene.textures.exists(key));
  files.forEach(({ key, url }) => scene.load.image(key, url));
  return files;
}

/** True when every texture a kind draws has loaded. */
export function spriteTexturesReady(scene, kind) {
  if (!SPRITE_RIGS[kind] || !paintedFiguresEnabled()) return false;
  return spriteFiles(kind).every(({ key }) => scene.textures.exists(key));
}

// frames with their own furniture (or a seat in the plate): no contact shadow
const SEATED = new Set(['sleep', 'sit', 'sit-chair']);

function softImage(scene, tint, blend) {
  const image = scene.add.image(0, 0, 'nsv-radial');
  image.setTint(tint);
  if (blend) image.setBlendMode(blend);
  return image;
}

/** The punch act1Fx flies from hand to hand, painted, at the jointed figure's texture size. */
function ensurePunchTexture(scene) {
  if (scene.textures.exists(PUNCH_TEXTURE.key) || !scene.textures.exists(propKey('punch'))) return;
  const { w, h, res } = PUNCH_TEXTURE;
  const tex = scene.textures.createCanvas(PUNCH_TEXTURE.key, w * res, h * res);
  const src = scene.textures.get(propKey('punch')).getSourceImage();
  const k = Math.min((w * res) / src.width, (h * res) / src.height);
  const c = tex.getContext();
  c.drawImage(src, (w * res - src.width * k) / 2, (h * res - src.height * k) / 2, src.width * k, src.height * k);
  tex.refresh();
}

/**
 * A painted rig, or null when its frames are not all loaded (the caller then
 * builds the jointed figure instead).
 */
export function buildSpriteRig(scene, kind) {
  if (!spriteTexturesReady(scene, kind)) return null;
  const spec = SPRITE_RIGS[kind];
  const anim = createAnimator(kind);
  if (kind === 'conductor') ensurePunchTexture(scene);
  const root = scene.add.container(0, 0);
  const body = scene.add.container(0, 0);
  const shadow = spec.shadow ? softImage(scene, 0x000000) : null;
  if (shadow) {
    shadow.setDisplaySize(spec.shadow.w, spec.shadow.h).setAlpha(spec.shadow.alpha);
    root.add(shadow);
  }
  root.add(body);
  const back = scene.add.image(0, 0, textureKey(kind, spec.idle)).setVisible(false);
  const front = scene.add.image(0, 0, textureKey(kind, spec.idle));
  body.add([back, front]);
  // a painted piece over the frame (Butch's desk, once he has sat up at it)
  const over = spec.desk ? scene.add.image(0, 0, textureKey(kind, spec.desk)).setVisible(false) : null;
  if (over) body.add(over);
  const glow = spec.glow ? softImage(scene, spec.glow.tint, 'ADD').setAlpha(0) : null;
  // a carried thing with no painted frame of its own, at the hand
  const prop = kind === 'butch' ? scene.add.image(0, 0, propKey('case')).setVisible(false) : null;
  if (prop) body.add(prop);
  if (glow) body.add(glow);

  const show = (image, frame) => {
    const key = textureKey(kind, frame);
    if (image.texture.key !== key) image.setTexture(key);
    const g = frameGeometry(kind, frame);
    image.setOrigin(g.origin[0], g.origin[1]).setScale(g.scale);
  };
  show(front, spec.idle);

  // distance walked, from the figure's own movement on screen (any parent,
  // any zoom): world displacement / world scale = local units
  const matrix = { last: null, parent: null, tm: undefined, pm: undefined };
  const travelled = (dt, speed) => {
    // reuse two matrices (Phaser allocates new ones when none are passed)
    const m = root.getWorldTransformMatrix(matrix.tm, matrix.pm);
    if (!matrix.tm && m?.constructor) { matrix.tm = m; matrix.pm = new m.constructor(); }
    const sx = Math.hypot(m.a, m.b) || 1;
    const here = { x: m.tx, y: m.ty, s: sx };
    const prev = matrix.last;
    const sameParent = matrix.parent === root.parentContainer;
    matrix.last = here;
    matrix.parent = root.parentContainer;
    const expected = speed ? (speed * dt) / 1000 / Math.max(0.05, Math.abs(root.scaleY)) : 0;
    if (!prev || !sameParent || !root.visible) return expected;
    const d = Math.hypot(here.x - prev.x, here.y - prev.y) / here.s;
    // a jump (a re-parent, a zoom while walking) is not a stride
    return Number.isFinite(d) && d <= expected * 3 + 1 ? d : expected;
  };

  const rig = {
    root,
    painted: true,
    kind,
    height: rigHeight(kind),
    glow,
    animator: anim,
    get frame() { return anim.frame; },
    /** A painted anchor (glow, hand, ticket, case, punch) on the current frame, local units. */
    point(name, frame = anim.frame) { return anchorPoint(kind, frame, name); },
    /** act1Fx: `conductor.punch.setVisible(false)` as the punch leaves his hand. */
    punch: kind === 'conductor' ? {
      visible: true,
      setVisible(v) { this.visible = v; anim.hidePunch(!v); return this; },
    } : undefined,
    update(dt, { pose, moving, time, carrying, speed = null } = {}) {
      const walked = moving ? travelled(dt, speed) : (travelled(dt, 0), 0);
      const view = anim.update(dt, { pose, moving, time, carrying, travelled: walked });
      show(front, view.frame);
      front.setAlpha(view.prev ? view.fade : 1);
      if (view.prev) {
        show(back, view.prev);
        back.setVisible(true).setAlpha(1 - Math.max(0, view.fade * 2 - 1));
      } else {
        back.setVisible(false);
      }
      if (over) {
        if (view.overlay) {
          show(over, view.overlay.frame);
          over.setVisible(true).setAlpha(view.overlay.alpha);
        } else {
          over.setVisible(false);
        }
      }
      body.setPosition(view.x, view.y);
      body.setRotation(view.rotation);
      body.setScale(view.scaleX, view.scaleY);
      if (glow) {
        if (view.glow) {
          glow.setPosition(view.glow.x - view.x, view.glow.y - view.y).setDisplaySize(view.glow.size, view.glow.size).setAlpha(view.glow.alpha);
        } else {
          glow.setAlpha(0);
        }
      }
      if (!prop) {
        // no props on this figure
      } else if (view.prop && scene.textures.exists(propKey(view.prop.name))) {
        if (prop.texture.key !== propKey(view.prop.name)) prop.setTexture(propKey(view.prop.name));
        prop.setVisible(true).setPosition(view.prop.x - view.x, view.prop.y - view.y);
        prop.setScale(view.prop.size / prop.width);
      } else {
        prop.setVisible(false);
      }
      if (shadow) {
        // the contact shadow stays on the floor and narrows a little in a stride
        shadow.setPosition(view.x * 0.5, 0);
        shadow.setVisible(!SEATED.has(view.frame));
      }
    },
    gesture(name) { anim.gesture(name); },
    /** Sprite rigs move fx points written for the jointed figures onto the painted hands (PanelScene rigPoint). */
    mapPoint(lx, ly) { return anim.mapPoint(lx, ly); },
  };
  return rig;
}

