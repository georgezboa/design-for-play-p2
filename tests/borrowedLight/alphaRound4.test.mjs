// Chapter 2 · BORROWED LIGHT — alpha round 4 (2026-10-05), engineer M2.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { BELL_MS, CATCH_MS, CH2_RULES, CUT_GRACE_MS, FLICKER_MS, createTimetable } from '../../src/chapters/borrowedLight/timetableModel.js';
import { CONTROLLER } from '../../src/chapters/borrowedLight/controller.js';
import {
  DEPARTURE_CHAIN,
  FROM_HERE,
  HOTEL_WINDOW,
  LAMPS,
  MACHINES,
  MARA_SIGHTINGS,
  NODES,
  PLATFORMS,
  PLATFORM_LAMPS,
  REHOLD_ON_RESPAWN,
  SECTIONS,
  SECTION_CHECKPOINTS,
  SECTION_MUSIC,
  SIGNS,
  TRAIN,
  lampById,
  lampStartState,
  machineBounds,
  machineById,
  nodeById,
  platformById,
  resolveResumeLamp,
  sectionAt,
  settleStartLevels,
  standsOn,
  timetableDefinition,
} from '../../src/chapters/borrowedLight/level.js';
import { chestAt, pickTarget } from '../../src/chapters/borrowedLight/targeting.js';
import { HINTS, IDLE_HINTS, MECHANIC_LINES } from '../../src/chapters/borrowedLight/story.js';
import { IDLE_TIERS, createIdleHints, progressKey, roomStep } from '../../src/chapters/borrowedLight/idleHints.js';
import { MAX_FRAME_MS, frameDelta, installWallClock } from '../../src/chapters/borrowedLight/frameClock.js';
import { createSaveStore } from '../../src/shell/saveSystem.js';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const scene = read('src/chapters/borrowedLight/BorrowedLightScene.js');
const main = read('src/borrowedLight-main.js');
const hud = read('src/chapters/borrowedLight/hud.js');
const RUN = CONTROLLER.maxRun / 1000;
const AFTER = CATCH_MS + 50;

function cityTimetable() {
  const tt = createTimetable(timetableDefinition(), CH2_RULES);
  MACHINES.filter((m) => m.heldAtStart).forEach((m) => tt.hold(m.id, m.heldBy));
  settleStartLevels(tt);
  return tt;
}

function memoryStorage() {
  const map = new Map();
  return { getItem: (k) => (map.has(k) ? map.get(k) : null), setItem: (k, v) => map.set(k, String(v)), removeItem: (k) => map.delete(k) };
}

// ---------------------------------------------------------------------------
// 1 · The hotel cut (section B).

test('R4-1: a cut holds until the next bell at least the grace away, and says so', () => {
  const tt = cityTimetable();
  tt.update(AFTER);
  // Plenty of time before the bell: it holds until that bell.
  const early = tt.punchPreview('b-n4');
  assert.equal(early.result, 'cut');
  assert.equal(early.bells, 1);
  const cut = tt.punch('b-n4');
  assert.equal(cut.result, 'cut');
  assert.equal(cut.bells, 1);
  assert.ok(Math.abs(cut.remaining - (BELL_MS - AFTER)) < 1, `holds ${cut.remaining} ms, until the bell`);
  assert.equal(HINTS.cutDone(cut.bells), 'CUT · THE BRIDGE HOLDS UNTIL THE NEXT BELL · CROSS NOW');
  // Pressing it again changes nothing: it does not quietly hold it again.
  assert.equal(tt.punchPreview('b-n4').result, 'cutting');
  assert.equal(tt.punch('b-n4').result, 'cutting');
  assert.equal(tt.machineStatus('b-bridge').held, false);
  // The line is free at once for the hotel lift.
  assert.equal(tt.punchPreview('b-n5').result, 'queue');
  // It flickers in the last 600 ms and is gone exactly at the bell.
  tt.update(tt.msToBell() - FLICKER_MS + 5);
  assert.equal(tt.machineStatus('b-bridge').flicker, true);
  const events = tt.update(tt.msToBell());
  assert.ok(events.some((e) => e.type === 'off' && e.machineId === 'b-bridge'));
  assert.ok(events.some((e) => e.type === 'bell'));
  // Once it is off, its pole brings it back (held again on the bell).
  tt.update(700);
  assert.equal(tt.punch('b-n4').result, 'queued');
  tt.update(tt.msToBell());
  assert.equal(tt.machineStatus('b-bridge').held, true);
});

