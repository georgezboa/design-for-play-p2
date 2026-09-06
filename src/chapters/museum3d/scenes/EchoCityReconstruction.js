// Beat 3 — full-scale Echo City reconstruction.
//
// The player handles one physical record rather than reading a chain of wall
// text: inspect two passes with the same identity, watch the scanner reject two
// separate crossings, observe Mara's public movement routine, then walk beside
// her for three marked steps and a lane change.  A missed step simply resets
// the reconstruction at the start line; no evidence or progress is erased.

import * as THREE from 'three';
import { COLORS } from '../config.js';
import { PUNCHED_NUMBER } from '../state/evidenceRecord.js';
import { mat, emissiveMat, box, plane, label, displayCase, hitProxy } from '../util/graybox.js';

export const ECHO_CITY_ENTRY = Object.freeze({
  spawn: Object.freeze({ x: -6, z: -0.6, yaw: -Math.PI / 2 }),
  returnCase: Object.freeze({ x: -3.2, z: -0.9, w: 1.5, d: 0.9 }),
});

const CROSSING = Object.freeze({
  startX: 3.0,
  scannerX: 13.2,
  speed: 1.45,
  partnerOffsetZ: 1.0,
  xTolerance: 1.65,
  zTolerance: 0.95,
  pads: Object.freeze([5.4, 8.2, 11.2]),
});

const LOCKED_EXCHANGE = [
  { speaker: 'ARCHIVIST', text: 'The passenger file contains one identity and two valid transit passes.' },
  { speaker: 'BUTCH', text: 'The city rejected us when we approached separately.' },
  { speaker: 'ARCHIVIST', text: 'It accepted the pair after three synchronized steps and a lane change.' },
  { speaker: 'BUTCH', text: "Then record that it recognized the way we moved together. Don't rewrite two people as one clean entry." },
  { speaker: 'ARCHIVIST', text: 'The record can preserve the duplicate and the accepted crossing.' },
  { speaker: 'BUTCH', text: 'Do that.' },
  { speaker: 'BUTCH', text: 'We did not solve the duplicate. We learned how to cross without erasing either person.' },
];

function archiveFigure(parent, name, color, z) {
  const group = new THREE.Group();
  group.name = name;
  group.position.set(CROSSING.startX, 0, z);
  parent.add(group);
  const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.78 });
  box(group, { x: 0, y: 1.08, z: 0, w: 0.5, h: 1.0, d: 0.3, material, name: `${name}-body` });
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 8), material);
  head.position.set(0, 1.78, 0);
  head.name = `${name}-head`;
  group.add(head);
  box(group, { x: -0.14, y: 0.38, z: 0, w: 0.14, h: 0.65, d: 0.16, material, name: `${name}-leg-l` });
  box(group, { x: 0.14, y: 0.38, z: 0, w: 0.14, h: 0.65, d: 0.16, material, name: `${name}-leg-r` });
  group.visible = false;
  return group;
}

export class EchoCityReconstruction {
  constructor() {
    this.name = 'echo';
    this.root = new THREE.Group();
    this.root.name = 'echo-city-reconstruction';
    this.background = new THREE.Color(0x1b2636);
    this.play = {
      mode: 'idle',
      time: 0,
      crossedPads: [false, false, false],
      laneChangeMatched: false,
      lastMatched: false,
    };
  }

