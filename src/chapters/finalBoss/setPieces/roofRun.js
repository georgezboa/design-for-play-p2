// Movement I · THE ROOF RUN (round 12): side-on, along the top of the night
// service at speed.
//
// The camera scrolls toward the engine at the scroll speed, and the left edge
// of the screen is where the carriage behind is uncoupled: it pushes. Butch
// runs the carriage roofs (jump the couplings), and the Conductor, standing
// huge on the engine ahead, hurls the lost-property office down the train:
//   case     a grey case rolling down the roofs: JUMP it (or dash through)
//   trunk    a trunk thrown high: its shadow on the roof fills, then it lands
//            and bounces once more, then rolls: stay out of the shadow
//   gantry   a signal gantry over the line (the train passes under it): its
//            red lamp and horn warn; DUCK (slide if running)
//   claim    a brass-tagged claim case, rolling: E as it reaches you punches
//            it back up the train to him (he reels); close in is a VOLLEY
//
//   S0 THE LAST CARRIAGE  teach: a slow case, a coupling, a claim (the train
//                         holds until one claim goes back)
//   S1 LUGGAGE            cases in pairs and threes, trunks, claims
//   S2 THE GANTRIES       gantries (the first one slow), mixed with cases
//   S3 UNCOUPLED          he uncouples carriages ahead: the couplings gape,
//                         the scroll quickens, everything together
// At the tender he turns to face Butch: RETURN TO SENDER.
//
// Train-frame metres: x toward the engine, y up from the roofs.

import { clamp, createPieceBase, pieceApi } from './kernel.js';
import { PLATFORM, circleHitsBox, createPlatformBody, hurtBox, placeBody, stepPlatformBody } from './platformer.js';

export const ROOF_RUN_SEGMENTS = Object.freeze([
  Object.freeze({ id: 'last-carriage', name: 'THE LAST CARRIAGE', share: 0.15, from: 0, to: 60, scroll: 4.2 }),
  Object.freeze({ id: 'luggage', name: 'LUGGAGE', share: 0.28, from: 60, to: 190, scroll: 5.4 }),
  Object.freeze({ id: 'gantries', name: 'THE GANTRIES', share: 0.28, from: 190, to: 320, scroll: 5.8 }),
  Object.freeze({ id: 'uncoupled', name: 'UNCOUPLED', share: 0.29, from: 320, to: 450, scroll: 6.4 }),
]);

export const ROOF = Object.freeze({
  half: 10.6, // the uncoupling edge, behind the scroll
  ahead: 8.6, // how far ahead of the scroll Butch can run
  spawnAhead: 11.6, // thrown luggage comes in here
  killY: -2.4,
  end: 450, // the scroll stops: the tender is just ahead
  tender: Object.freeze({ x0: 452.4, x1: 470 }),
  carriage: 20,
});

export const CASE = Object.freeze({ r: 0.42, speed: 9, warn: 0.75 });
export const CLAIM = Object.freeze({ r: 0.46, speed: 6.2, warn: 0.9, reach: [0.15, 1.95], sweet: [0.5, 1.2] });
export const TRUNK = Object.freeze({ half: 0.85, height: 1.3, flight: 1.15, bounce: 3.6, bounceT: 0.66, roll: 7, r: 0.55 });
export const GANTRY = Object.freeze({ speed: 17, warn: 1.2, y0: 1.0, y1: 4.2, half: 0.3 });

// The couplings: a gap after each carriage, wider once he uncouples them.
function buildCarriages() {
  const roofs = [{ id: 'roof-0', x0: -40, x1: 13, y: 0 }];
  const gapAt = (x) => (x < 190 ? 1.6 : x < 320 ? 1.6 + ((Math.floor(x / 20) % 3) * 0.4) : 2.5 + ((Math.floor(x / 20) % 3) * 0.45));
  let x = 13;
  let i = 1;
  while (x < ROOF.tender.x0 - 4) {
    const gap = gapAt(x);
    const x0 = x + gap;
    const x1 = Math.min(x0 + ROOF.carriage, ROOF.tender.x0 - 1.6);
    roofs.push({ id: `roof-${i}`, x0, x1, y: 0 });
    x = x1;
    i += 1;
  }
  roofs.push({ id: 'tender', x0: ROOF.tender.x0, x1: ROOF.tender.x1, y: 0 });
  return roofs;
}
export const ROOF_CARRIAGES = Object.freeze(buildCarriages().map((r) => Object.freeze(r)));
export const ROOF_GAPS = Object.freeze(ROOF_CARRIAGES.slice(1).map((r, i) => Object.freeze({ x0: ROOF_CARRIAGES[i].x1, x1: r.x0 })));

