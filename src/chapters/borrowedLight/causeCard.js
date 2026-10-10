// Chapter 2 · BORROWED LIGHT — the cause card at a box.
//
// Pure (no Phaser). Round 6, owner G3: "it took me a long time to figure out
// what the clock / bell is for, because each time I walk up to it the text
// beside it is too small". The box's 16 px tag (10 px on a 1280×720 window)
// carried the whole idea in words. Now, walking up to a box shows a large
// in-world diagram, cause → effect, read left to right toward the machine:
//
//     [E] PUNCH   ──▶   (bell) NEXT BELL   ──▶   (bridge) BRIDGE OUT
//
// The cell the box is at lights up and moves along as it happens: ready to
// punch; punched, with the next bell's countdown ring and seconds; the
// machine on, with the time it has left. Once the same-colour limit has
// been taught (firstLesson.js) the card carries it as a strip below, so the
// rule can be re-read at any box. Labels are CARD_FONT px at 1920×1080
// (≥ 18 px on a 1280×720 window) and scale with TEXT SIZE.
//
// The card shows for the first TEACH_USES punches. Round 11 (George: "不要一直
// 都有，前面两个有就行了" — after the first two it got in the way): after that
// it comes back only once for a kind of machine he has not punched a box for
// yet (a lift, a billboard: a new effect to explain), never again on a pause.

import { HINTS } from './story.js';
import { LINE_COLORS } from './art/palette.js';

export const CARD_FONT = 28;
// The smallest text the card (or any round-6 world tag) may use at TEXT
// SIZE 100: 27 px of 1920 is 18 px on a 1280×720 window.
export const MIN_WORLD_FONT = 27;
export const TEACH_USES = 2;
export const DWELL_MS = 700;
export const RULE_TEXT = 'ONE PUNCH PER COLOUR';

const EFFECT_LABEL = Object.freeze({
  bridge: 'BRIDGE OUT',
  lift: 'LIFT UP',
  billboard: 'BOARD LIGHTS',
  fan: 'VENT BLOWS',
  shutter: 'SHUTTER UP',
  points: 'POINTS SWING',
  drawbridge: 'BRIDGE DOWN',
  sign: 'SIGN LIGHTS',
  cradle: 'CRADLE DOWN',
  lantern: 'LANTERN LIT',
});

export function effectLabel(machine) {
  if (!machine) return 'SWITCHES ON';
  if (machine.kind === 'counterweight') return machine.ballast ? 'LEDGE DROPS' : 'WALKWAY UP';
  return EFFECT_LABEL[machine.kind] ?? 'SWITCHES ON';
}

const bellName = (phase) => (phase ? `BELL ${phase === 'even' ? 'II' : 'I'}` : 'NEXT BELL');

/**
 * The card for a node, or null where the plain prompt says it better (a dead
 * node, a busy line, a cut).
 * - preview: timetable punchPreview(node.id)
 * - status: timetable nodeStatus(node.id) (inBells, waiting)
 * - msToBell / bellMs: the bell clock
 * - timer: timerLights.js timerOf() for the machine, when it is on
 */
export function causeCard({ node, machine, preview, status = null, msToBell = 0, bellMs = 4000, ruleTaught = false, timer = null } = {}) {
  if (!node || node.dead || !machine || !preview) return null;
  const color = LINE_COLORS[node.line];
  const card = {
    line: node.line,
    kind: machine.kind,
    active: 0,
    cells: [
      { id: 'act', key: 'E', label: machine.kind === 'counterweight' ? 'RELEASE' : 'PUNCH' },
      { id: 'bell', icon: 'bell', label: bellName(node.phase) },
      { id: 'machine', icon: machine.kind, label: effectLabel(machine) },
    ],
    bellK: 0,
    seconds: null,
    machineK: null,
    note: null,
    rule: ruleTaught ? RULE_TEXT : null,
  };
  switch (preview.result) {
    case 'queue':
      return card;
    case 'replace':
      card.note = HINTS.forgets(color.name);
      return card;
    case 'already': {
      const inBells = Math.max(1, status?.inBells ?? preview.inBells ?? 1);
      const ms = Math.max(0, msToBell) + (inBells - 1) * bellMs;
      card.active = 1;
      card.bellK = Math.max(0, Math.min(1, 1 - ms / (inBells * bellMs)));
      card.seconds = Math.max(1, Math.ceil(ms / 1000));
      card.note = preview.waiting ? HINTS.liftWaits : HINTS.holdTakeBack;
      if (inBells > 1) card.cells[1].label = `${bellName(node.phase)} · NEXT BUT ONE`;
      return card;
    }
    case 'renew':
      // The machine is on: its cell, with the time it has left. (A punch
      // now runs it on from the next bell; the plain tag says RENEW.)
      card.active = 2;
      card.machineK = timer?.k ?? 1;
      return card;
    default:
      return null;
  }
}

// Show the card for the first two punches, then only at a box whose kind of
// machine is new to him (until he punches one). DWELL_MS is kept for callers
// that time a pause, but no longer brings the card back.
export const showCard = ({ uses = 0, newKind = false } = {}) => uses < TEACH_USES || newKind;

/**
 * Card geometry (world px, before placing). `labelW` are the measured label
 * widths, `k` the TEXT SIZE scale. Cells: icon on top, label below; arrows
 * between them.
 */
export function cardLayout({ labelW = [90, 170, 190], ruleW = 0, noteW = 0, k = 1 } = {}) {
  const pad = 18 * k;
  const cellPad = 16 * k;
  const arrow = 46 * k;
  const iconH = 50 * k;
  const labelH = 34 * k;
  const cells = [];
  let x = pad;
  labelW.forEach((w, i) => {
    const cw = Math.max(w, 60 * k) + cellPad * 2;
    cells.push({ x, w: cw, cx: x + cw / 2 });
    x += cw + (i < labelW.length - 1 ? arrow : 0);
  });
  const rowTop = 14 * k;
  const iconY = rowTop + iconH / 2;
  const labelY = rowTop + iconH + 8 * k + labelH / 2;
  let h = rowTop + iconH + 8 * k + labelH + 14 * k;
  const ruleY = ruleW ? h + 20 * k : null;
  if (ruleW) h += 44 * k;
  const noteY = noteW ? h + 18 * k : null;
  if (noteW) h += 40 * k;
  const w = Math.max(x + pad, ruleW + 110 * k, noteW + pad * 2);
  return { w, h, cells, arrow, iconY, labelY, ruleY, noteY, iconH };
}

// Where the card sits: above the box, reaching toward its machine, inside
// the view. `side` is +1 when the machine is to the right of the box.
export function placeCard({ headX, headY, w, h, side = 1, view = null, gap = 58 }) {
  let x0 = side >= 0 ? headX - 70 : headX + 70 - w;
  if (view) x0 = Math.max(view.x + 24, Math.min(view.right - 24 - w, x0));
  const y1 = headY - gap;
  return { x0, y0: y1 - h, x1: x0 + w, y1 };
}
