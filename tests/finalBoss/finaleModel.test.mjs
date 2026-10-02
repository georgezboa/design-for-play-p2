import test from 'node:test';
import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import fs from 'node:fs';

import {
  BELL_ARENA, CASE_RETURN_DAMAGE, LANE_X, LIGHT_DAMAGE, OFFBEAT_MS, PAINT_DAMAGE_BY_CHARGE,
  caseReturnable, createBellArena, createDeathLedger, createEchoDebate, difficultyPreset,
  ghostTrainRevealed, laneOf, orbitLens, paintReturnDamage, punchCase, trainHits, underLens,
} from '../../src/chapters/finalBoss/finaleModel.js';
import { ECHO_EXCHANGES, ECHO_VOICE_URLS } from '../../src/chapters/finalBoss/echoExchanges.js';
import { BELL_MS } from '../../src/chapters/borrowedLight/timetableModel.js';

// ---------------------------------------------------------------- Movement IV

test('Movement IV damage scales with the absorbed charge: 16 / 34 / 52', () => {
  assert.deepEqual([...PAINT_DAMAGE_BY_CHARGE], [0, 16, 34, 52]);
  assert.equal(paintReturnDamage(0), 0);
  assert.equal(paintReturnDamage(1), 16);
  assert.equal(paintReturnDamage(2), 34);
  assert.equal(paintReturnDamage(3), 52);
  assert.equal(paintReturnDamage(9), 52, 'charge is capped at three colours');
  assert.equal(paintReturnDamage(-2), 0);
  // a full charge is worth more than three single returns: holding pays
  assert.ok(paintReturnDamage(3) > paintReturnDamage(1) * 3);
});

// --------------------------------------------------------------- Movement III

test('the echo debate resolves an exchange once: repeated answer keys are ignored', () => {
  const debate = createEchoDebate(ECHO_EXCHANGES);
  const open = debate.open();
  const right = open.replies.findIndex((reply) => reply.holdsBoth);
  const first = debate.choose(right);
  assert.equal(first.result, 'window');
  // the old bug: pressing the same number again re-dealt the damage
  assert.deepEqual(debate.choose(right), { result: 'ignored' });
  assert.deepEqual(debate.choose(1 - right), { result: 'ignored' });
  assert.equal(debate.history().length, 1);
  assert.equal(debate.isOpen, false);
});

test('a deflected answer sends the exchange to the back of the queue', () => {
  const debate = createEchoDebate(ECHO_EXCHANGES);
  const first = debate.open();
  const wrong = first.replies.findIndex((reply) => !reply.holdsBoth);
  assert.equal(debate.choose(wrong).result, 'deflected');
  const second = debate.open();
  assert.notEqual(second.id, first.id, 'the next exchange opens');
  assert.equal(debate.remaining(), ECHO_EXCHANGES.length);
  // re-opening an unresolved exchange returns the same one (no reshuffle)
  assert.equal(debate.open(), second);
});

test('every exchange offers exactly two voiced answers and one holds both truths', async () => {
  assert.ok(ECHO_EXCHANGES.length >= 4, 'enough exchanges to carry Movement III (200 → 100 HP)');
  const positions = new Set();
  for (const exchange of ECHO_EXCHANGES) {
    assert.equal(exchange.replies.length, 2, exchange.id);
    assert.equal(exchange.replies.filter((reply) => reply.holdsBoth).length, 1, exchange.id);
    positions.add(exchange.replies.findIndex((reply) => reply.holdsBoth));
    exchange.replies.filter((reply) => !reply.holdsBoth).forEach((reply) => assert.ok(reply.rebut?.url, `${exchange.id} deflection is voiced`));
    assert.equal(exchange.claim.speaker, 'CONDUCTOR');
  }
  assert.equal(positions.size, 2, 'the true answer is not always the same key');
  await Promise.all(ECHO_VOICE_URLS.map((url) => access(new URL(`../../public${url}`, import.meta.url))));
});

