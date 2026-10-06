import './gameFlow.css';
import { getChapterPreloadState, preloadChapter } from './chapterPreloader.js';
import { preloadProgress } from './preloadQueue.js';
import { SKIP_HOLD_MS, createHoldGesture, isSkipKey } from './holdToSkip.js';
import { DEFAULT_SETTINGS, volumeForChannel } from './saveSystem.js';
import { orderCinematicSources } from './cinematicSources.js';
import { loadCutscene, registeredCutscene } from './cutscene/registry.js';

export { CINEMATIC_TYPES, cinematicSources, orderCinematicSources } from './cinematicSources.js';
export { CUTSCENE_IDS, registeredCutscene, resolveCutsceneId } from './cutscene/registry.js';

// The eight transitions. Each id / film path resolves to an in-engine
// cutscene (src/shell/cutscene, docs/CUTSCENES_SPEC.md) once that cutscene
// is authored; until then the film at this path plays, as before.
export const CINEMATICS = Object.freeze({
  opening: '/cinematics/start.mp4',
  chapter1To2: '/cinematics/1-2.mp4',
  chapter2To3: '/cinematics/2-3.mp4',
  chapter3To4: '/cinematics/3-4.mp4',
  chapter4To5: '/cinematics/4-5.mp4',
  ending: '/cinematics/end.mp4',
});

/** The line under the held last frame while the next chapter finishes loading. */
export const ARRIVING_LINE = 'THE NIGHT SERVICE IS ARRIVING';
/** A tap of Escape shorter than this opens the pause menu; holding it skips. */
export const ESCAPE_TAP_MS = 280;
const PAUSE_MENU_ID = 'nightfall-pause-menu';

let activePlayback = null;
let cinematicVideo = null;

