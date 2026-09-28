import {
  CHECKPOINTS,
  applySettings,
  createSaveStore,
  formatSave,
  launchCheckpoint,
  readSettings,
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
import { DEV_MODE, activateHiddenRouter } from '../devMode.js';
import { quitGame, toggleFullscreen } from './desktopBridge.js';
import { SETTINGS_CONTROLS } from './settingsControls.js';
import { DEV_ROUTES } from './devRoutes.js';
import { resolveCheckpointRoute } from './finalBossRoute.js';

const store = createSaveStore();

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

export function createTitleMenu({ openCredits = false } = {}) {
  applySettings(readSettings());
  const root = document.createElement('main');
  root.id = 'nightfall-title';
  root.innerHTML = `
    <img class="nf-title-backdrop" src="/assets/ui/nightfall-title-background.png" alt="" aria-hidden="true" />
    <div class="nf-baked-menu-mask" aria-hidden="true"></div>
    <div class="nf-vignette"></div>
    <div class="nf-grain" aria-hidden="true"></div>
    <section class="nf-menu" aria-label="NIGHTFALL main menu">
      <header class="nf-menu-header">
        <span class="nf-menu-rule"></span>
        <p class="nf-kicker">NIGHT SERVICE TERMINAL</p>
        <span class="nf-menu-rule"></span>
      </header>
      <nav class="nf-main-actions" aria-label="Main menu"></nav>
      <footer class="nf-menu-footer">
        <p class="nf-status" role="status" aria-live="polite"></p>
        <p class="nf-hint"><kbd>↑</kbd><kbd>↓</kbd> SELECT <i></i> <kbd>ENTER</kbd> CONFIRM <i></i> <kbd>F</kbd> FULLSCREEN</p>
      </footer>
    </section>
    <p class="nf-build-mark">ARCHIVE LINE 01 · NIGHT SERVICE</p>
    <dialog class="nf-dialog" id="nf-dialog">
      <div class="nf-dialog-ornament" aria-hidden="true"><span></span><b>◇</b><span></span></div>
      <div class="nf-dialog-inner"></div>
    </dialog>
  `;
  document.body.append(root);
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
    dialog.classList.remove('nf-dialog--credits-roll');
    panel.classList.remove('nf-credits-panel');
    root.dataset.chapterSelect = 'closed';
    (lastFocusedAction?.isConnected ? lastFocusedAction : actions.querySelector('button'))?.focus();
  };
  const openDialog = () => {
    lastFocusedAction = document.activeElement;
    if (!dialog.open) dialog.showModal();
  };
  dialog.addEventListener('cancel', (event) => { event.preventDefault(); closeDialog(); });

  const citationLink = (label, href) => {
    const anchor = document.createElement('a');
    anchor.href = href;
    anchor.target = '_blank';
    anchor.rel = 'noreferrer';
    anchor.textContent = label;
    return anchor;
  };

  const renderCredits = () => {
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
        <span class="nf-credit-time">${String(23 + Math.floor(index / 2)).padStart(2, '0')}:${String((index * 11) % 60).padStart(2, '0')}</span>
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
    const exitCredits = button('EXIT', closeDialog, 'nf-roll-control');
    controls.append(pause, restart, exitCredits);
    const legend = document.createElement('p');
    legend.className = 'nf-credits-legend';
    legend.innerHTML = '<kbd>SPACE</kbd> PAUSE <i></i> <kbd>↑ ↓</kbd> SPEED <i></i> <kbd>R</kbd> RESTART <i></i> <kbd>ESC</kbd> EXIT';
    controls.append(legend);
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
      creditRollAnimation.onfinish = () => { root.dataset.creditRoll = 'complete'; };
      root.__creditsAnimation = creditRollAnimation;
      root.dataset.creditRoll = 'rolling';
      viewport.scrollTop = 0;
    });
  };

  const renderSlots = (mode) => {
    panel.classList.remove('nf-credits-panel');
    panel.replaceChildren();
    const heading = document.createElement('div');
    heading.className = 'nf-dialog-heading';
    heading.innerHTML = `<p class="nf-eyebrow">ARCHIVE MEMORY</p><h2>${mode === 'new' ? 'BEGIN THE NIGHT SERVICE' : 'LOAD / CHECKPOINTS'}</h2>`;
    panel.append(heading);
    store.readAll().forEach((save, index) => {
      const info = formatSave(save);
      const row = document.createElement('article');
      row.className = 'nf-slot';
      row.innerHTML = `<span class="nf-slot-index">${String(index + 1).padStart(2, '0')}</span><span class="nf-slot-meta">ARCHIVE SLOT</span><strong>${info.title}</strong><small>${info.detail}</small><b aria-hidden="true">›</b>`;
      row.tabIndex = 0;
      row.setAttribute('role', 'button');
      const activate = () => {
        if (mode === 'new') {
          if (save && !window.confirm(`Overwrite Slot ${index + 1}?`)) return;
          store.startNew(index);
          status.textContent = `SLOT ${index + 1} · NIGHT SERVICE AWAKENING`;
          closeDialog();
          root.remove();
          playCinematic({
            id: 'opening',
            src: CINEMATICS.opening,
            label: 'NIGHTFALL opening cinematic',
            preloadChapterId: 'chapter1',
            // Chapter 1 is its own page: the NIGHT SERVICE panel puzzle.
            onComplete: () => window.location.assign('/night-service.html'),
          });
          return;
        }
        if (!save) return;
        store.setActiveSlot(index);
        renderCheckpoints(index);
      };
      row.addEventListener('click', activate);
      row.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') activate(); });
      panel.append(row);
    });
    panel.append(button('BACK', closeDialog, 'nf-back'));
    openDialog();
    panel.querySelector('[tabindex]')?.focus();
  };

  const renderCheckpoints = (selectedIndex = store.getActiveSlot()) => {
    panel.classList.remove('nf-credits-panel');
    const index = selectedIndex;
    const save = store.readAll()[index];
    panel.innerHTML = `<p class="nf-eyebrow">SLOT ${index + 1}</p><h2>CHECKPOINTS</h2>`;
    if (!save) panel.insertAdjacentHTML('beforeend', '<p class="nf-empty">This slot has no journey.</p>');
    CHECKPOINTS.forEach((checkpoint) => {
      if (!(save?.unlocked ?? []).includes(checkpoint.id)) return;
      const selected = checkpoint.id === save.checkpointId;
      const row = button(`${selected ? '◆' : '◇'}  CHAPTER ${checkpoint.chapter} · ${checkpoint.title}`, () => {
        store.selectCheckpoint(index, checkpoint.id);
        launchCheckpoint(checkpoint.id, { route: resolveCheckpointRoute(checkpoint.id, { slot: index }) });
      }, 'nf-checkpoint');
      panel.append(row);
    });
    if (save) panel.append(button('DELETE SLOT', () => {
      if (!window.confirm(`Delete Slot ${index + 1}? This cannot be undone.`)) return;
      store.remove(index);
      closeDialog();
      refresh();
    }, 'nf-danger'));
    panel.append(button('BACK', closeDialog, 'nf-back'));
    openDialog();
    panel.querySelector('button')?.focus();
  };

  const renderSettings = () => {
    panel.classList.remove('nf-credits-panel');
    const settings = readSettings();
    panel.innerHTML = `<p class="nf-eyebrow">SYSTEM</p><h2>SETTINGS</h2>`;
    SETTINGS_CONTROLS.forEach(([key, label, type, min, max]) => {
      const row = document.createElement('label');
      row.className = 'nf-setting';
      row.innerHTML = `<span>${label}</span>`;
      const input = document.createElement('input');
      input.type = type;
      input.dataset.setting = key;
      if (type === 'range') { input.min = min; input.max = max; input.value = settings[key]; }
      else input.checked = settings[key];
      input.addEventListener('input', () => {
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
  const hiddenChapters = DEV_MODE ? DEV_ROUTES : [];

  const launchHiddenChapter = (chapter) => {
    activateHiddenRouter();
    closeDialog();
    root.remove();
    window.location.assign(chapter.route);
  };

  const renderHiddenChapterSelect = () => {
    panel.classList.remove('nf-credits-panel');
    panel.innerHTML = '<div class="nf-dialog-heading"><p class="nf-eyebrow">ARCHIVE ROUTING · 1111</p><h2>SELECT TEST NODE</h2><p class="nf-empty">Every entry skips transition films and opens its playable node directly.</p></div>';
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
    panel.classList.remove('nf-credits-panel');
    panel.innerHTML = `
      <p class="nf-eyebrow">NIGHT SERVICE</p>
      <h2>QUIT GAME?</h2>
      <p class="nf-empty">Your archive is already saved at the latest checkpoint.</p>
    `;
    panel.append(
      button('QUIT', () => {
        closeDialog();
        if (quitGame()) return; // desktop app: close the application
        root.classList.add('is-exiting');
        root.innerHTML = `
          <div class="nf-exit-screen" role="status">
            <p>NIGHT SERVICE ENDED</p>
            <small>You may close this tab.</small>
            <button type="button" class="nf-action">RETURN TO TITLE</button>
          </div>
        `;
        root.dataset.state = 'exited';
        root.querySelector('button')?.addEventListener('click', () => window.location.reload());
      }, 'nf-danger'),
      button('CANCEL', closeDialog, 'nf-back'),
    );
    openDialog();
    panel.querySelector('button')?.focus();
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
    [...actions.children].forEach((action, index) => action.dataset.index = String(index + 1).padStart(2, '0'));
    status.textContent = activeSave ? `SLOT ${activeSave.slot + 1} · ${formatSave(activeSave).title}` : 'NO ACTIVE JOURNEY';
    actions.querySelector('button')?.focus();
  };

  const focusActions = () => [...actions.querySelectorAll('button:not(.is-disabled)')];
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
        creditPlaybackRate = event.key === 'ArrowDown'
          ? Math.min(4, creditPlaybackRate * 1.5)
          : Math.max(0.5, creditPlaybackRate / 1.5);
        if (creditRollAnimation.updatePlaybackRate) creditRollAnimation.updatePlaybackRate(creditPlaybackRate);
        else creditRollAnimation.playbackRate = creditPlaybackRate;
        root.dataset.creditRate = `${creditPlaybackRate.toFixed(2)}x`;
        return;
      }
    }
    if (dialog.open || !['ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault();
    const options = focusActions();
    const current = Math.max(0, options.indexOf(document.activeElement));
    const offset = event.key === 'ArrowDown' ? 1 : -1;
    options[(current + offset + options.length) % options.length]?.focus();
  });
  const handleGlobalKey = async (event) => {
    if (DEV_MODE && !dialog.open && !event.repeat && event.key === '1') {
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
  window.addEventListener('nightfall:settings', (event) => syncCreditVolume(event.detail));
  refresh();
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
