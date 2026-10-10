// Chapter 6 · how a telegraph looks (round 11).
//
// Every attack in conductorFight.js is drawn the same way, so a player who
// has learned one movement can read the next:
//   a drop    a ring on the floor and a disc that fills it; when the disc
//             reaches the ring, it lands.
//   a zone    a rectangle that fills from the edge in; full is the strike.
//   a wave    a bright point where it gathers, then a ring spreading out.
//   a sweep   a line where it will start, then a band crossing the floor.
//   a train   its seam glows (amber for his trains, sepia for 1978 ones).
// Danger is drawn in the movement's danger colour; Butch's chances (a claim
// case, a true thing, wet paint) are drawn by the movement in brass.
// With Reduce Motion nothing blinks: the fill only grows, steadily. With
// motion on, the warning breathes at under 2 Hz (never a flash).
// Unlit materials only: LOW GRAPHICS needs nothing cheaper.

import * as THREE from 'three';

const UNIT_CIRCLE = new THREE.CircleGeometry(1, 48);
const UNIT_RING = new THREE.RingGeometry(0.9, 1, 64);
const UNIT_PLANE = new THREE.PlaneGeometry(1, 1);

const WAVE_VERTEX = 'varying vec2 vPos; void main(){ vPos = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
const WAVE_FRAGMENT = `uniform float uR; uniform float uW; uniform vec3 uColor; uniform float uOpacity; varying vec2 vPos;
  void main(){ float d = length(vPos); float band = 1.0 - smoothstep(uW * 0.5, uW * 0.5 + 0.12, abs(d - uR));
    if (band < 0.01) discard; gl_FragColor = vec4(uColor, band * uOpacity); }`;

const flat = (mesh, y = 0.06) => { mesh.rotation.x = -Math.PI / 2; mesh.position.y = y; return mesh; };
const basic = (color, opacity = 0.3) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, toneMapped: false, side: THREE.DoubleSide, fog: false });

