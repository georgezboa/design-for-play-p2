// Round 12 · George's Chapter 2 notes (2026-10-10).
//
// 1. "最后三个那个升起来降下去的那个直接在一个地方卡住就进下一个动画了 没让我跑完"
//    — at the end, on the pieces that rise and fall, Butch stuck in one place
//    and the game went straight into the 2→3 cutscene without letting him run
//    the rest. Two causes, both fixed and tested here:
//    a. the counterweight walkways (C3, C4) could stop short of the deck: a
//       rider stepping onto the walkway while its brake was still off sank it
//       again (the clean jump in a real playthrough left it 15 px under the
//       signal deck: Butch stood against the deck's side), and a ride begun
//       late or interrupted by a hop locked part way;
//    b. when the twelfth departure bell rang first, "THE TRAIN REMEMBERS" set
//       every machine itself, carried Butch to the platform and ran him into
//       the train: the cutscene, with the room he was stuck in unplayed.
// 2. "不要一直有提示" — hints once or twice at the start, not all the time
//    (see the second half of this file).

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CATCH_MS, CH2_RULES, createTimetable } from '../../src/chapters/borrowedLight/timetableModel.js';
import {
  DEPARTURE_BELLS,
  DEPARTURE_WARN_BELLS,
  LAMPS,
  LATE_ROLL_MS,
  MACHINES,
  STEP_UP_PX,
  cagesAt,
  canRunForTrain,
  machineById,
  nodeById,
  platformById,
  settleStartLevels,
  stepUpLip,
  surfacesOf,
  timetableDefinition,
} from '../../src/chapters/borrowedLight/level.js';
import { HINTS } from '../../src/chapters/borrowedLight/story.js';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const scene = read('src/chapters/borrowedLight/BorrowedLightScene.js');
const AFTER = CATCH_MS + 50;

function cityTimetable() {
  const tt = createTimetable(timetableDefinition(), CH2_RULES);
  MACHINES.filter((m) => m.heldAtStart).forEach((m) => tt.hold(m.id, m.heldBy));
  settleStartLevels(tt);
  return tt;
}

// Release a walkway's brake on the next bell (its line free).
function releaseBrake(tt, nodeId) {
  tt.update(AFTER);
  const res = tt.punch(nodeId);
  assert.ok(['queued', 'caught'].includes(res.result), `${nodeId}: ${res.result}`);
  if (res.result === 'queued') {
    const machine = nodeById(nodeId).machine;
    for (let i = 0; i < 3 && !tt.machineStatus(machine).powered; i += 1) tt.update(tt.msToBell());
  }
  assert.equal(tt.machineStatus(nodeById(nodeId).machine).powered, true, 'the brake is off');
}

// ---------------------------------------------------------------------------
// 1a · the walkways always arrive flush and stay there.

test('R12-1a: both walkways are driven by cage A only, and a ride runs to its end', () => {
  for (const id of ['c-weights', 'c-weights2']) {
    const m = machineById(id);
    assert.equal(m.weighs, 'a', `${id}: only a rider in cage A drives it`);
    assert.equal(m.completes, true, `${id}: a ride once started runs to its end`);
    const def = timetableDefinition().machines.find((d) => d.id === id);
    assert.equal(def.weighs, 'a');
    assert.equal(def.completes, true);
    // Flush at the top: the walkway (cage B) at level 1 is the deck's height.
    assert.equal(cagesAt(m, 1).b.y, platformById(id === 'c-weights' ? 'c-signal' : 'c-platform').y);
  }
  assert.equal(machineById('c-drop').completes, true);
});

test('R12-1a: stepping onto the walkway while its brake is still off no longer sinks it (the 15 px snag)', () => {
  for (const [id, node] of [['c-weights', 'c-n5'], ['c-weights2', 'c-n6']]) {
    const tt = cityTimetable();
    if (id === 'c-weights2') tt.settle('c-drop', 0);
    tt.setLoad(id, 'a');
    releaseBrake(tt, node);
    const m = machineById(id);
    for (let i = 0; i < 60 && tt.machineStatus(id).level < 1; i += 1) tt.update(50);
    assert.equal(tt.machineStatus(id).level, 1, `${id}: cage A down, the walkway up`);
    assert.equal(tt.machineStatus(id).powered, true, 'the brake is still off: the moment the playthrough jumped');
    // The jump across: Butch's weight is now on the walkway (cage B).
    tt.setLoad(id, 'b');
    tt.update(m.duration);
    assert.equal(tt.machineStatus(id).powered, false, 'the brake has locked');
    assert.equal(tt.machineStatus(id).level, 1, `${id}: the walkway stayed flush under him`);
  }
});

