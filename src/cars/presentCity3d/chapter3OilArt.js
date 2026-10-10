// Chapter 3 · ECHO CITY — lamp oil on the paving (round 11, owner note:
// "第三章的艺术要做小范围重构 比如那个汽油 还有那个夜晚燃烧的字样").
//
// Both pieces are the same material, poured by the same hand:
//   * makeDarkSeam: the afternoon oil line Butch reads with Lev. The oil was
//     poured "along every joint" (SEAM_TOPIC_RESPONSES): the line is a path
//     found along the court's real mortar joints (the paving's own height
//     map), drawn as a decal that darkens the joints and the stone edges it
//     soaked into, leaves a paler wiped band either side, and takes a wet
//     sheen from the sun and the sky (lit, shadowed, graded like the stone).
//   * makeGroundMessage: the night letters. Each row is a mask of the glyphs
//     plus the trail that links them; a ground pass draws the oil (dark and
//     wet before it is lit), the burning bed, the heat on the stones around
//     it and the soot it lays down (charred in the morning); flames, smoke
//     and sparks are GPU billboards seeded inside the strokes. Everything
//     animates in its shaders from one clock (no per-frame CPU particle
//     work) and LOW / LOWEST draw half the flames.
//
// Nothing here decides what happens next; the runtime keeps the story.
import * as THREE from 'three';

import { FIRE_LETTERS } from './chapter3OpeningContent.js';

// The burning ground message sits on the civic paving south-east of the clock.
export const FIRE_SITE = Object.freeze({ x: 6.8, z: 5.8, approachZ: 9.1 });

// The afternoon line, as authored (alpha round 2): the runtime hit-tests and
// frames these points; the visible oil follows the joints within reach of it.
export const OIL_SEAM_ROUTE = Object.freeze([
  [3.4, 11.5], [4.6, 10.5], [5.6, 9.4], [6.8, 8.6],
  [8.0, 7.7], [8.05, 6.8], [9.2, 6.0], [10.4, 5.3],
].map((point) => Object.freeze(point)));

// How dark the second row reads before it is lit (0 hides it). Butch says
// "The lower row is dark"; dark wet oil on moonlit stone, not yet a sentence.
export const UNLIT_OIL_DARKNESS = 0.24;

// ------------------------------------------------------------ shared GLSL

const NOISE_GLSL = /* glsl */`
float oilHash( vec2 p ) {
	p = fract( p * vec2( 123.34, 456.21 ) );
	p += dot( p, p + 45.32 );
	return fract( p.x * p.y );
}
float oilNoise( vec2 p ) {
	vec2 i = floor( p );
	vec2 f = fract( p );
	vec2 u = f * f * ( 3.0 - 2.0 * f );
	return mix( mix( oilHash( i ), oilHash( i + vec2( 1.0, 0.0 ) ), u.x ),
		mix( oilHash( i + vec2( 0.0, 1.0 ) ), oilHash( i + vec2( 1.0, 1.0 ) ), u.x ), u.y );
}
float oilFbm( vec2 p ) {
	float v = 0.5 * oilNoise( p );
	v += 0.25 * oilNoise( p * 2.03 + 11.7 );
	v += 0.125 * oilNoise( p * 4.11 + 3.1 );
	return v / 0.875;
}
`;

// The paving's joints, from the court's own maps: its height map (joints are
// the low lines) or, when LOW already stripped that, its albedo (joints are
// the dark lines). Mode 0: no paving found, no joints.
const JOINT_GLSL = /* glsl */`
uniform sampler2D uPaving;
uniform mat3 uPavingMatrix;
uniform float uPavingMode;
float oilJointAt( vec2 world ) {
	if ( uPavingMode < 0.5 ) return 0.0;
	vec3 s = texture2D( uPaving, ( uPavingMatrix * vec3( world, 1.0 ) ).xy ).rgb;
	if ( uPavingMode < 1.5 ) return 1.0 - smoothstep( 0.2, 0.36, s.r );
	float l = sqrt( dot( s, vec3( 0.2126, 0.7152, 0.0722 ) ) );
	return 1.0 - smoothstep( 0.115, 0.17, l );
}
float oilReliefAt( vec2 world ) {
	if ( uPavingMode < 0.5 ) return 0.0;
	vec3 s = texture2D( uPaving, ( uPavingMatrix * vec3( world, 1.0 ) ).xy ).rgb;
	return uPavingMode < 1.5 ? s.r : 3.0 * sqrt( dot( s, vec3( 0.2126, 0.7152, 0.0722 ) ) );
}
`;

// ------------------------------------------------------------ the paving

const PIXEL_CACHE = new WeakMap();

function imagePixels(image) {
  if (!image || typeof document === 'undefined') return null;
  if (PIXEL_CACHE.has(image)) return PIXEL_CACHE.get(image);
  const width = image.naturalWidth || image.videoWidth || image.width;
  const height = image.naturalHeight || image.videoHeight || image.height;
  let entry = null;
  if (width && height) {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      context.drawImage(image, 0, 0);
      entry = { width, height, data: context.getImageData(0, 0, width, height).data };
    } catch {
      entry = null;
    }
  }
  PIXEL_CACHE.set(image, entry);
  return entry;
}

// The walkable surface under (x, z): which texture carries its joints and
// the affine map from world (x, z) to that texture's uv (box tops and
// cylinder caps are planar, so three hits on one face give it exactly).
export function pavingUnder(scene, x, z) {
  const walkables = [];
  scene?.traverse?.((object) => {
    if (object.isMesh && object.userData?.walkable) walkables.push(object);
  });
  if (!walkables.length) return null;
  const raycaster = new THREE.Raycaster();
  const down = new THREE.Vector3(0, -1, 0);
  const origin = new THREE.Vector3();
  const hitAt = (px, pz) => {
    raycaster.set(origin.set(px, 64, pz), down);
    return raycaster.intersectObjects(walkables, false)[0] ?? null;
  };
  const h0 = hitAt(x, z);
  if (!h0?.uv) return null;
  const sameFace = (dx, dz) => {
    for (const sign of [1, -1]) {
      const hit = hitAt(x + dx * sign, z + dz * sign);
      if (hit?.uv && hit.object === h0.object) return { hit, step: 0.4 * sign };
    }
    return null;
  };
  const alongX = sameFace(0.4, 0);
  const alongZ = sameFace(0, 0.4);
  if (!alongX || !alongZ) return null;
  const material = Array.isArray(h0.object.material) ? h0.object.material[0] : h0.object.material;
  const height = material?.bumpMap?.image ? material.bumpMap : null;
  const albedo = material?.map?.image ? material.map : null;
  const texture = height ?? albedo;
  if (!texture) return null;
  const a = (alongX.hit.uv.x - h0.uv.x) / alongX.step;
  const c = (alongX.hit.uv.y - h0.uv.y) / alongX.step;
  const b = (alongZ.hit.uv.x - h0.uv.x) / alongZ.step;
  const d = (alongZ.hit.uv.y - h0.uv.y) / alongZ.step;
  const toMeshUv = new THREE.Matrix3().set(
    a, b, h0.uv.x - a * x - b * z,
    c, d, h0.uv.y - c * x - d * z,
    0, 0, 1,
  );
  texture.updateMatrix();
  return {
    object: h0.object,
    y: h0.point.y,
    texture,
    mode: height ? 1 : 2,
    toUv: texture.matrix.clone().multiply(toMeshUv),
    flipY: texture.flipY !== false,
    pixels: imagePixels(texture.image),
  };
}

function smoothstep(edge0, edge1, value) {
  const t = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

// jointAt(x, z): 0 on a stone's face .. 1 in a mortar joint (CPU twin of
// oilJointAt above, for the path search).
function jointSampler(paving) {
  const pixels = paving?.pixels;
  if (!pixels) return null;
  const { width, height, data } = pixels;
  const e = paving.toUv.elements;
  const value = (px, py) => {
    const ix = ((px % width) + width) % width;
    const iy = ((py % height) + height) % height;
    const index = (iy * width + ix) * 4;
    if (paving.mode === 1) return data[index] / 255;
    return (0.2126 * data[index] + 0.7152 * data[index + 1] + 0.0722 * data[index + 2]) / 255;
  };
  return (x, z) => {
    const u = e[0] * x + e[3] * z + e[6];
    const v = e[1] * x + e[4] * z + e[7];
    const fu = u - Math.floor(u);
    const fv = v - Math.floor(v);
    const fx = fu * width - 0.5;
    const fy = (paving.flipY ? 1 - fv : fv) * height - 0.5;
    const x0 = Math.floor(fx);
    const y0 = Math.floor(fy);
    const tx = fx - x0;
    const ty = fy - y0;
    const sample = (value(x0, y0) * (1 - tx) + value(x0 + 1, y0) * tx) * (1 - ty)
      + (value(x0, y0 + 1) * (1 - tx) + value(x0 + 1, y0 + 1) * tx) * ty;
    return paving.mode === 1 ? 1 - smoothstep(0.2, 0.36, sample) : 1 - smoothstep(0.115, 0.17, sample);
  };
}

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function distanceToPolyline(x, z, points) {
  let best = Infinity;
  for (let index = 0; index < points.length - 1; index += 1) {
    const [ax, az] = points[index];
    const [bx, bz] = points[index + 1];
    const dx = bx - ax;
    const dz = bz - az;
    const t = Math.min(1, Math.max(0, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1)));
    best = Math.min(best, Math.hypot(x - ax - dx * t, z - az - dz * t));
  }
  return best;
}

