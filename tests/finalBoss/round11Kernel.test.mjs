// Round 11 · the Conductor as a skill fight: the shared kernel
// (src/chapters/finalBoss/conductorFight.js). Butch's body, how an attack
// warns and strikes, the phase track and its checkpoints, the runner, and
// what STORY changes.
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  FIGHT_BODY, FIGHT_BOUNDS, INTERLUDE_SECONDS, INTRO_SECONDS, attackHits, createBody, createDirectorBase, createFightRunner,
  createPhaseTrack, dangerSpan, driveScript, fightTuning, makeAttack, restartPhase, shapeCovers, startDash, startJump, stepAttack, stepBody, timeToHit,
} from '../../src/chapters/finalBoss/conductorFight.js';
import { DIFFICULTIES, checkpointLine, createDeathLedger } from '../../src/chapters/finalBoss/finaleModel.js';

const DT = 1 / 60;
const run = (a, seconds, body = null, tuning = fightTuning('normal')) => {
  const out = { struck: null, hitAt: null };
  for (let t = 0; t < seconds; t += DT) {
    if (stepAttack(a, DT) === 'struck') out.struck = a.age;
    if (body && out.hitAt === null && attackHits(a, body, tuning)) out.hitAt = a.age;
  }
  return out;
};

// ------------------------------------------------------------ the body

test('a jump clears a ground hazard for over half a second; STORY clears it sooner and longer', () => {
  const airborne = (clear) => {
    const body = createBody();
    startJump(body);
    let above = 0;
    for (let t = 0; t < 1.2; t += DT) { stepBody(body, {}, DT); if (body.y > clear) above += DT; }
    return above;
  };
  const normal = airborne(fightTuning('normal').jumpClear);
  const story = airborne(fightTuning('story').jumpClear);
  assert.ok(normal >= 0.55, `normal clear window ${normal.toFixed(2)} s`);
  assert.ok(story > normal, 'STORY clears longer');
  // A wave band (0.7 m at 9 m/s) passes a standing Butch in well under that.
  const pass = (0.7 + FIGHT_BODY.hurtRadius * 1.2) / 9;
  assert.ok(normal - pass >= 0.35, `the jump's timing tolerance is ${(normal - pass).toFixed(2)} s`);
});

test('a dash carries Butch through a wave or a sweep, never through a train', () => {
  const body = createBody();
  assert.equal(startDash(body), true);
  assert.equal(startDash(body), false, 'it has a cooldown');
  assert.ok(body.inv >= FIGHT_BODY.dashInv);
  const sweepPass = (1.1 + FIGHT_BODY.hurtRadius * 1.2) / 7.5;
  const trainPass = 8 / 18;
  assert.ok(FIGHT_BODY.dashInv >= sweepPass, 'long enough for a paint sweep');
  assert.ok(FIGHT_BODY.dashInv < trainPass, 'never long enough for a train');
  // dash distance: 16 m/s for 0.18 s
  const x0 = body.x;
  for (let t = 0; t < 0.3; t += DT) stepBody(body, { dx: 1 }, DT);
  assert.ok(body.x - x0 > 3.5 && body.x - x0 < 5, `dash + walk ${(body.x - x0).toFixed(2)} m`);
});

test('a heavier brush slows the walk; the bounds hold; constrain can stop a step', () => {
  const body = createBody({ x: 0, z: 0 });
  body.speedScale = 0.79;
  for (let t = 0; t < 1; t += DT) stepBody(body, { dx: 1 }, DT);
  assert.ok(Math.abs(body.x - FIGHT_BODY.speed * 0.79) < 0.15);
  for (let t = 0; t < 6; t += DT) stepBody(body, { dx: 1 }, DT);
  assert.equal(body.x, FIGHT_BOUNDS.maxX);
  const wall = createBody({ x: 0, z: 0 });
  for (let t = 0; t < 1; t += DT) stepBody(wall, { dz: 1 }, DT, { constrain: (from, to) => (to.z > 1 ? from : to) });
  assert.ok(wall.z <= 1 + 1e-9);
});

// ------------------------------------------------------------ attacks

