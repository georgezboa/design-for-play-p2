import { DEV_MODE } from './devMode.js';
import { createSaveStore, returnToTitle } from './shell/saveSystem.js';

// Every independently runnable chapter gets the same escape hatch while the
// root Vite dev server is active. Standalone production builds never define
// __DEV_MODE__, so this module becomes a no-op there.
const CONTROL_ID = 'nightfall-dev-menu-return';

const PRODUCTION_CHECKPOINTS = Object.freeze({
  '/car03-3d.html': 'chapter-3-start',
  '/painted-country.html': 'chapter-4-start',
  '/museum-3d.html': 'chapter-5-start',
  '/car06.html': 'chapter-6-start',
  '/final-boss.html': 'chapter-6-start',
});

function returnToDevMenu() {
  window.location.assign('/');
}

export function installDevMenuReturnControl() {
  if (typeof window === 'undefined' || window.top !== window) return;
  if (document.getElementById(CONTROL_ID)) return;

  if (!DEV_MODE) {
    const checkpoint = PRODUCTION_CHECKPOINTS[window.location.pathname];
    if (checkpoint) createSaveStore().markCheckpoint(checkpoint);
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
      #${CONTROL_ID} { top: 76px; }
    }
  `;
  document.head.append(style);

  const control = document.createElement('a');
  control.id = CONTROL_ID;
  control.href = '/';
  control.textContent = DEV_MODE ? '` DEV MENU' : 'TITLE';
  control.setAttribute('aria-label', DEV_MODE ? 'Return to development menu' : 'Return to title screen');
  control.addEventListener('click', (event) => {
    event.preventDefault();
    if (DEV_MODE) returnToDevMenu();
    else returnToTitle();
  });
  document.body.append(control);

  window.addEventListener('keydown', (event) => {
    const requested = DEV_MODE ? event.key === '`' : event.key.toLowerCase() === 't';
    if (!requested || event.metaKey || event.ctrlKey || event.altKey) return;
    event.preventDefault();
    if (DEV_MODE) returnToDevMenu();
    else returnToTitle();
  });
}
