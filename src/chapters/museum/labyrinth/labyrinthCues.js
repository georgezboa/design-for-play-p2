// Door 1 event cues — small WebAudio synth, same asset-free approach as
// ../../../sfx.js, but scored specifically for the labyrinth's palette of
// moments: cold stone, warm brass, held breath. Everything here is a short,
// quiet gesture; nothing loops (the chase bed in chaseMusic.js owns the only
// sustained sound).

let ctx = null;

function audio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

function tone({
  freq = 440,
  to = null,
  dur = 0.12,
  type = 'sine',
  vol = 0.1,
  delay = 0,
}) {
  const c = audio();
  if (!c) return;
  const t0 = c.currentTime + delay;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (to) osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t0 + dur);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain);
  gain.connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

// Short filtered noise burst — stone scrapes, gate weight, fabric.
function scrape({ freq = 300, q = 1.4, dur = 0.3, vol = 0.08, delay = 0, type = 'bandpass' }) {
  const c = audio();
  if (!c) return;
  const t0 = c.currentTime + delay;
  const len = Math.ceil(c.sampleRate * dur);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = c.createBufferSource();
  src.buffer = buf;
  const filter = c.createBiquadFilter();
  filter.type = type;
  filter.frequency.setValueAtTime(freq, t0);
  filter.Q.setValueAtTime(q, t0);
  const gain = c.createGain();
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(filter);
  filter.connect(gain);
  gain.connect(c.destination);
  src.start(t0);
}

export const labyrinthCues = {
  // Key collected — a small warm struck note with an ivory overtone.
  keyTaken() {
    tone({ freq: 740, dur: 0.16, type: 'triangle', vol: 0.09 });
    tone({ freq: 1480, dur: 0.1, type: 'sine', vol: 0.05, delay: 0.02 });
  },
  // Wing connector grinding open — heavy impact, then a stone settle.
  gateUnlock() {
    tone({ freq: 68, to: 44, dur: 0.5, type: 'sawtooth', vol: 0.07 });
    scrape({ freq: 190, dur: 0.42, vol: 0.06, delay: 0.05 });
    tone({ freq: 320, to: 480, dur: 0.22, type: 'triangle', vol: 0.05, delay: 0.3 });
  },
  // Final exit unlocking — the same gate language, resolved upward.
  exitUnlock() {
    tone({ freq: 68, to: 44, dur: 0.5, type: 'sawtooth', vol: 0.06 });
    tone({ freq: 392, dur: 0.3, type: 'triangle', vol: 0.06, delay: 0.22 });
    tone({ freq: 587, dur: 0.34, type: 'triangle', vol: 0.05, delay: 0.36 });
  },
  // Crossing into a new wing — a low held breath, not a fanfare.
  wingEnter() {
    scrape({ freq: 520, q: 0.8, dur: 0.7, vol: 0.035, type: 'highpass' });
    tone({ freq: 196, dur: 0.5, type: 'sine', vol: 0.035, delay: 0.1 });
  },
  // Shield pickup — a cool struck glass note.
  shieldFound() {
    tone({ freq: 980, dur: 0.12, type: 'sine', vol: 0.07 });
    tone({ freq: 1470, dur: 0.16, type: 'sine', vol: 0.045, delay: 0.07 });
  },
  // Shield activation — a held cool tone that closes like a visor.
  shieldUp() {
    tone({ freq: 520, to: 880, dur: 0.24, type: 'triangle', vol: 0.08 });
    scrape({ freq: 1200, q: 2.5, dur: 0.2, vol: 0.03, delay: 0.05, type: 'highpass' });
  },
  // Shield absorbing a hit — a dull deflected knock.
  shieldBlock() {
    tone({ freq: 220, to: 160, dur: 0.14, type: 'triangle', vol: 0.09 });
    scrape({ freq: 640, dur: 0.12, vol: 0.04, delay: 0.02 });
  },
  // A statue lands a hit — stone on stone, low and short.
  statueHit() {
    tone({ freq: 96, to: 52, dur: 0.3, type: 'sawtooth', vol: 0.1 });
    scrape({ freq: 240, dur: 0.26, vol: 0.07, delay: 0.02 });
  },
  // The fragment surfacing in the end room — one quiet glass shimmer.
  fragmentReveal() {
    tone({ freq: 1180, dur: 0.5, type: 'sine', vol: 0.04 });
    tone({ freq: 1760, dur: 0.6, type: 'sine', vol: 0.025, delay: 0.18 });
  },
  // Taking the fragment — a soft low resolve, stone settling into cloth.
  fragmentTake() {
    tone({ freq: 392, to: 330, dur: 0.3, type: 'triangle', vol: 0.06 });
    scrape({ freq: 900, q: 0.9, dur: 0.18, vol: 0.03, delay: 0.05, type: 'highpass' });
  },
};
