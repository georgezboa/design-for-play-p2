// Alpha round 3 follow-ups (2026-10-01), engineer L1: Echo City.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { describe, it } from 'node:test';

import {
  COMPASS_ARRIVED_METRES,
  COMPASS_FLASH_SECONDS,
  capHintClock,
  compassPlacement,
  compassVisible,
  createHintClock,
  hintClockElapsed,
  holdHintClock,
  tickHintClock,
} from '../../src/cars/presentCity3d/chapter3Guidance.js';
import { BOARDED_DIALOGUE, CHAPTER3_OBJECTIVES, hanaTopicMenu } from '../../src/cars/presentCity3d/chapter3OpeningContent.js';
import { HOTEL_POSITIONS } from '../../src/cars/presentCity3d/Chapter3HotelHall.js';
import { HOTEL_ROOM_WALK_BOUNDS, hotelFurnitureAt } from '../../src/cars/presentCity3d/chapter3HotelNavigation.js';
import { lensInkMask, lensPresentMask } from '../../src/cars/presentCity3d/Chapter3TicketBoard.js';

const read = (path) => fs.readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const runtime = read('src/cars/presentCity3d/Chapter3OpeningRuntime.js');
const builders = read('src/cars/presentCity3d/chapter3SceneBuilders.js');
const board = read('src/cars/presentCity3d/Chapter3TicketBoard.js');
const css = read('src/cars/presentCity3d/chapter3Release.css');

const VIEW = { width: 1600, height: 900, tagWidth: 300, tagHeight: 30 };