test('R12-1a: a ride begun late (the cage stepped into after the bell) still arrives', () => {
  const tt = cityTimetable();
  const m = machineById('c-weights');
  releaseBrake(tt, 'c-n5');
  // Butch waits on the gantry: the brake is off but nothing moves (empty cage).
  tt.update(1500);
  assert.equal(tt.machineStatus('c-weights').level, 0);
  const left = tt.machineStatus('c-weights').remaining;
  assert.ok(left < m.travel, `only ${left} ms of brake left for a ${m.travel} ms ride`);
  tt.setLoad('c-weights', 'a');
  const events = [];
  for (let t = 0; t < m.travel + 400; t += 50) events.push(...tt.update(50));
  assert.equal(tt.machineStatus('c-weights').level, 1, 'the brake held until the walkway arrived');
  assert.ok(events.some((e) => e.type === 'arrived' && e.machineId === 'c-weights'));
  tt.update(2000);
  assert.equal(tt.machineStatus('c-weights').powered, false, 'and then it locks');
  assert.equal(tt.machineStatus('c-weights').level, 1);
});

test('R12-1a: a hop in the cage mid-ride no longer leaves the walkway part way up', () => {
  const tt = cityTimetable();
  tt.setLoad('c-weights2', 'a');
  tt.settle('c-drop', 0);
  releaseBrake(tt, 'c-n6');
  tt.update(800);
  const mid = tt.machineStatus('c-weights2').level;
  assert.ok(mid > 0.2 && mid < 0.5);
  assert.equal(tt.machineStatus('c-weights2').riding, true);
  tt.setLoad('c-weights2', null); // in the air
  tt.update(400);
  assert.ok(tt.machineStatus('c-weights2').level > mid, 'the ride runs on without his weight');
  tt.update(3000);
  assert.equal(tt.machineStatus('c-weights2').level, 1);
  assert.equal(tt.machineStatus('c-weights2').riding, false);
});

test('R12-1a: a respawn reset still puts a walkway back at rest', () => {
  const tt = cityTimetable();
  tt.setLoad('c-weights', 'a');
  releaseBrake(tt, 'c-n5');
  tt.update(1000);
  tt.resetMachine('c-weights');
  assert.equal(tt.machineStatus('c-weights').level, 0);
  assert.equal(tt.machineStatus('c-weights').riding, false);
  tt.update(4000);
  assert.equal(tt.machineStatus('c-weights').level, 0, 'nothing rides on after the reset');
});

