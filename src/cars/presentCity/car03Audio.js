// Car 03 // MOVE AS ONE — local audio synth for the V2 readable rebuild.
//
// src/sfx.js serves the platformer cars (jump/coin/slash vocabulary) and its
// API does not cover the Design-Lock §9 sound language of this slice, so the
// scene uses this Car-03-local WebAudio helper instead. Everything is
// synthesized (no asset files), every call is a no-op when WebAudio is
// unavailable, and all volumes are kept deliberately subtle.

let ctx = null;
let alarmTimer = null;
let bedNodes = null;
let unlocked = false;
let unlockInstalled = false;

// The AudioContext is only created after a real user gesture — creating it
// earlier logs a browser warning and leaves every early sound silent
// anyway. Until the first keydown/pointerdown, all sounds are no-ops.
function installUnlock() {
  if (unlockInstalled || typeof window === 'undefined') return;
  unlockInstalled = true;
  const unlock = () => {
    unlocked = true;
    audio();
  };
  window.addEventListener('keydown', unlock, { passive: true });
  window.addEventListener('pointerdown', unlock, { passive: true });
}
installUnlock();

function audio() {
  if (!unlocked || typeof window === 'undefined') return null;
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try {
      ctx = new AC();
    } catch {
      return null;
    }
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

function tone({ freq = 440, to = null, dur = 0.12, type = 'sine', vol = 0.06, delay = 0 }) {
  const c = audio();
  if (!c) return;
  try {
    const t0 = c.currentTime + delay;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (to) osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t0 + dur);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  } catch {
    /* never let audio break the game */
  }
}

// A soft footstep thump — low triangle body plus a touch of heel noise.
function footstep(delay = 0, vol = 0.05, freq = 190) {
  tone({ freq, to: freq * 0.62, dur: 0.07, type: 'triangle', vol, delay });
}

