// Phase II — CONTACT interlock mechanical art (Agent C / phase-ii-art-owner;
// three-segment rework by relay-integration-owner).
//
// Construction basis (LOCKED, do not redesign):
//   docs/WAVE_3_PHASE_II_COORD_STATE_SPEC.md  §1 coords, §2 five states, §5 API
//   docs/WAVE_2B_CONTACT_INTERLOCK_BRIEF.md   snapshot + event contract
//   docs/PHASE_II_RELAY_CABINET_KIMI_WORK_PACKAGE.md §2.1/§4.2 three-segment
//
// Three-segment rework notes (integration pass):
// - The old mid-trace break (breakX=1200, caps + copper tongue + break alert
//   flashes) is REPLACED by the world relay cabinet at relayX≈1195: when the
//   cabinet is unbridged, the signal simply stops at its mouth — the cabinet
//   body is the break. No caps, no tongue, no break flash.
// - Lit/front rendering splits into pre-relay (latch -> cabinet mouth) and
//   post-relay (cabinet -> contactor) segments driven by the new snapshot
//   fields preRelayProgress / relayWaiting / postRelayProgress. Snapshots
//   lacking those fields fall back to splitting the legacy weighted
//   signalProgress, which maps to identical screen positions.
// - 'trace-reached-relay' (new one-shot logic event) plays the §2.1 cabinet
//   attention beat: inspection lamp flashes twice, the door bolt jumps 4px
//   revealing a warm slit, three stepped chatter sounds.
// - contactor-bounce guidance is retargeted by lastFault: 'open-circuit'
//   flashes at the latch foot (current never entered the trough),
//   'relay-open' flashes at the cabinet mouth (current parked there),
//   'signal-in-transit' still pulses the propagation front.
//
// Ownership: this file only. No changes to level.js / GameScene.js / sfx.js /
// colors.js or any other existing file.
//
// Deliberate constraints:
// - No `import Phaser`: the module only uses scene.add / scene.tweens from the
//   injected scene, and string blend modes ('ADD'), so it stays testable under
//   plain node with a mock scene.
// - Every colour goes through C(CAR.*); css() only re-encodes a palette value
//   for Phaser text styles, it never introduces a new colour.
// - All GameObjects are created once in the constructor. applySnapshot() only
//   clears/redraws Graphics content and sets properties — safe to call every
//   frame, idempotent for a repeated identical snapshot.
// - Looping tweens (energized breath / armature micro-pull) are started only
//   on phase transitions, never by steady-state redraws.
//
// SFX hook points (sfx.js is NOT modified): pass `{ sfx }` in options mapping
// onto src/sfx.js at integration time —
//   latch-reset      -> sfx.lever    (mechanical clack into the detent)
//   contactor-bounce -> sfx.blocked  (local refusal, no global fail sting)
//   contactor-closed -> sfx.press    (contactor slam)
//   traction-enabled -> sfx.goal     (traction circuit closed)
// If no sfx object is injected the module stays silent.

import { C, CAR } from './colors.js';

// Re-encode an on-palette value as a CSS colour for Phaser text styles.
const css = (n) => `#${n.toString(16).padStart(6, '0')}`;

const clamp01 = (v) => (Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0);

// Mechanical cluster band shared with GameScene gameplay art (spec: 53–58).
const DEPTH = Object.freeze({
  DIM: 53, // contactor-area ambient darkening (dormant only)
  TRACE: 54, // dormant copper run, break caps, insulators
  LIT: 55, // LAMP_OK lit segment following signalProgress
  FX: 56, // propagation front, alert flashes, surge flash
  DEVICE: 57, // latch, contactor shell, armature, shell glow
  TOP: 58, // shell-top lamp, prompt texts
});

const LATCH_OPEN_ANGLE = -8; // dormant: latch ajar ~8°
const ARM_RELEASED_DY = -6; // armature released: 6px above the engaged seat
const ARM_ENGAGED_DY = 0; // contactor closed: armature slammed onto the seat

const SHELL_W = 64;
const SHELL_H = 84;

// World relay cabinet astride the underfloor trough (same case as the
// close-up). Half-width 50: the dormant run and the lit segments stop at its
// walls, which is what makes the cabinet itself read as the open point.
const RELAY_CABINET = Object.freeze({
  halfW: 50,
  top: -44, // relative to wallY
  bottom: 8, // relative to wallY
});

const VALID_PROMPT_TARGETS = new Set(['latch', 'power', 'relay']);

// Visual phase derived purely from the snapshot (spec §2 five states).
function phaseOf(snap) {
  if (snap.complete || snap.contactorClosed) return 'complete';
  if (snap.circuitEnergized) return 'energized';
  if (snap.latchClosed) return 'signaling';
  return 'dormant';
}

