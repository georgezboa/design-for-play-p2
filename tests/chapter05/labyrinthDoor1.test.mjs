// Door 4 (Labyrinth) production-pass regression coverage.
//
// Behavioral wherever the module under test is plain data/math: the maze
// layout, statue pursuit AI, texture slot painters, the formal Chapter 5
// contract, and the real Museum exhibit bridge. Source-level assertions are
// kept to the few integration points that only exist as wiring (entry
// script message posting, Vite inputs, the Phaser scene's state machine).

import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import { LABYRINTH_CHAPTER05_CONTRACT } from '../../src/chapters/museum/labyrinth/chapter05LabyrinthContract.js';
import { CHAPTER05_DIRECTIONS, directionDefinition } from '../../src/chapters/museum3d/directions/directionRegistry.js';
import { Chapter05DirectionProgress } from '../../src/chapters/museum3d/state/chapter05DirectionProgress.js';
import { EmbeddedDirectionExhibit } from '../../src/chapters/museum3d/systems/EmbeddedDirectionExhibit.js';
import { buildLayout } from '../../src/chapters/museum/labyrinth/mazeGenerator.js';
import { StatueNPC, patrolCellsFor } from '../../src/chapters/museum/labyrinth/StatueNPC.js';
import { applyWingEntryRules, choosePrimaryHunterId, statueCanDamage } from '../../src/chapters/museum/labyrinth/labyrinthEncounterRules.js';
import { TEXTURE_SLOTS } from '../../src/chapters/museum/labyrinth/labyrinthAssets.js';
import { CELL, LOCAL_H, LOCAL_W, PAL, STRINGS, TUNING, WINGS } from '../../src/chapters/museum/labyrinth/labyrinthData.js';
import { cloneWalls, MOVING_MAZE_CHANGES_PER_STATE, playerCanReachTargets, reachableCells } from '../../src/chapters/museum/labyrinth/wingMechanics.js';

const read = (path) => fs.readFileSync(new URL(path, import.meta.url), 'utf8');
const labyrinthEntry = read('../../src/chapters/museum/labyrinth/labyrinth-main.js');
const labyrinthScene = read('../../src/chapters/museum/labyrinth/LabyrinthScene.js');
const pauseMenu = read('../../src/shell/pauseMenu.js');
const labyrinthCues = read('../../src/chapters/museum/labyrinth/labyrinthCues.js');
const chaseMusic = read('../../src/chapters/museum/labyrinth/chaseMusic.js');
const museumVite = read('../../vite.museum3d.config.js');
const labyrinthVite = read('../../vite.labyrinth.config.js');

// Records every fill/line color a texture-slot painter touches, so tests can
// assert on what a sprite is actually painted with instead of source text.
function paintColors(slot) {
  const colors = new Set();
  const recorder = new Proxy({}, {
    get: (target, prop) => {
      if (prop === 'fillStyle') return (color) => { if (typeof color === 'number') colors.add(color); };
      if (prop === 'lineStyle') return (width, color) => { if (typeof color === 'number') colors.add(color); };
      return () => {};
    },
  });
  slot.paint(recorder, slot.w, slot.h);
  return colors;
}

function mockSprite(x, y) {
  return {
    x,
    y,
    velocity: { x: 0, y: 0 },
    body: {
      setVelocity(vx, vy) { this.owner.velocity = { x: vx, y: vy }; },
      reset(nx, ny) { this.owner.x = nx; this.owner.y = ny; this.owner.velocity = { x: 0, y: 0 }; },
      owner: null,
    },
  };
}

function makeStatue(walls, spawnCell, spawnPos) {
  const sprite = mockSprite(spawnPos.x, spawnPos.y);
  sprite.body.owner = sprite;
  return new StatueNPC(walls, spawnCell, spawnPos, 0, sprite);
}

