// Chapter 3 · ECHO CITY — cast readability (round 6: playtest item 10 and
// the owner's Leone direction).
//
// At the street camera the cast is ~55 px tall, and the shared rigs carry one
// grey, busy AI texture each, close in value to the paving. Instead of
// repainting textures, each key character's material is graded in its own
// shader:
//   * a signature colour block on the garment band and the hat (bind-pose
//     height bands, so the blocks ride the rig), which keeps only part of the
//     texture's value variation: big flat colour, not more noise;
//   * skin protection (warm, moderately bright texels keep their colour);
//   * a small contrast / saturation lift on the texture itself;
//   * a view-space rim and a small fill floor, both from shared uniforms the
//     time of day drives (white by day, a blood-orange back light at dusk
//     over near-black figures, cool moonlight at night). The rim switches
//     off on LOW / LOWEST, where Butch's clean outline takes over.
// Ambient extras get a muted look (no colour block, a little less
// saturation), so the story cast is what the eye finds.
//
// Mara ahead is not listed: she is the dark echo, and her rose scarf stays
// the only rose in the chapter. No signature here is a rose or a pink.
import * as THREE from 'three';

const look = (values) => Object.freeze({
  // Garment band (bind-pose height, 0 = soles, 1 = crown) and hat start.
  band: Object.freeze([0.3, 0.8]),
  hatFrom: 0.9,
  coatStrength: 0.86,
  hatStrength: 0.8,
  // Share of the texture's value variation kept inside the colour block.
  detail: 0.4,
  saturation: 0.18,
  contrast: 0.12,
  rim: 1,
  ...values,
});

export const CHAPTER3_CAST_LOOKS = Object.freeze({
  // Deep navy greatcoat, near-black hat: the darkest, coolest value in a
  // warm stone street.
  butch: look({ coat: 0x1b2a52, hat: 0x121419, coatStrength: 0.9 }),
  // Bottle green: a hue Butch never shares, a value a step lighter.
  lev: look({ coat: 0x2f6b48, hat: 0x2a2219 }),
  // The lamp-oil seller: violet shawl and dress.
  eda: look({ coat: 0x5a3a86, hat: 0x2b2238, band: [0.18, 0.8] }),
  // The porter walks in step with Butch at the scanner: bleached canvas,
  // the opposite value to the navy beside him.
  olek: look({ coat: 0xd6cbb0, hat: 0x3b2c20, detail: 0.5 }),
  // The transport official: black uniform with a pale cap band read.
  toma: look({ coat: 0x1d1e23, hat: 0x111216, coatStrength: 0.8 }),
  // Petar, the repair man: olive drab overalls.
  petar: look({ coat: 0x5d6b33, hat: 0x2e2a1d, band: [0.12, 0.8] }),
  // Inside the ministry: Nika in teal-green, Sava in mustard.
  nika: look({ coat: 0x24766f, hat: 0x1a2a2a }),
  sava: look({ coat: 0xa07a34, hat: 0x2a2218 }),
  // The Copper Heron's Hana: saffron.
  hana: look({ coat: 0xc28a26, hat: 0x3a2a18 }),
  // The night fire: lighter values that catch the firelight.
  'campfire-rada': look({ coat: 0xcbbd9c, hat: 0x2f2a24, detail: 0.5 }),
  'campfire-miro': look({ coat: 0x6a5a3a, hat: 0x2a241c }),
  'campfire-seline': look({ coat: 0xb08a2a, hat: 0x2a2014 }),
});

export const CHAPTER3_MUTED_LOOK = Object.freeze({ muted: true, saturation: -0.25, contrast: 0, rim: 0.35 });
const MUTED_CAST = Object.freeze(new Set(['flower-vendor', 'produce-vendor', 'ministry-bosko']));

export function chapter3CastLookFor(id) {
  if (CHAPTER3_CAST_LOOKS[id]) return CHAPTER3_CAST_LOOKS[id];
  if (MUTED_CAST.has(id)) return CHAPTER3_MUTED_LOOK;
  return null;
}

