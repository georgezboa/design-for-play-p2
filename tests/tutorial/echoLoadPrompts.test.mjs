// Phase VI — echoLoadPrompts (PAST RIDES THE LOAD) contract tests.
// Locks the prompt gating for the engage stand: barred for the whole first
// observation loop; after that the OFFER ITSELF is the window signal — while
// the motor is off the prompt appears only inside the open departure window.
// E still physically answers outside the window (the stale lesson lives in
// echoReplay), but the stand never advertises a dead action.

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ECHO_LOAD_PROMPTS,
  echoLoadPromptFor,
} from '../../src/tutorial/phases/echoLoadPrompts.js';

const SNAP = {
  stageComplete: false,
  observationLoop: false,
  motor: { energized: false },
  windowActive: false,
};

test('prompt copy is single-spaced and never leaks the answer', () => {
  assert.equal(ECHO_LOAD_PROMPTS.testOff, '[E] ENGAGE TRACTION');
  assert.equal(ECHO_LOAD_PROMPTS.testOn, '[E] DISENGAGE TRACTION');
  for (const text of Object.values(ECHO_LOAD_PROMPTS)) {
    assert.ok(!text.includes('  '), `double space in "${text}"`);
  }
});

test('first observation loop keeps the stand silent', () => {
  assert.equal(echoLoadPromptFor({ ...SNAP, observationLoop: true, windowActive: true }), null);
  assert.equal(echoLoadPromptFor({ ...SNAP, observationLoop: true }), null);
});

test('motor off: the offer appears only inside the open window', () => {
  assert.equal(
    echoLoadPromptFor({ ...SNAP, windowActive: true }),
    ECHO_LOAD_PROMPTS.testOff,
  );
  assert.equal(echoLoadPromptFor({ ...SNAP, windowActive: false }), null);
});

test('motor on: disengage stays visible regardless of the window', () => {
  assert.equal(
    echoLoadPromptFor({ ...SNAP, motor: { energized: true }, windowActive: true }),
    ECHO_LOAD_PROMPTS.testOn,
  );
  assert.equal(
    echoLoadPromptFor({ ...SNAP, motor: { energized: true }, windowActive: false }),
    ECHO_LOAD_PROMPTS.testOn,
  );
});

test('stage complete or missing snapshot stays silent', () => {
  assert.equal(echoLoadPromptFor({ ...SNAP, stageComplete: true, windowActive: true }), null);
  assert.equal(echoLoadPromptFor(null), null);
  assert.equal(echoLoadPromptFor(undefined), null);
});
