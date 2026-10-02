import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  LAMP_EVERY, MAX_PIXELS, backingScale, butchSweepProgress, frameState, lampWorldX, layerSpeeds, motionConfig, sceneLayout, sweepTime,
} from '../src/shell/titlePlate.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

// the six screens the title is checked at, plus an ultrawide and a tall 900
const WIDE = [[1920, 1080], [1600, 900], [1280, 720], [1024, 768], [2560, 1080]];
const NARROW = [[900, 700], [420, 900], [900, 1000]];
const ALL = [...WIDE, ...NARROW];

const inside = (r, box, slack = 0) => r.x >= box.x - slack && r.y >= box.y - slack
  && r.x + r.w <= box.x + box.w + slack && r.y + r.h <= box.y + box.h + slack;
const overlaps = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
const screen = (L) => ({ x: 0, y: 0, w: L.W, h: L.H });

test('wide screens put the window left, the plaque on the wall, the door at the right edge', () => {
  for (const [w, h] of WIDE) {
    const L = sceneLayout(w, h);
    const tag = `${w}x${h}`;
    assert.equal(L.mode, 'wide', tag);
    assert.ok(L.glass.w >= w * 0.44 && L.glass.w <= w * 0.66, `${tag}: a big window (${L.glass.w})`);
    assert.ok(L.glass.x < w * 0.05, `${tag}: the window starts at the left`);
    assert.ok(inside(L.plaque, screen(L)), `${tag}: plaque on screen`);
    assert.ok(L.plaque.x >= L.glass.x + L.glass.w + L.frame, `${tag}: plaque clear of the window frame`);
    assert.ok(L.plaque.x + L.plaque.w <= L.door.x, `${tag}: plaque clear of the door`);
    assert.ok(L.plaque.w >= 330, `${tag}: plaque wide enough for the timetable`);
    assert.ok(L.door.x + L.door.w === w, `${tag}: the end door is at the right edge`);
    assert.ok(inside(L.doorWindow, L.door), `${tag}: the door's little window`);
    // the ceiling lamp hangs over the plaque, above it
    assert.ok(L.ceilingLamp.x > L.plaque.x && L.ceilingLamp.x < L.plaque.x + L.plaque.w, `${tag}: lamp over the plaque`);
    assert.ok(L.ceilingLamp.y + L.ceilingLamp.size < L.plaque.y + 20, `${tag}: lamp above the plaque`);
  }
});

test('narrow and portrait screens crop to the window and Butch, the plaque below', () => {
  for (const [w, h] of NARROW) {
    const L = sceneLayout(w, h);
    const tag = `${w}x${h}`;
    assert.equal(L.mode, 'narrow', tag);
    assert.equal(L.door, null, `${tag}: no door`);
    assert.ok(L.plaque.y >= L.partition, `${tag}: plaque on the seat back below the window`);
    assert.ok(L.plaque.y > L.glass.y + L.glass.h, `${tag}: plaque below the glass`);
    assert.ok(inside(L.plaque, screen(L)), `${tag}: plaque on screen`);
    assert.ok(L.plaque.h >= 300, `${tag}: room for the six lines (${L.plaque.h})`);
  }
});

test('Butch, his lamp and the orchard case sit in front of the window at every screen', () => {
  for (const [w, h] of ALL) {
    const L = sceneLayout(w, h);
    const tag = `${w}x${h}`;
    const { butch, glass } = L;
    // his head is against the glass: a silhouette on the night outside
    assert.ok(butch.head.x - butch.head.r > glass.x && butch.head.x + butch.head.r < glass.x + glass.w, `${tag}: head across the glass`);
    assert.ok(butch.head.y - butch.head.r > glass.y && butch.head.y + butch.head.r < glass.y + glass.h, `${tag}: head inside the glass`);
    assert.ok(butch.box.x > glass.x && butch.box.x + butch.box.w < glass.x + glass.w, `${tag}: Butch inside the window's width`);
    // the case is beside him with its claim tag, the lamp on the table against the glass
    assert.ok(butch.case.x >= glass.x && butch.case.x + butch.case.w <= glass.x + glass.w, `${tag}: the case`);
    assert.ok(butch.tag.x > butch.case.x && butch.tag.x < butch.case.x + butch.case.w, `${tag}: the tag hangs on the case`);
    assert.ok(butch.lamp.x > butch.case.x + butch.case.w && butch.lamp.x < glass.x + glass.w, `${tag}: the lamp beyond the case`);
    assert.ok(butch.lamp.glass > glass.y && butch.lamp.glass < glass.y + glass.h, `${tag}: the lamp against the glass`);
    assert.ok(Math.abs(butch.table.y - L.sill) < 2, `${tag}: the table at the sill`);
  }
});

