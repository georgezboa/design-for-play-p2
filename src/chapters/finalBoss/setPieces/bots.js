// Chapter 6 · bots that play the set pieces (round 12), for QA only.
//
// Each piece plays differently, so each has its own policy, but every
// policy plays the way a person does:
//   - it only reacts to what has been on screen for `react` seconds (a
//     warning, a spawned hazard), never to hidden state;
//   - its timing has human jitter (`jitter`, seconds, one sigma);
//   - now and then it reads something late (`slip` per second, `blind` s);
//   - the weaker profile also hesitates, misjudges and bites on feints.
// Profiles:
//   skilled   a player who has learned the fight
//   weaker    a first-time player who is not very good at action games
//
// Used by the node tests (tests/finalBoss/round12*.test.mjs: every piece can
// be won by both profiles on NORMAL and STORY within its time budget) and, in
// DEV builds only, by the stage's QA hook window.finalBossBot().

import { clamp } from './kernel.js';
import { stepPlatformBody } from './platformer.js';
import { TOWER_LEDGES, TOWER_SWINGS } from './bellTower.js';

export const BOT_SKILL = Object.freeze({
  skilled: Object.freeze({ id: 'skilled', react: 0.2, jitter: 0.025, slip: 0.04, blind: 0.35, care: 1, feint: 0, punchChance: 0.9, hesitate: 0 }),
  weaker: Object.freeze({ id: 'weaker', react: 0.3, jitter: 0.06, slip: 0.12, blind: 0.5, care: 0.75, feint: 0.06, punchChance: 0.55, hesitate: 0.25 }),
});
// Round 11's names, kept as aliases.
const ALIASES = { competent: 'skilled', learner: 'weaker' };
export const botSkill = (id) => BOT_SKILL[ALIASES[id] ?? id] ?? BOT_SKILL.skilled;