export function gapAt(x, pad = 0) {
  return ROOF_GAPS.find((g) => x > g.x0 - pad && x < g.x1 + pad) ?? null;
}
const roofAt = (x) => ROOF_CARRIAGES.find((r) => x >= r.x0 && x <= r.x1) ?? null;
// The nearest point on a roof at or after x (a safe place to stand).
export function safeRoofX(x, margin = 0.9) {
  for (const r of ROOF_CARRIAGES) {
    if (r.x1 - margin < x) continue;
    return Math.max(x, r.x0 + margin);
  }
  return x;
}

// The level: what he throws, keyed to the scroll's position (camX metres).
// [at, kind, options]. `arrive`: seconds after the trigger at which it
// reaches Butch (a combo's spacing is authored by arrival, so a gantry and
// the case after it are always the same beat apart, at any pace; STORY
// stretches the spacing). Without `arrive`, it is thrown with its warning
// and arrives when it arrives. `extra`: left out on STORY.
const L = (at, kind, options = {}) => Object.freeze({ at, kind, ...options });
export const ROOF_TIMELINE = Object.freeze([
  // S0 THE LAST CARRIAGE
  L(5, 'case', { speed: 5.6, teach: 'jump' }),
  L(16, 'case', { speed: 7 }),
  L(24, 'claim', { teach: 'claim' }),
  L(46, 'case', { arrive: 1.7 }), L(46, 'case', { arrive: 2.2, extra: true }),
  // S1 LUGGAGE
  L(64, 'trunk', { arrive: 1.7, teach: 'trunk' }),
  L(76, 'case'),
  L(84, 'case', { arrive: 1.6 }), L(84, 'case', { arrive: 2.05 }),
  L(94, 'claim'), L(102, 'trunk'), L(110, 'case'),
  L(118, 'trunk', { arrive: 1.3 }), L(118, 'case', { arrive: 2.35 }),
  L(128, 'claim'),
  L(136, 'case', { arrive: 1.6 }), L(136, 'case', { arrive: 2.0 }), L(136, 'case', { arrive: 2.4, extra: true }),
  L(148, 'trunk'),
  L(156, 'claim', { arrive: 1.7 }), L(156, 'case', { arrive: 2.45 }),
  L(168, 'case'),
  L(176, 'trunk', { arrive: 1.25 }), L(176, 'trunk', { arrive: 2.4, extra: true }),
  L(186, 'case'),
  // S2 THE GANTRIES
  L(195, 'gantry', { speed: 12, warn: 1.8, teach: 'gantry' }),
  L(210, 'case'), L(218, 'gantry'), L(226, 'claim'),
  L(234, 'gantry', { arrive: 1.9 }), L(234, 'case', { arrive: 2.7 }),
  L(246, 'trunk'), L(254, 'gantry'), L(260, 'case'),
  L(267, 'gantry', { arrive: 1.9 }), L(267, 'gantry', { arrive: 2.5, extra: true }),
  L(278, 'claim'),
  L(286, 'trunk', { arrive: 1.3 }), L(286, 'gantry', { arrive: 2.4 }),
  L(296, 'case', { arrive: 1.6 }), L(296, 'gantry', { arrive: 2.45 }),
  L(306, 'gantry'), L(313, 'claim'),
  // S3 UNCOUPLED
  L(326, 'case'), L(332, 'trunk'), L(340, 'gantry'), L(348, 'claim'),
  L(354, 'case', { arrive: 1.6 }), L(354, 'case', { arrive: 2.05 }),
  L(362, 'gantry', { arrive: 1.9 }), L(362, 'case', { arrive: 2.7 }),
  L(372, 'trunk', { arrive: 1.25 }), L(372, 'trunk', { arrive: 2.4, extra: true }),
  L(382, 'claim'),
  L(388, 'gantry'),
  L(394, 'case', { arrive: 1.6 }), L(394, 'case', { arrive: 2.0 }), L(394, 'case', { arrive: 2.4, extra: true }),
  L(404, 'trunk', { arrive: 1.3 }), L(404, 'gantry', { arrive: 2.45 }),
  L(414, 'claim'), L(420, 'case'),
  L(426, 'gantry', { arrive: 1.9 }), L(426, 'gantry', { arrive: 2.5, extra: true }),
  L(436, 'trunk'), L(442, 'claim'),
]);

