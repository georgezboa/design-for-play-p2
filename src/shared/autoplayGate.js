// Whether this page may start sound without waiting for a gesture (alpha
// round 4: the true ending played its 35-second reveal in silence, because
// the music waited for a key the reveal never asks for).
//
// A page's music is TRIED at once: the desktop app allows autoplay, and a
// browser usually does after a same-origin navigation the player has already
// interacted with. Only a play() the browser refuses (NotAllowedError) makes
// the page wait for the first key or click, and only then is the small
// "♪ CLICK FOR SOUND" tag shown.
//
//   unknown ──play() resolves──▶ allowed
//      │                            ▲
//      └─play() refused─▶ blocked ──┘ first gesture
//
// Pure: tests/audioAutoplay.test.mjs drives it with fake play() promises.

export const SOUND_TAG_TEXT = '♪ CLICK FOR SOUND';

/** A play() rejection that means "needs a user gesture" (not an abort or a bad source). */
export function isAutoplayRefusal(error) {
  return error?.name === 'NotAllowedError';
}

export function createAutoplayGate({ onBlocked = () => {}, onUnlocked = () => {} } = {}) {
  let state = 'unknown';
  return {
    get state() { return state; },
    /** May a play() be attempted now (rather than kept pending for a gesture)? */
    canAttempt: () => state !== 'blocked',
    /** A play() attempt resolved: sound is allowed on this page. */
    played() {
      if (state === 'allowed') return false;
      const wasBlocked = state === 'blocked';
      state = 'allowed';
      if (wasBlocked) onUnlocked();
      return true;
    },
    /**
     * A play() attempt was rejected. Returns true when it was an autoplay
     * refusal, i.e. the call should now wait for the first gesture.
     */
    rejected(error) {
      if (!isAutoplayRefusal(error) || state === 'allowed') return false;
      if (state !== 'blocked') { state = 'blocked'; onBlocked(); }
      return true;
    },
    /** The first real key / pointer press: sound is allowed from now on. */
    gesture() {
      const wasBlocked = state === 'blocked';
      state = 'allowed';
      if (wasBlocked) onUnlocked();
      return wasBlocked;
    },
  };
}

/**
 * Try `play` (a function returning play()'s promise) under `gate`. Resolves
 * to 'playing', 'blocked' (wait for a gesture), 'waiting' (the gate is
 * already blocked, nothing was attempted) or 'failed' (another error).
 */
export async function attemptPlay(gate, play) {
  if (!gate.canAttempt()) return 'waiting';
  try {
    await play();
    gate.played();
    return 'playing';
  } catch (error) {
    return gate.rejected(error) ? 'blocked' : 'failed';
  }
}
