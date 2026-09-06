// CAR 04 // THE BORROWED GRID — scene.
// Renders levelData, runs the four pure models, and keeps every important
// state visible in the world: current travels real wires, legal drops show
// mechanical outlines and snap, illegal drops show real spatial conflict,
// stop lights follow the circuit, cars answer the power configuration.

import Phaser from 'phaser';
import * as D from './levelData.js';
import { createPowerGrid } from './model/powerGrid.js';
import { createPlacement } from './model/placement.js';
import { createTraffic } from './model/traffic.js';
import { createProgression } from './model/progression.js';
import { C4, generateCar04Textures, drawPlatform } from './car04Art.js';

const socketById = (id) => D.SOCKETS.find((s) => s.id === id);

export class RetroCyberpunkScene extends Phaser.Scene {
  constructor() {
    super('RetroCyberpunk');
  }

  preload() {
    const base = new URL('../../assets/generated/worlds/world-04-retro-cyberpunk/', import.meta.url);
    this.load.image('c4-bg0', base + 'chunk-00.jpg');
    this.load.image('c4-bg1', base + 'chunk-01.jpg');
    this.load.image('c4-bg2', base + 'chunk-02.jpg');
  }

  create() {
    generateCar04Textures(this);

    // ---- models -------------------------------------------------------
    this.grid = createPowerGrid({ sockets: D.SOCKETS, wires: D.WIRES });
    this.placement = createPlacement({
      ladders: D.LADDERS,
      battery: D.BATTERY,
      batterySockets: D.SOCKETS.filter((s) => D.BATTERY.sockets.includes(s.id)),
      platforms: D.PLATFORMS,
    });
    this.traffic = createTraffic({ cars: D.CARS, stops: D.STOPS, carSize: D.CAR_SIZE });
    this.progress = createProgression({
      bays: D.BAYS,
      respawns: D.RESPAWNS,
      start: D.START,
      goal: D.GOAL,
      hints: D.HINTS,
    });
    this.nowMs = 0;

    // ---- backdrop -------------------------------------------------------
    const bgW = D.WORLD.w / 3;
    for (let i = 0; i < 3; i++) {
      const im = this.add.image(i * bgW, -160, `c4-bg${i}`).setOrigin(0, 0);
      const s = Math.max(bgW / im.width, 900 / im.height);
      im.setScale(s).setScrollFactor(0.35, 0.5).setTint(0x5a6472).setDepth(-10);
    }
    // distance haze + rain streaks
    for (let i = 0; i < 40; i++) {
      const r = this.add.rectangle(
        Math.random() * D.WORLD.w, Math.random() * 700, 1, 14, 0x8fa4bd, 0.25
      ).setScrollFactor(0.6, 0.8).setDepth(-5);
      this.tweens.add({
        targets: r, y: r.y + 500, duration: 1400 + Math.random() * 1600, repeat: -1,
      });
    }

    // ---- world ----------------------------------------------------------
    for (const p of D.PLATFORMS) drawPlatform(this, p);

    // hazard machinery floor: animated crusher pistons
    this.crushers = [];
    for (const h of D.HAZARDS) {
      const g = this.add.graphics();
      g.fillStyle(0x1a0f12, 1);
      g.fillRect(h.x, h.y + h.h - 6, h.w, 6);
      for (let x = h.x + 10; x < h.x + h.w - 20; x += 65) {
        const piston = this.add.rectangle(x, h.y + h.h - 10, 34, 20, C4.red, 0.9);
        const stamp = this.add.rectangle(x, h.y + 26, 40, 12, C4.metal, 1);
        this.tweens.add({
          targets: stamp, y: h.y + 4, duration: 700, yoyo: true, repeat: -1,
          delay: Math.random() * 900, ease: 'Quad.easeIn',
        });
        this.crushers.push(piston, stamp);
      }
    }

    // conductor socket posts + mains cabinet + signal lamps
    this.signalSprites = {};
    for (const s of D.SOCKETS) {
      if (s.kind === 'conductor') {
        this.add.image(s.x, s.y - 30, 'c4-post').setOrigin(0.5, 0);
      } else if (s.kind === 'mains') {
        const cab = this.add.rectangle(s.x, s.y - 20, 64, 110, C4.metal, 1);
        cab.setStrokeStyle(2, C4.brass);
        this.add.rectangle(s.x, s.y - 50, 40, 10, C4.cyan, 0.9); // live bus glow
      } else if (s.kind === 'battery') {
        this.add.image(s.x, s.y - 4, 'c4-cradle').setOrigin(0.5, 1);
      } else if (s.kind === 'signal') {
        const spr = this.add.image(s.x, s.y, 'c4-signal').setOrigin(0.5, 1);
        spr.setTint(0x775555);
        this.signalSprites[s.id] = spr;
      }
    }

    // wires: copper base + cyan glow overlay
    this.wireViews = [];
    for (const w of D.WIRES) {
      const a = socketById(w.a);
      const b = socketById(w.b);
      const base = this.add.line(0, 0, a.x, a.y, b.x, b.y, C4.copper, 0.95).setOrigin(0, 0);
      base.setLineWidth(3);
      const glow = this.add.line(0, 0, a.x, a.y, b.x, b.y, C4.cyan, 0).setOrigin(0, 0);
      glow.setLineWidth(5);
      this.wireViews.push({ a: w.a, b: w.b, glow });
    }
    // conductor link view (the powered ladder) drawn when L1 bridges sockets
    this.sparks = [];

    // ladders
    this.ladderSprites = {};
    for (const l of D.LADDERS) {
      const spr = this.add.image(l.home.x, l.home.y, 'c4-ladder').setOrigin(0.5, 0.5);
      this.ladderSprites[l.id] = spr;
      // rack marks under home positions
      this.add.rectangle(l.home.x, l.home.y + 14, l.w * 0.9, 4, C4.brass, 0.35);
    }

    // battery
    this.batterySprite = this.add.image(D.BATTERY.home.x, D.BATTERY.home.y, 'c4-battery')
      .setOrigin(0.5, 0.5);
    this.batteryRiding = null;

    // cars + track lights
    this.carSprites = {};
    this.trackDots = {};
    for (const c of D.CARS) {
      const spr = this.add.image(0, 0, 'c4-car').setOrigin(0.5, 0);
      this.carSprites[c.id] = spr;
      const route = c.routes.on.map((id) => D.STOPS[id]);
      const dots = [];
      const [A, B] = route;
      const len = Math.hypot(B.x - A.x, B.y - A.y);
      const n = Math.floor(len / 46);
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        dots.push(this.add.circle(
          A.x + (B.x - A.x) * t, A.y + (B.y - A.y) * t - 14, 3, C4.redDim, 1
        ));
      }
      this.trackDots[c.id] = dots;
    }

