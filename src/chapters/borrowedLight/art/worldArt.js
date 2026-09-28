// Chapter 2 · BORROWED LIGHT — world dressing: sky, the graded painted
// panorama, procedural skylines, facades, props, signs, lamps, the train,
// rain, splashes, puddles, mist and the blackout overlay.

import Phaser from 'phaser';
import { DEPTH, HEX, INK, INK_HEX, LINE_COLORS, PALETTE, hashString, rng } from './palette.js';
import {
  FACADE_DEPTH,
  HEADROOM,
  inkLine,
  makeCanvas,
  paintFacade,
  paintFog,
  paintLightBrush,
  paintPuddle,
  paintRadial,
  paintRain,
  paintSign,
  paintSkylineStrip,
  paintSplash,
  paintTrainCar,
  paintWallTile,
} from './paint.js';
import { WORLD } from '../level.js';

const VIEW_W = 1920;
const VIEW_H = 1080;

function addCanvasTexture(scene, key, canvas) {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  scene.textures.addCanvas(key, canvas);
  return key;
}

// ---------------------------------------------------------------------------
// Shared small textures.
export function buildSharedTextures(scene) {
  addCanvasTexture(scene, 'bl-light', paintLightBrush(256));
  addCanvasTexture(scene, 'bl-glow', paintRadial(128, [[0, 'rgba(255,255,255,0.9)'], [0.3, 'rgba(255,255,255,0.35)'], [1, 'rgba(255,255,255,0)']]));
  addCanvasTexture(scene, 'bl-rain-far', paintRain({ count: 320, len: [10, 22], alpha: [0.05, 0.16], width: 0.8, seed: 3 }));
  addCanvasTexture(scene, 'bl-rain-mid', paintRain({ count: 170, len: [22, 46], alpha: [0.08, 0.22], width: 1.1, seed: 7 }));
  addCanvasTexture(scene, 'bl-rain-near', paintRain({ count: 60, len: [60, 120], alpha: [0.1, 0.26], width: 1.8, seed: 11 }));
  addCanvasTexture(scene, 'bl-fog', paintFog({ seed: 4 }));
  addCanvasTexture(scene, 'bl-splash', paintSplash());
  addCanvasTexture(scene, 'bl-puddle', paintPuddle(180, 16));
  addCanvasTexture(scene, 'bl-puddle-s', paintPuddle(96, 11));
  const px = makeCanvas(4, 4);
  const pctx = px.getContext('2d');
  pctx.fillStyle = '#ffffff';
  pctx.fillRect(0, 0, 4, 4);
  addCanvasTexture(scene, 'bl-px', px);
  // Sky: deep teal-navy with a warm haze low on the horizon (the city's
  // borrowed light) and a cold break in the clouds.
  const sky = makeCanvas(8, 540);
  const sctx = sky.getContext('2d');
  const g = sctx.createLinearGradient(0, 0, 0, 540);
  g.addColorStop(0, '#05080d');
  g.addColorStop(0.45, '#0b1520');
  g.addColorStop(0.78, '#15222a');
  g.addColorStop(1, '#2a2622');
  sctx.fillStyle = g;
  sctx.fillRect(0, 0, 8, 540);
  addCanvasTexture(scene, 'bl-sky', sky);
  // Cloud band.
  const clouds = makeCanvas(1024, 300);
  const cctx = clouds.getContext('2d');
  const r = rng(21);
  for (let i = 0; i < 90; i += 1) {
    const cx = r() * 1024;
    const cy = 40 + r() * 220;
    const rad = 40 + r() * 140;
    for (const ox of [-1024, 0, 1024]) {
      const cg = cctx.createRadialGradient(cx + ox, cy, 0, cx + ox, cy, rad);
      cg.addColorStop(0, `rgba(70,86,96,${0.05 + r() * 0.08})`);
      cg.addColorStop(1, 'rgba(70,86,96,0)');
      cctx.fillStyle = cg;
      cctx.fillRect(cx + ox - rad, cy - rad, rad * 2, rad * 2);
    }
  }
  addCanvasTexture(scene, 'bl-clouds', clouds);
}

