import {
  TICKET_BOARD_CARDS, TICKET_BOARD_FILED_CARD, TICKET_BOARD_HINTS, TICKET_BOARD_TEXT,
} from './chapter3OpeningContent.js';
import { TICKET_IDS, TICKET_PROOF_IDS, ticketProofVerdict } from './chapter3OpeningModel.js';
import { createHintClock, hintClockElapsed, tickHintClock } from './chapter3Guidance.js';
import { paper, punchClack, refused } from '../../chapters/borrowedLight/audio.js';

// The ticket 43 evidence board (Chapter 3's first signature mechanic).
//
// Archive cards lie on the ministry's public table. The shared verbs from
// Chapters 1 and 2 do the work, and the board never writes the reasoning
// out (round 6, item 8). By default it asks one question, "how are the two
// tickets related?"; the player
//   * drags cards and the round punch-hole lens (inside it every card shows
//     its 1978 layer). A ticket read through the lens keeps a small
//     "1978 · CHECKED" mark on its corner (hover / focus: the short record;
//     click: keep it in the 1978 tray, where both records sit side by side —
//     item 9);
//   * decides to lay one ticket on the other: PUNCH THE STACK appears;
//   * puts the stack under the punch and says what it is: ONE PASSENGER or
//     TWO PASSENGERS (two is answered by the evidence);
//   * pins the papers that prove one passenger (both 1978 records and the
//     terminal's duplicate rule; the oil receipt is refused) and files it.
// What to do next is only in the tiered hints (TICKET_BOARD_HINTS): a nudge,
// then a pointer, then the explicit step, after a while without progress or
// on H. Operations are taught on first contact (TICKET_BOARD_TEXT.affordances).
// Keyboard: Tab cycles papers, marks, the lens and the buttons; arrows move
// the focused paper or the lens; L jumps to the lens; E / Enter acts on the
// focused thing (punch a stack, pin a paper, keep a record, press a button);
// H asks for a hint; Esc puts the filing off, then steps away. Space is a
// silent alias of E (Chapter 3 has no jump).

const LENS_RADIUS = 86;
const STACK_SNAP = 42;
// Seconds without progress before hint tiers 1, 2 and 3 show by themselves.
export const TICKET_HINT_DELAYS = Object.freeze([35, 70, 110]);
// Seconds a first-contact affordance stays up after its paper was touched.
const AFFORDANCE_SECONDS = 3.2;

function el(tag, className, html) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (html !== undefined) node.innerHTML = html;
  return node;
}

function cardFace(spec, { past = false } = {}) {
  const face = el('div', past ? 'c3-card__face c3-card__face--past' : 'c3-card__face');
  const data = past ? spec.past : spec;
  // The 1978 face keeps its ink in a layer of its own so the lens can fade
  // the ink at its rim while the paper stays a clean circle (alpha round 3).
  const ink = past ? el('div', 'c3-card__ink') : face;
  if (past) face.append(ink);
  if (past && !data) {
    ink.append(el('p', 'nf-card__stamp', '1978'), el('p', 'c3-card__blank', 'Not yet printed.'));
    return face;
  }
  ink.append(
    el('p', 'nf-card__stamp', data.stamp),
    el('h3', 'nf-card__title', data.title),
    el('div', 'nf-card__lines', data.lines.map((line) => `<p>${line}</p>`).join('')),
  );
  return face;
}

// A ticket's 1978 record as a short slip (the corner popover and the tray).
function recordSlip(spec, className) {
  const slip = el('div', className);
  slip.append(
    el('p', 'c3-record__stamp', `1978 · ${spec.title}`),
    el('p', 'c3-record__title', `CLAIM ${spec.past.title}`),
    el('p', 'c3-record__line', spec.past.lines.join(' ')),
  );
  return slip;
}

// The 1978 ink: solid in the middle of the lens, gone before its brass rim.
export function lensInkMask(x, y, radius = LENS_RADIUS) {
  return `radial-gradient(circle at ${Math.round(x)}px ${Math.round(y)}px, #000 ${radius - 22}px, transparent ${radius - 8}px)`;
}

// The present-day ink: hidden under the lens and in a clean paper band
// around it.
export function lensPresentMask(x, y, radius = LENS_RADIUS) {
  return `radial-gradient(circle at ${Math.round(x)}px ${Math.round(y)}px, transparent ${radius + 16}px, #000 ${radius + 36}px)`;
}

// ---------------------------------------------------------------- pure
// Round 6 (item 8): which stuck point the player is at, for the hints only
// (the board never shows it by default). `board` is the model's ticketBoard.
export function ticketBoardHintStep(board, ticketIds = TICKET_IDS) {
  if (!board || board.punched) return null;
  const seen = ticketIds.filter((id) => board.lensSeen?.includes(id)).length;
  if (board.filing) {
    if (board.conclusion !== 'one') return 'conclude';
    return seen >= ticketIds.length ? 'prove' : 'proveUnchecked';
  }
  if (seen === 0) return 'lens';
  if (seen < ticketIds.length) return 'lensOne';
  return 'stack';
}

