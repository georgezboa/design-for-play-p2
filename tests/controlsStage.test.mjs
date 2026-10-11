// Round 6 · shell (feedback items 18 and 19, owner note G7): the pause menu's
// controls for the current stage with an ALL CONTROLS expander, the
// chapter-entry controls card, and the house typefaces.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

import {
  CHAPTER_CONTROLS, CONTROLS_STAGE_EVENT, CONTROL_SETS, chapterCardSpec, controlSetIdForList, controlSetIdForPage,
  pauseControlsView, resolveControlSetId, resolveStageId,
} from '../src/shell/chapterControls.js';
import {
  DIAGRAM_KINDS, controlRowsHtml, controlsCardHtml, controlsCardSeen, diagramHtml, keysHtml, markControlsCardSeen, stageTitle,
} from '../src/shell/controlsView.js';
import { createSaveStore } from '../src/shell/saveSystem.js';
import { FONT_SERIF, FONT_UI, HOUSE_FACES, canvasFont, trackingPx, waitForFonts } from '../src/shared/fonts.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
}

const CHAPTERS = ['chapter1', 'chapter2', 'chapter3', 'chapter4', 'chapter5', 'chapter6'];

// ---------- item 19: the rows for now ----------

test('every chapter has 3–5 basics and every stage 3–5 rows', () => {
  for (const id of [...CHAPTERS, 'oneAnswer', 'labyrinth']) {
    const set = CONTROL_SETS[id];
    assert.ok(set, id);
    assert.ok(set.basics.length >= 3 && set.basics.length <= 5, `${id} basics: ${set.basics.length}`);
    for (const [stage, spec] of Object.entries(set.stages)) {
      assert.ok(spec.rows.length >= 3 && spec.rows.length <= 5, `${id}.${stage}: ${spec.rows.length} rows`);
      assert.ok(spec.name, `${id}.${stage} is named`);
    }
  }
  // the stages the playtest walked through
  assert.deepEqual(Object.keys(CONTROL_SETS.chapter1.stages), ['act0', 'act05', 'act1', 'act2', 'act3']);
  assert.deepEqual(Object.keys(CONTROL_SETS.chapter2.stages), ['A', 'B', 'C']);
  for (const stage of ['city', 'board', 'lens']) assert.ok(CONTROL_SETS.chapter3.stages[stage], stage);
  for (const stage of ['gallery', 'line']) assert.ok(CONTROL_SETS.chapter4.stages[stage], stage);
  for (const stage of ['walk', 'exhibit']) assert.ok(CONTROL_SETS.chapter5.stages[stage], stage);
  assert.deepEqual(Object.keys(CONTROL_SETS.chapter6.stages), ['movement1', 'movement2', 'movement3', 'movement4']);
  assert.ok(CONTROL_SETS.oneAnswer.stages.exhibit);
});

test('each page\'s full list is its set\'s ALL CONTROLS, and pages find their set', () => {
  const pages = {
    nightServicePanels: 'chapter1', borrowedLight: 'chapter2', echoCity: 'chapter3', paintedCountry: 'chapter4',
    museum: 'chapter5', oneAnswer: 'oneAnswer', labyrinth: 'labyrinth', blackKnife: 'blackTicket', trueEnding: 'trueEnding', cutscene: 'cutscene',
  };
  for (const [key, id] of Object.entries(pages)) {
    assert.equal(controlSetIdForList(CHAPTER_CONTROLS[key]), id, key);
    assert.equal(CONTROL_SETS[id].all, CHAPTER_CONTROLS[key], `${id}.all is the page's own list`);
  }
  assert.equal(controlSetIdForList([['MOVE', 'WASD']]), null, 'an inline list is not a set');
  assert.equal(controlSetIdForPage('/final-boss.html'), 'chapter6', 'final-boss.html passes an inline list');
  assert.equal(controlSetIdForPage('/night-service.html?act=2'), 'chapter1');
  assert.equal(controlSetIdForPage('/hidden-final-boss.html'), 'blackTicket');
  assert.equal(controlSetIdForPage('/'), 'cutscene');
  assert.equal(controlSetIdForPage('/nowhere.html'), null);
});

