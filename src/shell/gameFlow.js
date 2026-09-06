import './gameFlow.css';
import { preloadChapter } from './chapterPreloader.js';
import { DEFAULT_SETTINGS, volumeForChannel } from './saveSystem.js';

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
  `;
  const video = sharedCinematicVideo(label);
  video.pause();
  video.currentTime = 0;
  video.src = src;
  video.dataset.nightfallAudioChannel = 'music';
  video.volume = volumeForChannel(globalThis.NIGHTFALL_SETTINGS ?? DEFAULT_SETTINGS, 'music');
  root.prepend(video);
  document.body.append(root);
  let preloadPromise = null;
  const beginPreload = () => {
    if (!preloadPromise && preloadChapterId) preloadPromise = preloadChapter(preloadChapterId);
    return preloadPromise;
  };

  let settled = false;
  let resolvePlayback;
  const promise = new Promise((resolve) => { resolvePlayback = resolve; });
  const finish = () => {
    if (settled) return;
    settled = true;
    // The ending credits replace this overlay in the same document. Keeping
    // the overlay black until that screen mounts prevents the finished boss
    // frame from flashing through between the film and the credits.
    if (preserveBlackout) {
      root.classList.add('is-blackout');
      video.style.opacity = '0';
    } else {
      root.classList.add('is-finished');
    }
    window.setTimeout(async () => {
      if (beginPreload()) {
        if (waitForPreload) {
          const status = root.querySelector('.nf-cinematic-loading');
          if (status) status.textContent = 'PREPARING EVERY OBJECT · PLEASE WAIT';
          await preloadPromise;
        } else {
          await Promise.race([
            preloadPromise,
            new Promise((resolve) => window.setTimeout(resolve, 2200)),
          ]);
        }
      }
      root.remove();
      video.removeAttribute('src');
      video.load();
      activePlayback = null;
      await onComplete?.();
      resolvePlayback();
    }, 260);
  };
  video.addEventListener('playing', beginPreload, { once: true });
  video.addEventListener('canplay', () => root.classList.add('is-ready'), { once: true });
  video.addEventListener('ended', finish, { once: true });
  video.addEventListener('error', () => {
    root.querySelector('.nf-cinematic-loading').textContent = 'FILM UNAVAILABLE · CONTINUING';
    window.setTimeout(finish, 900);
  }, { once: true });
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

  activePlayback = { id, root, video, promise, finish, beginPreload, requirePreloadReady: waitForPreload };
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
