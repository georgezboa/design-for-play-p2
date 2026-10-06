import './gameFlow.css';
import { getChapterPreloadState, preloadChapter } from './chapterPreloader.js';
import { preloadProgress } from './preloadQueue.js';
import { SKIP_HOLD_MS, createHoldGesture, isSkipKey } from './holdToSkip.js';
import { loadCutscene, registeredCutscene } from './cutscene/registry.js';

export { CUTSCENE_IDS, registeredCutscene, resolveCutsceneId } from './cutscene/registry.js';

// The transitions the chapters start by name (call sites pass these as
// `src`). Every one is an in-engine cutscene (src/shell/cutscene,
// docs/CUTSCENES_SPEC.md); the films they replaced are gone, and their old
// paths still resolve to the same cutscenes (cutscene/registry.js).
export const CINEMATICS = Object.freeze({
  opening: 'opening',
  chapter1To2: 'chapter1To2',
  chapter2To3: 'chapter2To3',
  chapter3To4: 'chapter3To4',
  chapter4To5: 'chapter4To5',
  ending: 'ending',
});

/** The line under the held last frame while the next chapter finishes loading. */
export const ARRIVING_LINE = 'THE NIGHT SERVICE IS ARRIVING';
/** A tap of Escape shorter than this opens the pause menu; holding it skips. */
export const ESCAPE_TAP_MS = 280;
const PAUSE_MENU_ID = 'nightfall-pause-menu';

let activePlayback = null;

