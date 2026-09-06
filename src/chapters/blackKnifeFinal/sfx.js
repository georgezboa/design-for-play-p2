// Small WebAudio synth engine — a distinct sound for every attack, plus
// win/lose jingles. Any key present in the audio cache (real files) wins;
// these synths are the built-in soundtrack of the fight.

export function createSfx(scene) {
  const ctx = () => scene.sound.context;

  const tone = (f0, dur, type = 'square', vol = 0.05, f1 = null, delay = 0) => {
    const c = ctx(); if (!c) return;
    const t = c.currentTime + delay;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f0, t);
    if (f1 != null) osc.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain).connect(c.destination);
    osc.start(t); osc.stop(t + dur + 0.02);
  };

  const noise = (dur, vol = 0.08, freq = 1200, q = 0.8, f1 = null, delay = 0) => {
    const c = ctx(); if (!c) return;
    const t = c.currentTime + delay;
    const len = Math.max(1, Math.floor(c.sampleRate * dur));
    const buf = c.createBuffer(1, len, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource();
    src.buffer = buf;
    const filter = c.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(freq, t);
    if (f1 != null) filter.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    filter.Q.value = q;
    const gain = c.createGain();
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter).connect(gain).connect(c.destination);
    src.start(t);
  };

  const SOUNDS = {
    // player
    'shoot':       v => tone(540, 0.05, 'square', 0.02 * v, 340),
    'player-hit':  v => { tone(90, 0.3, 'sawtooth', 0.07 * v, 40); noise(0.2, 0.05 * v, 500, 0.6, 160); },
    'shield':      v => { tone(660, 0.18, 'sine', 0.05 * v, 990); tone(990, 0.22, 'sine', 0.03 * v, 1320, 0.08); },
    'shield-off':  v => tone(880, 0.2, 'sine', 0.04 * v, 330),
    'no-shield':   v => tone(140, 0.12, 'square', 0.05 * v, 110),
    'boss-hit':    v => noise(0.06, 0.028 * v, 2400, 1, 900),

    // boss attacks — each has its own voice
    'ticket':      v => noise(0.16, 0.05 * v, 2600, 2.5, 700),           // whip swish
    'baton':       v => { tone(150, 0.16, 'square', 0.05 * v, 90); noise(0.12, 0.04 * v, 1800, 2, 500); },
    'orb':         v => tone(720, 0.1, 'triangle', 0.04 * v, 480),
    'magic':       v => { tone(620, 0.24, 'triangle', 0.045 * v, 930); tone(310, 0.24, 'sine', 0.03 * v, 470, 0.05); },
    'slash':       v => { noise(0.14, 0.07 * v, 3200, 1.4, 1000); tone(180, 0.12, 'sawtooth', 0.04 * v, 90); },
    'train':       v => { tone(70, 0.5, 'sawtooth', 0.06 * v, 55); noise(0.5, 0.05 * v, 300, 0.5, 180); },
    'chug':        v => noise(0.1, 0.06 * v, 400, 1, 240),
    'car-throw':   v => { noise(0.34, 0.06 * v, 900, 0.7, 250); tone(120, 0.3, 'sawtooth', 0.04 * v, 60); },
    'clank':       v => { tone(220, 0.09, 'square', 0.06 * v, 140); noise(0.08, 0.06 * v, 3400, 3, 1800); },
    'boom':        v => { tone(85, 0.4, 'sawtooth', 0.08 * v, 30); noise(0.35, 0.09 * v, 700, 0.4, 90); },
    'coal-lob':    v => tone(180, 0.14, 'square', 0.045 * v, 320),
    'wheel':       v => { noise(0.07, 0.05 * v, 1300, 2, 800); tone(160, 0.07, 'square', 0.03 * v); },
    'wall':        v => { tone(240, 0.5, 'sawtooth', 0.045 * v, 480); tone(244, 0.5, 'sawtooth', 0.045 * v, 484); }, // alarm beat
    'beam-charge': v => tone(180, 0.85, 'sine', 0.05 * v, 1400),
    'beam-fire':   v => { tone(95, 0.55, 'sawtooth', 0.07 * v, 80); noise(0.55, 0.045 * v, 2000, 0.6, 600); },
    'spiral':      v => tone(500, 0.05, 'triangle', 0.03 * v, 760),
    'vortex':      v => tone(1200, 0.5, 'sine', 0.045 * v, 160),
    'laser':       v => { tone(1100, 0.3, 'sawtooth', 0.05 * v, 300); noise(0.25, 0.04 * v, 2800, 1, 700); },

    // battle beats
    'phase':       v => { tone(110, 0.5, 'sawtooth', 0.07 * v, 65); noise(0.4, 0.05 * v, 600, 0.5, 150);
                          tone(220, 0.3, 'square', 0.04 * v, 330, 0.15); },
    'enrage':      v => { for (let i = 0; i < 3; i += 1) tone(90 + i * 40, 0.3, 'sawtooth', 0.07 * v, 60, i * 0.12);
                          noise(0.8, 0.06 * v, 400, 0.5, 1200); },
    'knockout':    v => { tone(60, 1.0, 'sawtooth', 0.08 * v, 30); noise(0.8, 0.08 * v, 500, 0.4, 60); },

    // WIN: bright ascending fanfare
    'win': v => {
      const notes = [523, 659, 784, 1047, 1319];
      notes.forEach((f, i) => {
        tone(f, 0.34, 'triangle', 0.06 * v, null, i * 0.14);
        tone(f / 2, 0.34, 'sine', 0.04 * v, null, i * 0.14);
      });
      tone(1047, 0.9, 'triangle', 0.05 * v, null, notes.length * 0.14);
    },
    // LOSE: slow falling minor line with a sour wobble
    'lose': v => {
      const notes = [392, 311, 262, 196, 131];
      notes.forEach((f, i) => {
        tone(f, 0.5, 'sawtooth', 0.05 * v, f * 0.94, i * 0.3);
      });
      noise(1.2, 0.03 * v, 300, 0.5, 80, notes.length * 0.3 * 0.6);
    },
    'pause': v => tone(440, 0.08, 'square', 0.03 * v, 330),
  };

  return {
    play(name, vol = 1) {
      // Real audio file wins if one is loaded under sfx-<name>
      const key = `sfx-${name}`;
      if (scene.cache.audio.exists(key)) { scene.sound.play(key, { volume: vol }); return; }
      SOUNDS[name]?.(vol);
    },
  };
}
