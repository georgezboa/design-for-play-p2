// Alpha round 3 (tester t2, 2026-10-01) · Chapter 2 scene-side regressions.
// The rules are tested on the pure modules (timetableModel.test.mjs R3-*,
// targeting.test.mjs "moving", level.test.mjs solveC / R3-2 / R3-3 data);
// these pin how the scene uses them.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CHAPTER_CONTROLS } from '../../src/shell/chapterControls.js';
import { HINTS } from '../../src/chapters/borrowedLight/story.js';
import { CH2_RULES, CATCH_MS } from '../../src/chapters/borrowedLight/timetableModel.js';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const scene = read('src/chapters/borrowedLight/BorrowedLightScene.js');
const hud = read('src/chapters/borrowedLight/hud.js');

test('R3-1: the scene plays by the round-3 rules; a press never takes a punch back', () => {
  assert.deepEqual(CH2_RULES, { catchMs: CATCH_MS, repress: 'keep' });
  assert.match(scene, /this\.tt = createTimetable\(timetableDefinition\(\), CH2_RULES\);/);
  // The punch handler has no silent take-back branch any more.
  assert.doesNotMatch(scene, /case 'unqueued':/);
  // Pressing a punched node says it is punched and when it rings…
  assert.equal(HINTS.punched('odd'), 'PUNCHED · RINGS ON BELL I');
  assert.equal(HINTS.punched('even'), 'PUNCHED · RINGS ON BELL II');
  assert.equal(HINTS.punched(null, 1), 'PUNCHED · RINGS ON THE NEXT BELL');
  assert.match(scene, /case 'already': label = pre\.waiting \? HINTS\.liftWaits : `\$\{HINTS\.punched\(node\.phase, pre\.inBells\)\}\\n\$\{HINTS\.holdTakeBack\}`;/);
  // …and only holding the press (F, the click or RB) takes it back.
  assert.match(scene, /export const TAKE_BACK_MS = 500;/);
  assert.match(scene, /if \(source\) this\.takeBack = \{ nodeId: node\.id, source, ms: 0 \};/);
  assert.match(scene, /const res = this\.tt\.takeBack\(hb\.nodeId\);/);
  assert.match(scene, /HINTS\.takenBack/);
  for (const [from, source] of [['this.keys.f.on', 'key'], ["this.input.on('pointerdown'", 'pointer'], ["edge('R1'", 'pad']]) {
    const at = scene.indexOf(from);
    assert.ok(at >= 0 && scene.slice(at, at + 400).includes(`source: '${source}'`), `${from} → ${source}`);
  }
  // Targeting while running: no stickiness, a punched pole yields.
  assert.match(scene, /moving: Math\.abs\(this\.player\.body\.velocity\.x\) > MOVING_VX,/);
  assert.match(scene, /spent: \(node\) => this\.tt\.isQueued\(node\.id\),/);
  const rows = CHAPTER_CONTROLS.borrowedLight.map(([a, k]) => `${a} ${k}`).join(' | ');
  assert.match(rows, /TAKE BACK A PUNCH HOLD F \/ HOLD CLICK ON IT/);
});

test('R3-2: every borrow the scene makes knows what Butch is standing on', () => {
  assert.equal(HINTS.stepOff, 'STEP OFF FIRST');
  const calls = scene.match(/this\.tt\.(?:borrowPreview|lamp)\([^)]*\)/g) ?? [];
  assert.ok(calls.length >= 4);
  for (const call of calls) assert.match(call, /riding/, call);
  assert.match(scene, /standsOn\(m, st\.level, this\.feetX, this\.feetY, grounded \? \{\} : \{ tol: 10, above: 260 \}\)/);
});

test('R3-3: lifts are told when their rider is still walking to them', () => {
  assert.match(scene, /this\.tt\.setShouldWait\(\(machineId\) => this\.liftShouldWait\(machineId\)\);/);
  assert.match(scene, /export const RIDER_APPROACH_PX = Math\.round\(CONTROLLER\.maxRun \* 1\.5\);/);
  assert.match(scene, /case 'lift-wait': \{/);
  assert.match(read('src/chapters/borrowedLight/art/machineArt.js'), /const wait = status\.waiting \? 0\.5 \+ 0\.5 \* Math\.sin\(t \* 11\) : 0;/);
});

test('P2: toasts sit on a dark band; the dark-deck hint is bright and stays on screen', () => {
  assert.match(hud, /this\.toastBand = scene\.add\.graphics\(\)/);
  assert.match(hud, /const parts = \[this\.toastText, band\];/);
  assert.match(scene, /this\.hud\.toast\(DARK_DECK_HINT, '#cfeee8', 3600\);/);
  assert.match(scene, /x = Phaser\.Math\.Clamp\(x, view\.x \+ half, view\.right - half\);/);
});

test('P2: A1 shows the punch tag with E · TALK; the chase shows no teach tag but its own', () => {
  assert.match(scene, /if \(target === 'mechanic' && this\.currentTarget\) \{\n\s+if \(!this\.flags\.mechanicTalked\) this\.talkText/);
  const teach = scene.slice(scene.indexOf('  teachPrompt() {'), scene.indexOf('  updatePrompts() {'));
  const chase = teach.indexOf('this.feetX >= CHASE.fromX && this.feetX < CHASE.toX');
  const listen = teach.indexOf('HINTS.listen');
  assert.ok(chase > 0 && listen > chase, 'the chase returns before the Listen tag');
  assert.match(teach, /text: HINTS\.fromCradle/);
  assert.equal(HINTS.fromCradle, 'PUNCH THE LAST POLE FROM HERE');
  assert.match(scene, /node\.id === 'a-n14' && pre\.result === 'queue' && !this\.tt\.machineStatus\('a-cradle1'\)\.powered/);
});

test('C4: the drop ledge starts held up, is remembered dropped, and only its ledge is a car', () => {
  assert.match(scene, /settleStartLevels\(this\.tt\);/);
  assert.match(scene, /this\.tt\.settle\(machineId, remembered\.ballast \? 0 : 1\)/);
  assert.match(scene, /\(machine\.riders \?\? \['a', 'b'\]\)\.forEach\(\(side\) => addCar/);
  assert.match(scene, /machine\.ballast \? HINTS\.dropBrake : HINTS\.brake/);
});