test('Door 4 exposes one formal Chapter 5 route, message, and artifact contract', () => {
  assert.equal(LABYRINTH_CHAPTER05_CONTRACT.doorNumber, 4);
  assert.equal(LABYRINTH_CHAPTER05_CONTRACT.artifactLabel, 'Looking Fragment');
  const definition = directionDefinition(CHAPTER05_DIRECTIONS.LABYRINTH);
  assert.equal(definition.src, LABYRINTH_CHAPTER05_CONTRACT.embeddedSrc);
  assert.equal(definition.completeMessage, LABYRINTH_CHAPTER05_CONTRACT.completeMessage);
  assert.equal(definition.exitMessage, LABYRINTH_CHAPTER05_CONTRACT.exitMessage);
  assert.equal(definition.artifactId, LABYRINTH_CHAPTER05_CONTRACT.artifactId);
  assert.equal(definition.title, '4');
  assert.match(labyrinthEntry, /LABYRINTH_CHAPTER05_CONTRACT\.completeMessage/);
  assert.match(labyrinthEntry, /LABYRINTH_CHAPTER05_CONTRACT\.exitMessage/);
  assert.match(museumVite, /LABYRINTH_CHAPTER05_CONTRACT\.entryHtml/);
  assert.match(labyrinthVite, /LABYRINTH_CHAPTER05_CONTRACT\.entryHtml/);
});

test('the embedded Labyrinth pauses on ESC and production starts with all three lives', () => {
  assert.match(labyrinthEntry, /installPauseMenu\(\{ checkpointId: 'chapter-5-start', allowEmbedded: true \}\)/);
  assert.match(pauseMenu, /\(!allowEmbedded && window\.top !== window\)/);
  assert.match(labyrinthEntry, /const qaEnabled = devRoutesEnabled\(\)/);
  assert.match(labyrinthEntry, /params\.has\('qa-lives'\)/);
  assert.match(labyrinthScene, /lives: TUNING\.lives/);
  assert.match(labyrinthScene, /const spawnGraceUntil = this\.time\.now \+ TUNING\.wingEntryGraceMs/);
  assert.match(labyrinthScene, /this\.player\.invulnUntil = spawnGraceUntil/);
});

test('Chapter 3 uses Escape as a quick return to the chapter list', () => {
  const chapter3Entry = read('../../src/car03-3d-main.js');
  assert.match(chapter3Entry, /window\.location\.assign\('\/'\)/);
  assert.match(pauseMenu, /onEscape = null/);
  assert.match(pauseMenu, /if \(onEscape\(\) !== false\) return/);
});

test('Door 4 completion grants the corridor route while the Looking Fragment stays pre-displayed', () => {
  const previousWindow = globalThis.window;
  const parentWindow = {};
  let messageListener = null;
  globalThis.window = {
    location: { origin: 'http://127.0.0.1:5186' },
    addEventListener: (type, listener) => { if (type === 'message') messageListener = listener; },
    removeEventListener: () => {},
  };

  try {
    const classes = new Set();
    const root = {
      classList: {
        add: (name) => classes.add(name),
        remove: (name) => classes.delete(name),
        toggle: (name, enabled) => (enabled ? classes.add(name) : classes.delete(name)),
      },
      setAttribute: () => {},
    };
    const iframe = { contentWindow: parentWindow, dataset: {}, focus: () => {}, src: '' };
    const progress = new Chapter05DirectionProgress();
    const exhibit = new EmbeddedDirectionExhibit({
      root,
      iframe,
      closeButton: { addEventListener: () => {} },
      titleEl: { textContent: '' },
      statusEl: { textContent: '' },
      progress,
    });

    assert.equal(exhibit.open(CHAPTER05_DIRECTIONS.LABYRINTH), true);
    assert.equal(iframe.src, LABYRINTH_CHAPTER05_CONTRACT.embeddedSrc);
    messageListener({
      origin: globalThis.window.location.origin,
      source: parentWindow,
      data: { type: LABYRINTH_CHAPTER05_CONTRACT.completeMessage },
    });

    // V02 leaves the Looking Fragment in its pre-display niche. The complete
    // message closes Door 1 and makes the eight-key gauntlet eligible to start.
    let snapshot = progress.getSnapshot();
    assert.equal(exhibit.opened, false);
    assert.equal(snapshot.carriedArtifact, null);
    assert.equal(snapshot.completed[LABYRINTH_CHAPTER05_CONTRACT.id], true);
    assert.equal(snapshot.artifacts[LABYRINTH_CHAPTER05_CONTRACT.artifactId].displayed, true);
    assert.equal(snapshot.allComplete, true);

    // A finished Door 1 run must not accidentally file any other direction.
    assert.equal(snapshot.completed[CHAPTER05_DIRECTIONS.BORROWED_GRID], false);
    assert.equal(snapshot.completed[CHAPTER05_DIRECTIONS.ECHO_CITY], false);
    assert.equal(snapshot.completed[CHAPTER05_DIRECTIONS.PAINTED_COUNTRY], false);
  } finally {
    globalThis.window = previousWindow;
  }
});

