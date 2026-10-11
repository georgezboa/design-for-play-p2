// Chapter 3 · ECHO CITY — the painted frame (round 12, owner note
// "第三章的色彩我不喜欢 要极乐迪斯科的体感": Disco Elysium's street paintings).
//
// HIGH only. The city is drawn as before (tone-mapped and graded in its own
// materials, chapter3ColorGrade.js) into an off-screen frame, then painted:
//   1. DOWNSAMPLE the frame into a paint buffer of PAINTERLY_ROWS rows, the
//      same number of rows at 720p, 1080p or a Retina canvas: a stroke is the
//      same size against the street everywhere, and the cost does not grow
//      with the display.
//   2. STRUCTURE: the local stroke direction (the smoothed structure tensor:
//      along an edge, or a steady diagonal where nothing leads the brush).
//   3. PAINT: an anisotropic Kuwahara filter with polynomial sector weights
//      (Kyprianidis et al. 2009/2011) on a fixed 37-sample disc: flat,
//      edge-preserving dabs drawn out along the stroke direction, the way a
//      loaded brush lays oil.
//   4. COMPOSITE at the canvas's own resolution: the paint, upsampled along
//      the full-resolution frame's own edges (a joint-bilateral pick, so
//      figures keep their silhouettes) with a little of the frame's detail
//      kept; bristle streaks along the strokes; broken umber contours where
//      the paint changes value; and the canvas weave the picture is on.
// The paint grid is pinned to the world: under the street camera's pan (an
// orthographic camera that only translates) every buffer texel keeps seeing
// the same stones, so the paint does not crawl while the camera follows
// Butch, and the bristle streaks move with the street. The canvas weave is
// the picture's surface and stays put. Nothing animates on its own (REDUCE
// MOTION needs nothing extra). DOM captions and tags are not painted.
//
// LOW / LOWEST never build it: they draw straight to the screen with the
// grade only (the same palette), as they always have.
import * as THREE from 'three';

// Paint-buffer rows (the frame's height, whatever the canvas).
export const PAINTERLY_ROWS = 440;
// The off-screen frame is drawn at most this many rows (a Retina canvas at
// pixel ratio 1.75 is ~1900 rows; the paint hides the difference).
export const PAINTERLY_MAX_FRAME_ROWS = 1200;
// MSAA samples on the off-screen frame.
export const PAINTERLY_SAMPLES = 4;
// The composite's tiling noise texture (px) and its value-noise cell (px).
const NOISE_SIZE = 128;
const NOISE_CELL = 8;

export const PAINTERLY_LOOK = Object.freeze({
  // paint buffer texels: the brush's half-size, and how far a stroke may be
  // drawn out along an edge (anisotropy, 1 = round dabs)
  radius: 3.5,
  stretch: 1.3,
  // Kuwahara sector selection (q) and how strongly a calm sector wins
  sharpness: 8,
  hardness: 10,
  // how much of the unpainted frame shows through (0 all paint)
  detail: 0.16,
  // the joint-bilateral pick: higher snaps the paint harder to the frame's edges
  guide: 28,
  // umber contours where the paint changes value (0 none)
  ink: 1.1,
  // bristle streaks and canvas weave (fractions of the value)
  strokes: 0.16,
  canvas: 0.09,
  // broken colour: warm and cool shifts from stroke to stroke
  broken: 0.06,
});

// The paint grid for a frame of `width` x `height` px whose world origin
// projects to (originX, originY) px. The grid's texel centres sit at whole
// texel steps from the origin's projection, so a camera pan moves the grid
// with the street (texel i's centre is at x = (i - 0.5) * scale + offsetX).
export function chapter3PaintGrid({ width, height, originX = 0, originY = 0, rows = PAINTERLY_ROWS }) {
  const paintRows = Math.max(1, Math.min(Math.round(rows), Math.round(height)));
  const scale = height / paintRows;
  const wrap = (value) => ((((value / scale) % 1) + 1) % 1) * scale;
  return {
    scale,
    cols: Math.ceil(width / scale) + 2,
    rows: paintRows + 2,
    offsetX: wrap(originX),
    offsetY: wrap(originY),
  };
}

