// Movement II's stage (round 12): Borrowed Light, in the rain.
//   'rooftops' ON THE BELL, side-on: the roofs of the city running away to
//              his bell tower, the skyline behind, the Conductor huge over
//              the city with his searchlight; lamps, bridges, billboards and
//              the bell planks that are only out on the bell.
//   'tower'    THE BELL TOWER: inside the shaft, the camera rising with
//              Butch; ledges, swinging beams, the ring running down the
//              stones, the borrowed light rising below, the bell above.

import { paintBillboardFace, paintBridgeDeck, paintLampNode, paintRainConductor, paintRainFigure, paintRainSkyline } from '../finaleArt.js';
import { paintBeamWood, paintBell, paintFacade, paintTowerStone } from '../setPieceArt.js';
import { LAMPS, PLANKS, ROOFS, ROOFTOP } from '../setPieces/bellRooftops.js';
import { TOWER, TOWER_LEDGES, TOWER_SWINGS } from '../setPieces/bellTower.js';
import { THREE, basic, canvasTexture, createFrameCard, createParticles, figureFrame, paintedCard, paintedMaterial, uprightPlane } from './stageKit.js';

const AMBER = 0xe0a24a;
const TEAL = 0x6fb7ad;
const ROSE = 0xc98088;
const STREET_Y = -14;

