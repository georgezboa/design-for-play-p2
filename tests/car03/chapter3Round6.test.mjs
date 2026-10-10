import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

import {
  TICKET_IDS,
  TICKET_PROOF_IDS,
  createChapter3OpeningModel,
  ticketProofVerdict,
} from '../../src/cars/presentCity3d/chapter3OpeningModel.js';
import {
  CHAPTER3_OBJECTIVES,
  NIKA_CONCLUSION,
  OPENING_POSITIONS,
  SCANNER_FIELDS,
  TICKET_BOARD_CARDS,
  TICKET_BOARD_HINTS,
  TICKET_BOARD_TEXT,
} from '../../src/cars/presentCity3d/chapter3OpeningContent.js';
import {
  TICKET_HINT_DELAYS,
  ticketBoardGuidance,
  ticketBoardHint,
  ticketBoardHintStep,
  ticketHintTierDue,
} from '../../src/cars/presentCity3d/Chapter3TicketBoard.js';
import {
  LEV_ENTRANCE,
  MARA_GLIMPSE,
  approachSpeed,
  besideTarget,
  dampYaw,
  gaitForSpeed,
  pointAlongPolyline,
  polylineLength,
  turnToward,
  wrapAngle,
} from '../../src/cars/presentCity3d/chapter3Entrance.js';
import { CHAPTER_CONTROLS } from '../../src/shell/chapterControls.js';
import { CONTROLS_HINT_SEGMENTS } from '../../src/cars/presentCity3d/chapter3Guidance.js';

// Round 6 (2026-10-07, agent ch3a): owner note G5 (the opening's entrance
// animation) and ChatGPT playtest items 8, 9 and 18 for Chapter 3.
const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const board = read('src/cars/presentCity3d/Chapter3TicketBoard.js');
const runtime = read('src/cars/presentCity3d/Chapter3OpeningRuntime.js');
const characters = read('src/cars/presentCity3d/Chapter3AnimatedCharacters.js');
const preview = read('src/cars/presentCity3d/EchoCity3DPreview.js');
const css = read('src/cars/presentCity3d/chapter3Release.css');

const boardState = (model) => model.snapshot().ticketBoard;

