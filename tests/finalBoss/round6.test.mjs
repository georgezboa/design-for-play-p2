// Chapter 6 · round 6 playtest (items 16–19): the answer rests on
// evidence (named records), Space only jumps, and each stage names its own
// controls. Round 12 plays the Conductor as set pieces, each stretch a
// checkpoint; what round 6 asked for that still holds is pinned here.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { checkpointLine } from '../../src/chapters/finalBoss/finaleModel.js';
import { checkExchanges } from '../../src/chapters/finalBoss/setPieces/falseClaims.js';
import { createPieceRunner } from '../../src/chapters/finalBoss/setPieces/kernel.js';
import { createRoofRun } from '../../src/chapters/finalBoss/setPieces/roofRun.js';
import { SET_PIECES } from '../../src/chapters/finalBoss/setPieces/sequence.js';
import { ECHO_EXCHANGES, ECHO_FACTS_ASK } from '../../src/chapters/finalBoss/echoExchanges.js';
import {
  CONTROLS_STAGE_EVENT, FINALE_ALL_CONTROLS, FINALE_STAGE_CONTROLS, PIECE_KEY_LINES, PROGRESS_KEPT_LINE, STORY_KEPT_LINE,
  announceControlsStage, controlsStageDetail, finalePauseControls, finaleStageControls,
} from '../../src/chapters/finalBoss/finaleControls.js';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const battle = read('src/chapters/finalBoss/spectacleBattle.js');
const page = read('final-boss.html');
const PIECE_IDS = SET_PIECES.flat().map((spec) => spec.id);

const truthIndices = (exchange) => exchange.facts.map((fact, index) => (fact.holds ? index : -1)).filter((index) => index >= 0);
const ECHO_FACTS_TO_PICK = 2;

// ------------------------------------------------------------ item 17

