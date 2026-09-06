export const CHAPTER3_DOCUMENTS = Object.freeze({
  ARCHIVE_FEED_PLAN: Object.freeze({
    id: 'archive-feed-plan',
    kicker: 'OLD MUNICIPAL ARCHIVE · PLAN 7B',
    title: 'Central Square Feed Plan',
    artSlot: 'EV-10 / archive-feed-plan',
    body: 'One main channel crosses the square. A shorter lower branch ends beneath the second row of paving grooves.',
    marks: ['MAIN FEED — REGISTERED', 'LOWER BRANCH — NO CURRENT OWNER', 'REVISION: 18 YEARS AGO'],
  }),
  MAINTENANCE_ORDER_C441: Object.freeze({
    id: 'maintenance-order-c441',
    kicker: 'PUBLIC WORKS · MAINTENANCE ORDER',
    title: 'C-441',
    artSlot: 'EV-11 / maintenance-order-c441',
    body: 'Isolate the unregistered lower branch. Clean the exposed groove. Preserve the registered main feed.',
    marks: ['ASSIGNED: PETAR V.', 'TOOLS ISSUED: CUTTER · CLOTH · SOLVENT', 'STATUS: COMPLETED'],
  }),
  MATERIAL_TIMELINE: Object.freeze({
    id: 'material-timeline',
    kicker: 'EVIDENCE TABLE · ACTUAL RECORD TIMES',
    title: 'The Material Timeline',
    artSlot: 'EV-13 / material-timeline',
    body: 'Sale, delivery, service request, reservation, review and tool return are arranged by the time each action physically occurred.',
    marks: ['NO SHARED MEETING', 'NO SINGLE OFFICE SAW THE WHOLE SEQUENCE', 'ONLY THE ACTIONS ALIGN'],
  }),
  HOTEL_REGISTER: Object.freeze({
    id: 'hotel-register',
    kicker: 'COPPER HERON · GUEST LEDGER',
    title: 'An Empty Line',
    artSlot: 'EV-15 / hotel-register',
    body: 'Room 6 was paid in cash. The line where a guest name should appear was left blank by the desk clerk.',
    marks: ['KEY 6 — RETURNED BEFORE DAWN', 'ONE GUEST', 'NO FORWARDING ADDRESS'],
  }),
  HOTEL_OIL_ROUTE: Object.freeze({
    id: 'hotel-oil-route',
    kicker: 'BUTCH’S NOTES · PHYSICAL ROUTE',
    title: 'The Lamp Oil Line',
    artSlot: 'EV-16A / hotel-oil-route',
    body: 'A hand-drawn route joins Eda’s counter, Olek’s cart, the service hatch and the two prepared rows in the square. It records movement, not agreement.',
    marks: ['SALE', 'DELIVERY', 'MAIN ROW', 'CUT LOWER BRANCH'],
  }),
  HOTEL_ISSUE_COPY: Object.freeze({
    id: 'hotel-issue-copy',
    kicker: 'EDA’S COUNTER COPY · MUNICIPAL ISSUE',
    title: 'Lamp Oil Sale Copy',
    artSlot: 'EV-16B / hotel-issue-copy',
    body: 'The sale copy identifies municipal lamp oil and a cash collection. Eda knew the product and collector, but not the final route through the square.',
    marks: ['PAID IN CASH', 'COLLECTED BY HANDCART', 'DESTINATION NOT WRITTEN'],
  }),
  HOTEL_ORDER_C441: Object.freeze({
    id: 'hotel-order-c441',
    kicker: 'COPIED FROM PUBLIC WORKS · C-441',
    title: 'The Unsigned Maintenance Order',
    artSlot: 'EV-16C / hotel-order-c441',
    body: 'Petar was told to isolate and clean the lower branch while preserving the registered feed. The copy names the worker and tools, but no author.',
    marks: ['CUTTER', 'CLOTH', 'SOLVENT', 'AUTHORIZING NAME BLANK'],
  }),
  HOTEL_WITNESS_NOTES: Object.freeze({
    id: 'hotel-witness-notes',
    kicker: 'BUTCH’S INTERVIEW NOTES · COPPER HERON',
    title: 'What the Hotel Actually Saw',
    artSlot: 'EV-16D / hotel-witness-notes',
    body: 'Hana confirms one unnamed guest. Daro saw Mara move alone from the hotel toward the square and later toward the station. Neither saw the full preparation.',
    marks: ['ONE GUEST', 'MARA ALONE', 'NO VIEW OF THE LOWER BRANCH'],
  }),
  HOTEL_RESERVATION: Object.freeze({
    id: 'hotel-reservation',
    kicker: 'STATION COPY · EASTBOUND SERVICE',
    title: 'An Original Reservation',
    artSlot: 'EV-16E / hotel-reservation',
    body: 'The eastbound reservation was made before the city records began correcting themselves. It supports a direction of travel, not a reason for leaving.',
    marks: ['ONE PASSENGER', 'EASTBOUND', 'ORIGINAL ENTRY RETAINED'],
  }),
  HOTEL_EVIDENCE_TABLE: Object.freeze({
    id: 'hotel-evidence-table',
    kicker: 'COPPER HERON · ROOM 4 · EVIDENCE REVIEW',
    title: 'Five Explanations, One Timeline',
    artSlot: 'EV-16 / hotel-evidence-table',
    body: 'Butch and Lev have laid the sale, delivery, maintenance order, blank register and eastbound reservation on one table. Each proposed accomplice must account for the complete sequence, not merely one piece of it.',
    marks: ['EDA · OLEK · MUNICIPAL STAFF', 'PETAR · LEV · MARA', 'TEST ACCESS · KNOWLEDGE · OPPORTUNITY'],
  }),
});

