// Movement IV · THE PAINTED COUNTRY — take back the colour (round 11).
//
// Rosa's drafted sheet. Everything he throws is pigment, and pigment is
// Butch's weapon:
//   absorb   his paint lands where its ring closes (dodge the landing);
//            once down it is WET for WET_S: hold E beside it (or hold the
//            right mouse on it) for ABSORB_S to take it onto the brush.
//            Dashing through one of his sweeps as it passes takes its colour
//            too (the dash's i-frames carry Butch through).
//   return   hold R (or the left mouse) for RETURN_S: the stroke flies back
//            to him. It lands only while his brush is DRY, the beat after a
//            wash, when he is open; otherwise he paints it out and flicks it
//            back at Butch (it lands as paint, to take again).
// A fuller brush cuts deeper (PAINT_DAMAGE_BY_CHARGE) and weighs more: each
// colour slows Butch by BRUSH_WEIGHT. A hit spills the brush.
//
//   Phase 1 TAKE THE COLOUR  (100 → 70) drops, single sweeps, a wash.
//   Phase 2 THE WASH         (70 → 40) crossing sweeps, indigo tiles that
//                            stand up as walls, washes across Butch's row.
//   Phase 3 PAINTED OVER     (40 → 12) double washes, fast sweeps, a rain
//                            of drops. At 12 the night service arrives.

import { FIGHT_BOUNDS, clamp, createDirectorBase, driveScript, restartPhase } from '../conductorFight.js';
import { paintReturnDamage } from '../finaleModel.js';

export const PAINT_PHASES = Object.freeze([
  Object.freeze({ id: 'take-the-colour', name: 'TAKE THE COLOUR', from: 100, to: 70 }),
  Object.freeze({ id: 'the-wash', name: 'THE WASH', from: 70, to: 40 }),
  Object.freeze({ id: 'painted-over', name: 'PAINTED OVER', from: 40, to: 12 }),
]);

export const WET_S = 1.9;
export const ABSORB_S = 0.35;
export const ABSORB_REACH = 2.3;
export const RETURN_S = 0.3;
export const STROKE_FLIGHT_S = 0.55;
export const OPEN_S = 2.5;
export const BRUSH_WEIGHT = 0.07;
export const DROP = Object.freeze({ r: 1.2, flight: 1.1 });
export const SWEEP = Object.freeze({ speed: 7.5, width: 1.1, tele: 0.9 });
export const WASH = Object.freeze({ tele: 1.7, live: 0.8, width: 8 });
export const COVER = Object.freeze({ life: 5.6, half: 1.38, thick: 0.4 });
const COLOURS = Object.freeze(['soot', 'indigo', 'verdigris']);
const B = FIGHT_BOUNDS;

