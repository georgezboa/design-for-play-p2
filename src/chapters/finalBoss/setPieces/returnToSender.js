// Movement I · RETURN TO SENDER (round 12): behind Butch, on the tender roof,
// facing the Conductor on the engine. A duel of punched-back luggage.
//
// He throws down the train at Butch (each throw lands in a ring on the
// roof that fills as it comes):
//   drop    an unclaimed case: step out of its ring
//   claim   a brass claim case: E as it lands punches it back up the train.
//           He volleys it back, faster each time (a RALLY); when he cannot
//           keep up, it hits him. Close to the landing is a VOLLEY: it goes
//           back faster. Under the punch-hole lens its 1978 tag reads.
//   sweep   a mail sack skidding the length of the roof: JUMP it
//   stamp   his OVERDUE stamp over one side of the roof: leave it
//   decoy   (S3) a brass ring that reads NO CLAIM under the lens just
//           before it lands: do not punch it, step out
//
//   S0 THE TENDER        teach: one slow claim, punched back
//   S1 RETURN TO SENDER  rallies of two returns, drops between
//   S2 OVERDUE           rallies of three, stamps and sacks in the rallies,
//                        and he sends it wide
//   S3 NO CLAIM          his volleys may be decoys
// The last rally knocks him back on the engine, the train dives into the
// tunnel (the lens), and the fall is into Borrowed Light.
//
// Metres: x across the roof, y up, z along the train (the Conductor at
// z = BOSS_Z, ahead of Butch).

import { approach, clamp, createPieceBase, pieceApi } from './kernel.js';

export const RTS_SEGMENTS = Object.freeze([
  Object.freeze({ id: 'tender', name: 'THE TENDER', share: 0.1, rally: 1, wins: 1 }),
  Object.freeze({ id: 'return-to-sender', name: 'RETURN TO SENDER', share: 0.3, rally: 2, wins: 2 }),
  Object.freeze({ id: 'overdue', name: 'OVERDUE', share: 0.3, rally: 3, wins: 2 }),
  Object.freeze({ id: 'no-claim', name: 'NO CLAIM', share: 0.3, rally: 3, wins: 2 }),
]);

export const RTS = Object.freeze({
  halfWidth: 2.7, // the tender roof
  bossZ: -26,
  speed: 7.5,
  accel: 70,
  jumpV: 9.6,
  gravity: 28,
  dashSpeed: 15,
  dashTime: 0.14,
  dashInv: 0.2,
  dashCd: 0.6,
  halfW: 0.28,
});

export const THROW = Object.freeze({
  flight: 1.25, // a drop or his first claim
  teachFlight: 1.9,
  volley: 0.88, // each volley in a rally is this much quicker
  minFlight: 0.62,
  back: 0.55, // a return's flight up to him
  backPerfect: 0.4,
  ring: 0.78, // a drop's ring
  claimRing: 0.95, // stand inside it to punch
  window: 0.15, // ± seconds around the landing
  // Round 12 playtest (George: "sometimes I press E and it doesn't go back"):
  // a press a little early is kept this long and lands the punch the moment
  // the window opens (never on a decoy); only a press with nothing coming
  // locks the fist (mashing).
  buffer: 0.25,
  perfect: 0.055, // a VOLLEY
  reveal: 0.62, // a decoy reads NO CLAIM this long before it lands
  sweepSpeed: 15,
  sweepFrom: -15,
  sweepH: 0.55,
  stampWidth: 1.9,
  stampTele: 1.15,
  stampLive: 0.25,
});

export const RTS_HINTS = Object.freeze({
  claim: 'A BRASS CLAIM CASE · STAND IN ITS RING · <kbd>E</kbd> AS IT LANDS',
  rally: 'HE VOLLEYS IT BACK · PUNCH IT AGAIN · FASTER EACH TIME',
  drop: 'GREY RINGS ARE UNCLAIMED · STEP OUT OF THEM',
  sweep: 'A MAIL SACK DOWN THE ROOF · <kbd>SPACE</kbd> · JUMP IT',
  stamp: 'HIS <b>OVERDUE</b> STAMP · LEAVE THAT SIDE OF THE ROOF',
  decoy: 'UNDER THE LENS A RING CAN READ <b>NO CLAIM</b> · DO NOT PUNCH IT · STEP OUT',
});

// What tears a layer when it lands in Butch's ring (the death card says it).
const LANDING_SOURCE = Object.freeze({ drop: 'drop', claim: 'landing-claim', decoy: 'decoy' });

let serial = 0;