// Shared by every cast material: the time of day sets the rim colour and
// strength and the fill floor (Chapter3TimeVisualController), the quality
// tier switches the rim off (EchoCity3DPreview.applyQualityTier).
export const CHAPTER3_CAST_LIGHT = Object.freeze({
  chapter3CastRimColor: { value: new THREE.Color(0xfff2dc) },
  // x: rim strength, y: rim power, z: fill floor, w: rim enabled (0 / 1)
  chapter3CastLight: { value: new THREE.Vector4(0.7, 3.2, 0.1, 1) },
});

export function setChapter3CastLight({ rimColor, rimStrength, rimPower, fill } = {}) {
  const light = CHAPTER3_CAST_LIGHT.chapter3CastLight.value;
  if (rimColor !== undefined) CHAPTER3_CAST_LIGHT.chapter3CastRimColor.value.set(rimColor);
  if (Number.isFinite(rimStrength)) light.x = rimStrength;
  if (Number.isFinite(rimPower)) light.y = rimPower;
  if (Number.isFinite(fill)) light.z = fill;
}

export function setChapter3CastRimEnabled(enabled) {
  CHAPTER3_CAST_LIGHT.chapter3CastLight.value.w = enabled ? 1 : 0;
}

const VERTEX_PARS = 'varying vec3 vChapter3Body;';
const FRAGMENT_PARS = [
  'varying vec3 vChapter3Body;',
  'uniform vec4 chapter3CastBounds;',
  'uniform vec4 chapter3CastCoat;',
  'uniform vec4 chapter3CastHat;',
  'uniform vec4 chapter3CastBand;',
  'uniform vec4 chapter3CastTone;',
  'uniform vec3 chapter3CastRimColor;',
  'uniform vec4 chapter3CastLight;',
].join('\n');

// Bind-pose body coordinates: h = height (0 soles .. 1 crown), side = |x|
// over the rig's half span. Butch and Lev are bound in a T-pose (hands at the
// tips of the span), the shared NPC rigs arms-down (hands at the outer side,
// below the hips), so sleeves take the colour and hands keep theirs. The
// neck is the centre of the band's top edge, where a warm skin-coloured
// texel keeps its colour.
const FRAGMENT_BLOCK = `
{
	vec3 texel = diffuseColor.rgb;
	float texelLuma = dot( texel, vec3( 0.2126, 0.7152, 0.0722 ) );
	texel = max( mix( vec3( texelLuma ), texel, 1.0 + chapter3CastTone.x ), 0.0 );
	texel = max( 0.18 + ( texel - 0.18 ) * ( 1.0 + chapter3CastTone.y ), 0.0 );
	float h = clamp( ( vChapter3Body.y - chapter3CastBounds.x ) / max( chapter3CastBounds.y - chapter3CastBounds.x, 1e-4 ), 0.0, 1.0 );
	float side = abs( vChapter3Body.x ) / max( chapter3CastBounds.z, 1e-4 );
	float skinTone = smoothstep( 0.02, 0.07, texel.r - texel.b ) * smoothstep( 0.0, 0.012, texel.r - texel.g ) * smoothstep( 0.05, 0.14, texelLuma );
	// T-pose rigs: the outer span; arms-down rigs: the low end of the arm.
	float hand = max( smoothstep( 0.84, 0.92, side ), smoothstep( 0.56, 0.68, side ) * ( 1.0 - smoothstep( 0.47, 0.54, h ) ) );
	float neck = smoothstep( chapter3CastBand.y - 0.1, chapter3CastBand.y - 0.02, h ) * ( 1.0 - smoothstep( 0.18, 0.3, side ) );
	float garment = smoothstep( chapter3CastBand.x - 0.03, chapter3CastBand.x + 0.03, h ) * ( 1.0 - smoothstep( chapter3CastBand.y - 0.03, chapter3CastBand.y + 0.03, h ) );
	garment *= ( 1.0 - hand ) * ( 1.0 - skinTone * neck );
	float hat = smoothstep( chapter3CastBand.z - 0.02, chapter3CastBand.z + 0.02, h ) * ( 1.0 - 0.5 * skinTone );
	float detail = mix( 1.0, clamp( texelLuma / 0.16, 0.25, 2.2 ), chapter3CastTone.z );
	texel = mix( texel, chapter3CastCoat.rgb * detail, garment * chapter3CastCoat.w );
	texel = mix( texel, chapter3CastHat.rgb * detail, hat * chapter3CastHat.w );
	if ( chapter3CastBand.w > 0.5 ) texel = vec3( garment, hat, hand + neck * skinTone );
	diffuseColor.rgb = texel;
}`;

