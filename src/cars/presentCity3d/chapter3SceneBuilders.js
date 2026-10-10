// Chapter 3 · ECHO CITY — scene builders and interior path helpers.
// Split out of Chapter3OpeningRuntime.js for the 1.0 release so the runtime
// keeps only the story flow. Everything here builds three.js objects; nothing
// here decides what happens next.
import * as THREE from 'three';

import { CHAPTER3_CAST_LIGHT } from './chapter3CastLook.js';
import { OPENING_POSITIONS } from './chapter3OpeningContent.js';

// Round 11: the lamp oil on the paving (the afternoon line and the night
// letters) lives in chapter3OilArt.js; the runtime still builds it from here.
export { FIRE_SITE, makeDarkSeam, makeGroundMessage } from './chapter3OilArt.js';

export function positionFrom(values) {
  return new THREE.Vector3(values[0], values[1], values[2]);
}

export function pointInsideInteriorObstacle(point, obstacles) {
  return obstacles.some((box) => (
    point.x > box.minX && point.x < box.maxX
    && point.z > box.minZ && point.z < box.maxZ
  ));
}

export function clampInteriorPoint(point, bounds, obstacles) {
  const result = point.clone();
  result.x = THREE.MathUtils.clamp(result.x, bounds.minX, bounds.maxX);
  result.z = THREE.MathUtils.clamp(result.z, bounds.minZ, bounds.maxZ);
  // Treat overlapping padded footprints as a union. Trying only the nearest
  // edge of one box can bounce Butch between the dining table and stairs.
  for (let pass = 0; pass < Math.max(1, obstacles.length * 2); pass += 1) {
    const containing = obstacles.filter((box) => pointInsideInteriorObstacle(result, [box]));
    if (containing.length === 0) break;
    const candidates = containing.flatMap((box) => [
      new THREE.Vector3(box.minX, result.y, result.z),
      new THREE.Vector3(box.maxX, result.y, result.z),
      new THREE.Vector3(result.x, result.y, box.minZ),
      new THREE.Vector3(result.x, result.y, box.maxZ),
    ]).filter((candidate) => !pointInsideInteriorObstacle(candidate, obstacles));
    candidates.sort((a, b) => a.distanceToSquared(result) - b.distanceToSquared(result));
    if (candidates.length === 0) break;
    result.copy(candidates[0]);
  }
  return result;
}

export function interiorSegmentIsClear(start, end, bounds, obstacles) {
  const distance = start.distanceTo(end);
  const samples = Math.max(2, Math.ceil(distance / 0.12));
  for (let index = 0; index <= samples; index += 1) {
    const t = index / samples;
    const point = new THREE.Vector3(
      THREE.MathUtils.lerp(start.x, end.x, t),
      start.y,
      THREE.MathUtils.lerp(start.z, end.z, t),
    );
    if (point.x < bounds.minX || point.x > bounds.maxX || point.z < bounds.minZ || point.z > bounds.maxZ) return false;
    if (pointInsideInteriorObstacle(point, obstacles)) return false;
  }
  return true;
}

// A small visibility graph routes around the actual furniture footprints.
// Unlike the old end-point clamp, every segment from Butch to the click target
// is collision checked, so counters, queue rails and reading tables are solid.
export function findInteriorPath(start, requestedTarget, bounds, obstacles) {
  const target = clampInteriorPoint(requestedTarget, bounds, obstacles);
  const source = clampInteriorPoint(start, bounds, obstacles);
  if (interiorSegmentIsClear(source, target, bounds, obstacles)) return [target];
  const nodes = [source, target];
  for (const box of obstacles) {
    nodes.push(
      new THREE.Vector3(box.minX, source.y, box.minZ),
      new THREE.Vector3(box.minX, source.y, box.maxZ),
      new THREE.Vector3(box.maxX, source.y, box.minZ),
      new THREE.Vector3(box.maxX, source.y, box.maxZ),
    );
  }
  const valid = nodes.filter((node) => (
    node.x >= bounds.minX && node.x <= bounds.maxX
    && node.z >= bounds.minZ && node.z <= bounds.maxZ
    && !pointInsideInteriorObstacle(node, obstacles)
  ));
  const sourceIndex = valid.indexOf(source);
  const targetIndex = valid.indexOf(target);
  if (sourceIndex < 0 || targetIndex < 0) return [];
  const distances = valid.map(() => Infinity);
  const previous = valid.map(() => -1);
  const open = new Set(valid.map((_, index) => index));
  distances[sourceIndex] = 0;
  while (open.size) {
    let current = -1;
    for (const candidate of open) {
      if (current < 0 || distances[candidate] < distances[current]) current = candidate;
    }
    if (current < 0 || !Number.isFinite(distances[current]) || current === targetIndex) break;
    open.delete(current);
    for (const neighbor of open) {
      if (!interiorSegmentIsClear(valid[current], valid[neighbor], bounds, obstacles)) continue;
      const nextDistance = distances[current] + valid[current].distanceTo(valid[neighbor]);
      if (nextDistance >= distances[neighbor]) continue;
      distances[neighbor] = nextDistance;
      previous[neighbor] = current;
    }
  }
  if (!Number.isFinite(distances[targetIndex])) return [];
  const path = [];
  for (let cursor = targetIndex; cursor !== sourceIndex && cursor >= 0; cursor = previous[cursor]) path.unshift(valid[cursor]);
  return path;
}

