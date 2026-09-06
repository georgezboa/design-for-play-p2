// Car 03 V2 // MOVE AS ONE — behavior tests for the pure model.
// Runs under `node --test` only. No Phaser, no DOM, no real timers.
//
// Proves the 16 required behaviors from
// docs/CAR_03_QWEN_V2_READABLE_REBUILD_WORK_PACKAGE.md against
// createCar03V2Model (docs/CAR_03_DESIGN_LOCK_V2_READABLE_PLAY.md is the
// authoritative gameplay spec). Every test drives update(dtMs, input) and
// asserts observable snapshot/event state — nothing here is tautological.
//
// World constants used below (work package):
//   5 bays × 960px (0..4800); lanes 0=far, 1=near; checkpoint = bay*960+120.
//   SC1 x=1560 (teach), SC2 x=2560 (real), ARCH x=3520 (non-punishing),
//   FINAL x=4360 (real), final door x=4720, scan half-width 90.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  createCar03V2Model,
  createSocialStealthModel,
  CAR03_V2_DEFAULTS,
} from '../../src/cars/presentCity/socialStealthModel.js';
import { LANE_FAR, LANE_NEAR } from '../../src/constants.js';

const DT = 16;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function tickMs(model, totalMs, input = {}) {
  let remaining = totalMs;
  while (remaining > 0) {
    const step = Math.min(DT, remaining);
    model.update(step, input);
    remaining -= step;
  }
}

// Tick until pred(snapshot) holds. `input` is a per-frame input object or a
// function of the current snapshot. Fails the test on timeout.
function runUntil(model, pred, input, { maxMs = 90000, label = 'condition' } = {}) {
  let t = 0;
  while (t <= maxMs) {
    const snap = model.snapshot();
    if (pred(snap)) return snap;
    const inp = typeof input === 'function' ? input(snap) : input;
    model.update(DT, inp ?? {});
    t += DT;
  }
  assert.fail(`${label} did not happen within ${maxMs}ms`);
}

function changeLane(model, lane) {
  const key = lane === LANE_FAR ? 'laneFar' : 'laneNear';
  model.update(DT, { [key]: true });
  runUntil(model, (s) => s.player.lane === lane && s.player.laneTransition === null, {}, {
    maxMs: 5000,
    label: `lane change to ${lane}`,
  });
}

// Wait until `id` is the highlighted (eligible) target, then press E and
// assert the match actually started on it.
function matchWhenEligible(model, id, { approach = null, maxMs = 90000 } = {}) {
  runUntil(model, (s) => s.target.eligible && s.target.id === id, approach ?? {}, {
    maxMs,
    label: `target ${id} eligible`,
  });
  model.pressInteract();
  const after = model.snapshot();
  assert.equal(after.match.active, true, `E beside ${id} must start a match`);
  assert.equal(after.match.targetId, id);
  return after;
}

function scanner(snap, id) {
  return snap.scanners.find((s) => s.id === id);
}

function eventTypes(model) {
  return model.drainEvents().map((e) => e.type);
}

// -- scripted progression through the beats ----------------------------------
// The helpers are composable: each one only plays the beats that have not
// happened yet, so playToB4(m) works on a model already advanced by playToB2.

function playToB1(m) {
  if (m.snapshot().beatId < 1) {
    // The Beat 0 demo completes at ~10s of model time; the player idles.
    runUntil(m, (s) => s.beatId >= 1, {}, { maxMs: 30000, label: 'demo complete / beat 1' });
  }
  const s = m.snapshot();
  assert.equal(s.demo.complete, true, 'precondition: demo complete');
  assert.ok(s.beatId >= 1, 'precondition: at least beat 1');
  return s;
}

function playToB2(m) {
  playToB1(m);
  if (m.snapshot().beatId < 2) {
    matchWhenEligible(m, 'G1', { approach: { right: true } });
    runUntil(m, (s) => s.beatId >= 2, { right: true }, { label: 'beat 2 crossing' });
  }
  assert.ok(m.snapshot().beatId >= 2, 'precondition: at least beat 2');
}

function playToB3(m) {
  playToB2(m);
  if (m.snapshot().beatId < 3) {
    m.pressInteract(); // release G1
    assert.equal(m.snapshot().match.active, false);
    // Walk toward the luggage obstruction zone on the near lane.
    runUntil(m, (s) => s.player.x >= 2260, { right: true }, { label: 'walk to obstruction' });
    changeLane(m, LANE_FAR);
    matchWhenEligible(m, 'G2F'); // waits for the fast far group to pass
    runUntil(m, (s) => s.beatId >= 3, { right: true }, { label: 'beat 3 crossing' });
  }
  assert.ok(m.snapshot().beatId >= 3, 'precondition: at least beat 3');
}

function playToB4(m) {
  playToB3(m);
  if (m.snapshot().beatId < 4) {
    m.pressInteract(); // release G2F
    changeLane(m, LANE_NEAR);
    matchWhenEligible(m, 'companion', { approach: { right: true } });
    runUntil(m, (s) => s.beatId >= 4, { right: true }, { label: 'arch acceptance / alert' });
  }
  const s = m.snapshot();
  assert.equal(s.alertActive, true, 'precondition: alert active');
  assert.equal(s.companion.x, 4150, 'precondition: companion separated');
  assert.equal(s.companion.state, 'separated');
  return s;
}

