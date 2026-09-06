// Mechanical guide, collapse score, and impact mix. The collapse score is a
// deliberately unresolved industrial texture: no bright melody, no relaxed
// cadence. WebAudio failure remains cosmetic; subtitles still carry story.

export class AudioGuide {
  constructor(dialogue) {
    this.dialogue = dialogue;
    this._ctx = null;
    this._masterBus = null;
    this._musicBus = null;
    this._sfxBus = null;
    this._collapseScore = null;
    this._collapseIntensity = 0;
    this._collapseAtDoor = false;
    this._collapseBeatTimer = null;
  }

  _ensureContext() {
    if (this._ctx) return this._ctx;
    try {
      const Ctx = window.AudioContext ?? window.webkitAudioContext;
      this._ctx = Ctx ? new Ctx() : null;
      if (!this._ctx) return null;
      const compressor = this._ctx.createDynamicsCompressor();
      compressor.threshold.value = -9;
      compressor.knee.value = 7;
      compressor.ratio.value = 8;
      compressor.attack.value = 0.004;
      compressor.release.value = 0.24;
      this._masterBus = this._ctx.createGain();
      this._masterBus.gain.value = 0.80;
      this._musicBus = this._ctx.createGain();
      this._musicBus.gain.value = 0.0001;
      this._sfxBus = this._ctx.createGain();
      this._sfxBus.gain.value = 0.9;
      this._musicBus.connect(this._masterBus);
      this._sfxBus.connect(this._masterBus);
      this._masterBus.connect(compressor).connect(this._ctx.destination);
    } catch {
      this._ctx = null;
    }
    return this._ctx;
  }

  resume() {
    const ctx = this._ensureContext();
    if (!ctx) return;
    ctx.resume?.().catch?.(() => {});
  }

