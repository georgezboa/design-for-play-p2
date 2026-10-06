import { createSaveStore } from './saveSystem.js';

// The five magic stones (docs/STORY_BIBLE.md → Magic stones): records the
// archive could not file. Holding all five lets Butch reach the line's last
// carriage. Code ids never change; the fifth keeps `black-knife` but is shown
// to the player as the BLACK TICKET STONE.
//
// One name everywhere the player sees them (alpha A4-13): MAGIC STONES, as
// in "MAGIC STONES · 2 / 5". "Unfiled" is what they are, never their name.
// Each clue is where the stone really is, as a hint rather than a map; the
// normal ending lists the clues of the stones a journey missed.
export const MAGIC_STONES = Object.freeze([
  Object.freeze({ id: 'chapter-1', chapter: 1, world: 'NIGHT SERVICE', name: 'EMBER STONE', clue: 'Night Service: look closer beneath the unfinished letter to Rosa, in the orchard case.' }),
  Object.freeze({ id: 'chapter-2', chapter: 2, world: 'BORROWED LIGHT', name: 'GRID STONE', clue: 'Borrowed Light: a ledge high above the roofs that shows only in the afterglow of a punched node.' }),
  Object.freeze({ id: 'chapter-3', chapter: 3, world: 'ECHO CITY', name: 'ECHO STONE', clue: 'Echo City: someone at the dusk campfire kept one, sewn into an unclaimed coat.' }),
  Object.freeze({ id: 'chapter-4', chapter: 4, world: 'THE PAINTED COUNTRY', name: 'PIGMENT STONE', clue: 'The Painted Country: under the grey on the plate above the HOME door, in the painted-train yard.' }),
  Object.freeze({ id: 'black-knife', chapter: 5, world: 'THE MUSEUM', name: 'BLACK TICKET STONE', clue: 'The Museum: behind the pigment vials in the pending case. Only broken glass reaches it.' }),
]);

/** The stones' one player-visible name. */
export const MAGIC_STONES_LABEL = 'MAGIC STONES';

/** What the stones are, in one visible line (offer card, pause menu, cards). */
export const MAGIC_STONE_MEANING = Object.freeze([
  'Records the archive could not file.',
  'Five open the last carriage.',
]);
export const MAGIC_STONE_LINE = MAGIC_STONE_MEANING.join(' ');

/** "MAGIC STONES · 2 / 5" */
export function magicStoneCountLabel(snapshot) {
  return `${MAGIC_STONES_LABEL} · ${snapshot.count} / ${snapshot.total}`;
}

const stoneById = (id) => MAGIC_STONES.find((stone) => stone.id === id);

// `slot` defaults to the active save slot.
export function magicStoneSnapshot(storage = globalThis.localStorage, { slot = null } = {}) {
  const store = createSaveStore(storage);
  const save = store.readAll()[slot ?? store.getActiveSlot()];
  const collected = [...new Set(save?.magicStones ?? [])].filter((id) => stoneById(id));
  return {
    collected,
    count: collected.length,
    total: MAGIC_STONES.length,
    allCollected: MAGIC_STONES.every(({ id }) => collected.includes(id)),
    missing: MAGIC_STONES.filter(({ id }) => !collected.includes(id)).map(({ id }) => id),
  };
}

// One entry per stone in the registry, marking which are held. In registry
// order by default (one socket per chapter); `byCount` puts the held stones
// first, so a row read next to "1 / 5" lights its first socket whichever
// stone was found (alpha R2-6), with a pending stone in the next one.
export function magicStoneRow(snapshot = magicStoneSnapshot(), { byCount = false, pending = null } = {}) {
  const row = MAGIC_STONES.map(({ id, name }) => ({ id, name, held: snapshot.collected.includes(id) }));
  if (!byCount) return row;
  const rank = ({ id, held }) => (held ? 0 : id === pending ? 1 : 2);
  return row.map((entry, index) => ({ entry, index }))
    .sort((a, b) => rank(a.entry) - rank(b.entry) || a.index - b.index)
    .map(({ entry }) => entry);
}

