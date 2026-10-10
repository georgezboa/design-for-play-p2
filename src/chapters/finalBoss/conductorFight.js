// Chapter 6 · ALL WORLDS AT ONCE — the fight kernel (round 11).
//
// George's round 11 note: the boss was boring; it should test execution like
// Split Fiction's boss fights, all four movements restructured. Each movement
// is now a short set piece of three phases (movements/*.js). This file is
// what they share, pure (no three.js, no DOM), so node drives the whole fight
// (tests/finalBoss/round11*.test.mjs) and the stage only draws it:
//
//   FIGHT_BODY / stepBody   Butch's walk, jump and dash: the same numbers the
//                           stage used, one implementation for both.
//   attacks                 every hazard is a telegraphed shape (a drop, a
//                           zone, a wave, a sweep or a train) that warns for
//                           `tele` seconds, then strikes. Its hit test is
//                           generous to Butch (a small hurt radius, a forgiving
//                           edge), and `timeToHit` lets the bot and the
//                           respawn search read it the way a player does.
//   createPhaseTrack        the movement's 100 points of ticket, split into
//                           phases. Damage stops at a phase's floor, so every
//                           phase is played; the floor is its checkpoint.
//   createFightRunner       one movement in play: body + director + layers.
//                           A torn last layer is a checkpoint restart: on
//                           NORMAL the phase begins again (his ticket back to
//                           the phase's start, earlier phases kept), on STORY
//                           nothing is undone.
//
// STORY keeps every pattern, slower and thinner (fightTuning): telegraphs
// ×1.4, flights ×1.3, gaps ×1.35, windows ×1.5, attacks marked `extra` left
// out, a smaller hurt radius and a longer clear jump.

import { DEFAULT_DIFFICULTY, STORY_OFFER_AFTER, createDeathLedger, difficultyPreset } from './finaleModel.js';

// ---------------------------------------------------------------------------
// Butch

export const FIGHT_BODY = Object.freeze({
  speed: 6.3,
  dashSpeed: 16,
  dashTime: 0.18,
  dashCooldown: 0.72,
  // Dash i-frames: long enough to pass through a wave or a sweep's band,
  // never long enough to pass through a train or a flood.
  dashInv: 0.26,
  jumpSpeed: 8.7,
  gravity: 22,
  hurtRadius: 0.34,
  hitInv: 0.95,
});

export const FIGHT_BOUNDS = Object.freeze({ minX: -13.2, maxX: 13.2, minZ: -7.35, maxZ: 8.2 });

export function createBody({ x = 0, z = 6.1, layers = 4 } = {}) {
  return {
    x, y: 0, z, vy: 0, grounded: true, facingX: 0, facingZ: -1,
    inv: 1, respawnInv: 0, hitTimer: 0, dash: 0, dashCd: 0, attack: 0,
    hp: layers, maxHp: layers, respawns: 0, color: 0, speedScale: 1,
    moving: false,
  };
}

export function startJump(body) {
  if (!body.grounded) return false;
  body.vy = FIGHT_BODY.jumpSpeed;
  body.grounded = false;
  return true;
}

export function startDash(body) {
  if (body.dashCd > 0) return false;
  body.dash = FIGHT_BODY.dashTime;
  body.dashCd = FIGHT_BODY.dashCooldown;
  body.inv = Math.max(body.inv, FIGHT_BODY.dashInv);
  return true;
}

