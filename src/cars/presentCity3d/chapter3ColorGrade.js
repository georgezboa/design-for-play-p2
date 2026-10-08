// Chapter 3 · ECHO CITY — the colour grade (round 6, owner note G8: "too
// sallow; it needs the West of Leone's Dollars films").
//
// The grade runs inside the tone-mapping step every lit material already
// performs (THREE.CustomToneMapping = ACES filmic, then this grade), so it
// costs a few ALU ops per fragment and no extra pass, render target or MSAA
// loss, and LOW / LOWEST get exactly the same look as HIGH.
//
// Its parameters are four vec4 uniforms shared by every built-in material:
// they are added to THREE.ShaderLib once, before the first program is built,
// and hold plain {x, y, z, w} objects. UniformsUtils.clone copies a plain
// object by reference (it only clones Vector / Color / Matrix / Texture
// values), so every material's uniform points at the same four objects and
// writing them retunes the whole city without a recompile. A material that
// does not carry them (a custom ShaderMaterial) reads zeros, and zero is the
// identity grade: plain ACES, as before.
//
// Every number below is an offset from the identity, in a gamma-2 display
// space (sqrt of the tone-mapped linear colour):
//   contrast    S-curve slope at mid grey (1 + contrast), ends pinned
//               (0.5 at most)
//   saturation  1 + saturation (luma preserving)
//   lift        black level (negative crushes, positive milks)
//   gamma       a mid-tone bow (positive brightens the mids, ends pinned)
//   gain        per-channel white balance (1 + gain)
//   shadowTint  added to the darks (weighted (1 - luma)^2)
//   highlightTint added to the brights (weighted luma^2)
//   keepWarm    0..1: bright, saturated pixels keep their own saturation
//               (night: firelight and windows stay the only warm colour)
//   grain       film grain amplitude (0 on LOW, where the canvas is upscaled)
import * as THREE from 'three';

const ZERO3 = Object.freeze([0, 0, 0]);

function grade(values) {
  return Object.freeze({
    contrast: 0,
    saturation: 0,
    lift: 0,
    gamma: 0,
    gain: ZERO3,
    shadowTint: ZERO3,
    highlightTint: ZERO3,
    keepWarm: 0,
    grain: 0,
    ...values,
  });
}

export const CHAPTER3_IDENTITY_GRADE = grade({});

export const CHAPTER3_GRADES = Object.freeze({
  // High white sun, bleached sky, hard dark shadows, clean saturated stone.
  // The cool gain takes the amber cast off the AI textures; the shadows sink
  // toward a cold near-black, the highlights stay white rather than gold.
  AFTERNOON: grade({
    contrast: 0.22,
    saturation: 0.05,
    lift: 0.0,
    gamma: 0.04,
    gain: Object.freeze([-0.035, -0.005, 0.045]),
    shadowTint: Object.freeze([-0.012, 0.0, 0.022]),
    highlightTint: Object.freeze([0.012, 0.008, 0.0]),
    grain: 0.022,
  }),
  // Blood-orange low sun behind the street: crushed blacks for the
  // silhouettes, hot orange highlights, a purple-red shadow side.
  DUSK: grade({
    contrast: 0.26,
    saturation: -0.04,
    lift: 0.0,
    gamma: 0.0,
    gain: Object.freeze([0.0, 0.0, -0.02]),
    shadowTint: Object.freeze([0.006, -0.008, 0.026]),
    highlightTint: Object.freeze([0.02, 0.01, -0.012]),
    grain: 0.026,
  }),
  // Day-for-night: everything goes to moonlit blue, mid-tones desaturated,
  // while bright warm pixels (fire, lamps, windows) keep their colour.
  NIGHT: grade({
    contrast: 0.12,
    saturation: -0.42,
    lift: 0.012,
    gamma: 0.06,
    gain: Object.freeze([-0.12, -0.02, 0.12]),
    shadowTint: Object.freeze([-0.01, 0.006, 0.05]),
    highlightTint: Object.freeze([0.0, 0.0, 0.0]),
    keepWarm: 0.85,
    grain: 0.03,
  }),
  // Cool, clear, low light; a thin mist does the rest (fog).
  DAWN: grade({
    contrast: 0.1,
    saturation: -0.02,
    lift: 0.0,
    gamma: 0.03,
    gain: Object.freeze([-0.07, 0.0, 0.07]),
    shadowTint: Object.freeze([-0.008, 0.004, 0.028]),
    highlightTint: Object.freeze([0.006, 0.006, 0.006]),
    grain: 0.02,
  }),
  // The ministry and the hotel keep their own practical lights: a gentle,
  // neutral contrast only.
  INTERIOR: grade({
    contrast: 0.1,
    saturation: 0.06,
    lift: -0.015,
    gain: Object.freeze([-0.01, 0.0, 0.01]),
    grain: 0.02,
  }),
});

const lerp = (a, b, t) => a + (b - a) * t;
const lerp3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

export function blendChapter3Grade(from, to, amount) {
  const t = Math.min(1, Math.max(0, Number(amount) || 0));
  const a = from ?? CHAPTER3_IDENTITY_GRADE;
  const b = to ?? CHAPTER3_IDENTITY_GRADE;
  return {
    contrast: lerp(a.contrast, b.contrast, t),
    saturation: lerp(a.saturation, b.saturation, t),
    lift: lerp(a.lift, b.lift, t),
    gamma: lerp(a.gamma, b.gamma, t),
    gain: lerp3(a.gain, b.gain, t),
    shadowTint: lerp3(a.shadowTint, b.shadowTint, t),
    highlightTint: lerp3(a.highlightTint, b.highlightTint, t),
    keepWarm: lerp(a.keepWarm, b.keepWarm, t),
    grain: lerp(a.grain, b.grain, t),
  };
}

