// Phase II — relay-chain scenario QA tests (Wave 4, relay-qa-owner).
//
// Scope: everything the Wave 4 checklist demands ON TOP OF the existing
// unit/scenario suites (contactInterlock.test.mjs, relayCabinet.test.mjs,
// contactInterlockQa.test.mjs, relayCabinetArt.test.mjs — all frozen):
//
//   A. thirteen-state full-chain fixtures driving REAL contactInterlock +
//      relayCabinet instances, pairwise distinguishability, and the locked
//      assertion chains (relay-waiting POWER -> 'relay-open'; energized
//      POWER -> contactorClosed; combined event ordering).
//   B. close-up lifecycle resource-leak check: 20x open/close on the REAL
//      RelayCabinetArt with a mock scene (GameObject / tween accounting),
//      plus source-level listener-lifecycle guards for the integration
//      layer (see the downgrade note at the top of section B).
//   C. focus-loss recovery: cancelDrag mid-drag returns the tip to its last
//      legal state, no stale placement on the next pointerUp, no _press
//      residue, no drag soft-lock.
//   D. restart consistency: full chain -> destroy -> fresh instances ->
//      full chain; both runs identical.
//   E. legacy entry guards: ?qa=phase2&state=entry stays the only playable
//      (non-frozen) QA state; the interlock without an isRelaySolved hook
//      still runs the legacy single-segment trace end to end.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import {
  CONTACT_INTERLOCK_DEFAULTS,
  createContactInterlock,
} from '../../src/tutorial/phases/contactInterlock.js';
import { createRelayCabinet } from '../../src/tutorial/phases/relayCabinet.js';
import RelayCabinetArt from '../../src/art/relayCabinetArt.js';
import {
  drivePhase2State,
  PHASE2_QA_STATE_NAMES,
  shouldFreezePhase2QAState,
} from '../../src/tutorial/qa/phase2Qa.js';
import {
  RELAY_CHAIN_STATE_NAMES,
  CHAIN_CONTACT_FIELDS,
  CHAIN_RELAY_FIELDS,
  CORRECT_CHAIN_EVENTS,
  createChainRig,
  createMockScene,
  driveChainState,
  driveAllChainStates,
  driveCompleteRoute,
  chainSignature,
  chainEventTypes,
} from './relayChainQa.mjs';

const EPS = 1e-9;

function typesOf(events) {
  return events.map((e) => e.type);
}

// ---------------------------------------------------------------------------
// A. Full-chain fixtures.
// ---------------------------------------------------------------------------

