import assert from 'node:assert/strict';
import fs from 'node:fs';
import { describe, it } from 'node:test';
import * as THREE from 'three';

import {
  CHAPTER3_GRADES,
  CHAPTER3_GRADE_UNIFORMS,
  CHAPTER3_IDENTITY_GRADE,
  applyChapter3Grade,
  blendChapter3Grade,
  installChapter3ColorGrade,
} from '../../src/cars/presentCity3d/chapter3ColorGrade.js';
import {
  CHAPTER3_CAST_LIGHT,
  CHAPTER3_CAST_LOOKS,
  applyChapter3CastLook,
  chapter3CastLookFor,
  chapter3CastLookUniforms,
  setChapter3CastLight,
  setChapter3CastRimEnabled,
} from '../../src/cars/presentCity3d/chapter3CastLook.js';
import { CHAPTER3_LIGHT_PALETTES, Chapter3TimeVisualController, chapter3LightForClock } from '../../src/cars/presentCity3d/Chapter3TimeVisualController.js';
import { CAMERA_HOME } from '../../src/cars/presentCity3d/city3dConfig.js';
import { ROSE_SCARF_COLOR } from '../../src/cars/presentCity3d/chapter3SceneBuilders.js';
import { CHAPTER3_TIME_ANCHORS } from '../../src/cars/presentCity3d/chapter3TimeSystem.js';

const read = (path) => fs.readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

// Round 6 (owner note G8): "Chapter 3 is too sallow; it needs the West of
// Leone's Dollars films." White noon, blood-orange backlit dusk,
// day-for-night, a cool clear morning; and a cast that reads at 55 px
// (playtest item 10).
const SUN_TARGET = [4, 0, 0];
const rgb = (hex) => [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255].map((v) => v / 255);
const chroma = (hex) => Math.max(...rgb(hex)) - Math.min(...rgb(hex));
const hsl = (hex) => new THREE.Color(hex).getHSL({}, THREE.SRGBColorSpace);
const hueDistance = (a, b) => { const d = Math.abs(a - b) % 1; return Math.min(d, 1 - d) * 360; };
const elevation = ([x, y, z]) => THREE.MathUtils.radToDeg(Math.atan2(y, Math.hypot(x - SUN_TARGET[0], z - SUN_TARGET[2])));
const cameraDepth = Math.hypot(...CAMERA_HOME.position.map((value, index) => value - CAMERA_HOME.target[index]));
const fogAtCamera = (light) => THREE.MathUtils.clamp((cameraDepth - light.fogNear) / (light.fogFar - light.fogNear), 0, 1);
const at = (anchor, period) => chapter3LightForClock({ ...CHAPTER3_TIME_ANCHORS[anchor], period });