test('the labyrinth stays the full four-wing, eight-key, eight-statue maze', () => {
  assert.deepEqual(WINGS.map((w) => w.name), ['ENTRY HALL', 'RESTORATION WING', 'ARCHIVE DEPTHS', 'THE LAST GALLERY']);
  assert.equal(TUNING.keysTotal, 8);
  assert.equal(TUNING.statueCount, 8);
  assert.equal(TUNING.lives, 3);
  assert.equal(TUNING.maxConcurrentHuntersPerWing, 1);
  assert.ok(TUNING.wingEntryGraceMs >= TUNING.invulnMs);
  assert.ok(TUNING.hunterReliefAfterHitMs > TUNING.invulnMs);

  const layout = buildLayout(() => 0.5);
  assert.equal(layout.keys.length, 8);
  assert.equal(layout.statues.length, 8);
  assert.equal(layout.shields.length, 4);
  assert.equal(layout.wings.length, 4);
  assert.deepEqual(layout.gates.map((gate) => gate.requiredKeys), [1, 3, 5]);
  assert.ok(layout.gates.every((gate) => gate.locked));

  // Spawn sits inside wing 0; the exit sits inside the last wing.
  const inWing = (point, wing) =>
    point.x >= wing.bounds.x0 && point.x <= wing.bounds.x1
    && point.y >= wing.bounds.y0 && point.y <= wing.bounds.y1;
  assert.ok(inWing(layout.spawn, layout.wings[0]));
  assert.ok(inWing(layout.exit, layout.wings[3]));
});

test('a full loss returns to the current wing entrance without erasing route progress', () => {
  const layout = buildLayout(() => 0.5);
  assert.equal(layout.wingStarts.length, 4);
  for (const start of layout.wingStarts) {
    assert.equal(layout.floorWalls[start.floor][start.cell.y][start.cell.x], false);
  }
  assert.match(labyrinthScene, /restartCurrentWing\(\)/);
  assert.match(labyrinthScene, /this\.layout\.wingStarts\[wingId\]/);
  assert.match(labyrinthScene, /this\.player\.lives = TUNING\.lives/);
  assert.match(labyrinthScene, /if \(statue\.wing === wingId\) statue\.resetToSpawn\(\)/);
  assert.equal(STRINGS.gameOverSub, "RETURN TO THIS WING'S ENTRANCE   ·   [R] CONTINUE");
});

test('a statue freezes under the player gaze and hunts once unseen', () => {
  const size = 19;
  const walls = Array.from({ length: size }, () => new Array(size).fill(false));
  const spawnCell = { x: 9, y: 3 };
  const spawnPos = { x: 9 * CELL + CELL / 2, y: 3 * CELL + CELL / 2 };
  const statue = makeStatue(walls, spawnCell, spawnPos);

  const playerPos = { x: 9 * CELL + CELL / 2, y: 8 * CELL + CELL / 2 };

  // Player directly below the statue, looking up at it: frozen, no velocity.
  statue.update(0, { ...playerPos, facing: { x: 0, y: -1 } });
  assert.equal(statue.state, 'frozen');
  assert.deepEqual(statue.sprite.velocity, { x: 0, y: 0 });

  // Same positions, player looking away: it hunts and picks up velocity.
  statue.update(TUNING.repathMs + 1, { ...playerPos, facing: { x: 0, y: 1 } });
  assert.equal(statue.state, 'hunting');
  const speed = Math.hypot(statue.sprite.velocity.x, statue.sprite.velocity.y);
  assert.ok(speed > 0, 'hunting statue should be moving');

  // Gaze restored: it holds still again.
  statue.update(TUNING.repathMs + 2, { ...playerPos, facing: { x: 0, y: -1 } });
  assert.equal(statue.state, 'frozen');
  assert.deepEqual(statue.sprite.velocity, { x: 0, y: 0 });
});

