import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BELL_MS,
  CUT_GRACE_MS,
  FLICKER_MS,
  MEMORY_MS,
  createTimetable,
  rememberedSequence,
} from '../../src/chapters/borrowedLight/timetableModel.js';

const def = () => ({
  nodes: [
    { id: 'n-bridge', line: 'amber', machine: 'bridge' },
    { id: 'n-board', line: 'amber', machine: 'board' },
    { id: 'n-lift', line: 'teal', machine: 'lift' },
    { id: 'n-held', line: 'rose', machine: 'held' },
    { id: 'n-hotel', line: 'rose', machine: 'hotel' },
    { id: 'n-bridge-far', line: 'amber', machine: 'bridge' },
  ],
  machines: [
    { id: 'bridge', kind: 'bridge', duration: 6000, travel: 600 },
    { id: 'board', kind: 'billboard', duration: 5000, travel: 200 },
    { id: 'lift', kind: 'lift', duration: 5000, travel: 1300 },
    { id: 'held', kind: 'bridge', duration: 'hold', travel: 600 },
    { id: 'hotel', kind: 'lift', duration: 6000, travel: 1500 },
  ],
});

const typesOf = (events) => events.map((event) => event.type);

test('the bell rings every 4 s and fires only queued nodes', () => {
  const tt = createTimetable(def());
  assert.equal(BELL_MS, 4000);
  assert.equal(tt.punch('n-bridge').result, 'queued');
  let events = tt.update(3999);
  assert.ok(!typesOf(events).includes('bell'));
  assert.equal(tt.machineStatus('bridge').powered, false);
  events = tt.update(1);
  assert.deepEqual(events.find((event) => event.type === 'bell'), { type: 'bell', index: 1, fired: ['n-bridge'] });
  assert.equal(tt.machineStatus('bridge').powered, true);
  assert.equal(tt.machineStatus('lift').powered, false);
  // The queue is spent by the bell.
  assert.deepEqual(tt.snapshot().queued, {});
  events = tt.update(4000);
  assert.deepEqual(events.find((event) => event.type === 'bell').fired, []);
});

test('a long frame is split at the bell so the machine is timed from the bell', () => {
  const tt = createTimetable(def());
  tt.punch('n-lift');
  tt.update(3000);
  tt.update(2000); // crosses the bell by 1000 ms
  const lift = tt.machineStatus('lift');
  assert.equal(lift.powered, true);
  assert.equal(lift.remaining, 4000);
  assert.ok(Math.abs(lift.level - 1000 / 1300) < 1e-9);
});

test('machines run for their duration, flicker for the last 0.6 s, then travel home', () => {
  const tt = createTimetable(def());
  tt.punch('n-bridge');
  tt.update(BELL_MS);
  tt.update(600);
  assert.equal(tt.machineStatus('bridge').level, 1);
  const pre = tt.update(6000 - 600 - FLICKER_MS - 1);
  assert.ok(!typesOf(pre).includes('flicker'));
  assert.equal(tt.machineStatus('bridge').flicker, false);
  const flick = tt.update(2);
  assert.ok(typesOf(flick).includes('flicker'));
  assert.equal(tt.machineStatus('bridge').flicker, true);
  assert.equal(tt.machineStatus('bridge').powered, true);
  const off = tt.update(FLICKER_MS);
  assert.ok(typesOf(off).includes('off'));
  assert.equal(tt.machineStatus('bridge').powered, false);
  tt.update(300);
  assert.ok(Math.abs(tt.machineStatus('bridge').level - 0.5) < 0.01);
  const home = tt.update(400);
  assert.ok(typesOf(home).includes('home'));
  assert.equal(tt.machineStatus('bridge').level, 0);
});

test('one line, one borrowed moment: a second punch on a line replaces the first', () => {
  const tt = createTimetable(def());
  assert.equal(tt.punch('n-bridge').result, 'queued');
  const replaced = tt.punch('n-board');
  assert.deepEqual(replaced, { result: 'replaced', nodeId: 'n-board', line: 'amber', cancelled: 'n-bridge' });
  // Other lines are independent.
  assert.equal(tt.punch('n-lift').result, 'queued');
  tt.update(BELL_MS);
  assert.equal(tt.machineStatus('board').powered, true);
  assert.equal(tt.machineStatus('bridge').powered, false);
  assert.equal(tt.machineStatus('lift').powered, true);
});

