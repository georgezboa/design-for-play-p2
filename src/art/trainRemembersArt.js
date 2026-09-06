import Phaser from 'phaser';
import { C, CAR } from './colors.js';

// Phase VI — THE TRAIN REMEMBERS.
// Restored procedural-art version. All timing and puzzle state remain owned by
// trainRemembers.js; this class only renders its snapshots.
export default class TrainRemembersArt {
  constructor(scene, stage) {
    this.scene = scene;
    this.stage = stage;
    this.layout = stage.trainRemembers;
    this.graphics = scene.add.graphics().setDepth(57);
    this.glow = scene.add.graphics().setDepth(59).setBlendMode(Phaser.BlendModes.ADD);
    this.pastLabel = scene.add.text(this.layout.rail.left, 284, 'PAST / PUNCHED RECORD', {
      fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '9px', color: '#c8a86c', letterSpacing: 1,
    }).setOrigin(0.5).setDepth(60);
    this.presentLabel = scene.add.text(this.layout.rail.left, 427, 'PRESENT / YOUR WEIGHT', {
      fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '9px', color: '#91a4aa', letterSpacing: 1,
    }).setOrigin(0.5).setDepth(60);
    this.objects = [this.graphics, this.glow, this.pastLabel, this.presentLabel];
    this.visible = true;
    this.lastSnapshot = null;
  }

  worldX(n) { return Phaser.Math.Linear(this.layout.rail.left, this.layout.rail.right, n); }

  setVisible(visible) {
    this.visible = Boolean(visible);
    this.objects.forEach((object) => object.setVisible(this.visible));
    if (this.visible && this.lastSnapshot) this.applySnapshot(this.lastSnapshot);
  }

  pulse(color = C(CAR.LAMP_OK), x = null, y = 430) {
    if (!this.visible) return;
    const ring = this.scene.add.circle(x ?? this.layout.pivotX, y, 17, color, 0)
      .setStrokeStyle(3, color, 0.9).setBlendMode(Phaser.BlendModes.ADD).setDepth(63);
    this.scene.tweens.add({ targets: ring, radius: 54, alpha: 0, duration: 520, ease: 'Quad.easeOut', onComplete: () => ring.destroy() });
  }

  drawSpring(g, x, y0, y1) {
    g.lineStyle(3, C(CAR.STEEL_HI), 0.82); g.beginPath();
    for (let i = 0; i <= 7; i += 1) {
      const px = x + (i === 0 || i === 7 ? 0 : i % 2 ? 10 : -10);
      const py = Phaser.Math.Linear(y0, y1, i / 7);
      if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
    }
    g.strokePath();
  }

  drawCase(g, x, y, { echo = false, grabbed = false, strained = false, alpha = 1 } = {}) {
    const width = grabbed ? 104 : 94;
    const height = grabbed ? 58 : 52;
    const accent = echo ? C(CAR.TUNGSTEN_REFLECT) : C(CAR.STEEL_HI);
    g.fillStyle(C(CAR.VOID), alpha * 0.86); g.fillRoundedRect(x - width / 2 - 3, y - height / 2 - 3, width + 6, height + 6, 7);
    g.fillStyle(C(CAR.STEEL_DARK), alpha); g.fillRoundedRect(x - width / 2, y - height / 2, width, height, 6);
    g.lineStyle(3, strained ? C(CAR.SKY_RIM) : accent, alpha * 0.82); g.strokeRoundedRect(x - width / 2, y - height / 2, width, height, 6);
    g.fillStyle(accent, alpha * 0.72); g.fillRect(x - 29, y - 7, 58, 18);
    g.lineStyle(2, accent, alpha * 0.7); g.beginPath(); g.moveTo(x - 20, y - 16); g.lineTo(x + 20, y - 16); g.strokePath();
    g.fillStyle(C(CAR.BRASS_HI), alpha); g.fillCircle(x + 31, y + 12, 5);
    g.fillStyle(C(CAR.VOID), alpha); g.fillCircle(x + 31, y + 12, 2);
  }

