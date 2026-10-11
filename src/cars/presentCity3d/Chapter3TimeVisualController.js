import * as THREE from 'three';

import { CHAPTER3_GRADES, blendChapter3Grade } from './chapter3ColorGrade.js';
import { CHAPTER3_CAST_LIGHT, setChapter3CastLight } from './chapter3CastLook.js';

const TRANSITION_SECONDS = 2.8;

// Round 12 (owner note: "第三章的色彩我不喜欢 要极乐迪斯科的体感 … 第三章的色彩要
// 重新配"): the same clock and the same sun path, painted the way Disco
// Elysium paints Martinaise instead of the round-6 Leone western (G8):
//   AFTERNOON  still 14:20 and a high sun, but a soft, slightly hazy day: a
//              warm cream key, a strong cool sky light that fills the
//              shadows with slate and teal (never black), a grey-green sky
//              and a pale haze over the whole street;
//   DUSK       a dusty rose-orange evening with violet shadows (the sun
//              still low behind the street, the camera looking into it);
//   NIGHT      the painter's night: ink blue going to teal, a teal moonlight
//              fill, warm fire, lamps and windows (the NIGHT grade spares
//              them);
//   DAWN       a pale grey-green morning in mist, a peach light.
// Fog is linear and starts short of the street camera's depth (the
// orthographic camera sits ~123 m from everything it frames), so it is an
// even veil of haze over the frame, thicker toward the top. three.js mixes
// fog after the sRGB encode, so `fog` is stored as a display colour
// (fogColor below): the hex is what the haze looks like on screen. `grade` is
// the colour grade (chapter3ColorGrade.js), `cast` the rim and fill on the
// story cast (chapter3CastLook.js).
const PALETTES = Object.freeze({
  AFTERNOON: Object.freeze({
    background: 0xc6d0c8,
    fog: 0xd3d5c8,
    fogNear: 102,
    fogFar: 330,
    exposure: 1.04,
    hemiSky: 0x74b0d9,
    hemiGround: 0x605045,
    hemiIntensity: 1.3,
    sun: 0xffecd8,
    sunIntensity: 4.8,
    fill: 0x7ea2aa,
    fillIntensity: 0.55,
    grade: CHAPTER3_GRADES.AFTERNOON,
    // A soft warm edge; the fill floor keeps a figure's colour block alive
    // in the shade.
    cast: Object.freeze({ rimColor: 0xffd9a8, rimStrength: 0.24, rimPower: 3.6, fill: 0.22 }),
  }),
  DUSK: Object.freeze({
    background: 0xc88e74,
    fog: 0xc6a088,
    fogNear: 100,
    fogFar: 260,
    exposure: 1.12,
    hemiSky: 0x70809c,
    hemiGround: 0x3c2e28,
    hemiIntensity: 1.3,
    sun: 0xff9358,
    sunIntensity: 3.8,
    fill: 0x5a6484,
    fillIntensity: 0.7,
    grade: CHAPTER3_GRADES.DUSK,
    cast: Object.freeze({ rimColor: 0xff9a62, rimStrength: 0.6, rimPower: 4, fill: 0.08 }),
  }),
  NIGHT: Object.freeze({
    // The night readability floor stays (exposure, sky light and fill at or
    // above their alpha-round-4 values); the blue goes toward ink and teal.
    background: 0x0d1b24,
    fog: 0x1e3440,
    fogNear: 108,
    fogFar: 300,
    exposure: 1.1,
    hemiSky: 0x6b98b2,
    hemiGround: 0x1c2428,
    hemiIntensity: 1.3,
    sun: 0x9cc2d8,
    sunIntensity: 2.3,
    fill: 0x4a7a98,
    fillIntensity: 2.05,
    grade: CHAPTER3_GRADES.NIGHT,
    cast: Object.freeze({ rimColor: 0x9cc8e0, rimStrength: 0.6, rimPower: 3.2, fill: 0.12 }),
  }),
  DAWN: Object.freeze({
    background: 0xd2d8cc,
    fog: 0xdcdcd0,
    fogNear: 92,
    fogFar: 236,
    exposure: 1.1,
    hemiSky: 0xaec4c0,
    hemiGround: 0x5a5446,
    hemiIntensity: 1.25,
    sun: 0xffd6b4,
    sunIntensity: 3.3,
    fill: 0x9ab4b8,
    fillIntensity: 0.5,
    grade: CHAPTER3_GRADES.DAWN,
    cast: Object.freeze({ rimColor: 0xffe2c8, rimStrength: 0.34, rimPower: 3.6, fill: 0.1 }),
  }),
});

