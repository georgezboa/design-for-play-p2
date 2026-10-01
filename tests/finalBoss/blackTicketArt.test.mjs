// Round 3 (H6): the Black Ticket's sheets are re-packed with a clear margin,
// the cuts feathered, and the arena gets the last carriage as its backdrop.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CONDUCTOR_SHEETS, SHEET_PAD } from '../../src/chapters/blackKnifeFinal/assets.js';
import { lastCarriageLayout, paintLastCarriage } from '../../src/chapters/blackKnifeFinal/carriageBackdrop.js';

const root = new URL('../../', import.meta.url);
const read = (path) => readFileSync(new URL(path, root));
const meta = JSON.parse(read('public/assets/black-knife/images/conductor/meta.json'));

// Canvas size of a WebP file (VP8X, VP8L or VP8 bitstream).
function webpSize(buffer) {
  assert.equal(buffer.toString('ascii', 0, 4), 'RIFF');
  assert.equal(buffer.toString('ascii', 8, 12), 'WEBP');
  const chunk = buffer.toString('ascii', 12, 16);
  if (chunk === 'VP8X') return { w: 1 + buffer.readUIntLE(24, 3), h: 1 + buffer.readUIntLE(27, 3) };
  if (chunk === 'VP8L') {
    const bits = buffer.readUInt32LE(21);
    return { w: 1 + (bits & 0x3fff), h: 1 + ((bits >> 14) & 0x3fff) };
  }
  return { w: buffer.readUInt16LE(26) & 0x3fff, h: buffer.readUInt16LE(28) & 0x3fff };
}

test('every conductor sheet is padded, and assets.js, meta.json and the files agree', () => {
  for (const [key, entry] of Object.entries(CONDUCTOR_SHEETS)) {
    const name = key.replace('conductor-', '');
    const m = meta[name];
    assert.ok(m, `${name} in meta.json`);
    assert.deepEqual(m.pad, { ...SHEET_PAD }, `${name} records the same padding`);
    assert.equal(entry.sheet.frameWidth, m.frameWidth, `${name} frame width`);
    assert.equal(entry.sheet.frameHeight, m.frameHeight, `${name} frame height`);
    const size = webpSize(read(`public${entry.path}`));
    assert.equal(size.w, m.frameWidth * m.frames, `${name} sheet width is frames × frame width`);
    assert.equal(size.h, m.frameHeight, `${name} sheet height`);
  }
  assert.ok(SHEET_PAD.left >= 16 && SHEET_PAD.right >= 16 && SHEET_PAD.top >= 16, 'a real margin');
  assert.equal(SHEET_PAD.bottom, 0, 'the drawing still stands on the rails');
});

test('the frames that ran into their edge are the ones the audit listed, now feathered', () => {
  const feathered = (name) => (meta[name].feathered ?? []).map((f) => f.frame);
  // the audit (0-based): idle f4, move f2, baton f3/f4, locom f1, magic f2,
  // defeat f1. Baton f4 only grazed its edge with soft smoke (no straight
  // cut): the margin alone clears it.
  assert.ok(feathered('idle').includes(4));
  assert.ok(feathered('move').includes(2));
  assert.ok(feathered('baton').includes(3));
  assert.ok(feathered('locom').includes(1));
  assert.ok(feathered('magic').includes(2));
  assert.ok(feathered('defeat').includes(1));
  // and the cut inside magic f0 that the art crop showed
  assert.ok(feathered('magic').includes(0));
});

test('the boss measures its body inside the margin, so hits and points stay put', () => {
  const boss = read('src/chapters/blackKnifeFinal/entities/Boss.js').toString();
  const scene = read('src/chapters/blackKnifeFinal/scenes/BossScene.js').toString();
  assert.match(boss, /get bodyWidth\(\)[^\n]*SHEET_PAD\.left \+ SHEET_PAD\.right/);
  assert.match(boss, /get bodyHeight\(\)[^\n]*SHEET_PAD\.top \+ SHEET_PAD\.bottom/);
  assert.match(boss, /get top\(\) \{ return this\.y - this\.bodyHeight; \}/);
  assert.doesNotMatch(boss, /displayWidth \* 0\.|displayHeight \* 0\./, 'part points use the body, not the padded frame');
  assert.doesNotMatch(scene, /boss\.sprite\.display(Width|Height)/, 'the hurt-box uses the body');
  assert.match(scene, /'conductor-locom'\)\.setOrigin\(\.\.\.bodyCentreOrigin\('conductor-locom'\)\)/, 'the charging train is centred on its drawing');
});

// A recording stand-in for CanvasRenderingContext2D.
function recordingContext() {
  const calls = [];
  const gradient = { addColorStop: () => {} };
  const ctx = new Proxy({}, {
    get(target, key) {
      if (key in target) return target[key];
      if (key === 'createLinearGradient' || key === 'createRadialGradient') return () => gradient;
      if (key === 'measureText') return (text) => ({ width: String(text).length * 9 });
      return (...args) => { calls.push([key, ...args]); };
    },
    set(target, key, value) { target[key] = value; return true; },
  });
  return { ctx, calls };
}

test('the last carriage is painted: lit windows, the tail lamp, no borrowed names', () => {
  const L = lastCarriageLayout(1100, 560);
  assert.ok(L.windows.length >= 6, 'a row of windows across the arena');
  assert.ok(L.windows.every((win) => win.y > L.bodyTop && win.y + win.h < L.bodyBottom));
  assert.ok(L.tailLamp.x < L.endX, 'the red tail lamp hangs off the carriage end');
  assert.ok(L.railY < 560 && L.bodyBottom < L.railY);
  const { ctx, calls } = recordingContext();
  paintLastCarriage(ctx, 1100, 560);
  const texts = calls.filter(([fn]) => fn === 'fillText').map(([, text]) => text);
  assert.ok(texts.some((t) => /N I G H T/.test(t)));
  assert.ok(texts.some((t) => /LAST CARRIAGE/.test(t)));
  for (const t of texts) assert.doesNotMatch(t, /Infinity|Black Knife|CS247G/i);
  const scene = read('src/chapters/blackKnifeFinal/scenes/BossScene.js').toString();
  assert.match(scene, /paintLastCarriage\(canvas\.getContext\(\), W, H\)/);
  assert.match(scene, /add\.image\(0, 0, 'nf-last-carriage'\)/);
});
