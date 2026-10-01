// Round 3 (owner feedback, 2026-10-01) · Chapter 2 scene-side regressions.
// The rules themselves are tested on the pure modules (timetableModel,
// targeting, level); these pin how the scene uses them.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CHAPTER_CONTROLS } from '../../src/shell/chapterControls.js';
import { HINTS, TEACH } from '../../src/chapters/borrowedLight/story.js';
import { DEPARTURE_BELLS, NODES, SIGNS } from '../../src/chapters/borrowedLight/level.js';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const scene = read('src/chapters/borrowedLight/BorrowedLightScene.js');
const world = read('src/chapters/borrowedLight/art/worldArt.js');

test('the punch never fails silently: every press result has words, before and after', () => {
  for (const key of ['outOfReach', 'already', 'renew', 'renewed', 'caught', 'dead', 'busyTimed', 'punchesReset']) assert.ok(HINTS[key], key);
  assert.match(HINTS.forgets('AMBER'), /SAME LINE · AMBER FORGETS THE OTHER/);
  assert.equal(HINTS.ringsOn('even'), 'RINGS ON BELL II');
  // The marked node's tag is the model's own preview of the press.
  assert.match(scene, /promptFor\(node\) \{/);
  assert.match(scene, /const pre = this\.tt\.punchPreview\(node\.id\);/);
  assert.match(scene, /if \(!node\) \{ this\.missFeedback\(\); return; \}/);
  // A click on a node in reach punches that node.
  assert.match(scene, /const clicked = nodeAtPoint\(this\.sectionNodes\(\), world\.x, world\.y\);/);
});

test('respawn: punches reset visibly, borrowed light goes home, the walkway resets', () => {
  assert.match(scene, /const homeEvents = this\.tt\.dropLight\(\);/);
  assert.match(scene, /\(RESET_ON_RESPAWN\[lamp\.id\] \?\? \[\]\)\.forEach\(\(id\) => this\.tt\.resetMachine\(id\)\);/);
  assert.match(scene, /cleared\.length \? HINTS\.punchesReset/);
});

test('the chase\'s quick bell lives only in its stretch of section A', () => {
  assert.match(scene, /const quick = this\.section === CHASE\.section && this\.feetX >= CHASE\.fromX && this\.feetX < CHASE\.toX;/);
  assert.match(scene, /enterSection\(next\) \{[\s\S]*?this\.tt\.setBellMs\(BELL_MS\);/);
});

test('dark decks: the carried light is placed from Butch\'s feet for solidity', () => {
  // The drawn lamp is a rendered frame behind; on a slow frame or right after
  // a respawn that let him fall through a deck his own light should hold.
  assert.match(scene, /const at = visual && this\.player\.lampAt \? this\.player\.lampAt : \{ x: this\.feetX \+ 20 \* this\.player\.ctrl\.facing, y: this\.feetY - 60 \};/);
});

test('teaching tags for the new mechanics never sit on a marked node\'s prompt', () => {
  assert.match(scene, /this\.section === 'B' && !this\.flags\.borrowed && grounded && !this\.currentTarget/);
  assert.match(scene, /this\.section === 'C' && !this\.flags\.cageRidden && grounded && !this\.currentTarget/);
  // The two-bells tag hangs over the gap, clear of the node and the signs.
  const tag = { x0: TEACH.bells.x - 160, x1: TEACH.bells.x + 160, y0: TEACH.bells.y - 34, y1: TEACH.bells.y };
  const node = NODES.find((n) => n.id === 'a-n9');
  assert.ok(tag.x0 > node.x + 60, 'right of the node prompt');
  for (const sign of SIGNS.filter((s) => !s.scroll)) {
    const r = { x0: sign.x - sign.w / 2, x1: sign.x + sign.w / 2, y0: sign.y - 40, y1: sign.y + 60 };
    assert.ok(!(tag.x1 > r.x0 && tag.x0 < r.x1 && tag.y1 > r.y0 && tag.y0 < r.y1), `clear of ${sign.text}`);
  }
});

test('art: no world-04 panorama in Chapter 2; a painted skyline and a viaduct instead', () => {
  assert.doesNotMatch(scene, /world-04-retro-cyberpunk/);
  assert.doesNotMatch(world, /gradePanorama/);
  assert.match(world, /paintRainSkyline\(\{ seed: 61 \+ \(i % 3\) \}\)/);
  assert.match(scene, /addViaduct\(this, ahead\);/);
  // The blackout stops short of black so silhouettes read.
  assert.match(scene, /this\.darkTarget = on \? 0\.74 : 0;/);
});

test('controls, departure and QA state cover the new verbs', () => {
  const rows = CHAPTER_CONTROLS.borrowedLight.map(([a, k]) => `${a} ${k}`).join(' | ');
  assert.match(rows, /BORROW \/ GIVE LIGHT E AT A LIT \/ DEAD NODE/);
  assert.equal(DEPARTURE_BELLS, 12);
  assert.match(scene, /THE TRAIN IS LEAVING · TWELVE BELLS/);
  for (const field of ['given: snap.given', 'carried: snap.carried', 'targetPrompt:', 'lampsLit:', 'chase: { quick:', 'ms: snap.bellMs, next: snap.nextBell']) assert.ok(scene.includes(field), field);
});
