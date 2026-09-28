// The Unfiled Ending: the reveal after the Black Ticket (docs/STORY_BIBLE.md).
// Chapter 1's Act 3 windows in a brass bezel, archive stamps, the credits
// track under it. Input stays locked until the reveal ends; holding Space /
// Enter / a mouse button (the films' gesture) skips to its last frame.
import { magicStoneRow, magicStoneSnapshot } from './shell/magicStones.js';
import { installPauseMenu } from './shell/pauseMenu.js';
import { devParam, DEV_MODE } from './devMode.js';
import { CHAPTER_CONTROLS } from './shell/chapterControls.js';
import { CREDIT_MUSIC } from './shell/creditsData.js';
import { showEndCredits } from './shell/endCredits.js';
import { installHoldToSkip } from './shell/finaleUi.js';
import { music } from './shared/musicDirector.js';
import { loadFinaleArtSources, paintEndingPanel } from './chapters/finalBoss/finaleArt.js';
import { REVEAL_ENDS, scriptStateAt } from './trueEndingScript.js';

installPauseMenu({ checkpointId: 'chapter-6-start', controls: CHAPTER_CONTROLS.trueEnding });

const snapshot = magicStoneSnapshot();
const stonesEl = document.querySelector('.nf-stones');
renderStoneRow(stonesEl, snapshot);

const redirect = !snapshot.allCollected && devParam('qa') !== '1';
if (redirect) location.replace('/final-boss.html?from=chapter5');

const head = document.querySelector('.nf-te__head');
const panelEl = document.querySelector('.nf-te__panel');
const textEl = document.querySelector('.nf-te__text');
const stampEl = document.querySelector('.nf-te__stamp');
const lineA = document.querySelector('.nf-te__line--a');
const lineB = document.querySelector('.nf-te__line--b');
const finalLine = document.querySelector('.nf-te__final-line');
const finalStamp = document.querySelector('.nf-te__final-stamp');
const continueButton = document.querySelector('.nf-te__continue');

const panels = new Map();
let clock = 0;
let last = performance.now();
let shown = { panel: null, stamp: null, a: null, b: null, finalLine: false, finalStamp: false, revealEnded: false };
let hold = null;
let finished = false;
let endedAt = Infinity;

const setLine = (el, text) => {
  if (el.dataset.text === text) return;
  el.dataset.text = text;
  el.classList.remove('is-in');
  if (!text) { el.textContent = ''; return; }
  el.textContent = text;
  void el.offsetWidth;
  el.classList.add('is-in');
};

function apply(state) {
  if (state.panel !== shown.panel && panels.has(state.panel)) {
    panels.forEach((canvas, beat) => canvas.classList.toggle('is-in', beat === state.panel));
    shown.panel = state.panel;
  }
  if (state.stamp !== shown.stamp) { stampEl.textContent = state.stamp; shown.stamp = state.stamp; }
  setLine(lineA, state.a);
  setLine(lineB, state.b);
  if (state.finalLine && !shown.finalLine) {
    panelEl.classList.add('is-dim');
    textEl.classList.add('is-out');
    finalLine.classList.add('is-in');
    shown.finalLine = true;
  }
  if (state.finalStamp && !shown.finalStamp) { finalStamp.classList.add('is-down'); shown.finalStamp = true; }
  if (state.revealEnded && !shown.revealEnded) endReveal();
}

function endReveal() {
  shown.revealEnded = true;
  endedAt = performance.now();
  hold?.stop();
  hold = null;
  continueButton.hidden = false;
  continueButton.focus({ preventScroll: true });
}

function finish() {
  if (finished || !shown.revealEnded || performance.now() - endedAt < 700) return;
  finished = true;
  showEndCredits();
}

function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  if (!globalThis.NIGHTFALL_PAUSED && !redirect) clock += dt;
  apply(scriptStateAt(clock));
  if (!shown.revealEnded) requestAnimationFrame(frame);
}

function skipToEnd() {
  clock = Math.max(clock, REVEAL_ENDS);
  apply(scriptStateAt(clock));
}

if (!redirect) {
  // The credits track, under the whole reveal.
  const track = CREDIT_MUSIC[0];
  music.play('true-ending-credits', { src: track.localFile, volume: 0.42, fade: 3.4, outFade: 1.6, loop: true });
  requestAnimationFrame(() => head.classList.add('is-in'));
  lightStones(stonesEl);
  loadFinaleArtSources({ worlds: ['fields', 'city', 'memory'] }).then(async (sources) => {
    await (document.fonts?.ready ?? Promise.resolve());
    for (const beat of ['carriage', 'city', 'platform', 'door']) {
      const canvas = paintEndingPanel(beat, sources);
      panelEl.append(canvas);
      panels.set(beat, canvas);
    }
    shown.panel = null;
  });
  hold = installHoldToSkip({ onSkip: skipToEnd, label: 'HOLD TO SKIP' });
  requestAnimationFrame(frame);
  // Locked until the reveal ends: only then do Enter / click continue.
  window.addEventListener('keydown', (event) => {
    // A fresh press after the end: a skip still being held must not carry
    // straight on into the credits.
    if (!shown.revealEnded || globalThis.NIGHTFALL_PAUSED || event.repeat || performance.now() - endedAt < 700) return;
    if (event.code === 'Enter' || event.code === 'NumpadEnter' || event.code === 'Space') { event.preventDefault(); finish(); }
  });
  continueButton.addEventListener('click', finish);
}

if (DEV_MODE) {
  window.render_game_to_text = () => JSON.stringify({
    scene: 'TrueEnding', clock: +clock.toFixed(2), revealEnded: shown.revealEnded, locked: !shown.revealEnded,
    panel: shown.panel, panelsReady: panels.size, stamp: stampEl.textContent, lineA: lineA.textContent, lineB: lineB.textContent,
    final: { line: shown.finalLine ? finalLine.textContent : null, stamp: shown.finalStamp ? finalStamp.textContent : null },
    continueVisible: !continueButton.hidden, stones: snapshot, music: music.qa(), holding: Boolean(hold?.holding),
  });
  window.setTrueEndingTime = (seconds) => { clock = Number(seconds); apply(scriptStateAt(clock)); };
}

// One gem per stone in the registry, lit when this slot holds it.
function renderStoneRow(container, stones) {
  if (!container) return;
  container.replaceChildren(...magicStoneRow(stones).map(({ name, held }) => {
    const gem = document.createElement('i');
    gem.className = held ? 'is-held is-dim' : '';
    gem.dataset.held = held ? '1' : '0';
    gem.title = name;
    return gem;
  }));
  container.setAttribute('aria-label', `${stones.count} of ${stones.total} magic stones collected`);
}

// The held stones light one by one as the page opens.
function lightStones(container) {
  [...(container?.children ?? [])].forEach((gem, index) => {
    if (gem.dataset.held === '1') setTimeout(() => gem.classList.remove('is-dim'), 500 + index * 380);
  });
}
