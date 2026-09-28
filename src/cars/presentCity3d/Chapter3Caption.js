import { Chapter3VoicePlayback } from './Chapter3VoicePlayback.js';

// Chapter 3 dialogue in the shared caption bar (src/shell/uiKit.css
// .nf-caption): speaker in amber Space Mono, the line in Georgia, choices as
// brass-edged buttons. It replaces the old 470 px right-hand panel so the
// speaker stays visible in the frame above it.
//
// API kept from the old controller: show / update / handleAdvance / choose /
// close / snapshot / setAdvanceLocked. `bark()` shows a short non-blocking
// line (walking talk) that clears itself.

const INTERFACE_SPEAKERS = new Set(['CHOOSE', 'NARRATION', 'SYSTEM', '']);

function el(tag, className) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  return node;
}

export class Chapter3DialogueController {
  constructor({ root = null } = {}) {
    this.root = root || el('section', 'nf-caption');
    this.root.classList.add('nf-caption', 'c3-caption');
    this.root.setAttribute('aria-live', 'polite');
    this.root.setAttribute('aria-label', 'Dialogue');
    this.speakerElement = el('p', 'nf-caption__speaker');
    this.textElement = el('p', 'nf-caption__text');
    this.choicesElement = el('div', 'nf-caption__choices');
    this.nextElement = el('span', 'nf-caption__next');
    this.nextElement.textContent = '▾';
    this.nextElement.setAttribute('aria-hidden', 'true');
    this.root.replaceChildren(this.speakerElement, this.textElement, this.choicesElement, this.nextElement);
    this.root.hidden = true;
    if (!this.root.isConnected && typeof document !== 'undefined') document.body.append(this.root);
    this.lines = [];
    this.index = 0;
    this.visibleCharacters = 0;
    this.charactersPerSecond = 46;
    this.onComplete = null;
    this.onChoice = null;
    this.onLineChange = null;
    this.notifiedLine = null;
    this.advanceLocked = false;
    this.active = false;
    this.barkRemaining = 0;
    this.voice = new Chapter3VoicePlayback();
    this.root.addEventListener('pointerup', (event) => {
      event.stopPropagation();
      if (event.target.closest?.('.nf-caption__choice')) return;
      this.handleAdvance();
    });
    this.onKey = (event) => {
      if (!this.active) return;
      const line = this.currentLine();
      const choices = this.isLineComplete() ? line?.choices ?? [] : [];
      const digit = Number(event.key);
      if (choices.length && digit >= 1 && digit <= choices.length) {
        event.preventDefault();
        this.choose(choices[digit - 1].id);
      }
    };
    if (typeof window !== 'undefined') window.addEventListener('keydown', this.onKey);
  }

  show(lines, { onComplete = null, onChoice = null, onLineChange = null } = {}) {
    this.voice.stop();
    this.barkRemaining = 0;
    this.lines = lines.map((line) => ({ ...line, choices: line.choices?.map((choice) => ({ ...choice })) }));
    this.index = 0;
    this.visibleCharacters = 0;
    this.onComplete = onComplete;
    this.onChoice = onChoice;
    this.onLineChange = onLineChange;
    this.notifiedLine = null;
    this.active = true;
    this.root.hidden = false;
    this.root.classList.remove('is-bark');
    this.render();
  }

  // A one-line caption that does not take input or pause the walk.
  bark(line, seconds = 3.6) {
    if (this.active) return false;
    this.voice.stop();
    this.root.hidden = false;
    this.root.classList.add('is-bark');
    this.speakerElement.textContent = line.speaker || '';
    this.textElement.textContent = line.text;
    this.choicesElement.replaceChildren();
    this.nextElement.hidden = true;
    this.barkRemaining = seconds;
    this.voice.play(line);
    return true;
  }

  currentLine() {
    return this.lines[this.index] || null;
  }

  isLineComplete() {
    const line = this.currentLine();
    return !line || this.visibleCharacters >= line.text.length;
  }

