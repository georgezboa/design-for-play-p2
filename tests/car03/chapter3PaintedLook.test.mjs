import assert from 'node:assert/strict';
import fs from 'node:fs';
import { describe, it } from 'node:test';
import * as THREE from 'three';

import {
  CHAPTER3_GRADES,
  CHAPTER3_GRADE_GLSL,
  CHAPTER3_GRADE_UNIFORMS,
  CHAPTER3_IDENTITY_GRADE,
  applyChapter3Grade,
  blendChapter3Grade,
  chapter3GradeDisplayColor,
  installChapter3ColorGrade,
} from '../../src/cars/presentCity3d/chapter3ColorGrade.js';
import {
  KUWAHARA_DISC,
  PAINTERLY_LOOK,
  PAINTERLY_MAX_FRAME_ROWS,
  PAINTERLY_ROWS,
  chapter3PaintFrameSize,
  chapter3PaintGrid,
} from '../../src/cars/presentCity3d/chapter3Painterly.js';
import {
  CHAPTER3_CAST_LIGHT,
  CHAPTER3_CAST_LOOKS,
  applyChapter3CastLook,
  chapter3CastLookFor,
  chapter3CastLookUniforms,
  setChapter3CastLight,
  setChapter3CastRimEnabled,
} from '../../src/cars/presentCity3d/chapter3CastLook.js';
import { OIL_SEAM_ROUTE, SEAM_BAND_METRES, jointPath } from '../../src/cars/presentCity3d/chapter3OilArt.js';
import { CHAPTER3_LIGHT_PALETTES, Chapter3TimeVisualController, chapter3LightForClock } from '../../src/cars/presentCity3d/Chapter3TimeVisualController.js';
import { CAMERA_HOME } from '../../src/cars/presentCity3d/city3dConfig.js';
import { ROSE_SCARF_COLOR, ROSE_SCARF_DYE } from '../../src/cars/presentCity3d/chapter3SceneBuilders.js';
import { CHAPTER3_TIME_ANCHORS } from '../../src/cars/presentCity3d/chapter3TimeSystem.js';

const read = (path) => fs.readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

// Round 12 (owner note: "第三章的色彩我不喜欢 要极乐迪斯科的体感 … 第三章的色彩要重
// 新配"): Chapter 3's 3D city is painted like a Disco Elysium street: the
// same clock and sun path (14:20 is still the afternoon), but soft light,
// cool coloured shadows, a muted khaki / rust / teal palette, and on HIGH a
// painted frame (chapter3Painterly.js). It replaces the round-6 Leone look
// (G8). The cast stays readable at 55 px (playtest item 10, below).
const SUN_TARGET = [4, 0, 0];
const rgb = (hex) => [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255].map((v) => v / 255);
const chroma = (hex) => Math.max(...rgb(hex)) - Math.min(...rgb(hex));
const hsl = (hex) => new THREE.Color(hex).getHSL({}, THREE.SRGBColorSpace);
const hueDistance = (a, b) => { const d = Math.abs(a - b) % 1; return Math.min(d, 1 - d) * 360; };
const elevation = ([x, y, z]) => THREE.MathUtils.radToDeg(Math.atan2(y, Math.hypot(x - SUN_TARGET[0], z - SUN_TARGET[2])));
const cameraDepth = Math.hypot(...CAMERA_HOME.position.map((value, index) => value - CAMERA_HOME.target[index]));
const fogAtCamera = (light) => THREE.MathUtils.clamp((cameraDepth - light.fogNear) / (light.fogFar - light.fogNear), 0, 1);
const at = (anchor, period) => chapter3LightForClock({ ...CHAPTER3_TIME_ANCHORS[anchor], period });

