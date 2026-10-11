// Movement III's stage (round 12): Echo City's sunlit square.
//   'top'       FALSE CLAIMS, from above: the terrace, the Conductor on the
//               steps at the top of the square, his misreadings flying as
//               words; Butch with the one dot that can be hit.
//   'standoff'  THE STANDOFF, at the height of the stones: the two of them
//               at either end, the clock between; the four record cards at
//               Butch's hands; a cut to his face on the draw.
// The hand-off between them is the camera coming down to the stones.

import { paintTrueThingCard } from '../finaleArt.js';
import { ECHO_FLOOR, echoTerraceSteps, paintEchoParapet, paintEchoProp, paintEchoSkyline, paintEchoSquare } from '../finaleWorldArt.js';
import { paintWordSlip } from '../setPieceArt.js';
import { ANSWER, CARDS, SQUARE } from '../setPieces/falseClaims.js';
import { THREE, basic, canvasTexture, createParticles, floorRing, flatBand, paintedCard, paintedMaterial } from './stageKit.js';

const BRASS = 0xe8b860;
const GOLD = 0xffd98a;
const DANGER = 0xe8663f;
const STAND = Object.freeze({ butch: new THREE.Vector3(-3.4, 0, 3.4), boss: new THREE.Vector3(4.6, 0, -4.8) });
const SLOT_OFFSET = Object.freeze({ up: [0, 3.4, 0], left: [-1.9, 1.7, 0.2], right: [1.9, 1.7, 0.2], down: [0, 0.35, 0.9] });
const GLYPH = Object.freeze({ up: '↑', left: '←', right: '→', down: '↓' });

