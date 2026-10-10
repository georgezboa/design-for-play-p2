// Chapter 6 · round 6 playtest (items 16–19): the answer rests on
// evidence (named records), Space only jumps, and each movement names its
// own controls. Round 11 turned the argument into action and made a torn
// last layer a phase checkpoint; what round 6 asked for that still holds is
// pinned here.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { checkpointLine } from '../../src/chapters/finalBoss/finaleModel.js';
import { createArgument } from '../../src/chapters/finalBoss/movements/echoCity.js';
import { createFightRunner } from '../../src/chapters/finalBoss/conductorFight.js';
import { createLostPropertyFight } from '../../src/chapters/finalBoss/movements/lostProperty.js';
import { ECHO_EXCHANGES, ECHO_FACTS_ASK } from '../../src/chapters/finalBoss/echoExchanges.js';
import {
  CONTROLS_STAGE_EVENT, FINALE_ALL_CONTROLS, FINALE_STAGE_CONTROLS, MOVEMENT_KEY_LINES, PROGRESS_KEPT_LINES,
  announceControlsStage, controlsStageDetail, finalePauseControls, finaleStageControls,
} from '../../src/chapters/finalBoss/finaleControls.js';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const battle = read('src/chapters/finalBoss/spectacleBattle.js');
const page = read('final-boss.html');

const truthIndices = (exchange) => exchange.facts.map((fact, index) => (fact.holds ? index : -1)).filter((index) => index >= 0);
const ECHO_FACTS_TO_PICK = 2;

// ------------------------------------------------------------ item 17

describe('Movement III: the argument rests on what the journey found', () => {
  // Round 11: the two true things come down as record cards to strike, and
  // the misreadings are what he throws (each carrying his answer from the
  // record). The content round 6 wrote for them still has to hold.
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

  it('the argument refuses malformed exchanges', () => {
    const [first] = ECHO_EXCHANGES;
    assert.throws(() => createArgument([{ ...first, facts: first.facts.map((fact) => ({ ...fact, holds: true })) }]), /two true things/);
    assert.throws(() => createArgument([{ ...first, replies: first.replies.map((reply) => ({ ...reply, holdsBoth: true })) }]), /one answer that holds both/);
    assert.throws(() => createArgument([]), /no exchanges/);
  });

  it('the stage never shows a board to answer on: the square is fought, and his lines are subtitles', () => {
    assert.doesNotMatch(battle, /data-fact=|data-confirm=|SAY THESE TWO/);
    assert.match(battle, /this\.caption\.style\.pointerEvents = 'none';/);
    // Every size on the subtitle follows TEXT SIZE (finale.css).
    const finale = read('src/shell/finale.css');
    assert.match(finale, /\.nf-caption__choice \{[^}]*calc\(17px \* var\(--nf-scale\)\)/);
  });
});

// ------------------------------------------------------------ item 16

describe('a torn last layer: round 6 kept everything; round 11 makes each phase the checkpoint', () => {
  it('NORMAL: the phase begins again, earlier phases stay won; STORY: nothing is undone', () => {
    for (const [difficulty, rolledBack] of [['normal', true], ['story', false]]) {
      const director = createLostPropertyFight({ difficulty });
      director.skipTeach();
      const runner = createFightRunner({ director, difficulty });
      director.damage(20);
      runner.body.inv = 0;
      let death = null;
      for (let i = 0; i < runner.body.maxHp && !death; i += 1) {
        runner.body.inv = 0; runner.body.respawnInv = 0;
        death = (runner.hurt({ source: 'case' }) ?? []).find((e) => e.type === 'death') ?? null;
      }
      assert.ok(death, difficulty);
      assert.equal(death.rolledBack, rolledBack, difficulty);
      assert.equal(director.track.hp, rolledBack ? 100 : 80);
    }
    assert.match(checkpointLine({ rollback: 'phase', phaseName: 'RETURN TO SENDER' }), /^This phase starts again: RETURN TO SENDER\. What you won before it stays won\.$/);
    assert.match(checkpointLine({ rollback: 'none' }), /^His ticket stays where you left it/);
  });

  it('the battle says so on the card and the ticket, and every movement states it once on its title card', () => {
    assert.match(battle, /'CHECKPOINT · THIS PHASE AGAIN' : 'KEPT · NOTHING UNDONE'/);
    assert.doesNotMatch(battle, /STARTS AGAIN/);
    assert.match(battle, /Nothing is lost either way\. Earlier phases stay won\./);
    assert.equal(PROGRESS_KEPT_LINES.length, 4);
    PROGRESS_KEPT_LINES.forEach((line) => assert.ok(line.length <= 72, line));
    assert.match(battle, /kept\.textContent = difficulty === 'story' \? STORY_KEPT_LINE : PROGRESS_KEPT_LINES\[index\];/);
  });
});