// The tier (1–3) that is due after `elapsed` seconds without progress.
export function ticketHintTierDue(elapsed, delays = TICKET_HINT_DELAYS) {
  let tier = 0;
  delays.forEach((seconds, index) => { if (elapsed >= seconds) tier = index + 1; });
  return tier;
}

// The hint line for a step and tier (1-based), or null.
export function ticketBoardHint(step, tier) {
  const lines = TICKET_BOARD_HINTS[step];
  if (!lines || tier < 1) return null;
  return lines[Math.min(tier, lines.length) - 1];
}

// What the board shows without being asked: the question, and PUNCH THE
// STACK while the two tickets lie one on the other (the player's decision;
// the punch is an operation, not the answer).
export function ticketBoardGuidance(board, ticketIds = TICKET_IDS) {
  if (board?.punched) return { step: 'filed', text: TICKET_BOARD_TEXT.filed, canPunch: false };
  return {
    step: ticketBoardHintStep(board, ticketIds),
    text: TICKET_BOARD_TEXT.question,
    canPunch: Boolean(board?.stacked && !board.filing),
  };
}

function setMask(node, value) {
  if (!node) return;
  node.style.webkitMaskImage = value;
  node.style.maskImage = value;
}

export class Chapter3TicketBoard {
  constructor({ model, onFiled = null, onClose = null } = {}) {
    this.model = model;
    this.onFiled = onFiled;
    this.onClose = onClose;
    this.root = null;
    this.cards = new Map();
    this.drag = null;
    this.focusIndex = -1;
    this.lens = { x: 0, y: 0 };
    this.filed = false;
    // Round 6 (item 9): which tickets' 1978 records are in the tray (each
    // goes in when the lens first reads it; its mark takes it out and back).
    this.recordsKept = new Set();
    this.recordsHidden = new Set();
    // First-contact affordances taught so far (lens, card, punch, pin).
    this.taught = new Set();
    this.affordanceRemaining = 0;
    this.hint = { step: null, tier: 0, clock: createHintClock(), text: null };
    this.onKeyDown = this.onKeyDown.bind(this);
    this.onPointerMove = this.onPointerMove.bind(this);
    this.onPointerUp = this.onPointerUp.bind(this);
    this.onResize = () => this.layout();
  }

  get active() {
    return Boolean(this.root);
  }

  board() {
    return this.model.snapshot().ticketBoard;
  }

