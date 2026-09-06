import Phaser from 'phaser';
import { C, CAR } from './colors.js';

// Phase V — TWO TRUE THINGS.
// Procedural-art version restored after the narrative PNG experiment was
// withdrawn. Gameplay continues to come entirely from twoTrueThings.js.
export default class TwoTrueThingsArt {
  constructor(scene, stage) {
    this.scene = scene;
    this.stage = stage;
    this.layout = stage.twoTrueThings;
    this.graphics = scene.add.graphics().setDepth(57);
    this.glow = scene.add.graphics().setDepth(59).setBlendMode(Phaser.BlendModes.ADD);
    this.caption = scene.add.text(stage.startX + 40, 303, 'ARCHIVE HOLD / TWO WITNESSES', {
      fontFamily: 'ui-monospace, Menlo, monospace',
      fontSize: '9px',
      color: '#8fa0a7',
      letterSpacing: 1,
    }).setDepth(58);
    this.objects = [this.graphics, this.glow, this.caption];
    this.visible = true;
    this.lastSnapshot = null;
  }

  worldX(normalized) {
    return Phaser.Math.Linear(this.layout.rail.left, this.layout.rail.right, normalized);
  }

  setVisible(visible) {
    this.visible = Boolean(visible);
    this.objects.forEach((object) => object.setVisible(this.visible));
    if (this.visible && this.lastSnapshot) this.applySnapshot(this.lastSnapshot);
  }

  pulse(color = C(CAR.BRASS_MID), x = null, y = 426) {
    if (!this.visible) return;
    const ring = this.scene.add.circle(x ?? this.layout.mainCradleX, y, 16, color, 0)
      .setStrokeStyle(3, color, 0.9)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(63);
    this.scene.tweens.add({
      targets: ring,
      radius: 50,
      alpha: 0,
      duration: 500,
      ease: 'Quad.easeOut',
      onComplete: () => ring.destroy(),
    });
  }

  drawSpring(g, x, y0, y1, width = 10) {
    g.lineStyle(3, C(CAR.STEEL_HI), 0.86);
    g.beginPath();
    for (let i = 0; i <= 7; i += 1) {
      const px = x + (i === 0 || i === 7 ? 0 : i % 2 ? width : -width);
      const py = Phaser.Math.Linear(y0, y1, i / 7);
      if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
    }
    g.strokePath();
  }

  drawCase(g, id, item, snapshot) {
    const x = this.worldX(item.x);
    const y = snapshot.casesFallen || snapshot.grabbedCase === id
      ? 375
      : Phaser.Math.Linear(270, 375, Phaser.Math.Easing.Cubic.Out(snapshot.fallProgress));
    const witnessed = snapshot.tags[id];
    const grabbed = snapshot.grabbedCase === id;
    const strained = item.detent === 'second' && snapshot.cradleSupport !== 'ready';
    const accent = id === 'a' ? C(CAR.BRASS_MID) : C(CAR.LAMP_OK);
    const width = grabbed ? 106 : 96;
    const height = grabbed ? 58 : 52;

    g.fillStyle(C(CAR.VOID), 0.88);
    g.fillRoundedRect(x - width / 2 - 3, y - height / 2 - 3, width + 6, height + 6, 7);
    g.fillStyle(C(CAR.STEEL_DARK), 1);
    g.fillRoundedRect(x - width / 2, y - height / 2, width, height, 6);
    g.lineStyle(3, strained ? C(CAR.LAMP_ALERT) : accent, strained ? 0.85 : 0.72);
    g.strokeRoundedRect(x - width / 2, y - height / 2, width, height, 6);
    g.fillStyle(C(CAR.STEEL_MID), 0.95);
    g.fillRect(x - 28, y - 7, 56, 18);
    g.lineStyle(2, accent, 0.8);
    g.beginPath(); g.moveTo(x - 20, y - 16); g.lineTo(x + 20, y - 16); g.strokePath();
    g.fillStyle(C(CAR.BRASS_HI), 0.95); g.fillCircle(x + 32, y + 12, 5);
    g.fillStyle(C(CAR.VOID), 1); g.fillCircle(x + 32, y + 12, 2);

    if (witnessed) {
      const memoryY = y - 78;
      g.fillStyle(C(CAR.VOID), 0.92);
      g.fillRoundedRect(x - 50, memoryY - 30, 100, 60, 5);
      g.lineStyle(2, accent, 0.82);
      g.strokeRoundedRect(x - 50, memoryY - 30, 100, 60, 5);
      if (id === 'a') {
        g.fillStyle(C(CAR.STEEL_MID), 0.84);
        g.fillRect(x - 41, memoryY + 6, 82, 14);
        [x - 28, x - 6, x + 18].forEach((px, i) => g.fillRect(px, memoryY - 12 - i * 3, 12, 18 + i * 3));
      } else {
        g.lineStyle(3, C(CAR.STEEL_MID), 0.85);
        g.beginPath(); g.moveTo(x - 42, memoryY + 14); g.lineTo(x - 12, memoryY - 7); g.lineTo(x + 10, memoryY + 3); g.lineTo(x + 42, memoryY - 17); g.strokePath();
        g.fillStyle(C(CAR.BRASS_DARK), 0.75); g.fillCircle(x + 27, memoryY - 9, 8);
      }
    }
  }

