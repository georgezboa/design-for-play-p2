import Phaser from 'phaser';
import { COLORS } from '../constants.js';
import { CONDUCTOR_SHEETS, IMAGE_MANIFEST, AUDIO_MANIFEST } from '../assets.js';

// Loads the Black Ticket's spritesheets + audio, then paints the small
// textures (the passenger's punched ticket, the Black Ticket's own tickets,
// coal, wheels, the signal) in the finale palette: walnut, brass, ivory
// paper, amber light, oxblood ink.
export default class PreloadScene extends Phaser.Scene {
  constructor() { super('preload'); }

  preload() {
    this.load.on('loaderror', file => console.warn('[assets] failed to load', file.key, file.src));
    const bar = this.add.graphics();
    this.load.on('progress', p => {
      bar.clear().fillStyle(COLORS.brass, 0.5).fillRect(300, 272, 500, 4).fillStyle(COLORS.amber, 1).fillRect(300, 270, 500 * p, 8);
    });

    Object.entries(CONDUCTOR_SHEETS).forEach(([key, def]) => {
      this.load.spritesheet(key, def.path, def.sheet);
    });
    Object.entries(IMAGE_MANIFEST).forEach(([key, def]) => {
      if (!def.path) return;
      if (def.sheet) this.load.spritesheet(key, def.path, def.sheet);
      else this.load.image(key, def.path);
    });
    Object.entries(AUDIO_MANIFEST).forEach(([key, def]) => {
      if (def.path) this.load.audio(key, def.path);
    });
  }

  create() {
    this.makeFallbacks();
    this.makeAnimations();
    this.scene.start('battle');
  }

  makeAnimations() {
    Object.entries(CONDUCTOR_SHEETS).forEach(([key, def]) => {
      if (!this.textures.exists(key) || this.anims.exists(`${key}-anim`)) return;
      const frames = this.textures.get(key).frameTotal - 1;
      this.anims.create({
        key: `${key}-anim`,
        frames: this.anims.generateFrameNumbers(key, { start: 0, end: frames - 1 }),
        frameRate: def.frameRate,
        repeat: def.repeat,
        yoyo: def.repeat === -1, // ping-pong loops read smoother with 5 frames
      });
    });
  }

