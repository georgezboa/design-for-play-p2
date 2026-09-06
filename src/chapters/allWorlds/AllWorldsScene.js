import Phaser from 'phaser';

import { createChapterOutputRegistry } from './chapterOutputRegistry.js';
import { createFinaleCameraDirector } from './finaleCameraDirector.js';
import { FUSION_SPINE_GREYBOX, worldFusionOptionsFromSpine } from './fusionSpineLayout.js';
import { createWorldFusionModel, WORLD_FUSION } from './worldFusionModel.js';

const { width: W, height: H } = FUSION_SPINE_GREYBOX.viewport;
const WORLD_W = FUSION_SPINE_GREYBOX.worldBounds.maxX;
const WALK_Y = FUSION_SPINE_GREYBOX.player.walkY;

function deckPolygon(x, width, lift = 0) {
  const top = 404 - lift;
  const bottom = 520 - lift;
  return [
    new Phaser.Geom.Point(x + 34, top),
    new Phaser.Geom.Point(x + width, top),
    new Phaser.Geom.Point(x + width - 34, bottom),
    new Phaser.Geom.Point(x, bottom),
  ];
}

export class AllWorldsScene extends Phaser.Scene {
  constructor() {
    super('AllWorlds');
  }

  create() {
    this.model = createWorldFusionModel(worldFusionOptionsFromSpine());
    this.chapterOutputs = createChapterOutputRegistry();
    this.cameraDirector = createFinaleCameraDirector({
      viewportWidth: W,
      worldWidth: WORLD_W,
      startFocusX: W / 2,
      maraX: FUSION_SPINE_GREYBOX.anchors.maraX,
    });
    this.lastPlayerX = this.model.snapshot().player.x;

    this.graphics = this.add.graphics().setDepth(0);
    this.player = this.add.container(0, 0).setDepth(10);
    this.player.add([
      this.add.ellipse(0, -34, 28, 34, 0xf0e4ce),
      this.add.rectangle(0, -9, 32, 40, 0x29313e),
      this.add.rectangle(-10, 3, 5, 16, 0xe2a953),
      this.add.rectangle(10, 3, 5, 16, 0xe2a953),
    ]);
    this.foreground = this.add.graphics().setDepth(12);
    this.transitionOverlay = this.add.graphics().setDepth(18).setScrollFactor(0);
    this.ui = this.add.text(30, 28, '', {
      fontFamily: 'Atkinson Hyperlegible, system-ui, sans-serif',
      fontSize: '14px',
      color: '#e9e6dc',
      wordWrap: { width: 900 },
    }).setDepth(20).setScrollFactor(0);
    this.caption = this.add.text(W / 2, H - 48, '', {
      fontFamily: 'Atkinson Hyperlegible, system-ui, sans-serif',
      fontSize: '16px',
      color: '#f4efe5',
      backgroundColor: '#111722dd',
      padding: { x: 12, y: 7 },
    }).setOrigin(0.5).setDepth(20).setScrollFactor(0);

    this.cameras.main.setBounds(0, 0, WORLD_W, H);
    this.cameras.main.setRoundPixels(false);

    this.keys = this.input.keyboard.addKeys({ left: 'LEFT', right: 'RIGHT', a: 'A', d: 'D', q: 'Q', e: 'E', r: 'R' });
    this.input.keyboard.on('keydown-E', () => this.model.pressInteract());
    this.input.keyboard.on('keydown-Q', () => this.model.pressWorldShift());
    this.input.keyboard.on('keydown-R', () => {
      this.model.reset();
      this.cameraDirector.reset();
    });
    this.input.keyboard.on('keydown-F', () => this.toggleFullscreen());

    window.render_game_to_text = () => JSON.stringify(this.getDiagnosticSnapshot());
    window.advanceTime = (ms) => {
      const s = this.model.update(ms, {});
      this.updateDirectedCamera(ms, s, 0);
      this.render(s);
    };
    const initial = this.model.snapshot();
    this.updateDirectedCamera(0, initial, 0);
    this.render(initial);
  }