// The off-screen frame's size for a drawing buffer of width x height.
export function chapter3PaintFrameSize(width, height, maxRows = PAINTERLY_MAX_FRAME_ROWS) {
  const factor = Math.min(1, maxRows / Math.max(1, height));
  return { width: Math.max(1, Math.round(width * factor)), height: Math.max(1, Math.round(height * factor)) };
}

const FULLSCREEN_VERTEX = /* glsl */`
void main() {
	gl_Position = vec4( position.xy, 0.0, 1.0 );
}
`;

const DOWNSAMPLE_FRAGMENT = /* glsl */`
uniform sampler2D tFrame;
uniform vec2 uFrameSize;
uniform vec3 uGrid; // scale, offset x, offset y (frame px)
void main() {
	vec2 at = ( gl_FragCoord.xy - 1.0 ) * uGrid.x + uGrid.yz;
	float q = 0.25 * uGrid.x;
	vec3 c = texture2D( tFrame, ( at + vec2( -q, -q ) ) / uFrameSize ).rgb
		+ texture2D( tFrame, ( at + vec2( q, -q ) ) / uFrameSize ).rgb
		+ texture2D( tFrame, ( at + vec2( -q, q ) ) / uFrameSize ).rgb
		+ texture2D( tFrame, ( at + vec2( q, q ) ) / uFrameSize ).rgb;
	gl_FragColor = vec4( c * 0.25, 1.0 );
}
`;

// The smoothed structure tensor on a 5 x 5 neighbourhood: Sobel at the 3 x 3
// inner texels, weighted 1-2-1. Out: the stroke direction as a doubled angle
// (so it blends without a sign flip) and the anisotropy A.
const STRUCTURE_FRAGMENT = /* glsl */`
uniform sampler2D tPaintSource;
uniform vec2 uPaintSize;
void main() {
	vec3 v[ 25 ];
	for ( int j = 0; j < 5; j ++ ) {
		for ( int i = 0; i < 5; i ++ ) {
			v[ j * 5 + i ] = texture2D( tPaintSource, ( gl_FragCoord.xy + vec2( float( i - 2 ), float( j - 2 ) ) ) / uPaintSize ).rgb;
		}
	}
	float E = 0.0;
	float F = 0.0;
	float G = 0.0;
	for ( int cy = 1; cy <= 3; cy ++ ) {
		for ( int cx = 1; cx <= 3; cx ++ ) {
			int k = cy * 5 + cx;
			vec3 gx = ( v[ k - 4 ] + 2.0 * v[ k + 1 ] + v[ k + 6 ] ) - ( v[ k - 6 ] + 2.0 * v[ k - 1 ] + v[ k + 4 ] );
			vec3 gy = ( v[ k + 4 ] + 2.0 * v[ k + 5 ] + v[ k + 6 ] ) - ( v[ k - 6 ] + 2.0 * v[ k - 5 ] + v[ k - 4 ] );
			float w = ( cx == 2 ? 2.0 : 1.0 ) * ( cy == 2 ? 2.0 : 1.0 );
			E += w * dot( gx, gx );
			F += w * dot( gx, gy );
			G += w * dot( gy, gy );
		}
	}
	E /= 256.0;
	F /= 256.0;
	G /= 256.0;
	float root = sqrt( ( E - G ) * ( E - G ) + 4.0 * F * F );
	float l1 = 0.5 * ( E + G + root );
	float l2 = 0.5 * ( E + G - root );
	vec2 t = vec2( l1 - E, -F );
	float tl = length( t );
	t = tl > 1e-7 ? t / tl : vec2( 1.0, 0.0 );
	float A = l1 + l2 > 1e-7 ? ( l1 - l2 ) / ( l1 + l2 ) : 0.0;
	vec2 doubled = vec2( t.x * t.x - t.y * t.y, 2.0 * t.x * t.y );
	gl_FragColor = vec4( doubled * 0.5 + 0.5, A, 1.0 );
}
`;

