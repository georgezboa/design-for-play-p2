// Round 11 · the stage around the skill fight: controls (keys, mouse and
// gamepad), how the stage hands each movement to the next, and the
// accessibility and performance promises (Reduce Motion, TEXT SIZE, LOW).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  FINALE_ALL_CONTROLS, FINALE_PAD, FINALE_STAGE_CONTROLS, MOVEMENT_KEY_LINES, PROGRESS_KEPT_LINES, STORY_KEPT_LINE, finaleStageControls, readFinalePad,
} from '../../src/chapters/finalBoss/finaleControls.js';
import { CONTROL_SETS, chapterCardSpec } from '../../src/shell/chapterControls.js';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const battle = read('src/chapters/finalBoss/spectacleBattle.js');
const visuals = read('src/chapters/finalBoss/fightVisuals.js');

// ------------------------------------------------------------ controls

const pad = ({ axes = [0, 0, 0, 0], down = [] } = {}) => ({ connected: true, axes, buttons: Array.from({ length: 17 }, (_, i) => ({ pressed: down.includes(i) })) });

test('the gamepad: stick or D-pad moves, A jumps, B / RB dash, X acts, Y returns, LB listens, START pauses', () => {
  assert.equal(readFinalePad([]).connected, false);
  const still = readFinalePad([pad({ axes: [0.1, -0.12, 0, 0] })]);
  assert.deepEqual([still.moveX, still.moveZ], [0, 0], 'a resting stick is dead');
  const lean = readFinalePad([pad({ axes: [1, 0, 0, 0] })]);
  assert.equal(lean.moveX, 1);
  assert.equal(readFinalePad([pad({ down: [FINALE_PAD.up] })]).moveZ, -1, 'D-pad up walks up the screen');
  const aim = readFinalePad([pad({ axes: [0, 0, 0.8, 0] })]);
  assert.equal(aim.aimActive, true, 'the right stick aims the lens');
  const first = readFinalePad([pad({ down: [FINALE_PAD.jump, FINALE_PAD.act] })]);
  assert.equal(first.pressed.jump, true);
  assert.equal(first.pressed.act, true);
  const held = readFinalePad([pad({ down: [FINALE_PAD.jump, FINALE_PAD.act] })], first.buttons);
  assert.equal(held.pressed.jump, false, 'a press, not a hold');
  assert.equal(held.buttons.act, true, 'X held is a hold (Movement IV absorbs with it)');
  assert.equal(readFinalePad([pad({ down: [FINALE_PAD.dashAlt] })]).pressed.dash, true, 'RB dashes too');
  assert.equal(readFinalePad([pad({ down: [FINALE_PAD.start] })]).pressed.start, true);
  // the stage reads it once a frame and maps it to the same verbs as the keys
  assert.match(battle, /pollPad\(\) \{[\s\S]{0,700}readFinalePad\(pads, this\.padButtons\)/);
  assert.match(battle, /if \(pad\.pressed\.start && this\.mode !== 'menu'\) \{ this\.pauseMenu\?\.open\?\.\(\); return; \}/);
  assert.match(battle, /input\.actHeld = k\.has\('KeyE'\) \|\| Boolean\(pad\?\.buttons\.act\) \|\| this\.mouseHeld\.right;/);
  assert.match(battle, /input\.retHeld = k\.has\('KeyR'\) \|\| Boolean\(pad\?\.buttons\.ret\) \|\| this\.mouseHeld\.left;/);
  assert.match(battle, /if \(pad\?\.aimActive\) input\.aim = \{ x: this\.player\.x \+ pad\.aimX \* 4\.2, z: this\.player\.z \+ pad\.aimZ \* 4\.2 \};/);
});

test('each movement names its own 3–5 controls; Space only ever jumps; every key line teaches its verb', () => {
  for (const stage of Object.keys(FINALE_STAGE_CONTROLS)) {
    const rows = finaleStageControls(stage);
    assert.ok(rows.length >= 3 && rows.length <= 5, stage);
    rows.forEach(([label, keys]) => { if (/\bSPACE\b/.test(keys)) assert.match(label, /JUMP/, `${stage}: ${label}`); });
  }
  FINALE_ALL_CONTROLS.forEach(([label, keys]) => { if (/\bSPACE\b/.test(keys)) assert.match(label, /JUMP/); });
  assert.ok(FINALE_ALL_CONTROLS.some(([label]) => label === 'GAMEPAD'));
  assert.match(MOVEMENT_KEY_LINES[0], /AS IT LANDS/);
  assert.match(MOVEMENT_KEY_LINES[1], /JUMP THE BELL’S RING/);
  assert.match(MOVEMENT_KEY_LINES[2], /ONE TRUE THING, THEN THE OTHER/);
  assert.match(MOVEMENT_KEY_LINES[3], /WHEN HE IS OPEN/);
  PROGRESS_KEPT_LINES.forEach((line) => { assert.match(line, /CHECKPOINT/); assert.ok(line.length <= 72); });
  assert.match(STORY_KEPT_LINE, /UNDOES NOTHING/);
  // the shell's own Chapter 6 card says the same (round 6 card said "no jumping")
  const card = chapterCardSpec('chapter6');
  assert.doesNotMatch(card.changed.map(({ text }) => text).join(' '), /no jumping/i);
  assert.ok(CONTROL_SETS.chapter6.basics.some(([label, keys]) => label === 'JUMP' && /SPACE/.test(keys)));
  const page = read('final-boss.html');
  assert.match(page, /three phases, each phase a checkpoint/);
  assert.match(page, /SPACE jumps the bell’s ring/);
});

// ------------------------------------------------------------ the stage

test('the stage only draws the fight: one runner step per frame step, its events drawn', () => {
  assert.match(battle, /const MOVEMENT_FIGHTS = Object\.freeze\(\[createLostPropertyFight, createBellFight, createEchoFight, createPaintFight\]\);/);
  assert.match(battle, /this\.runner = createFightRunner\(\{ director, difficulty, ledger: this\.deaths, movement: index/);
  assert.match(battle, /const events = this\.runner\.step\(dt, input\);\s*this\.onFightEvents\(events\);/);
  // no hit is decided on the stage
  assert.doesNotMatch(battle, /takeHit\(|resolveHazard\(|spawnBeat\(|createBellTutorial|createEchoDebate/);
  // a dealt hit is drawn, never dealt again
  assert.match(battle, /case 'damage': this\.bossHitFx\(e\.amount/);
  assert.match(battle, /updateProjectiles\(dt\) \{[\s\S]{0,900}this\.spawnImpact\(projectile\.target\.x/);
  assert.doesNotMatch(battle.slice(battle.indexOf('updateProjectiles(dt) {'), battle.indexOf('showHitFeedback({ label }')), /hitBoss\(/);
});

test('each finished movement hands on: I and III fall into the next world, II is the ticket inspection, IV the night service', () => {
  assert.match(battle, /onMovementFinished\(\) \{[\s\S]{0,300}if \(m === 3\) \{ this\.startRescueSequence\(\); return; \}[\s\S]{0,200}this\.startWorldTransition\(m \+ 1\);/);
  assert.match(battle, /if \(this\.phase === 1 && nextPhase === 2\) \{ this\.startVerifiedTransition\(nextPhase\); return; \}/);
  // the ending flow after the departure is unchanged
  assert.match(battle, /if \(t > 5\.2\) this\.finish\(\);/);
  assert.match(battle, /recordEnding\('normal'\);\s*playCinematic\(\{\s*id: 'ending'/);
  assert.match(battle, /onComplete: \(\) => showNormalEndingCard\(\)\.then\(\(\) => showEndCredits\(\{ ending: 'normal' \}\)\)/);
  // a death is a checkpoint, and the card and the ticket say which kind
  assert.match(battle, /this\.showDeathCard\(this\.lastHit \?\? \{ label: HIT_SOURCES\.hit \}, \{ rollback, phaseName: this\.fight\.track\.phase\.name \}\);/);
  assert.match(battle, /'CHECKPOINT · THIS PHASE AGAIN' : 'KEPT · NOTHING UNDONE'/);
  assert.match(battle, /this\.runner\?\.setDifficulty\('story'\);/);
});

test('Reduce Motion: telegraphs never blink (they only fill); shake and the hit flash stay off', () => {
  assert.match(visuals, /const breathe = \(t\) => \(reducedMotion\(\) \? 1 : 0\.8 \+ 0\.2 \* Math\.sin\(t \* 10\.5\)\); \/\/ ≈1\.7 Hz/);
  assert.match(battle, /createTelegraphLayer\(this\.scene, \{ reducedMotion: reducedMotionActive \}\)/);
  assert.match(battle, /if \(flashEnabled && !reducedMotionActive\(\)\) \{ this\.renderer\.domElement\.classList\.add\('hit-flash'\)/);
  assert.match(battle, /const shake = shakeEnabled && !reducedMotionActive\(\) \? this\.trauma \* this\.trauma : 0;/);
  // nothing that changes brightness pulses faster than 3 Hz (the flash
  // threshold), and the fight's own pulses have a still form
  const lines = battle.split('\n').filter((line) => /opacity|intensity|color\.setHex/.test(line));
  for (const line of lines) {
    for (const [, hz] of line.matchAll(/Math\.sin\(this\.elapsed \* (\d+(?:\.\d+)?)\)/g)) {
      assert.ok(Number(hz) / (2 * Math.PI) < 3.1, `a brightness pulse at ${(Number(hz) / (2 * Math.PI)).toFixed(1)} Hz: ${line.trim().slice(0, 120)}`);
    }
  }
  const fight = battle.slice(battle.indexOf('  syncLost(dt) {'), battle.indexOf('  // ------------------------------------------------------------ voices'));
  const pulsing = fight.split('\n').filter((line) => /opacity|setHex/.test(line) && /Math\.sin\(this\.elapsed/.test(line));
  pulsing.forEach((line) => assert.match(line, /reducedMotionActive\(\)/, `a pulse with no still form: ${line.trim().slice(0, 120)}`));
});

test('TEXT SIZE and LOW GRAPHICS: words are DOM (scaled), the new meshes are unlit', () => {
  assert.doesNotMatch(visuals, /MeshStandardMaterial|MeshPhysicalMaterial|castShadow = true/);
  assert.match(visuals, /MeshBasicMaterial/);
  // fact text, claims and prompts are world tags (DOM, var(--nf-scale)), never painted into the card
  assert.match(battle, /tags\.push\(\{ text: `\$\{near \? '<kbd>E<\/kbd> · ' : ''\}\$\{escapeHtml\(t\.text\)\}`/);
  assert.match(read('src/chapters/finalBoss/finaleArt.js'), /fact's words are a world tag beside it, so they follow TEXT SIZE/);
  assert.match(battle, /const count = this\.quality\.tier === 'low' \? 7 : 14;/);
});

test('the QA bot and its hooks exist only in a DEV build', () => {
  assert.match(battle, /if \(DEV_MODE && this\.bot\) input = this\.bot\.decide\(this\.runner, dt\);/);
  const gate = battle.slice(battle.indexOf('if (DEV_MODE) {\n  window.__finalBoss = game;'));
  assert.match(gate, /window\.finalBossBot = async \(on = true, skill = 'competent', seed = 5\) => \{[\s\S]{0,200}await import\('\.\/fightBot\.js'\)/);
  assert.doesNotMatch(battle.slice(0, battle.indexOf('if (DEV_MODE) {\n  window.__finalBoss = game;')), /from '\.\/fightBot\.js'/, 'never imported statically');
});