test('a drop warns for its whole telegraph, lands once, and hits only clearly inside its ring', () => {
  const a = makeAttack({ kind: 'drop', x: 0, z: 0, r: 1.05, tele: 1.15, live: 0 });
  assert.equal(a.state, 'tele');
  const inside = { x: 0.9, z: 0, y: 0 };
  const edge = { x: 1.25, z: 0, y: 0 };
  const res = run(a, 1.6, inside);
  assert.ok(Math.abs(res.struck - 1.15) < DT + 1e-9, `struck at ${res.struck}`);
  assert.ok(res.hitAt !== null, 'inside the ring is hit');
  const b = makeAttack({ kind: 'drop', x: 0, z: 0, r: 1.05, tele: 1.15, live: 0 });
  assert.equal(run(b, 1.6, edge).hitAt, null, 'a body overlapping the edge is spared');
  // the landing is one instant: stepping in afterwards is safe
  const c = makeAttack({ kind: 'drop', x: 0, z: 0, r: 1.05, tele: 0.5, live: 0 });
  run(c, 0.6);
  assert.equal(attackHits(c, inside), false);
});

test('jumpable hazards miss a jumping Butch; proxies never hit; a shelter keeps its lane safe', () => {
  const wave = makeAttack({ kind: 'wave', x: 0, z: 0, r0: 0, speed: 9, width: 0.7, maxR: 20, tele: 0, jumpable: true });
  stepAttack(wave, 0.5);
  const at = { x: 4.5, z: 0, y: 0 };
  assert.equal(attackHits(wave, at), true);
  assert.equal(attackHits(wave, { ...at, y: 1.1 }), false, 'a jump clears it');
  const beam = makeAttack({ kind: 'zone', x0: -3.5, x1: 3.5, z0: -9, z1: 9, tele: 0, live: 0.4, proxy: true });
  stepAttack(beam, 0.1);
  assert.equal(attackHits(beam, { x: 0, z: 0, y: 0 }), false);
  assert.ok(Number.isFinite(timeToHit(beam, 0, 0)), 'the bot still sees a proxy');
  const sheltered = makeAttack({ kind: 'zone', x0: -3.5, x1: 3.5, z0: -9, z1: 9, tele: 0, live: 0.4, safeAt: (x, z) => z > 2.4 });
  stepAttack(sheltered, 0.1);
  assert.equal(shapeCovers(sheltered, 0, 3), false);
  assert.equal(shapeCovers(sheltered, 0, 1), true);
});

test('timeToHit agrees with when an attack really strikes (the bot and the respawn read telegraphs truly)', () => {
  const cases = [
    { a: () => makeAttack({ kind: 'drop', x: 2, z: 1, r: 1.2, tele: 1.1 }), at: [2.4, 1.2] },
    { a: () => makeAttack({ kind: 'zone', x0: -2, x1: 4, z0: -1, z1: 3, tele: 1.5, live: 0.3 }), at: [1, 1] },
    { a: () => makeAttack({ kind: 'wave', x: 0, z: -15.8, r0: 0, speed: 9, width: 0.7, maxR: 32, tele: 0.05 }), at: [3, 2] },
    { a: () => makeAttack({ kind: 'sweep', axis: 'x', from: -14, to: 14, speed: 7.5, width: 1.1, lo: -9, hi: 9, tele: 0.9 }), at: [3, 0] },
    { a: () => makeAttack({ kind: 'train', seam: 'z', along: 0.4, dir: 1, speed: 18, length: 8, halfWidth: 0.62, start: -24, end: 32, tele: 1.1 }), at: [5, 0.5] },
  ];
  for (const { a: make, at: [x, z] } of cases) {
    const a = make();
    const predicted = timeToHit(a, x, z, 0);
    const actual = run(a, 6, { x, z, y: 0 }).hitAt - 0; // age when it first hits
    assert.ok(Number.isFinite(predicted) && actual !== null, `${a.kind} hits at ${x},${z}`);
    assert.ok(Math.abs(actual - predicted) < 0.12, `${a.kind}: predicted ${predicted.toFixed(2)} actual ${actual.toFixed(2)}`);
    assert.ok(dangerSpan(a) > 0);
  }
  const far = makeAttack({ kind: 'drop', x: 0, z: 0, r: 1, tele: 1 });
  assert.equal(timeToHit(far, 8, 8), Infinity);
});

