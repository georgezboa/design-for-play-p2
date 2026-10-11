// Movement III · THE STANDOFF (round 12): the square emptied, the camera at
// the height of the stones, the two of them at either end. A duel on the
// clock.
//
// He makes his claim (voiced). Four record cards hang round Butch, one at
// each hand (↑ ← → ↓): the four facts of the exchange, two of them true,
// two his misreadings. Then the wait. The square's clock will strike: that
// is the draw. Until it does, nothing: his hand twitches, a chime that is
// not the clock, pigeons. Answer on any of those and he answers you first.
//   the draw     the clock strikes: the direction of ONE TRUE THING, in time
//   the second   its second stroke, a beat later: the OTHER true thing, on
//                the beat
// Both, and his claim does not stand (the voiced answer that holds both).
// A misreading, a draw too soon, or too late: his answer tears a layer, and
// the wait begins again.
//
//   S0 THE DRAW       teach: no feints, a generous window
//   S1 FEINTS         his hand, the wrong chime
//   S2 THE LAST WORD  feints, and the record shuffles (two cards swap) before
//                     the clock; the window tightens
// He has no answer: the square cracks open under him, and the fall is into
// the Painted Country.

import { ECHO_EXCHANGES } from '../echoExchanges.js';
import { createPieceBase, pieceApi } from './kernel.js';

export const STANDOFF_SEGMENTS = Object.freeze([
  Object.freeze({ id: 'the-draw', name: 'THE DRAW', share: 0.3, exchange: 'eastbound', feints: 0, swap: false, window: 1.3 }),
  Object.freeze({ id: 'feints', name: 'FEINTS', share: 0.35, exchange: 'own-records', feints: 2, swap: false, window: 1 }),
  Object.freeze({ id: 'last-word', name: 'THE LAST WORD', share: 0.35, exchange: 'brief', feints: 3, swap: true, window: 0.85 }),
]);

export const DUEL = Object.freeze({
  claimS: 3.4, // his claim, the cards coming up
  waitMin: 1.9,
  waitMax: 3.9,
  draw: 0.6, // seconds to give the first true thing after the clock
  beat: 0.72, // the clock's second stroke after its first
  second: 0.2, // ± around the second stroke
  answered: 1.7, // after a failed draw, before the wait begins again
  said: 3.0, // the answer heard, before the next claim
  swapLead: 0.9, // a shuffle is done this long before the clock at the latest
});

export const SLOTS = Object.freeze(['up', 'left', 'right', 'down']);
export const FEINT_KINDS = Object.freeze(['hand', 'chime', 'pigeons', 'hand', 'chime']);

export const STANDOFF_HINTS = Object.freeze({
  wait: 'WAIT FOR THE CLOCK · NOT FOR HIM',
  draw: 'THE CLOCK · ONE TRUE THING <kbd>↑</kbd> <kbd>←</kbd> <kbd>→</kbd> <kbd>↓</kbd> · THEN THE OTHER ON ITS SECOND STROKE',
  feint: 'HIS HAND IS NOT THE CLOCK',
  swap: 'THE RECORD SHUFFLES · READ IT AGAIN',
});

