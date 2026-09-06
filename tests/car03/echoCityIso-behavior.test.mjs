// Chapter 3 // ECHO CITY ISO — behavior tests for the pure isometric model.
// Runs under `node --test` only. No Phaser, no DOM, no real timers.
//
// Proves the spatial/resonance contract of
// docs/CHAPTER_03_KIMI_ISOMETRIC_ECHO_CITY_WORK_PACKAGE.md against
// createEchoCityIsoModel: waypoint click-to-move, gated routes, hover focus,
// hold-to-observe, transplant/wrong-transplant/release, surveillance field,
// recording, Mara share/reunion, deterministic reset, render parity.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  createEchoCityIsoModel,
  ISO_DEFAULTS,
  ISO_POINTS,
  DISTRICTS,
} from '../../src/cars/presentCity/echoCityIsoModel.js';
import { ECHO_CYCLES } from '../../src/cars/presentCity/echoCityModel.js';

const DT = 16;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function step(m, totalMs, input = {}) {
  let remaining = totalMs;
  while (remaining > 0) {
    const d = Math.min(DT, remaining);
    m.update(d, input);
    remaining -= d;
  }
}

function stepUntil(m, pred, input = {}, maxMs = 90000) {
  let t = 0;
  while (t <= maxMs) {
    const snap = m.snapshot();
    if (pred(snap)) return snap;
    const inp = typeof input === 'function' ? input(snap) : input;
    m.update(DT, inp ?? {});
    t += DT;
  }
  assert.fail(`condition not met within ${maxMs}ms`);
}

function eventTypes(m) {
  return m.drainEvents().map((e) => e.type);
}

function receiver(snap, id) {
  return snap.receivers.find((r) => r.id === id);
}

function source(snap, id) {
  return snap.sources.find((s) => s.id === id);
}

// one pointer tick: hover at (x,y) and press the primary button
function primaryDownAt(m, x, y) {
  m.update(DT, { hover: { x, y }, primaryDown: true, primaryHeld: true });
}

// click a world point and wait until Butch stops moving
function clickAndWait(m, x, y, maxMs = 30000) {
  primaryDownAt(m, x, y);
  return stepUntil(m, (s) => !s.player.moving, { hover: { x, y } }, maxMs);
}

// hold the primary button (mouse observe) for ms
function holdPrimary(m, ms) {
  step(m, ms, { primaryHeld: true });
}

// -- scripted progression ------------------------------------------------------

function walkToMarketGroup(m) {
  clickAndWait(m, ISO_POINTS['market-group'].x, ISO_POINTS['market-group'].y);
}

function copyCourier(m) {
  const c = source(m.snapshot(), 'courier');
  primaryDownAt(m, c.x, c.y); // may queue a walk first
  stepUntil(m, (s) => s.resonance.mode === 'observing', { primaryHeld: true }, 30000);
  holdPrimary(m, ECHO_CYCLES['courier-loop'].loopMs + 200);
  const s = m.snapshot();
  assert.equal(s.resonance.mode, 'carrying', 'courier copy must complete');
  assert.equal(s.resonance.carriedCycleId, 'courier-loop');
  return s;
}

function transplantToReceiver(m, id) {
  const p = ISO_POINTS[id];
  primaryDownAt(m, p.x, p.y);
  return stepUntil(m, (s) => receiver(s, id).installedCycleId !== null, {}, 30000);
}

function openMarketGate(m) {
  copyCourier(m);
  transplantToReceiver(m, 'market-group');
  return stepUntil(m, (s) => s.environment.marketGate === 'open', {}, 8000);
}

function goClock(m) {
  clickAndWait(m, 0, -7); // c_s
  const s = m.snapshot();
  assert.equal(s.district, 'CLOCK');
  return s;
}

function goTransit(m) {
  clickAndWait(m, 0, 10); // tr_s
  const s = m.snapshot();
  assert.equal(s.district, 'TRANSIT');
  return s;
}

function copySource(m, id) {
  const p = ISO_POINTS[id];
  const pos = id === 'courier' ? source(m.snapshot(), 'courier') : p;
  primaryDownAt(m, pos.x, pos.y ?? pos.y);
  stepUntil(m, (s) => s.resonance.mode === 'observing', { primaryHeld: true }, 30000);
  holdPrimary(m, ECHO_CYCLES[ISO_POINTS[id].cycleId].loopMs + 200);
  assert.equal(m.snapshot().resonance.carriedCycleId, ISO_POINTS[id].cycleId, `${id} copy must complete`);
}