// The world-04 painted panorama, graded darker and colder so it sits far
// behind the rain: desaturated, dimmed, a little soft, tinted toward teal.
export function gradePanorama(scene, keys) {
  const graded = [];
  keys.forEach((key, index) => {
    if (!scene.textures.exists(key)) return;
    const src = scene.textures.get(key).getSourceImage();
    const scale = 0.5;
    const canvas = makeCanvas(src.width * scale, src.height * scale);
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    try { ctx.filter = 'saturate(0.34) brightness(0.8) contrast(0.9) blur(1.1px)'; } catch { /* no canvas filter */ }
    ctx.drawImage(src, 0, 0, canvas.width, canvas.height);
    ctx.filter = 'none';
    // Cold grade + a veil of rain haze that thickens toward the ground.
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = 'rgb(120,150,165)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = 'source-over';
    const veil = ctx.createLinearGradient(0, 0, 0, canvas.height);
    veil.addColorStop(0, 'rgba(8,14,20,0.4)');
    veil.addColorStop(0.5, 'rgba(18,28,34,0.16)');
    veil.addColorStop(1, 'rgba(40,52,58,0.55)');
    ctx.fillStyle = veil;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // Feather the top edge into the sky so there is no seam.
    ctx.globalCompositeOperation = 'destination-out';
    const feather = ctx.createLinearGradient(0, 0, 0, canvas.height * 0.3);
    feather.addColorStop(0, 'rgba(0,0,0,1)');
    feather.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = feather;
    ctx.fillRect(0, 0, canvas.width, canvas.height * 0.3);
    ctx.globalCompositeOperation = 'source-over';
    graded.push(addCanvasTexture(scene, `bl-pano-${index}`, canvas));
  });
  return graded;
}

// ---------------------------------------------------------------------------
// Background layers. Returns { panorama: [], far: [], mid: [], sky, clouds }.
export function buildBackground(scene, panoramaKeys) {
  const layers = { panorama: [], far: [], mid: [] };
  layers.sky = scene.add.image(0, 0, 'bl-sky').setOrigin(0).setScrollFactor(0).setDisplaySize(VIEW_W, VIEW_H).setDepth(DEPTH.sky);
  layers.clouds = scene.add.tileSprite(0, 40, VIEW_W, 300, 'bl-clouds').setOrigin(0).setScrollFactor(0).setDepth(DEPTH.sky + 1).setAlpha(0.9);

  // Painted panorama at scroll 0.1: ~2000 px of travel across the chapter.
  const graded = gradePanorama(scene, panoramaKeys);
  let px = -200;
  const panoScale = 1.9; // graded canvases are half size
  graded.forEach((key) => {
    const img = scene.add.image(px, 150, key).setOrigin(0, 0).setScale(panoScale).setScrollFactor(0.1, 0.04).setDepth(DEPTH.panorama);
    layers.panorama.push(img);
    px += img.displayWidth - 4;
  });

  // Far skyline (scroll 0.25) and mid skyline (scroll 0.5), painted strips.
  const strip = (key, seed, tone, windows, baseY) => addCanvasTexture(scene, key, paintSkylineStrip({ seed, tone, windows, baseY }));
  const farKeys = [strip('bl-far-0', 31, 0.78, 0.1, 0.34), strip('bl-far-1', 32, 0.78, 0.1, 0.4), strip('bl-far-2', 33, 0.78, 0.12, 0.3)];
  const midKeys = [strip('bl-mid-0', 41, 0.42, 0.14, 0.46), strip('bl-mid-1', 42, 0.42, 0.14, 0.4), strip('bl-mid-2', 43, 0.42, 0.16, 0.5)];
  const place = (keys, factor, y, depth, list, alpha) => {
    const span = WORLD.width * factor + VIEW_W + 800;
    let x = -400;
    let i = 0;
    while (x < span) {
      const img = scene.add.image(x, y, keys[i % keys.length]).setOrigin(0).setScrollFactor(factor, factor * 0.35).setDepth(depth).setAlpha(alpha);
      if (i % 2 === 1) img.setFlipX(true);
      list.push(img);
      x += 2048 - 2;
      i += 1;
    }
  };
  place(farKeys, 0.25, 280, DEPTH.far, layers.far, 1);
  place(midKeys, 0.5, 380, DEPTH.mid, layers.mid, 1);
  return layers;
}