function completeFromB4(m) {
  matchWhenEligible(m, 'companion', { approach: { right: true } });
  assert.equal(m.snapshot().match.kind, 'companion');
  runUntil(m, (s) => s.doorOpen, { right: true }, { label: 'FINAL safe crossing / door open' });
  const done = runUntil(m, (s) => s.complete, { right: true }, { label: 'completion' });
  assert.equal(done.complete, true);
  return done;
}

function completeRun(m) {
  playToB4(m);
  return completeFromB4(m);
}

// ---------------------------------------------------------------------------
// API surface
// ---------------------------------------------------------------------------

describe('car03v2 API surface', () => {
  it('exports the V2 factory and keeps the stable import name', () => {
    assert.equal(typeof createCar03V2Model, 'function');
    assert.equal(createSocialStealthModel, createCar03V2Model);
    assert.equal(typeof CAR03_V2_DEFAULTS, 'object');
  });

  it('factory returns the locked pure API', () => {
    const m = createCar03V2Model();
    for (const k of ['update', 'pressInteract', 'snapshot', 'drainEvents', 'reset']) {
      assert.equal(typeof m[k], 'function', `missing method: ${k}`);
    }
  });

  it('snapshot is a deep clone (mutation does not leak into the model)', () => {
    const m = createCar03V2Model();
    const a = m.snapshot();
    a.player.x = 9999;
    a.scanners[0].state = 'flagged';
    a.groups[0].x = -5;
    const b = m.snapshot();
    assert.notEqual(b.player.x, 9999);
    assert.notEqual(b.scanners[0].state, 'flagged');
    assert.notEqual(b.groups[0].x, -5);
  });
});

// ---------------------------------------------------------------------------
// Beat structure and demo
// ---------------------------------------------------------------------------

describe('beat 0 demonstration', () => {
  it('demo completes at ~10s of model time and emits demo-complete + beat-advance', () => {
    const m = createCar03V2Model();
    tickMs(m, 9000);
    assert.equal(m.snapshot().demo.complete, false);
    assert.equal(m.snapshot().beatId, 0);
    tickMs(m, 1500);
    const s = m.snapshot();
    assert.equal(s.demo.played, true);
    assert.equal(s.demo.complete, true);
    assert.equal(s.beatId, 1);
    const ev = m.drainEvents();
    const types = ev.map((e) => e.type);
    assert.ok(types.includes('demo-complete'), `events: ${types.join(',')}`);
    assert.ok(types.includes('beat-advance'));
    assert.ok(
      ev.findIndex((e) => e.type === 'demo-complete') < ev.findIndex((e) => e.type === 'beat-advance'),
      'demo-complete must precede beat-advance',
    );
  });

  it('objectiveId follows the locked per-beat table', () => {
    const m = createCar03V2Model();
    assert.equal(m.snapshot().objectiveId, 'REACH_THE_LAST_DOOR');
    playToB1(m);
    assert.equal(m.snapshot().objectiveId, 'MATCH_A_GROUP_THEN_WALK_THROUGH');
    playToB2(m);
    assert.equal(m.snapshot().objectiveId, 'RELEASE_CHANGE_LANE_MATCH_OTHER');
    playToB3(m);
    assert.equal(m.snapshot().objectiveId, 'MATCH_TEAL_SCARF_PASSENGER');
    playToB4(m);
    assert.equal(m.snapshot().objectiveId, 'FIND_PARTNER_MATCH_THREE_STEPS');
  });
});

// ---------------------------------------------------------------------------
// Behavior 1 — E without an eligible highlighted target does nothing.
// ---------------------------------------------------------------------------

describe('behavior 1: E with no eligible target is a no-op', () => {
  it('at spawn there is no target and E only emits interact-noop', () => {
    const m = createCar03V2Model();
    const s = m.snapshot();
    assert.equal(s.target.eligible, false);
    assert.equal(s.target.kind, null);
    assert.equal(s.target.id, null);
    m.drainEvents();
    m.pressInteract();
    assert.deepEqual(eventTypes(m), ['interact-noop']);
    assert.equal(m.snapshot().match.active, false);
  });

  it('in an empty stretch after the demo, E is still a no-op', () => {
    const m = createCar03V2Model();
    playToB1(m);
    // x=1430: G1 never goes past 1310 (>100 away) and SC1 volume starts 1470.
    runUntil(m, (s) => s.player.x >= 1430, { right: true }, { label: 'walk to empty stretch' });
    const s = m.snapshot();
    assert.equal(s.target.eligible, false);
    m.drainEvents();
    m.pressInteract();
    assert.deepEqual(eventTypes(m), ['interact-noop']);
    assert.equal(m.snapshot().match.active, false);
  });
});

// ---------------------------------------------------------------------------
// Behavior 2 — E on the highlighted group starts one match; E again releases.
// ---------------------------------------------------------------------------