// ------------------------------------------------------------ phases

test('the phase track stops damage at each floor, and its floor is the checkpoint', () => {
  assert.throws(() => createPhaseTrack([{ id: 'a', from: 100, to: 60 }, { id: 'b', from: 50, to: 0 }]), /must start where/);
  const track = createPhaseTrack([{ id: 'a', from: 100, to: 68 }, { id: 'b', from: 68, to: 34 }, { id: 'c', from: 34, to: 0 }]);
  assert.deepEqual(track.damage(20), { dealt: 20, cleared: false });
  assert.deepEqual(track.damage(50), { dealt: 12, cleared: true }, 'a big hit never skips a phase');
  assert.equal(track.advance(), true);
  assert.equal(track.hp, 68);
  track.damage(10);
  assert.equal(track.restart('phase'), 68, 'NORMAL: the phase begins again');
  track.damage(10);
  assert.equal(track.restart('none'), 58, 'STORY: nothing is undone');
  track.advance();
  assert.equal(track.last, true);
  assert.equal(track.advance(), false);
});

test('a director runs intro → teach → fight → interlude → the next phase → finisher → finished', () => {
  const d = createDirectorBase({ phases: [{ id: 'one', name: 'ONE', from: 100, to: 50 }, { id: 'two', name: 'TWO', from: 50, to: 0 }] });
  let taught = 0;
  const scripts = {
    one: { teach() { taught += 1; }, teachDone: () => d.stateAge > 0.5, loop: [() => { d.spawn({ kind: 'drop', x: 9, z: 9, r: 1, tele: 1 }); return 1; }] },
    two: { teach() { taught += 1; }, teachDone: () => true, loop: [() => 1] },
  };
  const states = [];
  let finished = 0;
  const watch = () => { if (states.at(-1) !== d.state) states.push(d.state); };
  const step = (s) => {
    for (let t = 0; t < s; t += DT) {
      watch();
      d.events = [];
      d.stepCore(DT, null);
      driveScript(d, DT, { x: 0, z: 0 }, scripts, { finisherSeconds: 0.5 });
      d.events.forEach((e) => { if (e.type === 'finished') finished += 1; });
      watch();
    }
  };
  step(INTRO_SECONDS + 0.1);
  assert.equal(d.state, 'teach');
  step(1.6);
  assert.equal(d.state, 'fight');
  assert.ok(d.attacks.length > 0, 'the loop throws');
  d.damage(80);
  watch();
  assert.equal(d.state, 'interlude', 'a cleared phase staggers him');
  assert.equal(d.attacks.length, 0, 'and clears the floor');
  assert.equal(d.damage(10), 0, 'nothing lands in the interlude');
  step(INTERLUDE_SECONDS + 0.2);
  assert.equal(d.track.index, 1);
  d.damage(50);
  watch();
  step(0.6);
  assert.deepEqual(states, ['intro', 'teach', 'fight', 'interlude', 'teach', 'fight', 'finisher', 'done']);
  assert.equal(finished, 1);
  assert.equal(d.state, 'done');
  assert.equal(taught, 2, 'each phase teaches once');
  // A restart goes back to the phase's loop after a breather.
  const e = createDirectorBase({ phases: [{ id: 'one', from: 100, to: 0 }] });
  e.setState('fight');
  e.damage(30);
  restartPhase(e, 'phase');
  assert.equal(e.track.hp, 100);
  assert.equal(e.state, 'fight');
  assert.ok(e.beatClock >= 2);
});

// ------------------------------------------------------------ STORY

