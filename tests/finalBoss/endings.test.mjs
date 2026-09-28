import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { FINAL_LINES, REVEAL_ENDS, TRUE_ENDING_SCRIPT, scriptStateAt } from '../../src/trueEndingScript.js';
import {
  ASSIST, BELL_SECONDS, BOSS, PARRY_WINDOW, PHASE_CARDS, PLAYER, nearestBellOffset, phaseForHp, phaseStartHp,
} from '../../src/chapters/blackKnifeFinal/constants.js';
import { FINAL_BOSS_DESTINATIONS } from '../../src/shell/finalBossRoute.js';

const root = new URL('../../', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (/\.(js|html|css|md)$/.test(name)) out.push(path);
  }
  return out;
}

// ------------------------------------------------------------ true ending

test('the true ending tells the bible reveal and ends on the two final lines', () => {
  const text = TRUE_ENDING_SCRIPT.map((beat) => [beat.a, beat.b, beat.stamp].filter(Boolean).join(' ')).join(' ');
  assert.match(text, /echo the Conductor filed/);
  assert.match(text, /keep riding/);
  assert.match(text, /both her lives in 1978/);
  assert.match(text, /gets off at Bellwether/);
  assert.match(text, /orchard case at Rosa’s door/);
  assert.deepEqual([...FINAL_LINES], ['The property was lost, not Mara.', 'CLAIM 1978-0412 · CLOSED.']);
  const html = read('true-ending.html');
  FINAL_LINES.forEach((line) => assert.ok(html.includes(line), line));
});

test('no "never had a sister" line survives anywhere the player can read', () => {
  const files = [...walk(new URL('src', root).pathname), ...['true-ending.html', 'final-boss.html', 'hidden-final-boss.html', 'public/CREDITS.md'].map((p) => new URL(p, root).pathname)];
  for (const file of files) {
    const source = readFileSync(file, 'utf8');
    assert.doesNotMatch(source, /never had a sister/i, file);
    assert.doesNotMatch(source, /Mara was an illusion/i, file);
  }
});

test('input stays locked until the reveal ends; hold-to-skip reaches the last frame', () => {
  const last = TRUE_ENDING_SCRIPT.at(-1).at;
  assert.ok(REVEAL_ENDS > last);
  assert.equal(scriptStateAt(last - 0.01).finalStamp, false);
  assert.equal(scriptStateAt(REVEAL_ENDS - 0.01).revealEnded, false);
  const end = scriptStateAt(REVEAL_ENDS);
  assert.deepEqual([end.revealEnded, end.finalLine, end.finalStamp, end.panel], [true, true, true, 'door']);
  const main = read('src/trueEnding-main.js');
  assert.match(main, /installHoldToSkip\(\{ onSkip: skipToEnd/);
  assert.match(main, /if \(!shown\.revealEnded \|\| globalThis\.NIGHTFALL_PAUSED \|\| event\.repeat/);
  assert.doesNotMatch(main, /event\.code === 'Enter' \|\| event\.code === 'Space'\) finish\(\);\n  \}\);\n\}/);
  // the credits track plays under the reveal
  assert.match(main, /const track = CREDIT_MUSIC\[0\];\s*music\.play\('true-ending-credits', \{ src: track\.localFile/);
  assert.match(main, /magicStoneRow\(stones\)/);
});

// ------------------------------------------------------------ the Black Ticket

test('the Black Ticket is a shorter fight: about 2,600 HP in five phases', () => {
  assert.ok(BOSS.maxHp >= 2400 && BOSS.maxHp <= 2800);
  assert.equal(phaseForHp(BOSS.maxHp), 0);
  assert.equal(phaseForHp(phaseStartHp(1)), 1);
  assert.equal(phaseForHp(phaseStartHp(4) - 1), 4);
  assert.deepEqual([0, 1, 2, 3, 4].map((p) => phaseStartHp(p)), [2600, 2080, 1560, 1040, 520]);
});

test('a shield raised on the bell is a parry', () => {
  assert.equal(BELL_SECONDS, 4);
  assert.ok(Math.abs(nearestBellOffset(3.9) - 0.1) < 1e-9);
  assert.ok(Math.abs(nearestBellOffset(8.2) - 0.2) < 1e-9);
  assert.ok(nearestBellOffset(2) > PARRY_WINDOW, 'the off-beat is not a parry');
  const scene = read('src/chapters/blackKnifeFinal/scenes/BossScene.js');
  assert.match(scene, /this\.player\.tryShield\(\)\) this\.onShieldRaised\(\)/);
  assert.match(scene, /this\.player\.shieldCharges = Math\.min\(PLAYER\.shieldCharges, this\.player\.shieldCharges \+ 1\)/);
});

