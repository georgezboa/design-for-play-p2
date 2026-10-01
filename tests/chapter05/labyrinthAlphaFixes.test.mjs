// Alpha round 1 fixes in the Labyrinth (A3-6 and the difficulty notes):
// path-distance key readout, a backing plate under the HUD, statues that
// announce themselves before a hit from outside the gaze, a gentler Entry Hall.

import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { arrowFor, nearestByPath } from '../../src/chapters/museum/labyrinth/labyrinthRules.js';
import {
  ENTRY_WING, TELEGRAPH, statueCanDamage, stepTelegraph, wingThreatTuning,
} from '../../src/chapters/museum/labyrinth/labyrinthEncounterRules.js';
import { CELL, TUNING } from '../../src/chapters/museum/labyrinth/labyrinthData.js';
import { buildLayout, bfs, worldToCell } from '../../src/chapters/museum/labyrinth/mazeGenerator.js';

const scene = fs.readFileSync(new URL('../../src/chapters/museum/labyrinth/LabyrinthScene.js', import.meta.url), 'utf8');

// A tiny maze: the key is two cells east of Butch in a straight line, but a
// wall sits between, so the walk goes down, along and back up: 6 paces.
//   S # K
//   . # .
//   . . .
const tiny = [
  [false, true, false],
  [false, true, false],
  [false, false, false],
];

test('A3-6: the key readout counts walking distance, not a line through the wall', () => {
  const key = { x: 2 * CELL + CELL / 2, y: CELL / 2, cell: { x: 2, y: 0 } };
  const r = nearestByPath(tiny, { x: 0, y: 0 }, [key], { lookAhead: 1 });
  assert.equal(r.paces, 6);
  assert.equal(r.arrow, '↓', 'the way to walk first, not → through stone');
  assert.equal(arrowFor(1, 0), '→');
  assert.equal(arrowFor(0, -1), '↑');
  // Unreachable targets are skipped.
  const sealed = [[false, true, false]];
  assert.equal(nearestByPath(sealed, { x: 0, y: 0 }, [{ x: 0, y: 0, cell: { x: 2, y: 0 } }]), null);
  // The nearer one by walking wins over the nearer one as the crow flies.
  const far = { x: 0, y: 0, cell: { x: 0, y: 2 } };
  assert.equal(nearestByPath(tiny, { x: 0, y: 0 }, [key, far]).target, far);
});

test('A3-6: on a real maze the readout equals the BFS walk to the nearest key', () => {
  const layout = buildLayout(() => 0.42);
  const start = worldToCell(layout.spawn?.x ?? layout.keys[0].x, layout.spawn?.y ?? layout.keys[0].y);
  const keys = layout.keys.filter((k) => k.wing === 0);
  const r = nearestByPath(layout.walls, start, keys);
  const result = bfs(layout.walls, start);
  const best = Math.min(...keys.map((k) => result.dist[k.cell.y * result.w + k.cell.x]).filter((d) => d >= 0));
  assert.equal(r.paces, Math.max(1, best));
  assert.match(scene, /nearestByPath\(this\.layout\.walls, here, targets\)/);
  assert.doesNotMatch(scene, /Math\.round\(nearestD \/ CELL\)/, 'no straight-line paces left');
});

test('A3-6: the HUD has a plate behind it, so the spawn torches cannot wash it out', () => {
  assert.match(scene, /this\.hudPlate = this\.add\.graphics\(\)/);
  assert.match(scene, /hud\.add\(\[this\.threatG, this\.hudPlate, this\.livesText/);
  assert.match(scene, /fillRoundedRect\(6, 6, width, 84, 4\)/);
});

test('a hunter from outside the gaze warns before it can hit', () => {
  let t = stepTelegraph(null, { hunting: true, seen: false, distance: 900, now: 0 });
  assert.deepEqual([t.warning, t.ready], [false, false], 'far away: nothing yet');
  t = stepTelegraph(t, { hunting: true, seen: false, distance: TELEGRAPH.clearRadius - 10, now: 100 });
  assert.equal(t.warning, false, 'warning starts inside warnRadius');
  t = stepTelegraph(t, { hunting: true, seen: false, distance: TELEGRAPH.warnRadius - 1, now: 200 });
  assert.equal(t.started, true);
  assert.equal(t.warning, true, 'unseen and close: sound + edge marker');
  assert.equal(t.ready, false);
  assert.equal(statueCanDamage({ isPrimaryHunter: true, state: 'hunting', now: 300, telegraphReady: t.ready }), false);
  t = stepTelegraph(t, { hunting: true, seen: false, distance: 40, now: 200 + TELEGRAPH.telegraphMs });
  assert.equal(t.ready, true);
  assert.equal(statueCanDamage({ isPrimaryHunter: true, state: 'hunting', now: 2000, telegraphReady: t.ready }), true);
  // Looked at: no marker (it is in view), and the warning re-arms (round 2,
  // R3-2), so turning away again shows the marker for the full telegraph.
  const seen = stepTelegraph(t, { hunting: true, seen: true, distance: 40, now: 2100 });
  assert.equal(seen.warning, false);
  assert.equal(seen.ready, false);
  // Losing it resets the warning.
  const lost = stepTelegraph(t, { hunting: false, seen: false, distance: 40, now: 2200 });
  assert.equal(lost.warnedAt, null);
  // At hunting speed the warning radius alone gives more than a second.
  assert.ok(TELEGRAPH.warnRadius / (TUNING.statueSpeed * 1000) > 1.5);
  assert.match(scene, /telegraphReady: statue\.telegraph\.ready/);
  assert.match(scene, /labyrinthCues\.statueNear\(\)/);
  assert.match(scene, /this\.drawThreatMarkers\(warnings, time\)/);
});

test('the Entry Hall is gentler: slower, later-waking statues and a longer warning', () => {
  const entry = wingThreatTuning(0);
  const later = wingThreatTuning(1);
  assert.equal(ENTRY_WING.id, 0);
  assert.ok(entry.speedScale < later.speedScale);
  assert.ok(entry.activationScale < later.activationScale);
  assert.ok(entry.telegraphMs > later.telegraphMs);
  assert.ok(TUNING.statueSpeed * entry.speedScale < TUNING.playerSpeed * 0.6, 'easily outrun in the first wing');
  assert.match(scene, /speedScale: threat\.speedScale/);
});