// ---------------------------------------------------------------------------
// Facades + bodies for roofs and ledges.
function paintLedge(platform) {
  const w = platform.w;
  const h = platform.h ?? 34;
  const canvas = makeCanvas(w + 8, h + 30);
  const ctx = canvas.getContext('2d');
  const r = rng(hashString(platform.id));
  const x0 = 4;
  if (platform.style === 'ac') {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#2a363a');
    g.addColorStop(1, '#141b1e');
    ctx.fillStyle = g;
    ctx.fillRect(x0, 0, w, h);
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath(); ctx.arc(x0 + w * 0.62, h * 0.52, h * 0.34, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(160,190,190,0.25)';
    ctx.lineWidth = 1;
    for (let a = 0; a < 6; a += 1) {
      ctx.beginPath();
      ctx.moveTo(x0 + w * 0.62, h * 0.52);
      ctx.lineTo(x0 + w * 0.62 + Math.cos(a) * h * 0.32, h * 0.52 + Math.sin(a) * h * 0.32);
      ctx.stroke();
    }
    for (let gy = 8; gy < h - 6; gy += 5) { ctx.beginPath(); ctx.moveTo(x0 + 6, gy); ctx.lineTo(x0 + w * 0.34, gy); ctx.stroke(); }
    ctx.fillStyle = '#0c1012';
    ctx.fillRect(x0 + 6, h, 8, 30); ctx.fillRect(x0 + w - 14, h, 8, 30);
  } else if (platform.style === 'pipe') {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#3a3a36');
    g.addColorStop(0.5, '#1d1d1b');
    g.addColorStop(1, '#0d0d0c');
    ctx.fillStyle = g;
    ctx.fillRect(x0, 0, w, h);
    ctx.fillStyle = '#0a0a09';
    for (let bx = x0 + 10; bx < x0 + w; bx += 40) ctx.fillRect(bx, -2, 6, h + 4);
    ctx.fillRect(x0 + w / 2 - 4, h, 8, 30);
  } else {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#3a3129');
    g.addColorStop(1, '#17120e');
    ctx.fillStyle = g;
    ctx.fillRect(x0, 0, w, h);
    ctx.fillStyle = '#0c0907';
    ctx.beginPath(); ctx.moveTo(x0 + 20, h); ctx.lineTo(x0 + 40, h + 28); ctx.lineTo(x0 + 48, h); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x0 + w - 20, h); ctx.lineTo(x0 + w - 40, h + 28); ctx.lineTo(x0 + w - 48, h); ctx.fill();
  }
  inkLine(ctx, x0, 1.5, x0 + w, 1.5, { width: 2.4, alpha: 0.85, r });
  inkLine(ctx, x0, 2, x0, h * 0.8, { width: 1.4, alpha: 0.45, r });
  inkLine(ctx, x0 + w, 2, x0 + w, h * 0.8, { width: 1.4, alpha: 0.45, r });
  return { canvas, originX: 4, originY: 0 };
}

export function buildPlatformArt(scene, platform, { blackout = false, exclude = [] } = {}) {
  const seed = hashString(platform.id);
  const objects = [];
  if (platform.kind === 'ledge') {
    const { canvas, originX } = paintLedge(platform);
    const key = addCanvasTexture(scene, `bl-ledge-${platform.id}`, canvas);
    objects.push(scene.add.image(platform.x - originX, platform.y, key).setOrigin(0).setDepth(DEPTH.building + 1));
    return { objects, x0: platform.x - 20, x1: platform.x + platform.w + 20 };
  }
  const { canvas, originX, originY, facadeH } = paintFacade(platform, { seed, blackout, exclude });
  const key = addCanvasTexture(scene, `bl-facade-${platform.id}`, canvas);
  objects.push(scene.add.image(platform.x - originX, platform.y - originY, key).setOrigin(0).setDepth(DEPTH.building));
  const wallTop = platform.y + facadeH;
  const bottom = platform.bottom ?? WORLD.bottom;
  if (bottom > wallTop + 4 && !platform.bottom) {
    const tileKey = `bl-wall-${platform.style}`;
    if (!scene.textures.exists(tileKey)) addCanvasTexture(scene, tileKey, paintWallTile(platform.style, seed));
    objects.push(scene.add.tileSprite(platform.x, wallTop, platform.w, bottom - wallTop, tileKey).setOrigin(0).setDepth(DEPTH.building - 0.5));
  }
  return { objects, x0: platform.x - 30, x1: platform.x + platform.w + 30 };
}

