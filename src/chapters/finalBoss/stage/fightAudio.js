// Chapter 6 · the fight's own sounds (round 12), synthesised: impacts with
// weight, whooshes, the stings that close a set piece, and a pulse under
// the movement's music that drives harder with each escalation (the score
// itself is the movement's cue, musicDirector.js).

export function createFightAudio({ volume = () => 1, enabled = () => true } = {}) {
  let ctx = null;
  let out = null;
  let noiseBuffer = null;
  let level = 0; // 0 off, 1..3 the escalation
  let bpm = 96;
  let nextBeat = 0;
  let beat = 0;

  const ensure = () => {
    if (!enabled()) return null;
    try {
      if (!ctx) {
        ctx = new AudioContext();
        out = ctx.createGain();
        out.connect(ctx.destination);
        noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
        const data = noiseBuffer.getChannelData(0);
        for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
      }
      if (ctx.state === 'suspended') ctx.resume?.();
      out.gain.value = volume();
      return ctx;
    } catch { return null; }
  };

  const tone = (freq, dur, { type = 'sine', vol = 0.04, at = 0, slide = null } = {}) => {
    const c = ensure();
    if (!c) return;
    const t = c.currentTime + at;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slide), t + dur);
    gain.gain.setValueAtTime(Math.max(0.0001, vol), t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain).connect(out);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  };

  const noise = (dur, { vol = 0.05, freq = 800, q = 0.8, at = 0, sweep = null } = {}) => {
    const c = ensure();
    if (!c) return;
    const t = c.currentTime + at;
    const src = c.createBufferSource();
    src.buffer = noiseBuffer;
    const filter = c.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(freq, t);
    if (sweep) filter.frequency.exponentialRampToValueAtTime(sweep, t + dur);
    filter.Q.value = q;
    const gain = c.createGain();
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter).connect(gain).connect(out);
    src.start(t);
    src.stop(t + dur + 0.02);
  };

  return {
    tone,
    noise,
    // A hit with weight: a low thump and a burst.
    impact(strength = 1) {
      tone(90 + 30 * strength, 0.22 + 0.1 * strength, { type: 'sine', vol: 0.07 * strength, slide: 38 });
      noise(0.16 + 0.06 * strength, { vol: 0.05 * strength, freq: 900, sweep: 180 });
    },
    hurt() { tone(70, 0.3, { type: 'sawtooth', vol: 0.05, slide: 40 }); noise(0.2, { vol: 0.06, freq: 500, sweep: 120 }); },
    whoosh(dir = 1) { noise(0.35, { vol: 0.045, freq: dir > 0 ? 400 : 1600, sweep: dir > 0 ? 2400 : 300, q: 0.6 }); },
    jump() { tone(330, 0.08, { type: 'triangle', vol: 0.025, slide: 520 }); },
    land(hard = false) { tone(hard ? 80 : 110, 0.08, { type: 'triangle', vol: hard ? 0.04 : 0.02 }); },
    dash() { noise(0.14, { vol: 0.04, freq: 1200, sweep: 3200 }); },
    punch() { tone(180, 0.09, { type: 'square', vol: 0.03, slide: 90 }); noise(0.08, { vol: 0.05, freq: 2200 }); },
    horn() { tone(220, 0.5, { type: 'sawtooth', vol: 0.025 }); tone(277, 0.5, { type: 'sawtooth', vol: 0.02 }); },
    chime(high = false) { tone(high ? 1320 : 660, 0.9, { vol: 0.03 }); tone(high ? 1980 : 990, 0.6, { vol: 0.015 }); },
    clock() { tone(196, 1.6, { vol: 0.07 }); tone(392, 1.2, { vol: 0.03 }); noise(0.06, { vol: 0.04, freq: 3000 }); },
    // The end of a set piece: a chord, struck hard.
    sting(kind = 'minor') {
      const root = 110;
      const chord = kind === 'major' ? [1, 1.26, 1.5, 2] : [1, 1.19, 1.5, 2];
      chord.forEach((k, i) => tone(root * k, 1.6, { type: 'sawtooth', vol: 0.03 - i * 0.004 }));
      tone(55, 1.2, { type: 'sine', vol: 0.08, slide: 30 });
      noise(0.5, { vol: 0.05, freq: 300, sweep: 60 });
    },
    // The pulse under the score: off, then harder with each escalation.
    setIntensity(next, tempo = bpm) { level = Math.max(0, Math.min(3, next)); bpm = tempo; },
    get intensity() { return level; },
    update(dt) {
      if (!level || !enabled()) return;
      nextBeat -= dt;
      if (nextBeat > 0) return;
      nextBeat += 60 / (bpm * (1 + 0.12 * (level - 1)));
      if (nextBeat < 0) nextBeat = 60 / bpm;
      beat += 1;
      tone(62, 0.18, { type: 'sine', vol: 0.03 + 0.012 * level, slide: 36 });
      if (level >= 2 && beat % 2 === 0) noise(0.05, { vol: 0.012 * level, freq: 5200 });
      if (level >= 3) tone(124, 0.1, { type: 'triangle', vol: 0.01, at: 30 / bpm });
    },
    stop() { level = 0; },
  };
}
