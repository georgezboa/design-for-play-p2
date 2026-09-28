// Act 3 presentation effects (see README.md → Custom fx).

import { CITY_GLASS, WINDOW_CENTRE } from './act3Art.js';

export const ACT3_FX = {
  /** The city window closes around the orchard window: light floods one picture. */
  windowsJoin(api) {
    const view = api.view('orchard');
    const [gx, gy, gw, gh] = CITY_GLASS;
    const pane = api.scene.add.rectangle(gx * view.w, gy * view.h, gw * view.w, gh * view.h, 0xffd9a0, 0).setOrigin(0, 0).setBlendMode('ADD');
    view.fxLayer.add(pane);
    api.scene.tweens.add({ targets: pane, alpha: 0.35, duration: 700, yoyo: true, hold: 300, ease: 'Sine.easeInOut', onComplete: () => pane.destroy() });
    api.flash('orchard', WINDOW_CENTRE.x, WINDOW_CENTRE.y, { color: 0xffd28a, size: 300, duration: 1400 });
    const a = api.screen('orchard', gx, gy);
    const b = api.screen('orchard', gx + gw, gy + gh);
    api.lightRun([a, { x: b.x, y: a.y }, b, { x: a.x, y: b.y }, a], { duration: 1200, color: 0xffe0a8 });
    api.audio.play('reveal');
  },

  /** Mara's silhouette in the lit window: she turns, and leaves the frame. */
  maraWindow(api) {
    const view = api.view('orchard');
    const x = WINDOW_CENTRE.x * view.w;
    const y = (WINDOW_CENTRE.y + 0.06) * view.h;
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
    const bust = api.scene.add.image(x, y, key).setAlpha(0).setScale(0.95);
    view.fxLayer.add(bust);
    api.scene.tweens.chain({
      targets: bust,
      tweens: [
        { alpha: 1, duration: 700, ease: 'Sine.easeOut' },
        { alpha: 1, duration: 600 },
        { scaleX: -0.95, duration: 380, ease: 'Sine.easeInOut' },
        { alpha: 1, duration: 500 },
        { x: x + 34, alpha: 0, duration: 900, ease: 'Sine.easeIn', onComplete: () => bust.destroy() },
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
    const route = [api.screen('city', 0.6, 0.62), ...points];
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
};
