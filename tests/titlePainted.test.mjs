// The painted title (round 10): George's carriage plate, its layout on every
// screen shape, the version switch and the art build's outputs.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { frameState, motionConfig, titleArtVersion } from '../src/shell/titlePlate.js';
import { PLAQUE_MAX, PLAQUE_MIN, paintedLayout } from '../src/shell/titlePaintedLayout.js';
import { TITLE_COMPLETE, TITLE_GEOMETRY, TITLE_PLATES } from '../src/shell/titlePlates.generated.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const WIDE = [[1920, 1080], [1600, 900], [1440, 900], [1280, 800], [1280, 720], [1180, 820], [1024, 768], [2560, 1080], [3440, 1440]];
const NARROW = [[1000, 900], [900, 1200], [420, 900], [390, 844], [900, 1000]];
const inside = (r, box, slack = 0) => r.x >= box.x - slack && r.y >= box.y - slack
  && r.x + r.w <= box.x + box.w + slack && r.y + r.h <= box.y + box.h + slack;
const screen = (L) => ({ x: 0, y: 0, w: L.W, h: L.H });

// The brief's layout (title-batch.json layout_note; build.py REAL_GEOMETRY): George's painting will be
// measured, but the composition asked for must already work on every screen.
const BRIEF = {
  plates: {
    ...TITLE_PLATES,
    carriage: { ...TITLE_PLATES.carriage, size: [1536, 1024], glass: [77, 164, 783, 481], door: [1382, 205, 123, 256] },
  },
  geometry: {
    butch: { x: 0.395, headX: 0.425, headY: 0.42, capTop: 0.36 },
    lamp: [0.515, 0.585], pendant: [0.73, 0.075], wall: [0.585, 0.065, 0.28, 0.83], narrow: [0.02, 0.10, 0.58, 0.68], moon: [0.32, 0.4],
  },
};
const SETS = [['built', {}], ['brief', BRIEF]];

test('wide screens: the whole carriage cover-fitted, the board on the painted wall', () => {
  for (const [set, opts] of SETS) for (const [w, h] of WIDE) {
    const L = paintedLayout(w, h, opts);
    const tag = `${set} ${w}x${h}`;
    assert.equal(L.mode, 'wide', tag);
    assert.equal(L.painted, true);
    // the plate covers the screen and is never stretched
    const v = L.view;
    assert.ok(v.ox <= 0.01 && v.oy <= 0.01, `${tag}: no gap at the top left`);
    assert.ok(v.ox + v.pw * v.s >= w - 0.01 && v.oy + v.ph * v.s >= h - 0.01, `${tag}: no gap at the bottom right`);
    // the board: on screen, wide enough for the menu, clear of the window
    assert.ok(inside(L.plaque, screen(L)), `${tag}: the board is on screen`);
    assert.ok(L.plaque.w >= PLAQUE_MIN && L.plaque.w <= PLAQUE_MAX, `${tag}: board width ${L.plaque.w}`);
    assert.ok(L.plaque.x >= L.glass.x + L.glass.w - 2, `${tag}: the board does not cover the window`);
    assert.ok(L.plaque.h >= Math.min(360, h * 0.6), `${tag}: the board is tall enough`);
    // the window's left frame stays on screen; NIGHTFALL is on its glass, left of Butch's head
    assert.ok(L.glass.x >= 0, `${tag}: the window starts on screen`);
    assert.ok(L.wordmark.x >= L.glass.x && L.wordmark.x + L.wordmark.w <= L.glass.x + L.glass.w, `${tag}: the mark is on the glass`);
    assert.ok(L.wordmark.y >= 0 && L.wordmark.y + L.wordmark.h <= L.glass.y + L.glass.h, `${tag}: the mark is on screen`);
    const clearOfHead = L.wordmark.x + L.wordmark.w <= L.butch.head.x - L.butch.head.r || L.wordmark.y + L.wordmark.h <= L.butch.capTop;
    assert.ok(clearOfHead, `${tag}: the mark clears Butch's head`);
    // Butch and his lamp are on screen, his head in front of the glass
    assert.ok(L.butch.head.x > L.glass.x && L.butch.head.x < L.glass.x + L.glass.w, `${tag}: his head is in the window`);
    assert.ok(L.butch.lamp.x > 0 && L.butch.lamp.x < w && L.butch.lamp.y > 0 && L.butch.lamp.y < h, `${tag}: his lamp is on screen`);
  }
});

test('narrow screens: the window and Butch framed at the top, the board below', () => {
  for (const [set, opts] of SETS) for (const [w, h] of NARROW) {
    const L = paintedLayout(w, h, opts);
    const tag = `${set} ${w}x${h}`;
    assert.equal(L.mode, 'narrow', tag);
    assert.ok(L.frame && inside(L.frame, screen(L)), `${tag}: the framed crop is on screen`);
    assert.ok(L.frame.h <= h * 0.47, `${tag}: the crop leaves room for the board`);
    assert.ok(inside(L.glass, L.frame, 0.5), `${tag}: the glass shows inside the frame`);
    assert.ok(L.plaque.y >= L.frame.y + L.frame.h, `${tag}: the board is below the frame`);
    assert.ok(inside(L.plaque, screen(L)), `${tag}: the board is on screen`);
    assert.ok(inside(L.wordmark, L.glass, 1), `${tag}: the mark is on the glass`);
    assert.equal(L.door, null);
  }
});

