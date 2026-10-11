// Round 12 (2026-10-10), George's notes on how Chapter 3 plays:
//   1. "第三章不要awsd的控制 就是只要一个point and click": no WASD, point and click.
//   2. "走的速度太快了": Butch walks too fast.
//   3. "一开始是应该那个人走到前面必须聊天的": at the start Lev walks up in front
//      of Butch and they must talk.
//   4. "为什么不能alt高亮交互object了": hold Alt to highlight what can be used.
//   5. "有时候我不在那个位置跟人说话它就不会正对着我": people turn to face him.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

import {
  ALIGHTING, ALIGHTING_SECONDS, ARRIVAL_ANNOUNCEMENT, ARRIVAL_CARD_AWAY, ARRIVAL_CARD_OUT, ARRIVAL_CONVERSATION,
  arrivalTalkDue,
} from '../../src/cars/presentCity3d/chapter3Alighting.js';
import {
  CONVERSATION_TURN, LEV_ENTRANCE, approachSpeed, besideTarget, conversationYaws, gaitForSpeed, turnToward, wrapAngle,
} from '../../src/cars/presentCity3d/chapter3Entrance.js';
import {
  CONTROLS_HINT_SEGMENTS, IDLE_LOOK_HINT_HTML, autoTaggedInteractions, createRevealHold, revealKeyOf,
} from '../../src/cars/presentCity3d/chapter3Guidance.js';
import { JOG_GAIT_SPEED, STRIDE_MULTIPLIER, gaitFor, pacedSpeed } from '../../src/cars/presentCity3d/chapter3LongWalks.js';
import { ARRIVAL_DIALOGUE, CHAPTER3_OBJECTIVES, LEV_INTRO_DIALOGUE, OPENING_POSITIONS, SCANNER_WORDS } from '../../src/cars/presentCity3d/chapter3OpeningContent.js';
import { RUN_MULTIPLIER, WALK_SPEED, isWalkable } from '../../src/cars/presentCity3d/EchoCity3DPreview.js';
import { CAMERA_HOME, STATION_LAYOUT } from '../../src/cars/presentCity3d/city3dConfig.js';
import { CHAPTER_CONTROLS, CONTROL_SETS } from '../../src/shell/chapterControls.js';
import { keysHtml } from '../../src/shell/controlsView.js';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const runtime = read('src/cars/presentCity3d/Chapter3OpeningRuntime.js');
const preview = read('src/cars/presentCity3d/EchoCity3DPreview.js');
const caption = read('src/cars/presentCity3d/Chapter3Caption.js');
const characters = read('src/cars/presentCity3d/Chapter3AnimatedCharacters.js');
const main = read('src/car03-3d-main.js');
const method = (name) => runtime.match(new RegExp(`\\n  ${name}\\([^)]*\\) \\{([\\s\\S]*?)\\n  \\}\\n`))?.[1] ?? '';

// The rig's clip paces (Chapter3AnimatedCharacters LOCOMOTION_REFERENCE_SPEEDS)
// and its playback clamp: a walker whose rate stays inside the clamp has feet
// that match the ground.
const CLIP_PACE = { walk: 1.75, jog: 3.4 };
const playback = (speed, gait) => speed / CLIP_PACE[gait];
const cameraRight = (() => {
  const fx = CAMERA_HOME.target[0] - CAMERA_HOME.position[0];
  const fz = CAMERA_HOME.target[2] - CAMERA_HOME.position[2];
  const length = Math.hypot(fx, fz);
  return { x: -fz / length, z: fx / length };
})();
const STATION_BLOCK = [{ type: 'oriented-box', center: STATION_LAYOUT.center, size: [5.4, 7.0], rotationY: STATION_LAYOUT.modelRotationY, padding: 0.18 }];