function installTransitCycles(m) {
  copySource(m, 'bus');
  transplantToReceiver(m, 'barrier');
  copySource(m, 'crosswalk');
  transplantToReceiver(m, 'crowd');
  const s = m.snapshot();
  assert.equal(receiver(s, 'barrier').installedCycleId, 'bus-service');
  assert.equal(receiver(s, 'crowd').installedCycleId, 'crosswalk-signal');
  return s;
}

function crossField(m) {
  // from the transit side, click the fountain ring across the field
  clickAndWait(m, 14.8, 5.5, 40000);
}

function recordOwnCycle(m) {
  // stand on the amber mark, start recording, click two legs, ring the bell
  clickAndWait(m, ISO_POINTS['record-mark'].x, ISO_POINTS['record-mark'].y);
  primaryDownAt(m, ISO_POINTS['record-mark'].x, ISO_POINTS['record-mark'].y);
  stepUntil(m, (s) => s.resonance.mode === 'recording', {}, 5000);
  clickAndWait(m, 20, -6.5, 20000); // leg 1 -> f_s
  clickAndWait(m, 23.6, -4.6, 20000); // leg 2 -> bell (rings on proximity)
  m.pressInteract(); // E stops the recording
  const s = stepUntil(m, (s2) => s2.resonance.mode === 'carrying', {}, 30000);
  assert.equal(s.resonance.carriedCycleId, 'recorded-cycle');
  return s;
}

function shareWithMara(m) {
  // hover Mara: the model walks Butch to the witness pad, then shares
  primaryDownAt(m, ISO_POINTS.mara.x, ISO_POINTS.mara.y);
  return stepUntil(m, (s) => s.complete, {}, 60000);
}

function goldenPath(m) {
  openMarketGate(m);
  goClock(m);
  goTransit(m);
  installTransitCycles(m);
  // Beat 4 breather: back to the clock so Mara appears
  clickAndWait(m, 0, -7);
  stepUntil(m, (s) => s.mara.visible, {}, 10000);
  // Beat 5: cross the field under the two running cycles
  clickAndWait(m, 8, 12.5); // tr_ne staging
  crossField(m);
  const s = m.snapshot();
  assert.equal(s.district, 'FOUNTAIN', 'field crossing must reach the fountain');
  recordOwnCycle(m);
  shareWithMara(m);
  return m.snapshot();
}

// ---------------------------------------------------------------------------
// Gate 2 behaviors
// ---------------------------------------------------------------------------

