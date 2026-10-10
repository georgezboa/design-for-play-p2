// Movement III · ECHO CITY — two true things (round 11).
//
// The argument about Mara, played out on the terrace over the square. Each
// exchange (echoExchanges.js) is one round of it:
//   his claim     voiced; while he says it he THROWS his two misreadings
//                 (the exchange's false facts, each on a paper tag) at
//                 Butch: civic props that crack the terrace where they land.
//                 Dodge them; one that hits answers you from the record.
//   two true things  the exchange's true facts come down from the lamps as
//                 lit record cards, far apart. Strike one (E) and Butch
//                 holds it; strike the other within PAIR_S and he says both
//                 at once: the voiced answer that holds both lands, and he
//                 staggers. Hold only one and the window closes: Butch says
//                 the half answer, the Conductor files it, and the exchange
//                 comes back later.
//
//   Phase 1 THE CLAIM         (100 → 64) two exchanges.
//   Phase 2 ECHOES            (64 → 28) every throw is echoed: a second one
//                             lands a beat later where Butch stood; his
//                             benches send a low ring across the stones
//                             (jump it). Two exchanges.
//   Phase 3 THE SQUARE FALLS  (28 → 0) the back of the terrace falls away
//                             row by row (its crumbling edge warns; being
//                             overtaken costs a layer); the true things drift.
// A misreading cracks the terrace where it lands: the crack is an obstacle
// Butch walks round, so the square closes in as the argument goes on. After the
//                             last pair he has no answer: the front edge
//                             lights, the collapse runs, and E there says it
//                             to his face. Then the fall into the Painted
//                             Country.

import { FIGHT_BOUNDS, clamp, createDirectorBase, driveScript, restartPhase } from '../conductorFight.js';
import { ECHO_EXCHANGES } from '../echoExchanges.js';

export const ECHO_PHASES = Object.freeze([
  Object.freeze({ id: 'the-claim', name: 'THE CLAIM', from: 100, to: 64 }),
  Object.freeze({ id: 'echoes', name: 'ECHOES', from: 64, to: 28 }),
  Object.freeze({ id: 'the-square-falls', name: 'THE SQUARE FALLS', from: 28, to: 0 }),
]);

export const PAIR_DAMAGE = 18;
export const SAID_DAMAGE = 10;
export const PAIR_S = 3.2;
export const TRUTH_LIFE_S = 8.5;
export const TRUTH_REACH = 2.4;
export const FRONT_EDGE_Z = -3.4;
export const PROP_FLIGHT_S = 1.25;
export const PROP_R = 1.35;
export const HOLE_R = 1.3;
export const MAX_HOLES = 8;
export const COLLAPSE = Object.freeze({ creep: 0.16, run: 1.5, stopAt: FRONT_EDGE_Z + 1.4 });
export const ECHO_DEFLECT_FALLBACK = 'He files it unanswered. Try the true thing.';
const PROPS = Object.freeze(['crushed-trash-can', 'fountain-bench', 'pa-speaker']);
const B = FIGHT_BOUNDS;

// The argument's order: a deflected exchange goes to the back of the queue,
// a landed one is done. A NORMAL checkpoint unsays what the phase had said.
export function createArgument(exchanges = ECHO_EXCHANGES) {
  if (!exchanges.length) throw new Error('argument: no exchanges');
  exchanges.forEach((exchange) => {
    if (exchange.facts.filter((f) => f.holds).length !== 2) throw new Error(`argument: ${exchange.id} needs two true things`);
    if (exchange.replies.filter((r) => r.holdsBoth).length !== 1) throw new Error(`argument: ${exchange.id} needs one answer that holds both`);
  });
  let queue = exchanges.map((_, i) => i);
  const landed = [];
  const heard = new Set();
  return {
    next() {
      if (!queue.length) queue = exchanges.map((_, i) => i).filter((i) => !landed.includes(exchanges[i].id));
      if (!queue.length) queue = exchanges.map((_, i) => i);
      const exchange = exchanges[queue[0]];
      const returning = heard.has(exchange.id);
      heard.add(exchange.id);
      return { exchange, returning };
    },
    land(id) { const i = exchanges.findIndex((e) => e.id === id); queue = queue.filter((q) => q !== i); if (!landed.includes(id)) landed.push(id); },
    deflect(id) { const i = exchanges.findIndex((e) => e.id === id); queue = [...queue.filter((q) => q !== i), i]; },
    unsay(ids) {
      ids.forEach((id) => { const at = landed.indexOf(id); if (at >= 0) landed.splice(at, 1); });
      const front = ids.map((id) => exchanges.findIndex((e) => e.id === id)).filter((i) => i >= 0);
      queue = [...front, ...queue.filter((q) => !front.includes(q))];
    },
    get landed() { return [...landed]; },
    get queue() { return queue.map((i) => exchanges[i].id); },
  };
}

