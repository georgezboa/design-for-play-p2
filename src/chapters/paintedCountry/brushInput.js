// Chapter 4 // THE PAINTED COUNTRY — one brush, three hands.
//
// Every room reads its brush through this object instead of the raw pointer,
// so the mouse, the keyboard and a gamepad are the same verbs:
//
//   aim    mouse · I J K L · right stick          (a virtual cursor)
//   paint  left mouse · F · pad RT / RB           ("apply")
//   wash   right mouse · SHIFT · pad LT / LB      ("take")
//
// Round 6 (feedback item 18, the cross-chapter controls decision): Butch
// walks on A / D and ← / →, jumps on SPACE, W and ↑ (pad A, or Y), and reads
// / talks / confirms on E or ENTER (pad X). SPACE is never the brush any more
// and the arrows never aim it: in a chapter with a jump, SPACE only jumps.
// The keyboard brush moved to the right hand (I J K L aim, F paints, SHIFT
// washes) so the left hand keeps walking.
//
// The virtual cursor rides with Butch: it is kept as an offset from the
// anchor, so the brush does not get left behind when he walks. With no anchor
// (the studio's easel, the yard) it is clamped to the view instead.

import Phaser from 'phaser';
import { UI } from './chapterUi.js';

const DEADZONE = 0.28;

export class BrushInput {
  constructor(scene, { anchor = null, radius = null, speed = 360 } = {}) {
    this.scene = scene;
    this.anchor = anchor;
    this.radius = radius;
    this.speed = speed;
    this.mode = 'mouse';
    this.device = 'mouse';
    this.offset = { x: 60, y: -40 };
    this.screen = { x: 480, y: 300 };
    this.worldX = 0;
    this.worldY = 0;
    this.x = 0;
    this.y = 0;
    this.paintDown = false;
    this.washDown = false;
    this.paintPressed = false;
    this.washPressed = false;
    this.prev = { paint: false, wash: false };
    this.lastPointer = { x: -1, y: -1 };
    this.queued = { paint: false, wash: false };
    this.padPrev = {};
    this.keys = scene.input.keyboard.addKeys({
      // walking and jumping (the unified keys)
      left: 'LEFT', right: 'RIGHT', up: 'UP', space: 'SPACE',
      // the keyboard brush: aim, paint, wash
      aimUp: 'I', aimLeft: 'J', aimDown: 'K', aimRight: 'L', paint: 'F', wash: 'SHIFT',
    });
    scene.input.keyboard.addCapture(['UP', 'DOWN', 'LEFT', 'RIGHT', 'SPACE']);
    // A click can begin and end between two frames. Remember the press so a
    // tap is as reliable as a held stroke.
    this.onPointerDown = (pointer) => {
      this.mode = 'mouse';
      this.device = 'mouse';
      if (pointer.rightButtonDown()) this.queued.wash = true;
      else if (pointer.leftButtonDown()) this.queued.paint = true;
      this.rawSamples?.push({ x: pointer.x, y: pointer.y, wash: pointer.rightButtonDown() });
    };
    scene.input.on('pointerdown', this.onPointerDown);
    // Every pointer position seen between two frames while a button is held,
    // so a fast stroke at a low frame rate still leaves no gaps.
    this.rawSamples = [];
    this.samples = [];
    this.onPointerMove = (pointer) => {
      if (pointer.leftButtonDown() || pointer.rightButtonDown()) {
        this.rawSamples.push({ x: pointer.x, y: pointer.y, wash: pointer.rightButtonDown() });
      }
    };
    scene.input.on('pointermove', this.onPointerMove);
    // Phaser forgets a key whose down and up both land between two frames
    // (Key.onUp clears _justDown). On a slow machine that eats quick taps, so
    // the taps that matter are latched from the raw keydown event instead.
    this.tapped = { e: false, jump: false, enter: false, paint: false, wash: false };
    this.onKeyDown = (event) => {
      if (event.repeat) return;
      if (event.code === 'KeyE') this.tapped.e = true;
      else if (event.code === 'KeyW' || event.code === 'ArrowUp' || event.code === 'Space') this.tapped.jump = true;
      else if (event.code === 'Enter' || event.code === 'NumpadEnter') this.tapped.enter = true;
      else if (event.code === 'KeyF') this.tapped.paint = true;
      else if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') this.tapped.wash = true;
    };
    scene.input.keyboard.on('keydown', this.onKeyDown);
    this.cursor = scene.add.graphics().setDepth(95);
  }

