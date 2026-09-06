// Phase II — relay cabinet close-up art "THE MISSING CONTACT" (Wave 1 B /
// relay-closeup-art-owner).
//
// Construction basis (LOCKED, do not redesign):
//   docs/PHASE_II_RELAY_CABINET_KIMI_WORK_PACKAGE.md  §2.2 close-up play,
//   §3 art lock (materials / composition / animation beats), §4.1 state
//   fields + events, §7 prohibitions.
//
// Ownership: this file only. No changes to relayCabinet.js (logic),
// contactInterlockArt.js, GameScene, sfx.js, colors.js or any other file.
// The logic module is programmed against the §4.1 contract only — this file
// never imports it.
//
// Deliberate constraints (same standard as contactInterlockArt.js):
// - No `import Phaser`: only scene.add / scene.tweens from the injected scene
//   and string blend modes ('ADD'), so it runs under plain node with a mock
//   scene.
// - Every colour goes through C(CAR.*); css() only re-encodes a palette value
//   for text styles, it never introduces a new colour. No new hex values.
// - All GameObjects are created once in the constructor. applySnapshot() only
//   clears/redraws Graphics content and sets properties — idempotent for a
//   repeated identical snapshot, safe to call every frame.
// - One-shot animations own their targets through _busy flags; the matching
//   steady-state writer in applySnapshot steps aside while a flag is set, so
//   tweens and steady writes never fight. There are no looping tweens in this
//   module (the tungsten lamp is a steady fixture), so the "loops only start
//   on phase transitions" rule is satisfied vacuously.
// - pointer* methods are pure functional hit tests: they never register
//   scene.input listeners (listener lifecycle belongs to the integration
//   owner). Drag state lives in the module; pointerUp outside every snap
//   radius springs the tip back to its steady target — it can never dangle
//   locked. cancelDrag() is the blur / pointer-leaves-canvas escape hatch
//   (work package §4.3).
//
// SFX hook points (sfx.js is NOT modified): pass `{ sfx }` in options mapping
// onto src/sfx.js at integration time —
//   open()               -> sfx.lever      (latch bolt + door swing)
//   reset key press      -> sfx.lever      (mechanical key)
//   lead-connected       -> sfx.press      (dry ceramic/copper click)
//   lead-disconnected    -> sfx.bump       (cloth lead pulled free)
//   connect-rejected     -> sfx.blocked    (refused landing, local knock)
//   coil-picked          -> sfx.slash      (armature clack)
//   relay-dropped        -> sfx.spring     (armature springs back)
//   test-incomplete      -> sfx.blocked    (handle refuses to bottom out)
//   test-dropout         -> sfx.spring     (single armature bounce)
//   test-ground-fault    -> sfx.bump       (one local spark pop)
//   relay-bridged        -> sfx.checkpoint (three-stage continuity)
//   lead-grabbed         -> sfx.bump       (cloth lead picked up)
// If no sfx object is injected the module stays silent.
//
// Wave 6 visual-correction pass (readability / grouping only — no logic,
// no state machine, no answer changes):
// - Terminal number labels are 14px engraved bakelite tags (dark chip +
//   bright STEEL_HI face), ~1.56x the old 9px print.
// - A free lead tip sways idly (SWAY below): a pure function of the scene
//   clock evaluated in applySnapshot — which the integration layer calls
//   every frame — so it needs no tween, can never stack, fights no drag,
//   and is exactly 0 at t=0 (headless tests pin the clock). Grabbing a tip
//   lifts it 4px, swells it to 1.18x and plays the cloth bump; hover
//   brightens the lug to BRASS_HI.
// - The moving contact spring + silver tip are enlarged so the NC/NO
//   switchover reads from the mechanism alone (the 11 12 / 13 14 print
//   stays as auxiliary device numbering).
// - TEST and RESET sit on one shared cast operator console (dark enamel
//   plate, machined edge, corner rivets) — a shape language distinct from
//   the cream porcelain wiring seats, readable as "operating gear, not a
//   landing site".
//
// Depth plan: the close-up cluster must sit above the world mechanical
// cluster (53–58). The dimming veil is 69 (below the cluster); the close-up
// itself is 70–79 with the door on top.

import { C, CAR } from './colors.js';

// Re-encode an on-palette value as a CSS colour for Phaser text styles.
const css = (n) => `#${n.toString(16).padStart(6, '0')}`;

const DEPTH = Object.freeze({
  DIM: 69, // carriage-edge darkening veil (below the close-up cluster)
  FRAME: 70, // door frame, gasket, rivets, hinges, number plate
  BACK: 71, // cabinet backplate, tungsten lamp, fuse, ground lug, icons
  TERMINAL: 72, // terminal studs, brass nuts, stage lamps, device texts
  RELAY: 73, // relay base, coil, fixed contacts, flag window
  MOVING: 74, // armature + moving contact spring
  GLASS: 75, // smoked glass cover + reflection streaks
  WIRE: 76, // cloth leads
  TIP: 77, // lead tip lugs, ground-fault spark
  HANDLE: 78, // TEST handle, RESET key
  DOOR: 79, // cabinet door (closes over everything)
});

// Canvas reference 960x600; the cabinet close-up is ~720x430 with its centre
// slightly low (cy 335 vs canvas 300) so it reads as an object in the world,
// not a pause menu. Other canvas sizes translate the whole layout.
const BASE_W = 960;
const BASE_H = 600;
const FRAME = Object.freeze({ x: 120, y: 120, w: 720, h: 430 });
const INNER = Object.freeze({ x: 134, y: 134, w: 692, h: 402 });

// Terminal studs (absolute, base canvas). Adjacent studs are spaced
// >= 2*SNAP_R apart so the 22px snap circles never overlap. The stud stack
// mirrors the contact stack inside the glass: NC sits ABOVE NO just like the
// NC contact pair sits above the NO pair (Wave 2 audit #5 — the "connect the
// lower one" spatial intuition must land on the right stud).
const TERMINAL_POS = Object.freeze({
  'coil-a1': { x: 390, y: 430 },
  'coil-a2': { x: 452, y: 452 },
  'nc-12': { x: 518, y: 430 },
  'no-14': { x: 580, y: 452 },
  'gnd-lug': { x: 660, y: 498 },
});
const TERMINAL_IDS = Object.freeze(Object.keys(TERMINAL_POS));

// A2 is a real return-circuit screw but is never a landing site in this
// puzzle (logic: known-but-dead). It stays drawn — visually downgraded as an
// already-bused return screw — but is excluded from the snap set (Wave 2
// audit #2).
const SNAP_IDS = Object.freeze(TERMINAL_IDS.filter((id) => id !== 'coil-a2'));

// Fixed ends of the two cloth leads (input / output terminal blocks).
const ANCHOR_POS = Object.freeze({
  coil: { x: 220, y: 252 },
  output: { x: 740, y: 252 },
});
// Where a free tip hangs at rest, below its anchor block.
const REST_TIP_POS = Object.freeze({
  coil: { x: 238, y: 326 },
  output: { x: 722, y: 326 },
});

const SNAP_R = 22; // terminal magnetic snap radius (spec: at least 22px)
// Micro polish: while dragging, the effective landing radius widens so a
// drop near a legal terminal seats without pixel-perfect aim. Terminals
// are >= 2*SNAP_R apart; at 34px the nearest-wins rule keeps every drop
// unambiguous except a sliver between NC-12 and NO-14, where nearest wins.
const SNAP_R_DRAG = 34;
const TIP_R = 16; // lead-tip grab radius

// Idle sway for a FREE lead tip (Wave 6): slow, small, and tween-free — a
// pure function of scene.time evaluated in applySnapshot (called every
// frame by the integration layer), so it can never stack a tween, fight a
// drag/spring one-shot, or move a seated tip. Both harmonics are sin(t)
// with no phase term, so the offset is exactly {0,0} at t=0 — headless
// tests (no scene clock) keep pixel-exact steady geometry. The two leads
// run different periods so they never swing in lockstep.
const SWAY = Object.freeze({
  ampX: 2.5,
  ampY: 1,
  periodMs: Object.freeze({ coil: 2400, output: 3100 }),
  // Micro polish: free tips sway ONCE on the first cabinet open (a decaying
  // window of this length), then hang still — an attract cue, not a loop.
  onceMs: 1500,
});

// Relay internals (glass cover x400..560, y200..380).
const RELAY = Object.freeze({
  cx: 480,
  coverX: 400,
  coverY: 200,
  coverW: 160,
  coverH: 180,
  armReleasedY: 296,
  armPickedY: 312, // coil energized: armature pulled 16px toward the coil
});

// Bottom cast-iron TEST handle and mechanical RESET key.
const TEST = Object.freeze({
  x: 400,
  y: 492,
  restAngle: -16,
  pressAngle: 10,
  hit: { x: 356, y: 462, w: 92, h: 56 },
});
const RESET = Object.freeze({
  x: 540,
  y: 490,
  hit: { x: 512, y: 468, w: 56, h: 44 },
});

// Stage lamps: input pulse (left block), red witness lamp + output lamp
// (right block). TEST-correct lights them left -> relay -> right, never the
// whole cabinet at once (§3.4.5).
const LAMPS = Object.freeze({
  input: { x: 220, y: 208 },
  witness: { x: 706, y: 208 },
  output: { x: 774, y: 208 },
});

const FUSE_POS = Object.freeze({ x: 606, y: 498 });
const GND_POS = TERMINAL_POS['gnd-lug'];

// Door swing: closed scaleX 1; open() collapses the page toward its left
// hinge to scaleX 0.04 over 240ms — a perspective side-swing that keeps the
// whole page INSIDE the canvas as a thin strip against the left rail (Wave 5
// finding #3: the previous +96° downward rotation threw ~85% of the painted
// page off-canvas). The strip ends at x134+692*0.04 ≈ 162, clear of the
// input block at x170. close() settles half-closed at scaleX 0.55
// (§3.4.2 / §2.3 auto half-close after a pass). Bolt-before-door beat kept.
const DOOR = Object.freeze({
  hingeX: INNER.x,
  hingeY: INNER.y + INNER.h / 2,
  closedScaleX: 1,
  openScaleX: 0.04,
  halfScaleX: 0.55,
});

const NUT_CONNECTED_ANGLE = 8; // brass nut turns 8° on insertion (§3.4.3)
const SNAP_MS = 90; // magnetic pull-in (§3.4.3)
// Coil action beat: 30ms pre-shiver -> 75ms pull-in -> 120ms rebound (§3.4.4)
const COIL_BEAT = Object.freeze({ preMs: 30, pullMs: 75, reboundMs: 120 });
const WITNESS_FLASH_MS = 180; // dropout witness lamp flashes 180ms only (§2.3)
const NC_HINT_ALPHA = 0.48; // dropout residue glint (Wave 5: 0.3 was too faint)

const VALID_LEADS = Object.freeze(new Set(['coil', 'output']));

// TEST outcomes that count as "a result was produced" for the standby-hint
// derivation (Wave 5 finding #2). After any of these, the hint stops; it may
// only resume once the player has REWIRED (lead-connected/disconnected)
// back into a both-leads-connected, untested state.
const TEST_RESULT_STATES = Object.freeze(
  new Set(['incomplete', 'dropout', 'ground-fault', 'passed']),
);