describe('Chapter 3 alpha round 3 (L1)', () => {
  it('R2 P1: the compass shows on Tab or a fresh task, never on arrival or over the target\'s own tag', () => {
    const base = { hasTarget: true, distance: 40 };
    assert.equal(compassVisible(base), false, 'quiet by default');
    assert.equal(compassVisible({ ...base, tabHeld: true }), true);
    assert.equal(compassVisible({ ...base, flashRemaining: 1 }), true, 'after a task change');
    assert.equal(compassVisible({ ...base, tabHeld: true, locked: true }), false, 'never during a line');
    assert.equal(compassVisible({ ...base, tabHeld: true, hasTarget: false }), false, 'not a walk');
    assert.equal(compassVisible({ ...base, tabHeld: true, distance: COMPASS_ARRIVED_METRES }), false, 'arrived');
    assert.equal(compassVisible({ ...base, tabHeld: true, targetTagShown: true }), false, 'its tag names it');
    assert.ok(COMPASS_FLASH_SECONDS >= 3 && COMPASS_FLASH_SECONDS <= 5);
  });

  it('R2 P1: an off-screen target pins the tag to the screen edge, arrow toward it', () => {
    const right = compassPlacement({ x: 2600, y: 470 }, VIEW);
    assert.equal(right.offScreen, true);
    assert.equal(right.x, 1600 - 24 - 150, 'clamped inside the right inset by half the tag');
    assert.ok(Math.abs(right.angle) <= 3, `points right (${right.angle})`);
    const below = compassPlacement({ x: 800, y: 5000 }, VIEW);
    assert.equal(below.y, 900 - 72 - 15);
    assert.ok(Math.abs(below.angle - 90) <= 3, 'points down');
    const upLeft = compassPlacement({ x: -900, y: -900 }, VIEW);
    assert.ok(upLeft.angle < -90 && upLeft.angle > -180, `points up-left (${upLeft.angle})`);
    assert.ok(upLeft.y >= 92 + 15, 'stays below the task card');
    assert.ok(upLeft.x >= 24 + 150);
    // On screen it hangs over the target, pointing down at it.
    const near = compassPlacement({ x: 700, y: 500 }, VIEW);
    assert.deepEqual([near.offScreen, near.x, near.angle], [false, 700, 90]);
    assert.ok(near.y < 500);
  });

  it('R2 P1: every outdoor walk objective has a compass target with a told name', () => {
    const block = runtime.match(/compassTarget\(\) \{([\s\S]*?)\n  \}\n/)?.[1] ?? '';
    for (const label of [
      'THE OIL LINE', 'TOMA · THE MINISTRY DOOR', 'EDA · LAMP OIL', 'OLEK · THE MARKET SCANNER',
      'THE SERVICE JOINT · BY THE CLOCK', 'THE COPPER HERON', 'THE FIRE · THE SQUARE',
      'THE NIGHT SERVICE · THE PLATFORM', 'THE WOMAN IN THE ROSE SCARF',
    ]) assert.ok(block.includes(`'${label}'`), label);
    // The walk objectives these stand for.
    for (const key of ['oilLine', 'ministry', 'eda', 'marketScanner', 'serviceJoint', 'copperHeron', 'followFire', 'platform', 'stationScanner']) {
      assert.ok(CHAPTER3_OBJECTIVES[key], key);
    }
    assert.match(runtime, /this\.compassFlashPending = true;/, 'a new task starts the flash');
    assert.match(runtime, /this\.updateCompass\(locked, shown\);/);
    assert.match(css, /\.c3-compass \{/);
  });

  it('R2 P1: Lev\'s direction hint counts wall seconds, so 1 fps does not stretch it', () => {
    // A 1 fps machine: each frame is a quarter second of game time
    // (MAX_FRAME_SECONDS) but a full second of wall time.
    let clock = createHintClock();
    let now = 0;
    tickHintClock(clock, 0, now);
    for (let frame = 0; frame < 45; frame += 1) {
      now += 1000;
      tickHintClock(clock, 0.25, now);
    }
    assert.equal(hintClockElapsed(clock), 45, '45 wall seconds, not 11');
    // QA's advanceTime: game time with no wall time.
    clock = createHintClock();
    for (let step = 0; step < 60 * 45; step += 1) tickHintClock(clock, 1 / 60, 5);
    assert.ok(Math.abs(hintClockElapsed(clock) - 45) < 1e-6);
    // A held clock (dialogue) never counts the wait; a background tab is capped.
    clock = createHintClock();
    tickHintClock(clock, 0, 0);
    holdHintClock(clock, 60000);
    tickHintClock(clock, 0, 61000);
    assert.equal(hintClockElapsed(clock), 1);
    tickHintClock(clock, 0, 600000);
    assert.equal(hintClockElapsed(clock), 3, 'a 9 min gap counts 2 s');
    assert.equal(capHintClock(clock, 2), 2);
    assert.match(runtime, /this\.searchHintElapsed = tickHintClock\(this\.searchHintClock, dt, now\);/);
  });

  it('R3: the lens masks the present-day ink around it and fades its 1978 ink before the rim', () => {
    assert.equal(lensPresentMask(100, 40, 86), 'radial-gradient(circle at 100px 40px, transparent 102px, #000 122px)');
    assert.equal(lensInkMask(100, 40, 86), 'radial-gradient(circle at 100px 40px, #000 64px, transparent 78px)');
    assert.match(board, /setMask\(card\.pastInk, lensInkMask\(localX, localY\)\);/);
    assert.match(board, /setMask\(card\.presentLayer, lensPresentMask\(/);
    assert.match(css, /\.c3-card__ink \{ position: absolute; inset: 0; padding: 18px 20px 16px; \}/);
  });

  it('R4: in the room the bed is tagged at once and Butch stands in view', () => {
    const [sx, , sz] = HOTEL_POSITIONS.roomPlayerStart;
    const [bx, , bz] = HOTEL_POSITIONS.bed;
    const reach = Number(runtime.match(/const HOTEL_BED_REACH = ([\d.]+);/)?.[1]);
    assert.ok(Math.hypot(sx - bx, sz - bz) < Math.min(4.2, reach), 'the bed is within E\'s reach on arrival');
    assert.equal(hotelFurnitureAt({ x: sx, z: sz }, 'room'), null);
    assert.ok(sx > HOTEL_ROOM_WALK_BOUNDS.minX && sx < HOTEL_ROOM_WALK_BOUNDS.maxX);
    assert.ok(sz > HOTEL_ROOM_WALK_BOUNDS.minZ && sz < HOTEL_ROOM_WALK_BOUNDS.maxZ - 1.5, 'clear of the doorway wall');
    assert.match(runtime, /outline: this\.hotelBedOutline, interior: true, reach: HOTEL_BED_REACH,/);
    // The lobby's fixed framing no longer follows Butch upstairs.
    assert.match(runtime, /this\.preview\.setCameraOverrideTarget\(null\);\n      this\.preview\.player\.position\.copy\(positionFrom\(state\.nightRoomLeft/);
    assert.match(runtime, /this\.preview\.setCameraOverrideTarget\(positionFrom\(HOTEL_ROOM_FRAME\)\);/);
  });

  it('R5: the empty-seat line plays over the open carriage door', () => {
    assert.match(BOARDED_DIALOGUE[0].text, /^Through the open door, the seat beside Butch is empty\./);
    assert.doesNotMatch(BOARDED_DIALOGUE[0].text, /turns to the seat/);
    assert.match(runtime, /this\.boardedCloseUp = true;/);
    assert.match(runtime, /if \(this\.boardedCloseUp && state\.boardedTrain && state\.departureSequenceMs < 11200\)/);
  });

  it('pacing (superseded in alpha round 4): "Take the room" is the last option, numbers stay put', () => {
    const first = hanaTopicMenu([]).choices.map((choice) => choice.id);
    assert.deepEqual(first, ['hana-register', 'hana-departure', 'hana-face']);
    const afterLedger = hanaTopicMenu(['register']).choices;
    assert.deepEqual(afterLedger.map((choice) => choice.id), ['hana-register', 'hana-departure', 'hana-face', 'hana-done']);
    assert.equal(afterLedger[0].used, true);
    // Another question first still lets Butch take the room.
    assert.ok(hanaTopicMenu(['face']).choices.some((choice) => choice.id === 'hana-done'));
    assert.equal(hanaTopicMenu(['register', 'departure', 'face']).choices.at(-1).id, 'hana-done');
  });

  it('LOW: Butch swaps the speckling rim for a clean outline; HIGH keeps the rim', () => {
    assert.match(builders, /export function addSilhouetteOutline\(root,/);
    assert.match(builders, /side: THREE\.BackSide/);
    assert.match(builders, /gl_Position\.z \+= chapter3OutlineDepthPush \* gl_Position\.w;/);
    assert.match(builders, /outline\.bind\(source\.skeleton, source\.bindMatrix\);/);
    assert.match(runtime, /if \(!rig \|\| this\.preview\.qualityTier === 'high'\) return false;/);
    assert.match(runtime, /setRimLightStrength\(rig, 0\);/);
    assert.match(runtime, /this\.updateButchSilhouette\(\);\n    this\.updateGuidanceBeacons\(\);/);
  });
});