export function smooth(value) {
  const x = THREE.MathUtils.clamp(value, 0, 1);
  return x * x * (3 - 2 * x);
}

export function makeActor(scene, { name, color, position, scale = 1 }) {
  const group = new THREE.Group();
  group.name = name;
  const coat = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.38 * scale, 0.86 * scale, 5, 10),
    new THREE.MeshStandardMaterial({ color, roughness: 0.78, metalness: 0.02 }),
  );
  coat.position.y = 0.92 * scale;
  coat.castShadow = true;
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.27 * scale, 12, 10),
    new THREE.MeshStandardMaterial({ color: 0xc7a27f, roughness: 0.92 }),
  );
  head.position.y = 1.72 * scale;
  head.castShadow = true;
  group.add(coat, head);
  group.position.copy(positionFrom(position));
  scene.add(group);
  return group;
}

// The Mara ahead's rose scarf, the one colour she carries and every witness
// names. Round 11 (owner note: "a hot-pink ring round her neck that reads as
// a collar"): it is cloth now, as the cutscenes paint it. A loose double wrap
// of a folded band round the neck, never a perfect ring (it sags in front,
// sits on the shoulders, swells and thins along its length), knotted at the
// back on her left; the long end falls down her back over the shoulder
// blade, the short end is thrown forward over her left shoulder. Matte, lit
// like the rest of the street, in the story's dusty rose (#C8506A), with the
// cast's time-of-day fill floor so it still reads in shade and at dusk. The
// ends sway a little, and trail behind her when she walks (in its vertex
// shader: one draw call, no CPU work beyond a velocity estimate).
//
// Built in metres in her body frame (X her left, Y up, Z forward) about the
// neck bone's origin. Whoever ties it to a bone gets it fitted there (see
// fitRoseScarf, on 'added'); on the capsule placeholder it sits where the
// capsule's shoulders round off.
export const ROSE_SCARF_COLOR = 0xc8506a;
// The cloth's own dye is a little warmer than the swatch: the street's cool
// white balance (the afternoon and dawn grades) pulls a rose toward magenta,
// and this lands on screen as the dusty rose of the paintings, not a neon pink.
export const ROSE_SCARF_DYE = 0xb85a56;

function scarfBand({ centre, radiusX, radiusFront, radiusBack, sag, height, thickness, seed, segments = 44, sides = 10 }) {
  const positions = [];
  const indices = [];
  const lump = (angle, k) => 1 + 0.22 * Math.sin(angle * 3 + seed * 1.7 + k) + 0.12 * Math.sin(angle * 7 - seed * 2.3 + k);
  const ringPoint = (angle) => {
    const rz = Math.cos(angle) >= 0 ? radiusFront : radiusBack;
    return new THREE.Vector3(
      centre[0] + Math.sin(angle) * radiusX,
      centre[1] + sag * Math.cos(angle) + 0.004 * Math.sin(angle * 2 + seed),
      centre[2] + Math.cos(angle) * rz,
    );
  };
  for (let index = 0; index < segments; index += 1) {
    const angle = (index / segments) * Math.PI * 2;
    const point = ringPoint(angle);
    const tangent = ringPoint(angle + 0.01).sub(ringPoint(angle - 0.01)).normalize();
    const outward = new THREE.Vector3(point.x - centre[0], 0, point.z - centre[2]).normalize();
    const up = new THREE.Vector3().crossVectors(tangent, outward).normalize();
    if (up.y < 0) up.negate();
    const h = height * lump(angle, 0);
    const t = thickness * lump(angle, 2.1);
    for (let side = 0; side < sides; side += 1) {
      const phi = (side / sides) * Math.PI * 2;
      // A folded band: taller than it is thick, its edges rounded.
      const c = Math.cos(phi);
      const s = Math.sin(phi);
      const offset = outward.clone().multiplyScalar(t * Math.sign(c) * Math.abs(c) ** 0.6)
        .addScaledVector(up, h * Math.sign(s) * Math.abs(s) ** 0.8);
      positions.push(point.x + offset.x, point.y + offset.y, point.z + offset.z);
    }
  }
  for (let index = 0; index < segments; index += 1) {
    const next = (index + 1) % segments;
    for (let side = 0; side < sides; side += 1) {
      const nextSide = (side + 1) % sides;
      const a = index * sides + side;
      const b = next * sides + side;
      const c = next * sides + nextSide;
      const d = index * sides + nextSide;
      indices.push(a, b, d, b, c, d);
    }
  }
  return { positions, indices, hang: new Array(positions.length / 3).fill(0), away: new Array(positions.length).fill(0) };
}