function simplifyPath(points, epsilon) {
  if (points.length < 3) return points;
  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [first, last] = stack.pop();
    const [ax, az] = points[first];
    const [bx, bz] = points[last];
    const length = Math.hypot(bx - ax, bz - az) || 1;
    let worst = -1;
    let worstDistance = epsilon;
    for (let index = first + 1; index < last; index += 1) {
      const [px, pz] = points[index];
      const distance = Math.abs((bx - ax) * (az - pz) - (ax - px) * (bz - az)) / length;
      if (distance > worstDistance) {
        worst = index;
        worstDistance = distance;
      }
    }
    if (worst > 0) {
      keep[worst] = 1;
      stack.push([first, worst], [worst, last]);
    }
  }
  return points.filter((_, index) => keep[index]);
}

// The cheapest way from the route's first point to its last that stays in
// the mortar: Dijkstra over a 1.4 cm grid in a corridor around the route
// (cheap in a joint, dear across a stone, a little dearer far from the
// route, and dearer to turn: a hand pouring along a joint keeps to it until
// the joint ends). Returns world [x, z] points, or null if the paving can't
// say.
export function jointPath(route, jointAt, { cell = 0.014, corridor = 0.7, snap = 0.18, turn = 6 } = {}) {
  if (!jointAt || route.length < 2) return null;
  const pad = corridor + snap;
  const minX = Math.min(...route.map(([x]) => x)) - pad;
  const minZ = Math.min(...route.map(([, z]) => z)) - pad;
  const cols = Math.ceil((Math.max(...route.map(([x]) => x)) + pad - minX) / cell) + 1;
  const rows = Math.ceil((Math.max(...route.map(([, z]) => z)) + pad - minZ) / cell) + 1;
  const count = cols * rows;
  if (count > 4e6) return null;
  const cost = new Float32Array(count).fill(Infinity);
  for (let row = 0; row < rows; row += 1) {
    const z = minZ + row * cell;
    for (let col = 0; col < cols; col += 1) {
      const x = minX + col * cell;
      const distance = distanceToPolyline(x, z, route);
      if (distance > corridor) continue;
      const joint = jointAt(x, z);
      cost[row * cols + col] = 0.05 + 3.2 * (1 - joint) * (1 - joint) + 0.1 * (distance / corridor) ** 2;
    }
  }
  const snapTo = ([x, z]) => {
    let best = -1;
    let bestScore = -Infinity;
    const reach = Math.ceil(snap / cell);
    const c0 = Math.round((x - minX) / cell);
    const r0 = Math.round((z - minZ) / cell);
    for (let dr = -reach; dr <= reach; dr += 1) {
      for (let dc = -reach; dc <= reach; dc += 1) {
        const col = c0 + dc;
        const row = r0 + dr;
        if (col < 0 || row < 0 || col >= cols || row >= rows) continue;
        const index = row * cols + col;
        if (!Number.isFinite(cost[index])) continue;
        const score = jointAt(minX + col * cell, minZ + row * cell) - Math.hypot(dc, dr) * cell * 2.5;
        if (score > bestScore) {
          bestScore = score;
          best = index;
        }
      }
    }
    return best;
  };
  const source = snapTo(route[0]);
  const target = snapTo(route[route.length - 1]);
  if (source < 0 || target < 0) return null;
  // States are (corridor cell, heading): eight headings, so a turn can cost.
  const slot = new Int32Array(count).fill(-1);
  let active = 0;
  for (let index = 0; index < count; index += 1) if (Number.isFinite(cost[index])) slot[index] = active++;
  const cellOf = new Int32Array(active);
  for (let index = 0; index < count; index += 1) if (slot[index] >= 0) cellOf[slot[index]] = index;
  const steps = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
  const states = active * 8;
  const distance = new Float32Array(states).fill(Infinity);
  const previous = new Int32Array(states).fill(-1);
  let heapIndex = new Int32Array(4096);
  let heapPriority = new Float32Array(4096);
  let heapSize = 0;
  const push = (index, priority) => {
    if (heapSize === heapIndex.length) {
      const grownIndex = new Int32Array(heapSize * 2);
      const grownPriority = new Float32Array(heapSize * 2);
      grownIndex.set(heapIndex);
      grownPriority.set(heapPriority);
      heapIndex = grownIndex;
      heapPriority = grownPriority;
    }
    let slot = heapSize;
    heapSize += 1;
    while (slot > 0) {
      const parent = (slot - 1) >> 1;
      if (heapPriority[parent] <= priority) break;
      heapIndex[slot] = heapIndex[parent];
      heapPriority[slot] = heapPriority[parent];
      slot = parent;
    }
    heapIndex[slot] = index;
    heapPriority[slot] = priority;
  };
  const pop = () => {
    const top = heapIndex[0];
    const topPriority = heapPriority[0];
    heapSize -= 1;
    const lastIndex = heapIndex[heapSize];
    const lastPriority = heapPriority[heapSize];
    let slot = 0;
    for (;;) {
      let child = slot * 2 + 1;
      if (child >= heapSize) break;
      if (child + 1 < heapSize && heapPriority[child + 1] < heapPriority[child]) child += 1;
      if (heapPriority[child] >= lastPriority) break;
      heapIndex[slot] = heapIndex[child];
      heapPriority[slot] = heapPriority[child];
      slot = child;
    }
    heapIndex[slot] = lastIndex;
    heapPriority[slot] = lastPriority;
    return [top, topPriority];
  };
  for (let heading = 0; heading < 8; heading += 1) {
    distance[slot[source] * 8 + heading] = 0;
    push(slot[source] * 8 + heading, 0);
  }
  let reached = -1;
  while (heapSize) {
    const [state, priority] = pop();
    if (priority > distance[state]) continue;
    const current = cellOf[state >> 3];
    const heading = state & 7;
    if (current === target) {
      reached = state;
      break;
    }
    const col = current % cols;
    const row = (current - col) / cols;
    for (let next = 0; next < 8; next += 1) {
      const [dc, dr] = steps[next];
      const nc = col + dc;
      const nr = row + dr;
      if (nc < 0 || nr < 0 || nc >= cols || nr >= rows) continue;
      const cellIndex = nr * cols + nc;
      const stepCost = cost[cellIndex];
      if (!Number.isFinite(stepCost)) continue;
      const bend = Math.min((next - heading + 8) % 8, (heading - next + 8) % 8);
      const candidate = priority + stepCost * (next & 1 ? Math.SQRT2 : 1) + bend * turn * 0.5;
      const nextState = slot[cellIndex] * 8 + next;
      if (candidate >= distance[nextState]) continue;
      distance[nextState] = candidate;
      previous[nextState] = state;
      push(nextState, candidate);
    }
  }
  if (reached < 0) return null;
  const path = [];
  for (let cursor = reached; cursor >= 0; cursor = previous[cursor]) {
    const cellIndex = cellOf[cursor >> 3];
    const col = cellIndex % cols;
    path.push([minX + col * cell, minZ + ((cellIndex - col) / cols) * cell]);
    if (cellIndex === source) break;
  }
  path.reverse();
  return simplifyPath(path, cell * 0.75);
}

// ------------------------------------------------------------ masks

// Masks carry coverage in RGB over opaque black: a canvas uploads
// un-premultiplied, so coverage kept in alpha would come back binary.
function makeCanvas(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  context.fillStyle = '#000000';
  context.fillRect(0, 0, width, height);
  return canvas;
}

// Halving with smoothing is a box blur that every browser does the same way.
function halve(source, times) {
  let canvas = source;
  for (let step = 0; step < times; step += 1) {
    const next = makeCanvas(Math.max(1, canvas.width >> 1), Math.max(1, canvas.height >> 1));
    const context = next.getContext('2d');
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(canvas, 0, 0, next.width, next.height);
    canvas = next;
  }
  return canvas;
}

function maskTexture(canvas, { mipmaps = false } = {}) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.NoColorSpace;
  texture.flipY = false;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = mipmaps ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter;
  texture.generateMipmaps = mipmaps;
  texture.needsUpdate = true;
  return texture;
}

function pavingUniforms(paving) {
  return {
    uPaving: { value: paving?.texture ?? null },
    uPavingMatrix: { value: paving?.toUv?.clone() ?? new THREE.Matrix3() },
    uPavingMode: { value: paving ? paving.mode : 0 },
  };
}

// ------------------------------------------------------------ the oil line

const SEAM_PIXELS_PER_METRE = 100;

