import { PAPER } from './paperPalette.js';
import butchSheetUrl from './assets/butch-pencil/butch-pencil-sheet.png?url';
import { BUTCH_FRAMES, butchPose, createButchMotion } from './paintedPlayerPose.js';

// Shared Chapter 4 protagonist: Butch in pencil, the same drawing Chapter 6's
// Movement IV walks (finalBoss/assets/paper/ch4-butch-walk-0..3.png), firmed
// up for gameplay size by scripts/art/build-chapter4-butch-pencil.py. Every
// room uses this one figure, so the chapter never changes its player
// character between rooms.
//
// Frames: 0-3 the walk (0 is the standing pose), 4 JUMP (rising), 5 FALL.
// The walk advances with distance, not time, so his feet never skate.
// He carries the brush in his front hand and points it at the brush cursor;
// `pointer` is anything with worldX / worldY (the BrushInput), `tipColor`
// whatever the brush is holding.
//
// Round 6 (G2, "animations look unnatural"): the frame is moved by a small
// motion model (paintedPlayerPose.js createButchMotion): walk bob, lean with
// anticipation and follow-through, breathing and weight shift at rest, a
// turn instead of a mirror snap, take-off stretch and landing squash (with
// graphite dust), and a brush arm on a damped spring that scrubs as it
// paints and lets the odd drop of paint fall.

export const BUTCH_SHEET = Object.freeze({ key: 'butch-pencil', url: butchSheetUrl, frameWidth: 50, frameHeight: 82, feetPad: 2 });
export { BUTCH_FRAMES, butchPose };

export function preloadPaintedPlayer(scene) {
  if (!scene.textures.exists(BUTCH_SHEET.key)) {
    scene.load.spritesheet(BUTCH_SHEET.key, BUTCH_SHEET.url, { frameWidth: BUTCH_SHEET.frameWidth, frameHeight: BUTCH_SHEET.frameHeight });
  }
}

export class PaintedPlayer {
  constructor(scene, depth) {
    this.scene = scene;
    this.shadow = scene.add.graphics().setDepth(depth - 0.2);
    this.sprite = scene.add.sprite(0, 0, BUTCH_SHEET.key, 0).setOrigin(0.5, 1).setDepth(depth);
    this.brush = scene.add.graphics().setDepth(depth + 0.1);
    this.fx = scene.add.graphics().setDepth(depth + 0.15);
    this.facing = 1;
    this.stride = 0;
    this.lastX = null;
    this.animation = 'idle';
    this.alpha = 1;
    this.motion = createButchMotion();
    this.groundY = null;
    this.puffs = [];
    this.drops = [];
    this.dropClock = 0;
    this.lastTime = null;
  }

  setAlpha(alpha) {
    this.alpha = alpha;
    [this.shadow, this.sprite, this.brush, this.fx].forEach((obj) => obj.setAlpha(alpha));
    return this;
  }

  setVisible(on) {
    [this.shadow, this.sprite, this.brush, this.fx].forEach((obj) => obj.setVisible(on));
    return this;
  }

  setDepth(depth) {
    this.shadow.setDepth(depth - 0.2);
    this.sprite.setDepth(depth);
    this.brush.setDepth(depth + 0.1);
    this.fx.setDepth(depth + 0.15);
    return this;
  }

  clear() {
    this.brush.clear();
    this.shadow.clear();
    this.fx.clear();
    return this;
  }
}

export function createPaintedPlayer(scene, depth) {
  return new PaintedPlayer(scene, depth);
}