test('chapter and stage names resolve through their aliases', () => {
  assert.equal(resolveControlSetId('nightServicePanels'), 'chapter1');
  assert.equal(resolveControlSetId(6), 'chapter6');
  assert.equal(resolveControlSetId('chapter-2'), 'chapter2');
  assert.equal(resolveControlSetId('ch3'), 'chapter3');
  assert.equal(resolveControlSetId('hiddenBoss'), 'blackTicket');
  assert.equal(resolveControlSetId('nope'), null);
  assert.equal(resolveControlSetId(null), null);
  assert.equal(resolveStageId(CONTROL_SETS.chapter1, '0.5'), 'act05');
  assert.equal(resolveStageId(CONTROL_SETS.chapter1, 'act2'), 'act2');
  assert.equal(resolveStageId(CONTROL_SETS.chapter2, 'blackout'), 'B');
  assert.equal(resolveStageId(CONTROL_SETS.chapter2, 'c'), 'C');
  assert.equal(resolveStageId(CONTROL_SETS.chapter3, 'ticket'), 'board');
  assert.equal(resolveStageId(CONTROL_SETS.chapter4, 'final-train'), 'line');
  assert.equal(resolveStageId(CONTROL_SETS.chapter6, 'III'), 'movement3');
  assert.equal(resolveStageId(CONTROL_SETS.chapter6, 'phase-4'), 'movement4');
  assert.equal(resolveStageId(CONTROL_SETS.chapter6, 2), 'movement2');
  assert.equal(resolveStageId(CONTROL_SETS.chapter6, 'ard'), null, 'no loose suffix matches');
});

test('the pause view: the event\'s own rows, else the stage\'s, else the basics', () => {
  const own = [['SPEAK FACE TO FACE', 'E · AT THE LIT FRONT'], ['MOVE', 'WASD / ARROWS'], ['DASH', 'SHIFT']];
  const event = pauseControlsView({ setId: 'chapter6', stage: 'face', eventControls: own, label: 'SAY IT FACE TO FACE', full: CHAPTER_CONTROLS.blackKnife });
  assert.equal(event.source, 'event');
  assert.deepEqual(event.rows, own);
  assert.equal(event.label, 'SAY IT FACE TO FACE');
  assert.equal(event.all.length, CHAPTER_CONTROLS.blackKnife.length, 'the page\'s full list stays behind ALL CONTROLS');

  const staged = pauseControlsView({ setId: 'chapter6', stage: 'III' });
  assert.equal(staged.source, 'stage');
  assert.equal(staged.label, 'III · TWO TRUE THINGS');
  assert.match(staged.rows.map(([a]) => a).join(' | '), /SPEAK FACE TO FACE/);
  assert.equal(staged.expandable, true);

  const basics = pauseControlsView({ setId: 'chapter6' });
  assert.equal(basics.source, 'basics');
  assert.equal(basics.rows.length, CONTROL_SETS.chapter6.basics.length);
  assert.equal(basics.label, null);

  // an unknown stage falls back to the basics, never to the long list
  assert.equal(pauseControlsView({ setId: 'chapter2', stage: 'Z' }).source, 'basics');
  // an unknown page: its own list, cut to five rows
  const page = pauseControlsView({ full: CHAPTER_CONTROLS.echoCity });
  assert.equal(page.source, 'page');
  assert.equal(page.rows.length, 5);
  // nothing more to show: no expander (the cutscene page lists two rows)
  assert.equal(pauseControlsView({ setId: 'cutscene', full: CHAPTER_CONTROLS.cutscene }).expandable, false);
});

