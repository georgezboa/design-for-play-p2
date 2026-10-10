// Movement I · LOST PROPERTY — return to sender (round 11).
//
// The Chapter 1 carriage wall laid flat: four painted panels, his trains in
// the seams between them. He throws the office's cases at Butch; each lands
// where its ring closes. Most are unclaimed (a grey ring: dodge them). One
// in each pattern carries a claim (a brass ring, a brass tag): once it is
// down, its claim reads through the punch-hole lens, and a read claim can be
// punched back to its owner, the Conductor:
//   return   E within reach of a landed claim case under the lens.
//   VOLLEY   the same punch within VOLLEY_S of the landing ("on the
//            bounce"): stand at the ring's edge, lens on it, punch as it
//            lands. Worth half as much again as a late return.
// The lens follows the mouse (or the right stick); with neither it leads
// Butch, LENS_LEAD metres the way he faces, so facing a case reads it.
//
//   Phase 1 RETURN TO SENDER  (100 → 68) tosses at Butch, a rolling
//                             barrage (step out of its line), a ring of
//                             cases closing on him, a train in the seam.
//   Phase 2 TRAINS IN THE SEAMS (68 → 34) the seams are live; cases land
//                             across them; 1978 ghost trains, seen whole
//                             only through the lens (the seam glows sepia
//                             for them, so none is unannounced); the
//                             OVERDUE stamp comes down on Butch's panel.
//   Phase 3 UNCLAIMED         (34 → 0) stamps in chains, rings with the claim
//                             among them, quicker throws, ghost and present
//                             trains together. The 1978 layer bleeds
//                             through: the lens widens.
// The last return knocks him back and the lens opens under Butch: the fall
// into Borrowed Light.

import {
  FIGHT_BOUNDS, clamp, createDirectorBase, driveScript, restartPhase,
} from '../conductorFight.js';
import { LENS_RADIUS, PANEL_SEAMS } from '../finaleModel.js';

export const LOST_PHASES = Object.freeze([
  Object.freeze({ id: 'return-to-sender', name: 'RETURN TO SENDER', from: 100, to: 68 }),
  Object.freeze({ id: 'trains-in-the-seams', name: 'TRAINS IN THE SEAMS', from: 68, to: 34 }),
  Object.freeze({ id: 'unclaimed', name: 'UNCLAIMED', from: 34, to: 0 }),
]);

export const LENS_LEAD = 2.6;
export const LENS_WIDE = 3.05; // phase 3: the 1978 layer bleeds through
export const CASE_REACH = 2.7;
export const CASE_DROP_R = 1.05;
export const CASE_FLIGHT_S = 1.15;
export const CASE_LIE_S = 3.2;
export const UNCLAIMED_LIE_S = 1.6;
export const VOLLEY_S = 0.42;
export const CASE_DAMAGE = 6;
export const VOLLEY_DAMAGE = 10;
export const CASE_RETURN_FLIGHT_S = 0.7;
export const TRAIN = Object.freeze({ speed: 18, length: 8, tele: 1.1 });
export const STAMP = Object.freeze({ tele: 1.5, live: 0.3 });
const LIVE_CASES = 7;

const HW = PANEL_SEAMS.halfWidth;
const SEAM_X = PANEL_SEAMS.x;
const SEAM_Z = PANEL_SEAMS.z;
const B = FIGHT_BOUNDS;

export const PANELS = Object.freeze({
  nw: Object.freeze({ x0: B.minX, x1: SEAM_X - HW, z0: B.minZ, z1: SEAM_Z - HW }),
  ne: Object.freeze({ x0: SEAM_X + HW, x1: B.maxX, z0: B.minZ, z1: SEAM_Z - HW }),
  sw: Object.freeze({ x0: B.minX, x1: SEAM_X - HW, z0: SEAM_Z + HW, z1: B.maxZ }),
  se: Object.freeze({ x0: SEAM_X + HW, x1: B.maxX, z0: SEAM_Z + HW, z1: B.maxZ }),
});