// The four shared uniform values (plain objects on purpose: see the header).
export const CHAPTER3_GRADE_UNIFORMS = Object.freeze({
  chapter3GradeA: { value: { x: 0, y: 0, z: 0, w: 0 } }, // contrast, saturation, lift, gamma
  chapter3GradeB: { value: { x: 0, y: 0, z: 0, w: 0 } }, // gain rgb, keepWarm
  chapter3GradeC: { value: { x: 0, y: 0, z: 0, w: 0 } }, // shadow tint rgb, grain
  chapter3GradeD: { value: { x: 0, y: 0, z: 0, w: 0 } }, // highlight tint rgb, time
});

export const CHAPTER3_GRADE_GLSL = `
uniform vec4 chapter3GradeA;
uniform vec4 chapter3GradeB;
uniform vec4 chapter3GradeC;
uniform vec4 chapter3GradeD;
vec3 CustomToneMapping( vec3 color ) {
	vec3 c = sqrt( ACESFilmicToneMapping( color ) );
	c *= vec3( 1.0 ) + chapter3GradeB.rgb;
	float luma = dot( c, vec3( 0.2126, 0.7152, 0.0722 ) );
	float chroma = max( c.r, max( c.g, c.b ) ) - min( c.r, min( c.g, c.b ) );
	float keep = chapter3GradeB.w * smoothstep( 0.42, 0.78, luma ) * smoothstep( 0.08, 0.3, chroma );
	float saturation = mix( 1.0 + chapter3GradeA.y, max( 1.0 + chapter3GradeA.y, 1.05 ), keep );
	c = clamp( mix( vec3( luma ), c, saturation ), 0.0, 1.0 );
	// An S-curve that keeps black at black and white at white (a straight
	// contrast line crushed the shadows to zero); slope 1 + contrast at mid
	// grey. Polynomial only: no pow on software GPUs.
	c = mix( c, c * c * ( 3.0 - 2.0 * c ), 2.0 * chapter3GradeA.x );
	float l = clamp( luma, 0.0, 1.0 );
	c += chapter3GradeC.rgb * ( ( 1.0 - l ) * ( 1.0 - l ) * ( 1.0 - keep ) ) + chapter3GradeD.rgb * ( l * l );
	c += chapter3GradeA.z * ( 1.0 - c );
	// Gamma as a mid-tone bow, ends pinned.
	c += chapter3GradeA.w * c * ( 1.0 - c );
	// Film grain: interleaved gradient noise, a new offset every frame.
	vec2 grainAt = gl_FragCoord.xy + 64.0 * fract( chapter3GradeD.w * 7.31 );
	float grain = fract( 52.9829189 * fract( dot( grainAt, vec2( 0.06711056, 0.00583715 ) ) ) ) - 0.5;
	c += grain * chapter3GradeC.w * ( 1.0 - 0.6 * l );
	c = clamp( c, 0.0, 1.0 );
	return c * c;
}`;

// The built-in material shaders that tone-map their output.
const GRADED_SHADERS = Object.freeze(['basic', 'lambert', 'phong', 'standard', 'physical', 'toon', 'matcap', 'points', 'dashed', 'sprite']);
const IDENTITY_TONE_MAPPING = 'vec3 CustomToneMapping( vec3 color ) { return color; }';

// Once per page, before the renderer builds its first program. Returns
// false when this three.js no longer has the hook it replaces (the city then
// renders with plain ACES, as before).
export function installChapter3ColorGrade(three = THREE) {
  const chunk = three.ShaderChunk;
  if (chunk.tonemapping_pars_fragment.includes('chapter3GradeA')) return true;
  if (!chunk.tonemapping_pars_fragment.includes(IDENTITY_TONE_MAPPING)) return false;
  chunk.tonemapping_pars_fragment = chunk.tonemapping_pars_fragment.replace(IDENTITY_TONE_MAPPING, CHAPTER3_GRADE_GLSL);
  for (const id of GRADED_SHADERS) {
    const shader = three.ShaderLib[id];
    if (shader) Object.assign(shader.uniforms, CHAPTER3_GRADE_UNIFORMS);
  }
  return true;
}

// Writes a grade into the shared uniforms. `time` (seconds) moves the grain.
export function applyChapter3Grade(gradeValues, { time = 0, grain = true } = {}) {
  const g = gradeValues ?? CHAPTER3_IDENTITY_GRADE;
  const { chapter3GradeA: a, chapter3GradeB: b, chapter3GradeC: c, chapter3GradeD: d } = CHAPTER3_GRADE_UNIFORMS;
  a.value.x = g.contrast;
  a.value.y = g.saturation;
  a.value.z = g.lift;
  a.value.w = g.gamma;
  [b.value.x, b.value.y, b.value.z] = g.gain;
  b.value.w = g.keepWarm;
  [c.value.x, c.value.y, c.value.z] = g.shadowTint;
  c.value.w = grain ? g.grain : 0;
  [d.value.x, d.value.y, d.value.z] = g.highlightTint;
  // Wrapped so the shader's float keeps its precision over a long session.
  d.value.w = (Number(time) || 0) % 97;
  return g;
}

export function chapter3GradeSnapshot() {
  const { chapter3GradeA: a, chapter3GradeB: b, chapter3GradeC: c } = CHAPTER3_GRADE_UNIFORMS;
  const r = (value) => Number(value.toFixed(3));
  return {
    contrast: r(a.value.x),
    saturation: r(a.value.y),
    lift: r(a.value.z),
    gamma: r(a.value.w),
    gain: [r(b.value.x), r(b.value.y), r(b.value.z)],
    keepWarm: r(b.value.w),
    grain: r(c.value.w),
  };
}
