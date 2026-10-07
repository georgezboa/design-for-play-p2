// Chapter 6 · round 6 playtest (items 16–19): a torn last layer never
// undoes progress, the answer is reasoned from evidence (facts, then
// framing), Space only jumps, and each movement names its own controls.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { ECHO_FACTS_TO_PICK, createEchoDebate, keptAfterTornLayers, tornLayerReset } from '../../src/chapters/finalBoss/finaleModel.js';
import { ECHO_EXCHANGES, ECHO_FACTS_ASK } from '../../src/chapters/finalBoss/echoExchanges.js';
import {
  CONTROLS_STAGE_EVENT, FINALE_ALL_CONTROLS, FINALE_STAGE_CONTROLS, MOVEMENT_KEY_LINES, PROGRESS_KEPT_LINES,
  announceControlsStage, controlsStageDetail, finalePauseControls, finaleStageControls,
} from '../../src/chapters/finalBoss/finaleControls.js';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const battle = read('src/chapters/finalBoss/spectacleBattle.js');
const page = read('final-boss.html');

const truthIndices = (exchange) => exchange.facts.map((fact, index) => (fact.holds ? index : -1)).filter((index) => index >= 0);
const misreadIndices = (exchange) => exchange.facts.map((fact, index) => (fact.holds ? -1 : index)).filter((index) => index >= 0);
const rightReply = (exchange) => exchange.replies.findIndex((reply) => reply.holdsBoth);

// ------------------------------------------------------------ item 17

