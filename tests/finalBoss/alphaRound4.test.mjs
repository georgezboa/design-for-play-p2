// Alpha round 4 · Chapter 6, the Black Ticket and the true ending (M5).
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { describe, it } from 'node:test';

import { MAX_FRAME_SECONDS, MAX_STEP_SECONDS, frameSteps } from '../../src/chapters/finalBoss/finaleQuality.js';
import { BELL_ARENA, MACHINE_NAMES, createBellArena } from '../../src/chapters/finalBoss/finaleModel.js';

const source = (path) => readFile(new URL(`../../${path}`, import.meta.url), 'utf8');
const sum = (steps) => steps.reduce((total, step) => total + step, 0);

describe('frame-rate independence', () => {
  it('plays a 12 fps frame at wall-clock speed, in substeps of at most 1/30 s', () => {
    const steps = frameSteps(1 / 12);
    assert.ok(Math.abs(sum(steps) - 1 / 12) < 1e-9);
    assert.ok(steps.every((step) => step <= MAX_STEP_SECONDS + 1e-9));
    assert.equal(steps.length, 3);
  });

  it('keeps 60 fps as one step and caps a stall at 0.125 s', () => {
    assert.deepEqual(frameSteps(1 / 60), [1 / 60]);
    assert.ok(Math.abs(sum(frameSteps(2.5)) - MAX_FRAME_SECONDS) < 1e-9);
    assert.deepEqual(frameSteps(0), []);
    assert.deepEqual(frameSteps(-1), []);
  });

  it('ten seconds at 15 fps advance ten seconds of game time (the old cap gave five)', () => {
    let game = 0;
    for (let frame = 0; frame < 150; frame += 1) game += sum(frameSteps(1 / 15));
    assert.ok(Math.abs(game - 10) < 1e-6);
    assert.ok(Math.abs(150 * Math.min(0.033, 1 / 15) - 4.95) < 1e-9, 'what the 33 ms cap used to play');
  });

  it('the Conductor and the Black Ticket both step their frames through frameSteps', async () => {
    assert.match(await source('src/chapters/finalBoss/spectacleBattle.js'), /frameSteps\(wall\)/);
    assert.doesNotMatch(await source('src/chapters/finalBoss/spectacleBattle.js'), /Math\.min\(0\.033/);
  });
});

// Round 11: Movement II teaches by doing in its first phase (no beams until
// the first punch lands, one hint at a time); movements/onTheBell.js has it
// and round11Movements.test.mjs drives it. The arena keeps its hold and
// its planks.
describe('Movement II: the bell arena', () => {
  it('a held bell stands still, but a plank laid for the learner still crosses', () => {
    const arena = createBellArena({ seed: 3, beams: false });
    const before = arena.msToBell();
    arena.extendReturnBridge('bridge-west');
    arena.update(2000, { hold: true });
    assert.equal(arena.msToBell(), before);
    assert.equal(arena.bridgeLevel('bridge-west'), 1);
    assert.equal(arena.bridgeUnder(-7, -2.5), 'bridge-west');
  });

  it('every lamp names its colour line, and LISTEN names the machines', () => {
    for (const node of BELL_ARENA.nodes) assert.match(node.label, new RegExp(`^${node.line.toUpperCase()} `));
    assert.equal(MACHINE_NAMES['bridge-east'], 'BRIDGE EAST');
  });
});

describe('Movement II reads at a glance', () => {
  it('a billboard turns to glass while Butch stands behind it', async () => {
    const battle = await source('src/chapters/finalBoss/spectacleBattle.js');
    assert.match(battle, /mesh\.fade \+= \(\(behind \? 0\.28 : 1\) - mesh\.fade\)/);
  });

  it('lamps, tags and prompt pills take their line colour', async () => {
    const art = await source('src/chapters/finalBoss/finaleArt.js');
    assert.match(art, /color: LAMP_NODE_TAG\[line\]/);
    const ui = await source('src/shell/finaleUi.js');
    assert.match(ui, /color-mix\(in srgb, \$\{color\} 34%, #efe4cc\)/);
  });

  it('one banner slot: a toast hides the hint while it shows', async () => {
    const style = await source('src/chapters/finalBoss/style.css');
    assert.match(style, /\.battle-hud\.has-toast \.nf-hint\.show \{ opacity: 0;/);
    assert.doesNotMatch(style, /\.battle-hud\.has-hint \.nf-toast \{ top: 138px; \}/);
  });
});

describe('after an ending, the journey says it is complete', () => {
  const memoryStorage = () => {
    const data = new Map();
    return { getItem: (k) => (data.has(k) ? data.get(k) : null), setItem: (k, v) => data.set(k, String(v)), removeItem: (k) => data.delete(k) };
  };

  it('records the ending on the Chapter 6 checkpoint and reads it back; LOAD drops it', async () => {
    const { createSaveStore } = await import('../../src/shell/saveSystem.js');
    const { completedEnding, recordEnding } = await import('../../src/chapters/finalBoss/journeyComplete.js');
    const store = createSaveStore(memoryStorage(), { scratch: false });
    store.startNew(0);
    store.markCheckpoint('chapter-6-start');
    assert.equal(completedEnding(store), null);
    recordEnding('normal', store);
    assert.equal(completedEnding(store), 'normal');
    // Opening the Chapter 6 page again (markCheckpoint) keeps it.
    store.markCheckpoint('chapter-6-start');
    assert.equal(completedEnding(store), 'normal');
    assert.equal(recordEnding('bogus', store), null);
    // Picking a checkpoint is a new run through the story.
    store.selectCheckpoint(0, 'chapter-6-start');
    assert.equal(completedEnding(store), null);
  });

  it('the board offers the checkpoints, the missing-stone clues and the LOAD hint after a normal ending', async () => {
    const { CHECKPOINT_HINT, journeyCompleteCard } = await import('../../src/chapters/finalBoss/journeyComplete.js');
    const save = { checkpointId: 'chapter-6-start', unlocked: ['chapter-1-start', 'chapter-2-start', 'chapter-6-start'], magicStones: ['chapter-1'] };
    const normal = journeyCompleteCard(save, 'normal');
    assert.equal(normal.title, 'THE JOURNEY IS COMPLETE');
    assert.match(normal.kicker, /STATUS: OPEN/);
    assert.equal(normal.clues.length, 4);
    assert.match(normal.stones.stamp, /^1 \/ 5/);
    assert.match(CHECKPOINT_HINT, /LOAD · CHECKPOINTS/);
    assert.deepEqual(normal.checkpoints.map(({ id }) => id), ['chapter-1-start', 'chapter-2-start', 'chapter-6-start']);
    const { missingStoneNotice } = await import('../../src/shell/magicStones.js');
    assert.match(missingStoneNotice(['chapter-1']).hint, /LOAD · CHECKPOINTS/, 'the title\'s missing-stone card can say how to go back');
    const unfiled = journeyCompleteCard({ ...save, magicStones: ['chapter-1', 'chapter-2', 'chapter-3', 'chapter-4', 'black-knife'] }, 'true');
    assert.match(unfiled.kicker, /CLOSED/);
    assert.equal(unfiled.stones, null);
  });

  it('the Conductor records the normal ending and the true ending page records its own', async () => {
    assert.match(await source('src/chapters/finalBoss/spectacleBattle.js'), /recordEnding\('normal'\)/);
    assert.match(await source('src/trueEnding-main.js'), /recordEnding\('true'\)/);
    assert.match(await source('src/chapters/finalBoss/spectacleBattle.js'), /showJourneyComplete\(\{/);
  });
});

describe('Movement III and the departure', () => {
  it('the argument never freezes the square (round 11: it is fought), and the exposed pose is a stagger, never the kneel', async () => {
    const battle = await source('src/chapters/finalBoss/spectacleBattle.js');
    assert.doesNotMatch(battle, /this\.echo\.stage = 'deflected'/);
    assert.match(battle, /Movement III speaks while it fights: lines queue, never pause the square\./);
    assert.doesNotMatch(battle, /playConductorAction\('Fixing_Kneeling'/);
    assert.match(battle, /this\.playConductorAction\('Hit_Chest', true\);/);
  });

  it('the lens opens onto the next world, the HUD leaves the departure, and the night service has an engine', async () => {
    const battle = await source('src/chapters/finalBoss/spectacleBattle.js');
    assert.match(battle, /this\.setPortalWorld\(nextPhase\);/);
    assert.match(battle, /this\.hud\.classList\.add\('is-cinematic'\);/);
    assert.match(battle, /\/\/ locomotive \(x 7\.6 … 13\)/);
    assert.match(battle, /RETURN \$\{paintReturnDamage\(Math\.max\(1, this\.player\.color\)\)\}/);
    assert.doesNotMatch(battle, /lastPointer < 3\.5/);
  });
});

describe('the Black Ticket: STORY, Chapter 6 keys, the shared pause menu', () => {
  it('STORY is gentler on every axis and is offered after the first failure', async () => {
    const { BT_DIFFICULTIES, STORY_OFFER_AFTER_FAILURES, btDifficulty } = await import('../../src/chapters/blackKnifeFinal/constants.js');
    const { story, normal } = BT_DIFFICULTIES;
    assert.ok(story.lives > normal.lives);
    assert.ok(story.bulletScale < normal.bulletScale);
    assert.ok(story.recoveryScale > normal.recoveryScale);
    assert.ok(story.hitRadius < normal.hitRadius);
    assert.ok(story.hitInvuln > normal.hitInvuln);
    assert.ok(story.damageScale > normal.damageScale);
    assert.equal(STORY_OFFER_AFTER_FAILURES, 1);
    assert.equal(btDifficulty('nope').id, 'normal');
    const page = await source('hidden-final-boss.html');
    assert.match(page, /<button type="button" data-value="story">STORY/);
    assert.match(page, /id="story-offer"/);
  });

  it('uses the Conductor\'s keys: SPACE punches, SHIFT / X dash, E / C shield', async () => {
    const { BT_KEYS } = await import('../../src/chapters/blackKnifeFinal/constants.js');
    assert.match(BT_KEYS.punch, /LEFT CLICK \/ Z/);
    // round 6 (item 18): no jump here, so Space is a silent alias, never shown
    assert.doesNotMatch(BT_KEYS.punch, /SPACE/);
    assert.match(BT_KEYS.dash, /SHIFT \/ X/);
    assert.doesNotMatch(BT_KEYS.shield, /X/);
    const scene = await source('src/chapters/blackKnifeFinal/scenes/BossScene.js');
    assert.match(scene, /boost: this\.keys\.SHIFT\.isDown \|\| this\.keys\.X\.isDown/);
    assert.match(scene, /JustDown\(this\.keys\.E\)/);
    assert.doesNotMatch(scene, /JustDown\(this\.keys\.X\)/);
    const ch6 = await source('final-boss.html');
    assert.match(ch6, /<b>DASH<\/b> SHIFT \/ X/);
    const page = await source('hidden-final-boss.html');
    assert.match(page, /<b>DASH<\/b> HOLD SHIFT \/ X/);
    assert.match(page, /<b>SHIELD<\/b> E \/ C \/ RIGHT CLICK/);
  });

  it('has no page-own pause card or SOUND chip: P opens the shared menu, which pauses the fight', async () => {
    const page = await source('hidden-final-boss.html');
    assert.doesNotMatch(page, /id="pause-overlay"|id="mute"|id="pause"/);
    const main = await source('src/chapters/blackKnifeFinal/main.js');
    assert.match(main, /extraActions: \[\{ label: 'RESTART THE FIGHT', onSelect: restartFight \}\]/);
    assert.match(main, /if \(e\.code !== 'KeyP'[\s\S]{0,120}pauseMenu\?\.open\?\.\(\);/);
    assert.match(main, /if \(scene\?\.sys\?\.isActive\?\.\(\)\) scene\.scene\.pause\(\);/);
    assert.match(main, /fps: \{ panicMax: 0 \}/);
    const scene = await source('src/chapters/blackKnifeFinal/scenes/BossScene.js');
    assert.match(scene, /const steps = frameSteps\(deltaMs \/ 1000\);/);
    assert.doesNotMatch(scene, /Math\.min\(0\.033/);
  });

  it('frames the passenger in one line on the start card and names Butch on the HUD', async () => {
    assert.match(await source('hidden-final-boss.html'), /Here Butch flies as his own ticket, the one the clerk punched/);
    const hud = await source('src/chapters/blackKnifeFinal/entities/Hud.js');
    assert.match(hud, /BUTCH · HIS PUNCHED TICKET · /);
    assert.doesNotMatch(hud, /THE PASSENGER · A PUNCHED TICKET/);
  });
});
