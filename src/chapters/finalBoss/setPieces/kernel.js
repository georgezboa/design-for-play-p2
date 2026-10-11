// Chapter 6 · ALL WORLDS AT ONCE — the set-piece kernel (round 12).
//
// George's round 12 note: the boss still was not fun; learn from Split
// Fiction. Round 11 had made four skill fights on one top-down arena, so
// every movement played the same way. Round 12 makes the Conductor a
// sequence of SET PIECES, each its own way to play and its own camera:
//
//   I   THE ROOF RUN        side-on forced-scroll run along the night train
//       RETURN TO SENDER    behind-Butch duel: punch his cases back, a rally
//   II  ON THE BELL         side-scrolling rooftop platformer on the bell
//       THE BELL TOWER      a vertical climb, the borrowed light rising
//   III FALSE CLAIMS        top-down: his misreadings are the bullets
//       THE STANDOFF        a Leone duel: two true things on the clock
//   IV  THE PAINTED LINE    on rails, painting the line ahead of the train
//
// This file is what every piece shares, pure (no three.js, no DOM): the
// difficulty tuning, a seeded rng, a piece's checkpointed segments, timers,
// and the runner that owns Butch's paper layers. Node drives every piece
// (tests/finalBoss/round12*.test.mjs) and the stage only draws it.
//
// Segments: a piece is a teach-by-doing opening and two or three
// escalations, each a CHECKPOINT. A torn last layer restarts the segment on
// NORMAL (a few seconds of play at most); on STORY nothing is undone and
// Butch stands up where he fell. A fall or a hit costs one layer.

import { DEFAULT_DIFFICULTY, createDeathLedger, difficultyPreset } from '../finaleModel.js';

// ---------------------------------------------------------------------------
// Difficulty: STORY keeps every piece and pattern, slower and kinder.

export function pieceTuning(difficulty = DEFAULT_DIFFICULTY) {
  const p = difficultyPreset(difficulty);
  return Object.freeze({
    id: p.id,
    layers: p.layers,
    pace: p.pace, // scroll, train and projectile speeds
    tele: p.teleScale, // every warning's lead time
    window: p.windowScale, // every timing window (punch, draw, plank)
    thin: p.thin, // hazards marked `extra` are left out
    hurt: p.hurtScale, // Butch's hurt box
    rollback: p.rollback, // 'segment' | 'none'
    respawnInv: p.respawnInv,
  });
}

// Deterministic "random" (mulberry32): a piece plays the same for a seed.
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
  next.int = (lo, hi) => Math.floor(lo + (hi - lo + 1) * next());
  return next;
}

export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const approach = (v, target, step) => (v < target ? Math.min(target, v + step) : Math.max(target, v - step));

// ---------------------------------------------------------------------------
// Segments: a piece's checkpoints and its share of his ticket.
//
// Every segment has a share of the piece's part of the ticket; within a
// segment the piece reports progress 0..1 (distance run, rallies won,
// answers landed). The ticket consumed is the finished segments' shares plus
// the current one's share × its progress. A NORMAL restart puts the current
// segment's progress back to 0; earlier segments stay won.

export function createSegments(list, { start = 0 } = {}) {
  if (!Array.isArray(list) || !list.length) throw new Error('segments: none');
  const total = list.reduce((sum, s) => sum + (s.share ?? 0), 0);
  if (Math.abs(total - 1) > 1e-6) throw new Error(`segments: shares sum to ${total}, not 1`);
  let index = clamp(Math.round(start), 0, list.length - 1);
  let progress = 0;
  let finished = false;
  const before = (i) => list.slice(0, i).reduce((sum, s) => sum + s.share, 0);
  return {
    list,
    get index() { return index; },
    get current() { return list[index]; },
    get last() { return index === list.length - 1; },
    get count() { return list.length; },
    get progress() { return progress; },
    get finished() { return finished; },
    setProgress(p) { progress = clamp(Number(p) || 0, 0, 1); return progress; },
    addProgress(p) { progress = clamp(progress + (Number(p) || 0), 0, 1); return progress; },
    // The share of the ticket consumed so far, 0..1.
    ticket() { return finished ? 1 : before(index) + list[index].share * progress; },
    // The floor the current segment can take the ticket to.
    floor() { return before(index + 1); },
    // Finish the current segment; false when it was the last.
    advance() {
      progress = 0;
      if (index >= list.length - 1) { finished = true; return false; }
      index += 1;
      return true;
    },
    restart() { progress = 0; },
    jump(i) { index = clamp(Math.round(i), 0, list.length - 1); progress = 0; finished = false; },
  };
}

// ---------------------------------------------------------------------------
// A piece's shared toolkit: game-time timers, events, the segment track and
// the state of the piece ('intro' → 'play' → 'finisher' → 'done').