// ---------------------------------------------------------------------------
// Puddles on roofs (reflections), with a shimmer driven by update().
export function buildPuddles(scene, platforms) {
  const puddles = [];
  platforms.forEach((platform) => {
    if (platform.kind !== 'roof' || platform.hidden || platform.w < 300 || ['gantry', 'stairhead', 'plantroom'].includes(platform.style)) return;
    const r = rng(hashString(`${platform.id}-puddle`));
    const n = platform.w > 700 ? 2 : 1;
    for (let i = 0; i < n; i += 1) {
      const small = r() < 0.5;
      const x = platform.x + 80 + r() * (platform.w - 260);
      const img = scene.add.image(x, platform.y + 3, small ? 'bl-puddle-s' : 'bl-puddle').setOrigin(0, 0.5).setDepth(DEPTH.prop + 0.5).setAlpha(0.75);
      puddles.push({ img, phase: r() * 10, x0: x, x1: x + 180 });
    }
  });
  return puddles;
}

// ---------------------------------------------------------------------------
// Neon signs (die in the blackout).
export function buildSigns(scene, signs) {
  return signs.map((sign) => {
    const color = LINE_COLORS[sign.color];
    const h = sign.layer === 'hotel' ? 110 : 60;
    const onKey = addCanvasTexture(scene, `bl-sign-on-${sign.text}`, paintSign(sign.text, color.css, { w: sign.w, h, lit: true }));
    const offKey = addCanvasTexture(scene, `bl-sign-off-${sign.text}`, paintSign(sign.text, color.css, { w: sign.w, h, lit: false }));
    const depth = DEPTH.sign;
    const glow = scene.add.image(sign.x, sign.y + h / 2 + 30, 'bl-glow').setDepth(depth - 0.2).setTint(color.hex).setBlendMode(Phaser.BlendModes.ADD).setDisplaySize(sign.w * 1.9, h * 3.4).setAlpha(0.35);
    const img = scene.add.image(sign.x, sign.y, onKey).setOrigin(0.5, 0).setDepth(depth);
    // Hanging brackets.
    const g = scene.add.graphics().setDepth(depth - 0.1);
    g.lineStyle(3, 0x0b0907, 1);
    g.lineBetween(sign.x - sign.w * 0.35, sign.y + 30, sign.x - sign.w * 0.35, sign.y - 40);
    g.lineBetween(sign.x + sign.w * 0.35, sign.y + 30, sign.x + sign.w * 0.35, sign.y - 40);
    return { ...sign, img, glow, g, onKey, offKey, lit: true, x0: sign.x - sign.w, x1: sign.x + sign.w, flickerSeed: hashString(sign.text) % 100 };
  });
}