export function createEchoFight({ difficulty, seed = 23, startPhase = 0, exchanges = ECHO_EXCHANGES } = {}) {
  const d = createDirectorBase({ phases: ECHO_PHASES, difficulty, seed, startPhase });
  const argument = createArgument(exchanges);
  let current = null; // { exchange, stage, truths, held, heldAt, said, startedAt }
  let truths = [];
  const holes = [];
  let collapseZ = B.maxZ + 0.6;
  let collapseRate = 0;
  let frontLit = false;
  let landedThisPhase = [];
  let propSerial = 0;
  let pairs = 0;
  let halves = 0;
  let said = 0;

  const phaseId = () => d.track.phase.id;
  const echoes = () => d.track.index >= 1;
  const falling = () => d.track.index >= 2;

  // ------------------------------------------------------------ throws
  const throwProp = (x, z, { misread = null, flight = PROP_FLIGHT_S, echo = false, extra = false, r = PROP_R } = {}) => {
    const asset = PROPS[(propSerial += 1) % PROPS.length];
    const spot = { x: clamp(x, B.minX + 1, B.maxX - 1), z: clamp(z, B.minZ + 1, Math.min(B.maxZ - 1, collapseZ - 1)) };
    return d.spawn({
      kind: 'drop', source: echo ? 'echo' : asset, x: spot.x, z: spot.z, r: echo ? r * 0.85 : r, tele: d.flight(flight), live: 0, extra,
      meta: { prop: asset, echo, misread: misread?.id ?? null, text: misread?.text ?? null, rebut: misread?.rebut ?? null, record: misread?.source ?? null },
    });
  };
  const atBody = (body, spread = 0.6) => ({ x: body.x + d.rng.range(-spread, spread), z: body.z + d.rng.range(-spread, spread) });

  // ------------------------------------------------------------ truths
  const spotFor = (body, other = null) => {
    const minApart = d.track.index === 0 ? 7.5 : 10;
    for (let tries = 0; tries < 40; tries += 1) {
      const x = d.rng.range(B.minX + 1.6, B.maxX - 1.6);
      const z = d.rng.range(B.minZ + 1.2, Math.min(B.maxZ - 1.2, collapseZ - 2.6));
      if (Math.hypot(x - body.x, z - body.z) < 3) continue;
      if (other && Math.hypot(x - other.x, z - other.z) < minApart) continue;
      if (holes.some((h) => Math.hypot(x - h.x, z - h.z) < h.r + 1.2)) continue;
      return { x, z };
    }
    return { x: clamp(-body.x, B.minX + 2, B.maxX - 2), z: clamp(body.z - 3, B.minZ + 1.5, collapseZ - 2.6) };
  };
  const dealTruths = (body) => {
    const facts = current.exchange.facts.filter((f) => f.holds);
    const a = spotFor(body);
    const b = spotFor(body, a);
    const drift = falling() ? 1.0 : 0;
    truths = facts.map((fact, i) => {
      const spot = i === 0 ? a : b;
      const angle = d.rng.range(0, Math.PI * 2);
      return { id: `${current.exchange.id}:${fact.id}`, factId: fact.id, text: fact.text, record: fact.source, x: spot.x, z: spot.z, vx: Math.cos(angle) * drift, vz: Math.sin(angle) * drift, state: 'descending', age: 0, life: d.win(TRUTH_LIFE_S) };
    });
    d.emit({ type: 'truths', truths: truths.map((t) => ({ ...t })) });
  };

  // ------------------------------------------------------------ exchanges
  const open = (body) => {
    const { exchange, returning } = argument.next();
    current = { exchange, returning, stage: 'claim', held: null, heldAt: 0, startedAt: d.clock };
    truths = [];
    volleyClock = d.gap(3.2);
    d.emit({ type: 'say', cue: exchange.claim, meta: returning ? 'HE COMES BACK TO IT' : `EXCHANGE ${argument.landed.length + 1}`, kind: 'claim' });
    const misreads = exchange.facts.filter((f) => !f.holds);
    d.after(0.6, () => throwProp(atBody(body).x, atBody(body).z, { misread: misreads[0] }), 'exchange');
    d.after(1.4, () => { if (current?.stage === 'claim') { dealTruths(body); current.stage = 'open'; } }, 'exchange');
    d.after(2.1, () => throwProp(atBody(body).x, atBody(body).z, { misread: misreads[1] }), 'exchange');
  };
  const closeExchange = (stage, hold = 3) => {
    if (!current) return;
    current.stage = stage;
    d.cancelTimers('volley');
    d.after(hold, () => { current = null; }, 'exchange');
  };
  const landPair = () => {
    const { exchange } = current;
    const reply = exchange.replies.find((r) => r.holdsBoth);
    truths.forEach((t) => { t.state = 'thrown'; });
    pairs += 1;
    argument.land(exchange.id);
    landedThisPhase.push(exchange.id);
    d.emit({ type: 'pair', exchangeId: exchange.id, reply, truths: truths.map((t) => t.factId) });
    d.emit({ type: 'say', cue: reply.cue, kind: 'reply', holdsBoth: true });
    closeExchange('answered', d.track.index >= 2 ? 1.6 : 3.2);
    d.after(0.7, () => {
      // The last pair leaves him with no answer: run to the front edge.
      if (falling() && d.track.hp - PAIR_DAMAGE <= SAID_DAMAGE + 1e-9) {
        d.damage(d.track.hp - SAID_DAMAGE, 'two-true-things', { pair: true });
        noAnswer();
      } else d.damage(PAIR_DAMAGE, 'two-true-things', { pair: true });
    }, 'pair');
  };
  const halfAnswer = (why = 'half') => {
    const { exchange } = current;
    const reply = exchange.replies.find((r) => !r.holdsBoth);
    halves += 1;
    truths.forEach((t) => { if (t.state !== 'thrown') t.state = 'faded'; });
    argument.deflect(exchange.id);
    const line = why === 'none' ? ECHO_DEFLECT_FALLBACK : (reply.deflect ?? ECHO_DEFLECT_FALLBACK);
    if (why === 'half') d.emit({ type: 'say', cue: reply.cue, kind: 'reply', holdsBoth: false });
    d.emit({ type: 'say', cue: reply.rebut, kind: 'rebut' });
    d.emit({ type: 'deflected', exchangeId: exchange.id, line, why });
    closeExchange('deflected', 3);
    // The square answers a half answer with a volley.
    [0.4, 0.9].forEach((t, i) => d.after(t, () => { if (lastBody) throwProp(atBody(lastBody).x, atBody(lastBody).z, { extra: i === 1 }); }, 'exchange'));
  };
  const noAnswer = () => {
    frontLit = true;
    collapseRate = COLLAPSE.run;
    current = { exchange: current?.exchange ?? null, stage: 'no-answer', held: null };
    truths = [];
    d.emit({ type: 'no-answer' });
    // His last brush-off, thrown at the front edge.
    [0.8, 1.6].forEach((t, i) => d.after(t, () => { if (lastBody) throwProp(lastBody.x + (i ? 2 : -2), FRONT_EDGE_Z - 1.6, { extra: i === 1 }); }, 'finale'));
  };

  // ------------------------------------------------------------ the floor
  const inHole = (x, z, shrink = 0.82) => holes.find((h) => Math.hypot(x - h.x, z - h.z) < h.r * shrink) ?? null;
  const addHole = (x, z) => {
    if (holes.length >= MAX_HOLES) holes.shift();
    const hole = { x, z, r: HOLE_R + d.track.index * 0.08 };
    holes.push(hole);
    d.emit({ type: 'hole', x, z, r: hole.r });
  };
  const fallen = (z) => z > collapseZ;
  const rimOf = (hole, x, z) => {
    const dx = x - hole.x; const dz = z - hole.z; const m = Math.hypot(dx, dz) || 1;
    return { x: clamp(hole.x + (dx / m) * (hole.r + 0.05), B.minX, B.maxX), z: clamp(hole.z + (dz / m) * (hole.r + 0.05), B.minZ, collapseZ - 0.3) };
  };
  // A crack in the terrace, and the fallen back rows, are not walked into:
  // Butch keeps to the stone (he steps round a hole as he would round a
  // well). Only a throw landing on him, or the falling edge, costs a layer.
  const constrain = (from, to) => {
    let { x, z } = to;
    if (z > collapseZ - 0.3) z = Math.min(z, Math.max(from.z, collapseZ - 0.3));
    for (const hole of holes) {
      const dist = Math.hypot(x - hole.x, z - hole.z);
      if (dist < hole.r && Math.hypot(from.x - hole.x, from.z - hole.z) >= hole.r - 1e-6) ({ x, z } = rimOf(hole, x, z));
    }
    return { x, z };
  };

  // ------------------------------------------------------------ strike
  const act = (body) => {
    if (frontLit) {
      if (body.z <= FRONT_EDGE_Z) {
        frontLit = false;
        said += 1;
        body.attack = 0.26;
        d.emit({ type: 'act', result: 'said' });
        d.emit({ type: 'said' });
        d.damage(SAID_DAMAGE, 'said-to-his-face');
        return null;
      }
      return d.emit({ type: 'act', result: 'closer' });
    }
    if (!current || current.stage !== 'open') return d.emit({ type: 'act', result: 'nothing' });
    const reachable = truths.filter((t) => (t.state === 'ready') && Math.hypot(t.x - body.x, t.z - body.z) <= TRUTH_REACH);
    if (!reachable.length) return d.emit({ type: 'act', result: truths.some((t) => t.state === 'ready') ? 'too-far' : 'nothing' });
    const t = reachable.sort((a, b) => Math.hypot(a.x - body.x, a.z - body.z) - Math.hypot(b.x - body.x, b.z - body.z))[0];
    body.attack = 0.26;
    if (!current.held) {
      t.state = 'held';
      current.held = t.factId;
      current.heldAt = d.clock;
      d.emit({ type: 'act', result: 'held', factId: t.factId, text: t.text });
      return null;
    }
    t.state = 'held';
    d.emit({ type: 'act', result: 'pair', factId: t.factId, text: t.text });
    landPair();
    return null;
  };

  // ------------------------------------------------------------ script
  const SCRIPTS = {
    'the-claim': { teach(body) { if (!current) open(body); }, teachDone: () => current?.stage === 'open' && truths.every((t) => t.state !== 'descending'), loop: [] },
    echoes: { teach(body) { if (!current) open(body); }, teachDone: () => current?.stage === 'open', loop: [] },
    'the-square-falls': { teach(body) { collapseRate = COLLAPSE.creep; if (!current) open(body); }, teachDone: () => current?.stage === 'open', loop: [] },
  };
  // The pressure while the true things are out: plain throws at Butch.
  let volleyClock = 0;
  const volleyGap = () => d.gap([2.1, 1.9, 1.7][d.track.index]);
  let lastBody = null;

  const update = (dt, body, input = {}) => {
    d.events = [];
    lastBody = body;
    if (input.act) act(body);
    d.stepCore(dt, body);
    for (const event of d.events.slice()) {
      // A cleared phase ends its exchange; the next phase opens a new one.
      if (event.type === 'phase-cleared' && !frontLit) { current = null; truths = []; }
      if (event.type === 'strike' && event.attack.kind === 'drop' && event.attack.meta?.prop) {
        const a = event.attack;
        if (a.meta.misread) addHole(a.x, a.z);
        if (echoes() && !a.meta.echo && d.state !== 'interlude') {
          const at = { x: body.x, z: body.z };
          throwProp(at.x, at.z, { echo: true, flight: 1.0 });
          // A bench sends a low ring across the stones: it gathers for a beat
          // where the bench came down, then spreads (jump it).
          if (a.meta.prop === 'fountain-bench') d.spawn({ kind: 'wave', source: 'shockwave', x: a.x, z: a.z, r0: 1.7, maxR: 7.5, speed: 6.5 / d.tuning.flight, width: 0.6, tele: d.tele(0.45), jumpable: true, extra: true });
        }
      }
      if (event.type === 'hit' && event.attack?.meta?.misread) d.emit({ type: 'misread-hit', text: event.attack.meta.text, rebut: event.attack.meta.rebut, record: event.attack.meta.record });
    }
    // Truths: descend, hover, fade; a held one waits PAIR_S for its pair.
    for (const t of truths) {
      t.age += dt;
      if (t.state === 'descending' && t.age >= 0.9) t.state = 'ready';
      if ((t.state === 'ready') && (t.vx || t.vz)) {
        t.x = clamp(t.x + t.vx * dt, B.minX + 1.4, B.maxX - 1.4);
        t.z = clamp(t.z + t.vz * dt, B.minZ + 1.2, collapseZ - 2.4);
        if (t.x <= B.minX + 1.41 || t.x >= B.maxX - 1.41) t.vx *= -1;
        if (t.z <= B.minZ + 1.21 || t.z >= collapseZ - 2.41) t.vz *= -1;
      }
      if (t.state === 'held') { t.x = body.x; t.z = body.z; }
    }
    if (current?.stage === 'open') {
      if (current.held && d.clock - current.heldAt > d.win(PAIR_S)) halfAnswer('half');
      else if (!current.held && truths.length && truths.every((t) => t.state === 'ready' || t.state === 'descending') && truths[0].age > truths[0].life) halfAnswer('none');
      else {
        volleyClock -= dt;
        if (volleyClock <= 0) {
          volleyClock = volleyGap();
          const at = atBody(body, 0.9);
          throwProp(at.x, at.z, { flight: 1.15, r: 1.2 });
          if (d.track.index >= 2) d.after(0.5, () => { const p = atBody(body, 1.4); throwProp(p.x, p.z, { flight: 1.15, r: 1.2, extra: true }); }, 'volley');
        }
      }
    }
    // A finished exchange opens the next once its hold is over.
    if ((d.state === 'fight' || (d.state === 'teach' && d.teaching)) && !current && !frontLit) open(body);
    // The floor: in the last phase the back rows fall away. The falling
    // edge overtaking Butch costs a layer and puts him on solid stone.
    if (collapseRate > 0 && d.state !== 'interlude') collapseZ = Math.max(COLLAPSE.stopAt, collapseZ - collapseRate * dt);
    if (fallen(body.z - 0.2) && body.y < 0.5) {
      d.emit({ type: 'hit', source: 'collapse', from: { x: body.x, z: collapseZ } });
      body.z = collapseZ - 1.4;
      d.emit({ type: 'reposition', x: body.x, z: body.z, why: 'collapse' });
    }
    // A hole cracked under him (a throw that landed on him): out to its rim.
    const under = inHole(body.x, body.z, 1);
    if (under) {
      const out = rimOf(under, body.x, body.z);
      body.x = out.x; body.z = out.z;
      d.emit({ type: 'reposition', x: body.x, z: body.z, why: 'hole' });
    }
    driveScript(d, dt, body, SCRIPTS, { movement: 2, finisherSeconds: 1.4 });
    return d.events;
  };

  const director = {
    id: 'echo',
    track: d.track,
    argument,
    get state() { return d.state; },
    get attacks() { return d.attacks; },
    get truths() { return truths; },
    get holes() { return holes; },
    get collapseZ() { return collapseZ; },
    get frontLit() { return frontLit; },
    get exchange() { return current; },
    get clock() { return d.clock; },
    get stats() { return { pairs, halves, said }; },
    get pairLeft() { return current?.held ? Math.max(0, d.win(PAIR_S) - (d.clock - current.heldAt)) : 0; },
    update,
    constrain,
    walkable: (x, z) => !inHole(x, z, 1.05) && z < collapseZ - 0.6,
    avoid: (x, z) => (inHole(x, z, 1.4) ? 60 : 0) + (z > collapseZ - 1.6 ? 80 : 0),
    setDifficulty: (id) => d.setDifficulty(id),
    threatAt: (x, z, options) => d.threatAt(x, z, options),
    checkpoint(rollback = 'phase', body = null) {
      if (rollback === 'phase' && d.state !== 'interlude') { argument.unsay(landedThisPhase); landedThisPhase = []; }
      truths = [];
      current = null;
      frontLit = false;
      if (d.track.index >= 2) { collapseZ = Math.max(collapseZ, 4.5); collapseRate = COLLAPSE.creep; }
      restartPhase(d, rollback);
      const spot = d.safeSpot([[-6, 3], [6, 3], [0, 1.5], [-9, -1], [9, -1], [0, -1.5]], (x, z) => Math.min(...holes.map((h) => Math.hypot(x - h.x, z - h.z) - h.r), 9) + (collapseZ - z) * 0.3 - Math.hypot(x - (body?.x ?? 0), z - (body?.z ?? 0)) * 0.02);
      return { x: spot.x, z: Math.min(spot.z, collapseZ - 2) };
    },
    skipTeach() { if (d.state === 'intro') d.setState('teach'); },
    jumpToPhase(index) { d.clearAttacks(); d.cancelTimers(); current = null; truths = []; d.track.jump(index); if (index >= 2) collapseRate = COLLAPSE.creep; d.setState('teach'); },
    damage: (amount) => d.damage(amount, 'debug'),
    objective(body) {
      if (frontLit) return { kind: 'say', x: clamp(body.x, B.minX + 2, B.maxX - 2), z: FRONT_EDGE_Z - 1.6, ready: body.z <= FRONT_EDGE_Z, urgent: true };
      if (!current || current.stage !== 'open') return { kind: 'wait', x: clamp(body.x * 0.7, -6, 6), z: clamp(body.z, -2, Math.min(4, collapseZ - 3)) };
      const ready = truths.filter((t) => t.state === 'ready');
      if (!ready.length) return { kind: 'wait', x: body.x, z: body.z };
      const t = ready.sort((a, b) => Math.hypot(a.x - body.x, a.z - body.z) - Math.hypot(b.x - body.x, b.z - body.z))[0];
      const dist = Math.hypot(t.x - body.x, t.z - body.z);
      return { kind: current.held ? 'pair' : 'strike', x: t.x, z: t.z, ready: dist <= TRUTH_REACH - 0.2, urgent: Boolean(current.held) };
    },
    hint() {
      if (frontLit) return 'HE HAS NO ANSWER · THE LIT FRONT EDGE · <kbd>E</kbd> · SAY IT TO HIS FACE';
      if (d.state !== 'teach' && !(d.state === 'fight' && pairs === 0 && d.track.index === 0)) return '';
      const id = phaseId();
      if (id === 'the-claim') {
        if (current?.held) return 'NOW THE OTHER TRUE THING · <kbd>E</kbd> · BEFORE THE FIRST GOES COLD';
        if (current?.stage === 'open') return 'TWO TRUE THINGS CAME DOWN · <kbd>E</kbd> ON ONE, THEN THE OTHER · DODGE WHAT HE THROWS';
        return 'HE THROWS HIS MISREADINGS · DODGE THEM';
      }
      if (id === 'echoes') return 'EVERY THROW ECHOES WHERE YOU STOOD · KEEP MOVING · <kbd>SPACE</kbd> OVER THE RINGS';
      return 'THE SQUARE IS FALLING BEHIND YOU · THE TRUE THINGS DRIFT';
    },
    snapshot() {
      return {
        ...d.snapshotCore(), exchange: current ? { id: current.exchange?.id ?? null, stage: current.stage, held: current.held } : null,
        truths: truths.map((t) => ({ factId: t.factId, state: t.state, x: +t.x.toFixed(2), z: +t.z.toFixed(2) })),
        holes: holes.length, collapseZ: +collapseZ.toFixed(2), frontLit, pairs, halves, said, landed: argument.landed, queue: argument.queue,
      };
    },
  };
  return director;
}