  update(dt) {
    if (!this.active && this.barkRemaining > 0) {
      this.barkRemaining = Math.max(0, this.barkRemaining - dt);
      if (this.barkRemaining === 0) {
        this.root.hidden = true;
        this.root.classList.remove('is-bark');
      }
      return;
    }
    if (!this.active || this.isLineComplete()) return;
    this.visibleCharacters = Math.min(
      this.currentLine().text.length,
      this.visibleCharacters + dt * this.charactersPerSecond,
    );
    this.render();
  }

  reveal() {
    const line = this.currentLine();
    if (!line) return;
    this.visibleCharacters = line.text.length;
    this.render();
  }

  handleAdvance() {
    if (!this.active || this.advanceLocked) return;
    if (!this.isLineComplete()) {
      this.reveal();
      return;
    }
    if (this.currentLine()?.choices?.length) return;
    this.voice.stop();
    this.index += 1;
    if (this.index >= this.lines.length) {
      this.close();
      return;
    }
    this.visibleCharacters = 0;
    this.render();
  }

  choose(choiceId) {
    const line = this.currentLine();
    if (!line?.choices?.some((choice) => choice.id === choiceId)) return;
    this.voice.stop();
    const continuation = this.onChoice?.(choiceId) || [];
    line.choices = [];
    this.lines.splice(this.index + 1, 0, ...continuation.map((entry) => ({ ...entry, choices: entry.choices?.map((choice) => ({ ...choice })) })));
    this.index += 1;
    this.visibleCharacters = 0;
    if (this.index >= this.lines.length) {
      this.close();
      return;
    }
    this.render();
  }

  close() {
    this.voice.stop();
    const complete = this.onComplete;
    this.active = false;
    this.lines = [];
    this.onLineChange = null;
    this.notifiedLine = null;
    this.advanceLocked = false;
    this.root.hidden = true;
    this.root.classList.remove('is-locked', 'is-interface', 'is-choice');
    this.choicesElement.replaceChildren();
    this.textElement.textContent = '';
    complete?.();
  }

  render() {
    const line = this.currentLine();
    if (!line) return;
    if (line !== this.notifiedLine) {
      this.notifiedLine = line;
      this.voice.play(line);
      this.onLineChange?.(line, this.index);
    }
    const speaker = line.speaker || '';
    const complete = this.isLineComplete();
    this.root.classList.toggle('is-interface', INTERFACE_SPEAKERS.has(speaker));
    this.root.classList.toggle('is-choice', speaker === 'CHOOSE');
    this.root.classList.toggle('is-locked', this.advanceLocked);
    this.speakerElement.textContent = speaker === 'CHOOSE' ? '' : speaker;
    this.speakerElement.hidden = speaker === 'CHOOSE' || speaker === '';
    this.textElement.textContent = line.text.slice(0, Math.floor(this.visibleCharacters));
    this.choicesElement.replaceChildren();
    if (complete && line.choices?.length) {
      line.choices.forEach((choice, index) => {
        const button = el('button', 'nf-caption__choice');
        button.type = 'button';
        button.dataset.choice = choice.id;
        button.textContent = `${index + 1} · ${choice.label}`;
        button.addEventListener('pointerup', (event) => {
          event.stopPropagation();
          this.choose(choice.id);
        });
        this.choicesElement.append(button);
      });
    }
    this.nextElement.hidden = !complete || Boolean(line.choices?.length) || this.advanceLocked;
  }

  snapshot() {
    const line = this.currentLine();
    return {
      active: this.active,
      speaker: line?.speaker || null,
      fullText: line?.text || null,
      visibleText: line?.text.slice(0, Math.floor(this.visibleCharacters)) || null,
      lineComplete: this.isLineComplete(),
      advanceLocked: this.advanceLocked,
      choices: line?.choices?.map((choice) => choice.id) || [],
      bark: !this.active && this.barkRemaining > 0 ? this.textElement.textContent : null,
    };
  }

  setAdvanceLocked(locked) {
    this.advanceLocked = Boolean(locked);
    if (this.active) this.render();
  }
}