test('STORY keeps every pattern but warns longer, flies slower, waits longer and leaves out the extras', () => {
  const story = fightTuning('story');
  const normal = fightTuning('normal');
  for (const key of ['tele', 'flight', 'tempo', 'window']) assert.ok(story[key] > normal[key], key);
  assert.ok(story.hurt < normal.hurt, 'a smaller hurt radius');
  assert.ok(story.jumpClear < normal.jumpClear, 'a jump clears sooner');
  assert.equal(story.thin, true);
  assert.equal(normal.thin, false);
  assert.equal(story.rollback, 'none');
  assert.equal(normal.rollback, 'phase');
  assert.ok(story.layers > normal.layers);
  const d = createDirectorBase({ phases: [{ id: 'a', from: 100, to: 0 }], difficulty: 'story' });
  assert.equal(d.spawn({ kind: 'drop', x: 0, z: 0, r: 1, tele: 1, extra: true }), null, 'an extra is left out');
  assert.ok(d.spawn({ kind: 'drop', x: 0, z: 0, r: 1, tele: 1 }));
  assert.equal(DIFFICULTIES.story.rollback, 'none');
});

// ------------------------------------------------------------ the runner

const dummyDirector = (phases = [{ id: 'a', name: 'A', from: 100, to: 50 }, { id: 'b', name: 'B', from: 50, to: 0 }]) => {
  const d = createDirectorBase({ phases });
  let runnerBody = null;
  d.setState('fight');
  return {
    track: d.track,
    attacks: d.attacks,
    update(dt, body) { runnerBody = body; d.events = []; d.stepCore(dt, body); return d.events; },
    checkpoint(rollback) { restartPhase(d, rollback); return { x: -6, z: 5 }; },
    hitNow() { d.attacks.push(makeAttack({ kind: 'drop', x: runnerBody?.x ?? 0, z: runnerBody?.z ?? 6.1, r: 2, tele: 0.001 })); },
    d,
  };
};

test('a hit tears one layer and gives a moment of grace; the last layer is the checkpoint', () => {
  const director = dummyDirector();
  const runner = createFightRunner({ director, difficulty: 'normal' });
  runner.body.inv = 0;
  director.d.damage(20);
  director.hitNow();
  const events = runner.step(DT, {});
  assert.ok(events.some((e) => e.type === 'hurt' && e.layersLeft === 3));
  assert.ok(runner.body.inv > 0.9);
  director.hitNow();
  assert.ok(!runner.step(DT, {}).some((e) => e.type === 'hurt'), 'grace blocks a second hit');
  // tear the rest
  let death = null;
  for (let i = 0; i < 3; i += 1) { runner.body.inv = 0; director.hitNow(); death = runner.step(DT, {}).find((e) => e.type === 'death') ?? death; }
  assert.ok(death, 'four hits on NORMAL');
  assert.equal(death.rolledBack, true);
  assert.equal(director.track.hp, 100, 'the phase begins again');
  assert.equal(runner.body.hp, 4);
  assert.deepEqual([runner.body.x, runner.body.z], [-6, 5]);
  assert.ok(runner.body.respawnInv > 2);
});

test('STORY: six layers and a torn last layer undoes nothing; STORY is offered after the third death', () => {
  const director = dummyDirector();
  const runner = createFightRunner({ director, difficulty: 'story' });
  assert.equal(runner.body.maxHp, 6);
  director.d.damage(30);
  for (let i = 0; i < 6; i += 1) { runner.body.inv = 0; runner.body.respawnInv = 0; director.hitNow(); runner.step(DT, {}); }
  assert.equal(runner.deaths, 1);
  assert.equal(director.track.hp, 70, 'his ticket stays where it was');
  const ledger = createDeathLedger();
  const normal = createFightRunner({ director: dummyDirector(), difficulty: 'normal', ledger, movement: 2 });
  const offers = [];
  for (let death = 0; death < 3; death += 1) {
    for (let i = 0; i < 4; i += 1) {
      normal.body.inv = 0; normal.body.respawnInv = 0; normal.director.hitNow();
      normal.step(DT, {}).filter((e) => e.type === 'death').forEach((e) => offers.push(e.offerStory));
    }
  }
  assert.deepEqual(offers, [false, false, true]);
  normal.setDifficulty('story');
  assert.equal(normal.body.maxHp, 6);
  assert.equal(normal.body.hp, 6);
  assert.match(checkpointLine({ rollback: 'phase', phaseName: 'ECHOES' }), /^This phase starts again: ECHOES\. What you won before it stays won\.$/);
  assert.match(checkpointLine({ rollback: 'none' }), /Nothing is undone/);
});
