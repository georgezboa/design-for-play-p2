// The Labyrinth's release-pass rules (src/chapters/museum/labyrinth/labyrinthRules.js):
// aim-to-face, the drawn vision cone, fog of war on the survey map, the cost
// of a game over, and the guarded restart.

import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { CELL, STRINGS, TUNING } from '../../src/chapters/museum/labyrinth/labyrinthData.js';
import {
  RESTART_HOLD_MS, inFacingCone, keysLostOnGameOver, markSeen, pacesLabel, resolveFacing,
  restartHoldPhase, seenAt, visionConePoints,
} from '../../src/chapters/museum/labyrinth/labyrinthRules.js';
import { buildLayout } from '../../src/chapters/museum/labyrinth/mazeGenerator.js';

const scene = fs.readFileSync(new URL('../../src/chapters/museum/labyrinth/LabyrinthScene.js', import.meta.url), 'utf8');

test('one pace is a PACE; everything else is PACES', () => {
  assert.equal(pacesLabel(1), '1 PACE');
  assert.equal(pacesLabel(2), '2 PACES');
  assert.equal(pacesLabel(12), '12 PACES');
  assert.doesNotMatch(scene, /\$\{paces\} PACES/);
});

test('the mouse aims Butch\'s gaze: he can walk toward one statue while watching another', () => {
  const player = { x: 500, y: 500 };
  const walkingEast = { x: 1, y: 0 };
  const aimNorth = { x: 500, y: 200 };
  const facing = resolveFacing({ facing: { x: 1, y: 0 }, move: walkingEast, aim: aimNorth, player });
  assert.deepEqual(facing, { x: 0, y: -1 });
  const statueNorth = { x: 500, y: 300 };
  const statueEast = { x: 800, y: 500 };
  assert.equal(inFacingCone(player, facing, statueNorth), true, 'the watched statue is in the cone');
  assert.equal(inFacingCone(player, facing, statueEast), false, 'walking east does not look east');
});

test('keyboard-only: Butch faces where he walks, and Q holds his gaze while he backs away', () => {
  const player = { x: 0, y: 0 };
  const faced = resolveFacing({ facing: { x: 0, y: -1 }, move: { x: 0, y: 1 }, player });
  assert.deepEqual(faced, { x: 0, y: 1 });
  const held = resolveFacing({ facing: { x: 0, y: -1 }, move: { x: 0, y: 1 }, player, hold: true });
  assert.deepEqual(held, { x: 0, y: -1 }, 'backing south while still watching north');
  // standing still keeps the last facing; an aim right on top of Butch too
  assert.deepEqual(resolveFacing({ facing: { x: 1, y: 0 }, move: { x: 0, y: 0 }, player }), { x: 1, y: 0 });
  assert.deepEqual(resolveFacing({ facing: { x: 1, y: 0 }, move: { x: 0, y: 0 }, aim: { x: 3, y: 2 }, player }), { x: 1, y: 0 });
});

test('the drawn cone is the statues\' cone: its half-angle and range, stopped by walls', () => {
  const size = 11;
  const walls = Array.from({ length: size }, () => new Array(size).fill(false));
  for (let y = 0; y < size; y += 1) walls[y][7] = true; // a wall two cells east
  const player = { x: 5 * CELL + CELL / 2, y: 5 * CELL + CELL / 2 };
  const pts = visionConePoints(walls, player, { x: 1, y: 0 }, { range: TUNING.visionRange });
  assert.equal(pts.length, 28);
  const far = Math.max(...pts.slice(1).map((p) => p.x - player.x));
  assert.ok(far <= 2 * CELL, `rays stop at the wall (${far})`);
  const open = visionConePoints(Array.from({ length: size }, () => new Array(size).fill(false)), player, { x: 1, y: 0 }, { range: 200 });
  const ends = open.slice(1).map((p) => Math.round(Math.hypot(p.x - player.x, p.y - player.y)));
  assert.ok(ends.every((d) => d <= 200));
  const edge = open[1];
  const angle = Math.abs(Math.atan2(edge.y - player.y, edge.x - player.x) * 180 / Math.PI);
  assert.ok(Math.abs(angle - TUNING.visionConeDeg) < 0.5, `edge at ${angle}°`);
  assert.match(scene, /drawVisionCone\(time\)/);
  assert.match(scene, /0xe0b27a/, 'sepia 1978 glass');
});

