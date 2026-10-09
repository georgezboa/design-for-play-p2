// Round 7 · painted plates for Acts 2 and 3: the few pieces of George's
// paintings that move or come and go on top of a plate (the orchard case on
// the rack, the rack's net in front of it, the Ember Stone, the liftable
// frames while they float). They load from the same URLs as plates (texture
// key `plateKey(url)`), so a frame's plate, preloaded with the act, is
// already there; a sprite that is not yet loaded appears a moment later.

import { coverFit, plateKey } from '../panelModel.js';

const pending = new Map();

/** The texture key for a painted image, loading it once if it is not there yet. */
export function ensurePainted(scene, url) {
  const key = plateKey(url);
  if (scene?.textures?.exists(key)) return key;
  if (!pending.has(key) && typeof Image !== 'undefined') {
    const img = new Image();
    pending.set(key, img);
    img.onload = () => {
      pending.delete(key);
      if (!scene.textures.exists(key)) scene.textures.addImage(key, img);
    };
    img.onerror = () => pending.delete(key);
    img.src = url;
  }
  return null;
}

/** True once the painted image is a texture. */
export function paintedReady(scene, url) {
  return Boolean(scene?.textures?.exists(plateKey(url)));
}

/**
 * A painted sprite on a plate. `box` is tile-normalised [u, v, w, h]: the
 * image is scaled to the box's width; it hangs from `origin` (default its
 * bottom centre) at the matching point of the box. Returns a container the
 * caller may move, turn or hide; the image arrives inside it when loaded.
 */
export function paintedSprite(ctx, url, box, { origin = [0.5, 1], alpha = 1, onReady = null } = {}) {
  const [u, v, bw, bh] = box;
  const x = (u + bw * origin[0]) * ctx.w;
  const y = (v + bh * origin[1]) * ctx.h;
  const holder = ctx.add(ctx.scene.add.container(x, y));
  holder.setAlpha(alpha);
  const attach = (key) => {
    const image = ctx.scene.add.image(0, 0, key).setOrigin(origin[0], origin[1]);
    image.setScale((bw * ctx.w) / image.width, (bh * ctx.h) / image.height);
    holder.add(image);
    onReady?.(image);
  };
  const key = ensurePainted(ctx.scene, url);
  if (key) attach(key);
  else {
    ctx.animate(() => {
      if (holder.list.length || !paintedReady(ctx.scene, url)) return;
      attach(plateKey(url));
    });
  }
  return holder;
}

/**
 * A frame's painted plate drawn by its own draw(): while it floats, and for
 * the dark silhouette it rises from (PanelScene draws `frame.plate` itself
 * only where the frame rests). Returns false when the image is not loaded.
 */
export function paintedFrame(ctx, url) {
  const key = ensurePainted(ctx.scene, url);
  if (!key) return false;
  const src = ctx.scene.textures.get(key).getSourceImage();
  const fit = coverFit(src.width, src.height, ctx.w, ctx.h);
  ctx.add(ctx.scene.add.image(fit.x, fit.y, key).setOrigin(0, 0).setScale(fit.scale));
  return true;
}

/** Pad a tile-normalised box on every side (clamped to the tile). */
export function padBox([x, y, w, h], px = 0.01, py = px) {
  const x0 = Math.max(0, x - px);
  const y0 = Math.max(0, y - py);
  const x1 = Math.min(1, x + w + px);
  const y1 = Math.min(1, y + h + py);
  return [round4(x0), round4(y0), round4(x1 - x0), round4(y1 - y0)];
}

/** A zoom rect (w == h in tile units: the tile's own aspect) of size s centred on a box. */
export function zoomAround([x, y, w, h], s) {
  const cx = x + w / 2;
  const cy = y + h / 2;
  const x0 = Math.min(Math.max(0, cx - s / 2), 1 - s);
  const y0 = Math.min(Math.max(0, cy - s / 2), 1 - s);
  return [round4(x0), round4(y0), round4(s), round4(s)];
}

const round4 = (n) => Math.round(n * 10000) / 10000;
