import assert from 'node:assert/strict';
import fs from 'node:fs';
import { describe, it } from 'node:test';

import * as CONTENT from '../../src/cars/presentCity3d/chapter3OpeningContent.js';
import {
  CHAPTER3_START_POINTS,
  TICKET_IDS,
  createChapter3OpeningModel,
} from '../../src/cars/presentCity3d/chapter3OpeningModel.js';
import { CHAPTER3_PERIODS } from '../../src/cars/presentCity3d/chapter3TimeSystem.js';

const runtime = fs.readFileSync(new URL('../../src/cars/presentCity3d/Chapter3OpeningRuntime.js', import.meta.url), 'utf8');

// Every spoken line the release chapter can show (dialogue arrays, menu
// responses, barks). Menu builders are expanded with no topics asked.
function allContentLines() {
  const lines = [];
  const visit = (value) => {
    if (Array.isArray(value)) value.forEach(visit);
    else if (value && typeof value === 'object') {
      if (typeof value.speaker === 'string' && typeof value.text === 'string') lines.push(value);
      else Object.values(value).forEach(visit);
    }
  };
  for (const [name, value] of Object.entries(CONTENT)) {
    if (name === 'SEARCH_HINT_LINES') Object.values(value).forEach((build) => visit(build('north')));
    else if (typeof value !== 'function') visit(value);
  }
  return lines;
}

// The complete chapter, beat by beat, as the runtime drives it.
function playWholeChapter(model) {
  const log = [];
  const call = (method, ...args) => {
    const ok = model[method](...args);
    assert.equal(ok, true, `${method}(${args.join(', ')}) should advance from ${model.snapshot().phase}`);
    log.push(model.snapshot().phase);
  };
  call('readArrival');
  call('completeTrainDeparture');
  call('completeLevIntroduction');
  call('beginGuide');
  call('completeExplorationBriefing');
  call('observeSeam', 'fuel');
  call('concludeSeam');
  call('reachTransportEntrance');
  call('enterTransportHall');
  call('takeTransportNumber');
  call('noteNikaTopic', 'sale');
  call('completeNika');
  for (const id of TICKET_IDS) call('seeTicketThroughLens', id);
  call('stackTickets');
  call('punchTickets');
  call('completeTicketBoard');
  call('noteEdaTopic', 'face');
  call('completeEda');
  call('passScanner', 'market');
  call('observeCutInterface', 'reconnection');
  call('concludeCutInterface');
  call('enterHotel');
  call('noteHanaTopic', 'register');
  call('completeHotelCheckIn');
  call('enterHotelCorridor');
  call('enterHotelRoom');
  call('sleepUntilNight');
  call('leaveNightRoom');
  call('reachNightLobby');
  call('beginNightRoute');
  call('observeNightFire');
  call('reconnectNightFeed');
  call('lightSecondLine');
  call('completeNightMessage');
  call('beginMorning');
  call('completeSunriseView');
  call('reachStation');
  call('sightMara');
  call('passScanner', 'station');
  call('boardTrain');
  for (let ms = 0; ms < 24000; ms += 500) model.advanceDeparture(500);
  return log;
}