// ------------------------------------------------------- items 18 and 19

describe('controls: Space only jumps, E / Enter acts, and each movement names its own', () => {
  it('Space is never the action key: it jumps, and E or Enter acts', () => {
    assert.doesNotMatch(battle, /spaceAction/);
    assert.match(battle, /if \(event\.code === 'Space'\) \{ event\.preventDefault\(\); this\.jumpKey\(\); \}/);
    assert.match(battle, /if \(event\.code === 'KeyE' \|\| event\.code === 'Enter' \|\| event\.code === 'NumpadEnter'\) \{[\s\S]{0,200}this\.actAction\(\{ key: event\.code === 'KeyE' \? 'E' : 'Enter' \}\);/);
    // Space is shown only where it jumps (boarding the night service).
    const spacePrompts = [...battle.matchAll(/<kbd>SPACE<\/kbd>[^'`]*/g)].map((match) => match[0]);
    assert.deepEqual(spacePrompts, ['<kbd>SPACE</kbd> / <kbd>E</kbd> · JUMP ABOARD THE NIGHT SERVICE']);
    for (const prompt of ["'<kbd>E</kbd> · RETURN'", '`<kbd>E</kbd> · ${node.label}`', "'<kbd>E</kbd> · RETURN THE LIGHT'"]) assert.ok(battle.includes(prompt), prompt);
    // Round 11: Space is the jump the fight asks for (rings, sweeps), and the
    // hints that teach it say so.
    assert.match(read('src/chapters/finalBoss/movements/onTheBell.js'), /<kbd>SPACE<\/kbd> · JUMP IT/);
    // The ticket inspection continues on E / Enter, not Space.
    assert.match(battle, /\['Enter', 'NumpadEnter', 'KeyE'\]\.includes\(event\.code\)/);
    // An action key with nothing to act on says so.
    assert.match(battle, /NO LAMP IN REACH · WALK UP TO ONE/);
    assert.match(battle, /E STRIKES A TRUE THING · WAIT FOR THEM TO COME DOWN/);
  });

  it('the start board and the title cards show the unified keys', () => {
    assert.match(page, /<b>JUMP<\/b> SPACE <i><\/i> <b>ACT<\/b> E \/ ENTER/);
    assert.doesNotMatch(page, /SPACE \/ CLICK returns|SPACE punches|SPACE at the front edge/);
    MOVEMENT_KEY_LINES.forEach((line) => {
      (line.match(/SPACE · [A-Z ’]+/g) ?? []).forEach((use) => assert.match(use, /^SPACE · JUMP/, line));
    });
    assert.match(MOVEMENT_KEY_LINES[2], /E · STRIKE ONE TRUE THING, THEN THE OTHER/);
  });

  it('each movement has 3–5 controls of its own; Space is only ever JUMP', () => {
    for (const stage of ['lost', 'borrowed', 'echo', 'painted', 'departure']) {
      const rows = finaleStageControls(stage);
      assert.ok(rows.length >= 3 && rows.length <= 5, `${stage}: ${rows.length}`);
      rows.forEach(([label, keys]) => { if (/SPACE/.test(keys)) assert.match(label, /JUMP/, `${stage}: ${label}`); });
    }
    for (const stage of ['lost', 'borrowed', 'echo']) assert.ok(finaleStageControls(stage).some(([, keys]) => /E \/ ENTER/.test(keys)), stage);
    assert.ok(finaleStageControls('painted').some(([, keys]) => /HOLD E/.test(keys)));
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