export function playCinematic({
  id,
  src,
  onComplete,
  preloadChapterId = null,
  requirePreloadReady = false,
  preserveBlackout = false,
  label = 'NIGHTFALL CINEMATIC',
}) {
  if (activePlayback) return activePlayback.promise;
  // A chapter transition owns its next chapter's readiness. Once a route has
  // declared a preload profile, never reveal the destination until that job is
  // complete; otherwise the player trades the cutscene's final frame for a second
  // loading screen. `requirePreloadReady` remains for explicit non-chapter
  // callers, but every chapter preload is now a hard completion gate.
  const waitForPreload = Boolean(preloadChapterId) || requirePreloadReady;
  // Every transition is a cutscene; an id that names none is skipped.
  const cutsceneName = registeredCutscene(id, src);
  const mode = 'cutscene';

  const root = document.createElement('section');
  root.className = 'nf-cinematic';
  root.dataset.cinematic = id;
  if (cutsceneName) root.dataset.cutscene = cutsceneName;
  root.setAttribute('aria-label', label);
  root.innerHTML = `
    <div class="nf-cinematic-loading" role="status"></div>
    <div class="nf-cinematic-progress" aria-hidden="true"><span></span></div>
    <div class="nf-cinematic-skip" aria-hidden="true">
      <svg viewBox="0 0 36 36"><circle class="nf-skip-track" cx="18" cy="18" r="15"/><circle class="nf-skip-fill" cx="18" cy="18" r="15" pathLength="100"/></svg>
      <span>HOLD TO SKIP</span>
    </div>
  `;
  document.body.append(root);
  let cutscene = null;
  let preloadPromise = null;
  let preloadSettled = false;
  const beginPreload = () => {
    if (!preloadPromise && preloadChapterId) {
      preloadPromise = preloadChapter(preloadChapterId);
      preloadPromise.then(() => {
        preloadSettled = true;
        cutscene?.markReady();
      });
    }
    return preloadPromise;
  };

  // ---------- hold to skip ----------
  // Any input reveals a small prompt; holding Space / Enter / Escape or a
  // mouse button for about a second skips the cutscene. Skipping runs the same
  // completion path as the cutscene ending, so preload hard-gates still apply.
  // A short tap of Escape opens the pause menu where the page has one.
  const skipPrompt = root.querySelector('.nf-cinematic-skip');
  const hold = createHoldGesture();
  let holdFrame = 0;
  let promptTimer = 0;
  let escapeDownAt = null;
  const showPrompt = () => {
    skipPrompt.classList.add('is-visible');
    window.clearTimeout(promptTimer);
    promptTimer = window.setTimeout(() => {
      if (!hold.holding) skipPrompt.classList.remove('is-visible');
    }, 2600);
  };
  let holdTimer = 0;
  // Returns true once the hold has completed (and the cutscene was skipped).
  const updateHold = () => {
    const progress = hold.progress(performance.now());
    skipPrompt.style.setProperty('--nf-skip-progress', String(progress));
    skipPrompt.classList.toggle('is-holding', hold.holding);
    if (!hold.completed) return false;
    skip();
    return true;
  };
  // Frames only animate the ring; a timer guarantees completion even when a
  // heavy scene underneath starves requestAnimationFrame.
  const holdFrameStep = () => {
    holdFrame = 0;
    if (updateHold() || settled || !hold.holding) return;
    holdFrame = requestAnimationFrame(holdFrameStep);
  };
  const holdTimerStep = () => {
    holdTimer = 0;
    if (updateHold() || settled || !hold.holding) return;
    holdTimer = window.setTimeout(holdTimerStep, 50);
  };
  const pressSkip = (source) => {
    if (settled) return;
    showPrompt();
    hold.press(source, performance.now());
    if (!holdFrame) holdFrame = requestAnimationFrame(holdFrameStep);
    if (!holdTimer) holdTimer = window.setTimeout(holdTimerStep, SKIP_HOLD_MS);
  };
  const releaseSkip = (source) => {
    hold.release(source);
    if (!hold.holding) {
      window.clearTimeout(holdTimer);
      holdTimer = 0;
      skipPrompt.style.setProperty('--nf-skip-progress', '0');
      skipPrompt.classList.remove('is-holding');
      showPrompt();
    }
  };
  const openPauseMenu = () => {
    const menu = document.getElementById(PAUSE_MENU_ID);
    if (typeof menu?.open !== 'function') return false;
    menu.open();
    return true;
  };
  const onKeyDown = (event) => {
    if (settled || globalThis.NIGHTFALL_PAUSED) return;
    showPrompt();
    if (!isSkipKey(event)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (event.repeat) return;
    if (event.key === 'Escape' || event.code === 'Escape') escapeDownAt = performance.now();
    pressSkip(`key:${event.code || event.key}`);
  };
  const onKeyUp = (event) => {
    if (!isSkipKey(event)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    releaseSkip(`key:${event.code || event.key}`);
    const escape = event.key === 'Escape' || event.code === 'Escape';
    if (escape && escapeDownAt !== null) {
      const tap = performance.now() - escapeDownAt < ESCAPE_TAP_MS;
      escapeDownAt = null;
      if (tap && !settled && !hold.completed && !globalThis.NIGHTFALL_PAUSED) openPauseMenu();
    }
  };
  const onPointerDown = (event) => {
    if (settled || event.target.closest?.('.nf-cinematic-resume')) return;
    event.preventDefault();
    pressSkip(`pointer:${event.pointerId}`);
  };
  const onPointerUp = (event) => releaseSkip(`pointer:${event.pointerId}`);
  const onBlur = () => {
    hold.releaseAll();
    releaseSkip('blur');
    escapeDownAt = null;
  };
  const detachSkip = () => {
    window.removeEventListener('keydown', onKeyDown, true);
    window.removeEventListener('keyup', onKeyUp, true);
    window.removeEventListener('pointerup', onPointerUp, true);
    window.removeEventListener('pointercancel', onPointerUp, true);
    window.removeEventListener('blur', onBlur);
    root.removeEventListener('pointerdown', onPointerDown);
    if (holdFrame) cancelAnimationFrame(holdFrame);
    holdFrame = 0;
    window.clearTimeout(holdTimer);
    holdTimer = 0;
    window.clearTimeout(promptTimer);
    skipPrompt.classList.remove('is-visible', 'is-holding');
  };
  // Capture phase on window runs ahead of gameplay listeners, so the skip
  // keys never leak into the scene underneath the cutscene.
  window.addEventListener('keydown', onKeyDown, true);
  window.addEventListener('keyup', onKeyUp, true);
  window.addEventListener('pointerup', onPointerUp, true);
  window.addEventListener('pointercancel', onPointerUp, true);
  window.addEventListener('blur', onBlur);
  root.addEventListener('pointerdown', onPointerDown);

  // ---------- preparing the next chapter ----------
  const progressBar = root.querySelector('.nf-cinematic-progress span');
  const renderPreparing = (state = getChapterPreloadState(preloadChapterId)) => {
    const percent = Math.round(preloadProgress(state) * 100);
    // the cutscene's last frame stays up, with one small line under it; if
    // the cutscene never came up, the line goes under the black overlay
    const line = root.querySelector('.nf-cinematic-arriving') ?? root.querySelector('.nf-cinematic-loading');
    if (line) line.textContent = `${ARRIVING_LINE} · ${percent}%`;
    if (progressBar) progressBar.style.width = `${percent}%`;
  };
  const onPreloadProgress = (event) => {
    if (event.detail?.chapterId === preloadChapterId) renderPreparing(event.detail);
  };

  let settled = false;
  let resolvePlayback;
  const promise = new Promise((resolve) => { resolvePlayback = resolve; });
  const finish = () => {
    if (settled) return;
    settled = true;
    detachSkip();
    // a skipped cutscene jumps to its last frame (and lets its sound go)
    cutscene?.skip();
    root.querySelector('.nf-cinematic-resume')?.remove();
    beginPreload();
    // A hard-gated route that is still loading keeps the overlay black and
    // shows live progress instead of fading back to the previous scene.
    const holdForPreload = waitForPreload && Boolean(preloadPromise) && !preloadSettled;
    // The ending credits replace this overlay in the same document. Keeping
    // the overlay black until that screen mounts prevents the finished boss
    // frame from flashing through between the cutscene and the credits.
    if (preserveBlackout) {
      root.classList.add('is-blackout');
    } else if (holdForPreload) {
      // hold the cutscene's last frame rather than going to black
      if (cutscene) cutscene.hold(true);
      else root.classList.add('is-blackout');
    } else {
      root.classList.add('is-finished');
    }
    window.setTimeout(async () => {
      if (beginPreload()) {
        if (waitForPreload) {
          if (holdForPreload && !preloadSettled) {
            root.classList.add('is-preparing');
            renderPreparing();
            window.addEventListener('nightfall:preload', onPreloadProgress);
          }
          // The preload job settles on its own: every request has a stall
          // timeout and the job a hard ceiling (see preloadQueue.js).
          await preloadPromise;
          window.removeEventListener('nightfall:preload', onPreloadProgress);
        } else {
          await Promise.race([
            preloadPromise,
            new Promise((resolve) => window.setTimeout(resolve, 2200)),
          ]);
        }
      }
      // After the ending the page stays black behind whatever comes next
      // (the STATUS: OPEN card, then the credits page): the finished fight
      // must not show through under the card.
      if (preserveBlackout) {
        const black = document.createElement('div');
        black.className = 'nf-cinematic-afterblack';
        black.setAttribute('aria-hidden', 'true');
        document.body.append(black);
      }
      root.remove();
      cutscene?.destroy();
      activePlayback = null;
      await onComplete?.();
      resolvePlayback();
    }, 260);
  };
  const skip = () => {
    if (settled) return;
    root.dataset.skipped = 'true';
    finish();
  };

  // ---------- the in-engine cutscene ----------
  const startCutscene = async () => {
    const def = await loadCutscene(cutsceneName);
    if (!def) throw new Error(`cutscene ${cutsceneName} has no definition`);
    if (settled) return;
    const { mountCutscene } = await import('./cutscene/player.js');
    if (settled) return;
    cutscene = mountCutscene(def, { root, ready: !waitForPreload, onEnd: () => finish() });
    if (activePlayback) {
      activePlayback.cutscene = cutscene;
      activePlayback.video = pauseShim;
    }
    await cutscene.start();
    // the next chapter loads while the cutscene plays
    beginPreload();
  };
  // pauseMenu.js pauses whatever getActiveCinematic().video is
  const pauseShim = {
    pause: () => cutscene?.pause('menu'),
    play: () => { cutscene?.resume('menu'); return Promise.resolve(); },
  };

  // `video` is what pauseMenu.js pauses and resumes (the films' old slot).
  activePlayback = { id, root, video: pauseShim, cutscene: null, mode, promise, finish, skip, beginPreload, requirePreloadReady: waitForPreload };
  root.classList.add('is-cutscene');
  // The films were retired (docs/CUTSCENES_SPEC.md): a transition with no
  // cutscene, or one that cannot load, is skipped rather than replaced by a
  // video, and the journey goes on (through the preload gate as usual).
  const skipUnavailable = (error) => {
    console.warn('[cinematic] cutscene unavailable, continuing', cutsceneName ?? id, error);
    cutscene?.destroy();
    cutscene = null;
    root.querySelectorAll('.nf-cinematic-canvas, .nf-cinematic-caption, .nf-cinematic-arriving').forEach((node) => node.remove());
    // a plain black overlay; its status line carries the preparing progress
    root.classList.remove('is-cutscene');
    if (!settled) finish();
  };
  if (cutsceneName) startCutscene().catch(skipUnavailable);
  else skipUnavailable(new Error(`no cutscene for ${id ?? src}`));
  return promise;
}

export function getActiveCinematic() {
  return activePlayback;
}

export function navigateAfterCinematic(id, src, route, options = {}) {
  return playCinematic({
    id,
    src,
    label: options.label,
    preloadChapterId: options.preloadChapterId,
    requirePreloadReady: options.requirePreloadReady,
    onComplete: () => window.location.assign(route),
  });
}