// One end of the scarf: a ribbon along `path`, `width` across (its width
// starts along her left-right and turns by `twist` toward the tip, as a
// hanging end does, so it is never seen only edge-on), rippled into folds.
function scarfEnd({ path, width, away, seed, twist = 0, steps = 18 }) {
  const curve = new THREE.CatmullRomCurve3(path.map((point) => new THREE.Vector3(...point)), false, 'centripetal');
  const positions = [];
  const indices = [];
  const hang = [];
  const awayList = [];
  const across = new THREE.Vector3();
  const awayVector = new THREE.Vector3(...away).normalize();
  for (let step = 0; step <= steps; step += 1) {
    const t = step / steps;
    const point = curve.getPointAt(t);
    const tangent = curve.getTangentAt(t);
    across.set(Math.cos(twist * t), 0, Math.sin(twist * t));
    const side = across.clone().addScaledVector(tangent, -across.dot(tangent)).normalize();
    const normal = new THREE.Vector3().crossVectors(tangent, side).normalize();
    // Narrow where it leaves the knot, full width below, a little flare at the hem.
    const w = width * (0.55 + 0.45 * Math.min(1, t * 4)) * (1 + 0.12 * Math.max(0, (t - 0.85) / 0.15));
    const fold = Math.sin(t * 17 + seed) * 0.0045;
    for (const edge of [-1, -0.33, 0.33, 1]) {
      const ripple = fold * Math.cos(edge * Math.PI * 0.5 + seed) + 0.0025 * Math.sin(edge * 4 + t * 9 + seed);
      positions.push(
        point.x + side.x * w * 0.5 * edge + normal.x * ripple,
        point.y + side.y * w * 0.5 * edge + normal.y * ripple,
        point.z + side.z * w * 0.5 * edge + normal.z * ripple,
      );
      hang.push(t);
      awayList.push(awayVector.x, awayVector.y, awayVector.z);
    }
  }
  for (let step = 0; step < steps; step += 1) {
    for (let column = 0; column < 3; column += 1) {
      const a = step * 4 + column;
      const b = (step + 1) * 4 + column;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  return { positions, indices, hang, away: awayList };
}

function scarfKnot({ centre, size, seed }) {
  const geometry = new THREE.IcosahedronGeometry(1, 2);
  const position = geometry.getAttribute('position');
  const positions = [];
  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index);
    const y = position.getY(index);
    const z = position.getZ(index);
    // Cloth gathered into a knot: lumpy, a crease across it.
    const lumpy = 1 + 0.16 * Math.sin(x * 5 + seed) * Math.cos(y * 4 - seed) - 0.12 * Math.exp(-((y - 0.1) ** 2) * 18);
    positions.push(centre[0] + x * size[0] * lumpy, centre[1] + y * size[1] * lumpy, centre[2] + z * size[2] * lumpy);
  }
  const indices = geometry.index ? Array.from(geometry.index.array) : Array.from({ length: position.count }, (_, index) => index);
  geometry.dispose();
  return { positions, indices, hang: new Array(position.count).fill(0), away: new Array(position.count * 3).fill(0) };
}