// Late afternoon: the same soft light, the sun a little lower and warmer. It
// holds the afternoon through the market (15:40) instead of sliding toward
// dusk from 14:20 on.
const LATE_AFTERNOON = Object.freeze({
  ...PALETTES.AFTERNOON,
  sun: 0xffe2c0,
  sunIntensity: 4.5,
  hemiIntensity: 1.26,
});

const TWILIGHT = Object.freeze({
  background: 0x584c60,
  fog: 0x645a68,
  fogNear: 100,
  fogFar: 260,
  exposure: 1.05,
  hemiSky: 0x5a6888,
  hemiGround: 0x221e24,
  hemiIntensity: 1.0,
  sun: 0xd0603a,
  sunIntensity: 1.7,
  fill: 0x4a5a82,
  fillIntensity: 0.8,
  grade: CHAPTER3_GRADES.DUSK,
  cast: Object.freeze({ rimColor: 0xe0704a, rimStrength: 0.85, rimPower: 2.8, fill: 0.06 }),
});

// The sun stands high and a little west by day (short shadows), drops into
// the northwest behind the street at dusk (the camera looks northwest, so
// the city is backlit), and rises low in the east in the morning.
const LIGHT_KEYS = Object.freeze([
  Object.freeze({ absoluteMinute: 14 * 60 + 20, period: 'AFTERNOON', palette: PALETTES.AFTERNOON, sunPosition: [-22, 74, 16] }),
  Object.freeze({ absoluteMinute: 16 * 60 + 50, period: 'AFTERNOON', palette: LATE_AFTERNOON, sunPosition: [-30, 60, 8] }),
  Object.freeze({ absoluteMinute: 17 * 60 + 20, period: 'DUSK', palette: PALETTES.DUSK, sunPosition: [-42, 18, -34] }),
  Object.freeze({ absoluteMinute: 20 * 60 + 30, period: 'DUSK', palette: TWILIGHT, sunPosition: [-50, 5, -30] }),
  Object.freeze({ absoluteMinute: 21 * 60 + 29, period: 'DUSK', palette: TWILIGHT, sunPosition: [-52, 2, -28] }),
  Object.freeze({ absoluteMinute: 21 * 60 + 30, period: 'NIGHT', palette: PALETTES.NIGHT, sunPosition: [22, 34, -32] }),
  Object.freeze({ absoluteMinute: 24 * 60 + 5 * 60 + 30, period: 'NIGHT', palette: PALETTES.NIGHT, sunPosition: [18, 28, -28] }),
  Object.freeze({ absoluteMinute: 24 * 60 + 6 * 60 + 20, period: 'DAWN', palette: PALETTES.DAWN, sunPosition: [36, 15, -20] }),
]);

export const CHAPTER3_LIGHT_PALETTES = PALETTES;
export const CHAPTER3_AFTERNOON_SUN_POSITION = LIGHT_KEYS[0].sunPosition;

const COLOR_FIELDS = Object.freeze(['background', 'fog', 'hemiSky', 'hemiGround', 'sun', 'fill']);
const NUMBER_FIELDS = Object.freeze(['fogNear', 'fogFar', 'exposure', 'hemiIntensity', 'sunIntensity', 'fillIntensity']);
const CAST_FIELDS = Object.freeze(['rimStrength', 'rimPower', 'fill']);

