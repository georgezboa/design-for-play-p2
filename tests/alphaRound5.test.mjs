import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('the DEV MENU link steps aside from any control under it (Ch5 exhibit ×)', async () => {
  const source = read('src/devMenuReturn.js');
  assert.match(source, /export function coversControl/);
  assert.match(source, /setInterval\(\(\) => dodgeControls\(control\)/);
  const { DEV_LINK_SPOTS, coversControl } = await import('../src/devMenuReturn.js');
  assert.deepEqual([...DEV_LINK_SPOTS], ['top-right', 'bottom-left', 'top-left', 'bottom-right']);
  for (const spot of DEV_LINK_SPOTS.slice(1)) assert.match(source, new RegExp(`data-spot="${spot}"`));

  // a fake page: one round button under the link's top-right box
  const rect = (left, top, w, h) => ({ left, top, right: left + w, bottom: top + h, width: w, height: h });
  const link = { getBoundingClientRect: () => rect(1174, 14, 92, 32), contains: (el) => el === link };
  const button = { getBoundingClientRect: () => rect(1190, 26, 30, 30), contains: (el) => el === button };
  const doc = {
    querySelectorAll: () => [button],
    elementsFromPoint: () => [link, button],
    defaultView: { getComputedStyle: () => ({ visibility: 'visible', pointerEvents: 'auto', opacity: '1' }) },
  };
  assert.equal(coversControl(link, doc), true);
  // the same button behind an overlay does not count
  const overlay = { contains: () => false };
  assert.equal(coversControl(link, { ...doc, elementsFromPoint: () => [link, overlay, button] }), false);
  // nor one elsewhere on the screen
  const far = { ...button, getBoundingClientRect: () => rect(20, 600, 30, 30) };
  assert.equal(coversControl(link, { ...doc, querySelectorAll: () => [far] }), false);
});

test('Chapter 1 unfold shows chevrons pointing the way the wall opens', () => {
  const source = read('src/chapters/nightService/PanelScene.js');
  assert.match(source, /drawFoldArrow\(g, grip, rot/);
  assert.match(source, /this\.drawFoldArrow\(ui\.arrow, grip, rot/);
  // the pull opens towards -x before rotation, so the chevrons follow -cos/-sin
  assert.match(source, /const dir = \{ x: -Math\.cos\(rot\), y: -Math\.sin\(rot\) \}/);
  // still under REDUCE MOTION
  assert.match(source, /const march = reduce \? 0 :/);
});
