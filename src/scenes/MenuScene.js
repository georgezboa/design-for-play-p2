import Phaser from 'phaser';
import { GAME_W, GAME_H } from '../constants.js';

/**
 * Nightfall main menu — Chapter 2 build.
 * BEGIN starts L2-1 「切除」; HOW TO PLAY shows the Chapter-2 key table;
 * L2-2 / L2-3 are visible but locked (in development).
 */
export default class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  create() {
    // Backdrop: night gradient + a few far tower silhouettes.
    const sky = this.add.graphics().setDepth(0);
    for (let i = 0; i < 40; i++) {
      const t = i / 40;
      sky.fillStyle(Phaser.Display.Color.GetColor(8 + 8 * t, 8 + 10 * t, 22 + 14 * t), 1);
      sky.fillRect(0, (GAME_H / 40) * i, GAME_W, GAME_H / 40 + 1);
    }
    const far = this.add.graphics().setDepth(1);
    let x = -40;
    let seed = 13;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    while (x < GAME_W + 80) {
      const w = 70 + rnd() * 110;
      const h = 150 + rnd() * 220;
      far.fillStyle(0x0b0f1c, 1);
      far.fillRect(x, GAME_H - h, w, h);
      for (let wy = GAME_H - h + 10; wy < GAME_H - 14; wy += 18) {
        for (let wx = x + 8; wx < x + w - 8; wx += 15) {
          if (rnd() < 0.16) {
            const n = rnd();
            far.fillStyle(n < 0.12 ? 0xff2d78 : n < 0.3 ? 0x27e0f5 : 0x35445e, 0.85);
            far.fillRect(wx, wy, 5, 7);
          }
        }
      }
      x += w + 16 + rnd() * 50;
    }

    this.add
      .text(GAME_W / 2, 130, 'NIGHTFALL', {
        fontFamily: 'ui-monospace, Menlo, monospace',
        fontSize: '56px',
        color: '#c9d6e2',
      })
      .setOrigin(0.5)
      .setDepth(3);
    this.add
      .text(GAME_W / 2, 185, 'CHAPTER 2 — THE UPGRADE', {
        fontFamily: 'ui-monospace, Menlo, monospace',
        fontSize: '16px',
        color: '#27e0f5',
      })
      .setOrigin(0.5)
      .setDepth(3);
    this.add
      .text(GAME_W / 2, 212, 'the body was the last thing that was still yours', {
        fontFamily: 'ui-monospace, Menlo, monospace',
        fontSize: '12px',
        color: '#5d6a78',
      })
      .setOrigin(0.5)
      .setDepth(3);

    this.items = [
      { label: 'BEGIN — CHAPTER 2', action: () => this.begin() },
      { label: 'HOW TO PLAY', action: () => this.toggleHelp() },
    ];
    this.sel = 0;
    this.texts = this.items.map((it, i) => {
      const t = this.add
        .text(GAME_W / 2, 300 + i * 44, it.label, {
          fontFamily: 'ui-monospace, Menlo, monospace',
          fontSize: '17px',
          color: it.locked ? '#3a4149' : '#7f8b99',
        })
        .setOrigin(0.5)
        .setDepth(3);
      if (!it.locked) {
        t.setInteractive({ useHandCursor: true });
        t.on('pointerover', () => this.select(i));
        t.on('pointerdown', () => it.action());
      }
      return t;
    });
    this.select(0);

    // One continuous chapter — the three forms are not separate levels.
    this.add
      .text(GAME_W / 2, 408, 'L2-1 EXCISION  →  L2-2 ASSEMBLY  →  L2-3 OVERLOAD', {
        fontFamily: 'ui-monospace, Menlo, monospace',
        fontSize: '12px',
        color: '#3f4a56',
      })
      .setOrigin(0.5)
      .setDepth(3);

    this.add
      .text(GAME_W / 2, GAME_H - 30, '↑/↓ — select · ENTER — confirm', {
        fontFamily: 'ui-monospace, Menlo, monospace',
        fontSize: '12px',
        color: '#4a545f',
      })
      .setOrigin(0.5)
      .setDepth(3);

    // Help overlay (hidden).
    this.help = this.add.container(GAME_W / 2, GAME_H / 2).setDepth(10).setVisible(false);
    const bg = this.add.rectangle(0, 0, 560, 330, 0x05070c, 0.94).setStrokeStyle(1, 0x27e0f5, 0.4);
    const helpText = this.add
      .text(
        0,
        -136,
        [
          'HOW TO PLAY — CHAPTER 2',
          '',
          'move            A / D   or   ← / →',
          'jump            SPACE   (chain on landing, no double jump)',
          'rush            SHIFT   (a burst of speed, short cooldown)',
          'attack          J   or   left mouse',
          'swing / yank    E   (web-swing from anchor rings; yank psychos)',
          '',
          'L2-1: you have no limbs. roll. the fall is the only way out.',
          'L2-2: the gaps are too wide for legs. swing like you mean it.',
          'L2-3: you are too heavy for this world. F detonates in mid-air.',
          '',
          'SPACE / ENTER — close',
        ].join('\n'),
        {
          fontFamily: 'ui-monospace, Menlo, monospace',
          fontSize: '13px',
          color: '#9fb4c4',
          align: 'left',
          lineSpacing: 6,
        },
      )
      .setOrigin(0.5, 0);
    this.help.add([bg, helpText]);

    this.keys = this.input.keyboard.addKeys({
      up: 'UP',
      down: 'DOWN',
      enter: 'ENTER',
      space: 'SPACE',
    });
    this.input.keyboard.addCapture(['SPACE', 'UP', 'DOWN']);
  }

  /** Dive into the skyline — the lens never closes, it only moves. */
  begin() {
    if (this.starting) return;
    this.starting = true;
    const cam = this.cameras.main;
    cam.setBounds(0, 0, GAME_W, GAME_H);
    this.tweens.add({ targets: cam, zoom: 1.7, duration: 520, ease: 'Quad.easeIn' });
    cam.pan(GAME_W / 2, GAME_H - 150, 520, 'Quad.easeIn', true, () => this.scene.start('IntroCh2'));
  }

  select(i) {
    if (this.items[i].locked) return;
    this.sel = i;
    this.texts.forEach((t, j) => {
      if (this.items[j].locked) return;
      t.setColor(j === i ? '#d8f4fc' : '#7f8b99');
      t.setText((j === i ? '▸ ' : '  ') + this.items[j].label);
    });
  }

  toggleHelp() {
    this.help.setVisible(!this.help.visible);
  }

  update() {
    if (this.help.visible) {
      if (
        Phaser.Input.Keyboard.JustDown(this.keys.space) ||
        Phaser.Input.Keyboard.JustDown(this.keys.enter)
      ) {
        this.toggleHelp();
      }
      return;
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.down)) {
      for (let i = this.sel + 1; i < this.items.length; i++) {
        if (!this.items[i].locked) return this.select(i);
      }
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.up)) {
      for (let i = this.sel - 1; i >= 0; i--) {
        if (!this.items[i].locked) return this.select(i);
      }
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.enter)) {
      this.items[this.sel].action();
    }
  }
}