// Anisotropic Kuwahara, polynomial weights (eight sectors), on a fixed disc
// of KUWAHARA_DISC samples instead of every texel under the ellipse: the
// sector weights depend only on where a sample sits in the unit disc, so
// they are worked out once here and written into the shader as constants.
// Per pixel that is 37 bilinear reads and some multiply-adds (no exp, sqrt
// or pow per sample); the disc is stretched along the stroke direction.
const KUWAHARA_RINGS = Object.freeze([[0, 1], [0.16, 8], [0.31, 12], [0.46, 16]]);
const KUWAHARA_ZETA = 0.33;
const KUWAHARA_ZERO_CROSS = 0.58;

export function chapter3KuwaharaDisc() {
  const eta = (KUWAHARA_ZETA + Math.cos(KUWAHARA_ZERO_CROSS)) / Math.sin(KUWAHARA_ZERO_CROSS) ** 2;
  const samples = [];
  KUWAHARA_RINGS.forEach(([radius, count], ring) => {
    for (let index = 0; index < count; index += 1) {
      // Each ring turned half a step against the last, so the disc is even.
      const angle = ((index + (ring % 2) * 0.5) / count) * Math.PI * 2;
      const x = radius * Math.cos(angle);
      const y = radius * Math.sin(angle);
      const w = new Array(8).fill(0);
      const weigh = (vx, vy, offset) => {
        const vxx = KUWAHARA_ZETA - eta * vx * vx;
        const vyy = KUWAHARA_ZETA - eta * vy * vy;
        w[offset] = Math.max(0, vy + vxx) ** 2;
        w[offset + 2] = Math.max(0, -vx + vyy) ** 2;
        w[offset + 4] = Math.max(0, -vy + vxx) ** 2;
        w[offset + 6] = Math.max(0, vx + vyy) ** 2;
      };
      weigh(x, y, 0);
      weigh(Math.SQRT1_2 * (x - y), Math.SQRT1_2 * (x + y), 1);
      const sum = w.reduce((total, value) => total + value, 0) || 1;
      const g = Math.exp(-3.125 * (x * x + y * y)) / sum;
      samples.push({ x, y, weights: w.map((value) => value * g) });
    }
  });
  return samples;
}

export const KUWAHARA_DISC = Object.freeze(chapter3KuwaharaDisc().map((sample) => Object.freeze(sample)));

const glslFloat = (value) => (Number.isInteger(value) ? `${value}.0` : String(Number(value.toFixed(6))));

function kuwaharaFragment(disc = KUWAHARA_DISC) {
  const lines = [];
  disc.forEach(({ x, y, weights }) => {
    lines.push(`\tc = texture2D( tPaintSource, uv + M * vec2( ${glslFloat(x)}, ${glslFloat(y)} ) ).rgb; cc = c * c;`);
    weights.forEach((weight, sector) => {
      if (weight < 1e-5) return;
      lines.push(`\tm${sector} += vec4( c, 1.0 ) * ${glslFloat(weight)}; s${sector} += cc * ${glslFloat(weight)};`);
    });
  });
  const sectors = [0, 1, 2, 3, 4, 5, 6, 7];
  return /* glsl */`
uniform sampler2D tPaintSource;
uniform sampler2D tStructure;
uniform vec2 uPaintSize;
uniform vec4 uBrush; // radius, stretch, sharpness (q), hardness
void sector( vec4 m, vec3 s, inout vec4 o ) {
	if ( m.w <= 1e-6 ) return;
	vec3 mean = m.rgb / m.w;
	vec3 variance = abs( s / m.w - mean * mean );
	float w = 1.0 / ( 1.0 + pow( uBrush.w * 1000.0 * ( variance.r + variance.g + variance.b ), 0.5 * uBrush.z ) );
	o += vec4( mean * w, w );
}
void main() {
	vec2 uv = gl_FragCoord.xy / uPaintSize;
	vec4 st = texture2D( tStructure, uv );
	vec2 doubled = st.xy * 2.0 - 1.0;
	float cos2 = clamp( doubled.x / max( length( doubled ), 1e-4 ), -1.0, 1.0 );
	float cosp = sqrt( 0.5 * ( 1.0 + cos2 ) );
	float sinp = ( doubled.y < 0.0 ? -1.0 : 1.0 ) * sqrt( 0.5 * ( 1.0 - cos2 ) );
	float A = st.z;
	// The ellipse: drawn out along the stroke where the image has a direction.
	float a = uBrush.x * clamp( 1.0 + A, 0.1, uBrush.y );
	float b = uBrush.x * clamp( 1.0 / ( 1.0 + A ), 0.1, uBrush.y );
	// unit disc (radius 0.5) -> texels -> uv
	mat2 M = mat2( 2.0 * a * cosp / uPaintSize.x, 2.0 * a * sinp / uPaintSize.y, -2.0 * b * sinp / uPaintSize.x, 2.0 * b * cosp / uPaintSize.y );
	${sectors.map((k) => `vec4 m${k} = vec4( 0.0 ); vec3 s${k} = vec3( 0.0 );`).join('\n\t')}
	vec3 c;
	vec3 cc;
${lines.join('\n')}
	vec4 o = vec4( 0.0 );
	${sectors.map((k) => `sector( m${k}, s${k}, o );`).join('\n\t')}
	vec3 painted = o.w > 1e-6 ? o.rgb / o.w : texture2D( tPaintSource, uv ).rgb;
	gl_FragColor = vec4( clamp( painted, 0.0, 1.0 ), 1.0 );
}
`;
}