describe('relayChainQa fixtures', () => {
  it('covers exactly the thirteen locked chain states', () => {
    assert.deepEqual([...RELAY_CHAIN_STATE_NAMES], [
      'entry',
      'signal-before-relay',
      'relay-waiting',
      'panel-open',
      'coil-only',
      'wrong-NC',
      'incomplete',
      'ground-fault',
      'solved',
      'signal-after-relay',
      'energized',
      'complete',
      'reset-replay',
    ]);
  });

  it('rejects unknown state names', () => {
    assert.throws(() => driveChainState('nope'), RangeError);
  });

  it('entry: contact entered, latch open, cabinet never opened, no events', () => {
    const { contact, relay, events } = driveChainState('entry');
    assert.equal(contact.entered, true);
    assert.equal(contact.latchClosed, false);
    assert.equal(contact.preRelayProgress, 0);
    assert.equal(contact.relayWaiting, false);
    assert.equal(contact.postRelayProgress, 0);
    assert.equal(contact.circuitEnergized, false);
    assert.equal(contact.complete, false);
    assert.equal(contact.lastFault, null);
    assert.equal(relay.entered, false);
    assert.equal(relay.coilLeadTerminal, null);
    assert.equal(relay.outputLeadTerminal, null);
    assert.equal(relay.solved, false);
    assert.deepEqual(events, []);
  });

  it('signal-before-relay: pre segment mid-flight, 0 < preRelayProgress < 1', () => {
    const { contact, relay, events } = driveChainState('signal-before-relay');
    assert.equal(contact.latchClosed, true);
    assert.ok(contact.preRelayProgress > 0 + EPS, 'pre must be > 0');
    assert.ok(contact.preRelayProgress < 1 - EPS, 'pre must be < 1');
    assert.equal(contact.relayWaiting, false);
    assert.equal(contact.postRelayProgress, 0);
    assert.equal(contact.circuitEnergized, false);
    assert.equal(relay.entered, false);
    assert.deepEqual(typesOf(events), ['latch-reset', 'trace-started']);
  });

  it('relay-waiting: signal parked at the cabinet (pre=1, waiting, not energized)', () => {
    const { contact, relay, events } = driveChainState('relay-waiting');
    assert.equal(contact.preRelayProgress, 1);
    assert.equal(contact.relayWaiting, true);
    assert.equal(contact.relayBridged, false);
    assert.equal(contact.postRelayProgress, 0);
    assert.equal(contact.circuitEnergized, false);
    assert.equal(contact.complete, false);
    assert.equal(relay.entered, false);
    assert.equal(relay.solved, false);
    assert.deepEqual(typesOf(events), [
      'latch-reset',
      'trace-started',
      'trace-reached-relay',
    ]);
  });

  it('panel-open: relay.enter() done, no wiring yet, signal still parked', () => {
    const { contact, relay, events } = driveChainState('panel-open');
    assert.equal(relay.entered, true);
    assert.equal(relay.coilLeadTerminal, null);
    assert.equal(relay.outputLeadTerminal, null);
    assert.equal(relay.coilEnergized, false);
    assert.equal(relay.noContactClosed, false);
    assert.equal(relay.ncContactClosed, true);
    assert.equal(relay.testState, 'idle');
    assert.equal(relay.solved, false);
    // The world side is untouched by opening the case.
    assert.equal(contact.relayWaiting, true);
    assert.deepEqual(typesOf(events), [
      'latch-reset',
      'trace-started',
      'trace-reached-relay',
    ]);
  });

  it('coil-only: COIL on coil-a1 energizes the coil (NO closes / NC opens)', () => {
    const { relay, events } = driveChainState('coil-only');
    assert.equal(relay.coilLeadTerminal, 'coil-a1');
    assert.equal(relay.outputLeadTerminal, null);
    assert.equal(relay.coilEnergized, true);
    assert.equal(relay.noContactClosed, true);
    assert.equal(relay.ncContactClosed, false);
    assert.equal(relay.testState, 'idle');
    assert.equal(relay.solved, false);
    assert.deepEqual(typesOf(events), [
      'latch-reset',
      'trace-started',
      'trace-reached-relay',
      'lead-connected',
      'coil-picked',
    ]);
  });

  it('wrong-NC: OUTPUT on nc-12, TEST drops out and KEEPS the wiring', () => {
    const { relay, events } = driveChainState('wrong-NC');
    assert.equal(relay.coilLeadTerminal, 'coil-a1');
    assert.equal(relay.outputLeadTerminal, 'nc-12');
    assert.equal(relay.coilEnergized, true, 'coil stays picked after dropout');
    assert.equal(relay.testState, 'dropout');
    assert.equal(relay.solved, false);
    const last = events.at(-1);
    assert.equal(last.type, 'test-dropout');
    assert.equal(last.source, 'relay');
    assert.equal(last.lead, 'output');
    assert.equal(last.terminal, 'nc-12');
  });

  it('incomplete: bare TEST press reports both leads missing', () => {
    const { relay, events } = driveChainState('incomplete');
    assert.equal(relay.coilLeadTerminal, null);
    assert.equal(relay.outputLeadTerminal, null);
    assert.equal(relay.coilEnergized, false);
    assert.equal(relay.testState, 'incomplete');
    assert.equal(relay.solved, false);
    const last = events.at(-1);
    assert.equal(last.type, 'test-incomplete');
    assert.deepEqual(last.missing, ['coil', 'output']);
  });

  it('ground-fault: COIL on gnd-lug, TEST faults locally without resetting', () => {
    const { relay, events } = driveChainState('ground-fault');
    assert.equal(relay.coilLeadTerminal, 'gnd-lug');
    assert.equal(relay.outputLeadTerminal, 'no-14');
    assert.equal(relay.coilEnergized, false, 'grounded coil never picks');
    assert.equal(relay.testState, 'ground-fault');
    assert.equal(relay.solved, false);
    const last = events.at(-1);
    assert.equal(last.type, 'test-ground-fault');
    assert.deepEqual(last.faulted, ['coil']);
    assert.equal(last.terminal, 'gnd-lug');
  });

  it('solved: correct wiring + TEST passed, bridged latched into the trace', () => {
    const { contact, relay, events } = driveChainState('solved');
    assert.equal(relay.solved, true);
    assert.equal(relay.testState, 'passed');
    assert.equal(relay.coilLeadTerminal, 'coil-a1');
    assert.equal(relay.outputLeadTerminal, 'no-14');
    assert.equal(relay.noContactClosed, true);
    assert.equal(relay.ncContactClosed, false);
    // The interlock has polled the hook: waiting cleared, post not started.
    assert.equal(contact.relayBridged, true);
    assert.equal(contact.relayWaiting, false);
    assert.equal(contact.postRelayProgress, 0);
    assert.equal(contact.circuitEnergized, false);
    assert.deepEqual(typesOf(events), [
      'latch-reset',
      'trace-started',
      'trace-reached-relay',
      'lead-connected',
      'coil-picked',
      'lead-connected',
      'relay-bridged',
    ]);
  });

  it('signal-after-relay: post segment mid-flight, 0 < postRelayProgress < 1', () => {
    const { contact, relay, events } = driveChainState('signal-after-relay');
    assert.equal(relay.solved, true);
    assert.equal(contact.relayBridged, true);
    assert.equal(contact.relayWaiting, false);
    assert.ok(contact.postRelayProgress > 0 + EPS, 'post must be > 0');
    assert.ok(contact.postRelayProgress < 1 - EPS, 'post must be < 1');
    assert.ok(contact.signalProgress > 0 && contact.signalProgress < 1);
    assert.equal(contact.circuitEnergized, false);
    assert.equal(contact.complete, false);
    // Moving the signal emits nothing new until it lands.
    assert.deepEqual(typesOf(events), typesOf(driveChainState('solved').events));
  });

  it('energized: post=1, circuitEnergized=true, POWER not yet pressed', () => {
    const { contact, events } = driveChainState('energized');
    assert.equal(contact.preRelayProgress, 1);
    assert.equal(contact.postRelayProgress, 1);
    assert.equal(contact.signalProgress, 1);
    assert.equal(contact.relayWaiting, false);
    assert.equal(contact.circuitEnergized, true);
    assert.equal(contact.contactorClosed, false);
    assert.equal(contact.powerDelivered, false);
    assert.equal(contact.complete, false);
    assert.deepEqual(typesOf(events), [
      'latch-reset',
      'trace-started',
      'trace-reached-relay',
      'lead-connected',
      'coil-picked',
      'lead-connected',
      'relay-bridged',
      'trace-energized',
    ]);
  });

  it('complete: contactor closed, traction delivered', () => {
    const { contact, relay, events } = driveChainState('complete');
    assert.equal(contact.contactorClosed, true);
    assert.equal(contact.powerDelivered, true);
    assert.equal(contact.complete, true);
    assert.equal(contact.lastFault, null);
    assert.equal(relay.solved, true);
    assert.deepEqual(typesOf(events), [...CORRECT_CHAIN_EVENTS]);
  });

  it('reset-replay: replay deep-equals the first complete pass', () => {
    const replay = driveChainState('reset-replay');
    const complete = driveChainState('complete');
    assert.ok(replay.firstRun, 'reset-replay must carry its first run');
    // First run == complete fixture.
    assert.deepEqual(replay.firstRun.contact, complete.contact);
    assert.deepEqual(replay.firstRun.relay, complete.relay);
    assert.deepEqual(typesOf(replay.firstRun.events), typesOf(complete.events));
    // Replay run == first run == complete fixture.
    assert.deepEqual(replay.contact, replay.firstRun.contact);
    assert.deepEqual(replay.relay, replay.firstRun.relay);
    assert.deepEqual(typesOf(replay.events), typesOf(replay.firstRun.events));
    assert.deepEqual(replay.contact, complete.contact);
    assert.deepEqual(replay.relay, complete.relay);
    assert.deepEqual(typesOf(replay.events), [...CORRECT_CHAIN_EVENTS]);
  });

  it('driveAllChainStates returns every fixture with both snapshots + events', () => {
    const all = driveAllChainStates();
    assert.deepEqual(
      Object.keys(all).sort(),
      [...RELAY_CHAIN_STATE_NAMES].sort(),
    );
    for (const name of RELAY_CHAIN_STATE_NAMES) {
      assert.equal(typeof all[name].contact, 'object');
      assert.equal(typeof all[name].relay, 'object');
      assert.ok(Array.isArray(all[name].events));
    }
  });
});