export function rngFrom(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A gaussian-ish jitter (the sum of three uniforms).
const jitterOf = (random, sigma) => ((random() + random() + random() - 1.5) / 0.5) * sigma;

export function createBotMind({ skill = 'skilled', seed = 5 } = {}) {
  const S = botSkill(skill);
  const random = rngFrom(seed);
  const mind = {
    S,
    random,
    clock: 0,
    blindUntil: 0,
    memory: new Map(),
    tick(dt) {
      mind.clock += dt;
      if (random() < S.slip * dt) mind.blindUntil = mind.clock + S.blind;
    },
    get blind() { return mind.clock < mind.blindUntil; },
    jitter: (scale = 1) => jitterOf(random, S.jitter * scale),
    // A per-object decision made once (e.g. "punch this claim or jump it").
    decide(key, fn) { if (!mind.memory.has(key)) mind.memory.set(key, fn()); return mind.memory.get(key); },
    forget(key) { mind.memory.delete(key); },
  };
  return mind;
}

const blankInput = () => ({ x: 0, y: 0, jump: false, jumpHeld: false, dash: false, act: false, actHeld: false, duck: false, dir: null, aim: null });

// ---------------------------------------------------------------------------
// The side-view pieces: a short look-ahead planner. Every decision tick it
// tries a few dozen input plans (run / stop / back off, jump now or a beat
// later, held or tapped, duck, dash) through the real physics against what
// it has seen, and takes the safest one that gets it where it wants to be.
// A person does much the same, a beat at a time: that is where the reaction
// time, the jitter and the late reads come in.

function buildPlans() {
  const plans = [];
  for (const x of [1, 0.55, 0, -0.55, -1]) {
    plans.push({ x });
    plans.push({ x, release: true });
    for (const jumpAt of [0, 0.1, 0.22, 0.36]) for (const hold of [0.12, 0.5]) plans.push({ x, jumpAt, hold });
    plans.push({ x, duckTo: 0.45 });
    plans.push({ x, dashAt: 0 });
    if (x !== 0) for (const stopAt of [0.12, 0.3, 0.55]) plans.push({ x, stopAt });
    plans.push({ x, jumpAt: 0, hold: 0.5, dashAt: 0.28 });
  }
  return plans;
}
const PLANS = buildPlans();

export function planPlatformer({ body, forecast, goal, horizon = 0.95, dt = 1 / 30, prefer = null }) {
  let best = null;
  for (const plan of PLANS) {
    const b = { ...body, lastSafe: { ...body.lastSafe } };
    let cost = 0;
    let t = 0;
    let hurt = null;
    for (; t < horizon; t += dt) {
      const input = {
        x: plan.stopAt !== undefined && t >= plan.stopAt ? 0 : plan.x,
        jump: plan.jumpAt !== undefined && t >= plan.jumpAt - 1e-6 && t < plan.jumpAt + dt - 1e-6,
        jumpHeld: plan.jumpAt !== undefined ? t >= plan.jumpAt - 1e-6 && t < plan.jumpAt + plan.hold : !plan.release,
        duck: plan.duckTo !== undefined && t < plan.duckTo,
        dash: plan.dashAt !== undefined && t >= plan.dashAt - 1e-6 && t < plan.dashAt + dt - 1e-6,
      };
      const events = stepPlatformBody(b, input, dt, forecast.world(t));
      if (events.some((e) => e.type === 'fell') || b.y < -1.2) { hurt = 'fall'; break; }
      const hit = forecast.hits(b, t);
      if (hit) { hurt = hit; break; }
    }
    if (hurt) cost += 1000 - t * 300;
    else if (forecast.risk) cost += forecast.risk(b, horizon);
    const g = typeof goal === 'object' && goal !== null ? goal : { x: goal };
    if (g.surface) {
      // Be standing on that surface (wherever it has moved to) at the end.
      const target = forecast.world(horizon).surfaces.find((entry) => entry.id === g.surface);
      if (b.grounded && b.ground === g.surface) cost -= 8;
      else if (target) cost += Math.max(0, target.x0 + 0.4 - b.x, b.x - (target.x1 - 0.4)) * 1.2 + Math.abs(target.y - b.y) * 2.5;
    } else {
      cost += Math.abs((g.x ?? b.x) - b.x) * 1.2;
      if (g.y !== undefined) cost += Math.abs(g.y - b.y) * 2.5;
    }
    if (plan.jumpAt !== undefined) cost += 0.6 + plan.jumpAt * 0.5;
    if (plan.duckTo !== undefined) cost += 0.8;
    if (plan.release) cost += 0.1;
    if (plan.dashAt !== undefined) cost += 1.4;
    if (prefer && plan === prefer) cost -= 0.4;
    if (!best || cost < best.cost) best = { plan, cost, hurt, t };
  }
  return best;
}

// One planned step as this tick's input (a plan's first moment).
function planInput(plan, since) {
  return {
    x: plan.stopAt !== undefined && since >= plan.stopAt ? 0 : plan.x,
    jump: plan.jumpAt !== undefined && since >= plan.jumpAt && since < plan.jumpAt + 0.05,
    jumpHeld: plan.jumpAt !== undefined ? since >= plan.jumpAt && since < plan.jumpAt + plan.hold : !plan.release,
    duck: plan.duckTo !== undefined && since < plan.duckTo,
    dash: plan.dashAt !== undefined && since >= plan.dashAt && since < plan.dashAt + 0.05,
  };
}

// A planner-driven side-view policy. `goalOf(piece)` says where to be,
// `extra(piece, input)` adds the piece's own verb (punch, a lamp).
export function sidePolicy(mind, { goalOf, extra = null, horizon = 0.95, every = 0.09, ignore = null } = {}) {
  let plan = { x: 0 };
  let since = 0;
  let next = 0;
  let pressedJump = false;
  return (piece, dt) => {
    const S = mind.S;
    since += dt;
    next -= dt;
    if (next <= 0 && !mind.blind) {
      next = every * (S.id === 'weaker' ? 1.35 : 1);
      const seen = piece.hazards.filter((h) => h.age >= S.react && !(ignore && ignore(h, piece)));
      const forecast = piece.forecast(seen);
      const best = planPlatformer({ body: piece.body, forecast, goal: goalOf(piece), horizon: horizon * S.care + 0.2, prefer: plan });
      if (best.plan !== plan || since > 0.5) {
        // A human presses a beat early or late.
        const offset = mind.jitter(1);
        plan = { ...best.plan, ...(best.plan.jumpAt !== undefined ? { jumpAt: Math.max(0, best.plan.jumpAt + offset) } : {}) };
        since = 0;
        pressedJump = false;
      }
    }
    const input = { ...blankInput(), ...planInput(plan, since) };
    if (input.jump) { if (pressedJump) input.jump = false; else pressedJump = true; }
    extra?.(piece, input);
    return input;
  };
}

// ---------------------------------------------------------------------------
// I · THE ROOF RUN

export function roofRunPolicy(mind) {
  // A claim it means to punch is not something to jump.
  const willPunch = (h) => h.kind === 'claim' && mind.decide(h.id, () => mind.random() < mind.S.punchChance);
  const move = sidePolicy(mind, {
    goalOf: (piece) => (piece.state === 'finisher' || piece.camX >= 449 ? 458 : piece.camX + 2.4),
    ignore: (h) => willPunch(h) && !h.returned,
  });
  return (piece, dt) => {
    const input = move(piece, dt);
    // A brass claim case: punch it as it reaches him (or leave it to the plan).
    if (!mind.blind) {
      for (const h of piece.hazards) {
        if (h.kind !== 'claim' || h.returned || h.age < mind.S.react) continue;
        const rel = h.x - piece.body.x;
        if (willPunch(h) && rel <= 0.85 + mind.jitter(8) && rel > 0.1) { input.act = true; }
      }
    }
    return input;
  };
}

// ---------------------------------------------------------------------------
// I · RETURN TO SENDER: stand in the brass ring, punch on the landing, keep
// out of grey rings and his stamp, jump the sacks, leave a ring that reads
// NO CLAIM.

export function returnToSenderPolicy(mind) {
  let jumpHold = 0;
  let pressed = new Set();
  return (piece, dt) => {
    const input = blankInput();
    const S = mind.S;
    const body = piece.body;
    jumpHold = Math.max(0, jumpHold - dt);
    const seen = piece.hazards.filter((h) => h.age >= S.react && !h.done);
    const threats = piece.threats(seen);
    // The claim to stand under (the soonest).
    const claim = threats.filter((t) => t.kind === 'claim').sort((a, b) => a.t - b.t)[0] ?? null;
    let goal = claim ? claim.x : 0;
    const speed = 7.5;
    const cost = (x) => {
      const travel = Math.abs(x - body.x) / speed;
      let c = Math.abs(x - goal) * (claim ? 3 : 0.4);
      for (const t of threats) {
        if (t.kind === 'drop' || (t.kind === 'decoy' && t.h.revealed)) {
          if (t.t < travel + 0.5 && Math.abs(x - t.x) < t.r + 0.45) c += 60;
        } else if (t.kind === 'decoy' && !t.h.revealed) {
          // Unread yet: it looks like a claim, so stay near it.
          c += Math.abs(x - t.x) * 1.5;
        } else if (t.kind === 'stamp' && t.t < travel + 0.7 && x > t.x0 - 0.35 && x < t.x1 + 0.35) c += 80;
      }
      return c;
    };
    let bestX = body.x;
    let bestCost = Infinity;
    if (!mind.blind) {
      for (let x = -2.4; x <= 2.41; x += 0.2) {
        const c = cost(x) + Math.abs(x - body.x) * 0.05;
        if (c < bestCost) { bestCost = c; bestX = x; }
      }
    } else bestX = piece.memoX ?? body.x;
    const dx = bestX - body.x;
    input.x = Math.abs(dx) > 0.12 ? clamp(dx / 0.5, -1, 1) : 0;
    // A stamp about to fall on him with no time to walk: dash out.
    const stamp = threats.find((t) => t.kind === 'stamp' && t.t < 0.25 && body.x > t.x0 && body.x < t.x1);
    if (stamp && body.dashCd <= 0) { input.dash = true; input.x = body.x > (stamp.x0 + stamp.x1) / 2 ? 1 : -1; }
    // Jump the sacks.
    for (const t of threats) if (t.kind === 'sweep' && body.grounded && t.t > 0.04 && t.t < 0.16 + mind.jitter(1.2)) { input.jump = true; jumpHold = 0.45; }
    input.jumpHeld = jumpHold > 0 || input.jump;
    // Punch the claim as it lands (and, now and then, bite on a decoy).
    if (!mind.blind) {
      for (const t of threats) {
        if ((t.kind !== 'claim' && !(t.kind === 'decoy' && !t.h.revealed && mind.random() < S.feint * dt * 4)) || pressed.has(t.h.id)) continue;
        if (Math.abs(body.x - t.x) > 0.9) continue;
        const aim = 0.01 + mind.jitter(1.6);
        if (t.t <= aim) { input.act = true; pressed.add(t.h.id); break; }
      }
    }
    if (pressed.size > 40) pressed = new Set([...pressed].slice(-10));
    return input;
  };
}

// ---------------------------------------------------------------------------
// II · ON THE BELL: the route along the roofs (what a player reads off the
// screen: this lamp, that bridge, those planks), the planner for the jumps.

// Press E on a lamp when standing by it (once, after a human beat).
function lampPress(mind, piece, input, id) {
  const lamp = piece.lamps().find((l) => l.id === id);
  if (!lamp || lamp.queued || piece.machineLevel(id) > 0.05 || lamp.lit) return;
  if (Math.abs(piece.body.x - lamp.x) > 1.1 || !piece.body.grounded) return;
  const key = `lamp:${id}:${Math.floor(piece.clock)}`;
  if (mind.decide(key, () => mind.random() < 0.55 + mind.S.care * 0.4)) input.act = true;
}

export function rooftopGoal(piece) {
  const b = piece.body;
  const level = (id, ahead = 0) => piece.machineLevel(id, ahead);
  const lamp = (id) => piece.lamps().find((l) => l.id === id);
  const idle = (id) => !lamp(id).queued && level(id) < 0.05;
  // Cross a bridge only when it is out and will stay out long enough.
  const bridge = (id, wait, far) => {
    if (idle(id)) return { x: lamp(id).x, act: id };
    if (level(id) >= 0.95 && level(id, 1.25) >= 0.95) return { x: far };
    return { x: wait };
  };
  const seg = piece.seg.index;
  if (piece.state === 'finisher' || piece.state === 'done') return { x: b.x };
  if (seg === 0) {
    if (b.x < 12.6) return bridge('amber-1', 11.4, 26);
    return { x: 33.4, act: lamp('rose-1').lit ? null : 'rose-1' };
  }
  if (seg === 1) {
    if (b.x < 59.5) return { x: 62 };
    if (b.x < 74.6) return bridge('amber-2', 73.4, 84);
    return { x: 91.6, act: 'rose-2' };
  }
  if (b.x < 117.8) return { x: 119.5 };
  if (b.y < 2.0 && b.x < 128.4) {
    if (idle('teal-2')) return { x: 120.2, act: 'teal-2' };
    if (level('teal-2') >= 0.9) return { x: 126.2, y: 2.3 };
    return { x: 121.2 };
  }
  if (seg === 2) {
    if (b.y < 3.8) return { x: 131, y: 4 };
    if (b.x < 140.6) return bridge('amber-3', 139.4, 150);
    return { x: 157.6, act: 'rose-3' };
  }
  if (b.x < 185.5) return { x: 188 };
  if (b.x < 196.6) return bridge('amber-4', 195.4, 205.6);
  if (b.y < 6.4 && b.x < 211.6) {
    if (idle('teal-3')) return { x: 204.4, act: 'teal-3' };
    if (level('teal-3') >= 0.9) return { x: 209.6, y: 6.6 };
    return { x: 205.4 };
  }
  if (b.y < 8.0) return { x: 214, y: 8.2 };
  return { x: 224.6, act: 'rose-4' };
}

export function rooftopPolicy(mind) {
  const move = sidePolicy(mind, { goalOf: (piece) => rooftopGoal(piece), horizon: 1.0 });
  return (piece, dt) => {
    const input = move(piece, dt);
    const goal = rooftopGoal(piece);
    if (goal.act && !mind.blind) lampPress(mind, piece, input, goal.act);
    return input;
  };
}

// ---------------------------------------------------------------------------
// II · THE BELL TOWER: the climbing route, ledge by ledge; the planner jumps
// the rings and rides the swings.

export const TOWER_ROUTE = Object.freeze(['floor', 'l1', 'l2', 'l3', 'l4', 'l5', 'l6', 'l7', 'l8', 'ringers', 's1', 's2', 'm1', 's3', 'm2', 's4', 'm3', 'm4', 's5', 'clock-floor',
  'n1', 'n2', 'n3', 's6', 'n4', 'n5', 'n6', 's7', 'n7', 'n8', 'n9', 'n10', 'belfry']);

export function towerPolicy(mind, { ledges, swings }) {
  const surfaceY = new Map([...ledges.map((l) => [l.id, l.y]), ...swings.map((s) => [s.id, s.y])]);
  let step = 0;
  const move = sidePolicy(mind, {
    horizon: 1.05,
    goalOf: (piece) => {
      const b = piece.body;
      // Standing on the waypoint (or past it): the next one.
      while (step < TOWER_ROUTE.length - 1 && b.grounded && b.y >= surfaceY.get(TOWER_ROUTE[step]) - 0.05) step += 1;
      while (step > 0 && b.y < surfaceY.get(TOWER_ROUTE[step - 1]) - 0.5) step -= 1;
      const id = TOWER_ROUTE[step];
      return { surface: id, y: surfaceY.get(id) };
    },
  });
  return (piece, dt) => {
    const input = move(piece, dt);
    if (piece.seg.current.id === 'on-the-bell' && !mind.blind) {
      // Under the bell: stand still beneath it, punch on the strike.
      input.x = Math.abs(piece.body.x) > 0.6 ? -Math.sign(piece.body.x) : 0;
      input.jump = false; input.jumpHeld = false;
      const toStrike = 4 - piece.bellClock;
      const aim = 0.02 + mind.jitter(1.6);
      const key = `bell:${piece.bells}`;
      if (toStrike <= aim && !mind.memory.has(key)) { input.act = true; mind.memory.set(key, true); }
      // Missed it: jump the ring instead.
      if (mind.memory.has(key) && piece.bellClock > 3.95) mind.forget(key);
    }
    return input;
  };
}

// ---------------------------------------------------------------------------
// III · FALSE CLAIMS: a dodging search over where to step next (the words
// fly straight, so a person can read their lines), toward the next card,
// then under him to say both.

const TOP_DIRS = Array.from({ length: 16 }, (_, i) => [Math.cos((i / 16) * Math.PI * 2), Math.sin((i / 16) * Math.PI * 2)]);

export function falseClaimsPolicy(mind) {
  let plan = { dx: 0, dz: 0 };
  let next = 0;
  let firedAt = -9;
  return (piece, dt) => {
    const S = mind.S;
    const input = blankInput();
    const body = piece.body;
    next -= dt;
    const bounds = { minX: -8.7, maxX: 8.7, minZ: -3.9, maxZ: 6.7 };
    let goal = { x: 0, z: 4 };
    const free = piece.cards.filter((c) => !c.held);
    if (piece.ready) goal = { x: piece.bossAt(0.45 + S.react), z: 4.2 };
    else if (free.length) goal = free.sort((a, b) => Math.hypot(a.x - body.x, a.z - body.z) - Math.hypot(b.x - body.x, b.z - body.z))[0];
    if (next <= 0 && !mind.blind) {
      next = S.id === 'weaker' ? 0.12 : 0.08;
      // A person tracks the nearest few words, and misjudges their lines a
      // little (more so when weaker).
      const attention = S.id === 'weaker' ? 7 : 11;
      const misjudge = S.id === 'weaker' ? 0.16 : 0.07;
      const seen = piece.bullets.filter((b) => b.age >= S.react * 0.8 && !b.done)
        .sort((a, b) => Math.hypot(a.x - body.x, a.z - body.z) - Math.hypot(b.x - body.x, b.z - body.z)).slice(0, attention)
        .map((b) => { const k = 1 + mind.decide(`v:${b.id}`, () => (mind.random() - 0.5) * 2 * misjudge); return { ...b, vx: b.vx * k, vz: b.vz * k }; });
      const hurt = 0.2 + 0.1 + (S.id === 'weaker' ? 0.03 : 0);
      const options = [{ dx: 0, dz: 0 }];
      for (const [cx, cz] of TOP_DIRS) for (const k of [1, 0.5]) options.push({ dx: cx * k, dz: cz * k });
      const gm = Math.hypot(goal.x - body.x, goal.z - body.z);
      if (gm > 0.1) options.push({ dx: (goal.x - body.x) / gm, dz: (goal.z - body.z) / gm });
      for (const [cx, cz] of TOP_DIRS) options.push({ dx: cx, dz: cz, dash: true });
      let best = null;
      const horizon = 0.75 * S.care + 0.15;
      for (const o of options) {
        let cost = 0;
        let x = body.x; let z = body.z;
        for (let t = 1 / 30; t <= horizon; t += 1 / 30) {
          const speed = o.dash && t < 0.15 ? 15 : 6.4;
          x = clamp(x + o.dx * speed / 30, bounds.minX, bounds.maxX);
          z = clamp(z + o.dz * speed / 30, bounds.minZ, bounds.maxZ);
          if (o.dash && t < 0.22) continue;
          let hit = false;
          for (const b of seen) {
            const bx = b.x + b.vx * t; const bz = b.z + b.vz * t;
            const dx = Math.max(0, Math.abs(bx - x) - (b.half ?? 0));
            if (Math.hypot(dx, bz - z) < (b.R ?? b.r) * 0.85 + hurt) { hit = true; break; }
          }
          if (hit) { cost += 1000 - t * 900; break; }
        }
        cost += Math.hypot(goal.x - x, goal.z - z) * 1.1;
        if (x <= bounds.minX + 0.2 || x >= bounds.maxX - 0.2 || z <= bounds.minZ + 0.2 || z >= bounds.maxZ - 0.2) cost += 2;
        if (o.dash) cost += body.dashCd > 0 ? 5000 : 3;
        if (o === plan) cost -= 0.3;
        if (!best || cost < best.cost) best = { o, cost };
      }
      plan = best.o;
    }
    input.x = plan.dx; input.y = plan.dz;
    if (plan.dash && body.dashCd <= 0) { input.dash = true; plan = { ...plan, dash: false }; }
    // Say it once he is lined up (a beat of human timing on the press).
    if (piece.ready && !mind.blind && piece.clock - firedAt > 0.75) {
      const off = Math.abs(body.x - piece.bossAt(0.45));
      if (off < 0.9 + mind.jitter(6)) { input.act = true; firedAt = piece.clock; }
    }
    return input;
  };
}

// ---------------------------------------------------------------------------
// III · THE STANDOFF: wait for the clock (the weaker profile now and then
// bites on a feint), then the first true thing after a human reaction, the
// second on the stroke.

export function standoffPolicy(mind) {
  let lastStage = null;
  let stageAt = 0;
  let pressedFirst = false;
  let pressedSecond = false;
  let bitten = new Set();
  return (piece) => {
    const S = mind.S;
    const input = blankInput();
    const duel = piece.duel;
    if (!duel) return input;
    if (duel.stage !== lastStage) { lastStage = duel.stage; stageAt = piece.clock; if (duel.stage === 'draw') { pressedFirst = false; pressedSecond = false; } }
    const slots = piece.slots();
    const trueSlots = Object.entries(slots).filter(([, f]) => f.holds).map(([slot]) => slot);
    if (duel.stage === 'wait') {
      // A feint just happened: the weaker player sometimes jumps at it.
      const feint = duel.feints.find((f) => f.done && duel.age - f.at < 0.4 && !bitten.has(`${piece.clock - duel.age}:${f.at}`));
      if (feint) {
        bitten.add(`${piece.clock - duel.age}:${feint.at}`);
        if (mind.random() < S.feint * 2.5) input.dir = trueSlots[0];
      }
      return input;
    }
    if (duel.stage === 'draw' && !pressedFirst) {
      const delay = S.react + 0.06 + Math.abs(mind.jitter(2));
      if (piece.clock - stageAt >= delay) {
        pressedFirst = true;
        const wrong = mind.random() < (S.id === 'weaker' ? 0.04 : 0);
        input.dir = wrong ? Object.keys(slots).find((slot) => !slots[slot].holds) : trueSlots[0];
      }
      return input;
    }
    if (duel.stage === 'second' && !pressedSecond) {
      const toBeat = duel.secondAt - duel.age;
      if (toBeat <= 0.02 + mind.jitter(2.2)) {
        pressedSecond = true;
        input.dir = trueSlots.find((slot) => slot !== duel.firstSlot) ?? trueSlots[1];
      }
    }
    if (bitten.size > 50) bitten = new Set();
    return input;
  };
}

// ---------------------------------------------------------------------------
// IV · THE PAINTED LINE: read each line ahead, lean to the one that stays
// open longest, paint what is drawn on your own line, jump the sweeps.

export function paintedLinePolicy(mind, { lanes = [-2.4, 0, 2.4] } = {}) {
  let target = 1;
  let jumpHold = 0;
  return (piece, dt) => {
    const S = mind.S;
    const input = blankInput();
    const body = piece.body;
    const at = piece.at;
    const speed = Math.max(1, piece.speed);
    jumpHold = Math.max(0, jumpHold - dt);
    if (piece.service) {
      input.x = body.x > -3.2 ? -1 : 0;
      if (piece.service.ready && body.x < -2.7 && body.grounded) { input.jump = true; jumpHold = 0.4; }
      input.jumpHeld = jumpHold > 0;
      return input;
    }
    const horizon = 75;
    // When does each line first become impassable (in metres ahead)?
    const blockedAt = (lane) => {
      let first = horizon;
      for (const b of piece.barriers) if (b.lane === lane && b.d1 > at && b.d0 - at < first) first = Math.max(0, b.d0 - at);
      for (const w of piece.words) if (w.lane === lane && w.d1 > at && (w.lead - w.left) >= S.react && w.d0 - at < first) first = Math.max(0, w.d0 - at);
      for (const g of piece.ghosts) if (!g.passed && g.lane === lane && (g.lead - g.left) >= S.react) {
        const meet = (g.dist - at) * (speed / (speed + 11 * 0.82));
        if (meet < first) first = Math.max(0, meet);
      }
      for (const c of piece.crossings) {
        if (c.d1 < at || c.d0 - at > horizon) continue;
        const t0 = (c.d0 - at) / speed; const t1 = (c.d1 - at) / speed;
        let ok = true;
        for (let t = t0; t <= t1 + 0.01; t += 0.05) if (!piece.plankOut(lane, t)) ok = false;
        if (!ok && c.d0 - at < first) first = Math.max(0, c.d0 - at);
      }
      // A drawn stretch on another line counts only if there is no time to paint it once there.
      if (lane !== piece.trainLane) for (const g of piece.gaps) if (g.lane === lane && g.d1 > at && g.painted < g.d1 - g.d0 && g.d0 - at < 6 && g.d0 - at < first) first = Math.max(0, g.d0 - at);
      return first;
    };
    if (!mind.blind) {
      const scores = [0, 1, 2].map((lane) => {
        const room = blockedAt(lane);
        const move = Math.abs(lanes[lane] - body.x) / 6.6 * speed;
        let score = room - move * 0.6 - Math.abs(lane - piece.trainLane) * 2 - (lane === target ? 0 : 3);
        for (const g of piece.gaps) if (g.lane === lane && g.d1 > at && g.d0 - at < 40 && g.painted < g.d1 - g.d0) score -= 4;
        return { lane, score, room };
      });
      scores.sort((a, b) => b.score - a.score);
      target = scores[0].lane;
    }
    const want = lanes[target];
    const dx = want - body.x;
    // Paint the drawn stretch on this line once it is in reach (and the lean is done).
    const gap = piece.gaps.find((g) => g.lane === piece.trainLane && g.d1 > at && g.painted < g.d1 - g.d0 && g.d0 - at < 15.5);
    const steering = Math.abs(dx) > 0.35;
    if (gap && !steering) input.actHeld = true;
    else input.x = Math.abs(dx) > 0.12 ? clamp(dx / 0.5, -1, 1) : 0;
    if (gap && steering && gap.d0 - at < 4) input.actHeld = true;
    // Jump his low sweeps.
    for (const w of piece.sweeps) if (w.lead - w.left >= S.react && body.grounded && w.left > 0.04 && w.left < 0.16 + mind.jitter(1.5)) { input.jump = true; jumpHold = 0.4; }
    input.jumpHeld = jumpHold > 0 || input.jump;
    return input;
  };
}

// ---------------------------------------------------------------------------
// The bot: one mind, the policy for whichever piece it is given.

const POLICIES = {
  'roof-run': roofRunPolicy,
  'return-to-sender': returnToSenderPolicy,
  'on-the-bell': rooftopPolicy,
  'bell-tower': (mind) => towerPolicy(mind, { ledges: TOWER_LEDGES, swings: TOWER_SWINGS }),
  'false-claims': falseClaimsPolicy,
  standoff: standoffPolicy,
  'painted-line': (mind) => paintedLinePolicy(mind),
};

export function registerPolicy(id, policy) { POLICIES[id] = policy; }

export function createPieceBot({ skill = 'skilled', seed = 5 } = {}) {
  const mind = createBotMind({ skill, seed });
  const policies = new Map();
  return {
    mind,
    get skill() { return mind.S.id; },
    decide(piece, dt) {
      mind.tick(dt);
      if (!policies.has(piece)) { policies.clear(); policies.set(piece, (POLICIES[piece.id] ?? (() => () => blankInput()))(mind)); }
      return policies.get(piece)(piece, dt);
    },
  };
}

// Play one piece to its end (or maxSeconds). Returns what a playtest note
// would: time, deaths, hits, the segments' times, and whether it finished.
export function simulatePiece({ runner, bot, maxSeconds = 600, dt = 1 / 60, onEvent = null } = {}) {
  const segments = [];
  let finished = false;
  let time = 0;
  while (time < maxSeconds && !finished) {
    const input = bot.decide(runner.piece, dt);
    const events = runner.step(dt, input);
    time += dt;
    for (const e of events) {
      onEvent?.(e, runner, time);
      if (e.type === 'segment-cleared') segments.push({ index: e.index, at: +time.toFixed(1) });
      if (e.type === 'finished') finished = true;
    }
  }
  return { finished, time: +time.toFixed(1), deaths: runner.deaths, hits: runner.hits, segments, stats: runner.piece.stats };
}