export const ROOF_HINTS = Object.freeze({
  jump: '<kbd>SPACE</kbd> · JUMP THE CASE · HOLD FOR HIGHER',
  coupling: 'THE COUPLINGS · <kbd>SPACE</kbd> · JUMP ACROSS',
  claim: 'A BRASS CLAIM CASE · <kbd>E</kbd> AS IT REACHES YOU · PUNCH IT BACK TO HIM',
  trunk: 'A TRUNK · ITS SHADOW FILLS ON THE ROOF · STAY OUT OF IT',
  gantry: 'A SIGNAL GANTRY · <kbd>S</kbd> / <kbd>↓</kbd> · DUCK UNDER IT (RUNNING, YOU SLIDE)',
  uncoupled: 'HE IS UNCOUPLING THE CARRIAGES · THE GAPS WIDEN',
});

let serial = 0;

export function createRoofRun({ difficulty, seed = 11, startSegment = 0 } = {}) {
  const d = createPieceBase({ id: 'roof-run', movement: 0, name: 'THE ROOF RUN', view: 'side', segments: ROOF_RUN_SEGMENTS, difficulty, seed, startSegment });
  const body = createPlatformBody({ x: ROOF_RUN_SEGMENTS[startSegment].from - 1, y: 0 });
  const hazards = [];
  const warnings = [];
  let camX = ROOF_RUN_SEGMENTS[startSegment].from;
  let cursor = 0;
  let gate = null; // the teach: the train holds until a claim goes back
  let teach = null;
  let teachSeen = new Set();
  let returnsInSegment = 0;
  let stagger = 0;
  let reachedTender = false;
  const claimsIn = (s) => ROOF_TIMELINE.filter((e) => e.kind === 'claim' && e.at >= s.from && e.at < s.to).length || 1;

  const seekCursor = (x) => { cursor = ROOF_TIMELINE.findIndex((e) => e.at >= x); if (cursor < 0) cursor = ROOF_TIMELINE.length; };
  seekCursor(camX);

  const segment = () => d.seg.current;
  const scrollSpeed = () => d.pace(segment().scroll);
  const left = () => camX - ROOF.half;

  // ---------------------------------------------------------------- spawns
  const warn = (kind, lead, data = {}) => {
    const w = { id: `warn-${(serial += 1)}`, kind, left: lead, lead, ...data };
    warnings.push(w);
    d.emit({ type: 'warn', warning: w });
    return w;
  };
  const spawn = (spec) => {
    const h = { id: `${spec.kind}-${(serial += 1)}`, age: 0, done: false, ...spec };
    hazards.push(h);
    d.emit({ type: 'spawn', hazard: h });
    return h;
  };

  // How long before arriving at Butch a thrown thing has to be thrown,
  // when it moves at `speed` (train frame) and Butch keeps pace.
  const leadFor = (arrive, speed, contact = 0.5) => {
    const ahead = camX + ROOF.spawnAhead - body.x - contact;
    return arrive - ahead / Math.max(1, scrollSpeed() + speed);
  };
  const minLead = () => d.tele(0.5);

  const throwCase = ({ speed = CASE.speed, claim = false, arrive = null, teachKind = null } = {}) => {
    const v = d.pace(claim ? CLAIM.speed : speed);
    const natural = d.tele(claim ? CLAIM.warn : CASE.warn);
    const lead = arrive === null ? natural : Math.max(minLead(), leadFor(arrive, v));
    const w = warn(claim ? 'claim' : 'case', lead, { y: CASE.r });
    w.fire = () => spawn({
      kind: claim ? 'claim' : 'case', x: camX + ROOF.spawnAhead, y: claim ? CLAIM.r : CASE.r, r: claim ? CLAIM.r : CASE.r,
      vx: -v, teach: teachKind, dashable: true,
    });
  };

  const throwTrunk = ({ arrive = null } = {}) => {
    // He leads Butch: it lands where he will be, never over a coupling.
    const t = arrive === null ? d.tele(TRUNK.flight) : Math.max(d.tele(0.9), arrive);
    let target = clamp(body.x + scrollSpeed() * t * 0.85, left() + 3, camX + ROOF.ahead - 0.5);
    for (let i = 0; i < 6 && gapAt(target, TRUNK.half + 0.2); i += 1) target += 1.2;
    spawn({ kind: 'trunk', x: target, y: 0, landAt: t, phase: 'air', bounces: 0, dashable: true, from: camX + ROOF.spawnAhead });
  };

  const sendGantry = ({ speed = GANTRY.speed, warnLead = null, arrive = null, tries = 0 } = {}) => {
    const v = d.pace(speed);
    const lead = tries > 0 ? d.tele(0.35) : arrive === null ? d.tele(warnLead ?? GANTRY.warn) : Math.max(d.tele(0.8), leadFor(arrive, v, 0.8));
    const w = warn('gantry', lead, { y: (GANTRY.y0 + GANTRY.y1) / 2 });
    w.fire = () => {
      // Never across a coupling Butch is about to jump: a gantry over a gap
      // would ask him to duck in the air.
      const ahead = gapAt(body.x + 1.5, 2.5) || (!body.grounded && gapAt(body.x, 1.8));
      if (ahead && tries < 6) { d.after(0.28, () => sendGantry({ speed, tries: tries + 1 })); return; }
      spawn({ kind: 'gantry', x: camX + ROOF.spawnAhead + 1, vx: -v, dashable: false });
    };
  };

  const fire = (entry) => {
    if (entry.extra && d.tuning.thin) return;
    const arrive = entry.arrive === undefined ? null : entry.arrive * d.tuning.tele;
    if (entry.kind === 'case') throwCase({ speed: entry.speed ?? CASE.speed, arrive, teachKind: entry.teach ?? null });
    else if (entry.kind === 'claim') throwCase({ claim: true, arrive, teachKind: entry.teach ?? null });
    else if (entry.kind === 'trunk') throwTrunk({ arrive });
    else if (entry.kind === 'gantry') sendGantry({ speed: entry.speed ?? GANTRY.speed, warnLead: entry.warn ?? null, arrive });
    if (entry.teach && !teachSeen.has(entry.teach)) { teachSeen.add(entry.teach); teach = { kind: entry.teach, until: d.clock + 4.5 }; }
    if (entry.teach === 'claim') gate = { at: entry.at + 16, next: d.clock + 3.4 };
    d.emit({ type: 'throw', kind: entry.kind });
  };

  // ---------------------------------------------------------------- world
  const world = () => ({
    surfaces: ROOF_CARRIAGES,
    solids: [],
    minX: left(),
    maxX: camX + ROOF.ahead,
    killY: ROOF.killY,
  });

  const stepHazards = (dt, vitals) => {
    const box = hurtBox(body, d.tuning.hurt);
    for (const h of hazards) {
      if (h.done) continue;
      h.age += dt;
      if (h.kind === 'case' || h.kind === 'claim' || (h.kind === 'trunk' && h.phase === 'roll')) {
        if (h.returned) {
          // Flying back up the train to him.
          h.x += h.vx * dt; h.y += h.vy * dt; h.vy -= 6 * dt;
          if (h.x > camX + ROOF.spawnAhead + 2) { h.done = true; d.emit({ type: 'claim-hit', hazard: h, perfect: h.perfect }); }
          continue;
        }
        h.x += h.vx * dt;
        // Hop the couplings: a case never falls between carriages.
        const g = gapAt(h.x, h.r);
        if (g) {
          const t = clamp((g.x1 + h.r - h.x) / (g.x1 - g.x0 + h.r * 2), 0, 1);
          h.y = h.r + Math.sin(t * Math.PI) * 0.2;
        } else h.y = h.r;
        if (h.x < left() - 3) h.done = true;
      } else if (h.kind === 'trunk') {
        if (h.age >= h.landAt) {
          h.phase = h.bounces === 0 ? 'land' : 'land2';
          h.bounces += 1;
          d.emit({ type: 'trunk-land', hazard: h, x: h.x });
          const zone = { x0: h.x - TRUNK.half, x1: h.x + TRUNK.half, y0: 0, y1: TRUNK.height };
          if (boxOverlap(box, zone) && !(body.dashInv > 0)) d.emit({ type: 'hit', source: 'trunk', from: { x: h.x, y: 0.6 } });
          if (h.bounces === 1) {
            let next = h.x - TRUNK.bounce;
            if (gapAt(next, TRUNK.half)) next -= 1.4;
            h.x = next;
            h.landAt = h.age + d.tele(TRUNK.bounceT);
            h.phase = 'air';
          } else {
            h.phase = 'roll'; h.kind = 'trunk'; h.vx = -d.pace(TRUNK.roll); h.r = TRUNK.r; h.y = TRUNK.r;
          }
        }
        continue;
      } else if (h.kind === 'gantry') {
        h.x += h.vx * dt;
        if (h.x < left() - 3) h.done = true;
      }
      // Contact.
      if (h.done || h.returned || vitals.inv > 0) continue;
      if (h.dashable && body.dashInv > 0) continue;
      let touching = false;
      if (h.kind === 'gantry') touching = boxOverlap(box, { x0: h.x - GANTRY.half, x1: h.x + GANTRY.half, y0: GANTRY.y0, y1: GANTRY.y1 });
      else touching = circleHitsBox(h.x, h.y, h.r * 0.86, box);
      if (touching) {
        h.spent = true;
        d.emit({ type: 'hit', source: h.kind === 'trunk' ? 'trunk' : h.kind === 'claim' ? 'claim-case' : h.kind, from: { x: h.x, y: h.y ?? 1.5 } });
        if (h.kind !== 'gantry') h.done = true;
      }
    }
    for (let i = hazards.length - 1; i >= 0; i -= 1) {
      if (hazards[i].done) { d.emit({ type: 'despawn', hazard: hazards[i] }); hazards.splice(i, 1); }
    }
  };

  // E: punch a claim case that is about to reach Butch.
  const punch = () => {
    body.punch = 0.24;
    body.facing = 1;
    let best = null;
    for (const h of hazards) {
      if (h.kind !== 'claim' || h.returned || h.done) continue;
      const rel = h.x - body.x;
      const dy = Math.abs(h.y - (body.y + 0.9));
      if (rel >= CLAIM.reach[0] && rel <= d.win(CLAIM.reach[1] - CLAIM.reach[0]) + CLAIM.reach[0] && dy < 1.4 && (!best || rel < best.rel)) best = { h, rel };
    }
    if (!best) {
      const near = hazards.some((h) => h.kind === 'claim' && !h.returned && h.x - body.x > 0 && h.x - body.x < 5);
      d.emit({ type: 'act', result: near ? 'early' : 'none' });
      return;
    }
    const { h, rel } = best;
    h.returned = true;
    h.perfect = rel >= CLAIM.sweet[0] && rel <= CLAIM.sweet[1];
    h.vx = d.pace(h.perfect ? 30 : 22);
    h.vy = 4.5;
    d.stats.returns += 1;
    if (h.perfect) d.stats.perfect += 1;
    returnsInSegment += 1;
    stagger = 1.1;
    d.emit({ type: 'act', result: h.perfect ? 'volley' : 'returned', hazard: h, x: h.x, y: h.y });
    if (gate) gate = null;
  };

  // ---------------------------------------------------------------- update
  const update = (dt, input = {}, vitals = { inv: 0 }) => {
    d.stepClock(dt);
    stagger = Math.max(0, stagger - dt);
    if (d.state === 'intro' && d.stateAge >= 1.1) { d.setState('play'); d.emit({ type: 'segment', index: d.seg.index, name: segment().name, id: segment().id, checkpoint: true }); }
    const playing = d.state === 'play';
    // The scroll (the train holds while the teach claim waits).
    if (playing) {
      const held = gate && camX >= gate.at;
      if (!held) camX = Math.min(ROOF.end, camX + scrollSpeed() * dt);
      if (gate && d.clock >= gate.next && camX >= gate.at - 14) { gate.next = d.clock + d.tele(3.2); throwCase({ claim: true }); }
    } else if (d.state === 'finisher') camX = Math.min(ROOF.end, camX + scrollSpeed() * dt);
    // The timeline.
    if (playing) {
      while (cursor < ROOF_TIMELINE.length && ROOF_TIMELINE[cursor].at <= camX) {
        const entry = ROOF_TIMELINE[cursor];
        cursor += 1;
        fire(entry);
      }
    }
    for (let i = warnings.length - 1; i >= 0; i -= 1) {
      const w = warnings[i];
      w.left -= dt;
      if (w.left <= 0) {
        warnings.splice(i, 1);
        // A staggered Conductor drops what he was about to throw.
        if (stagger > 0 && w.kind !== 'gantry' && w.kind !== 'claim') { d.emit({ type: 'dropped', warning: w }); continue; }
        w.fire?.();
      }
    }
    // Butch.
    const wantPunch = Boolean(input.act) && d.state !== 'intro';
    const bodyEvents = stepPlatformBody(body, { x: d.state === 'done' ? 0 : input.x, jump: input.jump, jumpHeld: input.jumpHeld, dash: input.dash, duck: input.duck }, dt, world());
    for (const e of bodyEvents) {
      if (e.type === 'fell') {
        const x = safeRoofX(Math.max(body.lastSafe.x, left() + 3.5));
        placeBody(body, x, 0, 1);
        hazards.forEach((h) => { if (Math.abs(h.x - x) < 3 && h.kind !== 'gantry') h.done = true; });
        d.emit({ type: 'fall', source: 'coupling', x });
      } else d.emit(e);
    }
    if (wantPunch) punch();
    stepHazards(dt, vitals);
    // Progress: the run, and the claims returned on the way.
    const s = segment();
    if (playing) {
      const run = clamp((camX - s.from) / (s.to - s.from), 0, 1);
      d.seg.setProgress(Math.min(0.999, run * 0.7 + Math.min(1, returnsInSegment / claimsIn(s)) * 0.3));
      if (camX >= s.to - 1e-6 && !(s.to >= ROOF.end && body.x < ROOF.tender.x0)) {
        returnsInSegment = 0;
        d.completeSegment();
        if (d.state === 'finisher') { d.emit({ type: 'finisher', kind: 'tender' }); reachedTender = true; }
      }
    }
    if (d.state === 'finisher' && d.stateAge >= 1.4) { d.setState('done'); d.emit({ type: 'finished', piece: d.id }); }
    if (teach && d.clock > teach.until) teach = null;
    return d.flush();
  };

  // A torn last layer. NORMAL: the segment again, from its start. STORY:
  // he stands up where he is, and the nearby luggage is cleared.
  const checkpoint = (rollback) => {
    warnings.length = 0;
    d.cancelTimers();
    stagger = 0;
    if (rollback === 'segment') {
      const s = segment();
      camX = s.from;
      seekCursor(camX);
      d.seg.restart();
      returnsInSegment = 0;
      gate = null;
      hazards.length = 0;
      const x = safeRoofX(camX - 1);
      placeBody(body, x, 0, 1);
      return { x, y: 0, rolledBack: true };
    }
    hazards.forEach((h) => { h.done = true; });
    const x = safeRoofX(Math.max(body.x, left() + 3.5));
    placeBody(body, x, 0, 1);
    return { x, y: 0, rolledBack: false };
  };

  return pieceApi(d, {
    body,
    hazards,
    warnings,
    get camX() { return camX; },
    get stagger() { return stagger; },
    get gated() { return Boolean(gate && camX >= gate.at); },
    get reachedTender() { return reachedTender; },
    update,
    checkpoint,
    onHurt() { body.punch = 0; },
    // What a player can foresee (the bot plans with it): the roofs, the
    // edges as the scroll moves them, and where each seen hazard will be.
    forecast(seen = hazards) {
      const speed = scrollSpeed();
      const items = seen.filter((h) => !h.done && !h.returned).map((h) => ({ ...h }));
      return {
        world: (t) => ({ surfaces: ROOF_CARRIAGES, solids: [], minX: left() + speed * t, maxX: camX + ROOF.ahead + speed * t, killY: ROOF.killY }),
        hits(b, t) {
          const box = hurtBox(b, d.tuning.hurt);
          for (const h of items) {
            if (h.kind === 'gantry') {
              const x = h.x + h.vx * t;
              if (boxOverlap(box, { x0: x - GANTRY.half - 0.05, x1: x + GANTRY.half + 0.05, y0: GANTRY.y0, y1: GANTRY.y1 })) return h.kind;
            } else if (h.kind === 'trunk' && h.phase === 'air') {
              const land = h.landAt - h.age;
              if (Math.abs(t - land) < 0.03 && b.dashInv <= 0 && boxOverlap(box, { x0: h.x - TRUNK.half - 0.1, x1: h.x + TRUNK.half + 0.1, y0: 0, y1: TRUNK.height })) return 'trunk';
              if (h.bounces === 0) {
                const land2 = land + d.tele(TRUNK.bounceT);
                const x2 = h.x - TRUNK.bounce;
                if (Math.abs(t - land2) < 0.03 && b.dashInv <= 0 && boxOverlap(box, { x0: x2 - TRUNK.half - 0.1, x1: x2 + TRUNK.half + 0.1, y0: 0, y1: TRUNK.height })) return 'trunk';
                if (t > land2) { const xr = x2 - d.pace(TRUNK.roll) * (t - land2); if (b.dashInv <= 0 && circleHitsBox(xr, TRUNK.r, TRUNK.r * 0.95, box)) return 'trunk'; }
              }
            } else {
              const x = h.x + h.vx * t;
              const g = gapAt(x, h.r);
              const y = g ? h.r + 0.2 : h.r;
              if (b.dashInv <= 0 && circleHitsBox(x, y, h.r * 0.95, box)) return h.kind;
            }
          }
          return null;
        },
      };
    },
    jumpToSegment(i) {
      d.seg.jump(i);
      camX = segment().from;
      seekCursor(camX);
      hazards.length = 0; warnings.length = 0; d.cancelTimers(); gate = null; returnsInSegment = 0;
      placeBody(body, safeRoofX(camX - 1), 0, 1);
      if (d.state === 'intro') d.setState('play');
    },
    hint() {
      if (d.state === 'intro') return '';
      if (teach) return ROOF_HINTS[teach.kind] ?? '';
      if (gate && camX >= gate.at - 2) return ROOF_HINTS.claim;
      const s = segment();
      if (s.id === 'last-carriage' && camX > 9 && camX < 20) return ROOF_HINTS.coupling;
      if (s.id === 'uncoupled' && d.segClock < 3.5) return ROOF_HINTS.uncoupled;
      return '';
    },
    snapshot() {
      return {
        ...d.snapshotBase(), camX: +camX.toFixed(2), gated: Boolean(gate && camX >= gate.at),
        body: { x: +body.x.toFixed(2), y: +body.y.toFixed(2), grounded: body.grounded, duck: body.duck },
        hazards: hazards.map((h) => ({ kind: h.kind, x: +h.x.toFixed(2), returned: Boolean(h.returned) })), warnings: warnings.map((w) => w.kind), stats: d.stats,
      };
    },
  });
}

function boxOverlap(a, b) { return a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1; }

export { PLATFORM };
