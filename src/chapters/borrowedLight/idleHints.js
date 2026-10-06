// Chapter 2 · BORROWED LIGHT — tiered idle hints, room by room (alpha r4).
//
// Pure (no Phaser). Like Chapter 1's hints (nightService/hints.js), three
// tiers on the wall clock, counted while the player is in control and not
// solving the room in front of him:
//
//   tier 1 ·  25 s  a pulse on the node (or prop) that matters now (repeats)
//   tier 2 ·  60 s  a toast naming the next action, keys and all (repeats)
//   tier 3 · 120 s  Butch's fuller line, in the caption bar (repeats)
//
// The clock starts again on progress: whenever the room, its step, or what
// is punched / powered in it changes. The pause menu's SHOW ME (a
// `nightfall:hint` window event) plays tier 2 at once, and tier 3 too once
// the step has reached it or on a second SHOW ME.
//
// roomStep(ctx) reads where Butch is and the state of the room's machines and
// returns the step he is on: { step, nodes, at? }. The words are in
// story.js (IDLE_HINTS), so every step has a nudge and a fuller line.

import { BENCH, FROM_HERE, HOTEL_WINDOW, machineById } from './level.js';

export const IDLE_TIERS = Object.freeze({ pulse: 25000, nudge: 60000, full: 120000 });
export const PULSE_REPEAT_MS = 12000;
export const NUDGE_REPEAT_MS = 45000;
export const FULL_REPEAT_MS = 60000;

const DX_B = 5960;
const DX_C = 7500;
const B = (x) => x + DX_B;
const C = (x) => x + DX_C;

/**
 * The idle clock and tier scheduler.
 */
export function createIdleHints({
  tiers = IDLE_TIERS, pulseRepeat = PULSE_REPEAT_MS, nudgeRepeat = NUDGE_REPEAT_MS, fullRepeat = FULL_REPEAT_MS,
} = {}) {
  let idle = 0;
  let key = null;
  let nextPulse = tiers.pulse;
  let nextNudge = tiers.nudge;
  let nextFull = tiers.full;
  let fullReached = false;
  let requests = 0;
  const rearm = () => {
    nextPulse = tiers.pulse;
    nextNudge = tiers.nudge;
    nextFull = tiers.full;
  };
  return {
    get idle() { return idle; },
    get key() { return key; },
    get tier() { return idle >= tiers.full ? 3 : idle >= tiers.nudge ? 2 : idle >= tiers.pulse ? 1 : 0; },
    /** Progress (or a new room): the clock starts again. Returns true on a change. */
    setKey(next) {
      if (next === key) return false;
      key = next;
      idle = 0;
      rearm();
      fullReached = false;
      requests = 0;
      return true;
    },
    /**
     * Advance the clock by `dt` ms of wall time. `active` is false while the
     * player is not in control (intro, dialogue, card, respawn, boarding).
     * Returns the tiers due now, in order: 'pulse' | 'nudge' | 'full'.
     */
    update(dt, { active = true } = {}) {
      if (!active || key == null) return [];
      idle += Math.max(0, Number(dt) || 0);
      const out = [];
      if (idle >= nextPulse) { out.push('pulse'); nextPulse = Math.max(idle, nextPulse) + pulseRepeat; }
      if (idle >= nextNudge) { out.push('nudge'); nextNudge = Math.max(idle, nextNudge) + nudgeRepeat; }
      if (idle >= nextFull) { fullReached = true; out.push('full'); nextFull = Math.max(idle, nextFull) + fullRepeat; }
      return out;
    },
    /** SHOW ME: the nudge now; the fuller line too once reached or on a second ask. */
    request() {
      if (key == null) return [];
      requests += 1;
      return fullReached || requests >= 2 ? ['pulse', 'nudge', 'full'] : ['pulse', 'nudge'];
    },
  };
}

const on = (ctx, x0, x1, y0 = -Infinity, y1 = Infinity) => ctx.x >= x0 && ctx.x < x1 && ctx.y >= y0 && ctx.y <= y1;

/**
 * The step Butch is on. `ctx`:
 *   { section, x, y, flags, carried, machine(id) → status, node(id) → status, queued(id) → bool }
 * Returns { step, nodes: [nodeIds to point at], at?: { x, y } } or null.
 */