// ---------------------------------------------------------------------------
// Street lamps: the checkpoints.
export function buildLamp(scene, lamp) {
  const g = scene.add.graphics().setDepth(DEPTH.prop + 1);
  const x = lamp.x;
  const y = lamp.y;
  g.fillStyle(0x0c0907, 1);
  g.fillRect(x - 3, y - 170, 6, 170);
  g.fillRect(x - 9, y - 6, 18, 6);
  g.fillRect(x - 3, y - 172, 34, 5);
  g.fillStyle(0x19120d, 1);
  g.fillTriangle(x + 18, y - 168, x + 40, y - 168, x + 29, y - 180);
  g.lineStyle(1.4, INK_HEX, 0.4);
  g.lineBetween(x - 3, y - 170, x - 3, y - 20);
  const head = scene.add.image(x + 29, y - 160, 'bl-px').setDisplaySize(16, 12).setTint(0x3a2a18).setDepth(DEPTH.prop + 1.1);
  const glow = scene.add.image(x + 29, y - 150, 'bl-glow').setDisplaySize(300, 300).setTint(0xf2c27a).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0).setDepth(DEPTH.fx);
  const cone = scene.add.graphics().setDepth(DEPTH.fx - 0.5).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
  cone.fillStyle(0xf2c27a, 0.08);
  cone.fillTriangle(x + 29, y - 156, x - 50, y, x + 110, y);
  cone.fillStyle(0xf2c27a, 0.06);
  cone.fillEllipse(x + 29, y + 2, 180, 14);
  return { ...lamp, g, head, glow, cone, lit: false, x0: x - 120, x1: x + 150 };
}

export function setLampLit(lamp, lit, scene) {
  lamp.lit = lit;
  lamp.head.setTint(lit ? 0xffd08a : 0x3a2a18);
  if (scene && lit) {
    scene.tweens.add({ targets: [lamp.glow], alpha: 0.55, duration: 380, ease: 'Sine.easeOut' });
    scene.tweens.add({ targets: [lamp.cone], alpha: 1, duration: 380, ease: 'Sine.easeOut' });
  } else {
    lamp.glow.setAlpha(lit ? 0.55 : 0);
    lamp.cone.setAlpha(lit ? 1 : 0);
  }
}

// ---------------------------------------------------------------------------
// The train (title-screen livery). Returns a container and its door x.
export function buildTrain(scene, { x, y, cars = 3, key = 'start' }) {
  const container = scene.add.container(x, y).setDepth(DEPTH.train);
  const carW = 760;
  const carKeys = [];
  for (let i = 0; i < cars; i += 1) {
    const k = `bl-train-${key}-${i}`;
    addCanvasTexture(scene, k, paintTrainCar({ w: carW, h: 250, seed: 4 + i, lead: i === cars - 1, door: i === 0 }));
    carKeys.push(k);
  }
  // Car canvas: 10 px pad, 20 px roof pad; floor line ≈ 20 + 250 - 16.
  carKeys.forEach((k, i) => {
    const img = scene.add.image(i * (carW + 8), 0, k).setOrigin(0, 1);
    container.add(img);
  });
  // Couplings.
  const g = scene.add.graphics();
  g.fillStyle(0x0b0b0c, 1);
  for (let i = 1; i < cars; i += 1) g.fillRect(i * (carW + 8) - 14, -70, 20, 30);
  container.add(g);
  // The door: a dark panel that slides open, and the warm interior behind.
  const doorX = 10 + carW * 0.5 - 34;
  const interior = scene.add.image(doorX, -46, 'bl-px').setOrigin(0, 1).setDisplaySize(68, 184).setTint(0xf0b865).setAlpha(0);
  const door = scene.add.image(doorX, -46, 'bl-px').setOrigin(0, 1).setDisplaySize(68, 184).setTint(0x6a2c19).setAlpha(0);
  container.add([interior, door]);
  const spill = scene.add.image(x + doorX + 34, y - 40, 'bl-glow').setDisplaySize(360, 220).setTint(0xf2c27a).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0).setDepth(DEPTH.fx);
  // Headlight glow at the lead end.
  const head = scene.add.image(x + cars * (carW + 8) - 30, y - 90, 'bl-glow').setDisplaySize(420, 260).setTint(0xf2c27a).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.35).setDepth(DEPTH.fx);
  return {
    container,
    interior,
    door,
    spill,
    head,
    doorOffset: doorX + 34,
    length: cars * (carW + 8),
    get doorWorldX() { return container.x + doorX + 34; },
    setDoorOpen(open) {
      interior.setAlpha(open ? 1 : 0);
      door.setAlpha(open ? 0 : 0);
      spill.setAlpha(open ? 0.55 : 0);
    },
    sync() {
      spill.x = container.x + doorX + 34;
      spill.y = container.y - 40;
      head.x = container.x + cars * (carW + 8) - 30;
      head.y = container.y - 90;
    },
  };
}