  drawMainCradle(g, snapshot) {
    const x = this.layout.mainCradleX;
    const settled = snapshot.level;
    const overloaded = snapshot.casesFallen || snapshot.casesFalling;
    const topY = settled ? 432 : overloaded ? 458 : 446;
    g.fillStyle(C(CAR.STEEL_DARK), 1);
    g.fillRoundedRect(x - 132, topY, 264, 22, 6);
    g.lineStyle(3, settled ? C(CAR.LAMP_OK) : overloaded ? C(CAR.LAMP_ALERT) : C(CAR.STEEL_HI), 0.78);
    g.strokeRoundedRect(x - 132, topY, 264, 22, 6);
    this.drawSpring(g, x - 76, topY + 22, 512, overloaded ? 14 : 10);
    this.drawSpring(g, x + 76, topY + 22, 512, overloaded ? 14 : 10);
    g.fillStyle(C(CAR.STEEL_DARK), 1); g.fillRoundedRect(x - 115, 510, 230, 18, 6);
    g.fillStyle(C(CAR.BRASS_MID), 0.9); g.fillCircle(x, topY + 11, 7);
  }

  drawSecondCradle(g, snapshot) {
    const x = this.layout.secondCradleX;
    const support = snapshot.cradleSupport;
    const unfolded = snapshot.cradleUnfolded;
    if (!unfolded) {
      g.fillStyle(C(CAR.STEEL_DARK), 1); g.fillRoundedRect(x - 70, 493, 140, 24, 6);
      g.lineStyle(3, C(CAR.STEEL_MID), 0.75); g.strokeRoundedRect(x - 70, 493, 140, 24, 6);
      g.lineStyle(2, C(CAR.BRASS_DARK), 0.8);
      g.beginPath(); g.moveTo(x - 45, 493); g.lineTo(x, 517); g.lineTo(x + 45, 493); g.strokePath();
      return { y: 505 };
    }
    const y = support === 'winch-only' ? 444 : support === 'air-only' ? 475 : 426;
    const angle = support === 'winch-only' ? -0.10 : support === 'air-only' ? 0.075 : 0;
    const half = 112;
    const x0 = x - Math.cos(angle) * half;
    const y0 = y - Math.sin(angle) * half;
    const x1 = x + Math.cos(angle) * half;
    const y1 = y + Math.sin(angle) * half;
    g.lineStyle(13, C(CAR.STEEL_MID), 1);
    g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.strokePath();
    g.lineStyle(3, C(CAR.BRASS_MID), 0.86);
    g.beginPath(); g.moveTo(x0, y0 - 5); g.lineTo(x1, y1 - 5); g.strokePath();
    g.fillStyle(C(CAR.STEEL_DARK), 1); g.fillCircle(x0, y0, 8); g.fillCircle(x1, y1, 8);
    return { y, x0, y0, x1, y1 };
  }

