// Chapter 6 · what every round-12 view draws with: painted textures, frame
// cards, telegraph shapes and particles. Unlit materials throughout (LOW
// GRAPHICS needs nothing cheaper), and every pulse has a still form for
// Reduce Motion (the views pass `still`).

import * as THREE from 'three';

// Textures made while art is painted, collected so they can be uploaded to
// the GPU one per slice instead of all on the next frame.
let textureSink = null;
export function setTextureSink(sink) { textureSink = sink; }

// Large paintings bring their own mip chain, halved on the (software) canvas
// they were painted on (the GPU's generateMipmap on an sRGB texture is slow
// on software GL).
const CPU_MIPMAP_MIN_SIZE = 1024;
function mipChain(canvas) {
  const chain = [canvas];
  let { width, height } = canvas;
  while (width > 1 || height > 1) {
    width = Math.max(1, width >> 1);
    height = Math.max(1, height >> 1);
    const level = document.createElement('canvas');
    level.width = width;
    level.height = height;
    const c = level.getContext('2d', { willReadFrequently: true });
    c.imageSmoothingQuality = 'high';
    c.drawImage(chain[chain.length - 1], 0, 0, width, height);
    chain.push(level);
  }
  return chain;
}

export function canvasTexture(canvas, { repeat = false, mips = true } = {}) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  if (repeat) texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  if (mips && Math.max(canvas.width, canvas.height) >= CPU_MIPMAP_MIN_SIZE && !repeat) {
    texture.mipmaps = mipChain(canvas);
    texture.generateMipmaps = false;
  }
  textureSink?.push(texture);
  return texture;
}

// Painted art is shown as painted: unlit, not tone-mapped.
export function paintedMaterial(map, { transparent = true, opacity = 1, side = THREE.DoubleSide, fog = true, depthWrite = null } = {}) {
  return new THREE.MeshBasicMaterial({
    map, transparent, opacity, alphaTest: transparent ? 0.04 : 0, side, toneMapped: false, fog,
    depthWrite: depthWrite ?? (!transparent || opacity >= 1),
  });
}

export function paintedCard(source, height, options = {}) {
  const map = source?.isTexture ? source : canvasTexture(source);
  const image = map.image ?? source;
  const width = height * ((image?.width ?? 1) / (image?.height ?? 1));
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), paintedMaterial(map, options));
  mesh.userData.width = width;
  mesh.userData.height = height;
  return mesh;
}

export const basic = (color, opacity = 1, extra = {}) => new THREE.MeshBasicMaterial({
  color, transparent: opacity < 1 || extra.transparent, opacity, depthWrite: opacity >= 1 && !extra.transparent, toneMapped: false, side: THREE.DoubleSide, ...extra,
});

// A figure that swaps painted frames (feet at its origin). frames: { key:
// canvas | texture }. A frame missing falls back to 'idle'.
// A flat-colour silhouette of a painted texture (its alpha, one colour):
// behind a figure, a little larger, it is a rim that reads on any ground.
export function silhouetteMaterial(map, { color = 0x000000, opacity = 0.6, fog = false } = {}) {
  const material = new THREE.MeshBasicMaterial({ map, color, transparent: true, opacity, alphaTest: 0.04, depthWrite: false, side: THREE.DoubleSide, toneMapped: false, fog });
  material.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', '#ifdef USE_MAP\n\tdiffuseColor.a *= texture2D( map, vMapUv ).a;\n#endif');
  };
  material.customProgramCacheKey = () => 'nf-silhouette';
  return material;
}

// A figure card that swaps frames. `rim`: { color, opacity, grow } adds its
// silhouette behind it (Butch on the dark rain roofs, on the white paper).
export function createFrameCard(frames, height, { lift = 0, fog = true, rim = null } = {}) {
  const maps = Object.fromEntries(Object.entries(frames).filter(([, v]) => v).map(([key, source]) => [key, source.isTexture ? source : canvasTexture(source)]));
  const first = maps.idle ?? Object.values(maps)[0];
  const image = first.image;
  const width = height * ((image?.width ?? 1) / (image?.height ?? 1));
  const material = paintedMaterial(first, { fog });
  const geometry = new THREE.PlaneGeometry(width, height);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.y = height / 2 + lift;
  const root = new THREE.Group();
  let shade = null;
  if (rim) {
    shade = new THREE.Mesh(geometry, silhouetteMaterial(first, { color: rim.color ?? 0x000000, opacity: rim.opacity ?? 0.6 }));
    shade.position.set(0, height / 2 + lift, -0.04);
    shade.scale.setScalar(1 + (rim.grow ?? 0.1));
    shade.renderOrder = -1;
    root.add(shade);
  }
  root.add(mesh);
  let current = 'idle';
  return {
    root,
    mesh,
    shade,
    width,
    height,
    maps,
    setFrame(key) {
      const next = maps[key] ? key : 'idle';
      if (next === current) return;
      current = next;
      material.map = maps[next];
      material.needsUpdate = true;
      if (shade) { shade.material.map = maps[next]; shade.material.needsUpdate = true; }
    },
    get frame() { return current; },
    flip(sign) { mesh.scale.x = sign < 0 ? -1 : 1; if (shade) shade.scale.x = (sign < 0 ? -1 : 1) * Math.abs(shade.scale.y); },
    tint(hex) { material.color.setHex(hex); },
  };
}