describe('behavior 2: E starts and releases the match', () => {
  it('E on highlighted G1 starts one match; E again releases it', () => {
    const m = createCar03V2Model();
    playToB1(m);
    const before = runUntil(m, (s) => s.target.eligible && s.target.id === 'G1', { right: true }, {
      label: 'G1 eligible',
    });
    assert.equal(before.target.kind, 'group');
    assert.equal(before.target.eligible, true);
    m.drainEvents();
    m.pressInteract();
    const started = m.drainEvents();
    assert.deepEqual(started.map((e) => e.type), ['match-started']);
    assert.equal(started[0].payload.kind, 'group');
    assert.equal(started[0].payload.targetId, 'G1');
    const s = m.snapshot();
    assert.equal(s.match.active, true);
    assert.equal(s.match.targetId, 'G1');
    assert.equal(s.match.kind, 'group');
    assert.equal(s.match.stepInMsLeft, 250, 'visible 250ms step-in');
    // step-in finishes with model time
    tickMs(m, 300);
    assert.equal(m.snapshot().match.stepInMsLeft, 0);
    m.drainEvents();
    m.pressInteract();
    assert.deepEqual(eventTypes(m), ['match-released']);
    const after = m.snapshot();
    assert.equal(after.match.active, false);
    assert.equal(after.match.targetId, null);
  });
});

// ---------------------------------------------------------------------------
// Behavior 3 — E never triggers rescue / transfer / duo-priority semantics.
// ---------------------------------------------------------------------------

describe('behavior 3: E has exactly one meaning (match/release)', () => {
  it('a full run emits no rescue/transfer/duo-priority events or state', () => {
    const m = createCar03V2Model();
    completeRun(m);
    const all = m.drainEvents();
    const types = new Set(all.map((e) => e.type));
    const forbidden = [
      'rescue', 'companion-rescued', 'companion-detached', 'companion-recovered',
      'group-transfer', 'transfer', 'duo-established', 'duo-priority',
      'detach', 'detached', 'anchored', 'cadence-started', 'cadence-aborted',
      'locked', 'lock-released',
    ];
    for (const f of forbidden) {
      assert.ok(!types.has(f), `forbidden V1 event present: ${f}`);
    }
    // The companion was matched only through the ordinary match event.
    const companionMatches = all.filter((e) => e.type === 'match-started' && e.payload.kind === 'companion');
    assert.ok(companionMatches.length >= 2, 'companion matched in B3 and again in B4');
    // No hidden V1 state exists on the snapshot.
    const snap = m.snapshot();
    assert.ok(!('duo' in snap), 'no hidden duo alignment state');
    assert.ok(!('qaState' in snap), 'no QA-warp state');
    assert.ok(!('anchoredGroupId' in snap.player), 'no anchoring state');
    assert.ok(!('exposureMs' in snap.player), 'no hidden exposure state');
  });

  it('E beside the companion only creates an ordinary match', () => {
    const m = createCar03V2Model();
    playToB4(m);
    m.drainEvents(); // isolate the events of this final match press
    matchWhenEligible(m, 'companion', { approach: { right: true } });
    const s = m.snapshot();
    assert.equal(s.match.active, true);
    assert.equal(s.match.kind, 'companion');
    assert.equal(s.match.targetId, 'companion');
    assert.equal(s.match.stepInMsLeft <= 250, true);
    assert.equal(s.companion.state, 'matched');
    // Only the ordinary match event was emitted by that press.
    const recent = m.drainEvents().filter((e) => e.type === 'match-started');
    assert.equal(recent.length, 1);
    assert.equal(recent[0].payload.kind, 'companion');
  });
});

// ---------------------------------------------------------------------------
// Behavior 4 — lane change is diagonal over 250ms and breaks the match.
// ---------------------------------------------------------------------------

describe('behavior 4: diagonal lane change breaks incompatible match', () => {
  it('laneFar starts a 250ms transition, releases the match, and completes to the far lane', () => {
    const m = createCar03V2Model();
    playToB1(m);
    matchWhenEligible(m, 'G1', { approach: { right: true } });
    assert.equal(m.snapshot().match.active, true);
    m.drainEvents();
    m.update(DT, { laneFar: true });
    const s = m.snapshot();
    assert.ok(s.player.laneTransition, 'transition must exist');
    assert.equal(s.player.laneTransition.from, LANE_NEAR);
    assert.equal(s.player.laneTransition.to, LANE_FAR);
    assert.equal(s.player.laneTransition.msTotal, 250);
    assert.equal(s.player.laneTransition.msLeft, 250);
    assert.equal(s.match.active, false, 'lane change start breaks the match');
    assert.ok(eventTypes(m).includes('match-released'));
    // Mid-transition: still on the near lane, progress visible (no teleport).
    tickMs(m, 128);
    const mid = m.snapshot();
    assert.equal(mid.player.lane, LANE_NEAR);
    assert.ok(mid.player.laneTransition.msLeft < 250 && mid.player.laneTransition.msLeft > 0);
    // Complete the transition.
    tickMs(m, 250);
    const done = m.snapshot();
    assert.equal(done.player.lane, LANE_FAR);
    assert.equal(done.player.laneTransition, null);
  });
});