// ---------------------------------------------------------------------------
// A. Snapshot distinguishability across the twelve distinct logical states.
// `reset-replay` is excluded BY DESIGN: it must be indistinguishable from
// `complete` — that equality is the replay-equivalence property.
// ---------------------------------------------------------------------------

describe('chain-state distinguishability', () => {
  const DISTINCT_STATES = RELAY_CHAIN_STATE_NAMES.filter((n) => n !== 'reset-replay');
  const fixtures = {};
  for (const name of DISTINCT_STATES) fixtures[name] = driveChainState(name);

  it('all twelve logical states are pairwise separable by snapshot or last event', () => {
    const gaps = [];
    for (let i = 0; i < DISTINCT_STATES.length; i += 1) {
      for (let j = i + 1; j < DISTINCT_STATES.length; j += 1) {
        const a = DISTINCT_STATES[i];
        const b = DISTINCT_STATES[j];
        const sigA = chainSignature(fixtures[a]);
        const sigB = chainSignature(fixtures[b]);
        const sameSnapshot = Object.keys(sigA).every((k) => Object.is(sigA[k], sigB[k]));
        if (!sameSnapshot) continue;
        const lastA = fixtures[a].events.at(-1)?.type ?? null;
        const lastB = fixtures[b].events.at(-1)?.type ?? null;
        if (lastA === lastB) {
          gaps.push(`${a} vs ${b}: identical snapshot AND same last event (${lastA})`);
        }
      }
    }
    assert.deepEqual(
      gaps,
      [],
      `LOGIC-LAYER GAP — chain states indistinguishable from snapshot + events:\n${gaps.join('\n')}`,
    );
  });

  it('every signature field actually varies somewhere across the chain', () => {
    // A discriminant field that never changes would be dead weight in the
    // signature (and a hint the fixture roster has a hole). Exception:
    // contact.lastFault stays null on every HAPPY-PATH fixture by design —
    // the fault seam ('relay-open') is covered by the assertion-chain tests.
    const allSigs = DISTINCT_STATES.map((n) => chainSignature(fixtures[n]));
    const keys = [
      ...CHAIN_CONTACT_FIELDS.filter((f) => f !== 'lastFault').map((f) => `contact.${f}`),
      ...CHAIN_RELAY_FIELDS.map((f) => `relay.${f}`),
    ];
    for (const key of keys) {
      const values = new Set(allSigs.map((s) => String(s[key])));
      assert.ok(values.size > 1, `signature field ${key} never varies`);
    }
  });

  it('event sources alternate world -> cabinet -> world along the correct route', () => {
    const { events } = driveChainState('complete');
    assert.deepEqual(typesOf(events), [...CORRECT_CHAIN_EVENTS]);
    assert.deepEqual(
      events.map((e) => e.source),
      [
        'contact', 'contact', 'contact', // latch + pre segment + park
        'relay', 'relay', 'relay', 'relay', // wiring + TEST
        'contact', 'contact', 'contact', // post segment + POWER
      ],
    );
    // Payloads stay JSON-safe plain data (renderer-safe).
    for (const evt of events) assert.doesNotThrow(() => JSON.stringify(evt));
  });
});