describe('Chapter 3 Leone light (round 6, G8)', () => {
  it('afternoon: a high white sun, hard shadows, a pale sky and no murk', () => {
    const day = at('CHAPTER_START', 'AFTERNOON');
    assert.ok(chroma(day.sun) < 0.12, 'the sun is white-hot, not amber');
    assert.ok(elevation(day.sunPosition) > 60, 'a high sun: short shadows');
    assert.ok(day.hemiIntensity / day.sunIntensity < 0.18, 'little sky fill: dark, hard shadows');
    assert.ok(hsl(day.background).l > 0.8 && rgb(day.background)[2] >= rgb(day.background)[0], 'a bleached pale-blue sky');
    assert.ok(fogAtCamera(day) <= 0.08, 'only a trace of haze at the street camera');
    assert.ok(day.grade.gain[2] > day.grade.gain[0], 'the grade takes the amber cast off');
    assert.ok(day.grade.contrast > 0.1);
    // The market (Eda, the scanner) is still the white afternoon, not a slide toward dusk.
    const market = at('TICKET_BOARD_FILED', 'AFTERNOON');
    assert.ok(chroma(market.sun) < 0.12 && elevation(market.sunPosition) > 55);
  });

  it('dusk: a low blood-orange sun behind the street, figures in silhouette', () => {
    const dusk = at('MARKET_CROSSED', 'DUSK');
    const { h, s } = hsl(dusk.sun);
    assert.ok(h * 360 > 5 && h * 360 < 35 && s > 0.6, 'an orange-red sun');
    assert.ok(elevation(dusk.sunPosition) < 20, 'low: long shadows');
    const toCamera = [CAMERA_HOME.position[0] - CAMERA_HOME.target[0], CAMERA_HOME.position[2] - CAMERA_HOME.target[2]];
    const toSun = [dusk.sunPosition[0] - SUN_TARGET[0], dusk.sunPosition[2] - SUN_TARGET[2]];
    assert.ok(toCamera[0] * toSun[0] + toCamera[1] * toSun[1] < 0, 'the camera looks into the sun: backlit');
    assert.ok(dusk.hemiIntensity / dusk.sunIntensity < 0.15, 'dark shadow sides');
    assert.ok(dusk.cast.rimStrength > at('CHAPTER_START', 'AFTERNOON').cast.rimStrength, 'an orange edge on the silhouettes');
  });

  it('night: blue day-for-night that keeps the warm lights warm, and stays readable', () => {
    const night = at('NIGHT_WAKE', 'NIGHT');
    for (const field of ['background', 'hemiSky', 'sun', 'fill']) {
      const [r, , b] = rgb(night[field]);
      assert.ok(b > r, `${field} is moonlit blue`);
    }
    assert.ok(night.grade.saturation < -0.2 && night.grade.gain[2] > night.grade.gain[0]);
    assert.ok(night.grade.keepWarm >= 0.5, 'firelight and windows stay the only warm colour');
    assert.ok(night.exposure >= 1.08 && night.hemiIntensity >= 1.2 && night.fillIntensity >= 2);
  });

  it('morning: cool, clear, low light and a thin mist', () => {
    const dawn = at('SUNRISE_OVERLOOK', 'DAWN');
    const day = at('CHAPTER_START', 'AFTERNOON');
    assert.ok(chroma(dawn.sun) < 0.12);
    assert.ok(elevation(dawn.sunPosition) < 25);
    assert.ok(rgb(dawn.hemiSky)[2] > rgb(dawn.hemiSky)[0], 'a cool sky light');
    assert.ok(dawn.fogNear < day.fogNear && fogAtCamera(dawn) > fogAtCamera(day) && fogAtCamera(dawn) < 0.25, 'thin mist');
  });

  it('crossfades the grade, the fog range and the cast rim with the clock', () => {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    scene.fog = new THREE.Fog(0x000000, 50, 60);
    const sun = new THREE.DirectionalLight();
    sun.name = 'city-sun-light';
    scene.add(sun);
    const grades = [];
    const preview = { scene, renderer: { toneMappingExposure: 1 }, colorGrade: CHAPTER3_GRADES.AFTERNOON, setColorGrade: (g) => grades.push(g) };
    const controller = new Chapter3TimeVisualController(preview);
    controller.request('DUSK', { immediate: true });
    assert.equal(scene.fog.near, CHAPTER3_LIGHT_PALETTES.DUSK.fogNear);
    assert.equal(scene.fog.far, CHAPTER3_LIGHT_PALETTES.DUSK.fogFar);
    // The haze hex is its on-screen colour (three mixes fog after the encode).
    assert.equal(scene.fog.color.getHex(THREE.LinearSRGBColorSpace), CHAPTER3_LIGHT_PALETTES.DUSK.fog);
    const settled = grades.at(-1);
    const expected = blendChapter3Grade(CHAPTER3_GRADES.DUSK, CHAPTER3_GRADES.DUSK, 1);
    for (const field of ['contrast', 'saturation', 'lift', 'keepWarm']) assert.ok(Math.abs(settled[field] - expected[field]) < 1e-9, field);
    settled.gain.forEach((value, index) => assert.ok(Math.abs(value - expected.gain[index]) < 1e-9));
    assert.equal(CHAPTER3_CAST_LIGHT.chapter3CastRimColor.value.getHex(), CHAPTER3_LIGHT_PALETTES.DUSK.cast.rimColor);
    controller.request('NIGHT');
    controller.update(1.4);
    const halfway = grades.at(-1);
    assert.ok(halfway.saturation < CHAPTER3_GRADES.DUSK.saturation && halfway.saturation > CHAPTER3_GRADES.NIGHT.saturation);
  });
});