test('a carried flame wakes statues from farther away than darkness does', () => {
  const size = 19;
  const walls = Array.from({ length: size }, () => new Array(size).fill(false));
  const spawnCell = { x: 9, y: 2 };
  const spawnPos = { x: 9 * CELL + CELL / 2, y: 2 * CELL + CELL / 2 };
  const player = { x: spawnPos.x, y: spawnPos.y + 700, facing: { x: 0, y: 1 } };
  const statue = makeStatue(walls, spawnCell, spawnPos);

  statue.update(0, player, { activationRadius: TUNING.darkActivationRadius, visionRange: 0 });
  assert.equal(statue.state, 'patrolling');
  assert.ok(Math.hypot(statue.sprite.velocity.x, statue.sprite.velocity.y) > 0);
  statue.update(1, player, { activationRadius: TUNING.torchAttractionRadius, visionRange: 0 });
  assert.equal(statue.state, 'hunting');
});

test('a statue pursues farther and returns home instead of stopping at its chase boundary', () => {
  const size = 31;
  const walls = Array.from({ length: size }, () => new Array(size).fill(false));
  const spawnCell = { x: 5, y: 5 };
  const spawnPos = { x: 5 * CELL + CELL / 2, y: 5 * CELL + CELL / 2 };
  const statue = makeStatue(walls, spawnCell, spawnPos);

  statue.update(0, { x: spawnPos.x + 780, y: spawnPos.y, facing: { x: 1, y: 0 } }, { visionRange: 0 });
  assert.equal(statue.state, 'hunting');

  statue.sprite.x = spawnPos.x + 460;
  statue.update(TUNING.repathMs + 1, { x: spawnPos.x + TUNING.returnRadius + 700, y: spawnPos.y, facing: { x: 1, y: 0 } }, { visionRange: 0 });
  assert.equal(statue.state, 'returning');
  assert.ok(statue.sprite.velocity.x < 0, 'returning statue should move back toward its post');

  statue.sprite.x = spawnPos.x;
  statue.sprite.y = spawnPos.y;
  statue.update(TUNING.repathMs + 2, { x: spawnPos.x + TUNING.returnRadius + 700, y: spawnPos.y, facing: { x: 1, y: 0 } }, { visionRange: 0 });
  assert.equal(statue.state, 'patrolling');
  assert.ok(Math.hypot(statue.sprite.velocity.x, statue.sprite.velocity.y) > 0, 'it must leave its post and patrol again');
});

test('a statue patrol spans enough rooms to walk out of a dead end', () => {
  const size = 31;
  const walls = Array.from({ length: size }, () => new Array(size).fill(false));
  const spawnCell = { x: 5, y: 5 };
  const cells = patrolCellsFor(walls, spawnCell);
  assert.ok(cells.length >= 12);
  assert.ok(cells.some((cell) => cell.steps >= TUNING.statuePatrolMaxSteps - 1));
});

test('only one statue per wing receives the damaging chase', () => {
  const body = { enable: true };
  const statues = [
    { id: 0, wing: 1, floor: 0, state: 'patrolling', x: 120, y: 100, sprite: { visible: true, body } },
    { id: 1, wing: 1, floor: 0, state: 'patrolling', x: 180, y: 100, sprite: { visible: true, body } },
    { id: 2, wing: 2, floor: 0, state: 'hunting', x: 105, y: 100, sprite: { visible: true, body } },
  ];
  const first = choosePrimaryHunterId(statues, {
    playerX: 100, playerY: 100, wingId: 1, floor: 0,
    activationRadius: 500, returnRadius: 700,
  });
  assert.equal(first, 0);
  statues[0].state = 'hunting';
  statues[0].x = 240;
  const committed = choosePrimaryHunterId(statues, {
    playerX: 100, playerY: 100, wingId: 1, floor: 0, previousId: first,
    activationRadius: 500, returnRadius: 700,
  });
  assert.equal(committed, 0, 'the primary hunter stays stable instead of alternating every frame');
  assert.equal(statueCanDamage({ isPrimaryHunter: true, state: 'frozen', now: 1000 }), false);
  assert.equal(statueCanDamage({ isPrimaryHunter: false, state: 'hunting', now: 1000 }), false);
  assert.equal(statueCanDamage({ isPrimaryHunter: true, state: 'hunting', now: 1000, wingGraceUntil: 1200 }), false);
  assert.equal(statueCanDamage({ isPrimaryHunter: true, state: 'hunting', now: 1200, wingGraceUntil: 1200 }), true);
});