const EMISSIVE_BLOCK = `
{
	vec3 chapter3RimView = isOrthographic ? vec3( 0.0, 0.0, 1.0 ) : normalize( vViewPosition );
	float chapter3CastRim = pow( 1.0 - saturate( dot( nonPerturbedNormal, chapter3RimView ) ), chapter3CastLight.y );
	totalEmissiveRadiance += chapter3CastRimColor * chapter3CastRim * chapter3CastLight.x * chapter3CastLight.w * chapter3CastTone.w;
	totalEmissiveRadiance += diffuseColor.rgb * chapter3CastLight.z;
}`;

function srgbVec4(hex, strength) {
  const color = new THREE.Color(hex ?? 0x000000);
  return new THREE.Vector4(color.r, color.g, color.b, hex === undefined ? 0 : strength);
}

const CAST_LOOK_UNIFORMS = new WeakMap();

export function chapter3CastLookUniforms(material) {
  return CAST_LOOK_UNIFORMS.get(material) ?? null;
}

// Patches every lit material on a rig once. Returns how many it changed.
export function applyChapter3CastLook(root, castLook) {
  if (!root || !castLook) return 0;
  let count = 0;
  root.traverse((child) => {
    if (!child.isMesh || child.userData.chapter3Outline) return;
    const geometry = child.geometry;
    if (!geometry?.attributes?.position) return;
    if (!geometry.boundingBox) geometry.computeBoundingBox();
    const box = geometry.boundingBox;
    const bounds = new THREE.Vector4(box.min.y, box.max.y, Math.max(Math.abs(box.min.x), Math.abs(box.max.x)), 0);
    for (const material of Array.isArray(child.material) ? child.material : [child.material]) {
      if (!material || !('emissive' in material) || material.userData.chapter3CastLook) continue;
      const muted = Boolean(castLook.muted);
      const uniforms = {
        chapter3CastBounds: { value: bounds },
        chapter3CastCoat: { value: srgbVec4(muted ? undefined : castLook.coat, castLook.coatStrength) },
        chapter3CastHat: { value: srgbVec4(muted ? undefined : castLook.hat, castLook.hatStrength) },
        // w: 1 paints the masks (garment red, hat green, kept skin blue) for QA.
        chapter3CastBand: { value: new THREE.Vector4(castLook.band?.[0] ?? 0.3, castLook.band?.[1] ?? 0.8, castLook.hatFrom ?? 0.9, 0) },
        chapter3CastTone: { value: new THREE.Vector4(castLook.saturation ?? 0, castLook.contrast ?? 0, castLook.detail ?? 1, castLook.rim ?? 1) },
      };
      // A flag in userData (it survives material.clone() as JSON); the live
      // uniforms are kept beside the material.
      material.userData.chapter3CastLook = true;
      CAST_LOOK_UNIFORMS.set(material, uniforms);
      const previous = material.onBeforeCompile;
      material.onBeforeCompile = (shader, renderer) => {
        previous?.call(material, shader, renderer);
        Object.assign(shader.uniforms, uniforms, CHAPTER3_CAST_LIGHT);
        shader.vertexShader = shader.vertexShader
          .replace('#include <common>', `#include <common>\n${VERTEX_PARS}`)
          .replace('#include <begin_vertex>', '#include <begin_vertex>\nvChapter3Body = position;');
        shader.fragmentShader = shader.fragmentShader
          .replace('#include <common>', `#include <common>\n${FRAGMENT_PARS}`)
          .replace('#include <map_fragment>', `#include <map_fragment>\n${FRAGMENT_BLOCK}`)
          .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>\n${EMISSIVE_BLOCK}`);
      };
      const previousKey = material.customProgramCacheKey?.bind(material);
      material.customProgramCacheKey = () => `${previousKey ? previousKey() : ''}|chapter3-cast-look`;
      material.needsUpdate = true;
      count += 1;
    }
  });
  return count;
}
