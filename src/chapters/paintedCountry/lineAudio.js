// Chapter 4 // THE PAINTED COUNTRY — the line's sounds.
//
// The bell is Chapter 2's bell (src/chapters/borrowedLight/audio.js), imported
// rather than copied, so the painted train rings exactly like the borrowed
// city. The whistle is new: a steam whistle for a train waiting at a gap.

import { bell, installAudio, paper, stoneChime } from '../borrowedLight/audio.js';
import { DEFAULT_SETTINGS, volumeForChannel } from '../../shell/saveSystem.js';

export { bell, paper, stoneChime };

let installed = false;
export function installLineAudio() {
  if (installed) return;
  installed = true;
  installAudio();
}

let ctx = null;
let paused = false;
const level = () => volumeForChannel(globalThis.NIGHTFALL_SETTINGS ?? DEFAULT_SETTINGS, 'sfx');

function audio() {
  if (ctx) return ctx;
  const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
  if (!AC) return null;
  try {
    ctx = new AC();
    globalThis.addEventListener?.('nightfall:pause', (event) => {
      paused = Boolean(event.detail?.paused);
    });
  } catch {
    ctx = null;
  }
  return ctx;
}

// Two reedy voices a fifth apart, sliding up into the note and falling off.
export function whistle({ long = false } = {}) {
  const c = audio();
  if (!c || paused) return;
  if (c.state === 'suspended') c.resume().catch(() => {});
  try {
    const t = c.currentTime;
    const dur = long ? 1.4 : 0.8;
    const out = c.createGain();
    out.gain.setValueAtTime(0.0001, t);
    out.gain.exponentialRampToValueAtTime(Math.max(0.0002, 0.09 * level()), t + 0.08);
    out.gain.setValueAtTime(Math.max(0.0002, 0.09 * level()), t + dur - 0.2);
    out.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const bp = c.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1100;
    bp.Q.value = 2.2;
    bp.connect(out);
    out.connect(c.destination);
    [587.33, 880].forEach((f) => {
      const o = c.createOscillator();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(f * 0.92, t);
      o.frequency.exponentialRampToValueAtTime(f, t + 0.12);
      o.frequency.setValueAtTime(f, t + dur - 0.2);
      o.frequency.exponentialRampToValueAtTime(f * 0.94, t + dur);
      o.connect(bp);
      o.start(t);
      o.stop(t + dur + 0.05);
    });
  } catch {
    // Sound is never allowed to break the line.
  }
}
