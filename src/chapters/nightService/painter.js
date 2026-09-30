// The painter context handed to every SceneDef.draw(ctx) / drawPast(ctx) and
// FrameDef.draw(ctx). It hides Phaser from act authors: a scene paints static
// art into a cached canvas (ctx.paint) and adds a few live pieces (glows,
// dust, rain, drifting painted fields, small sprites, per-frame animators).
// See README.md for the full list.

import { RES } from './art/figures.js';
import { PAL, paperTag, amberGlint } from './art/ink.js';
import { paintRadial } from './art/wallArt.js';

export const PAINT_BLEED = 28;

/** Shared textures every panel uses. Idempotent. */
export function ensureSharedTextures(scene) {
  const make = (key, w, h, fn) => {
    if (scene.textures.exists(key)) return;
    const tex = scene.textures.createCanvas(key, w, h);
    fn(tex.getContext(), w, h);
    tex.refresh();
  };
  make('nsv-radial', 128, 128, (c) => paintRadial(c, 128));
  make('nsv-dot', 16, 16, (c) => paintRadial(c, 16, [[0, 'rgba(255,255,255,1)'], [0.5, 'rgba(255,255,255,0.6)'], [1, 'rgba(255,255,255,0)']]));
  make('nsv-streak', 4, 64, (c) => {
    const g = c.createLinearGradient(0, 0, 0, 64);
    g.addColorStop(0, 'rgba(210,225,255,0)');
    g.addColorStop(0.7, 'rgba(210,225,255,0.55)');
    g.addColorStop(1, 'rgba(255,255,255,0.9)');
    c.fillStyle = g;
    c.fillRect(1, 0, 2, 64);
  });
  make('nsv-tag', 90 * 2, 60 * 2, (c) => {
    c.scale(2, 2);
    paperTag(c, 22, 30, { angle: 0, scale: 1.6, glint: false, string: [8, 12] });
  });
  make('nsv-glint', 48, 48, (c) => amberGlint(c, 24, 24, 7));
  make('nsv-spark', 32, 32, (c) => {
    c.fillStyle = PAL.ink;
    c.globalCompositeOperation = 'lighter';
    c.beginPath();
    c.moveTo(16, 2); c.quadraticCurveTo(16, 16, 30, 16); c.quadraticCurveTo(16, 16, 16, 30); c.quadraticCurveTo(16, 16, 2, 16); c.quadraticCurveTo(16, 16, 16, 2);
    c.fill();
  });
}

/**
 * Build a seamless, horizontally looping strip from a panorama's chunks so a
 * TileSprite can scroll it forever (the tail cross-fades into the head).
 */
