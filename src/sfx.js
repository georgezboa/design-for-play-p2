// Tiny WebAudio blip synth for the Labyrinth's feedback tones. Keeps them
// asset-free — no .wav/.mp3 files to load.

let ctx = null;

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

export const sfx = {
  blocked: () => tone({ freq: 130, to: 105, dur: 0.09, vol: 0.08 }),
  goal: () => {
    [523, 659, 784, 1047].forEach((f, i) => tone({ freq: f, dur: 0.2, vol: 0.12, delay: i * 0.13 }));
  },
  gameover: () => {
    [440, 349, 262].forEach((f, i) => tone({ freq: f, dur: 0.3, type: 'triangle', vol: 0.12, delay: i * 0.18 }));
  },
};
