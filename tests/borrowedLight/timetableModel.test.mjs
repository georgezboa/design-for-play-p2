import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BELL_MS,
  CATCH_MS,
  CUT_GRACE_MS,
  FLICKER_MS,
  MEMORY_MS,
  REPEAT_GUARD_MS,
  createTimetable,
  rememberedSequence,
  ringsOn,
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
// Step off a bell before punching, so the punch is not a bell catch.
const AFTER = CATCH_MS + 50;

test('the bell rings every 4 s and fires only queued nodes', () => {
  const tt = createTimetable(def());
  assert.equal(BELL_MS, 4000);
  assert.equal(tt.punch('n-bridge').result, 'queued');
  let events = tt.update(3999);
  assert.ok(!typesOf(events).includes('bell'));
  assert.equal(tt.machineStatus('bridge').powered, false);
  events = tt.update(1);
  assert.deepEqual(events.find((event) => event.type === 'bell'), { type: 'bell', index: 1, parity: 'odd', fired: ['n-bridge'], waiting: [] });
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
  assert.equal(tt.punchPreview('n-board').result, 'replace', 'the prompt warns before the punch');
  const replaced = tt.punch('n-board');
  assert.deepEqual(replaced, { result: 'replaced', nodeId: 'n-board', line: 'amber', cancelled: 'n-bridge', inBells: 1 });
  // Other lines are independent.
  assert.equal(tt.punch('n-lift').result, 'queued');
  tt.update(BELL_MS);
  assert.equal(tt.machineStatus('board').powered, true);
  assert.equal(tt.machineStatus('bridge').powered, false);
  assert.equal(tt.machineStatus('lift').powered, true);
});

