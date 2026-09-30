import './fonts/fonts.css';
import './shell/uiKit.css';
import './shell/titleMenu.css';
import { DEV_MODE, hasDevRoute } from './devMode.js';
import { createTitleMenu } from './shell/titleMenu.js';
import { createSaveStore, launchCheckpoint } from './shell/saveSystem.js';
import { resolveCheckpointRoute } from './shell/finalBossRoute.js';

// index.html is only the shell: the title menu, the credits and (in
// `npm run dev`) the chapter launcher. It boots no game. Every chapter is its
// own page, and New Game / Continue / Load navigate to it through the save
// checkpoints in shell/saveSystem.js — which also map the legacy ids
// (`prologue-start` → night-service.html Act 1, `chapter-2-*` →
// borrowed-light.html) so old saves still resume on the right page.
//
//   /?credits=1  the title with the credits roll open (the ending returns here)
//   /?play=1     legacy "skip the title" entry: resume the active checkpoint,
//                or show the title when there is no journey to resume
//   /?title=1    dev only: the production title instead of the launcher
const params = new URLSearchParams(window.location.search);

function resumeActiveCheckpoint() {
  const store = createSaveStore();
  const slot = store.getActiveSlot();
  const save = store.readAll()[slot];
  if (!save) return false;
  launchCheckpoint(save.checkpointId, {
    replace: true,
    route: resolveCheckpointRoute(save.checkpointId, { slot }),
  });
  return true;
}

if (params.get('credits') === '1') {
  createTitleMenu({ openCredits: true });
} else if (params.get('play') === '1') {
  if (!resumeActiveCheckpoint()) createTitleMenu();
} else if (DEV_MODE && params.get('title') !== '1') {
  // The old Phaser Prologue's `?chapter=` / `?qa=` deep links have nowhere to
  // go any more; say so on the launcher instead of silently ignoring them.
  // A dynamic import inside a DEV_MODE branch, so a production bundle never
  // carries the launcher or its route list.
  import('./shell/devLauncher.js').then(({ createDevLauncher }) => createDevLauncher({
    note: hasDevRoute() ? `${window.location.search} was a route into the retired Phaser Prologue. Pick a chapter page below.` : '',
  }));
} else {
  createTitleMenu();
}
