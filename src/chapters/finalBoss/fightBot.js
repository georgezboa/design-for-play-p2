// Chapter 6 · a bot that plays the Conductor (round 11), for QA only.
//
// It reads the fight the way a player does: an attack is only seen once it
// has been on screen for `react` seconds, and it is dodged by where its
// telegraph says it will strike (timeToHit), never by peeking at hidden
// state. It walks to what the movement asks for (director.objective), jumps
// what can be jumped, dashes out of what cannot, and uses the movement's
// mechanic. Skill presets:
//   competent  a player who has learned the fight: ~0.24 s reactions, a
//              small chance per second of a late read, and attention for
//              the four most pressing warnings on screen at once.
//   learner    0.34 s reactions, more late reads, attention for three.
//
// Used by the node tests (tests/finalBoss/round11Sim.test.mjs: every
// movement can be won on NORMAL and STORY, within the time budget) and,
// in DEV builds only, by the stage's QA hook window.finalBossBot().

import { FIGHT_BODY, clamp, dangerSpan, timeToHit } from './conductorFight.js';

export const BOT_SKILL = Object.freeze({
  competent: Object.freeze({ react: 0.24, replan: 0.1, slip: 0.08, blind: 0.45, aimJitter: 0.25, actDelay: [0.06, 0.42], attention: 4 }),
  learner: Object.freeze({ react: 0.34, replan: 0.14, slip: 0.2, blind: 0.6, aimJitter: 0.6, actDelay: [0.15, 0.85], attention: 3 }),
});