// One step of walking, dashing and falling. `input.dx/dz` in -1..1 (a stick
// may be partial); `constrain(from, to)` lets a movement keep Butch out of a
// wall or off a gap edge. Returns { landed } (a jump came down this step).
export function stepBody(body, input, dt, { bounds = FIGHT_BOUNDS, constrain = null } = {}) {
  const wasGrounded = body.grounded;
  body.inv = Math.max(0, body.inv - dt);
  body.respawnInv = Math.max(0, body.respawnInv - dt);
  body.hitTimer = Math.max(0, body.hitTimer - dt);
  body.dash = Math.max(0, body.dash - dt);
  body.dashCd = Math.max(0, body.dashCd - dt);
  body.attack = Math.max(0, body.attack - dt);
  let dx = Number(input?.dx) || 0;
  let dz = Number(input?.dz) || 0;
  const mag = Math.hypot(dx, dz);
  if (mag > 1) { dx /= mag; dz /= mag; }
  const moving = mag > 0.05;
  if (moving) { const m = Math.hypot(dx, dz); body.facingX = dx / m; body.facingZ = dz / m; }
  body.moving = moving;
  const speed = body.dash > 0 ? FIGHT_BODY.dashSpeed : FIGHT_BODY.speed * (body.speedScale ?? 1);
  // A dash with no direction held goes the way Butch faces.
  const mx = body.dash > 0 && !moving ? body.facingX : dx;
  const mz = body.dash > 0 && !moving ? body.facingZ : dz;
  let nx = Math.min(bounds.maxX, Math.max(bounds.minX, body.x + mx * speed * dt));
  let nz = Math.min(bounds.maxZ, Math.max(bounds.minZ, body.z + mz * speed * dt));
  if (constrain) ({ x: nx, z: nz } = constrain({ x: body.x, z: body.z }, { x: nx, z: nz }, body));
  body.x = nx;
  body.z = nz;
  body.vy -= FIGHT_BODY.gravity * dt;
  body.y += body.vy * dt;
  if (body.y <= 0) { body.y = 0; body.vy = 0; body.grounded = true; } else body.grounded = false;
  return { landed: !wasGrounded && body.grounded };
}

// ---------------------------------------------------------------------------
// Difficulty: STORY keeps the patterns, slower and thinner.

export function fightTuning(difficulty = DEFAULT_DIFFICULTY) {
  const p = difficultyPreset(difficulty);
  return Object.freeze({
    id: p.id,
    tele: p.teleScale,
    flight: p.flightScale,
    tempo: p.tempo,
    window: p.windowScale,
    thin: p.thin,
    hurt: p.hurtScale,
    jumpClear: p.jumpClear,
    rollback: p.rollback,
    layers: p.layers,
    respawnInv: p.respawnInv,
  });
}

// Deterministic "random" (mulberry32): a movement plays the same for a seed.
export function createRng(seed = 1) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  next.range = (lo, hi) => lo + (hi - lo) * next();
  next.pick = (list) => list[Math.floor(next() * list.length) % list.length];
  next.sign = () => (next() < 0.5 ? -1 : 1);
  return next;
}

export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export function segmentDistance(px, pz, ax, az, bx, bz) {
  const dx = bx - ax;
  const dz = bz - az;
  const len2 = dx * dx + dz * dz || 1;
  const t = clamp(((px - ax) * dx + (pz - az) * dz) / len2, 0, 1);
  return Math.hypot(px - (ax + dx * t), pz - (az + dz * t));
}

// ---------------------------------------------------------------------------
// Attacks
//
// Every attack has: id, kind, source (a HIT_SOURCES key), tele (seconds of
// warning before it strikes), live (seconds it stays dangerous after),
// jumpable (a clear jump passes over it), extra (left out on STORY), and
// its shape. `age` counts from the spawn; state is tele → live → done.
//
//   drop   { x, z, r }              falls on a circle (a case, a bench, paint)
//   zone   { x0, x1, z0, z1 }       a rectangle (a stamp, a beam lane, a flood)
//   wave   { x, z, speed, width, r0, maxR }   a ring that spreads from x, z
//   sweep  { axis, from, to, speed, width, lo, hi }  a band that travels
//                                    along `axis` ('x' or 'z') from → to,
//                                    spanning lo..hi on the other axis
//   train  { seam, along, dir, speed, length, halfWidth, start, end, ghost }
//          a body running down a seam (seam 'z': along x at z = along;
//          seam 'x': along z at x = along)

let attackSerial = 0;

export function makeAttack(spec) {
  const a = { ...spec };
  a.id = spec.id ?? `atk-${(attackSerial += 1)}`;
  a.source = spec.source ?? 'hit';
  a.tele = Math.max(0, Number(spec.tele ?? 1) || 0);
  a.live = Math.max(0, Number(spec.live ?? 0) || 0);
  a.jumpable = Boolean(spec.jumpable);
  a.extra = Boolean(spec.extra);
  a.meta = spec.meta ?? {};
  a.age = 0;
  a.state = a.tele > 0 ? 'tele' : 'live';
  a.hitDone = false;
  if (a.kind === 'wave') { a.r0 ??= 0; a.r = a.r0; }
  if (a.kind === 'sweep') a.pos = a.from;
  if (a.kind === 'train') a.pos = a.start;
  return a;
}