describe('iso spatial: waypoint graph and click-to-move', () => {
  it('click on walkable ground routes Butch along graph nodes', () => {
    const m = createEchoCityIsoModel();
    m.drainEvents();
    primaryDownAt(m, 0, -13.5); // t_plat
    const s0 = m.snapshot();
    assert.ok(s0.player.route.length >= 0);
    const s = stepUntil(m, (s2) => !s2.player.moving && s2.player.node === 't_plat', {}, 10000);
    assert.ok(Math.abs(s.player.x - 0) < 0.2 && Math.abs(s.player.y - -13.5) < 0.2);
    const types = eventTypes(m);
    assert.ok(types.includes('move-order'));
  });

  it('continuous visible paving accepts mid-edge clicks and dark ground rejects explicitly', () => {
    const m = createEchoCityIsoModel();
    m.drainEvents();
    // Midpoint of the long platform -> market approach, deliberately not a node.
    primaryDownAt(m, -3.25, -13.25);
    const accepted = stepUntil(m, (s) => !s.player.moving, {}, 10000);
    assert.ok(Math.abs(accepted.player.x + 3.25) < 0.2);
    assert.ok(Math.abs(accepted.player.y + 13.25) < 0.2);
    assert.ok(m.drainEvents().some((e) => e.type === 'move-order'));

    primaryDownAt(m, 30, -25);
    const rejected = m.drainEvents();
    assert.ok(rejected.some((e) => e.type === 'move-rejected' && e.payload.reason === 'not-walkable'));
    assert.equal(m.snapshot().player.moving, false);
  });

  it('broad plaza paving preserves an off-spine click instead of forcing a waypoint', () => {
    const m = createEchoCityIsoModel();
    m.drainEvents();
    // Inside the rendered market court, but more than the lane snap radius
    // from every authored graph edge.
    const arrived = clickAndWait(m, -24.5, -8.5, 30000);
    assert.ok(Math.abs(arrived.player.x + 24.5) < 0.2);
    assert.ok(Math.abs(arrived.player.y + 8.5) < 0.2);
    const order = m.drainEvents().find((e) => e.type === 'move-order');
    assert.equal(order?.payload.x, -24.5);
    assert.equal(order?.payload.y, -8.5);
  });

  it('the closed market gate makes the clock unreachable from the market', () => {
    const m = createEchoCityIsoModel();
    m.drainEvents();
    clickAndWait(m, -15, 0.5); // m_east, deep in the market
    const before = m.snapshot().player;
    // click straight on the clock: no gated route, so Butch must NOT arrive
    primaryDownAt(m, 0, 0);
    step(m, 12000, {});
    const after = m.snapshot();
    assert.notEqual(after.player.node, 'c_w');
    assert.ok(after.player.x < -8, `player must stay west of the closed gate (x=${after.player.x})`);
    assert.ok(['MARKET', 'TRAIN'].includes(after.district));
    void before;
  });

  it('the fountain is unreachable before the transit cycles run (field is the only route)', () => {
    const m = createEchoCityIsoModel();
    m.drainEvents();
    openMarketGate(m);
    goClock(m);
    // try to click straight to the fountain plaza: no open route exists
    primaryDownAt(m, 20, -6.5);
    step(m, 15000, {});
    const s = m.snapshot();
    assert.notEqual(s.district, 'FOUNTAIN');
    // and the field crossing unprotected gets flagged back to the checkpoint
    clickAndWait(m, 0, 10, 20000); // tr_s
    clickAndWait(m, 8, 12.5, 20000); // tr_ne
    primaryDownAt(m, 14.8, 5.5);
    const sf = stepUntil(m, (s2) => s2.lastEvent && s2.lastEvent.type === 'checkpoint-return', {}, 20000);
    assert.equal(sf.checkpointNode, DISTRICTS.TRANSIT.checkpoint);
    assert.notEqual(sf.district, 'FOUNTAIN');
  });

  it('WASD fallback walks along graph edges', () => {
    const m = createEchoCityIsoModel();
    m.drainEvents();
    // hold "up-screen" (W): from t_door the only edge leads to t_plat
    step(m, 3000, { wasd: { x: 0, y: 1 } });
    const s = m.snapshot();
    assert.ok(['t_plat', 't_sw', 'm_entry', 't_door'].includes(s.player.node));
    assert.ok(s.player.y > -17.5, 'WASD must move the player northward');
  });

  it('right-click cancels the current route', () => {
    const m = createEchoCityIsoModel();
    m.drainEvents();
    primaryDownAt(m, -12, -9.5); // start a long walk into the market
    step(m, 300, {});
    m.update(DT, { secondaryDown: true });
    const s = m.snapshot();
    assert.equal(s.player.route.length, 0);
    assert.equal(s.player.moving, false);
    assert.ok(eventTypes(m).includes('move-cancelled'));
  });
});