// A lip only a few px high never stops him (stepUpLip), but a real step does.
test('R12-1a: Butch steps up a small lip instead of snagging; real steps still need a jump', () => {
  const signal = platformById('c-signal');
  const w1 = machineById('c-weights');
  // The pre-fix snag: the walkway 15 px under the signal deck, Butch against its side.
  const surfaces = [{ x0: signal.x, x1: signal.x + signal.w, y: signal.y }, ...surfacesOf(w1, 0.96)];
  const walkwayY = cagesAt(w1, 0.96).b.y;
  assert.ok(walkwayY - signal.y > 10 && walkwayY - signal.y < STEP_UP_PX);
  const lift = stepUpLip({ feetX: signal.x - 20, feetY: walkwayY, dir: 1, halfW: 20, surfaces });
  assert.ok(lift > walkwayY - signal.y && lift < walkwayY - signal.y + 1, `lifted ${lift}`);
  // Walking left into it: nothing to step onto that way.
  assert.equal(stepUpLip({ feetX: signal.x - 20, feetY: walkwayY, dir: -1, halfW: 20, surfaces }), 0);
  // The AC unit (70 px) and the cage-A → walkway hop (110 px) stay jumps.
  const ac = platformById('a-ac');
  assert.equal(stepUpLip({ feetX: ac.x - 20, feetY: 460, dir: 1, halfW: 20, surfaces: [{ x0: ac.x, x1: ac.x + ac.w, y: ac.y }] }), 0);
  const up = cagesAt(w1, 1);
  assert.equal(stepUpLip({ feetX: up.b.x - 20, feetY: up.a.y, dir: 1, halfW: 20, surfaces: surfacesOf(w1, 1) }), 0);
  // The scene uses it while walking, grounded, into a side it is blocked by.
  assert.match(scene, /const lift = stepUpLip\(\{ feetX, feetY, dir, halfW: BODY_W \/ 2, surfaces: this\.lipSurfaces\(\) \}\);/);
  assert.match(scene, /if \(dir && grounded && !out\.jumped && \(dir > 0 \? body\.blocked\.right/);
});

// ---------------------------------------------------------------------------
// 1b · the deadline: readable, and never a skip ahead.

test('R12-1b: the twelfth bell never plays the route for him or runs him into the cutscene', () => {
  assert.doesNotMatch(scene, /trainRemembers|THE TRAIN REMEMBERS|REMEMBER_PLACE|rememberedSequence/);
  assert.doesNotMatch(read('src/chapters/borrowedLight/timetableModel.js'), /rememberedSequence/);
  // The only scripted run left is the intro's (off the arriving train).
  const autoRuns = scene.match(/this\.autoRun = \{/g) ?? [];
  assert.equal(autoRuns.length, 1);
  assert.match(scene, /this\.autoRun = \{ targetX: train\.doorWorldX \+ 130, then: \(\) => \{ this\.locked = null; \} \};/);
  // The chapter leaves only from board(), and board() only from Butch reaching the door.
  assert.equal((scene.match(/this\.exitChapter\(\)/g) ?? []).length, 2, 'on time and late, both inside board()');
  assert.equal((scene.match(/this\.board\(\)/g) ?? []).length, 1);
  assert.match(scene, /if \(this\.section === 'C' && x >= this\.boardX\(\) - 30 && Math\.abs\(y - TRAIN\.end\.y\) < 40\) this\.board\(\);/);
  assert.match(scene, /case 'countdown-end':\n\s+if \(!this\.boarded\) this\.departureBell\(\);/);
  // The hand-off to the 2→3 cutscene is unchanged (round 11).
  assert.match(scene, /arriveAt\('\/car03-3d\.html', 'chapter2'\);/);
});

test('R12-1b: missed: back to the last lamp with a fresh count; on the platform: run for the rolling train', () => {
  const missed = scene.slice(scene.indexOf('  missTrain() {'), scene.indexOf('  board() {'));
  assert.match(missed, /this\.tt\.stopCountdown\(\);/);
  assert.match(missed, /this\.departure\.started = false;/);
  assert.match(missed, /this\.respawn\(\{/);
  assert.match(missed, /train\.container\.x = this\.trainHomeX;/);
  assert.match(missed, /this\.hud\.toast\(HINTS\.missedTrain/);
  // The count starts again at the bench line, once he is back in control.
  assert.match(scene, /if \(this\.section === 'C' && !this\.departure\.started && x >= DEPARTURE_TRIGGER_X && !this\.hud\.cardOpen && !this\.locked\) this\.startDeparture\(\);/);
  assert.match(scene, /this\.tt\.startCountdown\(DEPARTURE_BELLS\);/);
  assert.equal(DEPARTURE_BELLS, 12);
  // Late: the doors stay open while it rolls; gone without him is a miss.
  const late = scene.slice(scene.indexOf('  startLateRun() {'), scene.indexOf('  missTrain() {'));
  assert.match(late, /duration: LATE_ROLL_MS/);
  assert.match(late, /onComplete: \(\) => \{ this\.lateRoll = null; if \(!this\.boarded\) this\.missTrain\(\); \}/);
  assert.ok(LATE_ROLL_MS >= 6000);
  assert.match(scene, /boardX\(\) \{ return this\.lateRun \? this\.trainEnd\.doorWorldX/);
  // A retry always starts before the room he was in: every C lamp is behind its room.
  const cLamps = LAMPS.filter((l) => l.section === 'C');
  assert.ok(cLamps.every((l, i) => i === 0 || l.spawnX > cLamps[i - 1].spawnX));
  assert.equal(HINTS.missedTrain, 'MISSED THE TRAIN · AGAIN FROM THE LAMP');
});

test('R12-1b: who can still run for the train when the twelfth bell rings', () => {
  const platform = platformById('c-platform');
  const walkway = machineById('c-weights2');
  const up = { level: 1, riding: false };
  const down = { level: 0, riding: false };
  const going = { level: 0.4, riding: true };
  const at = (x, y, status) => canRunForTrain({ x, y, platformX: platform.x, walkway, status });
  assert.equal(at(platform.x + 100, platform.y, down), true, 'on the platform');
  assert.equal(at(walkway.xB + 100, 180, up), true, 'on the walkway, up');
  assert.equal(at(walkway.x + 60, 290, up), true, 'in cage A2 with the walkway up: a hop away');
  assert.equal(at(walkway.x + 60, 250, going), true, 'riding cage A2 down');
  assert.equal(at(walkway.x + 60, 180, down), false, 'in cage A2, brake not released');
  assert.equal(at(platformById('c-landing').x + 40, 180, up), false, 'still on the landing');
  assert.equal(at(platformById('c-gantry').x + 300, 180, up), false, 'back in C3');
});

test('R12-1b: the deadline reads before it bites', () => {
  assert.equal(DEPARTURE_WARN_BELLS, 3);
  assert.equal(HINTS.departureSoon, 'THREE BELLS TO DEPARTURE');
  assert.match(scene, /if \(event\.remaining === DEPARTURE_WARN_BELLS && !this\.boarded\) this\.hud\.toast\(HINTS\.departureSoon/);
  const hud = read('src/chapters/borrowedLight/hud.js');
  assert.match(hud, /const urgent = Boolean\(countdown && countdown\.remaining <= warnBells && !countdown\.held\);/);
});

// A model replay of the George run: C3 stepped into late with a hop, the
// walkway jumped onto while the brake is still off, then C4 the same way,
// and the platform reached with bells to spare.
test('R12-1: the stuck run, replayed on the model, reaches the platform in time', () => {
  const tt = cityTimetable();
  tt.startCountdown(DEPARTURE_BELLS);
  // C1, C2 (as solveC).
  tt.update(AFTER); tt.punch('c-n1'); tt.update(tt.msToBell() + 700);
  tt.update(AFTER); tt.punch('c-n3'); tt.update(tt.msToBell() + 1300);
  for (let i = 0; i < 200 && tt.lineBusy('C:teal'); i += 1) tt.update(100);
  // C3: brake, a late step in, a hop, a jump to the walkway before it locks.
  releaseBrake(tt, 'c-n5');
  tt.update(1200);
  tt.setLoad('c-weights', 'a');
  tt.update(600);
  tt.setLoad('c-weights', null);
  tt.update(300);
  tt.setLoad('c-weights', 'a');
  for (let i = 0; i < 80 && tt.machineStatus('c-weights').level < 1; i += 1) tt.update(50);
  tt.setLoad('c-weights', 'b');
  tt.update(3000);
  assert.equal(tt.machineStatus('c-weights').level, 1, 'C3 walkway flush with the signal deck');
  tt.setLoad('c-weights', null);
  // C4: the ledge, then walkway 2 the same way.
  for (let i = 0; i < 4 && !tt.machineStatus('c-drop').powered; i += 1) { tt.update(AFTER); tt.punch('c-n7'); tt.update(tt.msToBell()); }
  tt.update(1700);
  assert.equal(tt.machineStatus('c-drop').level, 0);
  for (let i = 0; i < 200 && tt.lineBusy('C4:rose'); i += 1) tt.update(100);
  tt.update(AFTER);
  tt.punch('c-n6');
  for (let i = 0; i < 3 && !tt.machineStatus('c-weights2').powered; i += 1) tt.update(tt.msToBell());
  tt.update(900);
  tt.setLoad('c-weights2', 'a');
  for (let i = 0; i < 80 && tt.machineStatus('c-weights2').level < 1; i += 1) tt.update(50);
  tt.setLoad('c-weights2', 'b');
  tt.update(3000);
  assert.equal(tt.machineStatus('c-weights2').level, 1, 'walkway 2 flush with the platform');
  assert.equal(tt.countdown().done, false, `boards with ${tt.countdown().remaining} bells to spare`);
});

// ---------------------------------------------------------------------------
// 2 · "一开始提示一两次就好了": every teaching element, once or twice at the start.

import { CARD_KINDS, COMPACT_PROMPT, HINT_MIN_MS, HINT_SHOWS, compactPrompt, createHintBudget } from '../../src/chapters/borrowedLight/hintBudget.js';
import { TEACH_USES, showCard } from '../../src/chapters/borrowedLight/causeCard.js';
import { IDLE_TIERS, createIdleHints } from '../../src/chapters/borrowedLight/idleHints.js';
import { CHAPTER_CONTROLS } from '../../src/shell/chapterControls.js';

test('R12-2: the budget — a hint\'s first two showings, a glimpse does not use one up, a showing is never cut off', () => {
  assert.equal(HINT_SHOWS, 2);
  const b = createHintBudget();
  // One-shot (float hints, toasts).
  assert.equal(b.take('float:outOfReach'), true);
  assert.equal(b.take('float:outOfReach'), true);
  assert.equal(b.take('float:outOfReach'), false, 'the third press shows no words');
  assert.equal(b.take('float:forgets'), true, 'each kind has its own two');
  // Held (tags): a glimpse while running past is free.
  assert.equal(b.hold('teach:listen', true, 16), true);
  assert.equal(b.hold('teach:listen', true, 300), true);
  b.hold('teach:listen', false);
  assert.equal(b.used('teach:listen'), 0, 'up 316 ms: not counted');
  // Two real showings.
  for (let i = 0; i < 2; i += 1) {
    assert.equal(b.hold('teach:listen', true, 16), true);
    for (let t = 0; t < HINT_MIN_MS + 500; t += 100) assert.equal(b.hold('teach:listen', true, 100), true, 'it stays up while wanted');
    b.hold('teach:listen', false);
  }
  assert.equal(b.used('teach:listen'), 2);
  assert.equal(b.hold('teach:listen', true, 16), false, 'never a third time');
  // A showing that uses up the last one runs on until it is no longer wanted.
  const c = createHintBudget();
  c.hold('prompt:release', true, 16);
  for (let t = 0; t < 5000; t += 100) c.hold('prompt:release', true, 100);
  c.hold('prompt:release', false);
  c.hold('prompt:release', true, 16);
  for (let t = 0; t < 20000; t += 100) assert.equal(c.hold('prompt:release', true, 100), true);
  c.hold('prompt:release', false);
  assert.equal(c.hold('prompt:release', true, 16), false);
});

test('R12-2: the tag over a box shrinks to a chip (or nothing) once its kind has had its two showings', () => {
  const kinds = ['punch', 'punched', 'renew', 'cutting', 'release', 'drop', 'replace', 'liftWaits', 'cut', 'busy', 'held', 'dead', 'give', 'retrieve', 'putBack', 'borrow', 'lit', 'full', 'stepOff'];
  for (const kind of kinds) assert.ok(kind in COMPACT_PROMPT, `${kind} has a compact form`);
  for (const kind of CARD_KINDS) assert.equal(compactPrompt(kind), null, `${kind}: the box's own hole and ring say it`);
  for (const text of Object.values(COMPACT_PROMPT).filter(Boolean)) {
    assert.ok(text.length <= 20, `"${text}" is a chip, not a sentence`);
    assert.doesNotMatch(text, /\n/);
  }
  // The scene picks the full words only while the kind is fresh.
  assert.match(scene, /if \(CARD_KINDS\.includes\(kind\)\) return this\.punchUses < TEACH_USES \? this\.promptFor\(node\) : compactPrompt\(kind\);/);
  assert.match(scene, /return this\.hints\.hold\(key, true, this\.frameDt\) \? this\.promptFor\(node\) : compactPrompt\(kind\);/);
});

test('R12-2: the cause card, and the punched machine\'s ghost and dial, only for the first two punches', () => {
  assert.equal(TEACH_USES, 2);
  for (let uses = 0; uses < 30; uses += 1) assert.equal(showCard({ uses, newKind: true }), uses < 2, `punch ${uses + 1}`);
  assert.doesNotMatch(scene, /kindsPunched|newKind/);
  assert.match(scene, /if \(this\.listening \|\| this\.locked === 'intro' \|\| this\.punchUses > TEACH_USES\) return;/);
  // A resumed session gets one reminder card, not two.
  assert.match(scene, /this\.punchUses = Math\.max\(this\.punchUses, TEACH_USES - 1\);/);
});

test('R12-2: every teach tag and float hint asks the budget; tips toasts too', () => {
  const teach = scene.slice(scene.indexOf('  teachPrompt() {'), scene.indexOf('  tagObstacles() {'));
  const returns = teach.match(/return \{[^}]*text/g) ?? [];
  assert.ok(returns.length >= 8);
  for (const r of returns) assert.match(r, /return \{ id: '/, `teach tag without an id: ${r}`);
  assert.match(scene, /if \(teach && !this\.hints\.hold\(teachKey, true, this\.frameDt\)\) teach = null;/);
  // Float hints: every call names its kind (the dark deck's single hint is once by its flag).
  const calls = scene.match(/this\.floatHint\([^;]*\);/g) ?? [];
  assert.ok(calls.length >= 15);
  for (const call of calls) assert.doesNotMatch(call, /, \d+\);$/, `float hint without a key: ${call}`);
  const atCalls = scene.match(/this\.floatHintAt\([^;]*\);/g) ?? [];
  assert.deepEqual(atCalls.filter((call) => /, \d+\);$/.test(call)).map((call) => call.includes('DARK_DECK_HINT')), [true]);
  assert.match(scene, /if \(key && !this\.hints\.take\(`float:\$\{key\}`\)\) return;/);
  assert.match(scene, /this\.hints\.take\('toast:lightHome'\)/);
  assert.match(scene, /this\.respawnNote && this\.hints\.take\(`toast:\$\{this\.respawnNote\}`\)/);
});

test('R12-2: idle hints only when clearly stuck, small; the full line on SHOW ME or H', () => {
  assert.equal(IDLE_TIERS.pulse, 40000);
  assert.equal(IDLE_TIERS.nudge, 90000);
  assert.equal(IDLE_TIERS.full, Infinity);
  const idle = createIdleHints();
  idle.setKey('C:c3:');
  const seen = [];
  for (let t = 0; t < 600000; t += 250) for (const tier of idle.update(250)) seen.push(tier);
  assert.equal(seen.filter((t) => t === 'nudge').length, 1, 'ten minutes stuck: one toast');
  assert.equal(seen.filter((t) => t === 'full').length, 0);
  assert.deepEqual(idle.request(), ['pulse', 'nudge']);
  assert.deepEqual(idle.request(), ['pulse', 'nudge', 'full']);
  assert.match(scene, /this\.keys\.h\.on\('down', once\(\(\) => this\.showMe\(\)\)\);/);
  assert.ok(CHAPTER_CONTROLS.borrowedLight.some((row) => JSON.stringify(row).includes('H · OR PAUSE → SHOW ME')));
});

// A whole chapter's worth of showings, replayed on the budget: after the
// opening, nothing large comes back.
test('R12-2: replayed over a chapter, each element shows at most twice in words', () => {
  const b = createHintBudget();
  const shown = new Map();
  const frames = (key, n) => {
    let words = 0;
    for (let i = 0; i < 40; i += 1) {
      b.hold(key, true, 16);
      for (let t = 0; t < n; t += 100) b.hold(key, true, 100);
      b.hold(key, false);
      if (b.used(key) > words) words = b.used(key);
    }
    shown.set(key, b.used(key));
  };
  ['teach:listen', 'teach:cage', 'teach:borrow', 'teach:fromCradle', 'prompt:release', 'prompt:busy', 'prompt:drop'].forEach((key) => frames(key, 3000));
  for (const [key, n] of shown) assert.equal(n, 2, key);
  for (let i = 0; i < 25; i += 1) b.take('float:forgets');
  assert.equal(b.used('float:forgets'), 2);
});