  build(ctx) {
    this.ctx = ctx;
    const { collisionWorld: world } = ctx;
    const g = this.root;

    // ---- street shell -------------------------------------------------------
    plane(g, { x: 20, z: -0.5, w: 56, h: 4, material: mat(0x8b8e92), name: 'platform-walk' });
    plane(g, { x: 20, y: -0.15, z: -4, w: 56, h: 3, material: mat(0x30343a), name: 'track-bed' });
    plane(g, { x: 20, z: 4.5, w: 56, h: 6, material: mat(0x41454c), name: 'road' });
    plane(g, { x: 20, z: 8.75, w: 56, h: 2.5, material: mat(0x797c81), name: 'south-sidewalk' });

    const bound = mat(0x252b33);
    box(g, { x: -8, y: 2, z: 1, w: 0.4, h: 4, d: 18, material: bound, name: 'bound-west', collide: true, collisionWorld: world });
    box(g, { x: 48, y: 2, z: 1, w: 0.4, h: 4, d: 18, material: bound, name: 'bound-east', collide: true, collisionWorld: world });
    box(g, { x: 20, y: 0.5, z: -2.4, w: 56, h: 1.0, d: 0.15, material: mat(0x426f70), name: 'platform-rail', collide: true, collisionWorld: world });

    const facades = [0x626b78, 0x71695f, 0x59636f];
    for (let i = 0; i < 8; i++) {
      const bx = -4 + i * 7;
      const northH = 7 + (i % 3) * 1.5;
      box(g, { x: bx, y: northH / 2, z: -7.5, w: 6.6, h: northH, d: 3.5, material: mat(facades[i % 3]), name: `north-bldg-${i}`, collide: true, collisionWorld: world });
      this._windows(g, bx, -5.7, northH, i);
      const southH = 6 + ((i + 1) % 3) * 1.5;
      box(g, { x: bx, y: southH / 2, z: 12, w: 6.6, h: southH, d: 4, material: mat(facades[(i + 1) % 3]), name: `south-bldg-${i}`, collide: true, collisionWorld: world });
      this._windows(g, bx, 9.9, southH, i + 2);
    }

    // ---- train: a destination and backdrop, never the interaction target ----
    const train = new THREE.Group();
    train.position.set(27, 0, -3.6);
    train.name = 'train';
    g.add(train);
    box(train, { x: 0, y: 1.7, z: 0, w: 16, h: 3.0, d: 1.8, material: mat(0x9d4242), name: 'train-body' });
    world.addBoxFromCenterSize(27, -3.6, 16, 1.8, 'train');
    box(train, { x: 0, y: 2.4, z: 0.92, w: 16, h: 0.5, d: 0.04, material: emissiveMat(0xe4ddc8), name: 'train-stripe' });
    for (let i = 0; i < 6; i++) {
      box(train, { x: -6.5 + i * 2.6, y: 1.9, z: 0.92, w: 1.4, h: 0.8, d: 0.04, material: emissiveMat(0x2d4858), name: `train-window-${i}` });
    }
    label(g, 'LAST TRAIN — PLATFORM 1', { x: 27, y: 2.9, z: -1.9, w: 3.0, h: 0.5 });

    // ---- record case: the beginning and the return point --------------------
    this.passCase = displayCase(g, {
      ...ECHO_CITY_ENTRY.returnCase,
      plinthH: 0.82,
      glassH: 1.18,
      name: 'paired-pass-case',
      collisionWorld: world,
    });
    const passA = box(this.passCase, { x: -0.25, y: 1.05, z: 0, w: 0.32, h: 0.025, d: 0.54, material: emissiveMat(0xd7a95e), name: 'pass-a' });
    const passB = box(this.passCase, { x: 0.25, y: 1.05, z: 0, w: 0.32, h: 0.025, d: 0.54, material: emissiveMat(COLORS.cyan), name: 'pass-b' });
    passA.rotation.y = -0.08;
    passB.rotation.y = 0.08;
    this.passCaseLabel = label(this.passCase, `TWO VALID PASSES\nONE IDENTITY — ${PUNCHED_NUMBER}`, { x: 0, y: 1.55, z: 0.46, w: 1.34, h: 0.46, bg: '#e9e2cf', fg: '#24272b', font: 'bold 28px "Courier New", monospace' });

    // ---- public reconstruction lane -----------------------------------------
    box(g, { x: 8.1, y: 0.025, z: -0.7, w: 10.2, h: 0.05, d: 0.08, material: emissiveMat(0x5fbfc4), name: 'mara-route-line' });
    box(g, { x: 8.1, y: 0.025, z: 0.3, w: 10.2, h: 0.05, d: 0.08, material: emissiveMat(0xb89357), name: 'player-route-line' });
    for (let i = 0; i < 7; i++) {
      const x = 3.3 + i * 1.55;
      const z = x < 8 ? 0.3 : 0.3 + Math.min(0.9, (x - 8) * 0.3);
      box(g, { x, y: 0.03, z, w: 0.18, h: 0.06, d: 0.18, material: emissiveMat(0xb89357), name: `lane-tick-${i}` });
    }
    label(g, 'WALK BESIDE MARA\nTHREE STEPS + ONE LANE CHANGE', { x: 7.8, y: 0.035, z: 1.55, w: 4.8, h: 0.52, bg: '#202a31', fg: '#d9d4c6' }).rotation.x = -Math.PI / 2;

    this.stepPads = CROSSING.pads.map((x, index) => {
      const material = new THREE.MeshBasicMaterial({ color: 0x394750, transparent: true, opacity: 0.82 });
      const pad = new THREE.Mesh(new THREE.CircleGeometry(0.32, 20), material);
      pad.rotation.x = -Math.PI / 2;
      pad.position.set(x, 0.04, index < 2 ? 0.3 : 0.95);
      pad.name = `sync-step-${index + 1}`;
      g.add(pad);
      return pad;
    });

    this.mara = archiveFigure(g, 'mara-record', COLORS.cyan, -0.7);
    this.butch = archiveFigure(g, 'butch-record', 0xd7a95e, 0.3);

    // ---- physical replay crank ----------------------------------------------
    this.replayConsole = new THREE.Group();
    this.replayConsole.position.set(0.2, 0, 0.95);
    this.replayConsole.name = 'movement-replay-console';
    g.add(this.replayConsole);
    box(this.replayConsole, { x: 0, y: 0.7, z: 0, w: 1.0, h: 1.4, d: 0.62, material: mat(0x39434c), name: 'replay-console-body' });
    box(this.replayConsole, { x: 0, y: 1.17, z: -0.32, w: 0.64, h: 0.3, d: 0.06, material: emissiveMat(0x192f38), name: 'replay-console-screen' });
    this.replayHandle = box(this.replayConsole, { x: 0, y: 0.63, z: -0.42, w: 0.16, h: 0.62, d: 0.14, material: mat(0xb89357), name: 'replay-handle' });
    this.replayHandle.rotation.z = -0.35;
    label(this.replayConsole, 'PUBLIC MOVEMENT REPLAY', { x: 0, y: 1.55, z: -0.33, w: 1.55, h: 0.32, bg: '#e9e2cf', fg: '#24272b', font: 'bold 28px "Courier New", monospace' });
    this.replayProxy = hitProxy(this.replayConsole, { x: 0, y: 0.9, z: -0.15, w: 1.5, h: 1.8, d: 1.2, name: 'replay-proxy' });

    // ---- behavioral scanner -------------------------------------------------
    const steel = mat(0x426f70);
    box(g, { x: 14, y: 1.2, z: -1.1, w: 0.38, h: 2.4, d: 0.38, material: steel, name: 'scanner-post-a', collide: true, collisionWorld: world });
    box(g, { x: 14, y: 1.2, z: 1.65, w: 0.38, h: 2.4, d: 0.38, material: steel, name: 'scanner-post-b', collide: true, collisionWorld: world });
    box(g, { x: 14, y: 2.45, z: 0.28, w: 0.38, h: 0.24, d: 3.1, material: steel, name: 'scanner-beam' });
    this.scannerLampMaterial = new THREE.MeshBasicMaterial({ color: 0x8a3d46 });
    this.scannerLamp = box(g, { x: 13.78, y: 2.35, z: 0.28, w: 0.08, h: 0.36, d: 0.58, material: this.scannerLampMaterial, name: 'scanner-lamp' });
    label(g, 'BEHAVIORAL SCANNER\nPAIR STATUS', { x: 13.78, y: 3.02, z: 0.28, w: 2.3, h: 0.55, rotationY: Math.PI / 2, bg: '#202a31', fg: '#d9d4c6' });

    // ---- archive filing terminal after successful crossing ------------------
    this.recordConsole = new THREE.Group();
    this.recordConsole.position.set(16.3, 0, 1.3);
    this.recordConsole.name = 'accepted-pair-record';
    g.add(this.recordConsole);
    box(this.recordConsole, { x: 0, y: 0.75, z: 0, w: 1.25, h: 1.5, d: 0.72, material: mat(0x364149), name: 'record-console-body' });
    this.recordScreenMaterial = new THREE.MeshBasicMaterial({ color: 0x213039 });
    box(this.recordConsole, { x: 0, y: 1.08, z: -0.38, w: 0.88, h: 0.45, d: 0.05, material: this.recordScreenMaterial, name: 'record-console-screen' });
    label(this.recordConsole, 'ARCHIVE FINDING', { x: 0, y: 1.62, z: -0.38, w: 1.55, h: 0.32, bg: '#e9e2cf', fg: '#24272b', font: 'bold 28px "Courier New", monospace' });
    this.recordProxy = hitProxy(this.recordConsole, { x: 0, y: 0.9, z: -0.1, w: 1.7, h: 1.9, d: 1.3, name: 'record-proxy' });

    // ---- readable light hierarchy -------------------------------------------
    for (const lx of [0, 14, 28, 42]) {
      box(g, { x: lx, y: 2.2, z: 1.8, w: 0.14, h: 4.4, d: 0.14, material: mat(0x3b4148), name: `lamp-${lx}` });
      box(g, { x: lx, y: 4.35, z: 1.2, w: 0.1, h: 0.1, d: 1.2, material: mat(0x3b4148), name: `lamp-arm-${lx}` });
      box(g, { x: lx, y: 4.25, z: 0.7, w: 0.3, h: 0.12, d: 0.4, material: emissiveMat(0xfff0c7), name: `lamp-head-${lx}` });
      const pool = new THREE.PointLight(0xffe9bd, 23, 15, 1.55);
      pool.position.set(lx, 3.9, 0.6);
      g.add(pool);
    }
    g.add(new THREE.HemisphereLight(0x8da7c4, 0x343a42, 1.42));
    g.add(new THREE.AmbientLight(0x52677d, 0.62));
    const routeFill = new THREE.DirectionalLight(0xb9d8ef, 1.05);
    routeFill.position.set(-3, 8, 5);
    g.add(routeFill);
  }