export function createStandoff({ difficulty, seed = 29, startSegment = 0, exchanges = ECHO_EXCHANGES } = {}) {
  const d = createPieceBase({ id: 'standoff', movement: 2, name: 'THE STANDOFF', view: 'standoff', segments: STANDOFF_SEGMENTS, difficulty, seed, startSegment });
  const body = { x: -6, z: 0, moving: false, punch: 0, facingX: 1 };
  let duel = null; // { stage, age, waitFor, feints: [{at, kind, done}], slots, first, swaps }
  let teach = null;
  const taught = new Set();
  const hint = (kind) => { if (!taught.has(kind)) { taught.add(kind); teach = { kind, until: d.clock + 4 }; } };

  const seg = () => d.seg.current;
  const exchange = () => exchanges.find((e) => e.id === seg().exchange) ?? exchanges[0];
  const drawWindow = () => d.win(DUEL.draw * seg().window);
  const secondWindow = () => d.win(DUEL.second * seg().window);
  const beat = () => DUEL.beat * (d.tuning.thin ? 1.3 : 1);

  const shuffle = (list) => {
    const out = [...list];
    for (let i = out.length - 1; i > 0; i -= 1) { const j = Math.floor(d.rng() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
    return out;
  };

  const newDuel = () => {
    const facts = shuffle(exchange().facts);
    duel = { stage: 'claim', age: 0, slots: Object.fromEntries(SLOTS.map((slot, i) => [slot, facts[i]])), first: null, tries: 0 };
    d.emit({ type: 'claim', exchange: exchange().id, cue: exchange().claim });
    d.emit({ type: 'cards', slots: { ...duel.slots } });
  };

  const beginWait = () => {
    duel.stage = 'wait';
    duel.age = 0;
    duel.first = null;
    duel.drawn = false;
    const wait = d.rng.range(DUEL.waitMin, DUEL.waitMax) * (d.tuning.thin ? 0.9 : 1);
    duel.waitFor = wait;
    const n = d.tuning.thin ? Math.min(1, seg().feints) : seg().feints;
    duel.feints = Array.from({ length: n }, (_, i) => ({ at: (wait * (i + 1)) / (n + 1) + d.rng.range(-0.15, 0.15), kind: FEINT_KINDS[(i + duel.tries) % FEINT_KINDS.length], done: false }));
    duel.swapAt = seg().swap ? Math.max(0.4, wait - DUEL.swapLead - d.rng.range(0.2, 0.8)) : null;
    hint('wait');
    d.emit({ type: 'wait', wait });
  };

  const fail = (why, fact = null) => {
    duel.stage = 'answered';
    duel.age = 0;
    duel.tries += 1;
    d.emit({ type: 'answered', why, fact: fact?.id ?? null, rebut: fact?.rebut ?? null });
    d.emit({ type: 'hit', source: why === 'misreading' ? 'misreading' : why === 'soon' ? 'too-soon' : 'too-late', from: { x: 6, z: 0 } });
  };

  const won = () => {
    duel.stage = 'said';
    duel.age = 0;
    const reply = exchange().replies.find((r) => r.holdsBoth);
    d.stats.returns += 1;
    d.emit({ type: 'act', result: 'pair', exchange: exchange().id, reply, truths: [duel.first, duel.secondFact] });
    d.emit({ type: 'damage', cause: 'two-true-things' });
    d.seg.setProgress(1);
  };

  // A direction pressed this step.
  const press = (slot) => {
    if (!duel) return;
    body.punch = 0.3;
    const fact = duel.slots[slot];
    if (duel.stage === 'wait' || duel.stage === 'claim') {
      if (duel.stage === 'claim') return; // he is still speaking: nothing yet
      const feinting = duel.feints.some((f) => f.done && duel.age - f.at < 0.6);
      d.emit({ type: 'act', result: 'soon', slot, feint: feinting });
      if (feinting) hint('feint');
      fail('soon');
      return;
    }
    if (duel.stage === 'draw') {
      if (!fact.holds) { d.emit({ type: 'act', result: 'misreading', slot }); fail('misreading', fact); return; }
      duel.first = fact.id;
      duel.firstSlot = slot;
      duel.stage = 'second';
      d.emit({ type: 'act', result: 'first', slot, fact: fact.id, text: fact.text });
      return;
    }
    if (duel.stage === 'second') {
      const toBeat = duel.secondAt - duel.age;
      if (slot === duel.firstSlot) { d.emit({ type: 'act', result: 'same', slot }); return; }
      if (!fact.holds) { d.emit({ type: 'act', result: 'misreading', slot }); fail('misreading', fact); return; }
      if (Math.abs(toBeat) > secondWindow()) { d.emit({ type: 'act', result: toBeat > 0 ? 'early' : 'late', slot }); fail(toBeat > 0 ? 'soon' : 'late'); return; }
      duel.secondFact = fact.id;
      d.emit({ type: 'act', result: 'second', slot, fact: fact.id, text: fact.text, perfect: Math.abs(toBeat) < secondWindow() * 0.35 });
      if (Math.abs(toBeat) < secondWindow() * 0.35) d.stats.perfect += 1;
      won();
    }
  };

  const update = (dt, input = {}) => {
    d.stepClock(dt);
    body.punch = Math.max(0, body.punch - dt);
    if (d.state === 'intro' && d.stateAge >= 1.8) { d.setState('play'); d.emit({ type: 'segment', index: d.seg.index, name: seg().name, id: seg().id, checkpoint: true }); newDuel(); }
    if (d.state === 'play' && duel) {
      duel.age += dt;
      if (input.dir) press(input.dir);
      if (!duel) return d.flush();
      if (duel.stage === 'claim' && duel.age >= DUEL.claimS) beginWait();
      else if (duel.stage === 'wait') {
        for (const f of duel.feints) if (!f.done && duel.age >= f.at) { f.done = true; d.emit({ type: 'feint', kind: f.kind }); }
        if (duel.swapAt !== null && !duel.swapped && duel.age >= duel.swapAt) {
          duel.swapped = true;
          // A true card and a misreading trade places.
          const trueSlot = SLOTS.filter((s) => duel.slots[s].holds)[Math.floor(d.rng() * 2)];
          const falseSlot = SLOTS.filter((s) => !duel.slots[s].holds)[Math.floor(d.rng() * 2)];
          [duel.slots[trueSlot], duel.slots[falseSlot]] = [duel.slots[falseSlot], duel.slots[trueSlot]];
          hint('swap');
          d.emit({ type: 'swap', a: trueSlot, b: falseSlot, slots: { ...duel.slots } });
        }
        if (duel.age >= duel.waitFor) {
          duel.stage = 'draw';
          duel.age = 0;
          duel.secondAt = beat();
          hint('draw');
          d.emit({ type: 'draw', window: drawWindow(), beat: duel.secondAt });
        }
      } else if (duel.stage === 'draw') {
        if (duel.age > drawWindow()) { d.emit({ type: 'act', result: 'late' }); fail('late'); }
      } else if (duel.stage === 'second') {
        if (!duel.chimed && duel.age >= duel.secondAt) { duel.chimed = true; d.emit({ type: 'stroke', index: 2 }); }
        if (duel.age > duel.secondAt + secondWindow()) { d.emit({ type: 'act', result: 'late' }); fail('late'); }
      } else if (duel.stage === 'answered') {
        if (duel.age >= DUEL.answered) beginWait();
      } else if (duel.stage === 'said') {
        if (duel.age >= DUEL.said) {
          const more = d.completeSegment({ exchange: exchange().id });
          if (more) newDuel();
          else { duel = null; d.emit({ type: 'finisher', kind: 'no-answer' }); }
        }
      }
    }
    if (d.state === 'finisher' && d.stateAge >= 2.4) { d.setState('done'); d.emit({ type: 'finished', piece: d.id }); }
    if (teach && d.clock > teach.until) teach = null;
    return d.flush();
  };

  const checkpoint = (rollback) => {
    // The duel's answer is already a single beat: a torn last layer only
    // starts its wait again (NORMAL: with a new claim, cards reshuffled).
    if (rollback === 'segment') { d.seg.restart(); newDuel(); } else if (duel) beginWait();
    return { x: body.x, z: 0, rolledBack: rollback === 'segment' };
  };

  return pieceApi(d, {
    body,
    hazards: [],
    get duel() { return duel; },
    get exchange() { return exchange(); },
    slots: () => (duel ? { ...duel.slots } : null),
    update,
    checkpoint,
    jumpToSegment(i) { d.seg.jump(i); if (d.state === 'intro') d.setState('play'); newDuel(); },
    hint() {
      if (d.state === 'intro' || d.state === 'done' || !duel) return '';
      if (duel.stage === 'draw' || duel.stage === 'second') return '';
      return teach ? STANDOFF_HINTS[teach.kind] ?? '' : '';
    },
    snapshot() {
      return {
        ...d.snapshotBase(), exchange: exchange().id,
        duel: duel ? { stage: duel.stage, age: +duel.age.toFixed(2), slots: Object.fromEntries(SLOTS.map((s) => [s, { fact: duel.slots[s].id, holds: duel.slots[s].holds }])), first: duel.first, tries: duel.tries } : null,
      };
    },
  });
}
