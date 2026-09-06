import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

import * as openingContent from '../../src/cars/presentCity3d/chapter3OpeningContent.js';
import { car03Audio } from '../../src/cars/presentCity/car03Audio.js';
import { createChapter3OpeningModel } from '../../src/cars/presentCity3d/chapter3OpeningModel.js';

function completeArrivalLoop(model, choice = 'arrival-nerve') {
  assert.equal(model.chooseArrival(choice), true);
}

function reachSeam(model, arrival = 'arrival-nerve') {
  completeArrivalLoop(model, arrival);
  assert.equal(model.completeTrainDeparture(), true);
  assert.equal(model.completeLevIntroduction(), true);
  assert.equal(model.beginGuide(), true);
  assert.equal(model.completeExplorationBriefing(), true);
}

function reachEda(model) {
  reachSeam(model);
  assert.equal(model.observeSeam('geometry'), true);
  assert.equal(model.concludeSeam('deliberate'), true);
}

function reachOlek(model, approach = 'direct') {
  reachEda(model);
  assert.equal(model.approachEda(approach), true);
  assert.equal(model.noteEdaTopic('collector'), true);
  assert.equal(model.noteEdaTopic('authorization'), true);
  assert.equal(model.obtainEdaRecord(), true);
}

function completeOlek(model) {
  assert.equal(model.noteOlekTopic('destination'), true);
  assert.equal(model.noteOlekTopic('route'), true);
  assert.equal(model.completeOlekRoute(), true);
}

function completeSava(model) {
  assert.equal(model.noteSavaTopic('anonymous-use'), true);
  assert.equal(model.noteSavaTopic('mara-transaction'), true);
  assert.equal(model.noteSavaTopic('no-correction'), true);
  assert.equal(model.completeSava(), true);
}

function completeNika(model) {
  assert.equal(model.noteNikaTopic('timeline'), true);
  assert.equal(model.noteNikaTopic('reservation'), true);
  assert.equal(model.noteNikaTopic('discarded-print'), true);
  assert.equal(model.completeNika(), true);
}