describe('Chapter 3 · ECHO CITY release chapter', () => {
  it('plays the whole chapter start to finish on the scripted path', () => {
    const model = createChapter3OpeningModel();
    const log = playWholeChapter(model);
    const state = model.snapshot();
    assert.equal(state.chapterComplete, true);
    assert.equal(state.phase, 'complete');
    assert.equal(state.blackout, true);
    assert.equal(state.stationScanPassed, true);
    assert.equal(state.evidence.duplicateTicket, 'venn-is-the-duplicate-of-velez-claim-1978-0412');
    assert.equal(state.evidence.fireLetters, 'another-mark-keep-moving');
    assert.equal(state.evidence.stationScan, 'one-passenger-claim-1978-0412');
    assert.ok(log.includes('ticket-board'));
    assert.ok(log.includes('cross-market-scanner'));
    assert.ok(log.includes('wait-for-bell'));
    assert.ok(log.includes('cross-station-scanner'));
    assert.equal(state.clock.day, 2);
    assert.equal(state.clock.time, 'DAY 2 · 07:05');
  });

  it('walks the city through afternoon, dusk, night and dawn light', () => {
    const periodAt = { arrival: createChapter3OpeningModel().snapshot().clock.period };
    for (const [start, label] of [['ticket-board', 'ministry'], ['cut-interface', 'dusk'], ['night-fire', 'night'], ['station', 'station']]) {
      periodAt[label] = createChapter3OpeningModel({ startAt: start }).snapshot().clock.period;
    }
    assert.equal(periodAt.arrival, CHAPTER3_PERIODS.AFTERNOON);
    assert.equal(periodAt.ministry, CHAPTER3_PERIODS.AFTERNOON);
    assert.equal(periodAt.dusk, CHAPTER3_PERIODS.DUSK);
    assert.equal(periodAt.night, CHAPTER3_PERIODS.NIGHT);
    assert.equal(periodAt.station, CHAPTER3_PERIODS.DAWN);
  });

  it('refuses beats out of order', () => {
    const model = createChapter3OpeningModel();
    assert.equal(model.completeTrainDeparture(), false);
    assert.equal(model.reachTransportEntrance(), false);
    assert.equal(model.punchTickets(), false);
    assert.equal(model.passScanner('market'), false);
    assert.equal(model.enterHotel(), false);
    assert.equal(model.reconnectNightFeed(), false);
    assert.equal(model.boardTrain(), false);
    assert.equal(model.snapshot().phase, 'train-door');
  });

  it('builds every dev playtest start by replaying the real transitions', () => {
    const expected = {
      'oil-seam': 'inspect-oil-line',
      'ministry-walk': 'find-ministry',
      'ticket-board': 'ticket-board',
      'market-scanner': 'cross-market-scanner',
      'cut-interface': 'find-cut-feed',
      hotel: 'check-in-hotel',
      'night-fire': 'read-first-fire-line',
      wire: 'reconnect-night-feed',
      morning: 'sunrise',
      station: 'cross-station-scanner',
    };
    assert.deepEqual([...CHAPTER3_START_POINTS].sort(), Object.keys(expected).sort());
    for (const [start, phase] of Object.entries(expected)) {
      const model = createChapter3OpeningModel({ startAt: start });
      assert.equal(model.snapshot().phase, phase, start);
      assert.equal(model.snapshot().lastEvent, `${start}-qa-started`);
      assert.equal(model.reset().phase, phase, `${start} reset`);
    }
    assert.equal(createChapter3OpeningModel({ startAt: 'not-a-beat' }).snapshot().phase, 'train-door');
  });

  it('files the two tickets 43 only through the lens, a stack and one punch', () => {
    const model = createChapter3OpeningModel({ startAt: 'ticket-board' });
    assert.equal(model.canPunchTickets(), false);
    assert.equal(model.stackTickets(), true);
    assert.equal(model.punchTickets(), false, 'the claim numbers have not been seen yet');
    assert.equal(model.seeTicketThroughLens('ticket-velez'), true);
    assert.equal(model.seeTicketThroughLens('ticket-velez'), false);
    assert.equal(model.seeTicketThroughLens('terminal-note'), false);
    assert.equal(model.punchTickets(), false, 'both tickets must be seen');
    assert.equal(model.seeTicketThroughLens('ticket-venn'), true);
    assert.equal(model.stackTickets(false), true);
    assert.equal(model.punchTickets(), false, 'they must lie one on the other');
    assert.equal(model.stackTickets(true), true);
    assert.equal(model.punchTickets(), true);
    assert.equal(model.stackTickets(false), false, 'a punched stack stays filed');
    assert.equal(model.completeTicketBoard(), true);
    assert.equal(model.snapshot().phase, 'find-eda');
  });

  it('counts scanner flags only while a crossing is live', () => {
    const model = createChapter3OpeningModel({ startAt: 'market-scanner' });
    assert.equal(model.scannerActive('market'), true);
    assert.equal(model.scannerActive('station'), false);
    assert.equal(model.flagScanner('market'), true);
    assert.equal(model.flagScanner('station'), false);
    assert.equal(model.snapshot().scanners.market.flags, 1);
    assert.equal(model.passScanner('market'), true);
    assert.equal(model.scannerActive('market'), false);
    assert.equal(model.flagScanner('market'), false);
    assert.equal(model.snapshot().clock.period, CHAPTER3_PERIODS.DUSK);
  });

  it('lights the second row only after the feed is in the clamp', () => {
    const model = createChapter3OpeningModel({ startAt: 'wire' });
    assert.equal(model.lightSecondLine(), false);
    assert.equal(model.reconnectNightFeed(), true);
    assert.equal(model.snapshot().phase, 'wait-for-bell');
    assert.equal(model.completeNightMessage(), false);
    assert.equal(model.lightSecondLine(), true);
    assert.equal(model.completeNightMessage(), true);
  });

  it('boards only after the station scanner reads one passenger, then runs the departure', () => {
    const model = createChapter3OpeningModel({ startAt: 'station' });
    assert.equal(model.boardTrain(), false);
    assert.equal(model.passScanner('station'), true);
    assert.equal(model.boardTrain(), true);
    const phases = [];
    for (let ms = 0; ms <= 23600; ms += 400) {
      model.advanceDeparture(400);
      phases.push(model.snapshot().phase);
    }
    assert.deepEqual([...new Set(phases)], ['turn-to-seat', 'door-closing', 'door-latch', 'train-moving', 'black-audio-tail', 'complete']);
    assert.equal(model.snapshot().chapterComplete, true);
    assert.equal(model.advanceDeparture(100), false);
  });
});