test('failures retry from the current phase, and assist is offered after two', () => {
  assert.equal(ASSIST.offerAfterFailures, 2);
  assert.ok(ASSIST.lives > PLAYER.lives);
  assert.ok(ASSIST.bulletScale < 1);
  const scene = read('src/chapters/blackKnifeFinal/scenes/BossScene.js');
  assert.match(scene, /this\.checkpointPhase = this\.boss\.phase/);
  assert.match(scene, /this\.beginIntro\(\{ fromPhase: phase \}\)/);
  assert.match(scene, /this\.boss\.hp = phaseStartHp\(fromPhase\)/);
  assert.match(scene, /this\.failures >= ASSIST\.offerAfterFailures/);
  assert.match(read('hidden-final-boss.html'), /id="retry-phase"/);
  assert.match(read('hidden-final-boss.html'), /id="assist-offer"/);
});

test('each of the five phases opens on one stone’s chapter', () => {
  assert.deepEqual(PHASE_CARDS.map((card) => card.chapter), ['NIGHT SERVICE', 'BORROWED LIGHT', 'ECHO CITY', 'THE PAINTED COUNTRY', 'THE MUSEUM OF ONE ANSWER']);
  assert.deepEqual(PHASE_CARDS.map((card) => card.stone), ['EMBER STONE', 'GRID STONE', 'ECHO STONE', 'PIGMENT STONE', 'BLACK TICKET']);
  assert.match(read('src/chapters/blackKnifeFinal/scenes/BossScene.js'), /this\.showPhaseCard\(phase\)/);
});

test('player-visible Black Knife, Infinity Train and announcer lines are gone', () => {
  assert.equal(FINAL_BOSS_DESTINATIONS.blackKnife.title, 'BLACK TICKET');
  assert.equal(FINAL_BOSS_DESTINATIONS.blackKnife.id, 'black-knife', 'code ids stay');
  const visible = [
    'hidden-final-boss.html', 'final-boss.html', 'true-ending.html',
    'src/chapters/blackKnifeFinal/scenes/BossScene.js', 'src/chapters/blackKnifeFinal/main.js', 'src/chapters/blackKnifeFinal/entities/Hud.js',
    'src/chapters/finalBoss/spectacleBattle.js',
  ].map((path) => [path, read(path)]);
  for (const [path, source] of visible) {
    assert.doesNotMatch(source, /Black Knife|BLACK KNIFE/, path);
    assert.doesNotMatch(source, /infinity train/i, path);
    assert.doesNotMatch(source, /'READY\?'|WALLOP|KNOCKOUT!/, path);
    assert.doesNotMatch(source, /CS247G/, path);
    assert.doesNotMatch(source, /#ff176f|#ff2266|0xff176f|0xff2266/i, path);
  }
  const scene = read('src/chapters/blackKnifeFinal/scenes/BossScene.js');
  assert.match(scene, /this\.announce\('DEPARTING'/);
  assert.match(scene, /this\.announce\('CLAIM CLOSED'/);
  assert.doesNotMatch(scene, /four stones/i);
  assert.match(scene, /All five stones answer/);
});

test('the Conductor page has no reCAPTCHA look-alike and a single boarding prompt', () => {
  const battle = read('src/chapters/finalBoss/spectacleBattle.js');
  assert.doesNotMatch(battle, /I'm not a robot|Select all squares|Privacy · Terms|rePLAYER|captcha/i);
  assert.match(battle, /IDENTITY VERIFIED/);
  assert.doesNotMatch(battle, /SPACE · DASH/);
  assert.match(battle, /SHIFT · DASH/);
  assert.equal((battle.match(/BOARD THE NIGHT SERVICE/g) || []).length, 1);
  assert.doesNotMatch(battle, /ATTACK WINDOW \/\/ SPEAK/);
  assert.doesNotMatch(battle, /PAPER TORN|LINE TAKES YOU/, 'the unreachable loss screen is gone');
  assert.doesNotMatch(read('final-boss.html'), /id="result"/);
});