test('fog of war: the survey only marks what Butch\'s light has touched', () => {
  const layout = buildLayout(() => 0.5);
  const seen = new Set();
  const start = layout.spawn;
  markSeen(seen, start, TUNING.flashlightRadius);
  assert.ok(seen.size > 0);
  assert.ok(seenAt(seen, start.x, start.y));
  const farKeys = layout.keys.filter((k) => Math.hypot(k.x - start.x, k.y - start.y) > TUNING.flashlightRadius + CELL);
  assert.ok(farKeys.length >= 6);
  assert.ok(farKeys.every((k) => !seenAt(seen, k.x, k.y)), 'unseen keys stay off the map');
  assert.ok(!seenAt(seen, layout.exit.x, layout.exit.y), 'so does the exit');
  assert.match(scene, /if \(!seenAt\(this\.seenCells, k\.x, k\.y\)\) continue;/);
  assert.match(scene, /allKeys && exitSeen/);
  // the maze itself starts blank and is painted in cell by cell
  const painted = [];
  const again = new Set();
  markSeen(again, start, TUNING.flashlightRadius, (x, y) => painted.push(`${x},${y}`));
  assert.deepEqual(painted.sort(), [...again].sort());
  markSeen(again, start, TUNING.flashlightRadius, () => assert.fail('a seen cell is painted once'));
  assert.match(scene, /mm\.wallsBake\.fill\(MINIMAP_FOG, 1\);/);
  assert.match(scene, /this\.seenByFloor = \[new Set\(\), new Set\(\)\];/, 'each floor is surveyed on its own');
});

test('a game over costs the keys found in the current wing, and only those', () => {
  const keys = [
    { wing: 0, collected: true }, { wing: 0, collected: true },
    { wing: 1, collected: true }, { wing: 1, collected: false },
    { wing: 2, collected: false },
  ];
  assert.deepEqual(keysLostOnGameOver(keys, 1), [keys[2]]);
  assert.deepEqual(keysLostOnGameOver(keys, 0), [keys[0], keys[1]]);
  assert.match(STRINGS.gameOverSub(2), /TAKES BACK 2 KEYS FROM THIS WING/);
  assert.match(STRINGS.gameOverSub(1), /TAKES BACK 1 KEY FROM/);
  assert.doesNotMatch(STRINGS.gameOverSub(0), /TAKES BACK/);
  assert.match(scene, /keysLostOnGameOver\(this\.layout\.keys, this\.currentWingId\)/);
  assert.match(scene, /this\.player\.keysCollected = Math\.max\(0, this\.player\.keysCollected - lost\.length\)/);
});

test('R never wipes a run by accident: game over, or a 1.5 s hold and a confirm', () => {
  assert.equal(RESTART_HOLD_MS, 1500);
  assert.deepEqual(restartHoldPhase(0), { phase: 'idle', progress: 0 });
  assert.equal(restartHoldPhase(700).phase, 'holding');
  assert.equal(restartHoldPhase(1499).phase, 'holding');
  assert.equal(restartHoldPhase(1500).phase, 'confirm');
  assert.match(scene, /if \(!event\.repeat && this\.state === 'over'\) this\.restartCurrentWing\(\)/);
  assert.doesNotMatch(scene, /else this\.startRun\(\);\n\s*\}\);/, 'no instant rebuild on R');
  assert.match(scene, /keydown-Y[\s\S]{0,80}confirm-restart[\s\S]{0,40}this\.startRun\(\)/);
  assert.match(STRINGS.restartConfirmSub, /\[Y\] REBUILD/);
});

test('Shift is the shield, Space does nothing, and the HUD names every key including E', () => {
  assert.match(STRINGS.controls, /SHIFT SHIELD/);
  assert.match(STRINGS.controls, /E USE/);
  assert.match(STRINGS.controls, /MOUSE AIM/);
  assert.match(STRINGS.controls, /HOLD R RESTART/);
  assert.doesNotMatch(STRINGS.controls, /SPACE/);
  assert.match(STRINGS.shieldFirstFoundNote, /PRESS SHIFT/);
  assert.match(STRINGS.shieldTutorialPrompt, /\[SHIFT\]/);
  assert.match(scene, /keydown-SHIFT/);
  assert.doesNotMatch(scene, /keydown-SPACE/);
});
