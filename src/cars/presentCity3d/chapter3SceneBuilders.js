// Chapter 3 · ECHO CITY — scene builders and interior path helpers.
// Split out of Chapter3OpeningRuntime.js for the 1.0 release so the runtime
// keeps only the story flow. Everything here builds three.js objects; nothing
// here decides what happens next.
import * as THREE from 'three';

import { FIRE_LETTERS, OPENING_POSITIONS } from './chapter3OpeningContent.js';

// The burning ground message sits on the civic paving south-east of the clock.
export const FIRE_SITE = Object.freeze({ x: 6.8, z: 5.8, approachZ: 9.1 });

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

// Alpha round 4 (P1): the Mara ahead's rose scarf, the one colour she
// carries and every witness names. In world metres, built along +Y (the
// neck bone's axis): a thick collar wrap, a knot at the front and two tails
// that hang over her chest. Unlit, so it reads at gameplay zoom at dusk and
// dawn and on the LOW tiers (no lighting maps to lose).
export const ROSE_SCARF_COLOR = 0xe2577a;
export function makeRoseScarf({ color = ROSE_SCARF_COLOR } = {}) {
  const group = new THREE.Group();
  group.name = 'echo-mara-rose-scarf';
  const material = new THREE.MeshBasicMaterial({ color, fog: false });
  const shade = new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(0.72), fog: false });
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.105, 0.05, 10, 22), material);
  collar.rotation.x = Math.PI / 2;
  const wrap = new THREE.Mesh(new THREE.TorusGeometry(0.115, 0.04, 8, 22), shade);
  wrap.rotation.x = Math.PI / 2;
  wrap.position.y = -0.055;
  const knot = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), material);
  knot.position.set(0, -0.06, 0.11);
  const tailGeometry = new THREE.BoxGeometry(0.085, 0.36, 0.03);
  tailGeometry.translate(0, -0.18, 0);
  const tailA = new THREE.Mesh(tailGeometry, material);
  tailA.position.set(-0.03, -0.07, 0.12);
  tailA.rotation.set(0.22, 0, 0.12);
  const tailB = new THREE.Mesh(tailGeometry, shade);
  tailB.position.set(0.035, -0.08, 0.125);
  tailB.rotation.set(0.18, 0, -0.08);
  tailB.scale.y = 0.8;
  group.add(collar, wrap, knot, tailA, tailB);
  group.traverse((child) => {
    if (!child.isMesh) return;
    child.castShadow = false;
    child.frustumCulled = false;
    child.userData.echoMaterial = true;
    child.userData.characterAsset = 'echo-mara';
  });
  group.userData.echoMaterial = true;
  group.userData.characterAsset = 'echo-mara';
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

