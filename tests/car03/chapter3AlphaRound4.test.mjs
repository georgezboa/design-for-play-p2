import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

import { TICKET_BOARD_STEPS, ticketBoardGuidance } from '../../src/cars/presentCity3d/Chapter3TicketBoard.js';
import {
  CHAPTER3_RESUME_STAGES,
  CHAPTER3_START_POINTS,
  TICKET_IDS,
  cachedSnapshotModel,
  chapter3ResumePoint,
  chapter3ResumeStart,
  createChapter3OpeningModel,
} from '../../src/cars/presentCity3d/chapter3OpeningModel.js';
import { createSaveStore } from '../../src/shell/saveSystem.js';
import { compassVisible, controlsHintHtml, controlsHintState } from '../../src/cars/presentCity3d/chapter3Guidance.js';
import {
  CAMERA_WEST_REACH_X, MAX_FRAME_SECONDS, MAX_STEP_SECONDS, WALK_SPEED, frameSteps, walkAlongPath,
} from '../../src/cars/presentCity3d/EchoCity3DPreview.js';
import { LOWEST_PIXEL_RATIO, LOW_PIXEL_RATIO } from '../../src/cars/presentCity3d/chapter3Quality.js';
import {
  CAMPFIRE_SELINE_STONE_DIALOGUE,
  CHAPTER3_OBJECTIVES,
  MORNING_STONE_PICKUP,
  echoStoneToastText,
} from '../../src/cars/presentCity3d/chapter3OpeningContent.js';
import { stoneToast } from '../../src/chapters/borrowedLight/story.js';
import { MAGIC_STONES } from '../../src/shell/magicStones.js';

// Alpha round 4 fix round (engineer M3, 2026-10-05): Chapter 3 · ECHO CITY.
const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const board = read('src/cars/presentCity3d/Chapter3TicketBoard.js');
const runtime = read('src/cars/presentCity3d/Chapter3OpeningRuntime.js');
const main = read('src/car03-3d-main.js');
const preview = read('src/cars/presentCity3d/EchoCity3DPreview.js');
const builders = read('src/cars/presentCity3d/chapter3SceneBuilders.js');
const css = read('src/cars/presentCity3d/chapter3Release.css');

function memoryStorage() {
  const map = new Map();
  return { getItem: (k) => (map.has(k) ? map.get(k) : null), setItem: (k, v) => map.set(k, String(v)), removeItem: (k) => map.delete(k) };
}