  _windows(g, bx, bz, h, seed) {
    const rows = Math.floor(h / 2);
    for (let r = 0; r < rows; r++) {
      for (let cix = 0; cix < 3; cix++) {
        const lit = (seed * 7 + r * 3 + cix) % 4 === 0;
        box(g, {
          x: bx - 2 + cix * 2,
          y: 1.6 + r * 2,
          z: bz,
          w: 0.9,
          h: 1.1,
          d: 0.06,
          material: lit ? emissiveMat(0xe8ddb0) : mat(0x29333d),
          name: `win-${bx}-${r}-${cix}`,
        });
      }
    }
  }

  registerInteractions() {
    const { interaction, model, dialogue } = this.ctx;

    interaction.register('paired-pass-case', {
      mesh: this.passCase,
      enabled: () => {
        const s = model.getSnapshot();
        return s.phase === 'echo-city' && (!s.echoRecord.passesInspected || (s.echoRecord.recordFiled && s.ticket.carried));
      },
      prompt: () => model.getSnapshot().echoRecord.recordFiled
        ? 'E — RETURN BOTH PASSES AND CLOSE RECORD 03'
        : 'E — INSPECT THE TWO TRANSIT PASSES',
      action: () => {
        const s = model.getSnapshot();
        if (s.echoRecord.recordFiled) {
          this.ctx.returnToMuseum();
          return;
        }
        const result = model.dispatch({ type: 'inspectEchoPasses' });
        if (result.changed) {
          dialogue.play([
            { speaker: 'ARCHIVIST', text: 'The passenger file contains one identity and two valid transit passes.' },
            { speaker: 'BUTCH', text: 'That was the problem. The city treated the second person as a duplicate.' },
            { speaker: null, text: 'Use the public replay crank to test the two passes separately.' },
          ]);
        }
      },
    });

    interaction.register('movement-replay', {
      mesh: this.replayConsole,
      enabled: () => {
        const s = model.getSnapshot();
        return s.phase === 'echo-city' && s.echoRecord.passesInspected && !s.echoRecord.pairedCrossingAccepted && ['idle', 'paired-wait'].includes(this.play.mode);
      },
      prompt: () => {
        const s = model.getSnapshot();
        if (!s.echoRecord.directAttemptRejected) return 'E — TEST THE PASSES SEPARATELY';
        if (!s.echoRecord.routineObserved) return "E — PLAY MARA'S PUBLIC ROUTINE";
        return 'E — BEGIN THE PAIRED CROSSING';
      },
      action: () => {
        const s = model.getSnapshot();
        if (!s.echoRecord.directAttemptRejected) this._startDirectAttempt();
        else if (!s.echoRecord.routineObserved) this._startRoutine();
        else this._armPairedCrossing();
      },
    });

    interaction.register('accepted-pair-record', {
      mesh: this.recordConsole,
      enabled: () => {
        const s = model.getSnapshot();
        return s.phase === 'echo-city' && s.echoRecord.pairedCrossingAccepted && !s.echoRecord.recordFiled;
      },
      prompt: 'E — FILE WHAT THE CROSSING PROVES',
      action: () => {
        const result = model.dispatch({ type: 'filePairedRecord' });
        if (result.changed) {
          this.recordScreenMaterial.color.setHex(COLORS.cyan);
          dialogue.play(LOCKED_EXCHANGE, {
            onComplete: () => dialogue.play([
              { speaker: null, text: 'Return both passes to the entry case. Record 03 will preserve the duplicate and the accepted pair.' },
            ]),
          });
        }
      },
    });
  }

