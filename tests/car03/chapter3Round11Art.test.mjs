import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import * as THREE from 'three';

import {
  OIL_SEAM_ROUTE,
  UNLIT_OIL_DARKNESS,
  jointPath,
} from '../../src/cars/presentCity3d/chapter3OilArt.js';
import {
  ROSE_SCARF_COLOR,
  ROSE_SCARF_DYE,
  fitRoseScarf,
  makeRoseScarf,
} from '../../src/cars/presentCity3d/chapter3SceneBuilders.js';

// Round 11 (George's playtest notes, 2026-10-10): the oil, the burning
// letters and Mara's scarf.
const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const oilArt = read('src/cars/presentCity3d/chapter3OilArt.js');
const runtime = read('src/cars/presentCity3d/Chapter3OpeningRuntime.js');

// A paving of 0.42 x 0.3 m setts in staggered courses, joints 2.4 cm wide.
function setts(x, z) {
  const course = Math.floor(z / 0.3);
  const inCourse = ((z % 0.3) + 0.3) % 0.3;
  const offset = course % 2 ? 0.21 : 0;
  const along = (((x + offset) % 0.42) + 0.42) % 0.42;
  const nearCourse = Math.min(inCourse, 0.3 - inCourse);
  const nearSett = Math.min(along, 0.42 - along);
  return Math.min(nearCourse, nearSett) < 0.012 ? 1 : 0;
}

function hsl(hex) {
  const color = new THREE.Color(hex);
  const out = {};
  color.getHSL(out, THREE.SRGBColorSpace);
  return out;
}

