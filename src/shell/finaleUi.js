// Shared DOM pieces for the Chapter 6 finale pages (finale.css): the ticket
// boss bar, the Chapter 2 bell meter, the stone row, paper-tag prompts, the
// title card, archive cards and the hold-to-skip ring. Each helper builds
// plain DOM so the Conductor (three.js), the Black Ticket (Phaser) and the
// true ending (DOM only) share one look.

import './finale.css';
import { magicStoneRow, magicStoneSnapshot } from './magicStones.js';
import { SKIP_HOLD_MS, createHoldGesture, isSkipKey } from './holdToSkip.js';

const el = (tag, className, html) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (html !== undefined) node.innerHTML = html;
  return node;
};

// ---------------------------------------------------------------------------
// Boss bar: a ticket. `notches` are fractions of the bar where a punch hole
// sits (one per broken movement / phase).

export function createTicketBar(parent, { name = 'THE CONDUCTOR', serial = 'CLAIM 1978-0412', notches = [0.25, 0.5, 0.75] } = {}) {
  const root = el('div', 'nf-ticket-bar');
  root.innerHTML = `
    <div class="nf-ticket-bar__stub"><b></b><span></span></div>
    <div class="nf-ticket-bar__body">
      <span class="nf-ticket-bar__serial"></span><span class="nf-ticket-bar__state"></span>
      <div class="nf-ticket-bar__track"><i class="nf-ticket-bar__ghost"></i><i class="nf-ticket-bar__fill"></i></div>
    </div>`;
  root.querySelector('b').textContent = name;
  root.querySelector('.nf-ticket-bar__serial').textContent = serial;
  const body = root.querySelector('.nf-ticket-bar__body');
  const holes = notches.map((at) => {
    const hole = el('span', 'nf-ticket-bar__hole');
    hole.style.left = `calc(14px + (100% - 36px) * ${at})`;
    body.append(hole);
    return { at, hole };
  });
  const fill = root.querySelector('.nf-ticket-bar__fill');
  const ghost = root.querySelector('.nf-ticket-bar__ghost');
  const label = root.querySelector('.nf-ticket-bar__stub span');
  const state = root.querySelector('.nf-ticket-bar__state');
  let shown = 1;
  parent.append(root);
  return {
    root,
    set(fraction, { dt = 1 / 60 } = {}) {
      const value = Math.max(0, Math.min(1, fraction));
      fill.style.width = `${value * 100}%`;
      shown += (value - shown) * Math.min(1, dt * 4.2);
      if (shown < value) shown = value;
      ghost.style.width = `${shown * 100}%`;
      // A hole is punched once the bar has fallen past it.
      holes.forEach(({ at, hole }) => hole.classList.toggle('is-punched', value <= at + 1e-6));
    },
    setLabel(text) { if (label.textContent !== text) label.textContent = text; },
    setState(text, exposed = false) {
      if (state.textContent !== text) state.textContent = text;
      root.classList.toggle('is-exposed', exposed);
    },
    setVisible(visible) { root.classList.toggle('hidden', !visible); },
  };
}

// ---------------------------------------------------------------------------
// Bell meter: Chapter 2's brass bell inside a ring that fills over the four
// seconds between bells, with the three line tags underneath.

const BELL_R = 30;
const BELL_C = 2 * Math.PI * BELL_R;

