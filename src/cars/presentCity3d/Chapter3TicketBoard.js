import { TICKET_BOARD_CARDS, TICKET_BOARD_FILED_CARD } from './chapter3OpeningContent.js';
import { TICKET_IDS } from './chapter3OpeningModel.js';
import { paper, punchClack, refused } from '../../chapters/borrowedLight/audio.js';

// The ticket 43 evidence board (Chapter 3's first signature mechanic).
//
// Archive cards lie on the ministry's public table. The shared verbs from
// Chapters 1 and 2 do the work:
//   * drag a card to rearrange it;
//   * drag the round punch-hole lens: inside it every card shows its 1978
//     layer — both tickets 43 read CLAIM 1978-0412;
//   * lay one ticket on the other and punch: one hole through both files
//     them as one person (M. VENN is the archive's duplicate of VELEZ).
// Keyboard: Tab cycles cards and the lens, arrows move the focused one,
// L jumps to the lens, Space / Enter punches the stack, Esc steps away.

const LENS_RADIUS = 86;
const STACK_SNAP = 42;
const IDLE_PULSE_SECONDS = 28;

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

// The 1978 ink: solid in the middle of the lens, gone before its brass rim.
export function lensInkMask(x, y, radius = LENS_RADIUS) {
  return `radial-gradient(circle at ${Math.round(x)}px ${Math.round(y)}px, #000 ${radius - 22}px, transparent ${radius - 8}px)`;
}