  connectChapterOutput(chapterId, packet) {
    return this.chapterOutputs.connect(chapterId, packet);
  }

  getDiagnosticSnapshot() {
    return {
      ...this.model.snapshot(),
      camera: this.cameraDirector.snapshot(),
      greybox: {
        name: 'FUSION_SPINE_P0',
        modules: FUSION_SPINE_GREYBOX.modules.map(({ id, slot, x, width }) => ({ id, slot, x, width })),
        worldLoomVisible: true,
        maraVisibleFromVista: true,
      },
      chapterInputs: this.chapterOutputs.snapshot(),
    };
  }

  toggleFullscreen() {
    if (this.scale.isFullscreen) this.scale.stopFullscreen();
    else this.scale.startFullscreen();
  }

  update(_time, delta) {
    const left = this.keys.left.isDown || this.keys.a.isDown;
    const right = this.keys.right.isDown || this.keys.d.isDown;
    const s = this.model.update(delta, { left, right });
    const direction = (right ? 1 : 0) - (left ? 1 : 0);
    this.updateDirectedCamera(delta, s, direction);
    this.render(s);
    this.lastPlayerX = s.player.x;
  }

  updateDirectedCamera(delta, state, direction) {
    const camera = this.cameraDirector.update(delta, {
      playerX: state.player.x,
      direction,
      complete: state.complete,
    });
    this.cameras.main.setScroll(camera.scrollX, 0);
  }

  paletteFor(state) {
    return state.world === WORLD_FUSION.PAINT
      ? { sky: 0xe9dfcc, haze: 0xcbb99d, deck: 0xbd9e82, deckAlt: 0xd3b995, ink: 0x283148, line: 0x4d5c72, cyan: 0x25b8bd, amber: 0xe7a446, red: 0xa14d55 }
      : { sky: 0x0d1727, haze: 0x17283a, deck: 0x23343d, deckAlt: 0x2e4650, ink: 0xc1d0d0, line: 0x345260, cyan: 0x38d6d5, amber: 0xf1ab4f, red: 0xe75b62 };
  }

  drawSpine(g, palette, paper) {
    g.fillStyle(palette.sky, 1).fillRect(0, 0, WORLD_W, H);
    for (let i = 0; i < 40; i++) {
      const x = i * 84;
      const height = 72 + ((i * 47) % 170);
      g.fillStyle(palette.haze, paper ? 0.18 : 0.42).fillRect(x, 404 - height, 54, height);
    }
    for (let i = 0; i < 18; i++) {
      const y = 70 + i * 22;
      g.lineStyle(1, paper ? 0x8a7668 : 0x21404c, paper ? 0.11 : 0.24);
      g.lineBetween(0, y, WORLD_W, y + (paper ? 18 : -18));
    }

    FUSION_SPINE_GREYBOX.modules.forEach((module, index) => {
      const lift = module.slot === 'spine-lift-platform' ? 18 : 0;
      g.fillStyle(index % 2 ? palette.deckAlt : palette.deck, 1).fillPoints(deckPolygon(module.x, module.width, lift), true);
      g.lineStyle(2, palette.ink, 0.58).strokePoints(deckPolygon(module.x, module.width, lift), true);
      g.lineStyle(1, palette.line, 0.45).lineBetween(module.x + 38, 431 - lift, module.x + module.width - 12, 431 - lift);
    });

    // Under-spine ribs establish the shared mechanical skeleton that every
    // material treatment inherits.
    for (let x = 110; x < WORLD_W; x += 170) {
      g.lineStyle(5, palette.line, 0.7).lineBetween(x, 508, x + 54, 566);
      g.lineStyle(3, palette.ink, 0.5).lineBetween(x + 54, 566, x + 116, 508);
      g.fillStyle(palette.ink, 0.8).fillCircle(x + 54, 566, 8);
    }
  }

