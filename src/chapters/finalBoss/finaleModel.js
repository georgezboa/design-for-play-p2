// Chapter 6 · ALL WORLDS AT ONCE — shared pure rules for the Conductor.
//
// No three.js, no DOM: node tests drive these directly
// (tests/finalBoss/finaleModel.test.mjs).
//
// Round 12 plays the fight as set pieces (setPieces/*.js on the kernel in
// setPieces/kernel.js). What stays here is shared by all of them and by the
// page: the difficulty presets (STORY / NORMAL), the checkpoint line on the
// death card, the death ledger that offers STORY after three deaths in one
// movement, and the HUD tag layout.

// ---------------------------------------------------------------------------
// Difficulty (setPieces/kernel.js pieceTuning reads these).
//
// `pace` scales every scroll, train and projectile speed; teleScale every
// warning's lead; windowScale every timing window (a punch, the draw, a
// plank's time out); `thin` leaves out the hazards marked extra; hurtScale
// shrinks Butch's hurt box. rollback: what a torn last layer costs
// ('segment': that stretch of the set piece starts again, a few seconds;
// 'none': he stands up where he fell). NORMAL has three layers: a set piece
// is short and its checkpoints close together, so a death costs seconds and
// a stretch takes a few tries. STORY plays the same set pieces, slower and
// kinder, with six layers, and undoes nothing.
export const DIFFICULTIES = Object.freeze({
  story: Object.freeze({
    id: 'story', label: 'STORY', layers: 6, respawnInv: 2,
    pace: 0.82, teleScale: 1.4, windowScale: 1.6, thin: true, hurtScale: 0.8, rollback: 'none',
  }),
  normal: Object.freeze({
    id: 'normal', label: 'NORMAL', layers: 3, respawnInv: 1.2,
    pace: 1, teleScale: 1, windowScale: 1, thin: false, hurtScale: 1, rollback: 'segment',
  }),
});

export const DEFAULT_DIFFICULTY = 'normal';

export function difficultyPreset(id) {
  return DIFFICULTIES[id] ?? DIFFICULTIES[DEFAULT_DIFFICULTY];
}

// ---------------------------------------------------------------------------
// A torn last layer is a checkpoint. Each set piece is two to four short
// stretches (segments); on NORMAL the stretch begins again (earlier
// stretches, set pieces and movements kept); on STORY nothing is undone.
// The death card says which, in one line. ('phase' is the round-11 name
// for the same thing and reads the same.)

export function checkpointLine({ rollback = 'segment', phaseName = '' } = {}) {
  if (rollback === 'segment' || rollback === 'phase') return `This stretch starts again${phaseName ? `: ${phaseName}` : ''}. What you won before it stays won.`;
  return 'He stands up where he fell. Nothing is undone.';
}

// ---------------------------------------------------------------------------
// Death ledger: STORY is offered once per movement, after the third death in
// that movement, and only to a player who is not already on STORY.

export const STORY_OFFER_AFTER = 3;

export function createDeathLedger({ offerAfter = STORY_OFFER_AFTER } = {}) {
  const deaths = new Map();
  const offered = new Set();
  return {
    record(movement, difficulty = DEFAULT_DIFFICULTY) {
      const count = (deaths.get(movement) ?? 0) + 1;
      deaths.set(movement, count);
      const offer = difficulty !== 'story' && count >= offerAfter && !offered.has(movement);
      if (offer) offered.add(movement);
      return { movement, deaths: count, offerStory: offer };
    },
    deaths: (movement) => deaths.get(movement) ?? 0,
    offered: (movement) => offered.has(movement),
    reset() { deaths.clear(); offered.clear(); },
  };
}

// ---------------------------------------------------------------------------
// HUD · world-anchored tags never sit on one another (alpha round 2: a
// case's claim tag covered the RETURN prompt beside it).
//
// A tag is drawn centred on x with its bottom edge on y (.nf-tag). Its box
// is estimated from the text (13 px mono, 0.12em tracking, 34 px of padding
// and point). Tags are placed in priority order; one that would overlap a
// placed tag is lifted a row at a time until it is clear.

export const TAG_ROW_PX = 30;
const TAG_CHAR_PX = 9.4;
const TAG_PAD_PX = 34;
const TAG_HEIGHT_PX = 26;

export function tagWidth(text) {
  const visible = String(text).replace(/<[^>]*>/g, '').replace(/&[a-z#0-9]+;/gi, '_');
  return TAG_PAD_PX + visible.length * TAG_CHAR_PX;
}

export function spreadWorldTags(tags, { rowPx = TAG_ROW_PX, maxLift = 6, gap = 4 } = {}) {
  const order = tags.map((tag, index) => ({ ...tag, index, priority: tag.priority ?? 0 }))
    .sort((a, b) => (b.priority - a.priority) || (b.y - a.y) || (a.index - b.index));
  const placed = [];
  const boxOf = (tag, y) => {
    const half = tagWidth(tag.text) / 2;
    return { left: tag.x - half, right: tag.x + half, top: y - TAG_HEIGHT_PX, bottom: y };
  };
  const hits = (a, b) => a.left < b.right + gap && b.left < a.right + gap && a.top < b.bottom + gap && b.top < a.bottom + gap;
  for (const tag of order) {
    let y = tag.y;
    for (let lift = 0; lift < maxLift && placed.some((other) => hits(boxOf(tag, y), other.box)); lift += 1) y -= rowPx;
    placed.push({ ...tag, y, box: boxOf(tag, y) });
  }
  return placed.sort((a, b) => a.index - b.index).map(({ box, index, ...tag }) => tag);
}