// How long a moving attack is live: until it has run its course.
function travelTime(a) {
  if (a.kind === 'wave') return Math.max(0, (a.maxR - a.r0) / a.speed);
  if (a.kind === 'sweep') return Math.abs(a.to - a.from) / a.speed;
  if (a.kind === 'train') return Math.abs(a.end - a.start) / a.speed;
  return a.live;
}

// Advance one attack by dt. Returns 'struck' on the step it turns live,
// 'done' on the step it ends, otherwise null.
export function stepAttack(a, dt) {
  if (a.state === 'done') return null;
  a.age += dt;
  const liveFor = a.age - a.tele;
  if (liveFor < 0) return null;
  const struck = a.state === 'tele';
  a.state = 'live';
  if (a.kind === 'wave') a.r = a.r0 + a.speed * liveFor;
  if (a.kind === 'sweep') a.pos = a.from + Math.sign(a.to - a.from) * Math.min(Math.abs(a.to - a.from), a.speed * liveFor);
  if (a.kind === 'train') a.pos = a.start + a.dir * Math.min(Math.abs(a.end - a.start), a.speed * liveFor);
  // The strike is always its own step (a landing is seen and tested once
  // before an instant attack ends).
  if (struck) return 'struck';
  if (liveFor >= travelTime(a)) { a.state = 'done'; return 'done'; }
  return null;
}

// Train body as a segment (head leads in `dir`).
export function trainSegment(a) {
  const head = a.pos;
  const tail = a.pos - a.dir * a.length;
  return a.seam === 'z'
    ? { ax: tail, az: a.along, bx: head, bz: a.along }
    : { ax: a.along, az: tail, bx: a.along, bz: head };
}

// Is (x, z) inside the attack's live shape, for a body of radius r?
// Every edge is forgiving: Butch must be clearly inside to be hit.
export function shapeCovers(a, x, z, r = FIGHT_BODY.hurtRadius) {
  // A shelter (a lit billboard) makes a point safe from this attack.
  if (typeof a.safeAt === 'function' && a.safeAt(x, z)) return false;
  switch (a.kind) {
    case 'drop': return Math.hypot(x - a.x, z - a.z) < a.r + r * 0.25;
    case 'zone': return x > a.x0 + r * 0.5 && x < a.x1 - r * 0.5 && z > a.z0 + r * 0.5 && z < a.z1 - r * 0.5;
    case 'wave': {
      const d = Math.hypot(x - a.x, z - a.z);
      return Math.abs(d - a.r) < a.width / 2 + r * 0.6;
    }
    case 'sweep': {
      const along = a.axis === 'x' ? x : z;
      const across = a.axis === 'x' ? z : x;
      return Math.abs(along - a.pos) < a.width / 2 + r * 0.6 && across >= a.lo && across <= a.hi;
    }
    case 'train': {
      const s = trainSegment(a);
      return segmentDistance(x, z, s.ax, s.az, s.bx, s.bz) < a.halfWidth + r * 0.5;
    }
    default: return false;
  }
}

// Does the attack hit this body now? (live, not yet spent on Butch, the
// body not invulnerable, a jumpable attack only while he is low).
export function attackHits(a, body, tuning = fightTuning()) {
  // A proxy only draws (and warns the bot about) a hazard its movement
  // resolves itself, such as Movement II's beams on the off-beat.
  if (a.state !== 'live' || a.hitDone || a.harmless || a.proxy) return false;
  if (a.kind === 'drop' && a.live === 0 && a.age - a.tele > 1 / 20) return false; // a landing is one instant (one frame at 20 fps)
  if (a.jumpable && body.y > tuning.jumpClear) return false;
  if (a.kind === 'drop' && !a.jumpable && body.y > 2.2) return false;
  return shapeCovers(a, body.x, body.z, FIGHT_BODY.hurtRadius * tuning.hurt);
}