// ---------------------------------------------------------------------------
// Behavior 5 — SC1 cannot punish before teaching completes; lenient after.
// ---------------------------------------------------------------------------

describe('behavior 5: teaching scanner cannot punish', () => {
  it('3s inside SC1 pre-demo: never flagged; after demo: warns but never flags', () => {
    const m = createCar03V2Model();
    // Walk into the SC1 volume before the demo completes (~6.8s < 10s).
    runUntil(m, (s) => s.player.x >= 1480, { right: true }, { label: 'reach SC1 pre-demo' });
    assert.equal(m.snapshot().demo.complete, false, 'precondition: still in the demo');
    // Sit in the volume for 3s of model time, pre-demo.
    for (let t = 0; t < 3000; t += DT) {
      m.update(DT, {});
      const s = m.snapshot();
      assert.notEqual(scanner(s, 'SC1').state, 'flagged', 'SC1 must never flag during the demo');
      assert.equal(s.player.frozenMsLeft, 0, 'no punishment freeze during the demo');
    }
    assert.equal(m.snapshot().demo.complete, false, 'still pre-demo during the sit');
    // Let the demo finish while the player stays inside the volume.
    tickMs(m, 1200);
    assert.equal(m.snapshot().beatId, 1);
    // Another 3s unmatched inside SC1 after the teaching: lenient forever.
    for (let t = 0; t < 3000; t += DT) {
      m.update(DT, {});
      assert.notEqual(scanner(m.snapshot(), 'SC1').state, 'flagged', 'teach scanner never flags');
    }
    const sc1 = scanner(m.snapshot(), 'SC1');
    assert.equal(sc1.state, 'warning', 'amber warning is the maximum');
    assert.ok(sc1.warnMs >= 1500, `well past the real flag threshold; warnMs=${sc1.warnMs}`);
    assert.ok(!eventTypes(m).includes('flagged'), 'no flagged event in the whole run');
  });
});

// ---------------------------------------------------------------------------
// Behavior 6 — matched movement makes a scanner safe.
// ---------------------------------------------------------------------------

describe('behavior 6: matched movement makes SC2 safe', () => {
  it('riding G2F through SC2 shows safe + PATTERN OK', () => {
    const m = createCar03V2Model();
    playToB2(m);
    m.pressInteract(); // release G1
    runUntil(m, (s) => s.player.x >= 2260, { right: true }, { label: 'walk to obstruction' });
    changeLane(m, LANE_FAR);
    matchWhenEligible(m, 'G2F');
    tickMs(m, 300); // finish the step-in so movement is live
    let sawSafe = false;
    let panel = '';
    let warnMsInside = -1;
    runUntil(m, (s) => {
      const sc2 = scanner(s, 'SC2');
      const inVolume = Math.abs(s.player.x - 2560) <= 90;
      if (inVolume && s.match.active) {
        if (sc2.state === 'safe') {
          sawSafe = true;
          panel = sc2.panelText;
          warnMsInside = sc2.warnMs;
        }
      }
      return s.beatId >= 3;
    }, { right: true }, { label: 'beat 3 via matched SC2 crossing' });
    assert.ok(sawSafe, 'SC2 must read safe while the matched player is inside');
    assert.equal(panel, 'PATTERN OK');
    assert.equal(warnMsInside, 0, 'safe scanner does not accumulate warning');
  });
});

// ---------------------------------------------------------------------------
// Behavior 7 — unmatched exposure warns at 600ms and flags at 1500ms.
// ---------------------------------------------------------------------------

describe('behavior 7: SC2 real warning/flag thresholds', () => {
  it('unmatched in SC2: warning at 600ms, flag at 1500ms, 350ms freeze', () => {
    const m = createCar03V2Model();
    playToB1(m);
    // Walk straight into SC2's volume unmatched (player passes SC1, which is
    // lenient, and enters SC2 at x>=2470 after the demo has completed).
    runUntil(m, (s) => s.player.x >= 2500, { right: true }, { label: 'reach SC2 unmatched' });
    m.drainEvents();
    tickMs(m, 700);
    let sc2 = scanner(m.snapshot(), 'SC2');
    assert.equal(sc2.state, 'warning', 'amber at the 600ms threshold');
    assert.ok(sc2.warnMs >= 600 && sc2.warnMs < 1500, `warnMs=${sc2.warnMs}`);
    tickMs(m, 900); // crosses the 1500ms flag threshold mid-block
    const s = m.snapshot();
    sc2 = scanner(s, 'SC2');
    assert.equal(sc2.state, 'flagged');
    assert.equal(sc2.panelText, 'ALONE — MATCH SOMEONE');
    assert.ok(s.player.frozenMsLeft > 0, 'flag freezes the scene');
    assert.ok(eventTypes(m).includes('flagged'));
  });
});

// ---------------------------------------------------------------------------
// Behavior 8 — flagging returns only to the active bay checkpoint.
// ---------------------------------------------------------------------------