function drawSeamMasks(path) {
  const pad = 0.55;
  const minX = Math.min(...path.map(([x]) => x)) - pad;
  const minZ = Math.min(...path.map(([, z]) => z)) - pad;
  const spanX = Math.max(...path.map(([x]) => x)) + pad - minX;
  const spanZ = Math.max(...path.map(([, z]) => z)) + pad - minZ;
  // Multiples of 16 so the halved masks cover exactly the same metres.
  const width = Math.ceil((spanX * SEAM_PIXELS_PER_METRE) / 16) * 16;
  const height = Math.ceil((spanZ * SEAM_PIXELS_PER_METRE) / 16) * 16;
  const metresX = width / SEAM_PIXELS_PER_METRE;
  const metresZ = height / SEAM_PIXELS_PER_METRE;
  const core = makeCanvas(width, height);
  const context = core.getContext('2d', { willReadFrequently: true });
  const px = (x) => (x - minX) * SEAM_PIXELS_PER_METRE;
  const pz = (z) => (z - minZ) * SEAM_PIXELS_PER_METRE;
  const lengths = [0];
  for (let index = 1; index < path.length; index += 1) {
    lengths.push(lengths[index - 1] + Math.hypot(path[index][0] - path[index - 1][0], path[index][1] - path[index - 1][1]));
  }
  const total = lengths[lengths.length - 1] || 1;
  const random = seededRandom(4307);
  // R: oil coverage. G: how far along the line (times coverage, so the
  // outline can divide it back out at an antialiased edge).
  const shade = (along, alpha = 1) => `rgba(255, ${Math.round(along * 255)}, 0, ${alpha})`;
  context.lineCap = 'round';
  context.lineJoin = 'round';
  for (let index = 0; index < path.length - 1; index += 1) {
    const along = lengths[index] / total;
    // Poured by hand: the trail swells and thins a little as the can moves.
    const width = 0.07 + 0.04 * random();
    context.strokeStyle = shade(along);
    context.lineWidth = width * SEAM_PIXELS_PER_METRE;
    context.beginPath();
    context.moveTo(px(path[index][0]), pz(path[index][1]));
    context.lineTo(px(path[index + 1][0]), pz(path[index + 1][1]));
    context.stroke();
  }
  // Where the line turned or the pour paused, the oil pooled in the joint
  // crossing; a few drops fell short of it.
  const turns = [];
  for (let index = 1; index < path.length - 1; index += 1) {
    const [ax, az] = path[index - 1];
    const [bx, bz] = path[index];
    const [cx, cz] = path[index + 1];
    const turn = Math.abs(Math.atan2((bx - ax) * (cz - bz) - (bz - az) * (cx - bx), (bx - ax) * (cx - bx) + (bz - az) * (cz - bz)));
    turns.push({ index, turn });
  }
  turns.sort((first, second) => second.turn - first.turn);
  const pools = [0, ...turns.slice(0, 7).map(({ index }) => index), path.length - 1];
  for (const index of pools) {
    const [x, z] = path[index];
    const radius = (index === 0 ? 0.075 : 0.035 + 0.035 * random()) * SEAM_PIXELS_PER_METRE;
    context.fillStyle = shade(lengths[index] / total);
    context.beginPath();
    context.ellipse(px(x), pz(z), radius, radius * (0.55 + 0.35 * random()), random() * Math.PI, 0, Math.PI * 2);
    context.fill();
  }
  for (let drop = 0; drop < 26; drop += 1) {
    const index = Math.floor(random() * (path.length - 1));
    const t = random();
    const x = path[index][0] + (path[index + 1][0] - path[index][0]) * t;
    const z = path[index][1] + (path[index + 1][1] - path[index][1]) * t;
    const angle = random() * Math.PI * 2;
    const reach = (0.035 + 0.05 * random()) * SEAM_PIXELS_PER_METRE;
    context.fillStyle = shade((lengths[index] + (lengths[index + 1] - lengths[index]) * t) / total, 0.85);
    context.beginPath();
    context.arc(px(x) + Math.cos(angle) * reach, pz(z) + Math.sin(angle) * reach, (0.004 + 0.008 * random()) * SEAM_PIXELS_PER_METRE, 0, Math.PI * 2);
    context.fill();
  }
  const soft = halve(core, 2);
  const wide = halve(soft, 2);
  return {
    core: maskTexture(core, { mipmaps: true }),
    soft: maskTexture(soft),
    wide: maskTexture(wide),
    // world (x, z) -> mask uv
    matrix: new THREE.Matrix3().set(1 / metresX, 0, -minX / metresX, 0, 1 / metresZ, -minZ / metresZ, 0, 0, 1),
    bounds: { minX, minZ, metresX, metresZ },
    length: total,
  };
}

const SEAM_VERTEX_PARS = 'varying vec3 vOilWorld;';
const SEAM_FRAGMENT_PARS = /* glsl */`
varying vec3 vOilWorld;
uniform sampler2D uOilCore;
uniform sampler2D uOilSoft;
uniform sampler2D uOilWide;
uniform mat3 uOilMask;
uniform vec3 uOilColor;
uniform vec3 uOilStain;
uniform vec3 uOilPale;
uniform vec3 uOilSky;
uniform vec4 uOilLook; // x: wiped band strength, y: bead relief, z: joint relief, w: sky sheen
${NOISE_GLSL}
${JOINT_GLSL}
float oilSoftAt( vec2 world ) { return texture2D( uOilSoft, ( uOilMask * vec3( world, 1.0 ) ).xy ).r; }
`;

// Replaces map_fragment: the oil's coverage, colour and wetness.
const SEAM_ALBEDO = /* glsl */`
vec2 oilUv = ( uOilMask * vec3( vOilWorld.xz, 1.0 ) ).xy;
float oilWide = texture2D( uOilWide, oilUv ).r;
// Most of the decal is bare street: skip the lighting there.
if ( oilWide < 0.004 ) discard;
float oilCore = texture2D( uOilCore, oilUv ).r;
float oilSoft = texture2D( uOilSoft, oilUv ).r;
float oilJoint = oilJointAt( vOilWorld.xz );
float oilGrain = oilFbm( vOilWorld.xz * 23.0 );
float oilBlot = oilFbm( vOilWorld.xz * 6.0 + 3.1 );
// More oil here, less there, as the can moved.
float oilFlow = 0.7 + 0.3 * oilFbm( vOilWorld.xz * 1.7 + 9.0 );
// The oil itself: the poured line, and what ran along the crossing joints.
float oilInJoint = oilJoint * max( smoothstep( 0.1, 0.42, oilSoft + ( oilBlot - 0.5 ) * 0.3 ),
	0.75 * smoothstep( 0.05, 0.22, oilWide + ( oilBlot - 0.5 ) * 0.12 ) );
float oilWet = max( smoothstep( 0.3, 0.7, oilCore + ( oilGrain - 0.5 ) * 0.4 ) * oilFlow, oilInJoint * 0.9 );
// Oil wicked into the limestone either side: darker, warmer, uneven.
float oilSoak = smoothstep( 0.02, 0.38, oilSoft + oilWide * 0.35 + ( oilGrain - 0.5 ) * 0.34 ) * ( 0.45 + 0.55 * oilBlot ) * oilFlow;
// The band somebody wiped first: a little paler than the street.
float oilWiped = smoothstep( 0.03, 0.12, oilWide + ( oilBlot - 0.5 ) * 0.12 ) * ( 1.0 - smoothstep( 0.02, 0.2, oilSoft ) ) * smoothstep( 0.35, 0.7, oilFbm( vOilWorld.xz * 2.2 + 7.0 ) );
float oilAlpha = max( oilWet * 0.9, oilSoak * 0.6 );
vec3 oilAlbedo = mix( uOilStain, uOilColor, oilWet );
float oilPaleA = oilWiped * uOilLook.x * ( 0.65 + 0.35 * oilGrain ) * ( 1.0 - oilAlpha );
oilAlbedo = mix( oilAlbedo, uOilPale, oilPaleA / max( oilAlpha + oilPaleA, 1e-3 ) );
diffuseColor = vec4( oilAlbedo, ( oilAlpha + oilPaleA ) * opacity );
`;

// After roughnessmap_fragment: liquid in the joint, satin where it soaked.
const SEAM_ROUGHNESS = /* glsl */`
roughnessFactor = mix( roughnessFactor, 0.5, oilSoak * ( 1.0 - oilWet ) );
roughnessFactor = mix( roughnessFactor, 0.11, oilWet );
`;

// After normal_fragment_maps: the oil's surface is not flat. Across the
// poured line it is a low bead; in a joint it climbs the stone walls. Both
// tilt it toward the sun on one side, so a thin bright line runs along the
// edges that face the light and the rest stays dark.
const SEAM_NORMAL = /* glsl */`
{
	float e = 0.014;
	vec2 bead = vec2(
		oilSoftAt( vOilWorld.xz + vec2( e, 0.0 ) ) - oilSoftAt( vOilWorld.xz - vec2( e, 0.0 ) ),
		oilSoftAt( vOilWorld.xz + vec2( 0.0, e ) ) - oilSoftAt( vOilWorld.xz - vec2( 0.0, e ) ) );
	vec2 relief = vec2(
		oilReliefAt( vOilWorld.xz + vec2( e, 0.0 ) ) - oilReliefAt( vOilWorld.xz - vec2( e, 0.0 ) ),
		oilReliefAt( vOilWorld.xz + vec2( 0.0, e ) ) - oilReliefAt( vOilWorld.xz - vec2( 0.0, e ) ) );
	// A liquid film is never quite still: ripples break the sheen into glints.
	vec2 ripple = vec2( oilNoise( vOilWorld.xz * 61.0 ), oilNoise( vOilWorld.xz * 61.0 + 17.3 ) ) - 0.5;
	vec2 slope = bead * uOilLook.y + relief * uOilLook.z + ripple * 0.34;
	vec3 oilNormalWorld = normalize( vec3( -slope.x, 1.0, -slope.y ) );
	normal = normalize( mix( normal, normalize( ( viewMatrix * vec4( oilNormalWorld, 0.0 ) ).xyz ), oilWet ) );
}
`;

