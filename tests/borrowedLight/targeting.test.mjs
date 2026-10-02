// Round 3 · "the nodes that move the machines sometimes don't work".
// A sweep: stand Butch on every walkable surface of the chapter (roofs,
// ledges and every machine top at rest and when powered), every 10 px, and
// check that what a press would act on is predictable.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MACHINES, NODES, PLATFORMS, PUNCH_RANGE, cagesAt, machineBounds, nodeById, nodeHead, sectionAt } from '../../src/chapters/borrowedLight/level.js';
import { NEAR_MISS_RANGE, STICKY_PX, chestAt, nearestMiss, nodeAtPoint, pickTarget, reachOf } from '../../src/chapters/borrowedLight/targeting.js';

const right = (p) => p.x + p.w;
const nodesIn = (section) => NODES.filter((node) => node.section === section);

// Every surface Butch can stand on: [x0, x1, y].
function surfaces() {
  const list = PLATFORMS.map((p) => ({ id: p.id, x0: p.x, x1: right(p), y: p.y }));
  for (const m of MACHINES) {
    if (m.kind === 'lift') {
      list.push({ id: `${m.id}@rest`, x0: m.x, x1: m.x + m.w, y: m.y0 });
      list.push({ id: `${m.id}@top`, x0: m.x, x1: m.x + m.w, y: m.y1 });
    } else if (['bridge', 'billboard', 'points', 'cradle'].includes(m.kind)) {
      const b = machineBounds(m, 1);
      list.push({ id: m.id, x0: b.x, x1: b.x + b.w, y: b.y });
    } else if (m.kind === 'counterweight') {
      for (const level of [0, 1]) {
        const { a, b } = cagesAt(m, level);
        list.push({ id: `${m.id}-a@${level}`, x0: a.x, x1: a.x + a.w, y: a.y });
        list.push({ id: `${m.id}-b@${level}`, x0: b.x, x1: b.x + b.w, y: b.y });
      }
    }
  }
  return list;
}

test('sweep: every node is the target when Butch stands at its pole, from either side', () => {
  for (const node of NODES) {
    const section = nodesIn(node.section);
    for (const facing of [1, -1]) {
      for (const dx of [-30, 0, 30]) {
        const pick = pickTarget({ chest: chestAt(node.x + dx, node.y), facing, nodes: section });
        assert.equal(pick?.node.id, node.id, `${node.id}: standing at ${dx} px, facing ${facing}, punches ${pick?.node.id}`);
      }
    }
  }
});

test('sweep: every node has a comfortable stretch of roof it can be punched from (≥ 120 px)', () => {
  for (const node of NODES) {
    const roof = PLATFORMS.find((p) => node.x >= p.x && node.x <= right(p) && Math.abs(p.y - node.y) < 1);
    let run = 0;
    let best = 0;
    for (let x = roof.x; x <= right(roof); x += 10) {
      const pick = pickTarget({ chest: chestAt(x, roof.y), facing: Math.sign(node.x - x) || 1, nodes: nodesIn(node.section) });
      run = pick?.node.id === node.id ? run + 10 : 0;
      best = Math.max(best, run);
    }
    assert.ok(best >= 120, `${node.id}: only ${best} px of roof punches it`);
  }
});

test('sweep: the highlighted node never flips back and forth while walking', () => {
  for (const surface of surfaces()) {
    const section = nodesIn(sectionAt((surface.x0 + surface.x1) / 2));
    for (const facing of [1, -1]) {
      let prev = null;
      const seen = [];
      const xs = [];
      for (let x = surface.x0; x <= surface.x1; x += 5) xs.push(x);
      if (facing < 0) xs.reverse();
      for (const x of xs) {
        const pick = pickTarget({ chest: chestAt(x, surface.y), facing, nodes: section, prevId: prev });
        const id = pick?.node.id ?? null;
        if (id !== prev) seen.push(id);
        prev = id;
        if (pick) assert.ok(pick.d <= PUNCH_RANGE, `${surface.id}: target ${id} out of range`);
      }
      // Each node appears as the target in at most one stretch.
      const nodesSeen = seen.filter(Boolean);
      assert.equal(new Set(nodesSeen).size, nodesSeen.length, `${surface.id} (facing ${facing}): ${seen.join(' → ')}`);
    }
  }
});

test('sweep: nothing is in reach of a press that is not in its own section', () => {
  for (const surface of surfaces()) {
    for (let x = surface.x0; x <= surface.x1; x += 20) {
      const here = sectionAt(x);
      const pick = pickTarget({ chest: chestAt(x, surface.y), nodes: nodesIn(here) });
      if (pick) assert.equal(pick.node.section, here);
    }
  }
});

test('sticky targeting: a near pole only takes over when it is clearly closer', () => {
  const a = nodeById('a-n3');
  const b = nodeById('a-n4');
  const mid = (a.x + b.x) / 2;
  const nodes = [a, b];
  const fromA = pickTarget({ chest: chestAt(mid, a.y), nodes, prevId: a.id });
  const fromB = pickTarget({ chest: chestAt(mid, a.y), nodes, prevId: b.id });
  assert.equal(fromA.node.id, a.id, 'keeps a-n3 at the midpoint');
  assert.equal(fromB.node.id, b.id, 'keeps a-n4 at the midpoint');
  const near = pickTarget({ chest: chestAt(b.x, a.y), nodes, prevId: a.id });
  assert.equal(near.node.id, b.id, 'switches once a-n4 is clearly closer');
  assert.ok(reachOf(a, chestAt(b.x, a.y)).d - reachOf(b, chestAt(b.x, a.y)).d > STICKY_PX);
});