describe('behavior 8: flag returns to the active bay checkpoint only', () => {
  it('flag at SC2 (bay 2) returns exactly to bay 2 checkpoint 2040', () => {
    const m = createCar03V2Model();
    playToB1(m);
    runUntil(m, (s) => s.player.x >= 2500, { right: true }, { label: 'reach SC2 unmatched' });
    const bayAtFlag = m.snapshot().bayIndex;
    assert.equal(bayAtFlag, 2);
    tickMs(m, 2000); // warn + flag + freeze
    const s = m.snapshot();
    assert.equal(s.player.checkpointX, 2 * 960 + 120);
    assert.equal(s.player.x, 2040, 'player returned to the bay 2 safe line');
    assert.notEqual(s.player.x, 1 * 960 + 120, 'not bay 1');
    assert.notEqual(s.player.x, 0 * 960 + 120, 'not bay 0');
    assert.ok(eventTypes(m).includes('checkpoint-return'));
    const sc2 = scanner(m.snapshot(), 'SC2');
    assert.equal(sc2.state, 'idle');
    assert.equal(sc2.warnMs, 0);
  });

  it('flag at FINAL (bay 4) returns exactly to bay 4 checkpoint 3960', () => {
    const m = createCar03V2Model();
    playToB4(m);
    // Walk alone past the separated companion and into FINAL's volume, then
    // stop inside it (a lone walker needs the full 1500ms to be flagged).
    runUntil(m, (s) => s.player.x >= 4280, { right: true }, { label: 'enter FINAL volume alone' });
    runUntil(m, (s) => s.player.frozenMsLeft > 0, {}, { label: 'flagged at FINAL' });
    const flagged = m.drainEvents().find((e) => e.type === 'flagged');
    assert.ok(flagged, 'flagged event emitted');
    assert.equal(flagged.payload.checkpointX, 4 * 960 + 120);
    tickMs(m, 500); // freeze resolves
    assert.equal(m.snapshot().player.x, 3960);
  });
});

// ---------------------------------------------------------------------------
// Behavior 9 — Beat 2 cannot be solved on the near lane.
// ---------------------------------------------------------------------------

describe('behavior 9: beat 2 requires the viable lane/group', () => {
  it('matched G2N + right for 5s never crosses SC2; release+lane change+G2F does', () => {
    const m = createCar03V2Model();
    playToB2(m);
    m.pressInteract(); // release G1
    // Walk to the halted near-lane group at the luggage obstruction.
    runUntil(m, (s) => s.player.x >= 2300, { right: true }, { label: 'walk to G2N' });
    const tgt = m.snapshot().target;
    assert.equal(tgt.id, 'G2N', 'the highlighted target near the obstruction is G2N');
    matchWhenEligible(m, 'G2N');
    tickMs(m, 300); // step-in
    // Hold right for 5s on the halted group: no SC2 crossing is possible.
    let maxX = -Infinity;
    for (let t = 0; t < 5000; t += DT) {
      m.update(DT, { right: true });
      const s = m.snapshot();
      maxX = Math.max(maxX, s.player.x);
      assert.equal(s.beatId, 2, 'beat must stay 2 while the near route is blocked');
    }
    assert.ok(maxX <= 2390, `player rides the halted group only; maxX=${maxX}`);
    assert.ok(maxX < 2470, 'never enters the SC2 volume on the near route');
    // The real solution: release, diagonal lane change, match the far group.
    m.pressInteract();
    assert.equal(m.snapshot().match.active, false);
    changeLane(m, LANE_FAR);
    matchWhenEligible(m, 'G2F');
    tickMs(m, 300);
    let sawSafe = false;
    runUntil(m, (s) => {
      const sc2 = scanner(s, 'SC2');
      if (Math.abs(s.player.x - 2560) <= 90 && sc2.state === 'safe') sawSafe = true;
      return s.beatId >= 3;
    }, { right: true }, { label: 'beat 3 on the far lane' });
    assert.ok(sawSafe, 'SC2 safe on the viable crossing');
  });
});

// ---------------------------------------------------------------------------
// Behavior 10 — companion uses the same match contract as groups.
// ---------------------------------------------------------------------------

describe('behavior 10: companion shares the ordinary match contract', () => {
  it('far from the companion E is a no-op; beside them E matches/releases like a group', () => {
    const m = createCar03V2Model();
    playToB3(m);
    m.pressInteract(); // release G2F after the crossing
    changeLane(m, LANE_NEAR); // companion waits on the near lane
    // Far from any eligible target on this lane: no prompt, no-op.
    const far = m.snapshot();
    assert.equal(far.target.eligible, false);
    m.drainEvents();
    m.pressInteract();
    assert.deepEqual(eventTypes(m), ['interact-noop']);
    // Approach the teal-scarf companion on the near lane.
    const before = runUntil(m, (s) => s.target.eligible && s.target.id === 'companion', { right: true }, {
      label: 'companion eligible',
    });
    assert.equal(before.target.kind, 'companion');
    m.drainEvents();
    m.pressInteract();
    const started = m.drainEvents();
    assert.deepEqual(started.map((e) => e.type), ['match-started']);
    assert.equal(started[0].payload.kind, 'companion');
    const s = m.snapshot();
    assert.equal(s.match.active, true);
    assert.equal(s.match.kind, 'companion');
    assert.equal(s.match.stepInMsLeft, 250, 'same 250ms step-in as groups');
    assert.equal(s.companion.state, 'matched');
    // Matched movement: holding right moves the pair together.
    const x0 = s.player.x;
    tickMs(m, 1000, { right: true });
    const moved = m.snapshot();
    assert.ok(moved.player.x > x0 + 100, `pair must move right together; x ${x0} -> ${moved.player.x}`);
    assert.equal(moved.companion.x, Math.round((moved.player.x - 36) * 100) / 100);
    assert.equal(moved.companion.state, 'matched');
    // E again releases, exactly like a group match. The pips earned while
    // walking together reset on separation, so duo-reset precedes the release.
    m.drainEvents();
    m.pressInteract();
    assert.deepEqual(eventTypes(m), ['duo-reset', 'match-released']);
    const after = m.snapshot();
    assert.equal(after.match.active, false);
    assert.equal(after.duoSteps, 0);
    assert.equal(after.companion.state, 'waiting', 'pre-alert release returns to waiting');
  });
});

