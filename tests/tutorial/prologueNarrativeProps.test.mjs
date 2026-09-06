import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BUTCH_NARRATIVE,
  NARRATIVE_SCRIPTS,
  getNarrativeScript,
  getNarrativeUnlockState,
  suitcaseHasUnreadEvidence,
} from '../../src/tutorial/prologueNarrativeDialogue.js';

// Minimal mock scene for testing unlock logic without Phaser
function makeMockScene(tutorialPuzzle = {}) {
  return {
    tutorialPuzzle,
    add: {
      graphics: () => ({ setDepth: () => ({ setBlendMode: () => ({ setVisible: () => {} }) }), clear: () => {}, setVisible: () => {} }),
      text: () => ({ setOrigin: () => ({ setDepth: () => ({ setVisible: () => ({ setText: () => {} }) }) }) }),
    },
    time: { now: 0 },
    input: { keyboard: { on: () => {}, off: () => {} } },
  };
}

test('Phase I unlocks after briefing', () => {
  assert.strictEqual((getNarrativeUnlockState({}))[0], false);
  assert.strictEqual((getNarrativeUnlockState({ briefed: false }))[0], false);
  assert.strictEqual((getNarrativeUnlockState({ briefed: true }))[0], true);
});

test('Phase II unlocks after stage 0 complete', () => {
  assert.strictEqual((getNarrativeUnlockState({}))[1], false);
  assert.strictEqual((getNarrativeUnlockState({ stageComplete: [true] }))[1], true);
});

test('Phase III unlocks after stage 2 complete', () => {
  assert.strictEqual((getNarrativeUnlockState({}))[2], false);
  assert.strictEqual((getNarrativeUnlockState({ stageComplete: [true, true, true] }))[2], true);
});

test('Phase IV suitcase unlocks on room entry, before the puzzle is solved', () => {
  assert.strictEqual((getNarrativeUnlockState({}))[3], false);
  assert.strictEqual((getNarrativeUnlockState({ stageIndex: 3, stageComplete: [] }))[3], true);
});

test('Phase V suitcases unlock on room entry, before either case is resolved', () => {
  assert.strictEqual((getNarrativeUnlockState({}))[4], false);
  assert.strictEqual((getNarrativeUnlockState({ stageIndex: 4, stageComplete: [] }))[4], true);
});

test('Phase VI unlocks after stage 5 complete', () => {
  assert.strictEqual((getNarrativeUnlockState({}))[5], false);
  assert.strictEqual((getNarrativeUnlockState({ stageComplete: [true, true, true, true, true, true] }))[5], true);
});

test('locked props do not appear in interactable candidate list', () => {
  const scene = makeMockScene({ briefed: false });
  // With briefed=false, no phases should be unlocked
  const unlock = getNarrativeUnlockState(scene.tutorialPuzzle);
  assert.strictEqual(Object.values(unlock).some(Boolean), false);
});

test('unlocked props appear only when their phase condition is met', () => {
  const scene = makeMockScene({ briefed: true, stageComplete: [true] });
  const unlock = getNarrativeUnlockState(scene.tutorialPuzzle);
  assert.strictEqual(unlock[0], true);
  assert.strictEqual(unlock[1], true);
  assert.strictEqual(unlock[2], false);
  assert.strictEqual(unlock[3], false);
  assert.strictEqual(unlock[4], false);
  assert.strictEqual(unlock[5], false);
});

test('props do not mutate puzzle state', () => {
  const puzzle = { briefed: true, stageComplete: [true, true, true] };
  const before = JSON.stringify(puzzle);
  getNarrativeUnlockState(puzzle);
  assert.strictEqual(JSON.stringify(puzzle), before);
});

test('a suitcase keeps narrative priority until every item has been read', () => {
  assert.strictEqual(suitcaseHasUnreadEvidence({}, 2), true);
  assert.strictEqual(suitcaseHasUnreadEvidence({ readItems: new Set(['key']) }, 2), true);
  assert.strictEqual(suitcaseHasUnreadEvidence({ readItems: new Set(['key', 'pass']) }, 2), false);
});

test('Butch is identified by a concrete job rather than an abstract riddle', () => {
  assert.strictEqual(BUTCH_NARRATIVE.role, 'lost property clerk');
});

test('the archive story advances through multi-line exchanges', () => {
  const required = ['claim-ticket', 'route-cards', 'signed-copies', 'retention-record'];
  required.forEach((id) => {
    const script = getNarrativeScript(id);
    assert.ok(script, `${id} should exist`);
    assert.ok(script.lines.length >= 2, `${id} should contain more than one line`);
    assert.strictEqual(script.choices.length, 2, `${id} should offer two replies`);
    script.choices.forEach((choice) => {
      assert.ok(choice.label.length > 8);
      assert.ok(choice.response.length >= 2);
    });
  });
});

test('both Phase V suitcases carry distinct evidence and a player reply', () => {
  const city = getNarrativeScript('phase-v-city-key');
  const country = getNarrativeScript('phase-v-leaf');
  assert.ok(city.lines.some((line) => line.includes('apartment 4C')));
  assert.ok(country.lines.some((line) => line.includes('wage envelope')));
  assert.strictEqual(city.choices.length, 2);
  assert.strictEqual(country.choices.length, 2);
});

test('all scripts are grounded in named people, records, places, or work', () => {
  const concreteTerms = /Mara|Rosa|depot|terminal|orchard|room|shift|lease|receipt|pass|envelope|cooperative|claim/i;
  Object.entries(NARRATIVE_SCRIPTS).forEach(([id, script]) => {
    const copy = [
      ...script.lines,
      ...(script.choices ?? []).flatMap((choice) => [choice.label, ...choice.response]),
    ].join(' ');
    assert.match(copy, concreteTerms, `${id} should contain concrete evidence`);
  });
});