test('Movement III: the true answer is not given away by its length, and the argument reads in order (A4-8)', async () => {
  const { readFile } = await import('node:fs/promises');
  const manifest = JSON.parse(await readFile(new URL('../../public/assets/chapter03-3d/voice/ch03/manifest.json', import.meta.url), 'utf8'));
  const spoken = new Map(manifest.lines.map((entry) => [entry.url.replace(/^\./, ''), entry.text]));
  let rightLonger = 0;
  for (const exchange of ECHO_EXCHANGES) {
    const right = exchange.replies.find((reply) => reply.holdsBoth).cue.text.length;
    const wrong = exchange.replies.find((reply) => !reply.holdsBoth).cue.text.length;
    if (right > wrong) rightLonger += 1;
    assert.ok(Math.max(right, wrong) / Math.min(right, wrong) < 1.5, `${exchange.id}: answers of a similar length`);
  }
  assert.ok(rightLonger <= 3, 'the longer answer is not always the right one');
  const claims = new Set(ECHO_EXCHANGES.map((exchange) => exchange.claim.text));
  for (const exchange of ECHO_EXCHANGES) {
    for (const reply of exchange.replies) {
      if (reply.rebut) assert.ok(!claims.has(reply.rebut.text), `${exchange.id}: a rebuttal is never also an opening claim`);
      for (const cue of [reply.cue, reply.rebut].filter(Boolean)) {
        // A two-recording answer: each part is what is heard, and the
        // subtitle is the parts in order.
        const parts = cue.parts ?? [cue];
        for (const part of parts) assert.equal(spoken.get(part.url), part.text, `${part.url}: the subtitle is what is heard`);
        assert.equal(cue.text, parts.map((part) => part.text).join(' '), `${exchange.id}: the subtitle is every recording, in order`);
      }
    }
    assert.equal(spoken.get(exchange.claim.url), exchange.claim.text, exchange.id);
  }
  assert.match(ECHO_EXCHANGES[0].claim.text, /^Official inquiry\?/, 'he opens the argument');
});

// ---------------------------------------------------------------- Movement II

const settle = (arena, ms, step = 50) => {
  const events = [];
  for (let t = 0; t < ms; t += step) events.push(...arena.update(step));
  return events;
};

test('the bell arena rings every 4 s and fires the Conductor beams on the off-beat', () => {
  const arena = createBellArena({ seed: 3 });
  const events = settle(arena, BELL_MS * 3 + OFFBEAT_MS);
  const bells = events.filter((event) => event.type === 'bell');
  assert.equal(bells.length, 3);
  const fired = events.filter((event) => event.type === 'beam-fire');
  assert.equal(fired.length, 3, 'one beam volley per bell');
  // every volley lands half a bell after its bell
  let clock = 0;
  const times = [];
  const arena2 = createBellArena({ seed: 3 });
  for (let t = 0; t < BELL_MS * 2; t += 10) {
    clock += 10;
    arena2.update(10).forEach((event) => { if (event.type === 'bell' || event.type === 'beam-fire') times.push([event.type, clock]); });
  }
  assert.deepEqual(times, [['bell', BELL_MS], ['beam-fire', BELL_MS + OFFBEAT_MS], ['bell', BELL_MS * 2]]);
});

test('a second punch on the same coloured line cancels the first', () => {
  const arena = createBellArena();
  assert.equal(arena.punch('lamp-west').result, 'queued');
  const second = arena.punch('lamp-east');
  assert.equal(second.result, 'replaced');
  assert.equal(second.cancelled, 'lamp-west');
  // different lines queue side by side
  assert.equal(arena.punch('bridge-west').result, 'queued');
  assert.equal(arena.punch('board-east').result, 'queued');
  const preview = arena.preview().machines.map((change) => change.machineId).sort();
  assert.deepEqual(preview, ['board-east', 'bridge-west', 'lamp-east']);
});

test('lighting the lane the Conductor steps into opens the damage window, once', () => {
  const arena = createBellArena({ seed: 11 });
  const lane = arena.plan.lane;
  arena.punch(`lamp-${lane}`);
  arena.punch(lane === 'east' ? 'bridge-east' : 'bridge-west');
  const events = settle(arena, BELL_MS + 100);
  assert.ok(events.some((event) => event.type === 'exposed' && event.lane === lane));
  assert.equal(arena.conductorLane, lane);
  const x = LANE_X[lane];
  assert.equal(arena.punchConductor(x, 2).result, 'not-front', 'must cross to the front platform');
  const other = lane === 'west' ? LANE_X.east : LANE_X.west;
  assert.equal(arena.punchConductor(other, -6).result, 'wrong-lane');
  const hit = arena.punchConductor(x, -6);
  assert.deepEqual([hit.result, hit.damage], ['hit', LIGHT_DAMAGE]);
  assert.equal(arena.punchConductor(x, -6).result, 'spent');
});

