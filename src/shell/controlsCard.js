// The chapter-entry controls card (round 6, feedback item 18, shell part).
//
// When a chapter starts fresh, a small card names its 3–4 basic controls and
// what changed since the chapter before ("E is now ‘speak face to face’"). It
// never blocks: it takes no pointer events, swallows no key, and fades by
// itself after a few seconds or at the first input (after a short grace, so
// the key that started the chapter does not wipe it before it is read). The
// pause menu hides it. Content: chapterControls.js CONTROL_SETS[id].entry.
//
// How a chapter calls it, once its gameplay is on screen (after its intro
// film and title card), with either of:
//   import { showChapterControlsCard } from '../shell/controlsCard.js';
//   showChapterControlsCard('chapter2');
// or, without an import (the pause menu listens for it):
//   window.dispatchEvent(new CustomEvent('nightfall:controls-card', { detail: { chapter: 'chapter2' } }));
//
// "Fresh entry, not every resume": the card is shown once per journey (the
// active save slot remembers it, saveSystem markNoticeSeen
// 'controls-card:<id>'), so a Continue into the same chapter does not show it
// again; without a save (a scratch or dev route) once per browser session.
// `{ force: true }` shows it regardless (QA).

import './controlsCard.css';
import { chapterCardSpec } from './chapterControls.js';
import { controlsCardHtml, controlsCardSeen, markControlsCardSeen } from './controlsView.js';
import { getActiveCinematic } from './gameFlow.js';

export const CONTROLS_CARD_EVENT = 'nightfall:controls-card';
export const CONTROLS_CARD_MS = 7000;
export const CONTROLS_CARD_GRACE_MS = 900;

let current = null;

/** Fade the card out now (no-op when none is up). */
export function dismissChapterControlsCard() {
  current?.dismiss();
}

/**
 * Show the chapter-entry card for `chapterId` (any name chapterControls.js
 * resolveControlSetId accepts). Returns the card element, or null when the
 * chapter has no card or this journey has already seen it.
 */
export function showChapterControlsCard(chapterId, {
  force = false,
  durationMs = CONTROLS_CARD_MS,
  graceMs = CONTROLS_CARD_GRACE_MS,
  storage = globalThis.localStorage,
  session = globalThis.sessionStorage,
} = {}) {
  if (typeof document === 'undefined') return null;
  const spec = chapterCardSpec(chapterId);
  if (!spec) return null;
  if (!force && controlsCardSeen(spec.id, { storage, session })) return null;
  markControlsCardSeen(spec.id, { storage, session });
  current?.dismiss(true);

  const card = document.createElement('aside');
  card.className = 'nf-controls-card';
  card.setAttribute('role', 'status');
  card.setAttribute('aria-live', 'polite');
  card.dataset.chapter = spec.id;
  card.innerHTML = controlsCardHtml(spec);
  card.style.setProperty('--nf-card-ms', `${durationMs}ms`);

  let timer = 0;
  let waitTimer = 0;
  let shownAt = 0;
  let gone = false;
  const onInput = (event) => {
    if (!shownAt || performance.now() - shownAt < graceMs) return;
    if (event.type === 'keydown' && event.repeat) return;
    dismiss();
  };
  const onPause = (event) => { if (event.detail?.paused) dismiss(true); };
  const listen = (on) => {
    const method = on ? 'addEventListener' : 'removeEventListener';
    // capture + passive: the card only watches; the game still gets the input
    window[method]('keydown', onInput, { capture: true, passive: true });
    window[method]('pointerdown', onInput, { capture: true, passive: true });
    window[method]('wheel', onInput, { capture: true, passive: true });
    window[method]('nightfall:pause', onPause);
  };
  function dismiss(now = false) {
    if (gone) return;
    gone = true;
    window.clearTimeout(timer);
    window.clearTimeout(waitTimer);
    listen(false);
    if (current?.element === card) current = null;
    if (now || !card.isConnected) { card.remove(); return; }
    card.classList.remove('is-in');
    card.classList.add('is-out');
    window.setTimeout(() => card.remove(), 520);
  }
  const reveal = (attempt = 0) => {
    if (gone) return;
    // never over a film or the pause menu: wait for them (up to ~20 s)
    if (getActiveCinematic() || globalThis.NIGHTFALL_PAUSED) {
      if (attempt < 50) waitTimer = window.setTimeout(() => reveal(attempt + 1), 400);
      else dismiss(true);
      return;
    }
    document.body.append(card);
    requestAnimationFrame(() => {
      card.classList.add('is-in');
      shownAt = performance.now();
      timer = window.setTimeout(() => dismiss(), durationMs);
    });
    listen(true);
  };
  current = { element: card, dismiss };
  reveal();
  return card;
}

// One listener per page (the pause menu installs it), so a chapter can ask
// for the card with an event instead of an import.
export function installControlsCardListener(win = globalThis.window) {
  if (!win || win.__nfControlsCardListener) return;
  win.__nfControlsCardListener = true;
  win.addEventListener(CONTROLS_CARD_EVENT, (event) => {
    const { chapter, ...options } = event.detail ?? {};
    showChapterControlsCard(chapter, options);
  });
}