describe('Chapter 3 round 12 · point and click only (note 1)', () => {
  it('has no key that walks Butch: no WASD, no arrows, no Shift run, no held E', () => {
    assert.doesNotMatch(runtime, /'Key[WASD]'|'Arrow(?:Up|Down|Left|Right)'/);
    assert.doesNotMatch(runtime, /keysHeld|keyWalking|updateKeyWalk|movementIntent|walkInStepHeld|pointerHeld|DIRECT_WALK_SPEED/);
    assert.doesNotMatch(preview, /shiftHeld|event\.key === 'Shift'/);
    // E / Enter remain the quiet alias for the nearest tag and CONTINUE.
    assert.match(method('handleKeyDown'), /if \(event\.code === 'KeyE' \|\| event\.key === 'Enter'\) \{/);
  });

  it('walks by click everywhere, scanner fields included, and walks in step with a click on the walker', () => {
    const pointerUp = method('handlePointerUp');
    assert.doesNotMatch(pointerUp, /if \(!interaction && this\.activeField\(\)\) return true;/, 'a click in a field used to do nothing');
    assert.match(pointerUp, /if \(pacing && this\.fieldState\(pacing\.id\)\.matched\) \{\n\s+this\.inStepClick\(pacing\.id, event\);/);
    // the lit walker is clickable from anywhere (not only from afar)
    for (const id of ['olek-walker', 'mara-walker']) {
      const spec = runtime.slice(runtime.indexOf(`id: '${id}'`), runtime.indexOf('activate:', runtime.indexOf(`id: '${id}'`)));
      assert.doesNotMatch(spec, /logic\.eligible\(this\.preview\.player\.position\)/, id);
      assert.match(spec, /verb: SCANNER_WORDS\.matchPrompt/, id);
    }
    // a match keeps the pair in step until the arch (or a click behind)
    assert.match(method('tryMatch'), /this\.inStepField = id;/);
    assert.match(method('updateScannerFields'), /const hold = this\.inStepField === id && logic\.snapshot\(\)\.matched;/);
    assert.match(method('inStepClick'), /if \(along < -0\.8\) \{/);
    // the arch's beam stops a lone walker, unless he walks back out
    assert.match(method('updateScannerFields'), /if \(!backOut\) this\.preview\.stopWalking\(\);/);
  });

  it('names clicks, not keys, for walking on every card and hint', () => {
    const streets = CONTROL_SETS.chapter3;
    const rows = [...CHAPTER_CONTROLS.echoCity.filter(([action]) => !/BOARD/.test(action)), ...streets.basics,
      ...streets.stages.city.rows, ...streets.stages.scanner.rows, ...streets.stages.clamp.rows, ...streets.entry.rows];
    for (const [action, keys] of rows) assert.doesNotMatch(keys, /WASD|ARROWS|SHIFT|HOLD E\b/, `${action} · ${keys}`);
    assert.equal(Object.fromEntries(CHAPTER_CONTROLS.echoCity).WALK, 'CLICK THE GROUND');
    assert.equal(Object.fromEntries(CHAPTER_CONTROLS.echoCity)['WALK IN STEP (SCANNERS)'], 'CLICK A LIT WALKER');
    for (const { html } of CONTROLS_HINT_SEGMENTS) assert.doesNotMatch(html, /WASD|ARROW/);
    for (const words of Object.values(SCANNER_WORDS)) assert.doesNotMatch(words, /HOLD <kbd>E|WASD/);
    assert.doesNotMatch(runtime, /W A S D|WASD TO WALK/);
    // the entry card waits for the end of the arrival's conversation
    assert.match(main, /gameplayRuntime\.onArrivalControl = \(\) => scheduleChapterControlsCard\('chapter3', 900\);/);
  });
});

describe('Chapter 3 round 12 · a natural walk (note 2)', () => {
  it('walks Butch at about the walk clip\'s own pace and jogs a double-click modestly', () => {
    // was 5.4 m/s: the walk clip at 3.1x
    assert.ok(WALK_SPEED >= 1.6 && WALK_SPEED <= 2.1, `${WALK_SPEED} m/s`);
    const walkRate = playback(WALK_SPEED, gaitFor(WALK_SPEED));
    assert.ok(walkRate > 0.95 && walkRate < 1.2, `walk clip at ${walkRate.toFixed(2)}x`);
    const run = pacedSpeed({ walkSpeed: WALK_SPEED, runMultiplier: RUN_MULTIPLIER, running: true });
    assert.equal(gaitFor(run), 'jog');
    const runRate = playback(run, 'jog');
    assert.ok(runRate > 0.85 && runRate < 1.1, `jog clip at ${runRate.toFixed(2)}x (was 9.7 m/s)`);
    assert.equal(STRIDE_MULTIPLIER, 1, 'a far click walks too');
    assert.ok(WALK_SPEED < JOG_GAIT_SPEED && run > JOG_GAIT_SPEED);
    // the rig still follows its ground speed (no fixed-rate clips)
    assert.match(characters, /this\.playbackRate = THREE\.MathUtils\.clamp\(this\.smoothedSpeed \/ referenceSpeed, 0\.38, 3\.4\);/);
  });

  it('walks the people who walk with him at his pace, each clip at its own cadence', () => {
    assert.equal(LEV_ENTRANCE.guideSpeed, WALK_SPEED, 'Lev\'s walk to the oil line');
    const walkers = {
      'Lev walks over': LEV_ENTRANCE.walkSpeed,
      'Lev to the oil line': LEV_ENTRANCE.guideSpeed,
      'Lev follows (slowest)': WALK_SPEED * 1.02,
      'Lev follows (fastest)': WALK_SPEED * 1.1,
      'Lev closes a gap': LEV_ENTRANCE.jogSpeed,
      'Butch steps off the train': ALIGHTING.walkSpeed,
    };
    for (const [label, speed] of Object.entries(walkers)) {
      const rate = playback(speed, gaitForSpeed(speed));
      assert.ok(rate > 0.85 && rate < 1.25, `${label}: ${speed.toFixed(2)} m/s, clip at ${rate.toFixed(2)}x`);
    }
    assert.match(method('updateMorningLevFollow'), /const naturalSpeed = WALK_SPEED \* \(1\.02 \+ 0\.08 \*/);
    assert.match(method('updateMorningLevFollow'), /const speed = distance > 4\.2 \? LEV_ENTRANCE\.jogSpeed : naturalSpeed;/);
    assert.doesNotMatch(runtime, /distance > 4\.2 \? 10\.5/);
    assert.match(method('updateHotelLevFollow'), /dt \* WALK_SPEED \* 1\.05/);
    // his eased scripted walks (to the station's watch spot, out of the hotel) never outpace his walk
    assert.match(method('moveLevTo'), /Math\.max\(duration, \(1\.5 \* metres\) \/ LEV_ENTRANCE\.walkSpeed\)/);
    // the step down still takes about four seconds
    assert.ok(ALIGHTING_SECONDS > 3.5 && ALIGHTING_SECONDS < 5, `${ALIGHTING_SECONDS.toFixed(2)} s`);
  });
});

describe('Chapter 3 round 12 · Lev walks up and they talk (note 3)', () => {
  it('plays the announcement over the step down, then one conversation in the script\'s order', () => {
    assert.deepEqual(ARRIVAL_ANNOUNCEMENT, ARRIVAL_DIALOGUE.slice(0, 1));
    assert.deepEqual(ARRIVAL_CONVERSATION, [...ARRIVAL_DIALOGUE.slice(1), ...LEV_INTRO_DIALOGUE]);
    assert.equal(ARRIVAL_CONVERSATION[0].speaker, 'CONDUCTOR', 'the call-back as the train leaves');
    assert.equal(ARRIVAL_CONVERSATION[ARRIVAL_CARD_OUT].speaker, 'BUTCH');
    assert.match(ARRIVAL_CONVERSATION[ARRIVAL_CARD_OUT].text, /claim card/);
    assert.equal(ARRIVAL_CONVERSATION[ARRIVAL_CARD_AWAY].text, 'Why?', 'the card goes once Lev has asked him to keep it out');
    assert.equal(ARRIVAL_CONVERSATION[ARRIVAL_CARD_AWAY - 1].text, 'Keep that card out.');
  });

  it('opens it only when Butch is down, the announcement is over and Lev stands in front of him', () => {
    const ready = { landed: true, announcementDone: true, levArrived: true };
    assert.equal(arrivalTalkDue(ready), true);
    assert.equal(arrivalTalkDue({ ...ready, landed: false }), false);
    assert.equal(arrivalTalkDue({ ...ready, announcementDone: false }), false);
    assert.equal(arrivalTalkDue({ ...ready, levArrived: false }), false);
    assert.equal(arrivalTalkDue({ ...ready, opened: true }), false, 'once');
    assert.equal(arrivalTalkDue({ ...ready, busy: true }), false);
  });

  it('stands Lev face to face with Butch, side on to the camera, a short walk from where he waits', () => {
    const butch = { x: OPENING_POSITIONS.playerStart[0], z: OPENING_POSITIONS.playerStart[2] };
    const lev = { x: OPENING_POSITIONS.levStart[0], z: OPENING_POSITIONS.levStart[2] };
    const spot = besideTarget(butch, lev, cameraRight, { standOff: LEV_ENTRANCE.faceToFace, walkable: (x, z) => isWalkable(x, z, STATION_BLOCK) });
    const apart = Math.hypot(spot.x - butch.x, spot.z - butch.z);
    assert.ok(Math.abs(apart - LEV_ENTRANCE.faceToFace) < 1e-9);
    assert.ok(apart > 1.1 && apart < 1.8, 'close enough to talk, clear of each other');
    assert.equal(isWalkable(spot.x, spot.z, STATION_BLOCK), true);
    // he walks it at a walk, in a few seconds, and settles into the stop
    let speed = 0;
    let left = Math.hypot(spot.x - lev.x, spot.z - lev.z);
    let time = 0;
    while (left > 0.04 && time < 20) {
      speed = approachSpeed(speed, left, { cruise: LEV_ENTRANCE.walkSpeed, accel: LEV_ENTRANCE.accel, decel: LEV_ENTRANCE.decel, dt: 1 / 60 });
      left -= speed * (1 / 60);
      time += 1 / 60;
    }
    assert.ok(time > 2 && time < LEV_ENTRANCE.meetWithin, `${time.toFixed(1)} s`);
    // facing each other: opposite headings
    const yaws = conversationYaws({ butch, npcs: [spot], faceOf: spot });
    assert.ok(Math.abs(Math.abs(wrapAngle(yaws.butch - yaws.npcs[0])) - Math.PI) < 1e-9);
  });

  it('holds Butch on the paving from the step down to the end of the conversation', () => {
    assert.match(method('interactionLocked'), /\|\| this\.arrivalHold\n/);
    assert.match(method('beginArrival'), /this\.arrivalHold = true;/);
    assert.match(method('beginArrival'), /this\.openingLines = createLineQueue\(ARRIVAL_ANNOUNCEMENT\.map\(/);
    assert.match(method('updateAlighting'), /this\.beginLevArrivalApproach\(\);/);
    const entrance = method('updateLevEntrance');
    assert.match(entrance, /standOff: LEV_ENTRANCE\.faceToFace,/);
    assert.match(entrance, /if \(!settled && walker\.elapsed < LEV_ENTRANCE\.meetWithin\) return;/, 'a blocked walk never holds the opening');
    assert.match(entrance, /this\.levArrived = true;\n\s+\/\/ Face to face[^\n]*\n\s+this\.faceEachOther\(this\.preview\.player, this\.lev\);/);
    // a blocking conversation (CONTINUE · E / click), not barks
    assert.match(method('openArrivalConversation'), /this\.showLines\(ARRIVAL_CONVERSATION, \{/);
    assert.doesNotMatch(runtime, /levTalk|levApproachPending/);
    const finish = method('finishLevIntroduction');
    assert.match(finish, /this\.arrivalHold = false;/);
    assert.match(finish, /this\.onArrivalControl\?\.\(\);/);
    // the task card names him as soon as Butch is down
    assert.match(runtime, /if \(state\.trainDeparted \|\| state\.arrivalRead\) return OBJECTIVES\.meetLev;/);
    assert.equal(CHAPTER3_OBJECTIVES.meetLev, 'MEET THE MAN ON THE PLATFORM');
  });
});

describe('Chapter 3 round 12 · hold Alt to see what can be used (note 4)', () => {
  const key = (k, extra = {}) => ({ key: k, code: k === 'Alt' ? 'AltLeft' : k, altKey: k === 'Alt', repeat: false, ...extra });

  it('holds while ⌥ Option / Alt (either side) or Tab is down, and clears on release', () => {
    assert.equal(revealKeyOf({ key: 'Alt', code: 'AltLeft' }), 'Alt');
    assert.equal(revealKeyOf({ key: 'Alt', code: 'AltRight' }), 'Alt');
    assert.equal(revealKeyOf({ key: 'Tab', code: 'Tab' }), 'Tab');
    assert.equal(revealKeyOf({ key: 'e', code: 'KeyE' }), null);
    const hold = createRevealHold();
    assert.equal(hold.held, false);
    assert.equal(hold.keyDown(key('Alt')), true, 'handled (the default is prevented)');
    assert.equal(hold.held, true);
    assert.equal(hold.keyDown(key('Alt', { repeat: true })), true);
    assert.equal(hold.keyUp({ key: 'Alt', code: 'AltLeft', altKey: false }), true);
    assert.equal(hold.held, false);
    hold.keyDown({ key: 'Alt', code: 'AltRight', altKey: true });
    assert.equal(hold.held, true);
    hold.keyUp({ key: 'Alt', code: 'AltRight', altKey: false });
    assert.equal(hold.held, false);
    hold.keyDown(key('Tab'));
    assert.equal(hold.held, true);
    hold.keyDown(key('Alt'));
    hold.keyUp({ key: 'Alt', code: 'AltLeft', altKey: false });
    assert.equal(hold.held, true, 'Tab is still down');
    hold.keyUp(key('Tab'));
    assert.equal(hold.held, false);
  });

  it('keeps the hold through ⌥ combinations (Safari on a Mac types dead keys) and honours every pointer event', () => {
    const hold = createRevealHold();
    hold.keyDown(key('Alt'));
    // ⌥E is a dead key, ⌥1 types "¡": still Alt held
    assert.equal(hold.keyDown({ key: 'Dead', code: 'KeyE', altKey: true }), false);
    assert.equal(hold.keyDown({ key: '¡', code: 'Digit1', altKey: true }), false);
    assert.equal(hold.held, true);
    // the keyup was lost (released over another app): the next move says Alt is up
    hold.sync({ altKey: false });
    assert.equal(hold.held, false);
    // pressed while the page had no focus (no keydown): the next move says it is down
    hold.sync({ altKey: true });
    assert.equal(hold.held, true);
    hold.sync({ altKey: false });
    assert.equal(hold.held, false);
    // a plain key event carries the modifier too
    hold.keyDown(key('Alt'));
    hold.keyDown({ key: 'e', code: 'KeyE', altKey: false });
    assert.equal(hold.held, false, 'E without Alt: Alt is up');
    // the window loses focus
    hold.keyDown(key('Tab'));
    hold.keyDown(key('Alt'));
    hold.clear();
    assert.equal(hold.held, false);
    assert.deepEqual(hold.keys, []);
  });

  it('is wired ahead of every other key, ends on blur and when hidden, and follows the pointer', () => {
    const down = method('handleKeyDown');
    assert.ok(down.indexOf('this.reveal.keyDown(event)') < down.indexOf('LEAD_KEY'), 'before any other key');
    assert.match(down, /if \(revealKey\) \{\n\s+event\.preventDefault\(\);/);
    assert.match(method('handleKeyUp'), /const revealKey = this\.reveal\.keyUp\(event\);/);
    assert.match(runtime, /window\.addEventListener\('blur', \(\) => this\.clearReveal\(\)\);/);
    assert.match(runtime, /document\.addEventListener\('visibilitychange', \(\) => \{ if \(document\.hidden\) this\.clearReveal\(\); \}\);/);
    assert.match(runtime, /window\.addEventListener\('pointermove', syncReveal, \{ passive: true \}\);/);
    // the dialogue's number keys read the key's position (⌥1 is "¡")
    assert.match(caption, /\/\^\(\?:Digit\|Numpad\)\(\[1-9\]\)\$\/\.test\(event\.code \?\? ''\)/);
  });

  it('lights and tags every interactable on screen, flavour objects and Lev included', () => {
    assert.match(method('updateOutlines'), /\.filter\(\(interaction\) => this\.revealHeld\n/);
    assert.match(method('updateTags'), /tabHeld: this\.revealHeld,/);
    const candidates = [
      { id: 'lamp-oil-seam', distance: 12 },
      { id: 'flavour-clock-tower', ambient: true, distance: 9 },
      { id: 'lev-morning-companion', follows: true, distance: 1 },
    ];
    assert.deepEqual([...autoTaggedInteractions({ candidates, radius: 4.2 }).shown], []);
    assert.deepEqual([...autoTaggedInteractions({ candidates, tabHeld: true, radius: 4.2 }).shown].sort(),
      ['flavour-clock-tower', 'lamp-oil-seam', 'lev-morning-companion']);
    assert.match(IDLE_LOOK_HINT_HTML, /HOLD <kbd>ALT ⌥<\/kbd>/);
    assert.match(keysHtml('HOLD ALT ⌥ · OR TAB'), /<kbd>ALT<\/kbd> <kbd>⌥<\/kbd>/);
    assert.equal(Object.fromEntries(CHAPTER_CONTROLS.echoCity)['SHOW WHAT MATTERS'], 'HOLD ALT ⌥ · OR TAB');
  });
});

describe('Chapter 3 round 12 · people turn to face him (note 5)', () => {
  it('turns the person to Butch from whichever side he stands, and Butch to them', () => {
    const npc = { x: 10, z: 10 };
    for (const [side, butch] of Object.entries({ east: { x: 12, z: 10 }, west: { x: 8, z: 10 }, north: { x: 10, z: 8 }, south: { x: 10, z: 12.5 } })) {
      const yaws = conversationYaws({ butch, npcs: [npc], faceOf: npc });
      // yaw convention: rotation.y = atan2(dx, dz), 0 faces +z
      const npcFaces = { x: Math.sin(yaws.npcs[0]), z: Math.cos(yaws.npcs[0]) };
      const toButch = { x: butch.x - npc.x, z: butch.z - npc.z };
      const cos = (npcFaces.x * toButch.x + npcFaces.z * toButch.z) / Math.hypot(toButch.x, toButch.z);
      assert.ok(cos > 0.9999, `${side}: the NPC faces Butch`);
      assert.ok(Math.abs(Math.abs(wrapAngle(yaws.butch - yaws.npcs[0])) - Math.PI) < 1e-9, `${side}: Butch faces the NPC`);
    }
    assert.equal(conversationYaws({ butch: { x: 0, z: 0 }, npcs: [] }).butch, null, 'no one to face: he keeps his heading');
  });

  it('turns at a turn rate, not a snap: a half turn takes about half a second to a second', () => {
    const frames = (rate, from = 0, to = Math.PI * 0.999) => {
      let yaw = from;
      let count = 0;
      while (Math.abs(wrapAngle(to - yaw)) > CONVERSATION_TURN.settle && count < 600) {
        const next = turnToward(yaw, to, rate, 1 / 60);
        assert.ok(Math.abs(wrapAngle(next - yaw)) <= rate / 60 + 1e-9, 'never faster than the rate');
        yaw = next;
        count += 1;
      }
      return count;
    };
    const npc = frames(CONVERSATION_TURN.npcRate);
    const butch = frames(CONVERSATION_TURN.butchRate);
    assert.ok(npc >= 30 && npc <= 75, `NPC half turn in ${npc} frames`);
    assert.ok(butch >= 20 && butch < npc, `Butch half turn in ${butch} frames`);
  });

  it('runs every conversation through it: the person clicked, whoever speaks, Lev too; posts are restored', () => {
    const activate = method('activateInteraction');
    assert.match(activate, /const yaws = conversationYaws\(\{ butch, npcs: hosts\.map\(\(\{ at \}\) => at\), faceOf: hosts\[0\]\?\.at \?\? null \}\);/);
    assert.match(activate, /this\.turnToFace\(host, null, \{ yaw: yaws\.npcs\[index\]/);
    assert.match(activate, /if \(yaws\.butch !== null\) this\.turnToFace\(this\.preview\.player, null, \{ yaw: yaws\.butch, rate: CONVERSATION_TURN\.butchRate \}\);/);
    assert.doesNotMatch(activate, /if \(!route\) continue;/, 'it used to skip anyone without an ambient route (Lev)');
    assert.match(method('npcIdsForInteraction'), /'lev-morning-companion': \['lev'\]/);
    // every line's speaker within reach turns to him (and he to them)
    assert.match(method('frameSpeaker'), /this\.faceSpeaker\(line, focus\);\n\s+if \(this\.insideHotel \|\| this\.insideMinistry\) return;/);
    // (on the oil line or the fire letters he looks at them instead)
    assert.match(method('faceSpeaker'), /if \(!this\.directMoving && !this\.preview\.path\.length\) this\.turnToFace\(this\.preview\.player, focus \?\? at,/);
    assert.match(method('faceSpeaker'), /this\.activeNpcConversationIds\.add\(routeId\);/, 'a speaker on a route stands still');
    // Toma, Petar and Hana turn back to their posts afterwards
    assert.match(method('updateConversationPosts'), /for \(const \[host, yaw\] of this\.postTurns\) this\.turnToFace\(host, null, \{ yaw,/);
    assert.match(runtime, /toma: \{ points: \[\[0, 0\]\], actions: \['idle', 'investigate'\], fixed: true \}/);
    // eased turns, cancelled by the walker's own walk
    const turns = method('updateFaceTurns');
    assert.match(turns, /host\.rotation\.y = turnToward\(host\.rotation\.y, turn\.yaw, turn\.rate, dt\);/);
    assert.match(turns, /if \(moved \|\| \(host === this\.preview\.player && this\.preview\.path\.length\)\) \{/);
    // Olek stops to talk after the crossing; Lev stands at Eda's stall facing Butch
    assert.match(method('updateOlekCartLife'), /if \(this\.dialogue\.active && \(this\.olekExitElapsed \?\? 0\) < 9\) \{/);
    assert.match(method('openEda'), /this\.lev\.rotation\.y = yawToward\(levEda, this\.preview\.player\.position\);/);
    assert.doesNotMatch(method('openEda'), /moveLevTo\(OPENING_POSITIONS\.levEda, 0\.01\)/);
  });
});
