import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

import {
  TICKET_IDS,
  TICKET_NOT_PROOF_IDS,
  createChapter3OpeningModel,
} from '../../src/cars/presentCity3d/chapter3OpeningModel.js';
import {
  TICKET_BOARD_CARDS,
  TICKET_BOARD_HINTS,
  TICKET_BOARD_TEXT,
} from '../../src/cars/presentCity3d/chapter3OpeningContent.js';
import {
  TICKET_HINT_DELAYS,
  TICKET_PROVE_HINT_DELAYS,
  lensParkingSpot,
  ticketBoardHintStep,
  ticketBoardTask,
  ticketHintDelays,
  ticketHintTierDue,
  ticketProofNeed,
  ticketProofSlots,
} from '../../src/cars/presentCity3d/Chapter3TicketBoard.js';
import { CHAPTER_CONTROLS, CONTROL_SETS } from '../../src/shell/chapterControls.js';

// Round 11 (2026-10-10, George's playtest): stuck at the Ticket 43 board's
// proof, "这个地方卡住了 我不知道下一步做什么" (I'm stuck here, I don't know
// what to do next). The board said "Pin the papers that prove it, then
// file." and nothing about how to pin, what was pinned or what FILE needed;
// the oil receipt stayed pinned until FILE refused the whole proof; the lens
// sat on Nika's note; hints came after 35 / 70 / 110 s and every refusal
// restarted their clock.
const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const board = read('src/cars/presentCity3d/Chapter3TicketBoard.js');
const css = read('src/cars/presentCity3d/chapter3Release.css');

const boardState = (model) => model.snapshot().ticketBoard;
const proving = () => {
  const model = createChapter3OpeningModel({ startAt: 'ticket-board' });
  for (const id of TICKET_IDS) model.seeTicketThroughLens(id);
  model.stackTickets(true);
  model.beginTicketFiling();
  model.concludeTickets('one');
  return model;
};
// What the task line must never say: the answer (which paper, the claim
// number, the cut name, the conclusion).
const ANSWER = /terminal note|nika|duplicates|claim card|1978-0412|VE\s*·\s*NN|one passenger|one person|two passengers/i;

describe('Chapter 3 round 11 · the board always says what to do next', () => {
  it('names the next concrete action at every point, never the answer', () => {
    const model = createChapter3OpeningModel({ startAt: 'ticket-board' });
    const task = () => ticketBoardTask(boardState(model));
    const tasks = TICKET_BOARD_TEXT.tasks;
    const seen = [];
    const look = (expected) => { assert.equal(task(), expected); seen.push(task()); };
    look(tasks.lens);
    assert.match(tasks.lens, /How are the two tickets related\? Read both under the 1978 lens\./);
    model.seeTicketThroughLens('ticket-velez'); look(tasks.lensOne);
    model.seeTicketThroughLens('ticket-venn'); look(tasks.stack);
    model.stackTickets(true); look(tasks.punch);
    model.beginTicketFiling(); look(tasks.conclude);
    model.concludeTickets('two'); look(tasks.conclude);
    model.concludeTickets('one'); look(tasks.proveRecords);
    model.pinTicketProof('ticket-velez'); look(tasks.proveRecordOne);
    model.pinTicketProof('ticket-venn'); look(tasks.proveRule);
    assert.equal(tasks.proveRule, 'Pin the paper that explains the name VENN.');
    model.pinTicketProof('claim-card'); look(tasks.proveRule);
    model.pinTicketProof('terminal-note'); look(tasks.proveFile);
    for (const text of seen) assert.doesNotMatch(text, ANSWER, text);
    model.punchTickets();
    assert.equal(task(), tasks.filed);
  });

  it('asks for the lens first when the proof starts before both tickets are read', () => {
    const model = createChapter3OpeningModel({ startAt: 'ticket-board' });
    model.stackTickets(true);
    model.beginTicketFiling();
    model.concludeTickets('one');
    assert.equal(ticketProofNeed(boardState(model)), 'unchecked');
    assert.equal(ticketBoardTask(boardState(model)), TICKET_BOARD_TEXT.tasks.proveUnchecked);
    assert.match(TICKET_BOARD_TEXT.tasks.proveUnchecked, /lens/);
  });

  it('starts with the rule pinned too: the line asks for what is still missing', () => {
    const model = proving();
    model.pinTicketProof('terminal-note');
    assert.equal(ticketProofNeed(boardState(model)), 'records');
    assert.equal(ticketBoardTask(boardState(model)), TICKET_BOARD_TEXT.tasks.proveRecords);
  });

  it('shows the task line on the board and refreshes it as the board changes', () => {
    assert.match(board, /this\.taskLine = el\('p', 'c3-board__hint c3-board__task', ''\)/);
    assert.match(board, /const task = ticketBoardTask\(this\.board\(\)\);/);
    assert.doesNotMatch(board, /el\('p', 'c3-board__hint', TICKET_BOARD_TEXT\.question\)/, 'no fixed question line');
    assert.match(css, /\.c3-board__task \{[^}]*text-align: right/);
  });
});

