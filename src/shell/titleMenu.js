import {
  applySettings,
  createSaveStore,
  formatSave,
  launchCheckpoint,
  loadListCheckpoints,
  readSettings,
  seedRouterSave,
  volumeForChannel,
  writeSettings,
} from './saveSystem.js';
import {
  CREDIT_EXTERNAL,
  CREDIT_GENERATIVE,
  CREDIT_MUSIC,
  CREDIT_TEAM,
} from './creditsData.js';
import { CINEMATICS, playCinematic } from './gameFlow.js';
import { DEV_MODE, PLAYTEST_MODE, activateHiddenRouter, clearHiddenRouter } from '../devMode.js';
import { quitGame, toggleFullscreen } from './desktopBridge.js';
import { SETTINGS_CONTROLS } from './settingsControls.js';
import { DEV_ROUTES, routerEntries } from './devRoutes.js';
import { resolveCheckpointRoute } from './finalBossRoute.js';
import { activateWithin, createMenuGamepadPoll, menuKeyAction, moveFocusWithin } from './menuNavigation.js';
import { missingStoneNotice } from './magicStones.js';
import { dressCarriageWall } from './titleCarriage.js';
import { mountTitleScene } from './titlePlate.js';
import { clearCreditsQuery } from './endCredits.js';
import { BOARD_FIT_LEVELS, boardFits, creditDepartureTime, formatCreditRate } from './titleMenuBoard.js';

// The title always shows the player's own three slots, never a test route's
// scratch slots (saveSystem.js ROUTER_SAVE_KEY).
const store = createSaveStore(undefined, { scratch: false });

function button(label, action, className = '', description = '') {
  const element = document.createElement('button');
  element.type = 'button';
  element.className = `nf-action ${className}`.trim();
  const copy = document.createElement('span');
  copy.className = 'nf-action-label';
  copy.textContent = label;
  element.append(copy);
  if (description) {
    const detail = document.createElement('small');
    detail.className = 'nf-action-detail';
    detail.textContent = description;
    element.append(detail);
  }
  element.addEventListener('click', action);
  return element;
}