describe('Chapter 3 checklist menus', () => {
  const menus = [
    ['seam', CONTENT.seamMenu, 'seam-conclude', ['geometry', 'fuel', 'cleaning']],
    ['nika', CONTENT.nikaTopicMenu, 'nika-done', ['reservation', 'sale']],
    ['eda', CONTENT.edaTopicMenu, 'eda-done', ['order', 'collector', 'face']],
    ['cut', CONTENT.cutInterfaceMenu, 'cut-conclude', ['cut', 'placement', 'reconnection']],
    ['hana', CONTENT.hanaTopicMenu, 'hana-done', ['register', 'departure', 'face']],
  ];

  it('offers Continue after one topic and removes asked topics', () => {
    for (const [name, build, done, topics] of menus) {
      const fresh = build([]).choices.map((choice) => choice.id);
      assert.ok(!fresh.includes(done), `${name}: Continue waits for one topic`);
      assert.equal(fresh.length, topics.length, `${name}: every topic is offered`);
      const afterOne = build([topics[0]]).choices.map((choice) => choice.id);
      assert.ok(afterOne.includes(done), `${name}: one topic unlocks Continue`);
      assert.ok(!afterOne.some((id) => id.endsWith(topics[0])), `${name}: an asked topic leaves the menu`);
    }
  });

  it('has no BLOCKED gates and no three-round theory tests left', () => {
    const names = Object.keys(CONTENT);
    assert.deepEqual(names.filter((name) => /BLOCKED/.test(name)), []);
    assert.deepEqual(names.filter((name) => /THEORY|EVIDENCE_TABLE|BOSKO|ARCHIVE|DARO|IRENA|VESNA|ALLEY|RADA|MIRO|KETTLE/.test(name)), []);
    assert.doesNotMatch(runtime, /_BLOCKED|openFirstTheory|openSecondTheory|openFinalEvidenceTable/);
  });

  it('keeps the chapter near its 20–25 minute budget in reading', () => {
    const lines = allContentLines().filter((line) => line.speaker !== 'CHOOSE');
    // Alpha round 1 length pass: 128 → 96 authored lines in all.
    assert.ok(lines.length <= 96, `about 96 spoken lines at most (was ~413, then 128); found ${lines.length}`);
  });

  // Alpha round 1 · F2 length: first-time play was 60–80 min, mostly talk and
  // scripted walks. No run of captions is longer than five before the
  // player acts (a choice, a card, a click, a walk).
  it('never runs more than five lines before the player acts', () => {
    const runs = {
      'arrival, before the claim card': CONTENT.ARRIVAL_DIALOGUE.slice(0, CONTENT.ARRIVAL_BEFORE_CARD),
      'arrival, after the claim card + Lev': [...CONTENT.ARRIVAL_DIALOGUE.slice(CONTENT.ARRIVAL_BEFORE_CARD), ...CONTENT.LEV_INTRO_DIALOGUE],
      'Toma at the door': CONTENT.TRANSPORT_ENTRANCE_DIALOGUE,
      'the ticket board, then the walk out': CONTENT.TICKET_BOARD_CONCLUSION,
      'past the market scanner': CONTENT.MARKET_CROSSED_DIALOGUE,
      'sleep, the dark, waking': [...CONTENT.SLEEP_DIALOGUE, ...CONTENT.NIGHT_WAKE_DIALOGUE],
      'the first fire row': CONTENT.NIGHT_FIRST_LINE,
      'the second row, the dark, the dawn bench': [...CONTENT.NIGHT_SECOND_LINE, ...CONTENT.SUNRISE_BENCH_DIALOGUE],
      'the station approach': [...CONTENT.STATION_APPROACH_DIALOGUE, ...CONTENT.STATION_MARA_SIGHTED],
      'boarding and the empty seat': [...CONTENT.BOARDING_DIALOGUE, ...CONTENT.BOARDED_DIALOGUE],
      'Seline\'s stone and the pickup line': [...CONTENT.CAMPFIRE_SELINE_STONE_DIALOGUE, { speaker: 'BUTCH', text: 'pickup' }],
    };
    const menus = {
      seam: [CONTENT.SEAM_DIALOGUE, CONTENT.SEAM_TOPIC_RESPONSES, CONTENT.SEAM_CONCLUSION],
      nika: [CONTENT.NIKA_OPENING, CONTENT.NIKA_TOPIC_RESPONSES, CONTENT.NIKA_CONCLUSION],
      eda: [CONTENT.EDA_OPENING, CONTENT.EDA_TOPIC_RESPONSES, CONTENT.EDA_CONCLUSION],
      cut: [CONTENT.CUT_INTERFACE_OPENING, CONTENT.CUT_INTERFACE_RESPONSES, CONTENT.CUT_INTERFACE_CONCLUSION],
      hana: [CONTENT.HANA_OPENING, CONTENT.HANA_TOPIC_RESPONSES, CONTENT.HANA_CONCLUSION],
    };
    for (const [name, [opening, responses, conclusion]] of Object.entries(menus)) {
      runs[`${name}: opening`] = opening;
      runs[`${name}: conclusion`] = conclusion;
      for (const [topic, lines] of Object.entries(responses)) runs[`${name}: ${topic}`] = lines;
    }
    for (const [name, lines] of Object.entries(runs)) {
      assert.ok(lines.length <= 5, `${name}: ${lines.length} lines before the player acts`);
    }
    // A topic answer never starts by repeating the question the menu showed.
    for (const responses of [CONTENT.NIKA_TOPIC_RESPONSES, CONTENT.EDA_TOPIC_RESPONSES, CONTENT.HANA_TOPIC_RESPONSES]) {
      for (const lines of Object.values(responses)) assert.notEqual(lines[0].speaker, 'BUTCH');
    }
  });

  it('lets the player walk away from scripted beats', () => {
    // The opening train departure and Lev's walk to the oil line hold no one.
    const lock = runtime.match(/interactionLocked\(\) \{([\s\S]*?)\n  \}/)?.[1] ?? '';
    assert.doesNotMatch(lock, /departureElapsed|guideElapsed|guidedWalkActive/);
    assert.match(runtime, /skipScriptedWalk\(\)/);
    assert.doesNotMatch(runtime, /openWorldBriefing|openQueueDispenser|WORLD_BRIEFING_DIALOGUE|TRANSPORT_QUEUE_DIALOGUE/);
    // Upstairs goes straight to the room; at night the room door goes out.
    assert.match(runtime, /this\.model\.enterHotelRoom\(\);\n\s+this\.switchHotelArea\('room'\);/);
    assert.match(runtime, /this\.model\.reachNightLobby\(\);\n\s+this\.leaveHotelAtNight\(\);/);
    const preview = fs.readFileSync(new URL('../../src/cars/presentCity3d/EchoCity3DPreview.js', import.meta.url), 'utf8');
    assert.match(preview, /addEventListener\('dblclick'/);
    assert.match(preview, /this\.running \|\| this\.shiftHeld \? WALK_SPEED \* RUN_MULTIPLIER : WALK_SPEED/);
  });

  it('dresses Mara\'s scarf rose, as in Chapter 2', () => {
    const text = allContentLines().map((line) => line.text).join(' ');
    assert.doesNotMatch(text, /teal scarf/);
    assert.match(text, /rose scarf/);
    assert.doesNotMatch(runtime, /teal scarf|0x2f8f86/);
  });
});

describe('Chapter 3 story coherence (docs/STORY_BIBLE.md)', () => {
  const lines = allContentLines();
  const text = lines.map((line) => `${line.speaker}: ${line.text}`).join('\n');
  const cardText = JSON.stringify([CONTENT.TICKET_BOARD_CARDS, CONTENT.TICKET_BOARD_FILED_CARD]);

  it('opens on the orchard case claim card, not a photograph of a missing Mara', () => {
    const opening = CONTENT.ARRIVAL_DIALOGUE.map((line) => line.text).join(' ');
    assert.match(opening, /claim card/);
    assert.match(opening, /1978-0412/);
    assert.match(opening, /orchard case/);
    assert.doesNotMatch(text, /photograph of|disappeared|missing person/i);
  });

  it('puts 1978-0412 and VELEZ in the evidence, and explains VENN through Nika', () => {
    assert.match(cardText, /1978-0412/);
    assert.match(cardText, /VELEZ/);
    assert.match(cardText, /M\. VENN/);
    const nika = CONTENT.NIKA_CONCLUSION.map((line) => line.text).join(' ');
    assert.match(nika, /cut long surnames on duplicates/);
    assert.match(nika, /VE, NN/);
    assert.match(nika, /VELEZ/);
  });

  it('makes the fire letters another mark that says keep moving', () => {
    assert.equal(CONTENT.FIRE_LETTERS.first, 'BUTCH, I WAS HERE.');
    assert.match(CONTENT.FIRE_LETTERS.second, /KEEP MOVING/);
    assert.match(text, /Another mark/);
    assert.doesNotMatch(text, /I'M ALIVE|I LEFT BY CHOICE/);
  });

  it('settles the train: Butch rides the night service; the tram is local', () => {
    assert.match(text, /night service/i);
    assert.doesNotMatch(text, /eastbound/i);
    for (const line of lines.filter((entry) => /tram/i.test(entry.text))) {
      assert.match(line.text, /evening tram/, `only the local tram is a tram: ${line.text}`);
    }
  });

  it('never shows Mara ahead face to face, and uses no inner voices', () => {
    assert.match(text, /never saw her face|Not once/);
    const speakers = new Set(lines.map((line) => line.speaker));
    for (const inner of ['PATTERN', 'TENDERNESS', 'NERVE', 'MARA', 'MARA VENN', 'SQUARE MARA', 'TRAIN MARA']) {
      assert.equal(speakers.has(inner), false, `${inner} does not speak`);
    }
    assert.doesNotMatch(text, /never had a sister/i);
  });

  it('keeps the Echo Stone at Seline’s fire with the morning ashes as fallback', () => {
    assert.ok(CONTENT.CAMPFIRE_SELINE_STONE_DIALOGUE.length >= 3);
    assert.match(runtime, /id: 'campfire-seline'/);
    assert.match(runtime, /id: 'morning-campfire-echo-stone'/);
    assert.match(runtime, /collectMagicStone\('chapter-3'\)/);
  });
});
