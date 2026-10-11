import test from 'node:test';
import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';

import {
  DIFFICULTIES, checkpointLine, createDeathLedger, difficultyPreset,
} from '../../src/chapters/finalBoss/finaleModel.js';
import { ECHO_EXCHANGES, ECHO_VOICE_URLS } from '../../src/chapters/finalBoss/echoExchanges.js';

// Round 12: the Conductor is fought as set pieces (setPieces/*.js, tested in
// round12*.test.mjs). This file keeps what they share.

// --------------------------------------------------------------- Movement III
// Round 12: the argument is fought in Movement III's two set pieces
// (setPieces/falseClaims.js and standoff.js). The exchanges' content still
// has to hold.

test('every exchange offers exactly two voiced answers and one holds both truths', async () => {
  assert.ok(ECHO_EXCHANGES.length >= 4, 'enough exchanges to carry Movement III (200 → 100 HP)');
  const positions = new Set();
  for (const exchange of ECHO_EXCHANGES) {
    assert.equal(exchange.replies.length, 2, exchange.id);
    assert.equal(exchange.replies.filter((reply) => reply.holdsBoth).length, 1, exchange.id);
    positions.add(exchange.replies.findIndex((reply) => reply.holdsBoth));
    exchange.replies.filter((reply) => !reply.holdsBoth).forEach((reply) => assert.ok(reply.rebut?.url, `${exchange.id} deflection is voiced`));
    assert.equal(exchange.claim.speaker, 'CONDUCTOR');
  }
  assert.equal(positions.size, 2, 'the true answer is not always the same key');
  await Promise.all(ECHO_VOICE_URLS.map((url) => access(new URL(`../../public${url}`, import.meta.url))));
});

test('Movement III: the true answer is not given away by its length, and the argument reads in order (A4-8)', async () => {
  const { readFile } = await import('node:fs/promises');
  const manifest = JSON.parse(await readFile(new URL('../../public/assets/chapter03-3d/voice/ch03/manifest.json', import.meta.url), 'utf8'));
  const spoken = new Map(manifest.lines.map((entry) => [entry.url.replace(/^\./, ''), entry.text]));
  let rightLonger = 0;
  for (const exchange of ECHO_EXCHANGES) {
    const right = exchange.replies.find((reply) => reply.holdsBoth).cue.text.length;
    const wrong = exchange.replies.find((reply) => !reply.holdsBoth).cue.text.length;
    if (right > wrong) rightLonger += 1;
    assert.ok(Math.max(right, wrong) / Math.min(right, wrong) < 1.5, `${exchange.id}: answers of a similar length`);
  }
  assert.ok(rightLonger <= 3, 'the longer answer is not always the right one');
  const claims = new Set(ECHO_EXCHANGES.map((exchange) => exchange.claim.text));
  for (const exchange of ECHO_EXCHANGES) {
    for (const reply of exchange.replies) {
      if (reply.rebut) assert.ok(!claims.has(reply.rebut.text), `${exchange.id}: a rebuttal is never also an opening claim`);
      for (const cue of [reply.cue, reply.rebut].filter(Boolean)) {
        // A two-recording answer: each part is what is heard, and the
        // subtitle is the parts in order.
        const parts = cue.parts ?? [cue];
        for (const part of parts) assert.equal(spoken.get(part.url), part.text, `${part.url}: the subtitle is what is heard`);
        assert.equal(cue.text, parts.map((part) => part.text).join(' '), `${exchange.id}: the subtitle is every recording, in order`);
      }
    }
    assert.equal(spoken.get(exchange.claim.url), exchange.claim.text, exchange.id);
  }
  assert.match(ECHO_EXCHANGES[0].claim.text, /^Official inquiry\?/, 'he opens the argument');
});

// ------------------------------------------------------------------- shared

test('STORY is offered after the third death in one movement, once', () => {
  const ledger = createDeathLedger();
  assert.equal(ledger.record(1).offerStory, false);
  assert.equal(ledger.record(1).offerStory, false);
  assert.equal(ledger.record(2).offerStory, false, 'deaths are counted per movement');
  const third = ledger.record(1);
  assert.deepEqual([third.deaths, third.offerStory], [3, true]);
  assert.equal(ledger.record(1).offerStory, false, 'offered once');
  const onStory = createDeathLedger();
  [0, 0, 0].forEach(() => assert.equal(onStory.record(0, 'story').offerStory, false));
});

test('STORY and NORMAL play the same set pieces; STORY is slower, kinder and undoes nothing', () => {
  const story = difficultyPreset('story');
  const normal = difficultyPreset('normal');
  assert.equal(difficultyPreset('nonsense'), normal, 'NORMAL is the default');
  assert.deepEqual(Object.keys(DIFFICULTIES).sort(), ['normal', 'story']);
  assert.ok(story.layers > normal.layers);
  assert.ok(story.pace < normal.pace, 'slower');
  assert.ok(story.teleScale > normal.teleScale, 'longer warnings');
  assert.ok(story.windowScale > normal.windowScale, 'wider timing windows');
  assert.ok(story.hurtScale < normal.hurtScale, 'a smaller hurt box');
  assert.ok(story.respawnInv > normal.respawnInv);
  assert.equal(story.thin, true);
  assert.equal(normal.thin, false);
  assert.equal(story.rollback, 'none');
  assert.equal(normal.rollback, 'segment');
});

test('the death card says what a torn last layer cost, in one line', () => {
  assert.equal(checkpointLine({ rollback: 'segment', phaseName: 'THE LUGGAGE' }), 'This stretch starts again: THE LUGGAGE. What you won before it stays won.');
  assert.equal(checkpointLine({ rollback: 'phase' }), checkpointLine({ rollback: 'segment' }), 'the round-11 name reads the same');
  assert.match(checkpointLine({ rollback: 'none' }), /Nothing is undone\.$/);
});
