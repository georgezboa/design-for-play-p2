import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  ENTRY_WING, TELEGRAPH, stepTelegraph, statueCanDamage, wingThreatTuning,
} from '../../src/chapters/museum/labyrinth/labyrinthEncounterRules.js';
import { TUNING } from '../../src/chapters/museum/labyrinth/labyrinthData.js';

const scene = readFileSync(new URL('../../src/chapters/museum/labyrinth/LabyrinthScene.js', import.meta.url), 'utf8');

// Drive stepTelegraph through a scripted sequence of frames and record, for
// every frame on which the hunter could land a hit, how long the red marker
// had been continuously on screen.
function simulate(frames, telegraphMs) {
  let t = null;
  let markerSince = null;
  const hitWindows = [];
  for (const f of frames) {
    t = stepTelegraph(t, { hunting: true, seen: f.seen, distance: f.distance, now: f.now, telegraphMs });
    if (t.warning) markerSince ??= f.now;
    else markerSince = null;
    const canHit = statueCanDamage({
      isPrimaryHunter: true,
      state: f.seen ? 'frozen' : 'hunting',
      now: f.now,
      telegraphReady: t.ready,
    });
    if (canHit) hitWindows.push(f.now - markerSince);
  }
  return hitWindows;
}

for (const [label, telegraphMs] of [['later wings', TELEGRAPH.telegraphMs], ['Entry Hall', TELEGRAPH.entryTelegraphMs]]) {
  test(`R3-2 (${label}): a statue held in view cannot spend its telegraph off screen`, () => {
    const frames = [];
    let now = 0;
    // Three seconds frozen in the player's gaze, close by.
    for (; now < 3000; now += 16) frames.push({ now, seen: true, distance: 60 });
    // The player turns away with the statue already at arm's length.
    for (const end = now + 2500; now < end; now += 16) frames.push({ now, seen: false, distance: 30 });
    const windows = simulate(frames, telegraphMs);
    assert.ok(windows.length > 0, 'it can still hit eventually');
    assert.ok(Math.min(...windows) >= telegraphMs, `first hit after ${Math.min(...windows)} ms of marker`);
  });

  test(`R3-2 (${label}): glancing back restarts the clock, also on slow 250 ms frames`, () => {
    const frames = [];
    let now = 0;
    const pattern = [false, false, true, false, false, false, true, false, false, false, false, false, false, false, false];
    for (const seen of pattern) {
      frames.push({ now, seen, distance: 120 });
      now += 250;
    }
    const windows = simulate(frames, telegraphMs);
    assert.ok(windows.length > 0);
    assert.ok(windows.every((w) => w >= telegraphMs));
  });
}

test('R3-2: at least 0.9 s of marker; nothing shown or counted while the statue is in view', () => {
  assert.ok(TELEGRAPH.telegraphMs >= 900);
  const t = stepTelegraph(null, { hunting: true, seen: true, distance: 50, now: 0 });
  assert.deepEqual([t.warnedAt, t.warning, t.ready], [null, false, false]);
  // A hit clears every statue's telegraph, so a relocated hunter re-announces.
  assert.match(scene, /statue\.telegraph = null;/);
});

test('R3-2: the Entry Hall is gentler again in round 2', () => {
  const entry = wingThreatTuning(ENTRY_WING.id);
  assert.ok(entry.speedScale <= 0.7);
  assert.ok(entry.activationScale <= 0.65);
  assert.ok(entry.reliefScale > 1);
  assert.equal(wingThreatTuning(1).reliefScale, 1);
  assert.ok(TUNING.statueSpeed * entry.speedScale < TUNING.playerSpeed * 0.45);
  assert.match(scene, /hunterReliefAfterHitMs \* wingThreatTuning\(this\.currentWingId\)\.reliefScale/);
});
