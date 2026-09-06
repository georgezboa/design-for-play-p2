import * as THREE from 'three';

const TRANSITION_SECONDS = 2.8;

const PALETTES = Object.freeze({
  AFTERNOON: Object.freeze({
    background: 0x758b93,
    fog: 0x6f8188,
    fogDensity: 0.0056,
    exposure: 1.12,
    hemiSky: 0x9fbfc5,
    hemiGround: 0x342b2a,
    hemiIntensity: 1.22,
    sun: 0xffc477,
    sunIntensity: 5.3,
    fill: 0x4e8793,
    fillIntensity: 0.82,
  }),
  DUSK: Object.freeze({
    background: 0x596a73,
    fog: 0x52636b,
    fogDensity: 0.0062,
    exposure: 1.04,
    hemiSky: 0x8eaab2,
    hemiGround: 0x292832,
    hemiIntensity: 0.95,
    sun: 0xff9f5e,
    sunIntensity: 4.5,
    fill: 0x466f8c,
    fillIntensity: 1.05,
  }),
  NIGHT: Object.freeze({
    // Preserve midnight blue while keeping paving, doors and the route
    // readable on dim displays. The previous values could crush the whole
    // exterior into black after leaving the hotel.
    background: 0x334b5e,
    fog: 0x31495a,
    fogDensity: 0.0067,
    exposure: 1.1,
    hemiSky: 0x829ab2,
    hemiGround: 0x2d3543,
    hemiIntensity: 1.25,
    sun: 0xa9c0df,
    sunIntensity: 2.65,
    fill: 0x5a93a6,
    fillIntensity: 2.05,
  }),
  DAWN: Object.freeze({
    background: 0x8a9da4,
    fog: 0x829399,
    fogDensity: 0.0059,
    exposure: 1.06,
    hemiSky: 0xb7c8c8,
    hemiGround: 0x4a403d,
    hemiIntensity: 1.08,
    sun: 0xffcf9a,
    sunIntensity: 3.65,
    fill: 0x6d94a0,
    fillIntensity: 0.9,
  }),
});

const TWILIGHT = Object.freeze({
  background: 0x3f5260,
  fog: 0x405461,
  fogDensity: 0.0065,
  exposure: 1.01,
  hemiSky: 0x758c9b,
  hemiGround: 0x252733,
  hemiIntensity: 0.84,
  sun: 0xe78655,
  sunIntensity: 2.25,
  fill: 0x456f8c,
  fillIntensity: 1.32,
});

const LIGHT_KEYS = Object.freeze([
  Object.freeze({ absoluteMinute: 14 * 60 + 20, period: 'AFTERNOON', palette: PALETTES.AFTERNOON, sunPosition: [-34, 52, 26] }),
  Object.freeze({ absoluteMinute: 17 * 60 + 20, period: 'DUSK', palette: PALETTES.DUSK, sunPosition: [-43, 24, 17] }),
  Object.freeze({ absoluteMinute: 20 * 60 + 30, period: 'DUSK', palette: TWILIGHT, sunPosition: [-53, 5, 8] }),
  Object.freeze({ absoluteMinute: 21 * 60 + 29, period: 'DUSK', palette: TWILIGHT, sunPosition: [-55, 2, 6] }),
  Object.freeze({ absoluteMinute: 21 * 60 + 30, period: 'NIGHT', palette: PALETTES.NIGHT, sunPosition: [22, 34, -32] }),
  Object.freeze({ absoluteMinute: 24 * 60 + 5 * 60 + 30, period: 'NIGHT', palette: PALETTES.NIGHT, sunPosition: [18, 28, -28] }),
  Object.freeze({ absoluteMinute: 24 * 60 + 6 * 60 + 20, period: 'DAWN', palette: PALETTES.DAWN, sunPosition: [34, 17, -22] }),
]);

const COLOR_FIELDS = Object.freeze(['background', 'fog', 'hemiSky', 'hemiGround', 'sun', 'fill']);
const NUMBER_FIELDS = Object.freeze(['fogDensity', 'exposure', 'hemiIntensity', 'sunIntensity', 'fillIntensity']);

function absoluteClockMinute(clock) {
  return (Math.max(1, Number(clock?.day) || 1) - 1) * 1440 + Math.max(0, Number(clock?.minuteOfDay) || 0);
}

function blendPalette(from, to, amount) {
  const result = {};
  for (const field of COLOR_FIELDS) {
    result[field] = new THREE.Color(from[field]).lerp(new THREE.Color(to[field]), amount).getHex();
  }
  for (const field of NUMBER_FIELDS) result[field] = THREE.MathUtils.lerp(from[field], to[field], amount);
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
    return {
      background: colorSnapshot(scene.background),
      fog: colorSnapshot(scene.fog?.color),
      fogDensity: scene.fog?.density ?? 0,
      exposure: this.preview.renderer.toneMappingExposure,
      hemiSky: colorSnapshot(hemi?.color),
      hemiGround: colorSnapshot(hemi?.groundColor),
      hemiIntensity: hemi?.intensity ?? 0,
      sun: colorSnapshot(sun?.color),
      sunIntensity: sun?.intensity ?? 0,
      sunPosition: sun?.position?.toArray() || [0, 0, 0],
      fill: colorSnapshot(fill?.color),
      fillIntensity: fill?.intensity ?? 0,
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
    scene.fog?.color.copy(from.fog).lerp(new THREE.Color(to.fog), t);
    if (scene.fog) scene.fog.density = THREE.MathUtils.lerp(from.fogDensity, to.fogDensity, t);
    this.preview.renderer.toneMappingExposure = THREE.MathUtils.lerp(from.exposure, to.exposure, t);
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