// Seconds until the attack would hit a body standing still at (x, z), or
// Infinity. Used by the bot (it reads telegraphs the way a player does) and
// by the respawn search. `margin` widens the shape a little for caution.
export function timeToHit(a, x, z, margin = 0.4) {
  if (a.state === 'done' || a.hitDone || a.harmless) return Infinity;
  if (typeof a.safeAt === 'function' && a.safeAt(x, z)) return Infinity;
  const r = FIGHT_BODY.hurtRadius + margin;
  const untilLive = Math.max(0, a.tele - a.age);
  switch (a.kind) {
    case 'drop': {
      if (Math.hypot(x - a.x, z - a.z) >= a.r + r) return Infinity;
      if (a.state === 'live' && a.live === 0 && a.age - a.tele > 1 / 20) return Infinity;
      if (a.state === 'live' && a.age - a.tele > a.live) return Infinity;
      return untilLive;
    }
    case 'zone': {
      if (!(x > a.x0 - r && x < a.x1 + r && z > a.z0 - r && z < a.z1 + r)) return Infinity;
      if (a.state === 'live' && a.age - a.tele > a.live) return Infinity;
      return untilLive;
    }
    case 'wave': {
      const d = Math.hypot(x - a.x, z - a.z);
      if (d > a.maxR + r) return Infinity;
      const rNow = a.state === 'live' ? a.r : a.r0;
      if (rNow - a.width / 2 > d + r) return Infinity;
      return untilLive + Math.max(0, (d - r - a.width / 2 - rNow) / a.speed);
    }
    case 'sweep': {
      const along = a.axis === 'x' ? x : z;
      const across = a.axis === 'x' ? z : x;
      if (across < a.lo - r || across > a.hi + r) return Infinity;
      const dir = Math.sign(a.to - a.from) || 1;
      const pos = a.state === 'live' ? a.pos : a.from;
      const ahead = (along - pos) * dir;
      if (ahead < -(a.width / 2 + r)) return Infinity;
      if ((along - a.to) * dir > a.width / 2 + r) return Infinity;
      return untilLive + Math.max(0, (ahead - a.width / 2 - r) / a.speed);
    }
    case 'train': {
      const across = a.seam === 'z' ? z : x;
      const along = a.seam === 'z' ? x : z;
      if (Math.abs(across - a.along) > a.halfWidth + r) return Infinity;
      const pos = a.state === 'live' ? a.pos : a.start;
      const ahead = (along - pos) * a.dir;
      if (ahead < -(a.length + r)) return Infinity;
      if ((along - a.end) * a.dir > r) return Infinity;
      return untilLive + Math.max(0, (ahead - r) / a.speed);
    }
    default: return Infinity;
  }
}

// How long the attack keeps (x, z) dangerous once it arrives (for the bot).
export function dangerSpan(a) {
  if (a.kind === 'drop' || a.kind === 'zone') return Math.max(0.12, a.live);
  if (a.kind === 'train') return a.length / a.speed + 0.15;
  return (a.width + FIGHT_BODY.hurtRadius * 2) / a.speed + 0.05;
}

// The worst attack for a point: the soonest hit, and whether a jump clears it.
export function threatAt(attacks, x, z, { margin = 0.4 } = {}) {
  let soonest = Infinity;
  let jumpable = true;
  for (const a of attacks) {
    const t = timeToHit(a, x, z, margin);
    if (t < soonest) { soonest = t; jumpable = a.jumpable; } else if (t === soonest && !a.jumpable) jumpable = false;
  }
  return { t: soonest, jumpable };
}

// ---------------------------------------------------------------------------
// The phase track: the movement's ticket, split into phases. Damage stops at
// the current phase's floor; reaching it clears the phase. The floor is
// also the checkpoint: a NORMAL restart puts the ticket back at the phase's
// start, never past it.