export function createTelegraphLayer(scene, { reducedMotion = () => false } = {}) {
  const items = new Map();
  const root = new THREE.Group();
  root.renderOrder = 3;
  scene.add(root);

  const build = (a, style) => {
    const group = new THREE.Group();
    const color = new THREE.Color(style.color ?? 0xe0583a);
    const edge = new THREE.Color(style.edge ?? 0xf3e2c0);
    const parts = {};
    if (a.kind === 'drop') {
      parts.ring = flat(new THREE.Mesh(UNIT_RING, basic(edge, 0.7)), 0.07);
      parts.fill = flat(new THREE.Mesh(UNIT_CIRCLE, basic(color, 0.32)), 0.065);
      parts.ring.scale.setScalar(a.r);
      parts.fill.scale.setScalar(0.001);
      group.position.set(a.x, 0, a.z);
      group.add(parts.ring, parts.fill);
    } else if (a.kind === 'zone') {
      const w = a.x1 - a.x0; const d = a.z1 - a.z0;
      parts.fill = flat(new THREE.Mesh(UNIT_PLANE, basic(color, 0.08)), 0.055);
      parts.fill.scale.set(w, d, 1);
      parts.inner = flat(new THREE.Mesh(UNIT_PLANE, basic(color, 0.26)), 0.058);
      parts.inner.scale.set(0.001, 0.001, 1);
      const line = (lw, ld, x, z) => { const m = flat(new THREE.Mesh(UNIT_PLANE, basic(edge, 0.75)), 0.06); m.scale.set(lw, ld, 1); m.position.x = x; m.position.z = z; return m; };
      const t = 0.12;
      parts.lines = [line(w, t, 0, -d / 2), line(w, t, 0, d / 2), line(t, d, -w / 2, 0), line(t, d, w / 2, 0)];
      group.position.set((a.x0 + a.x1) / 2, 0, (a.z0 + a.z1) / 2);
      group.add(parts.fill, parts.inner, ...parts.lines);
      parts.size = { w, d };
    } else if (a.kind === 'wave') {
      parts.gather = flat(new THREE.Mesh(UNIT_CIRCLE, basic(edge, 0.5)), 0.08);
      parts.gather.scale.setScalar(0.6);
      const material = new THREE.ShaderMaterial({
        uniforms: { uR: { value: a.r0 ?? 0 }, uW: { value: a.width }, uColor: { value: color }, uOpacity: { value: 0.85 } },
        vertexShader: WAVE_VERTEX, fragmentShader: WAVE_FRAGMENT, transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false,
      });
      parts.ring = flat(new THREE.Mesh(new THREE.CircleGeometry(a.maxR + 1, 96), material), 0.075);
      parts.ring.visible = false;
      parts.material = material;
      group.position.set(a.x, 0, a.z);
      group.add(parts.gather, parts.ring);
    } else if (a.kind === 'sweep') {
      const span = a.hi - a.lo;
      parts.start = flat(new THREE.Mesh(UNIT_PLANE, basic(edge, 0.6)), 0.07);
      parts.band = flat(new THREE.Mesh(UNIT_PLANE, basic(color, 0.6)), 0.072);
      parts.band.visible = false;
      if (a.axis === 'x') { parts.start.scale.set(0.16, span, 1); parts.band.scale.set(a.width, span, 1); parts.start.position.set(clampEdge(a.from), 0.07, (a.lo + a.hi) / 2); parts.band.position.z = (a.lo + a.hi) / 2; }
      else { parts.start.scale.set(span, 0.16, 1); parts.band.scale.set(span, a.width, 1); parts.start.position.set((a.lo + a.hi) / 2, 0.07, clampEdge(a.from, true)); parts.band.position.x = (a.lo + a.hi) / 2; }
      group.add(parts.start, parts.band);
    } else if (a.kind === 'train') {
      const length = 60;
      parts.glow = flat(new THREE.Mesh(UNIT_PLANE, basic(a.ghost ? (style.ghost ?? 0xb08a5a) : color, 0)), 0.04);
      if (a.seam === 'z') { parts.glow.scale.set(length, a.halfWidth * 2, 1); parts.glow.position.set(0, 0.04, a.along); }
      else { parts.glow.scale.set(a.halfWidth * 2, length, 1); parts.glow.position.set(a.along, 0.04, 0); }
      group.add(parts.glow);
    }
    root.add(group);
    return { group, parts, attack: a, style, struckAt: null };
  };

  // Keep sweep start lines on the visible floor.
  function clampEdge(v, z = false) { return z ? Math.max(-7.2, Math.min(8.1, v)) : Math.max(-13.1, Math.min(13.1, v)); }

  const breathe = (t) => (reducedMotion() ? 1 : 0.8 + 0.2 * Math.sin(t * 10.5)); // ≈1.7 Hz

  return {
    root,
    add(attack, style = {}) {
      if (items.has(attack.id)) return items.get(attack.id);
      const item = build(attack, style);
      items.set(attack.id, item);
      return item;
    },
    has: (id) => items.has(id),
    struck(attack, time) { const item = items.get(attack.id); if (item) item.struckAt = time; },
    remove(attack) {
      const item = items.get(attack.id ?? attack);
      if (!item) return;
      root.remove(item.group);
      item.group.traverse((child) => { if (child.material && child.geometry !== UNIT_CIRCLE && child.geometry !== UNIT_RING && child.geometry !== UNIT_PLANE) child.geometry?.dispose(); child.material?.dispose?.(); });
      items.delete(attack.id ?? attack);
    },
    clear() { [...items.keys()].forEach((id) => this.remove(id)); },
    count: () => items.size,
    update(time) {
      for (const item of items.values()) {
        const a = item.attack;
        const { parts } = item;
        const progress = a.tele > 0 ? Math.min(1, a.age / a.tele) : 1;
        const live = a.state === 'live';
        const sinceLive = Math.max(0, a.age - a.tele);
        const dim = a.harmless ? 0.25 : 1;
        if (a.kind === 'drop') {
          parts.fill.scale.setScalar(Math.max(0.001, a.r * (live ? 1 : progress)));
          parts.fill.material.opacity = (live ? Math.max(0, 0.55 - sinceLive * 3) : 0.18 + 0.22 * progress * breathe(time)) * dim;
          parts.ring.material.opacity = (live ? Math.max(0, 0.8 - sinceLive * 3) : 0.45 + 0.35 * progress) * dim;
        } else if (a.kind === 'zone') {
          const k = live ? 1 : progress;
          parts.inner.scale.set(Math.max(0.001, parts.size.w * k), Math.max(0.001, parts.size.d * k), 1);
          const fade = live ? Math.max(0, 1 - sinceLive / Math.max(0.2, a.live + 0.2)) : 1;
          parts.inner.material.opacity = (live ? 0.62 * fade : 0.14 + 0.2 * progress * breathe(time)) * dim;
          parts.fill.material.opacity = (live ? 0.25 * fade : 0.06 + 0.06 * progress) * dim;
          parts.lines.forEach((line) => { line.material.opacity = (live ? 0.9 * fade : 0.4 + 0.45 * progress) * dim; });
        } else if (a.kind === 'wave') {
          parts.gather.visible = !live;
          parts.gather.material.opacity = 0.25 + 0.5 * progress;
          parts.gather.scale.setScalar(0.4 + progress * 1.1);
          parts.ring.visible = live;
          parts.material.uniforms.uR.value = a.r;
          parts.material.uniforms.uOpacity.value = 0.9 * Math.max(0.2, 1 - a.r / (a.maxR + 0.01)) * dim;
        } else if (a.kind === 'sweep') {
          parts.start.material.opacity = live ? 0 : 0.25 + 0.6 * progress * breathe(time);
          parts.band.visible = live;
          if (a.axis === 'x') parts.band.position.x = a.pos; else parts.band.position.z = a.pos;
        } else if (a.kind === 'train') {
          parts.glow.material.opacity = (live ? 0.22 : 0.12 + 0.3 * progress * breathe(time)) * dim;
        }
      }
    },
  };
}

// Brass rings for Butch's chances (a claim case, a true thing, wet paint):
// one shared look, distinct from danger.
export const CHANCE_COLOR = 0xe8b860;
export const DANGER_COLORS = Object.freeze({ lost: 0xe0583a, borrowed: 0xf06a5a, echo: 0xe8663f, painted: 0x2b2f3a });