// After emissivemap_fragment: a liquid mirrors the sky a little (Fresnel),
// which is what tells oil from paint where no highlight falls.
const SEAM_SHEEN = /* glsl */`
{
	vec3 oilView = isOrthographic ? vec3( 0.0, 0.0, 1.0 ) : normalize( vViewPosition );
	float oilFresnel = 0.035 + 0.965 * pow( 1.0 - saturate( dot( normal, oilView ) ), 5.0 );
	totalEmissiveRadiance += uOilSky * oilFresnel * oilWet * uOilLook.w;
}
`;

const OUTLINE_VERTEX = /* glsl */`
varying vec3 vOilWorld;
void main() {
	vec4 world = modelMatrix * vec4( position, 1.0 );
	vOilWorld = world.xyz;
	gl_Position = projectionMatrix * viewMatrix * world;
}
`;

// The interaction highlight: a warm breath round the line (never on it, so
// the oil stays dark) and a glint that runs along the wet core.
const OUTLINE_FRAGMENT = /* glsl */`
varying vec3 vOilWorld;
uniform sampler2D uOilCore;
uniform sampler2D uOilSoft;
uniform sampler2D uOilWide;
uniform mat3 uOilMask;
uniform float uTime;
uniform vec3 uGlow;
uniform float uStrength;
void main() {
	vec2 uv = ( uOilMask * vec3( vOilWorld.xz, 1.0 ) ).xy;
	vec4 core = texture2D( uOilCore, uv );
	float soft = texture2D( uOilSoft, uv ).r;
	float wide = texture2D( uOilWide, uv ).r;
	float halo = smoothstep( 0.03, 0.22, wide ) * ( 1.0 - smoothstep( 0.2, 0.62, soft ) );
	float breathe = 0.72 + 0.28 * sin( uTime * 2.35 );
	float along = core.g / max( core.r, 1e-3 );
	float run = along - fract( uTime * 0.12 );
	float glint = exp( -run * run * 260.0 ) * smoothstep( 0.2, 0.7, core.r );
	vec3 color = uGlow * halo * 0.42 * breathe + vec3( 1.0, 0.78, 0.5 ) * glint * 0.55;
	gl_FragColor = vec4( color * uStrength, 1.0 );
}
`;