describe('Chapter 3 round 11 · what can be pinned, how, and what is pinned', () => {
  it('puts a PIN badge with the gesture on every pinnable paper while proving', () => {
    assert.deepEqual({ ...TICKET_BOARD_TEXT.pinBadge }, { rest: 'PIN', pinned: 'PINNED', act: 'CLICK / E · PIN', actPinned: 'CLICK / E · UNPIN' });
    assert.match(board, /const pin = pinBadge\(\);/);
    assert.match(board, /slot\.pinBadge = pinBadge\(\);/, 'the 1978 records in the tray carry one too');
    assert.match(css, /\.c3-board\.is-proving \.c3-card:not\(\.c3-card--ticket\) \.c3-card__pin, \.c3-board\.is-proving \.c3-record \.c3-card__pin \{ display: inline-flex; \}/);
    assert.match(css, /:is\(\.c3-card, \.c3-record\):is\(:hover, :focus-visible\) \.c3-pin__act \{ display: inline; \}/);
    assert.match(TICKET_BOARD_TEXT.proof.help, /CLICK.*PIN IT.*TAB.*E/);
  });

  it('fills a proof strip by FILE AS ONE: Lev\'s two questions as slots, a count', () => {
    assert.equal(TICKET_BOARD_TEXT.proof.claimGroup, 'WHY ONE CLAIM?');
    assert.equal(TICKET_BOARD_TEXT.proof.nameGroup, 'WHY VENN?');
    const model = proving();
    const slots = () => ticketProofSlots(boardState(model));
    assert.deepEqual(slots(), { claim: [], name: [], extra: [], pinned: 0, total: 3, complete: false });
    assert.equal(TICKET_BOARD_TEXT.proof.count(0, 3), 'PINNED 0 / 3');
    model.pinTicketProof('ticket-venn');
    model.pinTicketProof('claim-card');
    assert.deepEqual(slots(), { claim: ['ticket-venn'], name: [], extra: ['claim-card'], pinned: 1, total: 3, complete: false });
    model.pinTicketProof('ticket-velez');
    model.pinTicketProof('terminal-note');
    assert.deepEqual(slots(), { claim: ['ticket-venn', 'ticket-velez'], name: ['terminal-note'], extra: ['claim-card'], pinned: 3, total: 3, complete: true });
    for (const card of TICKET_BOARD_CARDS) assert.ok(card.pin, `${card.id} has a name on the strip`);
  });

  it('keeps FILE AS ONE locked (still answering) until the proof holds', () => {
    assert.match(board, /this\.fileButton\.classList\.toggle\('is-locked', !slots\.complete\);/);
    assert.match(board, /this\.fileButton\.setAttribute\('aria-disabled', String\(!slots\.complete\)\);/);
    assert.match(css, /\.c3-board__choice--file\.is-locked \{/);
    assert.match(TICKET_BOARD_TEXT.proof.fileLocked(2, 3), /2 of 3 pinned/);
  });

  it('lets the stack and the keyboard pin both tickets', () => {
    // Two clicks on the stack pin both records (the tickets hide each other).
    assert.match(board, /const target = proofs\.includes\(id\) && !proofs\.includes\(other\) \? other : id;/);
    // Tab reaches the tray's records while proving; E pins them.
    assert.match(board, /const records = \[\.\.\.this\.recordSlots\.values\(\)\]\.filter\(\(slot\) => !slot\.hidden\);/);
    assert.match(board, /if \(!event\.repeat && this\.proving\(\)\) this\.pinProof\(record\);/);
  });

  it('names pinning on the pause card', () => {
    assert.match(Object.fromEntries(CHAPTER_CONTROLS.echoCity)['TICKET BOARD'], /CLICK A PAPER TO PIN/);
    const rows = Object.fromEntries(CONTROL_SETS.chapter3.stages.board.rows);
    assert.match(rows['PUNCH · PIN A PAPER'], /E \/ ENTER/);
    assert.equal(rows.HINT, 'H');
  });
});

describe('Chapter 3 round 11 · a refused paper says why and what is needed', () => {
  it('refuses the oil receipt on the spot (it names a seat, not a person)', () => {
    assert.deepEqual([...TICKET_NOT_PROOF_IDS], ['market-sale']);
    const model = proving();
    assert.deepEqual(model.pinTicketProof('market-sale'), { pinned: false, changed: false, reason: 'not-proof' });
    assert.deepEqual(boardState(model).proofs, []);
    assert.equal(model.snapshot().lastEvent, 'proof-refused-market-sale');
  });

  it('stamps the paper with the reason and has Lev say what kind of paper is missing', () => {
    assert.equal(TICKET_BOARD_TEXT.refusedStamp['not-proof'], 'A SEAT, NOT A NAME');
    assert.match(TICKET_BOARD_TEXT.refuse['not-proof'], /seat, not to a name/);
    assert.match(TICKET_BOARD_TEXT.need.records, /one claim/);
    assert.match(TICKET_BOARD_TEXT.need.rule, /explains the name VENN/);
    assert.match(board, /this\.reply\(line \? `\$\{line\} \$\{need\}` : ''\);/);
    assert.match(css, /\.c3-card__refusal \{/);
    assert.match(css, /\.c3-card\.is-refused \{ animation: c3-refuse/);
  });

  it('tracks what the proof needs, in order', () => {
    const model = proving();
    const need = () => ticketProofNeed(boardState(model));
    assert.equal(need(), 'records');
    model.pinTicketProof('ticket-velez');
    assert.equal(need(), 'record');
    model.pinTicketProof('ticket-venn');
    assert.equal(need(), 'rule');
    model.pinTicketProof('terminal-note');
    assert.equal(need(), null);
  });
});

describe('Chapter 3 round 11 · hints reach "pin X" sooner', () => {
  it('runs much shorter delays while proving', () => {
    assert.deepEqual([...TICKET_PROVE_HINT_DELAYS], [12, 25, 40]);
    for (const step of ['proveUnchecked', 'proveRecords', 'proveRule', 'proveFile']) assert.equal(ticketHintDelays(step), TICKET_PROVE_HINT_DELAYS, step);
    for (const step of ['lens', 'lensOne', 'stack', 'conclude']) assert.equal(ticketHintDelays(step), TICKET_HINT_DELAYS, step);
    assert.equal(ticketHintTierDue(40, ticketHintDelays('proveRule')), 3, 'the explicit step after 40 s idle');
  });

  it('names the paper to pin in each proving step\'s explicit tier', () => {
    assert.match(TICKET_BOARD_HINTS.proveRecords[2], /Pin both 1978 records/);
    assert.match(TICKET_BOARD_HINTS.proveRule[2], /Pin Nika's terminal note/);
    assert.match(TICKET_BOARD_HINTS.proveFile[2], /FILE AS ONE/);
    assert.doesNotMatch(TICKET_BOARD_HINTS.proveRule[0], /note|Nika/, 'the nudge does not point');
  });

  it('never restarts the clock on a refused move; each one after the first steps a tier up', () => {
    assert.doesNotMatch(board, /progress\(\{ sameStep: true \}\)/);
    assert.match(board, /misfire\(\) \{/);
    assert.match(board, /return this\.showHint\(Math\.min\(3, this\.hint\.tier \+ 1\)\);/);
    for (const call of ['this.misfire();\n      return false;', 'this.misfire();\n  }']) assert.ok(board.includes(call), call);
  });

  it('splits the hint step by what the proof needs', () => {
    const model = proving();
    assert.equal(ticketBoardHintStep(boardState(model)), 'proveRecords');
    model.pinTicketProof('ticket-velez');
    model.pinTicketProof('ticket-venn');
    assert.equal(ticketBoardHintStep(boardState(model)), 'proveRule');
  });
});

describe('Chapter 3 round 11 · NOT YET · ESC does what it says', () => {
  it('puts the filing off on Esc before stepping away, through the pause menu\'s Escape hook', () => {
    // The shared pause menu takes Escape before the board's key handler and
    // used to close the board outright, mid-proof.
    const main = read('src/car03-3d-main.js');
    assert.match(main, /if \(board\?\.active\) \{\n(?:\s+\/\/.*\n)*\s+board\.escape\(\);\n\s+return true;/);
    assert.doesNotMatch(main, /board\.close\(\);/);
    assert.match(board, /escape\(\) \{\n\s+if \(!this\.root\) return false;\n\s+if \(!this\.filed && this\.board\(\)\.filing\) return this\.cancelFiling\(\);\n\s+return this\.close\(\);/);
    assert.equal(TICKET_BOARD_TEXT.notYet, 'NOT YET');
  });

  it('clears Lev\'s answer once the stuck point moves on', () => {
    assert.match(board, /\/\/ Lev's answer to the last move is stale once the stuck point moves\.\n\s+this\.reply\(''\);/);
  });
});

describe('Chapter 3 round 11 · the lens leaves the papers to be read', () => {
  const papers = [
    { left: 400, top: 300, right: 640, bottom: 460, weight: 5 },
    { left: 0, top: 0, right: 1120, bottom: 44, weight: 2 },
  ];

  it('moves off a paper to the nearest clear spot', () => {
    const spot = lensParkingSpot({ width: 1120, height: 676, from: { x: 520, y: 360 }, obstacles: papers });
    assert.equal(spot.moved, true);
    const reach = 96;
    for (const box of papers) {
      const clear = spot.x + reach <= box.left || spot.x - reach >= box.right || spot.y + reach + 30 <= box.top || spot.y - reach >= box.bottom;
      assert.ok(clear, `clear of ${JSON.stringify(box)} at ${spot.x},${spot.y}`);
    }
  });

  it('stays where it is when nothing is under it', () => {
    assert.deepEqual(lensParkingSpot({ width: 1120, height: 676, from: { x: 900, y: 200 }, obstacles: papers }), { x: 900, y: 200, moved: false });
  });

  it('parks when the filing opens, reads nothing on the way, and yields to a drag', () => {
    assert.match(board, /\/\/ Round 11: the lens slides off the papers the player now has to read\.\n\s+this\.parkLens\(\);/);
    assert.match(board, /if \(inside && !this\.lensParking && TICKET_IDS\.includes/);
    assert.match(board, /if \(id === 'lens'\) this\.stopLensTween\(\);/);
  });
});

describe('Chapter 3 round 11 · readable at every TEXT SIZE', () => {
  it('sizes the new board text with --nf-scale', () => {
    for (const selector of ['.c3-card__pin', '.c3-card__refusal', '.c3-proof__label', '.c3-proof__slot', '.c3-proof__chip', '.c3-proof__count', '.c3-board__file-help']) {
      const rule = css.slice(css.indexOf(`${selector} {`));
      assert.ok(css.includes(`${selector} {`), selector);
      assert.match(rule.slice(0, rule.indexOf('}')), /var\(--nf-scale\)/, selector);
    }
  });

  it('keeps the bottom row of papers clear of the proof strip', () => {
    for (const id of ['terminal-note', 'market-sale', 'claim-card']) {
      assert.ok(TICKET_BOARD_CARDS.find((card) => card.id === id).at[1] <= 0.62, id);
    }
    assert.match(css, /\.c3-board__table \{\n\s+position: relative; width: min\(1120px, calc\(100vw - 32px\)\); height: min\(676px, calc\(100vh - 32px\)\);/);
  });
});