test('the wordmark sits on the glass top left, clear of Butch, the wires and the plaque', () => {
  for (const [w, h] of ALL) {
    const L = sceneLayout(w, h);
    const tag = `${w}x${h}`;
    const mark = L.wordmark;
    assert.ok(inside(mark, L.glass), `${tag}: on the glass`);
    assert.ok(mark.x - L.glass.x < L.glass.w * 0.1 && mark.y - L.glass.y < L.glass.h * 0.12, `${tag}: top left`);
    assert.ok(mark.w >= Math.min(200, L.glass.w * 0.3), `${tag}: big enough to read (${mark.w})`);
    // nothing busy behind it: above the telegraph wires and the horizon, off Butch, off the plaque
    assert.ok(mark.y + mark.h < L.glass.y + L.wireY, `${tag}: above the wires`);
    assert.ok(mark.y + mark.h < L.glass.y + L.horizon, `${tag}: above the hills`);
    assert.ok(!overlaps(mark, L.butch.box), `${tag}: clear of Butch`);
    assert.ok(!overlaps(mark, L.plaque), `${tag}: clear of the plaque`);
  }
});

test('Reduce Motion paints one still frame; LOW GRAPHICS thins the rain and drops the reflection', () => {
  const L = sceneLayout(1600, 900);
  const still = motionConfig({ reduced: true });
  assert.equal(still.animate, false);
  assert.equal(still.sweep, false);
  const a = frameState(0, L, still);
  for (const t of [1.3, 4.2, 9.9, 63]) {
    const b = frameState(t, L, still);
    assert.deepEqual(b, a, `t=${t}: nothing moves`);
    assert.equal(b.sweep, null, 'no passing light');
    assert.equal(b.bob, 0, 'no sway');
    assert.equal(b.lampAngle, 0, 'the lamp hangs straight');
  }
  // the still frame keeps the telegraph poles off Butch's head and the lamps out of the glass
  for (const [w, h] of ALL) {
    const S = sceneLayout(w, h);
    const { scroll } = frameState(0, S, still);
    const head = S.butch.head.x - S.glass.x;
    const pole = (((head + scroll.near) % S.poleGap) + S.poleGap) % S.poleGap;
    assert.ok(Math.min(pole, S.poleGap - pole) > S.poleGap * 0.3, `${w}x${h}: no pole behind his head`);
    for (const j of [-1, 0, 1]) {
      const x = lampWorldX(S, j) - scroll.near;
      assert.ok(x < -S.glass.w * 0.25 || x > S.glass.w * 1.25, `${w}x${h}: no lamp in the still glass`);
    }
  }
  const low = motionConfig({ low: true });
  assert.equal(low.animate, true);
  assert.equal(low.rainLayers, 1);
  assert.ok(low.rainDensity < 1);
  assert.equal(low.reflection, false);
  assert.equal(low.dprCap, 1);
  const full = motionConfig();
  assert.equal(full.rainLayers, 2);
  assert.equal(full.reflection, true);
});