  drawGridWorld(g, s, palette) {
    const a = s.spine.anchors;
    g.fillStyle(0x263944, 1).fillRect(a.pylonX - 42, 172, 84, 232);
    g.lineStyle(4, palette.line, 0.9).strokeRect(a.pylonX - 42, 172, 84, 232);
    g.fillStyle(s.carriedState.gridLinked ? palette.amber : palette.red, 1).fillCircle(a.pylonX, 222, 20);
    g.lineStyle(5, s.carriedState.gridLinked ? palette.amber : palette.red, 0.95).lineBetween(a.pylonX, 244, a.pylonX, 446);

    // The safety gate is the first clear physical read of the pylon result.
    g.fillStyle(0x17232b, 1).fillRect(a.gateX - 30, 280, 60, 124);
    g.lineStyle(4, s.carriedState.gridLinked ? palette.cyan : palette.red, 0.9).strokeRect(a.gateX - 30, 280, 60, 124);
    if (!s.carriedState.gridLinked) {
      for (let y = 292; y < 396; y += 20) g.lineStyle(5, palette.red, 0.88).lineBetween(a.gateX - 26, y, a.gateX + 26, y);
    }

    g.lineStyle(5, s.carriedState.gridLinked ? palette.amber : palette.line, s.carriedState.gridLinked ? 0.9 : 0.35)
      .lineBetween(a.pylonX + 42, 250, a.brushX - 64, 354);
    g.fillStyle(s.carriedState.paintBridge ? palette.cyan : palette.line, s.carriedState.paintBridge ? 0.9 : 0.28)
      .fillRect(a.cutX, 394, a.witnessDoorX - a.cutX - 42, 14);

    g.fillStyle(s.complete ? palette.amber : 0x243139, 1).fillRect(a.witnessDoorX - 28, 256, 56, 148);
    g.lineStyle(3, s.complete ? palette.cyan : palette.ink, 0.9).strokeRect(a.witnessDoorX - 28, 256, 56, 148);
  }

  drawPaintWorld(g, s, palette) {
    const a = s.spine.anchors;
    g.fillStyle(0xcbb493, 1).fillRect(a.pylonX - 52, 250, 104, 154);
    g.lineStyle(4, palette.line, 0.85).strokeCircle(a.pylonX, 220, 28);
    g.lineStyle(4, palette.cyan, s.carriedState.gridLinked ? 0.9 : 0.16).lineBetween(a.pylonX, 248, a.brushX, 328);

    // Brush Anchor: an unmistakable tool fixed into the shared spine.
    g.fillStyle(0xf0e3cd, 1).fillRect(a.brushX - 32, 282, 64, 122);
    g.lineStyle(6, palette.line, 0.9).lineBetween(a.brushX, 296, a.brushX + 72, 360);
    g.fillStyle(palette.amber, 0.9).fillTriangle(a.brushX + 66, 352, a.brushX + 100, 382, a.brushX + 78, 390);

    // The open chasm is geometrically legible before the painted bridge exists.
    g.fillStyle(0x705b59, 0.85).fillPoints([
      new Phaser.Geom.Point(a.chasmX - 48, 404),
      new Phaser.Geom.Point(a.cutX + 28, 404),
      new Phaser.Geom.Point(a.cutX - 12, 520),
      new Phaser.Geom.Point(a.chasmX - 88, 520),
    ], true);
    if (s.carriedState.paintBridge) {
      g.lineStyle(24, palette.cyan, 0.72).lineBetween(a.chasmX - 22, 410, a.cutX + 12, 410);
      g.lineStyle(5, palette.ink, 0.82).lineBetween(a.chasmX - 22, 410, a.cutX + 12, 410);
      for (let x = a.chasmX; x < a.cutX; x += 34) g.fillStyle(palette.amber, 0.88).fillCircle(x, 406, 4);
    }
  }