// ---------------------------------------------------------------------------
// Rain, splashes and mist.
export function buildWeather(scene) {
  const far = scene.add.tileSprite(0, 0, VIEW_W, VIEW_H, 'bl-rain-far').setOrigin(0).setScrollFactor(0).setDepth(DEPTH.rainFar).setAlpha(0.7);
  const mid = scene.add.tileSprite(0, 0, VIEW_W, VIEW_H, 'bl-rain-mid').setOrigin(0).setScrollFactor(0).setDepth(DEPTH.rainMid).setAlpha(0.65);
  const near = scene.add.tileSprite(0, 0, VIEW_W, VIEW_H, 'bl-rain-near').setOrigin(0).setScrollFactor(0).setDepth(DEPTH.rainNear).setAlpha(0.5);
  // Each mist band is exactly one texture period tall, so the feathered top
  // never repeats inside the band.
  const mistBack = scene.add.tileSprite(-600, WORLD.mistY - 180, WORLD.width + 1200, 512, 'bl-fog').setOrigin(0).setDepth(DEPTH.mistBack).setAlpha(0.8).setTileScale(1.6, 2);
  const mistFront = scene.add.tileSprite(-600, WORLD.mistY + 10, WORLD.width + 1200, 460, 'bl-fog').setOrigin(0).setDepth(DEPTH.mistFront).setAlpha(0.95).setTileScale(2.2, 1.8);
  // A dark floor under the mist so the alleys read as a drop, not a void.
  const floor = scene.add.image(-600, WORLD.mistY + 100, 'bl-px').setOrigin(0).setDisplaySize(WORLD.width + 1200, 800).setTint(0x0a1115).setDepth(DEPTH.mistBack - 0.5);
  const splashes = [];
  for (let i = 0; i < 44; i += 1) {
    splashes.push({ img: scene.add.image(0, 0, 'bl-splash').setOrigin(0.5, 1).setDepth(DEPTH.fx - 1).setVisible(false), life: 0 });
  }
  return { far, mid, near, mistBack, mistFront, floor, splashes };
}

// ---------------------------------------------------------------------------
// Blackout overlay: a screen-space render texture filled dark each frame with
// light brushes erased out of it.
export function buildDarkness(scene) {
  const rt = scene.add.renderTexture(0, 0, VIEW_W, VIEW_H).setOrigin(0).setScrollFactor(0).setDepth(DEPTH.dark).setVisible(false);
  const brush = scene.make.image({ x: 0, y: 0, key: 'bl-light', add: false }).setOrigin(0.5);
  const rim = scene.add.graphics().setDepth(DEPTH.rim);
  const rimDyn = scene.add.graphics().setDepth(DEPTH.rim + 0.5);
  const flash = scene.add.image(0, 0, 'bl-px').setOrigin(0).setScrollFactor(0).setDisplaySize(VIEW_W, VIEW_H).setTint(0xb8c8d0).setAlpha(0).setDepth(DEPTH.dark + 1).setBlendMode(Phaser.BlendModes.ADD);
  return { rt, brush, rim, rimDyn, flash, alpha: 0 };
}

// Static faint rims on visible platform edges for the blackout (drawn above
// the dark overlay so edges stay readable).
export function drawBlackoutRims(g, platforms) {
  g.clear();
  platforms.forEach((platform) => {
    if (platform.hidden) return;
    g.lineStyle(2, INK_HEX, 0.26);
    g.lineBetween(platform.x - 6, platform.y + 1, platform.x + platform.w + 6, platform.y + 1);
    g.lineStyle(1.4, INK_HEX, 0.12);
    g.lineBetween(platform.x - 6, platform.y + 1, platform.x - 6, platform.y + 60);
    g.lineBetween(platform.x + platform.w + 6, platform.y + 1, platform.x + platform.w + 6, platform.y + 60);
  });
}

export { PALETTE, HEX, INK, HEADROOM, FACADE_DEPTH };