  drawWinch(g, x, y, active) {
    g.fillStyle(C(CAR.STEEL_DARK), 1); g.fillRoundedRect(x - 35, y - 24, 70, 48, 7);
    g.lineStyle(3, C(CAR.BRASS_MID), active ? 1 : 0.58); g.strokeCircle(x, y, 16);
    g.fillStyle(C(CAR.BRASS_MID), 0.9); g.fillRect(x - 4, y - 15, 8, 30);
    g.lineStyle(2, C(CAR.BRASS_HI), 0.8); g.beginPath(); g.moveTo(x, y); g.lineTo(x + 13, y - 10); g.strokePath();
  }

  drawCushion(g, x, y, inflated) {
    const h = inflated ? 42 : 28;
    g.fillStyle(C(CAR.STEEL_DARK), 1); g.fillRoundedRect(x - 44, y - h / 2, 88, h, 12);
    g.lineStyle(3, C(CAR.LAMP_OK), inflated ? 0.95 : 0.48); g.strokeRoundedRect(x - 44, y - h / 2, 88, h, 12);
    g.lineStyle(2, C(CAR.LAMP_OK), inflated ? 0.55 : 0.25);
    [-20, 0, 20].forEach((dx) => { g.beginPath(); g.moveTo(x + dx, y - h / 2 + 4); g.lineTo(x + dx, y + h / 2 - 4); g.strokePath(); });
  }