export function createSquareView({ scene, low = false, still = () => false }) {
  const root = new THREE.Group();
  root.visible = false;
  scene.add(root);
  const particles = createParticles(root, { low });
  const art = { words: new Map() };
  let parts = null;
  let rigs = null;
  let mode = 'top';
  let time = 0;
  let crack = 0; // THE STANDOFF's finisher: he has no answer, the square opens under him
  let hole = null;
  const views = new Map();
  let answerBeam = null;
  let cut = null;

  function* paint({ rigs: r } = {}) {
    rigs = r ?? null;
    const lamps = [{ x: -14.2, z: -7.4 }, { x: 14.2, z: -7.4 }, { x: -14.4, z: 2.6 }, { x: 14.4, z: 2.6 }, { x: -5.2, z: -7.6 }, { x: 5.2, z: -7.6 }];
    const floor = yield* echoTerraceSteps({ lamps });
    art.floor = canvasTexture(floor);
    yield;
    art.square = canvasTexture(paintEchoSquare());
    yield;
    art.parapet = canvasTexture(paintEchoParapet());
    yield;
    art.skyline = canvasTexture(paintEchoSkyline());
    yield;
    art.props = {};
    for (const kind of ['lamp', 'clock', 'bench', 'stall', 'shelter']) { art.props[kind] = canvasTexture(paintEchoProp(kind)); yield; }
    art.card = canvasTexture(paintTrueThingCard());
    yield;
    build(lamps);
  }

  const wordTexture = (word) => {
    if (!art.words.has(word)) art.words.set(word, canvasTexture(paintWordSlip(word), { mips: false }));
    return art.words.get(word);
  };

  function build(lamps) {
    const { x0, x1, z0, z1 } = ECHO_FLOOR;
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), paintedMaterial(art.floor, { transparent: false, fog: true }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.set((x0 + x1) / 2, 0, (z0 + z1) / 2);
    floor.material.color.setHex(0xa59a90);
    const lower = new THREE.Mesh(new THREE.PlaneGeometry(60, 32), paintedMaterial(art.square, { transparent: false, fog: true }));
    lower.rotation.x = -Math.PI / 2;
    lower.position.set(0, -2.8, -24);
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(32, 2.8), paintedMaterial(art.parapet, { transparent: false }));
    wall.position.set(0, -1.4, -8);
    const sky = new THREE.Mesh(new THREE.PlaneGeometry(112, 46.7), paintedMaterial(art.skyline, { transparent: false, fog: false }));
    sky.position.set(0, 9.5, -54);
    root.add(floor, lower, wall, sky);
    const props = [
      ...lamps.map(({ x, z }) => ({ kind: 'lamp', x, z, h: 4.4 })),
      { kind: 'clock', x: 0.6, z: -9.6, h: 6.4 }, { kind: 'shelter', x: -14.6, z: -3.2, h: 3.2 }, { kind: 'stall', x: 14.6, z: -2.6, h: 2.6 }, { kind: 'bench', x: -14.8, z: 6.4, h: 1.2 },
    ];
    const propMeshes = props.map((p) => { const m = paintedCard(art.props[p.kind], p.h); m.position.set(p.x, p.h / 2, p.z); root.add(m); return m; });
    // The rigs: Butch and the Conductor (Chapter 3), the Conductor big.
    const conductor = rigs?.conductor?.root ?? new THREE.Mesh(new THREE.ConeGeometry(0.8, 3.6, 8), basic(0x15181c));
    const butch = rigs?.butch?.root ?? new THREE.Mesh(new THREE.ConeGeometry(0.4, 1.8, 8), basic(0x6b4a2c));
    const conductorWrap = new THREE.Group();
    conductorWrap.add(conductor);
    const butchWrap = new THREE.Group();
    butchWrap.add(butch);
    // The dot that can be hit, over Butch, always on top.
    const dot = new THREE.Mesh(new THREE.CircleGeometry(0.2, 20), new THREE.MeshBasicMaterial({ color: 0xfff1d0, depthTest: false, transparent: true, toneMapped: false }));
    const dotRim = new THREE.Mesh(new THREE.RingGeometry(0.2, 0.27, 24), new THREE.MeshBasicMaterial({ color: 0x8a2a1e, depthTest: false, transparent: true, toneMapped: false }));
    dot.renderOrder = dotRim.renderOrder = 20;
    root.add(conductorWrap, butchWrap, dot, dotRim);
    // Round 13 (George could not tell what to do here): a thread from Butch
    // to the second true thing while he holds one, and, once he holds both,
    // the gold lane on the stones where the answer would land.
    const tether = flatBand(BRASS, { opacity: 0.5, y: 0.07 });
    tether.visible = false;
    const lane = flatBand(GOLD, { opacity: 0.2, y: 0.04 });
    lane.material.blending = THREE.AdditiveBlending;
    lane.visible = false;
    const laneEdges = [-1, 1].map(() => { const e = flatBand(GOLD, { opacity: 0.6, y: 0.05 }); e.visible = false; return e; });
    root.add(tether, lane, ...laneEdges);
    answerBeam = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), basic(0xffe2a0, 0, { blending: THREE.AdditiveBlending, fog: false }));
    answerBeam.rotation.x = -Math.PI / 2;
    answerBeam.renderOrder = 9;
    root.add(answerBeam);
    // The standoff's four cards, at his hands.
    const slotCards = Object.fromEntries(Object.keys(SLOT_OFFSET).map((slot) => {
      const card = paintedCard(art.card, 0.8, { fog: false });
      card.renderOrder = 10;
      root.add(card);
      return [slot, card];
    }));
    parts = { floor, props: propMeshes, conductor: conductorWrap, butch: butchWrap, dot, dotRim, slotCards, pigeons: [], tether, lane, laneEdges };
  }

  // Above the square he stands nearly twice Butch's height, all of him in view.
  const scaleBoss = (top) => parts.conductor.scale.setScalar(top ? 1.9 : 1.35);

  function syncTop(piece, dt, camera) {
    const b = piece.body;
    parts.butch.position.set(b.x, 0, b.z);
    const moving = b.moving;
    if (moving) parts.butch.rotation.y = Math.atan2(b.vx, b.vz);
    rigs?.butch?.play(b.punch > 0 ? 'Punch_Jab' : moving ? 'Jog_Fwd_Loop' : 'Idle_Loop', b.punch > 0);
    parts.dot.position.set(b.x, 1.3, b.z);
    parts.dotRim.position.copy(parts.dot.position);
    parts.dot.quaternion.copy(camera.quaternion);
    parts.dotRim.quaternion.copy(camera.quaternion);
    // He walks the steps at the top of the square.
    parts.conductor.position.set(piece.bossX, 0, SQUARE.bossZ);
    parts.conductor.rotation.y = Math.atan2(b.x - piece.bossX, b.z - SQUARE.bossZ) * 0.6;
    // The words, flying (each a slip of the record with its hittable core).
    const live = new Set();
    for (const w of piece.bullets) {
      live.add(w.id);
      let v = views.get(w.id);
      if (!v) {
        // The slip lies on the stones, its size its hitbox (falseClaims.js).
        const slip = new THREE.Mesh(new THREE.PlaneGeometry((w.half + w.R) * 2, w.R * 2), new THREE.MeshBasicMaterial({ map: wordTexture(w.word), transparent: true, depthWrite: false, toneMapped: false, fog: false }));
        slip.rotation.x = -Math.PI / 2;
        slip.position.y = 0.12;
        slip.renderOrder = 8;
        const shadow = new THREE.Mesh(new THREE.PlaneGeometry((w.half + w.R) * 2, w.R * 2), basic(0x1a0c08, 0.35, { fog: false }));
        shadow.rotation.x = -Math.PI / 2;
        shadow.position.set(0.12, 0.03, 0.12);
        const g = new THREE.Group();
        g.add(shadow, slip);
        const sprite = slip;
        root.add(g);
        v = { root: g, sprite, kind: 'word' };
        views.set(w.id, v);
      }
      v.root.position.set(w.x, 0, w.z);
      if (!still()) v.sprite.position.y = 0.12 + Math.abs(Math.sin(time * 9 + w.x)) * 0.06;
    }
    // His windups: a ring where the words will come from; the rain's lines.
    for (const wu of piece.windups) {
      live.add(wu.id);
      let v = views.get(wu.id);
      if (!v) {
        const ring = floorRing(DANGER, { edge: 0xf3e2c0, y: 0.06 });
        const g = new THREE.Group();
        g.add(ring.root);
        if (wu.xs) wu.xs.forEach((x) => { const line = flatBand(DANGER, 0.25); line.scale.set(0.12, SQUARE.maxZ - SQUARE.minZ + 2, 1); line.position.set(x - wu.x, 0.05, (SQUARE.minZ + SQUARE.maxZ) / 2 - wu.z); g.add(line); });
        root.add(g);
        v = { root: g, ring, kind: 'windup' };
        views.set(wu.id, v);
      }
      v.root.position.set(wu.x, 0, wu.z);
      const k = 1 - wu.left / Math.max(0.01, wu.total);
      v.ring.set(wu.kind === 'ring' ? 7.2 : 1.2, k, 1);
    }
    // The two true things (brass), held ones circling Butch.
    piece.cards.forEach((c, i) => {
      live.add(c.id);
      let v = views.get(c.id);
      if (!v) {
        const card = new THREE.Sprite(new THREE.SpriteMaterial({ map: art.card, transparent: true, depthWrite: false, toneMapped: false, fog: false }));
        card.scale.set(1.3, 0.92, 1);
        card.renderOrder = 9;
        const ring = floorRing(BRASS, { edge: 0xffe2a0, y: 0.05 });
        // A column of light over the ring: walk in here.
        const column = new THREE.Mesh(new THREE.CylinderGeometry(CARDS.reach, CARDS.reach, 3.2, 28, 1, true), basic(GOLD, 0.16, { blending: THREE.AdditiveBlending, fog: false, depthWrite: false }));
        column.position.y = 1.6;
        column.renderOrder = 6;
        const g = new THREE.Group();
        g.add(card, ring.root, column);
        root.add(g);
        v = { root: g, card, ring, column, kind: 'card' };
        views.set(c.id, v);
      }
      if (c.held) {
        const a = time * 3 + i * Math.PI;
        v.root.position.set(b.x + Math.cos(a) * 0.9, 0, b.z + Math.sin(a) * 0.9);
        v.card.position.y = 2.5;
        v.ring.root.visible = false;
        v.column.visible = false;
      } else {
        v.root.position.set(c.x, 0, c.z);
        // the card comes down into its ring and stays low over it
        v.card.position.y = c.age < 0.9 ? 1.05 + (1 - c.age / 0.9) * 6 : 1.05 + (still() ? 0 : Math.sin(time * 2.4 + c.x) * 0.1);
        v.ring.root.visible = true;
        const pulse = still() ? 0.5 : 0.5 + 0.5 * Math.sin(time * 4);
        // holding one: the other ring's fill is the time left
        const left = piece.held.length === 1 ? Math.max(0, piece.pairLeft) / Math.max(0.01, piece.pairTotal ?? CARDS.pair) : 1;
        v.ring.set(CARDS.reach, piece.held.length === 1 ? left : 0.6 + 0.4 * pulse, 1);
        v.column.visible = true;
        v.column.material.opacity = 0.1 + 0.12 * pulse;
      }
    });
    // The thread to the second true thing.
    const other = piece.held.length === 1 ? piece.cards.find((c) => !c.held) : null;
    parts.tether.visible = Boolean(other);
    if (other) {
      const dx = other.x - b.x; const dz = other.z - b.z;
      const len = Math.max(0.01, Math.hypot(dx, dz) - CARDS.reach);
      const ux = dx / Math.max(0.01, Math.hypot(dx, dz)); const uz = dz / Math.max(0.01, Math.hypot(dx, dz));
      parts.tether.position.set(b.x + ux * len / 2, 0.07, b.z + uz * len / 2);
      parts.tether.rotation.set(-Math.PI / 2, 0, Math.atan2(-dz, dx));
      parts.tether.scale.set(len, 0.14, 1);
      parts.tether.material.opacity = 0.35 + (still() ? 0.15 : 0.25 * Math.abs(Math.sin(time * 6)));
    }
    // The gold lane under him, where the answer lands.
    const lane = piece.lane;
    parts.lane.visible = Boolean(lane);
    parts.laneEdges.forEach((e) => { e.visible = Boolean(lane); });
    if (lane) {
      const z0 = SQUARE.bossZ + 0.6; const z1 = SQUARE.maxZ;
      parts.lane.position.set(lane.x, 0.04, (z0 + z1) / 2);
      parts.lane.scale.set(lane.half * 2, z1 - z0, 1);
      parts.lane.material.opacity = lane.under ? 0.34 : 0.16 + (still() ? 0 : 0.06 * Math.sin(time * 5));
      parts.laneEdges.forEach((e, i) => { e.position.set(lane.x + (i ? 1 : -1) * lane.half, 0.05, (z0 + z1) / 2); e.scale.set(0.08, z1 - z0, 1); });
    }
    parts.dot.material.color.setHex(lane?.under ? GOLD : 0xfff1d0);
    for (const [id, v] of views) if (!live.has(id) && v.kind !== 'slot') { root.remove(v.root); views.delete(id); }
    // The answer, up the square at him.
    answerBeam.material.opacity = Math.max(0, answerBeam.material.opacity - dt * 2.4);
  }

  function syncStandoff(piece, dt) {
    parts.butch.position.copy(STAND.butch);
    parts.butch.rotation.y = Math.atan2(STAND.boss.x - STAND.butch.x, STAND.boss.z - STAND.butch.z);
    parts.conductor.position.copy(STAND.boss);
    parts.conductor.rotation.y = Math.atan2(STAND.butch.x - STAND.boss.x, STAND.butch.z - STAND.boss.z);
    parts.dot.visible = parts.dotRim.visible = false;
    if (crack > 0) {
      crack += dt;
      const open = THREE.MathUtils.smoothstep(crack, 0.2, 1.4);
      if (!hole) {
        hole = new THREE.Mesh(new THREE.CircleGeometry(1, 9), basic(0x050302));
        hole.rotation.x = -Math.PI / 2;
        root.add(hole);
      }
      hole.position.set(STAND.boss.x, 0.03, STAND.boss.z);
      hole.scale.setScalar(0.2 + open * 3.2);
      parts.conductor.position.y = -THREE.MathUtils.smoothstep(crack, 0.9, 2.3) * 7;
      parts.conductor.rotation.z = THREE.MathUtils.smoothstep(crack, 0.6, 2.3) * 0.4;
    }
    const duel = piece.duel;
    const slots = piece.slots();
    for (const [slot, card] of Object.entries(parts.slotCards)) {
      card.visible = Boolean(slots) && duel?.stage !== 'said' && duel?.stage !== 'claim';
      card.material.opacity = 0.55;
      const [ox, oy, oz] = SLOT_OFFSET[slot];
      card.position.set(STAND.butch.x + ox, oy, STAND.butch.z + oz);
      const chosen = duel && (duel.firstSlot === slot);
      card.material.color.setHex(chosen ? 0xfff2cc : 0xffffff);
      card.scale.setScalar(chosen ? 1.25 : 1);
      card.lookAt(new THREE.Vector3(-2.8, 1.5, 8.5));
    }
    if (duel) {
      const anim = duel.stage === 'claim' ? 'Idle_Talking_Loop' : duel.stage === 'answered' ? 'Spell_Simple_Shoot' : duel.stage === 'said' ? 'Hit_Head' : duel.stage === 'wait' ? 'Spell_Simple_Idle_Loop' : 'Idle_Loop';
      rigs?.conductor?.play(anim, duel.stage === 'answered' || duel.stage === 'said');
      rigs?.butch?.play(duel.stage === 'second' || duel.stage === 'said' ? 'Punch_Cross' : duel.stage === 'answered' ? 'Hit_Chest' : 'Idle_Loop', duel.stage !== 'wait' && duel.stage !== 'claim');
    }
    // Pigeons, when a feint startles them.
    for (const pg of parts.pigeons) { pg.age += dt; pg.mesh.position.x += pg.vx * dt; pg.mesh.position.y += pg.vy * dt; pg.mesh.rotation.z = still() ? 0 : Math.sin(pg.age * 30) * 0.5; }
    parts.pigeons = parts.pigeons.filter((pg) => { if (pg.age > 2.5) { root.remove(pg.mesh); return false; } return true; });
  }

  return {
    root,
    paint,
    get ready() { return Boolean(parts); },
    enter(piece) {
      mode = piece.view === 'standoff' ? 'standoff' : 'top';
      root.visible = true;
      for (const [id, v] of views) { root.remove(v.root); views.delete(id); }
      particles.clear();
      if (parts) {
        scaleBoss(mode === 'top');
        parts.dot.visible = parts.dotRim.visible = mode === 'top';
        Object.values(parts.slotCards).forEach((c) => { c.visible = mode === 'standoff'; });
      }
    },
    leave() {
      root.visible = false;
      particles.clear();
      crack = 0;
      if (hole) { root.remove(hole); hole = null; }
      if (parts) { parts.conductor.position.y = 0; parts.conductor.rotation.z = 0; }
    },
    look() { return { background: 0x3a2420, fog: 0x3b2622, density: 0.012 }; },
    sync(piece, dt, camera) {
      time += dt;
      if (!parts) return;
      if (cut) { cut.left -= dt; if (cut.left <= 0) cut = null; }
      if (mode === 'top') syncTop(piece, dt, camera); else syncStandoff(piece, dt);
      particles.update(dt, camera);
    },
    camera(piece) {
      if (piece.view === 'standoff') {
        if (cut?.kind === 'draw') return { position: new THREE.Vector3(STAND.boss.x - 1.5, 3.6, STAND.boss.z + 3.6), target: new THREE.Vector3(STAND.boss.x, 3.9, STAND.boss.z), fov: 28 };
        if (cut?.kind === 'answered') return { position: new THREE.Vector3(STAND.boss.x - 2.5, 3.2, STAND.boss.z + 5.2), target: new THREE.Vector3(STAND.boss.x, 3.4, STAND.boss.z), fov: 34 };
        const duel = piece.duel;
        if (duel?.stage === 'second' || duel?.stage === 'draw') return { position: new THREE.Vector3(STAND.butch.x - 2.4, 2.6, STAND.butch.z + 3.4), target: new THREE.Vector3(STAND.butch.x + 1.5, 2.1, STAND.butch.z - 2), fov: 40 };
        return { position: new THREE.Vector3(-2.8, 1.6, 9.5), target: new THREE.Vector3(1.4, 2.5, -3.5), fov: 42 };
      }
      // from above and in front: all of him on the steps, all of the square
      return { position: new THREE.Vector3(0, 16, 14.5), target: new THREE.Vector3(0, 0.5, -2.2), fov: 54 };
    },
    point(piece, what) {
      if (what === 'boss') return mode === 'top' ? new THREE.Vector3(piece.bossX, 5, SQUARE.bossZ) : STAND.boss.clone().setY(4);
      return mode === 'top' ? new THREE.Vector3(piece.body.x, 1.2, piece.body.z) : STAND.butch.clone().setY(1.6);
    },
    onEvent(e, piece) {
      if (!parts) return;
      if (e.type === 'act' && e.result === 'pair' && mode === 'top') {
        const b = piece.body;
        answerBeam.scale.set(1.2, b.z - SQUARE.bossZ, 1);
        answerBeam.position.set(b.x, 1, (b.z + SQUARE.bossZ) / 2);
        answerBeam.material.opacity = 0.9;
        particles.spawn('shard', piece.bossX, 4, SQUARE.bossZ, { color: BRASS, count: 28, speed: 11, size: 0.3 });
      }
      if (e.type === 'act' && e.result === 'aside') {
        const b = piece.body;
        answerBeam.scale.set(0.6, b.z - SQUARE.bossZ + 6, 1);
        answerBeam.position.set(b.x, 1, (b.z + SQUARE.bossZ - 6) / 2);
        answerBeam.material.opacity = 0.45;
      }
      if (e.type === 'word-falls') particles.spawn('dust', e.bullet.x, 0.4, e.bullet.z, { color: 0xefe3c6, count: 2, speed: 2, size: 0.18, gravity: 6, plane: 'xz' });
      if (e.type === 'hurt' && mode === 'top') particles.spawn('shard', piece.body.x, 1.2, piece.body.z, { color: 0x8a2a1e, count: 14, speed: 7, plane: 'xz' });
      if (e.type === 'held') particles.spawn('shard', piece.body.x, 1.4, piece.body.z, { color: BRASS, count: 10, speed: 5, plane: 'xz' });
      if (e.type === 'draw') cut = { kind: 'draw', left: 0.34 };
      if (e.type === 'finisher' && e.kind === 'no-answer' && mode === 'standoff') {
        crack = 0.001;
        particles.spawn('shard', STAND.boss.x, 0.4, STAND.boss.z, { color: 0x6a4a32, count: 50, speed: 12, size: 0.4 });
        particles.spawn('dust', STAND.boss.x, 0.3, STAND.boss.z, { color: 0xc8b090, count: 30, speed: 5, size: 0.6, gravity: 1 });
      }
      if (e.type === 'answered') { cut = { kind: 'answered', left: 0.6 }; rigs?.conductor?.play('Spell_Simple_Shoot', true); }
      if (e.type === 'feint') {
        if (e.kind === 'hand') rigs?.conductor?.play('Interact', true);
        if (e.kind === 'pigeons') for (let i = 0; i < 6; i += 1) { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.2), basic(0x2a2220)); m.position.set(1 + i * 0.4, 0.4, -1 - i * 0.3); root.add(m); parts.pigeons.push({ mesh: m, vx: 1.5 + Math.random() * 2, vy: 2.5 + Math.random() * 2, age: 0 }); }
      }
      if (e.type === 'act' && (e.result === 'first' || e.result === 'second')) particles.spawn('shard', STAND.butch.x + 1, 2, STAND.butch.z - 1, { color: BRASS, count: 16, speed: 8 });
      if (e.type === 'boss-struck') particles.spawn('shard', ...(mode === 'top' ? [piece.bossX, 4, SQUARE.bossZ] : [STAND.boss.x, 3.5, STAND.boss.z]), { color: 0xffd7d7, count: 24, speed: 10, size: 0.28 });
    },
    tags(piece) {
      const out = [];
      if (mode === 'top') {
        const b = piece.body;
        const holding = piece.held.length === 1;
        for (const c of piece.cards) {
          if (c.held) continue;
          const near = Math.hypot(c.x - b.x, c.z - b.z) < 3;
          out.push({ text: `${holding ? 'AND THIS ONE' : 'TRUE'} · ${c.text}`, x: c.x, y: 2.2, z: c.z, priority: near || holding ? 2 : 1, color: '#e8b860' });
        }
        const lane = piece.lane;
        if (lane) out.push({ text: lane.under ? '<kbd>E</kbd> · SAY BOTH' : lane.x < b.x ? '◂ TO THE GOLD LANE · THEN <kbd>E</kbd>' : 'TO THE GOLD LANE ▸ · THEN <kbd>E</kbd>', x: b.x, y: 3.2, z: b.z, priority: 3 });
      }
      // The standoff's cards are a DOM panel of their own (spectacleBattle
      // updateDuel): words that follow TEXT SIZE, at fixed hands.
      return out;
    },
    count: () => views.size,
  };
}

export { ANSWER };
