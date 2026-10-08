// Markup helpers for the controls the shell shows (the pause menu's
// "controls now" list, the chapter-entry card): DOM-free strings, so they are
// node-tested (tests/controlsStage.test.mjs).
//
//   keysHtml('SPACE · W · ↑')            three key caps, joined by thin dots
//   keysHtml('E AT A LIT / DEAD NODE')   a cap for E, the rest as words
//   diagramHtml('swap' | 'unfold' | 'lift')
//       Chapter 1's tiny drag diagrams (feedback item 19: a picture instead
//       of a sentence): a hand, a window, an arrow. Inline SVG drawn in
//       currentColor, with the amber arrow and an ivory hand.

import { createSaveStore } from './saveSystem.js';

const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);

// Words that are always a key cap; single letters and digits only where they
// lead a phrase or follow HOLD / PRESS / TAP (so "E AT A LIT NODE" capped
// only the E).
const NAMED_KEYS = new Set(['SPACE', 'ENTER', 'ESC', 'SHIFT', 'TAB', 'WASD', 'CTRL', 'ALT', 'BACKSPACE', '←', '→', '↑', '↓', '⌫', '⤢']);
const SHORT_KEY = /^(?:[A-Z]|[0-9])$/;
const KEY_VERBS = new Set(['HOLD', 'PRESS', 'TAP']);

function phraseHtml(phrase) {
  const words = phrase.split(/\s+/).filter(Boolean);
  const out = [];
  let text = [];
  const flush = () => { if (text.length) { out.push(`<span>${escapeHtml(text.join(' '))}</span>`); text = []; } };
  words.forEach((word, index) => {
    const capped = NAMED_KEYS.has(word) || (SHORT_KEY.test(word) && (index === 0 || KEY_VERBS.has(words[index - 1]) || words.every((w) => SHORT_KEY.test(w) || NAMED_KEYS.has(w))));
    if (capped) { flush(); out.push(`<kbd>${escapeHtml(word)}</kbd>`); } else text.push(word);
  });
  flush();
  return out.join(' ');
}

/** A keys string as key caps and words (separators · / , kept, dimmed). */
export function keysHtml(keys) {
  const parts = String(keys ?? '').split(/(\s+·\s+|\s+\/\s+|,\s+)/);
  return parts.map((part, index) => {
    if (index % 2) {
      const mark = part.trim() || ',';
      return `<i class="nf-keys__sep">${escapeHtml(mark === ',' ? ',' : mark)}</i>`;
    }
    return part.trim() ? phraseHtml(part.trim()) : '';
  }).join('');
}

// A stage name for the italic line ("ACT II · THE LUGGAGE CAR" → "Act II ·
// The Luggage Car"): roman numerals and figures stay as they are.
const MINOR_WORDS = new Set(['a', 'an', 'and', 'at', 'by', 'for', 'in', 'of', 'on', 'or', 'the', 'to']);
export function stageTitle(label) {
  let first = true;
  return String(label ?? '').split(/(\s+)/).map((word) => {
    if (!word.trim()) return word;
    // after a separator (·, —) a new phrase starts
    if (!/[A-Za-z0-9]/.test(word)) { first = true; return word; }
    if (/^[IVX]+$/.test(word) || /\d/.test(word)) { first = false; return word; }
    const lower = word.toLowerCase();
    const out = !first && MINOR_WORDS.has(lower) ? lower : lower.replace(/^(\W*)(\w)/, (_, lead, char) => lead + char.toUpperCase());
    first = false;
    return out;
  }).join('');
}

/** Rows as a <dl> body: the action, then its keys as caps. */
export function controlRowsHtml(rows = []) {
  return rows.map(([name, keys]) => `<div><dt>${escapeHtml(name)}</dt><dd>${keysHtml(keys)}</dd></div>`).join('');
}

// ---------------------------------------------------------------- diagrams

// The hand: index finger up, the other three folded (16 × 19 units, the
// fingertip at the top left of its box).
const HAND = 'M4 1.5c0-.8.7-1.5 1.5-1.5S7 .7 7 1.5V8h.5V6.3c0-.8.6-1.3 1.3-1.3s1.2.5 1.2 1.3V8h.5V7c0-.8.6-1.3 1.3-1.3S13 6.2 13 7v1.3h.3c0-.7.6-1.2 1.2-1.2s1.2.5 1.2 1.2V13c0 3.3-2.4 6-5.6 6H8.6c-1.7 0-3.2-.9-4.1-2.3L1.2 11.6c-.4-.7-.2-1.5.5-1.9.6-.4 1.4-.2 1.8.4L4 11V1.5z';
const hand = (x, y, scale = 1) => `<path class="nf-diagram__hand" transform="translate(${x} ${y}) scale(${scale})" d="${HAND}"/>`;
// a window: its frame, and the picture inside it (a hill line)
const windowAt = (x, y, w = 40, h = 30, { dashed = false } = {}) => [
  `<rect class="nf-diagram__frame${dashed ? ' is-ghost' : ''}" x="${x}" y="${y}" width="${w}" height="${h}" rx="1.5"/>`,
  dashed ? '' : `<rect class="nf-diagram__picture" x="${x + 4}" y="${y + 4}" width="${w - 8}" height="${h - 8}"/>`,
  dashed ? '' : `<path class="nf-diagram__hill" d="M${x + 4} ${y + h - 10} q${(w - 8) * 0.3} -7 ${(w - 8) * 0.55} -2 t${(w - 8) * 0.45} -1"/>`,
].join('');
const arrowHead = (x, y, angle) => `<path class="nf-diagram__head" transform="translate(${x} ${y}) rotate(${angle})" d="M0 0 L-5 -3 L-5 3 Z"/>`;