/** The five sockets as `.nf-stones` markup (src/shell/uiKit.css), filled by count. */
export function magicStoneRowHtml(snapshot = magicStoneSnapshot(), { pending = null } = {}) {
  const sockets = magicStoneRow(snapshot, { byCount: true, pending }).map(({ id, name, held }) => {
    const cls = held ? 'is-held' : id === pending ? 'is-pending' : '';
    const label = held ? name : id === pending ? `${name} (here)` : 'an empty socket';
    return `<i class="${cls}" title="${label}" aria-label="${label}"></i>`;
  }).join('');
  return `<span class="nf-stones" role="img" aria-label="${snapshot.count} of ${snapshot.total} magic stones held">${sockets}</span>`;
}

// The one-time card for the first stone a journey picks up (the pause menu
// shows it on every chapter page): what the stones are, and that five
// change the ending. `null` once this save has seen it.
export const FIRST_STONE_NOTICE = 'first-magic-stone';

export function firstStoneNotice(id, storage = globalThis.localStorage) {
  const stone = stoneById(id);
  if (!stone) return null;
  const store = createSaveStore(storage);
  const save = store.readAll()[store.getActiveSlot()];
  if (!save || (save.notices ?? []).includes(FIRST_STONE_NOTICE)) return null;
  const snapshot = magicStoneSnapshot(storage);
  if (!snapshot.collected.includes(id)) return null;
  return {
    key: FIRST_STONE_NOTICE,
    stamp: `MAGIC STONE ${snapshot.count} / ${snapshot.total} · AN UNFILED RECORD`,
    title: stone.name,
    lines: [
      'The archive could not file it. Keep what it can’t.',
      'There are five on the line. Carry all five and the journey ends differently: the last carriage opens.',
    ],
    socketsHtml: magicStoneRowHtml(snapshot),
    count: snapshot.count,
  };
}

export const MISSING_STONE_HINT = 'To go back for them: LOAD · CHECKPOINTS on the title replays any chapter, and the stones already found stay found.';

// After the normal ending's credits: the count, and the clue of every stone
// the journey missed. `null` when all five were held.
export function missingStoneNotice(collectedIds = []) {
  const held = new Set(collectedIds);
  const missing = MAGIC_STONES.filter(({ id }) => !held.has(id));
  if (!missing.length) return null;
  const count = MAGIC_STONES.length - missing.length;
  const snapshot = {
    collected: MAGIC_STONES.filter(({ id }) => held.has(id)).map(({ id }) => id),
    count,
    total: MAGIC_STONES.length,
  };
  return {
    stamp: `${count} / ${MAGIC_STONES.length} ${MAGIC_STONES_LABEL} FOUND`,
    title: 'The last carriage stayed closed.',
    line: `${MAGIC_STONE_LINE} Where the missing ones were:`,
    clues: missing.map(({ chapter, world, clue }) => `CH ${chapter} · ${world} — ${clue.replace(/^[^:]+:\s*/, '')}`),
    // How to go back for them (alpha round 4: the card never said).
    hint: MISSING_STONE_HINT,
    socketsHtml: magicStoneRowHtml(snapshot),
    missing: missing.map(({ id }) => id),
  };
}

export function collectMagicStone(id, storage = globalThis.localStorage) {
  if (!stoneById(id)) return null;
  const store = createSaveStore(storage);
  const slot = store.getActiveSlot();
  if (!store.readAll()[slot]) store.startNew(slot);
  return store.collectMagicStone(id, { slot });
}

