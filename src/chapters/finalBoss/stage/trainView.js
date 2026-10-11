// Movement I's stage (round 12): the night service at speed.
//   'side'  THE ROOF RUN, side-on: the painted carriages in a row, the night
//           fields sliding past behind, telegraph poles whipping by, the
//           Conductor huge over the engine at the right edge, hurling.
//   'duel'  RETURN TO SENDER, behind Butch on the tender roof: the engine
//           ahead with the Conductor towering on it, the line pouring away
//           under both, the lens round Butch's punch.
// The two sets share the train; the hand-off between them is a tunnel.

import { TRAIN_URL, WORLDS } from '../../nightService/worldAssets.js';
import { paintClaimCase, paintInkButch, paintInkConductor, paintInkTrainFront, paintLensRimCanvas, paintOverdueStamp } from '../finaleArt.js';
import { paintGantry, paintNightSky, paintSack, paintTenderRoof, paintTrunk } from '../setPieceArt.js';
import { CLAIM, GANTRY, ROOF, ROOF_CARRIAGES, TRUNK } from '../setPieces/roofRun.js';
import { RTS, THROW } from '../setPieces/returnToSender.js';
import {
  THREE, basic, canvasTexture, createFrameCard, createParticles, figureFrame, floorRing, flatBand, paintedCard, paintedMaterial, uprightPlane,
} from './stageKit.js';

const AMBER = 0xe0a24a;
const BRASS = 0xe8b860;
const OXBLOOD = 0x8a2a1e;
const DANGER = 0xe0583a;
// The duel's engine and Conductor stand nearer than the rules' BOSS_Z: at
// the rules' distance he read as a figure on the horizon. He fills the
// frame from the engine roof to just under the HUD.
const DUEL_BOSS_Z = -13;
const GIANT_H = 11.5;
const ENGINE_TOP = 6.0;
const GIANT_HAND_Y = ENGINE_TOP + GIANT_H * 0.55;
const CARRIAGE = Object.freeze({ widthM: 20 * (600 / 583), heightM: 20 * (600 / 583) * (196 / 600), roofFromTop: 0.25, leftPx: 6 });

export const CLAIM_TAGS = Object.freeze([
  '1978-0388 · A. KOVAC', '1978-0391 · HAT BOX', '1978-0397 · E. MARSH', '1978-0402 · UMBRELLA', '1978-0405 · T. OKAFOR',
  '1978-0409 · VIOLIN CASE', '1978-0411 · I. BRANDT', '1978-0415 · WINTER COAT', '1978-0418 · P. SANDOR', '1978-0421 · SEED TIN',
]);

