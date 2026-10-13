// HOT COFFEE · DLC (热咖啡, 2026-10-12): a free "DLC" on the title menu.
//
// George's joke: it brews for a long time, and while it brews the lines make
// the player suspect a very different kind of DLC. Then it is a cup of hot
// coffee on Butch's desk. Nothing else happens. Five real minutes later it
// has gone cold, and it stays cold for good (the state is kept in this
// computer's storage, so closing the game does not stop it cooling).
// Leaving while it brews throws the water out: the next visit starts again.
//
// The lines are English here and Chinese in the 汉化 table, like every other
// string. They only ever hint; what they describe is the coffee.
import { assetUrl } from '../shared/assetUrl.js';
import { reducedMotionActive } from './motion.js';

import { BREW_MS, COFFEE_TEXT, COOL_MS, STALL_MS, brewLine, brewPercent, coffeeState, writeCoffee as write } from './hotCoffeeState.js';

export { COFFEE_KEY, COFFEE_TEXT, coffeeMenuDetail, coffeeState } from './hotCoffeeState.js';

// ---------------------------------------------------------------- picture

const DESK = '/assets/ch1-painted/act1/desk.webp';
// the part of Chapter 1's desk painting the camera holds (painting pixels)
const CROP = { x: 418, y: 318, w: 480, h: 270 };
// the cup stands at the desk's front edge, right of the lamp (painting pixels)
const CUP = { x: 698, y: 501, w: 46 };

function paintCup(c, toScreen, { steam, cold, time }) {
  const base = toScreen(CUP.x, CUP.y);
  const s = toScreen(CUP.x + CUP.w, CUP.y).x - base.x; // cup width on screen
  const x = base.x;
  const y = base.y;
  const h = s * 0.8;
  const ink = 'rgba(27, 19, 12, 0.88)';
  const line = Math.max(1, s * 0.018);
  c.save();
  // shadow on the desk, cast away from the lamp (it stands to the left)
  const shade = c.createRadialGradient(x + s * 0.35, y, s * 0.1, x + s * 0.35, y, s * 1.05);
  shade.addColorStop(0, 'rgba(8, 5, 3, 0.6)'); shade.addColorStop(1, 'rgba(8, 5, 3, 0)');
  c.fillStyle = shade;
  c.beginPath(); c.ellipse(x + s * 0.35, y + s * 0.02, s * 1.05, s * 0.2, 0, 0, Math.PI * 2); c.fill();
  // saucer
  const saucer = c.createLinearGradient(x - s * 0.8, 0, x + s * 0.8, 0);
  saucer.addColorStop(0, '#d2c09c'); saucer.addColorStop(0.5, '#9c8865'); saucer.addColorStop(1, '#3b3125');
  c.fillStyle = saucer;
  c.strokeStyle = ink; c.lineWidth = line;
  c.beginPath(); c.ellipse(x, y - s * 0.02, s * 0.76, s * 0.14, 0, 0, Math.PI * 2); c.fill(); c.stroke();
  c.strokeStyle = 'rgba(27, 19, 12, 0.35)';
  c.beginPath(); c.ellipse(x, y - s * 0.035, s * 0.5, s * 0.085, 0, 0, Math.PI * 2); c.stroke();
  // handle (right, in shadow)
  c.lineWidth = s * 0.065; c.strokeStyle = '#4f4332';
  c.beginPath(); c.ellipse(x + s * 0.5, y - h * 0.54, s * 0.16, h * 0.2, 0, -Math.PI * 0.5, Math.PI * 0.5); c.stroke();
  c.lineWidth = line; c.strokeStyle = ink;
  c.beginPath(); c.ellipse(x + s * 0.5, y - h * 0.54, s * 0.2, h * 0.24, 0, -Math.PI * 0.5, Math.PI * 0.5); c.stroke();
  // body: lit from the lamp on the left
  const bodyPath = () => {
    c.beginPath();
    c.moveTo(x - s / 2, y - h);
    c.bezierCurveTo(x - s / 2, y - h * 0.3, x - s * 0.36, y - s * 0.06, x, y - s * 0.06);
    c.bezierCurveTo(x + s * 0.36, y - s * 0.06, x + s / 2, y - h * 0.3, x + s / 2, y - h);
    c.closePath();
  };
  const body = c.createLinearGradient(x - s / 2, 0, x + s / 2, 0);
  body.addColorStop(0, '#dccaa5'); body.addColorStop(0.3, '#c2ad86'); body.addColorStop(0.75, '#7a6a50'); body.addColorStop(1, '#3d3326');
  c.fillStyle = body; bodyPath(); c.fill();
  // darker towards the foot
  const foot = c.createLinearGradient(0, y - h * 0.55, 0, y);
  foot.addColorStop(0, 'rgba(40, 25, 10, 0)'); foot.addColorStop(1, 'rgba(40, 25, 10, 0.45)');
  c.fillStyle = foot; bodyPath(); c.fill();
  // ink hatching on the shadow side, as Chapter 1 draws its props
  c.save(); bodyPath(); c.clip();
  c.strokeStyle = 'rgba(27, 19, 12, 0.28)'; c.lineWidth = Math.max(0.6, s * 0.008);
  for (let i = 0; i < 11; i += 1) {
    const hx = x + s * (0.02 + i * 0.045);
    c.beginPath(); c.moveTo(hx, y - h * 1.02); c.lineTo(hx - s * 0.05, y); c.stroke();
  }
  c.restore();
  c.strokeStyle = ink; c.lineWidth = line; bodyPath(); c.stroke();
  // the lamp catches the left edge
  c.strokeStyle = 'rgba(246, 214, 150, 0.45)'; c.lineWidth = line * 1.3;
  c.beginPath(); c.moveTo(x - s * 0.47, y - h * 0.95); c.bezierCurveTo(x - s * 0.47, y - h * 0.45, x - s * 0.36, y - s * 0.16, x - s * 0.2, y - s * 0.1); c.stroke();
  // rim and coffee
  c.fillStyle = '#cdbb95';
  c.beginPath(); c.ellipse(x, y - h, s / 2, s * 0.115, 0, 0, Math.PI * 2); c.fill();
  c.strokeStyle = ink; c.lineWidth = line; c.stroke();
  c.fillStyle = cold ? '#1f120a' : '#2a1509';
  c.beginPath(); c.ellipse(x, y - h + s * 0.012, s * 0.43, s * 0.088, 0, 0, Math.PI * 2); c.fill();
  // the lamp in the coffee; duller once it is cold
  c.fillStyle = cold ? 'rgba(150, 110, 70, 0.22)' : 'rgba(214, 160, 96, 0.5)';
  c.beginPath(); c.ellipse(x - s * 0.15, y - h + s * 0.004, s * 0.1, s * 0.022, -0.1, 0, Math.PI * 2); c.fill();
  c.restore();
  if (!(steam > 0)) return;
  // steam: thin soft wisps rising off the coffee and thinning out
  c.save();
  c.lineCap = 'round';
  c.shadowColor = 'rgba(255, 244, 226, 0.5)';
  c.shadowBlur = s * 0.22;
  for (let k = 0; k < 6; k += 1) {
    const phase = (time / 4200 + k / 6) % 1;
    const rise = phase * h * 1.2;
    const sway = Math.sin(time / 1100 + k * 1.9) * s * 0.07;
    const x0 = x + (k - 2.5) * s * 0.075;
    const y0 = y - h - rise * 0.35;
    const alpha = 0.2 * steam * Math.sin(Math.PI * phase);
    c.strokeStyle = `rgba(246, 238, 224, ${alpha.toFixed(3)})`;
    c.lineWidth = s * (0.022 + 0.03 * phase);
    c.beginPath();
    c.moveTo(x0, y0);
    c.bezierCurveTo(x0 + sway, y0 - s * 0.25, x0 - sway * 1.6, y0 - s * 0.45, x0 + sway * 0.4, y0 - s * 0.62);
    c.bezierCurveTo(x0 + sway * 1.8, y0 - s * 0.8, x0 - sway, y0 - s * 0.95, x0 + sway * 0.8, y0 - s * (1.05 + phase * 0.35));
    c.stroke();
  }
  c.restore();
}

