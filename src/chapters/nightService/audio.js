// Synthesised sound for NIGHT SERVICE: punch clack, paper, drag whoosh, link
// chime, the bell with a long decay, door, stool, and a low rail-clack bed.
// Everything runs through one SFX bus whose gain follows the player's
// Master × SFX settings (volumeForChannel), and an optional quiet music loop
// uses the Music channel. Nothing plays until the first user gesture.

import { DEFAULT_SETTINGS, volumeForChannel } from '../../shell/saveSystem.js';

const MUSIC_SRC = '/assets/music/ch1/1.1_train_undertow.mp3';

export function createNightServiceAudio({ music = true } = {}) {
  let ctx = null;
  let bus = null;
  let ambience = null;
  let musicEl = null;
  let unlocked = false;
  const settings = () => globalThis.NIGHTFALL_SETTINGS ?? DEFAULT_SETTINGS;

  function ensure() {
    if (ctx) return ctx;
    const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    bus = ctx.createGain();
    bus.gain.value = volumeForChannel(settings(), 'sfx');
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 3;
    bus.connect(comp);
    comp.connect(ctx.destination);
    return ctx;
  }

  function syncVolume(next = settings()) {
    if (bus && ctx) bus.gain.setTargetAtTime(volumeForChannel(next, 'sfx'), ctx.currentTime, 0.05);
    if (musicEl) musicEl.volume = Math.min(1, volumeForChannel(next, 'music') * 0.32);
  }

  function unlock() {
    if (unlocked) return;
    const c = ensure();
    if (!c) return;
    unlocked = true;
    c.resume?.().catch(() => {});
    startAmbience();
    if (music && typeof Audio !== 'undefined') {
      musicEl = new Audio(MUSIC_SRC);
      musicEl.loop = true;
      musicEl.dataset.nightfallAudioChannel = 'music';
      syncVolume();
      musicEl.play().catch(() => {});
    }
  }

  const now = () => ctx.currentTime;

  function noiseBuffer(seconds = 1) {
    const length = Math.floor(ctx.sampleRate * seconds);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
    return buffer;
  }
  let sharedNoise = null;
  const noise = () => (sharedNoise ??= noiseBuffer(2));

  function envGain(t0, attack, peak, decay) {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak), t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + attack + decay);
    return g;
  }

  function tone(freq, { type = 'sine', t = 0, attack = 0.005, peak = 0.2, decay = 0.3, to = null, dest = bus } = {}) {
    const t0 = now() + t;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (to) osc.frequency.exponentialRampToValueAtTime(to, t0 + attack + decay);
    const g = envGain(t0, attack, peak, decay);
    osc.connect(g);
    g.connect(dest);
    osc.start(t0);
    osc.stop(t0 + attack + decay + 0.05);
  }

  function burst({ t = 0, dur = 0.08, peak = 0.3, filter = 'bandpass', freq = 2000, q = 1, to = null, attack = 0.002, dest = bus } = {}) {
    const t0 = now() + t;
    const src = ctx.createBufferSource();
    src.buffer = noise();
    const f = ctx.createBiquadFilter();
    f.type = filter;
    f.frequency.setValueAtTime(freq, t0);
    if (to) f.frequency.exponentialRampToValueAtTime(to, t0 + dur);
    f.Q.value = q;
    const g = envGain(t0, attack, peak, dur);
    src.connect(f);
    f.connect(g);
    g.connect(dest);
    src.start(t0, Math.random());
    src.stop(t0 + attack + dur + 0.05);
  }

  const SOUNDS = {
    clack() { burst({ dur: 0.05, peak: 0.55, freq: 3200, q: 2 }); tone(180, { type: 'triangle', peak: 0.3, decay: 0.09, to: 90 }); burst({ t: 0.06, dur: 0.04, peak: 0.25, freq: 1800, q: 3 }); },
    paper() { burst({ dur: 0.16, peak: 0.16, filter: 'highpass', freq: 2500, q: 0.6 }); burst({ t: 0.08, dur: 0.12, peak: 0.1, filter: 'bandpass', freq: 4200, q: 0.8 }); },
    whoosh() { burst({ dur: 0.32, peak: 0.14, freq: 500, to: 1800, q: 0.9, attack: 0.08 }); },
    lift() { burst({ dur: 0.14, peak: 0.1, freq: 900, to: 1600, q: 1 }); tone(330, { type: 'sine', peak: 0.04, decay: 0.15 }); },
    settle() { tone(110, { type: 'triangle', peak: 0.18, decay: 0.12, to: 70 }); burst({ dur: 0.05, peak: 0.12, freq: 800, q: 1 }); },
    chime() { [880, 1320, 1760].forEach((f, i) => tone(f, { t: i * 0.07, peak: 0.08, decay: 1.1, type: 'sine' })); },
    mismatch() { tone(196, { type: 'triangle', peak: 0.07, decay: 0.22 }); tone(185, { type: 'triangle', t: 0.08, peak: 0.05, decay: 0.2 }); },
    zoomIn() { burst({ dur: 0.4, peak: 0.1, freq: 300, to: 1400, q: 0.8, attack: 0.1 }); tone(220, { peak: 0.04, decay: 0.4, to: 440 }); },
    zoomOut() { burst({ dur: 0.4, peak: 0.1, freq: 1400, to: 300, q: 0.8, attack: 0.1 }); tone(440, { peak: 0.04, decay: 0.4, to: 220 }); },
    rattle() { for (let i = 0; i < 4; i += 1) { burst({ t: i * 0.07, dur: 0.04, peak: 0.25, freq: 1400 + i * 120, q: 4 }); tone(90, { type: 'square', t: i * 0.07, peak: 0.05, decay: 0.05 }); } },
    stool() { tone(140, { type: 'triangle', peak: 0.12, decay: 0.18, to: 110 }); burst({ dur: 0.1, peak: 0.08, freq: 600, q: 2 }); },
    door() { tone(160, { type: 'sawtooth', peak: 0.03, decay: 0.9, to: 120, attack: 0.2 }); burst({ dur: 0.9, peak: 0.05, freq: 700, to: 400, q: 6, attack: 0.3 }); burst({ t: 0.95, dur: 0.1, peak: 0.25, freq: 900, q: 1 }); },
    ticket() { for (let i = 0; i < 5; i += 1) burst({ t: i * 0.12, dur: 0.05, peak: 0.08, filter: 'highpass', freq: 3000 + i * 300, q: 0.5 }); },
    step() { burst({ dur: 0.04, peak: 0.07, freq: 400, q: 1.2 }); },
    type() { burst({ dur: 0.018, peak: 0.05, freq: 3500, q: 3 }); },
    glint() { tone(1760, { peak: 0.03, decay: 0.4 }); tone(2637, { t: 0.05, peak: 0.02, decay: 0.35 }); },
    bell() {
      // struck bell: inharmonic partials with long decays
      [[392, 0.34, 4.5], [784, 0.14, 3.2], [941, 0.1, 2.6], [1176, 0.07, 2.2], [1568, 0.05, 1.6], [2090, 0.03, 1.1], [196, 0.12, 5]].forEach(([f, p, d]) => tone(f, { peak: p, decay: d, attack: 0.004 }));
      burst({ dur: 0.05, peak: 0.2, freq: 2400, q: 1 });
    },
    stone() { [523, 784, 1046, 1568].forEach((f, i) => tone(f, { t: i * 0.09, peak: 0.07, decay: 1.4 })); },
  };

  function play(name) {
    if (!unlocked || !ctx || globalThis.NIGHTFALL_PAUSED) return;
    SOUNDS[name]?.();
  }

  // Low rail clack: two soft thumps every ~1.1 s under a filtered rumble.
  function startAmbience() {
    if (ambience || !ctx) return;
    const rumbleSrc = ctx.createBufferSource();
    rumbleSrc.buffer = noise();
    rumbleSrc.loop = true;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 140;
    const g = ctx.createGain();
    g.gain.value = 0.05;
    rumbleSrc.connect(lp);
    lp.connect(g);
    g.connect(bus);
    rumbleSrc.start();
    let timer = 0;
    let rate = 1;
    const clack = () => {
      if (!globalThis.NIGHTFALL_PAUSED && ctx.state === 'running') {
        tone(70, { type: 'triangle', peak: 0.08 * rate, decay: 0.08, to: 50 });
        burst({ dur: 0.03, peak: 0.05 * rate, freq: 900, q: 2 });
        tone(72, { type: 'triangle', t: 0.16, peak: 0.07 * rate, decay: 0.08, to: 50 });
        burst({ t: 0.16, dur: 0.03, peak: 0.04 * rate, freq: 950, q: 2 });
      }
      timer = setTimeout(clack, (1100 + Math.random() * 120) / Math.max(0.3, rate));
    };
    timer = setTimeout(clack, 700);
    ambience = {
      stop() { clearTimeout(timer); try { rumbleSrc.stop(); } catch { /* already stopped */ } },
      setRate(next) { rate = next; g.gain.setTargetAtTime(0.05 * next, ctx.currentTime, 0.4); },
    };
  }

  const onSettings = (event) => syncVolume(event.detail);
  globalThis.addEventListener?.('nightfall:settings', onSettings);

  return {
    unlock,
    play,
    setRailRate: (rate) => ambience?.setRate(rate),
    get unlocked() { return unlocked; },
    destroy() {
      ambience?.stop();
      ambience = null;
      musicEl?.pause();
      globalThis.removeEventListener?.('nightfall:settings', onSettings);
    },
  };
}