  get pad() {
    return this.scene.input.gamepad?.pad1 ?? null;
  }

  padEdge(name, value) {
    const was = this.padPrev[name];
    this.padPrev[name] = value;
    return Boolean(value && !was);
  }

  // Walking and the other buttons, merged across keyboard and gamepad.
  // `keys` is the room's own { a, d, w, e } (plus anything else it reads).
  readMove(keys) {
    const pad = this.pad;
    let left = keys.a.isDown || this.keys.left.isDown;
    let right = keys.d.isDown || this.keys.right.isDown;
    let jump = keys.w.isDown || this.keys.up.isDown || this.keys.space.isDown || this.tapped.jump;
    let jumpPressed = this.tapped.jump;
    // E and ENTER are one key: read, talk, confirm (round 6 unified keys).
    let interactPressed = this.tapped.e || this.tapped.enter;
    const enterPressed = this.tapped.enter;
    this.tapped.e = false;
    this.tapped.jump = false;
    this.tapped.enter = false;
    if (left || right || jump) this.lastKeyboardMove = true;
    if (pad) {
      const ax = pad.axes.length ? pad.axes[0].getValue() : 0;
      left = left || ax < -0.35 || pad.left;
      right = right || ax > 0.35 || pad.right;
      // A jumps, as in every other chapter; Y and d-pad up are aliases.
      const padJump = Boolean(pad.A || pad.Y || pad.up);
      jump = jump || padJump;
      jumpPressed = this.padEdge('jump', padJump) || jumpPressed;
      interactPressed = this.padEdge('X', pad.X) || interactPressed;
      if (Math.abs(ax) > 0.35 || padJump || pad.X) this.device = 'pad';
      const start = pad.buttons[9]?.pressed;
      if (this.padEdge('start', start)) window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape' }));
    }
    return { left, right, jump, jumpPressed, interactPressed, enterPressed };
  }

  /** ↑ always jumps now (round 6): the arrows walk and never aim. */
  get upArrowJumps() {
    return true;
  }

  /** The keyboard jump keys, as a tag prints them. */
  jumpKeysLabel() {
    return 'SPACE';
  }

