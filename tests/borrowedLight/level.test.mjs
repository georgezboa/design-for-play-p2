import test from 'node:test';
import assert from 'node:assert/strict';
import { jumpArc, CONTROLLER } from '../../src/chapters/borrowedLight/controller.js';
import { BELL_MS, CUT_GRACE_MS, FLICKER_MS, createTimetable } from '../../src/chapters/borrowedLight/timetableModel.js';
import {
  DEPARTURE_BELLS,
  DEPARTURE_CHAIN,
  LAMPS,
  MACHINES,
  NODES,
  PLATFORMS,
  PUNCH_RANGE,
  ROUTE,
  SECTIONS,
  SECTION_CHECKPOINTS,
  SIGNS,
  WORLD,
  cableFor,
  machineById,
  nodeById,
  nodeHead,
  platformById,
  resolveStartSection,
  sectionAt,
  timetableDefinition,
} from '../../src/chapters/borrowedLight/level.js';

const arc = jumpArc();
const RUN = CONTROLLER.maxRun / 1000; // px per ms
const right = (p) => p.x + p.w;
const gapBetween = (a, b) => b.x - right(a);
const riseBetween = (a, b) => a.y - b.y; // + means b is higher

test('the level builds a valid timetable and every node, machine and cable resolves', () => {
  const tt = createTimetable(timetableDefinition());
  assert.equal(tt.nodeIds().length, NODES.length);
  for (const node of NODES) {
    const machine = machineById(node.machine);
    assert.ok(machine, `${node.id} → ${node.machine}`);
    assert.equal(machine.section, node.section, `${node.id} and its machine live in one section`);
    const cable = cableFor(node);
    assert.ok(cable.length >= 2);
    cable.forEach(({ x, y }) => assert.ok(Number.isFinite(x) && Number.isFinite(y)));
  }
  for (const machine of MACHINES) {
    assert.ok(NODES.some((node) => node.machine === machine.id), `${machine.id} has a node`);
    if (machine.duration !== 'hold') {
      assert.ok(machine.duration >= 3000 && machine.duration <= 8000, `${machine.id} duration ${machine.duration}`);
    }
  }
});

test('every node stands on a roof inside its own section', () => {
  for (const node of NODES) {
    const underfoot = PLATFORMS.find((p) => node.x >= p.x && node.x <= right(p) && Math.abs(p.y - node.y) < 1);
    assert.ok(underfoot, `${node.id} floats`);
    assert.equal(sectionAt(node.x), node.section, node.id);
  }
});

test('every lamp checkpoint stands on a roof, and each section starts at a lamp', () => {
  for (const lamp of LAMPS) {
    const underfoot = PLATFORMS.find((p) => lamp.spawnX >= p.x && lamp.spawnX <= right(p) && Math.abs(p.y - lamp.y) < 1);
    assert.ok(underfoot, `${lamp.id} spawn floats`);
    assert.equal(sectionAt(lamp.x), lamp.section);
  }
  for (const section of Object.values(SECTIONS)) assert.ok(LAMPS.find((lamp) => lamp.id === section.spawn));
});

test('route edges honour the jump arc: jumps are comfortable, machine gaps are not jumpable', () => {
  for (const edge of ROUTE) {
    const from = platformById(edge.from);
    const to = platformById(edge.to);
    assert.ok(from && to, `${edge.from} → ${edge.to}`);
    const gap = gapBetween(from, to);
    const rise = riseBetween(from, to);
    if (edge.via === 'jump') {
      assert.ok(gap <= 200, `${edge.from}→${edge.to} gap ${gap}`);
      assert.ok(rise <= 100, `${edge.from}→${edge.to} rise ${rise}`);
      assert.ok(gap < arc.reachAtRise(rise) * 0.8, `${edge.from}→${edge.to} needs a comfortable jump`);
    } else if (edge.via === 'drop') {
      assert.ok(rise < 0, `${edge.from}→${edge.to} is a drop`);
      assert.ok(gap <= 0, `${edge.from}→${edge.to} drop lands flush`);
    } else {
      // A machine edge must actually need the machine: out of jump reach
      // (with 40 px of body-width slack).
      const machineGap = gap > arc.reachAtRise(rise) + 40 || rise > arc.apex;
      assert.ok(machineGap, `${edge.from}→${edge.to} via ${edge.via} is jumpable without it (gap ${gap}, rise ${rise})`);
    }
  }
});

