import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { DESIGN_H, MAX_PIXELS, backingSize, carriages, plateLayout } from '../src/shell/titlePlate.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

// glass shapes: 1920x1080 and 1280x720 (≈1.38), 4:3 (≈1.01), the narrow
// layout's wide strip over the board, and an ultrawide
const SHAPES = [[1181, 856], [786, 571], [886, 877], [838, 784], [1600, 620], [2200, 800]];

test('the title plate keeps Butch, the lamp and the board on the platform at every window shape', () => {
  for (const [w, h] of SHAPES) {
    const L = plateLayout(w, h);
    assert.equal(L.H, DESIGN_H);
    assert.ok(Math.abs(L.W / L.H - w / h) < 1e-9, `${w}x${h}: design space keeps the glass aspect`);
    // Butch stands on the platform, below the train, fully inside the glass
    assert.ok(L.butch.feet > L.platform && L.butch.feet < L.H, `${w}x${h}: Butch on the platform`);
    assert.ok(L.butch.x > 30 && L.butch.x < L.W - 30, `${w}x${h}: Butch inside the glass (${L.butch.x} of ${L.W})`);
    // the lamp post rises from the platform and its lantern is below the wordmark band
    assert.ok(L.lamp.base > L.platform && L.lamp.top > L.H * 0.33, `${w}x${h}: lamp`);
    assert.ok(L.lamp.x > 0 && L.lamp.x < L.W - 40, `${w}x${h}: lamp inside the glass`);
    // the nameboard sits clear of the lamp post
    assert.ok(L.board.x + L.board.w < L.lamp.x - 20, `${w}x${h}: board clear of the lamp`);
    // the train is there: the tail end is inside the glass and carriages run off to the right
    assert.ok(L.tail > 0 && L.tail < L.W * 0.5, `${w}x${h}: tail end`);
    const spans = carriages(L);
    assert.ok(spans.length >= 1 && spans.at(-1)[1] > L.W, `${w}x${h}: carriages reach the right edge`);
    // nothing but sky (and steam) behind the wordmark's corner
    assert.ok(L.roof > L.H * 0.33, `${w}x${h}: the roofline stays under the wordmark`);
  }
});

test('the lamp post stands between two compartment windows, never in front of one', () => {
  for (const [w, h] of SHAPES) {
    const L = plateLayout(w, h);
    const fromTail = L.lamp.x - L.tail - 70;
    const inPitch = ((fromTail % 92) + 92) % 92;
    assert.ok(inPitch > 58 && inPitch < 92, `${w}x${h}: lamp at ${inPitch} within the window pitch`);
  }
});

test('the plate backing store is capped and the CSS layers get fractions of the glass', () => {
  assert.deepEqual(backingSize(1181, 856, 1), { w: 1181, h: 856 });
  const big = backingSize(3000, 2000, 2);
  assert.ok(big.w * big.h <= MAX_PIXELS * 1.001);
  assert.ok(Math.abs(big.w / big.h - 1.5) < 0.01);
  const L = plateLayout(1181, 856);
  for (const value of [L.css.lamp.x, L.css.lamp.y, L.css.steam.y]) assert.ok(value > 0 && value < 1);
});

test('the title no longer ships or preloads the old window photo', () => {
  assert.doesNotMatch(read('src/shell/titleMenu.js'), /nightfall-title-window/);
  assert.doesNotMatch(read('index.html'), /nightfall-title-window|rel="preload" as="image"/);
  assert.equal(fs.existsSync(path.join(root, 'public/assets/ui/nightfall-title-window.jpg')), false);
  assert.match(read('src/shell/titleMenu.js'), /mountTitlePlate\(root\.querySelector\('\.nf-window-glass'\)\)/);
  // Reduce Motion stops the plate's live layers
  const css = read('src/shell/titleMenu.css');
  assert.match(css, /html\[data-reduced-motion="true"\] \.nf-plate-steam \{ display: none; \}/);
  assert.match(css, /html\[data-reduced-motion="true"\] \.nf-plate-lamp,/);
});
