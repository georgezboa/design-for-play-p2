import { chapter03VoiceAssetFor } from './generated/chapter03VoiceAssets.js';
import { audioFocus } from '../../shared/audioFocus.js';

const dbToGain = (db) => 10 ** (db / 20);

// One reusable media element feeds a dedicated Voice gain bus. Subtitles are
// authoritative, so unavailable or blocked audio always fails silently.
export class Chapter3VoicePlayback {
  constructor({ voiceGainDb = -1, onVoiceStateChange = null } = {}) {
    this.onVoiceStateChange = onVoiceStateChange;
    this.audio = typeof Audio === 'undefined' ? null : new Audio();
    if (this.audio) {
      this.audio.preload = 'auto';
      this.audio.playsInline = true;
      // A direct media-element Voice channel is more reliable in Safari than
      // routing speech through a newly-created, possibly suspended AudioContext.
    }
    this.context = null;
    this.source = null;
    this.voiceBus = null;
    this.voiceGain = dbToGain(voiceGainDb);
    if (this.audio) this.audio.volume = this.voiceGain;
    this.playToken = 0;
    this.pendingRetry = null;
    this.pausedForFocus = false;
    this.unlock = () => this.retryPending();
    if (typeof window !== 'undefined') {
      window.addEventListener('pointerdown', this.unlock, { passive: true });
      window.addEventListener('keydown', this.unlock, { passive: true });
    }
    this.releaseAudioFocus = audioFocus.subscribe({
      pause: () => {
        if (!this.audio || this.audio.paused) return;
        this.pausedForFocus = true;
        this.audio.pause();
        this.onVoiceStateChange?.(false);
      },
      resume: () => {
        if (!this.pausedForFocus || !this.audio?.src) return;
        this.pausedForFocus = false;
        this.onVoiceStateChange?.(true);
        this.audio.play().catch(() => {
          this.pausedForFocus = true;
          this.pendingRetry = { token: this.playToken };
          this.onVoiceStateChange?.(false);
        });
      },
    });
    this.audio?.addEventListener('ended', () => this.onVoiceStateChange?.(false));
    this.audio?.addEventListener('error', () => this.onVoiceStateChange?.(false));
  }

  _ensureGraph() {
    if (this.context || !this.audio) return this.context;
    try {
      const Ctx = window.AudioContext ?? window.webkitAudioContext;
      if (!Ctx) return null;
      this.context = new Ctx();
      this.source = this.context.createMediaElementSource(this.audio);
      this.voiceBus = this.context.createGain();
      this.voiceBus.gain.value = this.voiceGain;
      this.source.connect(this.voiceBus).connect(this.context.destination);
    } catch {
      this.context = null;
    }
    return this.context;
  }

  play({ speaker, text } = {}) {
    this.stop();
    const asset = chapter03VoiceAssetFor(speaker, text);
    if (!asset || !this.audio) return false;
    const token = ++this.playToken;
    this.audio.src = asset.url;
    this.audio.currentTime = 0;
    this.pausedForFocus = false;
    if (!audioFocus.isActive()) {
      this.pendingRetry = { token };
      this.onVoiceStateChange?.(false);
      return true;
    }
    this.onVoiceStateChange?.(true);
    this.audio.play().then(() => {
      if (token === this.playToken) this.pendingRetry = null;
    }).catch(() => {
      if (token !== this.playToken) return;
      // Automatically-triggered dialogue can be rejected by autoplay policy.
      // Keep only the current subtitle armed and retry it on the next gesture.
      this.pendingRetry = { token };
      this.onVoiceStateChange?.(false);
    });
    return true;
  }

  retryPending() {
    const pending = this.pendingRetry;
    if (!pending || !this.audio || pending.token !== this.playToken) return;
    this.onVoiceStateChange?.(true);
    this.audio.play().then(() => {
      if (pending.token === this.playToken) this.pendingRetry = null;
    }).catch(() => this.onVoiceStateChange?.(false));
  }

  stop() {
    if (!this.audio) return;
    this.playToken += 1;
    this.pendingRetry = null;
    this.pausedForFocus = false;
    this.audio.pause();
    if (Number.isFinite(this.audio.duration)) this.audio.currentTime = 0;
    this.onVoiceStateChange?.(false);
  }
}
