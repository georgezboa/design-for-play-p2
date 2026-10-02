import test from 'node:test';
import assert from 'node:assert/strict';
import { jumpArc, CONTROLLER } from '../../src/chapters/borrowedLight/controller.js';
import { BELL_MS, CATCH_MS, CH2_RULES, CUT_GRACE_MS, FLICKER_MS, createTimetable as createAnyTimetable } from '../../src/chapters/borrowedLight/timetableModel.js';
const createTimetable = (definition, options = {}) => createAnyTimetable(definition, { ...CH2_RULES, ...options });
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
  settleStartLevels,
  standsOn,
  surfacesOf,
  timetableDefinition,
} from '../../src/chapters/borrowedLight/level.js';
import { chestAt, pickTarget } from '../../src/chapters/borrowedLight/targeting.js';

const arc = jumpArc();
const RUN = CONTROLLER.maxRun / 1000; // px per ms
const right = (p) => p.x + p.w;
const gapBetween = (a, b) => b.x - right(a);
const riseBetween = (a, b) => a.y - b.y; // + means b is higher
const AFTER = CATCH_MS + 50;

// The game starts with the city's held machines held (the scene does this).
function cityTimetable(options = {}) {
  const tt = createTimetable(timetableDefinition(), options);
  MACHINES.filter((m) => m.heldAtStart).forEach((m) => tt.hold(m.id, m.heldBy));
  settleStartLevels(tt);
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

// C: points, lift, the C3 walkway, then C4 · TWO WEIGHTS (the drop ledge
// and the second walkway on one rose line that rings only on bell I).
// `mistakes` replays what a first run typically does: punches a brake before
// standing in its cage, and misses a bell I on the two-bell line.
function solveC({ mistakes = false } = {}) {
  const tt = cityTimetable();
  const p = player(tt);
  const X = (id) => nodeById(id).x;
  const w1 = machineById('c-weights');
  const w2 = machineById('c-weights2');
  const drop = machineById('c-drop');
  const waitUntil = (fn, label) => { for (let i = 0; i < 400 && !fn(); i += 1) tt.update(100); assert.ok(fn(), label); };
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
  // C3 · the brake shares the lift's teal line: it waits for the lift.
  assert.equal(tt.punch('c-n5').result, 'busy');
  waitUntil(() => !tt.lineBusy('C:teal'), 'the lift frees the teal line');
  tt.update(AFTER);
  if (mistakes) {
    // Punched from the gantry, not standing in the cage: the brake lets go
    // and nothing moves (STAND IN THE CAGE).
    tt.punch('c-n5');
    p.waitBell();
    tt.update(w1.duration);
    assert.equal(tt.machineStatus('c-weights').level, 0, 'an empty cage does not move');
    tt.update(AFTER);
  }
  assert.equal(tt.punch('c-n5').result, 'queued');
  p.walkTo(w1.x + 100); // stand in cage A
  tt.setLoad('c-weights', 'a');
  p.waitBell();
  tt.update(w1.travel);
  tt.setLoad('c-weights', null);
  assert.equal(tt.machineStatus('c-weights').level, 1, 'one release rides cage A all the way down');
  // C4 · the drop ledge, from the signal deck. It rings only on bell I.
  p.walkTo(platformById('c-signal').x + 20);
  p.walkTo(X('c-n7'));
  assert.equal(tt.punchPreview('c-n7').result, 'queue');
  assert.equal(tt.machineStatus('c-drop').level, 1, 'the ledge is held up over the gap');
  if (mistakes) p.waitForNext('even'); // dawdles on the deck: the next bell is II
  const pre = tt.punch('c-n7');
  assert.equal(pre.result, 'queued');
  waitUntil(() => tt.machineStatus('c-drop').powered, 'the drop brake rings on a bell I');
  assert.equal(tt.bellIndex % 2, 1, 'on bell I');
  tt.update(drop.travel);
  assert.equal(tt.machineStatus('c-drop').level, 0, 'the ledge has dropped into line');
  p.walkTo(platformById('c-landing').x + 20); // across the ledge
  p.walkTo(X('c-n6'));
  // One line: the second brake waits for the first to let go.
  if (tt.lineBusy('C4:rose')) {
    assert.equal(tt.punch('c-n6').result, 'busy');
    waitUntil(() => !tt.lineBusy('C4:rose'), 'the drop brake frees the rose line');
  }
  assert.equal(tt.punch('c-n6').result, 'queued');
  p.walkTo(w2.x + 100); // stand in cage A2
  tt.setLoad('c-weights2', 'a');
  waitUntil(() => tt.machineStatus('c-weights2').powered, 'the walkway brake rings');
  tt.update(w2.travel);
  assert.equal(tt.machineStatus('c-weights2').level, 1, 'cage A2 down, the walkway up');
  tt.setLoad('c-weights2', null);
  p.walkTo(platformById('c-platform').x + 40);
  const used = tt.bellIndex - startBell;
  const fired = new Set(tt.history(startBell).map((entry) => entry.machineId));
  assert.deepEqual([...DEPARTURE_CHAIN].filter((id) => !fired.has(id)), []);
  assert.equal(tt.countdown().done, false, 'boarded before the last bell');
  return used;
}

test('scripted solve · C: points, lift, the C3 walkway, C4 two weights — against the countdown', () => {
  const clean = solveC();
  const first = solveC({ mistakes: true });
  // R3: section C was too easy (9 of 12 bells left). A clean run still has
  // room; a first run with two typical mistakes has three or four to spare.
  assert.ok(first > clean, `mistakes cost bells (${clean} → ${first})`);
  assert.ok(DEPARTURE_BELLS - first >= 3 && DEPARTURE_BELLS - first <= 5, `a first run has ${DEPARTURE_BELLS - first} bells to spare (clean ${clean})`);
  assert.ok(DEPARTURE_BELLS - clean <= 9, `a clean run still feels the clock (${DEPARTURE_BELLS - clean} to spare)`);
});

test('C4 geometry: the drop ledge and the second walkway', () => {
  const signal = platformById('c-signal');
  const landing = platformById('c-landing');
  const deck = platformById('c-platform');
  const drop = machineById('c-drop');
  const w2 = machineById('c-weights2');
  const held = cagesAt(drop, 1);
  const down = cagesAt(drop, 0);
  // Held up, the ledge is out of reach; dropped, it bridges deck → landing.
  assert.ok(signal.y - held.b.y > arc.apex, 'the held ledge is above any jump');
  assert.equal(down.b.y, signal.y);
  assert.ok(down.b.x - right(signal) <= 20 && landing.x - (down.b.x + down.b.w) <= 20);
  assert.ok(gapBetween(signal, landing) > arc.reachAtRise(0) + 40, 'deck → landing needs the ledge');
  assert.deepEqual(drop.riders, ['b'], 'only the ledge is stood on');
  assert.equal(drop.startLevel, 1);
  // The box hangs under the deck, clear of the ledge's run.
  assert.ok(held.a.x + held.a.w <= down.b.x && held.a.y > signal.y);
  // Cage A2 sits flush with the landing; ridden down, the walkway meets the platform.
  const rest2 = cagesAt(w2, 0);
  const ride2 = cagesAt(w2, 1);
  assert.equal(rest2.a.y, landing.y);
  assert.ok(rest2.a.x - right(landing) <= 20);
  assert.equal(ride2.b.y, deck.y);
  assert.ok(deck.x - (ride2.b.x + ride2.b.w) <= 20);
  assert.ok(ride2.a.y - ride2.b.y <= arc.safeStepUp);
  assert.ok(gapBetween(landing, deck) > arc.reachAtRise(0) + 40);
  // Reach: the drop brake from the deck only; the walkway brake from the
  // landing and cage A2, never from the walkway it lifts.
  const reach = (nodeId, feetX, feetY) => Math.hypot(nodeHead(nodeById(nodeId)).x - feetX, nodeHead(nodeById(nodeId)).y + 20 - (feetY - 64));
  assert.ok(reach('c-n7', right(signal) - 40, signal.y) < PUNCH_RANGE);
  assert.ok(reach('c-n7', landing.x, landing.y) > PUNCH_RANGE, 'not from the landing');
  assert.ok(reach('c-n6', rest2.a.x + rest2.a.w / 2, rest2.a.y) < PUNCH_RANGE, 'from cage A2');
  assert.ok(reach('c-n6', ride2.b.x + 10, ride2.b.y) > PUNCH_RANGE, 'not from the raised walkway');
  // One line that rings only on bell I.
  for (const id of ['c-n6', 'c-n7']) {
    assert.equal(nodeById(id).line, 'rose');
    assert.equal(nodeById(id).district, 'C4');
    assert.equal(nodeById(id).phase, 'odd');
  }
  assert.deepEqual(RESET_ON_RESPAWN['lamp-c3'], ['c-weights2']);
  assert.ok(lampById('lamp-c3').spawnX >= signal.x && lampById('lamp-c3').spawnX <= right(signal));
});

// R3-2 · B6: the BORROW prompt for b-n7 showed while Butch was still on
// bridge2; E retracted the bridge under him. Over the level data: wherever
// a press would act on a borrowable machine's own node while Butch stands
// on that machine, the scene's "standing on it" test sees it.
test('R3-2: no borrowable machine can be switched off from on top of it', () => {
  const borrowable = MACHINES.filter((m) => m.borrowable && m.kind !== 'lantern');
  assert.deepEqual(borrowable.map((m) => m.id), ['b-bridge2', 'b-lift3', 'b-bridge3']);
  let trapSpots = 0;
  for (const machine of borrowable) {
    const own = NODES.filter((n) => n.machine === machine.id);
    for (const level of [0.25, 0.5, 0.75, 1]) {
      for (const surface of surfacesOf(machine, level)) {
        for (let x = surface.x0 + 6; x <= surface.x1 - 6; x += 10) {
          const pick = pickTarget({ chest: chestAt(x, surface.y), nodes: NODES.filter((n) => n.section === 'B') });
          if (!pick || !own.includes(pick.node)) continue;
          trapSpots += 1;
          assert.ok(standsOn(machine, level, x, surface.y), `${machine.id}: standing at ${x} is seen as on it`);
        }
      }
    }
  }
  assert.ok(trapSpots > 0, 'the trap exists without the guard (b-n7 from bridge2)');
  // The model refuses with STEP OFF FIRST; from the tower it borrows.
  const tt = cityTimetable();
  tt.lamp('b-nL1');
  tt.lamp('b-n9');
  tt.update(tt.msToBell() + 700);
  const bridge = machineById('b-bridge2');
  const onBridge = bridge.x + bridge.length - 120;
  assert.ok(standsOn(bridge, 1, onBridge, bridge.y));
  assert.equal(tt.borrowPreview('b-n7', { riding: 'b-bridge2' }).result, 'step-off');
  const tower = platformById('b-tower');
  assert.ok(!standsOn(bridge, 1, nodeById('b-n7').x, tower.y), 'on the tower he is off the bridge');
  assert.ok(!standsOn(bridge, 1, tower.x + 20, tower.y), 'one step onto the tower is enough');
  assert.equal(tt.borrowPreview('b-n7', { riding: null }).result, 'borrow');
});

test('R3-3 / R3-4 data: every lift waits for its rider; pairs never catch a bell', () => {
  const def = timetableDefinition();
  for (const m of def.machines) assert.equal(m.waitsForRider, m.kind === 'lift', m.id);
  const noCatch = def.nodes.filter((n) => n.noCatch).map((n) => n.id).sort();
  assert.deepEqual(noCatch, ['a-n10', 'a-n11', 'a-n12', 'a-n13', 'a-n14', 'a-n3', 'a-n4']);
  // A3 with the lift waiting for Butch: lift and bridge still share one bell.
  let walking = true;
  const tt = cityTimetable({ shouldWait: (id) => id === 'a-lift2' && walking });
  tt.update(AFTER);
  tt.punch('a-n4');
  tt.punch('a-n3');
  tt.update(tt.msToBell());
  assert.equal(tt.machineStatus('a-lift2').waiting, true);
  assert.equal(tt.machineStatus('a-bridge2').powered, false, 'the bridge waits with the lift');
  walking = false; // he is in the cage now
  tt.update(tt.msToBell() + 1300);
  assert.equal(tt.machineStatus('a-lift2').level, 1);
  assert.equal(tt.machineStatus('a-bridge2').level, 1, 'bridge out when the lift arrives');
  // A punch right after the bell no longer splits the A3 pair.
  const t2 = cityTimetable();
  t2.update(BELL_MS + 30);
  assert.equal(t2.punch('a-n4').result, 'queued', 'a-n4 does not catch the bell just gone');
});

test('C3 geometry: the counterweight walkway', () => {
  const m = machineById('c-weights');
  const gantry = platformById('c-gantry');
  const deck = platformById('c-signal');
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