test('a trackside lamp sweeps its band across the room every few seconds, over Butch', () => {
  for (const [w, h] of ALL) {
    const L = sceneLayout(w, h);
    const tag = `${w}x${h}`;
    const cfg = motionConfig();
    const period = (LAMP_EVERY * L.poleGap) / layerSpeeds(L.glass.w).near;
    assert.ok(period > 3 && period < 9, `${tag}: one lamp every ${period.toFixed(1)} s`);
    // sample one period: the band appears, moves right to left, and goes
    let seen = 0;
    let lastX = Infinity;
    let runs = 0;
    let was = false;
    for (let t = 0; t < period; t += period / 400) {
      const { sweep } = frameState(t, L, cfg);
      if (sweep) {
        seen += 1;
        if (!was) { runs += 1; lastX = Infinity; }
        assert.ok(sweep.x <= lastX + 1e-6, `${tag}: the band moves right to left`);
        assert.ok(sweep.strength >= 0 && sweep.strength <= 1);
        lastX = sweep.x;
      }
      was = Boolean(sweep);
    }
    assert.ok(runs >= 1 && runs <= 2, `${tag}: one pass per lamp (${runs})`);
    assert.ok(seen / 400 < 0.6, `${tag}: the room is mostly in its own light`);
    // when the lamp passes behind him, the band's middle is on Butch
    const at = frameState(sweepTime(L, butchSweepProgress(L)), L, cfg).sweep;
    assert.ok(at, `${tag}: a sweep at Butch`);
    assert.ok(Math.abs(at.x + L.H * 0.11 - L.butch.x) < 2, `${tag}: band on Butch (${at.x})`);
    assert.ok(at.strength > 0.8, `${tag}: at full strength`);
  }
});

test('the scene sways a pixel or two and the ceiling lamp swings a little', () => {
  const L = sceneLayout(1280, 720);
  let maxBob = 0;
  let maxAngle = 0;
  for (let t = 0; t < 30; t += 0.05) {
    const s = frameState(t, L);
    maxBob = Math.max(maxBob, Math.abs(s.bob));
    maxAngle = Math.max(maxAngle, Math.abs(s.lampAngle));
  }
  assert.ok(maxBob > 0.8 && maxBob <= 2, `sway ${maxBob}`);
  assert.ok(maxAngle > 0.01 && maxAngle < 0.04, `lamp ${maxAngle}`);
});

test('the backing store is capped', () => {
  assert.equal(backingScale(1280, 720, 1), 1);
  assert.equal(backingScale(1280, 720, 2), 2);
  assert.equal(backingScale(1280, 720, 3), 2, 'never past 2x');
  assert.ok(Math.abs(backingScale(1600, 900, 2) - 1.6) < 1e-9, 'nor past MAX_PIXELS');
  assert.equal(backingScale(1600, 900, 2, 1), 1, 'LOW GRAPHICS: one pixel per pixel');
  const k = backingScale(3840, 2160, 2);
  assert.ok(3840 * 2160 * k * k <= MAX_PIXELS * 1.001);
});

test('the title mounts the carriage scene and stills it under dialogs and while leaving', () => {
  const title = read('src/shell/titleMenu.js');
  assert.match(title, /const scene = mountTitleScene\(root\);/);
  assert.match(title, /<div class="nf-scene" aria-hidden="true"><\/div>/);
  assert.match(title, /scene\.hold\('dialog', true\)/);
  assert.match(title, /scene\.hold\('dialog', false\)/);
  assert.match(title, /scene\.hold\('loading', true\)/);
  const runtime = read('src/shell/titlePlate.js');
  assert.match(runtime, /visibilitychange/);
  assert.match(runtime, /pagehide/);
  assert.match(runtime, /nightfall:settings/);
  assert.match(runtime, /prefers-reduced-motion: reduce/);
  // the old platform plate and the walnut frame round it are gone
  assert.doesNotMatch(title, /nf-window-glass|nf-carriage|nf-wall|nf-sill|mountTitlePlate/);
  assert.doesNotMatch(runtime + read('src/shell/titlePlateArt.js'), /BELLWETHER|nameboard|lampPost/);
  const css = read('src/shell/titleMenu.css');
  assert.doesNotMatch(css, /\.nf-carriage|\.nf-window-glass|\.nf-plate-|\.nf-rain\b|\.nf-lamps/);
  // Reduce Motion: no passing light on the plaque either
  assert.match(css, /html\[data-reduced-motion="true"\] \.nf-menu::after \{ display: none; \}/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{\n {2}\.nf-menu::after \{ display: none; \}/);
});

test('the title no longer ships or preloads the old window photo', () => {
  assert.doesNotMatch(read('src/shell/titleMenu.js'), /nightfall-title-window/);
  assert.doesNotMatch(read('index.html'), /nightfall-title-window|rel="preload" as="image"/);
  assert.equal(fs.existsSync(path.join(root, 'public/assets/ui/nightfall-title-window.jpg')), false);
});
