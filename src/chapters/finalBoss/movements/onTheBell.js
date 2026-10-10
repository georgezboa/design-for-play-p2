// Movement II · BORROWED LIGHT — on the bell (round 11).
//
// Chapter 2's four-second bell and its one-line rule, on two roofs over a
// street gap (finaleModel.js createBellArena owns the timetable). A lamp
// punched now fires on the next bell: an AMBER lamp lays its bridge across
// the gap, a TEAL lamp raises its billboard (shelter from his beams), a
// ROSE signal lights a lane. One lamp per coloured line at a time.
//
// On every bell he steps into the lane he announced; if that lane's rose
// signal fires on the same bell, he stands in borrowed light: cross and
// punch him (E on the far roof, in his lane). A punch inside ON_THE_BELL_S of
// the bell (already at the bridge head when it rang) is ON THE BELL: worth
// half as much again. Half a bell after each bell his beams fire down the
// lanes he announced; a lit billboard shelters the lane behind it, and a lit
// Conductor cannot fire down his own lane.
//
//   Phase 1 ON THE BELL      (100 → 70) lamps, bridge, punch; beams take one
//                            lane once the first punch has landed.
//   Phase 2 THE BELL SWINGS  (70 → 38) every bell also swings a brass ring
//                            out from him across both roofs: jump it.
//   Phase 3 THE LAST BELL    (38 → 0) he calls his next lane late (1.2 s
//                            after the bell: 2.8 s to light it), and every
//                            fourth bell his beams sweep all three lanes:
//                            only a lit billboard, or his own lit lane, is
//                            safe. The ring swings every other bell.
// The street gap is a railing: Butch never walks off it, and a bridge holds
// for its rider (the line lays a plank under a folding bridge he is on, as
// Chapter 2's lifts wait a bell for theirs). The last punch cracks the bell:
// the ticket inspection, then Echo City.

import { FIGHT_BOUNDS, createDirectorBase, driveScript, restartPhase } from '../conductorFight.js';
import { BELL_ARENA, LANE_EDGE, LANE_X, LANES, LIGHT_DAMAGE, OFFBEAT_MS, STRANDED_GRACE_S, createBellArena, laneOf } from '../finaleModel.js';
import { BELL_MS } from '../../borrowedLight/timetableModel.js';

export const BELL_PHASES = Object.freeze([
  Object.freeze({ id: 'on-the-bell', name: 'ON THE BELL', from: 100, to: 70 }),
  Object.freeze({ id: 'the-bell-swings', name: 'THE BELL SWINGS', from: 70, to: 38 }),
  Object.freeze({ id: 'last-bell', name: 'THE LAST BELL', from: 38, to: 0 }),
]);

export const PUNCH_DAMAGE = LIGHT_DAMAGE;
export const ON_THE_BELL_DAMAGE = 15;
export const ON_THE_BELL_S = 1.25;
export const LATE_CALL_MS = OFFBEAT_MS - 800;
export const BELL_WAVE = Object.freeze({ speed: 9, width: 0.7, maxR: 32 });
export const CONDUCTOR_Z = -15.8;
// Each phase's beam pressure: lanes per volley, a full sweep every n bells.
export const BELL_PRESSURE = Object.freeze({
  normal: Object.freeze([{ beamLanes: 1, fullSweepEvery: 0 }, { beamLanes: 1, fullSweepEvery: 0 }, { beamLanes: 1, fullSweepEvery: 4 }]),
  story: Object.freeze([{ beamLanes: 1, fullSweepEvery: 0 }, { beamLanes: 1, fullSweepEvery: 0 }, { beamLanes: 1, fullSweepEvery: 0 }]),
});

const LANE_SPAN = Object.freeze({
  west: [FIGHT_BOUNDS.minX, -LANE_EDGE], centre: [-LANE_EDGE, LANE_EDGE], east: [LANE_EDGE, FIGHT_BOUNDS.maxX],
});
const onGap = (z) => z < BELL_ARENA.gapNearZ && z > BELL_ARENA.gapFarZ;
const BRIDGE_IDS = Object.keys(BELL_ARENA.bridges);

