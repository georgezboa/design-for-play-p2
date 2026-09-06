export class LabyrinthExhibit {
  constructor({ root, iframe, closeButton, statusEl, onOpen, onClose }) {
    this.root = root;
    this.iframe = iframe;
    this.closeButton = closeButton;
    this.statusEl = statusEl;
    this.onOpen = onOpen;
    this.onClose = onClose;
    this.opened = false;
    this.completed = false;
    this._loaded = false;

    this.closeButton.addEventListener('click', () => this.close());
    this._onMessage = (event) => {
      if (event.origin !== window.location.origin || event.source !== this.iframe.contentWindow) return;
      if (event.data?.type === 'museum-labyrinth:exit') this.close();
      if (event.data?.type === 'museum-labyrinth:complete') {
        this.completed = true;
        this.statusEl.textContent = 'RECORD 02 COMPLETE — ESC RETURNS TO THE ARCHIVE';
        this.root.classList.add('complete');
      }
    };
    window.addEventListener('message', this._onMessage);
  }

  open() {
    if (this.opened) return;
    this.opened = true;
    if (!this._loaded) {
      this.iframe.src = '/labyrinth.html?embedded=1';
      this._loaded = true;
    }
    this.root.classList.add('open');
    this.root.setAttribute('aria-hidden', 'false');
    this.onOpen?.();
    this.iframe.focus();
  }

  close() {
    if (!this.opened) return;
    this.opened = false;
    this.root.classList.remove('open');
    this.root.setAttribute('aria-hidden', 'true');
    this.onClose?.({ completed: this.completed });
  }

  dispose() {
    window.removeEventListener('message', this._onMessage);
  }
}