export function roomStep(ctx) {
  const m = (id) => ctx.machine(id) ?? { powered: false, level: 0 };
  const q = (id) => Boolean(ctx.queued(id));
  const unpunched = (...ids) => {
    const left = ids.filter((id) => !q(id) && !ctx.node(id)?.powering);
    return left.length ? left : ids;
  };
  if (ctx.section === 'A') {
    if (ctx.x < 2000) return m('a-bridge1').powered ? { step: 'a1-cross', nodes: [] } : { step: 'a1', nodes: ['a-n1'] };
    if (on(ctx, 2000, 2900, 600)) return { step: 'a2', nodes: ['a-n2'] };
    if (on(ctx, 2900, 3700, -Infinity, 600)) return { step: 'walk-drop', nodes: [] };
    if (on(ctx, 3700, 5160, 600)) return { step: 'a3', nodes: unpunched('a-n4', 'a-n3') };
    if (on(ctx, 6420, 6680, 400)) return { step: 'a4-view', nodes: ['a-n7'] };
    if (on(ctx, 5160, 6840)) {
      if (q('a-n5') || m('a-bridge3').powered) return { step: 'a4-bridge', nodes: ['a-n6'] };
      return { step: 'a4', nodes: ['a-n6'] };
    }
    if (on(ctx, 6840, 7900)) return { step: 'a5', nodes: ['a-n8'] };
    if (on(ctx, 7900, 9460)) return { step: 'a6', nodes: ['a-n9'] };
    if (on(ctx, 9460, 10260)) return { step: 'walk-drop', nodes: [] };
    if (on(ctx, 10260, 11660)) return { step: 'a7', nodes: unpunched('a-n10', 'a-n11') };
    if (on(ctx, 11660, 13600)) {
      const last = ctx.node('a-n14');
      if (m('a-cradle1').powered && !q('a-n14') && !last?.powering) {
        const spot = FROM_HERE[0];
        return { step: 'a8-last', nodes: ['a-n14'], at: { x: spot.x, y: machineById(spot.on).y - 40 } };
      }
      return { step: 'a8', nodes: unpunched('a-n12', 'a-n13') };
    }
    return { step: 'walk-drop', nodes: [] };
  }
  if (ctx.section === 'B') {
    if (ctx.x < B(10100)) return { step: 'b1', nodes: ['b-n1'] };
    if (ctx.x < B(10900)) return { step: 'b2', nodes: ['b-n2'] };
    // Riding the hotel lift up.
    if (ctx.x >= B(12700) && ctx.x < B(13000) && ctx.y < 150) return { step: 'b-ride', nodes: [] };
    if (ctx.x < B(13000)) {
      const bridge = m('b-bridge');
      const far = ctx.x > B(12340) - 20;
      if (!far) {
        if (bridge.powered && bridge.cut) return { step: 'b-cross', nodes: [] };
        if (bridge.powered) return { step: 'b-cut', nodes: ['b-n4'] };
        return { step: 'b-rebridge', nodes: ['b-n4'] };
      }
      if (bridge.powered && !bridge.cut) return { step: 'b-cut-far', nodes: ['b-n4'] };
      if (!q('b-n5') && !m('b-hotel-lift').powered) return { step: 'b-lift', nodes: ['b-n5'] };
      return { step: 'b-ride', nodes: [] };
    }
    if (ctx.x < B(14000) && ctx.y < 0) {
      return ctx.flags.cardRead ? { step: 'walk-drop', nodes: [] } : { step: 'b-window', nodes: [], at: { x: HOTEL_WINDOW.x, y: HOTEL_WINDOW.y - 140 } };
    }
    if (ctx.x < B(15000)) {
      if (ctx.carried) return { step: 'b5-give', nodes: ['b-n9'] };
      if (m('b-bridge2').powered) return { step: 'b5-cross', nodes: [] };
      return { step: 'b5', nodes: ['b-nL1'] };
    }
    if (ctx.x < B(16010)) return ctx.carried ? { step: 'b6-decks', nodes: [] } : { step: 'b6', nodes: ['b-n7'] };
    if (ctx.x < B(17750)) {
      const top = ctx.y < 100;
      if (!top) {
        if (m('b-lift3').powered || ctx.given?.('b-n10')) return { step: 'b7-ride', nodes: [] };
        return ctx.carried ? { step: 'b7-give-lift', nodes: ['b-n10'] } : { step: 'b7', nodes: ['b-nL2'] };
      }
      if (ctx.carried) return { step: 'b7-give-bridge', nodes: ['b-n12'] };
      if (m('b-bridge3').powered || ctx.given?.('b-n12')) return { step: 'b7-cross', nodes: [] };
      return { step: 'b7-take', nodes: ['b-n11'] };
    }
    return { step: 'walk-drop', nodes: [] };
  }
  // C · the evacuation platform.
  if (ctx.x < C(17750)) {
    return ctx.flags.letterRead ? { step: 'c1', nodes: ['c-n1'] } : { step: 'c-letter', nodes: [], at: { x: BENCH.x, y: BENCH.y - 90 } };
  }
  if (ctx.x < C(18750) && ctx.y > 300) return { step: 'c2', nodes: ['c-n3'] };
  if (ctx.x < C(19950)) return { step: 'c3', nodes: ['c-n5'] };
  if (ctx.x < C(20630)) return m('c-drop').level > 0.1 ? { step: 'c4', nodes: ['c-n7'] } : { step: 'c4-across', nodes: [] };
  if (ctx.x < C(21390)) return { step: 'c4-walk', nodes: ['c-n6'] };
  return { step: 'c-board', nodes: [] };
}

/**
 * The key the clock watches: the step plus what is punched, given or powered
 * among its machines (progress inside a room resets the clock too).
 */
export function progressKey(ctx, hint) {
  if (!hint) return null;
  const parts = (hint.nodes ?? []).map((id) => {
    const n = ctx.node(id);
    return n ? `${n.queued ? 'q' : ''}${n.powering ? 'p' : ''}${n.given ? 'g' : ''}` : '';
  });
  return `${ctx.section}:${hint.step}:${parts.join(',')}:${ctx.carried ? 'c' : ''}`;
}