// `opts.lean` (-1..1) leans him further (riding the engine); `opts.velocity`
// overrides the body's (a figure carried by something else).
export function drawPaintedPlayer(figure, walker, pointer, tipColor = PAPER.indigo, opts = {}) {
  const scene = figure.scene;
  const now = scene.time?.now ?? 0;
  const dt = figure.lastTime === null ? 1 / 60 : Math.min(0.1, Math.max(0, (now - figure.lastTime) / 1000));
  figure.lastTime = now;
  const x = walker.x;
  const feetY = walker.y + 29;
  const body = walker.body;
  const grounded = opts.grounded ?? Boolean(body?.blocked?.down || body?.touching?.down);
  const vx = opts.velocity?.x ?? body?.velocity?.x ?? 0;
  const vy = opts.velocity?.y ?? body?.velocity?.y ?? 0;
  if (figure.lastX !== null && grounded) figure.stride += Math.abs(x - figure.lastX) * (opts.strideScale ?? 1);
  figure.lastX = x;
  const pose = butchPose({
    vx,
    vy,
    grounded,
    stride: figure.stride,
    facing: figure.facing,
    aimX: pointer?.worldX ?? null,
    x,
  });
  figure.facing = pose.facing;
  figure.animation = pose.animation;

  const handX = x + figure.motion.state.shownFacing * 7;
  const handY = feetY - 33;
  const aim = Math.atan2((pointer?.worldY ?? handY) - handY, (pointer?.worldX ?? handX + 40) - handX);
  const painting = Boolean(pointer?.paintDown || pointer?.washDown);
  const m = figure.motion.step({
    dt, vx, vy, grounded, facing: pose.facing, animation: pose.animation, frame: pose.frame, stride: figure.stride, aim, painting, lean: opts.lean ?? 0,
  });
  figure.sprite
    .setFrame(m.frame)
    .setFlipX(m.facing < 0)
    .setScale(m.scaleX, m.scaleY)
    .setRotation(m.rotation)
    .setPosition(x, feetY + BUTCH_SHEET.feetPad + m.offsetY);

  // a soft graphite shadow on the ground under him, smaller as he rises
  if (grounded) figure.groundY = feetY;
  const s = figure.shadow;
  s.clear();
  const ground = figure.groundY ?? feetY;
  const height = Math.max(0, ground - feetY);
  const k = Math.max(0.35, 1 - height / 140);
  if (height < 220) s.fillStyle(PAPER.graphite, 0.16 * k).fillEllipse(x, ground + 1, 30 * k, 6 * k);

  // landing dust: two small graphite puffs either side of his feet
  m.events.forEach((event) => {
    if (event.type !== 'land') return;
    [-1, 1].forEach((side) => figure.puffs.push({ x: x + side * 8, y: feetY, vx: side * (30 + 50 * event.strength), t: 0, life: 0.38 + 0.2 * event.strength }));
  });

  // the brush, in his front hand, on a spring toward the cursor
  const g = figure.brush;
  g.clear();
  const hx = x + m.facing * 7 * Math.abs(m.scaleX);
  const hy = feetY - 33 * m.scaleY + m.offsetY;
  const angle = m.arm;
  const len = 26 * m.armReach;
  const tipX = hx + Math.cos(angle) * len;
  const tipY = hy + Math.sin(angle) * len;
  g.lineStyle(3, PAPER.bookCloth, 1);
  g.beginPath();
  g.moveTo(hx - Math.cos(angle) * 5, hy - Math.sin(angle) * 5);
  g.lineTo(hx + Math.cos(angle) * 18 * m.armReach, hy + Math.sin(angle) * 18 * m.armReach);
  g.strokePath();
  g.lineStyle(3.4, PAPER.graphite, 1);
  g.beginPath();
  g.moveTo(hx + Math.cos(angle) * 18 * m.armReach, hy + Math.sin(angle) * 18 * m.armReach);
  g.lineTo(hx + Math.cos(angle) * 21 * m.armReach, hy + Math.sin(angle) * 21 * m.armReach);
  g.strokePath();
  g.fillStyle(tipColor, 0.95);
  g.fillCircle(tipX, tipY, 4.2);
  g.lineStyle(1, PAPER.graphite, 0.6).strokeCircle(tipX, tipY, 4.2);

  // a loaded brush, working, lets the odd drop go
  figure.dropClock += dt;
  if (painting && figure.dropClock > 0.42) {
    figure.dropClock = 0;
    figure.drops.push({ x: tipX, y: tipY + 3, vy: 20, t: 0, color: tipColor });
  }
  drawFx(figure, dt);
}

function drawFx(figure, dt) {
  const g = figure.fx;
  g.clear();
  figure.puffs = figure.puffs.filter((p) => {
    p.t += dt;
    if (p.t >= p.life) return false;
    const k = p.t / p.life;
    p.x += p.vx * dt;
    p.vx *= Math.pow(0.02, dt);
    g.fillStyle(PAPER.graphiteSoft, 0.32 * (1 - k)).fillEllipse(p.x, p.y - 2 - k * 5, 6 + k * 12, 3 + k * 5);
    return true;
  });
  figure.drops = figure.drops.filter((d) => {
    d.t += dt;
    if (d.t > 0.5) return false;
    d.vy += 900 * dt;
    d.y += d.vy * dt;
    g.fillStyle(d.color, 0.85 * (1 - d.t / 0.5)).fillEllipse(d.x, d.y, 2.6, 3.4);
    return true;
  });
}