export function createPhaseTrack(phases, { hp = phases[0]?.from ?? 100 } = {}) {
  if (!Array.isArray(phases) || !phases.length) throw new Error('phase track: no phases');
  phases.forEach((phase, index) => {
    if (!(phase.from > phase.to)) throw new Error(`phase track: ${phase.id} must fall`);
    if (index > 0 && phases[index - 1].to !== phase.from) throw new Error(`phase track: ${phase.id} must start where ${phases[index - 1].id} ends`);
  });
  let index = Math.max(0, phases.findIndex((phase) => hp <= phase.from && hp > phase.to));
  let value = hp;
  return {
    get hp() { return value; },
    get index() { return index; },
    get phase() { return phases[index]; },
    get last() { return index === phases.length - 1; },
    get floor() { return phases[index].to; },
    get count() { return phases.length; },
    phases,
    // { dealt, cleared } — `dealt` never takes the ticket past the floor.
    damage(amount) {
      const want = Math.max(0, Number(amount) || 0);
      const dealt = Math.min(want, value - phases[index].to);
      value -= dealt;
      return { dealt, cleared: value <= phases[index].to + 1e-9 };
    },
    // Move on to the next phase (after a cleared one). False after the last.
    advance() {
      if (index >= phases.length - 1) return false;
      index += 1;
      value = phases[index].from;
      return true;
    },
    // The checkpoint: back to the phase's start (NORMAL) or kept (STORY).
    restart(rollback = 'phase') {
      if (rollback === 'phase') value = phases[index].from;
      return value;
    },
    jump(to) {
      index = clamp(Math.round(to), 0, phases.length - 1);
      value = phases[index].from;
    },
    progress() { const p = phases[index]; return (p.from - value) / (p.from - p.to); },
  };
}

// ---------------------------------------------------------------------------
// A director's shared toolkit: game-time timers, an attack list, the phase
// track and the phase interlude. Each movement module builds on it.
//
// States: 'intro' (the movement opens; nothing is thrown) → 'teach' (the
// phase's first attack, slow and alone, teaching its counter by doing) →
// 'fight' (the phase's loop) → 'interlude' (a cleared phase: he staggers,
// the arena changes, nothing can hit) → the next phase's 'teach'… After the
// last phase: 'finisher' (the movement's closing move) → 'done'.

export const INTRO_SECONDS = 2.2;
export const INTERLUDE_SECONDS = 2.6;

export function createDirectorBase({ phases, difficulty = DEFAULT_DIFFICULTY, seed = 7, startPhase = 0 } = {}) {
  let tuning = fightTuning(difficulty);
  const track = createPhaseTrack(phases);
  if (startPhase) track.jump(startPhase);
  const rng = createRng(seed);
  const base = {
    tuning,
    track,
    rng,
    attacks: [],
    events: [],
    timers: [],
    clock: 0,
    state: 'intro',
    stateAge: 0,
    taught: new Set(),
    beat: 0,
    beatClock: INTRO_SECONDS,
    setDifficulty(id) { tuning = fightTuning(id); base.tuning = tuning; },
    emit(event) { base.events.push(event); return event; },
    // Scale a telegraph / a flight / a gap / a window by the difficulty.
    tele: (s) => s * tuning.tele,
    flight: (s) => s * tuning.flight,
    gap: (s) => s * tuning.tempo,
    win: (s) => s * tuning.window,
    spawn(spec) {
      if (spec.extra && tuning.thin) return null;
      const a = makeAttack(spec);
      base.attacks.push(a);
      base.emit({ type: 'telegraph', attack: a });
      return a;
    },
    after(seconds, fn, tag = null) { base.timers.push({ at: base.clock + Math.max(0, seconds), fn, tag }); },
    cancelTimers(tag = null) { base.timers = tag ? base.timers.filter((t) => t.tag !== tag) : []; },
    clearAttacks() {
      base.attacks.forEach((a) => base.emit({ type: 'remove', attack: a }));
      base.attacks = [];
    },
    teaching: false,
    setState(state) { base.state = state; base.stateAge = 0; base.teaching = false; base.emit({ type: 'state', state }); },
    // Step timers and attacks; resolve hits on the body. Returns nothing:
    // results go to base.events.
    stepCore(dt, body) {
      base.clock += dt;
      base.stateAge += dt;
      const due = base.timers.filter((t) => t.at <= base.clock).sort((a, b) => a.at - b.at);
      base.timers = base.timers.filter((t) => t.at > base.clock);
      due.forEach((t) => t.fn());
      for (const a of base.attacks) {
        const change = stepAttack(a, dt);
        if (change === 'struck') base.emit({ type: 'strike', attack: a });
        if (body && attackHits(a, body, tuning)) {
          a.hitDone = true;
          base.emit({ type: 'hit', source: a.source, attack: a, from: attackOrigin(a, body) });
        }
        if (change === 'done') base.emit({ type: 'remove', attack: a });
      }
      base.attacks = base.attacks.filter((a) => a.state !== 'done');
    },
    // Deal damage to his ticket. Returns what was dealt (0 at the floor).
    damage(amount, cause, extra = {}) {
      if (base.state === 'interlude' || base.state === 'done') return 0;
      const { dealt, cleared } = track.damage(amount);
      if (dealt > 0) base.emit({ type: 'damage', amount: dealt, cause, ...extra });
      if (cleared) base.phaseCleared();
      return dealt;
    },
    phaseCleared() {
      base.clearAttacks();
      base.cancelTimers();
      if (track.last) {
        base.setState('finisher');
        base.emit({ type: 'phase-cleared', index: track.index, last: true });
        return;
      }
      base.emit({ type: 'phase-cleared', index: track.index, last: false });
      base.setState('interlude');
      base.after(INTERLUDE_SECONDS, () => {
        track.advance();
        base.beat = 0;
        base.emit({ type: 'phase', index: track.index, phase: track.phase });
        base.setState('teach');
      }, 'interlude');
    },
    // Dangers for a point (bot, respawn).
    threatAt: (x, z, options) => threatAt(base.attacks, x, z, options),
    // A safe place to stand up again after a torn last layer.
    safeSpot(candidates, extraClear = () => 99) {
      let best = null;
      for (const [x, z] of candidates) {
        const t = threatAt(base.attacks, x, z, { margin: 1.2 }).t;
        const score = Math.min(t, 9) + Math.min(extraClear(x, z), 3);
        if (!best || score > best.score) best = { x, z, score };
      }
      return best ?? { x: 0, z: 5 };
    },
    snapshotCore() {
      return {
        state: base.state, clock: +base.clock.toFixed(2), hp: +track.hp.toFixed(2), phase: track.index, phaseId: track.phase.id, phaseName: track.phase.name,
        attacks: base.attacks.map((a) => ({ id: a.id, kind: a.kind, source: a.source, state: a.state, age: +a.age.toFixed(2), tele: +a.tele.toFixed(2) })),
      };
    },
  };
  return base;
}