export function createReturnToSender({ difficulty, seed = 13, startSegment = 0 } = {}) {
  const d = createPieceBase({ id: 'return-to-sender', movement: 0, name: 'RETURN TO SENDER', view: 'duel', segments: RTS_SEGMENTS, difficulty, seed, startSegment });
  const body = { x: 0, y: 0, vx: 0, vy: 0, grounded: true, dashT: 0, dashDir: 1, dashInv: 0, dashCd: 0, punch: 0, whiff: 0, facing: 1, moving: false };
  const hazards = [];
  let bossX = 0;
  let bossTarget = 0;
  let beat = 0;
  let beatClock = 1.2;
  let rally = null; // { count, need }
  let wins = 0;
  let stagger = 0;
  let teach = null;
  const taught = new Set();

  const seg = () => d.seg.current;
  const lane = (x) => clamp(x, -RTS.halfWidth + 0.5, RTS.halfWidth - 0.5);
  const hint = (kind) => { if (!taught.has(kind)) { taught.add(kind); teach = { kind, until: d.clock + 4 }; } };

  // ---------------------------------------------------------------- throws
  const spawn = (spec) => {
    const h = { id: `${spec.kind}-${(serial += 1)}`, age: 0, done: false, ...spec };
    hazards.push(h);
    d.emit({ type: 'spawn', hazard: h });
    return h;
  };
  // He throws to land at x after `flight` s (the release is his hand).
  const throwAt = (kind, x, { flight = THROW.flight, rallyIndex = 0, wide = false } = {}) => {
    const t = d.tele(flight);
    const h = spawn({ kind, x: lane(x), fromX: bossX + 1.2, T: t, rallyIndex, wide, revealed: false, punched: false });
    if (kind === 'claim') hint(rallyIndex > 0 ? 'rally' : 'claim');
    if (kind === 'drop') hint('drop');
    if (kind === 'decoy') hint('decoy');
    d.emit({ type: 'throw', kind, hazard: h });
    return h;
  };
  const sweep = () => { hint('sweep'); d.emit({ type: 'throw', kind: 'sweep' }); return spawn({ kind: 'sweep', z: THROW.sweepFrom, windup: d.tele(0.6) }); };
  const stamp = (side) => {
    hint('stamp');
    const x0 = side < 0 ? -RTS.halfWidth : RTS.halfWidth - THROW.stampWidth;
    return spawn({ kind: 'stamp', x0, x1: x0 + THROW.stampWidth, T: d.tele(THROW.stampTele), live: THROW.stampLive });
  };
  // The rally's next case from him: aimed at Butch, or (later) sent wide.
  const volley = (count) => {
    const s = seg();
    const flight = Math.max(THROW.minFlight, THROW.flight * THROW.volley ** count);
    const wideChance = s.id === 'overdue' ? 0.35 : s.id === 'no-claim' ? 0.45 : 0;
    const wide = count > 0 && d.rng() < wideChance;
    const x = wide ? (body.x > 0 ? -1.7 : 1.7) + d.rng.range(-0.3, 0.3) : body.x + body.vx * flight * 0.3;
    const decoy = s.id === 'no-claim' && count > 0 && d.rng() < 0.4 && !rally?.decoyed;
    if (decoy) {
      if (rally) rally.decoyed = true;
      throwAt('decoy', x, { flight, rallyIndex: count });
      // The real one follows the decoy.
      d.after(d.tele(flight) + d.tele(0.75), () => { if (rally) throwAt('claim', body.x, { flight: Math.max(THROW.minFlight, flight * 1.05), rallyIndex: count }); }, 'rally');
      return;
    }
    throwAt('claim', x, { flight, rallyIndex: count, wide });
  };
  const startRally = () => {
    rally = { count: 0, need: seg().rally, decoyed: false };
    volley(0);
  };

  // A beat of his: returns the seconds to the next beat.
  const BEATS = {
    tender: [() => { if (!rally) { rally = { count: 0, need: 1 }; throwAt('claim', body.x + 0.6, { flight: THROW.teachFlight }); } return 2.6; }],
    'return-to-sender': [
      () => { throwAt('drop', body.x); d.after(d.tele(0.5), () => throwAt('drop', body.x + body.vx * 0.4)); return 2.0; },
      () => { if (!rally) startRally(); return 3.4; },
      () => { [-1.8, 0, 1.8].forEach((x, i) => d.after(i * 0.32, () => throwAt('drop', x + d.rng.range(-0.3, 0.3), { flight: 1.15 }))); return 2.4; },
      () => { if (!rally) startRally(); return 3.6; },
    ],
    overdue: [
      () => { stamp(body.x > 0 ? 1 : -1); d.after(0.55, () => throwAt('drop', body.x > 0 ? -1.4 : 1.4)); return 2.2; },
      () => { if (!rally) startRally(); d.after(1.6, () => { if (rally) sweep(); }); return 4.2; },
      () => { sweep(); d.after(0.9, () => throwAt('drop', body.x)); return 2.3; },
      () => { if (!rally) startRally(); d.after(1.2, () => { if (rally) stamp(body.x > 0 ? -1 : 1); }); return 4.4; },
    ],
    'no-claim': [
      () => { if (!rally) startRally(); return 4.6; },
      () => { stamp(body.x > 0 ? 1 : -1); d.after(0.4, () => sweep()); return 2.4; },
      () => { if (!rally) startRally(); d.after(1.5, () => { if (rally) throwAt('drop', body.x); }); return 4.8; },
      () => { [1.8, -1.8, 0].forEach((x, i) => d.after(i * 0.3, () => throwAt('drop', x, { flight: 1.1 }))); return 2.2; },
    ],
  };

  // ---------------------------------------------------------------- Butch
  const stepBody = (dt, input) => {
    body.dashCd = Math.max(0, body.dashCd - dt);
    body.dashInv = Math.max(0, body.dashInv - dt);
    body.punch = Math.max(0, body.punch - dt);
    body.whiff = Math.max(0, body.whiff - dt);
    const ix = clamp(Number(input.x) || 0, -1, 1);
    if (ix) body.facing = Math.sign(ix);
    if (input.dash && body.dashCd <= 0) {
      body.dashT = RTS.dashTime; body.dashCd = RTS.dashCd; body.dashInv = RTS.dashInv; body.dashDir = ix ? Math.sign(ix) : body.facing;
      d.emit({ type: 'dash' });
    }
    if (body.dashT > 0) { body.dashT = Math.max(0, body.dashT - dt); body.vx = body.dashDir * RTS.dashSpeed; } else body.vx = approach(body.vx, ix * RTS.speed, RTS.accel * dt);
    body.x = clamp(body.x + body.vx * dt, -RTS.halfWidth + RTS.halfW, RTS.halfWidth - RTS.halfW);
    if (Math.abs(body.x) >= RTS.halfWidth - RTS.halfW - 1e-6) body.vx = 0;
    body.moving = Math.abs(body.vx) > 0.4;
    if (input.jump && body.grounded) { body.vy = RTS.jumpV; body.grounded = false; d.emit({ type: 'jump' }); }
    if (!body.grounded) {
      body.vy -= RTS.gravity * (input.jumpHeld || body.vy < 0 ? 1 : 1.8) * dt;
      body.y += body.vy * dt;
      if (body.y <= 0) { body.y = 0; body.vy = 0; body.grounded = true; d.emit({ type: 'land' }); }
    }
  };
  const halfW = () => RTS.halfW * d.tuning.hurt;

  // E: punch the claim landing in Butch's ring (a decoy is refused). A press
  // a little early is held (THROW.buffer) and lands when the window opens.
  let held = null; // { until } a buffered press
  const inReach = (h) => Math.abs(body.x - h.x) <= THROW.claimRing + halfW() && body.y <= 2.2;
  const landing = (h) => !h.done && !h.punched && (h.kind === 'claim' || h.kind === 'decoy');
  const findTarget = ({ decoys = true } = {}) => {
    const win = d.win(THROW.window);
    let best = null;
    for (const h of hazards) {
      if (!landing(h) || (!decoys && h.kind === 'decoy')) continue;
      const left = h.T - h.age;
      if (Math.abs(left) > win || !inReach(h)) continue;
      if (!best || Math.abs(left) < Math.abs(best.left)) best = { h, left };
    }
    return best;
  };
  const punch = () => {
    if (body.whiff > 0) return;
    body.punch = 0.22;
    const win = d.win(THROW.window);
    const best = findTarget();
    if (!best) {
      // a claim landing within the buffer: hold the press for it
      const coming = hazards.some((h) => landing(h) && h.kind === 'claim' && h.T - h.age > win && h.T - h.age - win <= THROW.buffer);
      if (coming) { held = { until: d.clock + THROW.buffer }; return; }
      // in its window, but Butch is not in the ring
      const astray = hazards.some((h) => landing(h) && Math.abs(h.T - h.age) <= win && !inReach(h));
      if (astray) { d.emit({ type: 'act', result: 'outside' }); return; }
      const early = hazards.some((h) => landing(h) && h.T - h.age > win && h.T - h.age < 0.9);
      if (!early) body.whiff = 0.22;
      d.emit({ type: 'act', result: early ? 'early' : 'none' });
      return;
    }
    land(best);
  };
  // A held press: punch as soon as a claim (never a decoy) is in its window.
  const stepHeld = () => {
    if (!held) return;
    const best = findTarget({ decoys: false });
    if (best) { held = null; body.punch = 0.22; land(best); return; }
    if (d.clock >= held.until) {
      held = null;
      const astray = hazards.some((h) => landing(h) && Math.abs(h.T - h.age) <= d.win(THROW.window) && !inReach(h));
      d.emit({ type: 'act', result: astray ? 'outside' : 'early' });
    }
  };
  const land = (best) => {
    const { h, left } = best;
    h.punched = true;
    if (h.kind === 'decoy') {
      h.done = true;
      d.emit({ type: 'act', result: 'decoy', hazard: h });
      d.emit({ type: 'hit', source: 'decoy', from: { x: h.x, y: 1 } });
      return;
    }
    const perfect = Math.abs(left) <= d.win(THROW.perfect);
    h.done = true;
    d.stats.returns += 1;
    if (perfect) d.stats.perfect += 1;
    const flight = perfect ? THROW.backPerfect : THROW.back;
    const back = spawn({ kind: 'return', x: h.x, T: flight, perfect, rallyIndex: h.rallyIndex });
    d.emit({ type: 'act', result: perfect ? 'volley' : 'returned', hazard: h, back, x: h.x });
  };

  // A return reaches him: he volleys it, or (rally done) it hits him.
  const returnArrives = (h) => {
    if (!rally) return;
    rally.count += 1;
    if (rally.count >= rally.need) {
      rally = null;
      wins += 1;
      stagger = d.tele(1.5);
      d.cancelTimers('rally');
      d.emit({ type: 'rally-won', perfect: h.perfect, wins, need: seg().wins });
      d.seg.setProgress(Math.min(1, wins / seg().wins));
      if (wins >= seg().wins) { wins = 0; hazards.forEach((x) => { x.done = true; }); d.cancelTimers(); d.completeSegment(); beat = 0; beatClock = 2.2; }
      return;
    }
    d.emit({ type: 'volleyed', count: rally.count, need: rally.need });
    volley(rally.count);
  };
  const rallyBroken = (why) => {
    if (!rally) return;
    rally = null;
    d.cancelTimers('rally');
    d.emit({ type: 'rally-lost', why });
  };

  const stepHazards = (dt, vitals) => {
    for (const h of hazards) {
      if (h.done) continue;
      h.age += dt;
      if (h.kind === 'drop' || h.kind === 'claim' || h.kind === 'decoy') {
        if (h.kind === 'decoy' && !h.revealed && h.T - h.age <= d.tele(THROW.reveal)) { h.revealed = true; d.emit({ type: 'reveal', hazard: h }); }
        const late = h.kind === 'claim' ? d.win(THROW.window) : 0;
        if (h.age >= h.T + late) {
          h.done = true;
          const ring = h.kind === 'claim' ? THROW.ring : THROW.ring;
          const inRing = Math.abs(body.x - h.x) < ring + halfW() * 0.3 && body.y < 1.1;
          d.emit({ type: 'landed', hazard: h, inRing });
          if (inRing && vitals.inv <= 0 && body.dashInv <= 0) d.emit({ type: 'hit', source: LANDING_SOURCE[h.kind], from: { x: h.x, y: 0.6 } });
          if (h.kind === 'claim') rallyBroken(inRing ? 'hit' : 'missed');
        }
      } else if (h.kind === 'return') {
        if (h.age >= h.T) { h.done = true; d.emit({ type: 'return-arrives', hazard: h }); returnArrives(h); }
      } else if (h.kind === 'sweep') {
        if (h.age < h.windup) continue;
        const prev = h.z;
        h.z = THROW.sweepFrom + d.pace(THROW.sweepSpeed) * (h.age - h.windup);
        if (prev < 0 && h.z >= 0) {
          const clear = body.y > THROW.sweepH - 0.05;
          if (!clear && vitals.inv <= 0 && body.dashInv <= 0) d.emit({ type: 'hit', source: 'sack', from: { x: body.x, y: 0.3 } });
        }
        if (h.z > 4) h.done = true;
      } else if (h.kind === 'stamp') {
        if (!h.struck && h.age >= h.T) {
          h.struck = true;
          d.emit({ type: 'stamp', hazard: h });
          const inside = body.x > h.x0 + 0.15 && body.x < h.x1 - 0.15;
          if (inside && vitals.inv <= 0 && body.dashInv <= 0) d.emit({ type: 'hit', source: 'stamp', from: { x: (h.x0 + h.x1) / 2, y: 0.4 } });
        }
        if (h.age >= h.T + h.live) h.done = true;
      }
    }
    for (let i = hazards.length - 1; i >= 0; i -= 1) {
      if (hazards[i].done) { d.emit({ type: 'despawn', hazard: hazards[i] }); hazards.splice(i, 1); }
    }
  };

  // ---------------------------------------------------------------- update
  const update = (dt, input = {}, vitals = { inv: 0 }) => {
    d.stepClock(dt);
    stagger = Math.max(0, stagger - dt);
    if (d.state === 'intro' && d.stateAge >= 1.4) { d.setState('play'); d.emit({ type: 'segment', index: d.seg.index, name: seg().name, id: seg().id, checkpoint: true }); }
    stepBody(dt, d.state === 'done' ? {} : input);
    if (input.act && d.state === 'play') punch();
    if (d.state === 'play') stepHeld(); else held = null;
    // He shuffles along the engine roof, toward where Butch is.
    bossTarget = clamp(body.x * 0.6, -2, 2);
    bossX = approach(bossX, bossTarget, 1.2 * dt);
    if (d.state === 'play' && stagger <= 0) {
      beatClock -= dt;
      if (beatClock <= 0) {
        const list = BEATS[seg().id];
        const gap = list[beat % list.length]();
        beat += 1;
        beatClock = d.tele(gap) * (1 - 0.12 * d.seg.progress);
      }
    }
    stepHazards(dt, vitals);
    if (d.state === 'finisher' && d.stateAge >= 1.8) { d.setState('done'); d.emit({ type: 'finished', piece: d.id }); }
    if (teach && d.clock > teach.until) teach = null;
    return d.flush();
  };

  // NORMAL: the segment's rallies start again. STORY: what is won stays.
  const checkpoint = (rollback) => {
    held = null;
    hazards.forEach((h) => { h.done = true; });
    hazards.length = 0;
    d.cancelTimers();
    rally = null;
    if (rollback === 'segment') { wins = 0; d.seg.restart(); }
    beat = 0;
    beatClock = 2.0;
    stagger = 0;
    Object.assign(body, { x: 0, y: 0, vx: 0, vy: 0, grounded: true, dashT: 0, punch: 0, whiff: 0 });
    return { x: 0, y: 0, rolledBack: rollback === 'segment' };
  };

  return pieceApi(d, {
    body,
    hazards,
    get bossX() { return bossX; },
    get rally() { return rally ? { ...rally } : null; },
    get wins() { return wins; },
    get stagger() { return stagger; },
    update,
    checkpoint,
    onHurt() { body.punch = 0; held = null; },
    jumpToSegment(i) {
      held = null;
      d.seg.jump(i);
      hazards.length = 0; d.cancelTimers(); rally = null; wins = 0; beat = 0; beatClock = 1.5;
      if (d.state === 'intro') d.setState('play');
    },
    // How long until each threat touches x (for the bot): what a player sees.
    threats(seen = hazards) {
      return seen.filter((h) => !h.done).map((h) => {
        if (h.kind === 'drop' || h.kind === 'decoy' || h.kind === 'claim') return { h, kind: h.kind, x: h.x, r: THROW.ring, t: h.T - h.age };
        if (h.kind === 'stamp') return { h, kind: 'stamp', x0: h.x0, x1: h.x1, t: h.T - h.age };
        if (h.kind === 'sweep') return { h, kind: 'sweep', t: h.age < h.windup ? (h.windup - h.age) + (-THROW.sweepFrom) / d.pace(THROW.sweepSpeed) : (0 - h.z) / d.pace(THROW.sweepSpeed) };
        return null;
      }).filter(Boolean);
    },
    hint() {
      if (d.state === 'intro' || d.state === 'done') return '';
      if (teach) return RTS_HINTS[teach.kind] ?? '';
      return '';
    },
    snapshot() {
      return {
        ...d.snapshotBase(), bossX: +bossX.toFixed(2), rally: rally ? { ...rally } : null, wins,
        body: { x: +body.x.toFixed(2), y: +body.y.toFixed(2) }, hazards: hazards.map((h) => ({ kind: h.kind, x: h.x === undefined ? null : +h.x.toFixed(2), t: h.T === undefined ? null : +(h.T - h.age).toFixed(2) })), stats: d.stats,
      };
    },
  });
}