  open() {
    if (this.root) return false;
    const board = this.board();
    this.filed = board.punched;
    this.root = el('section', 'c3-board');
    this.root.setAttribute('role', 'dialog');
    this.root.setAttribute('aria-label', 'Ticket 43 evidence board');
    this.table = el('div', 'c3-board__table');
    const header = el('header', 'c3-board__header');
    header.append(
      el('p', 'c3-board__kicker', 'TRANSPORT MINISTRY · PUBLIC TABLE'),
      el('p', 'c3-board__hint', TICKET_BOARD_TEXT.question),
    );
    this.table.append(header);
    // Item 9: the 1978 tray, both records side by side.
    this.recordsTray = el('div', 'c3-board__records');
    this.recordsTray.hidden = true;
    this.recordsTray.append(el('p', 'c3-board__records-title', TICKET_BOARD_TEXT.recordsTitle));
    this.recordsRow = el('div', 'c3-board__records-row');
    this.recordsTray.append(this.recordsRow);
    this.recordSlots = new Map();
    this.recordsKept.clear();
    this.table.append(this.recordsTray);
    for (const spec of TICKET_BOARD_CARDS) {
      const card = el('article', `nf-card c3-card${spec.ticket ? ' c3-card--ticket' : ''}`);
      card.tabIndex = 0;
      card.dataset.card = spec.id;
      card.setAttribute('aria-label', `${spec.title} · ${spec.stamp}`);
      const present = cardFace(spec);
      const pastLayer = cardFace(spec, { past: true });
      const hole = el('span', 'c3-card__hole');
      const pin = el('span', 'c3-card__pin');
      pin.setAttribute('aria-hidden', 'true');
      card.append(present, pastLayer, hole, pin);
      const entry = {
        spec, element: card, presentLayer: present, pastLayer, pastInk: pastLayer.querySelector('.c3-card__ink'),
        x: 0, y: 0, rotation: ((spec.id.length * 7) % 5 - 2) * 0.7, mark: null,
      };
      if (spec.ticket && spec.past) {
        // The persistent "1978 · CHECKED" mark (hidden until the lens reads
        // this ticket): hover / focus shows the record, click keeps it.
        const mark = el('button', 'c3-card__mark', `<span>${TICKET_BOARD_TEXT.checkedMark}</span>`);
        mark.type = 'button';
        mark.hidden = true;
        mark.setAttribute('aria-label', `${spec.title}: 1978 record checked. Keep it beside the other.`);
        mark.append(recordSlip(spec, 'c3-card__record'));
        mark.addEventListener('pointerdown', (event) => event.stopPropagation());
        // The expanded record must sit over the neighbouring papers.
        const lift = (on) => {
          if (on) {
            card.dataset.z = card.style.zIndex;
            card.style.zIndex = '60';
          } else if (card.dataset.z !== undefined) {
            card.style.zIndex = card.dataset.z;
            delete card.dataset.z;
          }
        };
        mark.addEventListener('pointerenter', () => lift(true));
        mark.addEventListener('pointerleave', () => lift(false));
        mark.addEventListener('focus', () => lift(true));
        mark.addEventListener('blur', () => lift(false));
        mark.addEventListener('click', (event) => {
          event.stopPropagation();
          this.onMarkClick(spec.id);
        });
        card.append(mark);
        entry.mark = mark;
        const slot = recordSlip(spec, 'c3-record');
        slot.dataset.record = spec.id;
        slot.hidden = true;
        slot.addEventListener('click', (event) => {
          event.stopPropagation();
          if (this.proving()) this.pinProof(spec.id);
        });
        this.recordsRow.append(slot);
        this.recordSlots.set(spec.id, slot);
      }
      card.addEventListener('pointerdown', (event) => this.beginDrag(event, spec.id));
      card.addEventListener('pointerenter', () => this.teachCard(spec.id));
      card.addEventListener('focus', () => {
        this.focusIndex = this.focusables().indexOf(card);
        this.teachCard(spec.id);
      });
      this.table.append(card);
      this.cards.set(spec.id, entry);
    }
    this.lensElement = el('div', 'c3-lens');
    this.lensElement.tabIndex = 0;
    this.lensElement.setAttribute('aria-label', 'Punch-hole lens: shows 1978. Drag it, or move it with the arrow keys.');
    this.lensElement.append(el('span', 'c3-lens__label', '1978'));
    this.lensElement.addEventListener('pointerdown', (event) => this.beginDrag(event, 'lens'));
    this.table.append(this.lensElement);
    // First-contact affordances (one floating paper tag).
    this.affordance = el('p', 'nf-tag c3-board__affordance');
    this.affordance.setAttribute('aria-hidden', 'true');
    this.affordance.hidden = true;
    this.table.append(this.affordance);
    // A real button (alpha round 1: the tag looked clickable and was not).
    this.stackTag = el('button', 'nf-tag c3-board__tag', TICKET_BOARD_TEXT.affordances.punch);
    this.stackTag.type = 'button';
    this.stackTag.setAttribute('aria-label', 'Punch the stack');
    this.stackTag.addEventListener('pointerdown', (event) => event.stopPropagation());
    this.stackTag.addEventListener('click', (event) => {
      event.stopPropagation();
      this.tryPunch();
    });
    this.stackTag.hidden = true;
    this.table.append(this.stackTag);
    this.buildFilePanel();
    this.filedCard = el('article', 'nf-card c3-card c3-card--filed');
    this.filedCard.hidden = true;
    this.filedCard.append(cardFace(TICKET_BOARD_FILED_CARD), el('span', 'c3-card__hole c3-card__hole--filed'));
    this.continueButton = el('button', 'nf-card__close c3-board__continue', 'CONTINUE · E');
    this.continueButton.type = 'button';
    this.continueButton.addEventListener('click', () => this.close());
    this.filedCard.append(this.continueButton);
    this.table.append(this.filedCard);
    this.status = el('p', 'c3-board__status', '');
    this.status.setAttribute('aria-live', 'polite');
    const footer = el('div', 'c3-board__footer');
    this.hintButton = el('button', 'nf-card__close c3-board__hint-button', 'HINT · H');
    this.hintButton.type = 'button';
    this.hintButton.addEventListener('click', () => this.requestHint());
    this.leaveButton = el('button', 'nf-card__close c3-board__leave', 'STEP AWAY · ESC');
    this.leaveButton.type = 'button';
    this.leaveButton.addEventListener('click', () => this.close());
    footer.append(this.hintButton, this.leaveButton);
    this.table.append(this.status, footer);
    this.root.append(this.table);
    document.body.append(this.root);
    document.body.classList.add('c3-board-open');
    window.addEventListener('keydown', this.onKeyDown, true);
    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
    window.addEventListener('resize', this.onResize);
    this.layout(true);
    for (const id of board.lensSeen) this.markSeen(id, { announce: false });
    if (this.filed) this.showFiled(false);
    else {
      this.syncPins();
      this.refresh();
      if (board.filing) this.showFilePanel();
    }
    this.hint = { step: ticketBoardHintStep(board), tier: 0, clock: createHintClock(), text: null };
    paper();
    this.lensElement.focus({ preventScroll: true });
    if (!this.filed) this.showAffordance('lens', this.lensElement, { hold: true });
    return true;
  }