describe('Chapter 3 round 11 · the oil line follows the joints', () => {
  it('finds a path that stays in the mortar near the authored route', () => {
    const route = OIL_SEAM_ROUTE.map(([x, z]) => [x, z]);
    const path = jointPath(route, setts);
    assert.ok(path && path.length > 8, 'a path along the joints');
    // Walk the path in 1 cm steps: nearly all of it lies in a joint.
    let inJoint = 0;
    let samples = 0;
    let farthest = 0;
    for (let index = 0; index < path.length - 1; index += 1) {
      const [ax, az] = path[index];
      const [bx, bz] = path[index + 1];
      const steps = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / 0.01));
      for (let step = 0; step < steps; step += 1) {
        const t = step / steps;
        const x = ax + (bx - ax) * t;
        const z = az + (bz - az) * t;
        samples += 1;
        // Within half a joint of one (the grid is sampled at 1.4 cm).
        if (setts(x, z) || setts(x + 0.01, z) || setts(x - 0.01, z) || setts(x, z + 0.01) || setts(x, z - 0.01)) inJoint += 1;
        let nearest = Infinity;
        for (let r = 0; r < route.length - 1; r += 1) {
          const [px, pz] = route[r];
          const [qx, qz] = route[r + 1];
          const dx = qx - px;
          const dz = qz - pz;
          const u = Math.min(1, Math.max(0, ((x - px) * dx + (z - pz) * dz) / (dx * dx + dz * dz)));
          nearest = Math.min(nearest, Math.hypot(x - px - dx * u, z - pz - dz * u));
        }
        farthest = Math.max(farthest, nearest);
      }
    }
    assert.ok(inJoint / samples > 0.93, `in the joints ${(inJoint / samples).toFixed(3)}`);
    assert.ok(farthest < 0.6, `stays by the route (${farthest.toFixed(2)} m)`);
    // It starts and ends where the authored line does.
    assert.ok(Math.hypot(path[0][0] - route[0][0], path[0][1] - route[0][1]) < 0.3);
    assert.ok(Math.hypot(path.at(-1)[0] - route.at(-1)[0], path.at(-1)[1] - route.at(-1)[1]) < 0.3);
  });

  it('keeps the runtime\'s oil API: hit points, outline, a lit decal on the paving', () => {
    assert.match(runtime, /this\.seam = makeDarkSeam\(scene, \(x, z\) => this\.preview\.surfaceHeightAt\(x, z\)\);/);
    assert.match(oilArt, /return \{\n\s+stain,\n\s+outline,\n\s+points,/);
    // Lit, shadowed and graded like the stone it soaked into; not emissive.
    assert.match(oilArt, /const material = new THREE\.MeshStandardMaterial\(\{\n\s+color: 0xffffff,\n\s+roughness: 0\.95,/);
    assert.match(oilArt, /stain\.receiveShadow = true;/);
    assert.match(oilArt, /roughnessFactor = mix\( roughnessFactor, 0\.11, oilWet \);/);
    assert.doesNotMatch(oilArt, /opening-lamp-oil-seam-wet-glint/);
  });
});

describe('Chapter 3 round 11 · the burning letters', () => {
  it('animates on the GPU and leaves the runtime loop nothing to move', () => {
    assert.match(oilArt, /mesh\.userData\.particleCount = 0;/);
    assert.match(oilArt, /mesh\.userData\.basePositions = new Float32Array\(0\);/);
    // Ignition is a uniform now, not a 4096 px canvas redrawn every frame.
    const setReveal = oilArt.slice(oilArt.indexOf('setReveal(progress) {'), oilArt.indexOf('setReveal(progress) {') + 200);
    assert.doesNotMatch(setReveal, /drawImage|needsUpdate/);
    // The second row's light is never switched on at the climax (a new light
    // recompiles every material): it waits at zero intensity.
    const ignite = oilArt.slice(oilArt.indexOf('setSecondIgnitionProgress(progress) {'), oilArt.indexOf('setSecondIgnitionProgress(progress) {') + 260);
    assert.match(ignite, /secondLight\.visible = true;/);
    assert.doesNotMatch(ignite, /secondLight\.visible = reveal > 0;/);
    // LOW / LOWEST (no shadow maps) draw a share of the flames.
    assert.match(oilArt, /geometry\.instanceCount = renderer\.shadowMap\.enabled \? full : Math\.max\(1, Math\.round\(full \* lowShare\)\);/);
  });

  it('shows the lower row as dark oil before it is lit, and chars both by morning', () => {
    assert.ok(UNLIT_OIL_DARKNESS > 0 && UNLIT_OIL_DARKNESS < 0.8, 'dark, not yet a sentence');
    assert.match(oilArt, /secondEffect\.setState\(\{ visible: true, lit: visible, reveal: visible \? 1 : 0 \}\);/);
    assert.match(oilArt, /firstEffect\.setState\(\{ charred: true \}\);\n\s+secondEffect\.setState\(\{ charred: true \}\);/);
    // Flames stand on the strokes (seeded from the glyph mask), lit by a
    // line-source falloff; the letters keep the house face.
    assert.match(oilArt, /const anchors = strokeAnchors\(context, soft,/);
    assert.match(oilArt, /new THREE\.PointLight\(color, 17, 15, 1\.1\)/);
    assert.match(oilArt, /700 \$\{fontSize\}px EB Garamond, Georgia/);
  });
});

describe('Chapter 3 round 11 · Mara\'s rose scarf', () => {
  it('is matte rose cloth with a knot and two ends, not a ring', () => {
    const scarf = makeRoseScarf();
    const cloth = scarf.getObjectByName('echo-mara-rose-scarf-cloth');
    assert.ok(cloth?.isMesh);
    assert.ok(cloth.material.isMeshStandardMaterial, 'lit like the street');
    assert.ok(cloth.material.roughness >= 0.85, 'matte');
    cloth.geometry.computeBoundingBox();
    const box = cloth.geometry.boundingBox;
    // The ends fall well below the neck, front and back.
    assert.ok(box.min.y < -0.3, 'the long end hangs down her back');
    assert.ok(box.max.z > 0.14 && box.min.z < -0.2, 'one end in front, one behind');
    // Knotted on one side: the cloth is not symmetric about her spine.
    assert.ok(box.max.x > -box.min.x + 0.03, 'the knot and ends sit on her left');
    // The ends sway (aHang > 0); the wrap round the neck does not.
    const hang = cloth.geometry.getAttribute('aHang');
    assert.ok(Math.max(...hang.array) > 0.99 && Math.min(...hang.array) === 0);
    // A dusty rose: rose hue, not neon.
    const swatch = hsl(ROSE_SCARF_COLOR);
    assert.ok(swatch.h * 360 > 335 && swatch.h * 360 < 355, 'the story rose (#C8506A)');
    const dye = hsl(ROSE_SCARF_DYE);
    assert.ok(dye.s < 0.5 && dye.l < 0.6, 'a dusty dye');
    assert.equal(cloth.material.color.getHex(), new THREE.Color(ROSE_SCARF_DYE).getHex());
  });

  it('fits itself to the bone it is tied to: her body frame, world metres', () => {
    const scene = new THREE.Scene();
    const host = new THREE.Group();
    host.rotation.y = 0.7;
    const rig = new THREE.Group();
    rig.scale.setScalar(0.01);
    const neck = new THREE.Bone();
    neck.rotation.set(0.4, -0.3, 1.2);
    neck.position.set(0, 140, 0);
    rig.add(neck);
    host.add(rig);
    scene.add(host);
    const scarf = makeRoseScarf();
    scarf.scale.setScalar(145);
    neck.add(scarf);
    assert.equal(scarf.userData.fittedTo, 'bone');
    scene.updateMatrixWorld(true);
    const world = scarf.getWorldQuaternion(new THREE.Quaternion());
    assert.ok(world.angleTo(host.getWorldQuaternion(new THREE.Quaternion())) < 1e-4, 'upright, facing her way');
    const scale = scarf.getWorldScale(new THREE.Vector3());
    for (const axis of scale.toArray()) assert.ok(Math.abs(axis - 1) < 1e-4, 'metres');
    // On the capsule placeholder it sits where the shoulders round off.
    const actor = new THREE.Group();
    const capsule = new THREE.Mesh(new THREE.CapsuleGeometry(0.36, 0.8, 4, 8));
    capsule.position.y = 0.86;
    actor.add(capsule);
    const fallback = makeRoseScarf();
    actor.add(fallback);
    assert.equal(fallback.userData.fittedTo, 'placeholder');
    assert.ok(fallback.position.y > 1.26 && fallback.position.y < 1.6);
    assert.equal(fitRoseScarf(new THREE.Group()), false);
  });
});
