import Phaser from 'phaser';

/**
 * Chapter 2 ambience — procedural WebAudio soundscapes, one per level.
 * No assets, everything is filtered noise beds, detuned sub-drones and
 * scheduled distant events. All nodes are torn down on scene shutdown.
 *
 *   startAmbience(scene, 'city')        L2-1: urban rumble, rain, mains hum
 *   startAmbience(scene, 'industrial')  L2-2: machine drone, air hiss, clanks
 *   startAmbience(scene, 'surface')     L2-3: wind swells, deep groans
 *
 * If the AudioContext is still suspended (no user gesture yet), the beds
 * simply start silent — Phaser resumes the shared context on first input
 * and everything fades in from there.
 */

function makeNoise(ctx, seconds = 2) {
  const buf = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
  const d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < d.length; i++) {
    const white = Math.random() * 2 - 1;
    last = (last + 0.02 * white) / 1.02; // cheap pinkening
    d[i] = last * 3.2;
  }
  return buf;
}

export function startAmbience(scene, kind) {
  let ctx;
  try {
    ctx = scene.sound.context;
  } catch (e) {
    return;
  }
  if (!ctx) return;

  const nodes = [];
  const timers = [];
  let noise;
  try {
    noise = makeNoise(ctx);
  } catch (e) {
    return;
  }

  /** Looping noise through a filter, faded in, optional slow gain swell. */
  const bed = ({ type, freq, q = 0.8, gain, lfoHz = 0, lfoDepth = 0, fade = 2.5 }) => {
    const src = ctx.createBufferSource();
    src.buffer = noise;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.value = 0;
    g.gain.linearRampToValueAtTime(gain, ctx.currentTime + fade);
    src.connect(f).connect(g).connect(ctx.destination);
    src.start();
    nodes.push(src);
    if (lfoHz > 0) {
      const lfo = ctx.createOscillator();
      lfo.frequency.value = lfoHz;
      const lg = ctx.createGain();
      lg.gain.value = lfoDepth;
      lfo.connect(lg).connect(g.gain);
      lfo.start();
      nodes.push(lfo);
    }
    return { src, f, g };
  };

  /** Two detuned low oscillators — the grid / the machines never sleep. */
  const drone = ({ freq = 55, gain = 0.04, type = 'sine', spread = 0.5, fade = 3 }) => {
    const g = ctx.createGain();
    g.gain.value = 0;
    g.gain.linearRampToValueAtTime(gain, ctx.currentTime + fade);
    g.connect(ctx.destination);
    [-spread, spread].forEach((d) => {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = freq + d;
      o.connect(g);
      o.start();
      nodes.push(o);
    });
    nodes.push({ stop: () => g.disconnect() });
  };

  /** One short metallic event somewhere far away. */
  const clank = ({ freq = 700, gain = 0.035, dur = 0.4 } = {}) => {
    const t0 = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.setValueAtTime(freq, t0);
    o.frequency.exponentialRampToValueAtTime(freq * 0.55, t0 + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0008, t0 + dur);
    o.connect(g).connect(ctx.destination);
    o.start(t0);
    o.stop(t0 + dur + 0.05);
  };

  /** A long sub-bass swell — the building / the district groaning. */
  const groan = ({ freq = 38, gain = 0.05, dur = 2.6 } = {}) => {
    const t0 = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(freq, t0);
    o.frequency.linearRampToValueAtTime(freq * 0.8, t0 + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + dur * 0.45);
    g.gain.exponentialRampToValueAtTime(0.0008, t0 + dur);
    o.connect(g).connect(ctx.destination);
    o.start(t0);
    o.stop(t0 + dur + 0.05);
  };

  /** Recurring distant event on a loose, re-randomized timer. */
  const every = (minMs, maxMs, fn) => {
    const tick = () => {
      fn();
      timers.push(scene.time.delayedCall(Phaser.Math.Between(minMs, maxMs), tick));
    };
    timers.push(scene.time.delayedCall(Phaser.Math.Between(minMs, maxMs), tick));
  };

  try {
    if (kind === 'city') {
      // Traffic and weather above the operating theatre.
      bed({ type: 'lowpass', freq: 110, gain: 0.05, lfoHz: 0.07, lfoDepth: 0.018 });
      bed({ type: 'highpass', freq: 4200, gain: 0.014, lfoHz: 0.13, lfoDepth: 0.005 }); // rain
      drone({ freq: 60, gain: 0.022, spread: 0.4 }); // mains hum
      every(7000, 16000, () => clank({ freq: 300 + Math.random() * 200, gain: 0.012, dur: 0.7 }));
    } else if (kind === 'industrial') {
      // The facility's heart still beats.
      drone({ freq: 50, gain: 0.038, type: 'triangle', spread: 0.6 });
      drone({ freq: 100, gain: 0.014, type: 'sine', spread: 0.9 });
      bed({ type: 'lowpass', freq: 80, gain: 0.035 });
      bed({ type: 'bandpass', freq: 900, q: 0.5, gain: 0.016, lfoHz: 0.05, lfoDepth: 0.007 }); // air
      every(3500, 9000, () => clank({ freq: 500 + Math.random() * 500, gain: 0.03 }));
      every(12000, 22000, () => groan({ freq: 34, gain: 0.045, dur: 3.2 }));
    } else if (kind === 'surface') {
      // Wind over a district that is still coming down.
      const wind = bed({ type: 'bandpass', freq: 460, q: 0.6, gain: 0.032, lfoHz: 0.11, lfoDepth: 0.014 });
      // and the wind's centre wanders, slow as weather
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.06;
      const lg = ctx.createGain();
      lg.gain.value = 240;
      lfo.connect(lg).connect(wind.f.frequency);
      lfo.start();
      nodes.push(lfo);
      bed({ type: 'lowpass', freq: 70, gain: 0.026, lfoHz: 0.04, lfoDepth: 0.012 });
      every(8000, 16000, () => groan({ freq: 40, gain: 0.05, dur: 2.8 }));
    }
  } catch (e) {
    /* audio locked or unavailable — the level runs silent, not broken */
  }

  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    timers.forEach((t) => t.remove(false));
    nodes.forEach((n) => {
      try {
        n.stop();
      } catch (e) {
        /* already stopped */
      }
      try {
        n.disconnect();
      } catch (e) {
        /* not a node / already gone */
      }
    });
  });
}