  buildFilePanel() {
    const text = TICKET_BOARD_TEXT;
    this.filePanel = el('div', 'c3-board__file');
    this.filePanel.hidden = true;
    this.filePanel.setAttribute('role', 'group');
    this.filePanel.setAttribute('aria-label', 'File the stack');
    // One compact row (the papers above stay clickable), Lev's reply below.
    const row = el('div', 'c3-board__file-row');
    this.fileQuestion = el('span', 'c3-board__file-question', text.fileQuestion);
    this.fileChoices = el('span', 'c3-board__file-choices');
    for (const choice of text.fileChoices) {
      const button = el('button', 'nf-tag c3-board__choice', choice.label);
      button.type = 'button';
      button.dataset.choice = choice.id;
      button.addEventListener('click', () => this.conclude(choice.id));
      this.fileChoices.append(button);
    }
    this.fileProve = el('span', 'c3-board__file-question', text.proveIt);
    this.fileButton = el('button', 'nf-tag c3-board__choice c3-board__choice--file', text.file);
    this.fileButton.type = 'button';
    this.fileButton.addEventListener('click', () => this.fileStack());
    this.proveRow = el('span', 'c3-board__file-choices');
    this.proveRow.append(this.fileButton);
    this.notYetButton = el('button', 'nf-card__close c3-board__not-yet', `${text.notYet} · ESC`);
    this.notYetButton.type = 'button';
    this.notYetButton.addEventListener('click', () => this.cancelFiling());
    row.append(this.fileQuestion, this.fileChoices, this.fileProve, this.proveRow, this.notYetButton);
    this.fileReply = el('p', 'c3-board__file-reply', '');
    this.fileReply.setAttribute('aria-live', 'polite');
    this.filePanel.append(row, this.fileReply);
    this.table.append(this.filePanel);
  }

  close() {
    if (!this.root) return false;
    window.removeEventListener('keydown', this.onKeyDown, true);
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    window.removeEventListener('resize', this.onResize);
    this.root.remove();
    document.body.classList.remove('c3-board-open');
    this.root = null;
    this.cards.clear();
    this.drag = null;
    const filed = this.filed;
    this.onClose?.({ filed });
    return true;
  }

  // Place cards from their authored fractions; keep positions on resize.
  layout(initial = false) {
    const rect = this.table.getBoundingClientRect();
    this.bounds = { width: rect.width, height: rect.height };
    for (const card of this.cards.values()) {
      if (initial || card.fx === undefined) {
        card.fx = card.spec.at[0];
        card.fy = card.spec.at[1];
      }
      card.x = card.fx * rect.width;
      card.y = card.fy * rect.height;
      this.placeCard(card);
    }
    if (initial || this.lens.fx === undefined) {
      this.lens.fx = 0.46;
      this.lens.fy = 0.38;
    }
    this.lens.x = this.lens.fx * rect.width;
    this.lens.y = this.lens.fy * rect.height;
    this.placeLens();
    this.refresh();
  }

  placeCard(card) {
    card.fx = card.x / Math.max(1, this.bounds.width);
    card.fy = card.y / Math.max(1, this.bounds.height);
    card.element.style.left = `${card.x}px`;
    card.element.style.top = `${card.y}px`;
    card.element.style.transform = `translate(-50%, -50%) rotate(${card.rotation}deg)`;
    this.updateLensLayers();
  }

  placeLens() {
    this.lens.fx = this.lens.x / Math.max(1, this.bounds.width);
    this.lens.fy = this.lens.y / Math.max(1, this.bounds.height);
    this.lensElement.style.left = `${this.lens.x}px`;
    this.lensElement.style.top = `${this.lens.y}px`;
    this.lensElement.style.width = `${LENS_RADIUS * 2}px`;
    this.lensElement.style.height = `${LENS_RADIUS * 2}px`;
    this.updateLensLayers();
  }

  // Each card's 1978 layer is clipped to the lens circle in card-local
  // coordinates, so the lens reads as one hole across every card beneath it.
  // Alpha round 3 (R3): the present-day ink is masked out in a band around
  // the lens and the 1978 ink fades out before the rim, so a glyph cut by
  // the circle never sits against a present glyph ("N978-0412" over
  // "M. VENN").
  updateLensLayers() {
    if (!this.root) return;
    const tableRect = this.table.getBoundingClientRect();
    const lensX = tableRect.left + this.lens.x;
    const lensY = tableRect.top + this.lens.y;
    for (const card of this.cards.values()) {
      const rect = card.element.getBoundingClientRect();
      const localX = lensX - rect.left;
      const localY = lensY - rect.top;
      card.pastLayer.style.clipPath = `circle(${LENS_RADIUS - 6}px at ${localX}px ${localY}px)`;
      setMask(card.pastInk, lensInkMask(localX, localY));
      const presentRect = card.presentLayer.getBoundingClientRect();
      setMask(card.presentLayer, lensPresentMask(lensX - presentRect.left, lensY - presentRect.top));
      const inside = localX > 18 && localY > 18 && localX < rect.width - 18 && localY < rect.height - 18;
      if (inside && TICKET_IDS.includes(card.spec.id) && this.model.seeTicketThroughLens(card.spec.id)) {
        this.markSeen(card.spec.id);
        this.progress();
      }
    }
  }

