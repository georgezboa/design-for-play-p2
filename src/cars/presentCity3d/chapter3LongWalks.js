// Chapter 3 · the long walks (alpha rounds 3–4: "three long walks", pacing
// 3/5; alpha round 4 fix round, engineer P2).
//
// Pure: no THREE, no DOM. Points are { x, z } (y ignored).
//
// The four longest walks between beats (A* path length at 5.4 m/s):
//   board → Eda's stall        58 m   oil line → the ministry   45 m
//   dusk → the Copper Heron    55 m   hotel → the night fire    51 m
// The street camera shows about 12 m around Butch, so each one took four or
// five clicks and ~15–25 s even for a player who knew the way, and much
// longer for one who did not. Two changes, both optional to the player:
//
//   1. STRIDE. A walk ordered far away (a path of STRIDE_MIN_METRES or more:
//      a click near the screen edge, or a tag across the street) is taken
//      at a brisk jog, STRIDE_MULTIPLIER × the walk, easing back to a walk
//      over the last STRIDE_EASE_METRES. Short clicks still walk; a
//      double-click or Shift still runs.
//   2. LEV LEADS THE WAY. Once the task card names the destination and
//      Butch is LEAD_MIN_METRES or more from it, a tag under the task card
//      offers G · LEV LEADS THE WAY: the screen goes to black, one line
//      plays over it, and Butch and Lev stand at the destination (≈3 s).
//      At night Butch is alone; the same offer reads FOLLOW THE FIRELIGHT.
//      The beat itself still waits for the player's E.

export const STRIDE_MIN_METRES = 9;
export const STRIDE_MULTIPLIER = 1.45;
export const STRIDE_EASE_METRES = 2.4;
// Above this ground speed (m/s) Butch's rig plays its jog, not its walk.
export const JOG_GAIT_SPEED = 6.6;

/** Length of `path` (waypoints) walked from `from`. */
export function pathMetres(from, path) {
  let total = 0;
  let previous = from;
  for (const point of path ?? []) {
    total += Math.hypot(point.x - previous.x, point.z - previous.z);
    previous = point;
  }
  return total;
}

/** Whether a walk ordered with this path length strides. */
export function stridesFor(metres) {
  return Number(metres) >= STRIDE_MIN_METRES;
}

/**
 * Ground speed (m/s) for this step. `running` (double-click / Shift) wins;
 * a striding walk eases from the stride back to the walk over the last
 * STRIDE_EASE_METRES of `remaining`.
 */
export function pacedSpeed({ walkSpeed, runMultiplier, running = false, striding = false, remaining = Infinity }) {
  if (running) return walkSpeed * runMultiplier;
  if (!striding) return walkSpeed;
  const blend = Math.min(1, Math.max(0, (remaining - 0.4) / STRIDE_EASE_METRES));
  return walkSpeed * (1 + (STRIDE_MULTIPLIER - 1) * blend);
}

export function gaitFor(speed) {
  return speed >= JOG_GAIT_SPEED ? 'jog' : 'walk';
}

// ------------------------------------------------------------ lead the way
export const LEAD_MIN_METRES = 22;
// The line holds over black this long (wall clock), between the fades.
export const LEAD_LINE_MS = 1700;
export const LEAD_KEY = 'KeyG';

// One entry per walk objective. `interaction` is the destination's own
// interaction: Butch arrives on its approach, so its E tag is already up.
// `butch` overrides the approach; `lev` is where Lev stands on arrival
// (null: beside Butch). The lines only
// name what the task card and Lev's own hints have already said.
export const LEAD_ROUTES = Object.freeze({
  'find-ministry': Object.freeze({
    guide: 'lev',
    interaction: 'transport-entrance',
    lev: Object.freeze([36.6, 0.5, -14.35]),
    line: Object.freeze({ speaker: 'LEV', text: 'This way. The tall stone front on the east lane. Toma keeps the door.' }),
  }),
  'find-market': Object.freeze({
    guide: 'lev',
    interaction: 'eda',
    // Eda's approach follows Butch; arrive where her own beat stands him.
    butch: Object.freeze([-9.9, 0.5, 6.7]),
    lev: Object.freeze([-10.8, 0.5, 8.0]),
    line: Object.freeze({ speaker: 'LEV', text: 'West, past the clock. Eda sells lamp oil under the blue canvas.' }),
  }),
  'find-cut-interface': Object.freeze({
    guide: 'lev',
    interaction: 'cut-feed-interface',
    lev: Object.freeze([7.2, 0.5, 13.9]),
    line: Object.freeze({ speaker: 'LEV', text: 'The service joint is by the clock, at the south edge of the square.' }),
  }),
  'find-hotel': Object.freeze({
    guide: 'lev',
    interaction: 'copper-heron-entrance',
    lev: Object.freeze([48.9, 0.5, -11.3]),
    line: Object.freeze({ speaker: 'LEV', text: 'The Copper Heron. Past the ministry lane, at the east end of the street.' }),
  }),
  'find-fire': Object.freeze({
    guide: 'butch',
    interaction: 'night-burning-message',
    lev: null,
    line: Object.freeze({ speaker: 'NARRATION', text: 'Butch follows the firelight down the empty street to the square.' }),
  }),
});

export function leadOfferHtml(route) {
  return route?.guide === 'lev'
    ? '<kbd>G</kbd> LEV LEADS THE WAY'
    : '<kbd>G</kbd> FOLLOW THE FIRELIGHT';
}

/**
 * The lead-the-way offer for this frame, or null. `distance` is Butch's
 * straight-line distance (m) to the destination's approach; `levPresent`
 * says Lev is out in the street with him.
 */
export function leadOffer({ phaseId, distance, locked = false, levPresent = false, travelling = false }) {
  const route = LEAD_ROUTES[phaseId];
  if (!route || locked || travelling) return null;
  if (!(distance >= LEAD_MIN_METRES)) return null;
  if (route.guide === 'lev' && !levPresent) return null;
  return route;
}