// Fog mixes after the sRGB encode, so its colour is kept as display values.
function fogColor(hex) {
  return new THREE.Color().setHex(hex, THREE.LinearSRGBColorSpace);
}

function blendCast(from, to, amount) {
  const result = { rimColor: new THREE.Color(from.rimColor).lerp(new THREE.Color(to.rimColor), amount).getHex() };
  for (const field of CAST_FIELDS) result[field] = THREE.MathUtils.lerp(from[field], to[field], amount);
  return result;
}

function absoluteClockMinute(clock) {
  return (Math.max(1, Number(clock?.day) || 1) - 1) * 1440 + Math.max(0, Number(clock?.minuteOfDay) || 0);
}

function blendPalette(from, to, amount) {
  const result = {};
  for (const field of COLOR_FIELDS) {
    result[field] = new THREE.Color(from[field]).lerp(new THREE.Color(to[field]), amount).getHex();
  }
  for (const field of NUMBER_FIELDS) result[field] = THREE.MathUtils.lerp(from[field], to[field], amount);
  result.grade = blendChapter3Grade(from.grade, to.grade, amount);
  result.cast = blendCast(from.cast, to.cast, amount);
  return result;
}

export function chapter3LightForClock(clock) {
  const absoluteMinute = absoluteClockMinute(clock);
  let from = LIGHT_KEYS[0];
  let to = LIGHT_KEYS[0];
  for (let index = 0; index < LIGHT_KEYS.length; index += 1) {
    const key = LIGHT_KEYS[index];
    if (key.absoluteMinute <= absoluteMinute) from = key;
    if (key.absoluteMinute >= absoluteMinute) {
      to = key;
      break;
    }
    to = key;
  }
  const span = Math.max(1, to.absoluteMinute - from.absoluteMinute);
  const amount = THREE.MathUtils.clamp((absoluteMinute - from.absoluteMinute) / span, 0, 1);
  return {
    ...blendPalette(from.palette, to.palette, amount),
    sunPosition: from.sunPosition.map((value, index) => THREE.MathUtils.lerp(value, to.sunPosition[index], amount)),
    absoluteMinute,
    period: clock?.period || from.period,
  };
}

// How strongly the street lamps glow (0..1) at a chapter clock time: barely
// on in the afternoon sun, warming through dusk, full at night, fading at
// dawn (round 3 art pass, P2 lamps).
const LAMP_GLOW_KEYS = Object.freeze([
  [14 * 60, 0.12],
  [17 * 60 + 20, 0.5],
  [20 * 60 + 30, 0.9],
  [21 * 60 + 30, 1],
  [24 * 60 + 5 * 60 + 30, 1],
  [24 * 60 + 6 * 60 + 20, 0.45],
  [24 * 60 + 7 * 60 + 30, 0.25],
]);

export function chapter3LampGlowForClock(clock) {
  const minute = absoluteClockMinute(clock);
  if (minute <= LAMP_GLOW_KEYS[0][0]) return LAMP_GLOW_KEYS[0][1];
  for (let index = 1; index < LAMP_GLOW_KEYS.length; index += 1) {
    const [toMinute, toLevel] = LAMP_GLOW_KEYS[index];
    if (minute > toMinute) continue;
    const [fromMinute, fromLevel] = LAMP_GLOW_KEYS[index - 1];
    return THREE.MathUtils.lerp(fromLevel, toLevel, (minute - fromMinute) / Math.max(1, toMinute - fromMinute));
  }
  return LAMP_GLOW_KEYS.at(-1)[1];
}

function colorSnapshot(color) {
  return color ? color.clone() : new THREE.Color(0x000000);
}