test('the secondary statue yields to patrol instead of joining a corridor chase', () => {
  const size = 31;
  const walls = Array.from({ length: size }, () => new Array(size).fill(false));
  const spawnCell = { x: 5, y: 5 };
  const spawnPos = { x: 5 * CELL + CELL / 2, y: 5 * CELL + CELL / 2 };
  const statue = makeStatue(walls, spawnCell, spawnPos);
  statue.state = 'hunting';
  statue.update(0, { x: spawnPos.x + 100, y: spawnPos.y, facing: { x: 1, y: 0 } }, { allowHunt: false });
  assert.equal(statue.state, 'patrolling');
  assert.ok(Math.hypot(statue.sprite.velocity.x, statue.sprite.velocity.y) > 0);
});

test('a relocated hunter immediately loses its damage authority', () => {
  const size = 19;
  const walls = Array.from({ length: size }, () => new Array(size).fill(false));
  const spawnCell = { x: 4, y: 4 };
  const spawnPos = { x: 4 * CELL + CELL / 2, y: 4 * CELL + CELL / 2 };
  const statue = makeStatue(walls, spawnCell, spawnPos);
  statue.canDamage = true;
  statue.relocateAwayFrom({ x: 10, y: 10 });
  assert.equal(statue.canDamage, false);
  assert.equal(statue.state, 'patrolling');
  assert.match(labyrinthScene, /hunterReliefUntil = this\.time\.now \+ TUNING\.hunterReliefAfterHitMs/);
});

test('each newly reached wing restores three lives once, but backtracking cannot farm refills', () => {
  const firstAdvance = applyWingEntryRules({ currentWingId: 0, targetWingId: 1, highestWingReached: 0, lives: 1, maxLives: 3 });
  assert.deepEqual(firstAdvance, { currentWingId: 1, highestWingReached: 1, lives: 3, advanced: true, moved: true });
  const backtrack = applyWingEntryRules({ currentWingId: 1, targetWingId: 0, highestWingReached: 1, lives: 2, maxLives: 3 });
  assert.equal(backtrack.lives, 2);
  assert.equal(backtrack.advanced, false);
  const reenter = applyWingEntryRules({ currentWingId: 0, targetWingId: 1, highestWingReached: 1, lives: 2, maxLives: 3 });
  assert.equal(reenter.lives, 2);
  assert.equal(reenter.advanced, false);
  const secondAdvance = applyWingEntryRules({ currentWingId: 1, targetWingId: 2, highestWingReached: 1, lives: 1, maxLives: 3 });
  assert.equal(secondAdvance.lives, 3);
  assert.equal(secondAdvance.advanced, true);
  assert.match(labyrinthScene, /STRINGS\.wingLivesRestored/);
});

test('the survey map uses a bright colored field and high-contrast walls', () => {
  assert.equal(PAL.mapBackground, 0x16445b);
  assert.equal(PAL.mapWall, 0xf3e8bd);
  assert.match(labyrinthScene, /PAL\.mapBackground/);
  assert.match(labyrinthScene, /PAL\.mapWall/);
});

