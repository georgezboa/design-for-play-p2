function clockParts(clock) {
  const match = String(clock?.time || '').match(/^DAY\s+(\d+)\s+·\s+(\d{2}):(\d{2})$/);
  if (!match) return null;
  return {
    day: `DAY ${match[1]}`,
    digits: `${match[2]}${match[3]}`,
    period: String(clock.period || '').toUpperCase(),
  };
}

export function chapter3FlipClockParts(clock) {
  const parts = clockParts(clock);
  return parts ? { ...parts } : null;
}

export function changedChapter3ClockDigits(previousDigits, nextDigits) {
  if (!previousDigits || previousDigits.length !== nextDigits.length) return [];
  return [...nextDigits]
    .map((digit, index) => (digit === previousDigits[index] ? -1 : index))
    .filter((index) => index >= 0);
}

export class Chapter3FlipClock {
  constructor(root) {
    this.root = root;
    this.parts = null;
    this.digits = [];
    if (!root) return;
    root.innerHTML = `
      <div class="flip-clock-meta">
        <span class="flip-clock-day"></span>
        <span class="flip-clock-period"></span>
      </div>
      <div class="flip-clock-face" aria-hidden="true">
        <span class="flip-digit"></span>
        <span class="flip-digit"></span>
        <span class="flip-colon">:</span>
        <span class="flip-digit"></span>
        <span class="flip-digit"></span>
      </div>
    `;
    this.dayElement = root.querySelector('.flip-clock-day');
    this.periodElement = root.querySelector('.flip-clock-period');
    this.digits = [...root.querySelectorAll('.flip-digit')];
  }

  setClock(clock) {
    if (!this.root) return false;
    const next = clockParts(clock);
    if (!next) return false;
    if (this.parts?.day === next.day && this.parts?.digits === next.digits && this.parts?.period === next.period) {
      return false;
    }

    const changed = changedChapter3ClockDigits(this.parts?.digits, next.digits);
    this.dayElement.textContent = next.day;
    this.periodElement.textContent = next.period;
    [...next.digits].forEach((value, index) => {
      const card = this.digits[index];
      const oldValue = this.parts?.digits[index];
      card.textContent = value;
      if (!changed.includes(index) || oldValue === undefined) return;
      const leaf = this.root.ownerDocument.createElement('span');
      leaf.className = 'flip-leaf';
      leaf.textContent = oldValue;
      card.appendChild(leaf);
      leaf.addEventListener('animationend', () => leaf.remove(), { once: true });
    });

    this.parts = next;
    this.root.dataset.time = `${next.day} ${next.digits.slice(0, 2)}:${next.digits.slice(2)}`;
    this.root.dataset.period = next.period;
    this.root.setAttribute('aria-label', `${next.day}, ${next.digits.slice(0, 2)}:${next.digits.slice(2)}, ${next.period}`);
    return true;
  }

  snapshot() {
    if (!this.parts) return null;
    return { ...this.parts, time: `${this.parts.digits.slice(0, 2)}:${this.parts.digits.slice(2)}` };
  }
}