describe('Chapter 3 round 6 · Ticket 43 is the player\'s deduction (item 8)', () => {
  // Round 11 (George: stuck at the proof, "I don't know what to do next")
  // supersedes the board half of this: the board's line is now a task line
  // naming the next operation (tests/car03/chapter3Round11Board.test.mjs).
  // It still never names the answer; the task card keeps the question.
  it('asks how the two tickets are related on the task card; the board never names the answer', () => {
    assert.equal(CHAPTER3_OBJECTIVES.fileTickets, 'FIND OUT HOW THE TWO TICKETS ARE RELATED');
    assert.match(TICKET_BOARD_TEXT.question, /How are the two tickets related\?/);
    const model = createChapter3OpeningModel({ startAt: 'ticket-board' });
    const seen = new Set();
    const look = () => seen.add(ticketBoardGuidance(boardState(model)).text);
    look();
    model.seeTicketThroughLens('ticket-velez'); look();
    model.seeTicketThroughLens('ticket-venn'); look();
    model.stackTickets(true); look();
    model.beginTicketFiling(); look();
    assert.ok([...seen][0].startsWith(TICKET_BOARD_TEXT.question), 'the board opens on the question');
    for (const text of seen) assert.doesNotMatch(text, /one person|one passenger|1978-0412|VE\s*·\s*NN/i);
  });

  it('lets the player stack and punch in any order; the board then asks what the stack is', () => {
    const model = createChapter3OpeningModel({ startAt: 'ticket-board' });
    assert.equal(ticketBoardGuidance(boardState(model)).canPunch, false, 'no punch before a stack');
    assert.equal(model.beginTicketFiling(), false);
    model.stackTickets(true);
    assert.equal(ticketBoardGuidance(boardState(model)).canPunch, true, 'a stack offers the punch before any lens check');
    assert.equal(model.beginTicketFiling(), true);
    assert.equal(ticketBoardGuidance(boardState(model)).canPunch, false, 'the punch is down while the board asks');
    assert.equal(model.cancelTicketFiling(), true, 'NOT YET puts the filing off');
    assert.equal(model.beginTicketFiling(), true);
  });

  it('answers TWO PASSENGERS with the evidence, and takes ONE PASSENGER', () => {
    const model = createChapter3OpeningModel({ startAt: 'ticket-board' });
    assert.deepEqual(model.concludeTickets('one'), { accepted: false, reason: 'not-filing' });
    model.stackTickets(true);
    model.beginTicketFiling();
    assert.deepEqual(model.concludeTickets('two'), { accepted: false, reason: 'unchecked' });
    model.seeTicketThroughLens('ticket-velez');
    model.seeTicketThroughLens('ticket-venn');
    assert.deepEqual(model.concludeTickets('two'), { accepted: false, reason: 'same-claim' });
    assert.equal(boardState(model).conclusion, null);
    for (const reason of ['unchecked', 'same-claim']) assert.match(TICKET_BOARD_TEXT.refuse[reason], /^LEV · /);
    assert.deepEqual(model.concludeTickets('one'), { accepted: true, reason: null });
    assert.equal(boardState(model).conclusion, 'one');
  });

  it('files one passenger only on proof: both 1978 records and the duplicate rule', () => {
    const model = createChapter3OpeningModel({ startAt: 'ticket-board' });
    model.stackTickets(true);
    model.beginTicketFiling();
    assert.equal(model.pinTicketProof('terminal-note').reason, 'not-proving', 'pins wait for a conclusion');
    model.concludeTickets('one');
    const verdict = () => ticketProofVerdict(boardState(model));
    assert.equal(verdict().problem, 'no-records');
    // A ticket stands for its 1978 record: unread, it proves nothing.
    assert.deepEqual(model.pinTicketProof('ticket-velez'), { pinned: false, changed: false, reason: 'unchecked' });
    model.seeTicketThroughLens('ticket-velez');
    assert.equal(model.pinTicketProof('ticket-velez').pinned, true);
    assert.equal(verdict().problem, 'one-record');
    assert.equal(model.punchTickets(), false);
    model.seeTicketThroughLens('ticket-venn');
    model.pinTicketProof('ticket-venn');
    assert.equal(verdict().problem, 'no-rule', 'one claim is not yet why it says VENN');
    model.pinTicketProof('terminal-note');
    assert.equal(verdict().valid, true);
    // The oil receipt names a seat, not a person: its pin is refused on the
    // spot (round 11; it used to stay pinned until FILE refused the proof).
    assert.deepEqual(model.pinTicketProof('market-sale'), { pinned: false, changed: false, reason: 'not-proof' });
    assert.equal(verdict().valid, true);
    // A pin comes back out.
    assert.equal(model.pinTicketProof('terminal-note').changed, true);
    assert.equal(verdict().problem, 'no-rule');
    model.pinTicketProof('terminal-note');
    // The claim card agrees and may stay.
    model.pinTicketProof('claim-card');
    assert.equal(verdict().valid, true);
    assert.equal(model.proofVerdict().valid, true);
    assert.equal(model.punchTickets(), true);
    assert.equal(boardState(model).punched, true);
    assert.equal(model.snapshot().evidence.duplicateTicket, 'venn-is-the-duplicate-of-velez-claim-1978-0412');
    assert.equal(model.completeTicketBoard(), true);
    for (const problem of ['no-records', 'one-record', 'no-rule', 'not-proof']) assert.ok(TICKET_BOARD_TEXT.refuse[problem], problem);
  });

  it('uses every paper on the table: the rule card, the claim card and the oil receipt each answer', () => {
    assert.deepEqual([...TICKET_PROOF_IDS].sort(), TICKET_BOARD_CARDS.map((card) => card.id).sort());
    const note = TICKET_BOARD_CARDS.find((card) => card.id === 'terminal-note').lines.join(' ');
    assert.match(note, /two letters, then NN/);
    assert.match(note, /ARDIN → AR · NN/, 'a worked example that is not the answer');
    assert.doesNotMatch(note, /VE\s*·\s*NN/);
    assert.ok(!NIKA_CONCLUSION.some((line) => /VE, NN|^Venn\.$/.test(line.text)), 'nobody says the answer before the board');
    assert.match(TICKET_BOARD_TEXT.claimAgrees, /claim card/);
    assert.match(TICKET_BOARD_TEXT.refuse['not-proof'], /oil/);
  });

  it('replays to the market through the real filing (QA start and resume)', () => {
    const model = createChapter3OpeningModel({ startAt: 'market' });
    const state = model.snapshot();
    assert.equal(state.ticketBoardComplete, true);
    assert.equal(state.ticketBoard.conclusion, 'one');
    assert.deepEqual([...state.ticketBoard.proofs].sort(), [...TICKET_IDS, 'terminal-note'].sort());
  });

  it('teaches each operation on first contact, not the solution chain', () => {
    const affordances = Object.values(TICKET_BOARD_TEXT.affordances).join(' ');
    assert.match(affordances, /DRAG/);
    assert.match(affordances, /PUNCH THE STACK/);
    assert.doesNotMatch(affordances, /BOTH TICKETS|ONE PASSENGER|1978-0412/);
    assert.match(board, /showAffordance\('lens', this\.lensElement, \{ hold: true \}\)/);
    assert.match(board, /this\.stackTag\.hidden = !guidance\.canPunch;/);
    assert.doesNotMatch(board, /TICKET_BOARD_STEPS|First, drag the 1978 lens over both tickets/);
    // The pause card lists the operations, never their order.
    const rows = Object.fromEntries(CHAPTER_CONTROLS.echoCity);
    assert.doesNotMatch(rows['TICKET BOARD'], /BOTH TICKETS|STACK THEM/);
    assert.match(rows['TICKET BOARD'], /H HINT/);
  });
});