  _click(frequency = 880, duration = 0.06, when = 0, gainValue = 0.12) {
    const ctx = this._ensureContext();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = frequency < 130 ? 'sawtooth' : 'sine';
      osc.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + when);
      gain.gain.exponentialRampToValueAtTime(gainValue, ctx.currentTime + when + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + when + duration);
      osc.connect(gain).connect(this._sfxBus ?? ctx.destination);
      osc.start(ctx.currentTime + when);
      osc.stop(ctx.currentTime + when + duration + 0.02);
    } catch {
      /* audio is cosmetic */
    }
  }

  _noiseBurst({ duration = 0.4, when = 0, gainValue = 0.035, cutoff = 850, filterType = 'lowpass' } = {}) {
    const ctx = this._ensureContext();
    if (!ctx) return;
    try {
      const frameCount = Math.max(1, Math.floor(ctx.sampleRate * duration));
      const buffer = ctx.createBuffer(1, frameCount, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < frameCount; i += 1) {
        const envelope = 1 - i / frameCount;
        data[i] = (Math.random() * 2 - 1) * envelope;
      }
      const source = ctx.createBufferSource();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      filter.type = filterType;
      filter.frequency.value = cutoff;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + when);
      gain.gain.linearRampToValueAtTime(gainValue, ctx.currentTime + when + 0.018);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + when + duration);
      source.buffer = buffer;
      source.connect(filter).connect(gain).connect(this._sfxBus ?? ctx.destination);
      source.start(ctx.currentTime + when);
    } catch {
      /* audio is cosmetic */
    }
  }

  startCollapseScore() {
    if (this._collapseScore) return;
    const ctx = this._ensureContext();
    if (!ctx) return;
    this.resume();
    try {
      const lowBus = ctx.createGain();
      const pulseBus = ctx.createGain();
      const pressureBus = ctx.createGain();
      const rumbleBus = ctx.createGain();
      const heartbeatBus = ctx.createGain();
      lowBus.gain.value = 0.22;
      pulseBus.gain.value = 0.06;
      pressureBus.gain.value = 0.0001;
      rumbleBus.gain.value = 0.08;
      heartbeatBus.gain.value = 0.11;
      lowBus.connect(this._musicBus);
      pulseBus.connect(this._musicBus);
      pressureBus.connect(this._musicBus);
      rumbleBus.connect(this._musicBus);
      heartbeatBus.connect(this._musicBus);

      const lowFilter = ctx.createBiquadFilter();
      lowFilter.type = 'lowpass';
      lowFilter.frequency.value = 175;
      lowFilter.Q.value = 1.75;
      lowFilter.connect(lowBus);
      const drones = [36.71, 38.89, 55].map((frequency, index) => {
        const osc = ctx.createOscillator();
        osc.type = index === 1 ? 'triangle' : 'sawtooth';
        osc.frequency.value = frequency;
        const gain = ctx.createGain();
        gain.gain.value = [0.46, 0.38, 0.16][index];
        osc.connect(gain).connect(lowFilter);
        osc.start();
        return osc;
      });

      const pulse = ctx.createOscillator();
      pulse.type = 'square';
      pulse.frequency.value = 73.42;
      const pulseLfo = ctx.createOscillator();
      pulseLfo.type = 'square';
      pulseLfo.frequency.value = 1.72;
      const pulseDepth = ctx.createGain();
      pulseDepth.gain.value = 0.052;
      pulseLfo.connect(pulseDepth).connect(pulseBus.gain);
      pulse.connect(pulseBus);
      pulse.start();
      pulseLfo.start();

      const pressure = ctx.createOscillator();
      pressure.type = 'sawtooth';
      pressure.frequency.value = 146.83;
      const pressureFilter = ctx.createBiquadFilter();
      pressureFilter.type = 'bandpass';
      pressureFilter.frequency.value = 310;
      pressureFilter.Q.value = 5.8;
      pressure.connect(pressureFilter).connect(pressureBus);
      pressure.start();

      // Continuous filtered structure rumble makes the cue read as a score bed
      // rather than an occasional alarm layered over silence.
      const frameCount = ctx.sampleRate * 2;
      const buffer = ctx.createBuffer(1, frameCount, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < frameCount; i += 1) data[i] = Math.random() * 2 - 1;
      const rumble = ctx.createBufferSource();
      rumble.buffer = buffer;
      rumble.loop = true;
      const rumbleFilter = ctx.createBiquadFilter();
      rumbleFilter.type = 'lowpass';
      rumbleFilter.frequency.value = 115;
      rumbleFilter.Q.value = 2.1;
      rumble.connect(rumbleFilter).connect(rumbleBus);
      rumble.start();

      const tensionFilter = ctx.createBiquadFilter();
      tensionFilter.type = 'bandpass';
      tensionFilter.frequency.value = 520;
      tensionFilter.Q.value = 7;
      tensionFilter.connect(pressureBus);
      const tension = [207.65, 220].map((frequency) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.value = frequency;
        gain.gain.value = 0.045;
        osc.connect(gain).connect(tensionFilter);
        osc.start();
        return osc;
      });

      const now = ctx.currentTime;
      this._musicBus.gain.cancelScheduledValues(now);
      this._musicBus.gain.setValueAtTime(Math.max(0.0001, this._musicBus.gain.value), now);
      this._musicBus.gain.exponentialRampToValueAtTime(0.50, now + 0.8);
      this._collapseScore = {
        drones,
        pulse,
        pulseLfo,
        pressure,
        tension,
        rumble,
        lowBus,
        pulseBus,
        pressureBus,
        rumbleBus,
        heartbeatBus,
        rumbleFilter,
      };
      this.setCollapseIntensity(1, false);
      this._scheduleCollapseBeat();
    } catch {
      this._collapseScore = null;
    }
  }

  _collapseThump(delay, frequency, gainValue) {
    const ctx = this._ctx;
    const score = this._collapseScore;
    if (!ctx || !score) return;
    const start = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(frequency, start);
    osc.frequency.exponentialRampToValueAtTime(frequency * 0.45, start + 0.19);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(gainValue, start + 0.016);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.23);
    osc.connect(gain).connect(score.heartbeatBus);
    osc.start(start);
    osc.stop(start + 0.25);
  }

  _scheduleCollapseBeat() {
    if (!this._collapseScore || !this._ctx) return;
    const pressure = this._collapseIntensity + (this._collapseAtDoor ? 1 : 0);
    this._collapseThump(0, 54 + pressure * 2.5, 0.72 + pressure * 0.08);
    this._collapseThump(0.17, 43 + pressure * 2, 0.54 + pressure * 0.07);
    const interval = Math.max(365, 680 - pressure * 72);
    this._collapseBeatTimer = window.setTimeout(() => this._scheduleCollapseBeat(), interval);
  }

  setCollapseIntensity(zone, atDoor = false) {
    const nextIntensity = Math.max(1, Math.min(3, zone));
    if (nextIntensity === this._collapseIntensity && atDoor === this._collapseAtDoor) return;
    this._collapseIntensity = nextIntensity;
    this._collapseAtDoor = atDoor;
    if (!this._collapseScore || !this._ctx) return;
    const now = this._ctx.currentTime;
    const ramp = (param, value, seconds = 0.7) => {
      param.cancelScheduledValues(now);
      param.setValueAtTime(Math.max(0.0001, param.value), now);
      param.exponentialRampToValueAtTime(Math.max(0.0001, value), now + seconds);
    };
    ramp(this._collapseScore.lowBus.gain, [0, 0.25, 0.34, 0.43][this._collapseIntensity]);
    ramp(this._collapseScore.pulseBus.gain, [0, 0.08, 0.125, 0.18][this._collapseIntensity]);
    ramp(this._collapseScore.pressureBus.gain, atDoor ? 0.17 : [0, 0.026, 0.072, 0.12][this._collapseIntensity]);
    ramp(this._collapseScore.rumbleBus.gain, [0, 0.09, 0.135, 0.19][this._collapseIntensity]);
    ramp(this._collapseScore.heartbeatBus.gain, atDoor ? 0.19 : [0, 0.12, 0.15, 0.18][this._collapseIntensity]);
    this._collapseScore.rumbleFilter.frequency.setTargetAtTime(atDoor ? 185 : 105 + this._collapseIntensity * 18, now, 0.4);
    this._collapseScore.pulseLfo.frequency.setTargetAtTime(atDoor ? 3.25 : 1.55 + this._collapseIntensity * 0.38, now, 0.35);
  }

  stopCollapseScore() {
    if (!this._ctx || !this._collapseScore) return;
    const now = this._ctx.currentTime;
    this._musicBus.gain.cancelScheduledValues(now);
    this._musicBus.gain.setValueAtTime(Math.max(0.0001, this._musicBus.gain.value), now);
    this._musicBus.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
    const score = this._collapseScore;
    window.clearTimeout(this._collapseBeatTimer);
    this._collapseBeatTimer = null;
    window.setTimeout(() => {
      for (const source of [...score.drones, ...score.tension, score.pulse, score.pulseLfo, score.pressure, score.rumble]) {
        try { source.stop(); } catch { /* already stopped */ }
      }
    }, 180);
    this._collapseScore = null;
    this._collapseIntensity = 0;
    this._collapseAtDoor = false;
  }

  receiverClick() {
    this._click(660, 0.05);
    this._click(880, 0.05, 0.09);
  }

  phoneRing() {
    for (let i = 0; i < 8; i += 1) this._click(1180, 0.05, i * 0.09);
  }

  marketPawlRelease() {
    this._click(430 + Math.random() * 24, 0.045);
    this._click(270 + Math.random() * 18, 0.075, 0.055);
  }

  marketCanvasClose() {
    this._noiseBurst({ duration: 1.1, gainValue: 0.045, cutoff: 620 });
    for (let i = 0; i < 7; i += 1) this._click(210 + Math.random() * 26, 0.035, 0.1 + i * 0.13);
    this._click(120, 0.14, 1.03);
  }

  collapseTelegraph({ kind = 'debris', weight = 'medium' } = {}) {
    const heavy = weight === 'heavy';
    this._noiseBurst({ duration: kind === 'hole' ? 0.82 : 0.5, gainValue: heavy ? 0.065 : 0.042, cutoff: kind === 'hole' ? 270 : 480 });
    this._click(kind === 'hole' ? 58 : 76, kind === 'hole' ? 0.42 : 0.25, 0.03, heavy ? 0.18 : 0.13);
    if (kind === 'hole') this._click(116, 0.08, 0.58, 0.14);
  }

  collapseImpact({ metallic = false, weight = 'medium' } = {}) {
    const heavy = weight === 'heavy';
    this._noiseBurst({ duration: heavy ? 0.92 : 0.58, gainValue: heavy ? 0.16 : 0.1, cutoff: metallic ? 1120 : 430 });
    this._click(metallic ? 145 : heavy ? 39 : 58, heavy ? 0.48 : 0.25, 0, heavy ? 0.24 : 0.17);
    if (heavy) this._click(31, 0.62, 0.045, 0.17);
  }

  collapseHoleOpen() {
    this._noiseBurst({ duration: 1.25, gainValue: 0.18, cutoff: 310 });
    this._click(34, 0.85, 0, 0.24);
    this._click(52, 0.6, 0.12, 0.17);
  }

  archiveKeyTurn(index) {
    this._click(310 + index * 18, 0.07);
    this._click(150 + index * 6, 0.09, 0.07);
  }

  sayArchivist(lines, options) {
    const list = Array.isArray(lines) ? lines : [lines];
    this.receiverClick();
    this.dialogue.play(list.map((text) => ({ speaker: 'ARCHIVIST', text })), options);
  }

  sayButch(lines, options) {
    const list = Array.isArray(lines) ? lines : [lines];
    this.dialogue.play(list.map((text) => ({ speaker: 'BUTCH', text })), options);
  }
}