// ---------------------------------------------------------------------------
// Behavior 11 — three synchronized steps fill the pips 0→3.
// ---------------------------------------------------------------------------

describe('behavior 11: three steps fill 0 to 3', () => {
  it('walking right with the matched companion steps duoSteps 1, 2, 3', () => {
    const m = createCar03V2Model();
    playToB4(m);
    matchWhenEligible(m, 'companion', { approach: { right: true } });
    tickMs(m, 300); // step-in
    assert.equal(m.snapshot().duoSteps, 0);
    m.drainEvents();
    const seen = new Set();
    runUntil(m, (s) => {
      if (s.duoSteps > 0) seen.add(s.duoSteps);
      return s.duoSteps === 3;
    }, { right: true }, { label: 'duoSteps reaches 3' });
    assert.deepEqual([...seen].sort(), [1, 2, 3], 'pips fill 1, 2, 3 in order');
    const steps = m.drainEvents().filter((e) => e.type === 'duo-step');
    assert.equal(steps.length, 3);
    assert.deepEqual(steps.map((e) => e.payload.steps), [1, 2, 3]);
    assert.equal(m.snapshot().duoSteps, 3);
  });
});

// ---------------------------------------------------------------------------
// Behavior 12 — stop pauses; reverse or separate resets the pips.
// ---------------------------------------------------------------------------

describe('behavior 12: stop pauses, reverse/separate resets', () => {
  it('stopping holds partial progress; reversing resets; releasing resets', () => {
    const m = createCar03V2Model();
    playToB4(m);
    matchWhenEligible(m, 'companion', { approach: { right: true } });
    tickMs(m, 300);
    // One full step plus partial progress.
    runUntil(m, (s) => s.duoSteps === 1, { right: true }, { label: 'first step' });
    const paused = m.snapshot();
    const distAtPause = paused.duoStepDist;
    // Stop for half a second: pips AND partial distance are preserved.
    tickMs(m, 500, {});
    const still = m.snapshot();
    assert.equal(still.duoSteps, 1, 'stop pauses the sequence');
    assert.equal(still.duoStepDist, distAtPause, 'partial step distance preserved while stopped');
    // Resume: the second step arrives from the preserved partial progress.
    runUntil(m, (s) => s.duoSteps === 2, { right: true }, { label: 'second step after resume' });
    // Reverse: pips reset immediately.
    m.drainEvents();
    tickMs(m, 300, { left: true });
    const reversed = m.snapshot();
    assert.equal(reversed.duoSteps, 0, 'reversing resets the pips');
    assert.equal(reversed.duoStepDist, 0);
    assert.ok(eventTypes(m).includes('duo-reset'), 'duo-reset emitted on reverse');
    // Re-earn two steps, then separate: pips reset again.
    runUntil(m, (s) => s.duoSteps === 2, { right: true }, { label: 're-earn two steps' });
    m.drainEvents();
    m.pressInteract(); // release = separate
    const separated = m.snapshot();
    assert.equal(separated.match.active, false);
    assert.equal(separated.duoSteps, 0, 'separating resets the pips');
    assert.ok(eventTypes(m).includes('duo-reset'), 'duo-reset emitted on separation');
  });
});

// ---------------------------------------------------------------------------
// Behavior 13 — completion is impossible without each requirement.
// ---------------------------------------------------------------------------

