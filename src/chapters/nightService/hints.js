// Chapter 1 // NIGHT SERVICE — progressive, wordless hints (pure logic).
//
// Three tiers replace the old single 45 s pulse. Idle time counts only while
// a step with a `hint` is waiting for the player (never during a walk, a
// dialogue, an open card or a locked beat) and resets on any meaningful input:
//
//   tier 1 ·  25 s  a soft pulse on the relevant element (repeats)
//   tier 2 ·  60 s  the ghost hand performs the exact gesture once, then fades
//   tier 3 · 120 s  one in-fiction line from the Conductor (hintLines.js)
//
// The first time a verb appears in the chapter the ghost hand demonstrates it
// after only 8 s of idling. The pause menu's SHOW ME (a `nightfall:hint`
// window event) plays tier 2 at once. PanelScene draws all of it; this file
// only decides when, and which gesture, so node tests can check the timing.

export const HINT_TIERS = Object.freeze({ pulse: 25000, ghost: 60000, caption: 120000 });
export const FIRST_USE_MS = 8000;
export const PULSE_REPEAT_MS = 12000;
export const GHOST_REPEAT_MS = 45000;

/** The verbs the ghost hand can demonstrate. */
export const VERBS = Object.freeze(['drag', 'zoom', 'click', 'zoomOut', 'frame', 'lens', 'lensClick']);

const asList = (value) => (Array.isArray(value) ? value : value == null ? [] : [value]);

// ---------------------------------------------------------------------------
// gestures

/**
 * Resolve a drag goal against the current layout. `spec` is one relation, or
 * a list of them (the first unmet one wins):
 *   { tile, leftOf } · { tile, rightOf } · { tile, above } · { tile, below } · { tile, slot }
 * Returns `{ tile, from, to }` (slot indices; dropping on `to` swaps), or null
 * when every relation already holds.
 */
export function resolveDrag(model, spec) {
  const { cols, rows } = model.layout;
  const slotOf = (tile) => model.slotOf(tile);
  const colOf = (index) => index % cols;
  const rowOf = (index) => Math.floor(index / cols);
  const move = (tile, to) => (to >= 0 && to < cols * rows && slotOf(tile) !== to ? { tile, from: slotOf(tile), to } : null);
  for (const rel of asList(spec)) {
    const a = slotOf(rel.tile);
    if (a < 0) continue;
    if (rel.slot !== undefined) {
      if (a !== rel.slot) return move(rel.tile, rel.slot);
      continue;
    }
    const pairs = [
      ['leftOf', 1, 0], ['rightOf', -1, 0], ['above', 0, 1], ['below', 0, -1],
    ];
    for (const [key, dc, dr] of pairs) {
      if (!rel[key]) continue;
      const other = rel[key];
      const b = slotOf(other);
      if (b < 0) break;
      const holds = colOf(b) - colOf(a) === dc && rowOf(b) - rowOf(a) === dr;
      if (holds) break;
      // prefer moving the named tile next to its partner; else bring the partner over
      const tc = colOf(b) - dc;
      const tr = rowOf(b) - dr;
      if (tc >= 0 && tc < cols && tr >= 0 && tr < rows) return move(rel.tile, tr * cols + tc);
      const pc = colOf(a) + dc;
      const pr = rowOf(a) + dr;
      if (pc >= 0 && pc < cols && pr >= 0 && pr < rows) return move(other, pr * cols + pc);
      // neither fits beside the other (a 1×2 wall): trade places
      if (colOf(a) - colOf(b) === dc && rowOf(a) - rowOf(b) === dr) return move(rel.tile, b);
      return null;
    }
  }
  return null;
}

function hotspotById(model, tile, id) {
  return model.hotspots(tile).find((h) => h.id === id) ?? null;
}

const centre = (rect) => ({ u: rect[0] + rect[2] / 2, v: rect[1] + rect[3] / 2 });

/** One candidate gesture → concrete data, or null when it does not apply now. */
function resolveGesture(model, g) {
  if (g.when !== undefined && !model.evaluate(g.when)) return null;
  if (g.drag) {
    const drag = resolveDrag(model, g.drag);
    return drag ? { kind: 'drag', verb: 'drag', ...drag } : null;
  }
  if (g.click) {
    const ids = asList(g.click.hotspot ?? g.click.hotspots);
    const h = ids.map((id) => hotspotById(model, g.click.tile, id)).find((entry) => entry?.enabled);
    if (!h) return null;
    if (h.era === 'past') return { kind: 'lens', verb: 'lensClick', tile: g.click.tile, hotspot: h.id, ...centre(h.rect), click: true };
    return { kind: 'click', verb: h.kind === 'zoom' ? 'zoom' : 'click', tile: g.click.tile, hotspot: h.id, ...centre(h.rect) };
  }
  if (g.zoomOut) {
    return model.canZoomOut(g.zoomOut) ? { kind: 'zoomOut', verb: 'zoomOut', tile: g.zoomOut } : null;
  }
  if (g.frame) {
    const frameId = g.frame.id ?? model.frameOn(g.frame.from);
    if (!frameId || !model.canLiftFrame(frameId)) return null;
    const host = model.state.frames[frameId]?.host;
    return { kind: 'frame', verb: 'frame', frame: frameId, from: host, to: g.frame.to };
  }
  if (g.lens) {
    if (!model.state.lens.enabled) return null;
    let { u, v } = g.lens;
    if (g.lens.hotspot) {
      const h = hotspotById(model, g.lens.tile, g.lens.hotspot);
      if (!h?.enabled) return null;
      ({ u, v } = centre(h.rect));
    }
    return { kind: 'lens', verb: g.click ? 'lensClick' : 'lens', tile: g.lens.tile, u, v, click: Boolean(g.click), hotspot: g.lens.hotspot ?? null };
  }
  return null;
}