function sharedCinematicVideo(label) {
  if (!cinematicVideo) {
    cinematicVideo = document.createElement('video');
    cinematicVideo.playsInline = true;
    cinematicVideo.preload = 'auto';
  }
  cinematicVideo.setAttribute('aria-label', label);
  return cinematicVideo;
}

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
  // complete; otherwise the player trades the film's final frame for a second
  // loading screen. `requirePreloadReady` remains for explicit non-chapter
  // callers, but every chapter preload is now a hard completion gate.
  const waitForPreload = Boolean(preloadChapterId) || requirePreloadReady;
  // An authored cutscene replaces the film; an id without one keeps its film.
  const cutsceneName = registeredCutscene(id, src);
  let mode = cutsceneName ? 'cutscene' : 'video';

  const root = document.createElement('section');
  root.className = 'nf-cinematic';
  root.dataset.cinematic = id;
  if (cutsceneName) root.dataset.cutscene = cutsceneName;
  root.setAttribute('aria-label', label);
  root.innerHTML = `
    <div class="nf-cinematic-loading" role="status">${mode === 'video' ? 'LOADING FILM' : ''}</div>
    <div class="nf-cinematic-progress" aria-hidden="true"><span></span></div>
    <div class="nf-cinematic-skip" aria-hidden="true">
      <svg viewBox="0 0 36 36"><circle class="nf-skip-track" cx="18" cy="18" r="15"/><circle class="nf-skip-fill" cx="18" cy="18" r="15" pathLength="100"/></svg>
      <span>HOLD TO SKIP</span>
    </div>
  `;
  document.body.append(root);
  let video = null;
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
  // mouse button for about a second skips the film. Skipping runs the same
  // completion path as the film ending, so preload hard-gates still apply.
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
  // Returns true once the hold has completed (and the film was skipped).
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
  // keys never leak into the scene underneath the film.
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
    if (mode === 'cutscene') {
      // the cutscene's last frame stays up, with one small line under it
      const line = root.querySelector('.nf-cinematic-arriving');
      if (line) line.textContent = `${ARRIVING_LINE} · ${percent}%`;
    } else {
      const status = root.querySelector('.nf-cinematic-loading');
      if (status) status.textContent = `PREPARING EVERY OBJECT · PLEASE WAIT · ${percent}%`;
    }
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
    video?.pause();
    // a skipped cutscene jumps to its last frame (and lets its sound go)
    cutscene?.skip();
    root.querySelector('.nf-cinematic-resume')?.remove();
    beginPreload();
    // A hard-gated route that is still loading keeps the overlay black and
    // shows live progress instead of fading back to the previous scene.
    const holdForPreload = waitForPreload && Boolean(preloadPromise) && !preloadSettled;
    // The ending credits replace this overlay in the same document. Keeping
    // the overlay black until that screen mounts prevents the finished boss
    // frame from flashing through between the film and the credits.
    if (preserveBlackout) {
      root.classList.add('is-blackout');
      if (video) video.style.opacity = '0';
    } else if (holdForPreload) {
      if (mode === 'cutscene') {
        // hold the cutscene's last frame rather than going to black
        cutscene?.hold(true);
      } else {
        root.classList.add('is-blackout');
        if (video) video.style.opacity = '0';
      }
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
      root.remove();
      if (video) {
        video.removeEventListener('error', onVideoError);
        video.removeAttribute('src');
        video.load();
      }
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

  // ---------- the film (until this transition's cutscene is authored) ----------
  let sources = [];
  let sourceIndex = 0;
  function onVideoError() {
    if (settled) return;
    // The other encoding of the same film, before giving up on it.
    if (sourceIndex + 1 < sources.length) {
      sourceIndex += 1;
      video.src = sources[sourceIndex];
      root.dataset.source = sources[sourceIndex];
      video.load();
      video.play().catch(() => {});
      return;
    }
    video.removeEventListener('error', onVideoError);
    root.querySelector('.nf-cinematic-loading').textContent = 'FILM UNAVAILABLE · CONTINUING';
    window.setTimeout(finish, 900);
  }
  const startVideo = () => {
    mode = 'video';
    root.classList.remove('is-cutscene');
    video = sharedCinematicVideo(label);
    video.pause();
    video.currentTime = 0;
    video.style.opacity = '';
    sources = orderCinematicSources(src, (type) => video.canPlayType?.(type) ?? '');
    sourceIndex = 0;
    video.src = sources[sourceIndex];
    root.dataset.source = sources[sourceIndex];
    video.dataset.nightfallAudioChannel = 'music';
    video.volume = volumeForChannel(globalThis.NIGHTFALL_SETTINGS ?? DEFAULT_SETTINGS, 'music');
    root.prepend(video);
    if (activePlayback) activePlayback.video = video;
    video.addEventListener('playing', beginPreload, { once: true });
    video.addEventListener('canplay', () => root.classList.add('is-ready'), { once: true });
    video.addEventListener('ended', finish, { once: true });
    video.addEventListener('error', onVideoError);
    video.play().catch(() => {
      if (settled) return;
      root.classList.add('needs-gesture');
      const resume = document.createElement('button');
      resume.type = 'button';
      resume.className = 'nf-cinematic-resume';
      resume.textContent = 'PLAY FILM';
      resume.addEventListener('click', () => {
        video.play().then(() => {
          resume.remove();
          root.classList.remove('needs-gesture');
        }).catch(() => {
          resume.textContent = 'CLICK TO PLAY FILM';
        });
      });
      root.append(resume);
      resume.focus();
    });
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

  activePlayback = { id, root, video: null, cutscene: null, mode, promise, finish, skip, beginPreload, requirePreloadReady: waitForPreload };
  Object.defineProperty(activePlayback, 'mode', { get: () => mode, enumerable: true });
  if (cutsceneName) {
    root.classList.add('is-cutscene');
    activePlayback.video = pauseShim;
    startCutscene().catch((error) => {
      console.warn('[cinematic] cutscene unavailable, playing the film', cutsceneName, error);
      cutscene?.destroy();
      cutscene = null;
      root.querySelectorAll('.nf-cinematic-canvas, .nf-cinematic-caption, .nf-cinematic-arriving').forEach((node) => node.remove());
      const status = root.querySelector('.nf-cinematic-loading');
      if (status) status.textContent = 'LOADING FILM';
      if (settled) return;
      if (typeof src === 'string' && src) startVideo();
      else finish();
    });
  } else {
    startVideo();
  }
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
