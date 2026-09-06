// One page may own game audio at a time. Browser autoplay permission and page
// focus are separate concerns: losing focus always pauses; the newly focused
// page claims audio only after a real pointer/keyboard gesture.
const subscribers = new Set();
const ownerId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
let channel = null;
let active = typeof document === 'undefined'
  ? true
  : document.visibilityState === 'visible' && document.hasFocus();

function notify(next) {
  if (active === next) return;
  active = next;
  for (const subscriber of subscribers) {
    try {
      if (active) subscriber.resume?.();
      else subscriber.pause?.();
    } catch {
      // Audio must never interrupt gameplay.
    }
  }
}

function claim() {
  if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
  notify(true);
  channel?.postMessage({ type: 'claim', ownerId });
}

function release() {
  notify(false);
}

function subscribe(subscriber) {
  subscribers.add(subscriber);
  if (!active) subscriber.pause?.();
  return () => subscribers.delete(subscriber);
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  if (window.BroadcastChannel) {
    channel = new window.BroadcastChannel('nightfall-game-audio-focus');
    channel.addEventListener('message', (event) => {
      if (event.data?.type === 'claim' && event.data.ownerId !== ownerId) release();
    });
  }
  window.addEventListener('blur', release);
  window.addEventListener('pagehide', release);
  window.addEventListener('pointerdown', claim, { passive: true });
  window.addEventListener('keydown', claim, { passive: true });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') release();
  });
}

export const audioFocus = {
  claim,
  release,
  subscribe,
  isActive: () => active,
};

export default audioFocus;