/** The gestures a step's hint offers, most specific first (with defaults from the pulse hint). */
function candidates(hint) {
  if (!hint) return [];
  const list = asList(hint.ghost);
  if (list.length) return list;
  if (hint.hotspot) return [{ click: { tile: hint.tile, hotspot: hint.hotspot } }];
  if (hint.hotspots) return [{ click: { tile: hint.tile, hotspots: hint.hotspots } }];
  if (hint.zoomOut) return [{ zoomOut: hint.tile }];
  if (hint.drag) return [{ drag: hint.drag }];
  return [];
}

/**
 * The gesture the ghost hand should perform for the current step, or null.
 * @returns {null | {kind:'drag'|'click'|'zoomOut'|'frame'|'lens', verb:string, ...}}
 */
export function pickGesture(model, step = model.currentStep()) {
  for (const g of candidates(step?.hint)) {
    const out = resolveGesture(model, g);
    if (out) return out;
  }
  return null;
}

/** The verb a step teaches (for the first-use demonstration). */
export function stepVerb(model, step = model.currentStep()) {
  if (!step?.hint) return null;
  if (step.hint.verb) return step.hint.verb;
  return pickGesture(model, step)?.verb ?? null;
}

// ---------------------------------------------------------------------------
// timing

/**
 * The idle clock and tier scheduler for one PanelScene.
 * @param {object} [o]
 * @param {Set<string>} [o.seen]  verbs already demonstrated (shared across acts)
 */
export function createHintDirector({ tiers = HINT_TIERS, firstUseMs = FIRST_USE_MS, pulseRepeat = PULSE_REPEAT_MS, ghostRepeat = GHOST_REPEAT_MS, seen = new Set() } = {}) {
  let idle = 0;
  let stepKey = null;
  let verb = null;
  let nextPulse = tiers.pulse;
  let nextGhost = tiers.ghost;
  let captionDone = false;
  let firstArmed = false;

  function rearm() {
    nextPulse = tiers.pulse;
    nextGhost = tiers.ghost;
    captionDone = false;
  }

  return {
    get idle() { return idle; },
    get step() { return stepKey; },
    get verb() { return verb; },
    get seen() { return seen; },
    /** Highest tier the current idle stretch has reached (0–3). */
    get tier() { return idle >= tiers.caption ? 3 : idle >= tiers.ghost ? 2 : idle >= tiers.pulse ? 1 : 0; },
    /** A meaningful input: the idle clock starts again. */
    input() {
      idle = 0;
      rearm();
    },
    /**
     * The current step changed (or not). A new step restarts the clock and
     * arms a first-use demonstration if its verb has not been shown yet.
     */
    setStep(key, nextVerb) {
      if (key === stepKey) return false;
      // the step the player just solved: its verb needs no demonstration now
      if (verb && stepKey) seen.add(verb);
      stepKey = key;
      verb = nextVerb ?? null;
      idle = 0;
      rearm();
      firstArmed = Boolean(verb) && !seen.has(verb);
      return true;
    },
    /** The current step's verb resolved late: arm its first-use demo now. */
    refineVerb(nextVerb) {
      if (verb || !nextVerb || !stepKey) return false;
      verb = nextVerb;
      firstArmed = !seen.has(verb);
      return true;
    },
    /**
     * Advance the idle clock. `active` is false while nothing waits for the
     * player (walks, dialogue, cards, locked beats): the clock holds still.
     * Returns the hint events due now, in order: 'first' | 'pulse' | 'ghost' | 'caption'.
     */
    update(dt, { active = true } = {}) {
      if (!active || !stepKey) return [];
      idle += dt;
      const out = [];
      if (firstArmed && idle >= firstUseMs) {
        firstArmed = false;
        if (verb) seen.add(verb);
        out.push('first');
      }
      if (idle >= nextPulse) {
        out.push('pulse');
        nextPulse = Math.max(idle, nextPulse) + pulseRepeat;
      }
      if (idle >= nextGhost) {
        out.push('ghost');
        nextGhost = Math.max(idle, nextGhost) + ghostRepeat;
      }
      if (!captionDone && idle >= tiers.caption) {
        captionDone = true;
        out.push('caption');
      }
      return out;
    },
    /** SHOW ME: tier 2 now. The idle clock is not reset (showing is not solving). */
    request() {
      if (!stepKey) return [];
      if (verb) seen.add(verb);
      firstArmed = false;
      return ['ghost'];
    },
  };
}