// ---------------------------------------------------------------------------
// A. Locked assertion chains.
// ---------------------------------------------------------------------------

describe('chain assertion chains', () => {
  it('relay-waiting + POWER bounces locally with lastFault=relay-open', () => {
    const rig = createChainRig();
    driveChainState('relay-waiting', rig);
    const result = rig.contact.interact('power');
    assert.equal(result.accepted, false);
    assert.equal(result.reason, 'relay-open');
    const snap = rig.contact.snapshot();
    assert.equal(snap.lastFault, 'relay-open');
    assert.equal(snap.complete, false);
    // The parked signal is unaffected: still waiting, still retryable.
    assert.equal(snap.relayWaiting, true);
    const bounced = rig.contact.drainEvents();
    assert.deepEqual(typesOf(bounced), ['contactor-bounce']);
    assert.equal(bounced[0].lastFault, 'relay-open');
  });

  it('energized + POWER closes the contactor and completes the phase', () => {
    const rig = createChainRig();
    driveChainState('energized', rig);
    const result = rig.contact.interact('power');
    assert.equal(result.accepted, true);
    assert.equal(result.complete, true);
    const snap = rig.contact.snapshot();
    assert.equal(snap.contactorClosed, true);
    assert.equal(snap.powerDelivered, true);
    assert.equal(snap.lastFault, null);
    assert.deepEqual(typesOf(rig.contact.drainEvents()), [
      'contactor-closed',
      'traction-enabled',
    ]);
  });

  it('wrong-NC rewiring to NO then TEST passes (dropout never locks the case)', () => {
    const rig = createChainRig();
    driveChainState('wrong-NC', rig);
    // Player pulls the output lead off NC and lands it on NO, then retests.
    rig.relay.disconnect('output');
    rig.relay.connect('output', 'no-14');
    const retest = rig.relay.test();
    rig.collect();
    assert.equal(retest.result, 'passed');
    assert.equal(retest.solved, true);
    assert.equal(rig.relay.snapshot().solved, true);
    // The parked world signal can now run through.
    rig.contact.update(CONTACT_INTERLOCK_DEFAULTS.propagationMs);
    assert.equal(rig.contact.snapshot().circuitEnergized, true);
  });
});

