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

// A brush run dry on the paper (round 6, item 12): a short, soft scratch of
// filtered noise, falling in pitch, where a stroke hit the edge of the
// brush's reach. `soft` for a press that never touched paper.
let noiseBuffer = null;
function noise(c) {
  if (noiseBuffer && noiseBuffer.sampleRate === c.sampleRate) return noiseBuffer;
  const length = Math.floor(c.sampleRate * 0.4);
  noiseBuffer = c.createBuffer(1, length, c.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  let seed = 0x5eed;
  for (let i = 0; i < length; i += 1) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    data[i] = (seed / 0x7fffffff) * 2 - 1;
  }
  return noiseBuffer;
}

export function dryBrush({ soft = false } = {}) {
  const c = audio();
  if (!c || paused) return;
  if (c.state === 'suspended') c.resume().catch(() => {});
  try {
    const t = c.currentTime;
    const dur = soft ? 0.14 : 0.24;
    const peak = Math.max(0.0002, (soft ? 0.035 : 0.06) * level());
    const src = c.createBufferSource();
    src.buffer = noise(c);
    const bp = c.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 1.4;
    bp.frequency.setValueAtTime(3200, t);
    bp.frequency.exponentialRampToValueAtTime(900, t + dur);
    const out = c.createGain();
    out.gain.setValueAtTime(0.0001, t);
    out.gain.exponentialRampToValueAtTime(peak, t + 0.02);
    // a bristle catching: two small bumps in the scratch
    out.gain.setValueAtTime(peak * 0.55, t + dur * 0.45);
    out.gain.linearRampToValueAtTime(peak * 0.8, t + dur * 0.55);
    out.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(bp);
    bp.connect(out);
    out.connect(c.destination);
    src.start(t);
    src.stop(t + dur + 0.02);
  } catch {
    // Sound is never allowed to break the brush.
  }
}

// The painted train's exhaust beat: one soft chuff, louder and brighter the
// harder the engine is working.
export function chuff(intensity = 0.5) {
  const c = audio();
  if (!c || paused) return;
  if (c.state === 'suspended') c.resume().catch(() => {});
  try {
    const k = Math.min(1, Math.max(0, intensity));
    const t = c.currentTime;
    const dur = 0.16 + (1 - k) * 0.08;
    const peak = Math.max(0.0002, (0.012 + 0.03 * k) * level());
    const src = c.createBufferSource();
    src.buffer = noise(c);
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(700 + 1300 * k, t);
    lp.frequency.exponentialRampToValueAtTime(260, t + dur);
    const out = c.createGain();
    out.gain.setValueAtTime(0.0001, t);
    out.gain.exponentialRampToValueAtTime(peak, t + 0.015);
    out.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(lp);
    lp.connect(out);
    out.connect(c.destination);
    src.start(t, Math.random() * 0.2);
    src.stop(t + dur + 0.02);
  } catch {
    // Sound is never allowed to break the line.
  }
}