test('R4-1: a cut just before a bell holds through it, to the bell after, and says that', () => {
  const tt = cityTimetable();
  tt.update(BELL_MS - 1000);
  const cut = tt.punch('b-n4');
  assert.equal(cut.bells, 2);
  assert.ok(cut.remaining >= CUT_GRACE_MS && Math.abs(cut.remaining - (1000 + BELL_MS)) < 1);
  assert.match(HINTS.cutDone(2), /UNTIL THE BELL AFTER NEXT · CROSS NOW/);
  tt.update(1100);
  assert.equal(tt.machineStatus('b-bridge').powered, true, 'the near bell does not take it');
  assert.equal(tt.punchPreview('b-n4').bells, 1);
});

test('R4-1: whenever it is cut, crossing from its pole fits before it goes', () => {
  const pole = nodeById('b-n4');
  const farRoof = platformById('b-roof10');
  const cross = (farRoof.x + 40 - pole.x) / RUN + 250; // + acceleration and reaction
  assert.ok(cross < CUT_GRACE_MS, `crossing ${Math.round(cross)} ms`);
  for (let phase = AFTER; phase < BELL_MS; phase += 137) {
    const tt = cityTimetable();
    tt.update(phase);
    const { remaining } = tt.punch('b-n4');
    assert.ok(remaining >= cross, `cut at ${phase} ms leaves ${Math.round(remaining)} ms`);
  }
});