export const car03Audio = {
  // City room-tone bed: looped brown noise through a lowpass with a slow
  // swell LFO. Idempotent; no-op until the first real user gesture unlocks
  // WebAudio. Keeps running across R resets; volume deliberately subliminal.
  ambientStart() {
    const c = audio();
    if (!c || bedNodes) return;
    try {
      const len = 2 * c.sampleRate;
      const buf = c.createBuffer(1, len, c.sampleRate);
      const data = buf.getChannelData(0);
      let last = 0;
      for (let i = 0; i < len; i++) {
        const white = Math.random() * 2 - 1;
        last = (last + 0.02 * white) / 1.02;
        data[i] = last * 3.2;
      }
      const src = c.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      const lp = c.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 320;
      const g = c.createGain();
      g.gain.value = 0.016;
      const lfo = c.createOscillator();
      lfo.frequency.value = 0.07;
      const lfoG = c.createGain();
      lfoG.gain.value = 0.006;
      lfo.connect(lfoG);
      lfoG.connect(g.gain);
      src.connect(lp);
      lp.connect(g);
      g.connect(c.destination);
      src.start();
      lfo.start();
      bedNodes = { src, lfo };
    } catch {
      /* never let audio break the game */
    }
  },

  // Match available: two soft preview footfalls (Design Lock §9).
  matchPreview() {
    footstep(0, 0.045);
    footstep(0.14, 0.05, 210);
  },

  // Match successful: two footfalls snap into one rhythm + warm confirm.
  matchSnap() {
    footstep(0, 0.055);
    footstep(0.12, 0.055, 190);
    tone({ freq: 523, dur: 0.16, type: 'sine', vol: 0.05, delay: 0.16 });
    tone({ freq: 659, dur: 0.18, type: 'sine', vol: 0.04, delay: 0.24 });
  },

  // Release: brief cloth/step separation.
  release() {
    tone({ freq: 300, to: 160, dur: 0.08, type: 'triangle', vol: 0.045 });
    footstep(0.05, 0.03, 150);
  },

  // Scanner warning: three accelerating ticks, attached to the scanner.
  warningTicks() {
    tone({ freq: 880, dur: 0.045, type: 'square', vol: 0.032, delay: 0 });
    tone({ freq: 932, dur: 0.045, type: 'square', vol: 0.034, delay: 0.24 });
    tone({ freq: 988, dur: 0.05, type: 'square', vol: 0.036, delay: 0.42 });
  },

  // Flag: muted inspection stamp — no harsh damage sound.
  flagStamp() {
    tone({ freq: 96, to: 54, dur: 0.22, type: 'triangle', vol: 0.085 });
    tone({ freq: 620, to: 300, dur: 0.06, type: 'square', vol: 0.022, delay: 0.02 });
  },

  // Three-step duo: one note per footprint, resolving on the third.
  duoStep(steps) {
    const notes = [392, 523, 659];
    const i = Math.max(1, Math.min(3, steps | 0)) - 1;
    tone({ freq: notes[i], dur: 0.14, type: 'sine', vol: 0.055 });
    if (i === 2) tone({ freq: 784, dur: 0.22, type: 'sine', vol: 0.05, delay: 0.1 });
  },

  duoReset() {
    tone({ freq: 220, to: 150, dur: 0.1, type: 'triangle', vol: 0.03 });
  },

  // Calibration arch accepts the two-person pattern.
  archAccept() {
    tone({ freq: 523, dur: 0.16, type: 'sine', vol: 0.05 });
    tone({ freq: 784, dur: 0.24, type: 'sine', vol: 0.05, delay: 0.12 });
  },

  checkpointReturn() {
    tone({ freq: 392, to: 440, dur: 0.1, type: 'triangle', vol: 0.035 });
  },

  // Final door opens.
  doorOpen() {
    tone({ freq: 92, to: 58, dur: 0.5, type: 'sawtooth', vol: 0.045 });
    tone({ freq: 180, to: 310, dur: 0.42, type: 'triangle', vol: 0.045, delay: 0.14 });
    tone({ freq: 680, dur: 0.08, type: 'sine', vol: 0.04, delay: 0.55 });
  },

  // Completion: warm resolve, no fireworks.
  completeTone() {
    [523, 659, 784].forEach((f, i) => tone({ freq: f, dur: 0.26, type: 'sine', vol: 0.05, delay: i * 0.14 }));
  },

  // E pressed with no eligible target.
  uiTick() {
    tone({ freq: 150, to: 118, dur: 0.06, type: 'triangle', vol: 0.03 });
  },

  // Beat 4: low carriage alarm under the footstep rhythm. Repeats softly
  // while active; startAlarm is idempotent.
  startAlarm() {
    const blast = () => {
      tone({ freq: 74, to: 62, dur: 0.5, type: 'sawtooth', vol: 0.028 });
      tone({ freq: 148, to: 124, dur: 0.32, type: 'triangle', vol: 0.02, delay: 0.06 });
    };
    if (alarmTimer !== null) return;
    blast();
    alarmTimer = setInterval(blast, 1100);
  },

  stopAlarm() {
    if (alarmTimer !== null) {
      clearInterval(alarmTimer);
      alarmTimer = null;
    }
  },

  // R reset / scene teardown.
  reset() {
    car03Audio.stopAlarm();
  },

  // ------------------------------------------------------------------
  // Chapter 3 // ECHO CITY vocabulary (added 2026-08-04). Same rules:
  // synthesized only, gesture-unlocked, subtle volumes, never gates input.
  // ------------------------------------------------------------------

  // Scripted transition cues must always exist because the visual sequence
  // continues immediately after each call. Every tone helper is already a
  // safe no-op when WebAudio is unavailable.
  nightmareStorm({ duration = 3.6 } = {}) {
    const span = Math.max(0.4, Number(duration) || 3.6);
    tone({ freq: 72, to: 38, dur: Math.min(span, 1.8), type: 'sawtooth', vol: 0.035 });
    tone({ freq: 118, to: 62, dur: Math.min(span * 0.72, 1.5), type: 'triangle', vol: 0.026, delay: 0.18 });
    tone({ freq: 47, to: 31, dur: Math.min(span * 0.55, 1.25), type: 'sine', vol: 0.03, delay: 0.42 });
  },

  morningWake() {
    tone({ freq: 294, dur: 0.22, type: 'sine', vol: 0.032 });
    tone({ freq: 440, dur: 0.34, type: 'sine', vol: 0.035, delay: 0.16 });
  },

  trainDoorSlam() {
    tone({ freq: 92, to: 46, dur: 0.24, type: 'triangle', vol: 0.07 });
  },

  trainHorn() {
    tone({ freq: 110, dur: 0.72, type: 'sawtooth', vol: 0.042 });
    tone({ freq: 165, dur: 0.68, type: 'triangle', vol: 0.025, delay: 0.04 });
  },

  // RESONANCE focus acquired: soft two-note shimmer.
  echoFocus() {
    tone({ freq: 392, dur: 0.08, type: 'sine', vol: 0.03 });
    tone({ freq: 494, dur: 0.1, type: 'sine', vol: 0.028, delay: 0.07 });
  },

  // Observation locked in and the cycle is copied.
  cycleCopy() {
    tone({ freq: 440, dur: 0.1, type: 'sine', vol: 0.045 });
    tone({ freq: 554, dur: 0.12, type: 'sine', vol: 0.045, delay: 0.08 });
    tone({ freq: 659, dur: 0.18, type: 'sine', vol: 0.05, delay: 0.16 });
  },

  // Partial observation drains away.
  observationDrain() {
    tone({ freq: 330, to: 190, dur: 0.16, type: 'sine', vol: 0.03 });
  },

  // Cycle handed to a receiver (compatible or not — the result is visible).
  transplant() {
    tone({ freq: 262, dur: 0.09, type: 'triangle', vol: 0.05 });
    tone({ freq: 392, dur: 0.14, type: 'triangle', vol: 0.05, delay: 0.08 });
    tone({ freq: 523, dur: 0.2, type: 'sine', vol: 0.045, delay: 0.16 });
  },

  // Wrong-but-eligible transplant: gentle low "not this one", no punishment.
  transplantWrong() {
    tone({ freq: 196, to: 150, dur: 0.2, type: 'triangle', vol: 0.05 });
    tone({ freq: 147, dur: 0.14, type: 'triangle', vol: 0.035, delay: 0.14 });
  },

  // Receiver gives its cycle back.
  cycleRelease() {
    tone({ freq: 392, to: 262, dur: 0.12, type: 'triangle', vol: 0.04 });
  },

  // A gate recognizes a pattern and opens.
  echoGateOpen() {
    tone({ freq: 98, to: 64, dur: 0.44, type: 'sawtooth', vol: 0.04 });
    tone({ freq: 196, to: 330, dur: 0.4, type: 'triangle', vol: 0.04, delay: 0.12 });
    tone({ freq: 659, dur: 0.09, type: 'sine', vol: 0.04, delay: 0.5 });
  },

  // Recording begins: warm amber "listening" tone.
  recordStart() {
    tone({ freq: 294, dur: 0.14, type: 'sine', vol: 0.045 });
    tone({ freq: 370, dur: 0.2, type: 'sine', vol: 0.04, delay: 0.1 });
  },

  // The resonance bell rings inside a recording.
  bellRing() {
    tone({ freq: 880, dur: 0.4, type: 'sine', vol: 0.05 });
    tone({ freq: 1320, dur: 0.3, type: 'sine', vol: 0.028, delay: 0.02 });
    tone({ freq: 660, dur: 0.5, type: 'sine', vol: 0.03, delay: 0.05 });
  },

  // Recording finished / drained.
  recordEnd() {
    tone({ freq: 440, dur: 0.1, type: 'sine', vol: 0.04 });
    tone({ freq: 587, dur: 0.16, type: 'sine', vol: 0.04, delay: 0.08 });
  },

  recordDrain() {
    tone({ freq: 294, to: 175, dur: 0.24, type: 'sine', vol: 0.032 });
  },

  // The authored Butch echo previews the recorded path.
  echoPreview() {
    tone({ freq: 247, dur: 0.12, type: 'triangle', vol: 0.032 });
    tone({ freq: 330, dur: 0.14, type: 'triangle', vol: 0.03, delay: 0.12 });
  },

  // Butch gives his own cycle to Mara and the square.
  shareCycle() {
    tone({ freq: 330, dur: 0.16, type: 'sine', vol: 0.05 });
    tone({ freq: 415, dur: 0.18, type: 'sine', vol: 0.05, delay: 0.12 });
    tone({ freq: 494, dur: 0.24, type: 'sine', vol: 0.05, delay: 0.24 });
  },

  // The square performs the interaction component.
  squareResonate() {
    tone({ freq: 659, dur: 0.5, type: 'sine', vol: 0.045 });
    tone({ freq: 988, dur: 0.42, type: 'sine', vol: 0.028, delay: 0.04 });
    tone({ freq: 494, dur: 0.6, type: 'sine', vol: 0.03, delay: 0.08 });
  },

  // Mara crosses the witness gate.
  maraCross() {
    footstep(0, 0.04, 210);
    footstep(0.16, 0.042, 220);
    footstep(0.32, 0.044, 230);
  },

  // The reunion — the chapter's resolve.
  reunion() {
    [392, 494, 587, 784].forEach((f, i) => tone({ freq: f, dur: 0.3, type: 'sine', vol: 0.05, delay: i * 0.16 }));
  },

  // Entering a new space.
  spaceChime() {
    tone({ freq: 523, dur: 0.12, type: 'sine', vol: 0.035 });
    tone({ freq: 784, dur: 0.18, type: 'sine', vol: 0.03, delay: 0.1 });
  },
};

export default car03Audio;