describe('behavior 13: every completion requirement is mandatory', () => {
  it('(a) without the companion match, walking to the door cannot complete', () => {
    const m = createCar03V2Model();
    playToB4(m);
    // Never rematch the separated companion; just walk to the door line.
    runUntil(m, (s) => s.player.x >= 4720, { right: true }, { label: 'walk alone to the door' });
    const s = m.snapshot();
    assert.equal(s.complete, false);
    assert.equal(s.doorOpen, false, 'the door never opens for a lone player');
  });

  it('(b) companion matched but without three steps: no door, no completion', () => {
    const m = createCar03V2Model();
    playToB4(m);
    matchWhenEligible(m, 'companion', { approach: { right: true } });
    tickMs(m, 300);
    runUntil(m, (s) => s.duoSteps === 1, { right: true }, { label: 'one step only' });
    m.pressInteract(); // give up the pair before the three steps exist
    runUntil(m, (s) => s.player.x >= 4720, { right: true }, { label: 'walk to the door' });
    const s = m.snapshot();
    assert.equal(s.complete, false);
    assert.equal(s.doorOpen, false);
  });

  it('(c) pair inside FINAL without three steps: warning only, never safe/open', () => {
    const m = createCar03V2Model();
    playToB4(m);
    // Overshoot the companion, then match right beside them so the pair
    // enters the FINAL volume with the steps still unearned.
    runUntil(m, (s) => s.player.x >= 4245, { right: true }, { label: 'walk past companion' });
    const tgt = m.snapshot().target;
    assert.equal(tgt.id, 'companion', 'companion still eligible from the right side');
    m.pressInteract();
    assert.equal(m.snapshot().match.kind, 'companion');
    runUntil(m, (s) => s.player.x >= 4280, { right: true }, { label: 'enter FINAL volume' });
    tickMs(m, 200);
    // Sit matched-but-unqualified in the volume for longer than the flag
    // threshold: a pair is never punished, but the gate never turns safe.
    for (let t = 0; t < 2000; t += DT) {
      m.update(DT, {});
      const s = m.snapshot();
      const fin = scanner(s, 'FINAL');
      assert.notEqual(fin.state, 'safe', 'FINAL cannot be safe without the three steps');
      assert.notEqual(fin.state, 'flagged', 'a matched pair is never flagged');
      assert.equal(s.doorOpen, false);
      assert.equal(s.complete, false);
    }
    assert.ok(!eventTypes(m).includes('flagged'));
    // Earning the three steps inside the volume recovers the crossing.
    runUntil(m, (s) => s.doorOpen, { right: true }, { label: 'recover via three steps' });
    assert.equal(scanner(m.snapshot(), 'FINAL').state, 'safe');
  });

  it('(d) everything earned but the door line itself: completion waits for the crossing', () => {
    const m = createCar03V2Model();
    playToB4(m);
    matchWhenEligible(m, 'companion', { approach: { right: true } });
    tickMs(m, 300);
    m.drainEvents(); // isolate the door-open + complete events
    runUntil(m, (s) => s.doorOpen, { right: true }, { label: 'door opens' });
    // Stop short of the door: open is not complete.
    tickMs(m, 200, {});
    const short = m.snapshot();
    assert.equal(short.doorOpen, true);
    assert.equal(short.complete, false, 'completion requires crossing the door line');
    assert.ok(short.player.x < 4720, 'stopped short of the door');
    // Cross the line together.
    const done = runUntil(m, (s) => s.complete, { right: true }, { label: 'cross the door' });
    assert.equal(done.complete, true);
    assert.ok(done.player.x >= 4720);
    const ev = m.drainEvents().map((e) => e.type);
    assert.ok(ev.includes('door-open'));
    assert.ok(ev.includes('complete'));
    assert.ok(ev.indexOf('door-open') < ev.indexOf('complete'));
  });
});

// ---------------------------------------------------------------------------
// Behavior 14 — R (reset) returns everything to baseline.
// ---------------------------------------------------------------------------

describe('behavior 14: reset restores the full baseline', () => {
  it('after a completed run, reset() matches a fresh model snapshot exactly', () => {
    const m = createCar03V2Model();
    completeRun(m);
    assert.equal(m.snapshot().complete, true, 'precondition: run completed');
    m.reset();
    const ev = m.drainEvents();
    assert.deepEqual(ev.map((e) => e.type), ['reset']);
    const fresh = createCar03V2Model().snapshot();
    assert.deepEqual(m.snapshot(), fresh, 'reset snapshot must equal the fresh baseline');
    // Explicit spot-checks on the gameplay-critical baseline fields.
    const s = m.snapshot();
    assert.equal(s.beatId, 0);
    assert.equal(s.objectiveId, 'REACH_THE_LAST_DOOR');
    assert.equal(s.complete, false);
    assert.equal(s.alertActive, false);
    assert.equal(s.doorOpen, false);
    assert.equal(s.duoSteps, 0);
    assert.equal(s.player.x, 120);
    assert.equal(s.player.lane, LANE_NEAR);
    assert.equal(s.player.checkpointX, 120);
    assert.equal(s.player.frozenMsLeft, 0);
    assert.equal(s.player.laneTransition, null);
    assert.equal(s.match.active, false);
    assert.equal(s.target.eligible, false);
    assert.equal(s.nearRouteBlocked, false);
    assert.equal(s.companion.x, 3300);
    assert.equal(s.companion.state, 'waiting');
    for (const g of s.groups) assert.equal(g.scattered, false);
    for (const sc of s.scanners) {
      assert.equal(sc.state, 'idle');
      assert.equal(sc.warnMs, 0);
    }
  });
});

// ---------------------------------------------------------------------------
// Behavior 15 — ten resets are deterministic.
// ---------------------------------------------------------------------------