export function createRooftopView({ scene, low = false, still = () => false }) {
  const root = new THREE.Group();
  root.visible = false;
  scene.add(root);
  const roofs = new THREE.Group();
  const tower = new THREE.Group();
  root.add(roofs, tower);
  const particles = createParticles(root, { low });
  const art = {};
  let parts = null;
  let mode = 'rooftops';
  let time = 0;
  let camY = 1;
  let litFor = 0;
  const beams = new Map();

  function* paint() {
    art.skyline = canvasTexture(paintRainSkyline());
    yield;
    art.facades = [0, 1, 2].map((seed) => canvasTexture(paintFacade({ seed: 4 + seed, lit: 0.3 + seed * 0.08 }), { repeat: true, mips: false }));
    yield;
    art.butch = {};
    for (const [key, options] of [['idle', { pose: 'idle' }], ['walk0', { pose: 'run', phase: 0 }], ['walk1', { pose: 'run', phase: 0.25 }],
      ['walk2', { pose: 'run', phase: 0.5 }], ['walk3', { pose: 'run', phase: 0.75 }], ['punch', { pose: 'punch' }], ['hurt', { pose: 'hurt' }], ['jump', { pose: 'jump' }]]) {
      art.butch[key] = canvasTexture(paintRainFigure(options));
      yield;
    }
    art.conductor = canvasTexture(paintRainConductor({ scale: 4 }));
    art.conductorLit = canvasTexture(paintRainConductor({ scale: 4, lit: true }));
    yield;
    art.lamps = {};
    for (const line of ['amber', 'teal', 'rose']) { art.lamps[line] = Object.fromEntries(['idle', 'queued', 'powering'].map((state) => [state, canvasTexture(paintLampNode({ line, state }))])); yield; }
    art.deck = canvasTexture(paintBridgeDeck(400, 150));
    art.boardDark = canvasTexture(paintBillboardFace(false));
    art.boardLit = canvasTexture(paintBillboardFace(true));
    yield;
    art.stone = canvasTexture(paintTowerStone(), { repeat: true, mips: false });
    art.wood = canvasTexture(paintBeamWood(), { repeat: true, mips: false });
    art.bell = canvasTexture(paintBell());
    art.bellCracked = canvasTexture(paintBell({ cracked: true }));
    yield;
    build();
  }

  function build() {
    // ---------------------------------------------------------------- roofs
    const sky = new THREE.Mesh(new THREE.PlaneGeometry(240, 105), paintedMaterial(art.skyline, { transparent: false, fog: false }));
    sky.position.set(0, 10, -70);
    // A row of far buildings between the skyline and the roofs.
    const far = new THREE.Group();
    for (let i = 0; i < 26; i += 1) {
      const w = 7 + ((i * 37) % 6);
      const h = 7 + ((i * 53) % 9);
      const map = art.facades[i % 3].clone();
      map.needsUpdate = true;
      map.repeat.set(w / 8, h / 12);
      const b = new THREE.Mesh(new THREE.PlaneGeometry(w, h), paintedMaterial(map, { transparent: false, fog: true }));
      b.position.set(-20 + i * 10.5, STREET_Y + h / 2 + 4, -24);
      b.material.color.setHex(0x6c7a82);
      far.add(b);
    }
    // The Conductor over the city, his searchlight.
    const conductor = paintedCard(art.conductor, 30, { fog: false });
    conductor.position.set(0, 7, -34);
    const street = new THREE.Mesh(new THREE.PlaneGeometry(600, 40), basic(0x05090b));
    street.rotation.x = -Math.PI / 2;
    street.position.set(100, STREET_Y, -6);
    roofs.add(sky, far, conductor, street);
    // The roofs: a slab on top, the facade down to the street.
    for (const r of ROOFS) {
      const w = r.x1 - r.x0;
      const slab = new THREE.Mesh(new THREE.BoxGeometry(w, 0.32, 3), basic(r.id.startsWith('chimney') ? 0x4a2e26 : 0x2c363c));
      slab.position.set((r.x0 + r.x1) / 2, r.y - 0.16, 0);
      const map = art.facades[ROOFS.indexOf(r) % 3].clone();
      map.needsUpdate = true;
      map.repeat.set(w / 8, (r.y - STREET_Y) / 12);
      const face = new THREE.Mesh(new THREE.PlaneGeometry(w, r.y - STREET_Y), paintedMaterial(map, { transparent: false, fog: true }));
      face.position.set((r.x0 + r.x1) / 2, (r.y + STREET_Y) / 2 - 0.3, 1.5);
      const lip = new THREE.Mesh(new THREE.BoxGeometry(w + 0.2, 0.12, 0.2), basic(0xb8c8d0, 0.6));
      lip.position.set((r.x0 + r.x1) / 2, r.y + 0.02, 1.55);
      roofs.add(slab, face, lip);
    }
    // Bell planks: amber or teal boards, a faint outline when folded.
    const planks = PLANKS.map((p) => {
      const color = p.line === 'amber' ? AMBER : TEAL;
      const board = new THREE.Mesh(new THREE.BoxGeometry(p.x1 - p.x0, 0.24, 1.6), basic(color, 1, { transparent: true }));
      board.position.set((p.x0 + p.x1) / 2, p.y - 0.12, 0);
      const ghost = new THREE.Mesh(new THREE.BoxGeometry(p.x1 - p.x0, 0.24, 1.6), basic(color, 0.14, { wireframe: false }));
      ghost.position.copy(board.position);
      roofs.add(board, ghost);
      return { p, board, ghost };
    });
    // Lamps (painted lamp nodes), bridges and billboards.
    const lamps = LAMPS.map((l) => {
      const card = paintedCard(art.lamps[l.line].idle, 2.7, { fog: false });
      card.position.set(l.x, l.y + 1.35, 0.4);
      roofs.add(card);
      let deck = null;
      let board = null;
      if (l.bridge) {
        deck = new THREE.Mesh(new THREE.BoxGeometry(1, 0.22, 1.5), paintedMaterial(art.deck, { transparent: false, fog: false }));
        deck.position.set(l.bridge.x0, l.bridge.y - 0.11, 0);
        roofs.add(deck);
      }
      if (l.board) {
        const w = l.board.x1 - l.board.x0;
        board = new THREE.Group();
        const panel = new THREE.Mesh(new THREE.PlaneGeometry(w, 1.8), paintedMaterial(art.boardDark, { transparent: false, fog: false }));
        panel.position.y = -0.9;
        const top = new THREE.Mesh(new THREE.BoxGeometry(w, 0.16, 1.2), basic(0x1a1d1f));
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.16, 6, 0.16), basic(0x15181a));
        post.position.set(0, -4.6, -0.1);
        board.add(panel, top, post);
        board.position.set((l.board.x0 + l.board.x1) / 2, l.board.y, 0.2);
        board.userData.panel = panel;
        roofs.add(board);
      }
      return { l, card, deck, board, state: 'idle' };
    });
    // Rain, around the camera.
    const count = low ? 400 : 900;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 6);
    for (let i = 0; i < count; i += 1) {
      const x = (Math.random() - 0.5) * 50; const y = Math.random() * 30 - 8; const z = (Math.random() - 0.5) * 30;
      positions.set([x, y, z, x - 0.1, y - 0.7, z], i * 6);
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const rain = new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({ color: 0xc8d6dc, transparent: true, opacity: 0.22, toneMapped: false }));
    rain.frustumCulled = false;
    root.add(rain);
    const butch = createFrameCard(art.butch, 2.4, { fog: false, lift: -0.08, rim: { color: 0xf3e4c2, opacity: 0.42, grow: 0.12 } });
    butch.root.renderOrder = 3;
    roofs.add(butch.root);

    // ---------------------------------------------------------------- tower
    art.stone.repeat.set(3, 18);
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(15, 90), paintedMaterial(art.stone, { transparent: false, fog: false }));
    wall.position.set(0, 34, -1.6);
    const sideMat = basic(0x15191c);
    const left = new THREE.Mesh(new THREE.BoxGeometry(1.2, 90, 4), sideMat);
    left.position.set(-7.1, 34, 0);
    const right = left.clone();
    right.position.x = 7.1;
    tower.add(wall, left, right);
    const ledges = TOWER_LEDGES.map((l) => {
      const map = art.wood.clone();
      map.needsUpdate = true;
      map.repeat.set((l.x1 - l.x0) / 4, 1);
      const m = new THREE.Mesh(new THREE.BoxGeometry(l.x1 - l.x0, 0.36, 1.7), paintedMaterial(map, { transparent: false, fog: false }));
      m.position.set((l.x0 + l.x1) / 2, l.y - 0.18, 0);
      tower.add(m);
      return m;
    });
    const swings = TOWER_SWINGS.map((s) => {
      const map = art.wood.clone();
      map.needsUpdate = true;
      const beam = new THREE.Mesh(new THREE.BoxGeometry(s.half * 2, 0.32, 1.5), paintedMaterial(map, { transparent: false, fog: false }));
      const ropeMat = basic(0x8a7a5a);
      const ropes = [0, 1].map(() => { const r = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1, 0.06), ropeMat); tower.add(r); return r; });
      tower.add(beam);
      return { s, beam, ropes };
    });
    const bell = paintedCard(art.bell, 6.4, { fog: false });
    bell.position.set(0, TOWER.bellY + 1.4, -0.6);
    const towerConductor = paintedCard(art.conductor, 11, { fog: false });
    towerConductor.position.set(4.6, TOWER.topY + 5.5, -1.2);
    // The rising light: a gradient, brightest at its edge.
    const lightCanvas = document.createElement('canvas');
    lightCanvas.width = 8; lightCanvas.height = 256;
    const lc = lightCanvas.getContext('2d');
    const g = lc.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, 'rgba(255, 240, 236, 1)');
    g.addColorStop(0.08, 'rgba(240, 170, 180, 0.85)');
    g.addColorStop(1, 'rgba(201, 128, 136, 0.55)');
    lc.fillStyle = g; lc.fillRect(0, 0, 8, 256);
    const light = new THREE.Mesh(new THREE.PlaneGeometry(14, 30), new THREE.MeshBasicMaterial({ map: canvasTexture(lightCanvas, { mips: false }), transparent: true, depthWrite: false, toneMapped: false, fog: false }));
    light.renderOrder = 7;
    const ringBands = [0, 1, 2].map(() => { const band = uprightPlane(0xfff1d0, 0.85, { additive: true }); band.scale.set(14, 0.5, 1); band.position.z = 1.2; band.visible = false; tower.add(band); return band; });
    const ringArrow = new THREE.Mesh(new THREE.ConeGeometry(0.45, 0.8, 3), basic(0xfff1d0, 0.9));
    ringArrow.rotation.z = Math.PI;
    tower.add(ringArrow);
    const weights = [0, 1, 2].map(() => {
      const w = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.2, 1.0), basic(0x202326));
      const shadow = uprightPlane(0x000000, 0.35);
      shadow.scale.set(1.3, 30, 1);
      tower.add(w, shadow);
      return { w, shadow };
    });
    const tbutch = createFrameCard(art.butch, 2.4, { fog: false, lift: -0.08, rim: { color: 0xf3e4c2, opacity: 0.42, grow: 0.12 } });
    tower.add(bell, towerConductor, light, tbutch.root);
    parts = { sky, far, conductor, planks, lamps, rain, butch, ledges, swings, bell, towerConductor, light, ringBands, ringArrow, weights, tbutch };
  }

  const beamMesh = () => { const m = uprightPlane(ROSE, 0.2, { additive: true }); roofs.add(m); return m; };

  function syncRooftops(piece, dt) {
    const p = parts;
    const b = piece.body;
    camY = THREE.MathUtils.damp(camY, b.y, 3, dt);
    p.sky.position.x = b.x * 0.85;
    p.conductor.position.x = THREE.MathUtils.damp(p.conductor.position.x, b.x + 8 + (litFor > 0 ? 2 : 0), 1.5, dt);
    // his face stays just under the HUD as the roofs climb
    p.conductor.position.y = THREE.MathUtils.damp(p.conductor.position.y, camY - 0.5, 2, dt);
    litFor = Math.max(0, litFor - dt);
    const lit = litFor > 0;
    const map = lit ? art.conductorLit : art.conductor;
    if (p.conductor.material.map !== map) { p.conductor.material.map = map; p.conductor.material.needsUpdate = true; }
    // Planks out on their beat (Reduce Motion: they fade, never flicker).
    for (const { p: plank, board } of p.planks) {
      const left = piece.plankLeft(plank.id);
      const out = left > 0;
      const warn = out && left < ROOFTOP.plankWarn;
      board.visible = out;
      board.material.opacity = warn ? (still() ? 0.35 + left : (Math.sin(time * 18) > 0 ? 0.95 : 0.35)) : 1;
    }
    // Lamps, bridges, billboards.
    for (const lamp of p.lamps) {
      const state = piece.lamps().find((l) => l.id === lamp.l.id);
      const level = piece.machineLevel(lamp.l.id);
      const art2 = state.queued ? 'queued' : level > 0.05 || state.lit ? 'powering' : 'idle';
      if (lamp.state !== art2) { lamp.state = art2; lamp.card.material.map = art.lamps[lamp.l.line][art2]; lamp.card.material.needsUpdate = true; }
      if (lamp.deck) {
        const len = (lamp.l.bridge.x1 - lamp.l.bridge.x0) * Math.max(0.001, level);
        lamp.deck.scale.x = Math.max(0.001, len);
        lamp.deck.position.x = lamp.l.bridge.x0 + len / 2;
        lamp.deck.visible = level > 0.01;
      }
      if (lamp.board) {
        lamp.board.position.y = lamp.l.board.y - (1 - level) * 3.2;
        const m = level > 0.6 ? art.boardLit : art.boardDark;
        if (lamp.board.userData.panel.material.map !== m) { lamp.board.userData.panel.material.map = m; lamp.board.userData.panel.material.needsUpdate = true; }
      }
    }
    // His searchlight: a rose column warns, then the light comes down.
    const live = new Set();
    for (const h of piece.hazards) {
      live.add(h.id);
      let m = beams.get(h.id);
      if (!m) { m = beamMesh(); beams.set(h.id, m); }
      const k = Math.min(1, h.age / Math.max(0.01, h.T));
      const firing = h.fired;
      m.scale.set(h.half * 2 * (firing ? 1.1 : 0.35 + 0.65 * k), 40, 1);
      m.position.set(h.x, 6, 0.8);
      m.material.color.setHex(firing ? 0xfff6ee : ROSE);
      m.material.opacity = firing ? 0.85 : 0.08 + 0.22 * k;
    }
    for (const [id, m] of beams) if (!live.has(id)) { roofs.remove(m); beams.delete(id); }
    p.butch.root.position.set(b.x, b.y, 0.7);
    p.butch.flip(b.facing);
    p.butch.setFrame(figureFrame({ ...b, hitTimer: piece.vitals?.hitTimer ?? 0 }, time, { walkRate: 11 }));
  }

  function syncTower(piece, dt) {
    const p = parts;
    const b = piece.body;
    camY = THREE.MathUtils.damp(camY, b.y + 2.2, 2.6, dt);
    for (const { s, beam, ropes } of p.swings) {
      const x = piece.swingX(s.id);
      beam.position.set(x, s.y - 0.16, 0);
      const pivotY = s.y + 4.4;
      ropes.forEach((rope, i) => {
        const ex = x + (i ? s.half - 0.2 : -s.half + 0.2);
        const px = s.cx + (i ? s.half - 0.2 : -s.half + 0.2);
        const dx = ex - px; const dy = s.y - pivotY;
        const len = Math.hypot(dx, dy);
        rope.scale.y = len;
        rope.position.set((ex + px) / 2, (s.y + pivotY) / 2, 0);
        rope.rotation.z = Math.atan2(dx, -dy);
      });
    }
    // The bell swings with its four seconds; cracked when it is done.
    const swing = still() ? 0 : Math.sin((piece.bellClock / 4) * Math.PI * 2) * 0.22;
    p.bell.rotation.z = swing;
    const cracked = piece.punches >= TOWER.punches;
    const bm = cracked ? art.bellCracked : art.bell;
    if (p.bell.material.map !== bm) { p.bell.material.map = bm; p.bell.material.needsUpdate = true; }
    // The rising light.
    p.light.position.set(0, piece.light - 15, 1.4);
    // The rings on the stones; an arrow when one is still above the view.
    p.ringBands.forEach((band, i) => {
      const r = piece.rings[i];
      band.visible = Boolean(r);
      if (r) band.position.y = r.y;
    });
    const above = piece.rings.filter((r) => r.y > camY + 7.5).sort((a, c) => a.y - c.y)[0];
    p.ringArrow.visible = Boolean(above);
    if (above) { p.ringArrow.position.set(0, camY + 7, 1.6); p.ringArrow.material.opacity = 0.4 + 0.5 * Math.max(0, 1 - (above.y - camY - 7.5) / 20); }
    // Counterweights: their shadow line first, then the iron.
    p.weights.forEach(({ w, shadow }, i) => {
      const it = piece.weights[i];
      w.visible = Boolean(it?.falling);
      shadow.visible = Boolean(it) && !it.falling;
      if (!it) return;
      if (it.falling) w.position.set(it.x, it.y, 0.4);
      else { shadow.position.set(it.x, camY, 0.9); shadow.material.opacity = 0.12 + 0.3 * Math.min(1, it.age / Math.max(0.01, it.warn)); }
    });
    p.tbutch.root.position.set(b.x, b.y, 0.7);
    p.tbutch.flip(b.facing);
    p.tbutch.setFrame(figureFrame({ ...b, hitTimer: piece.vitals?.hitTimer ?? 0 }, time, { walkRate: 11 }));
  }

  return {
    root,
    paint,
    get ready() { return Boolean(parts); },
    enter(piece) {
      mode = piece.view === 'tower' ? 'tower' : 'rooftops';
      root.visible = true;
      roofs.visible = mode === 'rooftops';
      tower.visible = mode === 'tower';
      camY = piece.body.y + (mode === 'tower' ? 2.2 : 0);
      for (const [id, m] of beams) { roofs.remove(m); beams.delete(id); }
      particles.clear();
    },
    leave() { root.visible = false; particles.clear(); },
    look(piece) {
      return piece.view === 'tower' ? { background: 0x0b0f12, fog: 0x0b0f12, density: 0.0 } : { background: 0x070c10, fog: 0x0b1418, density: 0.018 };
    },
    sync(piece, dt, camera) {
      time += dt;
      if (!parts) return;
      if (mode === 'rooftops') syncRooftops(piece, dt); else syncTower(piece, dt);
      // Rain around the camera.
      const pos = parts.rain.geometry.attributes.position.array;
      const fall = (still() ? 4 : 22) * dt;
      parts.rain.material.opacity = still() ? 0.08 : (mode === 'tower' ? 0.08 : 0.22);
      for (let i = 0; i < pos.length; i += 6) {
        pos[i + 1] -= fall; pos[i + 4] -= fall;
        if (pos[i + 4] < camera.position.y - 14) {
          const x = camera.position.x + (Math.random() - 0.5) * 50; const y = camera.position.y + 12 + Math.random() * 6; const z = (Math.random() - 0.5) * 30;
          pos.set([x, y, z, x - 0.1, y - 0.7, z], i);
        }
      }
      parts.rain.geometry.attributes.position.needsUpdate = true;
      particles.update(dt, camera);
    },
    camera(piece) {
      const b = piece.body;
      if (piece.view === 'tower') return { position: new THREE.Vector3(0, camY + 0.6, 21), target: new THREE.Vector3(0, camY + 0.8, 0), fov: 40 };
      const lead = (b.facing ?? 1) * 1.6;
      return { position: new THREE.Vector3(b.x + lead, camY + 2.8, 17), target: new THREE.Vector3(b.x + lead, camY + 1.3, 0), fov: 40 };
    },
    point(piece, what) {
      if (what === 'boss') return mode === 'tower' ? new THREE.Vector3(4.6, TOWER.topY + 8, -1.2) : parts.conductor.position.clone().setY(10);
      return new THREE.Vector3(piece.body.x, piece.body.y + 1.2, 0.7);
    },
    onEvent(e, piece) {
      if (!parts) return;
      const b = piece.body;
      if (e.type === 'lit' || (e.type === 'boss-struck' && mode === 'rooftops')) { litFor = 1.6; particles.spawn('shard', parts.conductor.position.x, 12, -20, { color: ROSE, count: 26, speed: 14, size: 0.5 }); }
      if (e.type === 'land' && (e.speed ?? 0) > 8) particles.spawn('dust', b.x, b.y + 0.1, 0.8, { color: 0x9aaab2, count: 6, speed: 2.5, size: 0.12, gravity: 3 });
      if (e.type === 'act' && e.result === 'queued') particles.spawn('shard', b.x + b.facing * 0.8, b.y + 1.5, 0.8, { color: { amber: AMBER, teal: TEAL, rose: ROSE }[e.line] ?? AMBER, count: 10, speed: 5 });
      if (e.type === 'beam' && Math.abs(e.hazard.x - b.x) < 3) particles.spawn('shard', e.hazard.x, b.y + 0.2, 0.8, { color: 0xfff1e6, count: 14, speed: 7 });
      if (e.type === 'act' && e.result === 'on-the-bell') particles.spawn('shard', 0, TOWER.bellY, 0, { color: 0xe3c27e, count: 30, speed: 12, size: 0.3 });
      if (e.type === 'hurt') particles.spawn('shard', b.x, b.y + 1.2, 0.8, { color: 0x8a2a1e, count: 14, speed: 7 });
    },
    tags(piece) {
      const out = [];
      if (mode === 'rooftops') {
        const b = piece.body;
        for (const l of piece.lamps()) {
          if (Math.abs(l.x - b.x) > 6) continue;
          const near = Math.abs(l.x - b.x) <= ROOFTOP.reach;
          const name = { amber: 'AMBER LAMP · BRIDGE', teal: 'TEAL LAMP · BILLBOARD', rose: 'ROSE SIGNAL · HIS LIGHT' }[l.line];
          out.push({ text: l.queued ? `${name} · ON THE NEXT BELL` : near && !l.lit ? `<kbd>E</kbd> · ${name}` : name, x: l.x, y: l.y + 3, z: 0.4, dim: !near, color: { amber: '#e0a24a', teal: '#6fb7ad', rose: '#c98088' }[l.line] });
        }
      } else if (piece.seg.current.id === 'on-the-bell') out.push({ text: '<kbd>E</kbd> · AS IT STRIKES', x: 0, y: TOWER.bellY - 2.4, z: 0 });
      return out;
    },
    count: () => beams.size,
  };
}