export function panelOf(x, z) {
  const ew = x < SEAM_X - HW ? 'w' : x > SEAM_X + HW ? 'e' : null;
  const ns = z < SEAM_Z - HW ? 'n' : z > SEAM_Z + HW ? 's' : null;
  return ew && ns ? `${ns}${ew}` : null;
}

const PANEL_ORDER = ['nw', 'ne', 'se', 'sw'];
const panelCentre = (id) => { const p = PANELS[id]; return { x: (p.x0 + p.x1) / 2, z: (p.z0 + p.z1) / 2 }; };
const nearestPanel = (x, z) => panelOf(x, z) ?? PANEL_ORDER.slice().sort((a, b) => {
  const ca = panelCentre(a); const cb = panelCentre(b);
  return Math.hypot(ca.x - x, ca.z - z) - Math.hypot(cb.x - x, cb.z - z);
})[0];
// The panels next to one (across one seam), never the diagonal.
const neighbours = (id) => ({ nw: ['ne', 'sw'], ne: ['nw', 'se'], se: ['ne', 'sw'], sw: ['nw', 'se'] }[id]);

// A case never lands on a rail: it lies on the pictures, the seams stay clear.
export function placeCase(x, z) {
  let px = clamp(x, B.minX + 1.2, B.maxX - 1.2);
  let pz = clamp(z, B.minZ + 1.1, B.maxZ - 1.1);
  if (Math.abs(px - SEAM_X) < HW + 0.9) px = SEAM_X + Math.sign(px - SEAM_X || 1) * (HW + 0.95);
  if (Math.abs(pz - SEAM_Z) < HW + 0.9) pz = SEAM_Z + Math.sign(pz - SEAM_Z || 1) * (HW + 0.95);
  return { x: px, z: pz };
}

const underLens = (lens, x, z, radius) => Math.hypot(x - lens.x, z - lens.z) <= radius;

