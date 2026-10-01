import test from 'node:test';
import assert from 'node:assert/strict';
import { jumpArc, CONTROLLER } from '../../src/chapters/borrowedLight/controller.js';
import { BELL_MS, CATCH_MS, CUT_GRACE_MS, FLICKER_MS, createTimetable } from '../../src/chapters/borrowedLight/timetableModel.js';
import {
  CHASE,
  DEPARTURE_BELLS,
  DEPARTURE_CHAIN,
  LAMPS,
  MACHINES,
  NODES,
  PLATFORMS,
  PUNCH_RANGE,
  RESET_ON_RESPAWN,
  ROUTE,
  SECTIONS,
  SECTION_CHECKPOINTS,
  SIGNS,
  WORLD,
  cableFor,
  cagesAt,
  lampById,
  machineById,
  nodeById,
  nodeHead,
  platformById,
  resolveStartLamp,
  resolveStartSection,
  sectionAt,
  timetableDefinition,
} from '../../src/chapters/borrowedLight/level.js';

const arc = jumpArc();
const RUN = CONTROLLER.maxRun / 1000; // px per ms
const right = (p) => p.x + p.w;
const gapBetween = (a, b) => b.x - right(a);
const riseBetween = (a, b) => a.y - b.y; // + means b is higher
const AFTER = CATCH_MS + 50;

// The game starts with the city's held machines held (the scene does this).
function cityTimetable() {
  const tt = createTimetable(timetableDefinition());
  MACHINES.filter((m) => m.heldAtStart).forEach((m) => tt.hold(m.id, m.heldBy));
  return tt;
}

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
      const min = machine.kind === 'counterweight' ? 2000 : 3000;
      assert.ok(machine.duration >= min && machine.duration <= 8000, `${machine.id} duration ${machine.duration}`);
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
  // Lamps are listed in route order, so "the last lamp passed" is well defined.
  for (let i = 1; i < LAMPS.length; i += 1) assert.ok(LAMPS[i].x > LAMPS[i - 1].x, LAMPS[i].id);
});

// R3 · "more respawn points": a lamp before every puzzle room and jump
// sequence, close enough that no fall costs more than ~20 s of replay.
test('a lamp stands before every puzzle room: no fall costs more than ~20 s', () => {
  const order = ROUTE.filter((edge) => !edge.deadEnd && !edge.optional);
  for (const [i, edge] of order.entries()) {
    if (edge.via === 'drop') continue;
    // A jump chain (the dark decks) is one room: look up to three roofs back.
    const back = [edge.from, order[i - 1]?.from, order[i - 2]?.from, order[i - 3]?.from].filter(Boolean).map(platformById);
    const machine = machineById(edge.via.split('+')[0]);
    const at = machine ? machine.x : platformById(edge.to).x;
    const lamp = LAMPS.filter((l) => back.some((p) => l.spawnX >= p.x && l.spawnX <= right(p) && Math.abs(l.y - p.y) < 1) && l.spawnX <= at).at(-1);
    assert.ok(lamp, `${edge.from} → ${edge.to}: no lamp on the way in`);
    const replay = (at - lamp.spawnX) / (RUN * 1000) + 2 * BELL_MS / 1000;
    assert.ok(at - lamp.spawnX <= 2100 && replay <= 20, `${edge.from} → ${edge.to}: ${Math.round(replay)} s from ${lamp.id}`);
  }
  assert.ok(LAMPS.length >= 18, 'v2 has twice the lamps of v1');
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
      edge.via.split('+').forEach((id) => assert.ok(machineById(id), `${id} exists`));
    }
  }
  // The route is connected end to end.
  const main = ROUTE.filter((edge) => !edge.deadEnd && !edge.optional);
  for (let i = 1; i < main.length; i += 1) assert.equal(main[i].from, main[i - 1].to, `${main[i - 1].to} → ${main[i].from}`);
  assert.equal(main[0].from, 'a-terminal');
  assert.equal(main.at(-1).to, 'c-platform');
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