export function makeDarkSeam(scene, surfaceHeightAt = null) {
  const points = OIL_SEAM_ROUTE.map(([x, z]) => {
    const sampled = surfaceHeightAt?.(x, z);
    return new THREE.Vector3(x, Number.isFinite(sampled) ? sampled : 0.73, z);
  });
  const middle = OIL_SEAM_ROUTE[3];
  const paving = typeof document === 'undefined' ? null : pavingUnder(scene, middle[0], middle[1]);
  const route = OIL_SEAM_ROUTE.map(([x, z]) => [x, z]);
  const started = typeof performance === 'undefined' ? 0 : performance.now();
  const path = jointPath(route, jointSampler(paving)) ?? route;
  const searchMs = typeof performance === 'undefined' ? 0 : performance.now() - started;
  const masks = drawSeamMasks(path);
  const groundY = paving?.y ?? Math.max(...points.map((point) => point.y));
  const { minX, minZ, metresX, metresZ } = masks.bounds;
  const geometry = new THREE.PlaneGeometry(metresX, metresZ);
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(minX + metresX / 2, groundY + 0.004, minZ + metresZ / 2);

  const uniforms = {
    uOilCore: { value: masks.core },
    uOilSoft: { value: masks.soft },
    uOilWide: { value: masks.wide },
    uOilMask: { value: masks.matrix },
    // Kerosene and a dark lamp oil: near black with a brown cast; the stone
    // it soaked into goes a deep umber.
    uOilColor: { value: new THREE.Color(0x1a1009) },
    uOilStain: { value: new THREE.Color(0x33200f) },
    uOilPale: { value: new THREE.Color(0xe8dcc6) },
    uOilSky: { value: new THREE.Color(0x9fb8d0) },
    uOilLook: { value: new THREE.Vector4(0.11, 0.45, 0.7, 1.0) },
    ...pavingUniforms(paving),
  };
  const material = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.95,
    metalness: 0,
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  material.name = 'chapter3-lamp-oil-seam';
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${SEAM_VERTEX_PARS}`)
      .replace('#include <project_vertex>', '#include <project_vertex>\nvOilWorld = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${SEAM_FRAGMENT_PARS}`)
      .replace('#include <map_fragment>', SEAM_ALBEDO)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>\n${SEAM_ROUGHNESS}`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>\n${SEAM_NORMAL}`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>\n${SEAM_SHEEN}`);
  };
  material.customProgramCacheKey = () => 'chapter3-lamp-oil-seam';
  const stain = new THREE.Mesh(geometry, material);
  stain.name = 'opening-lamp-oil-seam';
  stain.receiveShadow = true;
  stain.castShadow = false;
  stain.renderOrder = 2;
  stain.frustumCulled = false;
  // The sky it mirrors is the time of day's (the city's hemisphere light).
  let sky = null;
  stain.onBeforeRender = () => {
    sky ??= scene.getObjectByName?.('city-hemisphere-light') ?? false;
    if (sky) uniforms.uOilSky.value.copy(sky.color).multiplyScalar(sky.intensity * 0.6);
  };
  scene.add(stain);

  const outlineUniforms = {
    uOilCore: uniforms.uOilCore,
    uOilSoft: uniforms.uOilSoft,
    uOilWide: uniforms.uOilWide,
    uOilMask: uniforms.uOilMask,
    uTime: { value: 0 },
    uGlow: { value: new THREE.Color(0xe0a050) },
    uStrength: { value: 1 },
  };
  const outline = new THREE.Mesh(geometry, new THREE.ShaderMaterial({
    name: 'chapter3-lamp-oil-seam-highlight',
    uniforms: outlineUniforms,
    vertexShader: OUTLINE_VERTEX,
    fragmentShader: OUTLINE_FRAGMENT,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    polygonOffset: true,
    polygonOffsetFactor: -3,
    polygonOffsetUnits: -3,
    toneMapped: false,
    fog: false,
  }));
  outline.name = 'opening-lamp-oil-seam-highlight';
  outline.renderOrder = 3;
  outline.frustumCulled = false;
  outline.onBeforeRender = () => {
    outlineUniforms.uTime.value = (performance.now() / 1000) % 3600;
  };
  outline.visible = false;
  scene.add(outline);
  return {
    stain,
    outline,
    points,
    // The visible line, along the joints (world x, z).
    path,
    length: masks.length,
    followsJoints: path !== route,
    searchMs: Math.round(searchMs),
  };
}

// ------------------------------------------------------------ the letters

// The mask covers the row's 11.48 m of lettering (the size the letters have
// always had on screen) plus the trail's lead-in from the cut feed.
const LETTER_TEXT_PX = 2048;
const LETTER_MASK_PX = 2176;
const LETTER_MASK_ROWS = 320;
const LETTER_TEXT_METRES = 11.48;
const LETTER_DEPTH_METRES = 1.58;
const LETTER_PX_PER_METRE = LETTER_TEXT_PX / LETTER_TEXT_METRES;
const LETTER_MASK_METRES = LETTER_MASK_PX / LETTER_PX_PER_METRE;
const LETTER_STRETCH = 1.45;

const BED_VERTEX = /* glsl */`
varying vec3 vLocal;
varying vec3 vWorld;
void main() {
	vLocal = position;
	vec4 world = modelMatrix * vec4( position, 1.0 );
	vWorld = world.xyz;
	gl_Position = projectionMatrix * viewMatrix * world;
}
`;

// The ground under one row: oil, fire bed, heat on the stones, soot, char.
// Premultiplied output: rgb is light added, alpha darkens what is beneath.
const BED_FRAGMENT = /* glsl */`
varying vec3 vLocal;
varying vec3 vWorld;
uniform sampler2D uSharp;
uniform sampler2D uSoft;
uniform sampler2D uWide;
uniform sampler2D uPool;
uniform vec4 uMaskRect;
uniform float uTime;
uniform float uReveal;
uniform float uLit;
uniform float uCharred;
uniform float uUnlitDark;
uniform float uHighlight;
${NOISE_GLSL}
${JOINT_GLSL}
void main() {
	vec2 muv = ( vLocal.xz - uMaskRect.xy ) * uMaskRect.zw;
	float wide = texture2D( uWide, muv ).r;
	float pool = texture2D( uPool, muv ).r;
	if ( wide < 0.004 && pool < 0.004 ) discard;
	vec2 sharpT = texture2D( uSharp, muv ).rg;
	vec2 softT = texture2D( uSoft, muv ).rg;
	float sharp = sharpT.r;
	float soft = softT.r;
	// The trail between the letters (green only): a thin line that burns low.
	float trailMask = max( sharpT.g - sharpT.r, 0.0 ) * 0.7 + max( softT.g - softT.r, 0.0 ) * 0.5;
	float joint = oilJointAt( vWorld.xz );
	float grain = oilFbm( vWorld.xz * 24.0 );
	float blot = oilFbm( vWorld.xz * 6.5 + 4.7 );
	// The poured oil: the stroke with a ragged pour edge, plus the runs it
	// made into the joints it crossed.
	float oil = smoothstep( 0.34, 0.64, mix( sharp, soft, 0.45 ) + ( grain - 0.5 ) * 0.3 + ( blot - 0.5 ) * 0.22 );
	oil = max( oil, joint * smoothstep( 0.08, 0.38, soft + ( blot - 0.5 ) * 0.2 ) * 0.85 );
	float trail = smoothstep( 0.25, 0.6, trailMask + ( grain - 0.5 ) * 0.25 ) * ( 1.0 - oil );
	// Reading order is local +x: the fire runs from the head of the row.
	float behind = uReveal - muv.x;
	float lit = uLit * step( 0.0, behind );
	float front = uLit * exp( -behind * behind * 1100.0 ) * ( 1.0 - smoothstep( 0.985, 1.0, uReveal ) );
	float near = uLit * smoothstep( -0.035, 0.0, behind );
	float flick = oilNoise( vWorld.xz * 7.0 + vec2( uTime * 1.9, -uTime * 2.6 ) );
	float flick2 = oilNoise( vWorld.xz * 2.1 - vec2( uTime * 0.8, uTime * 1.2 ) );
	float rim = smoothstep( 0.05, 0.3, soft + ( grain - 0.5 ) * 0.22 ) * ( 1.0 - oil );
	vec3 add = vec3( 0.0 );
	float dark = 0.0;
	if ( uCharred > 0.5 ) {
		// Burned out: black char in the strokes, grey ash where it pooled,
		// soot fanned on the stone round them.
		// Patchy, not printed: the char is heavier where the oil pooled and
		// the soot fans out unevenly over the setts.
		dark = max( oil * ( 0.55 + 0.3 * blot + 0.15 * pool ), rim * ( 0.3 + 0.3 * blot ) );
		dark = max( dark, wide * ( 0.12 + 0.18 * blot ) );
		dark = max( dark, trail * 0.45 );
		add += vec3( 0.12, 0.11, 0.105 ) * oil * smoothstep( 0.45, 0.85, pool * 1.4 + ( blot - 0.5 ) * 0.7 + ( grain - 0.5 ) * 0.3 );
	} else {
		// Wet oil not yet alight: soaked dark stone, a cold sheen on the liquid.
		dark = max( oil, trail * 0.8 ) * uUnlitDark * ( 1.0 - lit ) * ( 0.7 + 0.5 * joint + 0.3 * pool );
		add += vec3( 0.035, 0.04, 0.05 ) * oil * ( 1.0 - lit ) * smoothstep( 0.6, 0.85, grain ) * uUnlitDark;
		// Burning: the bed of flame, hottest where the oil lay thickest.
		float heat = clamp( 0.6 + pool * 0.9 + soft * 0.4, 0.0, 1.25 );
		float bed = oil * lit * ( 0.38 + 0.5 * flick ) * heat;
		vec3 bedColor = mix( vec3( 0.62, 0.11, 0.02 ), vec3( 0.95, 0.4, 0.08 ), smoothstep( 0.2, 0.7, bed ) );
		bedColor = mix( bedColor, vec3( 1.0, 0.68, 0.3 ), smoothstep( 0.75, 1.1, bed ) );
		add += bedColor * bed;
		// The trail burns as a thin low line.
		add += vec3( 0.85, 0.3, 0.05 ) * trail * lit * ( 0.3 + 0.35 * flick );
		// The fire's own light on the stones right beside it: the tops of
		// the setts catch it, the joints stay dark.
		float glow = near * ( wide * 0.6 + pool * 0.95 ) * ( 0.7 + 0.45 * flick2 ) * ( 1.0 - oil );
		add += vec3( 0.7, 0.2, 0.035 ) * glow * ( 1.0 - 0.75 * joint ) * 0.55;
		// The running front flares as it catches.
		add += vec3( 1.0, 0.72, 0.32 ) * front * ( oil * 1.5 + trail * 1.4 + wide * 0.7 );
		// Soot laid down round the strokes while they burn.
		dark = max( dark, max( oil * 0.45 * lit, rim * 0.58 * lit ) );
	}
	add += vec3( 1.0, 0.55, 0.2 ) * uHighlight * ( wide * 0.3 + oil * 0.3 );
	gl_FragColor = vec4( add + vec3( 0.012, 0.01, 0.012 ) * dark, dark );
}
`;

// Flames: vertical billboards rooted in the strokes (a cylinder billboard,
// so they stand up from the paving whatever the camera does).
const FLAME_VERTEX = /* glsl */`
attribute vec3 aAnchor;
attribute vec4 aSeed; // phase, size, along the row, heat
uniform float uTime;
uniform float uReveal;
uniform float uHeight;
uniform float uWidth;
varying vec2 vUv;
varying float vHeat;
varying float vSeed;
varying float vFade;
varying float vSize;
float flameHash( float n ) { return fract( sin( n ) * 43758.5453 ); }
float flameNoise( float x ) {
	float i = floor( x );
	float f = fract( x );
	return mix( flameHash( i ), flameHash( i + 1.0 ), f * f * ( 3.0 - 2.0 * f ) );
}
void main() {
	float since = uReveal - aSeed.z;
	float grow = smoothstep( 0.0, 0.035, since );
	float flare = exp( -since * since * 800.0 ) * step( 0.0, since ) * ( 1.0 - smoothstep( 0.985, 1.0, uReveal ) );
	float t = uTime * ( 2.4 + aSeed.x * 2.4 ) + aSeed.x * 61.0;
	float flick = 0.6 + 0.55 * flameNoise( t ) + 0.3 * flameNoise( t * 2.7 + 9.0 );
	float h = uHeight * aSeed.y * ( 0.6 + 0.75 * aSeed.w ) * flick * grow * ( 1.0 + 1.2 * flare );
	float w = uWidth * ( 0.75 + 0.5 * aSeed.y ) * ( 0.8 + 0.45 * aSeed.w ) * mix( 0.35, 1.0, grow );
	vec4 world = modelMatrix * vec4( aAnchor, 1.0 );
	vec3 right = vec3( viewMatrix[ 0 ][ 0 ], viewMatrix[ 1 ][ 0 ], viewMatrix[ 2 ][ 0 ] );
	// The night air leans them a little one way, and they lick about it.
	float sway = ( flameNoise( uTime * 1.3 + aSeed.x * 17.0 ) - 0.5 ) * 0.55 + 0.14;
	vec3 p = world.xyz + right * ( position.x * w + position.y * position.y * sway * h * 0.5 ) + vec3( 0.0, position.y * h - 0.012, 0.0 );
	gl_Position = projectionMatrix * viewMatrix * vec4( p, 1.0 );
	vUv = vec2( position.x + 0.5, position.y );
	vHeat = aSeed.w;
	vSeed = aSeed.x;
	vFade = grow * ( 1.0 + 0.5 * flare ) * step( 0.004, h );
	vSize = aSeed.y;
}
`;

const FLAME_FRAGMENT = /* glsl */`
uniform float uTime;
uniform float uIntensity;
varying vec2 vUv;
varying float vHeat;
varying float vSeed;
varying float vFade;
varying float vSize;
${NOISE_GLSL}
void main() {
	if ( vFade <= 0.001 ) discard;
	float y = vUv.y;
	float x = vUv.x * 2.0 - 1.0;
	// The tongue licks: turbulence that grows toward the tip and rises with it.
	float turb = oilNoise( vec2( x * 1.4 + vSeed * 13.0, y * 2.6 - uTime * 3.1 - vSeed * 5.0 ) ) - 0.5;
	float turb2 = oilNoise( vec2( x * 3.1 - vSeed * 7.0, y * 5.2 - uTime * 5.4 ) ) - 0.5;
	x += ( turb * 0.95 + turb2 * 0.4 ) * y * 1.3;
	// A soft teardrop: round at the root, widest low, drawn out to the tip.
	float halfW = ( 1.0 - y ) * ( 0.55 + 0.45 * sqrt( clamp( y * 4.0, 0.0, 1.0 ) ) );
	float across = abs( x ) / max( halfW, 1e-3 );
	float body = 1.0 - smoothstep( 0.2, 1.05, across );
	float tip = 1.0 - smoothstep( 0.3, 1.0, y + turb * 0.45 );
	float density = body * tip;
	if ( density <= 0.003 ) discard;
	float temp = density * ( 1.0 - 0.7 * y ) * ( 0.75 + 0.35 * vHeat );
	vec3 color = mix( vec3( 0.5, 0.06, 0.01 ), vec3( 1.0, 0.36, 0.05 ), smoothstep( 0.04, 0.32, temp ) );
	color = mix( color, vec3( 1.0, 0.7, 0.26 ), smoothstep( 0.32, 0.62, temp ) );
	color = mix( color, vec3( 1.0, 0.9, 0.68 ), smoothstep( 0.82, 1.0, temp ) );
	// The small licks inside a stroke are dimmer than the tall far-edge flames.
	float weight = 0.5 + 0.5 * smoothstep( 0.55, 0.95, vSize );
	float alpha = pow( density, 1.3 ) * min( vFade, 1.4 ) * weight;
	gl_FragColor = vec4( color * alpha * uIntensity, 1.0 );
}
`;

// Smoke and sparks: camera-facing billboards with a life cycle in the
// shader. aSeed: phase, speed, along the row, size.
const DRIFT_VERTEX = /* glsl */`
attribute vec3 aAnchor;
attribute vec4 aSeed;
uniform float uTime;
uniform float uReveal;
uniform vec4 uMotion; // x: cycles per second, y: rise (m), z: drift along the row (m), w: size growth
varying vec2 vUv;
varying float vLife;
varying float vAlpha;
varying float vSeed;
void main() {
	float life = fract( uTime * uMotion.x * ( 0.7 + 0.6 * aSeed.y ) + aSeed.x );
	float lit = step( aSeed.z, uReveal - 0.03 );
	vec4 world = modelMatrix * vec4( aAnchor, 1.0 );
	vec3 right = vec3( viewMatrix[ 0 ][ 0 ], viewMatrix[ 1 ][ 0 ], viewMatrix[ 2 ][ 0 ] );
	vec3 up = vec3( viewMatrix[ 0 ][ 1 ], viewMatrix[ 1 ][ 1 ], viewMatrix[ 2 ][ 1 ] );
	vec3 along = normalize( ( modelMatrix * vec4( 1.0, 0.0, 0.0, 0.0 ) ).xyz );
	float wander = sin( uTime * ( 1.3 + aSeed.y ) + aSeed.x * 40.0 ) * 0.06 * life;
	vec3 centre = world.xyz + along * ( uMotion.z * life + wander ) + vec3( 0.0, 0.08 + uMotion.y * life * ( 0.75 + 0.5 * aSeed.y ), 0.0 );
	float size = aSeed.w * ( 1.0 + uMotion.w * life );
	vec3 p = centre + ( right * position.x + up * position.y ) * size;
	gl_Position = projectionMatrix * viewMatrix * vec4( p, 1.0 );
	vUv = position.xy + 0.5;
	vLife = life;
	vSeed = aSeed.x;
	vAlpha = lit * smoothstep( 0.0, 0.12, life ) * ( 1.0 - smoothstep( 0.5, 1.0, life ) );
}
`;

const SMOKE_FRAGMENT = /* glsl */`
uniform float uTime;
uniform float uOpacity;
varying vec2 vUv;
varying float vLife;
varying float vAlpha;
varying float vSeed;
${NOISE_GLSL}
void main() {
	if ( vAlpha <= 0.001 ) discard;
	vec2 c = vUv - 0.5;
	float n = oilFbm( vUv * 2.6 + vec2( vSeed * 17.0, -uTime * 0.25 ) );
	float puff = 1.0 - smoothstep( 0.18, 0.5, length( c ) + ( n - 0.5 ) * 0.32 );
	// Lamp oil burns sooty: brown-black smoke, lit warm from below as it leaves the flames.
	vec3 color = mix( vec3( 0.34, 0.15, 0.06 ), vec3( 0.055, 0.05, 0.05 ), smoothstep( 0.0, 0.4, vLife ) );
	float a = puff * vAlpha * uOpacity;
	gl_FragColor = vec4( color * a, a );
}
`;

const SPARK_FRAGMENT = /* glsl */`
uniform float uTime;
uniform float uOpacity;
varying vec2 vUv;
varying float vLife;
varying float vAlpha;
varying float vSeed;
void main() {
	if ( vAlpha <= 0.001 ) discard;
	float d = length( vUv - 0.5 ) * 2.0;
	float core = 1.0 - smoothstep( 0.0, 1.0, d );
	float blink = 0.6 + 0.4 * sin( uTime * 23.0 + vSeed * 80.0 );
	vec3 color = mix( vec3( 1.0, 0.85, 0.5 ), vec3( 1.0, 0.35, 0.06 ), smoothstep( 0.1, 0.8, vLife ) );
	gl_FragColor = vec4( color * core * core * vAlpha * blink * uOpacity, 1.0 );
}
`;

function quadGeometry({ rooted }) {
  const geometry = new THREE.InstancedBufferGeometry();
  const y0 = rooted ? 0 : -0.5;
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
    -0.5, y0, 0, 0.5, y0, 0, 0.5, y0 + 1, 0, -0.5, y0 + 1, 0,
  ]), 3));
  geometry.setIndex([0, 1, 2, 0, 2, 3]);
  return geometry;
}

// A billboard set: instanced quads, one draw call. The runtime's old CPU
// particle loop still runs over `userData` and finds nothing to move.
function billboardSet({ name, anchors, seeds, material, rooted, renderOrder, lowShare = 0.5 }) {
  const geometry = quadGeometry({ rooted });
  geometry.setAttribute('aAnchor', new THREE.InstancedBufferAttribute(anchors, 3));
  geometry.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 4));
  const full = anchors.length / 3;
  geometry.instanceCount = full;
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  mesh.frustumCulled = false;
  mesh.renderOrder = renderOrder;
  mesh.userData.basePositions = new Float32Array(0);
  mesh.userData.phases = new Float32Array(0);
  mesh.userData.speeds = new Float32Array(0);
  mesh.userData.particleCount = 0;
  mesh.userData.instances = full;
  // LOW / LOWEST (no shadow maps) draw a share of them: the order is random,
  // so any prefix is spread over the whole row.
  mesh.onBeforeRender = (renderer) => {
    geometry.instanceCount = renderer.shadowMap.enabled ? full : Math.max(1, Math.round(full * lowShare));
  };
  return mesh;
}

function drawRowMask(text, { leadFrom = null, seed = 1 } = {}) {
  const canvas = makeCanvas(LETTER_MASK_PX, LETTER_MASK_ROWS);
  const context = canvas.getContext('2d', { willReadFrequently: true });
  const margin = (LETTER_MASK_PX - LETTER_TEXT_PX) / 2;
  // Release pass: the game's voice face (EB Garamond, Georgia, bold capitals),
  // sized to fill the row so the whole sentence reads from the fixed camera.
  context.textAlign = 'left';
  context.textBaseline = 'middle';
  context.fillStyle = '#ffffff';
  const tracking = 17;
  let fontSize = 165;
  const measure = () => {
    context.font = `700 ${fontSize}px EB Garamond, Georgia, "Times New Roman", "DejaVu Serif", serif`;
    const widths = [...text].map((character) => context.measureText(character).width);
    return { widths, total: widths.reduce((sum, width) => sum + width, 0) + tracking * Math.max(0, widths.length - 1) };
  };
  let fit = measure();
  while (fit.total > LETTER_TEXT_PX * 0.92 && fontSize > 90) {
    fontSize -= 5;
    fit = measure();
  }
  let glyphX = margin + (LETTER_TEXT_PX - fit.total) / 2;
  const glyphs = [];
  [...text].forEach((character, index) => {
    const baselineJitter = ((index * 7) % 5 - 2) * 0.6;
    if (character !== ' ') {
      context.save();
      context.translate(glyphX, LETTER_MASK_ROWS / 2 + baselineJitter);
      // A barely perceptible per-letter slant: a hand pouring capitals, not
      // a typesetter. Drawn tall: the camera foreshortens the paving, and
      // the row is wider in metres than the canvas, so this is what gives
      // the letters their own proportions on screen (they read 1.6x wide).
      context.rotate(((index * 13) % 7 - 3) * 0.007);
      context.scale(0.96, LETTER_STRETCH);
      context.fillText(character, 0, 0);
      context.restore();
      glyphs.push({ character, left: glyphX, right: glyphX + fit.widths[index] * 0.96 });
    }
    glyphX += fit.widths[index] + tracking;
  });
  // Where the strokes end at the bottom: the trail that joins the letters
  // runs along it, as the can moved on from one letter to the next.
  const pixels = context.getImageData(0, 0, LETTER_MASK_PX, LETTER_MASK_ROWS).data;
  const bottoms = [];
  for (let px = 0; px < LETTER_MASK_PX; px += 3) {
    for (let py = LETTER_MASK_ROWS - 1; py >= 0; py -= 1) {
      if (pixels[(py * LETTER_MASK_PX + px) * 4] > 128) {
        bottoms.push(py);
        break;
      }
    }
  }
  bottoms.sort((a, b) => a - b);
  const baseline = bottoms.length ? bottoms[Math.floor(bottoms.length * 0.5)] - 3 : LETTER_MASK_ROWS * 0.62;
  const random = seededRandom(seed);
  const trail = [];
  const firstLeft = glyphs[0]?.left ?? margin;
  if (Number.isFinite(leadFrom)) trail.push([leadFrom, baseline + 2]);
  trail.push([firstLeft + 4, baseline]);
  for (let index = 0; index < glyphs.length - 1; index += 1) {
    const gap = glyphs[index + 1].left - glyphs[index].right;
    // The trail sags a little where the can travelled between letters.
    trail.push([glyphs[index].right - 3, baseline + random() * 1.5]);
    trail.push([glyphs[index].right + gap * 0.5, baseline + 2.5 + random() * 3 + Math.min(4, gap * 0.04)]);
    trail.push([glyphs[index + 1].left + 3, baseline + random() * 1.5]);
  }
  trail.push([(glyphs[glyphs.length - 1]?.right ?? LETTER_MASK_PX - margin) - 4, baseline]);
  // The trail and the splashes go in the green channel only: they burn low
  // (no flame tongues to read as punctuation between the letters).
  context.globalCompositeOperation = 'lighter';
  context.strokeStyle = '#00ff00';
  context.lineCap = 'round';
  context.lineJoin = 'round';
  context.lineWidth = 4.2;
  context.beginPath();
  context.moveTo(trail[0][0], trail[0][1]);
  for (let index = 1; index < trail.length - 1; index += 1) {
    const [x, y] = trail[index];
    const [nx, ny] = trail[index + 1];
    context.quadraticCurveTo(x, y, (x + nx) / 2, (y + ny) / 2);
  }
  context.lineTo(trail[trail.length - 1][0], trail[trail.length - 1][1]);
  context.stroke();
  // Splashes beside the strokes, the way oil leaves a can.
  context.fillStyle = '#00ff00';
  for (const glyph of glyphs) {
    for (let drop = 0; drop < 7; drop += 1) {
      const x = glyph.left + random() * (glyph.right - glyph.left);
      const y = LETTER_MASK_ROWS * 0.3 + random() * LETTER_MASK_ROWS * 0.42;
      context.beginPath();
      context.arc(x, y, 1 + random() * 2.2, 0, Math.PI * 2);
      context.fill();
    }
  }
  context.globalCompositeOperation = 'source-over';
  return { canvas, context, glyphs, fontSize };
}

// Points inside the strokes, at least `spacing` metres apart, in random
// order. Returns local [x, z, heat] with heat from the blurred mask.
function strokeAnchors(context, soft, { rowOffset, spacing, max, seed }) {
  const data = context.getImageData(0, 0, LETTER_MASK_PX, LETTER_MASK_ROWS).data;
  const softData = soft.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, soft.width, soft.height).data;
  const random = seededRandom(seed);
  const candidates = [];
  for (let py = 1; py < LETTER_MASK_ROWS; py += 2) {
    for (let px = 1; px < LETTER_MASK_PX; px += 2) {
      if (data[(py * LETTER_MASK_PX + px) * 4] > 150) candidates.push(px, py);
    }
  }
  const order = Array.from({ length: candidates.length / 2 }, (_, index) => index);
  for (let index = order.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [order[index], order[swap]] = [order[swap], order[index]];
  }
  const toX = (px) => -LETTER_MASK_METRES / 2 + ((px + 0.5) / LETTER_MASK_PX) * LETTER_MASK_METRES;
  const toZ = (py) => rowOffset - LETTER_DEPTH_METRES / 2 + ((py + 0.5) / LETTER_MASK_ROWS) * LETTER_DEPTH_METRES;
  const grid = new Map();
  const key = (x, z) => `${Math.floor(x / spacing)},${Math.floor(z / spacing)}`;
  const anchors = [];
  for (const candidate of order) {
    if (anchors.length >= max) break;
    const px = candidates[candidate * 2];
    const py = candidates[candidate * 2 + 1];
    const x = toX(px) + (random() - 0.5) * 0.004;
    const z = toZ(py);
    const gx = Math.floor(x / spacing);
    const gz = Math.floor(z / spacing);
    let clear = true;
    for (let dz = -1; dz <= 1 && clear; dz += 1) {
      for (let dx = -1; dx <= 1 && clear; dx += 1) {
        for (const [ox, oz] of grid.get(`${gx + dx},${gz + dz}`) ?? []) {
          if ((ox - x) ** 2 + (oz - z) ** 2 < spacing * spacing) {
            clear = false;
            break;
          }
        }
      }
    }
    if (!clear) continue;
    const cellKey = key(x, z);
    if (!grid.has(cellKey)) grid.set(cellKey, []);
    grid.get(cellKey).push([x, z]);
    const sx = Math.min(soft.width - 1, Math.floor((px / LETTER_MASK_PX) * soft.width));
    const sy = Math.min(soft.height - 1, Math.floor((py / LETTER_MASK_ROWS) * soft.height));
    // A far edge (nothing painted a few centimetres behind it, screen-up):
    // a flame there rises over bare paving and hides no stroke.
    const behind = py - 9 >= 0 ? data[((py - 9) * LETTER_MASK_PX + px) * 4] : 0;
    // A side edge (a stem's flank): medium flames, so an I or an l reads.
    const left = px - 5 >= 0 ? data[(py * LETTER_MASK_PX + px - 5) * 4] : 0;
    const right = px + 5 < LETTER_MASK_PX ? data[(py * LETTER_MASK_PX + px + 5) * 4] : 0;
    const edge = behind < 100 ? 1 : (left < 100 || right < 100 ? 0.5 : 0);
    anchors.push([x, z, softData[(sy * soft.width + sx) * 4] / 255, (px + 0.5) / LETTER_MASK_PX, edge]);
  }
  return anchors;
}

export function makeGroundMessage(scene, surfaceHeightAt = null) {
  const messageGroup = new THREE.Group();
  messageGroup.name = 'chapter3-burning-ground-message';
  const fireGround = surfaceHeightAt?.(FIRE_SITE.x, FIRE_SITE.z);
  messageGroup.position.set(FIRE_SITE.x, Number.isFinite(fireGround) ? fireGround : 0.73, FIRE_SITE.z);
  messageGroup.rotation.y = 0.845;
  scene.add(messageGroup);
  messageGroup.updateMatrixWorld(true);
  const paving = pavingUnder(scene, FIRE_SITE.x, FIRE_SITE.z);
  const clock = { value: 0 };
  const tick = () => {
    clock.value = (performance.now() / 1000) % 3600;
  };

  const makeRow = (text, rowOffset, { leadFromX = null, seed }) => {
    const leadFrom = Number.isFinite(leadFromX)
      ? (leadFromX + LETTER_MASK_METRES / 2) * LETTER_PX_PER_METRE
      : null;
    const { canvas, context } = drawRowMask(text, { leadFrom, seed });
    const soft = halve(canvas, 2);
    const wide = halve(soft, 2);
    const pool = halve(wide, 2);
    const bedUniforms = {
      uSharp: { value: maskTexture(canvas, { mipmaps: true }) },
      uSoft: { value: maskTexture(soft) },
      uWide: { value: maskTexture(wide) },
      uPool: { value: maskTexture(pool) },
      uMaskRect: { value: new THREE.Vector4(-LETTER_MASK_METRES / 2, rowOffset - LETTER_DEPTH_METRES / 2, 1 / LETTER_MASK_METRES, 1 / LETTER_DEPTH_METRES) },
      uTime: clock,
      uReveal: { value: 1 },
      uLit: { value: 1 },
      uCharred: { value: 0 },
      uUnlitDark: { value: UNLIT_OIL_DARKNESS },
      uHighlight: { value: 0 },
      ...pavingUniforms(paving),
    };
    const bedGeometry = new THREE.PlaneGeometry(LETTER_MASK_METRES, LETTER_DEPTH_METRES);
    bedGeometry.rotateX(-Math.PI / 2);
    bedGeometry.translate(0, 0.004, rowOffset);
    const bed = new THREE.Mesh(bedGeometry, new THREE.ShaderMaterial({
      name: 'chapter3-burning-letters-bed',
      uniforms: bedUniforms,
      vertexShader: BED_VERTEX,
      fragmentShader: BED_FRAGMENT,
      transparent: true,
      depthWrite: false,
      blending: THREE.CustomBlending,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneMinusSrcAlphaFactor,
      blendSrcAlpha: THREE.ZeroFactor,
      blendDstAlpha: THREE.OneFactor,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
      toneMapped: false,
      fog: false,
    }));
    bed.name = 'burning-letter-oil-bed';
    bed.renderOrder = 4;
    bed.frustumCulled = false;
    bed.onBeforeRender = tick;

    const anchors = strokeAnchors(context, soft, { rowOffset, spacing: 0.06, max: 380, seed: seed * 31 });
    const random = seededRandom(seed * 7 + 3);
    const flameAnchors = new Float32Array(anchors.length * 3);
    const flameSeeds = new Float32Array(anchors.length * 4);
    anchors.forEach(([x, z, heat, along, edge], index) => {
      flameAnchors.set([x, 0, z], index * 3);
      // Tall flames on the far edges, small licks inside the strokes, so
      // the bed of each letter stays in view.
      const size = edge === 1 ? 0.85 + random() * 0.55 : edge ? 0.6 + random() * 0.3 : 0.42 + random() * 0.3;
      flameSeeds.set([random(), size, along, Math.min(1, heat * 1.15)], index * 4);
    });
    const flameUniforms = {
      uTime: clock,
      uReveal: bedUniforms.uReveal,
      uHeight: { value: 0.25 },
      uWidth: { value: 0.11 },
      uIntensity: { value: 0.8 },
    };
    const flames = billboardSet({
      name: 'burning-letter-edge-flames',
      anchors: flameAnchors,
      seeds: flameSeeds,
      rooted: true,
      renderOrder: 6,
      material: new THREE.ShaderMaterial({
        name: 'chapter3-burning-letters-flames',
        uniforms: flameUniforms,
        vertexShader: FLAME_VERTEX,
        fragmentShader: FLAME_FRAGMENT,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
        fog: false,
      }),
    });
    flames.onBeforeRender = ((lowShare) => (renderer) => {
      tick();
      lowShare(renderer);
    })(flames.onBeforeRender);

    const pick = (count, seedOffset) => {
      const chosen = seededRandom(seed * 13 + seedOffset);
      return Array.from({ length: Math.min(count, anchors.length) }, () => anchors[Math.floor(chosen() * anchors.length)]);
    };
    const driftSet = ({ name, count, seedOffset, size, motion, fragmentShader, opacity, blending, renderOrder, lowShare }) => {
      const picked = pick(count, seedOffset);
      const chosen = seededRandom(seed * 17 + seedOffset);
      const positions = new Float32Array(picked.length * 3);
      const seeds = new Float32Array(picked.length * 4);
      picked.forEach(([x, z, , along], index) => {
        positions.set([x, 0, z], index * 3);
        seeds.set([chosen(), chosen(), along, size[0] + chosen() * (size[1] - size[0])], index * 4);
      });
      const material = new THREE.ShaderMaterial({
        name: `chapter3-${name}`,
        uniforms: {
          uTime: clock,
          uReveal: bedUniforms.uReveal,
          uMotion: { value: new THREE.Vector4(...motion) },
          uOpacity: { value: opacity },
        },
        vertexShader: DRIFT_VERTEX,
        fragmentShader,
        transparent: true,
        depthWrite: false,
        toneMapped: false,
        fog: false,
        ...blending,
      });
      return billboardSet({ name, anchors: positions, seeds, material, rooted: false, renderOrder, lowShare });
    };
    const smoke = driftSet({
      name: 'burning-letter-smoke',
      count: 30,
      seedOffset: 5,
      size: [0.22, 0.4],
      motion: [0.16, 1.15, 0.55, 1.6],
      fragmentShader: SMOKE_FRAGMENT,
      opacity: 0.26,
      blending: { blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor },
      renderOrder: 7,
      lowShare: 0.5,
    });
    const embers = driftSet({
      name: 'burning-letter-rising-embers',
      count: 56,
      seedOffset: 9,
      size: [0.018, 0.034],
      motion: [0.5, 1.25, 0.3, -0.5],
      fragmentShader: SPARK_FRAGMENT,
      opacity: 1.0,
      blending: { blending: THREE.AdditiveBlending },
      renderOrder: 8,
      lowShare: 0.5,
    });

    messageGroup.add(bed, flames, smoke, embers);
    // The runtime's per-frame loop (animateGroundFire) still writes these:
    // stand-ins with nothing to move keep it harmless.
    const flameBand = new THREE.Group();
    flameBand.name = 'burning-letter-flame-clusters';
    const stand = (name) => ({ name, visible: false, material: { opacity: 1 } });
    const effect = {
      mesh: bed,
      bed,
      flames,
      smoke,
      embers,
      flameBand,
      flameCores: stand('burning-letter-warm-flame-cores'),
      glow: stand('burning-letter-glow'),
      uniforms: bedUniforms,
      flameUniforms,
      anchors: anchors.length,
      worldWidth: LETTER_MASK_METRES,
      ignitionProgress: 1,
      // Unlit oil (lit false), burning to `reveal` (0..1 along the row), or
      // burned out (charred).
      setState({ visible = true, lit = false, reveal = 1, charred = false }) {
        this.ignitionProgress = reveal;
        bed.visible = visible;
        bedUniforms.uLit.value = lit ? 1 : 0;
        bedUniforms.uReveal.value = reveal;
        bedUniforms.uCharred.value = charred ? 1 : 0;
        const burning = visible && lit && !charred && reveal > 0;
        flames.visible = burning;
        smoke.visible = burning;
        embers.visible = burning;
        flameBand.visible = burning;
      },
      setReveal(progress) {
        this.setState({ lit: true, reveal: THREE.MathUtils.clamp(progress, 0, 1) });
      },
    };
    return effect;
  };

  // Two rows, read top to bottom from the fixed camera (local +Z moves down
  // the frame); the second row's trail starts at the cut feed's clamp. The
  // first row sits lower than it used to (0.25): the fountain's rim reaches
  // local z = 0.6 above "I W", and the old decal only showed there because
  // it ignored depth and was drawn over the stone. On open paving now.
  const FIRST_ROW = 0.98;
  const firstEffect = makeRow(FIRE_LETTERS.first, FIRST_ROW, { seed: 11 });
  const secondEffect = makeRow(FIRE_LETTERS.second, 2.35, { leadFromX: -6.05, seed: 23 });
  let highlightVisible = false;
  let highlightStrength = 0.5;
  const applyHighlight = () => {
    for (const effect of [firstEffect, secondEffect]) effect.uniforms.uHighlight.value = highlightVisible ? highlightStrength : 0;
  };
  const highlight = {
    get visible() {
      return highlightVisible;
    },
    set visible(value) {
      highlightVisible = Boolean(value);
      applyHighlight();
    },
    // The guidance pulse from across the square.
    setIntensity(value) {
      highlightStrength = THREE.MathUtils.clamp(value, 0, 1);
      applyHighlight();
    },
  };
  // A row of fire is a line of light, so its lights sit above the middle of
  // each row and fall off as a line source does (1 / d), lighting Butch, the
  // lamps and the plaza edge round it; the stones right beside the letters
  // take their glow from the bed. (The runtime flickers their intensity.)
  const makeFireLight = (rowOffset, color) => {
    const light = new THREE.PointLight(color, 17, 15, 1.1);
    light.position.set(0, 1.05, rowOffset + 0.15);
    return light;
  };
  const firstLight = makeFireLight(FIRST_ROW, 0xff7a32);
  const secondLight = makeFireLight(2.35, 0xff8838);
  messageGroup.add(firstLight, secondLight);
  messageGroup.updateMatrixWorld(true);
  const interfacePosition = messageGroup.localToWorld(new THREE.Vector3(-6.05, 0.08, 2.35));
  // "This afternoon's oil line. It was never a spill. It was the first row."
  // Once the letters are on the ground the afternoon line is part of them:
  // it no longer lies between the rows.
  const retireAfternoonLine = () => {
    for (const name of ['opening-lamp-oil-seam', 'opening-lamp-oil-seam-highlight']) {
      const line = scene.getObjectByName(name);
      if (line) line.visible = false;
    }
  };
  const api = {
    first: firstEffect.mesh,
    second: secondEffect.mesh,
    firstEffect,
    secondEffect,
    firstLight,
    secondLight,
    fireLights: [firstLight, secondLight],
    highlight,
    group: messageGroup,
    interfacePosition,
    position: new THREE.Vector3(FIRE_SITE.x, messageGroup.position.y + 0.03, FIRE_SITE.z),
    setFirstBurning(visible) {
      if (visible) {
        messageGroup.visible = true;
        retireAfternoonLine();
      }
      firstEffect.setState({ visible, lit: visible, reveal: 1 });
      firstLight.visible = visible;
    },
    // Unlit, the second row is there as dark oil ("The lower row is dark").
    // Its light stays switched on at zero intensity (the runtime scales it by
    // the ignition): a light that appears changes the scene's light count
    // and recompiles every material, which froze the climax "It lit on the
    // bell" for seconds on a slow GPU. The lights join the scene once, when
    // the letters do, under the night's blackout.
    setSecondBurning(visible) {
      if (visible) messageGroup.visible = true;
      secondEffect.setState({ visible: true, lit: visible, reveal: visible ? 1 : 0 });
      secondLight.visible = true;
      if (!visible) secondLight.intensity = 0;
    },
    setSecondIgnitionProgress(progress) {
      const reveal = THREE.MathUtils.clamp(progress, 0, 1);
      secondEffect.setState({ lit: true, reveal });
      secondLight.visible = true;
      secondLight.intensity = 17 * reveal;
    },
    setBurnedOut() {
      // Morning investigation needs the charred letters, but they must not
      // exist during the afternoon (the group stays hidden until the night).
      messageGroup.visible = true;
      retireAfternoonLine();
      firstEffect.setState({ charred: true });
      secondEffect.setState({ charred: true });
      firstLight.visible = false;
      secondLight.visible = false;
    },
  };
  messageGroup.visible = false;
  api.setFirstBurning(false);
  api.setSecondBurning(false);
  return api;
}
