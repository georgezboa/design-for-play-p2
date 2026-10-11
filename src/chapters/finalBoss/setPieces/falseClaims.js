// Movement III · FALSE CLAIMS (round 12): the sunlit square of Echo City
// from above, a bullet hell of words.
//
// The argument about Mara (echoExchanges.js), fought. While he voices his
// claim, the Conductor throws his MISREADINGS of the record at Butch, and
// they are the bullets: every word of a false claim flies as a word. One
// that hits answers Butch "from the record" (its rebuttal) and tears a
// layer. The dot at Butch's heart is all that can be hit.
//   the two true things  two lit record cards come down in the square, far
//               apart. Walk into one and Butch holds it; reach the other
//               within the window and he holds both: the answer is ready.
//               Hold only one too long and the half answer is filed (the
//               cards come down again elsewhere).
//   the answer  E says it: it goes straight up the square at him. He walks
//               the steps, so line up under him first.
// Patterns (each warned by his raised hand and a gathering ring):
//   fan     a sentence fanned out at Butch        → step into a gap
//   stream  one word after another at where he is → keep moving sideways
//   ring    a sentence closing round him, one gap → leave through the gap
//   spiral  the words turning out of his hand     → weave
//   rain    the record falling down the square    → read the lines
//   echo    a fan that bounces once off the edge  → watch behind you
//
//   S0 THE CLAIM   teach: slow fans, two cards close by
//   S1 HIS RECORD  fans, streams and rings
//   S2 ECHOES      spirals, echoes and rain
// Then he has no answer, the words fall to the stones, and the camera drops
// to the square: THE STANDOFF.
//
// Metres: x across the square, z toward the camera (he stands at BOSS_Z).

import { ECHO_EXCHANGES } from '../echoExchanges.js';
import { approach, clamp, createPieceBase, pieceApi } from './kernel.js';

export const CLAIM_SEGMENTS = Object.freeze([
  // dodge: seconds of his patterns before the true things come down
  Object.freeze({ id: 'the-claim', name: 'THE CLAIM', share: 0.25, exchange: 'brief', dodge: 3.2 }),
  Object.freeze({ id: 'his-record', name: 'HIS RECORD', share: 0.35, exchange: 'looked-east', dodge: 5.5 }),
  Object.freeze({ id: 'echoes', name: 'ECHOES', share: 0.4, exchange: 'ledger', dodge: 7 }),
]);

export const SQUARE = Object.freeze({ minX: -9, maxX: 9, minZ: -4.2, maxZ: 7, bossZ: -7.4, spawnZ: 5 });

// A word flies as a slip of the record, and its slip is what hits: a
// capsule along the word (half-length `half`, radius R), drawn the same
// size, so what you see is what can touch you. `hit` shrinks it a little
// (the edge of a slip forgives).
export const WORDS = Object.freeze({
  speed: 4.6,
  R: 0.3,
  half: (word) => Math.min(0.95, Math.max(0.12, 0.09 * word.length - 0.05)),
  r: (word) => Math.min(0.95, Math.max(0.12, 0.09 * word.length - 0.05)) + 0.3, // its reach, for spawning and the bot
  hit: 0.85,
  windup: 0.5, // his hand and the gathering ring, before a pattern fires
});

// Distance from (x, z) to a word's slip (0 inside its core line).
export function slipDistance(b, x, z) {
  const dx = Math.max(0, Math.abs(x - b.x) - b.half);
  return Math.hypot(dx, z - b.z);
}

export const BUTCH_TOP = Object.freeze({ speed: 6.4, accel: 90, dashSpeed: 15, dashTime: 0.15, dashInv: 0.22, dashCd: 0.6, hurt: 0.2 });

export const CARDS = Object.freeze({ reach: 0.85, pair: 3.8, apart: 8, fromButch: 4, again: 2.4, drift: 0.45 });
export const ANSWER = Object.freeze({ half: 1.6, cooldown: 0.7, flight: 0.45 });

export const CLAIM_HINTS = Object.freeze({
  dodge: 'HIS MISREADINGS ARE THE WORDS · THE DOT IS ALL THEY CAN HIT · MOVE',
  cards: 'TWO TRUE THINGS CAME DOWN · WALK INTO ONE, THEN THE OTHER',
  answer: 'YOU HOLD BOTH · LINE UP UNDER HIM · <kbd>E</kbd> · SAY IT',
  half: 'ONLY ONE TRUE THING · HE FILES THE HALF ANSWER · THEY COME DOWN AGAIN',
  ring: 'HIS CLAIM CLOSES ROUND YOU · LEAVE THROUGH THE GAP',
  echo: 'THE WORDS ECHO OFF THE SQUARE · WATCH BEHIND YOU',
});

