// Short archive cards in the shared `.nf-card` style (src/shell/uiKit.css):
// an ivory card with its ticket-punch hole, an oxblood stamp, a Georgia
// title and two or three lines. Accession cases, filed claims, house rules
// and the open register all read through this one view.
//
// While a card is open the museum pauses movement; E, Enter or a click
// closes it (Museum3DApp routes the keys).

const escapeHtml = (value) => String(value).replace(/[&<>"]/g, (char) => `&#${char.charCodeAt(0)};`);

export function cardHtml({ stamp = '', title = '', lines = [], strike = null } = {}) {
  const rows = lines.map((line, index) => {
    const text = escapeHtml(line);
    return `<p>${index === strike ? `<s>${text}</s>` : text}</p>`;
  }).join('');
  return `${stamp ? `<p class="nf-card__stamp">${escapeHtml(stamp)}</p>` : ''}`
    + `<h2 class="nf-card__title">${escapeHtml(title)}</h2>`
    + `<div class="nf-card__lines">${rows}</div>`
    + '<button type="button" class="nf-card__close">E · CLOSE</button>';
}

export class ArchiveCardView {
  constructor(documentRef = globalThis.document) {
    this.document = documentRef;
    this.root = null;
    this.card = null;
    this._onClose = null;
    this.current = null;
  }

  get isOpen() {
    return Boolean(this.current);
  }

  _ensure() {
    if (this.root || !this.document) return;
    this.root = this.document.createElement('div');
    this.root.className = 'nf-card-backdrop museum-card-backdrop';
    this.root.hidden = true;
    this.card = this.document.createElement('article');
    this.card.className = 'nf-card';
    this.card.setAttribute('role', 'dialog');
    this.card.setAttribute('aria-modal', 'true');
    this.root.append(this.card);
    this.root.addEventListener('click', () => this.close());
    this.document.body.append(this.root);
  }

  show(card, { onClose = null } = {}) {
    this._ensure();
    if (!this.root) return false;
    this.current = card;
    this._onClose = onClose;
    this.card.innerHTML = cardHtml(card);
    this.root.hidden = false;
    this.card.querySelector('.nf-card__close')?.focus?.({ preventScroll: true });
    return true;
  }

  close() {
    if (!this.current) return false;
    this.current = null;
    if (this.root) this.root.hidden = true;
    const done = this._onClose;
    this._onClose = null;
    done?.();
    return true;
  }
}