export function createTrainView({ scene, textureLoader, low = false, still = () => false }) {
  const root = new THREE.Group();
  root.visible = false;
  scene.add(root);
  const side = new THREE.Group();
  const duel = new THREE.Group();
  root.add(side, duel);
  const particles = createParticles(root, { low });
  const views = new Map(); // hazard id → mesh
  const art = {};
  let mode = 'side';
  let time = 0;
  let knock = 0; // RETURN TO SENDER's finisher: the last rally knocks him back

  // ------------------------------------------------------------------ art
  function* paint(sources = {}) {
    art.sky = canvasTexture(paintNightSky());
    yield;
    art.butch = {};
    for (const [key, options] of [['idle', { pose: 'idle' }], ['walk0', { pose: 'walk', phase: 0 }], ['walk1', { pose: 'walk', phase: 0.25 }],
      ['walk2', { pose: 'walk', phase: 0.5 }], ['walk3', { pose: 'walk', phase: 0.75 }], ['punch', { pose: 'punch' }], ['hurt', { pose: 'hurt' }],
      ['jump', { pose: 'walk', phase: 0.12 }], ['duck', { pose: 'duck' }]]) { art.butch[key] = canvasTexture(paintInkButch(options)); yield; }
    art.conductor = canvasTexture(paintInkConductor({ lantern: false })); // no glow: it clipped to a box round him
    yield;
    art.gantry = canvasTexture(paintGantry());
    art.trunk = canvasTexture(paintTrunk());
    art.case = canvasTexture(paintClaimCase({ era: 'present', claim: 'NO CLAIM', seed: 2, tone: '#4a3f36' }));
    art.claim = canvasTexture(paintClaimCase({ era: 'present', claim: '', seed: 5, tone: '#6d4a2c' }));
    art.claimPast = canvasTexture(paintClaimCase({ era: 'past', claim: '1978-0412 · VELEZ, M.', seed: 5, tone: '#6d4a2c' }));
    yield;
    art.roof = canvasTexture(paintTenderRoof(), { repeat: true, mips: false });
    art.sack = canvasTexture(paintSack());
    art.stamp = canvasTexture(paintOverdueStamp());
    art.front = canvasTexture(paintInkTrainFront({ era: 'present' }));
    art.lens = canvasTexture(paintLensRimCanvas(120));
    yield;
    art.fields = (sources.fields ?? []).map((image) => {
      const t = new THREE.Texture(image);
      t.colorSpace = THREE.SRGBColorSpace;
      t.needsUpdate = true;
      return t;
    });
    build();
  }

  // ------------------------------------------------------------------ side
  let sideParts = null;
  let duelParts = null;
  function build() {
    // The sky and the moon, fixed to the camera.
    const sky = new THREE.Mesh(new THREE.PlaneGeometry(220, 110), paintedMaterial(art.sky, { transparent: false, fog: false }));
    sky.position.set(0, 14, -80);
    // The night fields, two painted chunks tiled, far behind.
    const fields = [];
    const chunkW = 92;
    const chunkH = chunkW * (941 / 4096);
    for (let k = 0; k < 4; k += 1) {
      const map = art.fields[k % Math.max(1, art.fields.length)] ?? null;
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(chunkW, chunkH), map ? paintedMaterial(map, { transparent: false, fog: false }) : basic(0x0d1424));
      mesh.position.set(k * chunkW, 1.6, -42);
      fields.push(mesh);
      side.add(mesh);
    }
    // Telegraph poles whipping past.
    const poleMat = basic(0x07090c);
    const poles = Array.from({ length: 7 }, (_, i) => {
      const pole = new THREE.Mesh(new THREE.BoxGeometry(0.22, 13, 0.22), poleMat);
      const arm = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.16, 0.16), poleMat);
      arm.position.y = 5.6;
      const g = new THREE.Group();
      g.add(pole, arm);
      g.position.set(i * 9, 0.5, -7);
      side.add(g);
      return g;
    });
    // The ballast and the rails, a blur below.
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 6), basic(0x0b0d10));
    ground.position.set(0, -7.2, -1);
    // The carriages, the tender last.
    const trainMap = textureLoader.load(TRAIN_URL);
    trainMap.colorSpace = THREE.SRGBColorSpace;
    // A roof longer than a carriage (the last carriage Butch starts on) is
    // drawn as several carriages close-coupled.
    const carriages = [];
    for (const r of ROOF_CARRIAGES) {
      const length = r.x1 - r.x0;
      const n = Math.max(1, Math.round(length / 20));
      const each = length / n;
      for (let i = 0; i < n; i += 1) {
        const card = new THREE.Mesh(new THREE.PlaneGeometry(CARRIAGE.widthM * (each / 20), CARRIAGE.heightM), paintedMaterial(trainMap, { fog: false }));
        card.position.set(r.x0 + each * (i + 0.5), -(0.5 - CARRIAGE.roofFromTop) * CARRIAGE.heightM, 0);
        card.renderOrder = 1;
        side.add(card);
        carriages.push(card);
      }
    }
    // The Conductor, over the engine, huge.
    const conductor = paintedCard(art.conductor, 15, { fog: false });
    conductor.position.set(0, -7 + 7.5, -3.5);
    conductor.renderOrder = 0;
    side.add(sky, ground, conductor);
    // Butch.
    const butch = createFrameCard(art.butch, 2.15, { fog: false });
    butch.root.renderOrder = 3;
    side.add(butch.root);
    // Edge warnings (one per kind, reused) and the trunk's drop column.
    const warn = (color) => {
      const g = new THREE.Group();
      const bar = uprightPlane(color, 0.85);
      bar.scale.set(0.5, 0.5, 1);
      const fill = uprightPlane(0xffffff, 0.9);
      fill.scale.set(0.5, 0.001, 1);
      const chev = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.7, 3), basic(color, 0.95));
      chev.rotation.z = Math.PI / 2;
      chev.position.x = -0.6;
      g.add(bar, fill, chev);
      g.userData = { bar, fill, chev };
      g.visible = false;
      side.add(g);
      return g;
    };
    const warnings = { case: [warn(0xc8bca8), warn(0xc8bca8), warn(0xc8bca8)], claim: [warn(BRASS), warn(BRASS)], gantry: [warn(0xff5a3c), warn(0xff5a3c)] };
    // Wind streaks.
    const streaks = Array.from({ length: low ? 4 : 8 }, (_, i) => {
      const s = new THREE.Mesh(new THREE.PlaneGeometry(1.6 + (i % 3) * 0.6, 0.03), basic(0xeadfc6, 0.14, { fog: false }));
      s.position.set(i * 4, -1.5 + (i * 1.37) % 6, 2);
      side.add(s);
      return s;
    });
    sideParts = { sky, fields, poles, ground, carriages, conductor, butch, warnings, streaks, chunkW };

    // ---------------------------------------------------------------- duel
    const roofLen = 60;
    art.roof.repeat.set(1, 3);
    const roof = new THREE.Mesh(new THREE.PlaneGeometry(RTS.halfWidth * 2 + 0.6, roofLen), paintedMaterial(art.roof, { transparent: false, fog: true }));
    roof.rotation.x = -Math.PI / 2;
    roof.position.set(0, 0, -roofLen / 2 + 8);
    const dsky = new THREE.Mesh(new THREE.PlaneGeometry(260, 120), paintedMaterial(art.sky, { transparent: false, fog: false }));
    dsky.position.set(0, 18, -110);
    // The country pouring away on both sides (dark ground, scrolling lights).
    const groundCanvas = document.createElement('canvas');
    groundCanvas.width = 256; groundCanvas.height = 1024;
    const gc = groundCanvas.getContext('2d');
    gc.fillStyle = '#0a0d12'; gc.fillRect(0, 0, 256, 1024);
    for (let i = 0; i < 120; i += 1) { gc.fillStyle = `rgba(255, ${180 + (i % 5) * 12}, 110, ${0.15 + (i % 7) / 14})`; gc.fillRect((i * 97) % 256, (i * 151) % 1024, 2 + (i % 3), 2 + (i % 2)); }
    for (let y = 0; y < 1024; y += 64) { gc.fillStyle = 'rgba(40, 50, 60, 0.6)'; gc.fillRect(0, y, 256, 3); }
    const groundMap = canvasTexture(groundCanvas, { repeat: true, mips: false });
    groundMap.repeat.set(4, 6);
    const land = new THREE.Mesh(new THREE.PlaneGeometry(160, 160), paintedMaterial(groundMap, { transparent: false, fog: true }));
    land.rotation.x = -Math.PI / 2;
    land.position.set(0, -3.4, -50);
    // The engine ahead, the Conductor on it.
    const engine = paintedCard(art.front, 6.4, { fog: false });
    engine.position.set(0, 3.2 - 0.4, DUEL_BOSS_Z - 1.2);
    const giant = paintedCard(art.conductor, GIANT_H, { fog: false });
    giant.position.set(0, ENGINE_TOP - 0.35 + GIANT_H / 2, DUEL_BOSS_Z);
    // The night fields along the horizon behind him.
    const horizon = new THREE.Mesh(new THREE.PlaneGeometry(200, 200 * (941 / 4096)), art.fields[0] ? paintedMaterial(art.fields[0], { transparent: false, fog: false }) : basic(0x0d1424));
    horizon.position.set(0, 4, -100);
    duel.add(horizon);
    // Poles streaming past on both sides.
    const dpoles = Array.from({ length: 10 }, (_, i) => {
      const pole = new THREE.Mesh(new THREE.BoxGeometry(0.25, 12, 0.25), basic(0x06080b));
      pole.position.set(i % 2 ? 7.5 : -7.5, 2, -i * 9);
      duel.add(pole);
      return pole;
    });
    // Smoke from the engine's chimney, rising and blowing back behind him.
    const puffCanvas = document.createElement('canvas');
    puffCanvas.width = 128; puffCanvas.height = 128;
    const pc = puffCanvas.getContext('2d');
    const grad = pc.createRadialGradient(64, 64, 4, 64, 64, 62);
    grad.addColorStop(0, 'rgba(226, 218, 204, 0.9)');
    grad.addColorStop(0.55, 'rgba(200, 192, 180, 0.35)');
    grad.addColorStop(1, 'rgba(180, 172, 160, 0)');
    pc.fillStyle = grad; pc.fillRect(0, 0, 128, 128);
    const puffMap = canvasTexture(puffCanvas, { mips: false });
    const smoke = Array.from({ length: 6 }, (_, i) => {
      const puff = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: puffMap, transparent: true, opacity: 0.3, depthWrite: false, fog: false, toneMapped: false }));
      puff.position.set(0, 9, DUEL_BOSS_Z - 3 - i * 4);
      duel.add(puff);
      return puff;
    });
    const lens = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: art.lens, transparent: true, depthWrite: false, toneMapped: false }));
    lens.rotation.x = -Math.PI / 2;
    lens.position.y = 0.03;
    const lensScale = THROW.claimRing * 2 * ((120 + 26) / 120);
    lens.scale.setScalar(lensScale);
    lens.renderOrder = 5;
    const dbutch = createFrameCard(art.butch, 2.15, { fog: false });
    duel.add(roof, dsky, land, engine, giant, lens, dbutch.root);
    duelParts = { roof, land, groundMap, engine, giant, poles: dpoles, smoke, lens, butch: dbutch };
  }

  // ------------------------------------------------------------------ hazards
  const dropView = (id) => { const v = views.get(id); if (v) { v.parent?.remove(v); views.delete(id); } };
  const caseCard = (kind) => {
    const map = kind === 'trunk' ? art.trunk : kind === 'claim' ? art.claim : art.case;
    const h = kind === 'trunk' ? 1.45 : 1.05;
    const card = paintedCard(map, h, { fog: false });
    card.renderOrder = 4;
    if (kind === 'claim') {
      const halo = new THREE.Mesh(new THREE.RingGeometry(0.62, 0.78, 32), basic(BRASS, 0.75, { fog: false }));
      halo.renderOrder = 5;
      card.add(halo);
    }
    return card;
  };

  function syncSide(piece, dt) {
    const p = sideParts;
    const camX = piece.camX;
    // Backdrops.
    p.sky.position.x = camX;
    const drift = time * 9 + camX * 0.35;
    p.fields.forEach((mesh, k) => {
      const span = p.chunkW * p.fields.length;
      const x = ((k * p.chunkW - drift) % span + span) % span;
      mesh.position.x = camX - p.chunkW * 1.4 + x;
    });
    p.poles.forEach((pole, i) => { const x = ((i * 9 - time * 26 - camX * 0.15) % 63 + 63) % 63; pole.position.x = camX - 24 + x; });
    p.ground.position.x = camX;
    p.streaks.forEach((s, i) => { const x = ((i * 4.3 - time * (30 + (i % 4) * 6)) % 60 + 60) % 60; s.position.x = camX - 28 + x; s.visible = !still(); });
    // The Conductor over the engine: he leans in as he throws, reels when hit.
    const throwing = piece.warnings.length > 0;
    const reel = piece.stagger > 0 ? piece.stagger : 0;
    p.conductor.position.x = THREE.MathUtils.damp(p.conductor.position.x, camX + 11.2 + reel * 2, 6, dt);
    p.conductor.rotation.z = THREE.MathUtils.damp(p.conductor.rotation.z, (throwing ? 0.08 : 0) - reel * 0.14, 8, dt);
    // Butch.
    const b = piece.body;
    p.butch.root.position.set(b.x, b.y, 0.6);
    p.butch.flip(b.facing);
    p.butch.setFrame(figureFrame({ ...b, hitTimer: piece.vitals?.hitTimer ?? 0 }, time));
    // Hazards.
    const live = new Set();
    for (const h of piece.hazards) {
      live.add(h.id);
      let v = views.get(h.id);
      if (h.kind === 'gantry') {
        if (!v) { v = paintedCard(art.gantry, 6.6, { fog: false }); v.renderOrder = 4; side.add(v); views.set(h.id, v); }
        // The beam's underside sits at GANTRY.y0.
        v.position.set(h.x, GANTRY.y0 + 6.6 / 2 - (150 / 520) * 6.6 + 0.0, 1.1);
        continue;
      }
      if (h.kind === 'trunk' && h.phase === 'air') {
        if (!v) { v = caseCard('trunk'); side.add(v); views.set(h.id, v); v.userData.column = uprightPlane(OXBLOOD, 0.35); side.add(v.userData.column); v.userData.column.renderOrder = 2; }
        if (h.bounces === 0) {
          const t = Math.min(1, h.age / Math.max(0.01, h.landAt));
          v.position.set(THREE.MathUtils.lerp(h.from, h.x, t), THREE.MathUtils.lerp(7, 0.72, t) + Math.sin(t * Math.PI) * 3, 0.9);
        } else {
          const span = piece.tuning.tele * TRUNK.bounceT;
          const u = THREE.MathUtils.clamp(1 - (h.landAt - h.age) / span, 0, 1);
          v.position.set(THREE.MathUtils.lerp(h.x + TRUNK.bounce, h.x, u), 0.72 + Math.sin(u * Math.PI) * 1.6, 0.9);
        }
        if (!still()) v.rotation.z += dt * 5;
        const col = v.userData.column;
        const left = Math.max(0, h.landAt - h.age);
        const fill = 1 - Math.min(1, left / 1.2);
        col.visible = true;
        col.scale.set(TRUNK.half * 2, 0.15 + fill * 5.5, 1);
        col.position.set(h.x, (0.15 + fill * 5.5) / 2, 0.4);
        col.material.opacity = 0.18 + 0.32 * fill;
        continue;
      }
      if (!v) { v = caseCard(h.kind === 'trunk' ? 'trunk' : h.kind); side.add(v); views.set(h.id, v); }
      if (v.userData.column) v.userData.column.visible = false;
      v.position.set(h.x, h.y + (h.kind === 'trunk' ? 0.1 : 0.08), 0.9);
      if (!still()) v.rotation.z += (h.returned ? 9 : -h.vx / Math.max(0.3, h.r ?? 0.45)) * dt * 0.35;
    }
    for (const id of [...views.keys()]) if (!live.has(id)) { const v = views.get(id); if (v.userData.column) side.remove(v.userData.column); dropView(id); }
    // The edge warnings, filling.
    const counts = { case: 0, claim: 0, gantry: 0 };
    Object.values(p.warnings).flat().forEach((w) => { w.visible = false; });
    for (const w of piece.warnings) {
      const pool = p.warnings[w.kind] ?? p.warnings.case;
      const g = pool[counts[w.kind] ?? 0];
      counts[w.kind] = (counts[w.kind] ?? 0) + 1;
      if (!g) continue;
      g.visible = true;
      const k = 1 - Math.max(0, w.left) / Math.max(0.01, w.lead);
      g.position.set(camX + 10.6, w.kind === 'gantry' ? 1.6 : 0.55, 2.2);
      g.userData.fill.scale.set(0.5, Math.max(0.001, 0.5 * k), 1);
      g.userData.fill.position.y = -0.25 + 0.25 * k;
    }
  }

  // ------------------------------------------------------------------ duel
  function syncDuel(piece, dt) {
    const p = duelParts;
    const b = piece.body;
    p.groundMap.offset.y = (p.groundMap.offset.y + dt * 0.9) % 1;
    p.poles.forEach((pole, i) => { pole.position.z = ((i * 9 + time * 24) % 90) - 80; });
    p.smoke.forEach((puff, i) => {
      const k = ((time * 0.35 + i / p.smoke.length) % 1);
      puff.position.set(p.giant.position.x * 0.3 + 3.4 + Math.sin(i * 2.1) * 1.2 + k * 2, ENGINE_TOP + 1 + k * 9, DUEL_BOSS_Z - 2.5 - k * 16);
      puff.scale.setScalar(2.4 + k * 6);
      puff.material.opacity = 0.28 * Math.sin(Math.PI * Math.min(1, k * 1.4));
    });
    // He shuffles on the engine; reels when a rally gets past him.
    const reel = piece.stagger > 0 ? piece.stagger : 0;
    p.giant.position.x = THREE.MathUtils.damp(p.giant.position.x, piece.bossX * 1.6, 4, dt);
    knock = Math.max(0, knock - dt * 0.5);
    const k = knock > 0 ? THREE.MathUtils.smoothstep(Math.min(1, (1.8 - knock) / 0.5), 0, 1) : 0;
    p.giant.position.z = DUEL_BOSS_Z - reel * 1.5 - k * 9;
    p.giant.rotation.z = THREE.MathUtils.damp(p.giant.rotation.z, -reel * 0.12 - k * 0.5, 6, dt);
    // Butch, a three-quarter turn into the screen.
    p.butch.root.position.set(b.x, b.y, 0);
    p.butch.root.rotation.y = 0.6 * (b.facing < 0 ? -1 : 1);
    p.butch.flip(b.facing);
    p.butch.setFrame(figureFrame({ ...b, duck: false, grounded: b.grounded, hitTimer: piece.vitals?.hitTimer ?? 0 }, time));
    p.lens.position.x = b.x;
    if (!still()) p.lens.rotation.z += dt * 0.25;
    // Throws: a case on its arc, its ring on the roof.
    const live = new Set();
    for (const h of piece.hazards) {
      live.add(h.id);
      let v = views.get(h.id);
      if (h.kind === 'drop' || h.kind === 'claim' || h.kind === 'decoy') {
        if (!v) {
          v = caseCard(h.kind === 'drop' ? 'case' : 'claim');
          v.userData.ring = floorRing(h.kind === 'drop' ? DANGER : BRASS, { edge: h.kind === 'drop' ? 0xf3e2c0 : 0xffe2a0, y: 0.05 });
          duel.add(v, v.userData.ring.root);
          views.set(h.id, v);
        }
        const t = Math.min(1, h.age / Math.max(0.01, h.T));
        const start = new THREE.Vector3(p.giant.position.x + 2.2, GIANT_HAND_Y, DUEL_BOSS_Z + 1);
        v.position.set(THREE.MathUtils.lerp(start.x, h.x, t), THREE.MathUtils.lerp(start.y, 0.7, t) + Math.sin(t * Math.PI) * 3.5, THREE.MathUtils.lerp(start.z, 0, t));
        const scale = 0.6 + t * 0.6;
        v.scale.setScalar(scale);
        if (!still()) v.rotation.z += dt * 6;
        const ring = v.userData.ring;
        ring.root.position.x = h.x;
        const revealed = h.kind === 'decoy' && h.revealed;
        if (revealed) ring.color(0x8a8a8a);
        ring.set(h.kind === 'drop' ? THROW.ring : THROW.claimRing, t, revealed ? 0.8 : 1);
        if ((h.kind === 'claim' || h.kind === 'decoy') && !v.userData.read && h.T - h.age < 0.62) {
          v.userData.read = true;
          v.material.map = h.kind === 'claim' ? art.claimPast : art.case;
          v.material.needsUpdate = true;
        }
        continue;
      }
      if (h.kind === 'return') {
        if (!v) { v = caseCard('claim'); v.material.map = art.claimPast; duel.add(v); views.set(h.id, v); }
        const t = Math.min(1, h.age / Math.max(0.01, h.T));
        v.position.set(THREE.MathUtils.lerp(h.x, p.giant.position.x, t), 1.2 + t * (GIANT_HAND_Y - 1.2) + Math.sin(t * Math.PI) * 2, THREE.MathUtils.lerp(0, DUEL_BOSS_Z + 1, t));
        v.scale.setScalar(1.2 - t * 0.5);
        if (!still()) v.rotation.z -= dt * 10;
        continue;
      }
      if (h.kind === 'sweep') {
        if (!v) { v = paintedCard(art.sack, 1.4, { fog: false }); v.scale.x = 2.8; duel.add(v); views.set(h.id, v); }
        const z = h.age < h.windup ? -15 : h.z;
        v.position.set(0, 0.6, z);
        v.visible = h.age >= h.windup * 0.4;
        continue;
      }
      if (h.kind === 'stamp') {
        if (!v) { v = flatBand(OXBLOOD, 0.3); duel.add(v); views.set(h.id, v); v.userData.mark = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.42), new THREE.MeshBasicMaterial({ map: art.stamp, transparent: true, depthWrite: false, toneMapped: false })); v.userData.mark.rotation.x = -Math.PI / 2; v.userData.mark.visible = false; duel.add(v.userData.mark); }
        const w = h.x1 - h.x0;
        const k = Math.min(1, h.age / Math.max(0.01, h.T));
        v.scale.set(w, 2.4 * k + 0.05, 1);
        v.position.set((h.x0 + h.x1) / 2, 0.04, 0);
        v.material.opacity = 0.15 + 0.4 * k;
        if (h.struck) { v.userData.mark.visible = true; v.userData.mark.scale.setScalar(w * 0.9); v.userData.mark.position.set((h.x0 + h.x1) / 2, 0.06, 0); }
      }
    }
    for (const id of [...views.keys()]) if (!live.has(id)) { const v = views.get(id); if (v.userData.ring) duel.remove(v.userData.ring.root); if (v.userData.mark) duel.remove(v.userData.mark); dropView(id); }
  }

  // ------------------------------------------------------------------ api
  return {
    root,
    paint,
    get ready() { return Boolean(sideParts); },
    enter(piece) {
      mode = piece.view === 'duel' ? 'duel' : 'side';
      root.visible = true;
      side.visible = mode === 'side';
      duel.visible = mode === 'duel';
      for (const id of [...views.keys()]) dropView(id);
      particles.clear();
    },
    leave() { root.visible = false; knock = 0; for (const id of [...views.keys()]) dropView(id); particles.clear(); },
    look(piece) {
      return piece.view === 'duel'
        ? { background: 0x070a12, fog: 0x0a0e18, density: 0.012 }
        : { background: 0x05070d, fog: 0x05070d, density: 0.0 };
    },
    sync(piece, dt, camera) {
      time += dt;
      if (!sideParts) return;
      if (mode === 'side') syncSide(piece, dt); else syncDuel(piece, dt);
      particles.update(dt, camera);
    },
    camera(piece) {
      if (piece.view === 'duel') {
        const b = piece.body;
        return { position: new THREE.Vector3(b.x * 0.35, 3.4 + b.y * 0.2, 10.5), target: new THREE.Vector3(b.x * 0.2, 6, -10), fov: 60 };
      }
      const x = piece.camX + 0.6;
      return { position: new THREE.Vector3(x, 2.2, 18), target: new THREE.Vector3(x, 1.4, 0), fov: 38 };
    },
    // Where a thing is in the world, for effects and tags.
    point(piece, what) {
      if (what === 'boss') return piece.view === 'duel' ? new THREE.Vector3(duelParts.giant.position.x, GIANT_HAND_Y, DUEL_BOSS_Z) : new THREE.Vector3(piece.camX + 12, 6, -3);
      const b = piece.body;
      return piece.view === 'duel' ? new THREE.Vector3(b.x, 1.2 + b.y, 0) : new THREE.Vector3(b.x, 1.1 + b.y, 0.6);
    },
    onEvent(e, piece) {
      if (!sideParts) return;
      const at = (x, y, z, color, count = 12, opts = {}) => particles.spawn('shard', x, y, z, { color, count, ...opts });
      if (piece.view === 'side') {
        if (e.type === 'land' && (e.speed ?? 0) > 6) particles.spawn('dust', piece.body.x, 0.1, 0.8, { color: 0x9a8a78, count: 6, speed: 2.5, size: 0.14, gravity: 3 });
        if (e.type === 'trunk-land') at(e.x, 0.4, 0.9, 0x8a7a66, 16, { speed: 7 });
        if (e.type === 'act' && (e.result === 'returned' || e.result === 'volley')) at(e.x, e.y + 0.4, 1, e.result === 'volley' ? 0xffe2a0 : AMBER, 18, { speed: 9 });
        if (e.type === 'claim-hit') at(piece.camX + 11, 6, -2.5, AMBER, 22, { speed: 10, size: 0.3 });
        if (e.type === 'hurt') at(piece.body.x, 1.1 + piece.body.y, 0.8, OXBLOOD, 14, { speed: 7 });
      } else {
        if (e.type === 'landed') at(e.hazard.x, 0.4, 0, e.hazard.kind === 'drop' ? 0x8a7a66 : BRASS, 12, { speed: 6, plane: 'xz' });
        if (e.type === 'act' && (e.result === 'returned' || e.result === 'volley')) at(e.x, 1.2, 0, e.result === 'volley' ? 0xffe2a0 : AMBER, 18, { speed: 9 });
        if (e.type === 'return-arrives' || e.type === 'rally-won') at(duelParts.giant.position.x, GIANT_HAND_Y, DUEL_BOSS_Z + 1, AMBER, e.type === 'rally-won' ? 30 : 12, { speed: 12, size: 0.35 });
        if (e.type === 'stamp') at((e.hazard.x0 + e.hazard.x1) / 2, 0.3, 0, OXBLOOD, 16, { speed: 6, plane: 'xz' });
        if (e.type === 'hurt') at(piece.body.x, 1.2, 0, OXBLOOD, 14, { speed: 7 });
        if (e.type === 'state' && e.state === 'finisher') {
          // Knocked back off his feet on the engine roof, his claims flying.
          knock = 1.8;
          at(duelParts.giant.position.x, GIANT_HAND_Y, DUEL_BOSS_Z + 1, AMBER, 60, { speed: 16, size: 0.4 });
          at(duelParts.giant.position.x, ENGINE_TOP + 1, DUEL_BOSS_Z + 1, 0xefe3c6, 30, { speed: 10, size: 0.5 });
        }
      }
    },
    // World tags (DOM, TEXT SIZE): the claim read through the lens.
    tags(piece) {
      const out = [];
      if (piece.view === 'duel') {
        for (const h of piece.hazards) {
          if ((h.kind === 'claim' || h.kind === 'decoy') && h.T - h.age < 0.62 && h.T - h.age > -0.1) {
            out.push({ text: h.kind === 'decoy' ? 'NO CLAIM' : `${CLAIM_TAGS[(h.rallyIndex + Number(h.id.split('-')[1])) % CLAIM_TAGS.length]} · <kbd>E</kbd>`, x: h.x, y: 2.2, z: 0, dim: h.kind === 'decoy' });
          }
        }
      } else {
        for (const h of piece.hazards) if (h.kind === 'claim' && !h.returned && h.x - piece.body.x < 5 && h.x > piece.body.x) out.push({ text: '<kbd>E</kbd> · RETURN', x: h.x, y: 1.4, z: 1 });
      }
      return out;
    },
    count: () => views.size,
  };
}

export { CLAIM, ROOF };