function mergeScarfParts(parts) {
  const positions = [];
  const indices = [];
  const hang = [];
  const away = [];
  for (const part of parts) {
    const offset = positions.length / 3;
    positions.push(...part.positions);
    indices.push(...part.indices.map((index) => index + offset));
    hang.push(...part.hang);
    away.push(...part.away);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('aHang', new THREE.Float32BufferAttribute(hang, 1));
  geometry.setAttribute('aAway', new THREE.Float32BufferAttribute(away, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

const SCARF_VERTEX_PARS = 'attribute float aHang;\nattribute vec3 aAway;\nuniform vec4 uScarfSway;';
// x: seconds, y: how fast she is walking (0 still .. ~1.2 striding).
const SCARF_VERTEX = /* glsl */`
{
	float hang = aHang * aHang;
	float stride = uScarfSway.y * ( 0.55 + 0.45 * sin( uScarfSway.x * 7.4 + aHang * 2.6 ) );
	float idle = 0.22 * ( 0.5 + 0.5 * sin( uScarfSway.x * 1.6 + aHang * 1.9 ) );
	transformed += aAway * hang * ( stride + idle ) * 0.065;
	transformed.x += hang * sin( uScarfSway.x * 2.2 + aHang * 3.1 ) * ( 0.006 + 0.016 * uScarfSway.y );
}
`;

export function fitRoseScarf(scarf) {
  const parent = scarf.parent;
  if (!parent) return false;
  let host = parent;
  while (host.parent && !host.parent.isScene) host = host.parent;
  host.updateMatrixWorld(true);
  if (parent.isBone) {
    // Her body frame at the neck, whatever the rig's bone axes and scale.
    const boneRotation = parent.getWorldQuaternion(new THREE.Quaternion());
    const hostRotation = host.getWorldQuaternion(new THREE.Quaternion());
    scarf.quaternion.copy(boneRotation.invert().multiply(hostRotation));
    const boneScale = parent.getWorldScale(new THREE.Vector3());
    const hostScale = host.getWorldScale(new THREE.Vector3());
    scarf.scale.set(hostScale.x / boneScale.x, hostScale.y / boneScale.y, hostScale.z / boneScale.z);
    scarf.position.set(0, 0, 0);
    scarf.userData.fittedTo = 'bone';
    return true;
  }
  // The capsule placeholder: round where its shoulders end.
  const capsule = parent.children.find((child) => child.geometry?.type === 'CapsuleGeometry');
  if (!capsule) return false;
  const { radius, height } = capsule.geometry.parameters;
  const rise = radius * 0.45;
  const girth = Math.sqrt(Math.max(0, radius * radius - rise * rise));
  scarf.quaternion.identity();
  scarf.scale.set(girth / 0.088, 1.5, girth / 0.088);
  scarf.position.set(0, capsule.position.y + (height ?? 0) / 2 + rise, 0);
  scarf.userData.fittedTo = 'placeholder';
  return true;
}

export function makeRoseScarf({ color = ROSE_SCARF_DYE } = {}) {
  const group = new THREE.Group();
  group.name = 'echo-mara-rose-scarf';
  // Fitted to the shared civic rig's neck (measured: the shoulders round off
  // about 2 cm above the neck bone, the neck is ~6.5 cm in radius, the bun
  // sits low at the back).
  const geometry = mergeScarfParts([
    // The first turn: low and loose, on the shoulders, dipping at the throat.
    scarfBand({ centre: [0.004, 0.03, -0.012], radiusX: 0.09, radiusFront: 0.074, radiusBack: 0.114, sag: -0.018, height: 0.025, thickness: 0.018, seed: 1 }),
    // The second turn, higher and closer, tucked under the bun behind.
    scarfBand({ centre: [0.004, 0.064, -0.01], radiusX: 0.077, radiusFront: 0.071, radiusBack: 0.1, sag: -0.016, height: 0.019, thickness: 0.015, seed: 4 }),
    // The knot, on her left shoulder at the neck.
    scarfKnot({ centre: [0.1, 0.04, -0.004], size: [0.034, 0.03, 0.037], seed: 2 }),
    // The long end over the shoulder and down her back.
    scarfEnd({
      path: [[0.098, 0.03, -0.024], [0.1, 0.022, -0.065], [0.087, -0.008, -0.132], [0.076, -0.06, -0.178], [0.07, -0.14, -0.203], [0.065, -0.24, -0.218], [0.06, -0.34, -0.212]],
      width: 0.074,
      away: [0.12, 0.08, -1],
      seed: 3,
      twist: -0.5,
    }),
    // The short end forward over the shoulder and down her front.
    scarfEnd({
      path: [[0.1, 0.03, 0.016], [0.106, 0.018, 0.048], [0.1, -0.022, 0.102], [0.093, -0.08, 0.137], [0.088, -0.16, 0.16], [0.085, -0.24, 0.161]],
      width: 0.072,
      away: [0.3, 0.08, 1],
      seed: 5,
      twist: 0.75,
      steps: 16,
    }),
  ]);
  const sway = { value: new THREE.Vector4(0, 0, 0, 0) };
  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.92,
    metalness: 0,
    side: THREE.DoubleSide,
  });
  material.name = 'echo-mara-rose-scarf-cloth';
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uScarfSway = sway;
    Object.assign(shader.uniforms, CHAPTER3_CAST_LIGHT);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${SCARF_VERTEX_PARS}`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>\n${SCARF_VERTEX}`);
    // The cast's fill floor (time of day): a highlight that resets emissive
    // can't take it away.
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec4 chapter3CastLight;')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += diffuseColor.rgb * max( chapter3CastLight.z, 0.14 );');
  };
  material.customProgramCacheKey = () => 'echo-mara-rose-scarf';
  const cloth = new THREE.Mesh(geometry, material);
  cloth.name = 'echo-mara-rose-scarf-cloth';
  cloth.castShadow = false;
  cloth.receiveShadow = true;
  cloth.frustumCulled = false;
  // How fast she is walking, from where the scarf was last drawn.
  const last = new THREE.Vector3();
  const here = new THREE.Vector3();
  let lastTime = null;
  let walk = 0;
  cloth.onBeforeRender = () => {
    const now = performance.now() / 1000;
    cloth.getWorldPosition(here);
    if (lastTime !== null) {
      const dt = now - lastTime;
      if (dt > 0 && dt < 0.5) {
        const speed = Math.hypot(here.x - last.x, here.z - last.z) / dt;
        const target = speed > 8 ? 0 : Math.min(1.2, speed / 1.6);
        walk += (target - walk) * Math.min(1, dt * 4);
      }
    }
    last.copy(here);
    lastTime = now;
    sway.value.set(now % 600, walk, 0, 0);
  };
  group.add(cloth);
  group.traverse((child) => {
    child.userData.echoMaterial = true;
    child.userData.characterAsset = 'echo-mara';
  });
  group.userData.sway = sway;
  group.addEventListener('added', () => fitRoseScarf(group));
  return group;
}