  // Item 9: the lens's finding stays on the ticket (the corner mark) and in
  // the 1978 tray, so the two records can be compared once the lens moves on.
  markSeen(id, { announce = true } = {}) {
    const card = this.cards.get(id);
    if (!card) return;
    card.element.classList.add('is-seen');
    if (card.mark) {
      const fresh = card.mark.hidden;
      card.mark.hidden = false;
      if (fresh && announce) {
        card.mark.classList.remove('is-new');
        void card.mark.offsetWidth;
        card.mark.classList.add('is-new');
      }
    }
    this.keepRecord(id, !this.recordsHidden.has(id));
    if (announce) {
      paper();
      this.announce(TICKET_BOARD_TEXT.seen(card.spec.title));
    }
  }

  keepRecord(id, keep) {
    const slot = this.recordSlots?.get(id);
    if (!slot) return;
    if (keep) this.recordsKept.add(id);
    else this.recordsKept.delete(id);
    slot.hidden = !keep;
    this.cards.get(id)?.mark?.classList.toggle('is-kept', keep);
    this.recordsTray.hidden = this.recordsKept.size === 0;
  }

  onMarkClick(id) {
    if (this.proving()) {
      this.pinProof(id);
      return;
    }
    const keep = !this.recordsKept.has(id);
    if (keep) this.recordsHidden.delete(id);
    else this.recordsHidden.add(id);
    this.keepRecord(id, keep);
    paper();
  }

  // The punch button over a stack, the pins and the file panel.
  refresh() {
    if (!this.root || this.filed) return;
    const board = this.board();
    const guidance = ticketBoardGuidance(board);
    this.stackTag.hidden = !guidance.canPunch;
    if (guidance.canPunch) {
      const [a, b] = TICKET_IDS.map((id) => this.cards.get(id));
      this.stackTag.style.left = `${Math.max(a.x, b.x) + 60}px`;
      this.stackTag.style.top = `${Math.max(48, Math.min(a.y, b.y) - 70)}px`;
    }
    this.root.classList.toggle('is-proving', this.proving());
    for (const id of TICKET_IDS) this.cards.get(id)?.element.classList.toggle('is-under-punch', Boolean(board.filing));
  }

  proving() {
    const board = this.board();
    return Boolean(this.root && !this.filed && board.filing && board.conclusion === 'one');
  }

  focusables() {
    const marks = [...this.cards.values()].map((card) => card.mark).filter((mark) => mark && !mark.hidden);
    const buttons = [this.stackTag, ...(this.filePanel ? this.filePanel.querySelectorAll('button') : []), this.hintButton, this.leaveButton]
      .filter((button) => button && !button.hidden && !button.closest('[hidden]'));
    return [...this.cards.values()].map((card) => card.element).concat(marks, this.lensElement, buttons);
  }

  beginDrag(event, id) {
    if (this.filed || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    const target = id === 'lens' ? this.lens : this.cards.get(id);
    const tableRect = this.table.getBoundingClientRect();
    this.drag = {
      id,
      startX: event.clientX,
      startY: event.clientY,
      offsetX: event.clientX - tableRect.left - target.x,
      offsetY: event.clientY - tableRect.top - target.y,
      moved: false,
      // The stack stays put while it is under the punch.
      locked: id !== 'lens' && TICKET_IDS.includes(id) && this.board().filing,
    };
    (id === 'lens' ? this.lensElement : target.element).classList.add('is-dragging');
  }

  onPointerMove(event) {
    if (!this.drag || !this.root) return;
    const drag = this.drag;
    if (Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) > 5) drag.moved = true;
    if (!drag.moved || drag.locked) return;
    const tableRect = this.table.getBoundingClientRect();
    const x = Math.max(40, Math.min(tableRect.width - 40, event.clientX - tableRect.left - drag.offsetX));
    const y = Math.max(40, Math.min(tableRect.height - 40, event.clientY - tableRect.top - drag.offsetY));
    this.moveTo(drag.id, x, y);
  }

  moveTo(id, x, y) {
    if (id === 'lens') {
      this.lens.x = x;
      this.lens.y = y;
      this.placeLens();
      this.taughtUse('lens');
      return;
    }
    const card = this.cards.get(id);
    card.x = x;
    card.y = y;
    card.element.style.zIndex = String(10 + (this.zCounter = (this.zCounter || 0) + 1));
    this.placeCard(card);
    this.taughtUse('card');
    this.updateStack(false);
  }