function collectVariantMaterials(root) {
  const materials = [];
  root?.traverse((child) => {
    if (!child.isMesh || !child.material) return;
    const childMaterials = Array.isArray(child.material) ? child.material : [child.material];
    for (const source of childMaterials) {
      const material = source.clone();
      material.transparent = true;
      material.userData.chapter3BaseOpacity = Number.isFinite(material.opacity) ? material.opacity : 1;
      if (Array.isArray(child.material)) {
        const index = child.material.indexOf(source);
        child.material[index] = material;
      } else {
        child.material = material;
      }
      materials.push(material);
    }
  });
  return materials;
}

export class Chapter3TimeVisualController {
  constructor(preview) {
    this.preview = preview;
    this.period = null;
    this.transition = null;
    this.variants = new Map();
  }

  discoverVariants() {
    for (const period of Object.keys(PALETTES)) {
      if (this.variants.has(period)) continue;
      const root = this.preview.scene.getObjectByName(`chapter-03-environment-${period.toLowerCase()}`);
      if (!root) continue;
      const materials = collectVariantMaterials(root);
      root.visible = false;
      this.variants.set(period, { root, materials });
    }
  }

  capture() {
    const scene = this.preview.scene;
    const hemi = scene.getObjectByName('city-hemisphere-light');
    const sun = scene.getObjectByName('city-sun-light');
    const fill = scene.getObjectByName('city-fill-light');
    const castLight = CHAPTER3_CAST_LIGHT.chapter3CastLight.value;
    return {
      background: colorSnapshot(scene.background),
      fog: colorSnapshot(scene.fog?.color),
      fogNear: scene.fog?.near ?? PALETTES.AFTERNOON.fogNear,
      fogFar: scene.fog?.far ?? PALETTES.AFTERNOON.fogFar,
      exposure: this.preview.renderer.toneMappingExposure,
      hemiSky: colorSnapshot(hemi?.color),
      hemiGround: colorSnapshot(hemi?.groundColor),
      hemiIntensity: hemi?.intensity ?? 0,
      sun: colorSnapshot(sun?.color),
      sunIntensity: sun?.intensity ?? 0,
      sunPosition: sun?.position?.toArray() || [0, 0, 0],
      fill: colorSnapshot(fill?.color),
      fillIntensity: fill?.intensity ?? 0,
      grade: this.preview.colorGrade ?? PALETTES.AFTERNOON.grade,
      cast: {
        rimColor: CHAPTER3_CAST_LIGHT.chapter3CastRimColor.value.getHex(),
        rimStrength: castLight.x,
        rimPower: castLight.y,
        fill: castLight.z,
      },
    };
  }

  request(period, { immediate = false } = {}) {
    if (!PALETTES[period]) return false;
    this.discoverVariants();
    if (!immediate && period === this.period) return false;
    const fromPeriod = this.period;
    this.period = period;
    this.transition = {
      elapsed: immediate ? TRANSITION_SECONDS : 0,
      duration: TRANSITION_SECONDS,
      from: this.capture(),
      to: PALETTES[period],
      fromVariant: fromPeriod ? this.variants.get(fromPeriod) : null,
      toVariant: this.variants.get(period) || null,
    };
    if (this.transition.toVariant) this.transition.toVariant.root.visible = true;
    this.update(immediate ? TRANSITION_SECONDS : 0);
    return true;
  }

  requestClock(clock, { immediate = false } = {}) {
    if (!clock || !PALETTES[clock.period]) return false;
    const absoluteMinute = absoluteClockMinute(clock);
    if (!immediate && absoluteMinute === this.sampledAbsoluteMinute) return false;
    this.discoverVariants();
    const fromPeriod = this.period;
    this.period = clock.period;
    this.sampledAbsoluteMinute = absoluteMinute;
    this.transition = {
      elapsed: immediate ? TRANSITION_SECONDS : 0,
      duration: TRANSITION_SECONDS,
      from: this.capture(),
      to: chapter3LightForClock(clock),
      fromVariant: fromPeriod ? this.variants.get(fromPeriod) : null,
      toVariant: this.variants.get(clock.period) || null,
    };
    if (this.transition.toVariant) this.transition.toVariant.root.visible = true;
    this.update(immediate ? TRANSITION_SECONDS : 0);
    return true;
  }