// ---------------------------------------------------------------------------
// B. Close-up lifecycle resource-leak check.
//
// DOWNGRADE (reported, not hidden): the real open/close path lives in
// TimetablePuzzle.openRelayCloseup/closeRelayCloseup, but TimetablePuzzle.js
// imports `phaser` at module top, which cannot load under Node (the import
// hangs), so the real integration methods are unreachable from node --test.
// The leak surface that actually owns GameObjects and tweens is the frozen
// RelayCabinetArt (open/close/applySnapshot/cancelDrag), driven here 20x on
// a mock scene in the exact call shape the integration layer uses:
//   open  path: applySnapshot兜底 -> open()
//   close path: cancelDrag() -> close()
// Listener accounting on scene.input belongs to TimetablePuzzle; since it
// cannot execute here, it is guarded at source level below (registration
// happens exactly once per build, removal happens in destroy, and the
// open/close method bodies register nothing).
// ---------------------------------------------------------------------------

describe('close-up lifecycle resource leaks', () => {
  function makeArtRig() {
    const scene = createMockScene();
    const art = new RelayCabinetArt(scene);
    const relay = createRelayCabinet();
    const sync = () => {
      relay.drainEvents().forEach((evt) => art.handleEvent(evt));
      art.applySnapshot(relay.snapshot());
    };
    return { scene, art, relay, sync };
  }

  it('20x open/close: GameObject count and live tweens never grow', () => {
    const { scene, art, sync } = makeArtRig();
    sync();
    const baseObjects = scene.objects.length;
    assert.ok(baseObjects > 30);
    assert.equal(art.getState().objectCount, baseObjects);

    let maxLiveTweens = 0;
    for (let cycle = 0; cycle < 20; cycle += 1) {
      // Open path (mirrors openRelayCloseup: sync兜底 then physical open).
      sync();
      art.open();
      assert.equal(art.getState().doorState, 'open', `cycle ${cycle} open`);
      assert.equal(scene.objects.length, baseObjects, `cycle ${cycle} open objects`);
      maxLiveTweens = Math.max(maxLiveTweens, art.getState().liveTweens);

      // Close path (mirrors closeRelayCloseup: cancel any drag, then close).
      art.cancelDrag();
      art.close();
      assert.equal(art.getState().doorState, 'half', `cycle ${cycle} close`);
      assert.equal(scene.objects.length, baseObjects, `cycle ${cycle} close objects`);
      maxLiveTweens = Math.max(maxLiveTweens, art.getState().liveTweens);
    }

    assert.equal(art.getState().objectCount, baseObjects, 'object ledger unchanged');
    assert.equal(scene.objects.length, baseObjects, 'scene object ledger unchanged');
    // open/close kill the previous door + bolt tweens before adding new ones,
    // so the live set stays at <= 2 even under the mock's conservative
    // accounting (real Phaser reaps completed tweens on top of that).
    assert.ok(
      maxLiveTweens <= 2,
      `live tweens must stay bounded, saw ${maxLiveTweens}`,
    );
    assert.ok(
      art.getState().liveTweens <= 2,
      'no tween accumulation after 20 cycles',
    );
  });

  it('open/close are repeat-safe (no duplicate door/bolt tweens)', () => {
    const { scene, art } = makeArtRig();
    art.open();
    const tweensAfterFirstOpen = scene.tweenList.length;
    art.open(); // already open: must be a no-op
    art.open();
    assert.equal(scene.tweenList.length, tweensAfterFirstOpen);
    assert.equal(art.getState().doorState, 'open');

    art.close();
    const tweensAfterClose = scene.tweenList.length;
    art.close(); // door is half-closed, not open: must be a no-op
    assert.equal(scene.tweenList.length, tweensAfterClose);
    assert.equal(art.getState().doorState, 'half');
  });

  it('integration source guard: listeners register once, never in open/close, off in destroy', () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const source = readFileSync(join(here, '../../src/tutorial/TimetablePuzzle.js'), 'utf8');

    // _setupRelayInput is defined once and called exactly once (per build,
    // i.e. per scene restart) — open/close cycles never re-register.
    assert.equal(source.match(/_setupRelayInput\(\) \{/g)?.length, 1, 'setup defined once');
    assert.equal(source.match(/this\._setupRelayInput\(\);/g)?.length, 1, 'setup called once');

    // Each scene.input listener is registered exactly once in the whole file.
    for (const evt of ['pointerdown', 'pointermove', 'pointerup', 'gameout']) {
      assert.equal(
        source.match(new RegExp(`scene\\.input\\.on\\('${evt}'`, 'g'))?.length,
        1,
        `scene.input.on('${evt}') must appear exactly once`,
      );
    }

    // The open/close method bodies (up to the cursor helper that follows
    // them) register no listeners and schedule no repeated work.
    const openIdx = source.indexOf('openRelayCloseup() {');
    const cursorIdx = source.indexOf('_probeCursor() {');
    assert.ok(openIdx > 0 && cursorIdx > openIdx);
    const openCloseSpan = source.slice(openIdx, cursorIdx);
    assert.ok(!openCloseSpan.includes('input.on('), 'open/close must not add input listeners');
    assert.ok(!openCloseSpan.includes('addEventListener'), 'open/close must not add DOM listeners');
    assert.ok(!openCloseSpan.includes('setInterval'), 'open/close must not start intervals');

    // destroy() removes every listener registered in _setupRelayInput plus
    // the blur hook.
    const destroyIdx = source.lastIndexOf('\n  destroy() {');
    assert.ok(destroyIdx > 0);
    const destroySpan = source.slice(destroyIdx);
    for (const evt of ['pointerdown', 'pointermove', 'pointerup', 'gameout']) {
      assert.ok(
        destroySpan.includes(`input.off('${evt}'`),
        `destroy must remove the '${evt}' listener`,
      );
    }
    assert.ok(
      destroySpan.includes("removeEventListener('blur'"),
      'destroy must remove the window blur hook',
    );
  });
});