    // goal door + balcony neon
    this.doorLeaf = this.add.rectangle(D.GOAL.doorX, D.UPPER_Y - 150, 72, 144, C4.metal, 1)
      .setOrigin(0, 0);
    this.add.image(D.GOAL.doorX - 6, D.UPPER_Y - 156, 'c4-door').setOrigin(0, 0).setDepth(-1);
    this.doorLamp = this.add.circle(D.GOAL.doorX + 42, D.UPPER_Y - 148, 4, C4.red, 1);
    this.neonSegs = [];
    for (let i = 0; i < 6; i++) {
      const seg = this.add.rectangle(4620 + i * 160, D.UPPER_Y - 100 - (i % 2) * 26, 120, 6,
        C4.magenta, 0.08);
      this.neonSegs.push(seg);
    }

    // CRT bay signs
    this.add.text(60, 120, 'CAR 04 // THE BORROWED GRID', {
      fontFamily: 'monospace', fontSize: '26px', color: '#ffc98a',
    }).setScrollFactor(0).setDepth(50);
    const sub = this.add.text(60, 152, 'the city still runs. it does not run for you.', {
      fontFamily: 'monospace', fontSize: '13px', color: '#86b8d8',
    }).setScrollFactor(0).setDepth(50);
    this.tweens.add({ targets: sub, alpha: 0, delay: 5200, duration: 900 });
    const bayNames = { bay1: 'BAY 01 // STRUCTURE', bay2: 'BAY 02 // CONDUCTION', bay3: 'BAY 03 // SWITCHING', bay4: 'BAY 04 // REBUILD', bay5: 'BAY 05 // GRID' };
    for (const b of D.BAYS) {
      this.add.image(b.x0 + 130, 96, 'c4-crt').setOrigin(0.5).setDepth(-2);
      this.add.text(b.x0 + 130, 96, bayNames[b.id], {
        fontFamily: 'monospace', fontSize: '13px', color: '#37e0d8',
      }).setOrigin(0.5).setDepth(-1);
    }

