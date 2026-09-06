// Runtime dialogue voice player. The subtitle remains authoritative: missing,
// blocked, or failed audio never prevents dialogue from advancing.

const dbToGain = (db) => 10 ** (db / 20);

export class VoicePlayback {
  constructor({ assetFor, voiceGainDb = -1, onVoiceStateChange = null }) {
    this.assetFor = assetFor;
    this.onVoiceStateChange = onVoiceStateChange;
    this.audio = typeof Audio === 'undefined' ? null : new Audio();
    if (this.audio) {
      this.audio.preload = 'metadata';
      this.audio.playsInline = true;
    }
    this._ctx = null;
    this._source = null;
    this._highpass = null;
    this._lowpass = null;
    this._voiceBus = null;
    this._voiceGain = dbToGain(voiceGainDb);
    this._token = 0;
    this.audio?.addEventListener('ended', () => this._setActive(false));
    this.audio?.addEventListener('error', () => this._setActive(false));
  }

  _setActive(active) {
    this.onVoiceStateChange?.(active);
  }

  _ensureGraph() {
    if (this._ctx) return this._ctx;
    try {
      const Ctx = window.AudioContext ?? window.webkitAudioContext;
      if (!Ctx) return null;
      this._ctx = new Ctx();
      this._source = this._ctx.createMediaElementSource(this.audio);
      this._highpass = this._ctx.createBiquadFilter();
      this._highpass.type = 'highpass';
      this._lowpass = this._ctx.createBiquadFilter();
      this._lowpass.type = 'lowpass';
      this._voiceBus = this._ctx.createGain();
      this._voiceBus.gain.value = this._voiceGain;
      this._source.connect(this._highpass).connect(this._lowpass).connect(this._voiceBus).connect(this._ctx.destination);
      return this._ctx;
    } catch {
      this._ctx = null;
      return null;
    }
  }

  _setReceiverTreatment(active) {
    if (!this._highpass || !this._lowpass) return;
    const now = this._ctx.currentTime;
    this._highpass.frequency.setValueAtTime(active ? 280 : 20, now);
    this._lowpass.frequency.setValueAtTime(active ? 4200 : 20000, now);
  }

  play({ speaker, text }, { onDuration = null } = {}) {
    const asset = this.assetFor?.(speaker, text);
    this.stop();
    if (!asset || !this.audio) return false;
    const token = ++this._token;
    const ctx = this._ensureGraph();
    this._setReceiverTreatment(speaker === 'ARCHIVIST');
    this.audio.src = asset.url;
    this.audio.currentTime = 0;
    this.audio.onloadedmetadata = () => {
      if (token === this._token && Number.isFinite(this.audio.duration)) onDuration?.(this.audio.duration);
    };
    ctx?.resume?.().catch(() => {});
    this._setActive(true);
    this.audio.play().catch(() => this._setActive(false));
    return true;
  }

  stop() {
    this._token += 1;
    if (!this.audio) return;
    this.audio.pause();
    if (Number.isFinite(this.audio.duration)) this.audio.currentTime = 0;
    this.audio.onloadedmetadata = null;
    this._setActive(false);
  }
}