// ---------------------------------------------------------------------------
// C. Focus-loss recovery (work package §4.3): cancelDrag mid-drag must return
// the tip to its last legal state, never strand it, never fire a stale
// placement or press afterwards.
//
// Mock-scene coordinates (960x600 canvas, no offset):
//   coil rest tip (238, 326)   output rest tip (722, 326)
//   coil-a1 (390, 430)         no-14 (580, 452)
//   TEST hit rect x356..448 y462..518 -> press point (400, 490)
// ---------------------------------------------------------------------------

describe('focus-loss recovery (cancelDrag)', () => {
  const COIL_REST = { x: 238, y: 326 };
  const COIL_A1 = { x: 390, y: 430 };
  const NO_14 = { x: 580, y: 452 };
  const TEST_POINT = { x: 400, y: 490 };

  function makeDragRig() {
    const scene = createMockScene();
    const art = new RelayCabinetArt(scene);
    const relay = createRelayCabinet();
    relay.enter();
    const sync = () => {
      relay.drainEvents().forEach((evt) => art.handleEvent(evt));
      art.applySnapshot(relay.snapshot());
    };
    sync();
    return { scene, art, relay, sync };
  }

  it('blur mid-drag with an unconnected lead: tip springs back to rest, no stale placement', () => {
    const { art, relay } = makeDragRig();

    const grab = art.pointerDown(COIL_REST.x, COIL_REST.y);
    assert.deepEqual(grab, { grabbed: 'coil-lead', from: null });
    assert.equal(art.getState().drag, 'coil-lead');

    art.pointerMove(300, 300); // drag somewhere over the case
    // window blur / pointer leaves canvas:
    const cancelled = art.cancelDrag();
    assert.deepEqual(cancelled, { cancelled: 'coil-lead' });
    assert.equal(art.getState().drag, null, 'drag must not stay locked');
    const tip = art.getState().leads.coil.tip;
    assert.deepEqual(tip, COIL_REST, 'tip returns to its last legal state (rest hang)');

    // A pointerUp landing exactly on a terminal afterwards must NOT place.
    const stale = art.pointerUp(COIL_A1.x, COIL_A1.y);
    assert.equal(stale, null, 'no stale placement after cancelDrag');
    assert.equal(relay.snapshot().coilLeadTerminal, null);
    assert.equal(relay.snapshot().coilEnergized, false);
  });

  it('blur mid-drag with a connected lead: tip returns to its terminal, logic untouched', () => {
    const { art, relay, sync } = makeDragRig();
    relay.connect('coil', 'coil-a1');
    sync();
    assert.deepEqual(art.getState().leads.coil.tip, COIL_A1);

    const grab = art.pointerDown(COIL_A1.x, COIL_A1.y);
    assert.deepEqual(grab, { grabbed: 'coil-lead', from: 'coil-a1' });
    art.pointerMove(300, 350);
    art.cancelDrag();

    assert.equal(art.getState().drag, null);
    assert.deepEqual(
      art.getState().leads.coil.tip,
      COIL_A1,
      'tip returns to the terminal the logic still holds',
    );
    // cancelDrag never touches the wiring.
    assert.equal(relay.snapshot().coilLeadTerminal, 'coil-a1');
    assert.equal(relay.snapshot().coilEnergized, true);

    // A later pointerUp on another terminal must not silently rewire.
    const stale = art.pointerUp(NO_14.x, NO_14.y);
    assert.equal(stale, null);
    assert.equal(relay.snapshot().coilLeadTerminal, 'coil-a1');
    assert.equal(relay.snapshot().outputLeadTerminal, null);
  });

  it('blur with an armed TEST press leaves no _press residue', () => {
    const { art, relay } = makeDragRig();

    const down = art.pointerDown(TEST_POINT.x, TEST_POINT.y);
    assert.equal(down, null, 'pressing TEST returns null on pointerDown');
    // window blur while the handle is held:
    const cancelled = art.cancelDrag();
    assert.equal(cancelled, null, 'no drag to cancel, but the press is dropped');

    // Releasing inside the TEST region afterwards must NOT fire a stale press.
    const stale = art.pointerUp(TEST_POINT.x, TEST_POINT.y);
    assert.equal(stale, null, 'no stale { pressed } after cancelDrag');
    assert.equal(relay.snapshot().testState, 'idle');
    assert.deepEqual(relay.drainEvents(), [], 'no test event may leak through');

    // Control: the same down/up WITHOUT a cancel does press the handle.
    const { art: art2 } = makeDragRig();
    art2.pointerDown(TEST_POINT.x, TEST_POINT.y);
    const pressed = art2.pointerUp(TEST_POINT.x, TEST_POINT.y);
    assert.deepEqual(pressed, { pressed: 'test' });
  });

  it('a fresh drag immediately after blur works normally (no soft-lock)', () => {
    const { art, relay, sync } = makeDragRig();

    art.pointerDown(COIL_REST.x, COIL_REST.y);
    art.pointerMove(300, 300);
    art.cancelDrag();

    // Player grabs the tip again and lands it on A1.
    const grab = art.pointerDown(COIL_REST.x, COIL_REST.y);
    assert.deepEqual(grab, { grabbed: 'coil-lead', from: null });
    art.pointerMove(COIL_A1.x, COIL_A1.y);
    const drop = art.pointerUp(COIL_A1.x, COIL_A1.y);
    assert.deepEqual(drop, { lead: 'coil', placed: 'coil-a1', from: null });

    // The integration layer confirms the optimistic snap through the logic.
    const result = relay.connect('coil', drop.placed);
    assert.equal(result.accepted, true);
    sync();
    assert.equal(relay.snapshot().coilEnergized, true);
    assert.deepEqual(art.getState().leads.coil.tip, COIL_A1);
  });
});