export function createBellFight({ difficulty, seed = 17, startPhase = 0 } = {}) {
  const d = createDirectorBase({ phases: BELL_PHASES, difficulty, seed, startPhase });
  let arena = createBellArena({ difficulty, seed, beams: false });
  let exposedAt = -99;
  let strandedFor = 0;
  let lateCall = false;
  let firstPunch = false;
  let wavesOn = false;
  let wavesSent = 0;
  let punches = 0;
  let onTheBell = 0;
  let falls = 0;
  const pressureFor = (index) => (BELL_PRESSURE[d.tuning.id] ?? BELL_PRESSURE.normal)[index];
  const applyPressure = (replan = false) => arena.setPressure({ ...pressureFor(d.track.index), replan });

  // His announced lane, as the player sees it. In the last phase he calls
  // it late, LATE_CALL_MS after the bell: 0.8 s before his beams fire, so
  // the warned lane and the called lane are both on screen before either
  // matters, and 2.8 s before the bell it must be lit on.
  const announced = () => (!lateCall || arena.msSinceBell() >= LATE_CALL_MS ? arena.plan.lane : null);
  const exposureLit = () => {
    const e = arena.exposure;
    return e && arena.lit(e.lane) ? e : null;
  };

  // Beams are resolved on the off-beat by the arena; these proxies draw the
  // warned lanes and tell the bot where they will fall.
  const beamProxies = (lanes, fullSweep) => lanes.forEach((lane) => {
    const [x0, x1] = LANE_SPAN[lane];
    d.spawn({
      kind: 'zone', source: 'beam', proxy: true, x0, x1, z0: FIGHT_BOUNDS.minZ - 1, z1: FIGHT_BOUNDS.maxZ + 1,
      tele: Math.max(0.05, (OFFBEAT_MS - arena.msSinceBell()) / 1000), live: 0.35, meta: { lane, fullSweep },
      safeAt: (x, z) => Boolean(arena.shelteredBy(x, z)) || (laneOf(x) === lane && exposureLit()?.lane === lane),
    });
  });

  const sendWave = () => {
    wavesSent += 1;
    // STORY swings every other bell; the last phase (which also calls late
    // and sweeps) swings every other bell on NORMAL too.
    if (d.track.index >= 2 && wavesSent % 2 === 0) return;
    const extra = wavesSent % 2 === 0;
    d.spawn({
      kind: 'wave', source: 'bell-wave', x: LANE_X[arena.conductorLane], z: CONDUCTOR_Z, r0: 0, speed: BELL_WAVE.speed / d.tuning.flight,
      width: BELL_WAVE.width, maxR: BELL_WAVE.maxR, tele: 0.05, jumpable: true, extra,
    });
  };

  const handleArena = (events, body) => {
    for (const event of events) {
      d.emit({ type: 'arena', event });
      if (event.type === 'bell') {
        if (wavesOn && d.state !== 'interlude') sendWave();
      } else if (event.type === 'exposed') {
        exposedAt = d.clock;
      } else if (event.type === 'beam-telegraph') {
        if (d.state !== 'interlude') beamProxies(event.lanes, event.fullSweep);
      } else if (event.type === 'beam-fire') {
        d.attacks.filter((a) => a.source === 'beam' && event.cancelled?.includes(a.meta.lane)).forEach((a) => { a.harmless = true; });
        if (body && d.state !== 'interlude' && arena.resolveBeam(event.lanes, body.x, body.z) === 'hit') {
          d.emit({ type: 'hit', source: 'beam', from: { x: LANE_X[arena.conductorLane], z: CONDUCTOR_Z } });
        }
      }
    }
  };

  // ------------------------------------------------------------ the punch
  const act = (body) => {
    if (d.state === 'interlude' || d.state === 'finisher' || d.state === 'done') return d.emit({ type: 'act', result: 'none' });
    if (arena.onFrontPlatform(body.z)) {
      const result = arena.punchConductor(body.x, body.z);
      if (result.result !== 'hit') return d.emit({ type: 'act', result: result.result, lane: result.lane ?? null });
      const ontime = d.clock - exposedAt <= d.win(ON_THE_BELL_S);
      punches += 1;
      if (ontime) onTheBell += 1;
      body.attack = 0.26;
      d.emit({ type: 'act', result: ontime ? 'on-the-bell' : 'hit', lane: result.lane });
      d.damage(ontime ? ON_THE_BELL_DAMAGE : PUNCH_DAMAGE, 'borrowed-light', { onTheBell: ontime });
      if (!firstPunch) {
        firstPunch = true;
        if (d.track.index === 0 && d.state !== 'finisher') { arena.setBeams(true); applyPressure(true); }
      }
      return null;
    }
    const node = arena.nearestNode(body.x, body.z);
    if (!node) return d.emit({ type: 'act', result: 'no-lamp' });
    body.attack = 0.26;
    const result = arena.punch(node.id);
    d.emit({ type: 'act', result: result.result, node: node.id, line: node.line, lane: node.lane, cancelled: result.cancelled ?? null });
    if (Array.isArray(result.events)) handleArena(result.events, body);
    return null;
  };

  // ------------------------------------------------------------ the roofs
  // The gap is a railing: a step over it needs a bridge underfoot.
  const constrain = (from, to) => {
    if (!onGap(to.z) || arena.bridgeUnder(to.x, to.z)) return to;
    if (onGap(from.z)) {
      // On a bridge: walk along it, never off its side.
      if (arena.bridgeUnder(from.x, to.z)) return { x: from.x, z: to.z };
      return from;
    }
    return { x: to.x, z: from.z };
  };

  // ------------------------------------------------------------ scripts
  const SCRIPTS = {
    'on-the-bell': {
      teach() { arena.setBeams(false); wavesOn = false; lateCall = false; applyPressure(); },
      teachDone: () => firstPunch,
    },
    'the-bell-swings': {
      teach() {
        arena.setBeams(false);
        applyPressure();
        wavesOn = true;
        // The first swing comes alone; the beams join once it has passed.
        d.after(BELL_MS / 1000 + 2.8, () => { arena.setBeams(true); applyPressure(true); }, 'teach');
      },
      teachDone: () => arena.beamsOn,
    },
    'last-bell': {
      teach() { wavesOn = true; lateCall = true; arena.setBeams(true); applyPressure(true); d.after(BELL_MS / 1000, () => { d.taughtLate = true; }, 'teach'); },
      teachDone: () => d.taughtLate,
    },
  };

  const update = (dt, body, input = {}) => {
    d.events = [];
    if (input.act) act(body);
    handleArena(arena.update(dt * 1000), body);
    d.stepCore(dt, body);
    // A bridge holds for its rider: one folding under Butch gets a plank.
    if (body && onGap(body.z)) {
      const id = BRIDGE_IDS.find((b) => Math.abs(body.x - BELL_ARENA.bridges[b]) <= BELL_ARENA.bridgeHalfWidth);
      const status = id ? arena.timetable.machineStatus(id) : null;
      const plankLeft = id ? arena.returnLeft(id) : 0;
      if (id && plankLeft < 800 && (!status?.powered || status.flicker || (status.remaining ?? 0) < 800)) {
        arena.extendReturnBridge(id, undefined, { full: true });
        d.emit({ type: 'return-plank', bridge: id, rider: true });
      }
    }
    // Only a debug teleport can leave him over the street with nothing
    // under him: he drops (one layer) and climbs back onto the near roof.
    if (body && onGap(body.z) && !arena.bridgeUnder(body.x, body.z) && body.y < 0.2) {
      falls += 1;
      d.emit({ type: 'hit', source: 'fall', force: true, from: { x: body.x, z: BELL_ARENA.gapNearZ } });
      body.x = Math.max(-9, Math.min(9, body.x)); body.z = BELL_ARENA.gapNearZ + 2.2; body.y = 0; body.vy = 0;
      body.inv = Math.max(body.inv, 1.2);
      d.emit({ type: 'reposition', x: body.x, z: body.z, why: 'fall' });
    }
    // Stranded on the far roof (no bridge out, nobody lit): a return plank.
    if (body && arena.stranded(body.z) && d.state !== 'done') {
      strandedFor += dt;
      if (strandedFor >= STRANDED_GRACE_S) {
        strandedFor = 0;
        arena.extendReturnBridge(arena.nearestBridge(body.x));
        d.emit({ type: 'return-plank', bridge: arena.nearestBridge(body.x) });
      }
    } else strandedFor = 0;
    if (d.state === 'interlude' && arena.beamsOn) arena.setBeams(false);
    driveScript(d, dt, body, SCRIPTS, { movement: 1, finisherSeconds: 1.6 });
    return d.events;
  };

  // ------------------------------------------------------------ the bot
  const bridgeOutAt = (id, inMs) => {
    const m = arena.timetable.machineStatus(id);
    return (m?.powered && (m.remaining ?? 0) > inMs) || arena.returnPlanks().includes(id);
  };
  const queued = (id) => Boolean(arena.timetable.nodeStatus(id)?.queued);
  const lineQueued = (line) => BELL_ARENA.nodes.some((node) => node.line === line && queued(node.id));
  const lineBusy = (line) => BELL_ARENA.nodes.some((node) => node.line === line && arena.timetable.nodeStatus(node.id)?.lineBusy);
  const node = (id) => BELL_ARENA.nodes.find((entry) => entry.id === id);
  const reachSpot = (n, body) => ({ x: n.x + (body.x > n.x ? 1.2 : -1.2), z: n.z + 0.9 });
  const objective = (body) => {
    const lit = exposureLit();
    const front = arena.onFrontPlatform(body.z);
    const msToBell = arena.msToBell();
    if (lit && !lit.punched) {
      const lx = LANE_X[lit.lane];
      if (front) return { kind: 'punch', x: lx, z: -5.7, ready: laneOf(body.x) === lit.lane, urgent: true };
      const out = BRIDGE_IDS.filter((id) => arena.bridgeLevel(id) >= 0.85).sort((a, b) => Math.abs(BELL_ARENA.bridges[a] - lx) - Math.abs(BELL_ARENA.bridges[b] - lx))[0];
      if (out) {
        const bx = BELL_ARENA.bridges[out];
        if (onGap(body.z) || Math.abs(body.x - bx) < 0.9) return { kind: 'cross', x: bx, z: BELL_ARENA.gapFarZ - 0.9, urgent: true };
        return { kind: 'to-bridge', x: bx, z: BELL_ARENA.gapNearZ + 0.5, urgent: true };
      }
    }
    if (front) {
      // Nothing to punch: back over a bridge before it folds.
      const back = BRIDGE_IDS.filter((id) => arena.bridgeLevel(id) >= 0.85).sort((a, b) => Math.abs(BELL_ARENA.bridges[a] - body.x) - Math.abs(BELL_ARENA.bridges[b] - body.x))[0];
      if (back) return { kind: 'return', x: BELL_ARENA.bridges[back], z: BELL_ARENA.gapNearZ + 1.4, urgent: true };
      return { kind: 'wait', x: body.x, z: -5.4 };
    }
    const lane = announced();
    const wants = [];
    const plan = arena.plan;
    if (lane && !queued(`lamp-${lane}`) && !(lit && lit.lane === lane) && !lineBusy('rose')) wants.push(`lamp-${lane}`);
    const bridgeNextBell = BRIDGE_IDS.some((id) => bridgeOutAt(id, msToBell + 900)) || lineQueued('amber');
    if (!bridgeNextBell && !lineBusy('amber')) {
      const lx = LANE_X[lane ?? 'centre'];
      wants.push(BRIDGE_IDS.slice().sort((a, b) => Math.abs(BELL_ARENA.bridges[a] - lx) - Math.abs(BELL_ARENA.bridges[b] - lx))[0]);
    }
    if (plan.fullSweep && !lineQueued('teal') && !lineBusy('teal')) wants.push(body.x < 0 ? 'board-west' : 'board-east');
    const target = wants.map(node).filter(Boolean)
      .sort((a, b) => Math.hypot(a.x - body.x, a.z - body.z) - Math.hypot(b.x - body.x, b.z - body.z))[0];
    if (target) {
      const near = arena.nearestNode(body.x, body.z);
      const spot = reachSpot(target, body);
      return { kind: 'lamp', node: target.id, x: spot.x, z: spot.z, ready: near?.id === target.id };
    }
    // A full sweep coming: wait behind the lit board.
    if (plan.fullSweep || arena.beam?.fullSweep) {
      const board = arena.timetable.machineStatus('board-west')?.powered || queued('board-west') ? 'board-west' : 'board-east';
      return { kind: 'shelter', x: LANE_X[BELL_ARENA.boards[board].lane], z: BELL_ARENA.boards[board].z + 1.6 };
    }
    // Ready at the bridge head for the bell.
    const lx = LANE_X[lane ?? arena.conductorLane];
    const id = BRIDGE_IDS.slice().sort((a, b) => Math.abs(BELL_ARENA.bridges[a] - lx) - Math.abs(BELL_ARENA.bridges[b] - lx))[0];
    return { kind: 'ready', x: BELL_ARENA.bridges[id], z: BELL_ARENA.gapNearZ + 0.45 };
  };

  const director = {
    id: 'borrowed',
    track: d.track,
    get state() { return d.state; },
    get attacks() { return d.attacks; },
    get arena() { return arena; },
    get clock() { return d.clock; },
    get lateCall() { return lateCall; },
    get wavesOn() { return wavesOn; },
    get stats() { return { punches, onTheBell, falls, waves: wavesSent }; },
    announced,
    exposureLit,
    get onTheBellOpen() { const e = exposureLit(); return Boolean(e && !e.punched && d.clock - exposedAt <= d.win(ON_THE_BELL_S)); },
    update,
    constrain,
    walkable: (x, z) => !onGap(z) || Boolean(arena.bridgeUnder(x, z)),
    setDifficulty(id) { d.setDifficulty(id); applyPressure(true); },
    threatAt: (x, z, options) => d.threatAt(x, z, options),
    checkpoint(rollback = 'phase') {
      arena.clearQueue();
      restartPhase(d, rollback);
      // The lessons stay learned: beams and swings as the phase has them.
      if (d.track.index === 0 && firstPunch) { arena.setBeams(true); applyPressure(true); }
      if (d.track.index >= 1) { wavesOn = true; arena.setBeams(true); applyPressure(true); }
      if (d.track.index >= 2) lateCall = true;
      return { x: 0, z: 4.6 };
    },
    skipTeach() {
      if (d.state !== 'intro' && d.state !== 'teach') return;
      d.cancelTimers('teach');
      firstPunch = true;
      arena.setBeams(true);
      applyPressure(true);
      if (d.track.index >= 1) wavesOn = true;
      if (d.track.index >= 2) lateCall = true;
      d.taught.add(d.track.phase.id);
      d.setState('fight');
    },
    jumpToPhase(index) { d.clearAttacks(); d.cancelTimers(); d.track.jump(index); firstPunch = index > 0; d.setState('teach'); },
    damage: (amount) => d.damage(amount, 'debug'),
    objective,
    // One line for the moment (only while a phase teaches).
    hint(body) {
      if (d.state !== 'teach') return '';
      const id = d.track.phase.id;
      const lane = announced();
      if (id === 'on-the-bell') {
        const lit = exposureLit();
        if (lit && !lit.punched) return arena.onFrontPlatform(body.z) ? (laneOf(body.x) === lit.lane ? '<kbd>E</kbd> · RETURN THE LIGHT' : `INTO THE ${lit.lane.toUpperCase()} LANE · THEN <kbd>E</kbd>`) : 'HE IS LIT · CROSS THE BRIDGE TO HIM';
        const bridge = BRIDGE_IDS.some((b) => arena.bridgeLevel(b) >= 0.85) || lineQueued('amber');
        if (!bridge) return 'PUNCH AN <kbd>AMBER</kbd> LAMP · <kbd>E</kbd> · ITS BRIDGE CROSSES ON THE BELL';
        if (lane && !queued(`lamp-${lane}`)) return `NOW THE <kbd>ROSE</kbd> SIGNAL IN THE ${lane.toUpperCase()} LANE · HE STEPS INTO ITS LIGHT ON THE BELL`;
        return 'BOTH QUEUED · WAIT AT THE BRIDGE · CROSS WHEN THE BELL RINGS';
      }
      if (id === 'the-bell-swings') return 'THE BELL SWINGS · A BRASS RING RUNS OUT FROM HIM · <kbd>SPACE</kbd> · JUMP IT';
      return 'THE LAST BELL · HE CALLS HIS LANE LATE · LIGHT IT FAST';
    },
    snapshot() {
      const e = arena.exposure;
      return {
        ...d.snapshotCore(), lateCall, wavesOn, punches, onTheBell, falls, announced: announced(), conductorLane: arena.conductorLane,
        exposure: e ? { lane: e.lane, punched: e.punched, lit: arena.lit(e.lane) } : null, msToBell: Math.round(arena.msToBell()), beamsOn: arena.beamsOn, pressure: arena.pressure,
        bridges: Object.fromEntries(BRIDGE_IDS.map((id) => [id, +arena.bridgeLevel(id).toFixed(2)])),
      };
    },
    lanes: LANES,
  };
  return director;
}