// The movement's script, one step: intro → teach (its `teach` runs once on
// entry; `teachDone` moves on) → fight (the phase's `loop` of beats, each
// returning the gap to the next, tightening a little as the phase's ticket
// falls) → interlude (kernel) → … → finisher (`finisherSeconds`, then
// 'finished') → done. `scripts` maps phase ids to { teach, teachDone, loop }.
export function driveScript(d, dt, body, scripts, { movement = 0, finisherSeconds = 1.3, squeeze = 0.16 } = {}) {
  const script = scripts[d.track.phase.id];
  if (d.state === 'intro' && d.stateAge >= INTRO_SECONDS) d.setState('teach');
  if (d.state === 'teach' && !d.teaching) {
    d.teaching = true;
    script.teach(body);
  } else if (d.state === 'teach' && script.teachDone(body)) {
    d.taught.add(d.track.phase.id);
    d.setState('fight');
    d.beat = 0;
    d.beatClock = 0.9;
  } else if (d.state === 'fight' && script.loop?.length) {
    d.beatClock -= dt;
    if (d.beatClock <= 0) {
      const loop = script.loop;
      const gap = loop[d.beat % loop.length](body);
      d.beat += 1;
      d.beatClock = d.gap(gap) * (1 - squeeze * d.track.progress());
    }
  } else if (d.state === 'finisher' && finisherSeconds !== null && d.stateAge >= finisherSeconds) {
    d.emit({ type: 'finished', movement });
    d.setState('done');
  }
}

// After a torn last layer: the phase starts again from its loop (what it
// taught stays taught), after a breather.
export function restartPhase(d, rollback, { breather = 2.4 } = {}) {
  d.clearAttacks();
  // A cleared phase's interlude carries on (nothing can tear a layer then).
  if (d.state === 'interlude') { d.timers = d.timers.filter((t) => t.tag === 'interlude'); return; }
  d.cancelTimers();
  d.track.restart(rollback);
  if (d.state !== 'finisher' && d.state !== 'done') {
    d.taught.add(d.track.phase.id);
    d.setState('fight');
    d.beat = 0;
    d.beatClock = breather;
  }
}

