// Round 12 · Movement III: the QA bots fight FALSE CLAIMS and THE STANDOFF on NORMAL and STORY. A
// skilled player and a weaker first-timer both win it, within its time
// budget; STORY almost never costs a stretch; and past the teaching stretch
// nobody at the controls wins anything.
import test from 'node:test';
import assert from 'node:assert/strict';

import { botRun, describeRun, idleRun } from './round12SimHarness.mjs';

const PIECES = [
  { id: 'false-claims', budget: { normal: 150, story: 150 }, seeds: [1, 2, 3] },
  { id: 'standoff', budget: { normal: 180, story: 150 }, seeds: [1, 2, 3] },
];

for (const { id, budget, seeds } of PIECES) {
  for (const difficulty of ['normal', 'story']) {
    for (const skill of ['skilled', 'weaker']) {
      test(`${id} · ${difficulty} · ${skill}: won within ${budget[difficulty]} s`, () => {
        for (const seed of seeds) {
          const r = botRun(id, { difficulty, skill, seed });
          assert.ok(r.finished, `seed ${seed}: ${describeRun(r)}`);
          assert.ok(r.time <= budget[difficulty], `seed ${seed}: ${describeRun(r)}`);
          if (difficulty === 'story') assert.ok(r.deaths <= 1, `STORY is kind · seed ${seed}: ${describeRun(r)}`);
        }
      });
    }
  }
  test(`${id}: past the teaching stretch, a player who does nothing is hurt and wins nothing`, () => {
    const r = idleRun(id);
    assert.ok(r.hurt >= 1, `hurt ${r.hurt}`);
    assert.equal(r.finished, false);
  });
}