  onPointerUp() {
    if (!this.drag || !this.root) return;
    const drag = this.drag;
    this.drag = null;
    const element = drag.id === 'lens' ? this.lensElement : this.cards.get(drag.id)?.element;
    element?.classList.remove('is-dragging');
    if (drag.id === 'lens') return;
    if (!drag.moved || drag.locked) {
      this.activateCard(drag.id);
      return;
    }
    paper();
    this.updateStack(true);
  }

  // A click (or E) on a paper: pin it while proving; punch a stack; else
  // say how papers move (never a silent click).
  activateCard(id) {
    if (this.filed) return false;
    if (this.proving()) return this.pinProof(id);
    const board = this.board();
    if (TICKET_IDS.includes(id) && board.stacked && !board.filing) return this.tryPunch();
    if (board.filing) {
      this.pulse(this.fileChoices);
      return false;
    }
    const card = this.cards.get(id);
    this.showAffordance('card', card?.element, { force: true });
    return false;
  }

  // Tickets laid one on the other (centres within STACK_SNAP) snap together.
  updateStack(snap) {
    const [a, b] = TICKET_IDS.map((id) => this.cards.get(id));
    if (!a || !b) return;
    const distance = Math.hypot(a.x - b.x, a.y - b.y);
    const stacked = distance <= STACK_SNAP;
    if (stacked && snap) {
      const top = Number(a.element.style.zIndex || 0) > Number(b.element.style.zIndex || 0) ? a : b;
      const bottom = top === a ? b : a;
      top.x = bottom.x + 6;
      top.y = bottom.y + 5;
      this.placeCard(top);
    }
    if (this.model.stackTickets(stacked)) {
      this.announce(stacked ? TICKET_BOARD_TEXT.stacked : TICKET_BOARD_TEXT.unstacked);
      if (stacked) this.progress();
    }
    const ready = this.board().stacked;
    a.element.classList.toggle('is-stacked', ready);
    b.element.classList.toggle('is-stacked', ready);
    this.refresh();
  }

  // The stack goes under the punch: the board asks what it is.
  tryPunch() {
    if (this.filed) return false;
    if (!this.model.beginTicketFiling()) {
      refused();
      this.pulse(this.cards.get(TICKET_IDS[1])?.element);
      return false;
    }
    paper();
    this.taughtUse('punch');
    this.affordance.hidden = true;
    this.progress();
    this.showFilePanel();
    return true;
  }

  showFilePanel() {
    const board = this.board();
    const proving = board.conclusion === 'one';
    this.filePanel.hidden = false;
    this.fileQuestion.hidden = proving;
    this.fileChoices.hidden = proving;
    this.fileProve.hidden = !proving;
    this.proveRow.hidden = !proving;
    this.fileReply.textContent = '';
    this.refresh();
    this.syncPins();
    const first = proving ? this.fileButton : this.fileChoices.querySelector('button');
    first?.focus({ preventScroll: true });
  }

  cancelFiling() {
    if (!this.model.cancelTicketFiling()) return false;
    this.filePanel.hidden = true;
    this.refresh();
    this.lensElement.focus({ preventScroll: true });
    return true;
  }

  conclude(answer) {
    const result = this.model.concludeTickets(answer);
    if (!result.accepted) {
      refused();
      this.reply(TICKET_BOARD_TEXT.refuse[result.reason] ?? '');
      if (result.reason === 'same-claim') this.pulse(this.recordsTray);
      else if (result.reason === 'unchecked') for (const id of TICKET_IDS) this.pulse(this.cards.get(id)?.element);
      this.progress({ sameStep: true });
      return false;
    }
    this.progress();
    this.showFilePanel();
    this.reply(TICKET_BOARD_TEXT.accepted);
    return true;
  }

  pinProof(id) {
    if (!TICKET_PROOF_IDS.includes(id)) return false;
    const result = this.model.pinTicketProof(id);
    if (!result.changed) {
      refused();
      if (result.reason === 'unchecked') this.reply(TICKET_BOARD_TEXT.refuse.unchecked_pin);
      this.pulse(this.cards.get(id)?.element);
      return false;
    }
    paper();
    this.taughtUse('pin');
    this.syncPins();
    if (result.pinned && id === 'claim-card') this.reply(TICKET_BOARD_TEXT.claimAgrees);
    else this.reply('');
    if (result.pinned) this.progress({ sameStep: true });
    return true;
  }

  syncPins() {
    if (!this.root) return;
    const proofs = new Set(this.board().proofs);
    for (const [id, card] of this.cards) card.element.classList.toggle('is-pinned', proofs.has(id));
    for (const [id, slot] of this.recordSlots) slot.classList.toggle('is-pinned', proofs.has(id));
  }

  // FILE AS ONE: punch through, if the pins prove it.
  fileStack() {
    if (this.filed) return false;
    const board = this.board();
    const verdict = ticketProofVerdict(board);
    if (!verdict.valid || !this.model.punchTickets()) {
      refused();
      this.reply(TICKET_BOARD_TEXT.refuse[verdict.problem] ?? '');
      if (verdict.problem === 'not-proof') this.pulse(this.cards.get('market-sale')?.element);
      else if (verdict.problem === 'one-record' || verdict.problem === 'no-records') this.pulse(this.recordsTray.hidden ? this.lensElement : this.recordsTray);
      this.progress({ sameStep: true });
      return false;
    }
    punchClack();
    this.showFiled(true);
    return true;
  }