test('the motion model runs on the painted layout', () => {
  for (const [w, h] of [...WIDE, ...NARROW]) {
    const L = paintedLayout(w, h);
    let swept = false;
    for (let t = 0; t < 60; t += 0.5) {
      const s = frameState(t, L);
      assert.ok(Number.isFinite(s.scroll.near) && Number.isFinite(s.bob), `${w}x${h} t=${t}`);
      if (s.sweep) {
        swept = true;
        assert.ok(Number.isFinite(s.sweep.x) && s.sweep.strength >= 0 && s.sweep.strength <= 1);
      }
    }
    assert.ok(swept, `${w}x${h}: a trackside lamp goes past within a minute`);
    // Reduce Motion: one still frame
    const still = frameState(10, L, motionConfig({ reduced: true }));
    assert.equal(still.sweep, null);
    assert.equal(still.bob, 0);
  }
});

test('the painted title plays once every plate is a real painting; ?titleart= forces either in dev', () => {
  assert.equal(titleArtVersion({ complete: true, flag: null }), 'painted');
  assert.equal(titleArtVersion({ complete: false, flag: null }), 'drawn');
  assert.equal(titleArtVersion({ complete: false, flag: 'painted' }), 'painted');
  assert.equal(titleArtVersion({ complete: true, flag: 'drawn' }), 'drawn');
  assert.equal(titleArtVersion({ complete: true, flag: 'nonsense' }), 'painted');
  const all = Object.values(TITLE_PLATES);
  assert.equal(TITLE_COMPLETE, all.every((p) => !p.standIn));
});

test('the generated plates: the carriage has its two glasses, the strips their bands, the sprites their anchors', () => {
  const names = ['carriage', 'carriage-lit', 'sky', 'hills', 'orchard', 'trackside', 'pole', 'lamp', 'next-carriage'];
  assert.deepEqual(Object.keys(TITLE_PLATES).sort(), [...names].sort());
  for (const [name, p] of Object.entries(TITLE_PLATES)) {
    assert.ok(p.src.startsWith(p.standIn ? '/assets/title/standin/' : '/assets/title/'), name);
    assert.ok(p.src.endsWith('.webp'), name);
    assert.ok(p.size[0] > 0 && p.size[1] > 0, name);
    // a stand-in is never shipped: its folder is git-ignored
    if (!p.standIn) assert.ok(fs.existsSync(path.join(root, 'public', p.src)), `${name} is built`);
  }
  assert.ok(read('public/assets/title/.gitignore').includes('standin/'));
  const c = TITLE_PLATES.carriage;
  const [cw, ch] = c.size;
  const big = c.glass;
  const door = c.door;
  assert.ok(big[2] * big[3] > door[2] * door[3] * 4, 'the big window is the bigger glass');
  assert.ok(big[0] + big[2] < cw * 0.66 && door[0] > cw * 0.8, 'the window is on the left, the door glass at the right');
  for (const strip of ['hills', 'orchard', 'trackside']) {
    const p = TITLE_PLATES[strip];
    assert.ok(p.top >= 0 && p.top < 0.95 && p.sourceSize[1] > 0, strip);
  }
  // the near embankment is the lowest band (the orchard's trees may stand taller than the far hills' line)
  assert.ok(TITLE_PLATES.trackside.top > TITLE_PLATES.hills.top && TITLE_PLATES.trackside.top > TITLE_PLATES.orchard.top, 'the embankment is the lowest band');
  assert.ok(TITLE_PLATES.pole.arm >= 0 && TITLE_PLATES.pole.arm < 0.3);
  assert.equal(TITLE_PLATES.lamp.flame.length, 2);
  // the geometry is fractions of the carriage, the board's wall right of the window
  const g = TITLE_GEOMETRY;
  assert.ok(g.wall[0] * cw >= big[0] + big[2] - cw * 0.01, 'the wall starts right of the window');
  assert.ok(g.wall[0] + g.wall[2] <= door[0] / cw + 0.01, 'the wall ends before the door glass');
  [g.lamp, g.pendant, g.moon, [g.butch.x, g.butch.headY]].forEach(([x, y]) => assert.ok(x > 0 && x < 1 && y > 0 && y < 1));
});

test('the title brief: nine paintings, the build reads every one, no words in any of them', () => {
  const batch = JSON.parse(read('scripts/title-art/title-batch.json'));
  const ids = batch.items.map((it) => it.id);
  assert.deepEqual(ids, ['TT-carriage', 'TT-carriage-lit', 'TT-sky', 'TT-hills', 'TT-orchard', 'TT-trackside', 'TT-pole', 'TT-lamp', 'TT-next-carriage']);
  const build = read('scripts/title-art/build.py');
  ids.forEach((id) => assert.ok(build.includes(`'${id}'`), `build.py reads ${id}`));
  for (const it of batch.items) {
    assert.equal(it.file, `${it.id}.png`);
    assert.ok(/no text/i.test(it.prompt), `${it.id}: no text`);
    if (it.chroma) assert.ok(it.prompt.includes('#00FF00'), `${it.id}: pure green`);
    if (it.pair_of) assert.ok(ids.indexOf(it.pair_of) < ids.indexOf(it.id), `${it.id}: its source comes first`);
  }
  assert.equal(batch.items.find((it) => it.id === 'TT-carriage-lit').pair_of, 'TT-carriage');
});
