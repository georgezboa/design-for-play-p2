// Round 11 · what all four movements keep: three escalating phases each,
// a beat of warning before anything can touch Butch (longer on STORY),
// STORY thinner and slower, and a phase checkpoint after a torn last layer.
import test from 'node:test';
import assert from 'node:assert/strict';

import { FIGHT_BOUNDS, createFightRunner, timeToHit } from '../../src/chapters/finalBoss/conductorFight.js';
import { createDeathLedger } from '../../src/chapters/finalBoss/finaleModel.js';
import { LOST_PHASES, createLostPropertyFight } from '../../src/chapters/finalBoss/movements/lostProperty.js';
import { BELL_PHASES, createBellFight } from '../../src/chapters/finalBoss/movements/onTheBell.js';
import { ECHO_PHASES, createEchoFight } from '../../src/chapters/finalBoss/movements/echoCity.js';
import { PAINT_PHASES, createPaintFight } from '../../src/chapters/finalBoss/movements/paintedCountry.js';
import { createFightBot, simulateMovement } from '../../src/chapters/finalBoss/fightBot.js';
import { harness } from './round11Harness.mjs';

const FIGHTS = [createLostPropertyFight, createBellFight, createEchoFight, createPaintFight];
const PHASE_LISTS = [LOST_PHASES, BELL_PHASES, ECHO_PHASES, PAINT_PHASES];

// ------------------------------------------------------------ all four

test('every movement is three escalating phases, from its full ticket down to its floor', () => {
  PHASE_LISTS.forEach((phases, m) => {
    assert.equal(phases.length, 3, `movement ${m + 1}`);
    assert.equal(phases[0].from, 100);
    assert.equal(phases.at(-1).to, m === 3 ? 12 : 0, 'IV ends where the night service arrives');
    phases.forEach((phase, i) => {
      assert.ok(phase.name && phase.name === phase.name.toUpperCase(), phase.id);
      if (i) assert.equal(phase.from, phases[i - 1].to);
      assert.ok(phase.from - phase.to >= 25, `${phase.id}: a real phase`);
    });
  });
});

// Every hit-capable attack is announced, and nothing can touch Butch less
// than ~half a second after it appears (a beat of warning); on STORY more.
test('fairness: every attack warns before it can touch Butch, longer on STORY, and only inside the arena', () => {
  for (const difficulty of ['normal', 'story']) {
    FIGHTS.forEach((make, m) => {
      let soonest = Infinity;
      let outside = 0;
      let unannounced = 0;
      const announced = new Set();
      simulateMovement({
        makeRunner: () => createFightRunner({ director: make({ difficulty, seed: 5 + m }), difficulty, movement: m, ledger: createDeathLedger() }),
        bot: createFightBot({ skill: 'competent', seed: 9 }),
        maxSeconds: 260,
        onEvent: (e, r) => {
          if (e.type === 'telegraph') {
            const a = e.attack;
            announced.add(a.id);
            if (a.proxy || a.harmless) return;
            const t = timeToHit(a, r.body.x, r.body.z, 0);
            if (Number.isFinite(t)) soonest = Math.min(soonest, t);
            if (a.kind === 'drop' && (a.x < FIGHT_BOUNDS.minX || a.x > FIGHT_BOUNDS.maxX || a.z < FIGHT_BOUNDS.minZ || a.z > FIGHT_BOUNDS.maxZ)) outside += 1;
          }
          if (e.type === 'hit' && e.attack && !announced.has(e.attack.id)) unannounced += 1;
        },
      });
      const floor = difficulty === 'story' ? 0.6 : 0.44;
      assert.ok(soonest >= floor, `M${m + 1} ${difficulty}: the soonest an attack could touch a standing Butch was ${soonest.toFixed(2)} s`);
      assert.equal(outside, 0, `M${m + 1}: nothing lands off the floor`);
      assert.equal(unannounced, 0, `M${m + 1}: every hit was telegraphed`);
    });
  }
});

test('STORY thins the patterns (fewer attacks a minute) and stretches the warnings', () => {
  FIGHTS.forEach((make, m) => {
    const sample = (difficulty) => {
      const h = harness(make, { difficulty, seed: 4 });
      h.director.skipTeach?.();
      const tel = h.step(40).filter((e) => e.type === 'telegraph' && !e.attack.proxy && !e.attack.harmless).map((e) => e.attack);
      return { count: tel.length, tele: tel.reduce((s, a) => s + a.tele, 0) / Math.max(1, tel.length) };
    };
    const normal = sample('normal');
    const story = sample('story');
    assert.ok(story.count <= normal.count, `M${m + 1}: STORY ${story.count} vs NORMAL ${normal.count}`);
    assert.ok(story.tele >= normal.tele - 1e-9, `M${m + 1}: warnings ${story.tele.toFixed(2)} vs ${normal.tele.toFixed(2)}`);
  });
});

test('a checkpoint restarts the phase on NORMAL and keeps the ticket on STORY, and stands Butch somewhere safe', () => {
  FIGHTS.forEach((make, m) => {
    for (const [difficulty, rollback] of [['normal', 'phase'], ['story', 'none']]) {
      const h = harness(make, { difficulty, seed: 6 });
      h.director.skipTeach?.();
      h.step(1);
      const from = h.director.track.phase.from;
      h.director.damage(8);
      const before = h.director.track.hp;
      h.step(0.1);
      const spot = h.director.checkpoint(rollback, h.body);
      assert.equal(h.director.track.hp, rollback === 'phase' ? from : before, `M${m + 1} ${difficulty}`);
      assert.ok(spot.x >= FIGHT_BOUNDS.minX && spot.x <= FIGHT_BOUNDS.maxX && spot.z >= FIGHT_BOUNDS.minZ && spot.z <= FIGHT_BOUNDS.maxZ);
      assert.equal(h.director.attacks.length, 0, 'the floor is cleared');
      assert.equal(h.director.state, 'fight', 'back into the phase loop (its lesson stays learned)');
    }
  });
});