  update(dt) {
    if (!this.transition) return;
    this.transition.elapsed = Math.min(this.transition.duration, this.transition.elapsed + Math.max(0, dt));
    const t = this.transition.duration === 0 ? 1 : this.transition.elapsed / this.transition.duration;
    const from = this.transition.from;
    const to = this.transition.to;
    const scene = this.preview.scene;
    const hemi = scene.getObjectByName('city-hemisphere-light');
    const sun = scene.getObjectByName('city-sun-light');
    const fill = scene.getObjectByName('city-fill-light');
    scene.background?.copy(from.background).lerp(new THREE.Color(to.background), t);
    scene.fog?.color.copy(from.fog).lerp(to.fog?.isColor ? to.fog : fogColor(to.fog), t);
    // Linear haze (EchoCity3DPreview); an exponential fog keeps its density.
    if (scene.fog?.isFog) {
      scene.fog.near = THREE.MathUtils.lerp(from.fogNear, to.fogNear, t);
      scene.fog.far = THREE.MathUtils.lerp(from.fogFar, to.fogFar, t);
    }
    this.preview.renderer.toneMappingExposure = THREE.MathUtils.lerp(from.exposure, to.exposure, t);
    this.preview.setColorGrade?.(blendChapter3Grade(from.grade, to.grade, t));
    setChapter3CastLight(blendCast(from.cast, to.cast ?? from.cast, t));
    if (hemi) {
      hemi.color.copy(from.hemiSky).lerp(new THREE.Color(to.hemiSky), t);
      hemi.groundColor.copy(from.hemiGround).lerp(new THREE.Color(to.hemiGround), t);
      hemi.intensity = THREE.MathUtils.lerp(from.hemiIntensity, to.hemiIntensity, t);
    }
    if (sun) {
      sun.color.copy(from.sun).lerp(new THREE.Color(to.sun), t);
      sun.intensity = THREE.MathUtils.lerp(from.sunIntensity, to.sunIntensity, t);
      sun.position.fromArray(from.sunPosition).lerp(new THREE.Vector3().fromArray(to.sunPosition || from.sunPosition), t);
    }
    if (fill) {
      fill.color.copy(from.fill).lerp(new THREE.Color(to.fill), t);
      fill.intensity = THREE.MathUtils.lerp(from.fillIntensity, to.fillIntensity, t);
    }

    const setVariantOpacity = (variant, opacity) => {
      if (!variant) return;
      variant.root.visible = opacity > 0;
      for (const material of variant.materials) {
        material.opacity = material.userData.chapter3BaseOpacity * opacity;
      }
    };
    if (this.transition.fromVariant !== this.transition.toVariant) {
      setVariantOpacity(this.transition.fromVariant, 1 - t);
      setVariantOpacity(this.transition.toVariant, t);
    } else {
      setVariantOpacity(this.transition.toVariant, 1);
    }

    if (t >= 1) {
      if (this.transition.fromVariant && this.transition.fromVariant !== this.transition.toVariant) {
        this.transition.fromVariant.root.visible = false;
      }
      this.transition = null;
    }
  }

  snapshot() {
    return {
      period: this.period,
      transitioning: Boolean(this.transition),
      transitionProgress: this.transition
        ? Number((this.transition.elapsed / this.transition.duration).toFixed(3))
        : 1,
      installedVariants: [...this.variants.keys()],
      expectedRootName: this.period ? `chapter-03-environment-${this.period.toLowerCase()}` : null,
      sampledAbsoluteMinute: this.sampledAbsoluteMinute ?? null,
      sunPosition: this.preview.scene.getObjectByName('city-sun-light')?.position.toArray().map((value) => Number(value.toFixed(2))) || null,
    };
  }
}