test('Chapter 1 reads its act from the page when no stage event came, and draws its drag diagrams', () => {
  const html = { dataset: { nightServiceAct: 'act2' } };
  const previous = globalThis.document;
  globalThis.document = { documentElement: html };
  try {
    const view = pauseControlsView({ setId: 'chapter1', full: CHAPTER_CONTROLS.nightServicePanels });
    assert.equal(view.source, 'stage');
    assert.equal(view.stage, 'act2');
    assert.deepEqual(view.diagrams, ['swap', 'lift']);
    assert.ok(view.all.length > view.rows.length && view.expandable);
    // an explicit event still wins over the page's act
    assert.equal(pauseControlsView({ setId: 'chapter1', stage: 'act05' }).stage, 'act05');
  } finally {
    globalThis.document = previous;
  }
  for (const stage of ['act05', 'act1', 'act2', 'act3']) assert.ok(CONTROL_SETS.chapter1.stages[stage].diagrams.includes('swap'), stage);
  assert.ok(CONTROL_SETS.chapter1.stages.act05.diagrams.includes('unfold'));
  for (const kind of DIAGRAM_KINDS) {
    const svg = diagramHtml(kind);
    assert.match(svg, /^<figure class="nf-diagram" data-diagram="[a-z]+"><svg viewBox="0 0 120 54" role="img" aria-label="[^"]+">/);
    assert.match(svg, /class="nf-diagram__hand"/, `${kind}: a hand`);
    assert.match(svg, /class="nf-diagram__arrow"/, `${kind}: an arrow`);
    assert.match(svg, /class="nf-diagram__frame/, `${kind}: a window`);
    assert.match(svg, /<figcaption>[A-Z ·]+<\/figcaption><\/figure>$/);
  }
  assert.equal(diagramHtml('nope'), '');
});

test('the stage rows follow the unified scheme (item 18)', () => {
  const rowsOf = (set) => [set.basics, ...Object.values(set.stages).map((stage) => stage.rows)].flat();
  // where there is jumping, Space only ever jumps (round 11: the Conductor's
  // fight jumps his rings and sweeps)
  for (const id of ['chapter2', 'chapter4', 'chapter5', 'chapter6']) {
    for (const [action, keys] of rowsOf(CONTROL_SETS[id])) {
      if (/\bSPACE\b/.test(keys)) assert.match(action, /^JUMP/, `${id}: ${action} · ${keys}`);
    }
    assert.ok(rowsOf(CONTROL_SETS[id]).some(([action, keys]) => /^JUMP/.test(action) && /\bSPACE\b/.test(keys)), `${id} jumps on Space`);
  }
  // where there is none, Space is not the main action of a stage
  for (const id of ['chapter1', 'chapter3', 'oneAnswer']) {
    for (const [action, keys] of rowsOf(CONTROL_SETS[id])) assert.doesNotMatch(keys, /\bSPACE\b/, `${id}: ${action} · ${keys}`);
  }
  // E / Enter interact where a chapter has an interact verb
  assert.match(CONTROL_SETS.chapter3.basics.map(([, k]) => k).join(' '), /E \/ ENTER/);
  assert.match(CONTROL_SETS.chapter6.stages.movement3.rows.map(([, k]) => k).join(' '), /E \/ ENTER/);
  // movement uses WASD / arrows
  for (const id of ['chapter5', 'chapter6']) assert.match(CONTROL_SETS[id].basics[0][1], /WASD \/ ARROWS/, id);
  // ... except Echo City, which is point and click (round 12, George's note)
  assert.equal(CONTROL_SETS.chapter3.basics[0][1], 'CLICK THE GROUND');
  // (the ticket board keeps its own keyboard: arrows move a paper there)
  const streets = CONTROL_SETS.chapter3;
  for (const [action, keys] of [streets.basics, streets.stages.city.rows, streets.stages.scanner.rows, streets.stages.clamp.rows].flat()) {
    assert.doesNotMatch(keys, /WASD|ARROWS|SHIFT/, `chapter3: ${action} · ${keys}`);
  }
});

test('the Ticket 43 board rows teach the operations, not the solution (item 8)', () => {
  const board = [...CONTROL_SETS.chapter3.stages.board.rows, ...CONTROL_SETS.chapter3.stages.lens.rows].flat().join(' ');
  assert.doesNotMatch(board, /BOTH|STACK THEM|ONE PERSON|VENN|VELEZ/);
  assert.match(board, /LENS/);
  assert.match(board, /PUNCH/);
});

test('key strings render as caps and words, escaped', () => {
  assert.equal(keysHtml('SPACE · W · ↑'), '<kbd>SPACE</kbd><i class="nf-keys__sep">·</i><kbd>W</kbd><i class="nf-keys__sep">·</i><kbd>↑</kbd>');
  assert.equal(keysHtml('E AT A LIT / DEAD NODE'), '<kbd>E</kbd> <span>AT A LIT</span><i class="nf-keys__sep">/</i><span>DEAD NODE</span>', 'only the leading E is a key');
  assert.equal(keysHtml('HOLD F ON IT'), '<span>HOLD</span> <kbd>F</kbd> <span>ON IT</span>');
  assert.equal(keysHtml('A / D · ← →'), '<kbd>A</kbd><i class="nf-keys__sep">/</i><kbd>D</kbd><i class="nf-keys__sep">·</i><kbd>←</kbd> <kbd>→</kbd>');
  assert.equal(keysHtml('<b>'), '<span>&#60;b&#62;</span>');
  assert.equal(controlRowsHtml([['MOVE', 'WASD']]), '<div><dt>MOVE</dt><dd><kbd>WASD</kbd></dd></div>');
  assert.equal(stageTitle('ACT II · THE LUGGAGE CAR'), 'Act II · The Luggage Car');
  assert.equal(stageTitle('III · TWO TRUE THINGS'), 'III · Two True Things');
  assert.equal(stageTitle('THE MUSEUM OF ONE ANSWER'), 'The Museum of One Answer');
});

test('the pause menu shows the rows for now, keeps the stage event, and opens ALL CONTROLS on demand', () => {
  const pause = read('src/shell/pauseMenu.js');
  assert.equal(CONTROLS_STAGE_EVENT, 'nightfall:controls-stage');
  assert.match(pause, /window\.addEventListener\(CONTROLS_STAGE_EVENT, \(event\) => \{\s*lastControlsStage = /, 'recorded from module load');
  assert.match(pause, /<button type="button" class="nf-pause-controls-toggle" aria-expanded="false" aria-controls="nf-pause-all-controls">ALL CONTROLS<\/button>/);
  assert.match(pause, /<dl class="nf-pause-controls-note" id="nf-pause-all-controls" hidden><\/dl>/);
  assert.match(pause, /return pauseControlsView\(\{/);
  assert.match(pause, /\/\/ each pause opens on the rows for now\s*expanded = false;\s*renderControls\(\);/);
  // ↑ ↓ reach the expander after the actions
  assert.match(pause, /return panel === actions \? mainPanel : panel;/);
  assert.match(pause, /installControlsCardListener\(window\);/);
  const css = read('src/shell/pauseMenu.css');
  assert.match(css, /\.nf-pause-controls\[data-expanded="true"\] :is\(\.nf-pause-controls-now, \.nf-pause-controls__diagrams\) \{ display: none; \}/);
});

// ---------- item 18 (shell): the chapter-entry card ----------

test('every chapter has an entry card: 3–4 basics and what changed', () => {
  for (const id of CHAPTERS) {
    const spec = chapterCardSpec(id);
    assert.ok(spec, id);
    assert.ok(spec.rows.length >= 3 && spec.rows.length <= 4, `${id}: ${spec.rows.length} rows`);
    assert.match(spec.title, new RegExp(`^CHAPTER ${id.slice(-1)} · `));
    assert.ok(spec.changed.length >= 1, `${id} says what changed`);
    for (const { tag } of spec.changed) assert.match(tag, /^(NEW|NOW|SAME|NOTE)$/);
  }
  assert.match(chapterCardSpec('chapter6').changed.map(({ text }) => text).join(' '), /three phases each[\s\S]*Each phase is a checkpoint/);
  assert.match(chapterCardSpec(2).changed.map(({ text }) => text).join(' '), /Space jumps/);
  assert.equal(chapterCardSpec('cutscene'), null);
  assert.equal(chapterCardSpec('nope'), null);
  const html = controlsCardHtml(chapterCardSpec('chapter2'));
  assert.match(html, /^<p class="nf-controls-card__kicker">CHAPTER 2 · BORROWED LIGHT<\/p><dl class="nf-controls-card__rows">/);
  assert.match(html, /<li data-tag="new"><b>NEW<\/b><span>E punches a lit node\. It fires on the next bell\.<\/span><\/li>/);
  assert.match(html, /<span class="nf-controls-card__timer" aria-hidden="true"><\/span>$/);
});

test('the card shows once per journey (the save slot), or once per session without one', () => {
  const storage = memoryStorage();
  const session = memoryStorage();
  assert.equal(controlsCardSeen('chapter2', { storage, session }), false);
  markControlsCardSeen('chapter2', { storage, session });
  assert.equal(controlsCardSeen('chapter2', { storage, session }), true, 'no save: the session remembers');
  assert.equal(controlsCardSeen('chapter3', { storage, session }), false);
  const store = createSaveStore(storage, { scratch: false });
  store.startNew(0);
  assert.equal(controlsCardSeen('chapter2', { storage, session }), false, 'a new journey sees it again');
  markControlsCardSeen('chapter2', { storage, session });
  assert.ok(store.readAll()[0].notices.includes('controls-card:chapter2'));
  assert.equal(controlsCardSeen('chapter2', { storage, session }), true, 'a Continue into the chapter does not');
});

test('the card never blocks: no pointer events, passive listeners, no swallowed input', () => {
  const card = read('src/shell/controlsCard.js');
  assert.match(card, /export function showChapterControlsCard\(chapterId, \{/);
  assert.match(card, /window\[method\]\('keydown', onInput, \{ capture: true, passive: true \}\);/);
  assert.match(card, /window\[method\]\('pointerdown', onInput, \{ capture: true, passive: true \}\);/);
  assert.doesNotMatch(card, /preventDefault|stopPropagation|stopImmediatePropagation/);
  assert.match(card, /if \(!shownAt \|\| performance\.now\(\) - shownAt < graceMs\) return;/, 'the key that started the chapter does not wipe it');
  assert.match(card, /timer = window\.setTimeout\(\(\) => dismiss\(\), durationMs\);/, 'it fades by itself');
  assert.match(card, /if \(getActiveCinematic\(\) \|\| globalThis\.NIGHTFALL_PAUSED\)/, 'never over a film or the pause menu');
  assert.match(card, /const onPause = \(event\) => \{ if \(event\.detail\?\.paused\) dismiss\(true\); \};/);
  assert.match(card, /export const CONTROLS_CARD_EVENT = 'nightfall:controls-card';/);
  const css = read('src/shell/controlsCard.css');
  assert.match(css, /\.nf-controls-card \{[^}]*pointer-events: none;/);
  assert.match(css, /calc\(10\.5px \* var\(--nf-cc\)\)/, 'TEXT SIZE scales it');
});

// ---------- G7: the house typefaces ----------

test('EB Garamond and Jost are bundled locally, with their licences', () => {
  const css = read('src/fonts/fonts.css');
  const faces = [...css.matchAll(/@font-face \{[^}]*font-family: '([^']+)';[^}]*font-style: (\w+);[^}]*font-weight: (\d+);[^}]*src: url\(\.\/([^)]+)\)/g)];
  const of = (family) => faces.filter(([, f]) => f === family).map(([, , style, weight]) => `${weight}${style === 'italic' ? 'i' : ''}`);
  assert.deepEqual([...new Set(of('EB Garamond'))], ['400', '400i', '600']);
  assert.deepEqual([...new Set(of('Jost'))], ['300', '400', '500', '600']);
  for (const [, , , , file] of faces) assert.ok(existsSync(new URL(`../src/fonts/${file}`, import.meta.url)), file);
  assert.doesNotMatch(css.replace(/\/\*[\s\S]*?\*\//g, ''), /googleapis|gstatic|node_modules/);
  for (const licence of ['EBGaramond-OFL.txt', 'Jost-OFL.txt']) {
    assert.match(read(`src/fonts/${licence}`), /SIL Open Font License, Version 1\.1/, licence);
  }
});

test('the faces are named once: CSS variables and JS constants', () => {
  const kit = read('src/shell/uiKit.css');
  assert.match(kit, /@import '\.\.\/fonts\/fonts\.css';/, 'every page with the shell has the faces');
  assert.match(kit, /--nf-serif: 'EB Garamond',/);
  assert.match(kit, /--nf-ui: 'Jost',/);
  assert.match(kit, /--nf-display: var\(--nf-ui\);/);
  assert.match(kit, /--nf-mono: var\(--nf-ui\);/, 'the old label variable follows');
  assert.match(FONT_SERIF, /^'EB Garamond', /);
  assert.match(FONT_UI, /^'Jost', /);
  assert.equal(canvasFont(22, { weight: 500 }), `500 22px ${FONT_UI}`);
  assert.equal(canvasFont(18, { family: FONT_SERIF, italic: true }), `italic 400 18px ${FONT_SERIF}`);
  assert.equal(trackingPx(20), 3.6);
  assert.equal(HOUSE_FACES.length, 7);
});

test('the shell no longer sets Anton, Space Mono or Georgia itself', () => {
  const files = [
    'src/shell/uiKit.css', 'src/shell/pauseMenu.css', 'src/shell/titleMenu.css', 'src/shell/gameFlow.css', 'src/shell/controlsCard.css',
    'src/shell/titlePlate.js', 'src/shell/titlePlateArt.js', 'src/shell/magicStones.js', 'src/shared/musicDirector.js',
    'src/shell/cutscene/player.js', 'src/shell/cutscene/painters.js', 'src/shell/cutscene/painters-c1.js', 'src/shell/cutscene/painters-c2.js',
    'src/shell/cutscene/painters-c3.js', 'src/shell/cutscene/scenes/chapter1To2.js', 'src/shell/cutscene/scenes/chapter2To3.js',
    'src/shell/cutscene/scenes/chapter3To4.js', 'src/shell/cutscene/scenes/chapter4To5.js', 'src/shell/cutscene/scenes/chapter5-to-black-knife.js',
    'src/shell/cutscene/scenes/ending.js', 'index.html',
  ];
  for (const file of files) {
    const source = read(file).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    assert.doesNotMatch(source, /'Anton'|"Anton"|Space Mono|ui-monospace/, file);
    for (const line of source.split('\n').filter((text) => /\bGeorgia\b/.test(text))) {
      assert.match(line, /EB Garamond|--nf-serif|FONT_SERIF/, `${file}: Georgia only as a fallback (${line.trim()})`);
    }
  }
  // canvas text waits for the faces before it is painted
  assert.match(read('src/shell/titlePlate.js'), /return waitForFonts\(\{ timeoutMs: 900 \}\)\.then\(\(\) => requestAnimationFrame\(paint\)\);/);
  assert.match(read('src/shell/cutscene/player.js'), /await waitForFonts\(\{ timeoutMs: 900 \}\);/);
});

test('waitForFonts loads the house faces, and never holds a scene past its timeout', async () => {
  assert.equal(await waitForFonts({ doc: {} }), false, 'no FontFace API');
  const asked = [];
  const ok = await waitForFonts({ doc: { fonts: { load: (face) => { asked.push(face); return Promise.resolve([]); }, ready: Promise.resolve() } } });
  assert.equal(ok, true);
  assert.deepEqual(asked, [...HOUSE_FACES]);
  const slow = await waitForFonts({ timeoutMs: 20, doc: { fonts: { load: () => new Promise(() => {}), ready: Promise.resolve() } } });
  assert.equal(slow, false);
  const failing = await waitForFonts({ doc: { fonts: { load: () => Promise.reject(new Error('404')), ready: Promise.resolve() } } });
  assert.equal(failing, true, 'a missing face does not hold the scene either');
});