describe('Movement III: the answer is reasoned from what the journey found', () => {
  it('every exchange offers four facts over named records: two true things, two misreadings with his answer', () => {
    // The records the earlier chapters establish (docs/STORY_BIBLE.md, the
    // Chapter 1–5 content): every fact names the one it rests on.
    const records = /LETTER|CLAIM 1978-0412|SEAT 43|COPPER HERON|HANA|EDA|ORDER C-441|FIRE LETTERS|CUT FEED|CARRIAGE LEDGER|NIKA|BELLWETHER|LAMP OIL|STATION|ROSA|CLERK'S NOTE|BORROWED LIGHT|CLAIM CARD/;
    const pairs = new Set();
    for (const exchange of ECHO_EXCHANGES) {
      assert.equal(exchange.facts.length, 4, exchange.id);
      assert.equal(exchange.facts.filter((fact) => fact.holds).length, ECHO_FACTS_TO_PICK, `${exchange.id}: two true things`);
      assert.equal(new Set(exchange.facts.map((fact) => fact.id)).size, 4, `${exchange.id}: fact ids are unique`);
      for (const fact of exchange.facts) {
        assert.match(fact.source, records, `${exchange.id}/${fact.id}: names its record`);
        // TEXT SIZE: short enough to read at a glance in a 2×2 grid.
        assert.ok(fact.text.length <= 72, `${exchange.id}/${fact.id}: one short line (${fact.text.length})`);
        assert.ok(fact.source.length <= 36, `${exchange.id}/${fact.id}: a short source (${fact.source.length})`);
        if (fact.holds) assert.equal(fact.rebut, undefined, `${exchange.id}/${fact.id}: a true thing has nothing to rebut`);
        else {
          assert.ok(fact.rebut && fact.rebut.length <= 110, `${exchange.id}/${fact.id}: his answer from the record, in a line or two`);
          assert.notEqual(fact.rebut, fact.text);
        }
      }
      pairs.add(truthIndices(exchange).join('+'));
      // Each framing is named, and the voiced lines are unchanged canon.
      exchange.replies.forEach((reply) => assert.match(reply.frame, /^AS /, `${exchange.id}: a framing`));
    }
    assert.ok(pairs.size >= 4, 'the two true things sit at different keys from one exchange to the next');
    assert.match(ECHO_FACTS_ASK, /TWO TRUE THINGS · ONE HE CAN GRANT, ONE THAT STAYS OPEN/);
  });

  it('the framing cannot be reached without the facts (no tone-only shortcut)', () => {
    const debate = createEchoDebate(ECHO_EXCHANGES);
    const open = debate.open();
    assert.equal(open.step, 'facts');
    assert.deepEqual(debate.choose(rightReply(open.exchange)), { result: 'ignored' });
    assert.equal(debate.isOpen, true);
  });

  it('picking: a pick toggles, a third lets the oldest go, and confirming needs exactly two', () => {
    const debate = createEchoDebate(ECHO_EXCHANGES);
    debate.open();
    assert.equal(debate.confirmFacts().result, 'need-two');
    assert.equal(debate.pickFact(0).result, 'picked');
    assert.deepEqual(debate.confirmFacts(), { result: 'need-two', picked: [debate.current.facts[0].id] });
    assert.equal(debate.pickFact(0).result, 'unpicked');
    debate.pickFact(0); debate.pickFact(1);
    const third = debate.pickFact(2);
    assert.equal(third.dropped, debate.current.facts[0].id);
    assert.deepEqual(third.picked, [debate.current.facts[1].id, debate.current.facts[2].id]);
    assert.equal(debate.pickFact(9).result, 'ignored');
  });

  it('a misreading: he answers it from the record, it stays struck, and the claim is not replayed', () => {
    const debate = createEchoDebate(ECHO_EXCHANGES);
    const first = debate.open();
    const [wrong] = misreadIndices(first.exchange);
    const [right] = truthIndices(first.exchange);
    debate.pickFact(wrong); debate.pickFact(right);
    const outcome = debate.confirmFacts();
    assert.equal(outcome.result, 'misread');
    assert.equal(outcome.fact.id, first.facts[wrong].id);
    assert.equal(outcome.rebut, first.facts[wrong].rebut, 'the rebuttal is specific to the misreading');
    assert.equal(debate.isOpen, false);
    // Back of the queue: the others come first, then it returns.
    for (let i = 1; i < ECHO_EXCHANGES.length; i += 1) {
      const next = debate.open();
      assert.notEqual(next.id, first.id);
      assert.equal(next.returning, false);
      truthIndices(next.exchange).forEach((index) => debate.pickFact(index));
      debate.confirmFacts();
      debate.choose(1 - rightReply(next.exchange));
    }
    const again = debate.open();
    assert.equal(again.id, first.id);
    assert.equal(again.returning, true, 'the stage shows his claim as text, not his voice again');
    assert.equal(again.step, 'facts');
    assert.deepEqual(again.struck, [first.facts[wrong].id]);
    assert.equal(debate.pickFact(wrong).result, 'struck', 'a struck card cannot be picked again');
  });

  it('true facts then the wrong framing: the facts are kept, and only the one true answer is left', () => {
    const debate = createEchoDebate([ECHO_EXCHANGES[1]]);
    const open = debate.open();
    truthIndices(open.exchange).forEach((index) => debate.pickFact(index));
    assert.equal(debate.confirmFacts().result, 'hold');
    assert.equal(debate.step, 'framing');
    const wrong = 1 - rightReply(open.exchange);
    assert.equal(debate.choose(wrong).result, 'deflected');
    const again = debate.open();
    assert.equal(again.returning, true);
    assert.equal(again.step, 'framing', 'it comes back straight at the framing');
    assert.deepEqual([...again.picked].sort(), open.exchange.facts.filter((fact) => fact.holds).map((fact) => fact.id).sort());
    assert.deepEqual(debate.openReplies(), [rightReply(open.exchange)]);
    assert.deepEqual(debate.choose(wrong), { result: 'ignored' }, 'a filed answer stays filed');
    assert.equal(debate.choose(rightReply(open.exchange)).result, 'window');
    assert.deepEqual(debate.landed(), [open.exchange.id]);
  });

  it('however a player stumbles, four windows can be earned and the queue never runs dry', () => {
    const debate = createEchoDebate(ECHO_EXCHANGES);
    let windows = 0;
    for (let turn = 0; turn < 40 && windows < 4; turn += 1) {
      const open = debate.open();
      if (open.step === 'facts') {
        // First visit: always a misreading; a return: the truth.
        const picks = open.returning ? truthIndices(open.exchange) : [misreadIndices(open.exchange)[0], truthIndices(open.exchange)[0]];
        picks.forEach((index) => debate.pickFact(index));
        if (debate.confirmFacts().result !== 'hold') continue;
      }
      if (debate.choose(rightReply(open.exchange)).result === 'window') windows += 1;
    }
    assert.equal(windows, 4, 'Movement III (200 → 100) can always be finished');
    // A debug jump past the windows still finds an exchange to open.
    for (let i = 0; i < 6; i += 1) {
      const open = debate.open();
      truthIndices(open.exchange).forEach((index) => debate.pickFact(index));
      debate.confirmFacts();
      debate.choose(rightReply(open.exchange));
    }
    assert.ok(debate.open());
  });

  it('the debate refuses malformed exchanges', () => {
    const [first] = ECHO_EXCHANGES;
    assert.throws(() => createEchoDebate([{ ...first, facts: first.facts.slice(0, 2) }]), /at least three facts/);
    assert.throws(() => createEchoDebate([{ ...first, facts: first.facts.map((fact) => ({ ...fact, holds: true })) }]), /exactly two true things/);
    assert.throws(() => createEchoDebate([{ ...first, facts: first.facts.map((fact) => ({ ...fact, rebut: undefined })) }]), /needs a rebuttal/);
  });

  it('the stage draws the board in two steps, keyboard and mouse alike, and never replays a heard claim', () => {
    assert.match(battle, /if \(exchange\.returning\) \{ this\.showAnswerBoard\(\); return; \}/);
    assert.match(battle, /data-fact="\$\{index\}"/);
    assert.match(battle, /data-confirm="1"/);
    assert.match(battle, /<kbd>E<\/kbd> SAY THESE TWO/);
    assert.match(battle, /if \(this\.echo\.stage === 'facts'\) this\.pickFact\(index\);/);
    assert.match(battle, /else if \(this\.echo\.stage === 'framing' && index < 2\) this\.chooseAnswer\(index\);/);
    // A misreading is answered by name, then the one-line deflection.
    assert.match(battle, /this\.playVoice\(rebut, \(\) => this\.showDeflection\(ECHO_MISREAD_DEFLECT\)\);/);
    // Every size on the board follows TEXT SIZE.
    const style = read('src/chapters/finalBoss/style.css');
    const board = style.slice(style.indexOf('the answer board (round 6'));
    const fonts = [...board.matchAll(/\bfont(?:-size)?:[^;}]*/g)].map((match) => match[0]).filter((rule) => /\dpx/.test(rule));
    assert.ok(fonts.length > 10);
    fonts.forEach((rule) => assert.match(rule, /^font(?:-size)?: (?:700 )?calc\(\d+(?:\.\d+)?px \* var\(--nf-scale\)\)/, rule));
    // A fresh run gets a fresh argument.
    assert.match(battle, /begin\(\{ movement = 0 \} = \{\}\) \{[\s\S]{0,700}this\.debate = createEchoDebate\(ECHO_EXCHANGES\);/);
  });
});

