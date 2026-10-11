// Movement IV's stage (round 12): THE PAINTED LINE, on rails.
//
// Behind Butch on the front of the painted train, the three lines running
// away into Rosa's country: pencil where they are only drawn, painted where
// they are real. The Conductor strides beside the line, huge, his grey brush
// washing the country; the line runs through every world he has been in
// (the 1978 tunnel, the rain city's bell planks, Echo City's words). At the
// end the night service runs up alongside, and then it rams through him.

import ch4ButchIdleUrl from '../assets/paper/ch4-butch-walk-0.png?url';
import ch4ButchWalk1Url from '../assets/paper/ch4-butch-walk-1.png?url';
import ch4ButchWalk2Url from '../assets/paper/ch4-butch-walk-2.png?url';
import ch4ButchWalk3Url from '../assets/paper/ch4-butch-walk-3.png?url';
import ch4ConductorUrl from '../assets/paper/ch4-conductor.png?url';
import { paintInkTrainFront } from '../finaleArt.js';
import { paintPaintedCountryBackdrop, paintPaintedField } from '../finaleWorldArt.js';
import { paintPaintedStrip, paintPencilStrip, paintTrainFront, paintWashBlot, paintWordSlip } from '../setPieceArt.js';
import { LANES, LINE, worldAt } from '../setPieces/paintedLine.js';
import { THREE, basic, canvasTexture, createFrameCard, createParticles, floorRing, flatBand, paintedCard, paintedMaterial, uprightPlane } from './stageKit.js';

const SEG = 2; // metres per drawn section of a line
const AHEAD = 96;
const WORLD_LOOK = Object.freeze({
  painted: { background: 0xe5dfce, fog: 0xe5dfce, density: 0.011 },
  tunnel: { background: 0x1c140c, fog: 0x1c140c, density: 0.03 },
  rain: { background: 0x0b1418, fog: 0x0b1418, density: 0.022 },
  echo: { background: 0x3a2420, fog: 0x3b2622, density: 0.018 },
});

const CONDUCTOR_H = 24;
const CONDUCTOR_Z = -50;

