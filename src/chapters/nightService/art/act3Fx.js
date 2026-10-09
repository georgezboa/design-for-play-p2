// Act 3 presentation effects (see README.md → Custom fx).

import { CITY_GLASS, CLOSE, ORCHARD_LIT, PATH_AT, PLATE } from './act3Art.js';
import { plateKey } from '../panelModel.js';

export const ACT3_FX = {
  /** The city window closes around the orchard window: light floods one picture. */
  windowsJoin(api) {
    const view = api.view('orchard');
    const [gx, gy, gw, gh] = CITY_GLASS;
    const pane = api.scene.add.rectangle(gx * view.w, gy * view.h, gw * view.w, gh * view.h, 0xffd9a0, 0).setOrigin(0, 0).setBlendMode('ADD');
    view.fxLayer.add(pane);
    api.scene.tweens.add({ targets: pane, alpha: 0.35, duration: 700, yoyo: true, hold: 300, ease: 'Sine.easeInOut', onComplete: () => pane.destroy() });
    api.flash('orchard', ORCHARD_LIT[0] + ORCHARD_LIT[2] / 2, ORCHARD_LIT[1] + ORCHARD_LIT[3] / 2, { color: 0xffd28a, size: 220, duration: 1400 });
    const a = api.screen('orchard', gx, gy);
    const b = api.screen('orchard', gx + gw, gy + gh);
    api.lightRun([a, { x: b.x, y: a.y }, b, { x: a.x, y: b.y }, a], { duration: 1200, color: 0xffe0a8 });
    api.audio.play('reveal');
  },

  /** Mara's silhouette in the lit window: she turns, and leaves the frame. */
  maraWindow(api) {
    const view = api.view('orchard');
    // in the orchard house's lit upstairs window (the painted one), at its size
    const [lx, ly, lw, lh] = ORCHARD_LIT;
    const x = (lx + lw / 2) * view.w;
    const y = (ly + lh * 0.62) * view.h;
    const k = ((lh * view.h) / 90) * 0.95;
    const key = 'nsv-mara-bust';
    if (!api.scene.textures.exists(key)) {
      const tex = api.scene.textures.createCanvas(key, 90, 90);
      const c = tex.getContext();
      c.fillStyle = 'rgba(18, 12, 10, 0.92)';
      c.beginPath(); c.ellipse(45, 30, 13, 15, 0, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.moveTo(18, 90); c.quadraticCurveTo(22, 50, 45, 46); c.quadraticCurveTo(68, 50, 72, 90); c.closePath(); c.fill();
      // a headscarf knot and the line of a collar
      c.beginPath(); c.ellipse(57, 38, 5, 4, 0.4, 0, Math.PI * 2); c.fill();
      tex.refresh();
    }
    const bust = api.scene.add.image(x, y, key).setAlpha(0).setScale(k);
    view.fxLayer.add(bust);
    api.scene.tweens.chain({
      targets: bust,
      tweens: [
        { alpha: 1, duration: 700, ease: 'Sine.easeOut' },
        { alpha: 1, duration: 600 },
        { scaleX: -k, duration: 380, ease: 'Sine.easeInOut' },
        { alpha: 1, duration: 500 },
        { x: x + lw * view.w * 0.9, alpha: 0, duration: 900, ease: 'Sine.easeIn', onComplete: () => bust.destroy() },
      ],
    });
    api.audio.play('paper');
  },

  /**
   * The finale: a light runs the whole line Mara and the train took (lane ->
   * stair -> rails), blooming at every joint; then every link from Acts 1-2
   * rises as an ember off the brass trim.
   */
  memoryLights(api) {
    const { model, scene } = api;
    const rank = { floor: 0, path: 0, stair: 1, drop: 1, chute: 1, rail: 2 };
    const joint = (l) => {
      const ra = model.slotRect(l.a);
      const rb = model.slotRect(l.b);
      if (l.dir === 'h') {
        const [left, right] = ra.x < rb.x ? [ra, rb] : [rb, ra];
        return { x: (left.x + left.w + right.x) / 2, y: left.y + left.h * l.at };
      }
      const [upper, lower] = ra.y < rb.y ? [ra, rb] : [rb, ra];
      return { x: upper.x + upper.w * l.at, y: (upper.y + upper.h + lower.y) / 2 };
    };
    const current = model.links();
    const points = current
      .map((l) => ({ ...joint(l), rank: rank[l.type] ?? 3 }))
      .sort((a, b) => a.rank - b.rank || a.x - b.x);
    if (!points.length) return;
    const route = [api.screen('city', 0.6, PATH_AT), ...points];
    let total = 0;
    const at = [0];
    for (let i = 1; i < route.length; i += 1) {
      total += Math.hypot(route[i].x - route[i - 1].x, route[i].y - route[i - 1].y);
      at.push(total);
    }
    const duration = Math.max(3200, total * 2.6);
    api.lightRun(route, { duration, color: 0xffe2a8, trail: 90 });
    api.audio.play('reveal');
    points.forEach((p, i) => {
      scene.time.delayedCall((at[i + 1] / total) * duration, () => {
        const bloom = scene.add.image(p.x, p.y, 'nsv-radial').setBlendMode('ADD').setTint(0xffd08a).setDisplaySize(40, 40).setAlpha(0.95);
        api.top.add(bloom);
        scene.tweens.add({ targets: bloom, displayWidth: 220, displayHeight: 220, alpha: 0, duration: 1300, ease: 'Sine.easeOut', onComplete: () => bloom.destroy() });
        api.sparkle(p.x, p.y, 10);
        api.audio.play('chime');
      });
    });
    // the earlier acts' links: embers rising off the trim, one per link
    const keys = new Set(current.map((l) => l.key));
    const earlier = model.state.linkHistory.filter((h) => !keys.has(h.key));
    const layout = model.layout;
    earlier.forEach((_, i) => {
      const x = layout.x + layout.w * ((i + 0.5) / earlier.length);
      const y = layout.y + layout.h + 18;
      scene.time.delayedCall(duration + 200 + i * 260, () => {
        const ember = scene.add.image(x, y, 'nsv-radial').setBlendMode('ADD').setTint(0xffb060).setDisplaySize(60, 60).setAlpha(0.9);
        api.top.add(ember);
        scene.tweens.add({ targets: ember, y: y - 150 - Math.random() * 60, alpha: 0, duration: 1800, ease: 'Sine.easeOut', onComplete: () => ember.destroy() });
        api.sparkle(x, y, 5);
      });
    });
  },

  /**
   * The farewell's camera move (round 8): the figures standing in the wide
   * platform go with the picture they stood in. The scene hides a tile's
   * actors while it zooms; these copies ride the zoom (the tile's fx layer
   * shares its camera) and fade with the wide picture.
   */
  holdActors(api, { tile, actors = [], over = 2600 }) {
    const view = api.view(tile);
    if (!view) return;
    const copies = [];
    actors.forEach((id) => {
      const rig = api.rig(id);
      const actor = api.model.state.actors[id];
      if (!rig?.root || !actor?.visible || actor.tile !== tile) return;
      const copy = cloneDisplay(api.scene, rig.root);
      if (!copy) return;
      view.fxLayer.add(copy);
      copies.push(copy);
    });
    if (!copies.length) return;
    // they fade exactly as the wide picture they stood in does (the zoom's
    // outgoing layer), and never outlive the move
    const scene = api.scene;
    const start = scene.time.now;
    let zoomed = false;
    const tick = () => {
      zoomed = zoomed || view.zooming;
      const parent = view.zooming ? view.stateLayer.list.find((root) => root !== view.current?.root) : null;
      const alpha = parent ? parent.alpha : zoomed ? 0 : 1;
      copies.forEach((copy) => copy.setAlpha(alpha));
      if ((zoomed && !view.zooming) || scene.time.now - start > over * 4) {
        copies.forEach((copy) => copy.destroy());
        scene.events.off('update', tick);
      }
    };
    scene.events.on('update', tick);
  },

  /** Butch sets the orchard case down on the bench, his hand lingering on it. */
  leaveCase(api) {
    const rig = api.rig('butch');
    rig?.gesture?.('receive');
    const key = plateKey(PLATE['close-case']);
    if (!api.scene.textures.exists(key)) return;
    const [cx, cy, cw, ch] = CLOSE.case;
    const a = api.screen('platform', cx, cy);
    const b = api.screen('platform', cx + cw, cy + ch);
    const to = { x: (a.x + b.x) / 2, y: b.y };
    // from his hands (the painted carry frame's case), set down on the seat
    const from = api.rigPoint('butch', 8, -34);
    const sprite = api.topSprite(key, from.x, from.y + (b.y - a.y) / 2);
    sprite.setOrigin(0.5, 1).setDisplaySize(b.x - a.x, b.y - a.y);
    api.scene.tweens.add({ targets: sprite, x: to.x, duration: 520, ease: 'Sine.easeInOut' });
    api.scene.tweens.add({ targets: sprite, y: to.y, duration: 520, ease: 'Quad.easeIn', onComplete: () => api.scene.time.delayedCall(80, () => sprite.destroy()) });
  },

  /** Mara steps up into the lit doorway and is gone. */
  boardTrain(api, { actor = 'maraClose', over = 650 }) {
    const rig = api.rig(actor);
    if (!rig?.root) return;
    api.scene.tweens.add({ targets: rig.root, alpha: 0, duration: over, ease: 'Sine.easeIn', onComplete: () => rig.root.setAlpha(1) });
    api.audio.play('paper');
  },
};

/** A still copy of a figure (images and containers) for the zoom to carry. */
function cloneDisplay(scene, obj) {
  if (!obj?.visible) return null;
  if (obj.type === 'Container') {
    const box = scene.add.container(obj.x, obj.y).setScale(obj.scaleX, obj.scaleY).setRotation(obj.rotation).setAlpha(obj.alpha);
    obj.list.forEach((child) => { const copy = cloneDisplay(scene, child); if (copy) box.add(copy); });
    return box;
  }
  if (obj.type === 'Image' || obj.type === 'Sprite') {
    const image = scene.add.image(obj.x, obj.y, obj.texture.key, obj.frame.name);
    image.setOrigin(obj.originX, obj.originY).setScale(obj.scaleX, obj.scaleY).setRotation(obj.rotation).setAlpha(obj.alpha).setFlip(obj.flipX, obj.flipY);
    image.setBlendMode(obj.blendMode);
    if (obj.isTinted) image.setTint(obj.tintTopLeft, obj.tintTopRight, obj.tintBottomLeft, obj.tintBottomRight);
    return image;
  }
  return null;
}