export function makeDarkSeam(scene, surfaceHeightAt = null) {
  const points = [
    new THREE.Vector3(3.4, 0, 11.5),
    new THREE.Vector3(4.6, 0, 10.5),
    new THREE.Vector3(5.6, 0, 9.4),
    new THREE.Vector3(6.8, 0, 8.6),
    new THREE.Vector3(8.0, 0, 7.7),
    new THREE.Vector3(8.05, 0, 6.8),
    new THREE.Vector3(9.2, 0, 6.0),
    new THREE.Vector3(10.4, 0, 5.3),
  ];

  for (const point of points) {
    const sampled = surfaceHeightAt?.(point.x, point.z);
    point.y = Number.isFinite(sampled) ? sampled : 0.73;
  }

  // The first version used a sequence of equal-width boxes and circles. From
  // the gameplay camera that read as a route-marking decal, not liquid that
  // has settled into old paving. These uneven ribbons deliberately leave the
  // stone visible, tighten through the joins, and open only where oil pooled.
  const makeOrganicRibbon = ({ name, width, material, yOffset, widthScale = 1 }) => {
    const group = new THREE.Group();
    group.name = name;
    for (let index = 0; index < points.length - 1; index += 1) {
      const start = points[index];
      const end = points[index + 1];
      const dx = end.x - start.x;
      const dz = end.z - start.z;
      const length = Math.hypot(dx, dz);
      const normalX = -dz / length;
      const normalZ = dx / length;
      const startWidth = width * (0.72 + ((index * 37) % 5) * 0.07) * widthScale;
      const endWidth = width * (0.66 + ((index * 19 + 2) % 6) * 0.065) * widthScale;
      const vertices = new Float32Array([
        start.x + normalX * startWidth, start.y + yOffset, start.z + normalZ * startWidth,
        start.x - normalX * startWidth, start.y + yOffset, start.z - normalZ * startWidth,
        end.x + normalX * endWidth, end.y + yOffset, end.z + normalZ * endWidth,
        end.x - normalX * endWidth, end.y + yOffset, end.z - normalZ * endWidth,
      ]);
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
      // Face upward so the evidence remains visible from the fixed elevated
      // gameplay camera. The former winding only rendered the round pools.
      geometry.setIndex([0, 2, 1, 1, 2, 3]);
      geometry.computeVertexNormals();
      const segment = new THREE.Mesh(geometry, material);
      group.add(segment);
    }
    scene.add(group);
    return group;
  };

  const spread = makeOrganicRibbon({
    name: 'opening-lamp-oil-seam-spread',
    width: 0.26,
    yOffset: 0.017,
    material: new THREE.MeshStandardMaterial({
      color: 0x503122,
      roughness: 0.3,
      metalness: 0.04,
      transparent: true,
      opacity: 0.66,
      depthWrite: false,
    }),
  });
  const stain = makeOrganicRibbon({
    name: 'opening-lamp-oil-seam',
    width: 0.115,
    yOffset: 0.024,
    material: new THREE.MeshStandardMaterial({
      color: 0x392218,
      roughness: 0.12,
      metalness: 0.02,
      envMapIntensity: 0.68,
    }),
  });
  const wetGlint = makeOrganicRibbon({
    name: 'opening-lamp-oil-seam-wet-glint',
    width: 0.035,
    yOffset: 0.03,
    material: new THREE.MeshStandardMaterial({
      color: 0xc99a63,
      roughness: 0.06,
      metalness: 0.16,
      transparent: true,
      opacity: 0.58,
      depthWrite: false,
    }),
  });
  // A few asymmetric pools are enough to explain the material without turning
  // the entire evidence route into a decorative stripe.
  for (const [index, point] of points.entries()) {
    if ([0, 3, 5, points.length - 1].includes(index)) {
      const spill = new THREE.Mesh(
        new THREE.CircleGeometry(index === 0 ? 0.23 : 0.16, 14),
        new THREE.MeshStandardMaterial({
          color: index === 0 ? 0x26150f : 0x1b100d,
          roughness: 0.1,
          metalness: 0.06,
          transparent: true,
          opacity: 0.7,
          depthWrite: false,
        }),
      );
      spill.rotation.x = -Math.PI / 2;
      spill.scale.set(1.42, 0.58 + (index % 2) * 0.14, 1);
      spill.position.set(point.x, point.y + 0.027, point.z);
      spill.rotation.z = index * 0.47;
      stain.add(spill);
    }
  }
  spread.renderOrder = 1;
  stain.renderOrder = 2;
  wetGlint.renderOrder = 3;
  const outline = makeOrganicRibbon({
    name: 'opening-lamp-oil-seam-highlight',
    width: 0.28,
    yOffset: 0.047,
    material: new THREE.MeshBasicMaterial({ color: 0xd59b54, transparent: true, opacity: 0.82, depthWrite: false }),
  });
  outline.visible = false;
  return { spread, stain, wetGlint, outline, points };
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
    new THREE.MeshBasicMaterial({
      color, map: texture, transparent: true, opacity: 0.5, depthWrite: false,
      side: THREE.DoubleSide, fog: false, toneMapped: false,
    }),
  );
  shaft.position.y = height / 2;
  shaft.renderOrder = 5;
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.7, 0.88, 40),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.7, depthWrite: false, side: THREE.DoubleSide, fog: false, toneMapped: false }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.04;
  ring.renderOrder = 5;
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