export default class ContactInterlockArt {
  /**
   * @param scene Phaser scene (only scene.add / scene.tweens are used).
   * @param options.startX copper run start / latch x (default 850)
   * @param options.endX   copper run end / contactor x (default 1440)
   * @param options.wallY  underfloor cable-trough y (default 556)
   * @param options.relayX relay cabinet centre x (default 1195, overridable)
   * @param options.deviceY latch / contactor device y (default 430)
   * @param options.sfx    optional { lever, blocked, press, goal, bump } hooks
   */
  constructor(scene, { startX = 850, endX = 1440, wallY = 556, relayX = 1195, deviceY = 430, sfx = null } = {}) {
    this.scene = scene;
    this.startX = startX;
    this.endX = endX;
    this.wallY = wallY;
    this.relayX = relayX;
    this.deviceY = deviceY;
    this.latchX = startX;
    this.contactorX = endX;
    this.sfx = sfx;

    this.objects = [];
    this.tweens = [];
    this.visible = true;
    this.destroyed = false;

    this._phase = null;
    this._lastEvent = null;
    // One-shot animation ownership: while a flag is true the matching steady
    // state writer in applySnapshot steps aside so the tween is not fought.
    this._busy = {
      latch: false, armature: false, lamp: false, glow: false,
      relayLamp: false, relaySlit: false,
    };
    this._loops = { armature: null, lamp: null };
    this._prompts = { latch: null, power: null, relay: null };

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

  // ---------------------------------------------------------------- build --

  _build() {
    const { startX, endX, wallY, relayX, deviceY, latchX, contactorX } = this;

    // Dormant only: the contactor corner sits 15% darker than the room.
    this.dim = this.track(
      this.scene.add.rectangle(contactorX, deviceY - 40, 150, 260, C(CAR.VOID), 0),
      DEPTH.DIM,
    );

    // A protected steel cable trough makes the route part of the train rather
    // than a HUD-like line floating across the windows. It lives just beneath
    // the carriage floor; the live conductor remains visible through its
    // inspection slot.
    this.baseGfx = this.track(this.scene.add.graphics(), DEPTH.TRACE);
    this.baseGfx.fillStyle(C(CAR.VOID), 0.9);
    this.baseGfx.fillRoundedRect(startX - 18, wallY - 10, endX - startX + 36, 20, 4);
    this.baseGfx.lineStyle(2, C(CAR.STEEL_MID), 0.72);
    this.baseGfx.lineBetween(startX - 14, wallY - 9, endX + 14, wallY - 9);
    this.baseGfx.lineStyle(1, C(CAR.ENAMEL_HI), 0.54);
    this.baseGfx.lineBetween(startX - 14, wallY + 9, endX + 14, wallY + 9);
    for (let x = startX + 46; x < endX; x += 118) {
      this.baseGfx.fillStyle(C(CAR.STEEL_MID), 0.74);
      this.baseGfx.fillRect(x - 2, wallY - 12, 4, 24);
      this.baseGfx.fillStyle(C(CAR.BRASS_DARK), 0.8);
      this.baseGfx.fillRect(x - 1, wallY - 7, 2, 14);
    }

    // Static ceramic insulators every ~90px, straddling the conductor inside
    // the trough. Drawn once. Insulators under the relay cabinet are skipped:
    // the cabinet body covers that span, so nothing reads as unsupported.
    for (let x = startX + 90; x < endX - 40; x += 90) {
      if (Math.abs(x - relayX) < RELAY_CABINET.halfW + 2) continue;
      this.baseGfx.fillStyle(C(CAR.ENAMEL_HI), 0.9);
      this.baseGfx.fillRect(x - 3, wallY - 4, 6, 8);
      this.baseGfx.fillStyle(C(CAR.STEEL_HI), 0.75);
      this.baseGfx.fillRect(x - 1, wallY - 2, 2, 2); // glaze dot
    }

    // Redrawn per snapshot: dormant run into / out of the cabinet.
    this.traceGfx = this.track(this.scene.add.graphics(), DEPTH.TRACE);
    // Redrawn per snapshot: LAMP_OK lit segments (pre-relay / post-relay).
    this.litGfx = this.track(this.scene.add.graphics(), DEPTH.LIT);

    // Propagation front: 4x4 TUNGSTEN ADD dot riding the active segment; it
    // parks at the cabinet mouth while the relay is unbridged.
    this.frontDot = this.track(
      this.scene.add.rectangle(startX, wallY, 4, 4, C(CAR.TUNGSTEN), 1).setBlendMode('ADD'),
      DEPTH.FX,
    );
    this.frontDot.setAlpha(0);

    // Fault-point alert flashes (contactor-bounce only): one-shot LAMP_ALERT
    // 4x5 ADD pair, repositioned to the point where the current actually
    // stops — latch foot for open-circuit, cabinet mouth for relay-open.
    // 240ms flash + 400ms afterglow decay. Lead-agent waiver: ADD blend /
    // ~240ms / 4x5px allowed; the one-shot, no-loop clause of spec §2.2
    // still holds.
    this.alertL = this.track(
      this.scene.add.rectangle(startX - 4.5, wallY, 4, 5, C(CAR.LAMP_ALERT), 0).setBlendMode('ADD'),
      DEPTH.FX,
    );
    this.alertR = this.track(
      this.scene.add.rectangle(startX + 4.5, wallY, 4, 5, C(CAR.LAMP_ALERT), 0).setBlendMode('ADD'),
      DEPTH.FX,
    );

    // trace-energized surge: one soft ADD wash along the whole run.
    this.surge = this.track(
      this.scene.add
        .rectangle(startX + (endX - startX) / 2, wallY, endX - startX, 6, C(CAR.LAMP_OK), 0)
        .setBlendMode('ADD'),
      DEPTH.FX,
    );

    this._buildLatch(latchX, deviceY);
    this._buildRelayCabinet(relayX, wallY);
    this._buildContactor(contactorX, deviceY);

    // Prompt texts — the only copy allowed upstairs (spec §4 + relay work
    // package §2.1: '[E] OPEN RELAY CASE' is the third allowed string).
    const promptStyle = {
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
      fontSize: '10px',
      color: css(C(CAR.BRASS_HI)),
      letterSpacing: 1,
    };
    this._prompts.latch = this.track(
      this.scene.add.text(latchX, deviceY - 74, '', promptStyle).setOrigin(0.5),
      DEPTH.TOP,
    );
    this._prompts.power = this.track(
      this.scene.add.text(contactorX, deviceY - 78, '', promptStyle).setOrigin(0.5),
      DEPTH.TOP,
    );
    this._prompts.relay = this.track(
      // Keep this prompt directly above its cabinet, below the player and the
      // bright window panorama. `deviceY` belongs to the upper controls, so
      // anchoring to the cabinet's wall run avoids drifting it into the sky.
      this.scene.add.text(relayX, wallY - 74, '', promptStyle).setOrigin(0.5),
      DEPTH.TOP,
    );
  }

  _buildLatch(latchX, deviceY) {
    // Bracket bolted to the entry door frame side post. The post spans about
    // x807–842, so every bracket pixel stays left of x842; the lever itself
    // keeps the locked x=850 interaction anchor and swings into the doorway.
    const bracket = this.track(this.scene.add.graphics(), DEPTH.DEVICE);
    bracket.fillStyle(C(CAR.ENAMEL_HI), 0.95);
    bracket.fillRect(latchX - 22, deviceY - 34, 14, 66); // x828..842, fully on the post
    bracket.fillStyle(C(CAR.STEEL_HI), 0.8);
    bracket.fillRect(latchX - 19, deviceY - 28, 2, 2);
    bracket.fillRect(latchX - 19, deviceY + 24, 2, 2);
    bracket.lineStyle(1, C(CAR.BRASS_MID), 0.55);
    bracket.lineBetween(latchX - 9, deviceY - 34, latchX - 9, deviceY + 32);
    // Detent seat the lever presses into when the latch is closed; it also
    // stays on the post (x838..842).
    bracket.fillStyle(C(CAR.STEEL_MID), 0.9);
    bracket.fillRect(latchX - 12, deviceY + 2, 4, 10);

    // Lever pivots at its top; dormant it hangs ajar at -8°.
    const lever = this.track(this.scene.add.graphics(), DEPTH.DEVICE);
    lever.fillStyle(C(CAR.BRASS_MID), 0.95);
    lever.fillRect(-3, 0, 6, 30);
    lever.fillRoundedRect(-6, 26, 12, 12, 3);
    lever.lineStyle(1, C(CAR.BRASS_HI), 0.8); // <=2px highlight edge only
    lever.lineBetween(3, 2, 3, 26);
    lever.fillStyle(C(CAR.BRASS_DARK), 0.9);
    lever.fillRect(-3, 0, 2, 30);
    lever.setPosition(latchX, deviceY - 26);
    lever.setAngle(LATCH_OPEN_ANGLE);
    this.latchLever = lever;
  }

  // The world relay cabinet at x≈1195 — the same DOOR TRACTION INTERLOCK
  // No. 2 case the close-up opens. Enamel body with exposed dark steel edges,
  // left hinge knuckles, a brass number plate, a tungsten inspection lamp on
  // top, and the door bolt + warm slit on the right edge. The conductor run
  // stops at its walls: while the case is unbridged, the cabinet IS the open
  // point (the old break caps / copper tongue are gone).
  _buildRelayCabinet(relayX, wallY) {
    const hw = RELAY_CABINET.halfW;
    const top = wallY + RELAY_CABINET.top; // wallY - 44
    const bottom = wallY + RELAY_CABINET.bottom; // wallY + 8
    const h = bottom - top;

    const g = this.track(this.scene.add.graphics(), DEPTH.DEVICE);
    // Dark steel shell, then the damp blue-grey enamel skin.
    g.fillStyle(C(CAR.STEEL_DARK), 1);
    g.fillRect(relayX - hw, top, hw * 2, h);
    g.fillStyle(C(CAR.ENAMEL_MID), 1);
    g.fillRect(relayX - hw + 2, top + 2, hw * 2 - 4, h - 4);
    // Top edge highlight + bottom rust flecks (same language as the close-up
    // door frame).
    g.fillStyle(C(CAR.ENAMEL_HI), 0.85);
    g.fillRect(relayX - hw + 2, top + 2, hw * 2 - 4, 2);
    g.fillStyle(C(CAR.BRASS_DARK), 0.8);
    g.fillRect(relayX - 30, bottom - 5, 5, 2);
    g.fillRect(relayX + 14, bottom - 4, 4, 2);
    // Rivets.
    g.fillStyle(C(CAR.STEEL_HI), 0.9);
    for (const rx of [relayX - hw + 6, relayX + hw - 8]) {
      g.fillRect(rx, top + 6, 2, 2);
      g.fillRect(rx, bottom - 8, 2, 2);
    }
    // Hinge knuckles on the LEFT wall (the close-up door pivots the same way).
    for (const hy of [top + 10, top + h - 22]) {
      g.fillStyle(C(CAR.STEEL_DARK), 1);
      g.fillRect(relayX - hw - 3, hy, 8, 14);
      g.fillStyle(C(CAR.STEEL_HI), 0.85);
      g.fillRect(relayX - hw - 3, hy, 2, 14);
      g.fillStyle(C(CAR.BRASS_DARK), 0.9);
      g.fillRect(relayX - hw + 1, hy + 6, 3, 3);
    }
    // Door seam near the right edge: the slit and bolt live on this line.
    g.lineStyle(1, C(CAR.ENAMEL_DARK), 0.9);
    g.lineBetween(relayX + hw - 14, top + 4, relayX + hw - 14, bottom - 4);

    // Brass number plate screwed to the door (device text, not tutorial).
    const plateY = top + 8;
    g.fillStyle(C(CAR.BRASS_MID), 1);
    g.fillRect(relayX - 38, plateY, 76, 20);
    g.lineStyle(1, C(CAR.BRASS_DARK), 0.9);
    g.strokeRect(relayX - 37, plateY + 1, 74, 18);
    g.fillStyle(C(CAR.BRASS_HI), 0.85); // <=2px highlight edge only
    g.fillRect(relayX - 36, plateY + 2, 72, 2);
    g.fillStyle(C(CAR.BRASS_DARK), 1);
    g.fillRect(relayX - 34, plateY + 9, 2, 2);
    g.fillRect(relayX + 31, plateY + 9, 2, 2);

    const plateStyle = {
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
      fontSize: '7px',
      color: css(C(CAR.ENAMEL_DARK)),
      letterSpacing: 1,
    };
    this.track(
      this.scene.add.text(relayX, plateY + 6, 'DOOR TRACTION', plateStyle).setOrigin(0.5),
      DEPTH.DEVICE,
    );
    this.track(
      this.scene.add.text(relayX, plateY + 15, 'INTERLOCK No. 2', plateStyle).setOrigin(0.5),
      DEPTH.DEVICE,
    );

    // Tungsten inspection lamp on the cabinet top: steel bracket + 6x6
    // filament rect. Rests dim (0.25), brightens while the signal waits, and
    // flashes twice on trace-reached-relay.
    const lampY = top - 8;
    g.fillStyle(C(CAR.STEEL_DARK), 1);
    g.fillRect(relayX - 8, lampY + 4, 16, 4);
    this.relayLamp = this.track(
      this.scene.add.rectangle(relayX, lampY, 6, 6, C(CAR.TUNGSTEN), 0.25),
      DEPTH.DEVICE,
    );
    g.fillStyle(C(CAR.TUNGSTEN_REFLECT), 0.5);
    g.fillRect(relayX - 6, lampY + 3, 12, 1);

    // Warm slit along the door seam: hidden until the bolt jumps (the signal
    // has reached the case), then steady while the case is open / bridged.
    this.relaySlitGlow = this.track(
      this.scene.add
        .ellipse(relayX + hw - 14, (top + bottom) / 2, 14, h - 12, C(CAR.TUNGSTEN_REFLECT), 0)
        .setBlendMode('ADD'),
      DEPTH.FX,
    );
    this.relaySlit = this.track(
      this.scene.add.rectangle(relayX + hw - 14, (top + bottom) / 2, 3, h - 14, C(CAR.TUNGSTEN), 0),
      DEPTH.DEVICE,
    );
    // Door bolt on the right wall; jumps 4px right on trace-reached-relay.
    this.relayBoltX = relayX + hw - 10;
    this.relayBolt = this.track(
      this.scene.add.rectangle(this.relayBoltX, (top + bottom) / 2, 6, 14, C(CAR.STEEL_HI), 1),
      DEPTH.DEVICE,
    );
  }

  _buildContactor(contactorX, deviceY) {
    const cx = contactorX;
    const cy = deviceY;

    // Transparent shell ~64x84: GLASS_DARK body + STEEL_HI reflection, same
    // glass language as tutorialCarArt.buildGlass / the driver's cab pane.
    const shell = this.track(this.scene.add.graphics(), DEPTH.DEVICE);
    shell.fillStyle(C(CAR.GLASS_DARK), 0.9);
    shell.fillRoundedRect(cx - SHELL_W / 2, cy - SHELL_H / 2, SHELL_W, SHELL_H, 6);
    shell.lineStyle(2, C(CAR.STEEL_MID), 0.95);
    shell.strokeRoundedRect(cx - SHELL_W / 2, cy - SHELL_H / 2, SHELL_W, SHELL_H, 6);
    shell.lineStyle(1, C(CAR.BRASS_MID), 0.5); // control faces cap at BRASS_MID
    shell.strokeRoundedRect(cx - SHELL_W / 2 + 4, cy - SHELL_H / 2 + 4, SHELL_W - 8, SHELL_H - 8, 4);
    shell.fillStyle(C(CAR.STEEL_HI), 0.1);
    shell.fillTriangle(cx - 26, cy - 36, cx - 2, cy - 36, cx - 26, cy + 6);
    shell.lineStyle(1, C(CAR.STEEL_HI), 0.14);
    shell.lineBetween(cx + 24, cy - 30, cx + 10, cy + 30);
    // Fixed contacts at the shell floor and the magnet core above them.
    shell.fillStyle(C(CAR.STEEL_MID), 0.9);
    shell.fillRect(cx - 19, cy + 22, 10, 8);
    shell.fillRect(cx + 9, cy + 22, 10, 8);
    shell.fillStyle(C(CAR.ENAMEL_HI), 0.85);
    shell.fillRect(cx - 12, cy + 32, 24, 6);

    // Inner warm glow (energized / complete); ADD so it reads through glass.
    this.shellGlow = this.track(
      this.scene.add.ellipse(cx, cy + 2, 52, 64, C(CAR.TUNGSTEN_REFLECT), 0).setBlendMode('ADD'),
      DEPTH.DEVICE,
    );

    // Armature: moving bar with twin contact tips, drawn around its own
    // origin so state changes are pure setY / tween-y moves.
    const armature = this.track(this.scene.add.graphics(), DEPTH.DEVICE);
    armature.fillStyle(C(CAR.STEEL_MID), 0.95);
    armature.fillRoundedRect(-20, -5, 40, 10, 2);
    armature.lineStyle(1, C(CAR.BRASS_HI), 0.85); // <=2px highlight edge only
    armature.lineBetween(-18, -5, 18, -5);
    armature.fillStyle(C(CAR.BRASS_MID), 0.95);
    armature.fillRect(-16, 5, 6, 6);
    armature.fillRect(10, 5, 6, 6);
    armature.setPosition(cx, cy + ARM_RELEASED_DY);
    this.armature = armature;

    // Shell-top lamp: off / LAMP_WARN single flash / LAMP_OK breath.
    this.lamp = this.track(
      this.scene.add.circle(cx, cy - SHELL_H / 2 - 10, 4, C(CAR.ENAMEL_DARK), 1),
      DEPTH.TOP,
    );
    this.lamp.setStrokeStyle(1, C(CAR.STEEL_MID), 0.8);
  }

  // ------------------------------------------------------- steady redraw --

  // Segment progress from the snapshot. Primary source: the three-segment
  // fields. Legacy snapshots that only carry the weighted signalProgress are
  // un-weighted through the geometry split, which lands the front at exactly
  // the same screen x either way.
  _segments(snap) {
    const pre = typeof snap.preRelayProgress === 'number'
      || typeof snap.postRelayProgress === 'number'
      ? {
          pre: clamp01(snap.preRelayProgress ?? 0),
          post: clamp01(snap.postRelayProgress ?? 0),
        }
      : (() => {
          const split = (this.relayX - this.startX) / (this.endX - this.startX);
          const p = clamp01(snap.signalProgress);
          return {
            pre: clamp01(p / split),
            post: clamp01((p - split) / (1 - split)),
          };
        })();
    return { ...pre, waiting: Boolean(snap.relayWaiting) };
  }

  _drawTrace(snap) {
    const g = this.traceGfx;
    const { startX, endX, wallY, relayX, deviceY } = this;
    const cabL = relayX - RELAY_CABINET.halfW;
    const cabR = relayX + RELAY_CABINET.halfW;
    g.clear();
    // Dormant run: STEEL_MID 2px a0.5, swallowed by the cabinet walls. The
    // vertical leads descend from the two devices through the floor into the
    // trough, so the player can read the physical chain without interpreting
    // a diagram. No caps, no tongue: the cabinet itself is the open point.
    const latchTerminalY = wallY > deviceY ? deviceY + 34 : deviceY - 40;
    const contactorTerminalY = wallY > deviceY ? deviceY + SHELL_H / 2 : deviceY - SHELL_H / 2;
    g.lineStyle(2, C(CAR.STEEL_MID), 0.5);
    g.lineBetween(startX, wallY, cabL, wallY);
    g.lineBetween(cabR, wallY, endX, wallY);
    g.lineBetween(startX, wallY, startX, latchTerminalY);
    g.lineBetween(endX, wallY, endX, contactorTerminalY);
  }

  _drawLit(snap) {
    const g = this.litGfx;
    const { startX, endX, wallY, relayX, deviceY } = this;
    const cabL = relayX - RELAY_CABINET.halfW;
    const cabR = relayX + RELAY_CABINET.halfW;
    g.clear();
    if (!snap.latchClosed) return;
    const seg = this._segments(snap);
    if (seg.pre <= 0 && seg.post <= 0 && !snap.circuitEnergized) return;
    // Lit segments: LAMP_OK 3px a0.85, drawn through the underfloor trough.
    // Pre-relay: latch -> cabinet mouth. Post-relay: cabinet -> contactor,
    // drawn only once the relay is bridged and the signal has moved on.
    const latchTerminalY = wallY > deviceY ? deviceY + 34 : deviceY - 40;
    const contactorTerminalY = wallY > deviceY ? deviceY + SHELL_H / 2 : deviceY - SHELL_H / 2;
    g.lineStyle(3, C(CAR.LAMP_OK), 0.85);
    const preX = Math.min(cabL, startX + seg.pre * (cabL - startX));
    if (preX > startX) g.lineBetween(startX, wallY, preX, wallY);
    g.lineBetween(startX, wallY, startX, latchTerminalY); // latch-side drop
    if (seg.post > 0 || snap.circuitEnergized) {
      const postX = Math.min(endX, cabR + seg.post * (endX - cabR));
      g.lineBetween(cabR, wallY, postX, wallY);
    }
    if (snap.circuitEnergized) {
      g.lineBetween(endX, wallY, endX, contactorTerminalY); // contactor riser
    }
  }

  _setLampSteady(phase) {
    if (phase === 'complete') {
      this.lamp.setFillStyle(C(CAR.LAMP_OK), 1);
      this.lamp.setAlpha(0.92);
    } else if (phase !== 'energized') {
      // energized is owned by the breathing loop; everyone else is dark.
      this.lamp.setFillStyle(C(CAR.ENAMEL_DARK), 1);
      this.lamp.setAlpha(1);
    }
  }

  _transitionPhase(phase) {
    const prev = this._phase;
    this._phase = phase;
    if (prev === 'energized' && phase !== 'energized') {
      this._killLoop('armature');
      this._killLoop('lamp');
      this._busy.armature = false;
      this._busy.lamp = false;
    }
    if (phase === 'energized' && prev !== 'energized') {
      // Shell-top lamp: LAMP_OK slow breath, 1400ms full cycle.
      this.lamp.setFillStyle(C(CAR.LAMP_OK), 1);
      this._loops.lamp = this._tween({
        targets: this.lamp,
        alpha: { from: 0.5, to: 1 },
        duration: 700,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
      // Armature magnetized micro-pull: 2px loop above the engaged seat.
      this._loops.armature = this._tween({
        targets: this.armature,
        y: { from: this.deviceY + ARM_RELEASED_DY, to: this.deviceY + ARM_RELEASED_DY + 2 },
        duration: 600,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }

  // -------------------------------------------------------------- public --

  /** Idempotent steady-state redraw. Safe to call every frame. */
  applySnapshot(snap) {
    if (this.destroyed || !snap) return;
    const phase = phaseOf(snap);
    const seg = this._segments(snap);
    const cabL = this.relayX - RELAY_CABINET.halfW;
    const cabR = this.relayX + RELAY_CABINET.halfW;

    this._drawTrace(snap);
    this._drawLit(snap);

    // Propagation front rides the active segment; while the relay is
    // unbridged it parks at the cabinet mouth — the visible "current is
    // holding here" read. Gone once the circuit is energized.
    if (snap.latchClosed && !snap.circuitEnergized) {
      if (seg.pre > 0 && seg.pre < 1) {
        this.frontDot.setAlpha(1);
        this.frontDot.setPosition(this.startX + seg.pre * (cabL - this.startX), this.wallY);
      } else if (seg.pre >= 1 && seg.post <= 0) {
        this.frontDot.setAlpha(0.9);
        this.frontDot.setPosition(cabL - 4, this.wallY);
      } else if (seg.post > 0 && seg.post < 1) {
        this.frontDot.setAlpha(1);
        this.frontDot.setPosition(cabR + seg.post * (this.endX - cabR), this.wallY);
      } else {
        this.frontDot.setAlpha(0);
      }
    } else {
      this.frontDot.setAlpha(0);
    }

    // Cabinet door slit + inspection lamp steady states. The slit stays open
    // from the moment the signal has reached the case (bolt jumped) until the
    // room resets; the lamp rests dim and brightens while the signal waits.
    const reached = snap.latchClosed && seg.pre >= 1;
    if (!this._busy.relaySlit) {
      this.relaySlit.setAlpha(reached ? 0.85 : 0);
      this.relaySlitGlow.setAlpha(reached ? 0.16 : 0);
    }
    if (!this._busy.relayLamp) {
      this.relayLamp.setAlpha(reached && !snap.circuitEnergized ? 0.55 : 0.25);
    }

    this.dim.setAlpha(phase === 'dormant' ? 0.15 : 0);

    if (!this._busy.latch) {
      this.latchLever.setAngle(snap.latchClosed ? 0 : LATCH_OPEN_ANGLE);
    }

    if (phase !== this._phase) this._transitionPhase(phase);

    if (!this._busy.armature && !this._loops.armature) {
      this.armature.setY(this.deviceY + (snap.contactorClosed ? ARM_ENGAGED_DY : ARM_RELEASED_DY));
    }

    if (!this._busy.glow) {
      this.shellGlow.setAlpha(phase === 'energized' || phase === 'complete' ? 0.12 : 0);
    }

    if (!this._busy.lamp && !this._loops.lamp) {
      this._setLampSteady(phase);
    }
  }

  /** One-shot animations for drained logic events. Unknown types ignored. */
  handleEvent(evt) {
    if (this.destroyed || !evt || typeof evt.type !== 'string') return;
    switch (evt.type) {
      case 'latch-reset': {
        // 180ms Cubic.easeOut press into the detent.
        this._busy.latch = true;
        this.latchLever.setAngle(LATCH_OPEN_ANGLE);
        this._tween({
          targets: this.latchLever,
          angle: 0,
          duration: 180,
          ease: 'Cubic.easeOut',
          onComplete: () => {
            this._busy.latch = false;
          },
        });
        this.sfx?.lever?.();
        break;
      }
      case 'trace-started': {
        // Small pop on the front dot as the signal leaves the latch.
        this.frontDot.setAlpha(1);
        this.frontDot.setPosition(this.startX, this.wallY);
        this._tween({
          targets: this.frontDot,
          scale: { from: 1.6, to: 1 },
          duration: 200,
          ease: 'Cubic.easeOut',
        });
        break;
      }
      case 'trace-energized': {
        // One soft wash along the whole run, then steady lit state owns it.
        this.surge.setAlpha(0.55);
        this._tween({
          targets: this.surge,
          alpha: 0,
          duration: 320,
          ease: 'Sine.easeOut',
        });
        break;
      }
      case 'trace-reached-relay': {
        // The signal has parked at the cabinet mouth (relay work package
        // §2.1 / §3.4.1): the tungsten inspection lamp flashes twice, the
        // door bolt jumps 4px off its seat to reveal the warm slit, and the
        // case chatters three times at stepped timbres. sfx.js is frozen, so
        // the "three different pitches" are approximated by alternating the
        // bump / blocked hooks 90ms apart.
        this.scene.tweens.killTweensOf(this.relayLamp);
        this._busy.relayLamp = true;
        const flashLamp = (done) => this._tween({
          targets: this.relayLamp,
          alpha: 1,
          duration: 70,
          ease: 'Sine.easeIn',
          onComplete: () => this._tween({
            targets: this.relayLamp,
            alpha: 0.55,
            duration: 110,
            ease: 'Sine.easeOut',
            onComplete: done,
          }),
        });
        this.sfx?.bump?.();
        flashLamp(() => {
          this.sfx?.bump?.();
          flashLamp(() => {
            this._busy.relayLamp = false;
          });
        });
        // Bolt jump (4px, 60ms) + slit reveal; the steady writer then holds
        // the slit open for as long as the snapshot says "reached".
        this.scene.tweens.killTweensOf(this.relayBolt);
        this._tween({
          targets: this.relayBolt,
          x: this.relayBoltX + 4,
          duration: 60,
          ease: 'Cubic.easeOut',
        });
        this.scene.tweens.killTweensOf(this.relaySlit);
        this._busy.relaySlit = true;
        this._tween({
          targets: this.relaySlit,
          alpha: 0.85,
          duration: 120,
          ease: 'Sine.easeOut',
          onComplete: () => {
            this._tween({
              targets: this.relaySlitGlow,
              alpha: 0.16,
              duration: 90,
              ease: 'Sine.easeOut',
              onComplete: () => {
                this._busy.relaySlit = false;
                // Third chatter, different timbre, once the slit glow lands.
                this.sfx?.blocked?.();
              },
            });
          },
        });
        break;
      }
      case 'contactor-bounce': {
        // power-fail (spec §2.2): 120ms 4px press + 260ms Back.easeOut return.
        this.scene.tweens.killTweensOf(this.armature);
        this._busy.armature = true;
        const y0 = this.deviceY + ARM_RELEASED_DY;
        this.armature.setY(y0);
        this._tween({
          targets: this.armature,
          y: y0 + 4,
          duration: 120,
          ease: 'Sine.easeIn',
          onComplete: () => {
            this._tween({
              targets: this.armature,
              y: y0,
              duration: 260,
              ease: 'Back.easeOut',
              onComplete: () => {
                this._busy.armature = false;
              },
            });
          },
        });
        // The guidance target depends on WHY the contactor bounced. The
        // event payload carries the logic snapshot, including lastFault:
        // - open-circuit: the latch never closed, so the current never
        //   entered the trough — the flash pair snaps to the latch foot and
        //   fires once there (240ms, ADD, one-shot per the lead-agent
        //   waiver) plus a 400ms afterglow decay; the eye follows the run
        //   back to the latch — no arrows, no gold highlight.
        // - relay-open: the signal is parked at the relay cabinet mouth —
        //   the same flash pair fires at the cabinet's left wall instead.
        // - signal-in-transit: the run is already live and moving, so
        //   flashing a stop point would lie. Pulse the propagation front
        //   instead; the shell-top lamp below carries the refusal.
        if (evt.lastFault === 'signal-in-transit') {
          this.frontDot.setAlpha(1);
          this._tween({
            targets: this.frontDot,
            scale: { from: 1.8, to: 1 },
            duration: 300,
            ease: 'Cubic.easeOut',
          });
        } else {
          const faultX = evt.lastFault === 'relay-open'
            ? this.relayX - RELAY_CABINET.halfW - 6
            : this.startX;
          this.alertL.setPosition(faultX - 4.5, this.wallY);
          this.alertR.setPosition(faultX + 4.5, this.wallY);
          [this.alertL, this.alertR].forEach((flash) => {
            flash.setAlpha(0.95);
            this._tween({
              targets: flash,
              alpha: 0.22,
              duration: 240,
              ease: 'Sine.easeOut',
              onComplete: () => {
                // Afterglow: a fading ember on the caps, gone within 400ms.
                this._tween({ targets: flash, alpha: 0, duration: 400, ease: 'Sine.easeIn' });
              },
            });
          });
        }
        // Shell-top lamp: single LAMP_WARN flash, then back to dark.
        this._busy.lamp = true;
        this.lamp.setFillStyle(C(CAR.LAMP_WARN), 1);
        this.lamp.setAlpha(1);
        this._tween({
          targets: this.lamp,
          alpha: 0.2,
          duration: 240,
          ease: 'Sine.easeIn',
          onComplete: () => {
            this._busy.lamp = false;
            this.lamp.setFillStyle(C(CAR.ENAMEL_DARK), 1);
            this.lamp.setAlpha(1);
          },
        });
        this.sfx?.blocked?.();
        break;
      }
      case 'contactor-closed': {
        // 80ms Cubic.easeIn slam onto the seat + shell glow swell that
        // settles into the steady 0.12 within 300ms (spec §2.5).
        this._killLoop('armature');
        this.scene.tweens.killTweensOf(this.armature);
        this._busy.armature = true;
        this._tween({
          targets: this.armature,
          y: this.deviceY + ARM_ENGAGED_DY,
          duration: 80,
          ease: 'Cubic.easeIn',
          onComplete: () => {
            this._busy.armature = false;
          },
        });
        this._busy.glow = true;
        this.shellGlow.setAlpha(0.28);
        this._tween({
          targets: this.shellGlow,
          alpha: 0.12,
          duration: 300,
          ease: 'Sine.easeOut',
          onComplete: () => {
            this._busy.glow = false;
          },
        });
        this.sfx?.press?.();
        break;
      }
      case 'traction-enabled': {
        // Lamp locks to steady LAMP_OK — the breathing loop is over.
        this._killLoop('lamp');
        this.scene.tweens.killTweensOf(this.lamp);
        this._busy.lamp = false;
        this.lamp.setFillStyle(C(CAR.LAMP_OK), 1);
        this.lamp.setAlpha(1);
        this._tween({
          targets: this.lamp,
          alpha: 0.92,
          duration: 300,
          ease: 'Sine.easeOut',
        });
        this.sfx?.goal?.();
        break;
      }
      default:
        return; // unknown event type: safely ignored
    }
    this._lastEvent = evt.type;
  }

  /** target: 'latch' | 'power' | 'relay'; text is a spec string or null. */
  setPrompt(target, text) {
    if (this.destroyed) return;
    if (!VALID_PROMPT_TARGETS.has(target)) return;
    this._prompts[target].setText(text ?? '');
  }

  setVisible(visible) {
    this.visible = visible;
    this.objects.forEach((object) => object.setVisible(visible));
  }

  getState() {
    return {
      module: 'contact-interlock-art',
      visible: this.visible,
      destroyed: this.destroyed,
      phase: this._phase,
      lastEvent: this._lastEvent,
      geometry: {
        startX: this.startX,
        endX: this.endX,
        wallY: this.wallY,
        relayX: this.relayX,
        latch: { x: this.latchX, y: this.deviceY },
        relay: {
          x: this.relayX,
          y: this.wallY + (RELAY_CABINET.top + RELAY_CABINET.bottom) / 2,
          w: RELAY_CABINET.halfW * 2,
          h: RELAY_CABINET.bottom - RELAY_CABINET.top,
        },
        contactor: { x: this.contactorX, y: this.deviceY, w: SHELL_W, h: SHELL_H },
      },
      prompts: {
        latch: this._prompts.latch?.text ?? '',
        power: this._prompts.power?.text ?? '',
        relay: this._prompts.relay?.text ?? '',
      },
      depths: { ...DEPTH },
      objectCount: this.objects.length,
      liveTweens: this.tweens.filter((t) => !t.removed).length,
      layers: ['dim', 'trace', 'lit', 'fx', 'latch', 'relay', 'contactor', 'lamp', 'prompts'],
    };
  }

  destroy() {
    if (this.destroyed) return; // repeated destroy is safe
    this.destroyed = true;
    this.tweens.forEach((tween) => {
      try {
        tween.remove?.();
        tween.stop?.();
      } catch {
        // tween already gone
      }
    });
    this.tweens.length = 0;
    this._loops.armature = null;
    this._loops.lamp = null;
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
    this._prompts.latch = null;
    this._prompts.power = null;
  }
}