const KUWAHARA_FRAGMENT = kuwaharaFragment();

const COMPOSITE_FRAGMENT = /* glsl */`
uniform sampler2D tFrame;
uniform sampler2D tPaint;
uniform sampler2D tStructure;
uniform vec2 uOutputSize;
uniform vec2 uFrameSize;
uniform vec2 uPaintSize;
uniform vec3 uGrid; // scale, offset x, offset y (frame px)
uniform vec2 uOrigin; // the world origin, output px
uniform float uPixelRatio;
uniform vec4 uLook; // detail, ink, strokes, canvas
uniform float uGuide;
uniform float uBroken;
uniform vec3 uInk;
uniform sampler2D tNoise; // r, g: value noise (cells of NOISE_CELL texels); b: canvas weave
// Value noise with unit cells, read from the tiling texture (one tap).
float paintNoise( vec2 p ) { return texture2D( tNoise, p * ${glslFloat(1 / 16)} ).r; }
float paintNoise2( vec2 p ) { return texture2D( tNoise, p * ${glslFloat(1 / 16)} ).g; }
void main() {
	vec2 px = gl_FragCoord.xy;
	vec2 framePx = px * ( uFrameSize / uOutputSize );
	vec3 frame = texture2D( tFrame, framePx / uFrameSize ).rgb;
	// The paint, picked from its four nearest texels by how close each is to
	// this pixel of the frame (a figure's edge stays where the frame has it).
	vec2 g = ( framePx - uGrid.yz ) / uGrid.x + 1.0;
	vec2 base = floor( g - 0.5 );
	vec2 f = g - 0.5 - base;
	vec2 inv = 1.0 / uPaintSize;
	vec3 p00 = texture2D( tPaint, ( base + vec2( 0.5, 0.5 ) ) * inv ).rgb;
	vec3 p10 = texture2D( tPaint, ( base + vec2( 1.5, 0.5 ) ) * inv ).rgb;
	vec3 p01 = texture2D( tPaint, ( base + vec2( 0.5, 1.5 ) ) * inv ).rgb;
	vec3 p11 = texture2D( tPaint, ( base + vec2( 1.5, 1.5 ) ) * inv ).rgb;
	vec4 wb = vec4( ( 1.0 - f.x ) * ( 1.0 - f.y ), f.x * ( 1.0 - f.y ), ( 1.0 - f.x ) * f.y, f.x * f.y );
	vec3 d00 = p00 - frame;
	vec3 d10 = p10 - frame;
	vec3 d01 = p01 - frame;
	vec3 d11 = p11 - frame;
	vec4 ws = exp( -uGuide * vec4( dot( d00, d00 ), dot( d10, d10 ), dot( d01, d01 ), dot( d11, d11 ) ) );
	vec4 w = wb * ( ws + 0.002 );
	vec3 paint = ( p00 * w.x + p10 * w.y + p01 * w.z + p11 * w.w ) / dot( w, vec4( 1.0 ) );
	vec3 c = mix( paint, frame, uLook.x );
	float l = dot( c, vec3( 0.2126, 0.7152, 0.0722 ) );
	// Bristle streaks along the stroke (world-pinned CSS px; the doubled
	// angle gives the direction up to its sign, so the streak is symmetric).
	vec4 st = texture2D( tStructure, g * inv );
	vec2 doubled = mix( vec2( 0.5, 0.866 ), st.xy * 2.0 - 1.0, st.z );
	float cos2 = clamp( doubled.x / max( length( doubled ), 1e-4 ), -1.0, 1.0 );
	vec2 dir = vec2( sqrt( 0.5 * ( 1.0 + cos2 ) ), ( doubled.y < 0.0 ? -1.0 : 1.0 ) * sqrt( 0.5 * ( 1.0 - cos2 ) ) );
	vec2 world = ( px - uOrigin ) / uPixelRatio;
	vec2 q = vec2( dot( world, dir ), dot( world, vec2( -dir.y, dir.x ) ) );
	vec2 bristle = vec2( q.x * 0.07, q.y * 0.62 );
	float streak = 0.5 * ( paintNoise( bristle ) + paintNoise( -bristle + 19.7 ) );
	c *= 1.0 + ( streak - 0.5 ) * uLook.z * ( 0.35 + 0.65 * smoothstep( 0.04, 0.35, l ) );
	// Broken colour: each stroke a little warmer or cooler than the next.
	float temper = paintNoise2( vec2( q.x * 0.035, q.y * 0.12 ) + 41.0 ) - 0.5;
	c += vec3( 1.0, 0.2, -0.9 ) * temper * uBroken * ( 0.3 + 0.7 * smoothstep( 0.05, 0.4, l ) );
	// Contours: where the paint changes value, a broken umber line.
	// (centred differences of the bilinear paint: a smooth line, not the
	// paint grid's stair steps)
	vec3 gx = texture2D( tPaint, ( g + vec2( 0.8, 0.0 ) ) * inv ).rgb - texture2D( tPaint, ( g - vec2( 0.8, 0.0 ) ) * inv ).rgb;
	vec3 gy = texture2D( tPaint, ( g + vec2( 0.0, 0.8 ) ) * inv ).rgb - texture2D( tPaint, ( g - vec2( 0.0, 0.8 ) ) * inv ).rgb;
	float edge = sqrt( dot( gx, gx ) + dot( gy, gy ) ) * 0.62;
	float ink = smoothstep( 0.16, 0.5, edge ) * ( 0.55 + 0.9 * streak ) * uLook.y;
	c = mix( c, c * uInk, clamp( ink, 0.0, 1.0 ) );
	// The canvas the picture is on (screen-fixed CSS px): a fine weave and
	// its uneven tooth.
	float weave = texture2D( tNoise, px / ( uPixelRatio * ${glslFloat(NOISE_SIZE)} ) ).b;
	c *= 1.0 + ( weave - 0.5 ) * uLook.w;
	gl_FragColor = vec4( clamp( c, 0.0, 1.0 ), 1.0 );
}
`;

