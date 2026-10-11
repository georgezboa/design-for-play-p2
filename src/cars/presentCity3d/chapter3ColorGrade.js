// Chapter 3 · ECHO CITY — the colour grade.
//
// Round 12 (owner note: "第三章的色彩我不喜欢 要极乐迪斯科的体感"): the city is
// graded like a Disco Elysium street painting instead of the round-6 Leone
// western (G8). The afternoon is still the afternoon, but the light is the
// painter's: a soft, slightly hazy day; warm cream and ochre where the light
// lands, cool slate and teal in the shadows (coloured, never black); a muted
// palette of grey-greens, olive, ochre and rust, dirty off-white instead of
// white, and only a few saturated accents (the cast, the fire, the lamps).
//
// The grade runs inside the tone-mapping step every lit material already
// performs (THREE.CustomToneMapping = ACES filmic, then this grade), so it
// costs a few ALU ops per fragment and no extra pass, render target or MSAA
// loss, and LOW / LOWEST get exactly the same palette as HIGH (HIGH adds the
// painterly pass on top, chapter3Painterly.js).
//
// Its parameters are six vec4 uniforms shared by every built-in material:
// they are added to THREE.ShaderLib once, before the first program is built,
// and hold plain {x, y, z, w} objects. UniformsUtils.clone copies a plain
// object by reference (it only clones Vector / Color / Matrix / Texture
// values), so every material's uniform points at the same six objects and
// writing them retunes the whole city without a recompile. A material that
// does not carry them (a custom ShaderMaterial) reads zeros, and zero is the
// identity grade: plain ACES.
//
// Every number below is an offset from the identity, in a gamma-2 display
// space (sqrt of the tone-mapped linear colour):
//   contrast    S-curve slope at mid grey (1 + contrast), ends pinned
//               (0.5 at most)
//   saturation  1 + saturation (luma preserving)
//   (the next three work in a red-green / yellow-blue plane, luma kept:
//   piecewise-linear, so cheap, and selective by hue)
//   khaki       0..1: yellows lose the red in them (the AI limestone's
//               sallow, salmon cast goes to a khaki / ochre cream); oranges
//               and reds (rust, the fire, the rose scarf) are left alone
//   teal        0..1: blues lean toward green (sky, water, slate shadows)
//   rust        0..1: oranges and orange-reds keep more of their colour than
//               the rest (the rust roads, lamps, the rose scarf: the few
//               saturated accents of the palette)
//   lift        black level (negative crushes, positive milks)
//   liftTint    a coloured black floor: shadows lift toward this colour
//               instead of toward grey (the painter's cool shadow)
//   gamma       a mid-tone bow (positive brightens the mids, ends pinned)
//   gain        per-channel white balance (1 + gain)
//   shadowTint  added to the darks (weighted (1 - luma)^2)
//   highlightTint added to the brights (weighted luma^2)
//   keepWarm    0..1: bright, saturated pixels keep their own colour (night:
//               firelight and windows stay the only warm colour)
//   grain       film grain amplitude (only on HIGH without the painterly
//               pass; the painted canvas replaces it)
import * as THREE from 'three';

const ZERO3 = Object.freeze([0, 0, 0]);