function rngFrom(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DIRS = Array.from({ length: 16 }, (_, i) => [Math.cos((i / 16) * Math.PI * 2), Math.sin((i / 16) * Math.PI * 2)]);
const RADII = [0.9, 2, 3.4, 5, 7];

export function createFightBot({ skill = 'competent', seed = 5 } = {}) {
  const S = BOT_SKILL[skill] ?? BOT_SKILL.competent;
  const random = rngFrom(seed);
  let plan = null;
  let replan = 0;
  let blindUntil = 0;
  let clock = 0;
  let lastAct = -9;
  let lastJump = -9;
  let readySince = null;
  let readyDelay = null;

  // What a player can take in: warnings on screen long enough to read, and
  // only the few that press soonest on where Butch stands (a dense pattern
  // overloads attention, as it would a player's).
  const visible = (attacks, body) => attacks
    .filter((a) => a.age >= S.react)
    .map((a) => ({ a, t: Math.min(timeToHit(a, body.x, body.z, 2.5), 9) + (a.age < S.react + 0.3 ? 0.4 : 0) }))
    .sort((x, y) => x.t - y.t)
    .slice(0, S.attention ?? 99)
    .map(({ a }) => a);

  // Danger of standing at (x, z) from `ta` seconds on (arrival).
  const dangerAt = (attacks, x, z, ta, { hold = 1.4 } = {}) => {
    let cost = 0;
    for (const a of attacks) {
      const t = timeToHit(a, x, z, 0.38);
      if (!Number.isFinite(t)) continue;
      const end = t + dangerSpan(a);
      if (end < ta - 0.05 || t > ta + hold) continue;
      // Something that cannot be jumped is never worth standing in, however
      // late it strikes (the bot means to stay where it goes).
      cost += a.jumpable ? 6 : 110 - Math.min(40, Math.max(0, t - ta) * 12);
    }
    return cost;
  };

  const decide = (runner, dt) => {
    clock += dt;
    const body = runner.body;
    const director = runner.director;
    const attacks = visible(director.attacks ?? [], body);
    const objective = director.objective?.(body) ?? { kind: 'wait', x: body.x, z: body.z };
    const input = { dx: 0, dz: 0, jump: false, dash: false, act: false, actHeld: false, retHeld: false, aim: null };
    // Now and then a competent player reads a telegraph late.
    if (random() < S.slip * dt) blindUntil = clock + S.blind;
    const blind = clock < blindUntil;

    replan -= dt;
    if (replan <= 0 || !plan) {
      replan = S.replan;
      const bounds = director.bounds ?? { minX: -13.2, maxX: 13.2, minZ: -7.35, maxZ: 8.2 };
      const speed = FIGHT_BODY.speed * (body.speedScale ?? 1);
      const goal = { x: objective.x ?? body.x, z: objective.z ?? body.z };
      const candidates = [[body.x, body.z]];
      for (const r of RADII) for (const [cx, cz] of DIRS) candidates.push([body.x + cx * r, body.z + cz * r]);
      const gd = Math.hypot(goal.x - body.x, goal.z - body.z);
      if (gd > 0.05) {
        const step = Math.min(gd, 2.2);
        candidates.push([body.x + ((goal.x - body.x) / gd) * step, body.z + ((goal.z - body.z) / gd) * step], [goal.x, goal.z]);
      }
      let best = null;
      for (const [rx, rz] of candidates) {
        const x = clamp(rx, bounds.minX + 0.3, bounds.maxX - 0.3);
        const z = clamp(rz, bounds.minZ + 0.3, bounds.maxZ - 0.3);
        if (director.walkable && !director.walkable(x, z, body)) continue;
        const dist = Math.hypot(x - body.x, z - body.z);
        // A straight walk that would run into a crack or a wall is not a plan.
        if (director.walkable && dist > 0.6) {
          let clear = true;
          for (let k = 1, n = Math.ceil(dist / 0.45); k < n && clear; k += 1) clear = director.walkable(body.x + ((x - body.x) * k) / n, body.z + ((z - body.z) * k) / n, body);
          if (!clear) continue;
        }
        const ta = dist / speed;
        let cost = blind ? 0 : dangerAt(attacks, x, z, ta, { hold: objective.holdAct || objective.kind === 'absorb' ? 2.4 : 1.4 });
        if (!blind && dist > 1) cost += dangerAt(attacks, (x + body.x) / 2, (z + body.z) / 2, ta / 2, { hold: 0.35 }) * 0.6;
        cost += Math.hypot(goal.x - x, goal.z - z) * (objective.urgent ? 1.6 : 0.7);
        cost += (director.avoid?.(x, z, body) ?? 0);
        if (!best || cost < best.cost) best = { x, z, cost, dist };
      }
      plan = best;
      // Out of time to walk: dash for it.
      const here = blind ? 0 : dangerAt(attacks, body.x, body.z, 0, { hold: 0.45 });
      if (here >= 60 && best && best.dist > 0.8 && body.dashCd <= 0 && (best.cost < here - 30)) input.dash = true;
    }
    if (plan) {
      const dx = plan.x - body.x;
      const dz = plan.z - body.z;
      const d = Math.hypot(dx, dz);
      if (d > 0.12) { input.dx = dx / d; input.dz = dz / d; }
    }
    // Jump a wave or a sweep as it arrives.
    if (!blind && body.grounded && clock - lastJump > 0.5) {
      for (const a of attacks) {
        if (!a.jumpable) continue;
        const t = timeToHit(a, body.x, body.z, 0.05);
        if (t >= 0.08 && t <= 0.2 && !(objective.dashThrough && a.kind === 'sweep' && body.dashCd <= 0)) { input.jump = true; lastJump = clock; break; }
        if (objective.dashThrough && a.kind === 'sweep' && t <= 0.06 && body.dashCd <= 0) { input.dash = true; break; }
      }
    }
    if (objective.aim) input.aim = { x: objective.aim.x + (random() - 0.5) * S.aimJitter, z: objective.aim.z + (random() - 0.5) * S.aimJitter };
    // A press takes a moment after the moment is ready (a human's timing).
    if (objective.ready) {
      readySince ??= clock;
      readyDelay ??= S.actDelay[0] + random() * (S.actDelay[1] - S.actDelay[0]);
      if (clock - readySince >= readyDelay && clock - lastAct > 0.18) { input.act = true; lastAct = clock; readySince = null; readyDelay = null; }
    } else { readySince = null; readyDelay = null; }
    if (objective.holdAct) input.actHeld = true;
    if (objective.holdRet) input.retHeld = true;
    return input;
  };

  return { decide, get clock() { return clock; } };
}

// Play one movement to its end (or `maxSeconds`) with a bot. Returns what a
// playtest note would: the time, the deaths, the layers lost, when each
// phase was cleared, and whether it finished.
export function simulateMovement({ makeRunner, bot, maxSeconds = 600, dt = 1 / 60, onEvent = null } = {}) {
  const runner = makeRunner();
  const phases = [];
  let finished = false;
  let time = 0;
  while (time < maxSeconds && !finished) {
    const input = bot.decide(runner, dt);
    const events = runner.step(dt, input);
    time += dt;
    for (const event of events) {
      onEvent?.(event, runner, time);
      if (event.type === 'phase-cleared') phases.push({ index: event.index, at: +time.toFixed(1) });
      if (event.type === 'finished') finished = true;
    }
  }
  return { finished, time: +time.toFixed(1), deaths: runner.deaths, hits: runner.hits, phases, hp: runner.director.track.hp };
}
