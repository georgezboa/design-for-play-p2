// Leaving a chapter for the title: an immediate fade to black with
// "RETURNING TO THE TERMINAL…", then the page's render loops and sound are
// stopped, and only then does the browser navigate.
//
// Why the fade matters on the heavy 3D pages (car03-3d, museum-3d): there is
// no JavaScript disposal on the way out. The seconds between the click and
// the title are Chrome tearing the page's WebGL context down, which first
// waits for the GPU to finish every command the page has already queued
// (LocalDOMWindow::FrameDestroyed -> CommandBufferHelper::Finish in a trace;
// ~5-8 s on software GL). Nothing on the page may add to that queue once the
// player has confirmed, and the player sees the answer at once.

import { returnToTitle, titleNavigationTarget } from './saveSystem.js';
import { nativeRequestAnimationFrame } from './framePacing.js';

export const TITLE_RETURN_MESSAGE = 'RETURNING TO THE TERMINAL…';
const CURTAIN_CLASS = 'nf-title-return';
// Keep in step with the nf-title-return animation in uiKit.css.
const FADE_MS = 160;

// Every AudioContext that has made a sound, and every media element that has
// played, on this page: many chapters own their own (sfx, voices, music).
const audioContexts = new Set();
const mediaElements = new Set();

export function installAudioRegistry(win = globalThis.window) {
  if (!win || win.__nightfallAudioRegistry) return;
  win.__nightfallAudioRegistry = true;
  // An embedded page (the Museum's Labyrinth) leaving for the title silences
  // its host page through the host's own registry.
  win.__nightfallSilence = () => silence(win);
  const node = win.AudioNode?.prototype;
  if (node?.connect) {
    const connect = node.connect;
    node.connect = function connectTracked(...args) {
      if (this.context) audioContexts.add(this.context);
      return connect.apply(this, args);
    };
  }
  const media = win.HTMLMediaElement?.prototype;
  if (media?.play) {
    const play = media.play;
    media.play = function playTracked(...args) {
      mediaElements.add(this);
      return play.apply(this, args);
    };
  }
}

function silence(win) {
  const doc = win.document;
  [...mediaElements, ...(doc?.querySelectorAll?.('audio, video') ?? [])].forEach((element) => {
    try { element.muted = true; element.pause(); } catch { /* detached */ }
  });
  audioContexts.forEach((context) => { try { context.suspend?.(); } catch { /* closed */ } });
  try { win.game?.sound?.pauseAll?.(); } catch { /* not a Phaser page */ }
}

// Every chapter draws from requestAnimationFrame (three.js setAnimationLoop,
// Phaser's loop, the hand-written loops). The frame pacer (framePacing.js)
// runs no callback once the page is leaving, so no new frame is queued for
// the GPU; without it, requestAnimationFrame becomes a no-op.
function haltFrames(win) {
  win.NIGHTFALL_LEAVING = true;
  if (!win.__nightfallFramePacing) win.requestAnimationFrame = () => 0;
}

function showCurtain(doc) {
  let curtain = doc.querySelector(`.${CURTAIN_CLASS}`);
  if (curtain) return curtain;
  curtain = doc.createElement('div');
  curtain.className = CURTAIN_CLASS;
  curtain.setAttribute('role', 'status');
  curtain.setAttribute('aria-live', 'assertive');
  // Inline fallbacks: the curtain must cover the page even before (or
  // without) uiKit.css.
  curtain.style.cssText = 'position:fixed;inset:0;z-index:2147483000;background:#050403;';
  curtain.innerHTML = `<p class="${CURTAIN_CLASS}__text">${TITLE_RETURN_MESSAGE}</p><span class="${CURTAIN_CLASS}__rule" aria-hidden="true"></span>`;
  (doc.body ?? doc.documentElement).append(curtain);
  return curtain;
}

let leaving = false;

export function leaveForTitle({ win = globalThis.window, navigate = () => returnToTitle(), delayMs = 2500 } = {}) {
  if (leaving) return false;
  leaving = true;
  const target = titleNavigationTarget(win);
  const windows = [...new Set([win, target])];
  const curtains = [];
  windows.forEach((w) => { try { curtains.push(showCurtain(w.document)); } catch { /* cross-origin */ } });
  windows.forEach((w) => {
    try {
      haltFrames(w);
      if (w === win) silence(w);
      else (w.__nightfallSilence ?? (() => silence(w)))();
    } catch { /* cross-origin */ }
  });
  // Navigate once the curtain has been presented (the second native frame
  // after it was added): tearing the page down blocks its rendering, so a
  // curtain still waiting for the GPU would never be seen. The timer is the
  // ceiling in case frames stop coming at all.
  let gone = false;
  const go = () => { if (gone) return; gone = true; navigate(); };
  const presented = () => nativeRequestAnimationFrame(() => nativeRequestAnimationFrame(go, win), win);
  // The fade is short (uiKit.css .nf-title-return); leave once it is black.
  const fade = curtains[curtains.length - 1];
  let faded = false;
  const afterFade = () => { if (faded) return; faded = true; presented(); };
  fade?.addEventListener('animationend', afterFade, { once: true });
  win.setTimeout(afterFade, FADE_MS + 40);
  win.setTimeout(go, delayMs);
  return true;
}

export function resetTitleReturnForTests() {
  leaving = false;
  audioContexts.clear();
  mediaElements.clear();
}