describe('Chapter 3 interactions #1 to #33', () => {
  it('keeps every scripted Chapter 3 transition audio cue callable', () => {
    for (const cue of ['nightmareStorm', 'morningWake', 'trainDoorSlam', 'trainHorn']) {
      assert.equal(typeof car03Audio[cue], 'function', `${cue} must never break a visual transition`);
      assert.doesNotThrow(() => car03Audio[cue]());
    }
  });

  it('starts at the train door and protects its snapshots', () => {
    const model = createChapter3OpeningModel();
    const snapshot = model.snapshot();
    assert.equal(snapshot.phase, 'train-door');
    snapshot.phase = 'corrupted';
    snapshot.evidence.oilSeam = 'invented';
    assert.equal(model.snapshot().phase, 'train-door');
    assert.equal(model.snapshot().evidence.oilSeam, null);
  });

  it('lets the three arrival readings send the train away immediately', () => {
    const approaches = {
      'arrival-pattern': 'pattern',
      'arrival-tenderness': 'tenderness',
      'arrival-nerve': 'nerve',
    };
    for (const [choice, approach] of Object.entries(approaches)) {
      const model = createChapter3OpeningModel();
      assert.equal(model.chooseArrival(choice), true);
      assert.equal(model.snapshot().arrivalApproach, approach);
      assert.equal(model.snapshot().maraPhotoShown, true);
      assert.equal(model.completeTrainDeparture(), true);
      assert.equal(model.snapshot().phase, 'meet-lev');
    }
  });

  it('enforces the investigation order before the oil seam', () => {
    const model = createChapter3OpeningModel();
    assert.equal(model.completeLevIntroduction(), false);
    assert.equal(model.observeSeam('geometry'), false);
    reachSeam(model);
    assert.equal(model.snapshot().phase, 'inspect-dark-seam');
  });

  it('records multiple observations separately from the seam inference', () => {
    for (const inference of ['deliberate', 'cart-leak', 'reserve-judgment']) {
      const model = createChapter3OpeningModel();
      reachSeam(model, 'arrival-pattern');
      assert.equal(model.concludeSeam(inference), false);
      assert.equal(model.observeSeam('geometry'), true);
      assert.equal(model.observeSeam('fuel'), true);
      const minuteBeforeReread = model.snapshot().clock.minuteOfDay;
      assert.equal(model.observeSeam('geometry'), false);
      assert.equal(model.snapshot().clock.minuteOfDay, minuteBeforeReread);
      assert.deepEqual(model.snapshot().seamObservations, ['geometry', 'fuel']);
      assert.equal(model.concludeSeam(inference), true);
      assert.equal(model.snapshot().seamInference, inference);
      assert.equal(model.snapshot().evidence.oilSeam, 'observed');
    }
  });

  it('gives every Eda approach an immediate tone state and lets the record proceed directly, while optional topics remain recordable', () => {
    const cooperation = {
      direct: 'professional',
      patient: 'open',
      pressuring: 'guarded',
    };
    for (const [approach, expected] of Object.entries(cooperation)) {
      const direct = createChapter3OpeningModel();
      reachEda(direct);
      assert.equal(direct.approachEda(approach), true);
      assert.equal(direct.snapshot().edaCooperation, expected);
      assert.equal(direct.obtainEdaRecord(), true);
      assert.equal(direct.snapshot().evidence.maraSighting, 'corroborated');
      assert.equal(direct.snapshot().evidence.lampOilSalesCopy, 'confirmed');
      assert.equal(direct.snapshot().suspicions.edaActivelyConcealedBuyer, true);
      assert.equal(direct.snapshot().phase, 'question-olek');

      const thorough = createChapter3OpeningModel();
      reachEda(thorough);
      assert.equal(thorough.approachEda(approach), true);
      assert.equal(thorough.noteEdaTopic('collector'), true);
      assert.equal(thorough.noteEdaTopic('authorization'), true);
      assert.equal(thorough.obtainEdaRecord(), true);
      assert.equal(thorough.snapshot().phase, 'question-olek');
    }
  });

  it('keeps the handcart optional and lets the player proceed directly, while optional topics remain recordable', () => {
    const direct = createChapter3OpeningModel();
    reachOlek(direct);
    assert.equal(direct.completeOlekRoute(), true);
    assert.equal(direct.snapshot().evidence.deliveryRoute, 'confirmed');
    assert.equal(direct.snapshot().suspicions.olekActivelyConcealedRoute, true);

    const thorough = createChapter3OpeningModel();
    reachOlek(thorough);
    assert.equal(thorough.noteOlekTopic('destination'), true);
    assert.equal(thorough.noteOlekTopic('route'), true);
    assert.equal(thorough.completeOlekRoute(), true);
    assert.equal(thorough.snapshot().cartInspected, false);
    assert.equal(thorough.snapshot().evidence.deliveryRoute, 'confirmed');
  });

  it('allows the player to complete #7 without inspecting the optional solvent bottle', () => {
    const model = createChapter3OpeningModel();
    reachOlek(model, 'patient');
    completeOlek(model);
    assert.equal(model.snapshot().solventBottleObserved, false);
    assert.equal(model.reachTransportEntrance(), true);
    assert.equal(model.snapshot().batchComplete, false);
    assert.equal(model.enterTransportHall(), true);
    assert.equal(model.takeTransportNumber('M-17'), true);
    assert.equal(model.snapshot().batchComplete, true);
    assert.equal(model.snapshot().interaction07Complete, true);
    assert.equal(model.snapshot().transportNumber, 'M-17');
    assert.equal(model.snapshot().phase, 'sava-counter');
  });

  it('records each bottle conclusion as observed evidence rather than proof of use on the line', () => {
    for (const inference of ['same-order', 'overclaimed', 'bounded']) {
      const model = createChapter3OpeningModel();
      reachOlek(model);
      completeOlek(model);
      assert.equal(model.inspectBottle(inference), true);
      assert.equal(model.snapshot().bottleInference, inference);
      assert.equal(model.snapshot().evidence.solventBottle, 'observed');
      assert.equal(model.reachTransportEntrance(), true);
    }
  });

  it('starts the direct #7 playtest with prior evidence but before Toma admits Butch', () => {
    const model = createChapter3OpeningModel({ startAt: 'interaction-07' });
    const state = model.snapshot();
    assert.equal(state.phase, 'transport-entrance');
    assert.equal(state.marketLeadComplete, true);
    assert.equal(state.transportEntranceReached, false);
    assert.equal(state.transportHallEntered, false);
    assert.equal(state.interaction07Complete, false);
    assert.equal(state.evidence.maraSighting, 'corroborated');
    assert.equal(state.evidence.lampOilSalesCopy, 'confirmed');
    assert.equal(state.evidence.deliveryRoute, 'confirmed');
  });

  it('enforces the #7 order: Toma, public hall, then number dispenser', () => {
    const model = createChapter3OpeningModel({ startAt: 'interaction-07' });
    assert.equal(model.enterTransportHall(), false);
    assert.equal(model.takeTransportNumber(), false);
    assert.equal(model.reachTransportEntrance(), true);
    assert.equal(model.takeTransportNumber(), false);
    assert.equal(model.enterTransportHall(), true);
    assert.equal(model.takeTransportNumber(), true);
    assert.equal(model.takeTransportNumber(), false);
  });

  it('removes already-asked investigation topics while keeping the final action visible', () => {
    assert.deepEqual(
      openingContent.levTopicMenu(['lev-office', 'lev-oil']).choices.map((choice) => choice.id),
      ['lev-sighting', 'lev-role', 'lev-now'],
    );
    assert.deepEqual(
      openingContent.seamMenu(['geometry', 'fuel'], true).choices.map((choice) => choice.id),
      ['seam-cleaning', 'seam-conclude'],
    );
    assert.deepEqual(
      openingContent.edaTopicMenu('professional', ['product', 'collector']).choices.map((choice) => choice.id),
      ['eda-order', 'eda-authorization', 'eda-complaint', 'eda-record'],
    );
    assert.deepEqual(
      openingContent.olekTopicMenu(['destination', 'route']).choices.map((choice) => choice.id),
      ['olek-leak', 'olek-recipient', 'olek-done'],
    );
    assert.deepEqual(
      openingContent.savaTopicMenu(['anonymous-use', 'mara-transaction']).choices.map((choice) => choice.id),
      ['sava-code-history', 'sava-no-correction', 'sava-done'],
    );
    assert.deepEqual(
      openingContent.nikaTopicMenu(['timeline', 'discarded-print']).choices.map((choice) => choice.id),
      ['nika-reservation', 'nika-source-records', 'nika-done'],
    );
    assert.deepEqual(
      openingContent.plazaGrooveMenu(['rows', 'spacing']).choices.map((choice) => choice.id),
      ['groove-feed-gap', 'groove-conclude'],
    );
    assert.deepEqual(
      openingContent.petarTopicMenu(['instruction', 'route']).choices.map((choice) => choice.id),
      ['petar-surface-view', 'petar-cleaning', 'petar-done'],
    );
    assert.deepEqual(
      openingContent.secondTheoryMenu(['market-coordination', 'petar-knew-message']).choices.map((choice) => choice.id),
      ['second-municipal-censorship', 'second-conclude'],
    );
    assert.deepEqual(
      openingContent.cutInterfaceMenu(['cut', 'placement']).choices.map((choice) => choice.id),
      ['cut-reconnection', 'cut-conclude'],
    );
  });

  it('contains one absent Mara and no duplicate-person premise in the #1 to #14 runtime copy', () => {
    const copy = JSON.stringify(openingContent).toLowerCase();
    assert.equal(copy.includes('duplicate mara'), false);
    assert.equal(copy.includes('second mara'), false);
    assert.equal(copy.includes('both women'), false);
    assert.equal(copy.includes('mara, inside the train'), false);
    assert.match(copy, /unnecessary duplicate/);
  });

  it('starts #8 inside the ministry with all prior evidence and no Sava conclusion prefilled', () => {
    const model = createChapter3OpeningModel({ startAt: 'interaction-08' });
    const state = model.snapshot();
    assert.equal(state.mode, 'transport-ministry-hall');
    assert.equal(state.phase, 'sava-counter');
    assert.equal(state.interaction07Complete, true);
    assert.equal(state.savaComplete, false);
    assert.equal(state.evidence.retiredCodePractice, null);
    assert.equal(model.noteNikaTopic('timeline'), false);
  });

  it('lets Sava conclude directly while still recording optional topics', () => {
    const direct = createChapter3OpeningModel({ startAt: 'interaction-08' });
    assert.equal(direct.completeSava(), true);
    assert.equal(direct.snapshot().evidence.retiredCodePractice, 'confirmed-standing-practice');
    assert.equal(direct.snapshot().suspicions.savaLeftTransactionUncorrected, true);

    const thorough = createChapter3OpeningModel({ startAt: 'interaction-08' });
    thorough.noteSavaTopic('code-history');
    thorough.noteSavaTopic('anonymous-use');
    thorough.noteSavaTopic('mara-transaction');
    assert.equal(thorough.completeSava(), true);
    thorough.noteSavaTopic('no-correction');
    assert.equal(thorough.completeSava(), false);
    assert.equal(thorough.snapshot().suspicions.savaLeftTransactionUncorrected, true);
  });

  it('keeps Bosko optional in the queue and lets Nika conclude directly, while optional topics remain recordable', () => {
    const direct = createChapter3OpeningModel({ startAt: 'interaction-08' });
    completeSava(direct);
    assert.equal(direct.askBoskoInQueue(), true);
    assert.equal(direct.completeNika(), true);
    assert.equal(direct.snapshot().evidence.eastboundReservation, 'm-venn-unconfirmed-identity');
    assert.equal(direct.snapshot().suspicions.nikaDiscardedPrintout, true);
    assert.equal(direct.snapshot().phase, 'inspect-discarded-print');

    const thorough = createChapter3OpeningModel({ startAt: 'interaction-08' });
    completeSava(thorough);
    completeNika(thorough);
    assert.equal(thorough.snapshot().phase, 'inspect-discarded-print');
  });

  it('tests every first-theory framing against knowledge boundaries and converges on Bosko', () => {
    for (const theory of ['market-ministry', 'code-cover', 'planned-handoff']) {
      const model = createChapter3OpeningModel({ startAt: 'interaction-08' });
      completeSava(model);
      completeNika(model);
      assert.equal(model.testFirstTheory(theory), false);
      assert.equal(model.inspectDiscardedPrint(), true);
      assert.equal(model.leaveMinistryForTheory(), true);
      assert.equal(model.testFirstTheory(theory), true);
      assert.equal(model.snapshot().phase, 'question-bosko-square');
      assert.equal(model.snapshot().firstTheory, theory);
    }
  });

  it('requires Bosko before the groove inspection and lets the conclusion proceed directly, while optional observations remain recordable', () => {
    const direct = createChapter3OpeningModel({ startAt: 'interaction-08' });
    completeSava(direct);
    completeNika(direct);
    direct.inspectDiscardedPrint();
    direct.leaveMinistryForTheory();
    direct.testFirstTheory('market-ministry');
    assert.equal(direct.observeGroove('rows'), false);
    assert.equal(direct.completeSquareBosko(), true);
    assert.equal(direct.observeGroove('rows'), true);
    assert.equal(direct.concludeGrooves(), false);
    assert.equal(direct.snapshot().interaction14Complete, false);

    const thorough = createChapter3OpeningModel({ startAt: 'interaction-08' });
    completeSava(thorough);
    completeNika(thorough);
    thorough.inspectDiscardedPrint();
    thorough.leaveMinistryForTheory();
    thorough.testFirstTheory('market-ministry');
    thorough.completeSquareBosko();
    assert.equal(thorough.observeGroove('rows'), true);
    assert.equal(thorough.observeGroove('spacing'), true);
    assert.equal(thorough.observeGroove('feed-gap'), true);
    assert.equal(thorough.concludeGrooves(), true);
    assert.equal(thorough.snapshot().phase, 'archive-entrance');
  });

  it('starts the direct #14 playtest at the plaza with every prior suspicion still bounded', () => {
    const model = createChapter3OpeningModel({ startAt: 'interaction-14' });
    const state = model.snapshot();
    assert.equal(state.phase, 'inspect-plaza-grooves');
    assert.equal(state.firstTheoryTested, true);
    assert.equal(state.squareBoskoInterviewed, true);
    assert.equal(state.interaction14Complete, false);
    assert.equal(state.evidence.discardedMaintenancePrint, 'confirmed');
    assert.equal(state.evidence.plazaGrooves, null);
  });

  it('starts direct #15 outside the archive with the complete plaza result', () => {
    const model = createChapter3OpeningModel({ startAt: 'interaction-15' });
    const state = model.snapshot();
    assert.equal(state.phase, 'archive-entrance');
    assert.equal(state.interaction14Complete, true);
    assert.equal(state.archiveEntranceReached, false);
    assert.equal(state.evidence.plazaGrooves, 'two-lines-second-feed-incomplete');
  });

  it('keeps Ana optional and lets Petar conclude directly, while optional topics remain recordable', () => {
    const direct = createChapter3OpeningModel({ startAt: 'interaction-15' });
    assert.equal(direct.enterArchive(), false);
    assert.equal(direct.reachArchiveEntrance(), true);
    assert.equal(direct.enterArchive(), true);
    assert.equal(direct.inspectArchiveMap(), true);
    assert.equal(direct.inspectMaintenanceOrder(), true);
    assert.equal(direct.completePetarInterview(), true);
    assert.equal(direct.inspectMaterialTimeline(), true);
    assert.equal(direct.snapshot().evidence.petarCutBranch, 'confirmed-without-message-knowledge');

    const thorough = createChapter3OpeningModel({ startAt: 'interaction-15' });
    thorough.reachArchiveEntrance();
    thorough.enterArchive();
    thorough.inspectArchiveMap();
    thorough.inspectMaintenanceOrder();
    for (const topic of ['instruction', 'route', 'surface-view', 'cleaning']) {
      assert.equal(thorough.notePetarTopic(topic), true);
    }
    assert.equal(thorough.completePetarInterview(), true);
    assert.equal(thorough.inspectMaterialTimeline(), true);
    const state = thorough.snapshot();
    assert.equal(state.evidence.archiveFeedPlan, 'one-main-feed-one-short-branch');
    assert.equal(state.evidence.maintenanceOrder, 'isolate-unregistered-branch-petar-signed');
    assert.equal(state.suspicions.petarCutBranch, true);
  });

  it('lets the second-theory conclusion proceed directly, while optional theories remain testable', () => {
    const direct = createChapter3OpeningModel({ startAt: 'interaction-21' });
    assert.equal(direct.completeSecondTheory(), true);
    assert.equal(direct.snapshot().phase, 'inspect-cut-interface');

    const thorough = createChapter3OpeningModel({ startAt: 'interaction-21' });
    for (const theory of ['market-coordination', 'municipal-censorship', 'petar-knew-message', 'lev-steered-case']) {
      assert.equal(thorough.testSecondTheory(theory), true);
    }
    assert.equal(thorough.completeSecondTheory(), true);
    assert.equal(thorough.snapshot().phase, 'inspect-cut-interface');
  });

  it('bounds #22 to a reconnectable interface with unknown authorship and requires its physical checks', () => {
    const direct = createChapter3OpeningModel({ startAt: 'interaction-22' });
    assert.equal(direct.concludeCutInterface(), false);
    assert.equal(direct.snapshot().interaction22Complete, false);

    const thorough = createChapter3OpeningModel({ startAt: 'interaction-22' });
    assert.equal(thorough.observeCutInterface('cut'), true);
    assert.equal(thorough.observeCutInterface('placement'), true);
    assert.equal(thorough.observeCutInterface('reconnection'), true);
    assert.equal(thorough.concludeCutInterface(), true);
    const state = thorough.snapshot();
    assert.equal(state.cutInterfaceConclusion, 'reconnectable-ends-prepared-by-unknown-person');
    assert.equal(state.evidence.cutInterface, 'reconnectable-origin-unknown');
  });

  it('starts #23 at the hotel route and lets check-in proceed directly, while optional topics remain recordable', () => {
    const direct = createChapter3OpeningModel({ startAt: 'interaction-23' });
    assert.equal(direct.snapshot().phase, 'enter-copper-heron');
    assert.equal(direct.enterHotel(), true);
    assert.equal(direct.snapshot().clock.time, 'DAY 1 · 18:00');
    assert.equal(direct.completeHotelCheckIn(), true);
    assert.equal(direct.snapshot().phase, 'question-daro');
    assert.equal(direct.snapshot().evidence.hotelRegister, 'blank-line-standing-practice-mara-alone');

    const thorough = createChapter3OpeningModel({ startAt: 'interaction-23' });
    thorough.enterHotel();
    for (const topic of ['register', 'alone', 'departure']) {
      assert.equal(thorough.noteHanaTopic(topic), true);
      assert.equal(thorough.noteHanaTopic(topic), false);
    }
    assert.equal(thorough.completeHotelCheckIn(), true);
    assert.equal(thorough.snapshot().phase, 'question-daro');
  });

  it('ships replaceable full-screen paper slots for archive and hotel evidence', () => {
    const viewer = readFileSync(
      new URL('../../src/cars/presentCity3d/Chapter3EvidenceViewer.js', import.meta.url),
      'utf8',
    );
    const html = readFileSync(new URL('../../car03-3d.html', import.meta.url), 'utf8');
    for (const id of ['archive-feed-plan', 'maintenance-order-c441', 'material-timeline', 'hotel-register', 'hotel-evidence-table']) {
      assert.match(viewer, new RegExp(id));
    }
    assert.match(viewer, /Escape/);
    assert.match(viewer, /PLACEHOLDER ART SLOT/);
    assert.match(html, /aria-modal="true"/);
    assert.match(viewer, /openReference\(documentSpec\)/);
    assert.match(html, /dialogue-reference/);
    assert.match(html, /id="evidence-close"/);
  });

  it('makes Lev initiate both conversations in the playable runtime', () => {
    const runtime = readFileSync(
      new URL('../../src/cars/presentCity3d/Chapter3OpeningRuntime.js', import.meta.url),
      'utf8',
    );
    assert.equal(runtime.includes("id: 'meet-lev'"), false);
    assert.equal(runtime.includes("id: 'follow-lev'"), false);
    assert.match(runtime, /beginLevArrivalApproach\(\)/);
    assert.match(runtime, /this\.preview\.player\.position\.clone\(\)\.sub\(this\.lev\.position\)/);
    assert.match(runtime, /addScaledVector\(towardButch, -1\.5\)/);
    assert.match(runtime, /1\.9,\s+\(\) => this\.openLevIntroduction\(\)/);
    assert.doesNotMatch(runtime, /beginLevArrivalApproach\(\) \{[\s\S]*?this\.lev\.position\.copy\(this\.preview\.player\.position\)/);
    assert.match(runtime, /this\.model\.completeLevIntroduction\(\);\s+this\.beginGuidedWalk\(\);/);
    assert.match(runtime, /this\.guidedWalkActive = true;/);
    assert.match(runtime, /this\.guidedWalkActive = false;\s+this\.preview\.stopWalking\(\);/);
    assert.match(runtime, /beginApproach: \(\) => this\.beginEdaApproach\(\)/);
    assert.match(runtime, /this\.levWalkOnComplete = \(\) => this\.openEda\(\)/);
    assert.match(runtime, /id: 'sava-counter'/);
    assert.match(runtime, /id: 'discarded-maintenance-print'/);
    assert.match(runtime, /id: 'plaza-announcement-grooves'/);
    assert.match(runtime, /id: 'archive-entrance'/);
    assert.match(runtime, /spec\.id === 'archive'\s+&& this\.model\.snapshot\(\)\.interaction14Complete/);
    assert.match(runtime, /id: 'archive-map-table'/);
    assert.match(runtime, /id: 'archive-petar'/);
    assert.match(runtime, /id: 'lev-second-theory'/);
    assert.match(runtime, /id: 'cut-feed-interface'/);
    assert.match(runtime, /id: 'copper-heron-entrance'/);
    assert.match(runtime, /id: 'hotel-register-hana'/);
  });

  it('keeps #24 guests optional and lets Daro conclude directly, while optional topics remain recordable', () => {
    const direct = createChapter3OpeningModel({ startAt: 'interaction-25' });
    assert.equal(direct.snapshot().mode, 'copper-heron-lobby');
    assert.equal(direct.askHotelGuest('irena'), true);
    assert.equal(direct.completeDaro(), true);
    assert.equal(direct.snapshot().evidence.daroSightline, 'mara-alone-hotel-square-station');
    assert.equal(direct.enterHotelCorridor(), true);
    assert.equal(direct.enterHotelRoom(), true);
    assert.equal(direct.testFinalTheory('market-help'), true);

    const thorough = createChapter3OpeningModel({ startAt: 'interaction-25' });
    thorough.askHotelGuest('irena');
    for (const topic of ['position', 'sequence', 'limits']) assert.equal(thorough.noteDaroTopic(topic), true);
    assert.equal(thorough.completeDaro(), true);
    assert.deepEqual(thorough.snapshot().hotelGuestsAsked, ['irena']);
  });

  it('lets the evidence-table conclusion proceed directly, while optional theories and papers remain reviewable', () => {
    const direct = createChapter3OpeningModel({ startAt: 'interaction-26' });
    assert.equal(direct.canReviewEvidenceTable(), true);
    assert.equal(direct.completeEvidenceTable(), true);
    assert.equal(direct.snapshot().evidence.evidenceTable, 'mara-alone-knew-complete-sequence');
    assert.equal(direct.sleepUntilNight(), true);
    assert.equal(direct.snapshot().clock.time, 'DAY 2 · 00:40');

    const thorough = createChapter3OpeningModel({ startAt: 'interaction-26' });
    const theoryPapers = {
      'market-help': 'issue-copy',
      'municipal-cover': 'order-c441',
      'petar-destroyed': 'oil-route',
      'lev-controlled': 'witness-notes',
      'mara-coerced': 'reservation',
    };
    for (const [theory, paper] of Object.entries(theoryPapers)) {
      assert.equal(thorough.testFinalTheory(theory), true);
      assert.equal(thorough.readHotelEvidencePaper(paper), true);
    }
    assert.equal(thorough.completeEvidenceTable(), true);
    assert.equal(thorough.sleepUntilNight(), true);
  });

  it('enforces first fire line, reconnection and second line in order', () => {
    const model = createChapter3OpeningModel({ startAt: 'interaction-27' });
    assert.equal(model.beginNightRoute(), false);
    assert.equal(model.sleepUntilNight(), true);
    assert.equal(model.beginNightRoute(), false);
    assert.equal(model.reachNightLobby(), false);
    assert.equal(model.leaveNightRoom(), true);
    assert.equal(model.reachNightLobby(), true);
    assert.equal(model.beginNightRoute(), true);
    assert.equal(model.reconnectNightFeed(), false);
    assert.equal(model.observeNightFire(), true);
    assert.equal(model.completeNightMessage(), false);
    assert.equal(model.reconnectNightFeed(), true);
    assert.equal(model.completeNightMessage(), true);
    assert.equal(model.beginMorning(), true);
    assert.equal(model.snapshot().clock.time, 'DAY 2 · 06:20');
    assert.equal(model.askHanaAtBreakfast(), false);
    assert.equal(model.reachMorningLobby(), false);
    assert.equal(model.leaveMorningRoom(), true);
    assert.equal(model.reachMorningLobby(), true);
    assert.equal(model.askHanaAtBreakfast(), true);

    const runtime = readFileSync(
      new URL('../../src/cars/presentCity3d/Chapter3OpeningRuntime.js', import.meta.url),
      'utf8',
    );
    const content = readFileSync(
      new URL('../../src/cars/presentCity3d/chapter3FinalContent.js', import.meta.url),
      'utf8',
    );
    assert.match(content, /nightIgnition: true/);
    assert.match(content, /I LEFT BY CHOICE\./);
    assert.match(content, /Those are not the same investigation\./);
    assert.match(runtime, /this\.nightIgnitionElapsed \/ 3\.6/);
    assert.match(runtime, /this\.nightIgnitionElapsed >= 5\.6/);
    assert.match(runtime, /setSecondIgnitionProgress\(this\.nightIgnitionProgress\)/);
    assert.match(runtime, /makeLine\("BUTCH, I'M ALIVE\.\", 0\.2/);
    assert.match(runtime, /makeLine\('I LEFT BY CHOICE\.', 2\.35/);
    assert.match(runtime, /"Marker Felt"/);
    assert.match(runtime, /sourceCanvas.width = 4096/);
    assert.match(runtime, /const tracking = 42/);
    assert.match(runtime, /const outlineRadius = 14/);
    assert.match(runtime, /fireLights: \[firstLight, secondLight\]/);
    assert.match(runtime, /this\.dialogue\.setAdvanceLocked\(true\)/);
    assert.match(runtime, /WATCH THE SECOND LINE IGNITE/);
    // Animated clusters support the dense edge fire without becoming a broad
    // opaque wall that hides the complete handwritten message.
    assert.match(runtime, /flameBand = new THREE\.Group\(\)/);
    assert.match(runtime, /flameAnchors = findStrongGlyphColumns/);
    assert.match(runtime, /sprite\.renderOrder = 7/);
    assert.match(runtime, /heatHaze = new THREE\.Group\(\)/);
    // Text stays above all fire layers.
    assert.match(runtime, /mesh\.renderOrder = 8/);
    assert.match(runtime, /flames\.renderOrder = 5/);
    // Dense, low edge fire follows both complete handwritten rows without an
    // opaque billboard wall covering the lettering.
    assert.match(runtime, /const edgeFireCount = 180/);
    assert.match(runtime, /"Marker Felt"/);
    assert.match(runtime, /this\.preview\.camera\.zoom = 3\.9/);
    assert.doesNotMatch(runtime, /context\.strokeText\(character/);
    assert.match(runtime, /context\.shadowBlur = 0/);
  });

  it('makes every visible guest-room door answer without changing the room route', () => {
    const hall = readFileSync(new URL('../../src/cars/presentCity3d/Chapter3HotelHall.js', import.meta.url), 'utf8');
    const runtime = readFileSync(new URL('../../src/cars/presentCity3d/Chapter3OpeningRuntime.js', import.meta.url), 'utf8');
    assert.match(hall, /const doorZs = \[5\.7, 2\.0, -1\.8, -5\.5\]/);
    assert.match(hall, /butchRoomDoor: \[0, 1\.25, -8\.55\]/);
    assert.match(hall, /new THREE\.BoxGeometry\(0\.2, 2\.8, 15\.2\)/);
    assert.match(hall, /backgroundDoors\.push\(door\)/);
    assert.match(hall, /const paperLayouts = \[/);
    assert.match(runtime, /id: 'hotel-private-room-door'/);
    assert.equal(runtime.includes('hotel-paper-${spec.id}'), false);
    assert.match(runtime, /onLineChange: \(line\) =>/);
    assert.match(runtime, /this\.evidenceViewer\.openReference\(documentSpec\)/);
    assert.match(runtime, /this\.hotelHall\.corridorGroup\.visible = upperFloor/);
    assert.match(runtime, /this\.hotelHall\.roomGroup\.visible = upperFloor/);
    assert.match(runtime, /id: 'hotel-night-room-door'/);
    assert.match(runtime, /id: 'hotel-night-corridor-stairs'/);
    assert.match(runtime, /id: 'hotel-night-exit'/);
    assert.match(runtime, /id: 'hotel-morning-exit'/);
    assert.match(runtime, /!this\.model\.snapshot\(\)\.morningStarted/);
    assert.match(hall, /lobbyStairArrival: \[-0\.15, 0\.5, 1\.15\]/);
    assert.match(runtime, /this\.switchHotelArea\('lobby', \{ arrival: 'stairs' \}\)/);
    assert.equal(runtime.includes('if (!interaction && state.nightRouteStarted && !state.nightMessageComplete) return true;'), false);
    assert.match(runtime, /id: `hotel-background-room-door-\$\{index \+ 1\}`/);
    assert.match(runtime, /Some of us work nights\. Knock softer\./);
    assert.match(runtime, /this\.hotelArea === 'corridor' && \(!state\.slept \|\| state\.morningStarted\)/);
    const model = createChapter3OpeningModel({ startAt: 'hotel-corridor-qa' });
    assert.equal(model.snapshot().mode, 'copper-heron-corridor');
    assert.equal(model.snapshot().hotelCorridorEntered, true);
    assert.equal(model.snapshot().hotelRoomEntered, false);
    assert.equal(model.enterHotelRoom(), true);

    const nightLobby = createChapter3OpeningModel({ startAt: 'night-lobby-qa' }).snapshot();
    assert.equal(nightLobby.clock.time, 'DAY 2 · 00:40');
    assert.equal(nightLobby.nightRoomLeft, true);
    assert.equal(nightLobby.nightLobbyReached, true);
    assert.equal(nightLobby.nightRouteStarted, false);

    const nightExterior = createChapter3OpeningModel({ startAt: 'night-exterior-qa' }).snapshot();
    assert.equal(nightExterior.mode, 'central-square-night');
    assert.equal(nightExterior.nightRouteStarted, true);

    const nightFire = createChapter3OpeningModel({ startAt: 'interaction-29' }).snapshot();
    assert.equal(nightFire.nightRoomLeft, true);
    assert.equal(nightFire.nightLobbyReached, true);
  });

  it('restores the pre-hotel camera constraints when returning outside', () => {
    const runtime = readFileSync(
      new URL('../../src/cars/presentCity3d/Chapter3OpeningRuntime.js', import.meta.url),
      'utf8',
    );
    const preview = readFileSync(
      new URL('../../src/cars/presentCity3d/EchoCity3DPreview.js', import.meta.url),
      'utf8',
    );
    assert.match(runtime, /this\.hotelCameraStateBefore \?\?=/);
    assert.match(runtime, /this\.preview\.controls\.minZoom = this\.hotelCameraStateBefore\.minZoom/);
    assert.match(runtime, /this\.preview\.renderer\.domElement\.style\.transform = this\.hotelCameraStateBefore\.canvasTransform/);
    assert.match(runtime, /this\.hotelCameraStateBefore = null/);
    assert.match(preview, /const eastThresholdMaxX = subject\.x > CAMERA_FOLLOW\.bounds\.maxX/);
  });

  it('crossfades the complete nine-cue Chapter 3 score at narrative boundaries', () => {
    const runtime = readFileSync(
      new URL('../../src/cars/presentCity3d/Chapter3OpeningRuntime.js', import.meta.url),
      'utf8',
    );
    assert.match(runtime, /arrival: \{ src: 'assets\/music\/ch3\/3\.1_satie_gnossienne_no1\.mp3'/);
    assert.match(runtime, /market: \{ src: 'assets\/music\/ch3\/3\.2_dvorak_humoresque_no7\.mp3'/);
    assert.match(runtime, /ministry: \{ src: 'assets\/music\/ch3\/3\.3_sousa_washington_post_march\.mp3'/);
    assert.match(runtime, /square: \{ src: 'assets\/music\/ch3\/3\.4_beethoven_pathetique_mvt2\.mp3'/);
    assert.match(runtime, /archive: \{ src: 'assets\/music\/ch3\/3\.5_beethoven_moonlight_mvt1\.mp3'/);
    assert.match(runtime, /dusk: \{ src: 'assets\/music\/ch3\/3\.6_chopin_prelude_op28_no4\.mp3'/);
    assert.match(runtime, /hotel: \{ src: 'assets\/music\/ch3\/3\.7_chopin_nocturne_op27_no2\.mp3'/);
    assert.match(runtime, /burning: \{ src: 'assets\/music\/ch3\/3\.8_beethoven_sym7_mvt2_allegretto_cello\.mp3'/);
    assert.match(runtime, /morning: \{ src: 'assets\/music\/ch3\/3\.9_dvorak_new_world_largo\.mp3'/);
    assert.match(runtime, /if \(state\.marketLeadComplete && this\.postOlekScoreReady\) cue = 'market'/);
    assert.match(runtime, /this\.beginPostOlekScoreTransition\(\)/);
    assert.match(runtime, /music\.stop\(\{ fade: C3_MUSIC\.arrival\.outFade \}\)/);
    assert.match(runtime, /POST_OLEK_SCORE_SILENCE_SECONDS = 2\.2/);
    assert.match(runtime, /if \(state\.morningStarted\) cue = 'morning'/);
  });

  it('routes outdoor NPCs around world obstacles and validates archive furniture segments', () => {
    const runtime = readFileSync(
      new URL('../../src/cars/presentCity3d/Chapter3OpeningRuntime.js', import.meta.url),
      'utf8',
    );
    assert.match(runtime, /route\.navPath = findPath\(route\.host\.position, target, this\.preview\.boundaryObstacles\)/);
    assert.match(runtime, /archiveNpcSegmentIsClear\(route\.host\.position, target\)/);
    assert.match(runtime, /route\.navPath = findPath\(this\.cartObject\.position, target, obstacles\)/);
  });

  it('makes ministry/archive/hotel furniture solid and stops every dialogue participant immediately', () => {
    const runtime = readFileSync(
      new URL('../../src/cars/presentCity3d/Chapter3OpeningRuntime.js', import.meta.url),
      'utf8',
    );
    const hotelNavigation = readFileSync(
      new URL('../../src/cars/presentCity3d/chapter3HotelNavigation.js', import.meta.url),
      'utf8',
    );
    assert.match(runtime, /const MINISTRY_FURNITURE_OBSTACLES/);
    assert.match(runtime, /function findInteriorPath\(start, requestedTarget, bounds, obstacles\)/);
    assert.match(runtime, /path = findInteriorPath\([\s\S]*MINISTRY_FURNITURE_OBSTACLES/);
    assert.match(runtime, /path = findInteriorPath\([\s\S]*ARCHIVE_FURNITURE_OBSTACLES/);
    assert.match(hotelNavigation, /const HOTEL_LOBBY_FURNITURE_OBSTACLES/);
    assert.match(hotelNavigation, /const HOTEL_ROOM_FURNITURE_OBSTACLES/);
    assert.match(runtime, /this\.insideHotel && this\.hotelArea === 'lobby'/);
    assert.match(runtime, /HOTEL_LOBBY_FURNITURE_OBSTACLES/);
    assert.match(runtime, /HOTEL_ROOM_FURNITURE_OBSTACLES/);
    assert.match(runtime, /'alley-men': \['alley-gangster-a', 'alley-gangster-b'\]/);
    assert.match(runtime, /this\.characters\.play\(id, 'idle', \{ immediate: true \}\)/);
    assert.match(runtime, /if \(this\.activeNpcConversationIds\.has\(id\)\)/);
    assert.match(runtime, /if \(!this\.morningLevFollowing \|\| this\.dialogue\.active/);
    assert.match(runtime, /this\.morningLevMovedThisFrame/);
    assert.match(runtime, /updateArchiveLevFollow\(dt\)/);
    assert.match(runtime, /distance <= 1\.55/);
    assert.match(runtime, /toma: \{ points: \[\[0, 0\]\], actions: \['idle', 'investigate'\], fixed: true \}/);
  });

  it('shows the hold-Tab interaction highlight tip after Olek sends the player to the Ministry', () => {
    const runtime = readFileSync(
      new URL('../../src/cars/presentCity3d/Chapter3OpeningRuntime.js', import.meta.url),
      'utf8',
    );
    assert.match(runtime, /onComplete: \(\) => \{[\s\S]*?beginPostOlekScoreTransition\(\)[\s\S]*?showLeadCard\(POST_OLEK_INTERACTION_HINT\)/);
    assert.match(runtime, /EXPLORATION TIP · HOLD TAB/);
    assert.match(runtime, /Hold TAB to highlight every object and person you can interact with\./);
    assert.match(runtime, /if \(event\.key === 'Tab'\)[\s\S]*?this\.tabHeld = true[\s\S]*?this\.updateOutlines\(\)/);
    assert.equal([...runtime.matchAll(/showLeadCard\(POST_OLEK_INTERACTION_HINT\)/g)].length, 1,
      'the tip has exactly one trigger: Olek dialogue completion');
  });

  it('guides every distant chapter destination and keeps hotel guests seated', () => {
    const runtime = readFileSync(new URL('../../src/cars/presentCity3d/Chapter3OpeningRuntime.js', import.meta.url), 'utf8');
    const content = readFileSync(new URL('../../src/cars/presentCity3d/chapter3OpeningContent.js', import.meta.url), 'utf8');
    const hall = readFileSync(new URL('../../src/cars/presentCity3d/Chapter3HotelHall.js', import.meta.url), 'utf8');
    for (const id of ['transport-entrance', 'archive-entrance', 'copper-heron-entrance', 'sunrise-overlook-trail', 'night-burning-message']) {
      assert.match(runtime, new RegExp(`['"]${id}['"]`));
    }
    assert.match(runtime, /updateGuidanceHighlightPulse\(\)/);
    assert.match(runtime, /id: 'find-hotel'[\s\S]*hintAfter: 75,[\s\S]*follow: false/);
    assert.match(content, /'find-hotel'/);
    assert.match(content, /speaker: 'SYSTEM'/);
    assert.match(runtime, /irena: \{ points: \[\[0, 0\]\], actions: \['sit'\], fixed: true/);
    assert.match(runtime, /vesna: \{ points: \[\[0, 0\]\], actions: \['sit'\], fixed: true/);
    assert.match(runtime, /daro: \{ points: \[\[0, 0\]\], actions: \['sit'\], fixed: true/);
    assert.match(hall, /irena: \[-1\.98, 0, 0\.84\]/);
  });

  it('keeps world affordances separate from plot eligibility', () => {
    const runtime = readFileSync(
      new URL('../../src/cars/presentCity3d/Chapter3OpeningRuntime.js', import.meta.url),
      'utf8',
    );
    const content = readFileSync(
      new URL('../../src/cars/presentCity3d/chapter3OpeningContent.js', import.meta.url),
      'utf8',
    );
    const html = readFileSync(new URL('../../car03-3d.html', import.meta.url), 'utf8');
    assert.match(content, /Official inquiry\?/);
    assert.match(content, /No\. Personal\. Mara disappeared\./);
    assert.match(runtime, /PERIMETER_BUILDINGS\.filter\(\(entry\) => entry\.tier !== 'backdrop' && entry\.id !== 'copper-heron-hotel'\)/);
    assert.match(runtime, /world-object-\$\{spec\.id\}/);
    assert.match(runtime, /world-building-\$\{spec\.id\}/);
    assert.match(runtime, /isWalkable\(candidate\.x, candidate\.z, this\.preview\.boundaryObstacles\)/);
    assert.match(runtime, /makePreservingObjectHighlight\(building\)/);
    assert.match(runtime, /this\.ambientUseCounts/);
    assert.match(runtime, /const LAMP_COPY = Object\.freeze/);
    assert.match(runtime, /const MAILBOX_COPY = Object\.freeze/);
    assert.match(runtime, /text: copy\[repeated \? 2 : 1\]/);
    assert.doesNotMatch(runtime, /inspectFromRange/);
    assert.match(runtime, /if \(alreadyAtApproach\) \{/);
    assert.match(runtime, /const visible = new Set\(/);
    assert.match(runtime, /outline\.visible = visible\.has\(outline\)/);
    assert.match(runtime, /classList\.toggle\('interaction-hover'/);
    assert.match(html, /canvas\.interaction-hover \{ cursor: pointer; \}/);
  });

  it('requires the physical morning traces while leaving the final dialogue topics optional', () => {
    const direct = createChapter3OpeningModel({ startAt: 'interaction-31' });
    assert.equal(direct.leaveMorningRoom(), true);
    assert.equal(direct.reachMorningLobby(), true);
    assert.equal(direct.collectMorningReservation(), true);
    assert.equal(direct.noticeMorningFire(), true);
    assert.equal(direct.confirmMorningEvidence(), false);
    assert.equal(direct.snapshot().mode, 'morning-overlook-route');
    assert.equal(direct.completeLevFinal(), false);

    const thorough = createChapter3OpeningModel({ startAt: 'interaction-31' });
    thorough.leaveMorningRoom();
    thorough.reachMorningLobby();
    thorough.collectMorningReservation();
    thorough.noticeMorningFire();
    for (const observation of ['scorch', 'connector', 'ash']) assert.equal(thorough.observeMorningEvidence(observation), true);
    assert.equal(thorough.confirmMorningEvidence(), true);
    thorough.startSunriseClimb();
    thorough.completeSunriseView();
    thorough.returnFromSunrise();
    for (const topic of ['message', 'methods', 'eastbound']) assert.equal(thorough.noteFinalTimelineTopic(topic), true);
    assert.equal(thorough.completeLevFinal(), true);
    assert.equal(thorough.snapshot().clock.time, 'DAY 2 · 07:05');

    const runtime = readFileSync(new URL('../../src/cars/presentCity3d/Chapter3OpeningRuntime.js', import.meta.url), 'utf8');
    const content = readFileSync(new URL('../../src/cars/presentCity3d/chapter3FinalContent.js', import.meta.url), 'utf8');
    assert.match(runtime, /id: 'lev-morning-companion'/);
    assert.match(runtime, /MORNING_LEV_EXTERIOR_START = Object\.freeze\(\[48\.2, 0\.5, -11\.0\]\)/);
    assert.match(runtime, /startMorningLevFollow\(\)/);
    assert.match(runtime, /updateMorningLevFollow\(dt\)/);
    assert.match(runtime, /this\.morningLevTrail/);
    assert.match(runtime, /approach: \(\) => this\.morningLevApproach\(\)/);
    assert.match(runtime, /id: 'morning-original-reservation'/);
    assert.match(runtime, /id: 'sunrise-overlook-trail'/);
    assert.match(runtime, /id: 'sunrise-overlook-bench'/);
    assert.match(runtime, /id: 'sunrise-overlook-return'/);
    assert.match(runtime, /updateSunriseOverlook\(dt\)/);
    assert.match(runtime, /updateMorningRouteInterruption\(\)/);
    assert.match(runtime, /Compare the fire with Lev’s reservation/);
    assert.doesNotMatch(runtime, /this\.lev\.position\.set\(-6\.5, 0\.5, 28\.2\)/);
    assert.match(content, /I am coming with you/);
    assert.match(content, /The public terminal shortens handwritten names/);
    assert.match(content, /five minutes in which nobody asks either of us a question/);
    assert.match(content, /Lev stands beside the burned grooves/);
  });

  it('keeps the train door hidden until boarding and gives the chapter a visible end card', () => {
    const runtime = readFileSync(new URL('../../src/cars/presentCity3d/Chapter3OpeningRuntime.js', import.meta.url), 'utf8');
    assert.match(runtime, /outline: this\.finalTrainOutline/);
    assert.doesNotMatch(runtime, /if \(initial\.levFinalComplete\) \{\s*this\.finalDoor\.group\.visible = true/);
    assert.equal((runtime.match(/this\.finalDoor\.group\.visible = true/g) || []).length, 1);
    assert.match(runtime, /CHAPTER 03 COMPLETE/);
    assert.match(runtime, /next\.chapterComplete.*chapterEndCard/);
  });

  it('keeps continuation attitude separate from the fixed solo departure choreography', () => {
    for (const attitude of ['need-reason', 'safety', 'cannot-stop']) {
      const model = createChapter3OpeningModel({ startAt: 'interaction-33' });
      assert.equal(model.chooseContinuationAttitude(attitude), true);
      assert.equal(model.boardTrain(), true);
      model.advanceDeparture(4999);
      assert.equal(model.snapshot().phase, 'door-relay');
      model.advanceDeparture(1);
      assert.equal(model.snapshot().phase, 'door-closing');
      model.advanceDeparture(4000);
      assert.equal(model.snapshot().phase, 'door-latch');
      model.advanceDeparture(2200);
      assert.equal(model.snapshot().phase, 'train-moving');
      model.advanceDeparture(10400);
      assert.equal(model.snapshot().phase, 'black-audio-tail');
      assert.equal(model.snapshot().blackout, true);
      model.advanceDeparture(2000);
      assert.equal(model.snapshot().chapterComplete, true);
      assert.equal(model.snapshot().audioSilent, true);
    }
  });

  it('ships a single-Mara ending route with the exact two ground messages', () => {
    const content = readFileSync(new URL('../../src/cars/presentCity3d/chapter3FinalContent.js', import.meta.url), 'utf8');
    const runtime = readFileSync(new URL('../../src/cars/presentCity3d/Chapter3OpeningRuntime.js', import.meta.url), 'utf8');
    assert.match(runtime, /BUTCH, I'M ALIVE\./);
    assert.match(runtime, /I LEFT BY CHOICE\./);
    assert.match(runtime, /maraPresent: false/);
    assert.doesNotMatch(`${content}\n${runtime}`, /two Maras|second Mara|Mara double/i);
    for (const id of ['hotel-daro-window', 'hotel-evidence-table', 'night-burning-message', 'morning-fire-evidence', 'lev-final-reconstruction', 'eastbound-train']) {
      assert.match(runtime, new RegExp(`id: '${id}'`));
    }
  });

  it('uses a dialogue-bound oil tableau instead of a literal 3D sunrise disc', () => {
    const html = readFileSync(new URL('../../car03-3d.html', import.meta.url), 'utf8');
    const runtime = readFileSync(new URL('../../src/cars/presentCity3d/Chapter3OpeningRuntime.js', import.meta.url), 'utf8');
    assert.match(html, /id="sunrise-tableau"/);
    assert.match(html, /ch03-sunrise-overlook-oil-v1\.png/);
    assert.match(runtime, /onComplete: \(\) => this\.completeSunriseView\(\)/);
    assert.match(runtime, /showSunriseTableau\(\)/);
    assert.doesNotMatch(runtime, /sunrise-disc-placeholder|SphereGeometry\(1\.35/);
  });

  it('keeps the dusk campfire gathering optional and outside evidence state', () => {
    const model = createChapter3OpeningModel({ startAt: 'dusk-campfire-qa' });
    const before = model.snapshot();
    assert.equal(before.clock.period, 'DUSK');
    model.advanceDialogueTime('campfire-rada', 2);
    const after = model.snapshot();
    assert.equal(after.clock.minuteOfDay - before.clock.minuteOfDay, 2);
    assert.deepEqual(after.evidence, before.evidence);

    const runtime = readFileSync(new URL('../../src/cars/presentCity3d/Chapter3OpeningRuntime.js', import.meta.url), 'utf8');
    for (const id of ['campfire-rada', 'campfire-miro', 'campfire-seline', 'campfire-kettle']) {
      assert.match(runtime, new RegExp(`id: '${id}'`));
    }
  });
});
