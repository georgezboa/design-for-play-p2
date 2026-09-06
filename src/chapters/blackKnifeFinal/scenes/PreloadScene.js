import Phaser from 'phaser';
import { COLORS } from '../constants.js';
import { CONDUCTOR_SHEETS, IMAGE_MANIFEST, AUDIO_MANIFEST } from '../assets.js';

// Loads the Conductor spritesheets + audio, then generates neon placeholder
// textures for anything missing so the battle always runs.
export default class PreloadScene extends Phaser.Scene {
  constructor() { super('preload'); }

  preload() {
    this.load.on('loaderror', file => console.warn('[assets] failed to load', file.key, file.src));
    const bar = this.add.graphics();
    this.load.on('progress', p => {
      bar.clear().fillStyle(COLORS.pink, 1).fillRect(300, 270, 500 * p, 8);
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

    // Player: small cream paper-ship (matches the key art's tiny flyer)
    gen('player-ship', 46, 26, gr => {
      gr.fillStyle(0xf6eecd, 1).fillTriangle(2, 20, 44, 10, 8, 4);
      gr.fillStyle(0xd8c99a, 1).fillTriangle(8, 20, 44, 10, 20, 22);
      gr.lineStyle(1.5, 0x8f8158, 1).strokeTriangle(2, 20, 44, 10, 8, 4);
    });
    gen('__ship_fallback', 46, 26, gr => {
      gr.fillStyle(0xf6eecd, 1).fillTriangle(2, 20, 44, 10, 8, 4);
    });
    gen('bullet-player', 16, 8, gr => {
      gr.fillStyle(COLORS.yellow, 1).fillEllipse(8, 4, 16, 7);
      gr.fillStyle(0xffffff, 0.9).fillEllipse(11, 4, 6, 3);
    });

    // Ticket projectile (pink stamped ticket, like the key art)
    gen('ticket', 34, 22, gr => {
      gr.fillStyle(0x0a0208, 1).fillRoundedRect(0, 0, 34, 22, 4);
      gr.lineStyle(2, COLORS.pink, 1).strokeRoundedRect(1, 1, 32, 20, 4);
      gr.lineStyle(1.5, COLORS.pink, 0.9).strokeCircle(17, 11, 5);
      gr.fillStyle(COLORS.pink, 1).fillRect(5, 5, 3, 12).fillRect(26, 5, 3, 12);
    });
    gen('orb', 18, 18, gr => {
      gr.fillStyle(COLORS.pink, 1).fillCircle(9, 9, 8);
      gr.fillStyle(0xffffff, 0.85).fillCircle(9, 9, 3.5);
    });
    gen('smoke', 26, 26, gr => {
      gr.fillStyle(COLORS.smoke, 0.85).fillCircle(13, 13, 11);
      gr.fillStyle(0x5e0a33, 0.7).fillCircle(9, 15, 6);
    });
    gen('spark', 10, 10, gr => { gr.fillStyle(0xffe733, 1).fillRect(0, 0, 10, 10); });

    // Thrown train car (boxcar ripped off the Infinity Train)
    gen('traincar', 150, 86, gr => {
      gr.fillStyle(0x150618, 1).fillRoundedRect(0, 6, 150, 56, 8);
      gr.lineStyle(3, COLORS.pinkDark, 1).strokeRoundedRect(1, 7, 148, 54, 8);
      gr.lineStyle(2, COLORS.pinkDark, 0.8);
      for (let i = 1; i < 5; i += 1) gr.lineBetween(i * 30, 10, i * 30, 58);
      gr.fillStyle(COLORS.pink, 1).fillRect(8, 0, 134, 8);
      // A frightened eye peeking out of the boxcar door
      gr.fillStyle(COLORS.yellow, 1).fillCircle(75, 34, 11);
      gr.fillStyle(0x000000, 1).fillEllipse(75, 34, 5, 14);
      // Wheels
      gr.fillStyle(0x0a0208, 1).fillCircle(30, 72, 13).fillCircle(120, 72, 13);
      gr.lineStyle(2.5, COLORS.pink, 1).strokeCircle(30, 72, 13).strokeCircle(120, 72, 13);
    });
    // Loose spiked wheel that bounces along the ground
    gen('wheel', 52, 52, gr => {
      gr.fillStyle(0x0a0208, 1).fillCircle(26, 26, 23);
      gr.lineStyle(4, COLORS.pink, 1).strokeCircle(26, 26, 23);
      gr.lineStyle(3, COLORS.pinkDark, 1);
      for (let i = 0; i < 4; i += 1) {
        const a = (i / 4) * Math.PI;
        gr.lineBetween(26 - Math.cos(a) * 20, 26 - Math.sin(a) * 20, 26 + Math.cos(a) * 20, 26 + Math.sin(a) * 20);
      }
      gr.fillStyle(COLORS.yellow, 1).fillCircle(26, 26, 6);
    });
    // Coal chunk (explodes into an orb burst)
    gen('coal', 24, 24, gr => {
      gr.fillStyle(0x1a0d1f, 1).fillCircle(12, 13, 10);
      gr.fillStyle(0x2c1430, 1).fillCircle(8, 10, 5).fillCircle(16, 15, 6);
      gr.fillStyle(COLORS.pink, 0.9).fillCircle(12, 13, 3);
    });
    // Lingering smoke hazard cloud
    gen('cloud', 56, 44, gr => {
      gr.fillStyle(COLORS.smoke, 0.5).fillCircle(18, 26, 15).fillCircle(34, 20, 17).fillCircle(44, 30, 11);
      gr.fillStyle(0x5e0a33, 0.45).fillCircle(26, 30, 10);
    });

    // Tentacle spear (final-phase magic attack)
    gen('boss-tentacle', 44, 170, gr => {
      gr.fillStyle(0x3c1266, 1);
      gr.fillEllipse(22, 30, 34, 60);
      gr.fillEllipse(18, 80, 26, 70);
      gr.fillEllipse(26, 130, 18, 70);
      gr.fillStyle(COLORS.yellow, 1).fillCircle(20, 60, 7);
      gr.fillStyle(0x000000, 1).fillEllipse(20, 60, 3, 8);
    });

    // Environment bits
    gen('signal', 40, 120, gr => {
      gr.fillStyle(0x140510, 1).fillRect(16, 30, 8, 90);
      gr.fillStyle(0x1c0a16, 1).fillRoundedRect(6, 0, 28, 64, 8);
      gr.lineStyle(2, COLORS.pinkDark, 1).strokeRoundedRect(6, 0, 28, 64, 8);
      gr.fillStyle(COLORS.pink, 1).fillCircle(20, 16, 8);
      gr.fillStyle(0x3d0a22, 1).fillCircle(20, 40, 8);
    });
    gen('crossing', 90, 140, gr => {
      gr.fillStyle(0x140510, 1).fillRect(41, 20, 8, 120);
      gr.fillStyle(COLORS.pinkDark, 1);
      gr.save();
      gr.translateCanvas(45, 26);
      gr.rotateCanvas(0.6);
      gr.fillRect(-40, -6, 80, 12);
      gr.rotateCanvas(-1.2);
      gr.fillRect(-40, -6, 80, 12);
      gr.restore();
      gr.fillStyle(0x1c0a16, 1).fillCircle(28, 92, 12).fillCircle(62, 92, 12);
      gr.lineStyle(2, COLORS.pink, 1).strokeCircle(28, 92, 12).strokeCircle(62, 92, 12);
    });

    g.destroy();
  }
}