test('blackout scaffold decks: a full running jump from the right half of one lands on the next', () => {
  const chain = ['b-roof7', 'b-step1', 'b-step2', 'b-roof8'].map(platformById);
  for (let i = 0; i < chain.length - 1; i += 1) {
    const from = chain[i];
    const to = chain[i + 1];
    for (const takeoff of [right(from), right(from) - from.w / 2 + 20].slice(0, from.kind === 'ledge' ? 2 : 1)) {
      const land = takeoff + arc.reachAtRise(from.y - to.y) * 0.97;
      assert.ok(land > to.x + 10 && land < to.x + to.w, `${from.id} → ${to.id}: lands at ${Math.round(land)} (target ${to.x}…${to.x + to.w})`);
    }
  }
});

test('hops off machines onto the next roof are comfortable', () => {
  const billboard = machineById('a-billboard');
  const stairhead = platformById('a-stairhead');
  const roof5 = platformById('a-roof5');
  assert.ok(stairhead.y - billboard.y <= 100, 'stair head → billboard');
  assert.ok(billboard.x - right(stairhead) <= 20);
  const hop = roof5.x - (billboard.x + billboard.w);
  assert.ok(hop <= 220 && hop < arc.reachAtRise(billboard.y - roof5.y) * 0.8, `billboard → roof5 hop ${hop}`);
  // The dead-end lookout cannot reach the billboard or the continuing roof.
  const view = platformById('a-view');
  assert.ok(view.y - billboard.y > arc.apex, 'view → billboard out of reach');
  assert.ok(view.y - roof5.y > arc.apex, 'view → roof5 out of reach');
  // Lifts deliver flush onto their roofs.
  for (const [liftId, roofId] of [['a-lift1', 'a-roof2'], ['b-lift1', 'b-roof9'], ['b-hotel-lift', 'b-hotel'], ['c-lift', 'c-gantry']]) {
    const lift = machineById(liftId);
    const roof = platformById(roofId);
    assert.equal(lift.y1, roof.y, liftId);
    assert.ok(Math.abs(roof.x - (lift.x + lift.w)) <= 20, `${liftId} meets ${roofId}`);
  }
  // Bridges land flush.
  for (const [bridgeId, roofId] of [['a-bridge1', 'a-roof1'], ['a-bridge2', 'a-roof4'], ['a-bridge3', 'a-view'], ['b-bridge', 'b-roof10']]) {
    const bridge = machineById(bridgeId);
    const roof = platformById(roofId);
    assert.equal(bridge.x + bridge.length, roof.x, bridgeId);
    assert.equal(bridge.y, roof.y, bridgeId);
    assert.ok(bridge.length >= 400, `${bridgeId} long enough to need`);
  }
});

test('the hotel twist can only be cut from the near side, and the cut leaves time to cross', () => {
  const cutNode = nodeById('b-n4');
  const bridge = machineById('b-bridge');
  const farRoof = platformById('b-roof10');
  assert.ok(farRoof.x - cutNode.x > PUNCH_RANGE, 'cannot cut from the far roof');
  const cross = (farRoof.x - cutNode.x) / RUN + 150; // + accel/reaction
  assert.ok(cross < CUT_GRACE_MS, `crossing ${Math.round(cross)} ms vs grace ${CUT_GRACE_MS}`);
  assert.equal(nodeById('b-n5').line, cutNode.line, 'hotel lift shares the held line');
  assert.equal(bridge.duration, 'hold');
});

test('the Grid Stone ledge is lit by one node\'s afterglow and needs one extra lift', () => {
  const node = nodeById('b-n3');
  const head = nodeHead(node);
  const ledge = platformById('b-stone-ledge');
  assert.equal(ledge.hidden, true);
  const d = Math.hypot(ledge.x + ledge.w / 2 - head.x, ledge.y - head.y);
  assert.ok(d < 600, `afterglow reaches ${Math.round(d)}`);
  assert.equal(machineById(node.machine).y1, ledge.y);
  assert.ok(ROUTE.find((edge) => edge.to === 'b-stone-ledge').optional);
});

// ---------------------------------------------------------------------------
// Scripted solves: drive the model the way a player would, walking between
// nodes at run speed and waiting for bells, and check each machine is where
// Butch needs it when he gets there.

function player(tt) {
  let x = 0;
  const walkTo = (to) => { const ms = Math.abs(to - x) / RUN; x = to; return tt.update(ms); };
  const waitBell = () => tt.update(tt.msToBell());
  const wait = (ms) => tt.update(ms);
  return { walkTo, waitBell, wait, at: (value) => { x = value; }, get x() { return x; } };
}

