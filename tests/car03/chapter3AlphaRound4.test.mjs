import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

import { TICKET_BOARD_STEPS, ticketBoardGuidance } from '../../src/cars/presentCity3d/Chapter3TicketBoard.js';
import {
  CHAPTER3_RESUME_STAGES,
  CHAPTER3_START_POINTS,
  TICKET_IDS,
  chapter3ResumePoint,
  chapter3ResumeStart,
  createChapter3OpeningModel,
} from '../../src/cars/presentCity3d/chapter3OpeningModel.js';
import { createSaveStore } from '../../src/shell/saveSystem.js';
import {
  CAMPFIRE_SELINE_STONE_DIALOGUE,
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