// The composite's noise, made once: a tiling 128 px texture. R and G are
// value noise with NOISE_CELL px cells (two seeds); B is the canvas: a plain
// weave of 3.2 px threads, a little uneven, over its coarser tooth.
function makeNoiseTexture() {
  const size = NOISE_SIZE;
  const hash = (x, y, seed) => {
    let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(seed, 1442695041)) >>> 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
  const valueNoise = (x, y, seed, cell = NOISE_CELL) => {
    const span = size / cell;
    const fx = x / cell;
    const fy = y / cell;
    const ix = Math.floor(fx);
    const iy = Math.floor(fy);
    const tx = fx - ix;
    const ty = fy - iy;
    const ux = tx * tx * (3 - 2 * tx);
    const uy = ty * ty * (3 - 2 * ty);
    const at = (cx, cy) => {
      const wx = ((cx % span) + span) % span;
      const wy = ((cy % span) + span) % span;
      return hash(wx, wy, seed + cell * 31);
    };
    const top = at(ix, iy) * (1 - ux) + at(ix + 1, iy) * ux;
    const bottom = at(ix, iy + 1) * (1 - ux) + at(ix + 1, iy + 1) * ux;
    return top * (1 - uy) + bottom * uy;
  };
  const data = new Uint8Array(size * size * 4);
  const thread = (2 * Math.PI) / 3.2;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const index = (y * size + x) * 4;
      const warp = Math.sin(x * thread + 1.7 * valueNoise(x, y * 0.15, 7, 8));
      const weft = Math.sin(y * thread + 1.7 * valueNoise(x * 0.15, y, 9, 8));
      const weave = 0.5 + 0.22 * warp * weft + 0.28 * (valueNoise(x, y, 11, 2) - 0.5) + 0.18 * (valueNoise(x, y, 13, 32) - 0.5);
      data[index] = Math.round(255 * valueNoise(x, y, 1));
      data[index + 1] = Math.round(255 * valueNoise(x, y, 2));
      data[index + 2] = Math.round(255 * Math.min(1, Math.max(0, weave)));
      data[index + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat, THREE.UnsignedByteType);
  texture.colorSpace = THREE.NoColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}