test('scripted solve · A1–A2: punch, bell, cross; punch, ride', () => {
  const tt = createTimetable(timetableDefinition());
  // As in the game: section B's bridge is held by the city from the start;
  // its teal circuit must not block section A's teal lift.
  tt.hold('b-bridge');
  const p = player(tt);
  p.at(700);
  tt.update(1234); // arbitrary phase
  p.walkTo(1400);
  assert.equal(tt.punch('a-n1').result, 'queued');
  p.waitBell();
  p.wait(600);
  assert.equal(tt.machineStatus('a-bridge1').level, 1);
  p.walkTo(2100);
  assert.equal(tt.machineStatus('a-bridge1').powered, true, 'bridge still out after crossing');
  p.walkTo(2600);
  assert.equal(tt.punch('a-n2').result, 'queued');
  p.walkTo(2760); // step onto the lift before the bell (worst case 4 s away)
  assert.ok(tt.msToBell() >= 0);
  p.waitBell();
  p.wait(1300);
  assert.equal(tt.machineStatus('a-lift1').level, 1);
  assert.ok(tt.machineStatus('a-lift1').remaining > 3000, 'time to step off');
});

test('scripted solve · A3: lift and bridge on different lines share one bell', () => {
  const tt = createTimetable(timetableDefinition());
  const p = player(tt);
  p.at(4280);
  assert.equal(tt.punch('a-n4').result, 'queued');
  p.walkTo(4390);
  assert.equal(tt.punch('a-n3').result, 'queued');
  p.walkTo(4560);
  p.waitBell();
  p.wait(1300); // ride up
  assert.equal(tt.machineStatus('a-lift2').level, 1);
  assert.equal(tt.machineStatus('a-bridge2').level, 1, 'bridge already out when the lift arrives');
  p.walkTo(5200);
  assert.equal(tt.machineStatus('a-bridge2').powered, true);
  // Step 4 starts right away: the bridge just crossed must not be holding
  // the line step 4 teaches with.
  p.walkTo(5500);
  assert.equal(tt.punch('a-n5').result, 'queued');
});

test('scripted solve · A4: the amber line holds a bridge OR a billboard', () => {
  const tt = createTimetable(timetableDefinition());
  tt.punch('a-n5');
  const second = tt.punch('a-n6');
  assert.equal(second.result, 'replaced');
  assert.equal(second.cancelled, 'a-n5');
  tt.update(tt.msToBell());
  assert.equal(tt.machineStatus('a-billboard').powered, true);
  assert.equal(tt.machineStatus('a-bridge3').powered, false);
  // From the stair head across 760 px of billboard: ~1.8 s of a 7 s window.
  const walk = machineById('a-billboard').w / RUN + 400;
  assert.ok(walk < machineById('a-billboard').duration - FLICKER_MS);
  // While the billboard runs, the bridge is refused; the lookout is always
  // reachable later and has its own node home.
  assert.equal(tt.punch('a-n5').result, 'busy');
  tt.update(7000);
  assert.equal(tt.punch('a-n5').result, 'queued');
  tt.update(tt.msToBell());
  assert.equal(tt.machineStatus('a-bridge3').powered, true);
  tt.update(6000);
  assert.equal(tt.punch('a-n7').result, 'queued', 'the lookout can call the bridge back');
});

test('scripted solve · B: memory light, the stone lift, the held bridge cut and the hotel lift', () => {
  const tt = createTimetable(timetableDefinition());
  tt.setMemoryLight(true);
  tt.hold('b-bridge');
  const p = player(tt);
  p.at(9210);
  tt.punch('b-n1');
  p.waitBell();
  assert.equal(tt.afterglowOf('b-n1'), 1);
  // Three hops across the dark scaffold decks inside the 6 s afterglow.
  p.walkTo(10100);
  assert.ok(tt.afterglowOf('b-n1') > 0, 'the path stays lit while crossing');
  p.walkTo(10560);
  tt.punch('b-n2');
  p.walkTo(10760);
  p.waitBell();
  p.wait(1300);
  assert.equal(tt.machineStatus('b-lift1').level, 1);
  // Optional stone.
  p.walkTo(11210);
  tt.punch('b-n3');
  p.walkTo(11400);
  p.waitBell();
  assert.ok(tt.afterglowOf('b-n3') > 0.99);
  p.wait(1300);
  assert.equal(tt.machineStatus('b-lift2').level, 1);
  // The hotel lift is refused while the teal line holds the bridge.
  p.at(11820);
  assert.equal(tt.punch('b-n5').result, 'busy');
  assert.equal(tt.punch('b-n4').result, 'cut');
  p.walkTo(12380);
  assert.ok(tt.machineStatus('b-bridge').powered, 'crossed inside the grace');
  p.walkTo(12640);
  assert.equal(tt.punch('b-n5').result, 'queued');
  p.walkTo(12880);
  p.waitBell();
  p.wait(1500);
  assert.equal(tt.machineStatus('b-hotel-lift').level, 1);
  // Shutter.
  tt.punch('b-n6');
  p.waitBell();
  p.wait(450);
  assert.equal(tt.machineStatus('b-shutter').level, 1);
});