describe('behavior 15: reset determinism', () => {
  // A scripted input sequence: [ms, input] pairs; the string 'E' presses
  // interact. Run from baseline, it covers the demo, walking, a lane
  // change, and a no-op interact.
  const SCRIPT = [
    [10400, {}],
    [1200, { right: true }],
    ['E', null],
    [400, { right: true, laneFar: true }],
    [400, { right: true }],
    [300, { left: true }],
    [300, {}],
  ];

  function runScript(m) {
    for (const [ms, input] of SCRIPT) {
      if (ms === 'E') m.pressInteract();
      else tickMs(m, ms, input);
    }
  }

  it('ten resets replaying the same script produce identical snapshots', () => {
    const m = createCar03V2Model();
    const snapshots = [];
    for (let i = 0; i < 10; i++) {
      m.reset();
      m.drainEvents();
      runScript(m);
      snapshots.push(JSON.stringify(m.snapshot()));
    }
    for (let i = 1; i < snapshots.length; i++) {
      assert.equal(snapshots[i], snapshots[0], `reset ${i} drifted from the baseline run`);
    }
  });
});

// ---------------------------------------------------------------------------
// Behavior 16 — snapshot exposes every §10 diagnostic field.
// ---------------------------------------------------------------------------

describe('behavior 16: snapshot diagnostic surface', () => {
  it('fresh snapshot carries every required key with sane baseline values', () => {
    const m = createCar03V2Model();
    const s = m.snapshot();
    // Top-level diagnostics.
    for (const k of ['beatId', 'objectiveId', 'complete', 'alertActive', 'doorOpen', 'demo', 'bayIndex', 'player', 'target', 'match', 'duoSteps', 'groups', 'companion', 'scanners', 'nearRouteBlocked']) {
      assert.ok(Object.hasOwn(s, k), `missing top-level key ${k}`);
    }
    assert.equal(typeof s.beatId, 'number');
    assert.equal(typeof s.objectiveId, 'string');
    assert.equal(typeof s.complete, 'boolean');
    assert.equal(typeof s.alertActive, 'boolean');
    assert.equal(typeof s.doorOpen, 'boolean');
    assert.deepEqual(Object.keys(s.demo).sort(), ['complete', 'played']);
    // Player block.
    for (const k of ['x', 'lane', 'laneTransition', 'vx', 'facing', 'checkpointX', 'frozenMsLeft']) {
      assert.ok(Object.hasOwn(s.player, k), `missing player.${k}`);
    }
    // Target block.
    assert.deepEqual(Object.keys(s.target).sort(), ['eligible', 'id', 'kind']);
    // Match block.
    for (const k of ['active', 'targetId', 'kind', 'stepInMsLeft']) {
      assert.ok(Object.hasOwn(s.match, k), `missing match.${k}`);
    }
    assert.ok(s.duoSteps >= 0 && s.duoSteps <= 3);
    // Groups.
    assert.equal(s.groups.length, 3);
    for (const g of s.groups) {
      for (const k of ['id', 'lane', 'x', 'vx', 'members', 'scattered']) {
        assert.ok(Object.hasOwn(g, k), `missing group.${k}`);
      }
    }
    assert.deepEqual(s.groups.map((g) => g.id), ['G1', 'G2N', 'G2F']);
    // Companion.
    for (const k of ['x', 'lane', 'state', 'facing']) {
      assert.ok(Object.hasOwn(s.companion, k), `missing companion.${k}`);
    }
    // Scanners: the four fixed gates with locked kinds and positions.
    assert.equal(s.scanners.length, 4);
    for (const sc of s.scanners) {
      for (const k of ['id', 'kind', 'x', 'state', 'panelText', 'warnMs']) {
        assert.ok(Object.hasOwn(sc, k), `missing scanner.${k}`);
      }
      assert.ok(['idle', 'warning', 'flagged', 'safe'].includes(sc.state));
    }
    assert.deepEqual(
      s.scanners.map((sc) => [sc.id, sc.kind, sc.x]),
      [['SC1', 'teach', 1560], ['SC2', 'real', 2560], ['ARCH', 'arch', 3520], ['FINAL', 'real', 4360]],
    );
  });

  it('mid-run snapshots update the diagnostics consistently', () => {
    const m = createCar03V2Model();
    playToB2(m);
    const s = m.snapshot();
    assert.equal(s.beatId, 2);
    assert.equal(s.objectiveId, 'RELEASE_CHANGE_LANE_MATCH_OTHER');
    assert.equal(s.nearRouteBlocked, true, 'luggage obstruction flag during beat 2');
    assert.equal(s.bayIndex, Math.min(4, Math.floor(s.player.x / 960)));
    assert.equal(s.alertActive, false);
    assert.equal(s.doorOpen, false);
    assert.equal(s.complete, false);
    assert.ok(s.match.active, 'still matched to G1 from the beat 1 crossing');
    playToB4(m);
    const s4 = m.snapshot();
    assert.equal(s4.alertActive, true);
    assert.equal(s4.nearRouteBlocked, false, 'obstruction flag is beat-2 only');
    assert.ok(s4.groups.every((g) => g.scattered), 'all groups scatter on the alert');
  });
});
