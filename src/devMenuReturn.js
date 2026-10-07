import { DEV_MODE } from './devMode.js';
import { createSaveStore } from './shell/saveSystem.js';

// Every independently runnable chapter gets the same escape hatch while the
// root Vite dev server is active. In production (and in standalone builds,
// which never define __DEV_MODE__) the only thing this does is record the
// chapter's checkpoint: no floating button and no hotkey — players leave a
// chapter through the pause menu's RETURN TO TITLE.
const CONTROL_ID = 'nightfall-dev-menu-return';

const PRODUCTION_CHECKPOINTS = Object.freeze({
  '/car03-3d.html': 'chapter-3-start',
  '/painted-country.html': 'chapter-4-start',
  '/museum-3d.html': 'chapter-5-start',
  '/final-boss.html': 'chapter-6-start',
});

function returnToDevMenu() {
  window.location.assign('/');
}

export const DEV_LINK_SPOTS = Object.freeze(['top-right', 'bottom-left', 'top-left', 'bottom-right']);
const CLICKABLE = 'button, a[href], input, select, textarea, [role="button"]';

// True when a visible clickable element other than the link lies under the
// link's box (with a small margin). Rect-based, so round buttons count too.
export function coversControl(control, doc = document) {
  const r = control.getBoundingClientRect();
  if (!r.width || !r.height) return false;
  const pad = 4;
  for (const el of doc.querySelectorAll(CLICKABLE)) {
    if (el === control || control.contains(el) || el.contains(control)) continue;
    const b = el.getBoundingClientRect();
    if (!b.width || !b.height) continue;
    if (b.right < r.left - pad || b.left > r.right + pad || b.bottom < r.top - pad || b.top > r.bottom + pad) continue;
    const style = doc.defaultView?.getComputedStyle?.(el);
    if (style && (style.visibility === 'hidden' || style.pointerEvents === 'none' || Number(style.opacity) === 0)) continue;
    // Only a control that is actually on top where it stands (not one behind
    // a closed overlay or under the game canvas) is worth stepping aside for.
    const stack = doc.elementsFromPoint(b.left + b.width / 2, b.top + b.height / 2);
    const first = stack.find((hit) => hit !== control && !control.contains(hit));
    if (first && (first === el || el.contains(first))) return true;
  }
  return false;
}

function dodgeControls(control) {
  if (!coversControl(control)) return;
  const start = DEV_LINK_SPOTS.indexOf(control.dataset.spot);
  for (let i = 1; i <= DEV_LINK_SPOTS.length; i += 1) {
    control.dataset.spot = DEV_LINK_SPOTS[(start + i) % DEV_LINK_SPOTS.length];
    if (!coversControl(control)) return;
  }
  control.dataset.spot = DEV_LINK_SPOTS[0];
}

export function installDevMenuReturnControl() {
  if (typeof window === 'undefined' || window.top !== window) return;
  if (document.getElementById(CONTROL_ID)) return;

  if (!DEV_MODE) {
    const checkpoint = PRODUCTION_CHECKPOINTS[window.location.pathname];
    if (checkpoint) createSaveStore().markCheckpoint(checkpoint);
    return;
  }

  const style = document.createElement('style');
  style.textContent = `
    #${CONTROL_ID} {
      position: fixed; z-index: 10000; top: 14px; right: 14px;
      display: inline-flex; align-items: center; min-height: 30px;
      padding: 0 10px; border: 1px solid #8b9aaa; background: #071019e8;
      color: #e0e7ef; box-shadow: 0 7px 20px #0008;
      font: 700 10px/1 ui-monospace, SFMono-Regular, Menlo, monospace;
      letter-spacing: .1em; text-decoration: none;
    }
    #${CONTROL_ID}:hover, #${CONTROL_ID}:focus-visible {
      background: #d8c067; border-color: #f4df8d; color: #071019; outline: none;
    }
    @media (max-width: 1050px) {
      #${CONTROL_ID}[data-spot="top-right"] { top: 76px; }
    }
    #${CONTROL_ID}[data-spot="bottom-left"] { top: auto; right: auto; bottom: 14px; left: 14px; }
    #${CONTROL_ID}[data-spot="top-left"] { right: auto; left: 14px; }
    #${CONTROL_ID}[data-spot="bottom-right"] { top: auto; bottom: 14px; }
  `;
  document.head.append(style);

  const control = document.createElement('a');
  control.id = CONTROL_ID;
  control.href = '/';
  control.textContent = '` DEV MENU';
  control.setAttribute('aria-label', 'Return to development menu');
  control.addEventListener('click', (event) => {
    event.preventDefault();
    returnToDevMenu();
  });
  control.dataset.spot = DEV_LINK_SPOTS[0];
  document.body.append(control);
  // The link floats above every page, so it must never sit on top of a real
  // control (Ch5's exhibit × was under it, alpha 5). Step aside when one is.
  window.setInterval(() => dodgeControls(control), 400);

  window.addEventListener('keydown', (event) => {
    if (event.key !== '`' || event.metaKey || event.ctrlKey || event.altKey) return;
    event.preventDefault();
    returnToDevMenu();
  });
}