  _startDirectAttempt() {
    this._resetRun('direct');
    this.butch.visible = true;
    this.mara.visible = true;
    this.scannerLampMaterial.color.setHex(0x8a3d46);
  }

  _startRoutine() {
    this._resetRun('routine');
    this.mara.visible = true;
    this.butch.visible = false;
  }

  _armPairedCrossing() {
    this._resetRun('paired-wait');
    this.mara.visible = true;
    this.butch.visible = false;
    this.ctx.dialogue.play([
      { speaker: null, text: 'Stand on the amber line beside Mara. Stay level through three floor lights and follow her lane change.' },
    ]);
  }

  _resetRun(mode = 'idle') {
    this.play.mode = mode;
    this.play.time = 0;
    this.play.crossedPads = [false, false, false];
    this.play.laneChangeMatched = false;
    this.play.lastMatched = false;
    this.mara.position.set(CROSSING.startX, 0, -0.7);
    this.butch.position.set(CROSSING.startX, 0, 0.3);
    this.stepPads.forEach((pad) => pad.material.color.setHex(0x394750));
  }

  _setFiguresForDirect(t) {
    const first = Math.min(1, t / 2.25);
    const second = Math.min(1, Math.max(0, (t - 2.7) / 2.25));
    this.butch.position.x = THREE.MathUtils.lerp(CROSSING.startX, CROSSING.scannerX, first);
    this.mara.position.x = THREE.MathUtils.lerp(CROSSING.startX, CROSSING.scannerX, second);
    this.butch.position.z = 0.3;
    this.mara.position.z = 0.3;
  }