// The frame a side-view figure shows for its body state.
export function figureFrame(body, t, { walkRate = 9 } = {}) {
  if ((body.hitTimer ?? 0) > 0 || body.hurt) return 'hurt';
  if (body.punch > 0) return 'punch';
  if (body.duck) return 'duck';
  if (body.grounded === false) return 'jump';
  if (body.moving) return `walk${Math.floor(t * walkRate) % 4}`;
  return 'idle';
}

// ---------------------------------------------------------------------------
// Telegraph shapes (flat on the floor unless said otherwise). Each has a
// `set(progress, opacity)` that fills it: a ring fills with a disc, a band
// with its colour, a column grows. No blinking: a pulse is passed in only
// when motion is allowed.

const UNIT_CIRCLE = new THREE.CircleGeometry(1, 48);
const UNIT_RING = new THREE.RingGeometry(0.86, 1, 64);
const UNIT_PLANE = new THREE.PlaneGeometry(1, 1);

export function floorRing(color, { edge = 0xf3e2c0, y = 0.04 } = {}) {
  const group = new THREE.Group();
  const ring = new THREE.Mesh(UNIT_RING, basic(edge, 0.8, { fog: false }));
  const fill = new THREE.Mesh(UNIT_CIRCLE, basic(color, 0.3, { fog: false }));
  ring.rotation.x = fill.rotation.x = -Math.PI / 2;
  ring.position.y = y + 0.01;
  fill.position.y = y;
  ring.renderOrder = fill.renderOrder = 5;
  group.add(ring, fill);
  return {
    root: group,
    set(radius, progress, opacity = 1) {
      ring.scale.setScalar(radius);
      fill.scale.setScalar(Math.max(0.001, radius * Math.min(1, progress)));
      ring.material.opacity = (0.45 + 0.4 * progress) * opacity;
      fill.material.opacity = (0.16 + 0.3 * progress) * opacity;
    },
    color(hex) { fill.material.color.setHex(hex); },
  };
}

export function flatBand(color, { opacity = 0.4, y = 0.035 } = {}) {
  const mesh = new THREE.Mesh(UNIT_PLANE, basic(color, opacity, { fog: false }));
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = y;
  mesh.renderOrder = 4;
  return mesh;
}

export function uprightPlane(color, opacity = 0.5, { additive = false } = {}) {
  const mesh = new THREE.Mesh(UNIT_PLANE, basic(color, opacity, { fog: false, ...(additive ? { blending: THREE.AdditiveBlending } : {}) }));
  mesh.renderOrder = 6;
  return mesh;
}

// ---------------------------------------------------------------------------
// Particles: impact shards, dust, paint. One pool per view.

export function createParticles(parent, { low = false } = {}) {
  const items = [];
  const geometry = new THREE.PlaneGeometry(1, 1);
  const spawn = (kind, x, y, z, { color = 0xe0a24a, count = 12, speed = 6, size = 0.16, life = 0.6, gravity = 14, spread = 1, up = 1, plane = 'xy' } = {}) => {
    const n = Math.max(1, Math.round(count * (low ? 0.5 : 1)));
    for (let i = 0; i < n; i += 1) {
      const mesh = new THREE.Mesh(geometry, basic(color, 1, { transparent: true, fog: false }));
      const s = size * (0.6 + Math.random() * 0.8);
      mesh.scale.set(s, s * (kind === 'shard' ? 2.2 : 1), s);
      mesh.position.set(x, y, z);
      const a = Math.random() * Math.PI * 2;
      const v = speed * (0.4 + Math.random() * 0.6);
      const vx = Math.cos(a) * v * spread;
      const vy = Math.abs(Math.sin(a)) * v * up + (kind === 'dust' ? 0.6 : 2);
      const vz = plane === 'xz' ? Math.sin(a) * v * spread : (Math.random() - 0.5) * v * 0.3;
      mesh.renderOrder = 8;
      parent.add(mesh);
      items.push({ mesh, vx, vy: plane === 'xz' ? Math.random() * v * up + 1 : vy, vz, life, age: 0, gravity, spin: (Math.random() - 0.5) * 12 });
    }
  };
  return {
    spawn,
    update(dt, camera = null) {
      for (const p of items) {
        p.age += dt;
        p.vy -= p.gravity * dt;
        p.mesh.position.x += p.vx * dt;
        p.mesh.position.y += p.vy * dt;
        p.mesh.position.z += p.vz * dt;
        p.mesh.rotation.z += p.spin * dt;
        if (camera) p.mesh.quaternion.copy(camera.quaternion);
        p.mesh.material.opacity = Math.max(0, 1 - p.age / p.life);
      }
      for (let i = items.length - 1; i >= 0; i -= 1) {
        if (items[i].age >= items[i].life) { parent.remove(items[i].mesh); items[i].mesh.material.dispose(); items.splice(i, 1); }
      }
    },
    clear() { items.forEach((p) => { parent.remove(p.mesh); p.mesh.material.dispose(); }); items.length = 0; },
    get count() { return items.length; },
  };
}

// A wide strip that scrolls a repeating painting (a panorama, a ground).
export function scrollingStrip(canvas, width, height, { repeatX = 1, fog = false, opacity = 1 } = {}) {
  const map = canvasTexture(canvas, { repeat: true, mips: false });
  map.repeat.set(repeatX, 1);
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), paintedMaterial(map, { transparent: opacity < 1, opacity, fog }));
  return { mesh, map, scroll(u) { map.offset.x = ((u % 1) + 1) % 1; } };
}

export const lerp = THREE.MathUtils.lerp;
export const damp = (current, target, lambda, dt) => THREE.MathUtils.damp(current, target, lambda, dt);
export { THREE };