export function makeObjectHighlight(object, color = 0x527f77) {
  const materials = [];
  object?.traverse((child) => {
    if (!child.isMesh || !child.material) return;
    if (Array.isArray(child.material)) {
      child.material = child.material.map((material) => material.clone());
      materials.push(...child.material);
    } else {
      child.material = child.material.clone();
      materials.push(child.material);
    }
  });
  let visible = false;
  let intensity = 0.42;
  const apply = () => {
    for (const material of materials) {
      if (!material.emissive) continue;
      material.emissive.setHex(visible ? color : 0x000000);
      material.emissiveIntensity = visible ? intensity : 0;
    }
  };
  return {
    get visible() {
      return visible;
    },
    set visible(value) {
      visible = Boolean(value);
      apply();
    },
    // Breathing-highlight support: a per-frame pulse scales the emissive lift
    // without toggling visibility, so required evidence can call attention to
    // itself before the player has hovered it.
    setIntensity(value) {
      intensity = value;
      apply();
    },
  };
}

export function makeDynamicObjectHighlight(object, color = 0x527f77) {
  let visible = false;
  let intensity = 0.42;
  const apply = () => {
    object?.traverse((child) => {
      if (!child.isMesh || !child.material) return;
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      for (const material of materials) {
        if (!material.emissive) continue;
        material.emissive.setHex(visible ? color : 0x000000);
        material.emissiveIntensity = visible ? intensity : 0;
      }
    });
  };
  return {
    get visible() {
      return visible;
    },
    set visible(value) {
      visible = Boolean(value);
      apply();
    },
    setIntensity(value) {
      intensity = value;
      apply();
    },
  };
}

export function setActorForegroundVisibility(object, enabled) {
  object?.traverse((child) => {
    if (!child.isMesh || !child.material) return;
    if (child.userData.chapter3BaseRenderOrder === undefined) {
      child.userData.chapter3BaseRenderOrder = child.renderOrder;
    }
    child.renderOrder = enabled ? 30 : child.userData.chapter3BaseRenderOrder;
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    for (const material of materials) {
      if (material.userData.chapter3BaseDepthTest === undefined) {
        material.userData.chapter3BaseDepthTest = material.depthTest;
      }
      const nextDepthTest = enabled ? false : material.userData.chapter3BaseDepthTest;
      if (material.depthTest === nextDepthTest) continue;
      material.depthTest = nextDepthTest;
      material.needsUpdate = true;
    }
  });
}

export function makePreservingObjectHighlight(object, color = 0x527f77) {
  const materials = new Map();
  object?.traverse((child) => {
    if (!child.isMesh || !child.material) return;
    const childMaterials = Array.isArray(child.material) ? child.material : [child.material];
    for (const material of childMaterials) {
      if (!material.emissive || materials.has(material)) continue;
      materials.set(material, {
        color: material.emissive.getHex(),
        intensity: material.emissiveIntensity,
      });
    }
  });
  let visible = false;
  return {
    get visible() {
      return visible;
    },
    set visible(value) {
      visible = Boolean(value);
      for (const [material, original] of materials) {
        material.emissive.setHex(visible ? color : original.color);
        material.emissiveIntensity = visible ? Math.max(original.intensity, 0.42) : original.intensity;
      }
    },
  };
}

// A soft amber shaft of light with a pulsing ground ring: marks a
// destination the player has to walk to across the city (the ministry
// front, Eda's stall). Unlit, no shadows: cheap on LOW. Normal blending, so
// it still reads over the pale afternoon paving.
// A view-space fresnel rim added to a lit material's emission, so a small
// figure keeps a warm edge against cobbles in every light (round 3 art pass:
// Butch read as a tiny grey shape). Works with skinned meshes and costs one
// dot product per pixel; the shader key keeps rimmed and plain programs apart.
export function applyRimLight(root, { color = 0xffc27a, strength = 0.85, power = 2.4 } = {}) {
  let count = 0;
  root?.traverse((child) => {
    if (!child.isMesh) return;
    for (const material of Array.isArray(child.material) ? child.material : [child.material]) {
      if (!material || !('emissive' in material) || material.userData.chapter3Rim) continue;
      const rimColor = new THREE.Color(color);
      // Shared uniform objects: setRimLightStrength can retune a compiled
      // material without a recompile.
      const uniforms = {
        chapter3RimColor: { value: rimColor },
        chapter3RimStrength: { value: strength },
        chapter3RimPower: { value: power },
      };
      material.userData.chapter3Rim = { color: rimColor, strength, power, uniforms };
      const previous = material.onBeforeCompile;
      material.onBeforeCompile = (shader, renderer) => {
        previous?.call(material, shader, renderer);
        Object.assign(shader.uniforms, uniforms);
        shader.fragmentShader = shader.fragmentShader
          .replace('#include <common>', '#include <common>\nuniform vec3 chapter3RimColor;\nuniform float chapter3RimStrength;\nuniform float chapter3RimPower;')
          .replace('#include <emissivemap_fragment>', [
            '#include <emissivemap_fragment>',
            'vec3 chapter3RimView = isOrthographic ? vec3( 0.0, 0.0, 1.0 ) : normalize( vViewPosition );',
            // The geometric normal, not the normal-mapped one: a smooth edge
            // instead of speckled cloth detail.
            'float chapter3Rim = pow( 1.0 - saturate( dot( nonPerturbedNormal, chapter3RimView ) ), chapter3RimPower );',
            'totalEmissiveRadiance += chapter3RimColor * chapter3Rim * chapter3RimStrength;',
          ].join('\n'));
      };
      const previousKey = material.customProgramCacheKey?.bind(material);
      material.customProgramCacheKey = () => `${previousKey ? previousKey() : ''}|chapter3-rim`;
      material.needsUpdate = true;
      count += 1;
    }
  });
  return count;
}