test('punching a queued node again takes the punch back, but not a double press', () => {
  const tt = createTimetable(def());
  tt.punch('n-lift');
  // R3 · a quick second press (or F + click) is the same punch.
  tt.update(REPEAT_GUARD_MS - 100);
  assert.equal(tt.punch('n-lift').result, 'already');
  assert.equal(tt.isQueued('n-lift'), true);
  tt.update(200);
  assert.equal(tt.punchPreview('n-lift').result, 'unqueue');
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

// R3 · "the nodes sometimes don't work": a second press on a running
// machine used to cut it to 2 s. Now it renews it at the next bell.
test('punching a running timed machine renews it instead of switching it off', () => {
  const tt = createTimetable(def());
  tt.punch('n-bridge');
  tt.update(BELL_MS + 1500);
  assert.equal(tt.punchPreview('n-bridge-far').result, 'renew');
  const renew = tt.punch('n-bridge-far'); // the same machine from its other node
  assert.equal(renew.result, 'renew');
  assert.equal(tt.machineStatus('bridge').remaining, 4500, 'nothing is lost by the press');
  assert.equal(tt.machineStatus('bridge').cut, false);
  tt.update(tt.msToBell());
  assert.equal(tt.machineStatus('bridge').remaining, 6000, 'renewed for its full duration');
  assert.equal(tt.machineStatus('bridge').level, 1);
});

test('cutting a held line keeps a short grace, flickers, and frees the line at once', () => {
  const tt = createTimetable(def());
  tt.hold('held');
  tt.update(AFTER);
  const cut = tt.punch('n-held');
  assert.equal(cut.result, 'cut');
  assert.equal(cut.remaining, CUT_GRACE_MS);
  assert.equal(tt.lineBusy('rose'), false);
  assert.equal(tt.punch('n-hotel').result, 'queued');
  tt.update(CUT_GRACE_MS - FLICKER_MS + 1);
  assert.equal(tt.machineStatus('held').flicker, true);
  const off = tt.update(FLICKER_MS);
  assert.ok(typesOf(off).includes('off'));
  assert.equal(tt.machineStatus('held').powered, false);
});

test('a city-held bridge holds its line until the player deliberately cuts it (the hotel twist)', () => {
  const tt = createTimetable(def());
  tt.hold('held');
  tt.update(20000 + AFTER);
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
  tt.update(AFTER);
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
  tt.update(BELL_MS + AFTER);
  tt.punch('n-bridge');
  assert.deepEqual(tt.clearQueue(), ['n-bridge']);
  tt.update(BELL_MS);
  assert.equal(tt.machineStatus('bridge').powered, false);
  assert.equal(tt.machineStatus('lift').powered, true);
});

// R3 · a punch a hair after the bell used to wait four more seconds.
test('a punch just after a bell catches that bell', () => {
  const tt = createTimetable(def());
  tt.update(BELL_MS + 120);
  const caught = tt.punch('n-lift');
  assert.equal(caught.result, 'caught');
  assert.ok(caught.events.some((event) => event.type === 'power' && event.machineId === 'lift'));
  assert.equal(tt.machineStatus('lift').powered, true);
  assert.equal(tt.machineStatus('lift').remaining, 5000 - 120, 'timed from the bell it caught');
  // Outside the window it waits for the next bell as before.
  const late = createTimetable(def());
  late.update(BELL_MS + CATCH_MS + 1);
  assert.equal(late.punch('n-lift').result, 'queued');
  // No bell has rung yet at the very start: nothing to catch.
  const fresh = createTimetable(def());
  assert.equal(fresh.punch('n-lift').result, 'queued');
});

test('Listen previews what the next bell will move, including machines about to switch off', () => {
  const tt = createTimetable(def());
  tt.punch('n-lift');
  assert.deepEqual(tt.preview(), [{ machineId: 'lift', nodeId: 'n-lift', to: 'on', inBells: 1 }]);
  tt.update(BELL_MS + AFTER);
  tt.punch('n-bridge');
  tt.update(1500 - AFTER); // lift has 3500 left, next bell in 2500
  assert.deepEqual(tt.preview(), [{ machineId: 'bridge', nodeId: 'n-bridge', to: 'on', inBells: 1 }]);
  tt.update(2500); // bell: bridge on; lift has 1000 left, next bell in 4000
  assert.deepEqual(tt.preview(), [{ machineId: 'lift', nodeId: 'n-lift', to: 'off', inBells: 1 }]);
});

test('memory light: a fired node glows for 6 s after its bell, only while enabled', () => {
  const tt = createTimetable(def());
  tt.punch('n-lift');
  tt.update(BELL_MS);
  assert.equal(tt.afterglowOf('n-lift'), 0);
  tt.setMemoryLight(true);
  tt.update(AFTER);
  tt.punch('n-bridge');
  tt.update(tt.msToBell());
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
  assert.equal(tt.startCountdown().total, 12, 'v2: twelve bells by default');
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

// Alpha round 1 · F2-7: a fall must not cost departure bells.
test('a held countdown lets bells ring without counting them (respawn)', () => {
  const tt = createTimetable(def());
  tt.startCountdown(8);
  tt.update(BELL_MS);
  assert.equal(tt.countdown().remaining, 7);
  assert.equal(tt.holdCountdown(true), true);
  const events = [...tt.update(BELL_MS), ...tt.update(BELL_MS)];
  assert.equal(events.filter((event) => event.type === 'bell').length, 2, 'the city bell still rings');
  assert.equal(events.filter((event) => event.type === 'countdown').length, 0);
  assert.equal(events.filter((event) => event.type === 'countdown-held').length, 2);
  assert.equal(tt.countdown().remaining, 7, 'no departure bell was spent while held');
  assert.equal(tt.snapshot().countdown.held, true);
  tt.holdCountdown(false);
  tt.update(BELL_MS);
  assert.equal(tt.countdown().remaining, 6);
});

test('the train remembers the section\'s punches in order, then the rest of the chain', () => {
  const tt = createTimetable(def());
  tt.punch('n-lift');
  tt.update(BELL_MS);
  const fromBell = tt.bellIndex;
  tt.update(AFTER);
  tt.punch('n-board');
  tt.update(tt.msToBell());
  tt.update(6000);
  tt.punch('n-board');
  tt.update(tt.msToBell());
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
  assert.throws(() => createTimetable({
    nodes: [{ id: 'a', line: 'teal', machine: 'm', phase: 'odd' }, { id: 'b', line: 'teal', machine: 'n', phase: 'even' }],
    machines: [{ id: 'm', duration: 3000 }, { id: 'n', duration: 3000 }],
  }), /two phases/);
  assert.throws(() => createTimetable({ nodes: [{ id: 'a', line: 'teal', machine: 'm', phase: 'third' }], machines: [{ id: 'm', duration: 3000 }] }), /unknown phase/);
  assert.throws(() => createTimetable({
    nodes: [{ id: 'a', line: 'teal', machine: 'm', dead: true }, { id: 'b', line: 'teal', machine: 'm' }],
    machines: [{ id: 'm', duration: 3000 }],
  }), /two lines/, 'a machine is either dead or on a line');
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
  assert.equal(snap.bellMs, 4000);
  assert.equal(snap.nextBell, 'odd');
  assert.deepEqual(snap.queued, { teal: 'n-lift' });
  assert.equal(snap.machines.held.held, true);
  assert.equal(snap.machines.held.remaining, null);
  assert.equal(snap.memoryLight, true);
  assert.equal(snap.carried, null);
});

test('circuits: the same colour in two districts are separate lines', () => {
  const tt = createTimetable({
    nodes: [
      { id: 'a-teal', line: 'teal', machine: 'a-lift', circuit: 'A:teal' },
      { id: 'b-teal', line: 'teal', machine: 'b-bridge', circuit: 'B:teal' },
    ],
    machines: [
      { id: 'a-lift', duration: 5000 },
      { id: 'b-bridge', duration: 'hold' },
    ],
  });
  tt.hold('b-bridge');
  assert.equal(tt.lineBusy('B:teal'), true);
  assert.equal(tt.lineBusy('A:teal'), false);
  assert.equal(tt.punch('a-teal').result, 'queued');
  assert.equal(tt.lineOf('a-lift'), 'teal');
  assert.equal(tt.circuitOf('a-lift'), 'A:teal');
  assert.deepEqual(tt.snapshot().queued, { 'A:teal': 'a-teal' });
});

// ---------------------------------------------------------------------------
// v2 · two-phase bells.
const phased = () => createTimetable({
  nodes: [
    { id: 'n-odd', line: 'teal', machine: 'lift', phase: 'odd' },
    { id: 'n-even', line: 'rose', machine: 'bridge', phase: 'even' },
    { id: 'n-any', line: 'amber', machine: 'board' },
  ],
  machines: [
    { id: 'lift', kind: 'lift', duration: 6000, travel: 1300 },
    { id: 'bridge', kind: 'bridge', duration: 6000, travel: 600 },
    { id: 'board', kind: 'billboard', duration: 5000, travel: 200 },
  ],
});

test('two-phase: odd lines ring on bells I, III…; even lines on II, IV…', () => {
  assert.equal(ringsOn('odd', 1), true);
  assert.equal(ringsOn('odd', 2), false);
  assert.equal(ringsOn('even', 2), true);
  assert.equal(ringsOn(null, 7), true);
  const tt = phased();
  assert.equal(tt.nextBellParity(), 'odd');
  assert.equal(tt.punch('n-even').inBells, 2, 'the even line waits a bell');
  assert.equal(tt.punch('n-odd').inBells, 1);
  let events = tt.update(BELL_MS);
  let bell = events.find((event) => event.type === 'bell');
  assert.deepEqual(bell.fired, ['n-odd']);
  assert.deepEqual(bell.waiting, ['n-even']);
  assert.equal(tt.isQueued('n-even'), true, 'still punched, waiting for its bell');
  assert.equal(tt.nodeStatus('n-even').inBells, 1);
  events = tt.update(BELL_MS);
  bell = events.find((event) => event.type === 'bell');
  assert.deepEqual(bell.fired, ['n-even']);
  assert.equal(tt.machineStatus('bridge').powered, true);
  assert.equal(tt.machineStatus('lift').powered, true, 'a 6 s machine overlaps the next bell');
});

test('two-phase: Listen says which punches wait for the other bell', () => {
  const tt = phased();
  tt.punch('n-even');
  tt.punch('n-any');
  const preview = tt.preview();
  assert.deepEqual(preview.find((p) => p.nodeId === 'n-even'), { machineId: 'bridge', nodeId: 'n-even', to: 'on', inBells: 2 });
  assert.equal(preview.find((p) => p.nodeId === 'n-any').inBells, 1);
});

test('two-phase: a bell catch only catches a bell of the node\'s own phase', () => {
  const tt = phased();
  tt.update(BELL_MS + 100); // bell I just rang
  assert.equal(tt.punch('n-even').result, 'queued', 'II does not catch bell I');
  assert.equal(tt.punch('n-odd').result, 'caught');
});

test('the chase quickens the bell without a jump in its phase', () => {
  const tt = phased();
  tt.update(2000);
  assert.equal(tt.bellPhase(), 0.5);
  tt.setBellMs(2500);
  assert.equal(tt.bellMs, 2500);
  assert.equal(tt.bellPhase(), 0.5);
  assert.equal(tt.msToBell(), 1250);
  tt.punch('n-odd');
  const events = tt.update(1250);
  assert.ok(events.some((event) => event.type === 'bell'));
  tt.setBellMs(BELL_MS);
  assert.equal(tt.msToBell(), BELL_MS);
});

// ---------------------------------------------------------------------------
// v2 · borrowed light.
const borrowDef = () => ({
  nodes: [
    { id: 'n-lantern', line: 'amber', machine: 'lantern', dead: true },
    { id: 'n-bridge', line: 'rose', machine: 'bridge', dead: true },
    { id: 'n-bridge-far', line: 'rose', machine: 'bridge', dead: true },
    { id: 'n-lift', line: 'teal', machine: 'lift', dead: true },
    { id: 'n-live', line: 'teal', machine: 'live' },
    { id: 'n-fixed', line: 'amber', machine: 'fixed' },
  ],
  machines: [
    { id: 'lantern', kind: 'lantern', duration: 'hold', borrowable: true },
    { id: 'bridge', kind: 'bridge', duration: 6000, travel: 600, borrowable: true },
    { id: 'lift', kind: 'lift', duration: 6000, travel: 1300, borrowable: true },
    { id: 'live', kind: 'lift', duration: 5000, travel: 1300, borrowable: true },
    { id: 'fixed', kind: 'lift', duration: 5000, travel: 1300 },
  ],
});

test('borrow: take a held light, give it to a dead node, it fires on the next bell', () => {
  const tt = createTimetable(borrowDef());
  tt.hold('lantern', 'n-lantern');
  assert.equal(tt.punch('n-bridge').result, 'dead', 'a dead node has no line to punch');
  assert.equal(tt.borrowPreview('n-bridge').result, 'dark');
  assert.equal(tt.borrowPreview('n-lantern').result, 'borrow');
  const taken = tt.lamp('n-lantern');
  assert.equal(taken.result, 'borrowed');
  assert.equal(tt.machineStatus('lantern').powered, false, 'taking it puts the source out');
  assert.equal(tt.machineStatus('lantern').lentOut, true);
  assert.deepEqual(tt.snapshot().carried, { source: 'lantern', from: 'n-lantern' });
  assert.equal(tt.borrowPreview('n-lift').result, 'give');
  assert.equal(tt.lamp('n-lift').result, 'given');
  assert.equal(tt.carried(), null);
  assert.equal(tt.nodeStatus('n-lift').given, true);
  tt.update(tt.msToBell());
  assert.equal(tt.machineStatus('lift').powered, true);
  assert.equal(tt.machineStatus('lift').borrowed, true);
  assert.equal(tt.nodeStatus('n-lift').charged, true);
});

test('borrow: the light goes home when the machine it powers switches off', () => {
  const tt = createTimetable(borrowDef());
  tt.hold('lantern', 'n-lantern');
  tt.lamp('n-lantern');
  tt.lamp('n-bridge');
  tt.update(tt.msToBell());
  const events = tt.update(6000);
  assert.ok(events.some((event) => event.type === 'light-return' && event.source === 'lantern' && event.reason === 'spent'));
  assert.equal(tt.machineStatus('bridge').powered, false);
  assert.equal(tt.machineStatus('lantern').powered, true, 'the lantern is lit again');
  assert.equal(tt.machineStatus('lantern').held, true);
  assert.equal(tt.machineStatus('lantern').lentOut, false);
});

test('borrow: take the light back out of the machine it powers (the bridge you crossed)', () => {
  const tt = createTimetable(borrowDef());
  tt.hold('lantern', 'n-lantern');
  tt.lamp('n-lantern');
  tt.lamp('n-bridge');
  tt.update(tt.msToBell() + 1500);
  assert.equal(tt.borrowPreview('n-bridge-far').result, 'borrow');
  const back = tt.lamp('n-bridge-far');
  assert.equal(back.result, 'borrowed');
  assert.equal(back.source, 'lantern', 'it is still the lantern\'s light');
  assert.equal(tt.machineStatus('bridge').powered, false, 'the bridge retracts');
  assert.equal(tt.machineStatus('lantern').powered, false, 'and the lantern stays dark while it is carried');
  // Carry it on to the lift.
  tt.lamp('n-lift');
  tt.update(tt.msToBell());
  assert.equal(tt.machineStatus('lift').powered, true);
});

test('borrow: one charge at a time, only from lit borrowable machines', () => {
  const tt = createTimetable(borrowDef());
  tt.hold('lantern', 'n-lantern');
  tt.punch('n-live');
  tt.punch('n-fixed');
  tt.update(BELL_MS + AFTER);
  assert.equal(tt.borrowPreview('n-fixed').result, 'fixed');
  tt.lamp('n-lantern');
  assert.equal(tt.borrowPreview('n-live').result, 'live', 'a live node is punched, not given');
  assert.equal(tt.lamp('n-live').result, 'live');
  assert.equal(tt.machineStatus('live').powered, true, 'nothing was taken');
  tt.lamp('n-bridge');
  // A light given but not yet rung can be taken back.
  assert.equal(tt.borrowPreview('n-bridge').result, 'retrieve');
  assert.equal(tt.lamp('n-bridge').result, 'retrieved');
  assert.equal(tt.carried().source, 'lantern');
  // Giving it back to its own source puts it straight home.
  assert.equal(tt.borrowPreview('n-lantern').result, 'return');
  assert.equal(tt.lamp('n-lantern').result, 'returned');
  assert.equal(tt.machineStatus('lantern').held, true);
});

test('borrow: a fall sends every borrowed light home at once (no soft-lock)', () => {
  const tt = createTimetable(borrowDef());
  tt.hold('lantern', 'n-lantern');
  tt.lamp('n-lantern');
  tt.lamp('n-bridge');
  tt.update(tt.msToBell() + 500);
  assert.equal(tt.machineStatus('bridge').powered, true);
  const events = tt.dropLight();
  assert.ok(events.some((event) => event.type === 'light-return' && event.reason === 'spent'));
  assert.equal(tt.machineStatus('bridge').powered, false);
  assert.equal(tt.machineStatus('lantern').held, true);
  // Carried when he falls.
  tt.update(AFTER);
  tt.lamp('n-lantern');
  assert.ok(tt.carried());
  const fall = tt.dropLight();
  assert.ok(fall.some((event) => event.type === 'light-return' && event.reason === 'fall'));
  assert.equal(tt.carried(), null);
  assert.equal(tt.machineStatus('lantern').held, true);
  // Given and waiting for the bell when he falls.
  tt.lamp('n-lantern');
  tt.lamp('n-lift');
  tt.dropLight();
  assert.equal(tt.nodeStatus('n-lift').given, false);
  assert.equal(tt.machineStatus('lantern').held, true);
  tt.update(tt.msToBell());
  assert.equal(tt.machineStatus('lift').powered, false);
});

test('borrow: taking the light out of a timed live machine switches it off; it does not come back on', () => {
  const tt = createTimetable(borrowDef());
  tt.punch('n-live');
  tt.update(BELL_MS + 2000);
  assert.equal(tt.lamp('n-live').result, 'borrowed');
  assert.equal(tt.machineStatus('live').powered, false);
  assert.equal(tt.lineBusy('teal'), false, 'its line is free again');
  tt.lamp('n-bridge');
  tt.update(tt.msToBell() + 6000);
  assert.equal(tt.machineStatus('live').powered, false, 'a timed source is simply home');
  assert.equal(tt.machineStatus('live').lentOut, false);
});

// ---------------------------------------------------------------------------
// v2 · the counterweight pair.
test('counterweight: the loaded cage sinks while the brake is released, locked otherwise', () => {
  const tt = createTimetable({
    nodes: [{ id: 'n-brake', line: 'teal', machine: 'pair' }],
    machines: [{ id: 'pair', kind: 'counterweight', duration: 2800, travel: 2400 }],
  });
  tt.setLoad('pair', 'a');
  tt.update(3000);
  assert.equal(tt.machineStatus('pair').level, 0, 'locked: nothing moves until the brake is released');
  tt.punch('n-brake');
  tt.update(tt.msToBell());
  assert.equal(tt.machineStatus('pair').powered, true);
  tt.update(1200);
  assert.ok(Math.abs(tt.machineStatus('pair').level - 0.5) < 1e-9, 'half way after half the travel');
  // Unloaded mid-way: balanced, the pair stops where it is.
  tt.setLoad('pair', null);
  tt.update(400);
  assert.ok(Math.abs(tt.machineStatus('pair').level - 0.5) < 1e-9);
  tt.setLoad('pair', 'a');
  const events = tt.update(1200);
  assert.ok(events.some((event) => event.type === 'arrived'));
  assert.equal(tt.machineStatus('pair').level, 1);
  // Brake on again: stays put even with the load moved to the other cage.
  tt.update(2000);
  assert.equal(tt.machineStatus('pair').powered, false);
  tt.setLoad('pair', 'b');
  tt.update(1000);
  assert.equal(tt.machineStatus('pair').level, 1);
  // A respawn reset puts it back at rest.
  tt.resetMachine('pair');
  assert.equal(tt.machineStatus('pair').level, 0);
  assert.equal(tt.machineStatus('pair').load, null);
});
