// Chapter 5 — adaptive render quality for the first-person museum.
//
// Alpha round 1 (A3-7): museum-3d drew at 0.1–0.2 fps on software GL
// (SwiftShader), even at 320×180. Profiled headless at 1280×720, one lobby
// frame cost, roughly:
//   · transmission glass: 20 MeshPhysical panes with `transmission` make three
//     render the whole opaque scene a second time (231 → 124 draw calls);
//   · the PMREM room environment, sampled per pixel by every PBR material;
//   · three RectAreaLights (LTC per pixel) and a 2048² PCF-soft shadow;
//   · MeshStandard/Physical shading itself, and 4× MSAA.
// Geometry is small (≈28k triangles), so the cost is per pixel, not per vertex.
//
// The low tier keeps the room readable and drops what is expensive per pixel:
// no shadows, no environment map, no rect lights, Lambert materials (glass
// stays a pale transparent pane), single-mip texture sampling, MSAA off and a
// render scale below 1 on a software renderer. The tier is chosen from the renderer string (a software
// rasteriser starts low), then from the median frame time over the first 2 s,
// and can be forced by a setting (`graphicsQuality: 'low' | 'high' | 'auto'`,
// or the checkbox `lowGraphics`).

export const QUALITY_SAMPLE_SECONDS = 2;
export const SLOW_FRAME_MS = 45;
export const LOW_PIXEL_RATIO = 1;
export const SOFTWARE_PIXEL_RATIO = 0.6;
// The PMREM room and the rect lights lit the lobby; Lambert without them
// reads far darker. The low tier stands in for them with two cheap terms:
//   · LOW_SHEEN, a flat emissive on every PBR stand-in: the grey the room's
//     environment gave a rough surface at a grazing angle (the carpet most);
//   · a fill (a hemisphere and one shadowless light from straight above),
//     scaled per space so the corridor keeps its dimmer, later red mood.
export const LOW_SHEEN = 0x38342f;
export const LOW_NORMAL_MAPS = true;
// Round 3: a LOW frame without MSAA can end on an FXAA pass
// (Museum3DApp._renderFrame), but only on a GPU: on a software rasteriser
// the pass costs more than the frame it smooths (measured 17–50 ms).
export function lowTierWantsFxaa({ software = false, contextAntialias = false } = {}) {
  return !software && !contextAntialias;
}
export const LOW_FILL = Object.freeze({ hemisphere: 1.6, overhead: 1.2 });
export const LOW_FILL_SCALE = Object.freeze({ lobby: 1, corridor: 0.55, collapse: 0.2, echo: 0.6 });

const SOFTWARE_RENDERER = /swiftshader|llvmpipe|softpipe|software|microsoft basic render|mesa offscreen/i;

export function isSoftwareRendererName(name = '') {
  return SOFTWARE_RENDERER.test(String(name));
}

// The unmasked renderer string of a WebGL context ('' if the browser hides it).
export function rendererName(gl) {
  try {
    const ext = gl?.getExtension?.('WEBGL_debug_renderer_info');
    return String(gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER) ?? '');
  } catch {
    return '';
  }
}

// Probe the GPU before the real renderer exists, so MSAA (which cannot be
// turned off later) is never asked of a software rasteriser.
export function probeSoftwareRenderer(doc = globalThis.document) {
  try {
    const canvas = doc?.createElement?.('canvas');
    const gl = canvas?.getContext?.('webgl2') ?? canvas?.getContext?.('webgl');
    if (!gl) return { software: false, name: '' };
    const name = rendererName(gl);
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return { software: isSoftwareRendererName(name), name };
  } catch {
    return { software: false, name: '' };
  }
}

// What the player asked for: 'low', 'high' or 'auto'.
export function qualityPreference(settings = {}) {
  if (settings?.lowGraphics === true) return 'low';
  const value = String(settings?.graphicsQuality ?? 'auto').toLowerCase();
  return value === 'low' || value === 'high' ? value : 'auto';
}