test('a lamp in the wrong lane lights nothing', () => {
  const arena = createBellArena({ seed: 11 });
  const wrong = ['west', 'centre', 'east'].find((lane) => lane !== arena.plan.lane);
  arena.punch(`lamp-${wrong}`);
  const events = settle(arena, BELL_MS + 100);
  assert.equal(events.some((event) => event.type === 'exposed'), false);
  assert.equal(arena.punchConductor(LANE_X[wrong], -6).result, 'not-lit');
});

test('a lit Conductor cannot fire down his own lane', () => {
  // Find a seed whose first volley includes the lane he steps into.
  for (let seed = 1; seed < 200; seed += 1) {
    const arena = createBellArena({ seed });
    const { lane, beamLanes } = arena.plan;
    if (!beamLanes.includes(lane)) continue;
    arena.punch(`lamp-${lane}`);
    const fire = settle(arena, BELL_MS + OFFBEAT_MS + 100).find((event) => event.type === 'beam-fire');
    assert.ok(fire.cancelled.includes(lane));
    assert.equal(fire.lanes.includes(lane), false);
    return;
  }
  assert.fail('no seed produced a beam in the Conductor lane');
});

test('an extended bridge carries Butch over the gap; the gap alone drops him', () => {
  const arena = createBellArena();
  const gapZ = (BELL_ARENA.gapNearZ + BELL_ARENA.gapFarZ) / 2;
  assert.equal(arena.fallsAt(LANE_X.west, gapZ), true);
  assert.equal(arena.fallsAt(LANE_X.west, 3), false);
  arena.punch('bridge-west');
  settle(arena, BELL_MS + 800);
  assert.equal(arena.bridgeUnder(LANE_X.west, gapZ), 'bridge-west');
  assert.equal(arena.fallsAt(LANE_X.west, gapZ), false);
  assert.equal(arena.fallsAt(LANE_X.east, gapZ), true, 'only the bridge that fired');
});

test('a lit billboard shelters the lane behind it from a beam', () => {
  const arena = createBellArena();
  arena.punch('board-west');
  settle(arena, BELL_MS + 600);
  assert.equal(arena.resolveBeam(['west'], LANE_X.west, 5), 'sheltered');
  assert.equal(arena.resolveBeam(['west'], LANE_X.west, -1), 'hit', 'in front of the board is exposed');
  assert.equal(arena.resolveBeam(['east'], LANE_X.east, 5), 'hit');
  assert.equal(arena.resolveBeam(['east'], LANE_X.west, 5), 'clear');
  assert.equal(laneOf(-9), 'west');
  assert.equal(laneOf(0.5), 'centre');
});

test('STORY fires one beam lane and never a full sweep; NORMAL escalates', () => {
  const story = createBellArena({ difficulty: 'story', seed: 5 });
  const normal = createBellArena({ difficulty: 'normal', seed: 5 });
  const storyFires = settle(story, BELL_MS * 8).filter((event) => event.type === 'beam-telegraph');
  const normalFires = settle(normal, BELL_MS * 8).filter((event) => event.type === 'beam-telegraph');
  assert.ok(storyFires.every((event) => event.lanes.length === 1 && !event.fullSweep));
  assert.ok(normalFires.some((event) => event.fullSweep && event.lanes.length === 3));
  assert.ok(difficultyPreset('story').layers > difficultyPreset('normal').layers);
});

// ----------------------------------------------------------------- Movement I

test('the lens reads a case tag; only a read case can be returned', () => {
  const player = { x: 0, z: 4 };
  const item = { landed: true, x: 1, z: 4, tagX: 1.4, tagZ: 3.6 };
  const lens = { x: 1.2, z: 3.8 };
  assert.equal(underLens(lens, item.tagX, item.tagZ), true);
  assert.equal(caseReturnable(item, lens, player), true);
  assert.deepEqual(punchCase(item, lens, player), { result: 'returned', damage: CASE_RETURN_DAMAGE });
  assert.equal(punchCase(item, { x: 9, z: -5 }, player).result, 'unread');
  assert.equal(punchCase(item, lens, { x: 9, z: -5 }).result, 'out-of-reach');
  assert.equal(punchCase({ ...item, landed: false }, lens, player).result, 'none');
});

