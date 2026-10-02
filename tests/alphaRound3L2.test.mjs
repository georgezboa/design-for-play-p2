// Alpha round 3 follow-ups (L2): Chapter 4's pencil for the flat fills and the
// studio's walk, the Labyrinth HUD, the Black Ticket on its rail, and the
// true ending's platform panel.

import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { blockEdgeRuns, draftBlockEdges, shadePit } from '../src/chapters/paintedCountry/art/pencilEdges.js';
import { GREY_HATCH, CELL_STAMP } from '../src/chapters/paintedCountry/art/cellArt.js';
import { BOSS_EDGE_MARGIN, BOSS_RAIL_DROP, H, NEAR_RAIL, W, nearRailY } from '../src/chapters/blackKnifeFinal/constants.js';
import { CONDUCTOR_SHEETS, SHEET_PAD } from '../src/chapters/blackKnifeFinal/assets.js';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const key = (c, r, cols) => r * cols + c;

// A Graphics stand-in that records calls.
function recorder() {
  const calls = [];
  const g = new Proxy({}, { get: (_, name) => (...args) => { calls.push([name, ...args]); return g; } });
  return { g, calls };
}

test('R6: a grey block is outlined as four merged runs, not one per cell', () => {
  const cols = 10;
  const cells = [];
  for (let c = 2; c < 5; c += 1) for (let r = 1; r < 6; r += 1) cells.push(key(c, r, cols));
  const runs = blockEdgeRuns(new Set(cells), cols);
  assert.equal(runs.length, 4);
  const by = Object.fromEntries(runs.map((run) => [run.side, run]));
  assert.deepEqual(by.top, { x1: 2, y1: 1, x2: 5, y2: 1, side: 'top' });
  assert.deepEqual(by.bottom, { x1: 2, y1: 6, x2: 5, y2: 6, side: 'bottom' });
  assert.deepEqual(by.left, { x1: 2, y1: 1, x2: 2, y2: 6, side: 'left' });
  assert.deepEqual(by.right, { x1: 5, y1: 1, x2: 5, y2: 6, side: 'right' });
});

test('R6: a washed notch splits the edge it opens and outlines the notch itself', () => {
  const cols = 10;
  const cells = new Set();
  for (let c = 0; c < 3; c += 1) for (let r = 0; r < 3; r += 1) cells.add(key(c, r, cols));
  cells.delete(key(1, 0, cols)); // a cell washed out of the top edge
  const runs = blockEdgeRuns(cells, cols);
  const tops = runs.filter((r) => r.side === 'top').map((r) => [r.x1, r.y1, r.x2]);
  assert.deepEqual(tops.sort(), [[0, 0, 1], [1, 1, 2], [2, 0, 3]].sort());
  assert.equal(runs.filter((r) => r.side === 'left').length, 2, 'the outer left edge and the notch\'s right wall');
  assert.equal(blockEdgeRuns(new Set(), cols).length, 0);
});

test('R6: the edges and the pit are drafted in graphite on the Graphics', () => {
  const { g, calls } = recorder();
  const n = draftBlockEdges(g, new Set([key(1, 1, 8)]), 8, 20);
  assert.equal(n, 4);
  assert.equal(calls[0][0], 'clear', 'redrawn from scratch with the stamps');
  assert.ok(calls.filter(([name]) => name === 'strokePath').length >= 4);
  const pit = recorder();
  shadePit(pit.g, 400, 440, 200, 160);
  assert.ok(pit.calls.filter(([name]) => name === 'strokePath').length > 20, 'hatched lip shadow, torn underside and depth strokes');
  assert.ok(pit.calls.some(([name]) => name === 'fillRect'), 'the paper tooth');
});

