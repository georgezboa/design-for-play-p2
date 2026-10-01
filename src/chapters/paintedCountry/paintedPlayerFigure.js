import { PAPER } from './paperPalette.js';
import butchSheetUrl from './assets/butch-pencil/butch-pencil-sheet.png?url';
import { BUTCH_FRAMES, butchPose } from './paintedPlayerPose.js';

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
    this.facing = 1;
    this.stride = 0;
    this.lastX = null;
    this.animation = 'idle';
    this.alpha = 1;
  }

  setAlpha(alpha) {
    this.alpha = alpha;
    [this.shadow, this.sprite, this.brush].forEach((obj) => obj.setAlpha(alpha));
    return this;
  }

  setVisible(on) {
    [this.shadow, this.sprite, this.brush].forEach((obj) => obj.setVisible(on));
    return this;
  }

  setDepth(depth) {
    this.shadow.setDepth(depth - 0.2);
    this.sprite.setDepth(depth);
    this.brush.setDepth(depth + 0.1);
    return this;
  }

  clear() {
    this.brush.clear();
    this.shadow.clear();
    return this;
  }
}

export function createPaintedPlayer(scene, depth) {
  return new PaintedPlayer(scene, depth);
}

export function drawPaintedPlayer(figure, walker, pointer, tipColor = PAPER.indigo) {
  const x = Math.round(walker.x);
  const feetY = Math.round(walker.y + 29);
  const body = walker.body;
  const grounded = Boolean(body?.blocked?.down || body?.touching?.down);
  if (figure.lastX !== null) figure.stride += Math.abs(x - figure.lastX);
  figure.lastX = x;
  const pose = butchPose({
    vx: body?.velocity?.x ?? 0,
    vy: body?.velocity?.y ?? 0,
    grounded,
    stride: figure.stride,
    facing: figure.facing,
    aimX: pointer?.worldX ?? null,
    x,
  });
  figure.facing = pose.facing;
  figure.animation = pose.animation;
  figure.sprite.setFrame(pose.frame).setFlipX(pose.facing < 0).setPosition(x, feetY + BUTCH_SHEET.feetPad);

  // a soft graphite shadow under his feet
  const s = figure.shadow;
  s.clear();
  if (grounded) s.fillStyle(PAPER.graphite, 0.16).fillEllipse(x, feetY + 1, 30, 6);

  // the brush, in his front hand, pointing at the cursor
  const g = figure.brush;
  g.clear();
  const handX = x + pose.facing * 7;
  const handY = feetY - 33;
  const angle = Math.atan2(pointer.worldY - handY, pointer.worldX - handX);
  const tipX = handX + Math.cos(angle) * 26;
  const tipY = handY + Math.sin(angle) * 26;
  g.lineStyle(3, PAPER.bookCloth, 1);
  g.beginPath();
  g.moveTo(handX - Math.cos(angle) * 5, handY - Math.sin(angle) * 5);
  g.lineTo(handX + Math.cos(angle) * 18, handY + Math.sin(angle) * 18);
  g.strokePath();
  g.lineStyle(3.4, PAPER.graphite, 1);
  g.beginPath();
  g.moveTo(handX + Math.cos(angle) * 18, handY + Math.sin(angle) * 18);
  g.lineTo(handX + Math.cos(angle) * 21, handY + Math.sin(angle) * 21);
  g.strokePath();
  g.fillStyle(tipColor, 0.95);
  g.fillCircle(tipX, tipY, 4.2);
  g.lineStyle(1, PAPER.graphite, 0.6).strokeCircle(tipX, tipY, 4.2);
}