  _setMaraRoutine(t) {
    if (t < 2.5) {
      this.mara.position.x = THREE.MathUtils.lerp(CROSSING.startX, 8.0, t / 2.5);
      this.mara.position.z = -0.7;
    } else if (t < 3.5) {
      this.mara.position.x = 8.0;
      this.mara.position.z = -0.7;
    } else if (t < 5.0) {
      const u = (t - 3.5) / 1.5;
      this.mara.position.x = THREE.MathUtils.lerp(8.0, 10.0, u);
      this.mara.position.z = THREE.MathUtils.lerp(-0.7, 0.2, u);
    } else {
      const u = Math.min(1, (t - 5.0) / 2.2);
      this.mara.position.x = THREE.MathUtils.lerp(10.0, CROSSING.startX, u);
      this.mara.position.z = THREE.MathUtils.lerp(0.2, -0.7, u);
    }
  }

  _pairedZ(x) {
    if (x <= 7.8) return -0.7;
    if (x >= 10.8) return 0.2;
    return THREE.MathUtils.lerp(-0.7, 0.2, (x - 7.8) / 3.0);
  }

  _isMatched(player) {
    const desiredZ = this.mara.position.z + CROSSING.partnerOffsetZ;
    return Math.abs(player.x - this.mara.position.x) <= CROSSING.xTolerance
      && Math.abs(player.z - desiredZ) <= CROSSING.zTolerance;
  }

