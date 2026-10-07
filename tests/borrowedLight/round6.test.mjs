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

// ---------------------------------------------------------------------------
// Item 6 · the first box, do-then-explain (firstLesson.js).
import { LESSON, afterTalk, createLesson, lessonPointing, ruleTaught, storyWaiting, talkLines, updateLesson } from '../../src/chapters/borrowedLight/firstLesson.js';
import { LESSON_LINES, MECHANIC_LINES } from '../../src/chapters/borrowedLight/story.js';

test('R6-B: she points, Butch punches, the bell brings the bridge, and only then the rule', () => {
  const lesson = createLesson();
  const step = (ctx) => updateLesson(lesson, { section: 'A', x: 900, nowMs: 0, queued: false, powered: false, ...ctx });
  assert.deepEqual(step({ x: 400 }), [], 'nothing on the far end of the roof');
  assert.deepEqual(step({ x: LESSON.pointFromX }), ['point']);
  assert.ok(lessonPointing(lesson));
  assert.deepEqual(step({}), [], 'she says it once');
  assert.deepEqual(step({ queued: true, nowMs: 1000 }), ['wait']);
  assert.ok(lessonPointing(lesson) && !ruleTaught(lesson));
  assert.deepEqual(step({ queued: false, powered: true, nowMs: 3000 }), ['success']);
  assert.equal(lessonPointing(lesson), false);
  assert.deepEqual(step({ powered: true, nowMs: 3000 + LESSON.ruleDelayMs - 1 }), [], 'the rule waits for the success line');
  assert.deepEqual(step({ powered: true, nowMs: 3000 + LESSON.ruleDelayMs }), ['rule']);
  assert.ok(ruleTaught(lesson) && storyWaiting(lesson));
  // Every key it says is a line.
  for (const key of ['point', 'wait', 'success', 'rule']) assert.ok(LESSON_LINES[key]?.text, key);
});

test('R6-B: her story (night service, Mara, the letter) only after the first success; the rule is re-readable', () => {
  const story = LESSON_LINES.story.map((l) => l.text).join(' ');
  assert.match(story, /night service/);
  assert.match(story, /She came through last night/);
  assert.match(story, /letter/);
  const lesson = createLesson();
  for (const stepName of ['wait', 'point', 'punched']) {
    lesson.step = stepName;
    const said = talkLines(lesson, LESSON_LINES).map((l) => l.text).join(' ');
    assert.doesNotMatch(said, /night service|came through|letter/, `${stepName}: no story before the box has worked`);
  }
  lesson.step = 'point';
  assert.deepEqual(talkLines(lesson, LESSON_LINES), [LESSON_LINES.point]);
  lesson.step = 'success';
  assert.deepEqual(talkLines(lesson, LESSON_LINES), [LESSON_LINES.success, LESSON_LINES.rule]);
  assert.equal(afterTalk(lesson), 'ruled');
  assert.deepEqual(talkLines(lesson, LESSON_LINES), [...LESSON_LINES.story]);
  assert.equal(afterTalk(lesson), 'told');
  assert.match(talkLines(lesson, LESSON_LINES)[0].text, /One colour, one line/);
  // The lines a first visit hears, in order: the box first, the story last.
  assert.equal(MECHANIC_LINES[0], LESSON_LINES.point);
  assert.equal(MECHANIC_LINES.at(-1), LESSON_LINES.story.at(-1));
  // A take-back before the bell: she is pointing again, silently.
  const back = createLesson();
  updateLesson(back, { x: 900 });
  updateLesson(back, { x: 900, queued: true });
  assert.deepEqual(updateLesson(back, { x: 900, queued: false }), []);
  assert.equal(back.step, 'point');
  // A caught bell straight away is a success; other sections never teach it.
  const caught = createLesson();
  assert.deepEqual(updateLesson(caught, { x: 300, powered: true }), ['success']);
  assert.deepEqual(updateLesson(createLesson(), { section: 'B', x: 9000 }), []);
  assert.equal(createLesson({ done: true }).step, 'told');
});