export function createPieceBase({ id, movement, name, view, segments, difficulty = DEFAULT_DIFFICULTY, seed = 7, startSegment = 0 } = {}) {
  let tuning = pieceTuning(difficulty);
  const seg = createSegments(segments, { start: startSegment });
  const base = {
    id, movement, name, view,
    seg,
    rng: createRng(seed),
    get tuning() { return tuning; },
    clock: 0,
    segClock: 0,
    state: 'intro',
    stateAge: 0,
    events: [],
    timers: [],
    stats: { returns: 0, perfect: 0, segments: 0 },
    setDifficulty(next) { tuning = pieceTuning(next); },
    emit(event) { base.events.push(event); return event; },
    tele: (s) => s * tuning.tele,
    win: (s) => s * tuning.window,
    pace: (v) => v * tuning.pace,
    after(seconds, fn, tag = null) { base.timers.push({ at: base.clock + Math.max(0, seconds), fn, tag }); },
    cancelTimers(tag = null) { base.timers = tag ? base.timers.filter((t) => t.tag !== tag) : []; },
    setState(state) { base.state = state; base.stateAge = 0; base.emit({ type: 'state', state }); },
    stepClock(dt) {
      base.clock += dt;
      base.segClock += dt;
      base.stateAge += dt;
      const due = base.timers.filter((t) => t.at <= base.clock).sort((a, b) => a.at - b.at);
      base.timers = base.timers.filter((t) => t.at > base.clock);
      due.forEach((t) => t.fn());
    },
    // Drain this step's events.
    flush() { const out = base.events; base.events = []; return out; },
    // A segment won: the next one is a checkpoint, or the piece's finisher.
    completeSegment(extra = {}) {
      base.stats.segments += 1;
      const was = seg.index;
      const more = seg.advance();
      base.segClock = 0;
      base.emit({ type: 'segment-cleared', index: was, name: segments[was].name, last: !more, ...extra });
      if (more) base.emit({ type: 'segment', index: seg.index, name: seg.current.name, id: seg.current.id, checkpoint: true });
      else base.setState('finisher');
      return more;
    },
    snapshotBase() {
      return {
        piece: id, movement, name, view, state: base.state, clock: +base.clock.toFixed(2), segment: seg.index, segmentId: seg.current.id,
        segmentName: seg.current.name, segments: seg.count, progress: +seg.progress.toFixed(3), ticket: +seg.ticket().toFixed(3),
      };
    },
  };
  return base;
}

// A piece's public face: its own methods and getters over the shared base
// (reads fall through to the base, so its state, clock and tuning are live).
export function pieceApi(base, own) {
  const api = Object.create(base);
  Object.defineProperties(api, Object.getOwnPropertyDescriptors(own));
  return api;
}

// ---------------------------------------------------------------------------
// The runner: one piece in play, Butch's paper layers and the death ledger.
// The stage feeds it input each step and draws what it reports; the bot and
// the node tests drive it the same way.
//
// A piece reports harm as events:
//   { type: 'hit', source, from }   a hazard touched Butch (ignored while he
//                                   is invulnerable: after a hit, a dash's
//                                   i-frames are the piece's own business)
//   { type: 'fall', source }        Butch fell (the piece already stood him
//                                   back on the last safe ground)
// The runner turns them into 'hurt' and, on the last layer, 'death': the
// piece's checkpoint (segment restart on NORMAL, stand up in place on STORY).

export const HIT_INV = 0.9;

export function createPieceRunner({ piece, difficulty = DEFAULT_DIFFICULTY, ledger = createDeathLedger(), movement = piece?.movement ?? 0 } = {}) {
  let tuning = pieceTuning(difficulty);
  const vitals = { hp: tuning.layers, maxHp: tuning.layers, inv: 0.6, respawnInv: 0, hitTimer: 0 };
  const runner = {
    piece,
    vitals,
    ledger,
    movement,
    deaths: 0,
    hits: 0,
    time: 0,
    get difficulty() { return tuning.id; },
    get tuning() { return tuning; },
    setDifficulty(id) {
      tuning = pieceTuning(id);
      vitals.maxHp = tuning.layers;
      vitals.hp = vitals.maxHp;
      piece.setDifficulty?.(id);
    },
    // A new piece in the same run keeps the layers' count and the ledger.
    adopt(next) { runner.piece = next; vitals.inv = Math.max(vitals.inv, 0.8); },
    step(dt, input = {}) {
      runner.time += dt;
      vitals.inv = Math.max(0, vitals.inv - dt);
      vitals.respawnInv = Math.max(0, vitals.respawnInv - dt);
      vitals.hitTimer = Math.max(0, vitals.hitTimer - dt);
      const out = [];
      const events = runner.piece.update(dt, input, vitals);
      for (const event of events) {
        if (event.type === 'hit' || event.type === 'fall') {
          const hurt = runner.hurt(event);
          if (hurt) out.push(event, ...hurt);
          else out.push({ ...event, type: event.type === 'hit' ? 'blocked' : 'fall-safe' });
        } else out.push(event);
      }
      return out;
    },
    hurt({ type = 'hit', source = 'hit', from = null } = {}) {
      // A hit lands only outside i-frames; a fall always costs a layer,
      // except in the grace after standing up again.
      if (type === 'hit' && vitals.inv > 0) return null;
      if (type === 'fall' && vitals.respawnInv > 0) return null;
      vitals.hp -= 1;
      vitals.inv = HIT_INV;
      vitals.hitTimer = 0.35;
      runner.hits += 1;
      runner.piece.onHurt?.(source, type);
      const out = [{ type: 'hurt', source, from, fall: type === 'fall', layersLeft: vitals.hp }];
      if (vitals.hp <= 0) out.push(runner.die(source));
      return out;
    },
    die(source) {
      runner.deaths += 1;
      const before = runner.piece.seg.ticket();
      const result = runner.piece.checkpoint(tuning.rollback) ?? {};
      vitals.hp = vitals.maxHp;
      vitals.respawnInv = tuning.respawnInv;
      vitals.inv = Math.max(vitals.inv, vitals.respawnInv);
      const record = ledger.record(movement, tuning.id);
      return {
        type: 'death', source, piece: runner.piece.id, segment: runner.piece.seg.index, segmentName: runner.piece.seg.current.name,
        rolledBack: runner.piece.seg.ticket() < before - 1e-9, rollback: tuning.rollback, offerStory: record.offerStory, deaths: record.deaths, ...result,
      };
    },
  };
  return runner;
}