  drawWorldLoom(g, s, palette) {
    const { worldLoomX, maraX } = s.spine.anchors;
    const active = s.carriedState.gridLinked && s.carriedState.paintBridge;
    g.fillStyle(0x101722, 0.92).fillRect(worldLoomX - 82, 154, 164, 250);
    for (let r = 78; r >= 26; r -= 17) {
      g.lineStyle(5, r % 2 ? palette.cyan : palette.amber, active ? 0.82 : 0.28).strokeCircle(worldLoomX, 252, r);
    }
    g.lineStyle(6, palette.ink, 0.72).lineBetween(worldLoomX, 154, worldLoomX, 404);
    g.lineStyle(3, palette.cyan, active ? 0.9 : 0.24).lineBetween(worldLoomX - 70, 252, maraX, 324);

    // Mara remains a distant, stable silhouette and destination rather than a
    // quest icon. The final art will replace this scale/occlusion proxy.
    g.fillStyle(0xf0e4ce, 0.95).fillCircle(maraX, 322, 15);
    g.fillStyle(0x30465b, 1).fillTriangle(maraX - 24, 404, maraX + 24, 404, maraX, 336);
    g.lineStyle(3, palette.cyan, 0.75).strokeCircle(maraX, 322, 23);
  }

  drawForeground(palette, paper) {
    const g = this.foreground;
    g.clear();
    // A transition-ready foreground arch. It temporarily covers Butch without
    // hiding the objective, allowing later AE/asset swaps behind it.
    const x = 1160;
    g.fillStyle(paper ? 0xb49778 : 0x172733, 0.96).fillRect(x, 126, 54, 390);
    g.lineStyle(4, palette.ink, 0.58).lineBetween(x + 54, 126, x + 154, 226);
    g.fillStyle(paper ? 0xd7c6a8 : 0x203946, 0.72).fillTriangle(x + 54, 126, x + 178, 126, x + 154, 226);
  }

  drawTransitionOverlay(state, palette) {
    const g = this.transitionOverlay;
    g.clear();
    if (!state.automaticCut.active) return;
    g.fillStyle(0xf4efe4, 0.16).fillRect(0, 0, W, H);
    for (let x = -80; x < W + 80; x += 82) {
      g.lineStyle(14, palette.cyan, 0.42).lineBetween(x, 0, x + 200, H);
    }
  }

  render(s) {
    const g = this.graphics;
    const paper = s.world === WORLD_FUSION.PAINT;
    const palette = this.paletteFor(s);
    g.clear();
    this.drawSpine(g, palette, paper);
    if (paper) this.drawPaintWorld(g, s, palette);
    else this.drawGridWorld(g, s, palette);
    this.drawWorldLoom(g, s, palette);
    this.drawForeground(palette, paper);
    this.drawTransitionOverlay(s, palette);

    this.player.setPosition(s.player.x, WALK_Y);
    this.caption.setText(s.objective);
    const worldLabel = paper ? 'PAINTED COUNTRY' : 'BORROWED GRID';
    const carry = s.carriedState.gridLinked
      ? (s.carriedState.paintBridge ? 'POWER → WIND → BRIDGE' : 'POWER CARRIED')
      : 'NO LINK';
    const camera = this.cameraDirector.snapshot();
    this.ui.setColor(paper ? '#283148' : '#e9e6dc');
    this.ui.setBackgroundColor(paper ? '#e9dfcce8' : '#0d1727cc');
    this.ui.setText(
      `CHAPTER 6 // ALL WORLDS AT ONCE    ·    FUSION SPINE GREYBOX\n`
      + `${worldLabel}   ·   ${carry}   ·   CAMERA ${camera.mode.toUpperCase()}\n`
      + 'Move A/D or ←/→   ·   E connect   ·   Q shift world   ·   R restart   ·   F fullscreen',
    );
  }
}
