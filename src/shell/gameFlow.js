import './gameFlow.css';
import { getChapterPreloadState, preloadChapter } from './chapterPreloader.js';
import { preloadProgress } from './preloadQueue.js';
import { SKIP_HOLD_MS, createHoldGesture, isSkipKey } from './holdToSkip.js';
import { DEFAULT_SETTINGS, volumeForChannel } from './saveSystem.js';
import { orderCinematicSources } from './cinematicSources.js';

export { CINEMATIC_TYPES, cinematicSources, orderCinematicSources } from './cinematicSources.js';

export const CINEMATICS = Object.freeze({
  opening: '/cinematics/start.mp4',
  chapter1To2: '/cinematics/1-2.mp4',
  chapter2To3: '/cinematics/2-3.mp4',
  chapter3To4: '/cinematics/3-4.mp4',
  chapter4To5: '/cinematics/4-5.mp4',
  ending: '/cinematics/end.mp4',
});

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

  const root = document.createElement('section');
  root.className = 'nf-cinematic';
  root.dataset.cinematic = id;
  root.setAttribute('aria-label', label);
  root.innerHTML = `
    <div class="nf-cinematic-loading" role="status">LOADING FILM</div>
    <div class="nf-cinematic-progress" aria-hidden="true"><span></span></div>
    <div class="nf-cinematic-skip" aria-hidden="true">
      <svg viewBox="0 0 36 36"><circle class="nf-skip-track" cx="18" cy="18" r="15"/><circle class="nf-skip-fill" cx="18" cy="18" r="15" pathLength="100"/></svg>
      <span>HOLD TO SKIP</span>
    </div>
  `;
  const video = sharedCinematicVideo(label);
  video.pause();
  video.currentTime = 0;
  const sources = orderCinematicSources(src, (type) => video.canPlayType?.(type) ?? '');
  let sourceIndex = 0;
  video.src = sources[sourceIndex];
  root.dataset.source = sources[sourceIndex];
  video.dataset.nightfallAudioChannel = 'music';
  video.volume = volumeForChannel(globalThis.NIGHTFALL_SETTINGS ?? DEFAULT_SETTINGS, 'music');
  root.prepend(video);
  document.body.append(root);
  let preloadPromise = null;
  let preloadSettled = false;
  const beginPreload = () => {
    if (!preloadPromise && preloadChapterId) {
      preloadPromise = preloadChapter(preloadChapterId);
      preloadPromise.then(() => { preloadSettled = true; });
    }
    return preloadPromise;
  };

  // ---------- hold to skip ----------
  // Any input reveals a small prompt; holding Space / Enter / Escape or a
  // mouse button for about a second skips the film. Skipping runs the same
  // completion path as the film ending, so preload hard-gates still apply.
  const skipPrompt = root.querySelector('.nf-cinematic-skip');
  const hold = createHoldGesture();
  let holdFrame = 0;
  let promptTimer = 0;
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
  const onKeyDown = (event) => {
    if (settled) return;
    showPrompt();
    if (!isSkipKey(event)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (!event.repeat) pressSkip(`key:${event.code || event.key}`);
  };
  const onKeyUp = (event) => {
    if (!isSkipKey(event)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    releaseSkip(`key:${event.code || event.key}`);
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
    const status = root.querySelector('.nf-cinematic-loading');
    const percent = Math.round(preloadProgress(state) * 100);
    if (status) status.textContent = `PREPARING EVERY OBJECT · PLEASE WAIT · ${percent}%`;
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
    video.pause();
    root.querySelector('.nf-cinematic-resume')?.remove();
    beginPreload();
    // A hard-gated route that is still loading keeps the overlay black and
    // shows live progress instead of fading back to the previous scene.
    const holdForPreload = waitForPreload && Boolean(preloadPromise) && !preloadSettled;
    // The ending credits replace this overlay in the same document. Keeping
    // the overlay black until that screen mounts prevents the finished boss
    // frame from flashing through between the film and the credits.
    if (preserveBlackout || holdForPreload) {
      root.classList.add('is-blackout');
      video.style.opacity = '0';
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
      video.removeEventListener('error', onVideoError);
      video.removeAttribute('src');
      video.load();
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
  video.addEventListener('playing', beginPreload, { once: true });
  video.addEventListener('canplay', () => root.classList.add('is-ready'), { once: true });
  video.addEventListener('ended', finish, { once: true });
  const onVideoError = () => {
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
  };
  video.addEventListener('error', onVideoError);
  video.play().catch(() => {
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

  activePlayback = { id, root, video, promise, finish, skip, beginPreload, requirePreloadReady: waitForPreload };
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