test('reach from machines where the puzzle needs it', () => {
  const reach = (nodeId, feetX, feetY) => Math.hypot(nodeHead(nodeById(nodeId)).x - feetX, nodeHead(nodeById(nodeId)).y + 20 - (feetY - 64));
  const cradle = MACHINES.find((m) => m.id === 'a-cradle1');
  assert.ok(reach('a-n14', cradle.x + 40, cradle.y) < PUNCH_RANGE, 'chase: the last cradle from the first');
  const lift = MACHINES.find((m) => m.id === 'b-lift3');
  assert.ok(reach('b-n11', lift.x + lift.w / 2, lift.y1) < PUNCH_RANGE, 'B7: the lift\'s upper node from the car');
  const weights = MACHINES.find((m) => m.id === 'c-weights');
  assert.ok(reach('c-n5', weights.x + weights.w / 2, weights.yA0) < PUNCH_RANGE, 'C3: the brake from cage A');
});

test('out of reach: a press names the nearest node instead of doing nothing', () => {
  const node = nodeById('a-n1');
  const chest = chestAt(node.x - PUNCH_RANGE - 60, node.y);
  assert.equal(pickTarget({ chest, nodes: nodesIn('A') }), null);
  const miss = nearestMiss({ chest, nodes: nodesIn('A') });
  assert.equal(miss.node.id, 'a-n1');
  assert.ok(miss.d > PUNCH_RANGE && miss.d <= NEAR_MISS_RANGE);
  assert.equal(nearestMiss({ chest: chestAt(node.x - 900, node.y), nodes: nodesIn('A') }), null, 'nothing named when nothing is near');
});

test('mouse: a click on a node\'s box or tag picks that node, not just the nearest', () => {
  for (const node of NODES) {
    const head = nodeHead(node);
    assert.equal(nodeAtPoint(nodesIn(node.section), head.x, head.y)?.id, node.id, `${node.id} box`);
    assert.equal(nodeAtPoint(nodesIn(node.section), head.x + 3, head.y + 50)?.id, node.id, `${node.id} tag`);
  }
  assert.equal(nodeAtPoint(NODES, -5000, -5000), null);
});

test('the scene acts on the node it highlights (one target, chosen once per frame)', () => {
  const scene = readFileSync(new URL('../../src/chapters/borrowedLight/BorrowedLightScene.js', import.meta.url), 'utf8');
  assert.match(scene, /pickTarget\(/);
  assert.match(scene, /const node = this\.pressTarget\(/);
  assert.doesNotMatch(scene, /if \(!node\) return;\n\s+const view = this\.nodeViews\.get\(node\.id\);\n\s+const res = this\.tt\.punch/, 'no silent return when nothing is in reach');
  assert.match(scene, /HINTS\.outOfReach/);
});

// Alpha r3, R3-1 (e28): in the chase the poles stand 100–140 px apart and the
// sticky pick stayed on the punched pole until 10–20 px past the midpoint.
test('moving: the target switches at the midpoint (or before, toward the pole ahead), never after', () => {
  const close = [['a-n12', 'a-n13'], ['a-n13', 'a-n14'], ['a-n4', 'a-n3'], ['a-n6', 'a-n5'], ['a-n11', 'a-n10']];
  for (const [l, r] of close) {
    const a = nodeById(l);
    const b = nodeById(r);
    const nodes = nodesIn(a.section);
    const mid = (a.x + b.x) / 2;
    // Walking from a to b, and back.
    for (const [from, to, facing] of [[a, b, 1], [b, a, -1]]) {
      let prev = from.id;
      let switchedAt = null;
      for (let x = from.x; facing > 0 ? x <= to.x : x >= to.x; x += 2 * facing) {
        const pick = pickTarget({ chest: chestAt(x, a.y), facing, nodes, prevId: prev, moving: true });
        if (pick?.node.id === to.id && switchedAt === null) switchedAt = x;
        prev = pick?.node.id ?? prev;
      }
      assert.ok(switchedAt !== null, `${from.id} → ${to.id}`);
      const past = (switchedAt - mid) * facing;
      assert.ok(past <= 1, `${from.id} → ${to.id}: switched ${past} px past the midpoint`);
      assert.ok(past >= -30, `${from.id} → ${to.id}: switched ${-past} px early`);
    }
  }
});

test('moving: no back-and-forth while running across any surface', () => {
  for (const surface of surfaces()) {
    const section = nodesIn(sectionAt((surface.x0 + surface.x1) / 2));
    for (const facing of [1, -1]) {
      let prev = null;
      const seen = [];
      const xs = [];
      for (let x = surface.x0; x <= surface.x1; x += 5) xs.push(x);
      if (facing < 0) xs.reverse();
      for (const x of xs) {
        const id = pickTarget({ chest: chestAt(x, surface.y), facing, nodes: section, prevId: prev, moving: true })?.node.id ?? null;
        if (id !== prev) seen.push(id);
        prev = id;
      }
      const nodesSeen = seen.filter(Boolean);
      assert.equal(new Set(nodesSeen).size, nodesSeen.length, `${surface.id} (facing ${facing}): ${seen.join(' → ')}`);
    }
  }
});

test('a punched pole yields to its unpunched neighbour once Butch steps toward it', () => {
  const a = nodeById('a-n12');
  const b = nodeById('a-n13');
  const nodes = nodesIn('A');
  const spent = (node) => node.id === a.id;
  // Standing at the punched pole it is still the target (hold F to take back).
  assert.equal(pickTarget({ chest: chestAt(a.x, a.y), facing: 1, nodes, prevId: a.id, spent }).node.id, a.id);
  // A third of the way to the next pole, the press goes to the next pole.
  const x = a.x + (b.x - a.x) / 3;
  assert.equal(pickTarget({ chest: chestAt(x, a.y), facing: 1, nodes, prevId: a.id, spent, moving: true }).node.id, b.id);
});
