import Phaser from 'phaser';
import { GAME_W, GAME_H } from '../../constants.js';

/**
 * Chapter 2 polish kit — the atmosphere layer that turns flat geometry into
 * a place. Everything here is procedural: no assets, one bake at boot.
 *
 *   makeFxTextures        glow orb / vignette / light shaft / fog band
 *   applyLens             vignette overlay + WebGL bloom postFX
 *   addFogBands           slow drifting mist strips (screen-space parallax)
 *   addNeonSign           flickering street-level neon with halo + wet floor
 *   addEmbers             rising furnace sparks
 *   addSteam              soft venting puffs
 *   addShaft              a static cone of light (surgical lamp, door spill)
 *   addBeacon             blinking aviation light for far towers
 */

export function makeFxTextures(scene) {
  if (scene.textures.exists('ch2-fx-glow')) return;
  const g = scene.make.graphics({ add: false });

  // Big soft orb — halos, light pools, steam puffs. Radial falloff baked in.
  for (let r = 64; r > 0; r -= 1) {
    const t = 1 - r / 64;
    g.fillStyle(0xffffff, Math.pow(t, 2.4) * 0.9);
    g.fillCircle(64, 64, r);
  }
  g.generateTexture('ch2-fx-glow', 128, 128);
  g.clear();

  // Vignette: transparent center, deep corners. MULTIPLY-blended full-screen.
  {
    const W = 480;
    const H = 300;
    const cx = W / 2;
    const cy = H / 2;
    const maxD = Math.hypot(cx, cy);
    for (let y = 0; y < H; y += 3) {
      for (let x = 0; x < W; x += 3) {
        const d = Math.hypot(x - cx, (y - cy) * 1.25) / maxD;
        const a = Phaser.Math.Clamp((d - 0.52) / 0.48, 0, 1);
        if (a <= 0.01) continue;
        g.fillStyle(0x000000, Math.pow(a, 1.6) * 0.85);
        g.fillRect(x, y, 3, 3);
      }
    }
    g.generateTexture('ch2-fx-vignette', W, H);
    g.clear();
  }

  // Light shaft: bright at the source (top), dissolving downward. Drawn wide
  // so call sites can squash/stretch it into any cone.
  {
    const W = 120;
    const H = 360;
    for (let y = 0; y < H; y += 2) {
      const t = y / H;
      const halfW = 6 + t * 54;
      const a = Math.pow(1 - t, 1.7) * 0.5;
      g.fillStyle(0xffffff, a);
      g.fillRect(W / 2 - halfW, y, halfW * 2, 2);
    }
    g.generateTexture('ch2-fx-shaft', W, H);
    g.clear();
  }

  // Fog band: a long horizontal smear, soft on both axes.
  {
    const W = 512;
    const H = 128;
    for (let y = 0; y < H; y += 2) {
      const v = 1 - Math.abs(y - H / 2) / (H / 2);
      g.fillStyle(0xffffff, Math.pow(Math.max(0, v), 1.8) * 0.32);
      g.fillRect(0, y, W, 2);
    }
    g.generateTexture('ch2-fx-band', W, H);
    g.clear();
  }

  // Gore chunk: a jagged irregular morsel — tintable meat and scrap.
  {
    g.fillStyle(0xffffff, 1);
    g.beginPath();
    const pts = 9;
    for (let i = 0; i <= pts; i++) {
      const a = (i / pts) * Math.PI * 2;
      const r = 20 + ((i * 37) % 13);
      const px = 32 + Math.cos(a) * r;
      const py = 32 + Math.sin(a) * r * 0.8;
      if (i === 0) g.moveTo(px, py);
      else g.lineTo(px, py);
    }
    g.closePath();
    g.fillPath();
    g.generateTexture('ch2-fx-chunk', 64, 64);
    g.clear();
  }

  g.destroy();
}

/**
 * The lens: baked vignette over everything (under the HUD), plus a gentle
 * WebGL bloom so neon and cores bleed light. Canvas renderer just gets the
 * vignette — no crash, no feature detection at call sites.
 */
export function applyLens(scene, { vignette = 0.62, bloomStrength = 0.55 } = {}) {
  makeFxTextures(scene);
  const cam = scene.cameras.main;
  if (scene.sys.renderer.type === Phaser.WEBGL && bloomStrength > 0) {
    const fx = cam.postFX.addBloom(0xffffff, 1, 1, 1.1, bloomStrength, 4);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => fx?.destroy?.());
  }
  const v = scene.add
    .image(GAME_W / 2, GAME_H / 2, 'ch2-fx-vignette')
    .setDisplaySize(GAME_W, GAME_H)
    .setScrollFactor(0)
    .setDepth(55)
    .setAlpha(vignette)
    .setBlendMode(Phaser.BlendModes.MULTIPLY);
  return v;
}

/** Slow mist strips hugging a y-band, drifting on scroll-parallax. */
export function addFogBands(
  scene,
  { count = 4, y0 = 380, y1 = 520, tint = 0x8a99b8, alpha = 0.05, depth = 3, sf = 0.6, speed = 6 } = {},
) {
  makeFxTextures(scene);
  for (let i = 0; i < count; i++) {
    const y = y0 + ((y1 - y0) * i) / Math.max(1, count - 1) + (i % 2) * 14;
    const band = scene.add
      .image(GAME_W * (0.3 + 0.4 * (i % 2)), y, 'ch2-fx-band')
      .setScale(3.2 + (i % 3) * 0.9, 1.1 + (i % 2) * 0.5)
      .setTint(tint)
      .setAlpha(alpha)
      .setScrollFactor(sf)
      .setDepth(depth)
      .setBlendMode(Phaser.BlendModes.ADD);
    scene.tweens.add({
      targets: band,
      x: band.x + (i % 2 === 0 ? 140 : -140),
      alpha: alpha * 1.8,
      duration: 9000 + i * 2600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });
    void speed;
  }
}