test('hops off machines onto the next roof are comfortable, and machines land flush', () => {
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
  for (const [liftId, roofId] of [['a-lift1', 'a-roof2'], ['b-lift1', 'b-roof9'], ['b-hotel-lift', 'b-hotel'], ['c-lift', 'c-gantry'], ['b-lift3', 'b-roof12']]) {
    const lift = machineById(liftId);
    const roof = platformById(roofId);
    assert.equal(lift.y1, roof.y, liftId);
    assert.ok(Math.abs(roof.x - (lift.x + lift.w)) <= 20, `${liftId} meets ${roofId}`);
  }
  // Bridges land flush.
  for (const [bridgeId, roofId] of [['a-bridge1', 'a-roof1'], ['a-bridge2', 'a-roof4'], ['a-bridge3', 'a-view'], ['b-bridge', 'b-roof10'],
    ['a-bridge4', 'a-roof7'], ['a-bridge5', 'a-roof9'], ['b-bridge2', 'b-tower'], ['b-bridge3', 'b-roof13']]) {
    const bridge = machineById(bridgeId);
    const roof = platformById(roofId);
    assert.equal(bridge.x + bridge.length, roof.x, bridgeId);
    assert.equal(bridge.y, roof.y, bridgeId);
    assert.ok(bridge.length >= 400, `${bridgeId} long enough to need`);
  }
  // A7: the lift's top meets the bridge housing.
  const lift3 = machineById('a-lift3');
  assert.equal(lift3.x + lift3.w, machineById('a-bridge5').x);
  assert.equal(lift3.y1, machineById('a-bridge5').y);
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
  // Wait (if needed) until the coming bell is of this parity.
  const waitForNext = (parity) => { if (tt.nextBellParity() !== parity) { waitBell(); wait(AFTER); } };
  return { walkTo, waitBell, wait, waitForNext, at: (value) => { x = value; }, get x() { return x; } };
}

test('scripted solve · A1–A2: punch, bell, cross; punch, ride', () => {
  const tt = cityTimetable();
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
  const tt = cityTimetable();
  const p = player(tt);
  p.at(4280);
  tt.update(AFTER);
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
  const tt = cityTimetable();
  tt.update(AFTER);
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

test('scripted solve · A6 TWO BELLS: the rose line rings only on bell II', () => {
  const tt = cityTimetable();
  const p = player(tt);
  p.at(nodeById('a-n9').x);
  p.wait(AFTER);
  assert.equal(nodeById('a-n9').phase, 'even');
  // Next bell is I: the punch waits a bell, and says so.
  assert.equal(tt.nextBellParity(), 'odd');
  assert.equal(tt.punch('a-n9').inBells, 2);
  p.waitBell();
  assert.equal(tt.machineStatus('a-bridge4').powered, false, 'bell I passes it by');
  p.waitBell();
  p.wait(600);
  assert.equal(tt.machineStatus('a-bridge4').level, 1, 'bell II');
  p.walkTo(platformById('a-roof7').x + 40);
  assert.equal(tt.machineStatus('a-bridge4').powered, true, 'crossed inside its six seconds');
});

test('scripted solve · A7 I THEN II: lift on I, bridge on II — and why the order matters', () => {
  const lift = machineById('a-lift3');
  const bridge = machineById('a-bridge5');
  const solve = (firstBell) => {
    const tt = cityTimetable();
    const p = player(tt);
    p.at(nodeById('a-n11').x);
    p.waitForNext(firstBell);
    tt.punch('a-n11');
    p.walkTo(nodeById('a-n10').x);
    tt.punch('a-n10');
    p.walkTo(lift.x + 120); // stand on the lift
    // Ride the lift up on its bell (I), then cross the bridge on its bell (II).
    let liftAt = null;
    let crossed = false;
    for (let ms = 0; ms < 16000 && !crossed; ms += 50) {
      tt.update(50);
      const l = tt.machineStatus('a-lift3');
      const b = tt.machineStatus('a-bridge5');
      if (liftAt === null && l.level === 1) liftAt = ms;
      // On top of the lift, step onto the bridge as soon as it is all the
      // way out, and run 460 px across while it stays out.
      if (liftAt !== null && l.powered && l.level === 1 && b.powered && b.level === 1) {
        tt.update(bridge.length / RUN);
        crossed = tt.machineStatus('a-bridge5').powered;
        break;
      }
      if (liftAt !== null && !l.powered) break; // the lift went down with him
    }
    return crossed;
  };
  assert.equal(solve('odd'), true, 'punched while the next bell is I: up, then across');
  assert.equal(solve('even'), false, 'punched while the next bell is II: the bridge is gone before the lift is up');
});

test('scripted solve · A8 THE CHASE: quick bells, cradles on I, II, I', () => {
  const tt = cityTimetable();
  tt.setBellMs(CHASE.bellMs);
  const p = player(tt);
  const [c1, c2, c3] = ['a-cradle1', 'a-cradle2', 'a-cradle3'].map(machineById);
  const roof9 = platformById('a-roof9');
  const roof10 = platformById('a-roof10');
  p.at(nodeById('a-n12').x);
  p.waitForNext('odd');
  tt.punch('a-n12');
  p.walkTo(nodeById('a-n13').x);
  tt.punch('a-n13');
  p.walkTo(right(roof9));
  p.waitBell(); // bell I: the first cradle lowers
  p.wait(c1.travel);
  assert.equal(tt.machineStatus('a-cradle1').level, 1);
  p.walkTo(c1.x + 40);
  // The last cradle's node is in reach from the first cradle's near end.
  const chest = { x: c1.x + 40, y: c1.y - 64 };
  const head = nodeHead(nodeById('a-n14'));
  assert.ok(Math.hypot(head.x - chest.x, head.y + 20 - chest.y) < PUNCH_RANGE, 'a-n14 from the first cradle');
  assert.equal(tt.punch('a-n14').inBells, 2, 'rings on bell III');
  p.walkTo(right(c1) - 20);
  const hop = 160 / RUN + 60;
  for (const [from, next] of [[c1, c2], [c2, c3]]) {
    // Wait on this cradle for the next one to lower, then hop.
    while (tt.machineStatus(next.id).level < 0.9) {
      tt.update(50);
      assert.equal(tt.machineStatus(from.id).powered, true, `${from.id} is still down while waiting for ${next.id}`);
    }
    tt.update(hop);
    assert.ok(tt.machineStatus(next.id).powered, `landed on ${next.id}`);
    p.at(next.x + 20);
    p.walkTo(right(next) - 20);
  }
  tt.update(hop);
  assert.ok(tt.machineStatus('a-cradle3').powered, 'onto Mara\'s roof before the last cradle lifts');
  assert.ok(roof10.x - right(c3) <= 160);
  // Each cradle overlaps the next by at least a second at the quick bell.
  assert.ok(c1.duration - CHASE.bellMs >= 1000);
});

test('the chase quickens the bell only between Mara\'s look back and her roof', () => {
  assert.ok(CHASE.fromX >= platformById('a-roof9').x && CHASE.fromX <= lampById('lamp-a7').spawnX, 'quick from the chase lamp on');
  assert.equal(CHASE.toX, platformById('a-roof10').x);
  assert.ok(CHASE.bellMs >= 2000 && CHASE.bellMs < BELL_MS);
  for (const node of NODES.filter((n) => n.x >= CHASE.fromX && n.x < CHASE.toX)) assert.equal(node.district, 'A8', `${node.id} is a chase node`);
});

test('scripted solve · B: memory light, the stone lift, the held bridge cut and the hotel lift', () => {
  const tt = cityTimetable();
  tt.setMemoryLight(true);
  const p = player(tt);
  const X = (id) => nodeById(id).x;
  p.at(X('b-n1'));
  tt.update(AFTER);
  tt.punch('b-n1');
  p.waitBell();
  assert.equal(tt.afterglowOf('b-n1'), 1);
  // Three hops across the dark scaffold decks inside the 6 s afterglow.
  p.walkTo(platformById('b-roof8').x);
  assert.ok(tt.afterglowOf('b-n1') > 0, 'the path stays lit while crossing');
  p.walkTo(X('b-n2'));
  tt.punch('b-n2');
  p.walkTo(machineById('b-lift1').x + 80);
  p.waitBell();
  p.wait(1300);
  assert.equal(tt.machineStatus('b-lift1').level, 1);
  // Optional stone.
  p.walkTo(X('b-n3'));
  tt.update(AFTER);
  tt.punch('b-n3');
  p.walkTo(machineById('b-lift2').x + 60);
  p.waitBell();
  assert.ok(tt.afterglowOf('b-n3') > 0.99);
  p.wait(1300);
  assert.equal(tt.machineStatus('b-lift2').level, 1);
  // The hotel lift is refused while the teal line holds the bridge.
  p.at(X('b-n4'));
  assert.equal(tt.punch('b-n5').result, 'busy');
  assert.equal(tt.punch('b-n4').result, 'cut');
  p.walkTo(platformById('b-roof10').x + 40);
  assert.ok(tt.machineStatus('b-bridge').powered, 'crossed inside the grace');
  p.walkTo(X('b-n5'));
  tt.update(AFTER);
  assert.equal(tt.punch('b-n5').result, 'queued');
  p.walkTo(machineById('b-hotel-lift').x + 100);
  p.waitBell();
  p.wait(1500);
  assert.equal(tt.machineStatus('b-hotel-lift').level, 1);
});

test('scripted solve · B5–B7 BORROW: lantern → bridge; take it back; carry it; lift → bridge', () => {
  const tt = cityTimetable();
  tt.setMemoryLight(true);
  const p = player(tt);
  const X = (id) => nodeById(id).x;
  assert.equal(tt.machineStatus('b-lantern1').held, true, 'the city still holds the lantern lit');
  // B5 · teach: the dead bridge, the lantern's light.
  p.at(X('b-nL1'));
  assert.equal(tt.punch('b-n9').result, 'dead');
  assert.equal(tt.lamp('b-nL1').result, 'borrowed');
  p.walkTo(X('b-n9'));
  assert.equal(tt.lamp('b-n9').result, 'given');
  p.waitBell();
  p.wait(600);
  assert.equal(tt.machineStatus('b-bridge2').level, 1);
  p.walkTo(X('b-n7'));
  assert.equal(tt.machineStatus('b-bridge2').powered, true, 'across to the tower in time');
  // B6 · take it back out of the bridge you came on: the way back is gone.
  assert.equal(tt.lamp('b-n7').result, 'borrowed');
  assert.equal(tt.carried().source, 'b-lantern1');
  p.wait(700);
  assert.equal(tt.machineStatus('b-bridge2').level, 0);
  p.walkTo(X('b-nL2')); // across the dark decks in the carried light (see the deck test)
  // B7 · twist: the dead lift up, then its light on to the dead bridge.
  p.walkTo(X('b-n10'));
  tt.lamp('b-n10');
  p.walkTo(machineById('b-lift3').x + 100);
  p.waitBell();
  p.wait(1400);
  assert.equal(tt.machineStatus('b-lift3').level, 1);
  p.walkTo(X('b-n11'));
  assert.equal(tt.borrowPreview('b-n11').result, 'borrow', 'the lift\'s upper node gives its light back');
  tt.lamp('b-n11');
  assert.equal(tt.machineStatus('b-lift3').powered, false, 'the lift goes home without him');
  p.walkTo(X('b-n12'));
  assert.equal(tt.lamp('b-n12').result, 'given');
  p.waitBell();
  p.wait(600);
  p.walkTo(platformById('b-roof13').x + 40);
  assert.equal(tt.machineStatus('b-bridge3').powered, true, 'across in time');
  // The light goes home when it is spent.
  tt.update(6000);
  assert.equal(tt.machineStatus('b-bridge3').powered, false);
  assert.equal(tt.machineStatus('b-lantern1').held, true, 'the first lantern is lit again');
  assert.equal(tt.machineStatus('b-lantern2').held, true, 'the second was never needed');
});

test('B5–B7: after a fall anywhere, the respawn lamp stands by a lit lantern (no soft-lock)', () => {
  // Every borrow room's lamp is within reach of a lantern node.
  for (const [lampId, lanternNode] of [['lamp-b4', 'b-nL1'], ['lamp-b5', 'b-nL2']]) {
    const lamp = lampById(lampId);
    const node = nodeById(lanternNode);
    assert.ok(Math.abs(node.x - lamp.spawnX) < 400 && node.y === lamp.y, `${lampId} by ${lanternNode}`);
  }
  // No lamp on the tower or the decks: a fall there goes back to the lantern.
  for (const id of ['b-tower', 'b-deck3', 'b-deck4', 'b-roof12', 'b-roof13']) {
    const platform = platformById(id);
    assert.ok(!LAMPS.some((l) => l.spawnX >= platform.x && l.spawnX <= right(platform) && l.y === platform.y), `no lamp on ${id}`);
  }
  // Fall at each step: the light goes home and the room can start over.
  const steps = [
    (tt) => { tt.lamp('b-nL1'); },
    (tt) => { tt.lamp('b-n9'); },
    (tt) => { tt.update(tt.msToBell() + 600); },
    (tt) => { tt.lamp('b-n7'); },
    (tt) => { tt.lamp('b-n10'); tt.update(tt.msToBell() + 1400); },
    (tt) => { tt.lamp('b-n11'); },
    (tt) => { tt.lamp('b-n12'); tt.update(tt.msToBell() + 600); },
  ];
  for (let fallAfter = 1; fallAfter <= steps.length; fallAfter += 1) {
    const tt = cityTimetable();
    steps.slice(0, fallAfter).forEach((step) => step(tt));
    tt.dropLight();
    assert.equal(tt.carried(), null, `step ${fallAfter}`);
    assert.equal(tt.machineStatus('b-lantern1').held, true, `lantern 1 lit after a fall at step ${fallAfter}`);
    assert.equal(tt.machineStatus('b-lantern2').held, true, `lantern 2 lit after a fall at step ${fallAfter}`);
    for (const id of ['b-bridge2', 'b-lift3', 'b-bridge3']) assert.equal(tt.machineStatus(id).powered, false, `${id} off`);
  }
});

test('scripted solve · C: points, lift, brake — the counterweight walkway inside twelve bells', () => {
  const tt = cityTimetable();
  const p = player(tt);
  const X = (id) => nodeById(id).x;
  const weights = machineById('c-weights');
  p.at(X('c-n1') - 480); // the bench
  tt.update(700);
  tt.startCountdown(DEPARTURE_BELLS);
  const startBell = tt.bellIndex;
  p.walkTo(X('c-n1'));
  assert.equal(tt.punch('c-n1').result, 'queued');
  p.waitBell();
  p.wait(700);
  assert.equal(tt.machineStatus('c-points').level, 1);
  p.walkTo(X('c-n3'));
  tt.update(AFTER);
  assert.equal(tt.punch('c-n3').result, 'queued');
  p.walkTo(machineById('c-lift').x + 100);
  p.waitBell();
  p.wait(1300);
  assert.equal(tt.machineStatus('c-lift').level, 1);
  p.at(platformById('c-gantry').x);
  p.walkTo(X('c-n5'));
  // The brake shares the lift's teal line: it waits for the lift.
  assert.equal(tt.punch('c-n5').result, 'busy');
  while (tt.lineBusy('C:teal')) tt.update(100);
  tt.update(AFTER);
  assert.equal(tt.punch('c-n5').result, 'queued');
  p.walkTo(weights.x + 100); // stand in cage A
  tt.setLoad('c-weights', 'a');
  p.waitBell();
  tt.update(weights.travel);
  assert.equal(tt.machineStatus('c-weights').level, 1, 'one release rides cage A all the way down');
  const used = tt.bellIndex - startBell;
  assert.ok(used <= 6, `solved in ${used} bells`);
  assert.ok(DEPARTURE_BELLS - used >= 5, 'at least five bells of slack');
  const fired = new Set(tt.history(startBell).map((entry) => entry.machineId));
  assert.deepEqual([...DEPARTURE_CHAIN].filter((id) => !fired.has(id)), []);
});

test('C3 geometry: the counterweight walkway', () => {
  const m = machineById('c-weights');
  const gantry = platformById('c-gantry');
  const deck = platformById('c-platform');
  const rest = cagesAt(m, 0);
  const down = cagesAt(m, 1);
  // At rest cage A is flush with the gantry and the walkway hangs far below.
  assert.equal(rest.a.y, gantry.y);
  assert.ok(rest.a.x - right(gantry) <= 20);
  assert.ok(rest.b.y - deck.y > arc.apex, 'the walkway at rest is out of reach of the platform');
  // Without the walkway the platform is out of reach, even from cage A.
  assert.ok(deck.x - (rest.a.x + rest.a.w) > arc.reachAtRise(0) + 40, 'cage A → platform is not jumpable');
  // Ridden down, cage A sinks a little and the walkway comes up flush.
  assert.equal(down.b.y, deck.y);
  assert.ok(deck.x - (down.b.x + down.b.w) <= 20);
  assert.ok(down.b.x - (down.a.x + down.a.w) <= 20);
  assert.ok(down.a.y - down.b.y <= arc.safeStepUp, `cage A → walkway step ${down.a.y - down.b.y}`);
  // One release of the brake carries the whole ride.
  assert.ok(m.duration >= m.travel + 400, 'brake time covers the travel, with a margin');
  // The brake node is in reach from cage A at rest, not from the platform.
  const head = nodeHead(nodeById('c-n5'));
  const fromCage = Math.hypot(head.x - (rest.a.x + rest.a.w / 2), head.y + 20 - (rest.a.y - 64));
  assert.ok(fromCage < PUNCH_RANGE, `brake from cage A: ${Math.round(fromCage)}`);
  assert.ok(deck.x - head.x > PUNCH_RANGE);
  assert.deepEqual(RESET_ON_RESPAWN['lamp-c2'], ['c-weights']);
});

test('start section: dev honours ?section=, production only honours an unlocked checkpoint', () => {
  assert.equal(resolveStartSection({ search: '?section=C', devMode: true }), 'C');
  assert.equal(resolveStartSection({ search: '?section=b', devMode: true }), 'B');
  assert.equal(resolveStartSection({ search: '?section=Z', devMode: true }), 'A');
  assert.equal(resolveStartSection({ search: '?section=C', devMode: false, unlocked: ['chapter-2-start'] }), 'A');
  assert.equal(resolveStartSection({ search: '?section=C', devMode: false, unlocked: ['chapter-2-platform'] }), 'C');
  assert.equal(resolveStartSection({ search: '', devMode: false, unlocked: ['chapter-2-platform'] }), 'A');
  assert.deepEqual(SECTION_CHECKPOINTS, { A: 'chapter-2-start', B: 'chapter-2-midpoint', C: 'chapter-2-platform' });
  // Dev-only room routes: ?lamp= inside the start section.
  assert.equal(resolveStartLamp({ search: '?section=A&lamp=lamp-a7', devMode: true, section: 'A' }), 'lamp-a7');
  assert.equal(resolveStartLamp({ search: '?lamp=lamp-a7', devMode: false, section: 'A' }), null, 'never in production');
  assert.equal(resolveStartLamp({ search: '?lamp=lamp-b4', devMode: true, section: 'A' }), null, 'other section ignored');
});

test('hanging signs clear Butch\'s head wherever he can walk under them', () => {
  for (const sign of SIGNS.filter((s) => !s.scroll)) {
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
  assert.ok(right(platformById('c-platform')) <= WORLD.width);
  // The respawn line sits just below the lowest roof, so a fall from the
  // highest roof (the hotel) still respawns inside two seconds.
  const lowest = Math.max(...PLATFORMS.map((p) => p.y), machineById('c-weights').yB0);
  const highest = Math.min(...PLATFORMS.map((p) => p.y), ...MACHINES.filter((m) => m.kind === 'lift').map((m) => m.y1));
  assert.ok(WORLD.killY > lowest + 200, 'no roof is near the respawn line');
  assert.ok(WORLD.killY < WORLD.bottom);
  const fall = WORLD.killY - highest;
  const g = CONTROLLER.gravity * CONTROLLER.fallGravityScale;
  const tMax = CONTROLLER.maxFall / g;
  const dMax = 0.5 * g * tMax * tMax;
  const tFall = fall <= dMax ? Math.sqrt((2 * fall) / g) : tMax + (fall - dMax) / CONTROLLER.maxFall;
  assert.ok(tFall + 0.6 < 2, `worst fall ${tFall.toFixed(2)} s + 0.6 s fade`);
  assert.equal(BELL_MS, 4000);
});

// ---------------------------------------------------------------------------
// Alpha round 1 · F2-6: the blackout's dark decks stand only in borrowed
// light. Butch's lamp shows a near-edge rim; it never makes a deck solid.
import { DECK_SOLID_AT, afterglowLight, carriedLight, deckReveal, deckSolid, lampRim, machineLight } from '../../src/chapters/borrowedLight/memoryLight.js';
import { machineBounds } from '../../src/chapters/borrowedLight/level.js';

const hiddenDecks = PLATFORMS.filter((platform) => platform.hidden);

test('dark decks: invisible and not solid in the dark, even beside Butch\'s lamp', () => {
  assert.deepEqual(hiddenDecks.map((deck) => deck.id), ['b-step1', 'b-step2', 'b-stone-ledge', 'b-deck3', 'b-deck4']);
  for (const deck of hiddenDecks) {
    assert.equal(deckReveal(deck, []), 0, `${deck.id} is dark with no light`);
    assert.equal(deckSolid(deckReveal(deck, [])), false);
    // Standing at the edge before it, the lamp reaches its near edge only.
    const lamp = { x: deck.x - 40, y: deck.y - 80 };
    const rim = lampRim(deck, lamp, 250);
    assert.ok(rim && rim.x0 === deck.x && rim.x1 - rim.x0 <= 90, `${deck.id}: a near-edge rim, not the deck`);
  }
});

test('dark decks: the OPEN LATE sign and b-n1\'s afterglow hold the first two decks for the crossing', () => {
  const tt = createTimetable(timetableDefinition());
  tt.setMemoryLight(true);
  const sign = machineById('b-sign');
  const node = nodeById('b-n1');
  const lightsNow = () => {
    const status = tt.machineStatus('b-sign');
    const on = status.powered ? 1 : 0;
    return [machineLight(sign, machineBounds(sign, status.level), on), afterglowLight(nodeHead(node), tt.afterglowOf('b-n1'))];
  };
  const [step1, step2] = ['b-step1', 'b-step2'].map(platformById);
  assert.equal(deckSolid(deckReveal(step1, lightsNow())), false, 'dark before the punch');
  tt.punch('b-n1');
  tt.update(tt.msToBell());
  // Running from the node to b-roof8 takes ~2.2 s.
  for (let ms = 0; ms <= 2600; ms += 200) {
    assert.ok(deckReveal(step1, lightsNow()) >= DECK_SOLID_AT, `step1 solid ${ms} ms after the bell`);
    assert.ok(deckReveal(step2, lightsNow()) >= DECK_SOLID_AT, `step2 solid ${ms} ms after the bell`);
    tt.update(200);
  }
  tt.update(12000);
  assert.equal(deckSolid(deckReveal(step1, lightsNow())), false, 'dark again once the light is spent');
});

// v2 · B6: the light Butch carries is borrowed light; the lanterns are far.
test('dark decks: only the light Butch carries holds the B6 decks', () => {
  const tt = cityTimetable();
  const lanterns = ['b-lantern1', 'b-lantern2'].map(machineById).map((m) => machineLight(m, machineBounds(m, 1), 1));
  const decks = ['b-deck3', 'b-deck4'].map(platformById);
  for (const deck of decks) assert.equal(deckSolid(deckReveal(deck, lanterns)), false, `${deck.id}: the lanterns do not reach it`);
  assert.equal(tt.machineStatus('b-lantern1').powered, true);
  // Butch's lamp swings at his hand: ~20 px ahead, ~60 px up.
  const lampAt = (feetX, feetY) => ({ x: feetX + 20, y: feetY - 60 });
  const chain = ['b-tower', 'b-deck3', 'b-deck4', 'b-roof11b'].map(platformById);
  for (let i = 0; i < chain.length - 1; i += 1) {
    const from = chain[i];
    const to = chain[i + 1];
    // Standing at the edge (and over the jump) the next deck is lit.
    for (const k of [0, 0.5, 1]) {
      const fx = right(from) - 10 + (to.x + 30 - right(from)) * k;
      const fy = from.y - arc.apex * Math.sin(Math.PI * k) * 0.5;
      if (to.hidden) assert.ok(deckSolid(deckReveal(to, [carriedLight(lampAt(fx, fy))])), `${to.id} lit from ${from.id} (k ${k})`);
    }
    // And a run of full jumps from each edge lands with room to take off again.
    const land = right(from) + arc.reachAtRise(from.y - to.y) * 0.97;
    assert.ok(land > to.x + 10 && land < to.x + to.w, `${from.id} → ${to.id}: lands at ${Math.round(land)}`);
  }
  // Without the carried light, they stay dark from the tower.
  const tower = platformById('b-tower');
  assert.equal(deckSolid(deckReveal(decks[0], [])), false);
  assert.ok(lampRim(decks[0], lampAt(right(tower) - 10, tower.y), 250), 'a broken rim hints the deck is there');
});

test('dark decks: the Grid Stone ledge holds while its lift is up', () => {
  const tt = createTimetable(timetableDefinition());
  tt.setMemoryLight(true);
  const lift = machineById('b-lift2');
  const node = nodeById('b-n3');
  const ledge = platformById('b-stone-ledge');
  tt.punch('b-n3');
  tt.update(tt.msToBell());
  tt.update(1300); // the lift arrives
  for (let ms = 0; ms <= 2400; ms += 200) {
    const status = tt.machineStatus('b-lift2');
    const lights = [machineLight(lift, machineBounds(lift, status.level), status.powered ? 1 : 0), afterglowLight(nodeHead(node), tt.afterglowOf('b-n3'))];
    assert.ok(deckReveal(ledge, lights) >= DECK_SOLID_AT, `ledge solid ${ms} ms after the lift arrives`);
    tt.update(200);
  }
});
