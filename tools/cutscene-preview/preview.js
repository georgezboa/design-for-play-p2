// The cutscene preview: pick one of the eight, watch it in the game's own
// player (src/shell/cutscene/player.js), the painted version or the drawn
// one beside it. Esc or BACK returns to the list; Space pauses.

import '../../src/fonts/fonts.css';
import '../../src/shell/gameFlow.css';
import './preview.css';
import { mountCutscene } from '../../src/shell/cutscene/player.js';
import { DRAWN_LOADERS, PAINTED_LOADERS } from '../../src/shell/cutscene/registry.js';
import { PLATES } from '../../src/shell/cutscene/painted/plates.generated.js';

globalThis.NF_ASSET_BASE = './';

const LIST = [
  { id: 'opening', n: '1', name: '开场', route: '标题 → 第一章' },
  { id: 'chapter1To2', n: '2', name: '第一章 → 第二章', route: '贝尔韦瑟 → 雨城' },
  { id: 'chapter2To3', n: '3', name: '第二章 → 第三章', route: '雨城 → 回声城' },
  { id: 'chapter3To4', n: '4', name: '第三章 → 第四章', route: '回声城 → 画中乡' },
  { id: 'chapter4To5', n: '5', name: '第四章 → 第五章', route: '画中乡 → 博物馆' },
  { id: 'chapter5-to-conductor', n: '6', name: '第五章 → 终章', route: '博物馆 → 列车长' },
  { id: 'chapter5-to-black-knife', n: '7', name: '第五章 → 黑车票', route: '集齐五颗石头' },
  { id: 'ending', n: '8', name: '普通结局', route: '终章之后' },
];

const app = document.getElementById('nf-preview');
app.innerHTML = `
  <header class="pv-head">
    <p class="pv-eyebrow">NIGHTFALL · ROUND 9</p>
    <h1>过场预览</h1>
    <p class="pv-lede">用游戏自己的引擎播放 8 段新过场，镜头、衔接、字幕、音乐都是游戏里的。44 张新画已经全部换上；「看旧版」是第 6 轮手绘的那一版，留着对比。</p>
    <p class="pv-keys"><span>Esc</span> 返回列表 <span>空格</span> 暂停</p>
  </header>
  <ol class="pv-list" id="pv-list"></ol>
`;
const list = app.querySelector('#pv-list');

function plateCounts(def) {
  const own = (def.plates ?? []).filter((p) => !p.includes(':'));
  const stand = own.filter((p) => PLATES[p]?.standIn).length;
  return { real: own.length - stand, stand, total: own.length };
}

LIST.forEach((item) => {
  const li = document.createElement('li');
  li.className = 'pv-row';
  li.innerHTML = `
    <span class="pv-n" aria-hidden="true">${item.n}</span>
    <div class="pv-text">
      <h2>${item.name}</h2>
      <p class="pv-route">${item.route} · <code>${item.id}</code></p>
      <p class="pv-status" data-status>…</p>
    </div>
    <div class="pv-actions">
      <button type="button" class="pv-play" id="play-${item.id}">播放新版</button>
      <button type="button" class="pv-old" id="old-${item.id}">看旧版</button>
    </div>`;
  list.append(li);
  li.querySelector('.pv-play').addEventListener('click', () => play(item, 'painted'));
  li.querySelector('.pv-old').addEventListener('click', () => play(item, 'drawn'));
  PAINTED_LOADERS[item.id]().then((m) => {
    const c = plateCounts(m.default);
    const status = li.querySelector('[data-status]');
    status.innerHTML = c.stand
      ? `<span class="pv-chip pv-chip--stand">替身 ${c.stand}</span><span class="pv-chip">已有真图 ${c.real} / ${c.total}</span>`
      : `<span class="pv-chip pv-chip--done">全部真图</span>`;
  }).catch(() => {});
});

let current = null;

function close() {
  if (!current) return;
  current.ctl?.destroy();
  current.root.remove();
  document.body.classList.remove('pv-playing');
  const back = document.getElementById(`play-${current.item.id}`);
  current = null;
  back?.focus();
}

async function play(item, version) {
  if (current) close();
  const loader = version === 'painted' ? PAINTED_LOADERS[item.id] : DRAWN_LOADERS[item.id];
  const root = document.createElement('section');
  root.className = 'nf-cinematic';
  root.dataset.cutscene = item.id;
  root.setAttribute('aria-label', `${item.name}（${version === 'painted' ? '新版' : '旧版'}）`);
  root.innerHTML = `
    <div class="pv-bar">
      <button type="button" class="pv-back" id="pv-back">← 返回</button>
      <span class="pv-tag">${item.n} · ${item.name} · ${version === 'painted' ? '新版' : '旧版'}</span>
      <button type="button" class="pv-pause" id="pv-pause">暂停</button>
    </div>
    <div class="pv-end" hidden>
      <p>播放完毕</p>
      <div><button type="button" id="pv-again">再看一遍</button><button type="button" id="pv-done">返回列表</button></div>
    </div>`;
  document.body.append(root);
  document.body.classList.add('pv-playing');
  current = { item, root, ctl: null, paused: false };
  const entry = current;
  root.querySelector('#pv-back').addEventListener('click', close);
  root.querySelector('#pv-done').addEventListener('click', close);
  root.querySelector('#pv-again').addEventListener('click', () => play(item, version));
  root.querySelector('#pv-pause').addEventListener('click', () => togglePause());
  root.querySelector('#pv-back').focus();
  const def = (await loader()).default;
  if (current !== entry) return;
  entry.ctl = mountCutscene(def, {
    root,
    onEnd: () => {
      if (current !== entry) return;
      root.querySelector('.pv-end').hidden = false;
      root.querySelector('#pv-again').focus();
    },
  });
  await entry.ctl.start();
}

function togglePause() {
  if (!current?.ctl) return;
  current.paused = !current.paused;
  if (current.paused) current.ctl.pause('preview');
  else current.ctl.resume('preview');
  const b = current.root.querySelector('#pv-pause');
  if (b) b.textContent = current.paused ? '继续' : '暂停';
}

window.addEventListener('keydown', (event) => {
  if (!current) return;
  if (event.key === 'Escape') { event.preventDefault(); close(); }
  else if (event.key === ' ' && event.target?.tagName !== 'BUTTON') { event.preventDefault(); togglePause(); }
});