test('keyboard play: the lens orbits Butch at a fixed radius', () => {
  const player = { x: 2, z: 1 };
  for (const t of [0, 0.7, 2.3, 5]) {
    const lens = orbitLens(player, t);
    assert.ok(Math.abs(Math.hypot(lens.x - player.x, lens.z - player.z) - 2.6) < 1e-9);
  }
});

test('ghost trains only exist where the lens shows 1978, and seam trains hit only in the seam', () => {
  const train = { tailX: -8, tailZ: 0.4, headX: -3, headZ: 0.4, halfWidth: 0.6 };
  assert.equal(ghostTrainRevealed(train, { x: -5, z: 1.5 }), true);
  assert.equal(ghostTrainRevealed(train, { x: 6, z: 5 }), false);
  assert.equal(trainHits(train, { x: -5, z: 0.6 }), true);
  assert.equal(trainHits(train, { x: -5, z: 2.4 }), false);
  assert.equal(trainHits(train, { x: 2, z: 0.4 }), false, 'ahead of the train is safe until it arrives');
});

// ------------------------------------------------------------------- shared

test('STORY is offered after the third death in one movement, once', () => {
  const ledger = createDeathLedger();
  assert.equal(ledger.record(1).offerStory, false);
  assert.equal(ledger.record(1).offerStory, false);
  assert.equal(ledger.record(2).offerStory, false, 'deaths are counted per movement');
  const third = ledger.record(1);
  assert.deepEqual([third.deaths, third.offerStory], [3, true]);
  assert.equal(ledger.record(1).offerStory, false, 'offered once');
  const onStory = createDeathLedger();
  [0, 0, 0].forEach(() => assert.equal(onStory.record(0, 'story').offerStory, false));
});

test('A4-6: a player stranded on the far roof gets a return plank, which folds again', async () => {
  const { RETURN_PLANK_MS, RETURN_PLANK_TRAVEL_MS } = await import('../../src/chapters/finalBoss/finaleModel.js');
  const arena = createBellArena({ seed: 5, beams: false });
  const farZ = BELL_ARENA.gapFarZ - 1;
  const gapZ = (BELL_ARENA.gapNearZ + BELL_ARENA.gapFarZ) / 2;
  assert.equal(arena.stranded(farZ), true, 'no bridge out and nobody lit: stranded');
  assert.equal(arena.stranded(3), false, 'the near roof is never stranded');
  const id = arena.nearestBridge(5.5);
  assert.equal(id, 'bridge-east');
  assert.equal(arena.fallsAt(LANE_X.east, gapZ), true);
  arena.extendReturnBridge(id);
  arena.update(RETURN_PLANK_TRAVEL_MS + 10);
  assert.ok(arena.bridgeLevel(id) >= 0.99);
  assert.equal(arena.fallsAt(LANE_X.east, gapZ), false, 'the plank carries Butch back');
  assert.equal(arena.stranded(farZ), false);
  let off = [];
  for (let t = 0; t < RETURN_PLANK_MS; t += 50) off = off.concat(arena.update(50).filter((event) => event.type === 'return-off'));
  assert.deepEqual(off.map((event) => event.machineId), [id]);
  assert.equal(arena.fallsAt(LANE_X.east, gapZ), true, 'it folds again: it is not a free crossing');
});

test('alpha round 3 (K2): a second press on a queued lamp is the same punch, never a silent take-back', () => {
  const arena = createBellArena();
  assert.equal(arena.punch('lamp-west').result, 'queued');
  settle(arena, 600); // well past the legacy 450 ms repeat guard
  const again = arena.punch('lamp-west');
  assert.equal(again.result, 'already');
  assert.equal(arena.timetable.nodeStatus('lamp-west').queued, true, 'still queued for the bell');
  assert.ok(arena.preview().machines.some((change) => change.machineId === 'lamp-west' && change.to === 'on'));
  const battle = fs.readFileSync(new URL('../../src/chapters/finalBoss/spectacleBattle.js', import.meta.url), 'utf8');
  assert.doesNotMatch(battle, /UNPUNCHED/);
  assert.match(battle, /result\.result === 'already'\) \{ bellAudio\.refused\(\); this\.toast\(`\$\{node\.label\} · ALREADY PUNCHED/);
});