// Ids setHoverTarget accepts — exactly what getHitRegions exposes (A2 is
// excluded there, so it is excluded here too).
const HOVERABLE_IDS = Object.freeze(
  // coil-a2 is hoverable only so the dead return screw can show its
  // restrained red break mark; it is still not a snap target (SNAP_IDS).
  new Set([...SNAP_IDS, 'coil-a2', 'coil-lead', 'output-lead', 'test', 'reset']),
);

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export default class RelayCabinetArt {
  /**
   * @param scene Phaser scene (only scene.add / scene.tweens are used).
   * @param options.width   canvas width  (default 960)
   * @param options.height  canvas height (default 600)
   * @param options.sfx     optional { lever, press, spring, blocked,
   *                        checkpoint, slash, bump } hooks
   */
  constructor(scene, { width = BASE_W, height = BASE_H, sfx = null } = {}) {
    this.scene = scene;
    this.width = width;
    this.height = height;
    this.sfx = sfx;
    // Whole-layout translation for non-960x600 canvases.
    this._ox = (width - BASE_W) / 2;
    this._oy = (height - BASE_H) / 2;

    this.objects = [];
    this.tweens = [];
    this.visible = true;
    this.destroyed = false;

    this._phase = 'idle';
    this._lastEvent = null;
    this._lastSnap = null;
    this._ncHint = false; // dropout residue glint inside the NC contact gap
    this._dropoutHint = null; // last dropoutHint string applied from a snapshot
    // TEST standby hint (Wave 5 finding #2): breathing tungsten rim on the
    // TEST handle while both leads sit connected and untested. Looping tween
    // starts/stops only on pending-phase transitions, never per snapshot.
    this._loops = { testHint: null };
    this._testPending = false;
    this._rewiredAfterResult = false;
    this._doorState = 'closed'; // 'closed' | 'open' | 'half'
    this._drag = null; // { lead } while a tip is being dragged
    this._press = null; // 'test' | 'reset' between pointerDown/pointerUp
    this._hover = null; // setHoverTarget id currently rim-lit, or null
    this._snapPreview = null; // terminal id magnetically previewed mid-drag
    this._dragOrigin = null; // terminal id a live drag started from, if any
    this._swayUntil = 0; // clock deadline of the first-open attract sway
    this._swayedOnce = false; // the attract sway is armed exactly once
    this._baseCursor = undefined; // game's own canvas cursor, captured lazily
    // One-shot animation ownership: while a flag is true the matching steady
    // writer in applySnapshot steps aside so the tween is not fought.
    this._busy = {
      armature: false,
      glint: false,
      handle: false,
      lamps: false,
      witness: false,
      fuse: false,
      coil: false, // coil lead tip
      output: false, // output lead tip
    };
    this._nuts = {}; // terminal id -> rotating brass nut GameObject

    this._build();
  }

  track(object, depth) {
    object.setDepth(depth).setScrollFactor(1);
    this.objects.push(object);
    return object;
  }

  _tween(cfg) {
    const tween = this.scene.tweens.add(cfg);
    this.tweens.push(tween);
    return tween;
  }

  _killLoop(name) {
    const loop = this._loops[name];
    if (loop) {
      loop.remove?.();
      loop.stop?.();
      this._loops[name] = null;
    }
  }

  _p(x, y) {
    return { x: x + this._ox, y: y + this._oy };
  }

  // Micro polish: point-and-click cursor. The art module owns hover/drag
  // state, so it also owns the canvas cursor — an open grab hand over a
  // free lead tip, a closed grip while dragging. The game installs its own
  // custom cursor inline, possibly AFTER this module is constructed, so the
  // baseline is captured at the first override (when the inline value is
  // still the game's), and '' restores it. Without a captured baseline a
  // clear only removes our own override, never the game's cursor.
  // Optional-chained: headless test mocks expose no game.canvas.
  _setCursor(kind) {
    const canvas = this.scene?.game?.canvas;
    if (!canvas || !canvas.style) return;
    if (kind !== '') {
      if (this._baseCursor === undefined) this._baseCursor = canvas.style.cursor;
      canvas.style.cursor = kind;
      return;
    }
    if (this._baseCursor !== undefined) {
      canvas.style.cursor = this._baseCursor;
    } else if (canvas.style.cursor === 'grab' || canvas.style.cursor === 'grabbing') {
      canvas.style.cursor = '';
    }
  }

  // ---------------------------------------------------------------- build --

  _build() {
    this._buildDim();
    this._buildFrame();
    this._buildBack();
    this._buildPatina();
    this._buildTerminalBlocks();
    this._buildStuds();
    this._buildRelay();
    this._buildLeads();
    this._buildHandles();
    this._buildDoor();
  }

  // ~20–25% of the canvas around the cabinet stays visible as dimmed
  // carriage: saturation and value pulled down, never pure black (§3.1).
  _buildDim() {
    const { width: W, height: H } = this;
    const fx = FRAME.x + this._ox;
    const fy = FRAME.y + this._oy;
    const fw = FRAME.w;
    const fh = FRAME.h;
    const strips = [
      { x: W / 2, y: fy / 2, w: W, h: fy }, // top
      { x: W / 2, y: (fy + fh + H) / 2, w: W, h: H - fy - fh }, // bottom
      { x: fx / 2, y: fy + fh / 2, w: fx, h: fh }, // left
      { x: (fx + fw + W) / 2, y: fy + fh / 2, w: W - fx - fw, h: fh }, // right
    ];
    for (const s of strips) {
      if (s.w <= 0 || s.h <= 0) continue;
      // Value pull-down, then a desaturating blue-grey pass on top.
      this.track(this.scene.add.rectangle(s.x, s.y, s.w, s.h, C(CAR.VOID), 0.55), DEPTH.DIM);
      this.track(this.scene.add.rectangle(s.x, s.y, s.w, s.h, C(CAR.GLASS_DARK), 0.25), DEPTH.DIM);
    }
  }

  // The close-up frame IS the cabinet door frame: enamel rails with exposed
  // dark steel edges, a rubber gasket line, rivets, hinge knuckles and the
  // brass number plate. No rounded black modal, no toolbar (§3.1).
  _buildFrame() {
    const g = this.track(this.scene.add.graphics(), DEPTH.FRAME);
    const { x, y, w, h } = FRAME;
    const [ox, oy] = [this._ox, this._oy];
    const T = 14; // rail thickness

    // Rails: damp blue-grey enamel over dark steel.
    g.fillStyle(C(CAR.STEEL_DARK), 1);
    g.fillRect(x + ox, y + oy, w, h);
    g.fillStyle(C(CAR.ENAMEL_HI), 1);
    g.fillRect(x + ox + 2, y + oy + 2, w - 4, T - 2);
    g.fillRect(x + ox + 2, y + oy + h - T, w - 4, T - 2);
    g.fillRect(x + ox + 2, y + oy + T, T - 2, h - 2 * T);
    g.fillRect(x + ox + w - T, y + oy + T, T - 2, h - 2 * T);
    // Machined outer edge + rust flecks along the bottom rail.
    g.lineStyle(2, C(CAR.STEEL_HI), 0.7);
    g.strokeRect(x + ox + 1, y + oy + 1, w - 2, h - 2);
    g.fillStyle(C(CAR.BRASS_DARK), 0.8);
    for (let rx = x + 60; rx < x + w - 40; rx += 150) {
      g.fillRect(rx + ox, y + oy + h - 6, 4, 2);
    }
    // Gasket: the door's rubber seal line just inside the frame.
    g.lineStyle(2, C(CAR.ENAMEL_DARK), 0.95);
    g.strokeRect(INNER.x + ox - 3, INNER.y + oy - 3, INNER.w + 6, INNER.h + 6);
    // Rivets, 2px, spaced along all four rails.
    g.fillStyle(C(CAR.STEEL_HI), 0.9);
    for (let rx = x + 34; rx < x + w - 20; rx += 86) {
      g.fillRect(rx + ox, y + oy + 6, 2, 2);
      g.fillRect(rx + ox, y + oy + h - 8, 2, 2);
    }
    for (let ry = y + 40; ry < y + h - 20; ry += 86) {
      g.fillRect(x + ox + 6, ry + oy, 2, 2);
      g.fillRect(x + ox + w - 8, ry + oy, 2, 2);
    }
    // Hinge knuckles on the left rail (the door pivots here).
    for (const hy of [y + 62, y + h - 76]) {
      g.fillStyle(C(CAR.STEEL_DARK), 1);
      g.fillRect(x + ox - 4, hy + oy, 12, 28);
      g.fillStyle(C(CAR.STEEL_HI), 0.85);
      g.fillRect(x + ox - 4, hy + oy, 2, 28);
      g.fillStyle(C(CAR.BRASS_DARK), 0.9);
      g.fillRect(x + ox + 2, hy + oy + 12, 4, 4);
    }
    // Brass number plate screwed over the top rail (part of the frame, so it
    // never rotates with the door).
    const px = 340 + ox;
    const py = y + oy - 2;
    g.fillStyle(C(CAR.BRASS_MID), 1);
    g.fillRect(px, py, 280, 20);
    g.lineStyle(2, C(CAR.BRASS_DARK), 0.9);
    g.strokeRect(px + 1, py + 1, 278, 18);
    g.fillStyle(C(CAR.BRASS_HI), 0.85); // <=2px highlight edge only
    g.fillRect(px + 2, py + 2, 276, 2);
    g.fillStyle(C(CAR.BRASS_DARK), 1);
    g.fillRect(px + 6, py + 8, 2, 2);
    g.fillRect(px + 272, py + 8, 2, 2);

    const plateStyle = {
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
      fontSize: '9px',
      color: css(C(CAR.ENAMEL_DARK)),
      letterSpacing: 1,
    };
    this.track(
      this.scene.add.text(480 + ox, py + 10, 'DOOR TRACTION INTERLOCK No. 2', plateStyle).setOrigin(0.5),
      DEPTH.FRAME,
    );
  }

  // Cabinet interior: enamel backplate, the single warm tungsten service
  // lamp (brightness expressed as reflections on nearby metal, no bloom
  // blob), porcelain fuse and the bare copper ground lug wiring.
  _buildBack() {
    const g = this.track(this.scene.add.graphics(), DEPTH.BACK);
    const [ox, oy] = [this._ox, this._oy];
    g.fillStyle(C(CAR.ENAMEL_MID), 1);
    g.fillRect(INNER.x + ox, INNER.y + oy, INNER.w, INNER.h);
    // Backplate shading: edges fall toward ENAMEL_DARK, centre stays lit by
    // the tungsten lamp. All faces stay far below hero L*91.
    g.lineStyle(2, C(CAR.ENAMEL_DARK), 0.6);
    g.strokeRect(INNER.x + ox + 2, INNER.y + oy + 2, INNER.w - 4, INNER.h - 4);
    g.fillStyle(C(CAR.ENAMEL_DARK), 0.5);
    g.fillRect(INNER.x + ox, INNER.y + oy + INNER.h - 24, INNER.w, 24);

    // Tungsten service lamp, top centre: steel bracket + 6x6 filament
    // (lamps cap at 6x6) + reflection ticks on the metal around it.
    const lx = 480 + ox;
    const ly = 158 + oy;
    g.fillStyle(C(CAR.STEEL_DARK), 1);
    g.fillRect(lx - 12, ly - 14, 24, 10);
    g.fillStyle(C(CAR.STEEL_MID), 1);
    g.fillRect(lx - 8, ly - 4, 16, 6);
    g.fillStyle(C(CAR.TUNGSTEN), 1);
    g.fillRect(lx - 3, ly - 2, 6, 6);
    g.fillStyle(C(CAR.TUNGSTEN_REFLECT), 0.7);
    g.fillRect(lx - 10, ly - 13, 20, 2); // bracket top edge
    g.fillRect(lx - 26, ly + 8, 2, 2); // stray ticks on the enamel screws
    g.fillRect(lx + 24, ly + 8, 2, 2);

    // Porcelain fuse near the ground lug; darkens on a ground fault.
    this.fuse = this.track(
      this.scene.add.rectangle(FUSE_POS.x + ox, FUSE_POS.y + oy, 10, 20, C(CAR.ENAMEL_HI), 1),
      DEPTH.BACK,
    );
    g.fillStyle(C(CAR.BRASS_MID), 1);
    g.fillRect(FUSE_POS.x + ox - 5, FUSE_POS.y + oy - 13, 10, 4);
    g.fillRect(FUSE_POS.x + ox - 5, FUSE_POS.y + oy + 9, 10, 4);
    // Bare copper run from the ground lug to the frame floor.
    g.lineStyle(2, C(CAR.BRASS_MID), 0.9);
    g.lineBetween(GND_POS.x + ox, GND_POS.y + oy + 8, GND_POS.x + ox, INNER.y + oy + INNER.h - 6);
  }

  // Railway-equipment patina (micro polish): purely decorative, drawn once
  // at BACK depth so every interactive piece sits above it. Insulating
  // washers under the studs, fixed brass busbars and a wire channel, an
  // engraved relay spec plate, low-contrast circuit etching, plate rivets
  // and two wear scratches. No hit regions, no tweens, no text that
  // competes with the wiring — etch alpha caps at 0.18.
  _buildPatina() {
    const g = this.track(this.scene.add.graphics(), DEPTH.BACK);
    const [ox, oy] = [this._ox, this._oy];

    // Insulating washers: a dark bakelite donut under every stud.
    for (const id of Object.keys(TERMINAL_POS)) {
      const t = TERMINAL_POS[id];
      g.fillStyle(C(CAR.ENAMEL_DARK), 0.9);
      g.fillCircle(t.x + ox, t.y + oy, 14);
      g.lineStyle(1, C(CAR.BRASS_DARK), 0.5);
      g.strokeCircle(t.x + ox, t.y + oy, 14);
    }

    // Fixed brass busbars hugging the terminal-row baseline, plus a short
    // vertical wire channel with two clips by the ground lug.
    g.lineStyle(3, C(CAR.BRASS_DARK), 0.55);
    g.lineBetween(372 + ox, 470 + oy, 470 + ox, 470 + oy);
    g.lineBetween(505 + ox, 470 + oy, 612 + ox, 470 + oy);
    g.lineStyle(2, C(CAR.STEEL_DARK), 0.5);
    g.lineBetween(700 + ox, 424 + oy, 700 + ox, 500 + oy);
    g.lineStyle(2, C(CAR.STEEL_MID), 0.5);
    g.lineBetween(696 + ox, 440 + oy, 704 + ox, 440 + oy);
    g.lineBetween(696 + ox, 484 + oy, 704 + ox, 484 + oy);

    // Low-contrast circuit etching on the backplate (never crosses the
    // cloth leads' lanes; alpha capped so the red/grey wires always win).
    g.lineStyle(1, C(CAR.STEEL_DARK), 0.18);
    g.lineBetween(152 + ox, 192 + oy, 330 + ox, 192 + oy);
    g.lineBetween(330 + ox, 192 + oy, 330 + ox, 244 + oy);
    g.lineBetween(600 + ox, 192 + oy, 812 + ox, 192 + oy);
    g.lineBetween(152 + ox, 414 + oy, 300 + ox, 414 + oy);
    g.lineBetween(300 + ox, 414 + oy, 300 + ox, 468 + oy);

    // Backplate rivets and two faint wear scratches.
    g.fillStyle(C(CAR.STEEL_MID), 0.7);
    for (const [rx, ry] of [[152, 152], [808, 152], [152, 520], [808, 520]]) {
      g.fillCircle(rx + ox, ry + oy, 2);
    }
    g.lineStyle(1, C(CAR.STEEL_HI), 0.12);
    g.lineBetween(170 + ox, 160 + oy, 196 + ox, 172 + oy);
    g.lineBetween(760 + ox, 300 + oy, 786 + ox, 318 + oy);

    // Engraved relay spec plate, bottom-left free bay: rating, coil
    // resistance and a service date — device print, not tutorial text.
    const px = 240 + ox;
    const py = 505 + oy;
    g.fillStyle(C(CAR.ENAMEL_DARK), 1);
    g.fillRect(px - 66, py - 23, 132, 46);
    g.lineStyle(1, C(CAR.BRASS_DARK), 0.8);
    g.strokeRect(px - 66, py - 23, 132, 46);
    g.fillStyle(C(CAR.BRASS_MID), 0.9);
    for (const [rx, ry] of [[-60, -17], [60, -17], [-60, 17], [60, 17]]) {
      g.fillCircle(px + rx, py + ry, 1.5);
    }
    const plateStyle = {
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
      fontSize: '7px',
      color: css(C(CAR.STEEL_MID)),
      letterSpacing: 1,
    };
    this.track(this.scene.add.text(px - 56, py - 17, 'RELAY 110V DC', plateStyle), DEPTH.TERMINAL);
    this.track(this.scene.add.text(px - 56, py - 5, '8A  60 OHM', plateStyle), DEPTH.TERMINAL);
    this.track(this.scene.add.text(px - 56, py + 7, 'SERV. 03/1963', plateStyle), DEPTH.TERMINAL);
  }

  // Left pulse-input terminal block (door-latch icon) and right output
  // terminal block (contactor icon). Cream porcelain language follows the
  // project precedent: ENAMEL_HI ceramic + STEEL_HI glaze dots.
  _buildTerminalBlocks() {
    const [ox, oy] = [this._ox, this._oy];
    this._blocks = {};

    const block = (key, bx, by, anchor) => {
      const g = this.track(this.scene.add.graphics(), DEPTH.TERMINAL);
      g.fillStyle(C(CAR.ENAMEL_HI), 1);
      g.fillRoundedRect(bx + ox, by + oy, 100, 64, 4);
      g.lineStyle(2, C(CAR.STEEL_DARK), 0.8);
      g.strokeRoundedRect(bx + ox, by + oy, 100, 64, 4);
      g.fillStyle(C(CAR.STEEL_HI), 0.75);
      g.fillRect(bx + ox + 6, by + oy + 6, 2, 2); // glaze dot
      // Fixed stud where the cloth lead is anchored.
      g.fillStyle(C(CAR.BRASS_MID), 1);
      g.fillRect(anchor.x + ox - 4, anchor.y + oy - 6, 8, 12);
      g.fillStyle(C(CAR.BRASS_DARK), 0.9);
      g.fillRect(anchor.x + ox - 4, anchor.y + oy - 6, 2, 12);
      g.fillStyle(C(CAR.BRASS_HI), 0.8); // <=2px highlight edge
      g.fillRect(anchor.x + ox + 2, anchor.y + oy - 6, 2, 12);
      // Warm reflection from the tungsten lamp on the brass.
      g.fillStyle(C(CAR.TUNGSTEN_REFLECT), 0.45);
      g.fillRect(anchor.x + ox - 4, anchor.y + oy - 8, 8, 2);
      this._blocks[key] = g;
      return g;
    };

    block('coil', 170, 220, ANCHOR_POS.coil);
    block('output', 690, 220, ANCHOR_POS.output);

    // Device glyphs only — no tutorial sentences (§3.2).
    const icon = this.track(this.scene.add.graphics(), DEPTH.TERMINAL);
    // Door-latch icon under the input block: bracket + lever in a detent.
    icon.lineStyle(2, C(CAR.BRASS_MID), 0.9);
    icon.strokeRect(206 + ox, 292 + oy, 12, 18);
    icon.lineBetween(212 + ox, 294 + oy, 218 + ox, 302 + oy);
    icon.fillStyle(C(CAR.BRASS_MID), 0.9);
    icon.fillRect(224 + ox, 300 + oy, 8, 4);
    // Contactor icon under the output block: shell + armature bar.
    icon.lineStyle(2, C(CAR.BRASS_MID), 0.9);
    icon.strokeRect(726 + ox, 292 + oy, 16, 18);
    icon.fillStyle(C(CAR.BRASS_MID), 0.9);
    icon.fillRect(728 + ox, 298 + oy, 12, 3);
    icon.fillRect(728 + ox, 306 + oy, 12, 2);
  }

  // The five terminal studs: bakelite number ring, porcelain seat, brass
  // stud and a separate rotating brass nut (turns 8° on insertion). A2 is
  // deliberately downgraded (Wave 2 audit #2): it is the coil's return
  // screw, already bused to A1 inside the case, so it is drawn darker with
  // an internal link bar and reads as "already wired", not as a legal
  // landing site.
  _buildStuds() {
    const [ox, oy] = [this._ox, this._oy];
    const g = this.track(this.scene.add.graphics(), DEPTH.TERMINAL);

    // Thin case wiring from each relay stud into the relay base strip.
    const into = { 'coil-a1': 408, 'coil-a2': 450, 'nc-12': 520, 'no-14': 552 };
    g.lineStyle(2, C(CAR.BRASS_DARK), 0.8);
    for (const [id, bx] of Object.entries(into)) {
      const t = TERMINAL_POS[id];
      g.lineBetween(t.x + ox, t.y + oy - 8, bx + ox, 394 + oy);
    }

    // Internal bus bar A1 -> A2: the return path is already closed inside
    // the case, which is exactly why A2 never accepts the coil lead.
    g.lineStyle(4, C(CAR.BRASS_DARK), 0.85);
    g.lineBetween(
      TERMINAL_POS['coil-a1'].x + ox, TERMINAL_POS['coil-a1'].y + oy + 7,
      TERMINAL_POS['coil-a2'].x + ox, TERMINAL_POS['coil-a2'].y + oy - 7,
    );

    for (const id of TERMINAL_IDS) {
      const t = TERMINAL_POS[id];
      const isReturnScrew = id === 'coil-a2';
      // Bakelite number ring behind the porcelain seat.
      g.fillStyle(C(CAR.ENAMEL_DARK), 1);
      g.fillCircle(t.x + ox, t.y + oy, 11);
      // A2's seat is darkened ceramic, not the cream of a live landing site.
      g.fillStyle(isReturnScrew ? C(CAR.ENAMEL_DARK) : C(CAR.ENAMEL_HI), 1);
      g.fillCircle(t.x + ox, t.y + oy, 8);
      if (id === 'gnd-lug') {
        // Bare copper ground ear: a plain ring lug on a backplate bolt.
        g.fillStyle(C(CAR.BRASS_MID), 1);
        g.fillCircle(t.x + ox, t.y + oy, 6);
        g.fillStyle(C(CAR.ENAMEL_DARK), 1);
        g.fillCircle(t.x + ox, t.y + oy, 3);
      } else if (isReturnScrew) {
        // Aged return screw: dark brass, no warm reflection, no highlight.
        g.fillStyle(C(CAR.BRASS_DARK), 1);
        g.fillRect(t.x + ox - 3, t.y + oy - 5, 6, 10);
        g.lineStyle(1, C(CAR.STEEL_DARK), 0.9);
        g.lineBetween(t.x + ox - 3, t.y + oy, t.x + ox + 3, t.y + oy);
      } else {
        g.fillStyle(C(CAR.BRASS_MID), 1);
        g.fillRect(t.x + ox - 3, t.y + oy - 5, 6, 10);
        g.fillStyle(C(CAR.TUNGSTEN_REFLECT), 0.4);
        g.fillRect(t.x + ox - 3, t.y + oy - 7, 6, 2);
      }

      // Rotating brass nut (separate GameObject so setAngle is cheap). A2's
      // nut is permanently seated and dark — it never turns.
      const nut = this.track(this.scene.add.graphics(), DEPTH.TERMINAL);
      if (isReturnScrew) {
        nut.fillStyle(C(CAR.BRASS_DARK), 1);
        nut.fillRect(-5, -5, 10, 10);
        nut.lineStyle(2, C(CAR.STEEL_DARK), 0.9);
        nut.lineBetween(-3, 0, 3, 0);
      } else {
        nut.fillStyle(C(CAR.BRASS_MID), 1);
        nut.fillRect(-5, -5, 10, 10);
        nut.lineStyle(1, C(CAR.BRASS_HI), 0.85); // <=2px highlight edge only
        nut.lineBetween(-5, -5, 5, -5);
        nut.lineStyle(2, C(CAR.BRASS_DARK), 0.9);
        nut.lineBetween(-3, 0, 3, 0); // screwdriver slot reads the 8° turn
      }
      nut.setPosition(t.x + ox, t.y + oy);
      nut.setAngle(0);
      this._nuts[id] = nut;
    }

    // Device-style number tags (Wave 6): the only copy allowed inside
    // (§3.2), enlarged from 9px print to 14px faces (~1.56x) engraved on
    // small bakelite chips so they stay readable against the enamel at a
    // glance. The 12/14 tags follow their studs (NC above, NO below); A2's
    // tag moved ABOVE its stud (the operator console now owns the space
    // below) and is dimmed like the screw itself — bused, not a landing
    // site. TEST/RESET nameplates live on the operator console plate in
    // _buildHandles so the plate can never cover them.
    const labelStyle = {
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
      fontSize: '14px',
      color: css(C(CAR.STEEL_HI)),
      letterSpacing: 1,
    };
    const dimLabelStyle = {
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
      fontSize: '14px',
      color: css(C(CAR.STEEL_MID)), // A2: dimmed like its bused screw
      letterSpacing: 1,
    };
    const labels = [
      ['A1', 390, 410, false],
      ['A2', 452, 432, true],
      ['12', 518, 410, false],
      ['14', 580, 472, false],
    ];
    for (const [text, lx, ly, dimmed] of labels) {
      // Engraved bakelite chip behind the face: dark tag, thin brass-dark
      // edge — a screwed-on device label, not a floating HUD string.
      g.fillStyle(C(CAR.ENAMEL_DARK), 1);
      g.fillRoundedRect(lx + ox - 15, ly + oy - 9, 30, 18, 2);
      g.lineStyle(1, C(CAR.BRASS_DARK), dimmed ? 0.5 : 0.9);
      g.strokeRoundedRect(lx + ox - 15, ly + oy - 9, 30, 18, 2);
      this.track(
        this.scene.add.text(lx + ox, ly + oy, text, dimmed ? dimLabelStyle : labelStyle).setOrigin(0.5),
        DEPTH.TERMINAL,
      );
    }
  }

  // Central glass relay: bakelite base strip, copper coil, fixed NC/NO
  // silver contacts, moving armature with its contact spring, smoked glass
  // cover, and the continuity flag window. Resting position: NC closed
  // (moving contact up), NO open; coilEnergized pulls the armature down,
  // opening NC and closing NO.
  _buildRelay() {
    const [ox, oy] = [this._ox, this._oy];
    const g = this.track(this.scene.add.graphics(), DEPTH.RELAY);

    // Bakelite base strip under the cover.
    g.fillStyle(C(CAR.ENAMEL_DARK), 1);
    g.fillRect(396 + ox, 380 + oy, 168, 16);
    g.fillStyle(C(CAR.BRASS_DARK), 0.9);
    g.fillRect(402 + ox, 384 + oy, 3, 3);
    g.fillRect(555 + ox, 384 + oy, 3, 3);

    // Copper coil: BRASS_DARK core with BRASS_MID winding ticks, steel poles.
    g.fillStyle(C(CAR.BRASS_DARK), 1);
    g.fillRect(424 + ox, 330 + oy, 112, 24);
    g.fillStyle(C(CAR.BRASS_MID), 0.95);
    for (let wx = 428; wx < 534; wx += 6) {
      g.fillRect(wx + ox, 332 + oy, 2, 20);
    }
    g.fillStyle(C(CAR.STEEL_MID), 1);
    g.fillRect(420 + ox, 328 + oy, 6, 28);
    g.fillRect(534 + ox, 328 + oy, 6, 28);
    // Warm reflection on the coil brass from the tungsten lamp.
    this.coilGlow = this.track(this.scene.add.graphics(), DEPTH.RELAY);
    this.coilGlow.fillStyle(C(CAR.TUNGSTEN_REFLECT), 0.9);
    this.coilGlow.fillRect(428 + ox, 331 + oy, 104, 2);
    this.coilGlow.setAlpha(0);

    // Fixed contacts: NC above (resting, closed), NO below. Silver = STEEL_HI.
    // Moving spring tip travels with the armature between them.
    g.fillStyle(C(CAR.STEEL_DARK), 1);
    g.fillRect(452 + ox, 208 + oy, 8, 22); // NC support from the top
    g.fillRect(452 + ox, 268 + oy, 8, 22); // NO support from below
    g.fillStyle(C(CAR.STEEL_HI), 1);
    g.fillRect(452 + ox, 230 + oy, 8, 8); // NC silver, bottom edge y238
    g.fillRect(452 + ox, 262 + oy, 8, 8); // NO silver, top edge y262

    // Armature slide guides: this is a plunger-style relay — the armature
    // travels straight up/down in vertical slide rails. There is NO hinge
    // pin (Wave 2 audit #8: a painted pin next to a pure setY translation
    // was a fake pivot; the pin is removed rather than faked).
    g.fillStyle(C(CAR.STEEL_DARK), 1);
    g.fillRect(428 + ox, 282 + oy, 4, 34);
    g.fillRect(528 + ox, 282 + oy, 4, 34);
    g.fillStyle(C(CAR.STEEL_HI), 0.6);
    g.fillRect(430 + ox, 284 + oy, 1, 30);
    g.fillRect(529 + ox, 284 + oy, 1, 30);

    // Dropout residue (Wave 2 audit #4, strengthened after Wave 5 finding
    // #1 — the 4x6 alpha-0.3 dot was too faint to carry the "try the other
    // contact" inference): a 6x8 glint at alpha 0.48 with a 2px rim stays
    // inside the NC contact gap — the mechanical reason the output died —
    // until the next connect / test state change clears it. Still no
    // flashing, no looping tween, no text.
    this.ncGapHint = this.track(
      this.scene.add.rectangle(456 + ox, 246 + oy, 6, 8, C(CAR.LAMP_ALERT), 0),
      DEPTH.RELAY,
    );
    this.ncGapHint.setStrokeStyle(2, C(CAR.LAMP_ALERT), 0.5);

    // Contact print inside the cover (device numbering, not tutorial text).
    const printStyle = {
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
      fontSize: '8px',
      color: css(C(CAR.STEEL_HI)),
      letterSpacing: 1,
    };
    this.track(this.scene.add.text(414 + ox, 226 + oy, '11 12', printStyle), DEPTH.RELAY);
    this.track(this.scene.add.text(414 + ox, 258 + oy, '13 14', printStyle), DEPTH.RELAY);

    // Dropout hint (failure-feedback hook): the logic layer owns the one
    // allowed line (snapshot().dropoutHint, RELAY_DROPOUT_HINT in
    // phases/relayCabinet.js); the art only renders the field VERBATIM —
    // never rewrites, truncates or extends it. One text object created at
    // build; show/hide is a pure setAlpha in applySnapshot (no tween, so
    // the leak check's liveTweens bound is untouched, and a module-wide
    // setVisible(true) on re-open can't force it visible without a
    // dropout). Positioned just above the glass cover, beside the NC
    // contact stack (11-12, the upper pair): the stud row below is fully
    // occupied by the number tags and the operator console.
    const hintStyle = {
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
      fontSize: '9px',
      color: css(C(CAR.LAMP_ALERT)),
      letterSpacing: 1,
    };
    this.dropoutHintText = this.track(
      this.scene.add.text(480 + ox, 186 + oy, '', hintStyle).setOrigin(0.5),
      DEPTH.RELAY,
    );
    this.dropoutHintText.setAlpha(0);

    // Continuity flag window in the base strip: empty until solved, then a
    // single continuous brass line (§2.3 correct result).
    this.flagGfx = this.track(this.scene.add.graphics(), DEPTH.RELAY);

    // Armature + moving contact spring, drawn around its own origin so a
    // state change is a pure setY / tween-y translation along the slide
    // guides (plunger relay, no pivot — see the guide rails above).
    const arm = this.track(this.scene.add.graphics(), DEPTH.MOVING);
    arm.fillStyle(C(CAR.STEEL_MID), 1);
    arm.fillRoundedRect(-46, -5, 92, 10, 2);
    arm.lineStyle(1, C(CAR.STEEL_HI), 0.8);
    arm.lineBetween(-44, -5, 44, -5);
    // Guide shoes riding the slide rails at both ends of the bar.
    arm.fillStyle(C(CAR.STEEL_DARK), 1);
    arm.fillRect(-50, -6, 6, 12);
    arm.fillRect(44, -6, 6, 12);
    // Wave 6: wider contact spring strip (6px vs 4px) and a much larger
    // moving silver (12x12 vs 8x8) so the NC->NO switchover reads from the
    // mechanism alone, not from the small print. Edge semantics preserved:
    // released top 234 presses 4px INTO the NC silver (spring overtravel,
    // NC sprung closed); picked bottom 262 lands exactly on the NO silver
    // top. The open gap is 16px at NO when resting, 12px at NC when
    // picked — either way one gap is visibly open, the other visibly shut.
    arm.fillStyle(C(CAR.STEEL_MID), 1);
    arm.fillRect(-23, -52, 6, 47); // contact spring strip
    arm.fillStyle(C(CAR.STEEL_HI), 1);
    arm.fillRect(-26, -62, 12, 12); // moving silver tip: released top 234
    // (NC closed, overtravel), bottom 246 -> 16px NO gap; picked top 250
    // -> 12px NC gap, bottom 262 (NO closed)
    arm.setPosition(RELAY.cx + ox, RELAY.armReleasedY + oy);
    this.armature = arm;

    // Smoked glass cover over the works + reflection streaks that flicker
    // with the coil beat (§3.4.4: glass reflection follows the shake).
    const glass = this.track(this.scene.add.graphics(), DEPTH.GLASS);
    glass.fillStyle(C(CAR.GLASS_DARK), 0.32);
    glass.fillRoundedRect(
      RELAY.coverX + ox, RELAY.coverY + oy, RELAY.coverW, RELAY.coverH, 4,
    );
    glass.lineStyle(2, C(CAR.STEEL_MID), 0.9);
    glass.strokeRoundedRect(
      RELAY.coverX + ox, RELAY.coverY + oy, RELAY.coverW, RELAY.coverH, 4,
    );
    glass.lineStyle(1, C(CAR.BRASS_MID), 0.45); // control faces cap at BRASS_MID
    glass.strokeRoundedRect(
      RELAY.coverX + ox + 4, RELAY.coverY + oy + 4,
      RELAY.coverW - 8, RELAY.coverH - 8, 3,
    );
    this.glassGlint = this.track(this.scene.add.graphics(), DEPTH.GLASS);
    this.glassGlint.lineStyle(2, C(CAR.STEEL_HI), 1);
    this.glassGlint.lineBetween(412 + ox, 214 + oy, 446 + ox, 300 + oy);
    this.glassGlint.lineStyle(1, C(CAR.STEEL_HI), 1);
    this.glassGlint.lineBetween(540 + ox, 220 + oy, 552 + ox, 268 + oy);
    this.glassGlint.setAlpha(0.18);
  }

  // The two cloth leads. Fixed end on the terminal block, free tip
  // draggable. Paths are S-curve droops sampled from a cubic bezier and
  // drawn as 2px segments (§3.3); when solved the wires pull slightly taut.
  _buildLeads() {
    const [ox, oy] = [this._ox, this._oy];
    this._wireGfx = {};
    this._tipGo = {};
    for (const lead of VALID_LEADS) {
      this._wireGfx[lead] = this.track(this.scene.add.graphics(), DEPTH.WIRE);
      // Crimp ring tip: bakelite core + brass ring, grabbed by TIP_R. Wave
      // 6: r7 lug (up from r6) so the two live leads read as the
      // cabinet's only movable hardware at a glance; hover swaps the ring
      // to BRASS_HI (_restyleTipHover).
      const rest = REST_TIP_POS[lead];
      const tip = this.track(
        this.scene.add.circle(rest.x + ox, rest.y + oy, 7, C(CAR.ENAMEL_DARK), 1),
        DEPTH.TIP,
      );
      tip.setStrokeStyle(2, C(CAR.BRASS_MID), 1);
      this._tipGo[lead] = tip;
    }
    // One local ground-fault spark: a single 4x4 tungsten ADD flash at the
    // ground lug (§2.3: one spark, porcelain fuse darkens, no screen shake).
    this.spark = this.track(
      this.scene.add
        .rectangle(GND_POS.x + ox, GND_POS.y + oy, 4, 4, C(CAR.TUNGSTEN), 0)
        .setBlendMode('ADD'),
      DEPTH.TIP,
    );

    // Stage lamps (left input / red witness / right output).
    this.inputLamp = this.track(
      this.scene.add.circle(LAMPS.input.x + ox, LAMPS.input.y + oy, 3, C(CAR.ENAMEL_DARK), 1),
      DEPTH.TERMINAL,
    );
    this.inputLamp.setStrokeStyle(1, C(CAR.STEEL_MID), 0.8);
    this.witnessLamp = this.track(
      this.scene.add.circle(LAMPS.witness.x + ox, LAMPS.witness.y + oy, 3, C(CAR.ENAMEL_DARK), 1),
      DEPTH.TERMINAL,
    );
    this.witnessLamp.setStrokeStyle(1, C(CAR.STEEL_MID), 0.8);
    this.outputLamp = this.track(
      this.scene.add.circle(LAMPS.output.x + ox, LAMPS.output.y + oy, 3, C(CAR.ENAMEL_DARK), 1),
      DEPTH.TERMINAL,
    );
    this.outputLamp.setStrokeStyle(1, C(CAR.STEEL_MID), 0.8);
  }

  _buildHandles() {
    const [ox, oy] = [this._ox, this._oy];
    const g = this.track(this.scene.add.graphics(), DEPTH.HANDLE);

    // Operator console (Wave 6 grouping): TEST and RESET share one cast
    // plate — dark enamel, machined steel edge, corner rivets. The shape
    // language reads "operating gear" and is deliberately disjoint from
    // the wiring language above (cream porcelain seats + brass studs +
    // snap circles): nothing on this plate is round, porcelain, or a
    // landing site. The plate clears the A2 stud (bottom 463) and stops
    // left of the no-14 stud (x569) and the fuse (x601).
    g.fillStyle(C(CAR.ENAMEL_DARK), 1);
    g.fillRoundedRect(344 + ox, 464 + oy, 218, 70, 3);
    g.lineStyle(2, C(CAR.STEEL_MID), 0.9);
    g.strokeRoundedRect(344 + ox, 464 + oy, 218, 70, 3);
    g.lineStyle(1, C(CAR.STEEL_HI), 0.5); // machined top edge catching the lamp
    g.lineBetween(348 + ox, 466 + oy, 558 + ox, 466 + oy);
    g.fillStyle(C(CAR.STEEL_HI), 0.85);
    for (const [rx, ry] of [[350, 470], [556, 470], [350, 526], [556, 526]]) {
      g.fillRect(rx + ox, ry + oy, 2, 2); // corner rivets
    }

    // Cast-iron TEST handle: STEEL_DARK pedestal, lever drawn around its
    // pivot so pressing is a pure angle change.
    g.fillStyle(C(CAR.STEEL_DARK), 1);
    g.fillRect(TEST.x + ox - 44, TEST.y + oy + 2, 88, 20);
    g.fillStyle(C(CAR.STEEL_MID), 0.9);
    g.fillRect(TEST.x + ox - 40, TEST.y + oy + 4, 80, 3);
    g.fillStyle(C(CAR.BRASS_DARK), 0.9);
    g.fillRect(TEST.x + ox - 36, TEST.y + oy + 12, 3, 3);
    g.fillRect(TEST.x + ox + 33, TEST.y + oy + 12, 3, 3);
    const lever = this.track(this.scene.add.graphics(), DEPTH.HANDLE);
    lever.fillStyle(C(CAR.STEEL_DARK), 1);
    lever.fillRect(0, -3, 64, 6);
    lever.fillRoundedRect(58, -8, 16, 16, 3); // grip knob
    lever.lineStyle(1, C(CAR.STEEL_HI), 0.75);
    lever.lineBetween(2, -3, 62, -3);
    lever.fillStyle(C(CAR.STEEL_MID), 1);
    lever.fillCircle(0, 0, 6); // pivot boss
    lever.setPosition(TEST.x + ox - 34, TEST.y + oy);
    lever.setAngle(TEST.restAngle);
    this.testLever = lever;

    // Standby hint (Wave 5 finding #2): a 2px tungsten-reflection rim around
    // the handle body that breathes slowly (Sine, 900ms yoyo = 1800ms cycle)
    // ONLY while both leads are connected and no TEST result has been
    // produced for the current wiring. Restrained: alpha peaks at 0.5.
    this.testHint = this.track(this.scene.add.graphics(), DEPTH.HANDLE);
    this.testHint.lineStyle(2, C(CAR.TUNGSTEN_REFLECT), 1);
    this.testHint.strokeRoundedRect(TEST.x + ox - 48, TEST.y + oy - 16, 96, 42, 3);
    this.testHint.setAlpha(0);

    // Mechanical RESET key: brass push key on a steel bezel.
    g.fillStyle(C(CAR.STEEL_DARK), 1);
    g.fillRect(RESET.x + ox - 16, RESET.y + oy - 12, 32, 24);
    this.resetKey = this.track(
      this.scene.add.circle(RESET.x + ox, RESET.y + oy, 8, C(CAR.BRASS_MID), 1),
      DEPTH.HANDLE,
    );
    this.resetKey.setStrokeStyle(2, C(CAR.BRASS_DARK), 0.9);

    // Console nameplates engraved on the plate itself (HANDLE depth, so
    // the plate can never cover them; moved off the terminal label layer).
    const nameStyle = {
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
      fontSize: '11px',
      color: css(C(CAR.STEEL_HI)),
      letterSpacing: 2,
    };
    this.track(
      this.scene.add.text(TEST.x + ox, 526 + oy, 'TEST', nameStyle).setOrigin(0.5),
      DEPTH.HANDLE,
    );
    this.track(
      this.scene.add.text(RESET.x + ox, 526 + oy, 'RESET', nameStyle).setOrigin(0.5),
      DEPTH.HANDLE,
    );

    // Hover rim (work package §3.1): ONE reusable graphics that draws the
    // 2px brass reflection edge on the hovered hit region. Reused forever —
    // setHoverTarget never allocates another GameObject.
    this.hoverEdge = this.track(this.scene.add.graphics(), DEPTH.HANDLE);
  }

  // The cabinet door: enamel panel with gasket and a brass pull knob. It
  // collapses toward its left hinge (scaleX perspective swing, Wave 5
  // finding #3) so the page stays inside the canvas; close() settles it
  // half-closed (§3.4.2, §2.3).
  _buildDoor() {
    const [ox, oy] = [this._ox, this._oy];
    const door = this.track(this.scene.add.graphics(), DEPTH.DOOR);
    // Local coords: origin at the hinge (left edge, vertical centre).
    door.fillStyle(C(CAR.ENAMEL_MID), 1);
    door.fillRect(0, -INNER.h / 2, INNER.w, INNER.h);
    door.lineStyle(2, C(CAR.ENAMEL_DARK), 0.9);
    door.strokeRect(6, -INNER.h / 2 + 6, INNER.w - 12, INNER.h - 12);
    door.lineStyle(2, C(CAR.ENAMEL_HI), 0.5);
    door.strokeRect(18, -INNER.h / 2 + 18, INNER.w - 36, INNER.h - 36);
    // Rivets + edge wear.
    door.fillStyle(C(CAR.STEEL_HI), 0.85);
    for (let rx = 40; rx < INNER.w - 20; rx += 92) {
      door.fillRect(rx, -INNER.h / 2 + 10, 2, 2);
      door.fillRect(rx, INNER.h / 2 - 12, 2, 2);
    }
    door.fillStyle(C(CAR.BRASS_DARK), 0.7);
    door.fillRect(120, INNER.h / 2 - 10, 6, 2);
    door.fillRect(420, INNER.h / 2 - 10, 4, 2);
    // Brass pull knob on the lock side.
    door.fillStyle(C(CAR.BRASS_DARK), 1);
    door.fillRect(INNER.w - 52, -10, 10, 20);
    door.fillStyle(C(CAR.BRASS_MID), 1);
    door.fillRoundedRect(INNER.w - 46, -8, 14, 16, 3);
    door.fillStyle(C(CAR.BRASS_HI), 0.85); // <=2px highlight edge only
    door.fillRect(INNER.w - 44, -8, 10, 2);
    // Stencil remnant on the door enamel (device marking, not tutorial).
    door.setPosition(DOOR.hingeX + ox, DOOR.hingeY + oy);
    door.scaleX = DOOR.closedScaleX; // swing is a scaleX collapse about the hinge
    this.door = door;

    // Lock bolt on the right frame rail: jumps 4px in 60ms before the door
    // swings (§3.4.2).
    this.latchBolt = this.track(
      this.scene.add.rectangle(
        INNER.x + INNER.w - 10 + ox, DOOR.hingeY + oy, 8, 16, C(CAR.STEEL_HI), 1,
      ),
      DEPTH.DOOR,
    );
  }

  // ------------------------------------------------------- steady redraw --

  // Cubic-bezier S-curve droop between the fixed anchor and the live tip,
  // sampled as 2px segments. Taut (solved) wires lose most of their sag.
  _drawWire(lead, taut) {
    const g = this._wireGfx[lead];
    const a = ANCHOR_POS[lead];
    const tip = this._tipGo[lead];
    const [ox, oy] = [this._ox, this._oy];
    g.clear();

    const x0 = a.x + ox;
    const y0 = a.y + oy + 6;
    const x1 = tip.x;
    const y1 = tip.y;
    const dist = Math.hypot(x1 - x0, y1 - y0);
    const sag = taut ? Math.min(8, dist * 0.03) : Math.min(64, 16 + dist * 0.16);
    // Control points pulled downward by the sag give the natural cloth droop;
    // the asymmetric split keeps the S shape without crossing the contacts.
    const c1x = x0 + (x1 - x0) * 0.3;
    const c1y = y0 + sag;
    const c2x = x0 + (x1 - x0) * 0.72;
    const c2y = y1 + sag * 0.75;

    // Cloth bodies: AMBER is old red-brown (VINYL); CYAN is a faded
    // steel-blue cloth braid (STEEL_HI) — deliberately NOT LAMP_OK, which
    // the world reserves for energized lit segments (Wave 2 audit #6:
    // sharing the token made the loose wire read as "already live").
    // Hero accents stay untouched: HERO_* never leaves the hero.
    const body = lead === 'coil' ? C(CAR.VINYL) : C(CAR.STEEL_HI);
    const strand = lead === 'coil' ? C(CAR.VINYL_HI) : C(CAR.STEEL_HI);
    const bodyAlpha = lead === 'coil' ? 0.95 : 0.66; // faded blue-grey cloth

    const N = 16;
    let px = x0;
    let py = y0;
    g.lineStyle(2, body, bodyAlpha);
    const pts = [];
    for (let i = 1; i <= N; i += 1) {
      const t = i / N;
      const mt = 1 - t;
      const bx = mt ** 3 * x0 + 3 * mt ** 2 * t * c1x + 3 * mt * t ** 2 * c2x + t ** 3 * x1;
      const by = mt ** 3 * y0 + 3 * mt ** 2 * t * c1y + 3 * mt * t ** 2 * c2y + t ** 3 * y1;
      g.lineBetween(px, py, bx, by);
      pts.push([bx, by]);
      px = bx;
      py = by;
    }
    // Cloth weave: a lighter strand tracing the same path 1px up.
    g.lineStyle(1, strand, lead === 'coil' ? 0.5 : 0.3);
    let sx = x0;
    let sy = y0 - 1;
    for (const [bx, by] of pts) {
      g.lineBetween(sx, sy, bx, by - 1);
      sx = bx;
      sy = by - 1;
    }
    // Crimp collar where the cloth meets the tip lug.
    g.fillStyle(C(CAR.BRASS_DARK), 0.95);
    g.fillRect(x1 - 3, y1 - 7, 6, 6);
  }

  _drawFlag(solved) {
    const g = this.flagGfx;
    const [ox, oy] = [this._ox, this._oy];
    g.clear();
    g.fillStyle(C(CAR.VOID_LIFT), 1);
    g.fillRect(468 + ox, 383 + oy, 24, 10);
    g.lineStyle(1, C(CAR.STEEL_MID), 0.8);
    g.strokeRect(468 + ox, 383 + oy, 24, 10);
    if (solved) {
      // The mechanical flag shows one continuous line (§2.3).
      g.fillStyle(C(CAR.BRASS_MID), 1);
      g.fillRect(470 + ox, 387 + oy, 20, 2);
    }
  }

  // Steady tip position from the wiring snapshot: on the connected terminal,
  // or hanging at rest when free. Unknown / illegal-out-of-set terminal ids
  // fall back to rest — the art never throws on logic data.
  _steadyTip(lead, terminal) {
    const base = terminal && TERMINAL_POS[terminal] ? TERMINAL_POS[terminal] : REST_TIP_POS[lead];
    return this._p(base.x, base.y);
  }

  // Tween-free attract sway for a free tip: a pure function of the scene
  // clock, evaluated from applySnapshot (which the integration layer calls
  // every frame). Micro polish: it runs only inside the one-shot window
  // armed by the FIRST open() (decaying amplitude to zero at the deadline),
  // then the tips hang still. Zero while hidden, zero without a clock
  // (headless tests pin t=0), and zero at elapsed t=0 by construction — so
  // steady geometry assertions stay pixel-exact and the sway can never
  // fight a drag or a one-shot tween (both are guarded before this is ever
  // consulted).
  _swayOffset(lead) {
    if (!this.visible) return { x: 0, y: 0 };
    const now = this.scene.time?.now ?? 0;
    const remain = this._swayUntil - now;
    if (remain <= 0) return { x: 0, y: 0 };
    const elapsed = SWAY.onceMs - remain;
    const decay = remain / SWAY.onceMs;
    const w = (Math.PI * 2) / SWAY.periodMs[lead];
    return {
      x: Math.sin(elapsed * w) * SWAY.ampX * decay,
      y: Math.sin(elapsed * w * 2) * SWAY.ampY * decay,
    };
  }

  // -------------------------------------------------------------- public --

  /** Idempotent steady-state redraw. Safe to call every frame. */
  applySnapshot(snap) {
    if (this.destroyed || !snap) return;
    this._lastSnap = { ...snap };
    this._phase = typeof snap.testState === 'string' ? snap.testState : 'idle';

    const taut = Boolean(snap.solved);
    this._drawWire('coil', taut);
    this._drawWire('output', taut);
    this._drawFlag(Boolean(snap.solved));

    // Lead tips + brass nuts follow the wiring, unless a drag or a one-shot
    // snap/spring tween owns the tip right now. A FREE tip gets the Wave 6
    // idle sway (pure clock function, exactly 0 at t=0); a seated tip
    // never sways.
    const terminals = { coil: snap.coilLeadTerminal, output: snap.outputLeadTerminal };
    for (const lead of VALID_LEADS) {
      if (this._busy[lead] || this._drag?.lead === lead) continue;
      const p = this._steadyTip(lead, terminals[lead]);
      const sway = terminals[lead] ? { x: 0, y: 0 } : this._swayOffset(lead);
      this._tipGo[lead].setPosition(p.x + sway.x, p.y + sway.y);
    }
    const connected = new Set([snap.coilLeadTerminal, snap.outputLeadTerminal]);
    for (const id of SNAP_IDS) {
      // A2 is deliberately excluded: its return-screw nut never turns.
      this._nuts[id].setAngle(connected.has(id) ? NUT_CONNECTED_ANGLE : 0);
    }

    // Armature: energized pulls it onto the coil (NC opens, NO closes).
    if (!this._busy.armature) {
      this.armature.setY(
        (snap.coilEnergized ? RELAY.armPickedY : RELAY.armReleasedY) + this._oy,
      );
    }
    if (!this._busy.glint) {
      this.glassGlint.setAlpha(snap.coilEnergized ? 0.42 : 0.18);
      this.coilGlow.setAlpha(snap.coilEnergized ? 0.5 : 0);
    }

    const passed = snap.testState === 'passed' || Boolean(snap.solved);
    if (!this._busy.lamps) {
      const stageFill = passed ? C(CAR.LAMP_OK) : C(CAR.ENAMEL_DARK);
      this.inputLamp.setFillStyle(stageFill, 1);
      this.outputLamp.setFillStyle(stageFill, 1);
    }
    if (!this._busy.witness) {
      // The red witness lamp only ever shines inside the 180ms event flash.
      this.witnessLamp.setFillStyle(C(CAR.ENAMEL_DARK), 1);
      this.witnessLamp.setAlpha(1);
    }
    if (!this._busy.fuse) {
      this.fuse.setFillStyle(
        snap.testState === 'ground-fault' ? C(CAR.ENAMEL_DARK) : C(CAR.ENAMEL_HI),
        1,
      );
    }
    if (!this._busy.handle) {
      this.testLever.setAngle(passed ? TEST.pressAngle : TEST.restAngle);
    }

    // Dropout residue (Wave 2 audit #4): the NC-gap glint is sticky while
    // testState stays 'dropout' and clears the moment the logic moves on
    // (rewire, reset, or a fresh TEST outcome). Steady alpha write keeps
    // applySnapshot idempotent; the glint never flashes and carries no text.
    if (snap.testState !== 'dropout') this._ncHint = false;
    this.ncGapHint.setAlpha(this._ncHint ? NC_HINT_ALPHA : 0);

    // Dropout hint line (failure-feedback hook): snapshot-driven, rendered
    // verbatim from snap.dropoutHint. Non-null shows, null hides; the
    // change guard keeps applySnapshot idempotent (no per-frame setText),
    // and show/hide is setAlpha only — never a tween.
    const hint = typeof snap.dropoutHint === 'string' && snap.dropoutHint.length > 0
      ? snap.dropoutHint
      : null;
    if (hint !== this._dropoutHint) {
      this._dropoutHint = hint;
      if (hint) this.dropoutHintText.setText(hint);
      this.dropoutHintText.setAlpha(hint ? 1 : 0);
    }

    // TEST standby hint phase derivation (pure art-layer inference, Wave 5
    // finding #2): the wiring is pending a TEST when both leads sit on
    // terminals AND either no TEST has run yet (testState 'idle') or the
    // player has rewired after the last outcome (_rewiredAfterResult, set by
    // lead-connected/lead-disconnected while the previous result was still
    // latched). Any TEST outcome event stops the hint immediately.
    const bothConnected = Boolean(snap.coilLeadTerminal) && Boolean(snap.outputLeadTerminal);
    const pending = bothConnected
      && (this._phase === 'idle' || (this._rewiredAfterResult && this._phase !== 'passed'));
    if (pending !== this._testPending) this._transitionTestHint(pending);

    // Rim/pulse tracks live tip positions; during a drag it also keeps the
    // origin glow and snap preview breathing while the mouse holds still.
    if (this._hover || this._drag) this._drawHoverEdge();
  }

  _transitionTestHint(pending) {
    this._testPending = pending;
    this._killLoop('testHint');
    if (pending) {
      this.testHint.setAlpha(0.15);
      this._loops.testHint = this._tween({
        targets: this.testHint,
        alpha: { from: 0.15, to: 0.5 },
        duration: 900,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    } else {
      this.testHint.setAlpha(0);
    }
  }

  _setNcHint(on) {
    this._ncHint = on;
    if (!this.destroyed && this.ncGapHint) this.ncGapHint.setAlpha(on ? NC_HINT_ALPHA : 0);
  }

  /** One-shot animations for drained logic events. Unknown types ignored. */
  handleEvent(evt) {
    if (this.destroyed || !evt || typeof evt.type !== 'string') return;
    switch (evt.type) {
      case 'lead-connected':
        // Arbitrary illegal landing ids carry no snap animation; the steady
        // writer keeps the tip at rest for them, and the event is ignored.
        if (!VALID_LEADS.has(evt.lead) || !TERMINAL_POS[evt.terminal]) return;
        this._animLeadConnected(evt);
        break;
      case 'lead-disconnected':
        if (!VALID_LEADS.has(evt.lead)) return;
        this._animLeadDisconnected(evt);
        break;
      case 'connect-rejected':
        // logic refused the landing (e.g. A2 is known-but-dead): local
        // knock-back only, wiring state untouched.
        if (!VALID_LEADS.has(evt.lead)) return;
        this._animConnectRejected(evt);
        break;
      case 'coil-picked':
        this._animCoilPicked();
        break;
      case 'relay-dropped':
        this._animRelayDropped();
        break;
      case 'test-incomplete':
        this._animTestIncomplete(evt);
        break;
      case 'test-dropout':
        this._animTestDropout();
        break;
      case 'test-ground-fault':
        this._animTestGroundFault();
        break;
      case 'relay-bridged':
        this._animRelayBridged();
        break;
      default:
        return; // unknown event type: safely ignored
    }
    this._lastEvent = evt.type;
    // Standby-hint bookkeeping (Wave 5 finding #2): any TEST outcome stops
    // the hint for the current wiring; rewiring while an outcome is still
    // latched re-arms the pending derivation in applySnapshot.
    if (evt.type === 'relay-bridged' || evt.type.startsWith('test-')) {
      this._rewiredAfterResult = false;
      if (this._testPending) this._transitionTestHint(false);
    } else if (
      (evt.type === 'lead-connected' || evt.type === 'lead-disconnected')
      && this._lastSnap
      && TEST_RESULT_STATES.has(this._lastSnap.testState)
    ) {
      this._rewiredAfterResult = true;
    }
    // Any real wiring change or fresh TEST outcome erases the dropout
    // residue; a rejected connect attempt changes no state, so it keeps it.
    if (evt.type !== 'test-dropout' && evt.type !== 'connect-rejected') {
      this._setNcHint(false);
    }
  }

  // ------------------------------------------------------------ events --

  // 90ms magnetic pull into the hole + the brass nut turns 8° (§3.4.3).
  // Callers must guarantee lead/terminal are known (handleEvent gates this).
  _animLeadConnected(evt) {
    const lead = evt.lead;
    const terminal = evt.terminal;
    if (!VALID_LEADS.has(lead) || !TERMINAL_POS[terminal]) return; // defensive
    this.scene.tweens.killTweensOf(this._tipGo[lead]);
    this._busy[lead] = true;
    const p = this._p(TERMINAL_POS[terminal].x, TERMINAL_POS[terminal].y);
    this._tween({
      targets: this._tipGo[lead],
      x: p.x,
      y: p.y,
      duration: SNAP_MS,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        // Release the busy flag only. The next real applySnapshot from the
        // integration layer owns the steady sync — re-applying the stale
        // snapshot here would undo the optimistic snap / spring-back.
        this._busy[lead] = false;
      },
    });
    const nut = this._nuts[terminal];
    this.scene.tweens.killTweensOf(nut);
    this._tween({ targets: nut, angle: NUT_CONNECTED_ANGLE, duration: SNAP_MS, ease: 'Cubic.easeOut' });
    this.sfx?.press?.();
  }

  // Lead pulled free: nut relaxes, the tip springs back to its rest hang.
  _animLeadDisconnected(evt) {
    const lead = evt.lead;
    if (!VALID_LEADS.has(lead)) return;
    this.scene.tweens.killTweensOf(this._tipGo[lead]);
    this._busy[lead] = true;
    const rest = this._p(REST_TIP_POS[lead].x, REST_TIP_POS[lead].y);
    this._tween({
      targets: this._tipGo[lead],
      x: rest.x,
      y: rest.y,
      duration: 160,
      ease: 'Back.easeOut',
      onComplete: () => {
        // Release the busy flag only. The next real applySnapshot from the
        // integration layer owns the steady sync — re-applying the stale
        // snapshot here would undo the optimistic snap / spring-back.
        this._busy[lead] = false;
      },
    });
    if (TERMINAL_POS[evt.terminal] && this._nuts[evt.terminal]) {
      const nut = this._nuts[evt.terminal];
      this.scene.tweens.killTweensOf(nut);
      this._tween({ targets: nut, angle: 0, duration: 60, ease: 'Sine.easeOut' });
    }
    this.sfx?.bump?.();
  }

  // logic refused a landing (connect-rejected, e.g. A2 known-but-dead): the
  // tip knocks back 3px and returns to wherever the steady state holds it
  // (the next applySnapshot snaps it home), and the refused terminal gives
  // one short dim flash. No state is cleared — the wiring stays as it was.
  _animConnectRejected(evt) {
    const lead = evt.lead;
    if (!VALID_LEADS.has(lead)) return;
    const tip = this._tipGo[lead];
    this.scene.tweens.killTweensOf(tip);
    this._busy[lead] = true;
    const y0 = tip.y;
    this._tween({
      targets: tip,
      y: y0 + 3,
      duration: 60,
      ease: 'Sine.easeIn',
      onComplete: () => {
        this._tween({
          targets: tip,
          y: y0,
          duration: 120,
          ease: 'Back.easeOut',
          onComplete: () => {
            this._busy[lead] = false;
          },
        });
      },
    });
    if (TERMINAL_POS[evt.terminal] && this._nuts[evt.terminal]) {
      const nut = this._nuts[evt.terminal];
      this.scene.tweens.killTweensOf(nut);
      this._tween({
        targets: nut,
        alpha: 0.35,
        duration: 70,
        ease: 'Sine.easeIn',
        onComplete: () => {
          this._tween({ targets: nut, alpha: 1, duration: 130, ease: 'Sine.easeOut' });
        },
      });
    }
    this.sfx?.blocked?.();
  }

  // Coil action beat: 30ms pre-shiver, 75ms pull-in, 120ms rebound settle,
  // with the glass reflection following the shake (§3.4.4). Synchronous
  // feedbacks: armature displacement, contact gap change (the moving tip is
  // part of the armature graphic), glass reflection flicker.
  _animCoilPicked() {
    const yR = RELAY.armReleasedY + this._oy;
    const yP = RELAY.armPickedY + this._oy;
    this.scene.tweens.killTweensOf(this.armature);
    this._busy.armature = true;
    this.armature.setY(yR);
    this._tween({
      targets: this.armature,
      y: yR - 2,
      duration: COIL_BEAT.preMs,
      ease: 'Sine.easeIn',
      onComplete: () => {
        this._tween({
          targets: this.armature,
          y: yP + 2, // slam slightly past the seat
          duration: COIL_BEAT.pullMs,
          ease: 'Cubic.easeIn',
          onComplete: () => {
            this._tween({
              targets: this.armature,
              y: yP,
              duration: COIL_BEAT.reboundMs,
              ease: 'Back.easeOut',
              onComplete: () => {
                this._busy.armature = false;
              },
            });
          },
        });
      },
    });
    this._flickerGlint(0.75);
    this.sfx?.slash?.();
  }

  // Losing the coil: the armature springs back to the NC resting seat.
  _animRelayDropped() {
    const yP = RELAY.armPickedY + this._oy;
    const yR = RELAY.armReleasedY + this._oy;
    this.scene.tweens.killTweensOf(this.armature);
    this._busy.armature = true;
    this.armature.setY(yP);
    this._tween({
      targets: this.armature,
      y: yR,
      duration: 110,
      ease: 'Back.easeOut',
      onComplete: () => {
        this._busy.armature = false;
      },
    });
    this._flickerGlint(0.6);
    this.sfx?.spring?.();
  }

  _flickerGlint(peak) {
    this.scene.tweens.killTweensOf(this.glassGlint);
    this._busy.glint = true;
    this.glassGlint.setAlpha(peak);
    const base = this._lastSnap?.coilEnergized ? 0.42 : 0.18;
    this._tween({
      targets: this.glassGlint,
      alpha: base,
      duration: COIL_BEAT.preMs + COIL_BEAT.pullMs + COIL_BEAT.reboundMs,
      ease: 'Sine.easeOut',
      onComplete: () => {
        this._busy.glint = false;
      },
    });
  }

  // Dangling lead: the TEST handle cannot bottom out — it presses partway
  // and springs back, and the terminal at the break taps twice (§2.3).
  _animTestIncomplete(evt) {
    this.scene.tweens.killTweensOf(this.testLever);
    this._busy.handle = true;
    this.testLever.setAngle(TEST.restAngle);
    this._tween({
      targets: this.testLever,
      angle: -4, // stalls well above the press seat
      duration: 120,
      ease: 'Sine.easeIn',
      onComplete: () => {
        this._tween({
          targets: this.testLever,
          angle: TEST.restAngle,
          duration: 220,
          ease: 'Back.easeOut',
          onComplete: () => {
            this._busy.handle = false;
          },
        });
      },
    });
    // Knock every missing lead's free tip (Wave 2 audit #3): the event's
    // `missing` array names the dangling leads; without a payload both tips
    // knock. Amplitude stays a light 2px.
    const missing = Array.isArray(evt.missing)
      ? [...new Set(evt.missing.filter((l) => VALID_LEADS.has(l)))]
      : ['coil', 'output'];
    for (const brokenLead of missing) {
      const tip = this._tipGo[brokenLead];
      this.scene.tweens.killTweensOf(tip);
      this._busy[brokenLead] = true;
      this._knockTwice(tip, () => {
        this._busy[brokenLead] = false;
      });
    }
    this.sfx?.blocked?.();
  }

  // Two knocks of 2px, then the target is left exactly where it started.
  _knockTwice(go, done) {
    const y0 = go.y;
    this._tween({
      targets: go, y: y0 + 2, duration: 55, ease: 'Sine.easeIn',
      onComplete: () => {
        this._tween({
          targets: go, y: y0, duration: 55, ease: 'Sine.easeOut',
          onComplete: () => {
            this._tween({
              targets: go, y: y0 + 2, duration: 55, ease: 'Sine.easeIn',
              onComplete: () => {
                this._tween({
                  targets: go, y: y0, duration: 55, ease: 'Sine.easeOut',
                  onComplete: () => { if (done) done(); },
                });
              },
            });
          },
        });
      },
    });
  }

  // OUTPUT on NC: current flashes then drops out — the red witness lamp
  // blinks for exactly 180ms and the armature bounces once (§2.3). The
  // player's wiring is never cleared.
  _animTestDropout() {
    // TEST lever (dropout feedback hook): the handle bottoms out against
    // the dropped contact — same press profile as _animRelayBridged — then
    // springs back to rest with the same return profile as
    // _animTestIncomplete. The steady writer keeps it at restAngle
    // afterwards (testState is not 'passed').
    this.scene.tweens.killTweensOf(this.testLever);
    this._busy.handle = true;
    this._tween({
      targets: this.testLever,
      angle: TEST.pressAngle,
      duration: 140,
      ease: 'Cubic.easeIn',
      onComplete: () => {
        this._tween({
          targets: this.testLever,
          angle: TEST.restAngle,
          duration: 220,
          ease: 'Back.easeOut',
          onComplete: () => {
            this._busy.handle = false;
          },
        });
      },
    });
    this.scene.tweens.killTweensOf(this.witnessLamp);
    this._busy.witness = true;
    this.witnessLamp.setFillStyle(C(CAR.LAMP_ALERT), 1);
    this.witnessLamp.setAlpha(1);
    this._tween({
      targets: this.witnessLamp,
      alpha: 0,
      duration: WITNESS_FLASH_MS,
      ease: 'Sine.easeIn',
      onComplete: () => {
        this._busy.witness = false;
        this.witnessLamp.setFillStyle(C(CAR.ENAMEL_DARK), 1);
        this.witnessLamp.setAlpha(1);
      },
    });
    // Single bounce of the still-picked armature.
    const yP = RELAY.armPickedY + this._oy;
    this.scene.tweens.killTweensOf(this.armature);
    this._busy.armature = true;
    this.armature.setY(yP);
    this._tween({
      targets: this.armature,
      y: yP - 4,
      duration: 80,
      ease: 'Sine.easeIn',
      onComplete: () => {
        this._tween({
          targets: this.armature,
          y: yP,
          duration: 120,
          ease: 'Back.easeOut',
          onComplete: () => {
            this._busy.armature = false;
          },
        });
      },
    });
    this.sfx?.spring?.();
    // Dropout residue: a restrained glint stays inside the NC contact gap —
    // the mechanical reason the output died (Wave 2 audit #4).
    this._setNcHint(true);
  }

  // Ground fault: exactly one local spark at the lug and the porcelain fuse
  // goes dark. No screen shake, no global reset (§2.3, §7).
  _animTestGroundFault() {
    this.scene.tweens.killTweensOf(this.spark);
    this.spark.setAlpha(0.95);
    this._tween({
      targets: this.spark,
      alpha: 0,
      duration: 140,
      ease: 'Sine.easeIn',
      onComplete: () => {
        // Short ember afterglow, gone within another 260ms.
        this.spark.setAlpha(0.25);
        this._tween({ targets: this.spark, alpha: 0, duration: 260, ease: 'Sine.easeIn' });
      },
    });
    this._busy.fuse = true;
    this.fuse.setFillStyle(C(CAR.ENAMEL_DARK), 1);
    this._tween({
      targets: this.fuse,
      alpha: { from: 0.6, to: 1 },
      duration: 200,
      ease: 'Sine.easeOut',
      onComplete: () => {
        this._busy.fuse = false;
      },
    });
    this.sfx?.bump?.();
  }

  // TEST correct: three stages light left -> relay -> right in sequence,
  // never the whole cabinet at once (§3.4.5). The handle bottoms out and
  // stays; the steady writer keeps it pressed while testState is passed.
  _animRelayBridged() {
    this.scene.tweens.killTweensOf(this.testLever);
    this._busy.handle = true;
    this._tween({
      targets: this.testLever,
      angle: TEST.pressAngle,
      duration: 140,
      ease: 'Cubic.easeIn',
      onComplete: () => {
        this._busy.handle = false;
      },
    });

    this._busy.lamps = true;
    this._busy.glint = true;
    // Stage 1: input pulse lamp.
    this.inputLamp.setFillStyle(C(CAR.LAMP_OK), 1);
    this._tween({
      targets: this.inputLamp,
      alpha: { from: 0.35, to: 1 },
      duration: 100,
      ease: 'Sine.easeOut',
      onComplete: () => {
        // Stage 2: the relay itself — glass reflection sweeps up, coil glows.
        this.glassGlint.setAlpha(0.15);
        this._tween({
          targets: this.glassGlint,
          alpha: 0.85,
          duration: 120,
          ease: 'Sine.easeOut',
          onComplete: () => {
            this._tween({
              targets: this.glassGlint,
              alpha: 0.42, // settle onto the energized steady value
              duration: 160,
              ease: 'Sine.easeIn',
              onComplete: () => {
                this._busy.glint = false;
              },
            });
            this.coilGlow.setAlpha(0.5);
            // Stage 3: output lamp steadies on the right end.
            this.outputLamp.setFillStyle(C(CAR.LAMP_OK), 1);
            this._tween({
              targets: this.outputLamp,
              alpha: { from: 0.35, to: 1 },
              duration: 140,
              ease: 'Sine.easeOut',
              onComplete: () => {
                this._busy.lamps = false;
              },
            });
          },
        });
      },
    });
    this.sfx?.checkpoint?.();
  }

  // ------------------------------------------------------------ pointer --

  /**
   * Hover reflection rim (work package §3.1: "only on a grabbable lead or
   * terminal, a 2px reflection edge"). The integration layer calls this
   * with an id from getHitRegions() — terminal / lead-tip / 'test' /
   * 'reset' — or null. Idempotent: repeating the same id redraws nothing
   * and never allocates; unknown ids are safely ignored (any stale rim is
   * cleared); null or setVisible(false) clears the rim. BRASS_HI is
   * licensed here and stays a 2px stroke.
   */
  setHoverTarget(id) {
    if (this.destroyed) return;
    if (id === this._hover) return; // idempotent
    if (id != null && !HOVERABLE_IDS.has(id)) {
      if (this._hover !== null) {
        this._hover = null;
        this._restyleTipHover(null);
        this.hoverEdge.clear();
      }
      this._setCursor('');
      return; // unknown id: safely ignored
    }
    this._restyleTipHover(null);
    this._hover = id ?? null;
    this._restyleTipHover(this._hover);
    this._drawHoverEdge();
    // Grab hand only over the draggable lead tips; terminals keep the
    // default cursor (their affordance is the snap ring, not the hand).
    this._setCursor(this._hover === 'coil-lead' || this._hover === 'output-lead' ? 'grab' : '');
  }

  // Wave 6: a hovered lead lug brightens — bakelite core lifts from
  // ENAMEL_DARK to STEEL_DARK and the brass ring goes BRASS_HI (a 2px
  // stroke, the licensed edge use). Pure property writes on the existing
  // circles: no allocation, no tween, no interaction with the hoverEdge
  // rim, which keeps its own accounting.
  _restyleTipHover(id) {
    for (const lead of VALID_LEADS) {
      const tip = this._tipGo[lead];
      if (!tip) continue;
      if (id === `${lead}-lead`) {
        tip.setFillStyle(C(CAR.STEEL_DARK), 1);
        tip.setStrokeStyle(2, C(CAR.BRASS_HI), 1);
        // Micro polish: the hovered lug also swells a touch (1.1x). Never
        // stomp the 1.18x grab swell while that same tip is being dragged.
        if (this._drag?.lead !== lead) tip.setScale(1.1);
      } else {
        tip.setFillStyle(C(CAR.ENAMEL_DARK), 1);
        tip.setStrokeStyle(2, C(CAR.BRASS_MID), 1);
        if (this._drag?.lead !== lead) tip.setScale(1);
      }
    }
  }

  // Self-deciding overlay renderer (micro polish): owns every rim/glow on
  // the hoverEdge graphics. Three mutually exclusive modes —
  //   dragging:  glowing drag origin + magnetic snap preview on the nearest
  //              landing terminal (the hover rim is cleared while dragging,
  //              so this channel is free);
  //   hover:     legal terminal -> bronze snap ring + live-trace inner ring
  //              with a gentle clock pulse; dead coil-a2 -> restrained red
  //              break mark (no pulse, no text); leads/handles -> plain rim;
  //   idle:      nothing.
  // The pulse is a pure clock function (no tween), so applySnapshot can
  // re-run this every frame without allocations or loop-tween leaks.
  _drawHoverEdge() {
    const g = this.hoverEdge;
    if (!g || this.destroyed) return;
    g.clear();
    if (!this.visible) return;
    const now = this.scene.time?.now ?? 0;
    const pulse = 0.55 + 0.3 * Math.sin((now * Math.PI * 2) / 900);

    if (this._drag) {
      const origin = this._dragOrigin
        ? this._p(TERMINAL_POS[this._dragOrigin].x, TERMINAL_POS[this._dragOrigin].y)
        : this._p(REST_TIP_POS[this._drag.lead].x, REST_TIP_POS[this._drag.lead].y);
      g.lineStyle(2, C(CAR.BRASS_MID), 0.55);
      g.strokeCircle(origin.x, origin.y, SNAP_R + 2);
      if (this._snapPreview) {
        const t = this._p(TERMINAL_POS[this._snapPreview].x, TERMINAL_POS[this._snapPreview].y);
        g.lineStyle(2, C(CAR.BRASS_HI), pulse);
        g.strokeCircle(t.x, t.y, SNAP_R + 3);
        g.lineStyle(1, C(CAR.LAMP_OK), pulse * 0.8);
        g.strokeCircle(t.x, t.y, SNAP_R - 2);
      }
      return;
    }

    if (!this._hover) return;
    const region = this.getHitRegions().find((r) => r.id === this._hover);
    if (!region) return;
    if (this._hover === 'coil-a2') {
      const s = region.shape;
      g.lineStyle(2, C(CAR.LAMP_ALERT), 0.65);
      g.strokeCircle(s.x, s.y, s.r + 2);
      g.lineBetween(s.x - 10, s.y + 10, s.x + 10, s.y - 10);
      return;
    }
    if (SNAP_IDS.includes(this._hover)) {
      const s = region.shape;
      g.lineStyle(2, C(CAR.BRASS_HI), pulse);
      g.strokeCircle(s.x, s.y, s.r + 3);
      g.lineStyle(1, C(CAR.LAMP_OK), pulse * 0.8);
      g.strokeCircle(s.x, s.y, s.r - 2);
      return;
    }
    g.lineStyle(2, C(CAR.BRASS_HI), 0.9);
    if (region.shape.type === 'circle') {
      g.strokeCircle(region.shape.x, region.shape.y, region.shape.r + 2);
    } else {
      g.strokeRect(
        region.shape.x - 2, region.shape.y - 2,
        region.shape.w + 4, region.shape.h + 4,
      );
    }
  }

  // Pure functional hit tests — no scene.input listeners are ever
  // registered here; the integration owner owns listener lifecycle and does
  // the screen -> world conversion before calling these.

  _hitCircle(x, y, c, r) {
    return Math.hypot(x - c.x, y - c.y) <= r;
  }

  _hitRect(x, y, r) {
    return x >= r.x + this._ox && x <= r.x + this._ox + r.w
      && y >= r.y + this._oy && y <= r.y + this._oy + r.h;
  }

  _terminalAt(x, y) {
    // Snap set excludes A2 (Wave 2 audit #2): dropping the coil lead on the
    // bused return screw never seats; the tip springs back instead. Radius
    // is the widened drag radius (micro polish): near-misses magnet in.
    let best = null;
    let bestDist = SNAP_R_DRAG;
    for (const id of SNAP_IDS) {
      const t = this._p(TERMINAL_POS[id].x, TERMINAL_POS[id].y);
      const d = Math.hypot(x - t.x, y - t.y);
      if (d <= bestDist) {
        best = id;
        bestDist = d;
      }
    }
    return best;
  }

  /**
   * Grab a lead tip, or begin a TEST/RESET press. Returns
   * { grabbed: 'coil-lead'|'output-lead', from } on a tip hit, else null.
   */
  pointerDown(x, y) {
    if (this.destroyed || !this.visible) return null;
    for (const lead of ['coil', 'output']) {
      const tip = this._tipGo[lead];
      if (this._hitCircle(x, y, tip, TIP_R)) {
        this._drag = { lead };
        // Grab feedback (Wave 6): the lug lifts 4px toward the hand and
        // swells to 1.18x, the cloth redraws from the lifted lug, and the
        // cloth bump plays. Scale is restored on every release path
        // (pointerUp / cancelDrag); position is owned by pointerMove or
        // the snap/spring tweens from here on.
        tip.setScale(1.18);
        tip.setY(tip.y - 4);
        this._drawWire(lead, Boolean(this._lastSnap?.solved));
        this.sfx?.bump?.();
        const terminal = lead === 'coil'
          ? this._lastSnap?.coilLeadTerminal ?? null
          : this._lastSnap?.outputLeadTerminal ?? null;
        // Micro polish: closed-grip cursor + remember the drag origin so
        // the overlay can keep it glowing until the lead lands elsewhere.
        this._setCursor('grabbing');
        this._dragOrigin = terminal;
        this._snapPreview = null;
        this._drawHoverEdge();
        return { grabbed: `${lead}-lead`, from: terminal };
      }
    }
    if (this._hitRect(x, y, TEST.hit)) {
      this._press = 'test';
      return null;
    }
    if (this._hitRect(x, y, RESET.hit)) {
      this._press = 'reset';
      return null;
    }
    return null;
  }

  /** Drag the grabbed tip (clamped inside the cabinet). */
  pointerMove(x, y) {
    if (this.destroyed || !this.visible || !this._drag) return null;
    const cx = clamp(x, INNER.x + this._ox + 8, INNER.x + this._ox + INNER.w - 8);
    const cy = clamp(y, INNER.y + this._oy + 8, INNER.y + this._oy + INNER.h - 8);
    const { lead } = this._drag;
    // Micro polish: magnetic pull — inside the widened landing radius the
    // tip eases 45% toward the nearest terminal and the overlay previews
    // the snap, so aiming is directional rather than pixel-perfect.
    const near = this._terminalAt(cx, cy);
    this._snapPreview = near;
    let px = cx;
    let py = cy;
    if (near) {
      const t = this._p(TERMINAL_POS[near].x, TERMINAL_POS[near].y);
      px = cx + (t.x - cx) * 0.45;
      py = cy + (t.y - cy) * 0.45;
    }
    this._tipGo[lead].setPosition(px, py);
    this._drawWire(lead, Boolean(this._lastSnap?.solved));
    this._drawHoverEdge(); // origin glow + snap preview follow the drag
    return { dragging: `${lead}-lead` };
  }

  /**
   * Release. Inside a terminal snap radius the tip magnetically seats and
   * the result is { lead, placed: terminalId, from }; outside every radius
   * the tip springs back to its steady hang and the result is
   * { lead, placed: null, returned: true, from } — it can never dangle
   * locked. Releasing on the pressed TEST/RESET region returns
   * { pressed: 'test'|'reset' }.
   */
  pointerUp(x, y) {
    if (this.destroyed || !this.visible) return null;

    if (this._drag) {
      const { lead } = this._drag;
      this._drag = null;
      this._tipGo[lead].setScale(1); // grab swell always settles on release
      // Micro polish: release the grip cursor and the drag overlay state.
      this._setCursor('');
      this._snapPreview = null;
      this._dragOrigin = null;
      this._drawHoverEdge();
      const from = lead === 'coil'
        ? this._lastSnap?.coilLeadTerminal ?? null
        : this._lastSnap?.outputLeadTerminal ?? null;
      const terminal = this._terminalAt(x, y);
      if (terminal) {
        // Optimistic local snap; the integration owner confirms through
        // connect() and the next snapshot/event pair settles the picture.
        this._animLeadConnected({ lead, terminal });
        return { lead, placed: terminal, from };
      }
      this._springTipBack(lead);
      return { lead, placed: null, returned: true, from };
    }

    if (this._press) {
      const what = this._press;
      this._press = null;
      const region = what === 'test' ? TEST.hit : RESET.hit;
      if (!this._hitRect(x, y, region)) return null;
      if (what === 'reset') this._animResetKey();
      return { pressed: what };
    }
    return null;
  }

  /**
   * Blur / pointer-leaves-canvas escape hatch (work package §4.3): the tip
   * returns to its last legal state instead of dangling mid-drag.
   */
  cancelDrag() {
    if (this.destroyed) return null;
    // Always drop any armed TEST/RESET press (Wave 2 audit #7): previously
    // _press survived a blur-cancel and a later in-region pointerUp fired a
    // stale { pressed }.
    this._press = null;
    if (!this._drag) return null;
    const { lead } = this._drag;
    this._drag = null;
    this._tipGo[lead].setScale(1); // grab swell settles with the cancel
    this._setCursor('');
    this._snapPreview = null;
    this._dragOrigin = null;
    this._drawHoverEdge();
    this._springTipBack(lead);
    return { cancelled: `${lead}-lead` };
  }

  _springTipBack(lead) {
    // Spring back to the steady target implied by the last snapshot: the
    // connected terminal if the logic still holds the lead, else the rest
    // hang below its anchor block.
    const terminal = lead === 'coil'
      ? this._lastSnap?.coilLeadTerminal ?? null
      : this._lastSnap?.outputLeadTerminal ?? null;
    this.scene.tweens.killTweensOf(this._tipGo[lead]);
    this._busy[lead] = true;
    const p = this._steadyTip(lead, terminal);
    this._tween({
      targets: this._tipGo[lead],
      x: p.x,
      y: p.y,
      duration: 180,
      ease: 'Back.easeOut',
      onComplete: () => {
        // Release the busy flag only. The next real applySnapshot from the
        // integration layer owns the steady sync — re-applying the stale
        // snapshot here would undo the optimistic snap / spring-back.
        this._busy[lead] = false;
      },
    });
  }

  _animResetKey() {
    const y0 = RESET.y + this._oy;
    this.scene.tweens.killTweensOf(this.resetKey);
    this._tween({
      targets: this.resetKey,
      y: y0 + 3,
      duration: 70,
      ease: 'Cubic.easeIn',
      onComplete: () => {
        this._tween({ targets: this.resetKey, y: y0, duration: 110, ease: 'Back.easeOut' });
      },
    });
    this.sfx?.lever?.();
  }

  // --------------------------------------------------------- door / vis --

  /**
   * Open the close-up: lock bolt jumps in 60ms, then the door swings open
   * over 240ms (§3.4.2). Repeat-safe; the camera push belongs to the
   * integration owner and must follow the door, never lead it.
   */
  open() {
    if (this.destroyed) return;
    this.setVisible(true);
    if (!this._swayedOnce) {
      // Micro polish: arm the one-shot attract sway on the first open only.
      this._swayedOnce = true;
      this._swayUntil = (this.scene.time?.now ?? 0) + SWAY.onceMs;
    }
    if (this._doorState === 'open') return;
    this._doorState = 'open';
    this.scene.tweens.killTweensOf(this.door);
    this.scene.tweens.killTweensOf(this.latchBolt);
    const boltX = INNER.x + INNER.w - 10 + this._ox;
    this.latchBolt.setPosition(boltX, DOOR.hingeY + this._oy);
    this._tween({
      targets: this.latchBolt,
      x: boltX + 4,
      duration: 60,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        this._tween({
          targets: this.door,
          scaleX: DOOR.openScaleX,
          duration: 240,
          ease: 'Cubic.easeOut',
        });
      },
    });
    this.sfx?.lever?.();
  }

  /** Close: the door settles half-closed (§2.3 auto half-close). */
  close() {
    if (this.destroyed) return;
    if (this._doorState !== 'open') return;
    this._doorState = 'half';
    this.scene.tweens.killTweensOf(this.door);
    this._tween({
      targets: this.door,
      scaleX: DOOR.halfScaleX,
      duration: 240,
      ease: 'Cubic.easeInOut',
    });
  }

  setVisible(visible) {
    this.visible = visible;
    if (!visible) {
      // Hover rim clears on hide (§3.1); the next setHoverTarget re-arms it.
      this._hover = null;
      this._restyleTipHover(null);
      this.hoverEdge?.clear();
      // Micro polish: a hidden cabinet never keeps the cursor or drag
      // overlay state hostage.
      this._setCursor('');
      this._snapPreview = null;
      this._dragOrigin = null;
    }
    this.objects.forEach((object) => object.setVisible(visible));
  }

  /**
   * Hit regions for the integration layer (screen -> world conversion and
   * snap live there): every terminal as a circle of radius SNAP_R (>= 22),
   * both live lead tips, and the TEST / RESET rects.
   */
  getHitRegions() {
    if (this.destroyed) return [];
    // Only SNAP_IDS are offered as landing sites — A2 is drawn (as a bused
    // return screw) and stays unsnappable (Wave 2 audit #2). Micro polish:
    // it IS listed as a hover-only region (dead: true) so the integration
    // hover pass can surface its restrained red break mark.
    const regions = SNAP_IDS.map((id) => {
      const t = this._p(TERMINAL_POS[id].x, TERMINAL_POS[id].y);
      return { id, kind: 'terminal', shape: { type: 'circle', x: t.x, y: t.y, r: SNAP_R } };
    });
    const a2 = this._p(TERMINAL_POS['coil-a2'].x, TERMINAL_POS['coil-a2'].y);
    regions.push({
      id: 'coil-a2',
      kind: 'terminal',
      dead: true,
      shape: { type: 'circle', x: a2.x, y: a2.y, r: SNAP_R },
    });
    for (const lead of ['coil', 'output']) {
      const tip = this._tipGo[lead];
      regions.push({
        id: `${lead}-lead`,
        kind: 'lead-tip',
        shape: { type: 'circle', x: tip.x, y: tip.y, r: TIP_R },
      });
    }
    regions.push({
      id: 'test',
      kind: 'handle',
      shape: {
        type: 'rect',
        x: TEST.hit.x + this._ox, y: TEST.hit.y + this._oy,
        w: TEST.hit.w, h: TEST.hit.h,
      },
    });
    regions.push({
      id: 'reset',
      kind: 'key',
      shape: {
        type: 'rect',
        x: RESET.hit.x + this._ox, y: RESET.hit.y + this._oy,
        w: RESET.hit.w, h: RESET.hit.h,
      },
    });
    return regions;
  }

  getState() {
    const terminals = {};
    for (const id of TERMINAL_IDS) {
      terminals[id] = this._p(TERMINAL_POS[id].x, TERMINAL_POS[id].y);
    }
    return {
      module: 'relay-cabinet-art',
      visible: this.visible,
      opened: this._doorState !== 'closed',
      doorState: this._doorState,
      destroyed: this.destroyed,
      phase: this._phase,
      lastEvent: this._lastEvent,
      drag: this._drag ? `${this._drag.lead}-lead` : null,
      hover: this._hover,
      testPending: this._testPending,
      geometry: {
        width: this.width,
        height: this.height,
        frame: {
          x: FRAME.x + this._ox, y: FRAME.y + this._oy, w: FRAME.w, h: FRAME.h,
        },
        terminals,
        snappable: [...SNAP_IDS],
        anchors: {
          coil: this._p(ANCHOR_POS.coil.x, ANCHOR_POS.coil.y),
          output: this._p(ANCHOR_POS.output.x, ANCHOR_POS.output.y),
        },
        restTips: {
          coil: this._p(REST_TIP_POS.coil.x, REST_TIP_POS.coil.y),
          output: this._p(REST_TIP_POS.output.x, REST_TIP_POS.output.y),
        },
        snapRadius: SNAP_R,
        tipRadius: TIP_R,
      },
      leads: {
        coil: {
          terminal: this._lastSnap?.coilLeadTerminal ?? null,
          tip: this._tipGo.coil
            ? { x: this._tipGo.coil.x, y: this._tipGo.coil.y }
            : null,
        },
        output: {
          terminal: this._lastSnap?.outputLeadTerminal ?? null,
          tip: this._tipGo.output
            ? { x: this._tipGo.output.x, y: this._tipGo.output.y }
            : null,
        },
      },
      depths: { ...DEPTH },
      objectCount: this.objects.length,
      liveTweens: this.tweens.filter((t) => !t.removed).length,
      layers: ['dim', 'frame', 'back', 'terminals', 'relay', 'glass', 'leads', 'handles', 'door'],
    };
  }

  destroy() {
    if (this.destroyed) return; // repeated destroy is safe
    this.destroyed = true;
    this._setCursor('');
    this._snapPreview = null;
    this._dragOrigin = null;
    this._drag = null;
    this._press = null;
    this._hover = null;
    this._killLoop('testHint');
    this.tweens.forEach((tween) => {
      try {
        tween.remove?.();
        tween.stop?.();
      } catch {
        // tween already gone
      }
    });
    this.tweens.length = 0;
    this.objects.forEach((object) => {
      try {
        this.scene.tweens?.killTweensOf?.(object);
      } catch {
        // scene already torn down
      }
      try {
        object.destroy();
      } catch {
        // object already destroyed
      }
    });
    this.objects.length = 0;
    this._nuts = {};
    this._blocks = {};
    this._wireGfx = {};
    this._tipGo = {};
  }
}