test('punching a queued node again takes the punch back', () => {
  const tt = createTimetable(def());
  tt.punch('n-lift');
  assert.equal(tt.punch('n-lift').result, 'unqueued');
  tt.update(BELL_MS);
  assert.equal(tt.machineStatus('lift').powered, false);
});

test('a line that is powering a machine is busy until it switches off', () => {
  const tt = createTimetable(def());
  tt.punch('n-bridge');
  tt.update(BELL_MS);
  const busy = tt.punch('n-board');
  assert.equal(busy.result, 'busy');
  assert.equal(busy.holder, 'bridge');
  assert.equal(tt.lineBusy('amber'), true);
  tt.update(6000);
  assert.equal(tt.lineBusy('amber'), false);
  assert.equal(tt.punch('n-board').result, 'queued');
});

test('cutting a powered line keeps a short grace, flickers, and frees the line at once', () => {
  const tt = createTimetable(def());
  tt.punch('n-bridge');
  tt.update(BELL_MS + 600);
  const cut = tt.punch('n-bridge-far'); // the same machine from its other node
  assert.equal(cut.result, 'cut');
  assert.equal(cut.remaining, CUT_GRACE_MS);
  assert.equal(tt.lineBusy('amber'), false);
  assert.equal(tt.punch('n-board').result, 'queued');
  tt.update(CUT_GRACE_MS - FLICKER_MS + 1);
  assert.equal(tt.machineStatus('bridge').flicker, true);
  const off = tt.update(FLICKER_MS);
  assert.ok(typesOf(off).includes('off'));
  assert.equal(tt.machineStatus('bridge').powered, false);
});

test('a city-held bridge holds its line until the player deliberately cuts it (the hotel twist)', () => {
  const tt = createTimetable(def());
  tt.hold('held');
  tt.update(20000);
  assert.equal(tt.machineStatus('held').powered, true);
  assert.equal(tt.machineStatus('held').held, true);
  assert.equal(tt.machineStatus('held').flicker, false);
  // The hotel lift shares the rose line: refused while the bridge holds.
  assert.equal(tt.punch('n-hotel').result, 'busy');
  // Cut the bridge; there is a crossing window before it retracts.
  assert.equal(tt.punch('n-held').result, 'cut');
  const status = tt.machineStatus('held');
  assert.equal(status.powered, true);
  assert.equal(status.held, false);
  assert.equal(status.remaining, CUT_GRACE_MS);
  assert.equal(tt.punch('n-hotel').result, 'queued');
  // Walking the 440 px bridge at 420 px/s takes ~1.05 s: inside the grace.
  tt.update(1100);
  assert.equal(tt.machineStatus('held').level, 1);
  tt.update(CUT_GRACE_MS);
  assert.equal(tt.machineStatus('held').powered, false);
});

test('a cut machine can be queued again (no dead ends)', () => {
  const tt = createTimetable(def());
  tt.hold('held');
  tt.punch('n-held');
  tt.update(CUT_GRACE_MS + 700);
  assert.equal(tt.machineStatus('held').level, 0);
  assert.equal(tt.punch('n-held').result, 'queued');
  tt.update(tt.msToBell());
  assert.equal(tt.machineStatus('held').powered, true);
  assert.equal(tt.machineStatus('held').held, true);
});

test('holding a machine drops any queued claim on its line', () => {
  const tt = createTimetable(def());
  tt.punch('n-hotel');
  tt.hold('held');
  assert.equal(tt.queuedOn('rose'), null);
});

test('respawn clears the queue but leaves running machines alone', () => {
  const tt = createTimetable(def());
  tt.punch('n-lift');
  tt.update(BELL_MS);
  tt.punch('n-bridge');
  assert.deepEqual(tt.clearQueue(), ['n-bridge']);
  tt.update(BELL_MS);
  assert.equal(tt.machineStatus('bridge').powered, false);
  assert.equal(tt.machineStatus('lift').powered, true);
});