const DIAGRAMS = Object.freeze({
  // drag a window by its picture onto another: they swap
  swap: {
    caption: 'DRAG THE PICTURE',
    label: 'Drag a window by its picture onto another window to swap them.',
    body: () => [
      windowAt(4, 16), windowAt(76, 16),
      '<path class="nf-diagram__arrow" d="M30 22 C 44 2, 70 2, 90 18"/>',
      arrowHead(90, 18, 42),
      hand(22, 26, 1),
    ].join(''),
  },
  // the folded wall: pull the brass pull outward, away from the window
  unfold: {
    caption: 'PULL OUTWARD',
    label: 'Drag the brass pull outward, away from the window, to unfold the wall.',
    body: () => [
      windowAt(4, 16),
      '<path class="nf-diagram__fold" d="M44 16 L52 20 L52 42 L44 46 Z"/>',
      windowAt(66, 16, 40, 30, { dashed: true }),
      '<circle class="nf-diagram__pull" cx="52" cy="31" r="2.6"/>',
      '<path class="nf-diagram__arrow" d="M58 31 H 98"/>',
      arrowHead(100, 31, 0),
      hand(46, 30, 1),
    ].join(''),
  },
  // press and hold the frame itself: the frame lifts off its picture
  lift: {
    caption: 'HOLD THE FRAME',
    label: 'Press and hold a window frame: the frame lifts off and carries over another picture.',
    body: () => [
      '<rect class="nf-diagram__picture" x="12" y="24" width="32" height="22"/>',
      '<path class="nf-diagram__hill" d="M12 36 q10 -7 18 -2 t14 -1"/>',
      '<rect class="nf-diagram__frame is-ghost" x="8" y="20" width="40" height="30" rx="1.5"/>',
      '<rect class="nf-diagram__frame is-thick" x="70" y="6" width="40" height="30" rx="1.5"/>',
      '<path class="nf-diagram__arrow" d="M40 18 C 48 8, 56 6, 66 10"/>',
      arrowHead(67, 10, 18),
      hand(82, 1, 1),
    ].join(''),
  },
});

export const DIAGRAM_KINDS = Object.freeze(Object.keys(DIAGRAMS));

/** One diagram as a <figure> (an empty string for an unknown kind). */
export function diagramHtml(kind) {
  const spec = DIAGRAMS[kind];
  if (!spec) return '';
  return `<figure class="nf-diagram" data-diagram="${kind}"><svg viewBox="0 0 120 54" role="img" aria-label="${escapeHtml(spec.label)}">${spec.body()}</svg><figcaption>${escapeHtml(spec.caption)}</figcaption></figure>`;
}

// ---------------------------------------------------------------- the entry card
// (controlsCard.js draws it; these parts are pure.)

const SESSION_KEY = 'nightfall.controlsCards.v1';

const noticeKey = (id) => `controls-card:${id}`;

function sessionSeen(storage) {
  try { return JSON.parse(storage?.getItem(SESSION_KEY) ?? '[]'); } catch { return []; }
}

/** Has this journey (or, with no save, this session) already seen the card? */
export function controlsCardSeen(id, { storage = globalThis.localStorage, session = globalThis.sessionStorage } = {}) {
  try {
    const store = createSaveStore(storage);
    const save = store.readAll()[store.getActiveSlot()];
    if (save) return (save.notices ?? []).includes(noticeKey(id));
  } catch { /* storage unavailable: fall through to the session */ }
  return sessionSeen(session).includes(id);
}

/** Remember the card (the save slot when there is one, else the session). */
export function markControlsCardSeen(id, { storage = globalThis.localStorage, session = globalThis.sessionStorage } = {}) {
  try {
    const store = createSaveStore(storage);
    if (store.readAll()[store.getActiveSlot()]) { store.markNoticeSeen(noticeKey(id)); return; }
  } catch { /* fall through */ }
  try { session?.setItem(SESSION_KEY, JSON.stringify([...new Set([...sessionSeen(session), id])])); } catch { /* private mode */ }
}

/** The card's markup for a spec (pure; tests/controlsStage.test.mjs). */
export function controlsCardHtml(spec) {
  if (!spec) return '';
  const changed = spec.changed.length
    ? `<ul class="nf-controls-card__changed">${spec.changed.map(({ tag, text }) => `<li data-tag="${escapeHtml(tag.toLowerCase())}"><b>${escapeHtml(tag)}</b><span>${escapeHtml(text)}</span></li>`).join('')}</ul>`
    : '';
  return `<p class="nf-controls-card__kicker">${escapeHtml(spec.title)}</p><dl class="nf-controls-card__rows">${controlRowsHtml(spec.rows)}</dl>${changed}<span class="nf-controls-card__timer" aria-hidden="true"></span>`;
}

