// Chapter 2 · BORROWED LIGHT — shared art language with Chapter 1
// (docs/CH1_NIGHT_SERVICE_PANELS_SPEC.md §5): walnut and teal darks, warm
// off-white ink rim lines, muted amber / teal / rose accents, ivory paper
// tags with an amber glint, brass for the bell.

export const INK = '#eadfc6';
export const INK_HEX = 0xeadfc6;

export const PALETTE = Object.freeze({
  walnut: '#1c130d',
  walnutMid: '#2a1d14',
  walnutLight: '#3b2a1d',
  teal: '#23434a',
  tealDark: '#10232a',
  tealDeep: '#0a161b',
  navy: '#18233a',
  night: '#070c12',
  sky: '#0b1622',
  amber: '#e0a24a',
  amberDeep: '#a8702c',
  oxblood: '#6b2a22',
  ivory: '#d8ccb0',
  paper: '#e6dcc2',
  brass: '#b08a4a',
  brassDark: '#6d5227',
  window: '#f0b865',
  windowDim: '#8a5a2b',
  mist: '#6d8290',
});

export const HEX = Object.freeze(Object.fromEntries(
  Object.entries(PALETTE).map(([name, css]) => [name, Number.parseInt(css.slice(1), 16)]),
));

// The three grid lines. Low saturation on purpose: they must read against
// the rain without looking like another game's neon.
export const LINE_COLORS = Object.freeze({
  amber: Object.freeze({ css: '#e0a24a', hex: 0xe0a24a, glow: 0xf2c27a, dim: 0x5e4526, name: 'AMBER' }),
  teal: Object.freeze({ css: '#6fb7ad', hex: 0x6fb7ad, glow: 0x9fd9cf, dim: 0x2a4a47, name: 'TEAL' }),
  rose: Object.freeze({ css: '#c98088', hex: 0xc98088, glow: 0xe6aab0, dim: 0x503035, name: 'ROSE' }),
});

export const DEPTH = Object.freeze({
  sky: 0,
  panorama: 4,
  far: 8,
  rainFar: 10,
  mid: 12,
  rainMid: 14,
  mistBack: 16,
  train: 18,
  building: 20,
  prop: 22,
  sign: 23,
  cable: 24,
  machine: 25,
  node: 26,
  npc: 30,
  player: 32,
  fx: 34,
  near: 36,
  rainNear: 38,
  mistFront: 40,
  dark: 50,
  rim: 52,
  ghost: 54,
  hud: 60,
  dialog: 70,
  fade: 80,
});

export const FONTS = Object.freeze({
  mono: '"Space Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
  display: 'Anton, "Arial Narrow", Impact, sans-serif',
  serif: 'Georgia, "Times New Roman", serif',
});

// Small seeded RNG so every facade is hand-placed but stable run to run.
export function rng(seed = 1) {
  let s = (Math.abs(Math.floor(seed)) % 2147483646) + 1;
  const next = () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
  next.range = (a, b) => a + (b - a) * next();
  next.int = (a, b) => Math.floor(a + (b - a + 1) * next());
  next.pick = (list) => list[Math.floor(next() * list.length) % list.length];
  next.chance = (p) => next() < p;
  return next;
}

export function hashString(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}
