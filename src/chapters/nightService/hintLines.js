// Tier-3 hints: one in-fiction line from the Conductor per step, spoken after
// 120 s idle (hints.js). Diegetic and short; never a control instruction.
// Keyed `${act id}:${step id}`; a step with no line simply has no tier 3.
// A value may be a list of `{ when, text }` (a model condition; first match).

export const HINT_SPEAKER = 'THE CONDUCTOR';

export const HINT_LINES = Object.freeze({
  // Act 0 · ONE WINDOW
  'act0:bell': 'Someone polished that desk bell for a visitor. Look closer.',
  'act0:ring': 'A bell only works if somebody rings it, clerk.',
  'act0:wake': 'Step back a little. See the whole desk again.',
  'act0:stub': 'Claim 1978-0412. Every claim starts on a stub.',
  'act0:porthole': 'My punch leaves a hole. Holes are for looking through.',
  'act0:carriage': 'Go on through. The night is bigger than your office.',
  // Act 0.5 · TWO WINDOWS
  'act05:unfold': 'This wall folds, clerk. There’s a second window tucked behind yours.',
  'act05:floor': 'Your desk and that door don’t meet. Floors go where floors go.',
  'act05:carrier': 'The key line runs when both of its ends are close enough to see.',
  'act05:home': 'That was the counter bell. Bring the floor back to your desk.',
  // Act 1 · LOST PROPERTY
  'act1:unfold': 'The rest of the car is folded away underneath. Draw it out.',
  'act1:floor-link': 'The door to my car is past the window, not above it.',
  'act1:ticket-chute': 'Your ticket is in the pigeonholes, clerk. Tickets fall downhill.',
  // Act 2 · THE LUGGAGE CAR
  'act2:punch': 'A ticket isn’t a ticket until it’s punched.',
  'act2:stop': 'Bellwether is a request stop. In 1978 you only had to ask.',
  'act2:mark': 'The tag says more in 1978 light.',
  'act2:orchard': 'A tag, a postcard, a house. Keep looking in.',
  'act2:arrive': 'A window frame decides where a train has arrived.',
  'act2:firstWeight': 'Luggage falls down, clerk. Rack over arms.',
  'act2:end': 'Open it once, then give it back its lid.',
  // Act 3 · TWO TRUE THINGS
  'act3:windows': 'Her city window, her orchard window. One frame fits both.',
  'act3:hedge': 'City, hawthorn, orchard. The lane only goes one way.',
  'act3:lane': [
    { when: { all: [{ actorAt: { actor: 'mara', tile: 'hawthorn' } }, { not: { lensOver: { tile: 'hawthorn', x: 0.9, y: 0.62 } } }] }, text: 'That hedge wasn’t there in 1978. Hold the old light on the gate.' },
    { text: 'She always took the hill path down to the station.' },
  ],
  'act3:bridge': 'The viaduct fell years ago. In 1978 it stood. Hold it there.',
  // The Museum · the one-answer exhibit (acts/oneAnswer.js). The Conductor is
  // not here: these are Butch thinking aloud (the act's `hintSpeaker`).
  'oneAnswer:punch': 'Her stub still has the Conductor’s hole in it. Holes are for looking through.',
  'oneAnswer:unfile': 'They stamped the reservation FILED. In 1978 nobody had stamped it yet.',
  'oneAnswer:plate': 'Plate IV. Rosa drew that lane. It deserves a closer look.',
  'oneAnswer:tag': 'An unclaimed tag always has another side.',
  'oneAnswer:route': [
    {
      when: { all: [{ slot: { tile: 'stub', index: 0 } }, { slot: { tile: 'duplicate', index: 1 } }, { slot: { tile: 'tag', index: 2 } }, { slot: { tile: 'plate', index: 3 } }] },
      text: 'Her office floor is torn today. It wasn’t in 1978.',
    },
    { text: 'Platform, office, the drawing, the orchard. Put her day back in order.' },
  ],
  'oneAnswer:arrive': 'She stops where the floor is torn. In 1978 it was whole.',
});

/** The line for a step now (`model` resolves conditional lines). */
export function hintLine(actId, stepId, model = null) {
  const entry = HINT_LINES[`${actId}:${stepId}`];
  if (!entry) return null;
  if (typeof entry === 'string') return entry;
  const hit = entry.find((line) => line.when === undefined || (model && model.evaluate(line.when)));
  return hit?.text ?? null;
}