describe('Movement III: the argument rests on what the journey found', () => {
  // Round 12: the two true things come down as record cards to touch, and
  // the misreadings are the words he throws (each carrying his answer from
  // the record). The content round 6 wrote for them still has to hold.
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
    assert.throws(() => checkExchanges([{ ...first, facts: first.facts.map((fact) => ({ ...fact, holds: true })) }]), /two true things/);
    assert.throws(() => checkExchanges([{ ...first, replies: first.replies.map((reply) => ({ ...reply, holdsBoth: true })) }]), /one answer that holds both/);
    assert.throws(() => checkExchanges([]), /no exchanges/);
    assert.equal(checkExchanges(ECHO_EXCHANGES), ECHO_EXCHANGES);
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

describe('a torn last layer: round 6 kept everything; round 12 makes each stretch the checkpoint', () => {
  it('NORMAL: the stretch begins again, earlier stretches stay won; STORY: nothing is undone', () => {
    for (const [difficulty, rolledBack] of [['normal', true], ['story', false]]) {
      const piece = createRoofRun({ difficulty, startSegment: 1 });
      const runner = createPieceRunner({ piece, difficulty });
      const floor = piece.seg.ticket();
      piece.seg.setProgress(0.5);
      let death = null;
      for (let i = 0; i < runner.vitals.maxHp && !death; i += 1) {
        runner.vitals.inv = 0; runner.vitals.respawnInv = 0;
        death = (runner.hurt({ source: 'case' }) ?? []).find((e) => e.type === 'death') ?? null;
      }
      assert.ok(death, difficulty);
      assert.equal(death.rolledBack, rolledBack, difficulty);
      assert.equal(death.segment, 1, `${difficulty}: the first stretch stays won`);
      if (rolledBack) assert.equal(piece.seg.ticket(), floor, 'back to the start of the stretch');
      else assert.ok(piece.seg.ticket() > floor, 'his ticket stays where it was');
      assert.equal(runner.vitals.hp, runner.vitals.maxHp, 'all the layers again');
    }
    assert.match(checkpointLine({ rollback: 'segment', phaseName: 'THE LUGGAGE' }), /^This stretch starts again: THE LUGGAGE\. What you won before it stays won\.$/);
    assert.match(checkpointLine({ rollback: 'none' }), /^He stands up where he fell/);
  });

  it('the battle says so on the card and the ticket, and every movement states it once on its title card', () => {
    assert.match(battle, /'CHECKPOINT · THIS STRETCH AGAIN' : 'KEPT · NOTHING UNDONE'/);
    assert.match(battle, /Nothing is lost either way\. What you have won stays won\./);
    for (const line of [PROGRESS_KEPT_LINE, STORY_KEPT_LINE]) assert.ok(line.length <= 80, line);
    assert.match(battle, /kept\.textContent = difficulty === 'story' \? STORY_KEPT_LINE : PROGRESS_KEPT_LINE;/);
  });
});

// ------------------------------------------------------- items 18 and 19

describe('controls: Space only jumps, E / Enter acts, and each set piece names its own', () => {
  it('Space is never the action key: it jumps, and E or Enter acts', () => {
    assert.doesNotMatch(battle, /spaceAction/);
    assert.match(battle, /if \(event\.code === 'Space'\) \{ event\.preventDefault\(\); this\.jumpKey\(\); \}/);
    assert.match(battle, /if \(event\.code === 'KeyE' \|\| event\.code === 'Enter' \|\| event\.code === 'NumpadEnter'\) \{[\s\S]{0,120}this\.actAction\(\);/);
    // Wherever a prompt shows SPACE, it is a jump.
    const sources = [battle, ...['roofRun', 'returnToSender', 'bellRooftops', 'bellTower', 'falseClaims', 'standoff', 'paintedLine'].map((name) => read(`src/chapters/finalBoss/setPieces/${name}.js`))];
    for (const source of sources) {
      for (const [prompt] of source.matchAll(/<kbd>SPACE<\/kbd>[^'`<]*/g)) assert.match(prompt, /JUMP/, prompt);
    }
    // The ticket inspection continues on E / Enter, not Space.
    assert.match(battle, /\['Enter', 'NumpadEnter', 'KeyE'\]\.includes\(event\.code\)/);
  });

  it('the start board and the title cards show the unified keys', () => {
    assert.match(page, /<b>JUMP<\/b> SPACE <i><\/i> <b>ACT<\/b> E \/ ENTER/);
    assert.doesNotMatch(page, /SPACE \/ CLICK returns|SPACE punches|SPACE at the front edge/);
    assert.deepEqual(Object.keys(PIECE_KEY_LINES).sort(), [...PIECE_IDS].sort(), 'a key line for every set piece');
    Object.values(PIECE_KEY_LINES).forEach((line) => {
      (line.match(/SPACE · [A-Z ’,]+/g) ?? []).forEach((use) => assert.match(use, /^SPACE · (JUMP|CLIMB, AND JUMP)/, line));
    });
    assert.match(PIECE_KEY_LINES['false-claims'], /E · SAY BOTH TRUE THINGS/);
  });

  it('each set piece has 3–5 controls of its own; Space is only ever JUMP', () => {
    const stages = [...PIECE_IDS, 'departure'];
    assert.deepEqual(Object.keys(FINALE_STAGE_CONTROLS), stages);
    for (const stage of stages) {
      const rows = finaleStageControls(stage);
      assert.ok(rows.length >= 3 && rows.length <= 5, `${stage}: ${rows.length}`);
      rows.forEach(([label, keys]) => { if (/SPACE/.test(keys)) assert.match(label, /JUMP/, `${stage}: ${label}`); });
    }
    for (const stage of ['roof-run', 'return-to-sender', 'on-the-bell', 'false-claims']) assert.ok(finaleStageControls(stage).some(([, keys]) => /E \/ ENTER/.test(keys)), stage);
    assert.ok(finaleStageControls('painted-line').some(([, keys]) => /HOLD E/.test(keys)));
    FINALE_ALL_CONTROLS.forEach(([label, keys]) => { if (/SPACE/.test(keys)) assert.equal(label, 'JUMP'); });
    // Unknown stages fall back, and callers get copies.
    assert.deepEqual(finaleStageControls('nope'), finaleStageControls('roof-run'));
    finaleStageControls('false-claims')[0][0] = 'X';
    assert.equal(FINALE_STAGE_CONTROLS['false-claims'][0][0], 'MOVE');
  });

  it('the stage change is announced to the shell as nightfall:controls-stage', () => {
    const target = new EventTarget();
    const heard = [];
    target.addEventListener(CONTROLS_STAGE_EVENT, (event) => heard.push(event.detail));
    const sent = announceControlsStage('standoff', target);
    assert.equal(CONTROLS_STAGE_EVENT, 'nightfall:controls-stage');
    assert.deepEqual(heard, [sent]);
    assert.deepEqual(sent, { chapter: 'final-boss', stage: 'standoff', controls: finaleStageControls('standoff') });
    assert.deepEqual(controlsStageDetail('painted-line').controls, finaleStageControls('painted-line'));
    assert.equal(announceControlsStage('roof-run', null), null);
    // Each set piece and the departure announce themselves.
    assert.match(battle, /enterPiece\(\{ announce = true \} = \{\}\) \{\s*const piece = this\.run\.piece;\s*this\.setControlsStage\(piece\.id\);/);
    assert.match(battle, /onBoarded\(\) \{[\s\S]{0,80}this\.setControlsStage\('departure'\);/);
  });

  it('the pause list can lead with the stage, with every control after it once', () => {
    const rows = finalePauseControls('bell-tower');
    const stage = finaleStageControls('bell-tower');
    assert.deepEqual(rows.slice(0, stage.length), stage);
    assert.equal(new Set(rows.map(([label]) => label)).size, rows.length, 'no row twice');
    assert.deepEqual(finalePauseControls(), FINALE_ALL_CONTROLS.map((row) => [...row]));
    assert.match(battle, /controls: \[\.\.\.FINALE_ALL_CONTROLS\.map\(\(row\) => \[\.\.\.row\]\)\]/);
  });
});
