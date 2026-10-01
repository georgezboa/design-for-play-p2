// Chapter 3 evidence papers are shared-kit archive cards (src/shell/uiKit.css:
// .nf-card-backdrop / .nf-card): a stamp, a title and two or three short
// lines. There is no art slot any more; every paper is complete as written.
export const CHAPTER3_DOCUMENTS = Object.freeze({
  CLAIM_CARD: Object.freeze({
    id: 'claim-card',
    stamp: 'NIGHT SERVICE · LOST PROPERTY',
    title: 'Claim 1978-0412',
    lines: Object.freeze([
      'Two claims filed. <b>City case</b>: collected. <b>Orchard case</b>: still on board.',
      'Owner: VELEZ, M. Status: OPEN.',
    ]),
  }),
  HOTEL_REGISTER: Object.freeze({
    id: 'hotel-register',
    stamp: 'COPPER HERON · GUEST LEDGER',
    title: 'Room 6',
    lines: Object.freeze([
      'Paid in cash. Key returned before dawn.',
      'The name line is blank. Ticket stub pinned to the page: <b>SEAT 43</b>.',
    ]),
  }),
  MAINTENANCE_ORDER_C441: Object.freeze({
    id: 'maintenance-order-c441',
    stamp: 'PUBLIC WORKS · ORDER C-441',
    title: 'Isolate the lower branch',
    lines: Object.freeze([
      'An unregistered branch under the clock paving lost pressure.',
      'Cut and cleaned by P. Kolar. Main feed left in service.',
    ]),
  }),
});

function el(tag, className, html = '') {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (html) node.innerHTML = html;
  return node;
}

export class Chapter3EvidenceViewer {
  constructor(elements = {}) {
    this.root = elements.root || null;
    this.document = null;
    this.onClose = null;
    this.returnFocus = null;
    this.mode = null;
    if (this.root) {
      this.root.classList.add('nf-card-backdrop');
      this.root.hidden = true;
      this.card = el('article', 'nf-card');
      this.card.setAttribute('role', 'document');
      this.stamp = el('p', 'nf-card__stamp');
      this.title = el('h2', 'nf-card__title');
      this.title.id = 'evidence-title';
      this.lines = el('div', 'nf-card__lines');
      // One prompt only (A2-9: CLOSE · E/ESC sat beside CONTINUE · E).
      this.closeButton = el('button', 'nf-card__close', 'CONTINUE · E');
      this.closeButton.type = 'button';
      this.card.append(this.stamp, this.title, this.lines, this.closeButton);
      this.root.replaceChildren(this.card);
      this.closeButton.addEventListener('click', (event) => { event.stopPropagation(); this.close(); });
      this.root.addEventListener('click', (event) => { if (event.target === this.root) this.close(); });
    }
    this.boundKeydown = (event) => {
      if (!this.active) return;
      if (event.key === 'Escape' || event.code === 'KeyE' || event.key === 'Enter') {
        event.preventDefault();
        event.stopImmediatePropagation();
        this.close();
      }
    };
    if (typeof document !== 'undefined') document.addEventListener('keydown', this.boundKeydown, true);
  }

  get active() {
    return Boolean(this.document);
  }

  populate(spec) {
    this.document = spec;
    if (!this.root) return;
    this.stamp.textContent = spec.stamp;
    this.title.textContent = spec.title;
    this.lines.replaceChildren(...spec.lines.map((line) => el('p', '', line)));
  }

  open(spec, { onClose } = {}) {
    if (!spec || this.active) return false;
    this.populate(spec);
    this.onClose = onClose || null;
    this.returnFocus = typeof document !== 'undefined' ? document.activeElement : null;
    this.mode = 'modal';
    if (this.root) {
      this.root.hidden = false;
      this.root.setAttribute('aria-hidden', 'false');
      this.closeButton.focus({ preventScroll: true });
    }
    return true;
  }

  close() {
    if (!this.active) return false;
    const callback = this.onClose;
    const focus = this.returnFocus;
    this.document = null;
    this.onClose = null;
    this.returnFocus = null;
    this.mode = null;
    if (this.root) {
      this.root.hidden = true;
      this.root.setAttribute('aria-hidden', 'true');
    }
    focus?.focus?.({ preventScroll: true });
    callback?.();
    return true;
  }

  snapshot() {
    return { active: this.active, mode: this.mode, documentId: this.document?.id || null };
  }
}