// ---------------------------------------------------------------------------
// D. Restart consistency: full chain -> destroy every instance -> rebuild ->
// full chain. Both runs must be identical in events and terminal snapshots.
// ---------------------------------------------------------------------------

describe('restart consistency', () => {
  function runFullChain() {
    const rig = createChainRig();
    driveCompleteRoute(rig);
    return {
      rig,
      contact: rig.contact.snapshot(),
      relay: rig.relay.snapshot(),
      eventTypes: typesOf(rig.events),
      eventSources: rig.events.map((e) => e.source),
    };
  }

  it('second run after full teardown deep-equals the first run', () => {
    const first = runFullChain();
    assert.equal(first.contact.complete, true);

    // Tear everything down (scene-restart path).
    first.rig.contact.destroy();
    first.rig.relay.destroy();
    assert.equal(first.rig.contact.snapshot().destroyed, true);
    assert.equal(first.rig.relay.snapshot().destroyed, true);
    assert.deepEqual(first.rig.contact.drainEvents(), []);
    assert.deepEqual(first.rig.relay.drainEvents(), []);

    const second = runFullChain();
    assert.deepEqual(second.eventTypes, first.eventTypes);
    assert.deepEqual(second.eventSources, first.eventSources);
    assert.deepEqual(second.contact, first.contact);
    assert.deepEqual(second.relay, first.relay);
    // And both runs equal the standalone complete fixture.
    const complete = driveChainState('complete');
    assert.deepEqual(second.eventTypes, typesOf(complete.events));
    assert.deepEqual(second.contact, complete.contact);
    assert.deepEqual(second.relay, complete.relay);
  });
});