test('Wing III moving walls have three states and every state stays solvable', () => {
  const layout = buildLayout(() => 0.5);
  assert.equal(layout.movingMaze.states.length, 3);
  const wing = layout.wings[2];
  const x0 = Math.round(wing.bounds.x0 / CELL);
  const y0 = Math.round(wing.bounds.y0 / CELL);
  const targets = [];
  for (let ly = 1; ly < LOCAL_H; ly += 2) {
    for (let lx = 1; lx < LOCAL_W; lx += 2) targets.push({ x: x0 + lx, y: y0 + ly });
  }
  for (const state of layout.movingMaze.states) {
    if (state.id > 0) {
      assert.equal(state.changes.length, MOVING_MAZE_CHANGES_PER_STATE);
      assert.equal(state.changes.filter((change) => change.solid).length, MOVING_MAZE_CHANGES_PER_STATE / 2);
      assert.equal(state.changes.filter((change) => !change.solid).length, MOVING_MAZE_CHANGES_PER_STATE / 2);
    }
    const walls = cloneWalls(layout.floorWalls[0]);
    for (const base of layout.movingMaze.cells) walls[base.y][base.x] = base.solid;
    for (const change of state.changes) walls[change.y][change.x] = change.solid;
    const seen = reachableCells(walls, targets[0]);
    assert.ok(targets.every((cell) => seen.has(`${cell.x},${cell.y}`)), `state ${state.id} disconnected a room`);
    for (const playerCell of targets) {
      assert.ok(playerCanReachTargets(walls, playerCell, targets), `state ${state.id} could strand the player`);
    }
  }
});