export class Chapter3EvidenceViewer {
  constructor(elements) {
    this.elements = elements;
    this.document = null;
    this.onClose = null;
    this.returnFocus = null;
    this.mode = null;
    this.boundKeydown = (event) => {
      if (event.key === 'Escape' && this.active) this.close();
    };
    this.elements.close?.addEventListener('click', () => this.close());
    this.elements.root?.addEventListener('click', (event) => {
      if (event.target === this.elements.root) this.close();
    });
    document.addEventListener('keydown', this.boundKeydown);
  }

  get active() {
    return Boolean(this.document);
  }

  populate(documentSpec) {
    this.document = documentSpec;
    this.elements.kicker.textContent = documentSpec.kicker;
    this.elements.title.textContent = documentSpec.title;
    this.elements.body.textContent = documentSpec.body;
    this.elements.slot.textContent = `PLACEHOLDER ART SLOT · ${documentSpec.artSlot}`;
    this.elements.marks.replaceChildren(...documentSpec.marks.map((mark) => {
      const item = document.createElement('li');
      item.textContent = mark;
      return item;
    }));
  }

  open(documentSpec, { onClose } = {}) {
    if (!documentSpec || this.active) return false;
    this.populate(documentSpec);
    this.onClose = onClose || null;
    this.returnFocus = document.activeElement;
    this.mode = 'modal';
    this.elements.root.classList.remove('dialogue-reference');
    this.elements.root.setAttribute('aria-modal', 'true');
    this.elements.root.classList.add('visible');
    this.elements.root.setAttribute('aria-hidden', 'false');
    this.elements.close.focus();
    return true;
  }

  openReference(documentSpec) {
    if (!documentSpec || (this.active && this.mode !== 'reference')) return false;
    this.populate(documentSpec);
    this.onClose = null;
    this.returnFocus = null;
    this.mode = 'reference';
    this.elements.root.classList.add('visible', 'dialogue-reference');
    this.elements.root.setAttribute('aria-modal', 'false');
    this.elements.root.setAttribute('aria-hidden', 'false');
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
    focus?.focus?.();
    if (document.activeElement === this.elements.close) this.elements.close.blur();
    this.elements.root.classList.remove('visible', 'dialogue-reference');
    this.elements.root.setAttribute('aria-modal', 'true');
    this.elements.root.setAttribute('aria-hidden', 'true');
    callback?.();
    return true;
  }

  snapshot() {
    return { active: this.active, mode: this.mode, documentId: this.document?.id || null, artSlot: this.document?.artSlot || null };
  }
}
