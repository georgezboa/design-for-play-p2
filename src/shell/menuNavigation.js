// Keyboard and gamepad navigation for the shell's menus (the title menu and
// every title dialog, the pause menu and its confirm / settings panels). The rules are DOM-free so
// they can be node-tested; the DOM side only asks for the list of visible
// controls and focuses or clicks the one these helpers pick.

// ↑ / ↓ and W / S move, Enter / Space activate. `code` is layout-independent;
// `key` covers synthetic events that only set it.
const KEY_ACTIONS = Object.freeze({
  ArrowUp: 'prev', ArrowDown: 'next', KeyW: 'prev', KeyS: 'next', w: 'prev', s: 'next', W: 'prev', S: 'next',
  Enter: 'activate', NumpadEnter: 'activate', Space: 'activate', ' ': 'activate',
});

/** 'prev' | 'next' | 'activate' | null for a keydown, ignoring chorded keys. */
export function menuKeyAction(event) {
  if (!event || event.altKey || event.ctrlKey || event.metaKey) return null;
  return KEY_ACTIONS[event.code] ?? KEY_ACTIONS[event.key] ?? null;
}

/**
 * The index focus moves to, wrapping at both ends. `current` is -1 when focus
 * is outside the list: `next` then lands on the first item, `prev` on the last.
 */
export function cycleIndex(current, count, direction) {
  if (!Number.isInteger(count) || count <= 0) return -1;
  const step = direction === 'prev' || direction < 0 ? -1 : 1;
  if (!Number.isInteger(current) || current < 0 || current >= count) return step > 0 ? 0 : count - 1;
  return (current + step + count) % count;
}

// The focus-cycling helper every shell menu shares (the title board and its
// dialogs, the pause menu and its panels): the controls ↑ ↓ / W S / the D-pad
// move through are the container's visible, enabled buttons, button-like
// rows, sliders, checkboxes and links, in document order.
export const NAVIGABLE_SELECTOR = 'button, [role="button"][tabindex], input, a[href]';

export function navigableControls(container) {
  if (!container?.querySelectorAll) return [];
  return [...container.querySelectorAll(NAVIGABLE_SELECTOR)].filter((element) => !element.disabled
    && !element.classList?.contains('is-disabled')
    && element.getAttribute?.('aria-disabled') !== 'true'
    && element.getClientRects().length > 0);
}

/** Move focus one control up or down inside `container`; returns the control. */
export function moveFocusWithin(container, direction, active = globalThis.document?.activeElement) {
  const items = navigableControls(container);
  const next = items[cycleIndex(items.indexOf(active), items.length, direction)] ?? null;
  next?.focus({ preventScroll: false });
  next?.scrollIntoView?.({ block: 'nearest' });
  return next;
}

/**
 * Press the focused control (a gamepad A, or Enter on a control that has no
 * native Enter, like a checkbox). A slider has nothing to press. With focus
 * outside the container, the first control takes focus instead.
 */
export function activateWithin(container, active = globalThis.document?.activeElement) {
  const items = navigableControls(container);
  const target = items.includes(active) ? active : null;
  if (!target) { items[0]?.focus(); return null; }
  if (target.type === 'range') return target;
  target.click();
  return target;
}

// Standard-mapping gamepad buttons (https://w3c.github.io/gamepad/#remapping).
export const PAD_BUTTONS = Object.freeze({ A: 0, B: 1, START: 9, UP: 12, DOWN: 13 });
export const PAD_REPEAT_DELAY_MS = 380;
export const PAD_REPEAT_MS = 140;

const pressed = (pad, index) => Boolean(pad?.buttons?.[index]?.pressed);

/** The buttons this module reads, as booleans, merged across every pad. */
export function readPadButtons(pads) {
  const state = { up: false, down: false, a: false, b: false, start: false };
  for (const pad of pads ?? []) {
    if (!pad || pad.connected === false) continue;
    state.up ||= pressed(pad, PAD_BUTTONS.UP);
    state.down ||= pressed(pad, PAD_BUTTONS.DOWN);
    state.a ||= pressed(pad, PAD_BUTTONS.A);
    state.b ||= pressed(pad, PAD_BUTTONS.B);
    state.start ||= pressed(pad, PAD_BUTTONS.START);
  }
  return state;
}

/**
 * Edge detection for one poll. Returns { actions, memory }: `actions` is a
 * list of 'prev' | 'next' | 'activate' | 'back'. The D-pad acts on press and
 * repeats while held. A (activate), B and START (back) act on release, so the
 * button is already up when a Resume hands control back to the game: a
 * still-held A would read as a jump there, a held START as "pause again". A
 * button held when the menu opened (`memory` null) never fires until it has
 * been released once.
 */
export function padStep(memory, buttons, now) {
  const actions = [];
  if (!memory) {
    const heldAtOpen = buttons.up && !buttons.down ? 'prev' : buttons.down && !buttons.up ? 'next' : null;
    return { actions, memory: { ...buttons, held: heldAtOpen, heldSince: Infinity, lastRepeat: 0 } };
  }
  const next = { ...memory, ...buttons };
  const dir = buttons.up && !buttons.down ? 'prev' : buttons.down && !buttons.up ? 'next' : null;
  if (dir && dir !== memory.held) {
    actions.push(dir);
    next.held = dir;
    next.heldSince = now;
    next.lastRepeat = now;
  } else if (dir && now - memory.heldSince >= PAD_REPEAT_DELAY_MS && now - memory.lastRepeat >= PAD_REPEAT_MS) {
    actions.push(dir);
    next.lastRepeat = now;
  } else if (!dir) {
    next.held = null;
  }
  // A, B and START fire on release: pressed and released while the menu is
  // open, and already up when control returns to the game.
  for (const [button, action] of [['a', 'activate'], ['b', 'back'], ['start', 'back']]) {
    const armed = `armed_${button}`;
    if (buttons[button] && !memory[button]) next[armed] = true;
    if (!buttons[button] && memory[button] && memory[armed]) { actions.push(action); next[armed] = false; }
  }
  return { actions, memory: next };
}

/**
 * A ~60 Hz poll of navigator.getGamepads() that runs only between start()
 * and stop() (the pause menu starts it when it opens). A timer rather than
 * requestAnimationFrame: a heavy 3D chapter can keep its frame rate low
 * behind the menu, and the menu should still answer the pad.
 */
export function createMenuGamepadPoll(onAction, {
  getGamepads = () => globalThis.navigator?.getGamepads?.() ?? [],
  every = (callback) => globalThis.setInterval(callback, 16),
  cancel = (id) => globalThis.clearInterval(id),
  now = () => globalThis.performance.now(),
} = {}) {
  let timer = null;
  let memory = null;
  const tick = () => {
    let pads;
    try { pads = getGamepads(); } catch { pads = []; }
    const step = padStep(memory, readPadButtons(pads), now());
    memory = step.memory;
    step.actions.forEach((action) => onAction(action));
  };
  return {
    start() {
      if (timer !== null) return;
      memory = null;
      timer = every(tick);
    },
    stop() {
      if (timer !== null) cancel(timer);
      timer = null;
      memory = null;
    },
    get running() { return timer !== null; },
  };
}