test('R6: the grey coat is hatched on a period that tiles across cells', () => {
  assert.equal(CELL_STAMP.cell % GREY_HATCH, 0);
  assert.equal(CELL_STAMP.cell % (GREY_HATCH * 2), 0);
  const gallery = read('src/chapters/paintedCountry/PaintedCountryScene.js');
  const line = read('src/chapters/paintedCountry/PaintedLineScene.js');
  assert.match(gallery, /draftBlockEdges\(this\.blockEdges, this\.car\.state\.blocks, GRID\.w, CELL\)/);
  assert.match(gallery, /shadePit\(h, hole\.x, FLOOR_Y/);
  assert.match(line, /draftBlockEdges\(this\.blockEdges, this\.line\.state\.blocks, LINE\.cols, CELL\)/);
  assert.match(line, /shadePit\(g, x, TRACK_Y/);
});

test('Ch4 studio: Butch walks inside an inset range, so he never stands half out of frame', () => {
  const studio = read('src/chapters/paintedCountry/DrawingStudioScene.js');
  assert.match(studio, /export const STUDIO_WALK_INSET = (\d+);/);
  const inset = Number(studio.match(/STUDIO_WALK_INSET = (\d+)/)[1]);
  assert.ok(inset >= 40, 'the figure and its brush are wider than the 18 px body');
  assert.match(studio, /this\.physics\.world\.setBounds\(STUDIO_WALK\.x0, 0, STUDIO_WALK\.x1 - STUDIO_WALK\.x0, WORLD\.h\)/);
  assert.match(studio, /setCollideWorldBounds\(true\)/);
});

test('R7: the Labyrinth HUD type is at least 13 px times TEXT SIZE, and its plate clears the spawn', () => {
  const scene = read('src/chapters/museum/labyrinth/LabyrinthScene.js');
  assert.match(scene, /export const HUD_MIN_PX = 13;/);
  assert.doesNotMatch(scene, /fontSize: '(?:[0-9]|1[0-2])px'/, 'no fixed type under 13 px');
  assert.match(scene, /window\.addEventListener\('nightfall:settings', onSettings\)/);
  assert.match(scene, /setBounds\(-CAMERA_MARGIN\.x, -CAMERA_MARGIN\.y, WORLD_W \+ 2 \* CAMERA_MARGIN\.x, WORLD_H \+ 2 \* CAMERA_MARGIN\.y\)/);
  assert.match(scene, /CAMERA_MARGIN = \{ x: 2 \* CELL, y: 2 \* CELL \}/);
  const page = read('labyrinth.html');
  assert.match(page, /width: min\(100vw, calc\(100vh \* 1\.6\)\)/, 'the 16:10 stage scales up to fill the window');
});

test('Black Ticket: the engine stands on the near rail, clear of the bottom HUD strip, body inside the frame', () => {
  assert.equal(nearRailY(0), NEAR_RAIL.left);
  assert.equal(nearRailY(W), NEAR_RAIL.right);
  // wherever he stations (0.52 W .. the right end), his base plus the idle
  // bob (7) stays above the bottom 36 px where the hint tag and chips sit
  for (const x of [W * 0.52, W * 0.66, W * 0.8, W]) assert.ok(nearRailY(x) + BOSS_RAIL_DROP + 7 <= H - 36, `x=${x}`);
  const idle = CONDUCTOR_SHEETS['conductor-idle'].sheet.frameWidth;
  const bodyHalf = ((idle - SHEET_PAD.left - SHEET_PAD.right) * 0.8) / 2;
  const maxX = W - bodyHalf - BOSS_EDGE_MARGIN;
  assert.ok(maxX + bodyHalf <= W - BOSS_EDGE_MARGIN);
  const boss = read('src/chapters/blackKnifeFinal/entities/Boss.js');
  assert.match(boss, /const max = Math\.min\(aggressive \? W \* 0\.66 : W \* 0\.88, this\.maxX\);/);
  assert.match(boss, /this\.y = Boss\.railY\(this\.x\);/);
  assert.doesNotMatch(boss, /H \+ 4/);
});

test('true ending: Butch stands on Ch1\'s raised platform deck', () => {
  const art = read('src/chapters/finalBoss/finaleArt.js');
  assert.match(art, /import \{ PLATFORM_DY, [^}]*\} from '\.\.\/nightService\/art\/act3Art\.js';/);
  assert.match(art, /h \* \(0\.745 \+ PLATFORM_DY\) - butch\.height \* 0\.62 \+ 6/);
});