describe('Chapter 3 colour grade (round 6)', () => {
  it('runs in the tone-mapping step every material already does, with shared uniforms', () => {
    assert.equal(installChapter3ColorGrade(THREE), true);
    assert.equal(installChapter3ColorGrade(THREE), true, 'idempotent');
    assert.match(THREE.ShaderChunk.tonemapping_pars_fragment, /vec3 CustomToneMapping\( vec3 color \) \{\n\tvec3 c = sqrt\( ACESFilmicToneMapping\( color \) \);/);
    for (const id of ['standard', 'physical', 'basic', 'lambert', 'sprite']) {
      // The uniform values must survive UniformsUtils.clone by reference, or
      // the grade would freeze at its first value (a three.js upgrade guard).
      const cloned = THREE.UniformsUtils.clone(THREE.ShaderLib[id].uniforms);
      for (const name of Object.keys(CHAPTER3_GRADE_UNIFORMS)) {
        assert.equal(cloned[name].value, CHAPTER3_GRADE_UNIFORMS[name].value, `${id}.${name} is shared`);
      }
    }
    applyChapter3Grade(CHAPTER3_GRADES.AFTERNOON, { time: 3, grain: false });
    assert.equal(CHAPTER3_GRADE_UNIFORMS.chapter3GradeA.value.x, CHAPTER3_GRADES.AFTERNOON.contrast);
    assert.equal(CHAPTER3_GRADE_UNIFORMS.chapter3GradeC.value.w, 0, 'no grain when asked (LOW)');
    applyChapter3Grade(CHAPTER3_GRADES.AFTERNOON, { time: 3 });
    assert.equal(CHAPTER3_GRADE_UNIFORMS.chapter3GradeC.value.w, CHAPTER3_GRADES.AFTERNOON.grain);
    // Zero is the identity: a material without the uniforms is plain ACES.
    assert.equal(CHAPTER3_IDENTITY_GRADE.contrast, 0);
    assert.deepEqual(CHAPTER3_IDENTITY_GRADE.gain, [0, 0, 0]);
  });

  it('adds no pass and keeps the frame cost: one render call, hard PCF, no CSS filter on the canvas', () => {
    const preview = read('src/cars/presentCity3d/EchoCity3DPreview.js');
    assert.match(preview, /renderer\.toneMapping = graded \? THREE\.CustomToneMapping : THREE\.ACESFilmicToneMapping;/);
    assert.match(preview, /renderer\.shadowMap\.type = THREE\.PCFShadowMap;/);
    assert.doesNotMatch(preview, /EffectComposer|WebGLRenderTarget/);
    const render = preview.match(/\n  render\(\) \{[\s\S]*?\n  \}/)?.[0] ?? '';
    assert.equal(render.match(/renderer\.render\(/g)?.length, 1);
    assert.match(render, /this\.updateColorGrade\(\);/);
    // Interiors get the neutral grade; LOW / LOWEST drop the grain.
    assert.match(preview, /inside \? CHAPTER3_GRADES\.INTERIOR : this\.colorGrade/);
    assert.match(preview, /grain: this\.qualityTier === 'high'/);
    // The old full-canvas CSS filter (desaturating, and a compositing cost
    // on software GPUs) is gone; the vignette is neutral, not brown.
    assert.doesNotMatch(read('car03-3d.html'), /\.clear-afternoon canvas \{ filter/);
    assert.doesNotMatch(read('src/cars/presentCity3d/chapter3Release.css'), /\.c3-vignette \{[^}]*rgba\(10, 7, 5/);
  });
});

describe('Chapter 3 cast readability (round 6, playtest item 10)', () => {
  it('gives Butch a deep navy greatcoat and every key character a distinct, non-rose signature', () => {
    const butch = hsl(CHAPTER3_CAST_LOOKS.butch.coat);
    assert.ok(butch.h * 360 > 205 && butch.h * 360 < 240 && butch.l < 0.25, 'deep navy');
    const rose = hsl(ROSE_SCARF_COLOR);
    for (const [id, look] of Object.entries(CHAPTER3_CAST_LOOKS)) {
      for (const hex of [look.coat, look.hat]) {
        const color = hsl(hex);
        // Rose = a pink-red hue that is neither greyed nor a dark brown.
        const roseLike = hueDistance(color.h, rose.h) < 40 && chroma(hex) > 0.15 && color.l > 0.25;
        assert.ok(!roseLike, `${id} ${hex.toString(16)} is not a rose`);
      }
      if (id === 'butch') continue;
      const other = hsl(look.coat);
      const apart = (butch.s > 0.2 && other.s > 0.2 && hueDistance(butch.h, other.h) >= 40)
        || Math.abs(butch.l - other.l) >= 0.15 || Math.abs(butch.s - other.s) >= 0.3;
      assert.ok(apart, `${id} reads apart from Butch`);
    }
    // Mara ahead keeps her dark echo material: the rose scarf is her only colour.
    assert.equal(chapter3CastLookFor('echo-mara'), null);
    assert.equal(chapter3CastLookFor('flower-vendor').muted, true, 'extras are muted so the story cast pops');
  });

  it('patches a rig once: colour block, skin and hand protection, rim and fill from shared uniforms', () => {
    const root = new THREE.Group();
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.8, 0.3), new THREE.MeshStandardMaterial());
    root.add(mesh);
    assert.equal(applyChapter3CastLook(root, CHAPTER3_CAST_LOOKS.butch), 1);
    assert.equal(applyChapter3CastLook(root, CHAPTER3_CAST_LOOKS.butch), 0, 'a second pass changes nothing');
    assert.match(mesh.material.customProgramCacheKey(), /chapter3-cast-look/);
    const uniforms = chapter3CastLookUniforms(mesh.material);
    assert.deepEqual(uniforms.chapter3CastBounds.value.toArray().map((v) => Number(v.toFixed(2))), [-0.9, 0.9, 0.3, 0]);
    const shader = {
      uniforms: {},
      vertexShader: '#include <common>\nvoid main() {\n#include <begin_vertex>\n}',
      fragmentShader: '#include <common>\nvoid main() {\n#include <map_fragment>\n#include <emissivemap_fragment>\n}',
    };
    mesh.material.onBeforeCompile(shader);
    assert.match(shader.vertexShader, /vChapter3Body = position;/, 'bind-pose position: the blocks ride the rig');
    assert.match(shader.fragmentShader, /float hand = /);
    assert.match(shader.fragmentShader, /float neck = /);
    assert.match(shader.fragmentShader, /totalEmissiveRadiance \+= chapter3CastRimColor/);
    assert.match(shader.fragmentShader, /nonPerturbedNormal/, 'the rim follows the geometry, not the cloth normal map');
    assert.equal(shader.uniforms.chapter3CastLight, CHAPTER3_CAST_LIGHT.chapter3CastLight, 'one shared time-of-day rim');
    // Not through material.emissive: the hover highlight owns that.
    assert.equal(mesh.material.emissive.getHex(), 0x000000);
    setChapter3CastLight({ rimStrength: 0.42 });
    assert.equal(shader.uniforms.chapter3CastLight.value.x, 0.42);
    setChapter3CastRimEnabled(false);
    assert.equal(shader.uniforms.chapter3CastLight.value.w, 0, 'LOW: no rim');
    setChapter3CastRimEnabled(true);
  });

  it('is applied per instance when a rig installs', () => {
    const characters = read('src/cars/presentCity3d/Chapter3AnimatedCharacters.js');
    assert.match(characters, /this\.castLook = chapter3CastLookFor\(this\.id\);\n    applyChapter3CastLook\(root, this\.castLook\);/);
  });
});
