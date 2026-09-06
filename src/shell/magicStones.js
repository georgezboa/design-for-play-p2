import { createSaveStore } from './saveSystem.js';

export const MAGIC_STONES = Object.freeze([
  Object.freeze({ id: 'chapter-1', chapter: 1, name: 'EMBER STONE', clue: 'Hidden beneath the unfinished letter in Mara\'s suitcase.' }),
  Object.freeze({ id: 'chapter-2', chapter: 2, name: 'GRID STONE', clue: 'Waiting on the lower return route beneath the airborne crossing.' }),
  Object.freeze({ id: 'chapter-3', chapter: 3, name: 'ECHO STONE', clue: 'Found in an unclaimed coat by Seline at the dusk campfire.' }),
  Object.freeze({ id: 'chapter-4', chapter: 4, name: 'PIGMENT STONE', clue: 'Tucked behind a loose paper panel in the color room.' }),
  Object.freeze({ id: 'black-knife', chapter: 6, name: 'BLACK KNIFE STONE', clue: 'Kept in the Museum lobby behind a shattered display pane.' }),
]);

const stoneById = (id) => MAGIC_STONES.find((stone) => stone.id === id);

export function magicStoneSnapshot(storage = globalThis.localStorage) {
  const store = createSaveStore(storage);
  const save = store.readAll()[store.getActiveSlot()];
  const collected = [...new Set(save?.magicStones ?? [])].filter((id) => stoneById(id));
  return {
    collected,
    count: collected.length,
    total: MAGIC_STONES.length,
    allCollected: MAGIC_STONES.every(({ id }) => collected.includes(id)),
    missing: MAGIC_STONES.filter(({ id }) => !collected.includes(id)).map(({ id }) => id),
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
  style.textContent = `
    .nf-stone-offer{position:fixed;inset:0;z-index:10020;display:grid;place-items:center;background:radial-gradient(circle at 50% 43%,rgba(31,50,61,.64),rgba(1,3,5,.96) 56%);color:#e9e4d5;font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
    .nf-stone-card{width:min(520px,calc(100vw - 32px));padding:30px 32px 26px;text-align:center;border:1px solid rgba(122,235,255,.5);background:linear-gradient(145deg,rgba(8,13,16,.98),rgba(18,12,20,.98));box-shadow:0 0 80px rgba(67,233,255,.16)}
    .nf-stone-gem{width:68px;height:82px;margin:0 auto 20px;clip-path:polygon(50% 0,90% 28%,78% 78%,50% 100%,22% 78%,10% 28%);background:radial-gradient(circle at 38% 28%,#fff 0 4%,#7aeaff 8%,#795ab4 48%,#130d23 82%);filter:drop-shadow(0 0 18px rgba(92,225,255,.75));animation:nfStonePulse 1.8s ease-in-out infinite}
    .nf-stone-card small{display:block;color:#66ddea;letter-spacing:.22em}.nf-stone-card h2{margin:10px 0 12px;font:600 24px Georgia,serif;letter-spacing:.08em}.nf-stone-card p{min-height:42px;color:#bcb6a8;line-height:1.55}
    .nf-stone-actions{display:flex;gap:12px;justify-content:center;margin-top:24px}.nf-stone-actions button{min-width:170px;padding:12px 16px;border:1px solid #59717a;background:#0b1114;color:#e9e4d5;font:700 12px ui-monospace,monospace;letter-spacing:.12em;cursor:pointer}.nf-stone-actions button:first-child{border-color:#65ddea;color:#8cecff}.nf-stone-count{margin-top:18px;color:#747d80;font-size:11px;letter-spacing:.14em}
    @keyframes nfStonePulse{50%{transform:translateY(-5px) scale(1.04);filter:drop-shadow(0 0 30px rgba(92,225,255,.92))}}
  `;
  document.head.append(style);
}

export function offerMagicStone(id, { storage = globalThis.localStorage } = {}) {
  const stone = stoneById(id);
  if (!stone || typeof document === 'undefined') return Promise.resolve(false);
  const before = magicStoneSnapshot(storage);
  if (before.collected.includes(id)) return Promise.resolve(true);
  installStyles();
  globalThis.NIGHTFALL_STONE_OFFER = true;
  return new Promise((resolve) => {
    const root = document.createElement('section');
    root.className = 'nf-stone-offer';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.innerHTML = `<div class="nf-stone-card"><div class="nf-stone-gem"></div><small>AN UNFILED OBJECT</small><h2>${stone.name}</h2><p>${stone.clue}</p><div class="nf-stone-actions"><button data-take>TAKE THE STONE · E</button><button data-leave>LEAVE IT</button></div><div class="nf-stone-count">FOUND ${before.count} / ${before.total}</div></div>`;
    document.body.append(root);
    const finish = (taken) => {
      if (taken) collectMagicStone(id, storage);
      globalThis.NIGHTFALL_STONE_OFFER = false;
      window.removeEventListener('keydown', onKey);
      root.remove();
      resolve(taken);
    };
    const onKey = (event) => {
      if (event.code === 'KeyE' || event.code === 'Enter') { event.preventDefault(); finish(true); }
      else if (event.code === 'KeyL') { event.preventDefault(); finish(false); }
    };
    root.querySelector('[data-take]').addEventListener('click', () => finish(true));
    root.querySelector('[data-leave]').addEventListener('click', () => finish(false));
    window.addEventListener('keydown', onKey);
    root.querySelector('[data-take]').focus();
  });
}