function installStyles() {
  if (document.getElementById('nightfall-magic-stone-style')) return;
  const style = document.createElement('style');
  style.id = 'nightfall-magic-stone-style';
  // The offer is a punched archive card (`.nf-card`, src/shell/uiKit.css);
  // these rules only add the stone, the socket row and the two choices.
  style.textContent = `
    .nf-stone-offer{z-index:10020;background:radial-gradient(circle at 50% 42%,rgba(40,27,16,.55),rgba(5,4,3,.9) 62%)}
    .nf-stone-offer .nf-card{display:grid;grid-template-columns:86px 1fr;column-gap:22px;align-items:start}
    .nf-stone-offer .nf-stone-gem{grid-row:1 / span 3;width:70px;height:70px;margin-top:6px;border-radius:44% 56% 52% 48% / 58% 44% 56% 42%;background:radial-gradient(circle at 36% 30%,#8c8378 0 6%,#3d3833 26%,#161311 72%);box-shadow:inset -6px -8px 14px rgba(0,0,0,.55),0 8px 18px rgba(0,0,0,.35)}
    .nf-stone-offer .nf-stone-gem.is-ember{background:radial-gradient(circle at 36% 30%,#ffd79a 0 6%,#e0a24a 30%,#6b2a22 80%)}
    .nf-stone-offer .nf-card__lines{grid-column:2}
    .nf-stone-offer .nf-stone-row{grid-column:2;display:flex;align-items:center;gap:12px;margin:14px 0 4px;font:700 calc(12px * var(--nf-scale,1)) var(--nf-mono,monospace);letter-spacing:.14em;color:#6b5640}
    .nf-stone-offer .nf-stones i{border-color:#8a6934;background:rgba(42,29,20,.18)}
    .nf-stone-offer .nf-stones i.is-held{background:radial-gradient(circle at 35% 35%,#ffd79a,#e0a24a 60%,#7a4a18);box-shadow:0 0 8px rgba(224,162,74,.55)}
    .nf-stone-offer .nf-stones i.is-pending{border-style:dashed;border-color:#8a2a1e}
    .nf-stone-offer .nf-stone-actions{grid-column:2;display:flex;gap:10px;margin-top:18px;flex-wrap:wrap}
    .nf-stone-offer .nf-stone-actions button{padding:10px 16px;border:1px solid #8a6934;border-radius:4px;background:#2a1d14;color:#eadfc6;font:700 calc(12px * var(--nf-scale,1)) var(--nf-mono,monospace);letter-spacing:.14em;cursor:pointer}
    .nf-stone-offer .nf-stone-actions button[data-leave]{background:transparent;color:#6b5640}
    .nf-stone-offer .nf-stone-actions button:focus-visible,.nf-stone-offer .nf-stone-actions button:hover{outline:2px solid #e0a24a;outline-offset:2px}
  `;
  document.head.append(style);
}

const escapeHtml = (value) => String(value).replace(/[&<>"]/g, (char) => `&#${char.charCodeAt(0)};`);

export function offerMagicStone(id, { storage = globalThis.localStorage } = {}) {
  const stone = stoneById(id);
  if (!stone || typeof document === 'undefined') return Promise.resolve(false);
  const before = magicStoneSnapshot(storage);
  if (before.collected.includes(id)) return Promise.resolve(true);
  installStyles();
  globalThis.NIGHTFALL_STONE_OFFER = true;
  return new Promise((resolve) => {
    const root = document.createElement('section');
    root.className = 'nf-card-backdrop nf-stone-offer';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.innerHTML = `<article class="nf-card">
      <div class="nf-stone-gem${id === 'chapter-1' ? ' is-ember' : ''}" aria-hidden="true"></div>
      <p class="nf-card__stamp">A MAGIC STONE · AN UNFILED RECORD</p>
      <h2 class="nf-card__title">${escapeHtml(stone.name)}</h2>
      <div class="nf-card__lines">${MAGIC_STONE_MEANING.map((line) => `<p>${escapeHtml(line)}</p>`).join('')}</div>
      <div class="nf-stone-row">${magicStoneRowHtml(before, { pending: id })}<span>${magicStoneCountLabel(before)}</span></div>
      <div class="nf-stone-actions"><button type="button" data-take>TAKE IT · E</button><button type="button" data-leave>LEAVE IT · L</button></div>
    </article>`;
    document.body.append(root);
    const finish = (taken) => {
      if (taken) collectMagicStone(id, storage);
      globalThis.NIGHTFALL_STONE_OFFER = false;
      window.removeEventListener('keydown', onKey, true);
      root.remove();
      resolve(taken);
    };
    const onKey = (event) => {
      if (event.code === 'KeyE' || event.code === 'Enter') { event.preventDefault(); event.stopImmediatePropagation(); finish(true); }
      else if (event.code === 'KeyL') { event.preventDefault(); event.stopImmediatePropagation(); finish(false); }
    };
    root.querySelector('[data-take]').addEventListener('click', () => finish(true));
    root.querySelector('[data-leave]').addEventListener('click', () => finish(false));
    window.addEventListener('keydown', onKey, true);
    root.querySelector('[data-take]').focus();
  });
}