describe('Chapter 3 round 6 · tiered hints on the board (item 8)', () => {
  it('names the stuck point from the board state', () => {
    const model = createChapter3OpeningModel({ startAt: 'ticket-board' });
    const step = () => ticketBoardHintStep(boardState(model));
    assert.equal(step(), 'lens');
    model.seeTicketThroughLens('ticket-velez');
    assert.equal(step(), 'lensOne');
    model.seeTicketThroughLens('ticket-venn');
    assert.equal(step(), 'stack');
    model.stackTickets(true);
    assert.equal(step(), 'stack', 'stacked but not punched');
    model.beginTicketFiling();
    assert.equal(step(), 'conclude');
    model.concludeTickets('two');
    assert.equal(step(), 'conclude');
    model.concludeTickets('one');
    // Round 11: proving is three stuck points.
    assert.equal(step(), 'proveRecords');
    model.pinTicketProof('ticket-velez');
    assert.equal(step(), 'proveRecords', 'one record of two');
    model.pinTicketProof('ticket-venn');
    assert.equal(step(), 'proveRule');
    model.pinTicketProof('terminal-note');
    assert.equal(step(), 'proveFile');
    model.punchTickets();
    assert.equal(step(), null);
    // Proving before the lens has read both tickets.
    const early = createChapter3OpeningModel({ startAt: 'ticket-board' });
    early.stackTickets(true);
    early.beginTicketFiling();
    early.concludeTickets('one');
    assert.equal(ticketBoardHintStep(boardState(early)), 'proveUnchecked');
  });

  it('shows nothing by default, then a nudge, a pointer and the explicit step', () => {
    assert.deepEqual([...TICKET_HINT_DELAYS], [35, 70, 110]);
    assert.equal(ticketHintTierDue(0), 0);
    assert.equal(ticketHintTierDue(34.9), 0);
    assert.equal(ticketHintTierDue(35), 1);
    assert.equal(ticketHintTierDue(70), 2);
    assert.equal(ticketHintTierDue(500), 3);
    assert.equal(ticketBoardHint('lens', 0), null);
    for (const [step, lines] of Object.entries(TICKET_BOARD_HINTS)) {
      assert.equal(lines.length, 3, step);
      assert.equal(ticketBoardHint(step, 1), lines[0]);
      assert.match(lines[0], /^LEV · /, `${step}: tier 1 is Lev's nudge`);
      assert.match(lines[1], /^LEV · /, `${step}: tier 2 is Lev's pointer`);
      assert.match(lines[2], /^HINT · /, `${step}: tier 3 is the plain step`);
      assert.equal(ticketBoardHint(step, 9), lines[2]);
    }
    // Tier 1 never gives the operation away; tier 3 always does.
    assert.doesNotMatch(TICKET_BOARD_HINTS.lens[0], /lens|drag/i);
    assert.doesNotMatch(TICKET_BOARD_HINTS.stack[0], /lay|drag|punch/i);
    assert.doesNotMatch(TICKET_BOARD_HINTS.conclude[0], /one passenger/i);
    assert.match(TICKET_BOARD_HINTS.lens[2], /Drag the 1978 lens/);
    assert.match(TICKET_BOARD_HINTS.stack[2], /PUNCH THE STACK/);
    assert.match(TICKET_BOARD_HINTS.conclude[2], /ONE PASSENGER, PRINTED TWICE/);
    assert.match(TICKET_BOARD_HINTS.proveRule[2], /terminal note/);
  });

  it('runs on the shared hint clock, escalates on H and restarts on progress', () => {
    assert.match(board, /tickHintClock\(this\.hint\.clock, dt, now\)/);
    assert.match(board, /const due = ticketHintTierDue\(elapsed, ticketHintDelays\(step\)\);\n\s+if \(due > this\.hint\.tier\) this\.showHint\(due\);/);
    assert.match(board, /if \(event\.code === 'KeyH'\) \{\n\s+stop\(\);\n\s+this\.requestHint\(\);/);
    assert.match(board, /this\.showHint\(Math\.min\(3, current \+ 1\)\)/);
    assert.match(board, /this\.hint\.clock = createHintClock\(\);/);
  });
});

describe('Chapter 3 round 6 · the 1978 findings stay on the tickets (item 9)', () => {
  it('leaves a 1978 · CHECKED mark that expands to the record, and a tray for both', () => {
    assert.equal(TICKET_BOARD_TEXT.checkedMark, '1978 · CHECKED');
    assert.match(board, /el\('button', 'c3-card__mark'/);
    assert.match(board, /mark\.append\(recordSlip\(spec, 'c3-card__record'\)\)/);
    assert.match(board, /this\.recordsTray = el\('div', 'c3-board__records'\)/);
    assert.match(board, /this\.keepRecord\(id, !this\.recordsHidden\.has\(id\)\);/);
    // Hover / focus expands the mark; the tray lays the two side by side.
    assert.match(css, /\.c3-card__mark:hover \.c3-card__record, \.c3-card__mark:focus-visible \.c3-card__record \{ opacity: 1; \}/);
    assert.match(css, /\.c3-board__records-row \{ display: flex;/);
  });

  it('sizes the marks and records with TEXT SIZE', () => {
    for (const selector of ['.c3-card__mark', '.c3-record__stamp', '.c3-record__title', '.c3-record__line', '.c3-board__file-question', '.c3-board__file-reply']) {
      const rule = css.slice(css.indexOf(`${selector} {`));
      assert.match(rule.slice(0, rule.indexOf('}')), /var\(--nf-scale\)/, selector);
    }
    // Readable at 1280 x 720: the record's claim line is 18 px at 1x.
    assert.match(css, /\.c3-record__title \{ margin: 0 0 3px; font: 700 calc\(18px \* var\(--nf-scale\)\)/);
  });
});

describe('Chapter 3 round 6 · unified controls (item 18)', () => {
  it('acts on E / Enter, never shows Space, walks on WASD outside the scanners too', () => {
    const rows = Object.fromEntries(CHAPTER_CONTROLS.echoCity);
    assert.doesNotMatch(Object.values(rows).join(' '), /SPACE/);
    assert.match(rows['BOARD BY KEYS'], /E \/ ENTER/);
    assert.match(rows.WALK, /WASD/);
    assert.match(CONTROLS_HINT_SEGMENTS[0].html, /WASD/);
    assert.match(board, /const confirm = key === 'Enter' \|\| event\.code === 'KeyE' \|\| key === ' ';/);
    assert.match(runtime, /updateKeyWalk\(dt\) \{/);
    assert.match(runtime, /if \(!this\.keysHeld\.size \|\| this\.activeField\(\) \|\| this\.interactionLocked\(\)\) return;/);
  });
});

describe('Chapter 3 round 6 · the opening entrance (owner note G5)', () => {
  // Simulates a walker stepping toward a stop `distance` metres away.
  const simulate = (distance, cruise) => {
    let speed = 0;
    let left = distance;
    let time = 0;
    let peak = 0;
    const dt = 1 / 60;
    while (left > 0.02 && time < 30) {
      speed = approachSpeed(speed, left, { cruise, accel: LEV_ENTRANCE.accel, decel: LEV_ENTRANCE.decel, dt });
      left -= speed * dt;
      peak = Math.max(peak, speed);
      time += dt;
    }
    return { time, peak, endSpeed: speed };
  };

  it('walks Lev over at a walking pace and settles him (was 6.3 m in 1.9 s, ~5 m/s)', () => {
    const walk = simulate(5.4, LEV_ENTRANCE.walkSpeed);
    assert.ok(walk.peak <= LEV_ENTRANCE.walkSpeed + 1e-9);
    assert.ok(walk.time > 3 && walk.time < 5, `about four seconds, got ${walk.time.toFixed(2)}`);
    assert.ok(walk.endSpeed < 0.35, 'he slows into the stop');
    // The walk clip's own pace is 1.75 m/s: Lev's feet match the ground.
    assert.ok(LEV_ENTRANCE.walkSpeed / 1.75 < 1.1);
    assert.ok(LEV_ENTRANCE.guideSpeed / 1.75 < 1.4, 'the walk to the oil line is brisk, not a 7.6 m/s skate');
    assert.equal(gaitForSpeed(LEV_ENTRANCE.walkSpeed), 'walk');
    assert.equal(gaitForSpeed(LEV_ENTRANCE.jogSpeed), 'jog');
  });

  it('stands Lev beside Butch as the camera sees them, on the side he comes from', () => {
    const butch = { x: -3, z: 32.6 };
    const right = { x: 0.717, z: -0.697 };
    const spot = besideTarget(butch, { x: -2.9, z: 26.1 }, right);
    assert.equal(spot.side, 1);
    assert.ok(Math.abs(Math.hypot(spot.x - butch.x, spot.z - butch.z) - LEV_ENTRANCE.standOff) < 1e-9);
    // Along the screen's horizontal, so neither hides the other.
    const along = ((spot.x - butch.x) * right.x + (spot.z - butch.z) * right.z) / Math.hypot(right.x, right.z);
    assert.ok(Math.abs(along - LEV_ENTRANCE.standOff) < 1e-6);
    const left = besideTarget(butch, { x: -9, z: 36 }, right);
    assert.equal(left.side, -1);
    const blocked = besideTarget(butch, { x: -2.9, z: 26.1 }, right, { walkable: (x) => x < butch.x });
    assert.equal(blocked.side, -1, 'the other side when his side is blocked');
  });

  it('turns people at a turn rate instead of snapping their facing', () => {
    assert.ok(Math.abs(wrapAngle(Math.PI * 3) - Math.PI) < 1e-9);
    // 126° (the old snap before the walk to the oil line) takes a while.
    let yaw = 0.659;
    let frames = 0;
    while (Math.abs(wrapAngle(2.858 - yaw)) > 0.02 && frames < 300) {
      yaw = turnToward(yaw, 2.858, LEV_ENTRANCE.turnRate, 1 / 60);
      frames += 1;
    }
    assert.ok(frames > 15 && frames < 90, `${frames} frames`);
    assert.ok(Math.abs(turnToward(0, 3, 6, 1 / 60)) <= 6 / 60 + 1e-9);
    // dampYaw goes the short way round.
    assert.ok(dampYaw(3.0, -3.0, 9, 1 / 60) > 3.0);
  });

  it('starts the glimpse hidden under the station roof and walks her out of frame', () => {
    const route = MARA_GLIMPSE.route;
    assert.ok(polylineLength(route) > 15);
    assert.ok(MARA_GLIMPSE.speed / 1.75 < 1.25, 'a walk, not a 3.4x stride');
    const start = pointAlongPolyline(route, 0);
    assert.deepEqual([start.x, start.z], [route[0][0], route[0][2]]);
    assert.equal(pointAlongPolyline(route, 999).done, true);
    assert.equal(pointAlongPolyline(route, 3).done, false);
    // The station shelter (open-air-station, x ≤ -7 by the rails) hides
    // her first steps; she leaves northward for the boulevard.
    assert.ok(route[0][0] < -10);
    assert.ok(route.at(-1)[2] < 17);
  });

  it('waits Lev in view, clear of the scanner arch, and gates the glimpse on her rig', () => {
    const [x, , z] = OPENING_POSITIONS.levStart;
    assert.notDeepEqual(OPENING_POSITIONS.levStart, [-7.8, 0.5, 26.4]);
    const arch = SCANNER_FIELDS.station.gate;
    assert.ok(Math.hypot(x - arch[0], z - arch[2]) > 3.5, 'not in the arch\'s shadow');
    assert.ok(Math.hypot(x - OPENING_POSITIONS.playerStart[0], z - OPENING_POSITIONS.playerStart[2]) < 8);
    assert.match(runtime, /this\.maraGlimpse = mara\?\.loaded \? \{/);
    assert.doesNotMatch(runtime, /addScaledVector\(towardButch, -1\.5\), 1\.9/);
    assert.match(runtime, /this\.faceEachOther\(this\.preview\.player, this\.lev\);/);
    assert.match(runtime, /levMoving \? undefined : \{ fade: 0\.32 \}/);
    assert.doesNotMatch(runtime, /this\.characters\.play\('lev', levMoving \? 'walk' : 'idle', this\.dialogue\.active \? \{ immediate: true \}/);
  });

  it('poses a rig before its first frame and ignores teleports as speed', () => {
    assert.match(characters, /this\.mixer\.update\(0\);\n\s+this\.groundSnap = true;/);
    assert.match(characters, /if \(measuredSpeed > 14 \|\| !this\.host\.visible\) \{/);
    assert.match(characters, /play\(state, \{ immediate = false, fade = 0\.18 \} = \{\}\)/);
    assert.match(preview, /this\.player\.rotation\.y = dampYaw\(this\.player\.rotation\.y, heading, PLAYER_TURN_RATE, dt\)/);
  });
});