test('Wing IV is a reachable two-floor hunt with an unmarked final fragment', () => {
  const layout = buildLayout(() => 0.5);
  assert.equal(layout.floorWalls.length, 2);
  assert.equal(layout.stairs.length, 2);
  assert.deepEqual(layout.keys.filter((key) => key.wing === 3).map((key) => key.floor).sort(), [0, 1]);
  assert.equal(layout.exit.floor, 1);
  assert.equal(layout.fragmentClues.length, 3);

  for (let floor = 0; floor <= 1; floor += 1) {
    const start = layout.stairs[0].cell;
    const seen = reachableCells(layout.floorWalls[floor], start);
    assert.ok(seen.has(`${layout.stairs[1].cell.x},${layout.stairs[1].cell.y}`));
    for (const key of layout.keys.filter((candidate) => candidate.wing === 3 && candidate.floor === floor)) {
      assert.ok(seen.has(`${key.cell.x},${key.cell.y}`));
    }
    if (floor === 1) assert.ok(seen.has(`${layout.exit.cell.x},${layout.exit.cell.y}`));
  }
  assert.match(labyrinthScene, /toMini\(this\.layout\.exit/);
  assert.match(labyrinthScene, /ESCAPE \$\{arrows\[idx\]\}/);
  assert.match(labyrinthScene, /const x0 = VIEW\.w - size - 18/);
});

test('a hit statue relocates to its post instead of vanishing', () => {
  const size = 19;
  const walls = Array.from({ length: size }, () => new Array(size).fill(false));
  const spawnCell = { x: 4, y: 4 };
  const spawnPos = { x: 4 * CELL + CELL / 2, y: 4 * CELL + CELL / 2 };
  const statue = makeStatue(walls, spawnCell, spawnPos);

  statue.sprite.x = 10 * CELL;
  statue.sprite.y = 10 * CELL;
  statue.state = 'hunting';
  statue.relocateAwayFrom({ x: 10, y: 10 });

  assert.equal(statue.state, 'patrolling');
  assert.equal(statue.sprite.x, spawnPos.x);
  assert.equal(statue.sprite.y, spawnPos.y);
  assert.deepEqual(statue.sprite.velocity, { x: 0, y: 0 });
});

test('keys and torches can never share a read', () => {
  const slots = new Map(TEXTURE_SLOTS.map((slot) => [slot.id, slot]));
  for (const id of [
    'floor', 'wall', 'gate-locked', 'gate-open', 'torch', 'torch-glow',
    'key', 'key-glint', 'statue', 'eye-idle', 'eye-frozen', 'eye-hunt',
    'shield', 'shield-ring', 'pip', 'wanderer', 'fragment', 'fragment-glow',
    'butch-n', 'butch-ne', 'butch-e', 'butch-se', 'butch-s', 'butch-sw', 'butch-w', 'butch-nw',
    'stair', 'fragment-clue', 'fragment-seal', 'fragment-seal-ready',
  ]) assert.ok(slots.has(id), `missing texture slot: ${id}`);
  assert.equal(new Set(TEXTURE_SLOTS.map((s) => s.id)).size, TEXTURE_SLOTS.length);

  // The key is painted cool ivory with no flame colors anywhere in it; the
  // torch is built from warm flame colors. Silhouette sizes differ too.
  const keyColors = paintColors(slots.get('key'));
  const torchColors = paintColors(slots.get('torch'));
  assert.ok(keyColors.has(PAL.ivory));
  assert.ok(!keyColors.has(PAL.torch), 'key must not use the flame color');
  assert.ok(!keyColors.has(PAL.torchCore), 'key must not use the flame core color');
  assert.ok(torchColors.has(PAL.torch));
  assert.ok(torchColors.has(PAL.brass));
  assert.notDeepEqual(
    [slots.get('key').w, slots.get('key').h],
    [slots.get('torch').w, slots.get('torch').h],
  );

  // The three statue-eye states are three genuinely different paintings.
  const idle = paintColors(slots.get('eye-idle'));
  const frozen = paintColors(slots.get('eye-frozen'));
  const hunt = paintColors(slots.get('eye-hunt'));
  assert.ok(frozen.has(PAL.eyeFrozen));
  assert.ok(hunt.has(PAL.eyeHunt));
  assert.ok(!idle.has(PAL.eyeHunt) && !idle.has(PAL.eyeFrozen));
});

test('no missing chase-theme file is referenced anywhere in Door 4 audio', () => {
  assert.doesNotMatch(chaseMusic, /chase-theme/);
  assert.doesNotMatch(chaseMusic, /new Audio\(/);
  assert.doesNotMatch(chaseMusic, /import\.meta\.url/);
  assert.match(chaseMusic, /export function setChasing/);
  assert.match(chaseMusic, /export function setIntensity/);
  // Every event beat has its own synthesized cue.
  for (const cue of [
    'keyTaken', 'gateUnlock', 'exitUnlock', 'wingEnter', 'shieldFound',
    'shieldUp', 'shieldBlock', 'statueHit', 'fragmentReveal', 'fragmentTake',
  ]) assert.match(labyrinthCues, new RegExp(`${cue}\\(`));
});

test('the scene keeps the locked state machine and readable statue states', () => {
  for (const state of ['playing', 'over', 'won', 'artifact-ready', 'artifact-taken']) {
    assert.match(labyrinthScene, new RegExp(`'${state}'`));
  }
  for (const eye of ['eye-idle', 'eye-frozen', 'eye-hunt']) {
    assert.match(labyrinthScene, new RegExp(`textureKey\\('${eye}'\\)`));
  }
  // The fragment epilogue must wait for a deliberate take, not a timer.
  assert.match(labyrinthScene, /takeArtifact\(\)/);
  assert.match(labyrinthScene, /keydown-E/);
  assert.match(labyrinthScene, /artifactTaken = true/);
  // The scene speaks through the synthesized cue layer, not audio files.
  assert.match(labyrinthScene, /labyrinthCues\.keyTaken\(\)/);
  assert.match(labyrinthScene, /chaseMusic\.setIntensity/);
  assert.doesNotMatch(labyrinthScene, /\.mp3/);
});

test('the first shield is taught and activated with Space', () => {
  assert.match(STRINGS.controls, /SPACE\s+SHIELD/);
  assert.match(STRINGS.shieldFirstFoundNote, /PRESS SPACE/);
  assert.match(STRINGS.shieldTutorialPrompt, /SPACE/);
  assert.match(labyrinthScene, /keydown-SPACE/);
  assert.doesNotMatch(labyrinthScene, /keydown-Q/);
  assert.match(labyrinthScene, /shieldTutorialThreatRadius/);
});

test('statue collision stays on its feet instead of embedding in a room wall', () => {
  assert.match(labyrinthScene, /setCircle\(TUNING\.statueRadius, -2, 31\)/);
});