export function createBellMeter(parent, { lines = ['amber', 'teal', 'rose'] } = {}) {
  const root = el('div', 'nf-bell');
  const body = [];
  for (let i = 0; i <= 16; i += 1) {
    const t = i / 16;
    const y = 4 + t * 26;
    const w = 5 + Math.pow(t, 1.8) * 10.5 + (t > 0.85 ? (t - 0.85) * 22 : 0);
    body.push([-w, y]);
  }
  const outline = [...body, ...body.slice().reverse().map(([x, y]) => [-x, y])].map(([x, y]) => `${(39 + x).toFixed(1)},${(y + 16).toFixed(1)}`).join(' ');
  const shine = body.slice(2, 13).map(([x, y]) => `${(39 + x * 0.55 + 2).toFixed(1)},${(y + 16).toFixed(1)}`).concat(['40,39', '40,22']).join(' ');
  root.innerHTML = `
    <svg viewBox="0 0 78 78" aria-hidden="true">
      <circle class="nf-bell__disc" cx="39" cy="39" r="38"/>
      <circle class="nf-bell__track" cx="39" cy="39" r="${BELL_R}"/>
      <circle class="nf-bell__fill" cx="39" cy="39" r="${BELL_R}" stroke-dasharray="${BELL_C.toFixed(2)}" stroke-dashoffset="${BELL_C.toFixed(2)}"/>
      ${[0, 1, 2, 3].map((i) => { const a = -Math.PI / 2 + (i * Math.PI) / 2; return `<line class="nf-bell__tick" x1="${39 + Math.cos(a) * (BELL_R - 5)}" y1="${39 + Math.sin(a) * (BELL_R - 5)}" x2="${39 + Math.cos(a) * (BELL_R + 5)}" y2="${39 + Math.sin(a) * (BELL_R + 5)}"/>`; }).join('')}
      <g class="nf-bell__glyph">
        <rect x="37" y="14" width="4" height="6" fill="#6d5227"/>
        <polygon class="nf-bell__body" points="${outline}"/>
        <polygon class="nf-bell__shine" points="${shine}"/>
        <rect class="nf-bell__lip" x="22" y="45" width="34" height="3"/>
        <circle class="nf-bell__clapper" cx="39" cy="51" r="3.4"/>
      </g>
    </svg>
    <div class="nf-bell__lines">${lines.map((line) => `<i data-line="${line}"></i>`).join('')}</div>
    <div class="nf-bell__label"></div>`;
  const fill = root.querySelector('.nf-bell__fill');
  const label = root.querySelector('.nf-bell__label');
  const tags = Object.fromEntries(lines.map((line) => [line, root.querySelector(`[data-line="${line}"]`)]));
  if (!lines.length) root.querySelector('.nf-bell__lines').remove();
  parent.append(root);
  let ringTimer = 0;
  return {
    root,
    update({ phase = 0, msToBell = 4000, lineStates = {}, text = '', listening = false } = {}) {
      fill.setAttribute('stroke-dashoffset', (BELL_C * (1 - Math.max(0.001, Math.min(1, phase)))).toFixed(2));
      root.classList.toggle('is-due', msToBell < 500);
      root.classList.toggle('is-listening', listening);
      Object.entries(tags).forEach(([line, tag]) => {
        const s = lineStates[line] ?? 'idle';
        tag.classList.toggle('is-queued', s === 'queued');
        tag.classList.toggle('is-powering', s === 'powering');
      });
      if (label.textContent !== text) label.textContent = text;
    },
    ring() {
      root.classList.remove('is-ringing');
      void root.offsetWidth;
      root.classList.add('is-ringing');
      clearTimeout(ringTimer);
      ringTimer = setTimeout(() => root.classList.remove('is-ringing'), 950);
    },
    setVisible(visible) { root.classList.toggle('hidden', !visible); },
  };
}

// ---------------------------------------------------------------------------
// Stone row (five sockets, lit when held).

export function createStoneRow(parent, { snapshot = magicStoneSnapshot(), caption = 'STONES' } = {}) {
  const root = el('div', 'nf-stone-row');
  const row = el('div', 'nf-stones');
  magicStoneRow(snapshot).forEach(({ name, held }) => {
    const gem = el('i', held ? 'is-held' : '');
    gem.title = name;
    row.append(gem);
  });
  const small = el('small');
  small.textContent = `${caption} · ${snapshot.count} / ${snapshot.total}`;
  root.append(row, small);
  root.setAttribute('aria-label', `${snapshot.count} of ${snapshot.total} magic stones held`);
  parent.append(root);
  return root;
}

// ---------------------------------------------------------------------------
// Paper tags anchored to screen points (projected from the world by the
// caller). A pool keeps DOM churn down.