test('Listen previews what the next bell will move, including machines about to switch off', () => {
  const tt = createTimetable(def());
  tt.punch('n-lift');
  assert.deepEqual(tt.preview(), [{ machineId: 'lift', nodeId: 'n-lift', to: 'on' }]);
  tt.update(BELL_MS);
  tt.punch('n-bridge');
  tt.update(1500); // lift has 3500 left, next bell in 2500
  assert.deepEqual(tt.preview(), [{ machineId: 'bridge', nodeId: 'n-bridge', to: 'on' }]);
  tt.update(2500); // bell: bridge on; lift has 1000 left, next bell in 4000
  assert.deepEqual(tt.preview(), [{ machineId: 'lift', nodeId: 'n-lift', to: 'off' }]);
});

test('memory light: a fired node glows for 6 s after its bell, only while enabled', () => {
  const tt = createTimetable(def());
  tt.punch('n-lift');
  tt.update(BELL_MS);
  assert.equal(tt.afterglowOf('n-lift'), 0);
  tt.setMemoryLight(true);
  tt.punch('n-bridge');
  tt.update(BELL_MS);
  assert.equal(tt.afterglowOf('n-bridge'), 1);
  assert.equal(MEMORY_MS, 6000);
  tt.update(3000);
  assert.ok(Math.abs(tt.afterglowOf('n-bridge') - 0.5) < 1e-9);
  const events = tt.update(3000);
  assert.ok(events.some((event) => event.type === 'afterglow-end' && event.nodeId === 'n-bridge'));
  assert.equal(tt.afterglowOf('n-bridge'), 0);
});

test('departure countdown counts bells and ends exactly once', () => {
  const tt = createTimetable(def());
  tt.update(1000);
  tt.startCountdown(8);
  let ends = 0;
  for (let i = 0; i < 12; i += 1) {
    const events = tt.update(BELL_MS);
    ends += events.filter((event) => event.type === 'countdown-end').length;
    if (i === 3) assert.equal(tt.countdown().remaining, 4);
  }
  assert.equal(ends, 1);
  assert.equal(tt.countdown().remaining, 0);
  assert.equal(tt.countdown().done, true);
});

test('the train remembers the section\'s punches in order, then the rest of the chain', () => {
  const tt = createTimetable(def());
  tt.punch('n-lift');
  tt.update(BELL_MS);
  const fromBell = tt.bellIndex;
  tt.punch('n-board');
  tt.update(BELL_MS);
  tt.update(6000);
  tt.punch('n-board');
  tt.update(BELL_MS);
  const history = tt.history(fromBell);
  assert.deepEqual(history.map((entry) => entry.machineId), ['board', 'board']);
  assert.deepEqual(rememberedSequence(history, ['bridge', 'board', 'lift']), ['board', 'bridge', 'lift']);
});

test('definitions are validated', () => {
  assert.throws(() => createTimetable({ nodes: [{ id: 'a', line: 'green', machine: 'm' }], machines: [{ id: 'm', duration: 3000 }] }), /unknown line/);
  assert.throws(() => createTimetable({ nodes: [{ id: 'a', line: 'teal', machine: 'x' }], machines: [{ id: 'm', duration: 3000 }] }), /missing machine/);
  assert.throws(() => createTimetable({ nodes: [], machines: [{ id: 'm', duration: 500 }] }), /longer than the flicker/);
  assert.throws(() => createTimetable({
    nodes: [{ id: 'a', line: 'teal', machine: 'm' }, { id: 'b', line: 'rose', machine: 'm' }],
    machines: [{ id: 'm', duration: 3000 }],
  }), /two lines/);
});

test('snapshot is plain JSON with bell phase, queue, machines and afterglow', () => {
  const tt = createTimetable(def());
  tt.setMemoryLight(true);
  tt.hold('held');
  tt.punch('n-lift');
  tt.update(1000);
  const snap = JSON.parse(JSON.stringify(tt.snapshot()));
  assert.equal(snap.msToBell, 3000);
  assert.equal(snap.bellPhase, 0.25);
  assert.deepEqual(snap.queued, { teal: 'n-lift' });
  assert.equal(snap.machines.held.held, true);
  assert.equal(snap.machines.held.remaining, null);
  assert.equal(snap.memoryLight, true);
});
