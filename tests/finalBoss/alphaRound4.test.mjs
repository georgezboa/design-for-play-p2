// Alpha round 4 · Chapter 6, the Black Ticket and the true ending (M5).
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { describe, it } from 'node:test';

import { MAX_FRAME_SECONDS, MAX_STEP_SECONDS, frameSteps } from '../../src/chapters/finalBoss/finaleQuality.js';
import {
  BELL_ARENA, BELL_TUTORIAL_HOLD_S, BELL_TUTORIAL_TIME_SCALE, MACHINE_NAMES, createBellArena, createBellTutorial,
} from '../../src/chapters/finalBoss/finaleModel.js';

const source = (path) => readFile(new URL(`../../${path}`, import.meta.url), 'utf8');
const sum = (steps) => steps.reduce((total, step) => total + step, 0);

describe('frame-rate independence', () => {
  it('plays a 12 fps frame at wall-clock speed, in substeps of at most 1/30 s', () => {
    const steps = frameSteps(1 / 12);
    assert.ok(Math.abs(sum(steps) - 1 / 12) < 1e-9);
    assert.ok(steps.every((step) => step <= MAX_STEP_SECONDS + 1e-9));
    assert.equal(steps.length, 3);
  });

  it('keeps 60 fps as one step and caps a stall at 0.1 s', () => {
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

describe('Movement II teaches one step per bell', () => {
  it('bridge, then the rose signal in his lane, then the punch with the bell waiting, then both, then the beams', () => {
    const t = createBellTutorial();
    assert.equal(t.stage, 'bridge');
    assert.match(t.hint(), /AMBER/);
    assert.equal(t.queued({ line: 'amber' }), 'bridge-wait');
    assert.equal(t.bridgeOut(), 'lamp');
    assert.match(t.hint({ lane: 'east' }), /ROSE<\/kbd> SIGNAL IN THE EAST LANE/);
    assert.equal(t.queued({ line: 'rose', lane: 'east', nextLane: 'east' }), 'lamp-wait');
    const help = t.exposed({ bridgeOut: false });
    assert.deepEqual(help, { hold: true, plank: true, missingBridge: false }, 'the first lit moment lays a plank and holds the bell');
    assert.equal(t.stage, 'punch');
    assert.equal(t.holding({ lit: true, dt: 1 }), true);
    assert.match(t.hint({ litLane: 'east', onFront: false }), /THE BELL WAITS/);
    assert.equal(t.hit(), 'combo');
    assert.equal(t.beams, false);
    assert.match(t.hint({ lane: 'west' }), /BOTH BEFORE ONE BELL .* \(WEST\)/);
    assert.deepEqual(t.exposed({ bridgeOut: false }), { hold: false, plank: false, missingBridge: true });
    assert.equal(t.hit(), 'done');
    assert.equal(t.beams, true);
    assert.equal(t.gapIsRailing, false);
    assert.equal(t.hint(), '');
  });

  it('a signal in the wrong lane says so at once, and a bell that passes names his new lane', () => {
    const t = createBellTutorial({ stage: 'lamp' });
    t.queued({ line: 'rose', lane: 'west', nextLane: 'centre' });
    assert.equal(t.stage, 'lamp');
    assert.match(t.hint({ lane: 'centre' }), /THAT IS THE WEST SIGNAL · HE STEPS CENTRE/);
    t.queued({ line: 'rose', lane: 'centre', nextLane: 'centre' });
    assert.equal(t.stage, 'lamp-wait');
    // The bell rings and he was not lit: back to the signal step, naming
    // the lane he steps into next (never "QUEUED" for 30 s).
    assert.equal(t.bell({ exposed: false }), 'lamp');
    assert.doesNotMatch(t.hint({ lane: 'east' }), /QUEUED/);
    assert.match(t.hint({ lane: 'east' }), /EAST LANE/);
  });

  it('the bell runs slower while learning, never holds forever, and what was learned survives a death', () => {
    assert.ok(BELL_TUTORIAL_TIME_SCALE.bridge < 1 && BELL_TUTORIAL_TIME_SCALE.done === 1);
    const t = createBellTutorial({ stage: 'punch' });
    let held = 0;
    while (t.holding({ lit: true, dt: 0.5 })) held += 0.5;
    assert.ok(held < BELL_TUTORIAL_HOLD_S + 1);
    assert.equal(t.afterDeath(), 'lamp');
    assert.equal(createBellTutorial({ stage: 'combo' }).afterDeath(), 'combo');
    assert.equal(createBellTutorial({ stage: 'bridge-wait' }).afterDeath(), 'bridge');
    assert.equal(createBellTutorial().gapIsRailing, true, 'no falls into the gap while learning');
  });

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
  it('the square freezes while a deflection is read, and the exposed pose is a stagger, never the kneel', async () => {
    const battle = await source('src/chapters/finalBoss/spectacleBattle.js');
    assert.match(battle, /this\.dialoguePause = true;\s*this\.echo\.stage = 'deflected';/);
    assert.match(battle, /if \(this\.phase === 2 && this\.echo\.stage === 'deflected'\) this\.updateEchoCity\(dt\);/);
    assert.doesNotMatch(battle, /playConductorAction\('Fixing_Kneeling'/);
    assert.match(battle, /this\.playConductorAction\('Hit_Chest', true\);/);
  });

  it('the lens opens onto the next world, the HUD leaves the departure, and the night service has an engine', async () => {
    const battle = await source('src/chapters/finalBoss/spectacleBattle.js');
    assert.match(battle, /this\.setPortalWorld\(nextPhase\);/);
    assert.match(battle, /this\.hud\.classList\.add\('is-cinematic'\);/);
    assert.match(battle, /\/\/ locomotive \(x 7\.6 … 13\)/);
    assert.match(battle, /RETURN · \$\{paintReturnDamage/);
    assert.doesNotMatch(battle, /lastPointer < 3\.5/);
  });
});