test('R6-B: the scene runs the lesson, and Mara is seen across the gap when the bridge comes out', async () => {
  const { MARA_SIGHTINGS } = await import('../../src/chapters/borrowedLight/level.js');
  assert.equal(MARA_SIGHTINGS.find((s) => s.id === 'first').trigger, 'first-bridge');
  assert.match(scene, /this\.updateLessonStep\(\);/);
  assert.match(scene, /const lines = talkLines\(this\.lesson, LESSON_LINES\);/);
  assert.match(scene, /if \(said\.includes\('success'\)\) \{/);
  assert.match(scene, /const pointing = lessonPointing\(this\.lesson\) \|\| line === LESSON_LINES\.point;/);
  // Lines are captions that take no input (Butch keeps control).
  assert.match(scene, /if \(line && this\.hud\.say\(line, ms\)\)/);
  assert.match(scene, /if \(section !== 'A' \|\| lamp\.id !== SECTIONS\.A\.spawn\) this\.lesson = createLesson\(\{ done: true \}\);/);
});

// ---------------------------------------------------------------------------
// Owner G3 · the cause card at a box (causeCard.js).
import { CARD_FONT, DWELL_MS, MIN_WORLD_FONT, RULE_TEXT, TEACH_USES, cardLayout, causeCard, effectLabel, placeCard, showCard } from '../../src/chapters/borrowedLight/causeCard.js';
import { CH2_RULES, createTimetable } from '../../src/chapters/borrowedLight/timetableModel.js';
import { machineById, nodeById, timetableDefinition } from '../../src/chapters/borrowedLight/level.js';
import { WARN_MS, blinkOn, litLamps, machineTotalMs, ticksCrossed, timerOf } from '../../src/chapters/borrowedLight/timerLights.js';

const city = () => createTimetable(timetableDefinition(), CH2_RULES);
const cardFor = (tt, id, extra = {}) => {
  const node = nodeById(id);
  const machine = machineById(node.machine);
  return causeCard({
    node,
    machine,
    preview: tt.punchPreview(id),
    status: tt.nodeStatus(id),
    msToBell: tt.msToBell(),
    bellMs: tt.bellMs,
    timer: timerOf(tt.machineStatus(machine.id), machineTotalMs(machine)),
    ...extra,
  });
};

test('R6-A: the card reads punch → next bell → bridge, and the lit cell follows the box', () => {
  const tt = city();
  tt.update(500);
  let card = cardFor(tt, 'a-n1');
  assert.deepEqual(card.cells.map((c) => c.label), ['PUNCH', 'NEXT BELL', 'BRIDGE OUT']);
  assert.equal(card.cells[0].key, 'E');
  assert.equal(card.active, 0);
  assert.equal(card.rule, null, 'the rule waits until it has been taught');
  tt.punch('a-n1');
  tt.update(1000);
  card = cardFor(tt, 'a-n1');
  assert.equal(card.active, 1, 'punched: the bell is the step');
  assert.equal(card.seconds, Math.ceil(tt.msToBell() / 1000));
  assert.ok(card.bellK > 0.3 && card.bellK < 0.5, `ring ${card.bellK}`);
  assert.match(card.note, /HOLD E · TAKE BACK/);
  tt.update(tt.msToBell() + 1000);
  card = cardFor(tt, 'a-n1', { ruleTaught: true });
  assert.equal(card.active, 2, 'the bridge is out');
  assert.equal(card.cells[0].label, 'PUNCH');
  assert.ok(card.machineK > 0.7 && card.machineK < 1, `time left ${card.machineK}`);
  assert.equal(card.rule, RULE_TEXT);
  // Two-phase lines name their bell; a dead node or a busy line keeps its own tag.
  assert.equal(cardFor(city(), 'a-n9').cells[1].label, 'BELL II');
  assert.equal(cardFor(city(), 'b-n9'), null);
  const busy = city();
  busy.punch('a-n5');
  busy.update(busy.msToBell() + 10);
  assert.equal(busy.punchPreview('a-n6').result, 'busy');
  assert.equal(cardFor(busy, 'a-n6'), null);
  assert.equal(effectLabel(machineById('a-lift1')), 'LIFT UP');
  assert.equal(effectLabel(machineById('c-drop')), 'LEDGE DROPS');
});

test('R6-A: big type (≥ 18 px on a 1280×720 window), shown for the first punches and on a pause at any box', () => {
  assert.ok(CARD_FONT >= MIN_WORLD_FONT);
  assert.ok(MIN_WORLD_FONT * (1280 / 1920) >= 18, 'the smallest world text is 18 px at 1280×720');
  assert.match(scene, /export const TAG_FONT = MIN_WORLD_FONT;/);
  assert.match(scene, /fontSize: `\$\{TAG_FONT\}px`/);
  assert.ok(showCard({ uses: 0, dwellMs: 0 }));
  assert.ok(showCard({ uses: TEACH_USES - 1, dwellMs: 0 }));
  assert.equal(showCard({ uses: TEACH_USES, dwellMs: 0 }), false);
  assert.ok(showCard({ uses: 9, dwellMs: DWELL_MS }));
  // It scales with TEXT SIZE and sits above the box, reaching toward the machine.
  const small = cardLayout({ k: 1 });
  const big = cardLayout({ k: 1.5, labelW: [135, 255, 285] });
  assert.ok(big.w > small.w * 1.4 && big.h > small.h * 1.4);
  assert.ok(cardLayout({ k: 1, ruleW: 400 }).h > small.h, 'the rule strip adds a row');
  const at = placeCard({ headX: 1400, headY: 610, w: small.w, h: small.h, side: 1 });
  assert.ok(at.y1 <= 610 - 40 && at.x0 < 1400 && at.x1 > 1400 + small.w / 2);
  const left = placeCard({ headX: 1400, headY: 610, w: small.w, h: small.h, side: -1 });
  assert.ok(left.x1 > 1400 && left.x0 < 1400 - small.w / 2);
  const clamped = placeCard({ headX: 1900, headY: 610, w: 600, h: 120, side: 1, view: { x: 0, right: 1920 } });
  assert.ok(clamped.x1 <= 1920 - 24);
  // The scene uses it in place of the small tag.
  assert.match(scene, /if \(card && showCard\(\{ uses: this\.punchUses, dwellMs: this\.cardDwell \}\)\) \{/);
  assert.match(scene, /this\.card\.update\(this\.cardShown, this\.cardAt, t, dt\);/);
});

test('R6-A: the punched box rings toward its bell, the machine shows a ghost and a dial, the station clock keeps the bell', () => {
  assert.match(read('src/chapters/borrowedLight/art/machineArt.js'), /if \(view\.countdown != null\) \{/);
  assert.match(scene, /drawPunchedMachines\(t\) \{/);
  assert.match(scene, /drawGhost\(g, machine, 'on', line, t\);/);
  assert.match(scene, /drawBellDial\(dg, x, y, k, \{ color: color\.hex, glow: color\.glow, t \}\);/);
  assert.match(scene, /drawStationClock\(t\) \{/);
  assert.match(scene, /const k = this\.tt\.bellPhase\(\);/);
  assert.doesNotMatch(read('src/chapters/borrowedLight/art/paint.js'), /ctx\.lineTo\(cx \+ 12, canopyY \+ 94\)/, 'the painted clock has no frozen hands');
  assert.match(hud, /`NEXT BELL · \$\{Math\.max\(1, Math\.ceil\(msToBell \/ 1000\)\)\}`/);
});

// ---------------------------------------------------------------------------
// Item 7 · the bridge shows its time (timerLights.js).
test('R6-C: lamps along the bridge go out as its time runs down; the last second blinks; soft ticks near the end', () => {
  assert.equal(timerOf({ powered: false }, 6000), null);
  assert.deepEqual(timerOf({ powered: true, held: true, remaining: null }, 6000), { k: 1, warn: 0, held: true, remaining: Infinity });
  const half = timerOf({ powered: true, held: false, remaining: 3000 }, 6000);
  assert.equal(half.k, 0.5);
  assert.equal(half.warn, 0);
  assert.ok(Math.abs(timerOf({ powered: true, remaining: WARN_MS / 2 }, 6000).warn - 0.5) < 1e-9);
  assert.equal(litLamps(1, 11), 11);
  assert.equal(litLamps(0.5, 11), 6);
  assert.equal(litLamps(0.01, 11), 1, 'a sliver of time keeps one lamp');
  assert.equal(litLamps(0, 11), 0);
  assert.equal(blinkOn(0, 1.234), true, 'steady until the last second');
  const blinks = Array.from({ length: 200 }, (_, i) => blinkOn(0.8, i / 100)).filter((on) => !on).length;
  assert.ok(blinks > 20 && blinks < 120, `the warning blinks (${blinks})`);
  assert.deepEqual(ticksCrossed(2100, 1900), [2000]);
  assert.deepEqual(ticksCrossed(1100, 400), [1000, 750, 500]);
  assert.deepEqual(ticksCrossed(400, 1100), []);
  assert.equal(machineTotalMs(machineById('a-bridge1')), 6000);
  assert.equal(machineTotalMs(machineById('b-bridge')), null, 'the held bridge has no clock until it is cut');
  assert.equal(machineTotalMs(machineById('b-bridge'), 3200), 3200);
  // The first bridge, run through the model: its lamps only ever go out.
  const tt = city();
  tt.punch('a-n1');
  tt.update(tt.msToBell() + 1);
  let prev = 11;
  for (let ms = 0; ms < 6000; ms += 100) {
    const timer = timerOf(tt.machineStatus('a-bridge1'), 6000);
    if (!timer) break;
    const lit = litLamps(timer.k, 11);
    assert.ok(lit <= prev, `lamps never relight (${ms} ms)`);
    prev = lit;
    tt.update(100);
  }
  assert.ok(prev <= 1);
  const art = read('src/chapters/borrowedLight/art/machineArt.js');
  assert.match(art, /timerLamps\(g, posts, y - 29, on > 0 \? \(timer \?\? FULL\) : null, color, t\);/);
  assert.match(scene, /drawMachine\(entry\.view, status, t, \{ timer \}\);/);
  assert.match(scene, /if \(near && this\.player\.visible\) sfx\.timerTick\(/);
  assert.match(read('src/chapters/borrowedLight/audio.js'), /export function timerTick\(urgent = false\) \{/);
});

// ---------------------------------------------------------------------------
// Owner G3 · Butch redrawn (art/butchRig.js) and the control feel.
import { BUTCH_FRAME_SETS, BUTCH_LOOK, RIG, butchFrame, butchLampAt, createButchAnim, drawButch, stepButchAnim } from '../../src/chapters/borrowedLight/art/butchRig.js';
import { BUTCH_TEXTURE, butchFrameName } from '../../src/chapters/borrowedLight/art/butchSprites.js';
import { CONTROLLER, jumpArc } from '../../src/chapters/borrowedLight/controller.js';

const FRAME_MS = 1000 / 60;
const run = (anim, ms, input) => { for (let t = 0; t < ms; t += FRAME_MS) stepButchAnim(anim, { maxRun: 420, facing: 1, grounded: true, ...input(t) }, FRAME_MS); return anim; };

// A Graphics stand-in that records every point drawn.
function recorder() {
  const pts = [];
  const g = {};
  for (const name of ['fillStyle', 'lineStyle', 'beginPath', 'strokePath', 'closePath']) g[name] = () => g;
  g.fillPoints = (list) => { list.forEach((p) => pts.push(p)); return g; };
  g.fillCircle = (x, y, r) => { pts.push({ x: x - r, y: y - r }, { x: x + r, y: y + r }); return g; };
  g.fillRect = (x, y, w, h) => { pts.push({ x, y }, { x: x + w, y: y + h }); return g; };
  g.lineBetween = (x0, y0, x1, y1) => { pts.push({ x: x0, y: y0 }, { x: x1, y: y1 }); return g; };
  g.moveTo = (x, y) => { pts.push({ x, y }); return g; };
  g.lineTo = g.moveTo;
  return { g, pts };
}

test('R6-D: a run cycle with knee lift and arm swing; the greatcoat trails and follows through on a stop', () => {
  const anim = createButchAnim();
  const thighs = [];
  run(anim, 1200, (t) => { const phase = (t / 600) % 1; return { pose: 'run', phase, vx: 420 }; });
  for (let i = 0; i < 8; i += 1) {
    anim.phase = i / 8;
    thighs.push(butchFrame(anim).legA[0]);
  }
  assert.ok(Math.max(...thighs) > 0.4 && Math.min(...thighs) < -0.2, `the near leg swings through (${thighs.map((v) => v.toFixed(2))})`);
  anim.phase = 0.75;
  assert.ok(butchFrame(anim).legA[1] > 1.1, 'the knee lifts high in the swing');
  assert.ok(anim.coat > 0.25, `the coat tail trails a run (${anim.coat.toFixed(2)})`);
  // Stop dead: the tail swings on past rest (follow-through), the lantern swings and settles.
  let minCoat = anim.coat;
  let maxLamp = 0;
  run(anim, 600, () => ({ pose: 'idle', vx: 0 }));
  run(anim, 1, () => ({ pose: 'idle', vx: 0 }));
  const stop = createButchAnim();
  run(stop, 800, (t) => ({ pose: 'run', phase: (t / 600) % 1, vx: 420 }));
  for (let t = 0; t < 1500; t += FRAME_MS) {
    stepButchAnim(stop, { pose: 'idle', vx: t < 100 ? 420 * (1 - t / 100) : 0, facing: 1, grounded: true, maxRun: 420 }, FRAME_MS);
    minCoat = Math.min(minCoat, stop.coat);
    maxLamp = Math.max(maxLamp, Math.abs(stop.lamp));
  }
  assert.ok(minCoat < 0.05, `the coat swings forward past rest on the stop (${minCoat.toFixed(2)})`);
  assert.ok(maxLamp > 0.15, `the lantern swings (${maxLamp.toFixed(2)})`);
  run(stop, 4000, () => ({ pose: 'idle', vx: 0 }));
  assert.ok(Math.abs(stop.lamp) < 0.05, 'and settles');
});

test('R6-D: anticipation before a jump, a stretch off the ground, a squash on landing that springs back', () => {
  const anim = createButchAnim();
  stepButchAnim(anim, { pose: 'jump', vx: 300, vy: -980, facing: 1, grounded: false, jumped: true }, FRAME_MS);
  let frame = butchFrame(anim);
  assert.equal(frame.sprite.set, 'crouch', 'the crouch reads first');
  assert.ok(frame.hip > 5, 'hips drop for the push-off');
  run(anim, RIG.anticMs + 20, () => ({ pose: 'jump', vx: 300, vy: -800, grounded: false }));
  assert.ok(anim.squash > 1.02, `then the stretch (${anim.squash.toFixed(2)})`);
  run(anim, 300, () => ({ pose: 'fall', vx: 300, vy: 900, grounded: false }));
  stepButchAnim(anim, { pose: 'land', vx: 300, vy: 0, facing: 1, grounded: true, landed: true, impactVy: 1200 }, FRAME_MS);
  frame = butchFrame(anim);
  assert.ok(anim.squash < 0.88, `a hard landing squashes (${anim.squash.toFixed(2)})`);
  assert.ok(frame.hip > 10, 'and bends the knees');
  run(anim, 450, () => ({ pose: 'idle', vx: 0 }));
  assert.ok(Math.abs(anim.squash - 1) < 0.03, `it springs back (${anim.squash.toFixed(3)})`);
});

test('R6-D: the figure: ~118 px, peaked cap with a visor forward, a coat to the shins, the lantern in his hand', () => {
  const anim = createButchAnim();
  run(anim, 500, () => ({ pose: 'idle', vx: 0 }));
  const frame = butchFrame(anim);
  const { g, pts } = recorder();
  const lamp = drawButch(g, frame, { x: 1000, y: 700, facing: 1 });
  const ys = pts.map((p) => p.y);
  const height = 700 - Math.min(...ys);
  assert.ok(height > 110 && height < 132, `height ${height.toFixed(1)}`);
  assert.ok(Math.max(...ys) <= 701.5, 'feet on the ground');
  // The visor reaches forward past the face; facing left mirrors it.
  const front = Math.max(...pts.filter((p) => p.y < 700 - 100).map((p) => p.x));
  assert.ok(front > 1000 + 18, `visor forward (${front.toFixed(1)})`);
  const mirror = recorder();
  drawButch(mirror.g, frame, { x: 1000, y: 700, facing: -1 });
  assert.ok(Math.min(...mirror.pts.filter((p) => p.y < 700 - 100).map((p) => p.x)) < 1000 - 18);
  // The lantern hangs from the leading hand, below the waist.
  assert.ok(lamp.x > 1000 && lamp.y > 700 - RIG.hipY * -1 + 20 - 60 && lamp.y < 700 - 20, `lamp ${lamp.x.toFixed(0)},${lamp.y.toFixed(0)}`);
  const L = butchLampAt(frame);
  assert.ok(Math.hypot(L.x - L.hand[0], L.y - L.hand[1]) > 8, 'on a bail');
  // Navy greatcoat, brass cap band, amber glass: the limited palette.
  assert.equal(BUTCH_LOOK.height, 118);
  assert.ok((BUTCH_LOOK.coat & 0xff) > ((BUTCH_LOOK.coat >> 16) & 0xff), 'the coat is navy (blue over red)');
});

test('R6-D: painted frames can replace the drawn figure (a frame name for every pose, the same lantern point)', () => {
  const anim = createButchAnim();
  const seen = new Set();
  const poses = [['idle', {}], ['run', { vx: 420 }], ['jump', { vy: -900, grounded: false }], ['jump', { vy: -20, grounded: false }], ['fall', { vy: 900, grounded: false }], ['float', { grounded: false }], ['land', { landed: true }]];
  for (const [pose, extra] of poses) {
    for (let i = 0; i < 12; i += 1) {
      stepButchAnim(anim, { pose, phase: i / 12, vx: 0, vy: 0, facing: 1, grounded: true, ...extra }, 40);
      const { sprite } = butchFrame(anim);
      assert.ok(BUTCH_FRAME_SETS[sprite.set] > sprite.index && sprite.index >= 0, `${sprite.set}-${sprite.index}`);
      seen.add(sprite.set);
    }
  }
  for (const set of ['idle', 'run', 'rise', 'apex', 'fall', 'float', 'land']) assert.ok(seen.has(set), set);
  assert.equal(butchFrameName({ sprite: { set: 'run', index: 3 } }), 'run-3');
  assert.equal(BUTCH_TEXTURE, 'ch2-butch');
  assert.match(scene, /this\.butchArt \?\?= createButchRenderer\(this, \{ depth: DEPTH\.player \}\);/);
  assert.doesNotMatch(scene, /BUTCH_SPEC/, 'Chapter 2 draws Butch with the new rig only');
});

test('R6-D: control feel: the same 420 px/s and 180 px apex, a heavier fall, tighter air control, wider forgiveness', () => {
  const arc = jumpArc();
  assert.equal(CONTROLLER.maxRun, 420);
  assert.ok(Math.abs(arc.apex - 180) < 1);
  assert.ok(arc.timeToApex < 0.38, `rise ${arc.timeToApex.toFixed(3)} s`);
  assert.ok(CONTROLLER.fallGravityScale >= 1.5, 'no floaty hang on the way down');
  assert.ok(arc.airTime < 0.7, `air time ${arc.airTime.toFixed(3)} s`);
  assert.ok(CONTROLLER.airDecel >= 1600, 'letting go in the air stops the drift');
  assert.ok(CONTROLLER.coyoteMs >= 110 && CONTROLLER.bufferMs >= 140);
});

// ---------------------------------------------------------------------------
// Owner G4 / G7 · heavier, matte, toward Kentucky Route Zero (art/grade.js,
// paint.js setPaintLook('matte'), worldArt light shapes).
import { GRADE, gradeColor, gradeMatrix } from '../../src/chapters/borrowedLight/art/grade.js';

const hex = (n) => [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
const lum = ([r, g, b]) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
const chroma = ([r, g, b]) => Math.max(r, g, b) - Math.min(r, g, b);

test('R6-F: the grade deepens the darks toward navy, keeps the practical lights, and pulls colour back', () => {
  const m = gradeMatrix();
  assert.equal(m.length, 20);
  assert.deepEqual(m.slice(15), [0, 0, 0, 1, 0], 'alpha untouched');
  // A dark wall goes darker; its black sits in navy (blue over red).
  const wall = hex(0x2a1e16);
  const graded = gradeColor(wall, m);
  assert.ok(lum(graded) < lum(wall) * 0.85, `darker (${lum(wall).toFixed(3)} → ${lum(graded).toFixed(3)})`);
  const night = gradeColor(hex(0x05080d), m);
  assert.ok(lum(night) < lum(hex(0x05080d)) && night[2] > night[0], 'the night sky goes deeper, toward navy');
  assert.ok(graded[2] / graded[0] > wall[2] / wall[0], 'brown walls lean navy');
  // A lit amber window keeps its value; the paper tags stay paper.
  const amber = hex(0xf2c27a);
  assert.ok(lum(gradeColor(amber, m)) > lum(amber) * 0.98);
  const paper = hex(0xe6dcc2);
  assert.ok(Math.abs(lum(gradeColor(paper, m)) - lum(paper)) < 0.08);
  // Saturated paint is pulled back toward the limited palette.
  const rose = hex(0xc98088);
  assert.ok(chroma(gradeColor(rose, m)) < chroma(rose) * 1.05);
  assert.ok(GRADE.saturation < 1 && GRADE.contrast > 1);
  assert.match(scene, /setPaintLook\('matte'\);\n\s+this\.grade = applyGrade\(cam\);\n\s+buildSharedTextures\(this\);/);
});

test('R6-F: matte is Chapter 2\'s own look; the finale keeps the classic paint it borrows', async () => {
  const paint = read('src/chapters/borrowedLight/art/paint.js');
  assert.match(paint, /let look = 'classic';/);
  assert.match(paint, /if \(lit && !matte\(\)\) \{\n\s+ctx\.save\(\);\n\s+ctx\.globalCompositeOperation = 'lighter';/, 'no glossy window halo when matte');
  assert.doesNotMatch(read('src/chapters/finalBoss/finaleArt.js'), /setPaintLook/);
  const { styleOf, setPaintLook, paintLook } = await import('../../src/chapters/borrowedLight/art/paint.js');
  assert.equal(paintLook(), 'classic');
  const classic = styleOf('brick');
  setPaintLook('matte');
  const heavy = styleOf('brick');
  setPaintLook('classic');
  const value = (css) => lum(hex(Number.parseInt(css.slice(1), 16)));
  assert.ok(value(heavy.top) < value(classic.top), 'matte walls are heavier');
  assert.equal(styleOf('brick').top, classic.top);
  // Light as shapes from its sources, the blooms turned down.
  const world = read('src/chapters/borrowedLight/art/worldArt.js');
  assert.match(world, /export const LAMP_GLOW = 0\.3;/);
  assert.match(world, /const spill = sign\.scroll \? null : scene\.add\.graphics\(\)/);
  assert.match(scene, /the lantern lays a small defined pool on the wet roof/);
});