// ---------------------------------------------------------------------------
// E. Legacy entry guards.
// ---------------------------------------------------------------------------

describe('legacy entry guards', () => {
  it('entry is the only non-frozen phase2 QA state', () => {
    assert.equal(shouldFreezePhase2QAState('entry'), false);
    PHASE2_QA_STATE_NAMES.filter((name) => name !== 'entry').forEach((name) => {
      assert.equal(shouldFreezePhase2QAState(name), true, name);
    });
  });

  it('legacy mode (no isRelaySolved hook) still runs the single-segment trace', () => {
    const lock = createContactInterlock(); // no hook wired: legacy standalone
    lock.enter();
    lock.interact('latch');
    lock.update(CONTACT_INTERLOCK_DEFAULTS.propagationMs);
    const mid = lock.snapshot();
    // Straight through: no waiting segment, no relay seam event.
    assert.equal(mid.relayWaiting, false);
    assert.equal(mid.signalProgress, 1);
    assert.equal(mid.preRelayProgress, 1);
    assert.equal(mid.postRelayProgress, 1);
    assert.equal(mid.circuitEnergized, true);
    assert.deepEqual(typesOf(lock.drainEvents()), [
      'latch-reset',
      'trace-started',
      'trace-energized', // never 'trace-reached-relay' in legacy mode
    ]);
    // POWER completes exactly like the old single-run machine.
    const result = lock.interact('power');
    assert.equal(result.accepted, true);
    assert.equal(result.complete, true);
  });

  it('legacy phase2 QA drivers behave as before, with and without a cabinet', () => {
    // Old route semantics: drivePhase2State WITHOUT config.relay keeps the
    // legacy straight-through behaviour — no waiting segment exists, so the
    // 'relay-waiting' drive lands straight on energized (phase2Qa.js header:
    // "without one the drivers behave as before (no relay wired)").
    const complete = drivePhase2State('complete');
    assert.equal(complete.snapshot.complete, true);
    assert.equal(complete.snapshot.circuitEnergized, true);
    const energized = drivePhase2State('energized');
    assert.equal(energized.snapshot.circuitEnergized, true);
    assert.equal(energized.snapshot.contactorClosed, false);
    const legacyWaiting = drivePhase2State('relay-waiting');
    assert.equal(legacyWaiting.snapshot.relayWaiting, false, 'no cabinet: nothing to wait for');
    assert.equal(legacyWaiting.snapshot.circuitEnergized, true, 'signal runs straight through');

    // The live route's call shape (TimetablePuzzle ~L3769): the interlock is
    // built with isRelaySolved wired, then THAT instance plus the live
    // cabinet are passed together. The drivers then park at the cabinet and
    // bridge it through its public API.
    const relay = createRelayCabinet();
    const lock = createContactInterlock({ isRelaySolved: () => relay.isSolved() });
    const waiting = drivePhase2State('relay-waiting', lock, { relay });
    assert.equal(waiting.snapshot.relayWaiting, true);
    assert.equal(waiting.snapshot.circuitEnergized, false);
    const relay2 = createRelayCabinet();
    const lock2 = createContactInterlock({ isRelaySolved: () => relay2.isSolved() });
    const wiredComplete = drivePhase2State('complete', lock2, { relay: relay2 });
    assert.equal(wiredComplete.snapshot.complete, true);
    assert.equal(relay2.isSolved(), true, 'drivers bridge the cabinet via its public API');
  });
});