describe('iso resonance: hover focus, observe, transplant', () => {
  it('hover picks the market group receiver and exposes a prompt', () => {
    const m = createEchoCityIsoModel();
    m.update(DT, { hover: { x: -16.5, y: -7 } });
    const s = m.snapshot();
    assert.equal(s.hover.kind, 'receiver');
    assert.equal(s.hover.id, 'market-group');
  });

  it('hold-to-observe completes one loop; early release drains the trace', () => {
    const m = createEchoCityIsoModel();
    m.drainEvents();
    // early release: observe the courier for only half a loop
    const c = source(m.snapshot(), 'courier');
    primaryDownAt(m, c.x, c.y);
    stepUntil(m, (s) => s.resonance.mode === 'observing', { primaryHeld: true }, 30000);
    holdPrimary(m, 1500);
    step(m, 100, {}); // released
    let s = m.snapshot();
    assert.equal(s.resonance.mode, 'idle');
    assert.equal(s.resonance.carriedCycleId, null);
    assert.ok(eventTypes(m).includes('observation-aborted'));
    // full hold copies the cycle
    copyCourier(m);
    s = m.snapshot();
    assert.equal(s.carriedCycle.label, 'MOVE - WAIT - RETURN');
    assert.deepEqual(s.carriedCycle.icons, ['MOVE', 'WAIT', 'RETURN']);
  });

  it('compatible transplant opens the market route; group performs the loop', () => {
    const m = createEchoCityIsoModel();
    m.drainEvents();
    openMarketGate(m);
    const s = m.snapshot();
    assert.equal(receiver(s, 'market-group').resultState, 'performing-loop');
    assert.equal(s.environment.marketGate, 'open');
    // the clock is now walkable from the market
    clickAndWait(m, -7, 0);
    assert.equal(m.snapshot().player.node, 'c_w');
  });

  it('wrong-but-eligible transplant flaps the shutters and reverses in place', () => {
    const m = createEchoCityIsoModel();
    m.drainEvents();
    copyCourier(m);
    // courier pattern into the shutter controller (accepts 'open'): wrong
    transplantToReceiver(m, 'shutter-controller');
    let s = m.snapshot();
    assert.equal(receiver(s, 'shutter-controller').resultState, 'flapping');
    assert.equal(s.environment.shutters, 'flapping');
    assert.equal(s.environment.marketGate, 'closed', 'wrong cycle must not open the route');
    const types = eventTypes(m);
    assert.ok(types.includes('transplant-wrong'));
    // release in place: right-click on the installed receiver (after the
    // 300ms linking flash settles, as a real player's gesture would)
    stepUntil(m, (s2) => s2.resonance.mode === 'idle', {}, 3000);
    m.update(DT, { hover: { x: ISO_POINTS['shutter-controller'].x, y: ISO_POINTS['shutter-controller'].y }, secondaryDown: true });
    stepUntil(m, (s2) => receiver(s2, 'shutter-controller').installedCycleId === null, {}, 10000);
    s = m.snapshot();
    assert.equal(s.environment.shutters, 'closed');
  });

  it('cancel while carrying drops the carried cycle', () => {
    const m = createEchoCityIsoModel();
    m.drainEvents();
    copyCourier(m);
    m.update(DT, { secondaryDown: true });
    const s = m.snapshot();
    assert.equal(s.resonance.mode, 'idle');
    assert.equal(s.resonance.carriedCycleId, null);
  });

  it('E is a keyboard alternative for the highlighted target', () => {
    const m = createEchoCityIsoModel();
    m.drainEvents();
    walkToMarketGroup(m);
    // no pointer at all: E walks to the highlighted source if needed, then
    // holding E observes one full loop
    m.update(DT, { hover: null });
    m.pressInteract();
    stepUntil(m, (s) => s.resonance.mode === 'observing', { hover: null, eHeld: true }, 30000);
    step(m, ECHO_CYCLES['courier-loop'].loopMs + 200, { eHeld: true });
    assert.equal(m.snapshot().resonance.carriedCycleId, 'courier-loop');
  });
});

// ---------------------------------------------------------------------------
// Gate 4 behaviors (full critical path)
// ---------------------------------------------------------------------------

describe('iso transit: two persistent relationships', () => {
  it('barrier and crowd accept their cycles in either order; wrong mappings are visible', () => {
    const m = createEchoCityIsoModel();
    m.drainEvents();
    openMarketGate(m);
    goClock(m);
    goTransit(m);
    // wrong mapping first: crosswalk WAIT-WALK onto the barrier
    copySource(m, 'crosswalk');
    transplantToReceiver(m, 'barrier');
    let s = m.snapshot();
    assert.equal(receiver(s, 'barrier').resultState, 'twitching');
    assert.equal(receiver(s, 'barrier').compatible, false);
    // release it (right-click), then install the bus loop
    stepUntil(m, (s2) => s2.resonance.mode === 'idle', {}, 3000);
    m.update(DT, { hover: { x: ISO_POINTS.barrier.x, y: ISO_POINTS.barrier.y }, secondaryDown: true });
    stepUntil(m, (s2) => receiver(s2, 'barrier').installedCycleId === null, {}, 10000);
    copySource(m, 'bus');
    transplantToReceiver(m, 'barrier');
    copySource(m, 'crosswalk');
    transplantToReceiver(m, 'crowd');
    s = m.snapshot();
    assert.equal(receiver(s, 'barrier').resultState, 'cycling-open');
    assert.equal(receiver(s, 'crowd').resultState, 'moving-cover');
    // installed cycles persist while the player leaves the district
    clickAndWait(m, 0, -7, 30000);
    s = m.snapshot();
    assert.equal(receiver(s, 'barrier').installedCycleId, 'bus-service');
    assert.equal(receiver(s, 'crowd').installedCycleId, 'crosswalk-signal');
  });

  it('protected field crossing succeeds; Mara appears at the clock breather', () => {
    const m = createEchoCityIsoModel();
    m.drainEvents();
    openMarketGate(m);
    goClock(m);
    goTransit(m);
    installTransitCycles(m);
    clickAndWait(m, 0, -7);
    const s = stepUntil(m, (s2) => s2.mara.visible, {}, 10000);
    assert.equal(s.mara.visible, true);
    assert.equal(s.cameraBeat, 'breather');
    clickAndWait(m, 8, 12.5);
    crossField(m);
    const sf = m.snapshot();
    assert.equal(sf.district, 'FOUNTAIN');
    assert.equal(sf.environment.fieldState, 'idle');
    assert.equal(sf.alarmRaised, true, 'the Archivist alarm fires on entering the silent square');
  });
});

