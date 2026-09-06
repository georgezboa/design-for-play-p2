import Phaser from 'phaser';
import { C, CAR } from './colors.js';

// World-space greybox for Phase IV. It deliberately has no close-up panel:
// every meaningful state shares one frame with the player, the case and the
// exit. The art is redrawn from the pure snapshot, so it cannot disagree with
// the puzzle logic.
export default class FirstWeightArt {
  constructor(scene, stage) {
    this.scene = scene;
    this.stage = stage;
    this.layout = stage.firstWeight;
    this.graphics = scene.add.graphics().setDepth(57);
    this.glow = scene.add.graphics().setDepth(59).setBlendMode(Phaser.BlendModes.ADD);
    this.caption = scene.add.text(stage.startX + 42, 303, 'BAGGAGE TRIM / CAR 04', {
      fontFamily: 'ui-monospace, Menlo, monospace',
      fontSize: '9px',
      color: '#8fa0a7',
      letterSpacing: 1,
    }).setDepth(58);
    this.objects = [this.graphics, this.glow, this.caption];
    this.visible = true;
    this.lastSnapshot = null;
  }

  detentWorldX(normalized) {
    const { left, right } = this.layout.detents;
    return Phaser.Math.Linear(left, right, normalized);
  }

  setVisible(visible) {
    this.visible = Boolean(visible);
    this.objects.forEach((object) => object.setVisible(this.visible));
  }

  pulse(color = C(CAR.BRASS_HI), x = null, y = 382) {
    if (!this.visible) return;
    const cx = x ?? this.detentWorldX(this.lastSnapshot?.caseX ?? 0.5);
    const ring = this.scene.add.circle(cx, y, 18, color, 0)
      .setStrokeStyle(3, color, 0.9)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(63);
    this.scene.tweens.add({
      targets: ring,
      radius: 56,
      alpha: 0,
      duration: 520,
      ease: 'Quad.easeOut',
      onComplete: () => ring.destroy(),
    });
  }