export function createPaintFight({ difficulty, seed = 31, startPhase = 0 } = {}) {
  const d = createDirectorBase({ phases: PAINT_PHASES, difficulty, seed, startPhase });
  const puddles = []; // { id, x, z, colour, wetLeft }
  const covers = []; // { id, x, z, yaw, left, attack, up }
  let serial = 0;
  let openUntil = -1;
  let hold = { kind: null, t: 0, target: null };
  let strokes = 0;
  let landed = 0;
  let blocked = 0;
  let absorbed = 0;
  let dashAbsorbs = 0;
  let teachStep = 0;
  let body0 = null;
  const isOpen = () => d.clock < openUntil;

  // ------------------------------------------------------------ attacks
  const colour = () => COLOURS[(serial += 1) % COLOURS.length];
  const drop = (x, z, { flight = DROP.flight, extra = false, flicked = false, teach = false } = {}) => {
    const spot = { x: clamp(x, B.minX + 1, B.maxX - 1), z: clamp(z, B.minZ + 1, B.maxZ - 1) };
    return d.spawn({ kind: 'drop', source: 'pigment', x: spot.x, z: spot.z, r: DROP.r, tele: d.flight(flight), live: 0, extra, meta: { colour: colour(), flicked, teach, paint: true }, harmless: teach });
  };
  const sweep = ({ axis = d.rng() < 0.5 ? 'x' : 'z', dir = d.rng.sign(), delay = 0, fast = 1, extra = false } = {}) => {
    const lo = axis === 'x' ? B.minZ - 0.5 : B.minX - 0.5;
    const hi = axis === 'x' ? B.maxZ + 0.5 : B.maxX + 0.5;
    const from = axis === 'x' ? (dir > 0 ? B.minX - 1 : B.maxX + 1) : (dir > 0 ? B.minZ - 1 : B.maxZ + 1);
    const to = axis === 'x' ? (dir > 0 ? B.maxX + 1 : B.minX - 1) : (dir > 0 ? B.maxZ + 1 : B.minZ - 1);
    return d.spawn({ kind: 'sweep', source: 'sweep', axis, from, to, speed: (SWEEP.speed * fast) / d.tuning.flight, width: SWEEP.width, lo, hi, tele: d.tele(SWEEP.tele) + delay, jumpable: true, extra, meta: { colour: colour() } });
  };
  // A wash floods a band (a strip across x, or the near or far half) after a
  // long, clear warning, then leaves his brush dry: he is open.
  const wash = (band, { delay = 0, opens = true, extra = false } = {}) => {
    const a = d.spawn({ kind: 'zone', source: 'wash', ...band, tele: d.tele(WASH.tele) + delay, live: WASH.live, extra, meta: { opens, colour: colour() } });
    return a;
  };
  const stripAt = (x) => { const half = WASH.width / 2; const cx = clamp(x, B.minX + half, B.maxX - half); return { x0: cx - half, x1: cx + half, z0: B.minZ - 0.5, z1: B.maxZ + 0.5 }; };
  // A band across the sheet, 6 m deep, on Butch's row (three steps out).
  const rowAt = (z) => { const cz = clamp(z, B.minZ + 3, B.maxZ - 3); return { x0: B.minX - 0.5, x1: B.maxX + 0.5, z0: cz - 3, z1: cz + 3 }; };
  const cover = (x, z, yaw) => {
    if (covers.filter((c) => c.left > 0).length >= 3) return null;
    const attack = d.spawn({ kind: 'drop', source: 'cover', x, z, r: 1.0, tele: d.flight(1.0), live: 0, meta: { cover: true, yaw } });
    const item = { id: `cover-${(serial += 1)}`, x, z, yaw, left: COVER.life + d.flight(1.0), attack, up: false };
    covers.push(item);
    return item;
  };

  // ------------------------------------------------------------ brush
  const setWeight = (body) => { body.speedScale = 1 - BRUSH_WEIGHT * body.color; };
  const take = (body, via, puddle = null) => {
    if (body.color >= 3) return false;
    body.color += 1;
    absorbed += 1;
    if (via === 'dash') dashAbsorbs += 1;
    setWeight(body);
    if (puddle) { puddle.wetLeft = 0; puddle.taken = true; }
    d.emit({ type: 'absorb', via, charge: body.color, colour: puddle?.colour ?? null, x: puddle?.x ?? body.x, z: puddle?.z ?? body.z });
    return true;
  };
  const nearestPuddle = (body, aim = null) => puddles
    .filter((p) => p.wetLeft > 0 && !p.taken)
    .map((p) => ({ p, dist: Math.hypot(p.x - body.x, p.z - body.z), aimDist: aim ? Math.hypot(p.x - aim.x, p.z - aim.z) : 0 }))
    .filter(({ dist, aimDist }) => (aim ? dist <= 4.2 && aimDist <= 2.4 : dist <= ABSORB_REACH))
    .sort((a, b) => a.dist - b.dist)[0]?.p ?? null;
  const release = (body) => {
    const charge = body.color;
    body.color = 0;
    setWeight(body);
    strokes += 1;
    body.attack = 0.3;
    const arrives = d.clock + STROKE_FLIGHT_S;
    d.emit({ type: 'stroke', charge, x: body.x, z: body.z, flight: STROKE_FLIGHT_S });
    d.after(STROKE_FLIGHT_S, () => {
      if (arrives <= openUntil + 1e-6) {
        landed += 1;
        d.emit({ type: 'stroke-landed', charge });
        d.damage(paintReturnDamage(charge), 'returned-pigment', { charge });
      } else {
        blocked += 1;
        d.emit({ type: 'stroke-blocked', charge });
        // He paints it out and flicks it back: it lands as paint near Butch.
        for (let i = 0; i < charge; i += 1) d.after(0.25 * i, () => { if (body0) drop(body0.x + d.rng.range(-1.5, 1.5), body0.z + d.rng.range(-1.5, 1.5), { flight: 1.15, flicked: true }); }, 'flick');
      }
    }, 'stroke');
  };
  const updateHold = (dt, body, input) => {
    const want = input.retHeld ? 'return' : input.actHeld ? 'absorb' : null;
    if (want !== hold.kind) hold = { kind: want, t: 0, target: null, done: false };
    if (!want || hold.done || d.state === 'interlude' || d.state === 'done') return;
    if (want === 'absorb') {
      const target = nearestPuddle(body, input.aim ?? null);
      if (target !== hold.target) { hold.target = target; hold.t = 0; }
      if (!target || body.color >= 3) return;
      hold.t += dt;
      if (hold.t >= ABSORB_S) { take(body, 'hold', target); hold.done = true; }
    } else {
      if (body.color < 1) return;
      hold.t += dt;
      if (hold.t >= RETURN_S) { release(body); hold.done = true; }
    }
  };

  // ------------------------------------------------------------ scripts
  const near = (body, min, max) => { const a = d.rng.range(0, Math.PI * 2); const r = d.rng.range(min, max); return { x: body.x + Math.cos(a) * r, z: body.z + Math.sin(a) * r }; };
  const awayStrip = (body) => stripAt(body.x > 0 ? B.minX + WASH.width / 2 + 0.5 : B.maxX - WASH.width / 2 - 0.5);
  const SCRIPTS = {
    'take-the-colour': {
      teach(body) {
        teachStep = 0;
        const p = near(body, 2.4, 3.2);
        drop(p.x, p.z, { flight: 1.6, teach: true });
      },
      teachDone(body) {
        if (teachStep === 0 && body.color >= 1) { teachStep = 1; wash(awayStrip(body), { delay: 0.2 }); }
        return teachStep === 1 && strokes >= 1;
      },
      loop: [
        (body) => { drop(body.x, body.z); d.after(0.5, () => drop(body.x, body.z, { extra: true })); return 1.5; },
        (body) => { sweep(); d.after(0.6, () => drop(body.x, body.z)); return 1.9; },
        (body) => { drop(body.x, body.z); const p = near(body, 3, 5); drop(p.x, p.z, { flight: 1.3, extra: true }); return 1.8; },
        (body) => { wash(stripAt(body.x)); return 3.0; },
        (body) => { drop(body.x, body.z); d.after(0.5, () => drop(body.x, body.z, { extra: true })); return 1.6; },
        () => { sweep(); return 1.6; },
      ],
    },
    'the-wash': {
      teach(body) {
        sweep({ axis: 'x', dir: body.x > 0 ? -1 : 1 });
        sweep({ axis: 'z', dir: body.z > 0 ? -1 : 1, delay: 0.7 });
        d.after(d.tele(SWEEP.tele) + 4.5, () => { teachStep = 2; }, 'teach');
        teachStep = 1;
      },
      teachDone: () => teachStep === 2,
      loop: [
        (body) => { sweep({ axis: 'x' }); sweep({ axis: 'z', delay: 0.55, extra: true }); d.after(0.9, () => drop(body.x, body.z)); return 2.0; },
        (body) => { const yaw = d.rng.range(0, Math.PI); cover(clamp(body.x + d.rng.range(-3, 3), B.minX + 2, B.maxX - 2), clamp(body.z - 2.5, B.minZ + 2, B.maxZ - 2), yaw); cover(clamp(body.x + d.rng.range(-5, 5), B.minX + 2, B.maxX - 2), clamp(body.z + 2.5, B.minZ + 2, B.maxZ - 2), yaw + Math.PI / 2); drop(body.x, body.z); return 1.9; },
        (body) => { wash(rowAt(body.z)); return 3.1; },
        (body) => { drop(body.x, body.z); d.after(0.45, () => drop(body.x, body.z)); return 1.7; },
        (body) => { sweep({ fast: 1.15 }); d.after(0.5, () => drop(body.x, body.z)); return 1.5; },
        (body) => { wash(stripAt(body.x)); const p = near(body, 4, 6); drop(p.x, p.z, { extra: true }); return 3.0; },
      ],
    },
    'painted-over': {
      teach(body) {
        const first = stripAt(body.x);
        wash(first, { opens: false });
        const second = stripAt(body.x + (body.x > 0 ? -WASH.width : WASH.width));
        wash(second, { delay: 0.9 });
        d.after(d.tele(WASH.tele) + 0.9 + WASH.live + 0.6, () => { teachStep = 3; }, 'teach');
        teachStep = 2;
      },
      teachDone: () => teachStep === 3,
      loop: [
        (body) => { for (let i = 0; i < 3; i += 1) d.after(i * 0.3, () => { const p = i === 0 ? body : near(body, 1.5, 4); drop(p.x, p.z, { extra: i === 2 }); }); return 2.0; },
        () => { sweep({ fast: 1.25 }); sweep({ fast: 1.25, delay: 0.6, extra: true }); return 1.8; },
        (body) => { const first = stripAt(body.x); wash(first, { opens: false }); wash(stripAt(body.x + (body.x > 0 ? -WASH.width : WASH.width)), { delay: 0.9 }); return 3.6; },
        (body) => { const yaw = d.rng.range(0, Math.PI); cover(clamp(body.x + 2.6, B.minX + 2, B.maxX - 2), clamp(body.z, B.minZ + 2, B.maxZ - 2), yaw); drop(body.x, body.z); return 1.6; },
        (body) => { sweep({ axis: 'x', fast: 1.25 }); sweep({ axis: 'z', fast: 1.25, delay: 0.5 }); d.after(0.7, () => drop(body.x, body.z)); return 1.9; },
      ],
    },
  };

  // ------------------------------------------------------------ walls
  // An indigo tile that has landed stands up as a wall for COVER.life:
  // Butch walks round it.
  const constrain = (from, to) => {
    let { x, z } = to;
    for (const c of covers) {
      if (!c.up || c.left <= 0) continue;
      const nx = Math.sin(c.yaw); const nz = Math.cos(c.yaw);
      const tx = Math.cos(c.yaw); const tz = -Math.sin(c.yaw);
      const fromAcross = (from.x - c.x) * nx + (from.z - c.z) * nz;
      const across = (x - c.x) * nx + (z - c.z) * nz;
      const along = (x - c.x) * tx + (z - c.z) * tz;
      if (Math.abs(along) > COVER.half) continue;
      if (fromAcross * across > 0 && Math.abs(across) >= COVER.thick) continue;
      const side = Math.sign(fromAcross || across || 1);
      const fix = side * COVER.thick - across;
      x += nx * fix; z += nz * fix;
    }
    return { x, z };
  };

  // ------------------------------------------------------------ update
  const update = (dt, body, input = {}) => {
    d.events = [];
    body0 = body;
    updateHold(dt, body, input);
    d.stepCore(dt, body);
    for (const event of d.events.slice()) {
      const a = event.attack;
      if (event.type === 'strike' && a?.meta?.paint) {
        puddles.push({ id: `paint-${(serial += 1)}`, x: a.x, z: a.z, colour: a.meta.colour, wetLeft: d.win(WET_S) * (a.meta.teach ? 6 : 1), teach: a.meta.teach });
        d.emit({ type: 'wet', x: a.x, z: a.z, colour: a.meta.colour });
      }
      if (event.type === 'strike' && a?.meta?.cover) { const c = covers.find((item) => item.attack === a); if (c) { c.up = true; d.emit({ type: 'wall', id: c.id, x: c.x, z: c.z, yaw: c.yaw }); } }
      if (event.type === 'remove' && a?.source === 'wash' && a.state === 'done' && a.meta.opens) {
        openUntil = d.clock + d.win(OPEN_S);
        d.emit({ type: 'open', until: openUntil, seconds: d.win(OPEN_S) });
        // The flood leaves colour behind to take.
        for (let i = 0; i < 2; i += 1) {
          const x = d.rng.range(Math.max(B.minX + 1, a.x0 + 1), Math.min(B.maxX - 1, a.x1 - 1));
          const z = d.rng.range(Math.max(B.minZ + 1, a.z0 + 1), Math.min(B.maxZ - 1, a.z1 - 1));
          puddles.push({ id: `paint-${(serial += 1)}`, x, z, colour: a.meta.colour, wetLeft: d.win(WET_S) + 0.6 });
          d.emit({ type: 'wet', x, z, colour: a.meta.colour });
        }
      }
    }
    // Dashing through a passing sweep takes its colour.
    if (body.dash > 0) {
      for (const a of d.attacks) {
        if (a.kind !== 'sweep' || a.state !== 'live' || a.dashTaken) continue;
        const along = a.axis === 'x' ? body.x : body.z;
        if (Math.abs(along - a.pos) < a.width / 2 + 0.5 && take(body, 'dash')) a.dashTaken = true;
      }
    }
    for (const p of puddles) p.wetLeft -= dt;
    for (let i = puddles.length - 1; i >= 0; i -= 1) if (puddles[i].wetLeft < -1) puddles.splice(i, 1);
    for (const c of covers) c.left -= dt;
    for (let i = covers.length - 1; i >= 0; i -= 1) if (covers[i].left <= 0) { d.emit({ type: 'wall-down', id: covers[i].id }); covers.splice(i, 1); }
    // The first lesson waits for the player: a dried teaching colour falls
    // again, and a missed open window is washed open again.
    if (d.state === 'teach' && d.teaching && d.track.index === 0) {
      const pending = d.attacks.length > 0;
      if (teachStep === 0 && body.color < 1 && !pending && !puddles.some((p) => p.wetLeft > 0 && !p.taken)) { const p = near(body, 2.4, 3.2); drop(p.x, p.z, { flight: 1.4, teach: true }); }
      if (teachStep === 1 && strokes === 0 && !pending && !isOpen()) {
        if (body.color < 1) { const p = near(body, 2.4, 3.2); drop(p.x, p.z, { flight: 1.4, teach: true }); } else wash(awayStrip(body), { delay: 0.6 });
      }
    }
    driveScript(d, dt, body, SCRIPTS, { movement: 3, finisherSeconds: 0 });
    return d.events;
  };

  const director = {
    id: 'painted',
    track: d.track,
    get state() { return d.state; },
    get attacks() { return d.attacks; },
    get puddles() { return puddles; },
    get covers() { return covers; },
    get open() { return isOpen(); },
    get openLeft() { return Math.max(0, openUntil - d.clock); },
    get hold() { return { kind: hold.kind, progress: hold.kind === 'absorb' ? Math.min(1, hold.t / ABSORB_S) : hold.kind === 'return' ? Math.min(1, hold.t / RETURN_S) : 0, target: hold.target?.id ?? null }; },
    get clock() { return d.clock; },
    get stats() { return { strokes, landed, blocked, absorbed, dashAbsorbs }; },
    update,
    constrain,
    walkable: (x, z) => !covers.some((c) => c.up && c.left > 0 && Math.abs((x - c.x) * Math.sin(c.yaw) + (z - c.z) * Math.cos(c.yaw)) < 0.6 && Math.abs((x - c.x) * Math.cos(c.yaw) - (z - c.z) * Math.sin(c.yaw)) < COVER.half + 0.3),
    setDifficulty: (id) => d.setDifficulty(id),
    threatAt: (x, z, options) => d.threatAt(x, z, options),
    onHurt(body) {
      if (body.color > 0) d.emit({ type: 'spilled', charge: body.color });
      body.color = 0;
      setWeight(body);
      hold = { kind: hold.kind, t: 0, target: null, done: true };
    },
    checkpoint(rollback = 'phase') {
      puddles.length = 0;
      covers.length = 0;
      openUntil = -1;
      hold = { kind: null, t: 0, target: null };
      restartPhase(d, rollback);
      const spot = d.safeSpot([[-6, 4.5], [6, 4.5], [0, 5], [-9, -2], [9, -2], [0, -3]]);
      return { x: spot.x, z: spot.z };
    },
    skipTeach() { if (d.state !== 'intro' && d.state !== 'teach') return; d.cancelTimers('teach'); d.clearAttacks(); puddles.length = 0; d.taught.add(d.track.phase.id); d.setState('fight'); },
    jumpToPhase(index) { d.clearAttacks(); d.cancelTimers(); puddles.length = 0; covers.length = 0; d.track.jump(index); d.setState('teach'); },
    damage: (amount) => d.damage(amount, 'debug'),
    objective(body) {
      const reach = (p) => Math.hypot(p.x - body.x, p.z - body.z);
      const sweepSoon = d.attacks.some((a) => a.kind === 'sweep' && a.state !== 'done');
      // Open and holding colour: return it now (it must land before he dries).
      if (body.color >= 1 && isOpen() && openUntil - d.clock > STROKE_FLIGHT_S + RETURN_S + 0.05) return { kind: 'return', x: body.x, z: body.z, holdRet: true };
      // A wash is coming: get colour ready, and stay out of its band.
      const wet = puddles.filter((p) => p.wetLeft > 0.3 && !p.taken).sort((a, b) => reach(a) - reach(b))[0];
      if (wet && body.color < 3) {
        const close = reach(wet) <= ABSORB_REACH - 0.3;
        return { kind: 'absorb', x: wet.x, z: wet.z, holdAct: close, aim: { x: wet.x, z: wet.z }, dashThrough: sweepSoon && body.color < 3 };
      }
      return { kind: 'wait', x: clamp(body.x * 0.6, -7, 7), z: clamp(body.z * 0.6, -3, 5), dashThrough: sweepSoon && body.color < 3 };
    },
    hint(body) {
      if (d.state !== 'teach') return '';
      const id = d.track.phase.id;
      if (id === 'take-the-colour') {
        if (teachStep === 0) return puddles.some((p) => p.wetLeft > 0) ? 'HOLD <kbd>E</kbd> BESIDE THE WET COLOUR · OR HOLD RIGHT MOUSE ON IT · ABSORB IT' : 'HIS PAINT LANDS WHERE THE RING CLOSES · THEN IT IS WET';
        return isOpen() ? 'HIS BRUSH IS DRY · HE IS OPEN · HOLD <kbd>R</kbd> · RETURN THE COLOUR' : 'HE WASHES A BAND OF THE SHEET · STAY OUT OF IT · AFTER IT HIS BRUSH IS DRY';
      }
      if (id === 'the-wash') return 'A SWEEP: <kbd>SPACE</kbd> OVER IT · OR <kbd>SHIFT</kbd> DASH THROUGH IT AND TAKE ITS COLOUR';
      return 'TWO WASHES, ONE AFTER THE OTHER · STEP INTO THE FIRST ONE’S BAND ONCE IT HAS FLOODED';
    },
    snapshot() {
      return {
        ...d.snapshotCore(), open: isOpen(), openLeft: +Math.max(0, openUntil - d.clock).toFixed(2), strokes, landed, blocked, absorbed, dashAbsorbs,
        puddles: puddles.filter((p) => p.wetLeft > 0 && !p.taken).map((p) => ({ x: +p.x.toFixed(2), z: +p.z.toFixed(2), colour: p.colour })),
        walls: covers.filter((c) => c.up).length, hold: director.hold,
      };
    },
  };
  return director;
}