  drawDevices(g, snapshot, second) {
    const winchX = this.layout.amberX;
    const airX = this.layout.cyanX;
    g.fillStyle(C(CAR.STEEL_DARK), 1); g.fillRoundedRect(winchX - 35, 465, 70, 48, 7);
    g.lineStyle(3, C(CAR.BRASS_MID), snapshot.amberConnected ? 1 : 0.5); g.strokeCircle(winchX, 489, 16);
    g.fillStyle(C(CAR.BRASS_MID), 0.9); g.fillRect(winchX - 4, 473, 8, 32);
    if (snapshot.amberConnected && second.x1 != null) {
      g.lineStyle(3, C(CAR.BRASS_MID), 1);
      g.beginPath(); g.moveTo(winchX, 477); g.lineTo(second.x1, second.y1); g.strokePath();
    }
    g.lineStyle(5, C(CAR.LAMP_OK), snapshot.cyanConnected ? 0.82 : 0.3);
    g.beginPath(); g.moveTo(airX + 66, 504); g.lineTo(airX, 504); g.lineTo(this.layout.secondCradleX - 92, second.y + 8); g.strokePath();
    g.fillStyle(C(CAR.STEEL_DARK), 1); g.fillRoundedRect(this.layout.secondCradleX - 132, 490, 88, 32, 12);
    g.lineStyle(3, C(CAR.LAMP_OK), snapshot.cyanConnected ? 0.95 : 0.45);
    g.strokeRoundedRect(this.layout.secondCradleX - 132, 490, 88, 32, 12);
    g.fillStyle(C(CAR.BRASS_DARK), 0.92); g.fillRoundedRect(this.stage.startX + 44, 447, 32, 42, 5);
    g.lineStyle(3, C(CAR.STEEL_HI), 0.85); g.beginPath(); g.moveTo(this.stage.startX + 52, 455); g.lineTo(this.stage.startX + 68, 481); g.strokePath();
    g.fillStyle(C(CAR.STEEL_DARK), 1); g.fillRoundedRect(this.layout.secondCradleX + 118, 482, 74, 38, 6);
    g.lineStyle(3, C(CAR.BRASS_DARK), snapshot.stageComplete ? 0.35 : 0.75);
    g.strokeRoundedRect(this.layout.secondCradleX + 118, 482, 74, 38, 6);
  }

  applySnapshot(snapshot) {
    this.lastSnapshot = snapshot;
    const g = this.graphics;
    const glow = this.glow;
    g.clear(); glow.clear();
    if (!this.visible) return;

    g.lineStyle(5, C(CAR.STEEL_MID), 0.94);
    g.beginPath(); g.moveTo(this.layout.rail.left - 35, 300); g.lineTo(this.layout.rail.right + 35, 300); g.strokePath();
    [0.34, 0.53].forEach((n) => {
      const x = this.worldX(n);
      g.lineStyle(3, C(CAR.BRASS_DARK), 0.78); g.beginPath(); g.moveTo(x, 300); g.lineTo(x, 329); g.strokePath();
      g.fillStyle(C(CAR.BRASS_MID), 0.9); g.fillCircle(x, 300, 5);
    });

    this.drawMainCradle(g, snapshot);
    const second = this.drawSecondCradle(g, snapshot);
    this.drawDevices(g, snapshot, second);
    Object.entries(snapshot.cases).forEach(([id, item]) => this.drawCase(g, id, item, snapshot));

    if (snapshot.casesFalling) {
      glow.fillStyle(C(CAR.BRASS_HI), 0.16 + snapshot.fallProgress * 0.18); glow.fillEllipse(this.layout.mainCradleX, 380, 240, 70);
    }
    if (snapshot.bothWitnessed && !snapshot.amberConnected) {
      glow.fillStyle(C(CAR.TUNGSTEN_REFLECT), 0.13); glow.fillCircle(this.layout.amberX, 489, 26);
    }
    if (snapshot.bothWitnessed && !snapshot.cyanConnected) {
      glow.fillStyle(C(CAR.LAMP_OK), 0.1); glow.fillCircle(this.layout.cyanX, 504, 28);
    }
    if (snapshot.level) {
      glow.fillStyle(C(CAR.LAMP_OK), 0.16 + snapshot.settleProgress * 0.15);
      glow.fillEllipse(this.layout.secondCradleX, second.y, 280, 56);
    }
  }

  destroy() {
    this.objects.forEach((object) => object.destroy());
  }
}