    // hint + completion + controls text
    this.hintText = this.add.text(D.VIEW.w / 2, D.VIEW.h - 78, '', {
      fontFamily: 'monospace', fontSize: '15px', color: '#ffc98a',
      backgroundColor: '#14171dcc', padding: { x: 10, y: 5 },
    }).setOrigin(0.5).setScrollFactor(0).setDepth(60).setAlpha(0);
    this.add.text(12, D.VIEW.h - 24, 'ARROWS move/jump · drag ladders & the battery · R reset', {
      fontFamily: 'monospace', fontSize: '11px', color: '#6b7480',
    }).setScrollFactor(0).setDepth(60);
    this.clearText = this.add.text(D.VIEW.w / 2, 200, '', {
      fontFamily: 'monospace', fontSize: '30px', color: '#37e0d8', align: 'center',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(70).setAlpha(0);

    // ---- player ---------------------------------------------------------
    this.playerSprite = this.add.image(D.START.x, D.START.y, 'c4-player').setOrigin(0.5, 1);
    this.player = {
      x: D.START.x, y: D.START.y, vx: 0, vy: 0,
      onGround: false, coyote: 0, buffer: 0, riding: null, dead: 0,
    };

    // ---- input ----------------------------------------------------------
    this.keys = this.input.keyboard.addKeys({
      left: 'LEFT', right: 'RIGHT', up: 'UP', a: 'A', dkey: 'D', w: 'W', r: 'R', space: 'SPACE',
    });
    this.input.keyboard.on('keydown-R', () => this.resetAll());
    ['UP', 'W', 'SPACE'].forEach((k) => this.input.keyboard.on(`keydown-${k}`, () => {
      this.player.buffer = D.PLAYER.bufferMs;
    }));

    this.drag = null;
    this.slotGhost = this.add.graphics().setDepth(40);
    this.input.on('pointerdown', (p) => this.onGrab(p));
    this.input.on('pointermove', (p) => this.onDragMove(p));
    this.input.on('pointerup', (p) => this.onDrop(p));

    // camera
    this.cameras.main.setBounds(0, -160, D.WORLD.w, D.VIEW.h + 280);

    this.bay2Watch = 0;
    this.bay2Flyby = 0;
  }

  // ---- surfaces ----------------------------------------------------------
  surfaces() {
    const out = [];
    for (const p of D.PLATFORMS) out.push({ x0: p.x, x1: p.x + p.w, y: p.y, id: p.id });
    for (const l of D.LADDERS) {
      const pos = this.placement.ladderPos(l.id);
      if (pos.slotId) {
        const slot = l.slots.find((s) => s.id === pos.slotId);
        out.push({ x0: slot.x, x1: slot.x + slot.w, y: slot.y, id: slot.id });
      }
    }
    for (const c of D.CARS) {
      const pf = this.traffic.platform(c.id);
      if (pf) out.push({ x0: pf.x0, x1: pf.x1, y: pf.yTop, id: `car:${c.id}`, car: c.id });
    }
    return out;
  }

  // ---- drag ---------------------------------------------------------------
  worldPoint(p) {
    return { x: p.x + this.cameras.main.scrollX, y: p.y + this.cameras.main.scrollY };
  }

  onGrab(pointer) {
    if (this.drag) return;
    const w = this.worldPoint(pointer);
    const bp = this.placement.batteryPos();
    // While the battery rides the lift its drawn position is the car's deck;
    // it can only be lifted off while the car is locked at a dock.
    let grabPos = bp;
    if (this.batteryRiding) {
      const c = this.traffic.car('car4');
      grabPos = { x: c.x, y: c.y - 28 };
      if (c.mode !== 'dwell') return; // latched shut while travelling
    }
    if (Math.hypot(w.x - grabPos.x, w.y - grabPos.y) < 55) {
      const wasRiding = this.batteryRiding;
      const from = this.placement.detachBattery();
      if (from) this.grid.removeBattery(from);
      if (wasRiding) this.batteryRiding = null;
      this.drag = {
        type: 'battery', x: grabPos.x, y: grabPos.y,
        prev: { socketId: from, x: grabPos.x, y: grabPos.y, riding: wasRiding },
      };
      return;
    }
    for (const l of D.LADDERS) {
      const pos = this.placement.ladderPos(l.id);
      if (Math.abs(w.x - pos.x) < l.w / 2 + 20 && Math.abs(w.y - pos.y) < 34) {
        const from = this.placement.detachLadder(l.id);
        const slot = from ? l.slots.find((s) => s.id === from) : null;
        if (slot && slot.role === 'conductor') this.grid.removeConductor(l.id);
        this.drag = { type: 'ladder', id: l.id, x: pos.x, y: pos.y, prevSlot: from };
        return;
      }
    }
  }

  onDragMove(pointer) {
    if (!this.drag) return;
    const w = this.worldPoint(pointer);
    this.drag.x = w.x;
    this.drag.y = w.y;
  }

  onDrop() {
    if (!this.drag) return;
    const d = this.drag;
    this.drag = null;
    this.slotGhost.clear();
    if (d.type === 'ladder') {
      const l = D.LADDERS.find((x) => x.id === d.id);
      const r = this.placement.tryLadder(d.id, d.x, d.y);
      if (r.ok) {
        this.placement.placeLadder(d.id, r.slot.id);
        if (r.slot.role === 'conductor') {
          this.grid.placeConductor(d.id, r.slot.sockets[0], r.slot.sockets[1]);
        }
        this.lockFlash(r.slot);
      } else if (d.prevSlot) {
        const slot = l.slots.find((s) => s.id === d.prevSlot);
        this.placement.placeLadder(d.id, d.prevSlot);
        if (slot.role === 'conductor') this.grid.placeConductor(d.id, slot.sockets[0], slot.sockets[1]);
        this.conflictFlash(d, r.conflict);
      } else {
        this.placement.returnLadder(d.id);
        this.conflictFlash(d, r.conflict);
      }
    } else {
      // battery: cradle on the cargo lift counts as a seat while it dwells
      const lift = this.traffic.platform('car4');
      if (lift && lift.locked && d.x > lift.x0 && d.x < lift.x1 && Math.abs(d.y - lift.yTop) < 70) {
        this.batteryRiding = 'car4';
        return;
      }
      const r = this.placement.tryBattery(d.x, d.y);
      if (r.ok && r.socket) {
        this.placement.placeBattery(r.socket);
        this.grid.placeBattery(r.socket.id);
        this.seatFlash(r.socket);
      } else if (r.ok && r.free) {
        this.placement.placeBatteryAt(r.free.x, r.free.y);
      } else {
        // failed drops restore the exact previous position
        if (d.prev.riding) {
          const lift = this.traffic.platform('car4');
          if (lift && lift.locked) this.batteryRiding = 'car4';
          else this.placement.placeBatteryAt(d.prev.x, d.prev.y);
        } else if (d.prev.socketId) {
          const s = socketById(d.prev.socketId);
          this.placement.placeBattery(s);
          this.grid.placeBattery(s.id);
        } else {
          this.placement.placeBatteryAt(d.prev.x, d.prev.y);
        }
        this.conflictFlash(d, r.conflict);
      }
    }
  }

  lockFlash(slot) {
    const t = this.add.rectangle(slot.x + slot.w / 2, slot.y + slot.h / 2, slot.w + 14, slot.h + 14)
      .setStrokeStyle(2, C4.cyan, 1).setDepth(41);
    this.tweens.add({ targets: t, alpha: 0, scale: 1.12, duration: 450, onComplete: () => t.destroy() });
  }

  seatFlash(socket) {
    const t = this.add.circle(socket.x, socket.y, 30).setStrokeStyle(2, C4.cyan, 1).setDepth(41);
    this.tweens.add({ targets: t, alpha: 0, scale: 1.6, duration: 500, onComplete: () => t.destroy() });
  }

  conflictFlash(d, conflict) {
    if (conflict) {
      const p = conflict.rect;
      const t = this.add.rectangle(p.x + p.w / 2, p.y + 6, p.w, 12, C4.red, 0.4).setDepth(41);
      this.tweens.add({ targets: t, alpha: 0, duration: 600, onComplete: () => t.destroy() });
    }
    const spr = d.type === 'ladder' ? this.ladderSprites[d.id] : this.batterySprite;
    this.tweens.add({ targets: spr, x: '+=6', duration: 45, yoyo: true, repeat: 3 });
  }

  // ---- per-frame ----------------------------------------------------------
  update(time, delta) {
    const dt = Math.min(delta, 50);
    this.nowMs += dt;

    this.grid.tick(this.nowMs);
    this.traffic.tick(dt, (id) => this.grid.isPowered(id));
    this.handleEvents();
    this.movePlayer(dt);
    this.syncVisuals(dt);
    this.updateCamera(dt);
    this.checkBays();
    this.watchBay2(dt);
  }

  handleEvents() {
    for (const e of this.grid.drainEvents()) {
      if (e.type === 'power-arrive') {
        const s = socketById(e.node);
        if (s) this.spawnSpark(s.x, s.y);
        if (e.node === 'NEON') this.neonRestore();
      }
    }
    for (const e of this.traffic.drainEvents()) {
      if (e.type === 'car-first-dock' && e.car === 'car5' && e.stop === 'b5balcony') {
        this.progress.openGoal();
      }
    }
    for (const e of this.progress.drainEvents()) {
      if (e.type === 'player-fell') this.onFell(e);
      if (e.type === 'goal-open') this.openDoor();
      if (e.type === 'slice-complete') this.onComplete();
      if (e.type === 'hint-shown') this.showHint(e.bay);
    }
    this.placement.drainEvents();
  }

  spawnSpark(x, y) {
    const s = this.add.circle(x, y, 5, C4.cyan, 1).setDepth(35);
    this.tweens.add({
      targets: s, scale: 2.2, alpha: 0, duration: 500, onComplete: () => s.destroy(),
    });
  }

  neonRestore() {
    this.neonSegs.forEach((seg, i) => {
      this.tweens.add({ targets: seg, alpha: 0.95, delay: i * 220, duration: 260 });
    });
  }

  openDoor() {
    this.tweens.add({ targets: this.doorLeaf, y: this.doorLeaf.y - 138, duration: 1400, ease: 'Quad.easeInOut' });
    this.doorLamp.setFillStyle(C4.cyan, 1);
  }

  onComplete() {
    this.clearText.setText('CAR 04 CLEAR\nTHE GRID REMEMBERS YOU');
    this.tweens.add({ targets: this.clearText, alpha: 1, duration: 800 });
  }

  showHint(bay) {
    this.hintText.setText(D.HINTS[bay] || '');
    this.tweens.killTweensOf(this.hintText);
    this.tweens.add({ targets: this.hintText, alpha: 1, duration: 300 });
    this.tweens.add({ targets: this.hintText, alpha: 0, delay: 4600, duration: 700 });
  }

  onFell(e) {
    this.player.x = e.respawn.x;
    this.player.y = e.respawn.y;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.riding = null;
    this.progress.seeFailure(e.bay);
    this.progress.requestHint(e.bay);
  }

  movePlayer(dt) {
    const P = this.player;
    const dtS = dt / 1000;
    const left = this.keys.left.isDown || this.keys.a.isDown;
    const right = this.keys.right.isDown || this.keys.dkey.isDown;
    P.vx = left ? -D.PLAYER.walkSpeed : right ? D.PLAYER.walkSpeed : 0;
    P.vy += D.PLAYER.gravity * dtS;
    P.vy = Math.min(P.vy, 1200);

    const prevFeet = P.y;
    let nx = Phaser.Math.Clamp(P.x + P.vx * dtS, 20, D.WORLD.w - 20);
    let ny = P.y + P.vy * dtS;

    const surfs = this.surfaces();
    P.onGround = false;
    let standing = null;
    // Sticky riding: a car that rises or falls keeps its passenger glued as
    // long as their feet stay near its deck; jumping sets vy<0 and breaks it.
    if (P.riding && P.vy >= 0) {
      const pf = this.traffic.platform(P.riding);
      if (pf && nx > pf.x0 - 8 && nx < pf.x1 + 8 && Math.abs(prevFeet - pf.yTop) < 30) {
        ny = pf.yTop;
        P.vy = 0;
        P.onGround = true;
        standing = { x0: pf.x0, x1: pf.x1, y: pf.yTop, id: `car:${P.riding}`, car: P.riding };
      }
    }
    if (!standing && P.vy >= 0) {
      for (const s of surfs) {
        if (nx > s.x0 - 8 && nx < s.x1 + 8 && prevFeet <= s.y + 2 && ny >= s.y) {
          ny = s.y;
          P.vy = 0;
          P.onGround = true;
          standing = s;
        }
      }
    }
    // riding: carry horizontally with the car's own delta (the y glue above
    // already tracks its vertical motion)
    if (standing && standing.car) {
      const pf = this.traffic.platform(standing.car);
      if (pf) nx += pf.dx;
      P.riding = standing.car;
    } else {
      P.riding = null;
    }

    if (P.onGround) P.coyote = D.PLAYER.coyoteMs;
    else P.coyote -= dt;
    P.buffer -= dt;
    if (P.buffer > 0 && P.coyote > 0) {
      P.vy = D.PLAYER.jumpVelocity;
      P.buffer = 0;
      P.coyote = 0;
      P.onGround = false;
      ny = P.y + P.vy * dtS;
    }

    P.x = nx;
    P.y = ny;

    // hazards + falls
    for (const h of D.HAZARDS) {
      if (P.x > h.x && P.x < h.x + h.w && P.y > h.y && P.y - D.PLAYER.h < h.y + h.h) {
        this.progress.updatePlayer(P.x, P.y);
        this.progress.fell();
        return;
      }
    }
    if (P.y > D.WORLD.killY) {
      this.progress.updatePlayer(P.x, D.WORLD.killY - 50);
      this.progress.fell();
      return;
    }
    this.progress.updatePlayer(P.x, P.y);
  }

  syncVisuals(dt) {
    // player
    this.playerSprite.setPosition(this.player.x, this.player.y);
    this.playerSprite.setFlipX(this.player.vx < 0);

    // ladders follow the placement model (or the drag ghost)
    for (const l of D.LADDERS) {
      const spr = this.ladderSprites[l.id];
      let x; let y; let ghost = false;
      if (this.drag && this.drag.type === 'ladder' && this.drag.id === l.id) {
        x = this.drag.x; y = this.drag.y; ghost = true;
      } else {
        const pos = this.placement.ladderPos(l.id);
        x = pos.x; y = pos.y;
      }
      spr.setPosition(x, y);
      spr.setAlpha(ghost ? 0.75 : 1);
      // conducting ladders glow along the rungs
      const conducting = this.grid.snapshot().conductors[l.id];
      spr.setTint(conducting && this.grid.isPowered(conducting[1]) ? 0x9ff5ef : 0xffffff);
    }

    // battery
    const bp = this.placement.batteryPos();
    let bx = bp.x; let by = bp.y;
    if (this.drag && this.drag.type === 'battery') {
      bx = this.drag.x; by = this.drag.y;
    } else if (this.batteryRiding) {
      const c = this.traffic.car('car4');
      bx = c.x; by = c.y - 28;
    }
    this.batterySprite.setPosition(bx, by);
    this.batterySprite.setAlpha(this.drag && this.drag.type === 'battery' ? 0.8 : 1);
    this.batterySprite.setTint(bp.socketId || this.batteryRiding ? 0xffffff : 0x8a8f99);

    // slot ghost while dragging
    this.slotGhost.clear();
    if (this.drag) {
      let target = null;
      if (this.drag.type === 'ladder') {
        const r = this.placement.tryLadder(this.drag.id, this.drag.x, this.drag.y);
        if (r.ok) target = { x: r.slot.x, y: r.slot.y, w: r.slot.w, h: r.slot.h, ok: true };
        else if (r.conflict) target = { ...this.dragRect(), ok: false };
      } else {
        const r = this.placement.tryBattery(this.drag.x, this.drag.y);
        if (r.ok && r.socket) target = { x: r.socket.x - 28, y: r.socket.y - 52, w: 56, h: 52, ok: true };
        else if (r.ok && r.free) target = { x: r.free.x - 22, y: r.free.y - 26, w: 44, h: 52, ok: true };
        else if (r.conflict) target = { ...this.dragRect(44, 52), ok: false };
      }
      if (target) {
        this.slotGhost.lineStyle(2, target.ok ? C4.cyan : C4.red, target.ok ? 0.9 : 0.7);
        this.slotGhost.strokeRect(target.x, target.y, target.w, target.h);
      }
    }

    // wires + signals follow power
    for (const w of this.wireViews) {
      const on = this.grid.isPowered(w.b);
      const pending = this.grid.isPending(w.b);
      w.glow.setAlpha(on ? 0.75 : pending ? 0.25 + 0.2 * Math.sin(this.nowMs / 60) : 0);
    }
    for (const [id, spr] of Object.entries(this.signalSprites)) {
      const on = this.grid.isPowered(id);
      spr.setTint(on ? 0x8ff2ea : 0x775555);
    }

    // cars + track lights
    for (const c of D.CARS) {
      const st = this.traffic.car(c.id);
      const spr = this.carSprites[c.id];
      spr.setPosition(st.x, st.y);
      const alive = st.mode !== 'parked' && st.mode !== 'parking';
      spr.setTint(alive ? 0xffffff : 0x39404c);
      spr.setAlpha(alive ? 1 : 0.75);
      // stop sequence: dots between the car and its next stop read cyan
      const dots = this.trackDots[c.id];
      const target = st.target ? D.STOPS[st.target] : null;
      for (const dot of dots) {
        if (alive && target) {
          const between = (target.x - st.x) * (dot.x - st.x) > 0
            && Math.abs(dot.x - st.x) < Math.abs(target.x - st.x) + 50;
          dot.setFillStyle(between ? C4.cyan : C4.redDim, 1);
        } else {
          dot.setFillStyle(C4.redDim, 1);
        }
      }
    }
  }

  dragRect(w = 240, h = 16) {
    return { x: this.drag.x - w / 2, y: this.drag.y - h / 2, w, h };
  }

  updateCamera() {
    const cam = this.cameras.main;
    const px = this.player.x;
    const py = this.player.y;
    const zone = D.CAMERA_ZONES.find((z) => px >= z.x0 && px < z.x1);
    let tx;
    if (zone && zone.camX !== null && zone.camX !== undefined) tx = zone.camX;
    else tx = Phaser.Math.Clamp(px - D.VIEW.w / 2, 0, D.WORLD.w - D.VIEW.w);
    const vertical = (zone && zone.followY) || py < 360;
    const ty = vertical ? Phaser.Math.Clamp(py - 400, -160, 0) : 0;
    cam.scrollX += (tx - cam.scrollX) * 0.09;
    cam.scrollY += (ty - cam.scrollY) * 0.07;
  }

  checkBays() {
    const px = this.player.x;
    const py = this.player.y;
    const done = this.progress.snapshot().completed;
    if (!done.includes('bay1') && px > 760) this.progress.markComplete('bay1');
    if (!done.includes('bay2') && px > 1760) this.progress.markComplete('bay2');
    if (!done.includes('bay3') && px > 3260) this.progress.markComplete('bay3');
    if (!done.includes('bay4') && py < 400 && px > 3950) this.progress.markComplete('bay4');
    if (!done.includes('bay5') && px > 4840 && py < 400) this.progress.markComplete('bay5');
  }

  // Bay 2 must show the failure before any text: stand at the dark dock,
  // watch a car pass without stopping, and only then hear one sentence.
  watchBay2(dt) {
    const nearDock = this.player.x > 1080 && this.player.x < 1160 && this.player.onGround
      && this.player.y > D.GROUND_Y - 80;
    if (nearDock && !this.grid.isPowered('SIG2')) {
      this.bay2Watch += dt;
      if (this.bay2Watch > 1600 && this.bay2Flyby === 0) {
        this.bay2Flyby = 1;
        this.progress.seeFailure('bay2');
        const fly = this.add.image(900, 300, 'c4-car').setOrigin(0.5).setTint(0x6a7688).setDepth(-4);
        this.tweens.add({
          targets: fly, x: 2100, duration: 2600, onComplete: () => fly.destroy(),
        });
      }
      if (this.bay2Watch > 4200 && this.bay2Flyby === 1) {
        this.bay2Flyby = 2;
        this.progress.requestHint('bay2');
      }
    } else if (this.grid.isPowered('SIG2')) {
      this.bay2Watch = 0;
    }
  }

  resetAll() {
    this.grid.reset();
    this.placement.reset();
    this.traffic.reset();
    const s = this.progress.reset();
    this.player.x = s.x;
    this.player.y = s.y;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.riding = null;
    this.batteryRiding = null;
    this.bay2Watch = 0;
    this.bay2Flyby = 0;
    this.doorLeaf.y = D.UPPER_Y - 150;
    this.doorLamp.setFillStyle(C4.red, 1);
    for (const seg of this.neonSegs) seg.setAlpha(0.08);
    this.clearText.setAlpha(0);
    this.hintText.setAlpha(0);
    this.cameras.main.scrollX = 0;
    this.cameras.main.scrollY = 0;
  }

  renderToText() {
    return {
      scene: 'car04-borrowed-grid',
      player: {
        x: Math.round(this.player.x),
        y: Math.round(this.player.y),
        onGround: this.player.onGround,
        riding: this.player.riding,
      },
      camera: {
        x: Math.round(this.cameras.main.scrollX),
        y: Math.round(this.cameras.main.scrollY),
      },
      drag: this.drag ? { type: this.drag.type, id: this.drag.id || 'BAT', x: Math.round(this.drag.x), y: Math.round(this.drag.y) } : null,
      batteryRiding: this.batteryRiding,
      placement: this.placement.snapshot(),
      power: this.grid.snapshot(),
      traffic: this.traffic.snapshot(),
      progression: this.progress.snapshot(),
    };
  }
}