function attackOrigin(a, body) {
  if (a.kind === 'drop' || a.kind === 'wave') return { x: a.x, z: a.z };
  if (a.kind === 'zone') return { x: (a.x0 + a.x1) / 2, z: (a.z0 + a.z1) / 2 };
  if (a.kind === 'sweep') return a.axis === 'x' ? { x: a.pos, z: body.z } : { x: body.x, z: a.pos };
  if (a.kind === 'train') { const s = trainSegment(a); return { x: s.ax, z: s.az }; }
  return null;
}

// ---------------------------------------------------------------------------
// One movement in play: Butch's body and layers, the movement's director,
// the death ledger. The stage feeds it input and draws what it reports; the
// node tests and the bot drive it the same way.
//
// input: { dx, dz, jump, dash, act (pressed this step), actHeld, retHeld,
//          aim: { x, z } | null (the mouse / right stick on the floor) }

export function createFightRunner({ director, difficulty = DEFAULT_DIFFICULTY, ledger = createDeathLedger(), movement = 0, spawn = { x: 0, z: 6.1 } } = {}) {
  let tuning = fightTuning(difficulty);
  const body = createBody({ ...spawn, layers: tuning.layers });
  let difficultyId = tuning.id;
  const runner = {
    body,
    director,
    ledger,
    movement,
    get difficulty() { return difficultyId; },
    get tuning() { return tuning; },
    deaths: 0,
    hits: 0,
    time: 0,
    setDifficulty(id) {
      tuning = fightTuning(id);
      difficultyId = tuning.id;
      body.maxHp = tuning.layers;
      body.hp = body.maxHp;
      director.setDifficulty?.(id);
    },
    // One step. Returns the director's events plus the runner's own:
    // { type: 'hurt', source, from, layersLeft }, { type: 'death', ... }.
    step(dt, input = {}) {
      runner.time += dt;
      const out = [];
      if (input.jump && director.allowJump?.(body) !== false && startJump(body)) out.push({ type: 'jump' });
      if (input.dash && startDash(body)) out.push({ type: 'dash' });
      const { landed } = stepBody(body, input, dt, { constrain: director.constrain ?? null });
      if (landed) out.push({ type: 'land' });
      const events = director.update(dt, body, input);
      for (const event of events) {
        out.push(event);
        if (event.type === 'hit') {
          const hurt = runner.hurt(event);
          if (hurt) out.push(...hurt);
        }
      }
      return out;
    },
    // A hit (from an attack, a fall or a hole). Returns the events it caused.
    hurt({ source = 'hit', from = null, force = false } = {}) {
      if ((!force && body.inv > 0) || (force && body.respawnInv > 0)) return null;
      body.hp -= 1;
      body.inv = FIGHT_BODY.hitInv;
      body.hitTimer = 0.38;
      runner.hits += 1;
      const spilled = body.color;
      director.onHurt?.(body, source);
      const out = [{ type: 'hurt', source, from, layersLeft: body.hp, spilled }];
      if (body.hp <= 0) out.push(runner.die(source));
      return out;
    },
    // The last layer torn: the phase checkpoint.
    die(source) {
      runner.deaths += 1;
      const before = director.track.hp;
      const result = director.checkpoint(tuning.rollback, body);
      body.hp = body.maxHp;
      body.x = result.x; body.z = result.z; body.y = 0; body.vy = 0; body.grounded = true;
      body.color = 0;
      body.dash = 0; body.dashCd = 0; body.attack = 0;
      body.respawns += 1;
      body.respawnInv = tuning.respawnInv;
      body.inv = Math.max(body.inv, body.respawnInv);
      const record = ledger.record(movement, difficultyId);
      return {
        type: 'death', source, x: result.x, z: result.z, hpBefore: before, hpAfter: director.track.hp,
        rolledBack: director.track.hp > before + 1e-9, phase: director.track.index, offerStory: record.offerStory, deaths: record.deaths,
      };
    },
  };
  return runner;
}

export { STORY_OFFER_AFTER };
