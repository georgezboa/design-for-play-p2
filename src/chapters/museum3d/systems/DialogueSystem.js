import { chapter05VoiceAssetFor } from '../generated/chapter05VoiceAssets.js';
import { VoicePlayback } from './VoicePlayback.js';

// Subtitle dialogue queue. Lines stay on screen long enough to read at normal
// speaking speed (acceptance §6); E/Enter advances early while Space jumps.

export class DialogueSystem {
  constructor(subtitleEl) {
    this.el = subtitleEl;
    this._queue = [];
    this._current = null;
    this._timer = 0;
    this._onComplete = null;
    this._choice = null;
    this._choiceTimer = 0;
    this.voice = new VoicePlayback({ assetFor: chapter05VoiceAssetFor });
  }

  // lines: [{ speaker, text }] — speaker may be null for narration.
  play(lines, { onComplete = null } = {}) {
    this._queue.push(...lines);
    if (onComplete) this._onComplete = onComplete;
    if (!this._current) this._next();
  }

  get isPlaying() {
    return this._current !== null || this._queue.length > 0 || this._choice !== null;
  }

  get isChoosing() {
    return this._choice !== null;
  }

  get choiceState() {
    if (!this._choice) return null;
    return {
      prompt: this._choice.prompt,
      options: this._choice.options.map((option) => option.label),
      secondsRemaining: Number(this._choiceTimer.toFixed(1)),
    };
  }

  get currentLine() {
    if (this._choice) return { speaker: 'BUTCH', text: this._choice.prompt };
    if (!this._current) return null;
    return { speaker: this._current.speaker ?? null, text: this._current.text };
  }

  _next() {
    this.voice.stop();
    this._current = this._queue.shift() ?? null;
    if (!this._current) {
      this.el.style.display = 'none';
      const done = this._onComplete;
      this._onComplete = null;
      if (done) done();
      return;
    }
    const { speaker, text } = this._current;
    this.el.innerHTML = speaker
      ? `<span class="speaker">${speaker}:</span> ${text}`
      : text;
    this.el.style.display = 'block';
    // ~55 ms per character, clamped to [2.4s, 9s].
    this._timer = Math.min(9, Math.max(2.4, text.length * 0.055));
    const current = this._current;
    this.voice.play(current, {
      onDuration: (duration) => {
        if (this._current === current) this._timer = Math.max(this._timer, duration + 0.35);
      },
    });
  }

  advance() {
    if (this._choice) return;
    if (this._current) this._next();
  }

  // A lightweight Firewatch-style response. Walking remains enabled. The
  // player can press 1/2 or simply stay quiet; silence is a valid response and
  // automatically closes the radio exchange after the reading window.
  offerChoice({ prompt = 'Reply?', options, timeout = 12, silenceLines = [] }) {
    if (!Array.isArray(options) || options.length === 0) return false;
    this._choice = { prompt, options, silenceLines };
    this._choiceTimer = timeout;
    this._renderChoice();
    return true;
  }

  _renderChoice() {
    if (!this._choice) return;
    const options = this._choice.options
      .map((option, index) => `<span class="dialogue-choice"><b>${index + 1}</b> ${option.label}</span>`)
      .join('');
    this.el.innerHTML = `<span class="speaker">BUTCH:</span> ${this._choice.prompt}<span class="dialogue-choices">${options}<span class="dialogue-silence">or keep walking</span></span>`;
    this.el.style.display = 'block';
  }

  choose(index) {
    if (!this._choice) return false;
    const option = this._choice.options[index];
    if (!option) return false;
    const lines = option.lines ?? [];
    const action = option.action;
    this._choice = null;
    this._choiceTimer = 0;
    this.el.style.display = 'none';
    if (action) action();
    if (lines.length) this.play(lines);
    return true;
  }

  _chooseSilence() {
    if (!this._choice) return;
    const lines = this._choice.silenceLines ?? [];
    this._choice = null;
    this._choiceTimer = 0;
    this.el.style.display = 'none';
    if (lines.length) this.play(lines);
  }

  update(dt) {
    if (this._choice) {
      this._choiceTimer -= dt;
      if (this._choiceTimer <= 0) this._chooseSilence();
      return;
    }
    if (!this._current) return;
    this._timer -= dt;
    if (this._timer <= 0) this._next();
  }

  clear() {
    this.voice.stop();
    this._queue.length = 0;
    this._current = null;
    this._onComplete = null;
    this._choice = null;
    this._choiceTimer = 0;
    this.el.style.display = 'none';
  }
}