export function createTagLayer(parent) {
  const pool = [];
  let used = 0;
  const layer = el('div', 'nf-tag-layer');
  layer.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:11;';
  parent.append(layer);
  return {
    begin() { used = 0; },
    tag(text, x, y, { dim = false, queued = false, color = null } = {}) {
      let node = pool[used];
      if (!node) {
        node = el('div', 'nf-tag nf-world-tag');
        layer.append(node);
        pool.push(node);
      }
      used += 1;
      if (node.dataset.text !== text) { node.innerHTML = text; node.dataset.text = text; }
      node.style.left = `${Math.round(x)}px`;
      node.style.top = `${Math.round(y)}px`;
      node.style.display = '';
      node.classList.toggle('is-dim', dim);
      node.classList.toggle('is-queued', queued);
      node.style.borderLeft = color ? `4px solid ${color}` : '';
      return node;
    },
    end() { for (let i = used; i < pool.length; i += 1) pool[i].style.display = 'none'; },
    get count() { return used; },
    texts() { return pool.slice(0, used).map((node) => node.dataset.text); },
  };
}

// ---------------------------------------------------------------------------
// Title card (.nf-title-card): kicker, main line, rule, optional sub-line,
// and an optional line of keys (the controls this beat adds).

export function showTitleCard({ kicker = '', main = '', sub = '', keys = '', duration = 4600, parent = document.body } = {}) {
  // One card at a time: a new card replaces one still fading out.
  parent.querySelectorAll(':scope > .nf-title-card').forEach((old) => old.remove());
  const card = el('div', 'nf-title-card');
  card.style.animationDuration = `${duration}ms`;
  card.innerHTML = '<div><p class="nf-title-card__kicker"></p><p class="nf-title-card__main"></p><div class="nf-title-card__rule"></div><p class="nf-title-card__sub"></p></div>';
  card.querySelector('.nf-title-card__kicker').textContent = kicker;
  card.querySelector('.nf-title-card__main').textContent = main;
  const subLine = card.querySelector('.nf-title-card__sub');
  subLine.textContent = sub;
  subLine.style.cssText = 'margin:16px 0 0;font:calc(21px * var(--nf-scale)) / 1.4 var(--nf-serif);font-style:italic;color:#d8ccb0;text-shadow:0 3px 14px rgba(0,0,0,.9);';
  if (keys) {
    const keyLine = el('p', 'nf-title-card__keys');
    keyLine.textContent = keys;
    card.firstElementChild.append(keyLine);
  }
  parent.append(card);
  const timer = setTimeout(() => card.remove(), duration + 50);
  return { root: card, remove() { clearTimeout(timer); card.remove(); } };
}

// ---------------------------------------------------------------------------
// Archive card (.nf-card): stamp, title, 2–3 short lines. Resolves when the
// reader closes it (Enter / Space / E / click) or after `autoMs`.

export function showArchiveCard({ stamp = '', title = '', lines = [], close = 'ENTER · CONTINUE', autoMs = 0, lockMs = 700, parent = document.body } = {}) {
  return new Promise((resolve) => {
    const backdrop = el('div', 'nf-card-backdrop');
    backdrop.setAttribute('role', 'dialog');
    backdrop.setAttribute('aria-modal', 'true');
    const card = el('article', 'nf-card');
    card.innerHTML = '<p class="nf-card__stamp"></p><h2 class="nf-card__title"></h2><div class="nf-card__lines"></div><button class="nf-card__close" type="button"></button>';
    card.querySelector('.nf-card__stamp').textContent = stamp;
    card.querySelector('.nf-card__title').textContent = title;
    const body = card.querySelector('.nf-card__lines');
    lines.forEach((text) => { const p = el('p'); p.textContent = text; body.append(p); });
    const button = card.querySelector('.nf-card__close');
    button.textContent = close;
    backdrop.append(card);
    parent.append(backdrop);
    const opened = performance.now();
    let done = false;
    let timer = 0;
    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      window.removeEventListener('keydown', onKey, true);
      backdrop.remove();
      resolve();
    };
    const onKey = (event) => {
      if (!['Enter', 'NumpadEnter', 'Space', 'KeyE'].includes(event.code)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (performance.now() - opened >= lockMs) finish();
    };
    window.addEventListener('keydown', onKey, true);
    button.addEventListener('click', () => { if (performance.now() - opened >= lockMs) finish(); });
    if (autoMs > 0) timer = setTimeout(finish, autoMs);
    requestAnimationFrame(() => button.focus({ preventScroll: true }));
  });
}