  applySnapshot(snapshot) {
    this.lastSnapshot = snapshot;
    const g = this.graphics;
    const glow = this.glow;
    g.clear(); glow.clear();
    if (!this.visible) return;

    const echoX = this.worldX(snapshot.echoX);
    const presentX = this.worldX(snapshot.presentX);
    const pivotX = this.layout.pivotX;
    const error = Phaser.Math.Clamp(snapshot.balanceError, -1, 1);
    const angle = error * 0.10;
    const beamY = 438;
    const half = 245;
    const left = { x: pivotX - Math.cos(angle) * half, y: beamY - Math.sin(angle) * half };
    const right = { x: pivotX + Math.cos(angle) * half, y: beamY + Math.sin(angle) * half };

    const pastBase = snapshot.poseIndex === 0 ? 0.82 : 0;
    this.pastLabel.setPosition(echoX, 284).setVisible(this.visible && snapshot.echoVisible && pastBase > 0)
      .setAlpha(Phaser.Math.Clamp(pastBase - snapshot.redactionProgress * 0.72, 0, 0.82));
    this.presentLabel.setPosition(presentX, 427).setVisible(this.visible).setAlpha(0.82);

    g.lineStyle(4, C(CAR.BRASS_DARK), 0.78); g.beginPath(); g.moveTo(this.layout.rail.left - 24, 328); g.lineTo(this.layout.rail.right + 24, 328); g.strokePath();
    g.lineStyle(5, C(CAR.STEEL_MID), 0.92); g.beginPath(); g.moveTo(this.layout.rail.left - 24, 386); g.lineTo(this.layout.rail.right + 24, 386); g.strokePath();
    [0.12, 0.5, 0.88].forEach((n) => {
      const x = this.worldX(n);
      g.fillStyle(C(CAR.BRASS_DARK), 0.68); g.fillRect(x - 2, 319, 4, 18);
      g.fillStyle(C(CAR.STEEL_DARK), 0.86); g.fillRect(x - 2, 377, 4, 18);
    });

    g.lineStyle(11, C(CAR.STEEL_MID), 1); g.beginPath(); g.moveTo(left.x, left.y); g.lineTo(right.x, right.y); g.strokePath();
    g.lineStyle(3, C(CAR.BRASS_MID), 0.84); g.beginPath(); g.moveTo(left.x, left.y - 5); g.lineTo(right.x, right.y - 5); g.strokePath();
    g.fillStyle(C(CAR.STEEL_DARK), 1); g.fillTriangle(pivotX - 24, 548, pivotX + 24, 548, pivotX, beamY + 7);
    g.fillStyle(C(CAR.BRASS_HI), 1); g.fillCircle(pivotX, beamY, 8);
    this.drawSpring(g, left.x + 45, left.y + 8, 520); this.drawSpring(g, right.x - 45, right.y + 8, 520);
    g.fillStyle(C(CAR.STEEL_DARK), 1); g.fillRoundedRect(pivotX - 270, 520, 540, 18, 7);

    if (snapshot.echoVisible) {
      this.drawCase(g, echoX, 327, { echo: true, alpha: Phaser.Math.Clamp(0.58 - snapshot.redactionProgress * 0.48, 0.08, 0.58) });
    }
    this.drawCase(g, presentX, snapshot.grabbed ? 372 : 386, { grabbed: snapshot.grabbed });
    if (snapshot.redactionProgress > 0) {
      const fallP = snapshot.redactionProgress;
      const catchX = this.layout.catchX;
      const fallY = Phaser.Math.Linear(302, 430, Phaser.Math.Easing.Quadratic.In(fallP));
      this.drawCase(g, catchX, fallY, { echo: true, grabbed: snapshot.caught, strained: !snapshot.caught, alpha: snapshot.caught ? 0.88 : 0.68 });
      if (!snapshot.caught) {
        g.lineStyle(2, C(CAR.SKY_RIM), 0.56);
        for (let i = 0; i < 5; i += 1) {
          const y = 334 + i * 11;
          g.beginPath(); g.moveTo(catchX - 55 + i * 6, y); g.lineTo(catchX + 56 - i * 4, y - 7); g.strokePath();
        }
      }
    }

    const help = snapshot.trainHelpProgress;
    const winchX = this.layout.winchX;
    const counterX = snapshot.trainCounterweightX == null ? this.worldX(0.5) : this.worldX(snapshot.trainCounterweightX);
    this.drawWinch(g, winchX, 494, help > 0);
    g.lineStyle(3, C(CAR.BRASS_MID), 0.72 + help * 0.28); g.beginPath(); g.moveTo(winchX, 475); g.lineTo(counterX, 454); g.strokePath();
    // Restored pre-PNG travelling mass: compact brass block on the live cable.
    g.fillStyle(C(CAR.VOID), 0.94); g.fillRoundedRect(counterX - 27, 462, 54, 30, 5);
    g.fillStyle(C(CAR.BRASS_MID), 0.9); g.fillRoundedRect(counterX - 24, 465, 48, 25, 4);
    g.fillStyle(C(CAR.BRASS_HI), 0.72); g.fillRect(counterX - 18, 469, 36, 4);
    g.fillStyle(C(CAR.STEEL_HI), 0.9); g.fillCircle(counterX - 16, 460, 5); g.fillCircle(counterX + 16, 460, 5);

    g.lineStyle(5, C(CAR.LAMP_OK), 0.68 + help * 0.2); g.beginPath(); g.moveTo(this.layout.airX, 505); g.lineTo(pivotX - 160, 505); g.strokePath();
    this.drawCushion(g, pivotX - 158, 505, snapshot.trainHelping);
    g.fillStyle(C(CAR.BRASS_DARK), 0.92); g.fillRoundedRect(this.layout.catchX + 58, 468, 42, 44, 5);
    g.lineStyle(3, C(CAR.STEEL_HI), 0.85); g.beginPath(); g.moveTo(this.layout.catchX + 66, 476); g.lineTo(this.layout.catchX + 92, 504); g.strokePath();

    if (snapshot.balanced) { glow.fillStyle(C(CAR.LAMP_OK), 0.14 + snapshot.poseHoldProgress * 0.18); glow.fillEllipse(pivotX, beamY, 100 + snapshot.poseHoldProgress * 60, 50); }
    if (snapshot.trainHelping) {
      glow.lineStyle(7, C(CAR.TUNGSTEN_REFLECT), 0.18 + help * 0.18); glow.beginPath(); glow.moveTo(winchX, 475); glow.lineTo(counterX, 454); glow.strokePath();
      glow.fillStyle(C(CAR.LAMP_OK), 0.1 + help * 0.16); glow.fillEllipse(pivotX, 500, 520, 70);
    }
    if (snapshot.stageComplete) { g.lineStyle(4, C(CAR.LAMP_OK), 0.88); g.beginPath(); g.moveTo(this.layout.rail.left, 552); g.lineTo(this.layout.rail.right, 552); g.strokePath(); }
  }

  destroy() { this.objects.forEach((object) => object.destroy()); }
}