test('scripted solve · C: the departure chain fits inside eight bells, with slack', () => {
  const tt = createTimetable(timetableDefinition());
  const p = player(tt);
  p.at(15360);
  tt.update(700);
  tt.startCountdown(DEPARTURE_BELLS);
  const startBell = tt.bellIndex;
  p.walkTo(15840);
  tt.punch('c-n1');
  p.waitBell();
  p.wait(700);
  assert.equal(tt.machineStatus('c-points').level, 1);
  p.walkTo(16520);
  // Points hold the amber line, so the drawbridge is refused until cut.
  assert.equal(tt.punch('c-n4').result, 'busy');
  assert.equal(tt.punch('c-n2').result, 'cut');
  p.walkTo(16600);
  assert.equal(tt.punch('c-n4').result, 'queued');
  p.walkTo(16690);
  assert.equal(tt.punch('c-n3').result, 'queued');
  p.walkTo(16800);
  p.waitBell();
  p.wait(1300);
  assert.equal(tt.machineStatus('c-lift').level, 1);
  p.at(16950);
  p.walkTo(17550);
  assert.equal(tt.machineStatus('c-drawbridge').level, 1);
  p.walkTo(18520);
  assert.equal(tt.machineStatus('c-drawbridge').powered, true, 'bridge still down on arrival');
  const used = tt.bellIndex - startBell;
  assert.ok(used <= 3, `solved in ${used} bells`);
  assert.ok(DEPARTURE_BELLS - used >= 4, 'at least four bells of slack');
  // Everything the train would need to remember was fired by the player.
  const fired = new Set(tt.history(startBell).map((entry) => entry.machineId));
  assert.deepEqual([...DEPARTURE_CHAIN].filter((id) => !fired.has(id)), []);
});

test('start section: dev honours ?section=, production only honours an unlocked checkpoint', () => {
  assert.equal(resolveStartSection({ search: '?section=C', devMode: true }), 'C');
  assert.equal(resolveStartSection({ search: '?section=b', devMode: true }), 'B');
  assert.equal(resolveStartSection({ search: '?section=Z', devMode: true }), 'A');
  assert.equal(resolveStartSection({ search: '?section=C', devMode: false, unlocked: ['chapter-2-start'] }), 'A');
  assert.equal(resolveStartSection({ search: '?section=C', devMode: false, unlocked: ['chapter-2-platform'] }), 'C');
  assert.equal(resolveStartSection({ search: '', devMode: false, unlocked: ['chapter-2-platform'] }), 'A');
  assert.deepEqual(SECTION_CHECKPOINTS, { A: 'chapter-2-start', B: 'chapter-2-midpoint', C: 'chapter-2-platform' });
});

test('hanging signs clear Butch\'s head wherever he can walk under them', () => {
  for (const sign of SIGNS) {
    const h = sign.layer === 'hotel' ? 110 : 60;
    const under = PLATFORMS.filter((p) => sign.x + sign.w / 2 > p.x && sign.x - sign.w / 2 < p.x + p.w && p.y > sign.y);
    for (const roof of under) {
      assert.ok(sign.y + h <= roof.y - 124, `${sign.text} hangs into head height over ${roof.id}`);
    }
  }
});

test('world bounds leave room for every roof, lift top and the mist', () => {
  for (const platform of PLATFORMS) assert.ok(platform.y > WORLD.top + 200, platform.id);
  for (const machine of MACHINES) if (machine.kind === 'lift') assert.ok(machine.y1 > WORLD.top + 200);
  assert.ok(WORLD.killY > Math.max(...PLATFORMS.map((p) => p.y)) + 300);
  assert.ok(WORLD.killY < WORLD.bottom);
  assert.equal(BELL_MS, 4000);
});
