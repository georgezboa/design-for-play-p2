import { readSettings } from './saveSystem.js';

// Reduced motion is on when EITHER the operating system asks for it or the
// player ticks REDUCE MOTION in the game's settings. Gameplay code asks this
// at the moment it would shake or flash, so toggling the setting from the
// pause menu takes effect immediately.

export function osPrefersReducedMotion(win = globalThis) {
  try {
    return win?.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true;
  } catch {
    return false;
  }
}

function currentSettings() {
  if (globalThis.NIGHTFALL_SETTINGS) return globalThis.NIGHTFALL_SETTINGS;
  try {
    return readSettings();
  } catch {
    return null;
  }
}

export function reducedMotionActive({ settings = currentSettings(), win = globalThis } = {}) {
  return Boolean(settings?.reducedMotion) || osPrefersReducedMotion(win);
}

// How strongly a full-screen flash may show: a faint cue instead of a strobe.
export const REDUCED_FLASH_ALPHA = 0.2;

// One central guard for every Phaser chapter: camera shakes run with zero
// intensity and camera flashes are reduced to a faint tint while reduced
// motion is active (in-game REDUCE MOTION or the OS preference). Durations
// and completion callbacks are preserved, so any gameplay sequenced on an
// effect's end still runs on time.
//
// Each Phaser entry calls installPhaserMotionGuard(Phaser) once.
const PATCHED = Symbol.for('nightfall.reducedMotionGuard');

export function installPhaserMotionGuard(Phaser) {
  const { Shake, Flash } = Phaser?.Cameras?.Scene2D?.Effects ?? {};
  if (Shake && !Shake.prototype[PATCHED]) {
    const startShake = Shake.prototype.start;
    Shake.prototype.start = function start(duration, intensity, ...rest) {
      return startShake.call(this, duration, reducedMotionActive() ? 0 : intensity, ...rest);
    };
    Shake.prototype[PATCHED] = true;
  }
  if (Flash && !Flash.prototype[PATCHED]) {
    const startFlash = Flash.prototype.start;
    Flash.prototype.start = function start(...args) {
      if (this.nightfallBaseAlpha === undefined) this.nightfallBaseAlpha = this.alpha;
      // args[4] is `force`; an unforced call on a running flash is ignored.
      if (!this.isRunning || args[4]) {
        this.alpha = reducedMotionActive() ? this.nightfallBaseAlpha * REDUCED_FLASH_ALPHA : this.nightfallBaseAlpha;
      }
      return startFlash.apply(this, args);
    };
    Flash.prototype[PATCHED] = true;
  }
}
