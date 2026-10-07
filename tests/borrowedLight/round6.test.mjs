// Round 6 (2026-10-07, owner G3/G4/G7 + playtest items 6, 7, 18) · Chapter 2.
// Model-level where the rules are pure; source checks where they live in the
// scene.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CHAPTER_CONTROLS } from '../../src/shell/chapterControls.js';
import { HINTS, IDLE_HINTS } from '../../src/chapters/borrowedLight/story.js';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const scene = read('src/chapters/borrowedLight/BorrowedLightScene.js');
const hud = read('src/chapters/borrowedLight/hud.js');

// ---------------------------------------------------------------------------
// Item 18 · unified controls.
test('R6-E: Space / W / ↑ only jump; E and Enter act on the marked target; F is a silent alias', () => {
  for (const key of ['space', 'up', 'w']) assert.match(scene, new RegExp(`this\\.keys\\.${key}\\.on\\('down', once\\(jumpDown\\)\\);`));
  const jumpDown = scene.slice(scene.indexOf('const jumpDown = '), scene.indexOf("this.keys.space.on('down'"));
  assert.doesNotMatch(jumpDown, /advanceDialog|closeCard/, 'a jump key never advances a line or closes a card');
  assert.match(jumpDown, /this\.hud\.nudgeConfirm\(\)/, '… it answers by pulsing the E hint instead');
  assert.match(hud, /nudgeConfirm\(\) \{/);
  assert.match(scene, /this\.keys\.e\.on\('down', once\(\(\) => this\.act\(\{ source: 'key' \}\)\)\);/);
  assert.match(scene, /this\.keys\.enter\.on\('down', once\(\(\) => this\.act\(\{ source: 'key' \}\)\)\);/);
  assert.match(scene, /this\.keys\.f\.on\('down', once\(\(\) => this\.punch\(\{ source: 'key' \}\)\)\);/);
  assert.match(scene, /if \(edge\('X', pad\.X\)\) this\.act\(\{ source: 'pad' \}\);/);
  // Holding the press (E, its F alias or Enter) takes a punch back.
  assert.match(scene, /hb\.source === 'key' \? \(keys\.e\.isDown \|\| keys\.f\.isDown \|\| keys\.enter\.isDown\)/);
});

test('R6-E: no prompt, hint or controls row names F; the pause menu lists E / ENTER', () => {
  for (const [name, value] of Object.entries(HINTS)) {
    const text = typeof value === 'function' ? value('AMBER', 'THE TAG') : value;
    assert.doesNotMatch(String(text), /\bF\b/, `HINTS.${name}`);
  }
  for (const [step, words] of Object.entries(IDLE_HINTS)) assert.doesNotMatch(words.nudge, /\bF\b/, step);
  const rows = CHAPTER_CONTROLS.borrowedLight.map(([a, k]) => `${a} ${k}`).join(' | ');
  assert.match(rows, /PUNCH NODE E \/ LEFT CLICK/);
  assert.match(rows, /JUMP SPACE \/ W \/ ↑/);
  assert.match(rows, /TALK \/ READ \/ CONTINUE E \/ ENTER/);
  assert.doesNotMatch(rows, /\bF\b/);
});

test('R6-E: one E target at a time; at A1 the box wins until it has been punched', () => {
  const at = scene.indexOf('  actionTarget() {');
  const body = scene.slice(at, scene.indexOf('\n  }\n', at));
  assert.match(body, /if \(prop === 'mechanic' && !this\.flags\.firstPunch\) return \{ kind: 'node', node \};/);
  assert.match(body, /Math\.abs\(px - this\.feetX\) < Math\.abs\(node\.x - this\.feetX\)/);
  // The prompts follow the same choice.
  assert.match(scene, /const action = this\.actionTarget\(\);\n\s+const target = action\?\.kind === 'prop' \? action\.prop : null;/);
});