test('R4-1: one wording for the held line, naming the tag; the room starts over held', () => {
  const bridge = machineById('b-bridge');
  assert.equal(HINTS.busyHeld(bridge.holdName, bridge.holdTag), 'LINE HOLDING THE BRIDGE\nCUT THE TEAL TAG WHERE THE BRIDGE STARTS');
  assert.equal(nodeById(bridge.heldBy).line, 'teal');
  assert.doesNotMatch(scene, /CUT ITS LIT TAG|PUNCH ITS LIT TAG/);
  assert.doesNotMatch(read('src/chapters/borrowedLight/story.js'), /CUT ITS LIT TAG'|PUNCH ITS LIT TAG/);
  assert.match(scene, /case 'busy': label = this\.tt\.machineStatus\(pre\.holder\)\?\.held \? this\.heldHint\(pre\.holder\)/);
  assert.match(scene, /case 'cutting': label = HINTS\.cutDone\(pre\.bells\)/);
  // A countdown runs on the cut bridge.
  assert.match(scene, /drawCutCountdowns\(\) \{/);
  assert.match(scene, /this\.cutTotals\.set\(node\.machine, res\.remaining\)/);
  // A fall back to the lamp before the cut holds the bridge again.
  assert.deepEqual([...REHOLD_ON_RESPAWN['lamp-b2']], ['b-bridge']);
  assert.match(scene, /REHOLD_ON_RESPAWN\[lamp\.id\]/);
});

test('R4-1: the intended solve reads: cut, run across before the bell, punch the hotel lift', () => {
  const tt = cityTimetable();
  tt.update(AFTER + 400);
  assert.equal(tt.punch('b-n5').result, 'busy');
  const cut = tt.punch('b-n4');
  assert.equal(cut.result, 'cut');
  // Run from the pole across the bridge and on to the hotel lift's pole.
  tt.update((nodeById('b-n5').x - nodeById('b-n4').x) / RUN + 200);
  assert.ok(['queued', 'caught'].includes(tt.punch('b-n5').result));
  tt.update(tt.msToBell() + 1600);
  assert.equal(tt.machineStatus('b-hotel-lift').level, 1);
});

// ---------------------------------------------------------------------------
// 2 · A8: every "from here" spot is in reach.

test('R4-2: every "from here" hint spot stands on its machine and has its pole in reach', () => {
  for (const spot of FROM_HERE) {
    const machine = machineById(spot.on);
    const top = machineBounds(machine, 1).y;
    assert.ok(standsOn(machine, 1, spot.x, top), `${spot.id} is on ${spot.on}`);
    // A body's width either side of the mark, the pole is still in reach.
    for (const dx of [-20, 0, 20]) {
      const pick = pickTarget({ chest: chestAt(spot.x + dx, top), nodes: [nodeById(spot.node)] });
      assert.equal(pick?.node.id, spot.node, `${spot.id} ${dx}`);
    }
  }
  // The scene puts the tag (and its mark) over that spot, and says "step
  // back" when Butch is on the cradle beyond reach.
  assert.match(scene, /const spot = FROM_HERE\[0\];/);
  assert.match(scene, /onCradle && !inReach \? HINTS\.fromCradleBack : HINTS\.fromCradle/);
});

// ---------------------------------------------------------------------------
// 3 · Walking and jumping taught before the first jump.

test('R4-3: A/D and SPACE are taught on the terminal roof, before any jump is needed', () => {
  assert.equal(HINTS.walk, 'A D  ·  ← →  WALK');
  assert.match(HINTS.jumpFirst, /^SPACE · JUMP/);
  const teach = scene.slice(scene.indexOf('  teachPrompt() {'), scene.indexOf('  updatePrompts() {'));
  assert.match(teach, /if \(!this\.flags\.walked\) return \{ follow: true, text: HINTS\.walk \}/);
  assert.match(teach, /if \(!this\.flags\.jumped && grounded\) return \{ follow: true, text: HINTS\.jumpFirst \}/);
  // The terminal roof has no gap that needs a jump: the first one is the AC unit.
  const terminal = platformById('a-terminal');
  assert.ok(terminal.x + terminal.w <= machineById('a-bridge1').x + 1);
});

// ---------------------------------------------------------------------------
// 4 · Idle hints.

test('R4-4: idle hints come in tiers on the wall clock and restart on progress', () => {
  const idle = createIdleHints();
  assert.deepEqual(idle.update(1000), [], 'no room yet');
  idle.setKey('B:b-cut:');
  const seen = [];
  for (let t = 0; t < 125000; t += 100) for (const tier of idle.update(100)) seen.push([tier, t + 100]);
  const first = (tier) => seen.find(([name]) => name === tier)?.[1];
  assert.equal(first('pulse'), IDLE_TIERS.pulse);
  assert.equal(first('nudge'), IDLE_TIERS.nudge);
  assert.equal(first('full'), IDLE_TIERS.full);
  assert.ok(seen.filter(([name]) => name === 'pulse').length >= 5, 'the pulse repeats');
  // Not in control: the clock holds.
  const before = idle.idle;
  idle.update(5000, { active: false });
  assert.equal(idle.idle, before);
  // Progress restarts it.
  assert.equal(idle.setKey('B:b-cross:'), true);
  assert.equal(idle.idle, 0);
  assert.deepEqual(idle.request(), ['pulse', 'nudge']);
  assert.deepEqual(idle.request(), ['pulse', 'nudge', 'full'], 'a second SHOW ME adds the fuller line');
});

const ctxFor = (tt, x, y, extra = {}) => ({
  section: sectionAt(x), x, y, flags: { cardRead: false, letterRead: false, ...extra.flags }, carried: Boolean(tt.carried()),
  machine: (id) => tt.machineStatus(id), node: (id) => tt.nodeStatus(id), queued: (id) => tt.isQueued(id), given: (id) => Boolean(tt.nodeStatus(id)?.given),
});

test('R4-4: the hotel room\'s steps follow the cut, the crossing and the lift', () => {
  const tt = cityTimetable();
  tt.update(AFTER);
  const near = nodeById('b-n4').x + 30;
  const far = nodeById('b-n5').x - 40;
  assert.equal(roomStep(ctxFor(tt, near, 300)).step, 'b-cut');
  assert.deepEqual(roomStep(ctxFor(tt, near, 300)).nodes, ['b-n4']);
  assert.equal(roomStep(ctxFor(tt, far, 300)).step, 'b-cut-far', 'across on the held bridge: go back and cut');
  const k0 = progressKey(ctxFor(tt, near, 300), roomStep(ctxFor(tt, near, 300)));
  tt.punch('b-n4');
  assert.equal(roomStep(ctxFor(tt, near, 300)).step, 'b-cross');
  assert.notEqual(progressKey(ctxFor(tt, near, 300), roomStep(ctxFor(tt, near, 300))), k0, 'the cut is progress');
  assert.equal(roomStep(ctxFor(tt, far, 300)).step, 'b-lift');
  tt.punch('b-n5');
  assert.equal(roomStep(ctxFor(tt, far, 300)).step, 'b-ride');
  tt.update(tt.msToBell() + 800);
  assert.equal(roomStep(ctxFor(tt, near, 300)).step, 'b-rebridge', 'left behind: bring the bridge back');
});

test('R4-4: every room on the route has a step with words, and its nodes exist', () => {
  const tt = cityTimetable();
  let rooms = 0;
  for (const platform of PLATFORMS) {
    for (let x = platform.x + 10; x < platform.x + platform.w; x += 120) {
      for (const flags of [{}, { cardRead: true, letterRead: true }]) {
        const hint = roomStep(ctxFor(tt, x, platform.y, { flags }));
        assert.ok(hint, `${platform.id} @${x}`);
        assert.ok(IDLE_HINTS[hint.step], `${platform.id} @${x}: no words for ${hint.step}`);
        hint.nodes.forEach((id) => assert.ok(nodeById(id), `${hint.step} → ${id}`));
        rooms += 1;
      }
    }
  }
  assert.ok(rooms > 100);
  for (const [step, words] of Object.entries(IDLE_HINTS)) {
    assert.ok(words.nudge && words.full, step);
    assert.ok(words.nudge === words.nudge.toUpperCase(), `${step} nudge is a tag`);
    assert.ok(words.nudge.length <= 96, `${step} nudge fits one toast line`);
  }
  // A8 · after cradle 1 lowers, the hint is the last pole from the mark.
  const a8 = cityTimetable();
  a8.punch('a-n12');
  a8.update(a8.msToBell() + 500);
  assert.equal(roomStep(ctxFor(a8, 12200, 220)).step, 'a8-last');
});

test('R4-4: the scene runs the idle hints and the pause menu has SHOW ME', () => {
  assert.match(main, /extraActions: \[\{ label: 'SHOW ME', onSelect: \(\) => window\.dispatchEvent\(new CustomEvent\('nightfall:hint'\)\) \}\]/);
  assert.match(scene, /window\.addEventListener\('nightfall:hint', this\.onShowMe\)/);
  assert.match(scene, /this\.updateIdleHints\(dt\);/);
  assert.match(scene, /this\.hud\.toast\(words\.nudge, '#f2c27a', 6000\)/);
  assert.match(scene, /this\.hud\.say\(\{ speaker: 'BUTCH', text: words\.full \}, 7000\)/);
});

// ---------------------------------------------------------------------------
// 5 · Mid-chapter resume at the last lamp.

test('R4-5: the last lamp lit is saved as a resume point and read back on load', () => {
  const store = createSaveStore(memoryStorage(), { scratch: false });
  store.startNew(0);
  store.markCheckpoint('chapter-2-start');
  store.markResume(SECTION_CHECKPOINTS.A, { lamp: 'lamp-a5' });
  assert.equal(resolveResumeLamp({ resume: store.readResume('chapter-2-start'), section: 'A' }), 'lamp-a5');
  // Another section's lamp, or junk, is ignored.
  assert.equal(resolveResumeLamp({ resume: { lamp: 'lamp-b3' }, section: 'A' }), null);
  assert.equal(resolveResumeLamp({ resume: { lamp: 'nope' }, section: 'A' }), null);
  assert.equal(resolveResumeLamp({ resume: null, section: 'A' }), null);
  // Entering B moves the save on: the A resume point goes with it.
  store.markCheckpoint('chapter-2-midpoint');
  assert.equal(store.readResume('chapter-2-start'), null);
  store.markResume(SECTION_CHECKPOINTS.B, { lamp: 'lamp-b3' });
  assert.equal(resolveResumeLamp({ resume: store.readResume('chapter-2-midpoint'), section: 'B' }), 'lamp-b3');
  // The scene marks it when a lamp lights; the entry reads it only for this
  // page's checkpoint and when no QA parameter picks the start.
  assert.match(scene, /createSaveStore\(\)\.markResume\(SECTION_CHECKPOINTS\[this\.section\], \{ lamp: lamp\.id \}\);/);
  assert.match(main, /activeSave\?\.checkpointId === checkpoint\s*\?\s*resolveResumeLamp\(\{ resume: store\.readResume\(checkpoint\), section \}\)/);
  assert.match(main, /const lamp = devLamp \?\? resumeLamp;/);
});

test('R4-5: starting at a lamp sets up the world behind it', () => {
  // The chase plays from the lamp before it, never beside Butch after it.
  assert.ok(!lampStartState('lamp-a7').skipSightings.includes('chase'));
  assert.ok(lampStartState('lamp-a8').skipSightings.includes('chase'));
  assert.ok(lampStartState('lamp-a4').skipSightings.includes('one-roof-ahead'), 'she would stand beside him on roof 5');
  assert.ok(!lampStartState('lamp-a3').skipSightings.includes('one-roof-ahead'));
  assert.ok(lampStartState('lamp-a1').skipSightings.includes('first'));
  assert.deepEqual(lampStartState('lamp-a0').skipSightings, []);
  // The held bridge he has crossed was cut.
  assert.deepEqual(lampStartState('lamp-b2').released, []);
  assert.deepEqual(lampStartState('lamp-b3').released, ['b-bridge']);
  assert.equal(lampStartState('lamp-b3').windowGone, true);
  // The platform lamps of the machines behind him are lit.
  assert.deepEqual(lampStartState('lamp-c3').platformLamps, ['c-points', 'c-lift', 'c-weights']);
  assert.deepEqual(lampStartState('lamp-c0').platformLamps, []);
  for (const id of lampStartState('lamp-c3').platformLamps) assert.ok(DEPARTURE_CHAIN.includes(id) && PLATFORM_LAMPS.some((pl) => pl.lights === id));
  // First-use teaching is done after the start.
  assert.equal(lampStartState('lamp-a0').taught.walked, false);
  assert.equal(lampStartState('lamp-a1').taught.walked, true);
  for (const lamp of LAMPS) assert.ok(lampStartState(lamp.id), lamp.id);
  assert.match(scene, /const behind = lampStartState\(lamp\.id\);/);
});

// ---------------------------------------------------------------------------
// 6 · Frame-rate independence and LOW GRAPHICS.

test('R4-6: game time follows the wall clock down to ~8 fps', () => {
  assert.equal(frameDelta(16.7), 16.7);
  assert.equal(frameDelta(100), 100, '10 fps passes whole');
  assert.equal(frameDelta(117), 117, 'a 10 fps frame on a 60 Hz display');
  assert.equal(frameDelta(2500), MAX_FRAME_MS, 'a hitch is capped');
  assert.equal(frameDelta(-3), 0);
  // Phaser's smoothing (16.7 ms while unfocused / for 120 frames) is gone.
  const loop = { smoothStep: true, panicMax: 120, smoothDelta: () => 16.67 };
  installWallClock(loop);
  assert.equal(loop.panicMax, 0);
  assert.equal(loop.smoothDelta(100), 100);
  // A 12 fps run: 48 frames of 83 ms ring the 4 s bell once, on time.
  const tt = cityTimetable();
  let wall = 0;
  let bellAt = null;
  for (let i = 0; i < 60 && bellAt == null; i += 1) {
    const dt = loop.smoothDelta(83.3);
    wall += 83.3;
    // Physics steps at 60 Hz inside the frame (the scene's fixedStep).
    for (let step = 0; step < Math.round(dt / (1000 / 60)); step += 1) {
      if (tt.update(1000 / 60).some((e) => e.type === 'bell')) bellAt = wall;
    }
  }
  assert.ok(bellAt != null && Math.abs(bellAt - BELL_MS) <= 100, `bell at ${bellAt} ms of wall time`);
  assert.match(main, /installWallClock\(game\.loop, \{ maxMs: qaTimescale \? QA_MAX_FRAME_MS : MAX_FRAME_MS \}\)/);
  assert.match(scene, /this\.maxFrameMs = this\.qaTimescale \? QA_MAX_FRAME_MS : MAX_FRAME_MS;/);
});

test('R4-6: LOW GRAPHICS renders at 0.6× with the HUD layout kept, and thins the weather', () => {
  assert.match(scene, /export const VIEW_SCALE_LOW = 0\.6;/);
  assert.match(main, /width: Math\.round\(BORROWED_LIGHT_VIEW\.w \* viewScale\)/);
  assert.match(main, /antialiasGL: !lowGraphics/);
  assert.match(scene, /cam\.setOrigin\(0, 0\);/);
  assert.match(scene, /this\.cameras\.main\.setSize\(w, h\)\.setZoom\(s\);/);
  assert.doesNotMatch(scene, /\.worldView|\.centerOn\(/, 'the view is the scene\'s own 1920×1080 window');
  assert.match(scene, /w\.far\.setVisible\(!low\);/);
  assert.match(scene, /this\.bg\.clouds\.setVisible\(!low\);/);
  assert.match(scene, /if \(low !== this\.lowGraphics\) this\.applyQuality\(low\);/);
  assert.match(read('src/chapters/borrowedLight/art/worldArt.js'), /setScale\(1 \/ res\)/);
});

// ---------------------------------------------------------------------------
// 7 · P2 polish.

test('R4-7: no lamp, node pole or canopy column stands in front of a sign board', () => {
  const boards = SIGNS.filter((s) => !s.scroll && s.layer !== 'far').map((s) => ({ t: s.text, x0: s.x - s.w / 2, x1: s.x + s.w / 2, y0: s.y, y1: s.y + (s.layer === 'hotel' ? 110 : 60) }));
  const poles = [
    ...LAMPS.map((l) => ({ t: l.id, x0: l.x - 9, x1: l.x + 40, y0: l.y - 180, y1: l.y })),
    ...NODES.map((n) => ({ t: n.id, x0: n.x - 22, x1: n.x + 22, y0: n.y - 180, y1: n.y })),
    ...PLATFORM_LAMPS.map((p) => ({ t: `platform lamp ${p.x}`, x0: p.x - 16, x1: p.x + 16, y0: TRAIN.end.y - 238, y1: TRAIN.end.y })),
  ];
  for (const p of PLATFORMS.filter((q) => q.style === 'platform')) {
    for (let cx = p.x + 120; cx < p.x + p.w; cx += 300) poles.push({ t: `canopy column ${cx}`, x0: cx, x1: cx + 10, y0: p.y - 262, y1: p.y });
  }
  for (const b of boards) {
    for (const p of poles) assert.ok(!(p.x1 > b.x0 && p.x0 < b.x1 && p.y1 > b.y0 && p.y0 < b.y1), `${p.t} crosses ${b.t}`);
  }
});

test('R4-7: HUD — the NEXT chip and line tags clear the departure ring; it hides while boarding', () => {
  assert.match(hud, /const ring = countdown \? 30 : 0;/);
  assert.match(hud, /const chipX = CX \+ R \+ 30 \+ ring;/);
  assert.match(hud, /fillRoundedRect\(chipX, CY - 30, 56, 66, 8\)/);
  // Ring pips reach R + 26 + 6 from the centre; the chip starts beyond.
  assert.ok(40 + 30 + 30 > 40 + 26 + 6);
  assert.match(scene, /hidden: this\.boarded,/);
  assert.match(scene, /!snap\.countdown\(\)\.done && !this\.boarded \? snap\.countdown\(\) : null/);
  // A float hint never sits on the marked node's tag.
  assert.match(scene, /updateFloatHint\(dt\) \{/);
  assert.match(scene, /for \(const tag of \[this\.promptText, this\.teachText\]\)/);
});

test('R4-7: Mara stays a roof ahead and leaves as Butch comes near; he calls after her', () => {
  const chase = MARA_SIGHTINGS.find((s) => s.id === 'chase');
  const roof10 = platformById('a-roof10');
  assert.ok(chase.path[0][0] - roof10.x >= 300, 'she waits deep on her roof, not at its edge');
  assert.equal(chase.call.speaker, 'BUTCH');
  assert.match(scene, /export const MARA_FLEE_PX = 420;/);
  assert.match(scene, /Math\.abs\(m\.x - this\.feetX\) < MARA_FLEE_PX/);
  // Fleeing from the waiting spot, she is off her roof before Butch, landing
  // from cradle 3 at a full run, can reach her.
  const flee = (chase.path[1][0] - chase.path[0][0]) / (chase.speed * 2.2) + 700;
  const butch = (chase.path[0][0] - 420 - (machineById('a-cradle3').x + machineById('a-cradle3').w)) / RUN;
  assert.ok(flee < 1600 && butch >= 0, `${Math.round(flee)} ms`);
});

test('R4-7: story — the mechanic agrees with the 2-3 film', () => {
  assert.ok(MECHANIC_LINES.some((l) => l.text.startsWith('She came through last night.')));
  assert.ok(!MECHANIC_LINES.some((l) => /three nights/.test(l.text)));
});

test('R4-7: a resumed section title is short and steps aside once Butch moves', () => {
  assert.match(scene, /const titleHold = lamp\.id === SECTIONS\[section\]\.spawn \? 2600 : 1400;/);
  assert.match(scene, /Math\.abs\(this\.feetX - this\.startFeetX\) > 160\) \{\n\s+this\.hud\.clearTitle\(\);/);
});

// ---------------------------------------------------------------------------
// 8 · Audio.

test('R4-8: the score is the chapter\'s own file and starts on arrival through the music director', () => {
  assert.equal(SECTION_MUSIC.A.src, 'assets/music/ch2/2.1_borrowed_light.mp3');
  assert.ok(existsSync(new URL(`../../public/${SECTION_MUSIC.A.src}`, import.meta.url)));
  assert.ok(existsSync(new URL(`../../public/${SECTION_MUSIC.C.src}`, import.meta.url)));
  assert.ok(!existsSync(new URL('../../public/assets/music/ch1/1.3_neon_safety_test.mp3', import.meta.url)));
  assert.equal(SECTION_MUSIC.B, null, 'the blackout is rain only');
  for (const file of ['src/chapters/borrowedLight/BorrowedLightScene.js', 'src/borrowedLight-main.js', 'src/shell/chapterPreloader.js']) {
    assert.doesNotMatch(read(file), /neon_safety_test/, file);
  }
  assert.match(read('src/shell/chapterPreloader.js'), /\/assets\/music\/ch2\/2\.1_borrowed_light\.mp3/);
  assert.match(read('public/assets/music/ch2/ASSET_MANIFEST.md'), /2\.1_borrowed_light\.mp3/);
  // The entry asks for the section's score before the scene builds.
  assert.match(main, /playSectionMusic\(section\);/);
  assert.match(scene, /music\.play\(id, \{ \.\.\.options, \.\.\.overrides \}\)/);
  assert.equal(SECTIONS.A.spawn, 'lamp-a0');
  assert.ok(lampById('lamp-a0'));
  assert.ok(HOTEL_WINDOW.x > 0);
});
