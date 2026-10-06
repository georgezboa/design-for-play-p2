// After an ending, the save says so (alpha round 4: CONTINUE after the
// credits dropped the player back into the Chapter 6 fight, as if nothing
// had happened).
//
// The ending is recorded as the slot's mid-chapter resume point on the
// Chapter 6 checkpoint (saveSystem.js markResume: { ending: 'normal' |
// 'true' }). Continue still opens the Chapter 6 page that slot resolves to
// (finalBossRoute.js), and that page shows THE JOURNEY IS COMPLETE instead
// of its start board: the claim's status, the checkpoints to replay, the
// clues of any stones the journey missed, and the fight again if wanted.
// Picking a checkpoint (here or in LOAD) drops the resume point, as for any
// chapter.

import { CHECKPOINTS, createSaveStore, launchCheckpoint, loadListCheckpoints, returnToTitle } from '../../shell/saveSystem.js';
import { missingStoneNotice } from '../../shell/magicStones.js';
import { resolveCheckpointRoute } from '../../shell/finalBossRoute.js';

export const JOURNEY_CHECKPOINT = 'chapter-6-start';
export const ENDINGS = Object.freeze(['normal', 'true']);
export const CHECKPOINT_HINT = 'Any chapter can be played again from LOAD · CHECKPOINTS on the title (or below). The stones this journey holds stay with it.';

/** Record that this slot's journey reached an ending. */
export function recordEnding(ending, store = createSaveStore()) {
  if (!ENDINGS.includes(ending)) return null;
  try {
    return store.markResume(JOURNEY_CHECKPOINT, { ending });
  } catch {
    return null;
  }
}

/** The ending this slot's journey reached ('normal' / 'true'), or null. */
export function completedEnding(store = createSaveStore()) {
  try {
    const ending = store.readResume(JOURNEY_CHECKPOINT)?.ending;
    return ENDINGS.includes(ending) ? ending : null;
  } catch {
    return null;
  }
}

// What the journey-complete board says, for a save and its ending. Pure.
export function journeyCompleteCard(save, ending) {
  const notice = ending === 'normal' ? missingStoneNotice(save?.magicStones ?? []) : null;
  const checkpoints = loadListCheckpoints(save).map(({ checkpoint }) => ({ id: checkpoint.id, chapter: checkpoint.chapter, title: checkpoint.title }));
  if (ending === 'true') {
    return {
      kicker: 'CLAIM 1978-0412 · CLOSED',
      title: 'THE JOURNEY IS COMPLETE',
      lines: ['Butch got off at Bellwether and left the orchard case at Rosa’s door.', 'The property was lost, not Mara.'],
      stones: null,
      clues: [],
      hint: CHECKPOINT_HINT,
      checkpoints,
    };
  }
  return {
    kicker: 'CLAIM 1978-0412 · STATUS: OPEN',
    title: 'THE JOURNEY IS COMPLETE',
    lines: ['The night service keeps running. Butch rides on beside the Mara ahead.'],
    stones: notice ? { stamp: notice.stamp, title: notice.title, line: notice.line, socketsHtml: notice.socketsHtml } : null,
    clues: notice?.clues ?? [],
    hint: CHECKPOINT_HINT,
    checkpoints,
  };
}

const escapeHtml = (text) => String(text).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));

// The board, in the finale's ticket-board language, laid into `menu` (the
// page's #menu overlay) in place of its start board until the player picks
// "play again". `actions`: [{ label, onSelect, primary }].
export function showJourneyComplete({ menu, ending, actions = [], store = createSaveStore() }) {
  const board = menu?.querySelector('.nf-board');
  if (!board) return null;
  const save = store.readAll()[store.getActiveSlot()];
  const card = journeyCompleteCard(save, ending);
  const original = [...board.childNodes];
  const view = document.createElement('div');
  view.className = 'nf-journey';
  view.innerHTML = `
    <p class="nf-board__kicker">${escapeHtml(card.kicker)}</p>
    <h1 class="nf-board__title">${escapeHtml(card.title)}</h1>
    <div class="nf-board__rule"></div>
    ${card.lines.map((line) => `<p class="nf-board__intro">${escapeHtml(line)}</p>`).join('')}
    ${card.stones ? `<section class="nf-journey__stones"><p class="nf-journey__stamp">${escapeHtml(card.stones.stamp)} · ${escapeHtml(card.stones.title)}</p><div class="nf-journey__sockets">${card.stones.socketsHtml}</div><p class="nf-journey__line">${escapeHtml(card.stones.line)}</p><ul class="nf-journey__clues">${card.clues.map((clue) => `<li>${escapeHtml(clue)}</li>`).join('')}</ul></section>` : ''}
    <p class="nf-journey__hint">${escapeHtml(card.hint)}</p>
    <nav class="nf-journey__checkpoints" aria-label="Checkpoints"></nav>
    <div class="nf-board__actions nf-journey__actions"></div>`;
  const list = view.querySelector('.nf-journey__checkpoints');
  const slot = store.getActiveSlot();
  // One button per chapter: its first unlocked checkpoint (the full list is
  // on the title's LOAD / CHECKPOINTS).
  const chapters = new Map();
  card.checkpoints.forEach((checkpoint) => { if (!chapters.has(checkpoint.chapter)) chapters.set(checkpoint.chapter, checkpoint); });
  chapters.forEach((checkpoint) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'nf-journey__checkpoint';
    button.innerHTML = `<b>CH ${checkpoint.chapter}</b> ${escapeHtml(CHECKPOINTS.find(({ id }) => id === checkpoint.id)?.title ?? checkpoint.title)}`;
    button.addEventListener('click', () => {
      store.selectCheckpoint(slot, checkpoint.id);
      launchCheckpoint(checkpoint.id, { route: resolveCheckpointRoute(checkpoint.id, { slot }) });
    });
    list.append(button);
  });
  const row = view.querySelector('.nf-journey__actions');
  const restore = () => { view.remove(); board.replaceChildren(...original); board.classList.remove('nf-board--journey'); };
  [...actions, { label: 'RETURN TO TITLE', onSelect: () => returnToTitle(), quiet: true }].forEach(({ label, onSelect, quiet }) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `nf-ticket-button${quiet ? ' nf-ticket-button--quiet' : ''}`;
    button.innerHTML = `${escapeHtml(label)} <span>→</span>`;
    button.addEventListener('click', () => onSelect?.({ restore }));
    row.append(button);
  });
  board.replaceChildren(view);
  board.classList.add('nf-board--journey');
  menu.classList.remove('hidden');
  requestAnimationFrame(() => row.querySelector('button')?.focus({ preventScroll: true }));
  return { restore, card };
}