  showFiled(animate) {
    this.filed = true;
    for (const card of this.cards.values()) {
      if (TICKET_IDS.includes(card.spec.id)) card.element.classList.add('is-punched');
    }
    this.stackTag.hidden = true;
    this.lensElement.hidden = true;
    this.filePanel.hidden = true;
    this.affordance.hidden = true;
    this.hintButton.hidden = true;
    this.root.classList.remove('is-proving');
    const reveal = () => {
      if (!this.root) return;
      for (const id of TICKET_IDS) this.cards.get(id).element.hidden = true;
      this.filedCard.hidden = false;
      this.continueButton.focus({ preventScroll: true });
      this.announce(TICKET_BOARD_TEXT.filed);
      this.onFiled?.();
    };
    if (animate) window.setTimeout(reveal, 650);
    else reveal();
  }

  announce(text) {
    if (this.status) {
      this.status.textContent = text;
      this.status.classList.remove('is-hint');
    }
  }

  reply(text) {
    if (this.fileReply) this.fileReply.textContent = text;
  }

  pulse(target) {
    if (!target) return;
    target.classList.remove('is-pulsing');
    void target.offsetWidth;
    target.classList.add('is-pulsing');
  }

  // ------------------------------------------------------------ teaching
  // An operation is taught where the player first touches it, and only
  // until it has been used.
  showAffordance(kind, anchor, { hold = false, force = false } = {}) {
    if (!this.root || this.filed || !anchor) return;
    if (this.taught.has(kind) && !force) return;
    const html = TICKET_BOARD_TEXT.affordances[kind];
    if (!html) return;
    const tableRect = this.table.getBoundingClientRect();
    const rect = anchor.getBoundingClientRect();
    this.affordance.innerHTML = html;
    this.affordance.dataset.kind = kind;
    this.affordance.hidden = false;
    const below = kind === 'lens';
    this.affordance.style.left = `${rect.left - tableRect.left + rect.width / 2}px`;
    this.affordance.style.top = `${below ? rect.bottom - tableRect.top + 40 : rect.top - tableRect.top - 12}px`;
    this.affordance.classList.toggle('is-below', below);
    this.affordanceRemaining = hold ? Infinity : AFFORDANCE_SECONDS;
  }

  teachCard(id) {
    if (this.drag) return;
    // While proving, the first paper the pointer finds says how to pin it
    // (whichever paper that is: the board never points at the proof).
    if (this.proving()) {
      if (!this.taught.has('pin')) this.showAffordance('pin', this.cards.get(id)?.element);
      return;
    }
    if (this.taught.has('card') || this.board().filing) return;
    if (this.affordance.dataset.kind === 'lens' && !this.affordance.hidden && !this.taught.has('lens')) return;
    this.showAffordance('card', this.cards.get(id)?.element);
  }

  taughtUse(kind) {
    if (this.taught.has(kind)) return;
    this.taught.add(kind);
    if (this.affordance?.dataset.kind === kind) this.affordanceRemaining = Math.min(this.affordanceRemaining, 0.6);
  }

  // ------------------------------------------------------------ hints
  // Progress (a new 1978 record, a stack, a punch, a conclusion, a pin)
  // restarts the hint clock; a new stuck point starts again at tier 1.
  progress({ sameStep = false } = {}) {
    const step = ticketBoardHintStep(this.board());
    this.hint.clock = createHintClock();
    if (!sameStep && step !== this.hint.step) {
      this.hint.step = step;
      this.hint.tier = 0;
      if (this.status?.classList.contains('is-hint')) this.announce('');
    }
  }

  showHint(tier) {
    const step = ticketBoardHintStep(this.board());
    if (step !== this.hint.step) {
      this.hint.step = step;
      this.hint.tier = 0;
    }
    const text = ticketBoardHint(step, tier);
    if (!text) return null;
    this.hint.tier = Math.max(this.hint.tier, tier);
    this.hint.text = text;
    this.status.textContent = text;
    this.status.classList.add('is-hint');
    this.status.classList.toggle('is-explicit', tier >= 3);
    if (tier >= 2) this.pulse(this.hintTarget(step));
    return text;
  }

  // H or the HINT button: the next tier at once.
  requestHint() {
    if (!this.root || this.filed) return null;
    const step = ticketBoardHintStep(this.board());
    const current = step === this.hint.step ? this.hint.tier : 0;
    const text = this.showHint(Math.min(3, current + 1));
    this.hint.clock = createHintClock();
    return text;
  }