  applySnapshot(snapshot) {
    this.lastSnapshot = snapshot;
    const g = this.graphics;
    const glow = this.glow;
    g.clear();
    glow.clear();
    if (!this.visible) return;

    const { left, middle, right } = this.layout.detents;
    const caseX = this.detentWorldX(snapshot.caseX);
    const fallEase = Phaser.Math.Easing.Cubic.Out(snapshot.fallProgress);
    const caseY = snapshot.caseFallen || snapshot.grabbed
      ? 384
      : Phaser.Math.Linear(270, 384, fallEase);
    const tilt = Phaser.Math.Clamp(snapshot.tilt, -1, 1);
    const beamAngle = tilt * 0.095;
    const pivotX = middle;
    const pivotY = 526;
    const halfBeam = 235;
    const end = (sign) => ({
      x: pivotX + Math.cos(beamAngle) * halfBeam * sign,
      y: pivotY + Math.sin(beamAngle) * halfBeam * sign,
    });
    const beamL = end(-1);
    const beamR = end(1);

    // One strong horizontal route: the player sees the fall point, the three
    // brass detents and the locked exit in a single glance.
    g.lineStyle(5, C(CAR.STEEL_MID), 0.9);
    g.beginPath(); g.moveTo(left - 42, 350); g.lineTo(right + 42, 350); g.strokePath();
    [left, middle, right].forEach((x, index) => {
      g.lineStyle(index === 1 ? 4 : 3, C(CAR.BRASS_MID), index === 1 ? 0.92 : 0.62);
      g.beginPath();
      g.moveTo(x - 11, 344); g.lineTo(x, 356); g.lineTo(x + 11, 344);
      g.strokePath();
      g.fillStyle(C(CAR.STEEL_DARK), 1); g.fillCircle(x, 350, 5);
    });
    // Ceiling hoist and the fall path make the first cause unmistakable.
    g.lineStyle(3, C(CAR.STEEL_DARK), 0.92);
    g.strokeRect(right - 46, 255, 92, 22);
    g.beginPath(); g.moveTo(right, 277); g.lineTo(right, caseY - 24); g.strokePath();
    g.fillStyle(C(CAR.BRASS_MID), 0.9); g.fillCircle(right, 277, 5);

    // The case is the only draggable mass. A brass handle and pale corners
    // make it read as luggage rather than another control box.
    g.fillStyle(C(CAR.STEEL_DARK), 1); g.fillRoundedRect(caseX - 44, caseY - 27, 88, 54, 5);
    g.lineStyle(snapshot.grabbed ? 4 : 2, snapshot.grabbed ? C(CAR.LAMP_OK) : C(CAR.STEEL_HI), 1);
    g.strokeRoundedRect(caseX - 44, caseY - 27, 88, 54, 5);
    g.lineStyle(3, C(CAR.BRASS_MID), 0.9);
    g.beginPath(); g.moveTo(caseX - 15, caseY - 27); g.lineTo(caseX - 15, caseY - 37);
    g.lineTo(caseX + 15, caseY - 37); g.lineTo(caseX + 15, caseY - 27); g.strokePath();
    g.fillStyle(C(CAR.BRASS_DARK), 0.7);
    g.fillRect(caseX - 38, caseY + 10, 12, 10); g.fillRect(caseX + 26, caseY + 10, 12, 10);

    // The witness tag exists only after the first readable balance. The punch
    // hole persists, carrying Phase I's verb into a new physical context.
    if (snapshot.firstBalanced) {
      const tagX = caseX + 50;
      const tagY = caseY - 3;
      g.fillStyle(C(CAR.BRASS_HI), 0.96); g.fillRoundedRect(tagX, tagY - 14, 34, 28, 2);
      g.lineStyle(2, C(CAR.BRASS_DARK), 0.9); g.strokeRoundedRect(tagX, tagY - 14, 34, 28, 2);
      g.lineStyle(1, C(CAR.BRASS_DARK), 0.7);
      for (let x = tagX + 7; x < tagX + 29; x += 6) {
        g.beginPath(); g.moveTo(x, tagY + 8); g.lineTo(x + 2, tagY + 8); g.strokePath();
      }
      if (snapshot.tagPunched) {
        g.fillStyle(C(CAR.VOID), 1); g.fillCircle(tagX + 8, tagY - 5, 4);
      }
    }

    // A single mechanical sentence below the floor: case cable -> equalizer
    // beam -> two suspension bags -> carriage trim. No dial duplicates it.
    g.lineStyle(3, C(CAR.BRASS_DARK), 0.68);
    g.beginPath(); g.moveTo(caseX, caseY + 27); g.lineTo(caseX, 469); g.lineTo(pivotX, pivotY - 8); g.strokePath();
    g.lineStyle(9, C(CAR.STEEL_MID), 1);
    g.beginPath(); g.moveTo(beamL.x, beamL.y); g.lineTo(beamR.x, beamR.y); g.strokePath();
    g.lineStyle(3, C(CAR.BRASS_MID), 0.9);
    g.beginPath(); g.moveTo(beamL.x, beamL.y - 4); g.lineTo(beamR.x, beamR.y - 4); g.strokePath();
    g.fillStyle(C(CAR.STEEL_DARK), 1);
    g.fillTriangle(pivotX - 22, 558, pivotX + 22, 558, pivotX, pivotY + 4);
    g.fillStyle(C(CAR.BRASS_HI), 1); g.fillCircle(pivotX, pivotY, 8);
    [beamL, beamR].forEach((point) => {
      g.lineStyle(3, C(CAR.STEEL_HI), 0.9);
      g.beginPath();
      for (let i = 0; i <= 6; i += 1) {
        const x = point.x + (i % 2 ? 9 : -9);
        const y = Phaser.Math.Linear(point.y + 5, 574, i / 6);
        if (i === 0) g.moveTo(point.x, y); else g.lineTo(x, y);
      }
      g.strokePath();
      g.fillStyle(C(CAR.STEEL_DARK), 1); g.fillRoundedRect(point.x - 45, 574, 90, 14, 5);
    });

    // The player-side pressure plate is not a button. It is a visible piece
    // of floor at the exit whose amber line joins the same balance beam.
    g.lineStyle(3, C(CAR.BRASS_DARK), snapshot.tagPunched ? 0.85 : 0.28);
    g.beginPath(); g.moveTo(this.layout.exitZoneX - 40, 447); g.lineTo(this.layout.exitZoneX + 28, 447); g.strokePath();
    g.beginPath(); g.moveTo(this.layout.exitZoneX, 447); g.lineTo(beamR.x, beamR.y); g.strokePath();
    g.fillStyle(C(CAR.STEEL_DARK), 1); g.fillRoundedRect(this.layout.exitZoneX - 38, 451, 76, 8, 3);

    // Local, physical feedback: level makes the centre bearing and exit latch
    // breathe cyan; misalignment leaves the latch mechanically offset.
    if (snapshot.level) {
      glow.fillStyle(C(CAR.LAMP_OK), 0.22 + 0.16 * snapshot.finalBalanceProgress);
      glow.fillCircle(pivotX, pivotY, 24 + snapshot.finalBalanceProgress * 12);
    }
    if (snapshot.caseFalling) {
      glow.fillStyle(C(CAR.BRASS_HI), 0.18 + snapshot.fallProgress * 0.22);
      glow.fillCircle(right, caseY, 34);
    }
    if (snapshot.tagAvailable) {
      glow.fillStyle(C(CAR.BRASS_HI), 0.22); glow.fillCircle(caseX + 58, caseY - 3, 28);
    }
    if (snapshot.atExit && !snapshot.level) {
      g.lineStyle(4, C(CAR.BRASS_DARK), 0.9);
      g.beginPath(); g.moveTo(this.stage.endX - 9, 332); g.lineTo(this.stage.endX + 9, 344); g.strokePath();
    }
  }

  destroy() {
    this.objects.forEach((object) => object.destroy());
  }
}