function makeTarget(width, height, { depth = false, samples = 0 } = {}) {
  const target = new THREE.WebGLRenderTarget(width, height, {
    samples,
    type: THREE.UnsignedByteType,
    format: THREE.RGBAFormat,
    depthBuffer: depth,
    stencilBuffer: false,
    generateMipmaps: false,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    wrapS: THREE.ClampToEdgeWrapping,
    wrapT: THREE.ClampToEdgeWrapping,
  });
  // Stored as the display values the shaders write (no sRGB decode on read).
  target.texture.internalFormat = 'RGBA8';
  return target;
}

function pass(name, fragmentShader, uniforms) {
  return new THREE.ShaderMaterial({
    name: `chapter3-painterly-${name}`,
    uniforms,
    vertexShader: FULLSCREEN_VERTEX,
    fragmentShader,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
    fog: false,
  });
}

export class Chapter3Painterly {
  constructor(renderer, { look = PAINTERLY_LOOK, samples = PAINTERLY_SAMPLES } = {}) {
    this.renderer = renderer;
    this.look = { ...PAINTERLY_LOOK, ...look };
    // MSAA on the off-screen frame: it guides the paint's edges, and a
    // stair-stepped guide steps the paint.
    this.samples = samples;
    this.inkColor = new THREE.Color(0.5, 0.47, 0.46);
    this.frameSize = { width: 0, height: 0 };
    this.outputSize = new THREE.Vector2();
    this.grid = null;
    this.origin = new THREE.Vector3();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const geometry = new THREE.BufferGeometry();
    // One triangle over the whole screen.
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
    this.quad = new THREE.Mesh(geometry);
    this.quad.frustumCulled = false;
    this.quadScene = new THREE.Scene();
    this.quadScene.add(this.quad);
    this.uniforms = {
      tFrame: { value: null },
      tPaintSource: { value: null },
      tStructure: { value: null },
      tPaint: { value: null },
      uFrameSize: { value: new THREE.Vector2(1, 1) },
      uOutputSize: { value: new THREE.Vector2(1, 1) },
      uPaintSize: { value: new THREE.Vector2(1, 1) },
      uGrid: { value: new THREE.Vector3(1, 0, 0) },
      uOrigin: { value: new THREE.Vector2() },
      uPixelRatio: { value: 1 },
      uBrush: { value: new THREE.Vector4() },
      uLook: { value: new THREE.Vector4() },
      uGuide: { value: 0 },
      uBroken: { value: 0 },
      uInk: { value: this.inkColor },
      tNoise: { value: makeNoiseTexture() },
    };
    const u = this.uniforms;
    this.passes = {
      downsample: pass('downsample', DOWNSAMPLE_FRAGMENT, { tFrame: u.tFrame, uFrameSize: u.uFrameSize, uGrid: u.uGrid }),
      structure: pass('structure', STRUCTURE_FRAGMENT, { tPaintSource: u.tPaintSource, uPaintSize: u.uPaintSize }),
      kuwahara: pass('kuwahara', KUWAHARA_FRAGMENT, { tPaintSource: u.tPaintSource, tStructure: u.tStructure, uPaintSize: u.uPaintSize, uBrush: u.uBrush }),
      composite: pass('composite', COMPOSITE_FRAGMENT, u),
    };
    this.targets = null;
    this.frames = 0;
  }