/**
 * Street-level neon: dark glass plate, burning letters, halo, flicker, and a
 * wet reflection smear on the ground below. World-space (sf 1) by default.
 */
export function addNeonSign(
  scene,
  { x, y, text, color = '#27e0f5', glow = 0x27e0f5, size = 16, sf = 1, depth = 3, reflectY = null } = {},
) {
  makeFxTextures(scene);
  const lines = text.split('\n');
  const w = Math.max(...lines.map((l) => l.length)) * size * 0.64 + 22;
  const h = lines.length * size * 1.3 + 16;
  const plate = scene.add
    .rectangle(x, y, w, h, 0x05070c, 0.9)
    .setStrokeStyle(1, glow, 0.7)
    .setScrollFactor(sf)
    .setDepth(depth);
  const txt = scene.add
    .text(x, y, text, {
      fontFamily: 'ui-monospace, Menlo, monospace',
      fontSize: `${size}px`,
      color,
      align: 'center',
    })
    .setOrigin(0.5)
    .setScrollFactor(sf)
    .setDepth(depth + 0.1);
  const halo = scene.add
    .image(x, y, 'ch2-fx-glow')
    .setScale(w / 36, h / 20)
    .setTint(glow)
    .setAlpha(0.2)
    .setBlendMode(Phaser.BlendModes.ADD)
    .setScrollFactor(sf)
    .setDepth(depth - 0.1);
  // Hard flicker now and then — failing ballast, never fully dark.
  scene.time.addEvent({
    delay: 1800 + Math.random() * 3200,
    loop: true,
    callback: () => {
      if (!txt.active) return;
      scene.tweens.add({
        targets: [txt, plate, halo],
        alpha: { from: 1, to: 0.35 },
        duration: 55,
        yoyo: true,
        repeat: 2,
      });
    },
  });
  if (reflectY !== null) {
    scene.add
      .image(x, reflectY + 10, 'ch2-fx-glow')
      .setScale(w / 30, 1.1)
      .setTint(glow)
      .setAlpha(0.1)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScrollFactor(sf)
      .setDepth(depth - 0.2);
  }
  return txt;
}

/** Furnace sparks rising from a source line. */
export function addEmbers(
  scene,
  { x, y, spread = 120, tint = 0xff8a3c, depth = 4, frequency = 90 } = {},
) {
  makeFxTextures(scene);
  return scene.add
    .particles(x, y, 'ch2-fx-glow', {
      x: { min: -spread, max: spread },
      speedY: { min: -120, max: -50 },
      speedX: { min: -14, max: 14 },
      scale: { min: 0.04, max: 0.12 },
      alpha: { start: 0.85, end: 0 },
      lifespan: { min: 900, max: 1900 },
      frequency,
      tint,
      blendMode: Phaser.BlendModes.ADD,
    })
    .setDepth(depth);
}

/** Soft venting steam: glow puffs swelling as they rise. */
export function addSteam(scene, { x, y, tint = 0x6a7f96, depth = 4, frequency = 260 } = {}) {
  makeFxTextures(scene);
  return scene.add
    .particles(x, y, 'ch2-fx-glow', {
      speedY: { min: -46, max: -22 },
      speedX: { min: -8, max: 8 },
      scale: { start: 0.25, end: 1.15 },
      alpha: { start: 0.16, end: 0 },
      lifespan: { min: 1600, max: 2600 },
      frequency,
      tint,
      blendMode: Phaser.BlendModes.ADD,
    })
    .setDepth(depth);
}

/** A static cone of light pouring down from a source point. */
export function addShaft(
  scene,
  { x, y, color = 0x9fd8e8, alpha = 0.16, scaleX = 1.6, scaleY = 1, depth = 4, angle = 0 } = {},
) {
  makeFxTextures(scene);
  return scene.add
    .image(x, y, 'ch2-fx-shaft')
    .setOrigin(0.5, 0)
    .setScale(scaleX, scaleY)
    .setTint(color)
    .setAlpha(alpha)
    .setRotation(angle)
    .setBlendMode(Phaser.BlendModes.ADD)
    .setDepth(depth);
}

/** Blinking aviation beacon for far towers — red pulse, slow cycle. */
export function addBeacon(scene, { x, y, sf = 0.15, depth = 1.5, period = 2600 } = {}) {
  makeFxTextures(scene);
  const b = scene.add
    .image(x, y, 'ch2-fx-glow')
    .setScale(0.22)
    .setTint(0xff3c46)
    .setAlpha(0)
    .setBlendMode(Phaser.BlendModes.ADD)
    .setScrollFactor(sf)
    .setDepth(depth);
  scene.tweens.add({
    targets: b,
    alpha: { from: 0, to: 0.85 },
    duration: 260,
    yoyo: true,
    hold: 120,
    repeat: -1,
    repeatDelay: period,
    delay: Math.random() * period,
  });
  return b;
}