  hintTarget(step) {
    const unchecked = TICKET_IDS.find((id) => !this.board().lensSeen.includes(id));
    if (step === 'lens' || step === 'proveUnchecked') return this.lensElement;
    if (step === 'lensOne') return this.cards.get(unchecked)?.element;
    if (step === 'stack') return this.cards.get(TICKET_IDS[1])?.element;
    if (step === 'conclude') return this.fileChoices;
    if (step === 'prove') return this.cards.get('terminal-note')?.element;
    return null;
  }

  onKeyDown(event) {
    if (!this.root) return;
    const key = event.key;
    const stop = () => { event.preventDefault(); event.stopImmediatePropagation(); };
    const confirm = key === 'Enter' || event.code === 'KeyE' || key === ' ';
    if (key === 'Escape') {
      stop();
      if (!this.filed && this.board().filing) this.cancelFiling();
      else this.close();
      return;
    }
    if (this.filed) {
      if (confirm) { stop(); this.close(); }
      return;
    }
    const focusables = this.focusables();
    if (key === 'Tab') {
      stop();
      this.focusIndex = (Math.max(-1, focusables.indexOf(document.activeElement)) + (event.shiftKey ? -1 : 1) + focusables.length) % focusables.length;
      focusables[this.focusIndex].focus({ preventScroll: true });
      return;
    }
    if (event.code === 'KeyL') {
      stop();
      this.lensElement.focus({ preventScroll: true });
      return;
    }
    if (event.code === 'KeyH') {
      stop();
      this.requestHint();
      return;
    }
    const focused = document.activeElement;
    if (confirm && focused?.tagName === 'BUTTON' && this.root.contains(focused)) {
      stop();
      if (!event.repeat) focused.click();
      return;
    }
    const id = focused === this.lensElement ? 'lens' : focused?.dataset?.card;
    if (!id) return;
    const step = event.shiftKey ? 48 : 18;
    const delta = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[key];
    if (delta) {
      stop();
      if (id !== 'lens' && TICKET_IDS.includes(id) && this.board().filing) return;
      const target = id === 'lens' ? this.lens : this.cards.get(id);
      this.moveTo(id, Math.max(40, Math.min(this.bounds.width - 40, target.x + delta[0])), Math.max(40, Math.min(this.bounds.height - 40, target.y + delta[1])));
      if (id !== 'lens') this.updateStack(true);
      return;
    }
    if (confirm) {
      stop();
      if (event.repeat) return;
      // The lens is moved, not pressed: say so (never a silent key).
      if (id === 'lens') {
        this.showAffordance('lens', this.lensElement, { force: true });
        this.affordanceRemaining = AFFORDANCE_SECONDS;
        return;
      }
      const board = this.board();
      // E on a checked ticket that is not part of a stack keeps its record.
      if (!this.proving() && TICKET_IDS.includes(id) && !board.stacked && board.lensSeen.includes(id)) {
        this.onMarkClick(id);
        return;
      }
      this.activateCard(id);
    }
  }

  update(dt) {
    if (!this.root || this.filed) return;
    if (this.affordanceRemaining !== Infinity && !this.affordance.hidden) {
      this.affordanceRemaining -= dt;
      if (this.affordanceRemaining <= 0) this.affordance.hidden = true;
    } else if (this.affordanceRemaining === Infinity && this.taught.has(this.affordance.dataset.kind)) {
      this.affordanceRemaining = 0.6;
    }
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const elapsed = tickHintClock(this.hint.clock, dt, now);
    const step = ticketBoardHintStep(this.board());
    if (step !== this.hint.step) this.progress();
    const due = ticketHintTierDue(elapsed);
    if (due > this.hint.tier) this.showHint(due);
  }

  snapshot() {
    const board = this.root ? this.board() : null;
    return {
      open: this.active,
      filed: this.filed,
      lens: this.root ? { x: Math.round(this.lens.x), y: Math.round(this.lens.y) } : null,
      cards: this.root
        ? [...this.cards.values()].map((card) => ({ id: card.spec.id, x: Math.round(card.x), y: Math.round(card.y) }))
        : [],
      status: this.status?.textContent ?? '',
      punchShown: this.root ? !this.stackTag.hidden : false,
      filePanel: this.root && !this.filePanel.hidden ? (this.proving() ? 'prove' : 'conclude') : null,
      reply: this.fileReply?.textContent ?? '',
      records: [...this.recordsKept],
      marks: this.root ? TICKET_IDS.filter((id) => this.cards.get(id)?.mark && !this.cards.get(id).mark.hidden) : [],
      proofs: board?.proofs ?? [],
      affordance: this.root && !this.affordance.hidden ? this.affordance.dataset.kind : null,
      hint: { step: this.hint.step, tier: this.hint.tier, elapsed: Number(hintClockElapsed(this.hint.clock).toFixed(1)) },
    };
  }

  // QA hooks (dev only via the runtime): table-space coordinates.
  qaMove(id, x, y) {
    if (!this.root) return false;
    this.moveTo(id, x, y);
    if (id !== 'lens') this.updateStack(true);
    return true;
  }
}