  // Sizes from the drawing buffer; rebuilt only when it changes.
  resize() {
    this.renderer.getDrawingBufferSize(this.outputSize);
    const frame = chapter3PaintFrameSize(this.outputSize.x, this.outputSize.y);
    const grid = chapter3PaintGrid({ width: frame.width, height: frame.height });
    if (this.targets && frame.width === this.frameSize.width && frame.height === this.frameSize.height) return false;
    this.disposeTargets();
    this.frameSize = frame;
    this.targets = {
      frame: makeTarget(frame.width, frame.height, { depth: true, samples: this.samples }),
      source: makeTarget(grid.cols, grid.rows),
      structure: makeTarget(grid.cols, grid.rows),
      paint: makeTarget(grid.cols, grid.rows),
    };
    // Materials tone-map, grade and sRGB-encode into this frame exactly as
    // they do on screen, so the city's programs are the same ones (no second
    // compile) and the passes read display colours. three.js keys both on
    // `isXRRenderTarget` (WebGLPrograms / WebGLRenderer), its only switch for
    // "a render target that stands in for the screen".
    this.targets.frame.isXRRenderTarget = true;
    this.targets.frame.texture.colorSpace = THREE.SRGBColorSpace;
    this.uniforms.uFrameSize.value.set(frame.width, frame.height);
    this.uniforms.uPaintSize.value.set(grid.cols, grid.rows);
    return true;
  }

  disposeTargets() {
    if (!this.targets) return;
    for (const target of Object.values(this.targets)) target.dispose();
    this.targets = null;
  }

  dispose() {
    this.disposeTargets();
    for (const material of Object.values(this.passes)) material.dispose();
    this.uniforms.tNoise.value.dispose();
    this.quad.geometry.dispose();
  }

  runPass(material, target) {
    this.quad.material = material;
    this.renderer.setRenderTarget(target);
    this.renderer.render(this.quadScene, this.camera);
  }

  render(scene, camera) {
    const renderer = this.renderer;
    this.resize();
    const { frame, source, structure, paint } = this.targets;
    renderer.setRenderTarget(frame);
    renderer.render(scene, camera);
    // The paint grid, pinned to where the world origin falls in the frame.
    this.origin.set(0, 0, 0).project(camera);
    const originX = (this.origin.x * 0.5 + 0.5) * this.frameSize.width;
    const originY = (this.origin.y * 0.5 + 0.5) * this.frameSize.height;
    this.grid = chapter3PaintGrid({ width: this.frameSize.width, height: this.frameSize.height, originX, originY });
    const u = this.uniforms;
    const look = this.look;
    u.uGrid.value.set(this.grid.scale, this.grid.offsetX, this.grid.offsetY);
    u.uOutputSize.value.copy(this.outputSize);
    u.uOrigin.value.set((this.origin.x * 0.5 + 0.5) * this.outputSize.x, (this.origin.y * 0.5 + 0.5) * this.outputSize.y);
    u.uPixelRatio.value = renderer.getPixelRatio();
    u.uBrush.value.set(look.radius, look.stretch, look.sharpness, look.hardness);
    u.uLook.value.set(look.detail, look.ink, look.strokes, look.canvas);
    u.uGuide.value = look.guide;
    u.uBroken.value = look.broken;
    // The passes add their calls to the frame's count instead of replacing it.
    const { autoClear } = renderer;
    const { autoReset } = renderer.info;
    renderer.autoClear = false;
    renderer.info.autoReset = false;
    try {
      u.tFrame.value = frame.texture;
      this.runPass(this.passes.downsample, source);
      u.tPaintSource.value = source.texture;
      this.runPass(this.passes.structure, structure);
      u.tStructure.value = structure.texture;
      this.runPass(this.passes.kuwahara, paint);
      u.tPaint.value = paint.texture;
      this.runPass(this.passes.composite, null);
    } finally {
      renderer.autoClear = autoClear;
      renderer.info.autoReset = autoReset;
      renderer.setRenderTarget(null);
    }
    this.frames += 1;
  }

  snapshot() {
    return {
      frame: [this.frameSize.width, this.frameSize.height],
      output: [this.outputSize.x, this.outputSize.y],
      paint: this.grid ? [this.grid.cols, this.grid.rows] : null,
      frames: this.frames,
    };
  }
}