// The grade's CPU twin, on an sRGB hex: in through ACES's gamma-2 space, out
// as an sRGB hex-ish triple (0..1).
const toLinear = (v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const toSrgb = (v) => (v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055);
const graded = (hex, grade) => chapter3GradeDisplayColor(rgb(hex).map((v) => Math.sqrt(toLinear(v))), grade).map((v) => toSrgb(v * v));
const hslOf = ([r, g, b]) => new THREE.Color().setRGB(r, g, b, THREE.SRGBColorSpace).getHSL({}, THREE.SRGBColorSpace);
const sat = ([r, g, b]) => Math.max(r, g, b) - Math.min(r, g, b);

describe('Chapter 3 painted light (round 12, Disco Elysium)', () => {
  it('afternoon: still a high afternoon sun, but soft light, a cool sky fill and a little haze', () => {
    const day = at('CHAPTER_START', 'AFTERNOON');
    assert.ok(elevation(day.sunPosition) > 60, 'the same high 14:20 sun');
    const [r, g, b] = rgb(day.sun);
    assert.ok(r >= g && g >= b && chroma(day.sun) > 0.03 && chroma(day.sun) < 0.25, 'a warm cream key, not amber');
    assert.ok(day.hemiIntensity / day.sunIntensity >= 0.2, 'a strong sky light: soft, lifted shadows');
    assert.ok(rgb(day.hemiSky)[2] > rgb(day.hemiSky)[0], 'the shadows are filled from a cool sky');
    assert.ok(chroma(day.background) < 0.1, 'a grey-green sky, not a bleached blue');
    assert.ok(fogAtCamera(day) > 0.03 && fogAtCamera(day) < 0.2, 'a pale haze over the street, not a veil');
    assert.ok(day.grade.saturation < -0.15 && day.grade.lift > 0.03, 'a muted palette over lifted blacks');
    // The market (Eda, the scanner) is still the afternoon, not a slide toward dusk.
    const market = at('TICKET_BOARD_FILED', 'AFTERNOON');
    assert.ok(elevation(market.sunPosition) > 55 && rgb(market.sun)[0] >= rgb(market.sun)[2]);
  });

  it('dusk: a low orange sun behind the street, warm tops and slate shadows that still read', () => {
    const dusk = at('MARKET_CROSSED', 'DUSK');
    const { h, s } = hsl(dusk.sun);
    assert.ok(h * 360 > 5 && h * 360 < 35 && s > 0.6, 'an orange sun');
    assert.ok(elevation(dusk.sunPosition) < 20, 'low: long shadows');
    const toCamera = [CAMERA_HOME.position[0] - CAMERA_HOME.target[0], CAMERA_HOME.position[2] - CAMERA_HOME.target[2]];
    const toSun = [dusk.sunPosition[0] - SUN_TARGET[0], dusk.sunPosition[2] - SUN_TARGET[2]];
    assert.ok(toCamera[0] * toSun[0] + toCamera[1] * toSun[1] < 0, 'the camera looks into the sun');
    assert.ok(dusk.hemiIntensity / dusk.sunIntensity >= 0.25, 'the shadow sides are lifted, not black');
    assert.ok(rgb(dusk.hemiSky)[2] > rgb(dusk.hemiSky)[0], 'cool shadows against the warm light');
    assert.ok(dusk.cast.rimStrength > at('CHAPTER_START', 'AFTERNOON').cast.rimStrength, 'a warm edge on the figures');
  });

  it('night: the painter\'s ink-blue and teal night keeps the warm lights warm, and stays readable', () => {
    const night = at('NIGHT_WAKE', 'NIGHT');
    for (const field of ['background', 'hemiSky', 'sun', 'fill']) {
      const [r, g, b] = rgb(night[field]);
      assert.ok(b > r && g > r, `${field} is a teal-blue night`);
    }
    assert.ok(night.grade.saturation < -0.2 && night.grade.gain[2] > night.grade.gain[0]);
    assert.ok(night.grade.keepWarm >= 0.5, 'firelight and windows stay the only warm colour');
    assert.ok(night.exposure >= 1.08 && night.hemiIntensity >= 1.2 && night.fillIntensity >= 2);
  });

  it('morning: a low peach sun in a pale grey-green mist', () => {
    const dawn = at('SUNRISE_OVERLOOK', 'DAWN');
    const day = at('CHAPTER_START', 'AFTERNOON');
    assert.ok(elevation(dawn.sunPosition) < 25);
    assert.ok(rgb(dawn.sun)[0] > rgb(dawn.sun)[2] && chroma(dawn.sun) < 0.4, 'a peach light');
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
    for (const field of ['contrast', 'saturation', 'lift', 'keepWarm', 'khaki', 'teal', 'rust']) assert.ok(Math.abs(settled[field] - expected[field]) < 1e-9, field);
    settled.gain.forEach((value, index) => assert.ok(Math.abs(value - expected.gain[index]) < 1e-9));
    settled.liftTint.forEach((value, index) => assert.ok(Math.abs(value - expected.liftTint[index]) < 1e-9));
    assert.equal(CHAPTER3_CAST_LIGHT.chapter3CastRimColor.value.getHex(), CHAPTER3_LIGHT_PALETTES.DUSK.cast.rimColor);
    controller.request('NIGHT');
    controller.update(1.4);
    const halfway = grades.at(-1);
    assert.ok(halfway.saturation < CHAPTER3_GRADES.DUSK.saturation && halfway.saturation > CHAPTER3_GRADES.NIGHT.saturation);
  });
});

describe('Chapter 3 painted palette (the grade, round 12)', () => {
  it('runs in the tone-mapping step every material already does, with shared uniforms', () => {
    assert.equal(installChapter3ColorGrade(THREE), true);
    assert.equal(installChapter3ColorGrade(THREE), true, 'idempotent');
    assert.match(THREE.ShaderChunk.tonemapping_pars_fragment, /vec3 CustomToneMapping\( vec3 color \) \{\n\tvec3 c = sqrt\( ACESFilmicToneMapping\( color \) \);/);
    assert.doesNotMatch(CHAPTER3_GRADE_GLSL, /pow\(|sin\(|texture/, 'polynomial only: cheap on software GPUs');
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
    assert.equal(CHAPTER3_GRADE_UNIFORMS.chapter3GradeE.value.x, CHAPTER3_GRADES.AFTERNOON.khaki);
    assert.equal(CHAPTER3_GRADE_UNIFORMS.chapter3GradeF.value.z, CHAPTER3_GRADES.AFTERNOON.liftTint[2]);
    assert.equal(CHAPTER3_GRADE_UNIFORMS.chapter3GradeC.value.w, 0, 'no grain when asked');
    applyChapter3Grade(CHAPTER3_GRADES.AFTERNOON, { time: 3 });
    assert.equal(CHAPTER3_GRADE_UNIFORMS.chapter3GradeC.value.w, CHAPTER3_GRADES.AFTERNOON.grain);
    // Zero is the identity: a material without the uniforms is plain ACES.
    for (const field of ['contrast', 'saturation', 'khaki', 'teal', 'rust', 'lift']) assert.equal(CHAPTER3_IDENTITY_GRADE[field], 0);
    assert.deepEqual(CHAPTER3_IDENTITY_GRADE.gain, [0, 0, 0]);
    assert.deepEqual(chapter3GradeDisplayColor([0.3, 0.5, 0.7], CHAPTER3_IDENTITY_GRADE).map((v) => Number(v.toFixed(6))), [0.3, 0.5, 0.7]);
  });

  it('paints the afternoon in Martinaise colours: khaki stone, rust roads, cool lifted shadows, dirty whites', () => {
    const day = CHAPTER3_GRADES.AFTERNOON;
    // The sallow AI limestone goes to a khaki / ochre cream (not salmon).
    const stone = graded(0xe8c890, day);
    const stoneHue = hslOf(stone).h * 360;
    assert.ok(stoneHue > 40 && stoneHue < 65, `khaki stone (${stoneHue.toFixed(0)}°)`);
    assert.ok(sat(stone) < sat(rgb(0xe8c890)), 'muted');
    // The sienna roads a rust that keeps more of its colour than the stone.
    const road = graded(0x9a5a38, day);
    const roadHue = hslOf(road).h * 360;
    assert.ok(roadHue > 10 && roadHue < 35, `rust roads (${roadHue.toFixed(0)}°)`);
    assert.ok(sat(road) / sat(rgb(0x9a5a38)) > sat(stone) / sat(rgb(0xe8c890)), 'rust is an accent');
    // Black lifts to a cool slate, white stays a dirty off-white.
    const black = graded(0x000000, day);
    assert.ok(black[2] > black[0] && black[2] > 0.04, 'a coloured shadow floor, not black');
    const white = graded(0xffffff, day);
    assert.ok(white[2] < white[0] && Math.min(...white) < 0.99, 'a warm, dirty white');
    // A dark shadow turns cool; a lit warm plane stays warm.
    const shade = graded(0x3a2418, day);
    assert.ok(shade[2] >= shade[0], 'warm stone in shadow turns slate');
  });

  it('keeps the story colours: the rose scarf rose, Butch navy, Lev green, the fire warm at night', () => {
    const day = CHAPTER3_GRADES.AFTERNOON;
    const rose = hslOf(graded(ROSE_SCARF_DYE, day));
    assert.ok(hueDistance(rose.h, hsl(ROSE_SCARF_COLOR).h) < 30 && rose.s > 0.2, 'still a rose');
    const navy = hslOf(graded(CHAPTER3_CAST_LOOKS.butch.coat, day)).h * 360;
    assert.ok(navy > 190 && navy < 235, `Butch stays navy (${navy.toFixed(0)}°)`);
    const green = hslOf(graded(CHAPTER3_CAST_LOOKS.lev.coat, day)).h * 360;
    assert.ok(green > 120 && green < 175, `Lev stays green (${green.toFixed(0)}°)`);
    const fire = graded(0xff8030, CHAPTER3_GRADES.NIGHT);
    assert.ok(fire[0] > fire[2] + 0.4, 'firelight stays warm under the night grade');
  });

  it('draws the painted frame on HIGH only; LOW / LOWEST keep the grade and drop the buffers', () => {
    const preview = read('src/cars/presentCity3d/EchoCity3DPreview.js');
    assert.match(preview, /renderer\.toneMapping = graded \? THREE\.CustomToneMapping : THREE\.ACESFilmicToneMapping;/);
    assert.match(preview, /renderer\.shadowMap\.type = THREE\.PCFShadowMap;/);
    assert.match(preview, /sun\.shadow\.radius = 2\.4;/, 'soft shadow edges for the painter\'s light');
    assert.doesNotMatch(preview, /EffectComposer/);
    assert.match(preview, /paintsFrame\(\) \{\n\s+return Boolean\(this\.painterly\) && this\.qualityTier === 'high';/);
    const render = preview.match(/\n  render\(\) \{[\s\S]*?\n  \}/)?.[0] ?? '';
    assert.match(render, /this\.updateColorGrade\(\);/);
    assert.match(render, /if \(this\.paintsFrame\(\)\) this\.painterly\.render\(this\.scene, this\.camera\);\n\s+else this\.renderer\.render\(this\.scene, this\.camera\);/);
    const lowTier = preview.slice(preview.indexOf('applyQualityTier(tier) {'), preview.indexOf('registerOccludingBuilding(root, id) {'));
    assert.match(lowTier, /this\.painterly\?\.disposeTargets\(\);/);
    // Interiors get their own grade; grain only on an unpainted HIGH frame,
    // and a still one under REDUCE MOTION.
    assert.match(preview, /inside \? CHAPTER3_GRADES\.INTERIOR : this\.colorGrade/);
    assert.match(preview, /grain: this\.qualityTier === 'high' && !this\.paintsFrame\(\)/);
    assert.match(preview, /time: this\.reducedMotion \? 0 : this\.elapsed/);
    // The old full-canvas CSS filter stays gone; the vignette is neutral.
    assert.doesNotMatch(read('car03-3d.html'), /\.clear-afternoon canvas \{ filter/);
    assert.doesNotMatch(read('src/cars/presentCity3d/chapter3Release.css'), /\.c3-vignette \{[^}]*rgba\(10, 7, 5/);
  });
});

describe('Chapter 3 painted frame (chapter3Painterly, round 12)', () => {
  it('keeps one stroke size against the street at any canvas size, and caps the frame it paints', () => {
    for (const [width, height] of [[1280, 720], [1920, 1080], [3360, 1890]]) {
      const frame = chapter3PaintFrameSize(width, height);
      assert.ok(frame.height <= PAINTERLY_MAX_FRAME_ROWS);
      assert.ok(Math.abs(frame.width / frame.height - width / height) < 0.01, 'aspect kept');
      const grid = chapter3PaintGrid({ width: frame.width, height: frame.height });
      assert.equal(grid.rows, PAINTERLY_ROWS + 2, 'the same paint rows (+ a margin texel each side)');
      assert.ok(Math.abs(grid.scale - frame.height / PAINTERLY_ROWS) < 1e-9);
      assert.ok((grid.cols - 1.5) * grid.scale >= frame.width, 'covers the frame');
    }
    assert.deepEqual(chapter3PaintFrameSize(1280, 720), { width: 1280, height: 720 });
  });

  it('pins the paint grid to the world, so a camera pan does not make the paint crawl', () => {
    const centres = (originX) => {
      const grid = chapter3PaintGrid({ width: 1280, height: 720, originX });
      return Array.from({ length: 6 }, (_, i) => (i - 0.5) * grid.scale + grid.offsetX - originX);
    };
    const phase = (values, scale) => values.map((value) => Number((((value % scale) + scale) % scale).toFixed(6)));
    const { scale } = chapter3PaintGrid({ width: 1280, height: 720 });
    const base = phase(centres(312.4), scale);
    for (const pan of [0.37, 1.5, 17.25, -40.8]) assert.deepEqual(phase(centres(312.4 + pan), scale), base, `pan ${pan} px`);
  });

  it('paints with an anisotropic Kuwahara on a fixed, symmetric 37-sample disc', () => {
    assert.equal(KUWAHARA_DISC.length, 37);
    const perSector = new Array(8).fill(0);
    for (const { x, y, weights } of KUWAHARA_DISC) {
      assert.ok(Math.hypot(x, y) <= 0.5 + 1e-9, 'inside the unit disc');
      assert.equal(weights.length, 8);
      weights.forEach((weight, sector) => { perSector[sector] += weight; });
    }
    const mean = perSector.reduce((a, b) => a + b, 0) / 8;
    for (const total of perSector) assert.ok(Math.abs(total - mean) / mean < 0.08, 'every sector weighs the same');
    assert.ok(PAINTERLY_LOOK.radius >= 2 && PAINTERLY_LOOK.radius <= 5);
    const source = read('src/cars/presentCity3d/chapter3Painterly.js');
    // The frame is the screen's stand-in: the city's programs are the same ones.
    assert.match(source, /this\.targets\.frame\.isXRRenderTarget = true;/);
    assert.match(source, /this\.targets\.frame\.texture\.colorSpace = THREE\.SRGBColorSpace;/);
    assert.match(source, /target\.texture\.internalFormat = 'RGBA8';/);
    // The passes add their draw calls to the frame's count.
    assert.match(source, /renderer\.info\.autoReset = false;/);
  });
});

describe('Chapter 3 oil line reads from the street camera (round 12, "石油管道看不到了")', () => {
  it('soaks a band along the route the can went, with the poured line in the joints inside it', () => {
    const oilArt = read('src/cars/presentCity3d/chapter3OilArt.js');
    // About 7-12 px wide at 720p from the street camera, never a hairline.
    assert.ok(SEAM_BAND_METRES >= 0.15 && SEAM_BAND_METRES <= 0.35);
    assert.match(oilArt, /const band = roundedRoute\(route\);/);
    assert.match(oilArt, /const masks = drawSeamMasks\(path, route\);/);
    // The poured line keeps to joints near the band (narrow corridor).
    const route = OIL_SEAM_ROUTE.map(([x, z]) => [x, z]);
    const setts = (x, z) => {
      const course = Math.floor(z / 0.3);
      const inCourse = ((z % 0.3) + 0.3) % 0.3;
      const along = (((x + (course % 2 ? 0.21 : 0)) % 0.42) + 0.42) % 0.42;
      return Math.min(Math.min(inCourse, 0.3 - inCourse), Math.min(along, 0.42 - along)) < 0.012 ? 1 : 0;
    };
    const path = jointPath(route, setts, { corridor: 0.32 });
    assert.ok(path && path.length > 8, 'a joint path inside the narrow corridor');
    // Dark and lit on the pale limestone, glossed with the sky on the dark
    // court: a reflection, never a glow (the material stays lit and shadowed).
    assert.match(oilArt, /float oilBand = smoothstep\(/);
    assert.match(oilArt, /totalEmissiveRadiance \+= oilSkyGrey \* uOilBand\.y \* oilGloss/);
    assert.match(oilArt, /uOilBand: \{ value: new THREE\.Vector2\(/);
    assert.match(oilArt, /const material = new THREE\.MeshStandardMaterial\(\{\n\s+color: 0xffffff,\n\s+roughness: 0\.95,/);
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