// The decision, free of three.js. Feed it frame times (ms) and it settles on
// a tier once QUALITY_SAMPLE_SECONDS of frames (or one very slow frame) have
// been seen. `software` starts it low; `preference` overrides everything.
export function createQualityGovernor({
  software = false,
  preference = 'auto',
  sampleSeconds = QUALITY_SAMPLE_SECONDS,
  slowFrameMs = SLOW_FRAME_MS,
  skipFrames = 3,
} = {}) {
  const state = {
    tier: preference === 'low' || (preference === 'auto' && software) ? 'low' : 'high',
    decided: preference !== 'auto' || software,
    reason: preference !== 'auto' ? `setting:${preference}` : software ? 'software-renderer' : 'measuring',
    preference,
    software,
    samples: [],
    sampledMs: 0,
    medianMs: null,
  };
  let skipped = 0;

  function median(values) {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  // Returns the tier to switch to, or null when nothing changes.
  function sample(frameMs) {
    if (state.decided || !Number.isFinite(frameMs) || frameMs <= 0) return null;
    // The first frames compile shaders; they say nothing about steady state.
    if (skipped < skipFrames) {
      skipped += 1;
      // ...unless one alone takes longer than the whole sampling window.
      if (frameMs < sampleSeconds * 1000) return null;
    }
    state.samples.push(frameMs);
    state.sampledMs += frameMs;
    if (state.sampledMs < sampleSeconds * 1000) return null;
    state.medianMs = median(state.samples);
    state.decided = true;
    if (state.medianMs > slowFrameMs) {
      state.tier = 'low';
      state.reason = `slow:${Math.round(state.medianMs)}ms`;
      return 'low';
    }
    state.reason = `fast:${Math.round(state.medianMs)}ms`;
    return null;
  }

  // A settings change: 'low' / 'high' force the tier; 'auto' re-measures.
  function setPreference(next) {
    state.preference = next;
    if (next === 'low' || next === 'high') {
      const changed = state.tier !== next;
      state.tier = next;
      state.decided = true;
      state.reason = `setting:${next}`;
      return changed ? next : null;
    }
    const target = software ? 'low' : 'high';
    const changed = state.tier !== target;
    state.tier = target;
    state.decided = software;
    state.reason = software ? 'software-renderer' : 'measuring';
    state.samples = [];
    state.sampledMs = 0;
    skipped = 0;
    return changed ? target : null;
  }

  return {
    state,
    sample,
    setPreference,
    get tier() { return state.tier; },
    snapshot: () => ({
      tier: state.tier,
      reason: state.reason,
      decided: state.decided,
      software: state.software,
      preference: state.preference,
      medianMs: state.medianMs === null ? null : Math.round(state.medianMs),
    }),
  };
}

// ---------------------------------------------------------------- applying

// Lambert stand-in for a PBR material: same colour, maps, transparency.
// Transmission glass becomes a plain pale pane.
function lambertFor(Lambert, m) {
  const glass = (m.transmission ?? 0) > 0;
  const lambert = new Lambert({
    name: `${m.name || m.type}:low`,
    color: m.color?.clone?.(),
    map: m.map ?? null,
    alphaMap: m.alphaMap ?? null,
    aoMap: m.aoMap ?? null,
    emissive: m.emissive?.clone?.(),
    emissiveMap: m.emissiveMap ?? null,
    emissiveIntensity: m.emissiveIntensity ?? 1,
    // Round 3: the low tier keeps the shell's normal maps (plaster, carpet
    // pile, wood grain), so walls and floors do not flatten into colour.
    ...(LOW_NORMAL_MAPS && !glass && m.normalMap ? { normalMap: m.normalMap, normalScale: m.normalScale?.clone?.() } : {}),
    transparent: m.transparent || glass,
    opacity: glass ? Math.min(0.32, Math.max(0.16, m.opacity ?? 0.2)) : m.opacity,
    alphaTest: m.alphaTest ?? 0,
    side: m.side,
    depthWrite: m.depthWrite,
    depthTest: m.depthTest,
    vertexColors: m.vertexColors,
    fog: m.fog,
    visible: m.visible,
    toneMapped: m.toneMapped,
    polygonOffset: m.polygonOffset,
    polygonOffsetFactor: m.polygonOffsetFactor,
    polygonOffsetUnits: m.polygonOffsetUnits,
  });
  lambert.userData = { ...m.userData, highTier: m };
  if (!glass && (m.emissive?.getHex?.() ?? 0) === 0) {
    lambert.userData.sheen = LOW_SHEEN;
    lambert.emissive.setHex(LOW_SHEEN);
  }
  return lambert;
}

// Downgrade or restore everything under `root`. Idempotent: run it again
// after a scene adds objects (a reveal, the collapse) and only the new ones
// change. `Lambert` is THREE.MeshLambertMaterial.
const MAP_SLOTS = ['map', 'alphaMap', 'aoMap', 'emissiveMap', 'lightMap', 'bumpMap', 'normalMap', 'roughnessMap', 'metalnessMap'];
const LINEAR_MIPMAP_NEAREST = 1007; // THREE.LinearMipmapNearestFilter
const LINEAR_MIPMAP_LINEAR = 1008; // THREE.LinearMipmapLinearFilter

// Texture sampling was the next cost on SwiftShader once the lighting was
// cheap: 4× anisotropy and trilinear filtering on the 1024² floor and walls.
// The low tier samples one mip level, unfiltered across levels.
function textureQuality(texture, low) {
  if (!texture?.isTexture) return;
  const saved = texture.userData.highSampling;
  if (low && !saved) {
    if (texture.anisotropy <= 1 && texture.minFilter !== LINEAR_MIPMAP_LINEAR) return;
    texture.userData.highSampling = { anisotropy: texture.anisotropy, minFilter: texture.minFilter };
    texture.anisotropy = 1;
    if (texture.minFilter === LINEAR_MIPMAP_LINEAR) texture.minFilter = LINEAR_MIPMAP_NEAREST;
    // Not loaded yet: the upload will read the new sampling when it comes.
    if (texture.image) texture.needsUpdate = true;
  } else if (!low && saved) {
    texture.anisotropy = saved.anisotropy;
    texture.minFilter = saved.minFilter;
    delete texture.userData.highSampling;
    if (texture.image) texture.needsUpdate = true;
  }
}

export function applySceneQuality(root, tier, { Lambert, cache = new Map() } = {}) {
  const low = tier === 'low';
  const sample = (m) => { if (m) MAP_SLOTS.forEach((slot) => textureQuality(m[slot], low)); };
  const swap = (m) => {
    if (!m) return m;
    if (low) {
      if (!(m.isMeshStandardMaterial || m.isMeshPhysicalMaterial)) return m;
      if (!cache.has(m)) cache.set(m, lambertFor(Lambert, m));
      return cache.get(m);
    }
    return m.userData?.highTier ?? m;
  };
  let changed = 0;
  root.traverse((o) => {
    if (o.isMesh || o.isSkinnedMesh || o.isInstancedMesh) {
      const next = Array.isArray(o.material) ? o.material.map(swap) : swap(o.material);
      const differs = Array.isArray(next) ? next.some((m, i) => m !== o.material[i]) : next !== o.material;
      if (differs) { o.material = next; changed += 1; }
      [].concat(o.material).forEach(sample);
      if (low && o.castShadow) { o.userData.highCastShadow = true; o.castShadow = false; }
      if (!low && o.userData.highCastShadow) { o.castShadow = true; delete o.userData.highCastShadow; }
    }
    if (o.isRectAreaLight) {
      if (low && o.userData.lowHidden !== true) { o.userData.lowHidden = o.visible; o.visible = false; }
      if (!low && o.userData.lowHidden !== undefined) { o.visible = o.userData.lowHidden !== false; delete o.userData.lowHidden; }
    }
    // Round 3: a case's real light on HIGH, its painted light pool on LOW
    // (assets/CaseLighting.js).
    const only = o.userData?.tierVisibility;
    if (only === 'low' || only === 'high') o.visible = (only === 'low') === low;
  });
  return changed;
}

// Scenes animate some materials through stored references (a fading chip, a
// lamp's glow). While the low tier is on, carry any change made to an
// original over to its Lambert stand-in. Only changes are copied, so code
// that animates `mesh.material` directly (the stand-in) is left alone.
export function syncLowMaterials(cache) {
  cache.forEach((low, high) => {
    const seen = low.userData.seen ?? (low.userData.seen = {});
    const glass = (high.transmission ?? 0) > 0;
    if (seen.opacity !== high.opacity) {
      seen.opacity = high.opacity;
      if (!glass) low.opacity = high.opacity;
    }
    if (seen.visible !== high.visible) { seen.visible = high.visible; low.visible = high.visible; }
    if (seen.emissiveIntensity !== high.emissiveIntensity) {
      seen.emissiveIntensity = high.emissiveIntensity;
      low.emissiveIntensity = high.emissiveIntensity ?? 1;
    }
    const color = high.color?.getHex?.();
    if (color !== undefined && seen.color !== color) { seen.color = color; low.color.setHex(color); }
    const emissive = high.emissive?.getHex?.();
    if (emissive !== undefined && seen.emissive !== emissive) {
      seen.emissive = emissive;
      low.emissive.setHex(emissive);
      // The sheen stands in for the environment only while nothing glows.
      if (low.userData.sheen && emissive === 0) low.emissive.setHex(low.userData.sheen);
    }
    if (low.map !== (high.map ?? null)) { low.map = high.map ?? null; low.needsUpdate = true; }
  });
}

export function applyRendererQuality(renderer, scene, tier, { software = false, environment = null, devicePixelRatio = 1, highPixelRatio = 1.35 } = {}) {
  const low = tier === 'low';
  renderer.shadowMap.enabled = !low;
  const ratio = low
    ? Math.min(devicePixelRatio || 1, software ? SOFTWARE_PIXEL_RATIO : LOW_PIXEL_RATIO)
    : Math.min(devicePixelRatio || 1, highPixelRatio);
  if (renderer.getPixelRatio() !== ratio) renderer.setPixelRatio(ratio);
  scene.environment = low ? null : environment;
}

// How bright the low tier's fill is in a space (and during the collapse).
export function lowFillScale(sceneName, phase) {
  if (phase === 'collapse') return LOW_FILL_SCALE.collapse;
  return LOW_FILL_SCALE[sceneName] ?? LOW_FILL_SCALE.corridor;
}
