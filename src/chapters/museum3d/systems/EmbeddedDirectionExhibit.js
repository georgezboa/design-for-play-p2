import { directionDefinition, isDirectionPlayable } from '../directions/directionRegistry.js';

export class EmbeddedDirectionExhibit {
  constructor({ root, iframe, closeButton, titleEl, statusEl, translationRoot = null, modeEl = null, copyEl = null, beginButton = null, progress, onOpen, onClose }) {
    this.root = root;
    this.iframe = iframe;
    this.closeButton = closeButton;
    this.titleEl = titleEl;
    this.statusEl = statusEl;
    this.translationRoot = translationRoot;
    this.modeEl = modeEl;
    this.copyEl = copyEl;
    this.beginButton = beginButton;
    this.progress = progress;
    this.onOpen = onOpen;
    this.onClose = onClose;
    this.opened = false;
    this.directionId = null;
    this._loaded = new Set();
    this._translationTimer = null;

    this.closeButton.addEventListener('click', () => this.close());
    this.beginButton?.addEventListener('click', () => this._finishTranslation());
    this._onMessage = (event) => {
      if (!this.opened || event.origin !== window.location.origin || event.source !== this.iframe.contentWindow) return;
      const definition = directionDefinition(this.directionId);
      if (event.data?.type === definition.exitMessage) this.close();
      if (event.data?.type === definition.completeMessage) {
        this.progress.dispatch({ type: 'direction.complete', id: this.directionId });
        this.statusEl.textContent = '·';
        this.root.classList.add('complete');
        this.close();
      }
    };
    window.addEventListener('message', this._onMessage);
  }

  open(directionId) {
    if (this.opened) return false;
    if (!isDirectionPlayable(directionId)) return false;
    const definition = directionDefinition(directionId);
    if (!definition.src) return false;
    const result = this.progress.dispatch({ type: 'direction.open', id: directionId });
    if (result.state.activeDirection !== directionId) return false;

    this.opened = true;
    this.directionId = directionId;
    this.titleEl.textContent = definition.archiveTitle ?? `ARCHIVAL RECONSTRUCTION · DOOR ${definition.title}`;
    if (this.modeEl) this.modeEl.textContent = definition.modeLabel ?? 'ARCHIVAL RECONSTRUCTION';
    if (this.copyEl) this.copyEl.textContent = definition.ingress ?? '';
    this.statusEl.textContent = this.progress.getSnapshot().completed[directionId] ? '·' : 'ESC';
    this.root.classList.toggle('complete', this.progress.getSnapshot().completed[directionId]);
    if (!this._loaded.has(directionId) || this.iframe.dataset.direction !== directionId) {
      this.iframe.src = definition.src;
      this.iframe.dataset.direction = directionId;
      this._loaded.add(directionId);
    }
    this.root.classList.add('open');
    this.root.setAttribute('aria-hidden', 'false');
    this.onOpen?.({ directionId });
    if (this.translationRoot) {
      this.root.classList.add('translating');
      this.translationRoot.setAttribute('aria-hidden', 'false');
      this.beginButton?.focus?.();
      clearTimeout(this._translationTimer);
      // The player acknowledges the law once before control transfers to the
      // reconstructed genre. This prevents the iframe from stealing the click
      // while the explanatory card is still being read.
    } else {
      this.iframe.focus();
    }
    return true;
  }

  _finishTranslation() {
    if (!this.opened) return;
    clearTimeout(this._translationTimer);
    this._translationTimer = null;
    this.root.classList.remove('translating');
    this.translationRoot?.setAttribute('aria-hidden', 'true');
    this.iframe.focus();
  }

  close() {
    if (!this.opened) return false;
    const directionId = this.directionId;
    this.opened = false;
    this.directionId = null;
    clearTimeout(this._translationTimer);
    this._translationTimer = null;
    this.root.classList.remove('open');
    this.root.classList.remove('translating');
    this.translationRoot?.setAttribute('aria-hidden', 'true');
    this.root.setAttribute('aria-hidden', 'true');
    // Hand keyboard focus back to the museum: while the framed game is open
    // it owns key events, and leaving focus inside the now-hidden iframe
    // would strand the player standing at the door with dead controls.
    this.iframe.blur?.();
    window.focus?.();
    this.progress.dispatch({ type: 'direction.close' });
    const snapshot = this.progress.getSnapshot();
    this.onClose?.({
      directionId,
      completed: snapshot.completed[directionId],
      artifactCarried: snapshot.carriedArtifact === directionId,
    });
    return true;
  }

  get completed() {
    return this.progress.getSnapshot().completed.labyrinth;
  }

  dispose() {
    window.removeEventListener('message', this._onMessage);
  }
}