export function createLostPropertyFight({ difficulty, seed = 11, startPhase = 0 } = {}) {
  const d = createDirectorBase({ phases: LOST_PHASES, difficulty, seed, startPhase });
  const cases = [];
  let caseSerial = 0;
  let lens = { x: 0, z: 3.5 };
  let lensAimed = false;
  let teachCase = null;
  let returned = 0;
  let volleys = 0;

  const lensRadius = () => (d.track.index >= 2 ? LENS_WIDE : LENS_RADIUS);
  const liveCases = () => cases.filter((c) => !c.returned && !c.filed);

  // He throws a case to land at (x, z) after `flight` seconds.
  const throwCase = (x, z, { flight = CASE_FLIGHT_S, teach = false, extra = false, claim = false } = {}) => {
    if (liveCases().length >= LIVE_CASES && !teach && !claim) return null;
    const spot = placeCase(x, z);
    const id = `case-${(caseSerial += 1)}`;
    const attack = d.spawn({ kind: 'drop', source: 'case', x: spot.x, z: spot.z, r: CASE_DROP_R, tele: d.flight(flight), live: 0, extra, meta: { caseId: id, claim: claim || teach, serial: caseSerial } });
    if (!attack) return null;
    const item = { id, x: spot.x, z: spot.z, attack, landed: false, landedAt: 0, lieLeft: 0, returned: false, filed: false, teach, claim: claim || teach, serial: caseSerial };
    cases.push(item);
    return item;
  };

  const train = ({ seam, dir = d.rng.sign(), ghost = false, delay = 0, extra = false }) => {
    const along = seam === 'z' ? SEAM_Z : SEAM_X;
    const reach = seam === 'z' ? 24 : 22;
    const speed = TRAIN.speed / d.tuning.flight;
    return d.spawn({
      kind: 'train', source: ghost ? 'ghost-train' : 'train', seam, along, dir, speed, length: TRAIN.length, halfWidth: HW,
      start: -reach * dir, end: reach * dir + dir * TRAIN.length, tele: d.tele(TRAIN.tele) + delay, ghost, extra, meta: { ghost },
    });
  };

  const stamp = (panelId, { delay = 0, extra = false } = {}) => {
    const p = PANELS[panelId];
    return d.spawn({ kind: 'zone', source: 'stamp', x0: p.x0, x1: p.x1, z0: p.z0, z1: p.z1, tele: d.tele(STAMP.tele) + delay, live: STAMP.live, extra, meta: { panel: panelId } });
  };

  // The seam nearer Butch ('z' runs along x at SEAM_Z; 'x' runs along z).
  const nearestSeam = (body) => (Math.abs(body.z - SEAM_Z) < Math.abs(body.x - SEAM_X) ? 'z' : 'x');
  // A point in the panel across the nearer seam from Butch.
  const acrossSeam = (body) => {
    const seam = nearestSeam(body);
    return seam === 'z' ? { x: body.x + d.rng.range(-2, 2), z: 2 * SEAM_Z - body.z } : { x: 2 * SEAM_X - body.x, z: body.z + d.rng.range(-1.5, 1.5) };
  };
  const inPanel = (id) => { const p = PANELS[id]; return { x: d.rng.range(p.x0 + 1.4, p.x1 - 1.4), z: d.rng.range(p.z0 + 1.2, p.z1 - 1.2) }; };
  const otherPanel = (body) => {
    const mine = nearestPanel(body.x, body.z);
    return d.rng.pick(neighbours(mine));
  };

  // ------------------------------------------------------------ the scripts
  // The claim case of a pattern lands a few metres from Butch, never on him:
  // walking to its ring's edge while the rest come down is the move.
  const claimNear = (body, { flight = 1.5, min = 3, max = 6 } = {}) => {
    const angle = d.rng.range(0, Math.PI * 2);
    const r = d.rng.range(min, max);
    return throwCase(body.x + Math.cos(angle) * r, body.z + Math.sin(angle) * r, { flight, claim: true });
  };
  // A rolling barrage: cases landing one after another along a line that
  // marches through where Butch stands (step out of its path, not back).
  const barrage = (body, { count = 5, step = 0.26, spacing = 1.9, flight = 1.2 } = {}) => {
    const angle = d.rng.range(0, Math.PI * 2);
    const ux = Math.cos(angle); const uz = Math.sin(angle);
    for (let i = 0; i < count; i += 1) {
      const k = (i - (count - 1) / 2) * spacing;
      d.after(i * step, () => throwCase(body.x + ux * k, body.z + uz * k, { flight, extra: i === count - 1 }));
    }
  };
  // A ring: cases round Butch, then one on him. Leave through a gap.
  const ring = (body, { claimAt = -1, flight = 1.3, r = 2.6 } = {}) => {
    const turn = d.rng.range(0, Math.PI / 2);
    for (let k = 0; k < 4; k += 1) throwCase(body.x + Math.cos(turn + (k * Math.PI) / 2) * r, body.z + Math.sin(turn + (k * Math.PI) / 2) * r, { flight, claim: k === claimAt, extra: k !== claimAt && k === 3 });
    d.after(0.55, () => throwCase(body.x, body.z, { flight: flight * 0.8 }));
  };
  const SCRIPTS = {
    'return-to-sender': {
      teach(body) {
        teachCase = throwCase(body.x + (body.x > 6 ? -3.1 : 3.1), body.z - 1.3, { flight: 1.8, teach: true });
      },
      teachDone: () => teachCase?.returned,
      loop: [
        (body) => { throwCase(body.x, body.z); d.after(0.45, () => throwCase(body.x, body.z, { extra: true })); return 1.5; },
        (body) => { claimNear(body); d.after(0.5, () => throwCase(body.x, body.z)); d.after(1.0, () => throwCase(body.x, body.z, { extra: true })); return 2.5; },
        (body) => { barrage(body, { count: 4 }); return 2.1; },
        (body) => { train({ seam: nearestSeam(body) }); claimNear(body, { flight: 1.8 }); d.after(0.7, () => throwCase(body.x, body.z)); return 2.7; },
        (body) => { ring(body, { flight: 1.4 }); return 2.4; },
      ],
    },
    'trains-in-the-seams': {
      teach(body) {
        train({ seam: nearestSeam(body), delay: 0.2 });
        const spot = acrossSeam(body);
        teachCase = throwCase(spot.x, spot.z, { flight: 1.9, teach: true });
      },
      teachDone: () => teachCase && (teachCase.returned || teachCase.filed),
      loop: [
        (body) => { train({ seam: 'z' }); train({ seam: 'x', delay: 0.9, extra: true }); throwCase(body.x, body.z, { flight: 1.3 }); return 1.8; },
        // A claim across a seam, and a train on it: cross behind the train.
        (body) => { const seam = nearestSeam(body); const a = acrossSeam(body); throwCase(a.x, a.z, { flight: 1.6, claim: true }); train({ seam, delay: 0.5 }); d.after(0.4, () => throwCase(body.x, body.z)); return 2.8; },
        (body) => { train({ seam: nearestSeam(body), ghost: true }); barrage(body, { count: 4, flight: 1.15 }); return 2.1; },
        (body) => {
          // His stamp on Butch's panel, and a train in the seam he must cross.
          const mine = nearestPanel(body.x, body.z);
          stamp(mine);
          const next = d.rng.pick(neighbours(mine));
          const away = inPanel(next);
          throwCase(away.x, away.z, { flight: 1.7, claim: true });
          const seam = mine[1] !== next[1] ? 'x' : 'z';
          train({ seam, delay: d.rng.range(0, 0.6) });
          return 3.0;
        },
        (body) => { throwCase(body.x, body.z); d.after(0.42, () => throwCase(body.x, body.z)); train({ seam: nearestSeam(body) === 'z' ? 'x' : 'z', delay: 0.4, extra: true }); return 1.9; },
      ],
    },
    unclaimed: {
      teach(body) {
        const mine = nearestPanel(body.x, body.z);
        const [next, safe] = d.rng() < 0.5 ? neighbours(mine) : neighbours(mine).slice().reverse();
        stamp(mine);
        stamp(next, { delay: 0.9 });
        const spot = inPanel(safe);
        teachCase = throwCase(spot.x, spot.z, { flight: 2.0, teach: true });
        d.after(d.tele(STAMP.tele) + 1.4, () => { if (teachCase) teachCase.stampsDone = true; }, 'teach');
      },
      teachDone: () => teachCase?.stampsDone,
      loop: [
        (body) => { ring(body, { claimAt: Math.floor(d.rng() * 4), flight: 1.15 }); return 2.4; },
        (body) => { const seam = nearestSeam(body); const dir = d.rng.sign(); train({ seam, dir, ghost: true }); train({ seam, dir: -dir, delay: 0.7 }); barrage(body, { count: 5, step: 0.22, flight: 1.05 }); return 2.2; },
        (body) => {
          const mine = nearestPanel(body.x, body.z);
          const [next, safe] = d.rng() < 0.5 ? neighbours(mine) : neighbours(mine).slice().reverse();
          stamp(mine); stamp(next, { delay: 0.9, extra: true });
          const spot = inPanel(safe);
          throwCase(spot.x, spot.z, { flight: 1.8, claim: true });
          d.after(0.6, () => throwCase(body.x, body.z, { flight: 1.0 }));
          return 3.0;
        },
        (body) => { [0, 0.34, 0.68].forEach((t, i) => d.after(t, () => throwCase(body.x, body.z, { flight: 0.95, extra: i === 2 }))); return 1.7; },
        (body) => { train({ seam: 'z', ghost: d.rng() < 0.5 }); train({ seam: 'x', delay: 0.8 }); claimNear(body, { flight: 1.9, min: 4, max: 7 }); d.after(0.5, () => barrage(body, { count: 4, flight: 1.05 })); return 2.8; },
      ],
    },
  };

  // ------------------------------------------------------------ the lens
  const aimLens = (body, input) => {
    if (input?.aim && Number.isFinite(input.aim.x) && Number.isFinite(input.aim.z)) {
      lens = { x: clamp(input.aim.x, B.minX, B.maxX), z: clamp(input.aim.z, B.minZ, B.maxZ) };
      lensAimed = true;
    } else {
      lens = { x: clamp(body.x + body.facingX * LENS_LEAD, B.minX, B.maxX), z: clamp(body.z + body.facingZ * LENS_LEAD, B.minZ, B.maxZ) };
      lensAimed = false;
    }
  };

  // ------------------------------------------------------------ the punch
  const nearestLanded = (body) => cases.filter((c) => c.landed && !c.returned && !c.filed)
    .map((c) => ({ c, dist: Math.hypot(c.x - body.x, c.z - body.z) }))
    .sort((a, b) => a.dist - b.dist);

  const act = (body) => {
    if (d.state === 'interlude' || d.state === 'finisher' || d.state === 'done') return d.emit({ type: 'act', result: 'none' });
    const options = nearestLanded(body);
    // A read case in reach first; otherwise say why the punch did nothing.
    const read = options.find(({ c, dist }) => c.claim && dist <= CASE_REACH && underLens(lens, c.x, c.z, lensRadius()));
    if (!read) {
      const near = options.find(({ c }) => c.claim) ?? options[0];
      if (!near) return d.emit({ type: 'act', result: 'none' });
      if (!near.c.claim) return d.emit({ type: 'act', result: 'unclaimed', caseId: near.c.id });
      return d.emit({ type: 'act', result: near.dist > CASE_REACH ? 'out-of-reach' : 'unread', caseId: near.c.id });
    }
    const c = read.c;
    const volley = d.clock - c.landedAt <= d.win(VOLLEY_S);
    const damage = volley ? VOLLEY_DAMAGE : CASE_DAMAGE;
    c.returned = true;
    returned += 1;
    if (volley) volleys += 1;
    body.attack = 0.26;
    d.emit({ type: 'act', result: volley ? 'volley' : 'returned', caseId: c.id });
    d.emit({ type: 'return', caseId: c.id, x: c.x, z: c.z, volley, damage, flight: CASE_RETURN_FLIGHT_S });
    d.after(CASE_RETURN_FLIGHT_S, () => d.damage(damage, volley ? 'volleyed-claim' : 'returned-claim', { volley }), 'flight');
    return null;
  };

  // ------------------------------------------------------------ update
  const update = (dt, body, input = {}) => {
    d.events = [];
    aimLens(body, input);
    if (input.act) act(body);
    d.stepCore(dt, body);
    for (const event of d.events) {
      if (event.type === 'strike' && event.attack.meta?.caseId) {
        const c = cases.find((item) => item.id === event.attack.meta.caseId);
        if (c) { c.landed = true; c.landedAt = d.clock; c.lieLeft = c.claim ? d.win(CASE_LIE_S) * (c.teach ? 3 : 1) : UNCLAIMED_LIE_S; d.emit({ type: 'case-landed', caseId: c.id, x: c.x, z: c.z, claim: c.claim }); }
      }
    }
    for (const c of cases) {
      if (!c.landed || c.returned || c.filed) continue;
      c.lieLeft -= dt;
      if (c.lieLeft <= 0) { c.filed = true; d.emit({ type: 'case-filed', caseId: c.id }); }
    }
    // A teaching case that was filed unreturned comes again.
    if (d.state === 'teach' && d.teaching && teachCase?.filed && d.track.index === 0) {
      teachCase = throwCase(body.x + (body.x > 6 ? -3.1 : 3.1), body.z - 1.3, { flight: 1.8, teach: true });
    }
    for (let i = cases.length - 1; i >= 0; i -= 1) {
      if ((cases[i].returned || cases[i].filed) && d.clock - (cases[i].landedAt || 0) > 6) cases.splice(i, 1);
    }
    if (d.state === 'teach' && !d.teaching) teachCase = null;
    driveScript(d, dt, body, SCRIPTS, { movement: 0, finisherSeconds: 1.3 });
    return d.events;
  };

  const director = {
    id: 'lost',
    track: d.track,
    get state() { return d.state; },
    get attacks() { return d.attacks; },
    get cases() { return cases; },
    get lens() { return { ...lens, radius: lensRadius(), aimed: lensAimed }; },
    get clock() { return d.clock; },
    get stats() { return { returned, volleys }; },
    update,
    setDifficulty: (id) => d.setDifficulty(id),
    threatAt: (x, z, options) => d.threatAt(x, z, options),
    // The checkpoint after a torn last layer: the phase begins again from its
    // loop (its teaching was learned), the floor clear, his ticket back to
    // the phase's start on NORMAL.
    checkpoint(rollback = 'phase', body = null) {
      cases.length = 0;
      teachCase = null;
      restartPhase(d, rollback);
      const spot = d.safeSpot([[-6.5, 5.2], [6.5, 5.2], [-6.5, -3.6], [6.5, -3.6], [-9.5, 3], [9.5, 3]], (x, z) => Math.hypot(x - (body?.x ?? 0), z - (body?.z ?? 0)) * 0.2);
      return { x: spot.x, z: spot.z };
    },
    skipTeach() { if (d.state === 'intro' || d.state === 'teach') { d.cancelTimers('teach'); cases.length = 0; d.clearAttacks(); d.taught.add(d.track.phase.id); d.setState('fight'); d.beatClock = 0.6; } },
    jumpToPhase(index) { d.clearAttacks(); d.cancelTimers(); cases.length = 0; d.track.jump(index); d.setState('teach'); },
    damage: (amount) => d.damage(amount, 'debug'),
    // What a good player is doing right now (the bot, and the hint).
    objective(body) {
      const landed = nearestLanded(body).filter(({ c }) => c.claim && c.lieLeft > 0.25);
      const flying = cases.filter((c) => c.claim && !c.landed && !c.returned && !c.filed && c.attack.state === 'tele')
        .sort((a, b) => (a.attack.tele - a.attack.age) - (b.attack.tele - b.attack.age));
      const pick = landed[0]?.c ?? flying[0] ?? null;
      if (!pick) return { kind: 'wait', x: body.x, z: body.z };
      const dist = Math.hypot(pick.x - body.x, pick.z - body.z) || 1;
      const stand = { x: pick.x - ((pick.x - body.x) / dist) * 1.75, z: pick.z - ((pick.z - body.z) / dist) * 1.75 };
      return {
        kind: pick.landed ? 'return' : 'volley', caseId: pick.id, x: stand.x, z: stand.z, aim: { x: pick.x, z: pick.z },
        landsIn: pick.landed ? 0 : pick.attack.tele - pick.attack.age,
        ready: pick.landed && dist <= CASE_REACH && underLens(lens, pick.x, pick.z, lensRadius()),
      };
    },
    hint(body, { mouse = false } = {}) {
      if (d.state !== 'teach') return '';
      const id = d.track.phase.id;
      if (id === 'return-to-sender') {
        const c = teachCase;
        if (!c || !c.landed) return 'A CLAIM CASE IS COMING · STAND BY ITS BRASS RING, NOT IN IT';
        const dist = Math.hypot(c.x - body.x, c.z - body.z);
        if (!underLens(lens, c.x, c.z, lensRadius())) return mouse ? 'PUT THE LENS ON THE CASE · <kbd>MOUSE</kbd> · ITS CLAIM READS THROUGH IT' : 'FACE THE CASE · THE LENS LEADS YOU · ITS CLAIM READS THROUGH IT';
        if (dist > CASE_REACH) return 'WALK UP TO THE CASE';
        return '<kbd>E</kbd> · PUNCH IT BACK TO HIM · AS IT LANDS IS A VOLLEY';
      }
      if (id === 'trains-in-the-seams') return 'HIS TRAINS RUN IN THE SEAMS · CROSS BEHIND ONE · A SEPIA SEAM IS A 1978 TRAIN';
      return 'HIS STAMP COMES DOWN ON A WHOLE PANEL · LEAVE IT FOR ONE HE IS NOT STAMPING';
    },
    snapshot() {
      return {
        ...d.snapshotCore(), lens: { x: +lens.x.toFixed(2), z: +lens.z.toFixed(2), radius: lensRadius(), aimed: lensAimed }, returned, volleys,
        cases: cases.map((c) => ({ id: c.id, x: +c.x.toFixed(2), z: +c.z.toFixed(2), landed: c.landed, returned: c.returned, filed: c.filed, teach: c.teach, claim: c.claim })),
      };
    },
  };
  return director;
}