// The present-day ink: hidden under the lens and in a clean paper band
// around it.
export function lensPresentMask(x, y, radius = LENS_RADIUS) {
  return `radial-gradient(circle at ${Math.round(x)}px ${Math.round(y)}px, transparent ${radius + 16}px, #000 ${radius + 36}px)`;
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
    this.idleSeconds = 0;
    this.lens = { x: 0, y: 0 };
    this.filed = false;
    this.onKeyDown = this.onKeyDown.bind(this);
    this.onPointerMove = this.onPointerMove.bind(this);
    this.onPointerUp = this.onPointerUp.bind(this);
    this.onResize = () => this.layout();
  }

  get active() {
    return Boolean(this.root);
  }

  open() {
    if (this.root) return false;
    this.filed = this.model.snapshot().ticketBoard.punched;
    this.root = el('section', 'c3-board');
    this.root.setAttribute('role', 'dialog');
    this.root.setAttribute('aria-label', 'Ticket 43 evidence board');
    this.table = el('div', 'c3-board__table');
    const header = el('header', 'c3-board__header');
    header.append(
      el('p', 'c3-board__kicker', 'TRANSPORT MINISTRY · PUBLIC TABLE'),
      el('p', 'c3-board__hint', 'Two tickets for one seat.'),
    );
    // One quiet line of instruction; the verbs themselves came from Ch1 and Ch2.
    this.status = el('p', 'c3-board__status', 'Drag the 1978 lens over the tickets. Lay one on the other, then punch.');
    this.table.append(header);
    for (const spec of TICKET_BOARD_CARDS) {
      const card = el('article', `nf-card c3-card${spec.ticket ? ' c3-card--ticket' : ''}`);
      card.tabIndex = 0;
      card.dataset.card = spec.id;
      const present = cardFace(spec);
      const pastLayer = cardFace(spec, { past: true });
      const hole = el('span', 'c3-card__hole');
      card.append(present, pastLayer, hole);
      card.addEventListener('pointerdown', (event) => this.beginDrag(event, spec.id));
      card.addEventListener('focus', () => { this.focusIndex = this.focusables().indexOf(card); });
      this.table.append(card);
      this.cards.set(spec.id, {
        spec, element: card, presentLayer: present, pastLayer, pastInk: pastLayer.querySelector('.c3-card__ink'),
        x: 0, y: 0, rotation: ((spec.id.length * 7) % 5 - 2) * 0.7,
      });
    }
    this.lensElement = el('div', 'c3-lens');
    this.lensElement.tabIndex = 0;
    this.lensElement.setAttribute('aria-label', 'Punch-hole lens: shows 1978');
    this.lensElement.append(el('span', 'c3-lens__label', '1978'));
    this.lensElement.addEventListener('pointerdown', (event) => this.beginDrag(event, 'lens'));
    this.table.append(this.lensElement);
    // A real button (alpha round 1: the tag looked clickable and was not).
    this.stackTag = el('button', 'nf-tag c3-board__tag', '<kbd>CLICK</kbd> · PUNCH BOTH');
    this.stackTag.type = 'button';
    this.stackTag.setAttribute('aria-label', 'Punch both tickets');
    this.stackTag.addEventListener('pointerdown', (event) => event.stopPropagation());
    this.stackTag.addEventListener('click', (event) => {
      event.stopPropagation();
      this.tryPunch();
    });
    this.stackTag.hidden = true;
    this.table.append(this.stackTag);
    this.filedCard = el('article', 'nf-card c3-card c3-card--filed');
    this.filedCard.hidden = true;
    this.filedCard.append(cardFace(TICKET_BOARD_FILED_CARD), el('span', 'c3-card__hole c3-card__hole--filed'));
    this.continueButton = el('button', 'nf-card__close c3-board__continue', 'CONTINUE · ENTER');
    this.continueButton.type = 'button';
    this.continueButton.addEventListener('click', () => this.close());
    this.filedCard.append(this.continueButton);
    this.table.append(this.filedCard);
    const leave = el('button', 'nf-card__close c3-board__leave', 'STEP AWAY · ESC');
    leave.type = 'button';
    leave.addEventListener('click', () => this.close());
    this.table.append(this.status, leave);
    this.root.append(this.table);
    document.body.append(this.root);
    document.body.classList.add('c3-board-open');
    window.addEventListener('keydown', this.onKeyDown, true);
    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
    window.addEventListener('resize', this.onResize);
    this.layout(true);
    if (this.filed) this.showFiled(false);
    paper();
    this.lensElement.focus({ preventScroll: true });
    return true;
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
      this.lens.fy = 0.36;
    }
    this.lens.x = this.lens.fx * rect.width;
    this.lens.y = this.lens.fy * rect.height;
    this.placeLens();
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
        card.element.classList.add('is-seen');
        this.announce(`Through the lens: ${card.spec.past.title}.`);
        this.idleSeconds = 0;
      }
    }
  }

  focusables() {
    return [...this.cards.values()].map((card) => card.element).concat(this.lensElement);
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
    };
    (id === 'lens' ? this.lensElement : target.element).classList.add('is-dragging');
  }

  onPointerMove(event) {
    if (!this.drag || !this.root) return;
    const drag = this.drag;
    if (Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) > 5) drag.moved = true;
    if (!drag.moved) return;
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
      return;
    }
    const card = this.cards.get(id);
    card.x = x;
    card.y = y;
    card.element.style.zIndex = String(10 + (this.zCounter = (this.zCounter || 0) + 1));
    this.placeCard(card);
    this.updateStack(false);
  }

  onPointerUp(event) {
    if (!this.drag || !this.root) return;
    const drag = this.drag;
    this.drag = null;
    const element = drag.id === 'lens' ? this.lensElement : this.cards.get(drag.id)?.element;
    element?.classList.remove('is-dragging');
    if (drag.id === 'lens') return;
    if (!drag.moved) {
      if (TICKET_IDS.includes(drag.id)) this.tryPunch();
      return;
    }
    paper();
    this.updateStack(true);
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
      this.idleSeconds = 0;
      if (stacked) this.announce('One ticket lies on the other.');
    }
    const ready = this.model.snapshot().ticketBoard.stacked;
    a.element.classList.toggle('is-stacked', ready);
    b.element.classList.toggle('is-stacked', ready);
    this.stackTag.hidden = !ready;
    if (ready) {
      this.stackTag.style.left = `${Math.max(a.x, b.x) + 60}px`;
      this.stackTag.style.top = `${Math.min(a.y, b.y) - 70}px`;
    }
  }

  tryPunch() {
    if (this.filed) return false;
    const state = this.model.snapshot().ticketBoard;
    if (!state.stacked) {
      this.announce('Lay one ticket on the other to punch them together.');
      return false;
    }
    if (!this.model.punchTickets()) {
      refused();
      this.lensElement.classList.remove('is-pulsing');
      void this.lensElement.offsetWidth;
      this.lensElement.classList.add('is-pulsing');
      this.announce('Look at both tickets through the lens first.');
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
    const reveal = () => {
      if (!this.root) return;
      for (const id of TICKET_IDS) this.cards.get(id).element.hidden = true;
      this.filedCard.hidden = false;
      this.continueButton.focus({ preventScroll: true });
      this.announce('Filed as one person.');
      this.onFiled?.();
    };
    if (animate) window.setTimeout(reveal, 650);
    else reveal();
  }

  announce(text) {
    if (this.status) this.status.textContent = text;
  }

  onKeyDown(event) {
    if (!this.root) return;
    const key = event.key;
    const stop = () => { event.preventDefault(); event.stopImmediatePropagation(); };
    if (key === 'Escape') { stop(); this.close(); return; }
    if (this.filed) {
      if (key === 'Enter' || key === ' ' || event.code === 'KeyE') { stop(); this.close(); }
      return;
    }
    const focusables = this.focusables();
    if (key === 'Tab') {
      stop();
      this.focusIndex = (this.focusIndex + (event.shiftKey ? -1 : 1) + focusables.length) % focusables.length;
      focusables[this.focusIndex].focus({ preventScroll: true });
      return;
    }
    if (event.code === 'KeyL') {
      stop();
      this.focusIndex = focusables.length - 1;
      this.lensElement.focus({ preventScroll: true });
      return;
    }
    const focused = document.activeElement;
    const id = focused === this.lensElement ? 'lens' : focused?.dataset?.card;
    if (!id) return;
    const step = event.shiftKey ? 48 : 18;
    const delta = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[key];
    if (delta) {
      stop();
      const target = id === 'lens' ? this.lens : this.cards.get(id);
      this.moveTo(id, Math.max(40, Math.min(this.bounds.width - 40, target.x + delta[0])), Math.max(40, Math.min(this.bounds.height - 40, target.y + delta[1])));
      if (id !== 'lens') this.updateStack(true);
      return;
    }
    if (key === ' ' || key === 'Enter') {
      stop();
      this.tryPunch();
    }
  }

  update(dt) {
    if (!this.root || this.filed) return;
    this.idleSeconds += dt;
    if (this.idleSeconds < IDLE_PULSE_SECONDS) return;
    this.idleSeconds = 0;
    const state = this.model.snapshot().ticketBoard;
    const target = state.lensSeen.length < TICKET_IDS.length
      ? this.lensElement
      : state.stacked ? this.cards.get(TICKET_IDS[0]).element : this.cards.get(TICKET_IDS[1]).element;
    target.classList.remove('is-pulsing');
    void target.offsetWidth;
    target.classList.add('is-pulsing');
  }

  snapshot() {
    return {
      open: this.active,
      filed: this.filed,
      lens: this.root ? { x: Math.round(this.lens.x), y: Math.round(this.lens.y) } : null,
      cards: this.root
        ? [...this.cards.values()].map((card) => ({ id: card.spec.id, x: Math.round(card.x), y: Math.round(card.y) }))
        : [],
      status: this.status?.textContent ?? '',
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
