// The title menu's pure helpers (no DOM at import, so node tests can load
// them): how the departures plaque fits large text, and the credits board's
// times and speed readout. titleMenu.js uses them.

/** How far the board may step down to fit (titleMenu.css `data-fit`). */
export const BOARD_FIT_LEVELS = Object.freeze(['', 'tight', 'small', 'smaller', 'compact', 'smallest', 'tiny']);

/** Does every line of the board show, each label on one line? */
export function boardFits(actions) {
  if (!actions) return true;
  if (actions.scrollHeight > actions.clientHeight + 1) return false;
  return [...actions.querySelectorAll('.nf-action-label')].every((label) => {
    const style = getComputedStyle(label);
    const line = parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.15;
    return label.getBoundingClientRect().height <= line * 1.45;
  });
}

/** The credits roll's speed, as the control bar shows it. */
export function formatCreditRate(rate) {
  const r = Math.round(rate * 100) / 100;
  return `SPEED ${Number.isInteger(r) ? r.toFixed(0) : r.toFixed(2).replace(/0$/, '')}×`;
}

/** A crew line's departure time on the credits board: from 23:00, every 11 minutes, past midnight as 00:xx. */
export function creditDepartureTime(index) {
  const minutes = (23 * 60 + index * 11) % (24 * 60);
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}