export function createLineView({ scene, textureLoader, low = false, still = () => false }) {
  const root = new THREE.Group();
  root.visible = false;
  scene.add(root);
  const particles = createParticles(root, { low });
  const art = {};
  let parts = null;
  let time = 0;
  let world = 'painted';
  let wash = 0; // the grey flood's hold on the screen
  const views = new Map();
  const load = (url) => { const t = textureLoader.load(url); t.colorSpace = THREE.SRGBColorSpace; return t; };

  function* paint() {
    art.field = canvasTexture(paintPaintedField(), { repeat: true, mips: false });
    yield;
    art.backdrop = canvasTexture(paintPaintedCountryBackdrop());
    yield;
    art.pencil = canvasTexture(paintPencilStrip(), { repeat: true, mips: false });
    art.painted = canvasTexture(paintPaintedStrip(), { repeat: true, mips: false });
    art.blot = canvasTexture(paintWashBlot());
    art.front = canvasTexture(paintTrainFront());
    art.ghost = canvasTexture(paintInkTrainFront({ era: 'past' }));
    yield;
    art.butch = { idle: load(ch4ButchIdleUrl), walk0: load(ch4ButchIdleUrl), walk1: load(ch4ButchWalk1Url), walk2: load(ch4ButchWalk2Url), walk3: load(ch4ButchWalk3Url), jump: load(ch4ButchWalk1Url), punch: load(ch4ButchWalk2Url) };
    art.conductor = load(ch4ConductorUrl);
    art.words = new Map();
    yield;
    build();
  }

  const wordTexture = (word) => {
    if (!art.words.has(word)) art.words.set(word, canvasTexture(paintWordSlip(word), { mips: false }));
    return art.words.get(word);
  };

  function build() {
    art.field.repeat.set(6, 12);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(140, 260), paintedMaterial(art.field, { transparent: false, fog: true }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, -0.02, -110);
    const backdrop = new THREE.Mesh(new THREE.PlaneGeometry(300, 125), paintedMaterial(art.backdrop, { transparent: false, fog: false }));
    backdrop.position.set(0, 30, -190);
    // The three lines, drawn in sections.
    const pencilMat = paintedMaterial(art.pencil, { transparent: true });
    const paintedMat = paintedMaterial(art.painted, { transparent: true });
    const washedMat = paintedMaterial(art.pencil, { transparent: true });
    washedMat.color.setHex(0x8a8a90);
    const lanes = LANES.map((x) => {
      const sections = [];
      for (let k = 0; k < AHEAD / SEG + 4; k += 1) {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(1.5, SEG + 0.02), paintedMat);
        m.rotation.x = -Math.PI / 2;
        m.position.set(x, 0.02, 0);
        root.add(m);
        sections.push(m);
      }
      return { x, sections };
    });
    // The train's front under Butch, and Butch.
    const front = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 2.3), paintedMaterial(art.front, { fog: false }));
    front.rotation.x = -Math.PI / 2;
    front.position.set(0, 0.6, 1.0);
    const butch = createFrameCard(art.butch, 1.9, { fog: false, rim: { color: 0x1c1612, opacity: 0.5, grow: 0.1 } });
    // The Conductor, striding beside the line.
    // Far enough back that all of him shows under the HUD, as tall as the hills.
    const conductor = new THREE.Mesh(new THREE.PlaneGeometry(CONDUCTOR_H * (1.75 / 3.8), CONDUCTOR_H), paintedMaterial(art.conductor, { fog: false }));
    conductor.position.set(-20, CONDUCTOR_H / 2, CONDUCTOR_Z);
    // The tunnel's walls and arches (the 1978 stretch), rain, Echo's skyline.
    const tunnel = new THREE.Group();
    const wallMat = basic(0x2a1d12);
    for (const sx of [-1, 1]) { const w = new THREE.Mesh(new THREE.PlaneGeometry(AHEAD + 20, 9), wallMat); w.rotation.y = sx * Math.PI / 2; w.position.set(sx * 5.4, 4.5, -AHEAD / 2); tunnel.add(w); }
    const roof = new THREE.Mesh(new THREE.PlaneGeometry(11, AHEAD + 20), basic(0x1a120b));
    roof.rotation.x = Math.PI / 2;
    roof.position.set(0, 9, -AHEAD / 2);
    tunnel.add(roof);
    const arches = Array.from({ length: 8 }, (_, i) => { const a = new THREE.Mesh(new THREE.TorusGeometry(5.4, 0.3, 6, 18, Math.PI), basic(0x8a6a3a)); a.position.set(0, 3.6, -i * 12); tunnel.add(a); return a; });
    tunnel.visible = false;
    const rainCount = low ? 300 : 700;
    const rainGeo = new THREE.BufferGeometry();
    const rp = new Float32Array(rainCount * 6);
    for (let i = 0; i < rainCount; i += 1) { const x = (Math.random() - 0.5) * 40; const y = Math.random() * 16; const z = -Math.random() * 60; rp.set([x, y, z, x, y - 0.8, z + 0.3], i * 6); }
    rainGeo.setAttribute('position', new THREE.BufferAttribute(rp, 3));
    const rain = new THREE.LineSegments(rainGeo, new THREE.LineBasicMaterial({ color: 0xc8d6dc, transparent: true, opacity: 0.3, toneMapped: false }));
    rain.frustumCulled = false;
    rain.visible = false;
    // Bell planks over a street, for the rain stretch.
    const street = flatBand(0x05090b, 1);
    street.material.transparent = false;
    street.visible = false;
    const planks = LANES.map((x, i) => { const m = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.2, 1), basic(i === 1 ? 0x6fb7ad : 0xe0a24a)); m.position.x = x; m.visible = false; root.add(m); return m; });
    root.add(ground, backdrop, front, butch.root, conductor, tunnel, rain, street);
    // The night service: paper, Chapter 1's colours (the old departure train).
    const service = buildNightService();
    service.visible = false;
    root.add(service);
    parts = { ground, backdrop, lanes, front, butch, conductor, tunnel, arches, rain, street, planks, service, pencilMat, paintedMat, washedMat, strips: [] };
  }

  // The night service, cut from paper (it runs toward -z here).
  function buildNightService() {
    const g = new THREE.Group();
    const box = (w, h, d, color, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), basic(color)); m.position.set(x, y, z); g.add(m); return m; };
    box(2.6, 3.0, 14, 0x8a2a1e, 0, 1.9, 4);
    box(2.7, 0.35, 14.2, 0x383a3d, 0, 3.5, 4);
    for (let i = 0; i < 6; i += 1) box(0.08, 0.8, 1.2, 0xe0a24a, 1.32, 2.3, -1.5 + i * 2.2);
    box(2.6, 2.8, 6, 0x2a2f3a, 0, 1.8, -5.5);
    box(1.4, 1.4, 1.6, 0x15171b, 0, 3.6, -7.2);
    const lamp = new THREE.Mesh(new THREE.CircleGeometry(0.42, 16), basic(0xfff1c8));
    lamp.position.set(0, 2.2, -8.55);
    lamp.rotation.y = Math.PI;
    g.add(lamp);
    return g;
  }

  // The part of [d0, d1] of a line that is only drawn (not yet painted).
  const drawnAt = (piece, lane, d) => {
    for (const gap of piece.gaps) {
      if (gap.lane !== lane) continue;
      if (d >= gap.d0 + gap.painted && d < gap.d1) return gap.washed ? 'washed' : 'drawn';
    }
    return null;
  };
  const zOf = (piece, dist) => -(dist - piece.at);

  function syncLine(piece, dt) {
    const p = parts;
    const at = piece.at;
    // The world the line is running through.
    const next = worldAt(at + 30);
    if (next !== world) world = next;
    p.tunnel.visible = worldAt(at) === 'tunnel' || worldAt(at + 40) === 'tunnel';
    p.rain.visible = world === 'rain' && !still();
    p.backdrop.visible = world === 'painted' || world === 'echo';
    p.ground.material.color.setHex(world === 'painted' ? 0xffffff : world === 'tunnel' ? 0x6a5236 : world === 'rain' ? 0x4a5a62 : 0x9a7a6a);
    p.arches.forEach((a, i) => { a.position.z = ((i * 12 + (at % 12)) % 96) - 96 + 6; });
    p.field = p.ground.material.map;
    p.ground.material.map.offset.y = (at / 260 * 12) % 1;
    // The lines, section by section.
    const base = Math.floor(at / SEG) * SEG - SEG * 2;
    p.lanes.forEach((lane, li) => {
      lane.sections.forEach((m, k) => {
        const d = base + k * SEG;
        m.position.z = zOf(piece, d + SEG / 2);
        const state = drawnAt(piece, li, d + SEG / 2);
        const mat = state === 'drawn' ? p.pencilMat : state === 'washed' ? p.washedMat : p.paintedMat;
        if (m.material !== mat) m.material = mat;
      });
    });
    // Barriers: his wash standing on the line.
    const live = new Set();
    for (const b of piece.barriers) {
      if (b.d0 - at > AHEAD || b.d1 < at - 8) continue;
      live.add(b.id);
      let v = views.get(b.id);
      if (!v) { v = paintedCard(art.blot, 2.4, { fog: true }); views.set(b.id, v); root.add(v); }
      v.position.set(LANES[b.lane], 1.1, zOf(piece, b.d0));
      v.visible = !b.hit;
    }
    // Strokes: his brush's shadow across the lines, darkening as it lands.
    for (const s of piece.strokes) {
      live.add(s.id);
      let v = views.get(s.id);
      if (!v) { v = new THREE.Group(); s.lanes.forEach((l) => { const band = flatBand(0x50525a, 0.2); band.scale.set(1.9, s.d1 - s.d0, 1); band.position.x = LANES[l]; v.add(band); }); views.set(s.id, v); root.add(v); }
      v.position.z = zOf(piece, (s.d0 + s.d1) / 2);
      const k = 1 - s.left / Math.max(0.01, s.lead);
      v.children.forEach((band) => { band.material.opacity = 0.12 + 0.5 * k; });
    }
    // 1978 trains coming the other way (their lamp first).
    for (const g of piece.ghosts) {
      if (g.passed && g.dist < at - 6) continue;
      live.add(g.id);
      let v = views.get(g.id);
      if (!v) { v = paintedCard(art.ghost, 4.2, { fog: false }); views.set(g.id, v); root.add(v); v.userData.glow = new THREE.Mesh(new THREE.CircleGeometry(1.4, 20), basic(0xffd98a, 0.6, { blending: THREE.AdditiveBlending, fog: false })); root.add(v.userData.glow); }
      const z = zOf(piece, g.dist);
      v.position.set(LANES[g.lane], 2.1, Math.max(-AHEAD, z));
      v.userData.glow.position.set(LANES[g.lane], 1.6, Math.max(-AHEAD, z) + 0.2);
      v.userData.glow.material.opacity = 0.3 + 0.5 * (1 - g.left / Math.max(0.01, g.lead));
    }
    // Words falling on the line.
    for (const w of piece.words) {
      if (w.d1 < at - 6) continue;
      live.add(w.id);
      let v = views.get(w.id);
      if (!v) {
        const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: wordTexture(w.word), transparent: true, depthWrite: false, toneMapped: false, fog: false }));
        sprite.scale.set(1.8, 0.6, 1);
        const ring = floorRing(0xe8663f, { y: 0.05 });
        const grp = new THREE.Group();
        grp.add(sprite, ring.root);
        v = { group: grp, sprite, ring };
        views.set(w.id, v);
        root.add(grp);
      }
      const grp = v.group ?? v;
      grp.position.set(LANES[w.lane], 0, zOf(piece, (w.d0 + w.d1) / 2));
      const k = 1 - Math.max(0, w.left) / Math.max(0.01, w.lead);
      v.sprite.position.y = w.landed ? 0.5 : 0.5 + (1 - k) * 9;
      v.ring.set(1.1, k, w.landed ? 0.4 : 1);
    }
    for (const [id, v] of views) if (!live.has(id)) { root.remove(v.group ?? v); if (v.userData?.glow) root.remove(v.userData.glow); views.delete(id); }
    // Bell planks over a street: out on their beat.
    const crossing = piece.crossings.find((c) => c.d1 > at - 4 && c.d0 - at < AHEAD);
    p.street.visible = Boolean(crossing);
    if (crossing) {
      p.street.scale.set(9, crossing.d1 - crossing.d0, 1);
      p.street.position.set(0, 0.01, zOf(piece, (crossing.d0 + crossing.d1) / 2));
      p.planks.forEach((m, i) => { m.visible = piece.plankOut(i); m.scale.z = crossing.d1 - crossing.d0; m.position.set(LANES[i], 0.12, zOf(piece, (crossing.d0 + crossing.d1) / 2)); });
    } else p.planks.forEach((m) => { m.visible = false; });
    // The Conductor strides alongside; his brush rises before a stroke.
    const raising = piece.strokes.length > 0 || piece.sweeps.length > 0;
    p.conductor.position.y = CONDUCTOR_H / 2 + (still() ? 0 : Math.abs(Math.sin(time * 2.2)) * 0.6);
    p.conductor.rotation.z = THREE.MathUtils.damp(p.conductor.rotation.z, raising ? 0.08 : -0.02, 5, dt);
    p.conductor.position.x = THREE.MathUtils.damp(p.conductor.position.x, piece.service ? -27 : -20, 1, dt);
    // Butch and the train.
    const b = piece.body;
    p.front.position.x = piece.trainX;
    p.butch.root.position.set(b.x, 0.6 + b.y, -0.2);
    p.butch.flip(b.vx < -0.3 ? -1 : 1);
    p.butch.setFrame(!b.grounded ? 'jump' : b.moving ? `walk${Math.floor(time * 8) % 4}` : 'idle');
    p.butch.root.rotation.z = piece.jolt > 0 && !still() ? Math.sin(time * 40) * 0.12 : 0;
    // The night service alongside, at the end.
    if (piece.service) {
      p.service.visible = true;
      const k = Math.min(1, piece.service.alongside / 1.6);
      p.service.position.set(LINE.serviceX, 0, THREE.MathUtils.lerp(26, 2, THREE.MathUtils.smoothstep(k, 0, 1)));
      if (piece.boarded) p.butch.root.position.set(LINE.serviceX, 3.7, 1);
    } else p.service.visible = false;
    wash = Math.max(0, wash - dt * 0.12);
  }

  return {
    root,
    paint,
    get ready() { return Boolean(parts); },
    get wash() { return wash; },
    enter() {
      root.visible = true;
      world = 'painted';
      for (const [id, v] of views) { root.remove(v.group ?? v); views.delete(id); }
      particles.clear();
    },
    leave() { root.visible = false; particles.clear(); },
    look(piece) { return WORLD_LOOK[worldAt(piece.at)] ?? WORLD_LOOK.painted; },
    sync(piece, dt, camera, ctx) {
      time += dt;
      if (!parts) return;
      syncLine(piece, dt);
      const look = WORLD_LOOK[worldAt(piece.at)] ?? WORLD_LOOK.painted;
      const sceneRef = ctx?.battle?.scene;
      if (sceneRef) {
        sceneRef.background.lerp(new THREE.Color(look.background), Math.min(1, dt * 2));
        sceneRef.fog.color.lerp(new THREE.Color(look.fog), Math.min(1, dt * 2));
        sceneRef.fog.density += (look.density - sceneRef.fog.density) * Math.min(1, dt * 2);
      }
      if (parts.rain.visible) {
        const pos = parts.rain.geometry.attributes.position.array;
        for (let i = 0; i < pos.length; i += 6) { pos[i + 1] -= 20 * dt; pos[i + 4] -= 20 * dt; pos[i + 2] += 18 * dt; pos[i + 5] += 18 * dt; if (pos[i + 4] < 0 || pos[i + 2] > 6) { const x = (Math.random() - 0.5) * 40; const y = 6 + Math.random() * 10; const z = -Math.random() * 60; pos.set([x, y, z, x, y - 0.8, z + 0.3], i); } }
        parts.rain.geometry.attributes.position.needsUpdate = true;
      }
      particles.update(dt, camera);
    },
    // The ram: the camera swings to the side, the night service hits him,
    // he comes apart into paper.
    syncRam(t, dt, camera, target) {
      if (!parts) return;
      const p = parts;
      p.service.visible = true;
      p.service.position.set(0, 0, THREE.MathUtils.lerp(8, -34, Math.min(1, t / 2.2)));
      p.conductor.position.set(0, 12, -36);
      p.butch.root.visible = false;
      camera.position.lerp(new THREE.Vector3(22, 7, -20), 1 - Math.exp(-dt * 2));
      target.lerp(new THREE.Vector3(0, 6, -30), 1 - Math.exp(-dt * 3));
      camera.lookAt(target);
      if (t > 2.1 && !p.rammed) {
        p.rammed = true;
        p.conductor.visible = false;
        for (let i = 0; i < 18; i += 1) {
          const strip = new THREE.Mesh(new THREE.PlaneGeometry(1.2 + Math.random(), 3 + Math.random() * 3), paintedMaterial(art.conductor, { fog: false }));
          strip.position.set((Math.random() - 0.5) * 6, 4 + Math.random() * 16, -36);
          strip.userData.v = new THREE.Vector3((Math.random() - 0.5) * 14, 4 + Math.random() * 10, -6 - Math.random() * 10);
          root.add(strip);
          p.strips.push(strip);
        }
        particles.spawn('shard', 0, 10, -36, { color: 0x50525a, count: 40, speed: 16, size: 0.6 });
      }
      for (const s of p.strips) { s.userData.v.y -= 9 * dt; s.position.addScaledVector(s.userData.v, dt); s.rotation.z += dt * 4; s.rotation.x += dt * 3; }
      particles.update(dt, camera);
    },
    camera(piece) {
      const x = piece.trainX;
      if (piece.service && !piece.boarded) return { position: new THREE.Vector3(x * 0.3 - 1.2, 3.6, 7), target: new THREE.Vector3(x * 0.2 - 2.2, 1.4, -12), fov: 60 };
      return { position: new THREE.Vector3(x * 0.4, 3.5 + piece.body.y * 0.2, 6.6), target: new THREE.Vector3(x * 0.25, 2.4, -14), fov: 58 };
    },
    point(piece, what) {
      if (what === 'boss') return parts.conductor.position.clone();
      return new THREE.Vector3(piece.body.x, 1.4 + piece.body.y, -0.2);
    },
    onEvent(e, piece) {
      if (!parts) return;
      if (e.type === 'painted') particles.spawn('dust', LANES[e.gap.lane], 0.3, zOf(piece, e.gap.d1), { color: 0x4f8f7c, count: 10, speed: 3, size: 0.25, plane: 'xz', gravity: 2 });
      if (e.type === 'stroke') { e.lanes.forEach((l) => particles.spawn('dust', LANES[l], 0.4, zOf(piece, e.d0), { color: 0x6a6c72, count: 12, speed: 5, size: 0.4, plane: 'xz', gravity: 4 })); wash = Math.min(1, wash + 0.08); }
      if (e.type === 'derail' || e.type === 'smash') { particles.spawn('shard', piece.trainX, 1, -1, { color: 0x50525a, count: 20, speed: 9, size: 0.3 }); wash = Math.min(1, wash + 0.35); }
      if (e.type === 'sweep') particles.spawn('dust', -3, 0.6, 0.5, { color: 0x6a6c72, count: 18, speed: 9, size: 0.4, gravity: 3 });
      if (e.type === 'ghost-pass') particles.spawn('dust', LANES[e.lane], 1.5, 1, { color: 0xc49a62, count: 12, speed: 6, size: 0.3 });
      if (e.type === 'hurt') particles.spawn('shard', piece.body.x, 1.4, -0.2, { color: 0x8a2a1e, count: 14, speed: 7 });
      if (e.type === 'boarded') particles.spawn('shard', LINE.serviceX, 3.5, 1, { color: 0xe0a24a, count: 24, speed: 8 });
    },
    tags(piece) {
      const out = [];
      if (piece.service && !piece.boarded && piece.service.ready) out.push({ text: '<kbd>SPACE</kbd> · JUMP ABOARD', x: LINE.serviceX, y: 4.6, z: 1 });
      const g = piece.gaps.find((gap) => gap.lane === piece.trainLane && gap.d1 > piece.at && gap.painted < gap.d1 - gap.d0 && gap.d0 - piece.at < 22);
      if (g) out.push({ text: 'HOLD <kbd>E</kbd> · PAINT', x: LANES[g.lane], y: 1.2, z: zOf(piece, g.d0) });
      return out;
    },
    count: () => views.size,
  };
}