// ---------------------------------------------------------------- the screen

/**
 * Fills `panel` (the title dialog's inner panel) with the coffee screen.
 * Returns a cleanup for when the dialog closes.
 */
export function mountHotCoffee(panel, { storage = globalThis.localStorage, now = () => Date.now(), raf = globalThis.requestAnimationFrame?.bind(globalThis), caf = globalThis.cancelAnimationFrame?.bind(globalThis) } = {}) {
  const doc = panel.ownerDocument;
  panel.replaceChildren();
  panel.classList.add('nf-coffee');
  const el = (tag, className, text) => {
    const node = doc.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  };
  const canvas = el('canvas', 'nf-coffee__picture');
  canvas.setAttribute('role', 'img');
  const head = el('header', 'nf-coffee__head');
  head.append(el('p', 'nf-coffee__title', COFFEE_TEXT.title), el('p', 'nf-coffee__detail', COFFEE_TEXT.installed));
  const card = el('section', 'nf-coffee__card');
  const kicker = el('p', 'nf-coffee__kicker', COFFEE_TEXT.brewing);
  const line = el('p', 'nf-coffee__line');
  line.setAttribute('aria-live', 'polite');
  const bar = el('div', 'nf-coffee__bar');
  const fill = el('div', 'nf-coffee__fill');
  bar.append(fill);
  const percent = el('p', 'nf-coffee__percent', '0%');
  card.append(kicker, line, bar, percent);
  const caption = el('section', 'nf-coffee__caption');
  const leave = el('p', 'nf-coffee__leave', COFFEE_TEXT.leave);
  panel.append(canvas, head, card, caption, leave);

  const image = new Image();
  image.decoding = 'async';
  image.src = assetUrl(DESK);
  const reduce = reducedMotionActive();
  let state = coffeeState(storage, now());
  const abandoned = state.phase === 'new' && state.abandoned;
  let brewStart = 0;
  let mode = state.phase; // 'new' (brewing) | 'hot' | 'cold'
  let shownLine = '';
  let revealedAt = 0;
  let frame = 0;
  let steam = mode === 'hot' ? 1 : 0;
  let coldSeenAt = 0;

  const showCaption = (lines) => {
    caption.replaceChildren(...lines.map(([cls, text]) => el('p', cls, text)));
    caption.classList.add('is-shown');
  };
  const toCold = () => {
    mode = 'cold';
    panel.dataset.coffee = 'cold';
    canvas.setAttribute('aria-label', COFFEE_TEXT.coldPicture);
    head.lastChild.textContent = COFFEE_TEXT.coldDetail;
    showCaption([['nf-coffee__ready', COFFEE_TEXT.cold], ['nf-coffee__rating', COFFEE_TEXT.thanks]]);
  };
  const toHot = (fresh) => {
    mode = 'hot';
    panel.dataset.coffee = 'hot';
    canvas.setAttribute('aria-label', COFFEE_TEXT.picture);
    card.classList.add('is-done');
    if (fresh) {
      revealedAt = now();
      showCaption([['nf-coffee__ready', COFFEE_TEXT.ready], ['nf-coffee__rating', COFFEE_TEXT.rating]]);
    }
  };

  if (mode === 'new') {
    panel.dataset.coffee = 'brewing';
    canvas.setAttribute('aria-label', COFFEE_TEXT.picture);
    brewStart = now();
    write(storage, { startedAt: brewStart });
  } else if (mode === 'hot') toHot(false);
  else { card.classList.add('is-done'); toCold(); }

  const draw = (t) => {
    const ratio = Math.min(2, globalThis.devicePixelRatio || 1);
    const w = Math.round(canvas.clientWidth * ratio);
    const h = Math.round(canvas.clientHeight * ratio);
    if (!w || !h) return;
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    const c = canvas.getContext('2d');
    if (!c) return;
    // cover the screen with the crop, keeping its proportions
    const k = Math.max(w / CROP.w, h / CROP.h);
    const ox = (w - CROP.w * k) / 2;
    const oy = (h - CROP.h * k) / 2;
    const toScreen = (px, py) => ({ x: ox + (px - CROP.x) * k, y: oy + (py - CROP.y) * k });
    c.fillStyle = '#0a0908';
    c.fillRect(0, 0, w, h);
    if (image.complete && image.naturalWidth) {
      c.save();
      c.filter = mode === 'new' ? 'blur(6px) brightness(0.45)' : 'brightness(0.92)';
      c.drawImage(image, CROP.x, CROP.y, CROP.w, CROP.h, ox, oy, CROP.w * k, CROP.h * k);
      c.restore();
    }
    if (mode !== 'new') paintCup(c, toScreen, { steam: reduce ? Math.min(steam, 0.6) : steam, cold: mode === 'cold', time: reduce ? 1200 : t });
    // a vignette, as the chapters frame their scenes
    const v = c.createRadialGradient(w / 2, h * 0.55, h * 0.25, w / 2, h * 0.55, Math.max(w, h) * 0.75);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.7)');
    c.fillStyle = v;
    c.fillRect(0, 0, w, h);
  };

  const tick = (t) => {
    frame = 0;
    if (!panel.isConnected) return;
    const at = now();
    if (mode === 'new') {
      const ms = at - brewStart;
      const next = brewLine(ms, { abandoned });
      if (next !== shownLine) { shownLine = next; line.textContent = next; }
      const p = brewPercent(ms);
      fill.style.width = `${p}%`;
      percent.textContent = `${p}%`;
      if (ms >= BREW_MS + STALL_MS) {
        write(storage, { brewedAt: at });
        state = coffeeState(storage, at);
        fill.style.width = '100%';
        percent.textContent = '100%';
        toHot(true);
      }
    } else if (mode === 'hot') {
      state = coffeeState(storage, at);
      // the steam thins over the five minutes, then dies away over 4 s
      if (state.phase === 'cold') {
        if (!coldSeenAt) coldSeenAt = at;
        steam = Math.max(0, 0.25 * (1 - (at - coldSeenAt) / 4000));
      } else steam = Math.min(1, 0.25 + (state.coolsIn / COOL_MS) * 0.75);
      if (state.phase === 'cold' && steam <= 0) toCold();
      if (revealedAt && at - revealedAt > 9000 && mode === 'hot') { caption.classList.remove('is-shown'); revealedAt = 0; }
    }
    draw(t);
    // cold is a still picture: no frames needed
    if (mode !== 'cold' || steam > 0) frame = raf?.(tick) ?? 0;
  };
  image.addEventListener('load', () => { if (!frame) draw(0); });
  frame = raf?.(tick) ?? 0;
  const onResize = () => draw(globalThis.performance?.now?.() ?? 0);
  globalThis.addEventListener?.('resize', onResize);

  return () => {
    if (frame) caf?.(frame);
    frame = 0;
    globalThis.removeEventListener?.('resize', onResize);
    panel.classList.remove('nf-coffee');
    delete panel.dataset.coffee;
    // left while it brewed: the water is thrown out (the next visit starts again)
    if (mode === 'new') write(storage, { startedAt: brewStart });
  };
}
