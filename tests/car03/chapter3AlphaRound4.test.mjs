import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

import { TICKET_BOARD_STEPS, ticketBoardGuidance } from '../../src/cars/presentCity3d/Chapter3TicketBoard.js';
import { createChapter3OpeningModel, TICKET_IDS } from '../../src/cars/presentCity3d/chapter3OpeningModel.js';

// Alpha round 4 fix round (engineer M3, 2026-10-05): Chapter 3 · ECHO CITY.
const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const board = read('src/cars/presentCity3d/Chapter3TicketBoard.js');

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