describe('Chapter 3 alpha round 4 · mid-chapter resume points (P1)', () => {
  it('every resume stage replays to a state that resumes at that same stage', () => {
    for (const { stage, checkpointId } of CHAPTER3_RESUME_STAGES) {
      assert.ok(CHAPTER3_START_POINTS.includes(stage), `${stage} is a real start`);
      const model = createChapter3OpeningModel({ startAt: stage, resumed: true });
      assert.deepEqual(chapter3ResumePoint(model.snapshot()), { checkpointId, stage }, stage);
      assert.equal(model.snapshot().lastEvent, `${stage}-resumed`);
    }
  });

  it('records a new stage at every objective change of a real playthrough', () => {
    const model = createChapter3OpeningModel();
    const seen = [];
    const note = () => {
      const point = chapter3ResumePoint(model.snapshot());
      const key = point && `${point.checkpointId}:${point.stage}`;
      if (key && key !== seen.at(-1)) seen.push(key);
    };
    note();
    assert.deepEqual(seen, [], 'the platform and Lev are the chapter start itself');
    const steps = [
      () => model.readArrival(), () => model.completeTrainDeparture(), () => model.completeLevIntroduction(),
      () => model.beginGuide(), () => model.completeExplorationBriefing(),
      () => model.observeSeam('fuel'), () => model.concludeSeam(),
      () => model.reachTransportEntrance(), () => model.enterTransportHall(), () => model.takeTransportNumber(),
      () => model.noteNikaTopic('sale'), () => model.completeNika(),
      ...TICKET_IDS.map((id) => () => model.seeTicketThroughLens(id)),
      () => model.stackTickets(true), () => model.punchTickets(), () => model.completeTicketBoard(),
      () => model.noteEdaTopic('order'), () => model.completeEda(), () => model.passScanner('market'),
      () => model.observeCutInterface('cut'), () => model.concludeCutInterface(),
      () => model.enterHotel(), () => model.noteHanaTopic('register'), () => model.completeHotelCheckIn(),
      () => model.enterHotelCorridor(), () => model.enterHotelRoom(), () => model.sleepUntilNight(),
      () => model.leaveNightRoom(), () => model.reachNightLobby(), () => model.beginNightRoute(),
      () => model.observeNightFire(), () => model.reconnectNightFeed(), () => model.lightSecondLine(),
      () => model.completeNightMessage(), () => model.beginMorning(), () => model.completeSunriseView(),
      () => model.reachStation(), () => model.passScanner('station'), () => model.boardTrain(),
    ];
    for (const step of steps) {
      assert.ok(step(), String(step));
      note();
    }
    assert.deepEqual(seen, CHAPTER3_RESUME_STAGES.map(({ checkpointId, stage }) => `${checkpointId}:${stage}`));
    // Stages before the market crossing are the chapter start's; the rest dusk's.
    const dusk = CHAPTER3_RESUME_STAGES.findIndex(({ stage }) => stage === 'cut-interface');
    assert.ok(CHAPTER3_RESUME_STAGES.slice(0, dusk).every(({ checkpointId }) => checkpointId === 'chapter-3-start'));
    assert.ok(CHAPTER3_RESUME_STAGES.slice(dusk).every(({ checkpointId }) => checkpointId === 'chapter-3-dusk'));
    model.advanceDeparture(30000);
    assert.equal(chapter3ResumePoint(model.snapshot()), null, 'a finished chapter keeps no resume point');
  });

  it('a saved stage opens only on its own checkpoint', () => {
    assert.equal(chapter3ResumeStart('chapter-3-start', { stage: 'ticket-board' }), 'ticket-board');
    assert.equal(chapter3ResumeStart('chapter-3-dusk', { stage: 'hotel-room' }), 'hotel-room');
    assert.equal(chapter3ResumeStart('chapter-3-dusk', { stage: 'ticket-board' }), null);
    assert.equal(chapter3ResumeStart('chapter-3-start', { stage: 'station' }), null);
    assert.equal(chapter3ResumeStart('chapter-3-start', { stage: 'nowhere' }), null);
    assert.equal(chapter3ResumeStart('chapter-3-start', null), null);
  });

  it('the save keeps the stage until the checkpoint moves (the oil line, then the dusk crossing)', () => {
    const store = createSaveStore(memoryStorage(), { scratch: false });
    store.startNew(0);
    store.markCheckpoint('chapter-3-start');
    store.markResume('chapter-3-start', { stage: 'ministry-hall' });
    assert.equal(chapter3ResumeStart('chapter-3-start', store.readResume('chapter-3-start')), 'ministry-hall');
    // The market crossing saves dusk: the start-of-chapter point is dropped.
    store.markCheckpoint('chapter-3-dusk');
    assert.equal(store.readResume('chapter-3-start'), null);
    assert.equal(store.markResume('chapter-3-start', { stage: 'market' }), null, 'a stale start stage is refused');
    store.markResume('chapter-3-dusk', { stage: 'wire' });
    assert.equal(chapter3ResumeStart('chapter-3-dusk', store.readResume('chapter-3-dusk')), 'wire');
    store.markCheckpoint('chapter-4-start');
    assert.equal(store.readResume('chapter-3-dusk'), null);
  });

  it('the page resumes only on its own checkpoint, and never from a dev route', () => {
    assert.match(main, /const qaOverride = Boolean\(playtest \|\| query\.get\('focus'\)\);/);
    assert.match(main, /!qaOverride && activeSave\?\.checkpointId === pageCheckpoint/);
    assert.match(main, /chapter3ResumeStart\(pageCheckpoint, store\.readResume\(pageCheckpoint\)\)/);
    assert.match(main, /if \(!qaOverride && checkpointId && stage\) store\.markResume\(checkpointId, \{ stage \}\);/);
    assert.match(main, /PLAYTEST_STARTS\[playtest\] \?\? resumeStage \?\? \(resumeAtDusk \? 'cut-interface' : null\)/);
    assert.match(runtime, /this\.updateResumePoint\(\);/);
    // Resumes inside the two interiors stage them.
    assert.match(runtime, /if \(state\.transportHallEntered && !state\.ticketBoardComplete\) \{\n\s+this\.stageMinistryHall/);
    assert.match(runtime, /if \(state\.hotelEntered && !state\.slept\) \{\n\s+this\.stageHotelInterior\(\);/);
  });
});

describe('Chapter 3 alpha round 4 · frame-rate independence (P1)', () => {
  it('a drawn frame gets its wall time, in steps of at most 0.1 s, down to 1 fps', () => {
    for (const fps of [60, 30, 20, 15, 10, 4, 2, 1]) {
      const { frame, steps, step } = frameSteps(1 / fps);
      assert.ok(Math.abs(frame - 1 / fps) < 1e-9, `${fps} fps keeps wall time`);
      assert.ok(step <= MAX_STEP_SECONDS + 1e-9, `${fps} fps steps stay small`);
      assert.ok(Math.abs(steps * step - frame) < 1e-9);
    }
    assert.equal(frameSteps(30).frame, MAX_FRAME_SECONDS, 'a background tab never dumps more than a second');
  });

  it('the departure takes its 23.6 s at 1 fps and at 10 fps', () => {
    for (const fps of [1, 10, 60]) {
      const model = createChapter3OpeningModel({ startAt: 'station' });
      model.passScanner('station');
      model.boardTrain();
      let wall = 0;
      while (!model.snapshot().chapterComplete && wall < 120) {
        const { steps, step } = frameSteps(1 / fps);
        for (let index = 0; index < steps; index += 1) model.advanceDeparture(step * 1000);
        wall += 1 / fps;
      }
      assert.ok(Math.abs(wall - 23.6) < 1 / fps + 1e-6, `${fps} fps: ${wall.toFixed(2)} s`);
    }
  });

  it('a walk with corners covers speed × time whatever the frame rate', () => {
    const corners = () => Array.from({ length: 40 }, (_, index) => ({ x: (index + 1) * 0.37, z: index % 2 ? 0.37 : 0 }));
    const length = (path) => path.reduce((sum, point, index) => {
      const previous = index ? path[index - 1] : { x: 0, z: 0 };
      return sum + Math.hypot(point.x - previous.x, point.z - previous.z);
    }, 0);
    const total = length(corners());
    for (const fps of [60, 10, 1]) {
      const path = corners();
      const position = { x: 0, z: 0 };
      let wall = 0;
      while (path.length && wall < 60) {
        const { steps, step } = frameSteps(1 / fps);
        for (let index = 0; index < steps; index += 1) walkAlongPath(position, path, WALK_SPEED * step);
        wall += 1 / fps;
      }
      assert.ok(Math.abs(wall - total / WALK_SPEED) <= 1 / fps + 1e-6, `${fps} fps arrives on time (${wall.toFixed(2)} s)`);
    }
  });

  it('runs the screen work once per drawn frame; LOW draws smaller, pinned LOW without MSAA', () => {
    assert.match(runtime, /if \(!final\) return;/);
    assert.match(runtime, /this\.model = cachedSnapshotModel\(model\);/);
    assert.match(preview, /createRenderer\(container, \{ antialias: this\.qualityMonitor\.tier !== 'low' \}\)/);
    assert.ok(LOW_PIXEL_RATIO <= 0.7);
    assert.ok(LOWEST_PIXEL_RATIO <= 0.5);
  });

  it('the snapshot view clones once until the story changes', () => {
    const model = createChapter3OpeningModel({ startAt: 'oil-seam' });
    let clones = 0;
    const counted = Object.freeze({ ...model, snapshot: () => { clones += 1; return model.snapshot(); } });
    const view = cachedSnapshotModel(counted);
    const first = view.snapshot();
    assert.equal(view.snapshot(), first);
    assert.equal(clones, 1);
    assert.equal(view.observeSeam('fuel'), true);
    const after = view.snapshot();
    assert.notEqual(after, first);
    assert.deepEqual(after.seamObservations, ['fuel']);
    assert.equal(clones, 2);
  });
});

describe('Chapter 3 alpha round 4 · the controls tag (P1)', () => {
  it('names the three verbs, greys each once used, and goes after walk and look', () => {
    const fresh = controlsHintState();
    assert.equal(fresh.visible, true);
    assert.deepEqual(fresh.segments.map(({ id }) => id), ['walk', 'look', 'tab']);
    assert.equal(
      controlsHintHtml(fresh.segments).replace(/<[^>]+>/g, '').replace(/\s+/g, ' '),
      'CLICK TO WALK·E TO LOOK·HOLD TAB TO LOOK AROUND',
    );
    assert.equal(controlsHintState({ locked: true }).visible, false, 'a line or a card hides it');
    const walked = controlsHintState({ used: ['walk'] });
    assert.equal(walked.visible, true);
    assert.deepEqual(walked.segments.map(({ used }) => used), [true, false, false]);
    assert.match(controlsHintHtml(walked.segments), /c3-controls__verb is-used" data-verb="walk"/);
    assert.equal(controlsHintState({ used: ['tab', 'walk'] }).visible, true, 'Tab is offered, not required');
    assert.equal(controlsHintState({ used: ['walk', 'look'] }).visible, false);
    assert.equal(controlsHintState({ used: ['look', 'walk'] }).dismissed, true);
  });

  it('marks a verb where the player uses it', () => {
    assert.match(runtime, /this\.noteControlUsed\('walk'\);\n\s+return false;/, 'a ground click');
    assert.match(runtime, /startInteraction\(interaction\) \{\n\s+this\.noteControlUsed\('look'\);/);
    assert.match(runtime, /this\.tabHeld = true;\n\s+this\.noteControlUsed\('tab'\);/);
    assert.match(runtime, /this\.updateControlsHint\(locked\);/);
  });
});

describe('Chapter 3 alpha round 4 · 3.6 the woman in the rose scarf (P1)', () => {
  it('ties an unlit rose scarf to her rig and holds the pair close until Butch boards', () => {
    assert.match(builders, /export function makeRoseScarf\(/);
    assert.match(builders, /new THREE\.MeshBasicMaterial\(\{ color, fog: false \}\)/);
    assert.match(runtime, /object\.isBone && \/neck\/i\.test\(object\.name\)/);
    assert.match(runtime, /this\.attachRoseScarf\(\);/);
    assert.doesNotMatch(runtime, /scarf\.position\.y = 1\.5;/, 'the old ring floated above her head');
    assert.match(runtime, /return state\.stationReached && !state\.boardedTrain && this\.echoMara\.visible/);
    assert.match(runtime, /if \(this\.stationCloseUpActive\(state\)\) target = this\.baseZoom \+ STATION_CLOSE_UP_ZOOM;/);
    assert.match(runtime, /focus: this\.stationPairFocus\(\),/);
    assert.match(runtime, /const DIALOGUE_ZOOM_BOOST = 0\.8;/);
  });
});

describe('Chapter 3 alpha round 4 · P2 polish', () => {
  it('the bench lines wait for the painting (and the lifted black) at dawn', () => {
    assert.match(runtime, /this\.showSunrise\(\{ underBlackout: true \}\);/);
    assert.doesNotMatch(runtime, /this\.elements\.blackout\?\.classList\.remove\('visible'\);\n\s+this\.showSunrise\(\);/);
    assert.match(runtime, /globalThis\.setTimeout\(startBench, BLACKOUT_FADE_MS\);/);
    assert.match(runtime, /\}, SUNRISE_TABLEAU_FADE_MS\);/);
    assert.match(runtime, /\|\| this\.sunrisePending === true/);
  });

  it('interior cuts wait for full black, draw the new set, then fade in', () => {
    assert.match(runtime, /const BLACKOUT_FADE_MS = 720;/);
    assert.match(css, /\.c3-blackout \{[^}]*transition: opacity 0\.7s linear;/);
    for (const name of ['stageMinistryHall', 'exitMinistryHall', 'stageHotelInterior', 'switchHotelArea', 'restoreHotelExterior']) {
      const body = runtime.slice(runtime.indexOf(`  ${name}(`), runtime.indexOf(`  ${name}(`) + 2600);
      assert.match(body, /this\.cutThroughBlack\(/, `${name} cuts through black`);
    }
    assert.doesNotMatch(runtime, /new Promise\(\(resolve\) => setTimeout\(resolve, HOTEL_STAGE_TRANSITION_MS\)\)/);
  });

  it('the camera reaches the laundry fire by the west wall', () => {
    assert.ok(CAMERA_WEST_REACH_X <= -54, 'the fire is at x ≈ -54');
    assert.match(preview, /desiredX = THREE\.MathUtils\.clamp\(desiredX, westThresholdMinX, eastThresholdMaxX\);/);
  });

  it('the walk beacons draw over the roofs; the edge compass stays while the target is off screen', () => {
    assert.match(builders, /opacity: 0\.5, depthWrite: false, depthTest: false,/);
    const base = { hasTarget: true, distance: 40 };
    assert.equal(compassVisible(base), false, 'in view, quiet after the flash');
    assert.equal(compassVisible({ ...base, targetOnScreen: false }), true, 'off screen, it stays mid-walk');
    assert.equal(compassVisible({ ...base, targetOnScreen: false, locked: true }), false);
    assert.equal(compassVisible({ ...base, targetOnScreen: false, distance: 3 }), false);
    assert.match(runtime, /targetOnScreen: Boolean\(screen\?\.onScreen\),/);
  });

  it('3.4a starts after the cut feed, so its task is the Copper Heron, still at dusk', () => {
    assert.match(main, /'chapter3-magic-stone': 'hotel',/);
    const model = createChapter3OpeningModel({ startAt: 'hotel' });
    assert.equal(model.snapshot().clock.period, 'DUSK', 'the laundry fire burns at dusk');
    assert.equal(model.snapshot().cutInterfaceComplete, true);
    assert.equal(model.snapshot().hotelEntered, false);
    assert.equal(CHAPTER3_OBJECTIVES.copperHeron, 'CHECK IN AT THE COPPER HERON');
  });
});

describe('Chapter 3 alpha round 4 · the Echo Stone notice (P2)', () => {
  it('announces the stone like Chapter 2, never in a Butch line', () => {
    assert.equal(echoStoneToastText({ count: 2, total: 5 }), 'ECHO STONE · MAGIC STONE 2 / 5');
    assert.equal(echoStoneToastText({ count: 2, total: 5 }).replace('ECHO', 'GRID'), stoneToast({ count: 2, total: 5 }));
    assert.doesNotMatch(runtime, /MAGIC STONE \$\{next\.count\}/);
    assert.doesNotMatch(runtime, /Seline's unclaimed coat/);
    assert.match(runtime, /stoneChime\(\);/);
    assert.match(runtime, /magicStoneRowHtml\(snapshot\)/);
  });

  it('keeps the coat unclaimed everywhere (Seline, the clue)', () => {
    assert.match(CAMPFIRE_SELINE_STONE_DIALOGUE[0].text, /an unclaimed coat/);
    assert.match(MAGIC_STONES.find(({ id }) => id === 'chapter-3').clue, /an unclaimed coat/);
    for (const line of [...CAMPFIRE_SELINE_STONE_DIALOGUE, ...MORNING_STONE_PICKUP]) {
      assert.doesNotMatch(line.text, /Seline's (unclaimed )?coat|MAGIC STONE/);
    }
  });
});

describe('Chapter 3 alpha round 4 · ticket board order (P1)', () => {
  it('names the lens first, then the stack, then the punch', () => {
    const model = createChapter3OpeningModel({ startAt: 'ticket-board' });
    const step = () => ticketBoardGuidance(model.snapshot().ticketBoard);
    assert.equal(step().step, 'lens');
    assert.equal(step().text, TICKET_BOARD_STEPS.lens);
    assert.match(step().text, /lens/);
    assert.doesNotMatch(step().text, /lay one/i, 'the first instruction never asks for the stack');
    // Stacking first does not offer a punch.
    model.stackTickets(true);
    assert.equal(step().canPunch, false);
    assert.equal(step().step, 'lens');
    model.seeTicketThroughLens(TICKET_IDS[0]);
    assert.equal(step().text, TICKET_BOARD_STEPS.lensOne);
    model.stackTickets(false);
    model.seeTicketThroughLens(TICKET_IDS[1]);
    assert.equal(step().step, 'stack');
    assert.equal(step().canPunch, false);
    model.stackTickets(true);
    assert.deepEqual(step(), { step: 'punch', text: TICKET_BOARD_STEPS.punch, canPunch: true });
    // The guidance agrees with the model's own rule at every step.
    assert.equal(step().canPunch, model.canPunchTickets());
    model.punchTickets();
    assert.equal(step().step, 'filed');
  });

  it('shows PUNCH BOTH only when a punch would work', () => {
    assert.match(board, /this\.stackTag\.hidden = !guidance\.canPunch;/);
    assert.doesNotMatch(board, /this\.stackTag\.hidden = !ready;/);
    assert.doesNotMatch(board, /Lay one on the other, then punch/);
  });
});