function grade(values) {
  return Object.freeze({
    contrast: 0,
    saturation: 0,
    khaki: 0,
    teal: 0,
    rust: 0,
    lift: 0,
    liftTint: ZERO3,
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

const rgb3 = (r, g, b) => Object.freeze([r, g, b]);

export const CHAPTER3_GRADES = Object.freeze({
  // The painted afternoon: soft and a little hazy, warm cream light, slate
  // and teal shadows lifted off black, the sienna roads a muted rust and the
  // sallow limestone a khaki / ochre cream.
  AFTERNOON: grade({
    contrast: 0.06,
    saturation: -0.3,
    khaki: 0.55,
    teal: 0.6,
    rust: 0.6,
    lift: 0.06,
    liftTint: rgb3(-0.024, 0.012, 0.024),
    gamma: 0.02,
    gain: rgb3(0.0, -0.01, -0.035),
    shadowTint: rgb3(-0.055, 0.016, 0.05),
    highlightTint: rgb3(0.035, 0.014, -0.025),
    grain: 0.018,
  }),
  // A dusty rose-orange evening: warm light on the tops, violet-slate
  // shadows, the blacks still held off for the silhouettes to read.
  DUSK: grade({
    contrast: 0.06,
    saturation: -0.2,
    khaki: 0.3,
    teal: 0.4,
    rust: 0.2,
    lift: 0.06,
    liftTint: rgb3(-0.012, -0.002, 0.024),
    gamma: 0.03,
    gain: rgb3(0.0, -0.015, -0.03),
    shadowTint: rgb3(-0.024, -0.004, 0.03),
    highlightTint: rgb3(0.024, 0.008, -0.02),
    grain: 0.02,
  }),
  // The painter's night: ink blue going to teal, desaturated, a coloured
  // floor under the darks; fire, lamps and windows keep their own warmth.
  NIGHT: grade({
    contrast: 0.06,
    saturation: -0.36,
    khaki: 0.6,
    teal: 0.5,
    lift: 0.06,
    liftTint: rgb3(-0.02, 0.01, 0.026),
    gamma: 0.05,
    gain: rgb3(-0.1, -0.01, 0.06),
    shadowTint: rgb3(-0.014, 0.012, 0.03),
    highlightTint: rgb3(0.008, 0.004, -0.004),
    keepWarm: 0.85,
    grain: 0.024,
  }),
  // A pale grey-green morning in mist, a peach light on the tops.
  DAWN: grade({
    contrast: 0.02,
    saturation: -0.24,
    khaki: 0.7,
    teal: 0.4,
    rust: 0.3,
    lift: 0.08,
    liftTint: rgb3(-0.016, 0.01, 0.016),
    gamma: 0.03,
    gain: rgb3(0.0, -0.006, -0.03),
    shadowTint: rgb3(-0.022, 0.008, 0.02),
    highlightTint: rgb3(0.016, 0.006, -0.012),
    grain: 0.018,
  }),
  // The ministry and the hotel keep their own practical lights; the same
  // painted palette, a little warmer and closer (lamplight on dirty plaster,
  // cool green-grey in the corners).
  INTERIOR: grade({
    contrast: 0.06,
    saturation: -0.24,
    khaki: 0.5,
    teal: 0.4,
    rust: 0.5,
    lift: 0.05,
    liftTint: rgb3(-0.018, 0.01, 0.018),
    gamma: 0.02,
    gain: rgb3(0.0, -0.02, -0.06),
    shadowTint: rgb3(-0.04, 0.012, 0.035),
    highlightTint: rgb3(0.025, 0.01, -0.03),
    grain: 0.016,
  }),
});

const GRADE_NUMBERS = Object.freeze(['contrast', 'saturation', 'khaki', 'teal', 'rust', 'lift', 'gamma', 'keepWarm', 'grain']);
const GRADE_TRIPLES = Object.freeze(['liftTint', 'gain', 'shadowTint', 'highlightTint']);

const lerp = (a, b, t) => a + (b - a) * t;
const lerp3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

export function blendChapter3Grade(from, to, amount) {
  const t = Math.min(1, Math.max(0, Number(amount) || 0));
  const a = { ...CHAPTER3_IDENTITY_GRADE, ...(from ?? {}) };
  const b = { ...CHAPTER3_IDENTITY_GRADE, ...(to ?? {}) };
  const result = {};
  for (const field of GRADE_NUMBERS) result[field] = lerp(a[field], b[field], t);
  for (const field of GRADE_TRIPLES) result[field] = lerp3(a[field], b[field], t);
  return result;
}

// The six shared uniform values (plain objects on purpose: see the header).
export const CHAPTER3_GRADE_UNIFORMS = Object.freeze({
  chapter3GradeA: { value: { x: 0, y: 0, z: 0, w: 0 } }, // contrast, saturation, lift, gamma
  chapter3GradeB: { value: { x: 0, y: 0, z: 0, w: 0 } }, // gain rgb, keepWarm
  chapter3GradeC: { value: { x: 0, y: 0, z: 0, w: 0 } }, // shadow tint rgb, grain
  chapter3GradeD: { value: { x: 0, y: 0, z: 0, w: 0 } }, // highlight tint rgb, time
  chapter3GradeE: { value: { x: 0, y: 0, z: 0, w: 0 } }, // khaki, teal, rust, -
  chapter3GradeF: { value: { x: 0, y: 0, z: 0, w: 0 } }, // lift tint rgb, -
});

export const CHAPTER3_GRADE_GLSL = `
uniform vec4 chapter3GradeA;
uniform vec4 chapter3GradeB;
uniform vec4 chapter3GradeC;
uniform vec4 chapter3GradeD;
uniform vec4 chapter3GradeE;
uniform vec4 chapter3GradeF;
vec3 CustomToneMapping( vec3 color ) {
	vec3 c = sqrt( ACESFilmicToneMapping( color ) );
	c *= vec3( 1.0 ) + chapter3GradeB.rgb;
	float luma = dot( c, vec3( 0.2126, 0.7152, 0.0722 ) );
	// Uniform branches (the same way for every pixel): the night-only warm
	// keep and the grain cost nothing when they are off.
	float keep = 0.0;
	if ( chapter3GradeB.w > 0.0 ) {
		float chroma = max( c.r, max( c.g, c.b ) ) - min( c.r, min( c.g, c.b ) );
		keep = chapter3GradeB.w * smoothstep( 0.42, 0.78, luma ) * smoothstep( 0.08, 0.3, chroma );
	}
	float saturation = mix( 1.0 + chapter3GradeA.y, max( 1.0 + chapter3GradeA.y, 1.05 ), keep );
	// The palette, in a red-green / yellow-blue plane with luma kept
	// (piecewise-linear and selective by hue): yellows shed their red
	// (khaki), blues lean green (teal), oranges keep their colour (rust);
	// the warm lights at night are left as they are.
	vec2 ab = vec2( c.r - c.g, 0.5 * ( c.r + c.g ) - c.b );
	float khaki = max( 0.0, min( ab.y - ab.x, ab.x ) );
	float teal = max( 0.0, -ab.y - max( ab.x, 0.0 ) );
	ab.x -= ( chapter3GradeE.x * khaki + chapter3GradeE.y * teal ) * ( 1.0 - keep );
	float rust = max( 0.0, min( ab.x, ab.x - abs( ab.y - ab.x ) ) );
	ab *= saturation * ( 1.0 + chapter3GradeE.z * ( 1.0 - keep ) * rust / max( length( ab ), 1e-3 ) );
	float h = luma + 0.2513 * ab.x + 0.0722 * ab.y;
	c = clamp( vec3( h + 0.5 * ab.x, h - 0.5 * ab.x, h - ab.y ), 0.0, 1.0 );
	// An S-curve that keeps black at black and white at white (a straight
	// contrast line crushed the shadows to zero); slope 1 + contrast at mid
	// grey. Polynomial only: no pow on software GPUs.
	c = mix( c, c * c * ( 3.0 - 2.0 * c ), 2.0 * chapter3GradeA.x );
	float l = clamp( luma, 0.0, 1.0 );
	c += chapter3GradeC.rgb * ( ( 1.0 - l ) * ( 1.0 - l ) * ( 1.0 - keep ) ) + chapter3GradeD.rgb * ( l * l );
	// The black floor lifts toward a colour (cool shadows, not grey ones).
	c += ( vec3( chapter3GradeA.z ) + chapter3GradeF.rgb * ( 1.0 - keep ) ) * ( 1.0 - c );
	// Gamma as a mid-tone bow, ends pinned.
	c += chapter3GradeA.w * c * ( 1.0 - c );
	// Film grain: interleaved gradient noise (still under REDUCE MOTION).
	if ( chapter3GradeC.w > 0.0 ) {
		vec2 grainAt = gl_FragCoord.xy + 64.0 * fract( chapter3GradeD.w * 7.31 );
		float grain = fract( 52.9829189 * fract( dot( grainAt, vec2( 0.06711056, 0.00583715 ) ) ) ) - 0.5;
		c += grain * chapter3GradeC.w * ( 1.0 - 0.6 * l );
	}
	c = clamp( c, 0.0, 1.0 );
	return c * c;
}`;

// The built-in material shaders that tone-map their output.
const GRADED_SHADERS = Object.freeze(['basic', 'lambert', 'phong', 'standard', 'physical', 'toon', 'matcap', 'points', 'dashed', 'sprite']);
const IDENTITY_TONE_MAPPING = 'vec3 CustomToneMapping( vec3 color ) { return color; }';

// Once per page, before the renderer builds its first program. Returns
// false when this three.js no longer has the hook it replaces (the city then
// renders with plain ACES).
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

// Writes a grade into the shared uniforms. `time` (seconds) moves the grain;
// pass a constant (0) for a still grain.
export function applyChapter3Grade(gradeValues, { time = 0, grain = true } = {}) {
  const g = { ...CHAPTER3_IDENTITY_GRADE, ...(gradeValues ?? {}) };
  const {
    chapter3GradeA: a, chapter3GradeB: b, chapter3GradeC: c, chapter3GradeD: d, chapter3GradeE: e, chapter3GradeF: f,
  } = CHAPTER3_GRADE_UNIFORMS;
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
  e.value.x = g.khaki;
  e.value.y = g.teal;
  e.value.z = g.rust;
  [f.value.x, f.value.y, f.value.z] = g.liftTint;
  return g;
}

// The grade's CPU twin, for tests and palette checks: a display-space colour
// in (sRGB-ish 0..1, before the grade), out as the graded display colour.
// It mirrors CHAPTER3_GRADE_GLSL after the ACES step (gamma-2 approximation;
// grain left out).
export function chapter3GradeDisplayColor([r, g, b], gradeValues) {
  const p = { ...CHAPTER3_IDENTITY_GRADE, ...(gradeValues ?? {}) };
  const clamp01 = (value) => Math.min(1, Math.max(0, value));
  const smooth = (e0, e1, x) => { const t = clamp01((x - e0) / (e1 - e0)); return t * t * (3 - 2 * t); };
  let c = [r, g, b].map((value, index) => value * (1 + p.gain[index]));
  const luma = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  let keep = 0;
  if (p.keepWarm > 0) {
    const chroma = Math.max(...c) - Math.min(...c);
    keep = p.keepWarm * smooth(0.42, 0.78, luma) * smooth(0.08, 0.3, chroma);
  }
  const saturation = lerp(1 + p.saturation, Math.max(1 + p.saturation, 1.05), keep);
  const b0 = 0.5 * (c[0] + c[1]) - c[2];
  let a0 = c[0] - c[1];
  const khaki = Math.max(0, Math.min(b0 - a0, a0));
  const teal = Math.max(0, -b0 - Math.max(a0, 0));
  a0 -= (p.khaki * khaki + p.teal * teal) * (1 - keep);
  const rust = Math.max(0, Math.min(a0, a0 - Math.abs(b0 - a0)));
  const scale = saturation * (1 + p.rust * (1 - keep) * rust / Math.max(Math.hypot(a0, b0), 1e-3));
  const a1 = a0 * scale;
  const b1 = b0 * scale;
  const h = luma + 0.2513 * a1 + 0.0722 * b1;
  c = [h + 0.5 * a1, h - 0.5 * a1, h - b1].map(clamp01);
  c = c.map((value) => lerp(value, value * value * (3 - 2 * value), 2 * p.contrast));
  const l = clamp01(luma);
  c = c.map((value, index) => value + p.shadowTint[index] * (1 - l) * (1 - l) * (1 - keep) + p.highlightTint[index] * l * l);
  c = c.map((value, index) => value + (p.lift + p.liftTint[index] * (1 - keep)) * (1 - value));
  c = c.map((value) => value + p.gamma * value * (1 - value));
  return c.map(clamp01);
}

export function chapter3GradeSnapshot() {
  const { chapter3GradeA: a, chapter3GradeB: b, chapter3GradeC: c, chapter3GradeE: e } = CHAPTER3_GRADE_UNIFORMS;
  const r = (value) => Number(value.toFixed(3));
  return {
    contrast: r(a.value.x),
    saturation: r(a.value.y),
    lift: r(a.value.z),
    gamma: r(a.value.w),
    gain: [r(b.value.x), r(b.value.y), r(b.value.z)],
    keepWarm: r(b.value.w),
    grain: r(c.value.w),
    khaki: r(e.value.x),
    teal: r(e.value.y),
    rust: r(e.value.z),
  };
}