  update(dt) {
    const scene = this.scene;
    const cam = scene.cameras.main;
    const pointer = scene.input.activePointer;
    const pad = this.pad;

    if (pointer.x !== this.lastPointer.x || pointer.y !== this.lastPointer.y) {
      if (this.lastPointer.x >= 0) {
        this.mode = 'mouse';
        this.device = 'mouse';
      }
      this.lastPointer = { x: pointer.x, y: pointer.y };
    }

    let ax = 0;
    let ay = 0;
    if (this.keys.aimLeft.isDown) ax -= 1;
    if (this.keys.aimRight.isDown) ax += 1;
    if (this.keys.aimUp.isDown) ay -= 1;
    if (this.keys.aimDown.isDown) ay += 1;
    if (ax || ay) this.device = 'keys';
    if (pad && pad.axes.length >= 4) {
      const sx = pad.axes[2].getValue();
      const sy = pad.axes[3].getValue();
      if (Math.hypot(sx, sy) > DEADZONE) {
        ax += sx;
        ay += sy;
        this.device = 'pad';
      }
    }
    const moving = Math.hypot(ax, ay) > 0.01;
    // Pad: the right trigger (or bumper) paints, the left one washes.
    const padPaint = Boolean(pad && ((pad.R2 ?? 0) > 0.4 || pad.R1));
    const padWash = Boolean(pad && ((pad.L2 ?? 0) > 0.4 || pad.L1));
    const keyPaint = this.keys.paint.isDown || this.tapped.paint || padPaint;
    const keyWash = this.keys.wash.isDown || this.tapped.wash || padWash;
    if (padPaint || padWash) this.device = 'pad';
    else if (this.keys.paint.isDown || this.keys.wash.isDown || this.tapped.paint || this.tapped.wash) this.device = 'keys';
    this.tapped.paint = false;
    this.tapped.wash = false;
    // Aiming with the arrows / stick, or painting from the keyboard / pad,
    // hands the brush to the virtual cursor, starting where the mouse was.
    if (moving || keyPaint || keyWash) {
      if (this.mode === 'mouse') this.adoptPointer(cam, pointer);
      this.mode = 'virtual';
    }

    if (this.mode === 'virtual') {
      const len = Math.max(1, Math.hypot(ax, ay));
      const step = this.speed * dt;
      if (this.anchor) {
        this.offset.x += (ax / len) * step * Math.min(1, Math.hypot(ax, ay));
        this.offset.y += (ay / len) * step * Math.min(1, Math.hypot(ax, ay));
        if (this.radius) {
          const d = Math.hypot(this.offset.x, this.offset.y);
          if (d > this.radius) {
            this.offset.x *= this.radius / d;
            this.offset.y *= this.radius / d;
          }
        }
        const a = this.anchor();
        this.worldX = a.x + this.offset.x;
        this.worldY = a.y + this.offset.y;
        this.x = (this.worldX - cam.worldView.x) * cam.zoom;
        this.y = (this.worldY - cam.worldView.y) * cam.zoom;
        if (this.x < 8 || this.x > cam.width - 8 || this.y < 8 || this.y > cam.height - 8) {
          this.x = Phaser.Math.Clamp(this.x, 8, cam.width - 8);
          this.y = Phaser.Math.Clamp(this.y, 8, cam.height - 8);
          const w = cam.getWorldPoint(this.x, this.y);
          this.worldX = w.x;
          this.worldY = w.y;
          this.offset = { x: this.worldX - a.x, y: this.worldY - a.y };
        }
      } else {
        this.screen.x = Phaser.Math.Clamp(this.screen.x + (ax / len) * step * Math.min(1, Math.hypot(ax, ay)), 8, cam.width - 8);
        this.screen.y = Phaser.Math.Clamp(this.screen.y + (ay / len) * step * Math.min(1, Math.hypot(ax, ay)), 8, cam.height - 8);
        this.x = this.screen.x;
        this.y = this.screen.y;
        const w = cam.getWorldPoint(this.x, this.y);
        this.worldX = w.x;
        this.worldY = w.y;
      }
    } else {
      this.x = pointer.x;
      this.y = pointer.y;
      const w = cam.getWorldPoint(pointer.x, pointer.y);
      this.worldX = w.x;
      this.worldY = w.y;
    }

    // Mouse samples since the last frame, in world and screen space.
    this.samples = this.rawSamples.map((p) => {
      const w = cam.getWorldPoint(p.x, p.y);
      return { x: p.x, y: p.y, worldX: w.x, worldY: w.y, wash: p.wash };
    });
    this.rawSamples = [];

    const mousePaint = pointer.leftButtonDown() && !pointer.rightButtonDown();
    const mouseWash = pointer.rightButtonDown();
    const paintNow = mousePaint || keyPaint || this.queued.paint;
    const washNow = mouseWash || keyWash || this.queued.wash;
    this.paintPressed = paintNow && !this.prev.paint;
    this.washPressed = washNow && !this.prev.wash;
    this.paintDown = paintNow;
    this.washDown = washNow;
    // A queued tap counts as "down" for exactly one frame.
    this.prev = { paint: mousePaint || keyPaint, wash: mouseWash || keyWash };
    if (this.queued.paint && !mousePaint && !keyPaint) this.prev.paint = false;
    if (this.queued.wash && !mouseWash && !keyWash) this.prev.wash = false;
    this.queued = { paint: false, wash: false };
  }