export function makeGroundMessage(scene, surfaceHeightAt = null) {
  const messageGroup = new THREE.Group();
  messageGroup.name = 'chapter3-burning-ground-message';
  const fireGround = surfaceHeightAt?.(FIRE_SITE.x, FIRE_SITE.z);
  messageGroup.position.set(FIRE_SITE.x, Number.isFinite(fireGround) ? fireGround : 0.73, FIRE_SITE.z);
  messageGroup.rotation.y = 0.845;
  scene.add(messageGroup);

  const makeParticleTexture = (kind) => {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const context = canvas.getContext('2d');
    if (kind === 'flame') {
      // Small warm flame kernel: orange base, bright yellow core, transparent tip.
      const gradient = context.createLinearGradient(64, 120, 64, 8);
      gradient.addColorStop(0, 'rgba(255,62,18,0.98)');
      gradient.addColorStop(0.36, 'rgba(255,132,38,0.96)');
      gradient.addColorStop(0.72, 'rgba(255,198,86,0.84)');
      gradient.addColorStop(1, 'rgba(255,248,190,0)');
      context.fillStyle = gradient;
      context.beginPath();
      context.moveTo(64, 124);
      context.bezierCurveTo(34, 118, 26, 84, 46, 62);
      context.bezierCurveTo(54, 50, 50, 34, 64, 8);
      context.bezierCurveTo(74, 34, 82, 50, 82, 64);
      context.bezierCurveTo(102, 86, 94, 118, 64, 124);
      context.closePath();
      context.fill();
      context.globalCompositeOperation = 'lighter';
      const core = context.createRadialGradient(64, 92, 2, 64, 92, 26);
      core.addColorStop(0, 'rgba(255,250,210,0.58)');
      core.addColorStop(0.5, 'rgba(255,180,80,0.38)');
      core.addColorStop(1, 'rgba(255,80,30,0)');
      context.fillStyle = core;
      context.fillRect(32, 60, 64, 60);
    } else {
      // Warm ember spark.
      const gradient = context.createRadialGradient(64, 64, 1, 64, 64, 58);
      gradient.addColorStop(0, 'rgba(255,246,200,1)');
      gradient.addColorStop(0.28, 'rgba(255,162,58,0.86)');
      gradient.addColorStop(0.6, 'rgba(255,94,24,0.34)');
      gradient.addColorStop(1, 'rgba(255,58,15,0)');
      context.fillStyle = gradient;
      context.fillRect(0, 0, 128, 128);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  };
  const flameTexture = makeParticleTexture('flame');
  const emberTexture = makeParticleTexture('ember');

  const makeSmokeTexture = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const context = canvas.getContext('2d');
    const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 60);
    gradient.addColorStop(0, 'rgba(150,150,150,0.55)');
    gradient.addColorStop(0.4, 'rgba(130,130,130,0.22)');
    gradient.addColorStop(1, 'rgba(110,110,110,0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 128, 128);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  };
  const smokeTexture = makeSmokeTexture();

  const makeFireFlipbookAtlas = () => {
    const frames = 8;
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = frames * size;
    canvas.height = size;
    const context = canvas.getContext('2d');
    for (let frame = 0; frame < frames; frame += 1) {
      const originX = frame * size;
      context.save();
      context.translate(originX, 0);
      context.clearRect(0, 0, size, size);
      context.globalCompositeOperation = 'lighter';
      const ribbons = 4;
      for (let ribbon = 0; ribbon < ribbons; ribbon += 1) {
        const phase = (frame + ribbon * 2) / frames;
        const gradient = context.createLinearGradient(
          size * 0.5, size * 0.9, size * 0.5 + Math.sin(phase * Math.PI * 2) * 18, size * 0.1,
        );
        gradient.addColorStop(0, 'rgba(255,55,10,0)');
        gradient.addColorStop(0.25, 'rgba(255,85,22,0.55)');
        gradient.addColorStop(0.55, 'rgba(255,150,50,0.85)');
        gradient.addColorStop(0.8, 'rgba(255,210,100,0.55)');
        gradient.addColorStop(1, 'rgba(255,250,200,0)');
        context.fillStyle = gradient;
        context.beginPath();
        const baseX = size * 0.5 + Math.sin((ribbon * 3 + frame) * 0.7) * 18;
        const sway = Math.sin(frame * 0.9 + ribbon * 1.3) * 14;
        context.moveTo(baseX - 12, size * 0.88);
        context.quadraticCurveTo(baseX - 24 + sway, size * 0.52, baseX + sway * 0.5, size * 0.1);
        context.quadraticCurveTo(baseX + 24 + sway, size * 0.52, baseX + 12, size * 0.88);
        context.closePath();
        context.fill();
      }
      context.restore();
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  };
  const flameAtlas = makeFireFlipbookAtlas();

  const findStrongGlyphColumns = (pixelData, canvasWidth, canvasHeight, rowOffset, worldWidth, worldDepth, count = 6) => {
    const step = 16;
    const candidates = [];
    for (let px = 0; px < canvasWidth; px += step) {
      let score = 0;
      let bottomY = -1;
      for (let py = 0; py < canvasHeight; py += 2) {
        const alpha = pixelData[(py * canvasWidth + px) * 4 + 3];
        if (alpha >= 90) {
          score += 1;
          bottomY = Math.max(bottomY, py);
        }
      }
      if (score > 0) candidates.push({ px, score, bottomY });
    }
    candidates.sort((a, b) => b.score - a.score || a.px - b.px);
    const chosen = [];
    const minSeparation = canvasWidth / 18;
    for (const candidate of candidates) {
      if (chosen.some((entry) => Math.abs(entry.px - candidate.px) < minSeparation)) continue;
      chosen.push(candidate);
      if (chosen.length === count) break;
    }
    while (chosen.length < count) {
      const px = Math.round((chosen.length + 0.5) * (canvasWidth / count));
      chosen.push({ px, score: 1, bottomY: Math.round(canvasHeight * 0.85) });
    }
    chosen.sort((a, b) => a.px - b.px);
    return chosen.map((candidate) => {
      const localX = (candidate.px / canvasWidth - 0.5) * worldWidth;
      const localZ = rowOffset + (candidate.bottomY / canvasHeight - 0.5) * worldDepth;
      return { x: localX, z: localZ };
    });
  };

  const makeLine = (text, rowOffset, color) => {
    const sourceCanvas = document.createElement('canvas');
    // Oversample the lettering. The close isometric shot turns a 2k canvas
    // soft before it turns the message into a landmark.
    sourceCanvas.width = 4096;
    sourceCanvas.height = 640;
    const context = sourceCanvas.getContext('2d');
    // Release pass: the game's voice face (Georgia, bold capitals), sized to
    // fill the groove so the whole sentence reads from the fixed camera. The
    // fire clings to the stroke bottoms found below.
    context.textAlign = 'left';
    context.textBaseline = 'middle';
    context.fillStyle = '#ffffff';
    context.shadowColor = 'transparent';
    context.shadowBlur = 0;
    context.lineJoin = 'round';
    const tracking = 34;
    let fontSize = 330;
    const measure = () => {
      context.font = `700 ${fontSize}px Georgia, "Times New Roman", "DejaVu Serif", serif`;
      const widths = [...text].map((character) => context.measureText(character).width);
      return { widths, total: widths.reduce((sum, width) => sum + width, 0) + tracking * Math.max(0, widths.length - 1) };
    };
    let fit = measure();
    while (fit.total > sourceCanvas.width * 0.92 && fontSize > 180) {
      fontSize -= 10;
      fit = measure();
    }
    const glyphWidths = fit.widths;
    const trackedWidth = fit.total;
    let glyphX = (sourceCanvas.width - trackedWidth) / 2;
    [...text].forEach((character, index) => {
      const baselineJitter = ((index * 7) % 5 - 2) * 1.2;
      if (character !== ' ') {
        context.save();
        context.translate(glyphX, sourceCanvas.height / 2 + baselineJitter);
        // A barely perceptible per-letter slant, slight compression and a
        // gentle forward shear give the line an editorial hand-painted rhythm
        // without becoming cursive or calligraphic.
        context.rotate(((index * 13) % 7 - 3) * 0.007);
        context.scale(0.96, 1);
        context.fillText(character, 0, 0);
        context.restore();
      }
      glyphX += glyphWidths[index] + tracking;
    });
    const pixelData = context.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height).data;
    const displayCanvas = document.createElement('canvas');
    displayCanvas.width = sourceCanvas.width;
    displayCanvas.height = sourceCanvas.height;
    const displayContext = displayCanvas.getContext('2d');
    displayContext.drawImage(sourceCanvas, 0, 0);
    const texture = new THREE.CanvasTexture(displayCanvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const outlineSourceCanvas = document.createElement('canvas');
    outlineSourceCanvas.width = sourceCanvas.width;
    outlineSourceCanvas.height = sourceCanvas.height;
    const outlineSourceContext = outlineSourceCanvas.getContext('2d');
    // Dark charred gutter: a thick outline that reads as burned paving and
    // gives the fire a clear ground boundary.
    const outlineRadius = 14;
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 10) {
      outlineSourceContext.drawImage(
        sourceCanvas,
        Math.cos(angle) * outlineRadius,
        Math.sin(angle) * outlineRadius,
      );
    }
    const outlineDisplayCanvas = document.createElement('canvas');
    outlineDisplayCanvas.width = sourceCanvas.width;
    outlineDisplayCanvas.height = sourceCanvas.height;
    const outlineDisplayContext = outlineDisplayCanvas.getContext('2d');
    outlineDisplayContext.drawImage(outlineSourceCanvas, 0, 0);
    const outlineTexture = new THREE.CanvasTexture(outlineDisplayCanvas);
    outlineTexture.colorSpace = THREE.SRGBColorSpace;
    const glyphWorldWidth = 11.2;
    const glyphWorldDepth = 1.32;

    // Charred gutter strip recessed into the groove.
    const charred = new THREE.Mesh(
      new THREE.PlaneGeometry(11.65, 1.68),
      new THREE.MeshBasicMaterial({
        map: outlineTexture, color: 0x14080d, transparent: true, depthWrite: false, opacity: 0.96,
      }),
    );
    charred.rotation.x = -Math.PI / 2;
    charred.position.set(0, 0.006, rowOffset);
    charred.renderOrder = 4;

    // Soft warm wash behind the line, kept very low so it never competes.
    const glow = new THREE.Mesh(
      new THREE.PlaneGeometry(11.8, 1.8),
      new THREE.MeshBasicMaterial({
        map: texture, transparent: true, depthWrite: false, opacity: 0.07,
        color: 0xff4422,
        blending: THREE.AdditiveBlending,
      }),
    );
    glow.rotation.x = -Math.PI / 2;
    glow.position.set(0, 0.008, rowOffset);
    glow.renderOrder = 6;

    // The message itself: emissive strip inside the groove, rendered above every fire layer.
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(11.48, 1.58),
      // Evidence lettering must remain readable above the station stair lip.
      // Disable depth testing only for this authored decal, not the fire.
      new THREE.MeshBasicMaterial({ map: texture, color, transparent: true, depthTest: false, depthWrite: false, opacity: 1.0, fog: false, toneMapped: false }),
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(0, 0.010, rowOffset);
    mesh.renderOrder = 8;

    // A continuous but varied low fire follows the painted stroke bottoms.
    // The text remains the sharp top layer, so density reads as burning oil
    // without turning into an opaque curtain.
    const edgeFireCount = 180;
    const edgePositions = new Float32Array(edgeFireCount * 3);
    const edgeBases = new Float32Array(edgeFireCount * 3);
    const edgePhases = new Float32Array(edgeFireCount);
    const edgeCandidates = [];
    // Walk columns and find the lowest painted pixel in the full glyph mask.
    // The letters are vertically centred in this texture, so scanning only
    // the bottom 18% produced an empty particle geometry.
    for (let px = 0; px < sourceCanvas.width; px += 4) {
      let bottomY = -1;
      for (let py = sourceCanvas.height - 10; py >= 0; py -= 4) {
        if (pixelData[(py * sourceCanvas.width + px) * 4 + 3] >= 90) {
          bottomY = py;
          break;
        }
      }
      if (bottomY < 0) continue;
      edgeCandidates.push({ px, bottomY });
    }
    // Resample across the complete sentence. Stopping after the first N
    // painted columns starved the right half of each line.
    const accepted = Math.min(edgeFireCount, edgeCandidates.length);
    for (let sample = 0; sample < accepted; sample += 1) {
      const candidateIndex = Math.min(
        edgeCandidates.length - 1,
        Math.floor((sample + 0.5) * edgeCandidates.length / accepted),
      );
      const { px, bottomY } = edgeCandidates[candidateIndex];
      const index = sample * 3;
      const localX = (px / sourceCanvas.width - 0.5) * glyphWorldWidth;
      const localZ = rowOffset + (bottomY / sourceCanvas.height - 0.5) * glyphWorldDepth;
      edgePositions[index] = edgeBases[index] = localX + (Math.random() - 0.5) * 0.06;
      edgePositions[index + 1] = edgeBases[index + 1] = 0.015;
      edgePositions[index + 2] = edgeBases[index + 2] = localZ + (Math.random() - 0.5) * 0.04;
      edgePhases[sample] = (px * 0.017 + rowOffset) % 1;
    }
    const edgeGeometry = new THREE.BufferGeometry();
    edgeGeometry.setAttribute('position', new THREE.BufferAttribute(edgePositions, 3));
    edgeGeometry.setDrawRange(0, accepted);
    const flames = new THREE.Points(
      edgeGeometry,
      new THREE.PointsMaterial({
        color: 0xff7f24,
        map: flameTexture,
        alphaTest: 0.03,
        size: 0.34,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    flames.name = 'burning-letter-edge-flames';
    flames.renderOrder = 5;
    flames.userData.basePositions = edgeBases;
    flames.userData.phases = edgePhases;
    flames.userData.particleCount = accepted;

    const flameCores = flames.clone();
    flameCores.name = 'burning-letter-warm-flame-cores';
    flameCores.material = new THREE.PointsMaterial({
      color: 0xffc95c,
      map: flameTexture,
      alphaTest: 0.03,
      size: 0.19,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    flameCores.renderOrder = 5;

    const embers = flames.clone();
    embers.name = 'burning-letter-rising-embers';
    embers.material = new THREE.PointsMaterial({
      color: 0xffb84a,
      map: emberTexture,
      alphaTest: 0.02,
      size: 0.065,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    embers.renderOrder = 5;

    // Wind-driven smoke above the line.
    const smokeCount = 32;
    const smokePositions = new Float32Array(smokeCount * 3);
    const smokeBases = new Float32Array(smokeCount * 3);
    const smokePhases = new Float32Array(smokeCount);
    const smokeSpeeds = new Float32Array(smokeCount);
    for (let index = 0; index < smokeCount; index += 1) {
      const positionIndex = index * 3;
      const u = (index % 8) / 7;
      const v = Math.floor(index / 8) / 5;
      const localX = (u - 0.5) * glyphWorldWidth * 0.9 + Math.sin(index * 3.7) * 0.15;
      const localZ = rowOffset + (v - 0.5) * glyphWorldDepth * 2.2 + Math.cos(index * 2.3) * 0.12;
      smokePositions[positionIndex] = smokeBases[positionIndex] = localX;
      smokePositions[positionIndex + 1] = smokeBases[positionIndex + 1] = 0.006;
      smokePositions[positionIndex + 2] = smokeBases[positionIndex + 2] = localZ;
      smokePhases[index] = (index * 0.17 + rowOffset * 0.3) % 1;
      smokeSpeeds[index] = 0.08 + (index % 5) * 0.03;
    }
    const smokeGeometry = new THREE.BufferGeometry();
    smokeGeometry.setAttribute('position', new THREE.BufferAttribute(smokePositions, 3));
    const smoke = new THREE.Points(
      smokeGeometry,
      new THREE.PointsMaterial({
        color: 0x8a8a8a,
        map: smokeTexture,
        alphaTest: 0.02,
        size: 0.38,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.2,
        depthWrite: false,
        blending: THREE.NormalBlending,
      }),
    );
    smoke.name = 'burning-letter-smoke';
    smoke.renderOrder = 4;
    smoke.userData.basePositions = smokeBases;
    smoke.userData.phases = smokePhases;
    smoke.userData.speeds = smokeSpeeds;

    // Larger flame tongues reinforce strong stroke terminals while small edge
    // kernels fill the gaps. Their phases and sizes alternate to avoid a wall.
    const flameBand = new THREE.Group();
    flameBand.name = 'burning-letter-irregular-watercolor-flame-clusters';
    const flameAnchors = findStrongGlyphColumns(
      pixelData,
      sourceCanvas.width,
      sourceCanvas.height,
      rowOffset,
      glyphWorldWidth,
      glyphWorldDepth,
      14,
    );
    flameAnchors.forEach((anchor, index) => {
      const map = flameAtlas.clone();
      map.wrapS = THREE.RepeatWrapping;
      map.repeat.set(1 / 8, 1);
      map.offset.set((index % 8) / 8, 0);
      map.needsUpdate = true;
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
        map,
        color: index % 2 ? 0xff9a42 : 0xffc266,
        transparent: true,
        opacity: 0.86,
        depthTest: false,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }));
      sprite.position.set(anchor.x, 0.31, anchor.z);
      sprite.scale.set(0.38 + (index % 4) * 0.055, 0.64 + (index % 3) * 0.1, 1);
      sprite.renderOrder = 7;
      sprite.userData.phase = index * 1.37 + rowOffset;
      flameBand.add(sprite);
    });

    const heatHaze = new THREE.Group();
    heatHaze.name = 'burning-letter-watercolor-heat-haze';

    const selection = new THREE.Mesh(
      new THREE.PlaneGeometry(11.65, 1.68),
      new THREE.MeshBasicMaterial({
        map: texture,
        color: 0x8ed5c8,
        transparent: true,
        depthWrite: false,
        opacity: 0.52,
        blending: THREE.AdditiveBlending,
      }),
    );
    selection.rotation.x = -Math.PI / 2;
    selection.position.set(0, 0.012, rowOffset);
    selection.visible = false;
    selection.renderOrder = 9;

    messageGroup.add(charred, glow, mesh, embers, flames, flameCores, flameBand, heatHaze, smoke, selection);
    return {
      charred,
      mesh,
      glow,
      heatHaze,
      flames,
      flameCores,
      flameBand,
      embers,
      smoke,
      selection,
      worldWidth: glyphWorldWidth,
      ignitionProgress: 1,
      setReveal(progress) {
        const reveal = THREE.MathUtils.clamp(progress, 0, 1);
        this.ignitionProgress = reveal;
        displayContext.clearRect(0, 0, displayCanvas.width, displayCanvas.height);
        outlineDisplayContext.clearRect(0, 0, outlineDisplayCanvas.width, outlineDisplayCanvas.height);
        const cropWidth = Math.max(1, Math.round(sourceCanvas.width * reveal));
        if (reveal > 0) {
          displayContext.drawImage(
            sourceCanvas,
            0, 0, cropWidth, sourceCanvas.height,
            0, 0, cropWidth, sourceCanvas.height,
          );
          outlineDisplayContext.drawImage(
            outlineSourceCanvas,
            0, 0, cropWidth, outlineSourceCanvas.height,
            0, 0, cropWidth, outlineSourceCanvas.height,
          );
        }
        texture.needsUpdate = true;
        outlineTexture.needsUpdate = true;
      },
    };
  };

  // Carved groove slab beneath both rows. The text faces read as emissive strips
  // just inside the recess, not planes floating above the ground.
  const grooveSlab = new THREE.Mesh(
    new THREE.BoxGeometry(12.3, 0.04, 4.5),
    new THREE.MeshBasicMaterial({ color: 0x050205, transparent: true, opacity: 0.12, depthWrite: false }),
  );
  grooveSlab.name = 'burning-message-groove-slab';
  // Keep the backing below the paving plane. The previous top face sat above
  // the lettering and turned the evidence into two opaque black rectangles.
  grooveSlab.position.set(0, -0.045, 1.45);
  messageGroup.add(grooveSlab);

  // Two rows, read top to bottom from the fixed camera (local +Z moves down the
  // frame). Warm ivory-amber ink reads against both the flames and the dark
  // paving; the runtime frames the pair centred with nothing over it.
  const firstEffect = makeLine(FIRE_LETTERS.first, 0.25, '#ffb44e');
  const secondEffect = makeLine(FIRE_LETTERS.second, 2.35, '#ffa13a');
  const highlight = {
    get visible() {
      return firstEffect.selection.visible || secondEffect.selection.visible;
    },
    set visible(value) {
      firstEffect.selection.visible = Boolean(value);
      secondEffect.selection.visible = Boolean(value);
    },
  };
  const firstLight = new THREE.PointLight(0xff6b2d, 17, 11, 1.6);
  firstLight.position.set(0, 0.35, 0.25);
  const secondLight = new THREE.PointLight(0xff8a35, 17, 11, 1.6);
  secondLight.position.set(0, 0.35, 2.35);
  messageGroup.add(firstLight, secondLight);
  messageGroup.updateMatrixWorld(true);
  const interfacePosition = messageGroup.localToWorld(new THREE.Vector3(-6.05, 0.08, 2.35));
  const setEffectVisible = (effect, visible) => {
    effect.setReveal(visible ? 1 : 0);
    effect.charred.visible = visible;
    effect.mesh.visible = visible;
    effect.glow.visible = visible;
    effect.heatHaze.visible = visible;
    effect.flames.visible = visible;
    effect.flameCores.visible = visible;
    effect.flameBand.visible = visible;
    effect.embers.visible = visible;
    effect.smoke.visible = visible;
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
      if (visible) messageGroup.visible = true;
      setEffectVisible(firstEffect, visible);
      firstLight.visible = visible;
    },
    setSecondBurning(visible) {
      if (visible) messageGroup.visible = true;
      setEffectVisible(secondEffect, visible);
      secondLight.visible = visible;
    },
    setSecondIgnitionProgress(progress) {
      const reveal = THREE.MathUtils.clamp(progress, 0, 1);
      secondEffect.setReveal(reveal);
      secondEffect.mesh.visible = reveal > 0;
      secondEffect.charred.visible = reveal > 0;
      secondEffect.glow.visible = reveal > 0;
      secondEffect.heatHaze.visible = reveal > 0;
      secondEffect.flames.visible = reveal > 0;
      secondEffect.flameCores.visible = reveal > 0;
      secondEffect.flameBand.visible = reveal > 0;
      secondEffect.embers.visible = reveal > 0;
      secondEffect.smoke.visible = reveal > 0;
      secondLight.visible = reveal > 0;
      secondLight.intensity = 17 * reveal;
    },
    setBurnedOut() {
      // Morning investigation needs the charred stone letters, but they must
      // not exist as a black slab during the opening market investigation.
      messageGroup.visible = true;
      firstEffect.flames.visible = false;
      firstEffect.flameCores.visible = false;
      firstEffect.flameBand.visible = false;
      firstEffect.heatHaze.visible = false;
      firstEffect.embers.visible = false;
      firstEffect.smoke.visible = false;
      firstEffect.glow.visible = false;
      secondEffect.flames.visible = false;
      secondEffect.flameCores.visible = false;
      secondEffect.flameBand.visible = false;
      secondEffect.heatHaze.visible = false;
      secondEffect.embers.visible = false;
      secondEffect.smoke.visible = false;
      secondEffect.glow.visible = false;
      firstLight.visible = false;
      secondLight.visible = false;
      firstEffect.mesh.material.color.setHex(0x2f1d18);
      secondEffect.mesh.material.color.setHex(0x2f1d18);
      firstEffect.mesh.material.opacity = 0.74;
      secondEffect.mesh.material.opacity = 0.74;
    },
  };
  messageGroup.visible = false;
  api.setFirstBurning(false);
  api.setSecondBurning(false);
  return api;
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
