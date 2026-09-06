// Tiny WebAudio blip synth. Keeps the project asset-free — no .wav/.mp3 files
// to load, and nothing to break if you move the folder around.

let ctx = null;
let ambient = null;
let ambientWanted = false;
let unlockListenersInstalled = false;

function sfxMix() {
  const settings = globalThis.NIGHTFALL_SETTINGS;
  return settings ? (settings.masterVolume / 100) * (settings.sfxVolume / 100) : 1;
}

function audio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  // Browsers start the context suspended until a user gesture. Every call site
  // here is downstream of a keypress, so resuming lazily is enough.
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

function tone({
  freq = 440,
  to = null,
  dur = 0.12,
  type = 'square',
  vol = 0.14,
  delay = 0,
  variation = 0.065,
}) {
  const c = audio();
  if (!c) return;

  const t0 = c.currentTime + delay;
  const osc = c.createOscillator();
  const gain = c.createGain();
  const detune = 1 + (Math.random() * 2 - 1) * variation;

  osc.type = type;
  osc.frequency.setValueAtTime(freq * detune, t0);
  if (to) osc.frequency.exponentialRampToValueAtTime(Math.max(1, to * detune), t0 + dur);

  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, vol * sfxMix()), t0 + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

  osc.connect(gain);
  gain.connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.03);
}

function stopAmbient() {
  if (!ambient) return;
  const now = ambient.context.currentTime;
  ambient.gain.gain.cancelScheduledValues(now);
  ambient.gain.gain.setValueAtTime(Math.max(0.0001, ambient.gain.gain.value), now);
  ambient.gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.32);
  ambient.oscillators.forEach((oscillator) => oscillator.stop(now + 0.36));
  ambient = null;
}

function startAmbient() {
  if (!ambientWanted || ambient) return;
  const c = audio();
  if (!c) return;

  const gain = c.createGain();
  const filter = c.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(150, c.currentTime);
  filter.Q.setValueAtTime(0.7, c.currentTime);
  gain.gain.setValueAtTime(0.0001, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, 0.012 * sfxMix()), c.currentTime + 0.8);
  filter.connect(gain);
  gain.connect(c.destination);

  const low = c.createOscillator();
  low.type = 'triangle';
  low.frequency.setValueAtTime(41, c.currentTime);
  const body = c.createOscillator();
  body.type = 'sine';
  body.frequency.setValueAtTime(47.5, c.currentTime);
  low.connect(filter);
  body.connect(filter);
  low.start();
  body.start();
  ambient = { context: c, gain, filter, oscillators: [low, body] };
}

function unlockAmbient() {
  if (ctx?.state === 'suspended') ctx.resume().catch(() => {});
  startAmbient();
}

function installAmbientUnlock() {
  if (unlockListenersInstalled || typeof window === 'undefined') return;
  unlockListenersInstalled = true;
  window.addEventListener('keydown', unlockAmbient, { passive: true });
  window.addEventListener('pointerdown', unlockAmbient, { passive: true });
}

export const sfx = {
  jump: () => tone({ freq: 300, to: 620, dur: 0.13, vol: 0.11 }),
  land: () => tone({ freq: 160, to: 110, dur: 0.06, vol: 0.07 }),
  coin: () => {
    tone({ freq: 988, dur: 0.07, vol: 0.09 });
    tone({ freq: 1319, dur: 0.14, vol: 0.09, delay: 0.07 });
  },
  slash: () => tone({ freq: 180, to: 720, dur: 0.09, type: 'sawtooth', vol: 0.08 }),
  kill: () => tone({ freq: 180, to: 58, dur: 0.12, type: 'triangle', vol: 0.1 }),
  bump: () => tone({ freq: 150, to: 95, dur: 0.09, vol: 0.11 }),
  hurt: () => tone({ freq: 400, to: 110, dur: 0.32, type: 'sawtooth', vol: 0.11 }),
  lane: () => tone({ freq: 520, to: 780, dur: 0.1, type: 'triangle', vol: 0.09 }),
  blocked: () => tone({ freq: 130, to: 105, dur: 0.09, vol: 0.08 }),
  press: () => {
    tone({ freq: 145, to: 112, dur: 0.055, type: 'triangle', vol: 0.08 });
    tone({ freq: 720, dur: 0.045, vol: 0.055, delay: 0.045 });
  },
  door: () => {
    tone({ freq: 92, to: 58, dur: 0.56, type: 'sawtooth', vol: 0.075 });
    tone({ freq: 180, to: 310, dur: 0.46, type: 'triangle', vol: 0.07, delay: 0.16 });
    tone({ freq: 680, dur: 0.07, vol: 0.07, delay: 0.61 });
  },
  spring: () => tone({ freq: 300, to: 1150, dur: 0.22, type: 'triangle', vol: 0.12 }),
  lever: () => {
    tone({ freq: 620, dur: 0.06, vol: 0.1 });
    tone({ freq: 940, dur: 0.12, vol: 0.1, delay: 0.06 });
  },
  checkpoint: () => {
    [659, 880].forEach((f, i) => tone({ freq: f, dur: 0.14, vol: 0.1, delay: i * 0.1 }));
  },
  goal: () => {
    [523, 659, 784, 1047].forEach((f, i) => tone({ freq: f, dur: 0.2, vol: 0.12, delay: i * 0.13 }));
  },
  gameover: () => {
    [440, 349, 262].forEach((f, i) => tone({ freq: f, dur: 0.3, type: 'triangle', vol: 0.12, delay: i * 0.18 }));
  },
  setPrologueAmbient: (active) => {
    ambientWanted = active;
    if (active) {
      installAmbientUnlock();
      startAmbient();
    } else {
      stopAmbient();
    }
  },
};