  makeFallbacks() {
    const g = this.make.graphics({ add: false });
    const gen = (key, w, h, draw) => {
      if (this.textures.exists(key)) return;
      g.clear();
      draw(g, w, h);
      g.generateTexture(key, w, h);
    };

    // The passenger: an ivory ticket with an oxblood stub and a real punch
    // hole (walnut shows through), nose to the right.
    gen('player-ship', 50, 28, gr => {
      gr.fillStyle(0x000000, 0.35).fillRoundedRect(3, 5, 46, 22, 3);
      gr.fillStyle(COLORS.paper, 1).fillRoundedRect(1, 2, 46, 22, 3);
      gr.fillStyle(COLORS.oxblood, 1).fillRect(1, 2, 11, 22);
      gr.fillStyle(0x6b5640, 0.7).fillRect(17, 8, 18, 2).fillRect(17, 13, 24, 2).fillRect(17, 18, 14, 2);
      gr.fillStyle(COLORS.bg, 1).fillCircle(39, 8, 3.2);
      gr.lineStyle(1.2, 0x2a1d14, 0.7).strokeRoundedRect(1, 2, 46, 22, 3);
      gr.fillStyle(COLORS.amberHot, 1).fillCircle(47, 3, 2);
    });
    gen('__ship_fallback', 50, 28, gr => { gr.fillStyle(COLORS.paper, 1).fillRoundedRect(1, 2, 46, 22, 3); });
    // The punch's chads: small ivory discs with an amber edge.
    gen('bullet-player', 14, 10, gr => {
      gr.fillStyle(COLORS.amber, 0.9).fillEllipse(7, 5, 14, 9);
      gr.fillStyle(COLORS.paper, 1).fillEllipse(7, 5, 9, 6);
    });

    // The Black Ticket's tickets: walnut-black stock, amber border, a hole
    // that is never punched (a ring).
    gen('ticket', 34, 22, gr => {
      gr.fillStyle(0x0e0a07, 1).fillRoundedRect(0, 0, 34, 22, 4);
      gr.lineStyle(2, COLORS.amber, 1).strokeRoundedRect(1, 1, 32, 20, 4);
      gr.lineStyle(1.5, COLORS.paper, 0.9).strokeCircle(17, 11, 5);
      gr.fillStyle(COLORS.amber, 1).fillRect(5, 5, 3, 12).fillRect(26, 5, 3, 12);
    });
    gen('orb', 18, 18, gr => {
      gr.fillStyle(COLORS.amber, 1).fillCircle(9, 9, 8);
      gr.fillStyle(COLORS.paper, 0.95).fillCircle(9, 9, 3.5);
    });
    gen('smoke', 26, 26, gr => {
      gr.fillStyle(0x6b5640, 0.85).fillCircle(13, 13, 11);
      gr.fillStyle(0x2a1d14, 0.7).fillCircle(9, 15, 6);
    });
    gen('spark', 10, 10, gr => { gr.fillStyle(COLORS.amberHot, 1).fillRect(0, 0, 10, 10); });

    // A carriage torn off the line: walnut panels, brass trim, lit windows.
    gen('traincar', 150, 86, gr => {
      gr.fillStyle(0x2a1d14, 1).fillRoundedRect(0, 6, 150, 56, 8);
      gr.lineStyle(3, COLORS.brass, 1).strokeRoundedRect(1, 7, 148, 54, 8);
      gr.lineStyle(2, 0x1c130d, 0.8);
      for (let i = 1; i < 5; i += 1) gr.lineBetween(i * 30, 10, i * 30, 58);
      gr.fillStyle(COLORS.oxblood, 1).fillRect(8, 0, 134, 8);
      gr.fillStyle(COLORS.amber, 0.95).fillRect(14, 18, 18, 14).fillRect(44, 18, 18, 14).fillRect(104, 18, 18, 14);
      gr.fillStyle(COLORS.paper, 1).fillCircle(83, 34, 11);
      gr.fillStyle(0x000000, 1).fillEllipse(83, 34, 5, 14);
      gr.fillStyle(0x0e0a07, 1).fillCircle(30, 72, 13).fillCircle(120, 72, 13);
      gr.lineStyle(2.5, COLORS.brass, 1).strokeCircle(30, 72, 13).strokeCircle(120, 72, 13);
    });
    gen('wheel', 52, 52, gr => {
      gr.fillStyle(0x0e0a07, 1).fillCircle(26, 26, 23);
      gr.lineStyle(4, COLORS.brass, 1).strokeCircle(26, 26, 23);
      gr.lineStyle(3, 0x5e4522, 1);
      for (let i = 0; i < 4; i += 1) {
        const a = (i / 4) * Math.PI;
        gr.lineBetween(26 - Math.cos(a) * 20, 26 - Math.sin(a) * 20, 26 + Math.cos(a) * 20, 26 + Math.sin(a) * 20);
      }
      gr.fillStyle(COLORS.amber, 1).fillCircle(26, 26, 6);
    });
    gen('coal', 24, 24, gr => {
      gr.fillStyle(0x140e0a, 1).fillCircle(12, 13, 10);
      gr.fillStyle(0x2a1d14, 1).fillCircle(8, 10, 5).fillCircle(16, 15, 6);
      gr.fillStyle(COLORS.amber, 0.95).fillCircle(12, 13, 3);
    });
    gen('cloud', 56, 44, gr => {
      gr.fillStyle(0x6b5640, 0.5).fillCircle(18, 26, 15).fillCircle(34, 20, 17).fillCircle(44, 30, 11);
      gr.fillStyle(0x2a1d14, 0.45).fillCircle(26, 30, 10);
    });
    gen('boss-tentacle', 44, 170, gr => {
      gr.fillStyle(0x3a1a12, 1);
      gr.fillEllipse(22, 30, 34, 60);
      gr.fillEllipse(18, 80, 26, 70);
      gr.fillEllipse(26, 130, 18, 70);
      gr.fillStyle(COLORS.paper, 1).fillCircle(20, 60, 7);
      gr.fillStyle(0x000000, 1).fillEllipse(20, 60, 3, 8);
    });

    // A brass signal and a crossing, as on the Chapter 1 line.
    gen('signal', 40, 120, gr => {
      gr.fillStyle(0x1c130d, 1).fillRect(16, 30, 8, 90);
      gr.fillStyle(0x2a1d14, 1).fillRoundedRect(6, 0, 28, 64, 8);
      gr.lineStyle(2, COLORS.brass, 1).strokeRoundedRect(6, 0, 28, 64, 8);
      gr.fillStyle(COLORS.oxblood, 1).fillCircle(20, 16, 8);
      gr.fillStyle(0x3a2517, 1).fillCircle(20, 40, 8);
    });
    gen('crossing', 90, 140, gr => {
      gr.fillStyle(0x1c130d, 1).fillRect(41, 20, 8, 120);
      gr.fillStyle(COLORS.brass, 1);
      gr.save();
      gr.translateCanvas(45, 26);
      gr.rotateCanvas(0.6);
      gr.fillRect(-40, -6, 80, 12);
      gr.rotateCanvas(-1.2);
      gr.fillRect(-40, -6, 80, 12);
      gr.restore();
      gr.fillStyle(0x2a1d14, 1).fillCircle(28, 92, 12).fillCircle(62, 92, 12);
      gr.lineStyle(2, COLORS.amber, 1).strokeCircle(28, 92, 12).strokeCircle(62, 92, 12);
    });

    g.destroy();
  }
}