// ---------------------------------------------------------------------------
// Hold-to-skip, the films' gesture: hold Space / Enter / Esc or a mouse
// button for SKIP_HOLD_MS. Taps do nothing.

export function installHoldToSkip({ onSkip, label = 'HOLD TO SKIP', parent = document.body } = {}) {
  const root = el('div', 'nf-hold');
  root.innerHTML = `<svg viewBox="0 0 36 36" aria-hidden="true"><circle class="nf-hold__track" cx="18" cy="18" r="15"/><circle class="nf-hold__fill" cx="18" cy="18" r="15" pathLength="100"/></svg><span></span>`;
  root.querySelector('span').textContent = label;
  parent.append(root);
  const hold = createHoldGesture();
  let frame = 0;
  let timer = 0;
  let hideTimer = 0;
  let active = true;
  const show = () => {
    root.classList.add('is-visible');
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => { if (!hold.holding) root.classList.remove('is-visible'); }, 2400);
  };
  const tick = () => {
    frame = 0;
    const progress = hold.progress(performance.now());
    root.style.setProperty('--nf-hold-progress', String(progress));
    if (hold.completed) { stop(); onSkip?.(); return; }
    if (hold.holding) frame = requestAnimationFrame(tick);
  };
  const guard = () => {
    timer = 0;
    if (!active) return;
    tick();
    if (hold.holding && !hold.completed) timer = setTimeout(guard, 60);
  };
  const press = (source) => {
    if (!active) return;
    show();
    hold.press(source, performance.now());
    if (!frame) frame = requestAnimationFrame(tick);
    if (!timer) timer = setTimeout(guard, SKIP_HOLD_MS);
  };
  const release = (source) => {
    hold.release(source);
    if (!hold.holding) root.style.setProperty('--nf-hold-progress', '0');
  };
  const onKeyDown = (event) => {
    if (!active || !isSkipKey(event) || globalThis.NIGHTFALL_PAUSED) return;
    if (event.code === 'Escape') return; // Esc belongs to the pause menu here
    event.preventDefault();
    if (!event.repeat) press(`key:${event.code}`);
  };
  const onKeyUp = (event) => { if (isSkipKey(event)) release(`key:${event.code}`); };
  const onDown = (event) => { if (active && !event.target.closest?.('button, a, .nf-pause, [role="dialog"]')) press(`pointer:${event.pointerId}`); };
  const onUp = (event) => release(`pointer:${event.pointerId}`);
  const onBlur = () => { hold.releaseAll(); root.style.setProperty('--nf-hold-progress', '0'); };
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('pointerdown', onDown);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('blur', onBlur);
  function stop() {
    active = false;
    cancelAnimationFrame(frame);
    clearTimeout(timer);
    clearTimeout(hideTimer);
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    window.removeEventListener('pointerdown', onDown);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('blur', onBlur);
    root.remove();
  }
  show();
  return { stop, get holding() { return hold.holding; } };
}

// ---------------------------------------------------------------------------
// In-fiction stamp over the stage ("DEPARTING", "CLAIM CLOSED").

export function stampAnnounce(parent, text, { holdMs = 1300 } = {}) {
  const node = el('div', 'nf-announce');
  node.textContent = text;
  node.style.animationDuration = `${holdMs}ms`;
  parent.append(node);
  requestAnimationFrame(() => node.classList.add('show'));
  setTimeout(() => node.remove(), holdMs + 80);
  return node;
}