export function setRimLightStrength(root, strength) {
  let count = 0;
  root?.traverse((child) => {
    if (!child.isMesh) return;
    for (const material of Array.isArray(child.material) ? child.material : [child.material]) {
      const rim = material?.userData?.chapter3Rim;
      if (!rim) continue;
      rim.strength = strength;
      rim.uniforms.chapter3RimStrength.value = strength;
      count += 1;
    }
  });
  return count;
}

// Alpha round 3 (LOW tier): a per-pixel rim on a figure a few dozen pixels
// tall, at a 0.55–0.8 pixel ratio, shimmers as speckle. On LOW the figure
// gets a clean inverted-hull silhouette instead: each mesh is drawn once
// more, back faces only, pushed out along its normal by a constant number of
// screen pixels, in one flat colour. Skinned meshes share the rig's skeleton,
// so the outline animates with it. Returns { meshes, uniforms }; the caller
// keeps uniforms.chapter3OutlineViewport at the drawing-buffer size.
// depthPush is in normalised depth (about 0.16 m per 0.001 with the city
// camera's 0.1–320 m range).
export function addSilhouetteOutline(root, { color = 0xe0a24a, widthPx = 1.6, opacity = 0.9, depthPush = 0.0018, name = 'chapter3-silhouette-outline' } = {}) {
  const uniforms = {
    chapter3OutlineWidth: { value: widthPx },
    chapter3OutlineViewport: { value: new THREE.Vector2(1600, 900) },
    chapter3OutlineDepthPush: { value: depthPush },
  };
  const material = new THREE.MeshBasicMaterial({
    color, side: THREE.BackSide, transparent: opacity < 1, opacity, depthWrite: false, fog: false, toneMapped: false,
  });
  material.name = name;
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float chapter3OutlineWidth;\nuniform vec2 chapter3OutlineViewport;\nuniform float chapter3OutlineDepthPush;')
      .replace('#include <project_vertex>', [
        '#include <project_vertex>',
        '#ifdef USE_SKINNING',
        '  vec3 chapter3OutlineNormal = normalize( normalMatrix * objectNormal );',
        '#else',
        '  vec3 chapter3OutlineNormal = normalize( normalMatrix * normal );',
        '#endif',
        '  vec2 chapter3OutlineDir = length( chapter3OutlineNormal.xy ) > 1e-4 ? normalize( chapter3OutlineNormal.xy ) : vec2( 0.0 );',
        '  gl_Position.xy += chapter3OutlineDir * chapter3OutlineWidth * 2.0 / chapter3OutlineViewport * gl_Position.w;',
        // Sit a little behind the figure, so a pushed-out back face never
        // shows through a fold of the coat (only the silhouette edge does).
        '  gl_Position.z += chapter3OutlineDepthPush * gl_Position.w;',
      ].join('\n'));
  };
  material.customProgramCacheKey = () => 'chapter3-silhouette-outline';
  const sources = [];
  root?.traverse((child) => {
    if (child.isMesh && !child.userData.chapter3Outline && child.name !== name) sources.push(child);
  });
  const meshes = [];
  for (const source of sources) {
    const outline = source.isSkinnedMesh
      ? new THREE.SkinnedMesh(source.geometry, material)
      : new THREE.Mesh(source.geometry, material);
    if (source.isSkinnedMesh) {
      outline.bind(source.skeleton, source.bindMatrix);
      outline.bindMode = source.bindMode;
    }
    if (source.morphTargetInfluences) outline.morphTargetInfluences = source.morphTargetInfluences;
    outline.name = name;
    outline.userData.chapter3Outline = true;
    outline.frustumCulled = false;
    outline.castShadow = false;
    outline.receiveShadow = false;
    outline.renderOrder = (source.renderOrder ?? 0) - 1;
    outline.position.copy(source.position);
    outline.quaternion.copy(source.quaternion);
    outline.scale.copy(source.scale);
    source.parent?.add(outline);
    meshes.push(outline);
  }
  return { meshes, uniforms, material };
}

