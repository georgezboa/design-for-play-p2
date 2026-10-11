// Chapter 2 · BORROWED LIGHT — how often a teaching element may show.
//
// Pure (no Phaser). Round 12 (George: "第二章的那个我不是说过不要一直有提示吗
// 一开始提示一两次就好了 后面一直弄的话会挡住屏幕" — hints once or twice at
// the start; after that they keep covering the screen). Every on-screen
// teaching element in the chapter now goes through one budget:
//
//   cause card, ghost + bell dial   the first TEACH_USES (two) punches only
//   prompt over a box               its full wording for the first two
//                                   showings of that kind of prompt, then a
//                                   two-word chip or nothing (COMPACT_PROMPT)
//   teach tags (WALK, JUMP, HOLD Q · LISTEN, THE BELL COUNTS, FROM HERE,
//   BORROW, STAND IN THE CAGE)      the first two showings, then never
//   float hints over boxes          the first two of each kind; after that
//                                   the box's own flash and sound say it
//   tips toasts (THE LIGHT WENT HOME, PUNCHES FORGOTTEN …) the first two
//   idle hints (idleHints.js)       only when clearly stuck: a small pulse
//                                   at 40 s, one line at 90 s; Butch's full
//                                   line only on SHOW ME / H
//
// A showing of a held element (a tag shown frame after frame) counts once it
// has been up HINT_MIN_MS, so a glimpse while running past does not use one
// up, and a showing in progress is never cut off mid-read.

export const HINT_SHOWS = 2;
export const HINT_MIN_MS = 1200;

// What the tag over a box says once its kind has had its showings: a short
// chip where the press does something other than a plain punch, or where a
// refusal needs its reason; nothing where the box itself shows it (the
// punched hole and the ring filling toward its bell).
export const COMPACT_PROMPT = Object.freeze({
  punch: null,
  punched: null,
  renew: null,
  cutting: null,
  release: 'E · RELEASE',
  drop: 'E · RELEASE',
  replace: 'SAME LINE',
  liftWaits: 'LIFT WAITS',
  cut: 'E · CUT',
  busy: 'LINE BUSY',
  held: 'LINE HELD',
  dead: 'DEAD NODE',
  give: 'E · GIVE LIGHT',
  retrieve: 'E · TAKE IT BACK',
  putBack: 'E · PUT IT BACK',
  borrow: 'E · BORROW',
  lit: 'ALREADY LIT',
  full: 'ONE LIGHT AT A TIME',
  stepOff: 'STEP OFF FIRST',
});

// The prompt kinds the cause card teaches: during the first two punches the
// card stands in for them, and after that the box shows them by itself.
export const CARD_KINDS = Object.freeze(['punch', 'punched', 'renew']);

export const compactPrompt = (kind) => (kind in COMPACT_PROMPT ? COMPACT_PROMPT[kind] : null);

/**
 * The budget. `limits` overrides HINT_SHOWS for single keys.
 * - take(key): a one-shot element (a float hint, a toast) asks to show; true
 *   while it has showings left, and the showing is counted.
 * - hold(key, want, dt): a held element, every frame; returns whether it
 *   shows. A new showing starts only with showings left; it counts once it
 *   has been up `minMs`, and runs on until `want` goes false.
 * - fresh(key): showings left.
 * - spend(key, n): mark showings as used (a resumed session).
 */
export function createHintBudget({ shows = HINT_SHOWS, minMs = HINT_MIN_MS, limits = {} } = {}) {
  const used = new Map();
  const live = new Map();
  const limitOf = (key) => limits[key] ?? shows;
  const count = (key) => used.get(key) ?? 0;
  const fresh = (key) => count(key) < limitOf(key);
  return {
    used: count,
    fresh,
    showing: (key) => live.has(key),
    take(key) {
      if (!fresh(key)) return false;
      used.set(key, count(key) + 1);
      return true;
    },
    hold(key, want, dt = 0) {
      if (!want) { live.delete(key); return false; }
      if (live.has(key)) {
        const before = live.get(key);
        const ms = before + Math.max(0, Number(dt) || 0);
        if (before < minMs && ms >= minMs) used.set(key, count(key) + 1);
        live.set(key, ms);
        return true;
      }
      if (!fresh(key)) return false;
      live.set(key, 0);
      return true;
    },
    spend(key, n = 1) { used.set(key, Math.max(count(key), Math.min(limitOf(key), n))); },
    snapshot: () => Object.fromEntries(used),
  };
}