  _updatePaired(dt) {
    const player = this.ctx.controller.position;
    if (this.play.mode === 'paired-wait') {
      this.mara.visible = true;
      if (Math.abs(player.x - CROSSING.startX) <= 1.8 && Math.abs(player.z - 0.3) <= 1.25) {
        this.play.mode = 'paired';
        this.play.time = 0;
      }
      return;
    }

    this.play.time += dt;
    this.mara.position.x = CROSSING.startX + this.play.time * CROSSING.speed;
    this.mara.position.z = this._pairedZ(this.mara.position.x);
    const matched = this._isMatched(player);
    this.play.lastMatched = matched;

    CROSSING.pads.forEach((padX, index) => {
      if (!this.play.crossedPads[index] && this.mara.position.x >= padX) {
        this.play.crossedPads[index] = matched;
        this.stepPads[index].material.color.setHex(matched ? COLORS.cyan : 0x8a3d46);
      }
    });
    if (this.mara.position.x >= 9.4 && this.mara.position.x <= 11.8 && matched) {
      this.play.laneChangeMatched = true;
    }

    if (this.mara.position.x < CROSSING.scannerX) return;
    const success = this.play.crossedPads.every(Boolean) && this.play.laneChangeMatched && matched;
    if (success) {
      this.ctx.model.dispatch({ type: 'acceptPairedCrossing' });
      this.play.mode = 'accepted';
      this.scannerLampMaterial.color.setHex(COLORS.cyan);
      this.recordScreenMaterial.color.setHex(0x315e64);
      this.ctx.dialogue.play([
        { speaker: 'ARCHIVIST', text: 'Pair accepted. The scanner recognized three synchronized steps and the shared lane change.' },
        { speaker: null, text: 'The archive terminal beyond the gate is ready to file the result.' },
      ]);
    } else {
      this.play.mode = 'resetting';
      this.play.time = 0;
      this.scannerLampMaterial.color.setHex(0x8a3d46);
      this.ctx.dialogue.play([
        { speaker: null, text: 'The scanner lost the pair. Mara is returning to the start line; no progress was erased.' },
      ]);
    }
  }

  enter(snapshot) {
    this.mara.visible = false;
    this.butch.visible = false;
    this.scannerLampMaterial.color.setHex(snapshot.echoRecord.pairedCrossingAccepted ? COLORS.cyan : 0x8a3d46);
    this.recordScreenMaterial.color.setHex(snapshot.echoRecord.recordFiled ? COLORS.cyan : 0x213039);
    if (snapshot.echoRecord.routineObserved && !snapshot.echoRecord.pairedCrossingAccepted) {
      this._resetRun('paired-wait');
      this.mara.visible = true;
    } else if (snapshot.echoRecord.pairedCrossingAccepted) {
      this._resetRun('accepted');
      this.mara.visible = true;
      this.mara.position.set(14.7, 0, 0.2);
    } else {
      this._resetRun('idle');
    }
  }

  update(dt, snapshot) {
    if (this.play.mode === 'direct') {
      this.play.time += dt;
      this._setFiguresForDirect(this.play.time);
      if (this.play.time >= 5.1) {
        this.ctx.model.dispatch({ type: 'recordDirectRejection' });
        this.play.mode = 'idle';
        this.butch.visible = false;
        this.mara.visible = false;
        this.scannerLampMaterial.color.setHex(0xc44f59);
        this.ctx.dialogue.play([
          { speaker: 'BUTCH', text: 'The city rejected us when we approached separately.' },
          { speaker: null, text: "Play Mara's public routine on the same replay crank." },
        ]);
      }
    } else if (this.play.mode === 'routine') {
      this.play.time += dt;
      this._setMaraRoutine(this.play.time);
      if (this.play.time >= 7.2) {
        this.ctx.model.dispatch({ type: 'observeMaraRoutine' });
        this._resetRun('idle');
        this.mara.visible = true;
        this.ctx.dialogue.play([
          { speaker: null, text: 'Mara carried the second pass, waited in public, changed lanes, and returned. Nothing in the movement was hidden.' },
          { speaker: 'BUTCH', text: 'We crossed when I matched that routine beside her.' },
        ]);
      }
    } else if (this.play.mode === 'paired' || this.play.mode === 'paired-wait') {
      this._updatePaired(dt);
    } else if (this.play.mode === 'resetting') {
      this.play.time += dt;
      this.mara.position.x = THREE.MathUtils.lerp(CROSSING.scannerX, CROSSING.startX, Math.min(1, this.play.time / 1.4));
      this.mara.position.z = THREE.MathUtils.lerp(0.2, -0.7, Math.min(1, this.play.time / 1.4));
      if (this.play.time >= 1.4) this._resetRun('paired-wait');
    }

    this.replayHandle.rotation.z = -0.35 + (['direct', 'routine'].includes(this.play.mode) ? Math.sin(this.play.time * 9) * 0.22 : 0);
    void snapshot;
  }

  getGameplayState() {
    return {
      mode: this.play.mode,
      mara: { x: Number(this.mara.position.x.toFixed(2)), z: Number(this.mara.position.z.toFixed(2)) },
      crossedPads: [...this.play.crossedPads],
      laneChangeMatched: this.play.laneChangeMatched,
      playerMatched: this.play.lastMatched,
    };
  }

  exit() {}

  dispose() {
    this.root.clear();
  }
}
