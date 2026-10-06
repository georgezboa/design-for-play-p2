// The cutscenes' small sound kit, synthesised with WebAudio the way
// Chapter 1's audio.js makes its sounds: rail rumble (a bed with the
// double clack of the joints), a bell, a ticket punch, paper, and rain (a
// bed). One bus follows Master × SFX (volumeForChannel); pause() suspends the
// context, so the beds stop with the picture. Nothing here throws: a browser
// without WebAudio plays the cutscene in silence.

import { DEFAULT_SETTINGS, volumeForChannel } from '../saveSystem.js';

export const SFX_NAMES = Object.freeze(['rail', 'rain', 'bell', 'softBell', 'punch', 'paper', 'thud', 'whistle', 'brake']);
const BEDS = new Set(['rail', 'rain']);

export function createCutsceneSfx() {
  let ctx = null;
  let bus = null;
  let noiseBuf = null;
  const beds = new Map();
  let closed = false;
  const settings = () => globalThis.NIGHTFALL_SETTINGS ?? DEFAULT_SETTINGS;

  function ensure() {
    if (ctx || closed) return ctx;
    const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AC) return null;
    try {
      ctx = new AC();
      bus = ctx.createGain();
      bus.gain.value = volumeForChannel(settings(), 'sfx');
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -16;
      comp.ratio.value = 3;
      bus.connect(comp);
      comp.connect(ctx.destination);
      ctx.resume?.().catch(() => {});
    } catch {
      ctx = null;
    }
    return ctx;
  }

  const noise = () => {
    if (noiseBuf) return noiseBuf;
    const length = Math.floor(ctx.sampleRate * 2);
    noiseBuf = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
    return noiseBuf;
  };

  function env(t0, attack, peak, decay) {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak), t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + attack + decay);
    return g;
  }

  function tone(freq, { type = 'sine', t = 0, attack = 0.005, peak = 0.2, decay = 0.3, to = null } = {}) {
    const t0 = ctx.currentTime + t;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (to) osc.frequency.exponentialRampToValueAtTime(to, t0 + attack + decay);
    const g = env(t0, attack, peak, decay);
    osc.connect(g).connect(bus);
    osc.start(t0);
    osc.stop(t0 + attack + decay + 0.05);
  }

  function burst({ t = 0, dur = 0.08, peak = 0.3, filter = 'bandpass', freq = 2000, q = 1, to = null, attack = 0.002 } = {}) {
    const t0 = ctx.currentTime + t;
    const src = ctx.createBufferSource();
    src.buffer = noise();
    const f = ctx.createBiquadFilter();
    f.type = filter;
    f.frequency.setValueAtTime(freq, t0);
    if (to) f.frequency.exponentialRampToValueAtTime(to, t0 + dur);
    f.Q.value = q;
    const g = env(t0, attack, peak, dur);
    src.connect(f).connect(g).connect(bus);
    src.start(t0, Math.random());
    src.stop(t0 + attack + dur + 0.05);
  }

  const ONE_SHOTS = {
    bell() {
      [[392, 0.3, 4.2], [784, 0.12, 3], [941, 0.08, 2.4], [1176, 0.06, 2], [1568, 0.04, 1.4], [196, 0.1, 4.6]].forEach(([f, p, d]) => tone(f, { peak: p, decay: d, attack: 0.004 }));
      burst({ dur: 0.05, peak: 0.16, freq: 2400, q: 1 });
    },
    softBell() {
      [[784, 0.06, 2.4], [1568, 0.025, 1.6], [1176, 0.02, 1.8], [392, 0.03, 2.8]].forEach(([f, p, d]) => tone(f, { peak: p, decay: d, attack: 0.004 }));
    },
    punch() {
      burst({ dur: 0.05, peak: 0.5, freq: 3200, q: 2 });
      tone(180, { type: 'triangle', peak: 0.28, decay: 0.09, to: 90 });
      burst({ t: 0.06, dur: 0.04, peak: 0.22, freq: 1800, q: 3 });
    },
    paper() {
      burst({ dur: 0.16, peak: 0.14, filter: 'highpass', freq: 2500, q: 0.6 });
      burst({ t: 0.08, dur: 0.12, peak: 0.09, filter: 'bandpass', freq: 4200, q: 0.8 });
    },
    thud() { tone(90, { type: 'triangle', peak: 0.3, decay: 0.25, to: 50 }); burst({ dur: 0.12, peak: 0.2, freq: 400, q: 1 }); },
    whistle() { [740, 988].forEach((f) => tone(f, { type: 'triangle', peak: 0.05, decay: 1.3, attack: 0.08 })); },
    brake() { burst({ dur: 1.6, peak: 0.06, filter: 'bandpass', freq: 3400, to: 1800, q: 12, attack: 0.3 }); },
  };

  function startBed(name, { level = 1 } = {}) {
    if (beds.has(name)) { beds.get(name).level(level); return; }
    const src = ctx.createBufferSource();
    src.buffer = noise();
    src.loop = true;
    const f = ctx.createBiquadFilter();
    const g = ctx.createGain();
    g.gain.value = 0.0001;
    let timer = 0;
    let gainLevel = 0;
    if (name === 'rail') {
      f.type = 'lowpass';
      f.frequency.value = 150;
      gainLevel = 0.07;
      // the joints: two soft thumps every ~1.1 s
      const clack = () => {
        if (!closed && ctx.state === 'running') {
          tone(70, { type: 'triangle', peak: 0.08 * level, decay: 0.08, to: 50 });
          burst({ dur: 0.03, peak: 0.05 * level, freq: 900, q: 2 });
          tone(72, { type: 'triangle', t: 0.16, peak: 0.07 * level, decay: 0.08, to: 50 });
          burst({ t: 0.16, dur: 0.03, peak: 0.04 * level, freq: 950, q: 2 });
        }
        timer = setTimeout(clack, 1080 + Math.random() * 140);
      };
      timer = setTimeout(clack, 500);
    } else {
      f.type = 'bandpass';
      f.frequency.value = 5200;
      f.Q.value = 0.45;
      gainLevel = 0.05;
    }
    src.connect(f).connect(g).connect(bus);
    src.start();
    g.gain.setTargetAtTime(gainLevel * level, ctx.currentTime, 0.6);
    beds.set(name, {
      level(next) { level = next; g.gain.setTargetAtTime(gainLevel * next, ctx.currentTime, 0.6); },
      stop(fade = 0.8) {
        clearTimeout(timer);
        try {
          g.gain.setTargetAtTime(0.0001, ctx.currentTime, fade / 3);
          src.stop(ctx.currentTime + fade + 0.1);
        } catch { /* already stopped */ }
      },
    });
  }

  const onSettings = (event) => {
    if (bus && ctx) bus.gain.setTargetAtTime(volumeForChannel(event?.detail ?? settings(), 'sfx'), ctx.currentTime, 0.05);
  };
  globalThis.addEventListener?.('nightfall:settings', onSettings);

  return {
    /** Play a one-shot, or start / re-level a bed ('rail', 'rain'). */
    play(name, options = {}) {
      if (closed || !ensure()) return;
      try {
        if (BEDS.has(name)) startBed(name, options);
        else ONE_SHOTS[name]?.();
      } catch { /* a sound must never stop the picture */ }
    },
    stop(name, fade) { beds.get(name)?.stop(fade); beds.delete(name); },
    pause() { ctx?.suspend?.().catch(() => {}); },
    resume() { if (!closed) ctx?.resume?.().catch(() => {}); },
    close() {
      if (closed) return;
      [...beds.keys()].forEach((name) => this.stop(name, 0.6));
      closed = true;
      globalThis.removeEventListener?.('nightfall:settings', onSettings);
      const context = ctx;
      setTimeout(() => context?.close?.().catch(() => {}), 1200);
    },
  };
}
