// Evidence record tests: the ticket and the handoff share one punched number.

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PUNCHED_NUMBER,
  createEvidenceRecord,
  createHandoffRecord,
  createPunchedTicket,
} from '../../src/chapters/museum3d/state/evidenceRecord.js';

test('the handoff record bears the same punched number as the museum ticket', () => {
  const ticket = createPunchedTicket();
  const handoff = createHandoffRecord();
  assert.equal(ticket.punchedNumber, PUNCHED_NUMBER);
  assert.equal(handoff.punchedNumber, ticket.punchedNumber);
});

test('records are immutable and require identity', () => {
  const ticket = createPunchedTicket();
  assert.throws(() => {
    'use strict';
    ticket.punchedNumber = 'X-0000';
  });
  assert.throws(() => createEvidenceRecord({}), /id and source/);
});