describe('iso fountain: recording, echo, share, reunion', () => {
  it('recording needs real legs plus the bell; empty recordings drain', () => {
    const m = createEchoCityIsoModel();
    m.drainEvents();
    openMarketGate(m);
    goClock(m);
    goTransit(m);
    installTransitCycles(m);
    clickAndWait(m, 0, -7);
    stepUntil(m, (s) => s.mara.visible, {}, 10000);
    clickAndWait(m, 8, 12.5);
    crossField(m);
    clickAndWait(m, ISO_POINTS['record-mark'].x, ISO_POINTS['record-mark'].y);
    // start recording and immediately stop: no legs, no bell -> drains
    primaryDownAt(m, ISO_POINTS['record-mark'].x, ISO_POINTS['record-mark'].y);
    stepUntil(m, (s) => s.resonance.mode === 'recording', {}, 5000);
    m.pressInteract();
    let s = m.snapshot();
    assert.equal(s.resonance.mode, 'idle');
    assert.ok(eventTypes(m).includes('recording-empty'));
    // proper recording: two legs + bell
    recordOwnCycle(m);
    s = m.snapshot();
    assert.equal(s.carriedCycle.id, 'recorded-cycle');
    assert.ok(s.carriedCycle.icons.includes('RESONATE'));
  });

  it('the full golden path completes with the reunion, not by walking', () => {
    const m = createEchoCityIsoModel();
    m.drainEvents();
    const s = goldenPath(m);
    assert.equal(s.complete, true);
    assert.equal(s.reunion, true);
    assert.equal(s.mara.state, 'reunited');
    assert.equal(s.environment.witnessGate, 'open');
    assert.equal(s.cameraBeat, 'reunion');
  });

  it('clicking straight at Mara cannot open the witness gate or complete', () => {
    const m = createEchoCityIsoModel();
    m.drainEvents();
    openMarketGate(m);
    goClock(m);
    goTransit(m);
    installTransitCycles(m);
    clickAndWait(m, 0, -7);
    stepUntil(m, (s) => s.mara.visible, {}, 10000);
    clickAndWait(m, 8, 12.5);
    crossField(m);
    // no recording: click directly on Mara and on the gate line
    primaryDownAt(m, ISO_POINTS.mara.x, ISO_POINTS.mara.y);
    step(m, 15000, {});
    primaryDownAt(m, 27.5, 0);
    step(m, 10000, {});
    const s = m.snapshot();
    assert.equal(s.complete, false);
    assert.equal(s.environment.witnessGate, 'closed');
    assert.ok(s.player.x < 26.5, `the witness gate is a wall (x=${s.player.x})`);
    assert.equal(s.mara.state, 'waiting');
  });
});

describe('iso model discipline', () => {
  it('reset is deterministic across ten resets', () => {
    const m = createEchoCityIsoModel();
    goldenPath(m);
    const fresh = createEchoCityIsoModel();
    const base = fresh.snapshot();
    delete base.lastEvent;
    for (let i = 0; i < 10; i++) {
      m.reset();
      m.drainEvents();
      const s = m.snapshot();
      delete s.lastEvent;
      assert.deepEqual(s, base, `reset ${i + 1} must restore the exact baseline`);
    }
  });

  it('no rhythm-game state exists in snapshot or cycle data', () => {
    const m = createEchoCityIsoModel();
    const s = m.snapshot();
    const json = JSON.stringify(s) + JSON.stringify(ECHO_CYCLES);
    for (const banned of ['beat', 'combo', 'noteLane', 'score', 'bpm']) {
      assert.ok(!json.includes(banned), `snapshot must not contain "${banned}"`);
    }
  });

  it('snapshot stays JSON-safe and carries route/focus/carried/district/mara parity fields', () => {
    const m = createEchoCityIsoModel();
    copyCourier(m);
    const s = JSON.parse(JSON.stringify(m.snapshot()));
    assert.ok(s.spatialGraph !== undefined || s.graph !== undefined, 'graph snapshot exists');
    assert.ok(Array.isArray(s.graph.nodes) && s.graph.nodes.length >= 24 && s.graph.nodes.length <= 32);
    assert.equal(s.resonance.carriedCycleId, 'courier-loop');
    assert.equal(s.carriedCycle.id, 'courier-loop');
    assert.ok(typeof s.district === 'string');
    assert.ok(s.mara && typeof s.mara.visible === 'boolean');
    assert.ok(s.focus && 'prompt' in s.focus);
    assert.ok(typeof s.cameraBeat === 'string');
  });
});