export function ensureLoopTexture(scene, key, chunkKeys, height = 520, fade = 260) {
  if (scene.textures.exists(key)) return key;
  const sources = chunkKeys.map((k) => scene.textures.get(k).getSourceImage());
  if (!sources.length || sources.some((s) => !s?.width)) return null;
  const scale = height / sources[0].height;
  const widths = sources.map((s) => Math.round(s.width * scale));
  const overlap = Math.round(4 * scale);
  const stripW = widths.reduce((a, b) => a + b, 0) - overlap * (widths.length - 1);
  const strip = document.createElement('canvas');
  strip.width = stripW;
  strip.height = height;
  const sc = strip.getContext('2d');
  let x = 0;
  sources.forEach((s, i) => { sc.drawImage(s, x, 0, widths[i], height); x += widths[i] - overlap; });
  const loopW = Math.min(4096, stripW - fade);
  const tex = scene.textures.createCanvas(key, loopW, height);
  const c = tex.getContext();
  c.drawImage(strip, 0, 0);
  const tail = document.createElement('canvas');
  tail.width = fade;
  tail.height = height;
  const tc = tail.getContext('2d');
  tc.drawImage(strip, -loopW, 0);
  tc.globalCompositeOperation = 'destination-in';
  const g = tc.createLinearGradient(0, 0, fade, 0);
  g.addColorStop(0, 'rgba(0,0,0,1)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  tc.fillStyle = g;
  tc.fillRect(0, 0, fade, height);
  c.drawImage(tail, 0, 0);
  tex.refresh();
  return key;
}

/**
 * @param {Phaser.Scene} scene
 * @param {object} o
 * @param {Phaser.GameObjects.Container} o.target  container the pieces go into
 * @param {number} o.w
 * @param {number} o.h
 * @param {'present'|'past'} o.era
 * @param {object} o.model
 * @param {object} o.env  { paper, images, worlds, reduceMotion() }
 */
export function createPaintContext(scene, { target, w, h, era = 'present', model = null, tileId = null, stateId = null, env, res = 1 }) {
  const animators = [];
  const add = (obj) => { target.add(obj); return obj; };
  const reduce = () => env.reduceMotion();
  const ctx = {
    w, h, era, tileId, stateId, model, scene,
    animators,
    add,
    reduceMotion: reduce,
    flag: (name) => Boolean(model?.hasFlag(name)),
    item: (name) => Boolean(model?.hasItem(name)),
    palette: PAL,
    /** Per-frame callback (time ms, dt ms) while this layer is on screen. */
    animate(fn) { animators.push(fn); return fn; },
    /**
     * Paint a static canvas the size of the panel (+ bleed on every side).
     * `fn(c, env)` draws in panel coordinates; the canvas is cached by key.
     */
    paint(key, fn, { bleed = PAINT_BLEED } = {}) {
      // `res` > 1: the window is shown larger than its tile size (Act 0), so
      // the canvas is painted at screen resolution and drawn back down
      const r = Math.max(1, Math.round(res * 100) / 100);
      const fullKey = `nsv-paint-${key}-${era}-${Math.round(w)}x${Math.round(h)}${r > 1 ? `@${r}` : ''}`;
      if (!scene.textures.exists(fullKey)) {
        const tex = scene.textures.createCanvas(fullKey, Math.ceil((w + bleed * 2) * r), Math.ceil((h + bleed * 2) * r));
        const c = tex.getContext();
        c.save();
        c.scale(r, r);
        c.translate(bleed, bleed);
        fn(c, { w, h, era, paper: env.paper, images: env.images, bleed });
        c.restore();
        tex.refresh();
      }
      return add(scene.add.image(-bleed, -bleed, fullKey).setOrigin(0, 0).setScale(1 / r));
    },
    /** A small painted sprite (canvas at 3×), placed at x, y. */
    sprite(key, sw, sh, fn, x, y, { origin = [0.5, 0.5], angle = 0, alpha = 1 } = {}) {
      const fullKey = `nsv-sprite-${key}-${era}`;
      if (!scene.textures.exists(fullKey)) {
        const tex = scene.textures.createCanvas(fullKey, Math.ceil(sw * RES), Math.ceil(sh * RES));
        const c = tex.getContext();
        c.scale(RES, RES);
        fn(c, { era });
        tex.refresh();
      }
      const image = add(scene.add.image(x, y, fullKey).setOrigin(origin[0], origin[1]).setScale(1 / RES));
      image.setRotation(angle);
      image.setAlpha(alpha);
      return image;
    },
    /** A warm additive glow; `flicker` is the fraction it breathes. */
    glow(x, y, size, { color = 0xffc070, alpha = 0.3, flicker = 0 } = {}) {
      const glow = add(scene.add.image(x, y, 'nsv-radial').setDisplaySize(size, size).setTint(color).setAlpha(alpha).setBlendMode('ADD'));
      if (flicker) {
        const seed = Math.random() * 100;
        ctx.animate((time) => {
          const t = time / 1000 + seed;
          const n = Math.sin(t * 7.3) * 0.5 + Math.sin(t * 13.1) * 0.3 + Math.sin(t * 2.1) * 0.6;
          const dip = Math.sin(t * 0.9) > 0.985 ? 0.35 : 0;
          glow.setAlpha(alpha * (1 + n * flicker - dip * flicker * 3));
        });
      }
      return glow;
    },
    /** Floating dust motes in lamplight. Kept (gently) under Reduce Motion. */
    dust(x, y, dw, dh, { count = 12, size = 2.4, color = 0xffe0b0 } = {}) {
      for (let i = 0; i < count; i += 1) {
        const mote = add(scene.add.image(x + Math.random() * dw, y + Math.random() * dh, 'nsv-dot'));
        mote.setScale((size * (0.5 + Math.random())) / 16 * 2).setTint(color).setBlendMode('ADD').setAlpha(0.2);
        const ox = mote.x;
        const oy = mote.y;
        const seed = Math.random() * 1000;
        const speed = 0.08 + Math.random() * 0.12;
        ctx.animate((time) => {
          const t = time / 1000 * (reduce() ? 0.25 : 1) + seed;
          mote.x = ox + Math.sin(t * speed * 3) * 14;
          // drifts slowly upward through the light, wrapping inside its box
          mote.y = y + (((oy - y) + dh * 4 - ((t * speed * 60) % dh)) % dh) + Math.sin(t * 0.7) * 4;
          mote.setAlpha(0.12 + (Math.sin(t * 1.7) * 0.5 + 0.5) * 0.3);
        });
      }
    },
    /** Rain streaks running down a window. Dropped under Reduce Motion. */
    rain(x, y, rw, rh, { count = 30 } = {}) {
      const drops = [];
      for (let i = 0; i < count; i += 1) {
        const drop = add(scene.add.image(x + Math.random() * rw, y + Math.random() * rh, 'nsv-streak'));
        drop.setScale(0.8, 0.25 + Math.random() * 0.5).setRotation(0.35).setAlpha(0).setBlendMode('ADD');
        drop.speed = 180 + Math.random() * 260;
        drops.push(drop);
      }
      ctx.animate((time, dt) => {
        const off = reduce();
        drops.forEach((drop) => {
          drop.setVisible(!off);
          if (off) return;
          drop.y += (drop.speed * dt) / 1000;
          drop.x -= (drop.speed * 0.36 * dt) / 1000;
          if (drop.y > y + rh || drop.x < x) { drop.y = y - 10; drop.x = x + Math.random() * rw * 1.2; }
          const edge = Math.min(drop.x - x, x + rw - drop.x, drop.y - y, y + rh - drop.y);
          drop.setAlpha(Math.max(0, Math.min(1, edge / 30)) * 0.35);
        });
      });
    },
    /**
     * A painted panorama view (spec §5: night fields / city / memory houses)
     * cropped to a rectangle and, if `speed`, drifting past the window.
     */
    fields(x, y, fw, fh, { world = 'fields', speed = 18, crop = 0.62, zoom = 1.35, offset = 0, tint = null } = {}) {
      const key = env.worlds?.[world];
      if (!key || !scene.textures.exists(key)) return null;
      const frame = scene.textures.get(key).getSourceImage();
      const scale = (fh / frame.height) * zoom;
      const sprite = add(scene.add.tileSprite(x, y, fw, fh, key).setOrigin(0, 0));
      sprite.setTileScale(scale, scale);
      const visibleH = fh / scale;
      sprite.tilePositionY = (frame.height - visibleH) * crop;
      sprite.tilePositionX = offset;
      if (era === 'past') sprite.setTint(0xe0b27a);
      else if (tint) sprite.setTint(tint);
      if (speed) {
        ctx.animate((time, dt) => {
          const rate = (model?.driftRate ?? 1) * (reduce() ? 0 : 1);
          sprite.tilePositionX += (speed * rate * dt) / 1000 / scale;
        });
      }
      return sprite;
    },
    /** Static image from a loaded texture key. */
    image(key, x, y, { origin = [0, 0], scale = 1, alpha = 1, blend = null } = {}) {
      const image = add(scene.add.image(x, y, key).setOrigin(origin[0], origin[1]).setScale(scale).setAlpha(alpha));
      if (blend) image.setBlendMode(blend);
      return image;
    },
    /** Text in the painting (placeholders only: panels carry no labels). */
    text(x, y, value, style = {}) {
      return add(scene.add.text(x, y, value, { fontFamily: 'Georgia, serif', fontSize: '24px', color: PAL.ink, ...style }));
    },
  };
  return ctx;
}