// ------------------------------------------------------------ item 16

describe('a torn last layer costs Butch his place, never his progress', () => {
  it('his ticket never rolls back, in any movement', () => {
    for (const movement of [0, 1, 2, 3]) {
      const reset = tornLayerReset({ movement, bossHp: 175, echoStage: 'combat', echoClock: 8, brush: 2 });
      assert.equal(reset.bossHp, 175, `movement ${movement}`);
      assert.equal(reset.brush, 0, 'only the chance in hand goes');
      assert.match(reset.kept, /^His ticket stays where you left it/);
    }
  });

  it('what goes is only the current chance: the cases (I), the lamps (II), the brush (IV)', () => {
    assert.equal(tornLayerReset({ movement: 0 }).clearCases, true);
    assert.equal(tornLayerReset({ movement: 1 }).newArena, true);
    assert.equal(tornLayerReset({ movement: 2 }).clearCases, false);
    assert.equal(tornLayerReset({ movement: 3, brush: 3 }).spilled, 3);
  });

  it('Movement III: an earned window stays open, and the next exchange never waits longer', () => {
    const window = tornLayerReset({ movement: 2, echoStage: 'window', echoClock: 10 });
    assert.equal(window.keepWindow, true);
    assert.equal(window.echoStage, 'window');
    assert.match(window.kept, /your answer stands: walk back to the lit front edge/);
    assert.equal(tornLayerReset({ movement: 2, echoStage: 'combat', echoClock: 9 }).echoClock, 5);
    assert.equal(tornLayerReset({ movement: 2, echoStage: 'combat', echoClock: 2 }).echoClock, 2);
    assert.match(keptAfterTornLayers(2), /Your answers stand, and struck cards stay struck/);
  });

  it('the battle uses the rule: no reset to the movement start, the card and the ticket say KEPT', () => {
    const respawn = battle.slice(battle.indexOf('  respawnPlayer() {'), battle.indexOf('  // After three deaths in one movement'));
    assert.doesNotMatch(respawn, /this\.boss\.hp = this\.boss\.phaseStartHp/);
    assert.match(respawn, /const reset = tornLayerReset\(\{ movement: this\.phase, bossHp: this\.boss\.hp/);
    assert.match(respawn, /this\.boss\.hp = reset\.bossHp;/);
    assert.match(battle, /'KEPT · NOTHING UNDONE'/);
    assert.doesNotMatch(battle, /STARTS AGAIN/);
    assert.match(battle, /Nothing is lost either way\. His ticket stays where you left it\./);
  });

  it('every movement states the rule once, on its title card', () => {
    assert.equal(PROGRESS_KEPT_LINES.length, 4);
    PROGRESS_KEPT_LINES.forEach((line) => {
      assert.match(line, /^TORN LAYERS COST YOU YOUR PLACE · /);
      assert.ok(line.length <= 72, line);
    });
    assert.match(battle, /kept\.textContent = PROGRESS_KEPT_LINES\[index\];/);
  });
});

// ------------------------------------------------------- items 18 and 19

describe('controls: Space only jumps, E / Enter acts, and each movement names its own', () => {
  it('Space is never the action key: it jumps, and E or Enter acts', () => {
    assert.doesNotMatch(battle, /spaceAction/);
    assert.match(battle, /if \(event\.code === 'Space'\) \{ event\.preventDefault\(\); this\.jumpKey\(\); \}/);
    assert.match(battle, /if \(event\.code === 'Enter' \|\| event\.code === 'NumpadEnter'\) \{[\s\S]{0,200}this\.actAction\(\{ key: 'Enter' \}\);/);
    // Space is shown only where it jumps (boarding the night service).
    const spacePrompts = [...battle.matchAll(/<kbd>SPACE<\/kbd>[^'`]*/g)].map((match) => match[0]);
    assert.deepEqual(spacePrompts, ['<kbd>SPACE</kbd> / <kbd>E</kbd> · JUMP ABOARD THE NIGHT SERVICE']);
    for (const prompt of ["'<kbd>E</kbd> · RETURN'", '`<kbd>E</kbd> · ${node.label}`', "'<kbd>E</kbd> · RETURN THE LIGHT'"]) assert.ok(battle.includes(prompt), prompt);
    // The ticket inspection continues on E / Enter, not Space.
    assert.match(battle, /\['Enter', 'NumpadEnter', 'KeyE'\]\.includes\(event\.code\)/);
    // An action key with nothing to act on says so.
    assert.match(battle, /NO LAMP IN REACH · WALK UP TO ONE/);
    assert.match(battle, /E SPEAKS WHEN HE ASKS · KEEP CLEAR UNTIL THEN/);
  });

  it('the start board and the title cards show the unified keys', () => {
    assert.match(page, /<b>JUMP<\/b> SPACE <i><\/i> <b>ACT<\/b> E \/ ENTER/);
    assert.doesNotMatch(page, /SPACE \/ CLICK returns|SPACE punches|SPACE at the front edge/);
    MOVEMENT_KEY_LINES.slice(0, 3).forEach((line) => {
      assert.match(line, /SPACE · JUMP$/);
      assert.equal(line.match(/SPACE/g).length, 1, line);
    });
    assert.match(MOVEMENT_KEY_LINES[2], /1 – 4 · CHOOSE WHAT YOU KNOW/);
  });

  it('each movement has 3–5 controls of its own; Space is only ever JUMP', () => {
    for (const stage of ['lost', 'borrowed', 'echo', 'painted', 'departure']) {
      const rows = finaleStageControls(stage);
      assert.ok(rows.length >= 3 && rows.length <= 5, `${stage}: ${rows.length}`);
      rows.forEach(([label, keys]) => { if (/SPACE/.test(keys)) assert.match(label, /JUMP/, `${stage}: ${label}`); });
    }
    for (const stage of ['lost', 'borrowed', 'echo']) assert.ok(finaleStageControls(stage).some(([, keys]) => /E \/ ENTER/.test(keys)), stage);
    FINALE_ALL_CONTROLS.forEach(([label, keys]) => { if (/SPACE/.test(keys)) assert.equal(label, 'JUMP'); });
    assert.deepEqual(Object.keys(FINALE_STAGE_CONTROLS), ['lost', 'borrowed', 'echo', 'painted', 'departure']);
    // Unknown stages fall back, and callers get copies.
    assert.deepEqual(finaleStageControls('nope'), finaleStageControls('lost'));
    finaleStageControls('echo')[0][0] = 'X';
    assert.equal(FINALE_STAGE_CONTROLS.echo[0][0], 'MOVE');
  });

  it('the stage change is announced to the shell as nightfall:controls-stage', () => {
    const target = new EventTarget();
    const heard = [];
    target.addEventListener(CONTROLS_STAGE_EVENT, (event) => heard.push(event.detail));
    const sent = announceControlsStage('echo', target);
    assert.equal(CONTROLS_STAGE_EVENT, 'nightfall:controls-stage');
    assert.deepEqual(heard, [sent]);
    assert.deepEqual(sent, { chapter: 'final-boss', stage: 'echo', controls: finaleStageControls('echo') });
    assert.deepEqual(controlsStageDetail('painted').controls, finaleStageControls('painted'));
    assert.equal(announceControlsStage('lost', null), null);
    // Each movement and the departure announce themselves.
    assert.match(battle, /enterMovement\(index, \{ first = false \} = \{\}\) \{\s*const phase = PHASES\[index\];\s*this\.setControlsStage\(phase\.id\);/);
    assert.match(battle, /this\.mode = 'departure';\s*this\.setControlsStage\('departure'\);/);
  });

  it('the pause list can lead with the stage, with every control after it once', () => {
    const rows = finalePauseControls('borrowed');
    assert.deepEqual(rows.slice(0, 5), finaleStageControls('borrowed'));
    assert.equal(new Set(rows.map(([label]) => label)).size, rows.length, 'no row twice');
    assert.deepEqual(finalePauseControls(), FINALE_ALL_CONTROLS.map((row) => [...row]));
    assert.match(battle, /controls: \[\.\.\.FINALE_ALL_CONTROLS\.map\(\(row\) => \[\.\.\.row\]\)\]/);
  });
});