// `ending` is set when a run's credits roll here: 'normal' (the Conductor
// outlasted) shows which magic stones were missed once the roll is over.
export function createTitleMenu({ openCredits = false, ending = null } = {}) {
  applySettings(readSettings());
  // Back on the title, a test route (1111 router, dev launcher) is over.
  clearHiddenRouter();
  const root = document.createElement('main');
  root.id = 'nightfall-title';
  // One carriage behind (titlePlate.js, titleMenu.css): the whole screen is
  // the inside of the night service, painted at runtime in Chapter 1's ink
  // language. The wordmark is gilded on its window glass, and the menu is
  // the departures plaque on its wall, where the selected line becomes a
  // punched paper ticket.
  root.innerHTML = `
    <div class="nf-scene" aria-hidden="true"></div>
    <header class="nf-wordmark">
      <h1>NIGHTFALL</h1>
      <span class="nf-wordmark-rule" aria-hidden="true"><b></b></span>
      <p>THE LAST ARCHIVE LINE</p>
    </header>
    <section class="nf-menu" aria-label="NIGHTFALL main menu">
      <header class="nf-menu-header">
        <span class="nf-menu-rule"></span>
        <p class="nf-kicker">NIGHT SERVICE · DEPARTURES</p>
        <span class="nf-menu-rule"></span>
      </header>
      <p class="nf-board-columns" aria-hidden="true"><span>No.</span><span>SERVICE</span><span>LINE 01</span></p>
      <nav class="nf-main-actions" aria-label="Main menu"></nav>
      <footer class="nf-menu-footer">
        <p class="nf-status" role="status" aria-live="polite"></p>
        <p class="nf-hint"><span><kbd>↑</kbd><kbd>↓</kbd> SELECT</span> <span><kbd>ENTER</kbd> CONFIRM</span> <span><kbd>F</kbd> FULLSCREEN</span></p>
      </footer>
    </section>
    <dialog class="nf-dialog" id="nf-dialog">
      <div class="nf-dialog-ornament" aria-hidden="true"><span></span><b>◇</b><span></span></div>
      <div class="nf-dialog-inner"></div>
    </dialog>
  `;
  document.body.append(root);
  dressCarriageWall(root);
  // The scene stops moving whenever it cannot be seen: under a dialog, in a
  // background tab, once a chapter is on its way (titlePlate.js).
  const scene = mountTitleScene(root);
  root.__scene = scene;
  const actions = root.querySelector('.nf-main-actions');
  const status = root.querySelector('.nf-status');
  const dialog = root.querySelector('#nf-dialog');
  const panel = dialog.querySelector('.nf-dialog-inner');
  const creditAudio = new Audio(CREDIT_MUSIC[0].localFile);
  creditAudio.dataset.nightfallAudioChannel = 'music';
  creditAudio.loop = true;
  creditAudio.preload = 'metadata';
  let lastFocusedAction = null;
  let creditRollAnimation = null;
  let creditPlaybackRate = 1;
  let hiddenChapterSequence = '';
  let hiddenChapterTimer = null;

  const syncCreditVolume = (settings = readSettings()) => {
    creditAudio.volume = Math.max(0, Math.min(1,
      volumeForChannel(settings, 'music') * 0.62));
  };
  const stopCreditsMusic = () => {
    creditAudio.pause();
    creditAudio.currentTime = 0;
    root.dataset.creditMusic = 'stopped';
  };
  const stopCreditsRoll = () => {
    creditRollAnimation?.cancel();
    creditRollAnimation = null;
    root.__creditsAnimation = null;
    root.dataset.creditRoll = 'stopped';
    root.dataset.creditRate = '1.00x';
    creditPlaybackRate = 1;
  };

  const closeDialog = () => {
    stopCreditsMusic();
    stopCreditsRoll();
    if (dialog.open) dialog.close();
    scene.hold('dialog', false);
    dialog.classList.remove('nf-dialog--credits-roll');
    panel.classList.remove('nf-credits-panel');
    root.dataset.chapterSelect = 'closed';
    // back on the title: the credits route is spent (the stones card that may
    // follow reads `ending` from this closure, not the URL)
    clearCreditsQuery(window);
    (lastFocusedAction?.isConnected ? lastFocusedAction : actions.querySelector('button'))?.focus();
  };
  const openDialog = () => {
    // Remember the board line only when the dialog first opens: moving
    // between its panels (slots → checkpoints → confirm) keeps that line.
    if (!dialog.open) {
      lastFocusedAction = document.activeElement;
      dialog.showModal();
    }
    // the dialog's backdrop dims the scene; it holds still under it
    scene.hold('dialog', true);
  };
  dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    const wasCredits = creditsOpen();
    closeDialog();
    if (wasCredits) showEndingStones();
  });

  const citationLink = (label, href) => {
    const anchor = document.createElement('a');
    anchor.href = href;
    anchor.target = '_blank';
    anchor.rel = 'noreferrer';
    anchor.textContent = label;
    return anchor;
  };

  const renderCredits = () => {
    dialog.dataset.variant = 'credits';
    panel.replaceChildren();
    panel.classList.add('nf-credits-panel');
    dialog.classList.add('nf-dialog--credits-roll');
    root.dataset.creditRate = '1.00x';

    const viewport = document.createElement('div');
    viewport.className = 'nf-credits-viewport';
    const roll = document.createElement('div');
    roll.className = 'nf-credits-roll';
    viewport.append(roll);

    const heading = document.createElement('header');
    heading.className = 'nf-credits-heading';
    heading.innerHTML = `
      <p class="nf-eyebrow">FINAL DEPARTURES · LINE 01</p>
      <h2>NIGHTFALL</h2>
      <p>THE LAST ARCHIVE LINE</p>
      <span>A GAME BY</span>
    `;
    roll.append(heading);

    const team = document.createElement('section');
    team.className = 'nf-credit-section nf-credit-section--crew';
    team.innerHTML = '<h3><span>01</span> CREW MANIFEST</h3><p class="nf-credit-route">NIGHT SERVICE · FINAL DEPARTURE</p>';
    const roster = document.createElement('div');
    roster.className = 'nf-credit-roster';
    CREDIT_TEAM.forEach((member, index) => {
      const row = document.createElement('article');
      row.className = `nf-credit-ticket nf-credit-style--${member.style}${member.featured ? ' is-featured' : ''}`;
      row.innerHTML = `
        <span class="nf-credit-time">${creditDepartureTime(index)}</span>
        <strong>${member.name}</strong>
        <small>${member.stamp}</small>
        <b>${member.role}</b>
      `;
      roster.append(row);
    });
    team.append(roster);
    roll.append(team);

    const worlds = document.createElement('section');
    worlds.className = 'nf-credit-worlds';
    worlds.innerHTML = `
      <article class="nf-credit-world nf-credit-style--night"><span>CAR 01</span><strong>NIGHT SERVICE</strong><small>BRASS · STEEL · AMBER MEMORY</small></article>
      <article class="nf-credit-world nf-credit-style--grid"><span>CAR 02</span><strong>BORROWED LIGHT</strong><small>RAIN · BELL · BORROWED SIGNAL</small></article>
      <article class="nf-credit-world nf-credit-style--city"><span>CAR 03</span><strong>ECHO CITY</strong><small>STONE · FIRE · CIVIC RECORD</small></article>
      <article class="nf-credit-world nf-credit-style--paper"><span>CAR 04</span><strong>THE PAINTED COUNTRY</strong><small>PAPER · INK · THE HAWTHORN</small></article>
      <article class="nf-credit-world nf-credit-style--night"><span>CAR 05</span><strong>THE MUSEUM OF ONE ANSWER</strong><small>GLASS · LEDGER · ONE CLEAN ANSWER</small></article>
      <article class="nf-credit-world nf-credit-style--city"><span>CAR 06</span><strong>ALL WORLDS AT ONCE</strong><small>THE CONDUCTOR · THE BLACK TICKET</small></article>
    `;
    roll.append(worlds);

    const music = document.createElement('section');
    music.className = 'nf-credit-section nf-credit-section--music';
    music.innerHTML = '<h3><span>02</span> MUSIC REGISTER</h3>';
    CREDIT_MUSIC.forEach((track) => {
      const row = document.createElement('article');
      row.className = 'nf-credit-ledger';
      row.innerHTML = `<span>${track.use}</span><strong>${track.title}</strong><b>${track.creator}</b><small>${track.note}</small>`;
      const links = document.createElement('div');
      links.className = 'nf-credit-links';
      links.append(citationLink('SOURCE', track.source), citationLink(track.license, track.licenseUrl));
      row.append(links);
      music.append(row);
    });
    roll.append(music);

    const generative = document.createElement('section');
    generative.className = 'nf-credit-section';
    generative.innerHTML = '<h3><span>03</span> GENERATIVE PRODUCTION LOG</h3>';
    CREDIT_GENERATIVE.forEach((item, index) => {
      const row = document.createElement('article');
      row.className = `nf-credit-ledger nf-credit-style--${['night', 'grid', 'city', 'paper'][index % 4]}`;
      const copy = document.createElement('div');
      copy.innerHTML = `<strong>${item.label}</strong><p>${item.detail}</p>`;
      row.append(copy);
      if (item.source) row.append(citationLink('OFFICIAL SOURCE ↗', item.source));
      generative.append(row);
    });
    roll.append(generative);

    const external = document.createElement('section');
    external.className = 'nf-credit-section';
    external.innerHTML = '<h3><span>04</span> LICENSED SOURCE MATERIAL</h3>';
    CREDIT_EXTERNAL.forEach((item) => {
      const row = document.createElement('article');
      row.className = 'nf-credit-ledger nf-credit-ledger--compact';
      row.append(citationLink(item.label, item.source));
      const detail = document.createElement('small');
      detail.textContent = item.detail;
      row.append(detail);
      external.append(row);
    });
    roll.append(external);

    const note = document.createElement('p');
    note.className = 'nf-credit-note';
    note.textContent = 'Specific runtime manifests remain the authority for per-file provenance. Missing provider metadata is disclosed rather than guessed.';
    const endCard = document.createElement('footer');
    endCard.className = 'nf-credits-end';
    endCard.innerHTML = '<span>◇</span><p>END OF LINE</p><small>THANK YOU FOR RIDING WITH US</small>';
    roll.append(note, endCard);

    const controls = document.createElement('div');
    controls.className = 'nf-credits-controls';
    const pause = button('PAUSE', () => {
      if (!creditRollAnimation) return;
      if (creditRollAnimation.playState === 'paused') {
        creditRollAnimation.play();
        root.dataset.creditRoll = 'rolling';
      } else {
        creditRollAnimation.pause();
        root.dataset.creditRoll = 'paused';
      }
      pause.querySelector('.nf-action-label').textContent = creditRollAnimation.playState === 'paused' ? 'RESUME' : 'PAUSE';
    }, 'nf-roll-control');
    const restart = button('RESTART', () => {
      if (!creditRollAnimation) return;
      creditRollAnimation.currentTime = 0;
      creditRollAnimation.play();
      root.dataset.creditRoll = 'rolling';
      pause.querySelector('.nf-action-label').textContent = 'PAUSE';
    }, 'nf-roll-control');
    const exitCredits = button('EXIT', () => { closeDialog(); showEndingStones(); }, 'nf-roll-control');
    controls.append(pause, restart, exitCredits);
    const legend = document.createElement('p');
    legend.className = 'nf-credits-legend';
    // ↑ slows the roll, ↓ speeds it: both said, and the speed shown (alpha R4 · P2)
    legend.innerHTML = '<kbd>SPACE</kbd> PAUSE <i></i> <kbd>↑</kbd> SLOWER <i></i> <kbd>↓</kbd> FASTER <i></i> <kbd>R</kbd> RESTART <i></i> <kbd>ESC</kbd> EXIT';
    const rate = document.createElement('span');
    rate.className = 'nf-credits-rate';
    rate.setAttribute('aria-live', 'polite');
    rate.textContent = formatCreditRate(1);
    controls.append(rate, legend);
    panel.append(viewport, controls);
    openDialog();
    syncCreditVolume();
    root.dataset.creditMusic = 'requested';
    creditAudio.play()
      .then(() => { root.dataset.creditMusic = 'playing'; })
      .catch(() => { root.dataset.creditMusic = 'blocked'; });
    exitCredits.focus();

    if (readSettings().reducedMotion) {
      root.dataset.creditRoll = 'static';
      viewport.classList.add('is-static');
      return;
    }
    requestAnimationFrame(() => {
      // Dialog focus/scroll anchoring can move an overflow-hidden viewport when
      // the long roll is mounted. The transform is the sole scroll mechanism.
      viewport.scrollTop = 0;
      const startY = Math.round(viewport.clientHeight * 0.16);
      const endY = -(roll.scrollHeight - Math.round(viewport.clientHeight * 0.54));
      creditRollAnimation = roll.animate([
        { transform: `translateY(${startY}px)`, offset: 0 },
        { transform: `translateY(${startY}px)`, offset: 0.035 },
        { transform: `translateY(${endY}px)`, offset: 0.965 },
        { transform: `translateY(${endY}px)`, offset: 1 },
      ], { duration: 138000, easing: 'linear', fill: 'forwards' });
      creditRollAnimation.playbackRate = creditPlaybackRate;
      creditRollAnimation.onfinish = () => {
        root.dataset.creditRoll = 'complete';
        showEndingStones();
      };
      root.__creditsAnimation = creditRollAnimation;
      root.dataset.creditRoll = 'rolling';
      viewport.scrollTop = 0;
    });
  };

  // The in-game confirmation (an archive card, the quit dialog's look) in
  // place of the browser's confirm(). CANCEL has focus, so a stray Enter
  // never overwrites or deletes anything.
  const renderConfirm = ({ eyebrow = 'ARCHIVE MEMORY', title, copy, confirmLabel, onConfirm, onCancel }) => {
    dialog.dataset.variant = 'confirm';
    panel.classList.remove('nf-credits-panel');
    panel.replaceChildren();
    const heading = document.createElement('div');
    heading.className = 'nf-confirm-copy';
    heading.innerHTML = '<p class="nf-eyebrow"></p><h2></h2><p class="nf-empty"></p>';
    heading.querySelector('.nf-eyebrow').textContent = eyebrow;
    heading.querySelector('h2').textContent = title;
    heading.querySelector('.nf-empty').textContent = copy;
    const cancel = button('CANCEL', () => onCancel?.(), 'nf-back');
    panel.append(heading, button(confirmLabel, () => onConfirm?.(), 'nf-danger'), cancel);
    openDialog();
    cancel.focus();
  };

  // New journey in a slot: the opening film, then Chapter 1.
  const startJourney = (index) => {
    store.startNew(index);
    status.textContent = `SLOT ${index + 1} · NIGHT SERVICE AWAKENING`;
    closeDialog();
    padPoll.stop();
    scene.hold('loading', true);
    scene.destroy();
    root.remove();
    playCinematic({
      id: 'opening',
      src: CINEMATICS.opening,
      label: 'NIGHTFALL opening cinematic',
      preloadChapterId: 'chapter1',
      // Chapter 1 is its own page: the NIGHT SERVICE panel puzzle.
      onComplete: () => window.location.assign('/night-service.html'),
    });
  };

  // After a normal ending's credits: how many magic stones this journey held
  // and where the missing ones were (magicStones.js missingStoneNotice), once.
  let endingStonesShown = false;
  const showEndingStones = () => {
    if (ending !== 'normal' || endingStonesShown) return;
    const save = store.readAll()[store.getActiveSlot()];
    const notice = missingStoneNotice(save?.magicStones ?? []);
    if (!notice) return;
    endingStonesShown = true;
    if (dialog.open) closeDialog();
    dialog.dataset.variant = 'stones';
    panel.classList.remove('nf-credits-panel');
    panel.replaceChildren();
    const card = document.createElement('div');
    card.className = 'nf-stones-card';
    card.innerHTML = '<p class="nf-eyebrow"></p><h2></h2><p class="nf-empty"></p><div class="nf-stones-sockets"></div><ul class="nf-stones-clues"></ul>';
    card.querySelector('.nf-eyebrow').textContent = notice.stamp;
    card.querySelector('h2').textContent = notice.title;
    card.querySelector('.nf-empty').textContent = notice.line;
    card.querySelector('.nf-stones-sockets').innerHTML = notice.socketsHtml;
    const list = card.querySelector('.nf-stones-clues');
    notice.clues.forEach((clue) => { const item = document.createElement('li'); item.textContent = clue; list.append(item); });
    panel.append(card, button('BACK TO THE TITLE', closeDialog, 'nf-back'));
    openDialog();
    panel.querySelector('.nf-back')?.focus();
  };

  const renderSlots = (mode) => {
    dialog.dataset.variant = mode === 'new' ? 'slots-new' : 'slots-load';
    panel.classList.remove('nf-credits-panel');
    panel.replaceChildren();
    const heading = document.createElement('div');
    heading.className = 'nf-dialog-heading';
    heading.innerHTML = `<p class="nf-eyebrow">ARCHIVE MEMORY</p><h2>${mode === 'new' ? 'BEGIN THE NIGHT SERVICE' : 'LOAD / CHECKPOINTS'}</h2>`;
    panel.append(heading);
    store.readAll().forEach((save, index) => {
      const info = formatSave(save);
      const row = document.createElement('article');
      row.className = save ? 'nf-slot' : 'nf-slot is-empty';
      row.innerHTML = `<span class="nf-slot-index">${String(index + 1).padStart(2, '0')}</span><span class="nf-slot-meta">ARCHIVE SLOT</span><strong>${info.title}</strong><small>${info.detail}</small><b aria-hidden="true">›</b>`;
      row.tabIndex = 0;
      row.setAttribute('role', 'button');
      const activate = () => {
        // An empty slot begins a new journey from either list.
        if (!save) { startJourney(index); return; }
        if (mode === 'new') {
          renderConfirm({
            title: `OVERWRITE SLOT ${index + 1}?`,
            copy: `${info.title} · ${info.detail}. This journey will be replaced by a new one.`,
            confirmLabel: 'OVERWRITE',
            onConfirm: () => startJourney(index),
            onCancel: () => renderSlots(mode),
          });
          return;
        }
        store.setActiveSlot(index);
        renderCheckpoints(index);
      };
      row.addEventListener('click', activate);
      // preventDefault: the checkpoint list takes focus during this keydown,
      // and the same Enter must not go on to click its first checkpoint.
      row.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        activate();
      });
      panel.append(row);
    });
    panel.append(button('BACK', closeDialog, 'nf-back'));
    openDialog();
    panel.querySelector('[tabindex]')?.focus();
  };

  const renderCheckpoints = (selectedIndex = store.getActiveSlot()) => {
    panel.classList.remove('nf-credits-panel');
    dialog.dataset.variant = 'checkpoints';
    const index = selectedIndex;
    const save = store.readAll()[index];
    panel.innerHTML = `<p class="nf-eyebrow">SLOT ${index + 1}</p><h2>CHECKPOINTS</h2>`;
    if (!save) panel.insertAdjacentHTML('beforeend', '<p class="nf-empty">This slot has no journey.</p>');
    loadListCheckpoints(save).forEach(({ checkpoint, selected }) => {
      const row = button(`${selected ? '◆' : '◇'}  CHAPTER ${checkpoint.chapter} · ${checkpoint.title}`, () => {
        store.selectCheckpoint(index, checkpoint.id);
        launchCheckpoint(checkpoint.id, { route: resolveCheckpointRoute(checkpoint.id, { slot: index }) });
      }, 'nf-checkpoint');
      panel.append(row);
    });
    if (save) panel.append(button('DELETE SLOT', () => renderConfirm({
      title: `DELETE SLOT ${index + 1}?`,
      copy: `${formatSave(save).title} · this journey and its magic stones are gone for good.`,
      confirmLabel: 'DELETE',
      onConfirm: () => { store.remove(index); closeDialog(); refresh(); },
      onCancel: () => renderCheckpoints(index),
    }), 'nf-danger'));
    panel.append(button('BACK', closeDialog, 'nf-back'));
    openDialog();
    panel.querySelector('button')?.focus();
  };

  const renderSettings = () => {
    panel.classList.remove('nf-credits-panel');
    dialog.dataset.variant = 'settings';
    const settings = readSettings();
    panel.innerHTML = `<p class="nf-eyebrow">SYSTEM</p><h2>SETTINGS</h2>`;
    SETTINGS_CONTROLS.forEach(([key, label, type, min, max]) => {
      const row = document.createElement('label');
      row.className = 'nf-setting';
      row.innerHTML = `<span>${label}</span>`;
      const input = document.createElement('input');
      input.type = type;
      input.dataset.setting = key;
      // The brass slider's amber fill follows the value (titleMenu.css).
      const fill = () => input.style.setProperty('--nf-range', `${((input.value - min) / (max - min)) * 100}%`);
      if (type === 'range') { input.min = min; input.max = max; input.value = settings[key]; fill(); }
      else input.checked = settings[key];
      input.addEventListener('input', () => {
        if (type === 'range') fill();
        const next = readSettings();
        next[key] = type === 'range' ? Number(input.value) : input.checked;
        writeSettings(next);
      });
      row.append(input);
      panel.append(row);
    });
    panel.append(button('TOGGLE FULLSCREEN', () => toggleFullscreen()));
    panel.append(button('BACK', closeDialog, 'nf-back'));
    openDialog();
    panel.querySelector('input, button')?.focus();
  };

  // The 1111 router names playable test nodes, not just broad chapters, and
  // opens them directly: films are useful for transition testing but slow
  // down moment-to-moment playtests. Dev build only: a shipped title has no
  // router, and typing 1111 there does nothing. The list lives in
  // devRoutes.js, shared with the dev launcher.
  // A playtest build lists only the nodes it can open, with player-safe copy
  // (routerEntries); the dev build keeps every node.
  const hiddenChapters = DEV_MODE ? DEV_ROUTES : PLAYTEST_MODE ? routerEntries() : [];

  const launchHiddenChapter = (chapter) => {
    // The node plays on scratch slots: the player's saves stay as they were.
    seedRouterSave(chapter.checkpoint, { stones: chapter.stones ?? null });
    activateHiddenRouter();
    closeDialog();
    scene.hold('loading', true);
    root.remove();
    window.location.assign(chapter.route);
  };

  const renderHiddenChapterSelect = () => {
    dialog.dataset.variant = 'router';
    panel.classList.remove('nf-credits-panel');
    panel.innerHTML = '<div class="nf-dialog-heading"><p class="nf-eyebrow">ARCHIVE ROUTING · 1111</p><h2>SELECT TEST NODE</h2><p class="nf-empty">Every entry skips transition films and opens its playable node directly. Test nodes play on a scratch save: your slots are not touched.</p></div>';
    let group = null;
    hiddenChapters.forEach((chapter) => {
      if (chapter.group !== group) {
        group = chapter.group;
        const heading = document.createElement('h3');
        heading.className = 'nf-chapter-group';
        heading.textContent = group;
        panel.append(heading);
      }
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'nf-slot nf-chapter-jump';
      row.dataset.chapter = chapter.id;
      row.innerHTML = `<span class="nf-slot-index">${chapter.id}</span><span class="nf-slot-meta">TEST NODE</span><strong>${chapter.title}</strong><small>${chapter.detail}</small><b aria-hidden="true">›</b>`;
      row.addEventListener('click', () => launchHiddenChapter(chapter));
      panel.append(row);
    });
    panel.append(button('BACK', closeDialog, 'nf-back'));
    root.dataset.chapterSelect = 'open';
    openDialog();
    panel.querySelector('button')?.focus();
  };

  const renderQuit = () => {
    dialog.dataset.variant = 'quit';
    panel.classList.remove('nf-credits-panel');
    const activeSave = store.readAll()[store.getActiveSlot()];
    panel.innerHTML = `
      <p class="nf-eyebrow">NIGHT SERVICE</p>
      <h2>QUIT GAME?</h2>
      <p class="nf-empty"></p>
    `;
    panel.querySelector('.nf-empty').textContent = activeSave
      ? `Slot ${store.getActiveSlot() + 1} is kept at its last checkpoint: ${formatSave(activeSave).title}.`
      : 'No journey has begun, so there is nothing to keep.';
    panel.append(
      button('QUIT', () => {
        closeDialog();
        if (quitGame()) return; // desktop app: close the application
        root.classList.add('is-exiting');
        scene.destroy();
        root.innerHTML = `
          <div class="nf-exit-screen" role="status">
            <p>NIGHT SERVICE ENDED</p>
            <small>You may close this tab.</small>
            <button type="button" class="nf-action">RETURN TO TITLE</button>
          </div>
        `;
        root.dataset.state = 'exited';
        const again = root.querySelector('button');
        again?.addEventListener('click', () => window.location.reload());
        // Enter works at once: the only control on the screen has focus.
        again?.focus();
      }, 'nf-danger'),
      button('CANCEL', closeDialog, 'nf-back'),
    );
    openDialog();
    // CANCEL first: QUIT is one deliberate move away.
    panel.querySelector('.nf-back')?.focus();
  };

  // The board always shows all of its lines (alpha R4 · P2: at 130 % text
  // QUIT GAME scrolled out of the plaque and labels wrapped): step it down,
  // one level at a time, until nothing overflows (titleMenu.css data-fit).
  const fitBoard = () => {
    if (!root.isConnected || root.dataset.state === 'exited') return;
    const levels = BOARD_FIT_LEVELS;
    for (let i = 0; i < levels.length; i += 1) {
      if (levels[i]) root.dataset.fit = levels[i]; else delete root.dataset.fit;
      if (boardFits(actions)) break;
    }
    root.dataset.fitLevel = root.dataset.fit ?? 'none';
  };
  let fitFrame = 0;
  const scheduleFit = () => {
    cancelAnimationFrame(fitFrame);
    // after titlePlate.js has laid the plaque out for this size
    fitFrame = requestAnimationFrame(() => requestAnimationFrame(fitBoard));
  };

  const refresh = () => {
    actions.replaceChildren();
    const saves = store.readAll();
    const activeSave = saves[store.getActiveSlot()];
    actions.append(
      button('BEGIN THE NIGHT SERVICE', () => renderSlots('new'), 'is-primary', 'OPEN A NEW ARCHIVE'),
      button('CONTINUE', () => {
        if (!activeSave) return renderSlots('checkpoints');
        launchCheckpoint(activeSave.checkpointId, {
          route: resolveCheckpointRoute(activeSave.checkpointId, { slot: activeSave.slot ?? store.getActiveSlot() }),
        });
      }, activeSave ? '' : 'is-disabled', activeSave ? formatSave(activeSave).title : 'NO JOURNEY FOUND'),
      button('LOAD / CHECKPOINTS', () => renderSlots('checkpoints'), '', 'SELECT ARCHIVE OR CHAPTER'),
      button('CREDITS', renderCredits, '', 'CREW · MUSIC · SOURCES · AI'),
      button('SETTINGS', renderSettings, '', 'AUDIO · DISPLAY · ACCESSIBILITY'),
      button('QUIT GAME', renderQuit, 'nf-quit', 'END THE NIGHT SERVICE'),
    );
    [...actions.children].forEach((action, index) => {
      action.dataset.index = String(index + 1).padStart(2, '0');
      // The pointer moves the one selection, so only one ticket is ever out.
      action.addEventListener('pointerenter', () => {
        if (!action.classList.contains('is-disabled')) action.focus({ preventScroll: true });
      });
    });
    status.textContent = activeSave ? `SLOT ${activeSave.slot + 1} · ${formatSave(activeSave).title}` : 'NO ACTIVE JOURNEY';
    actions.querySelector('button')?.focus();
  };

  // ↑ ↓ / W S and the D-pad move through whatever is on screen: the board,
  // or every control of the open dialog (slots, checkpoints, settings, the
  // router, confirmations). The same helper as the pause menu.
  const navContainer = () => (dialog.open ? panel : actions);
  const creditsOpen = () => dialog.open && panel.classList.contains('nf-credits-panel');
  const changeCreditSpeed = (faster) => {
    if (!creditRollAnimation) return;
    creditPlaybackRate = faster ? Math.min(4, creditPlaybackRate * 1.5) : Math.max(0.5, creditPlaybackRate / 1.5);
    if (creditRollAnimation.updatePlaybackRate) creditRollAnimation.updatePlaybackRate(creditPlaybackRate);
    else creditRollAnimation.playbackRate = creditPlaybackRate;
    root.dataset.creditRate = `${creditPlaybackRate.toFixed(2)}x`;
    const shown = panel.querySelector('.nf-credits-rate');
    if (shown) shown.textContent = formatCreditRate(creditPlaybackRate);
  };
  const menuAction = (action) => {
    if (!root.isConnected || root.dataset.state === 'exited') {
      if (action === 'activate') root.querySelector('.nf-exit-screen button')?.click();
      return;
    }
    root.dataset.nav = 'keys';
    if (creditsOpen()) {
      if (action === 'prev' || action === 'next') changeCreditSpeed(action === 'next');
      else if (action === 'activate') panel.querySelector('.nf-roll-control')?.click();
      else if (action === 'back') closeDialog();
      return;
    }
    if (action === 'prev' || action === 'next') moveFocusWithin(navContainer(), action);
    else if (action === 'activate') activateWithin(navContainer());
    else if (action === 'back' && dialog.open) {
      // B / START: the dialog's own way back (CANCEL, BACK), else close it.
      const way = panel.querySelector('.nf-back');
      if (way) way.click(); else closeDialog();
    }
  };
  // The title has no game running, so it polls the pad itself.
  const padPoll = createMenuGamepadPoll((action) => {
    if (!root.isConnected) { padPoll.stop(); return; }
    menuAction(action);
  });
  root.addEventListener('pointermove', () => { delete root.dataset.nav; });
  root.addEventListener('keydown', (event) => {
    if (dialog.open && panel.classList.contains('nf-credits-panel')) {
      const key = event.key.toLowerCase();
      if (event.code === 'Space') {
        event.preventDefault();
        panel.querySelector('.nf-roll-control')?.click();
        return;
      }
      if (key === 'r') {
        event.preventDefault();
        panel.querySelectorAll('.nf-roll-control')[1]?.click();
        return;
      }
      if (['ArrowUp', 'ArrowDown'].includes(event.key) && creditRollAnimation) {
        event.preventDefault();
        changeCreditSpeed(event.key === 'ArrowDown');
        return;
      }
      return;
    }
    const action = menuKeyAction(event);
    if (action === 'prev' || action === 'next') {
      // Also on a focused slider: ↑ ↓ move between rows, ← → set the value.
      event.preventDefault();
      menuAction(action);
    } else if (action === 'activate' && event.key === 'Enter' && event.target?.type === 'checkbox') {
      // Space toggles a checkbox natively; Enter does not.
      event.preventDefault();
      event.target.click();
    }
  });
  const handleGlobalKey = async (event) => {
    if ((DEV_MODE || PLAYTEST_MODE) && !dialog.open && !event.repeat && event.key === '1') {
      hiddenChapterSequence = `${hiddenChapterSequence}1`.slice(-4);
      window.clearTimeout(hiddenChapterTimer);
      hiddenChapterTimer = window.setTimeout(() => { hiddenChapterSequence = ''; }, 1800);
      if (hiddenChapterSequence === '1111') {
        hiddenChapterSequence = '';
        window.clearTimeout(hiddenChapterTimer);
        renderHiddenChapterSelect();
      }
      return;
    }
    if (!event.metaKey && !event.ctrlKey && !event.altKey) hiddenChapterSequence = '';
    if (event.key.toLowerCase() === 'f' && !event.repeat && !event.metaKey && !event.ctrlKey && !event.altKey) await toggleFullscreen();
  };
  window.addEventListener('keydown', handleGlobalKey);
  window.addEventListener('nightfall:settings', (event) => { syncCreditVolume(event.detail); scheduleFit(); });
  window.addEventListener('resize', scheduleFit);
  refresh();
  scheduleFit();
  document.fonts?.ready?.then(scheduleFit).catch(() => {});
  padPoll.start();
  if (openCredits) renderCredits();
  if (DEV_MODE) window.render_game_to_text = () => JSON.stringify({
    scene: root.dataset.state === 'exited' ? 'Exited' : 'TitleMenu',
    dialog: dialog.open ? panel.querySelector('h2')?.textContent ?? 'dialog' : null,
    chapterSelect: root.dataset.chapterSelect === 'open' && dialog.open,
    chapterEntries: root.dataset.chapterSelect === 'open' && dialog.open
      ? hiddenChapters.map(({ id, group, title, route }) => ({ id, group, title, route }))
      : [],
    credits: panel.classList.contains('nf-credits-panel')
      ? {
          visible: dialog.open,
          team: CREDIT_TEAM.map((member) => member.name),
          music: CREDIT_MUSIC.map((track) => `${track.title} — ${track.creator}`),
          musicPlaying: !creditAudio.paused,
          rollState: root.dataset.creditRoll,
          playbackRate: root.dataset.creditRate ?? '1.00x',
        }
      : null,
    focused: document.activeElement?.textContent?.trim() ?? null,
    activeSlot: store.getActiveSlot(),
    saves: store.readAll().map((save) => save ? { checkpointId: save.checkpointId, unlocked: save.unlocked } : null),
    settings: readSettings(),
  });
  return root;
}