const wordsOf = (text) => text.replace(/[.,?!:]/g, '').split(/\s+/).filter(Boolean).map((w) => w.toUpperCase());
let serial = 0;

// An exchange is fought only if it can be answered: two true things among
// its facts (the cards), and exactly one voiced answer that holds both.
export function checkExchanges(exchanges) {
  if (!Array.isArray(exchanges) || !exchanges.length) throw new Error('false claims: no exchanges');
  for (const exchange of exchanges) {
    if ((exchange.facts ?? []).filter((fact) => fact.holds).length !== 2) throw new Error(`false claims: ${exchange.id} needs two true things`);
    if ((exchange.replies ?? []).filter((reply) => reply.holdsBoth).length !== 1) throw new Error(`false claims: ${exchange.id} needs one answer that holds both`);
  }
  return exchanges;
}

export function createFalseClaims({ difficulty, seed = 23, startSegment = 0, exchanges = ECHO_EXCHANGES } = {}) {
  checkExchanges(exchanges);
  const d = createPieceBase({ id: 'false-claims', movement: 2, name: 'FALSE CLAIMS', view: 'top', segments: CLAIM_SEGMENTS, difficulty, seed, startSegment });
  const body = { x: 0, z: SQUARE.spawnZ, vx: 0, vz: 0, dashT: 0, dashDir: [0, -1], dashInv: 0, dashCd: 0, facingX: 0, facingZ: -1, moving: false, punch: 0 };
  const bullets = [];
  const windups = [];
  let cards = [];
  let held = [];
  let pairLeft = 0;
  let ready = false;
  let cooldown = 0;
  let bossX = 0;
  let bossT = 0;
  let beat = 0;
  let beatClock = 1.6;
  let quiet = 0;
  let cardsAt = 0;
  let teach = null;
  const taught = new Set();
  const hint = (kind) => { if (!taught.has(kind)) { taught.add(kind); teach = { kind, until: d.clock + 4.5 }; } };

  const seg = () => d.seg.current;
  const exchange = () => exchanges.find((e) => e.id === seg().exchange) ?? exchanges[0];
  const misreadings = () => exchange().facts.filter((f) => !f.holds);
  const truths = () => exchange().facts.filter((f) => f.holds);
  const hurtR = () => BUTCH_TOP.hurt * d.tuning.hurt;
  const speedOf = (v) => d.pace(v);
  const emitter = () => ({ x: bossX, z: SQUARE.minZ - 0.6 });
  const bossAt = (ahead = 0) => Math.sin((bossT + ahead) * 0.42) * 5.2 + Math.sin((bossT + ahead) * 1.13) * 1.1;

  // ---------------------------------------------------------------- words
  const fire = (fact, x, z, vx, vz, { bounce = 0, word = null, life = 9 } = {}) => {
    const w = word ?? 'NO';
    const b = { id: `word-${(serial += 1)}`, word: w, fact: fact?.id ?? null, rebut: fact?.rebut ?? null, x, z, vx, vz, r: WORDS.r(w), half: WORDS.half(w), R: WORDS.R, bounce, age: 0, life, done: false };
    bullets.push(b);
    return b;
  };
  const aimAt = (from, speed) => {
    const dx = body.x - from.x; const dz = body.z - from.z; const m = Math.hypot(dx, dz) || 1;
    return [dx / m * speed, dz / m * speed];
  };
  // A pattern: his hand goes up and a ring gathers where it will come from.
  const windup = (kind, x, z, fn) => {
    const w = { id: `windup-${(serial += 1)}`, kind, x, z, left: d.tele(WORDS.windup), total: d.tele(WORDS.windup), fn };
    windups.push(w);
    d.emit({ type: 'windup', windup: w });
  };
  const PATTERNS = {
    fan(fact, { spread = 1.25, speed = WORDS.speed, bounce = 0 } = {}) {
      const e = emitter();
      windup('fan', e.x, e.z, () => {
        const words = wordsOf(fact.text);
        const [ax, az] = aimAt(e, 1);
        const base = Math.atan2(az, ax);
        words.forEach((word, i) => {
          const a = base + (words.length === 1 ? 0 : (i / (words.length - 1) - 0.5) * spread);
          fire(fact, e.x, e.z, Math.cos(a) * speedOf(speed), Math.sin(a) * speedOf(speed), { word, bounce });
        });
        d.emit({ type: 'pattern', kind: 'fan', fact: fact.id });
      });
    },
    stream(fact, { speed = 6, every = 0.13 } = {}) {
      const e = emitter();
      windup('stream', e.x, e.z, () => {
        wordsOf(fact.text).forEach((word, i) => d.after(i * every, () => {
          const from = emitter();
          const [vx, vz] = aimAt(from, speedOf(speed));
          fire(fact, from.x, from.z, vx, vz, { word });
        }));
        d.emit({ type: 'pattern', kind: 'stream', fact: fact.id });
      });
    },
    ring(fact, { r = 7.2, speed = 2.7, n = 16 } = {}) {
      hint('ring');
      const cx = body.x; const cz = body.z;
      windup('ring', cx, cz, () => {
        const words = wordsOf(fact.text);
        // The gap opens toward the nearest card (or the open square).
        const target = cards.find((c) => !c.held) ?? { x: 0, z: 1.5 };
        const gapAt = Math.atan2(target.z - cz, target.x - cx);
        for (let i = 0; i < n; i += 1) {
          const a = gapAt + ((i + 0.5) * Math.PI * 2) / n;
          const off = Math.abs(((a - gapAt + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
          if (off < 0.45) continue;
          const x = cx + Math.cos(a) * r; const z = cz + Math.sin(a) * r;
          fire(fact, x, z, -Math.cos(a) * speedOf(speed), -Math.sin(a) * speedOf(speed), { word: words[i % words.length], life: (r + 3) / speedOf(speed) });
        }
        d.emit({ type: 'pattern', kind: 'ring', fact: fact.id });
      });
    },
    spiral(fact, { arms = 2, turn = 1.7, every = 0.1, duration = 2.2, speed = 3.9 } = {}) {
      const e = emitter();
      windup('spiral', e.x, e.z, () => {
        const words = wordsOf(fact.text);
        const steps = Math.round(duration / every);
        const start = d.rng.range(0, Math.PI);
        for (let i = 0; i < steps; i += 1) {
          d.after(i * every, () => {
            const from = emitter();
            for (let k = 0; k < arms; k += 1) {
              const a = start + i * every * turn + (k * Math.PI * 2) / arms;
              // Only the half of the turn that faces into the square.
              const dir = Math.PI / 2 + Math.sin(a) * 1.15;
              fire(fact, from.x, from.z, Math.cos(dir) * speedOf(speed), Math.sin(dir) * speedOf(speed), { word: words[(i + k) % words.length] });
            }
          });
        }
        d.emit({ type: 'pattern', kind: 'spiral', fact: fact.id });
      });
    },
    rain(fact, { columns = 5, speed = 5.2 } = {}) {
      const words = wordsOf(fact.text);
      const xs = [];
      for (let i = 0; i < columns; i += 1) xs.push(clamp(body.x + (i - (columns - 1) / 2) * 2.6 + d.rng.range(-0.5, 0.5), SQUARE.minX + 0.5, SQUARE.maxX - 0.5));
      // One column always falls where Butch is: the lines show where.
      windup('rain', body.x, SQUARE.minZ, () => {
        xs.forEach((x, i) => d.after(i * 0.08, () => fire(fact, x, SQUARE.minZ - 0.4, 0, speedOf(speed), { word: words[i % words.length] })));
        d.emit({ type: 'pattern', kind: 'rain', fact: fact.id });
      });
      d.emit({ type: 'rain-lines', xs });
      windups[windups.length - 1].xs = xs;
    },
  };
  PATTERNS.echo = (fact, options = {}) => { hint('echo'); PATTERNS.fan(fact, { ...options, bounce: 1, spread: 1.5, speed: 4.2 }); };

  // Two rows of the same sentence, the second offset into the first's gaps.
  const doubleFan = (fact, options = {}) => { PATTERNS.fan(fact, options); d.after(0.28, () => PATTERNS.fan(fact, { ...options, spread: (options.spread ?? 1.25) * 0.92 })); };
  const SCHEDULE = {
    'the-claim': [
      (f) => { PATTERNS.fan(f[0], { speed: 3.5, spread: 1.4 }); return 2.2; },
      (f) => { PATTERNS.fan(f[1], { speed: 3.7, spread: 1.3 }); if (cards.length) d.after(1.0, () => PATTERNS.stream(f[0], { speed: 4.6, every: 0.18 })); return 2.4; },
    ],
    'his-record': [
      (f) => { doubleFan(f[0]); return 1.7; },
      (f) => { PATTERNS.stream(f[1]); d.after(0.7, () => PATTERNS.fan(f[0], { spread: 1.6, speed: 4 })); return 1.9; },
      (f) => { PATTERNS.ring(f[0]); d.after(1.2, () => PATTERNS.stream(f[1], { speed: 5.4, every: 0.16 })); return 2.5; },
      (f) => { doubleFan(f[1], { spread: 1.05 }); d.after(0.8, () => PATTERNS.stream(f[0], { speed: 5.6 })); return 2.2; },
    ],
    echoes: [
      (f) => { PATTERNS.spiral(f[0], { arms: 3, duration: 2.6 }); return 2.4; },
      (f) => { PATTERNS.echo(f[1]); d.after(0.9, () => PATTERNS.stream(f[0], { speed: 5.2, every: 0.15 })); return 2.0; },
      (f) => { PATTERNS.rain(f[0], { columns: 7 }); d.after(0.8, () => doubleFan(f[1], { spread: 1.1 })); return 2.4; },
      (f) => { PATTERNS.ring(f[1], { speed: 3.0 }); d.after(1.0, () => PATTERNS.echo(f[0])); return 2.6; },
    ],
  };

  // ---------------------------------------------------------------- cards
  const dropCards = () => {
    const near = seg().id === 'the-claim';
    const pick = () => {
      for (let i = 0; i < 40; i += 1) {
        const x = d.rng.range(SQUARE.minX + 1.4, SQUARE.maxX - 1.4);
        const z = d.rng.range(SQUARE.minZ + 1.6, SQUARE.maxZ - 1.0);
        if (Math.hypot(x - body.x, z - body.z) >= (near ? 2.6 : CARDS.fromButch)) return { x, z };
      }
      return { x: -body.x, z: 1 };
    };
    const a = pick();
    let b = pick();
    for (let i = 0; i < 40 && Math.hypot(a.x - b.x, a.z - b.z) < (near ? 5 : CARDS.apart); i += 1) b = pick();
    const [t1, t2] = truths();
    const drift = seg().id === 'echoes' ? CARDS.drift : 0;
    cards = [
      { id: `${exchange().id}:${t1.id}`, fact: t1.id, text: t1.text, x: a.x, z: a.z, held: false, age: 0, vx: d.rng.range(-1, 1) * drift, vz: d.rng.range(-1, 1) * drift },
      { id: `${exchange().id}:${t2.id}`, fact: t2.id, text: t2.text, x: b.x, z: b.z, held: false, age: 0, vx: d.rng.range(-1, 1) * drift, vz: d.rng.range(-1, 1) * drift },
    ];
    held = [];
    ready = false;
    hint('cards');
    d.emit({ type: 'cards', cards: cards.map((c) => ({ ...c })) });
  };

  const halfAnswer = () => {
    const reply = exchange().replies.find((r) => !r.holdsBoth);
    d.emit({ type: 'half', exchange: exchange().id, reply, line: reply?.deflect ?? 'He files it unanswered. Try the true thing.' });
    hint('half');
    cards = [];
    held = [];
    pairLeft = 0;
    cardsAt = d.clock + d.tele(CARDS.again);
  };

  // E: say both true things, straight up the square at him.
  const answer = () => {
    body.punch = 0.3;
    if (!ready) { d.emit({ type: 'act', result: held.length ? 'one' : 'nothing' }); return; }
    if (cooldown > 0) return;
    // It takes a moment to reach the steps, and he keeps walking: lead him.
    const hitX = bossAt(ANSWER.flight);
    const lands = Math.abs(body.x - hitX) < ANSWER.half;
    cooldown = ANSWER.cooldown;
    if (!lands) { d.emit({ type: 'act', result: 'aside', x: body.x, bossX }); return; }
    ready = false;
    const reply = exchange().replies.find((r) => r.holdsBoth);
    d.stats.returns += 1;
    d.emit({ type: 'act', result: 'pair', x: body.x, exchange: exchange().id, reply, truths: cards.map((c) => c.fact) });
    d.emit({ type: 'damage', cause: 'two-true-things' });
    cards = [];
    held = [];
    // The words fall to the stones; a breath before the next claim.
    bullets.forEach((b) => { b.done = true; d.emit({ type: 'word-falls', bullet: b }); });
    windups.length = 0;
    d.cancelTimers();
    d.seg.setProgress(1);
    quiet = 2.6;
    const more = d.completeSegment({ exchange: exchange().id });
    if (more) { beat = 0; beatClock = quiet + 0.6; cardsAt = d.clock + quiet + d.tele(seg().dodge); d.emit({ type: 'claim', exchange: exchange().id, cue: exchange().claim, after: quiet }); } else d.emit({ type: 'finisher', kind: 'no-answer' });
  };

  // ---------------------------------------------------------------- update
  const stepBody = (dt, input) => {
    body.dashCd = Math.max(0, body.dashCd - dt);
    body.dashInv = Math.max(0, body.dashInv - dt);
    body.punch = Math.max(0, body.punch - dt);
    let ix = clamp(Number(input.x) || 0, -1, 1);
    let iz = clamp(Number(input.y) || 0, -1, 1);
    const m = Math.hypot(ix, iz);
    if (m > 1) { ix /= m; iz /= m; }
    if (m > 0.05) { body.facingX = ix / Math.max(m, 1e-6); body.facingZ = iz / Math.max(m, 1e-6); }
    if (input.dash && body.dashCd <= 0) {
      body.dashT = BUTCH_TOP.dashTime; body.dashCd = BUTCH_TOP.dashCd; body.dashInv = BUTCH_TOP.dashInv;
      body.dashDir = m > 0.05 ? [ix / m, iz / m] : [body.facingX, body.facingZ];
      d.emit({ type: 'dash' });
    }
    if (body.dashT > 0) {
      body.dashT = Math.max(0, body.dashT - dt);
      body.vx = body.dashDir[0] * BUTCH_TOP.dashSpeed; body.vz = body.dashDir[1] * BUTCH_TOP.dashSpeed;
    } else {
      body.vx = approach(body.vx, ix * BUTCH_TOP.speed, BUTCH_TOP.accel * dt);
      body.vz = approach(body.vz, iz * BUTCH_TOP.speed, BUTCH_TOP.accel * dt);
    }
    body.x = clamp(body.x + body.vx * dt, SQUARE.minX + 0.3, SQUARE.maxX - 0.3);
    body.z = clamp(body.z + body.vz * dt, SQUARE.minZ + 0.3, SQUARE.maxZ - 0.3);
    body.moving = Math.hypot(body.vx, body.vz) > 0.4;
  };

  const update = (dt, input = {}, vitals = { inv: 0 }) => {
    d.stepClock(dt);
    cooldown = Math.max(0, cooldown - dt);
    quiet = Math.max(0, quiet - dt);
    bossT += dt;
    // He walks the steps, side to side.
    bossX = bossAt(0);
    if (d.state === 'intro' && d.stateAge >= 1.6) {
      d.setState('play');
      d.emit({ type: 'segment', index: d.seg.index, name: seg().name, id: seg().id, checkpoint: true });
      d.emit({ type: 'claim', exchange: exchange().id, cue: exchange().claim, after: 0 });
      hint('dodge');
      cardsAt = d.clock + d.tele(seg().dodge);
    }
    stepBody(dt, d.state === 'done' ? {} : input);
    if (input.act && d.state === 'play') answer();
    const playing = d.state === 'play';
    // His patterns.
    if (playing && quiet <= 0) {
      beatClock -= dt;
      if (beatClock <= 0) {
        const list = SCHEDULE[seg().id];
        const gap = list[beat % list.length](misreadings());
        beat += 1;
        beatClock = d.tele(gap) * (d.tuning.thin ? 1.15 : 1);
      }
    }
    for (let i = windups.length - 1; i >= 0; i -= 1) {
      const w = windups[i];
      w.left -= dt;
      if (w.left <= 0) { windups.splice(i, 1); if (playing) w.fn(); }
    }
    // The cards.
    if (playing && !cards.length && d.clock >= cardsAt && cardsAt > 0) dropCards();
    for (const c of cards) {
      c.age += dt;
      if (c.held) continue;
      c.x = clamp(c.x + c.vx * dt, SQUARE.minX + 1, SQUARE.maxX - 1);
      c.z = clamp(c.z + c.vz * dt, SQUARE.minZ + 1.2, SQUARE.maxZ - 0.8);
      if (c.x <= SQUARE.minX + 1 || c.x >= SQUARE.maxX - 1) c.vx = -c.vx;
      if (c.z <= SQUARE.minZ + 1.2 || c.z >= SQUARE.maxZ - 0.8) c.vz = -c.vz;
      if (c.age > 0.9 && Math.hypot(c.x - body.x, c.z - body.z) < CARDS.reach) {
        c.held = true;
        held.push(c.fact);
        if (held.length === 1) { pairLeft = d.win(CARDS.pair); d.emit({ type: 'held', card: c.id, text: c.text }); }
        if (held.length === 2) { ready = true; pairLeft = 0; d.emit({ type: 'ready', exchange: exchange().id }); hint('answer'); }
      }
    }
    if (held.length === 1 && playing) {
      pairLeft -= dt;
      if (pairLeft <= 0) halfAnswer();
    }
    // The words.
    for (const b of bullets) {
      if (b.done) continue;
      b.age += dt;
      b.x += b.vx * dt;
      b.z += b.vz * dt;
      if (b.bounce > 0) {
        if (b.x < SQUARE.minX || b.x > SQUARE.maxX) { b.vx = -b.vx; b.bounce -= 1; b.x = clamp(b.x, SQUARE.minX, SQUARE.maxX); d.emit({ type: 'echo', bullet: b }); }
        if (b.z > SQUARE.maxZ) { b.vz = -b.vz; b.bounce -= 1; b.z = SQUARE.maxZ; d.emit({ type: 'echo', bullet: b }); }
      }
      if (b.age > b.life || b.x < SQUARE.minX - 2 || b.x > SQUARE.maxX + 2 || b.z > SQUARE.maxZ + 2 || b.z < SQUARE.minZ - 4) b.done = true;
      if (b.done || vitals.inv > 0 || body.dashInv > 0) continue;
      if (slipDistance(b, body.x, body.z) < b.R * WORDS.hit + hurtR()) {
        b.done = true;
        d.emit({ type: 'hit', source: 'misreading', from: { x: b.x, z: b.z }, word: b.word, fact: b.fact });
        d.emit({ type: 'misread-hit', fact: b.fact, rebut: b.rebut, record: exchange().facts.find((f) => f.id === b.fact)?.source ?? null });
      }
    }
    for (let i = bullets.length - 1; i >= 0; i -= 1) if (bullets[i].done) bullets.splice(i, 1);
    if (d.state === 'finisher' && d.stateAge >= 2.2) { d.setState('done'); d.emit({ type: 'finished', piece: d.id }); }
    if (teach && d.clock > teach.until) teach = null;
    if (playing && held.length < 2) d.seg.setProgress(held.length * 0.3);
    return d.flush();
  };

  const checkpoint = (rollback) => {
    bullets.length = 0;
    windups.length = 0;
    d.cancelTimers();
    beat = 0;
    beatClock = 2.0;
    if (rollback === 'segment') {
      cards = []; held = []; ready = false; pairLeft = 0;
      cardsAt = d.clock + d.tele(Math.min(3.5, seg().dodge));
      d.seg.restart();
    }
    Object.assign(body, { x: 0, z: SQUARE.spawnZ, vx: 0, vz: 0, dashT: 0 });
    return { x: 0, z: SQUARE.spawnZ, rolledBack: rollback === 'segment' };
  };

  return pieceApi(d, {
    body,
    bullets,
    windups,
    get hazards() { return bullets; },
    get cards() { return cards; },
    get held() { return held; },
    get ready() { return ready; },
    get pairLeft() { return pairLeft; },
    get bossX() { return bossX; },
    get exchange() { return exchange(); },
    // Where he will be `ahead` seconds from now (he walks a fixed path).
    bossAt,
    update,
    checkpoint,
    jumpToSegment(i) {
      d.seg.jump(i);
      bullets.length = 0; windups.length = 0; d.cancelTimers(); cards = []; held = []; ready = false; beat = 0; beatClock = 1.6; cardsAt = d.clock + 1.5;
      if (d.state === 'intro') { d.setState('play'); }
    },
    hint() {
      if (d.state === 'intro' || d.state === 'done') return '';
      if (ready) return CLAIM_HINTS.answer;
      return teach ? CLAIM_HINTS[teach.kind] ?? '' : '';
    },
    snapshot() {
      return {
        ...d.snapshotBase(), exchange: exchange().id, bossX: +bossX.toFixed(2), held: [...held], ready, pairLeft: +pairLeft.toFixed(2),
        body: { x: +body.x.toFixed(2), z: +body.z.toFixed(2) }, bullets: bullets.length, cards: cards.map((c) => ({ fact: c.fact, held: c.held, x: +c.x.toFixed(1), z: +c.z.toFixed(1) })),
      };
    },
  });
}