export function makeGuidanceBeacon(scene, { name = 'chapter3-guidance-beacon', color = 0xf0a640, height = 9 } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = 4;
  canvas.height = 128;
  const context = canvas.getContext('2d');
  const fade = context.createLinearGradient(0, 0, 0, 128);
  fade.addColorStop(0, 'rgba(255, 255, 255, 0)');
  fade.addColorStop(0.55, 'rgba(255, 255, 255, 0.35)');
  fade.addColorStop(1, 'rgba(255, 255, 255, 1)');
  context.fillStyle = fade;
  context.fillRect(0, 0, 4, 128);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const group = new THREE.Group();
  group.name = name;
  const shaft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.42, 0.62, height, 18, 1, true),
    // Alpha round 4 (P2, "the ministry marker disappeared mid-walk"): the
    // column draws over the roofs between it and the camera, so the walk
    // never loses it behind a building.
    new THREE.MeshBasicMaterial({
      color, map: texture, transparent: true, opacity: 0.5, depthWrite: false, depthTest: false,
      side: THREE.DoubleSide, fog: false, toneMapped: false,
    }),
  );
  shaft.position.y = height / 2;
  shaft.renderOrder = 6;
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.7, 0.88, 40),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.7, depthWrite: false, side: THREE.DoubleSide, fog: false, toneMapped: false }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.04;
  ring.renderOrder = 5;
  shaft.frustumCulled = false;
  group.add(shaft, ring);
  group.visible = false;
  scene.add(group);
  return {
    group,
    get visible() { return group.visible; },
    // `pulse` runs 0..1 and repeats; `strength` fades the whole beacon.
    update({ visible, position, ground = null, elapsed = 0, strength = 1 }) {
      group.visible = Boolean(visible);
      if (!group.visible) return;
      if (position) group.position.set(position.x, Number.isFinite(ground) ? ground : position.y - 0.47, position.z);
      const pulse = (elapsed * 0.6) % 1;
      shaft.material.opacity = (0.5 + 0.18 * Math.sin(elapsed * 2.4)) * strength;
      ring.scale.setScalar(1 + pulse * 1.4);
      ring.material.opacity = 0.9 * (1 - pulse) * strength;
    },
  };
}

export function makeCutInterface(scene) {
  const group = new THREE.Group();
  group.name = 'opening-cut-feed-interface';
  const metal = new THREE.MeshStandardMaterial({ color: 0x6f665c, roughness: 0.52, metalness: 0.48 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x302b27, roughness: 0.86 });
  const addEnd = (x, rotation) => {
    const line = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.25, 12), metal);
    line.rotation.z = Math.PI / 2;
    line.rotation.y = rotation;
    line.position.set(x, 0.12, 0);
    group.add(line);
  };
  addEnd(-0.56, -0.04);
  addEnd(0.56, 0.04);
  const clamp = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.18, 0.42), dark);
  clamp.position.set(0.12, 0.08, 0.02);
  group.add(clamp);
  const highlight = makeObjectHighlight(group);
  // The runtime moves the connector onto the ground message's second row.
  group.visible = false;
  scene.add(group);
  return { group, highlight };
}

export function makeFinalTrainDoor(scene) {
  const group = new THREE.Group();
  group.name = 'chapter3-doorless-carriage-and-single-door-placeholder';
  // The replacement carriage root sits on the rail centreline. The old root
  // used the side-door coordinate as the carriage centre, leaving the train
  // visibly beside the rails while the passengers stood on them.
  group.position.set(-13.7, 0, 34.0);
  group.rotation.y = THREE.MathUtils.degToRad(55);
  const shellMaterial = new THREE.MeshStandardMaterial({ color: 0x3d4544, roughness: 0.68, metalness: 0.34 });
  const doorMaterial = new THREE.MeshStandardMaterial({ color: 0x8d5a3c, roughness: 0.52, metalness: 0.48 });
  const shell = new THREE.Group();
  shell.name = 'chapter3-doorless-carriage-shell-placeholder';
  const frameTop = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.34, 0.42), shellMaterial);
  frameTop.position.y = 1.42;
  const frameLeft = new THREE.Mesh(new THREE.BoxGeometry(0.34, 2.55, 0.42), shellMaterial);
  frameLeft.position.set(-1.2, 0.02, 0);
  const frameRight = frameLeft.clone();
  frameRight.position.x = 1.2;
  shell.add(frameTop, frameLeft, frameRight);
  const door = new THREE.Group();
  door.name = 'chapter3-single-moving-carriage-door';
  door.position.set(1.05, 0, 0);
  door.rotation.y = -Math.PI * 0.48;
  const doorFallback = new THREE.Mesh(new THREE.BoxGeometry(1.95, 2.45, 0.3), doorMaterial);
  doorFallback.name = 'chapter3-single-moving-carriage-door-placeholder';
  doorFallback.position.set(-1.05, 1.22, 0);
  door.add(doorFallback);
  group.add(shell, door);
  group.visible = false;
  scene.add(group);
  return { group, shell, door, doorFallback };
}