  adoptPointer(cam, pointer) {
    const w = cam.getWorldPoint(pointer.x, pointer.y);
    if (this.anchor) {
      const a = this.anchor();
      this.offset = { x: w.x - a.x, y: w.y - a.y };
      if (!Number.isFinite(this.offset.x) || Math.hypot(this.offset.x, this.offset.y) > (this.radius ?? 9999)) {
        this.offset = { x: 60, y: -40 };
      }
    } else {
      this.screen = { x: Phaser.Math.Clamp(pointer.x, 8, cam.width - 8), y: Phaser.Math.Clamp(pointer.y, 8, cam.height - 8) };
    }
  }

  // Switch between riding with Butch (the room) and roaming the view (a plate
  // viewer, the notes). The cursor keeps its screen position across the swap.
  setAnchor(anchor, radius = this.radius) {
    if (anchor === this.anchor) return;
    const cam = this.scene.cameras.main;
    this.anchor = anchor;
    this.radius = radius;
    if (anchor) {
      const a = anchor();
      this.offset = { x: 60, y: -40 };
      this.worldX = a.x + this.offset.x;
      this.worldY = a.y + this.offset.y;
    } else {
      this.screen = {
        x: Phaser.Math.Clamp(this.x || cam.width / 2, 8, cam.width - 8),
        y: Phaser.Math.Clamp(this.y || cam.height / 2, 8, cam.height - 8),
      };
    }
  }

  // Place the virtual cursor (QA routes, or after a room change).
  aimAt(worldX, worldY) {
    const cam = this.scene.cameras.main;
    this.mode = 'virtual';
    if (this.anchor) {
      const a = this.anchor();
      this.offset = { x: worldX - a.x, y: worldY - a.y };
    } else {
      this.screen = { x: (worldX - cam.worldView.x) * cam.zoom, y: (worldY - cam.worldView.y) * cam.zoom };
    }
    this.worldX = worldX;
    this.worldY = worldY;
  }

  // What to print on a tag for a verb, in the hand the player is using.
  label(verb) {
    const d = this.device;
    const table = {
      paint: { mouse: 'LEFT MOUSE', keys: 'F', pad: 'RT' },
      wash: { mouse: 'RIGHT MOUSE', keys: 'SHIFT', pad: 'LT' },
      paintHold: { mouse: 'LEFT-HOLD', keys: 'HOLD F', pad: 'HOLD RT' },
      washHold: { mouse: 'RIGHT-HOLD', keys: 'HOLD SHIFT', pad: 'HOLD LT' },
      read: { mouse: 'E', keys: 'E', pad: 'X' },
      jump: { mouse: 'SPACE', keys: 'SPACE', pad: 'A' },
      walk: { mouse: 'A / D', keys: 'A / D', pad: 'LEFT STICK' },
      aim: { mouse: 'MOUSE', keys: 'I J K L', pad: 'RIGHT STICK' },
    };
    return table[verb]?.[d] ?? table[verb]?.mouse ?? verb.toUpperCase();
  }

  // The virtual cursor is drawn only when the mouse is not driving it: an
  // amber brush-tip ring, the same amber as every tag's glint.
  drawCursor({ hidden = false, screenSpace = false } = {}) {
    const g = this.cursor;
    g.clear();
    if (hidden || this.mode !== 'virtual') return;
    const x = screenSpace ? this.x : this.worldX;
    const y = screenSpace ? this.y : this.worldY;
    g.setScrollFactor(screenSpace ? 0 : 1);
    g.lineStyle(3, 0x2a1d14, 0.45).strokeCircle(x, y, 9);
    g.lineStyle(2, UI.amber, 0.95).strokeCircle(x, y, 8);
    g.fillStyle(UI.amber, 0.9).fillCircle(x, y, 2.2);
    g.lineStyle(1.5, UI.amber, 0.8);
    g.lineBetween(x - 14, y, x - 10, y);
    g.lineBetween(x + 10, y, x + 14, y);
    g.lineBetween(x, y - 14, x, y - 10);
    g.lineBetween(x, y + 10, x, y + 14);
  }

  destroy() {
    this.scene.input.off('pointerdown', this.onPointerDown);
    this.scene.input.off('pointermove', this.onPointerMove);
    this.scene.input.keyboard?.off('keydown', this.onKeyDown);
    this.cursor.destroy();
  }
}