export function makeCampfireKettle(scene) {
  const group = new THREE.Group();
  group.name = 'chapter3-campfire-shared-kettle';
  const iron = new THREE.MeshStandardMaterial({ color: 0x272421, roughness: 0.8, metalness: 0.46 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.26, 14, 10), iron);
  body.scale.y = 0.72;
  body.position.y = 0.24;
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.17, 0.06, 12), iron);
  lid.position.y = 0.43;
  const handle = new THREE.Mesh(
    new THREE.TorusGeometry(0.25, 0.025, 6, 16, Math.PI),
    iron,
  );
  handle.position.y = 0.37;
  handle.rotation.x = Math.PI / 2;
  group.add(body, lid, handle);
  group.position.set(-51.75, 0.58, 34.45);
  scene.add(group);
  return group;
}

export function makeMorningCampfireEchoStone(scene) {
  const group = new THREE.Group();
  group.name = 'chapter3-morning-campfire-echo-stone';
  const stoneMaterial = new THREE.MeshStandardMaterial({
    color: 0x597483,
    emissive: 0x102a36,
    emissiveIntensity: 0.22,
    roughness: 0.58,
    metalness: 0.08,
  });
  const stone = new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 0), stoneMaterial);
  stone.name = 'chapter3-morning-campfire-echo-stone-mesh';
  stone.scale.set(0.82, 1.22, 0.72);
  stone.position.y = 0.22;
  stone.rotation.set(0.18, -0.48, 0.12);
  stone.castShadow = true;
  const coatScrap = new THREE.Mesh(
    new THREE.CircleGeometry(0.38, 12),
    new THREE.MeshStandardMaterial({ color: 0x322d34, roughness: 1, side: THREE.DoubleSide }),
  );
  coatScrap.name = 'chapter3-morning-campfire-unclaimed-coat-scrap';
  coatScrap.rotation.x = -Math.PI / 2;
  coatScrap.scale.set(1.4, 0.72, 1);
  coatScrap.position.y = 0.015;
  group.add(coatScrap, stone);
  group.position.set(-52.35, 0.6, 35.05);
  group.visible = false;
  scene.add(group);
  return group;
}

export function makeLampOilStall(scene) {
  const group = new THREE.Group();
  group.name = 'opening-eda-lamp-oil-stall';
  const wood = new THREE.MeshStandardMaterial({ color: 0x4a3022, roughness: 0.88 });
  const paintedWood = new THREE.MeshStandardMaterial({ color: 0x233e49, roughness: 0.82 });
  const canvas = new THREE.MeshStandardMaterial({ color: 0x315f70, roughness: 0.94, side: THREE.DoubleSide });
  const brass = new THREE.MeshStandardMaterial({ color: 0x8b6537, roughness: 0.46, metalness: 0.48 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x8fa09a, roughness: 0.3, metalness: 0.12 });
  const addBox = (size, position, material) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
    mesh.position.set(...position);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  };
  addBox([3.6, 0.12, 2.25], [0, 2.5, 0], canvas);
  addBox([3.15, 0.22, 0.82], [0, 0.92, 0.72], wood);
  addBox([3.2, 0.12, 0.44], [0, 1.66, -0.72], paintedWood);
  for (const x of [-1.55, 1.55]) {
    for (const z of [-0.82, 0.82]) addBox([0.1, 2.5, 0.1], [x, 1.25, z], paintedWood);
  }
  for (const [x, y, z] of [[-1.08, 1.18, 0.6], [-0.45, 1.2, 0.6], [0.55, 1.19, 0.6]]) {
    const canister = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.24, 0.48, 12), brass);
    canister.position.set(x, y, z);
    canister.castShadow = true;
    group.add(canister);
  }
  for (const x of [-0.9, -0.3, 0.3, 0.9]) {
    const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.11, 0.36, 10), glass);
    bottle.position.set(x, 1.9, -0.7);
    group.add(bottle);
  }
  const sign = addBox([1.9, 0.6, 0.1], [0, 2.05, 0.86], paintedWood);
  sign.rotation.x = -0.08;
  const lampMark = new THREE.Mesh(
    new THREE.CircleGeometry(0.18, 18),
    new THREE.MeshBasicMaterial({ color: 0xe1b55f, side: THREE.DoubleSide }),
  );
  lampMark.position.set(0, 2.05, 0.92);
  group.add(lampMark);
  group.position.copy(positionFrom(OPENING_POSITIONS.lampOilStall));
  group.rotation.y = -0.08;
  scene.add(group);
  return group;
}
