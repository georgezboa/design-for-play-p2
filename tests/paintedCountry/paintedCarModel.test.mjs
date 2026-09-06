import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CELL_SIZE,
  createPaintedCar,
  idx,
} from '../../src/chapters/paintedCountry/paintedCarModel.js';
import {
  BOARD,
  CELL,
  DOOR,
  SIGN_ART,
  FLOOR_ROW,
  GRID,
  PAINTINGS,
  READ_RADIUS,
  SIGN,
} from '../../src/chapters/paintedCountry/carLayout.js';

// The player's body is 58 tall, so standing on a cell puts their middle here.
const PLAYER_HALF_HEIGHT = 29;
const centreOfCellTop = (cx, cy) => ({
  x: cx * CELL + CELL / 2,
  y: cy * CELL - PLAYER_HALF_HEIGHT,
});

test('paint is unlimited and the car keeps no inventory', () => {
  const car = createPaintedCar();
  const snap = car.snapshot();
  assert.equal(snap.paintSupply, 'infinite');
  assert.equal('pigment' in snap, false);
  assert.equal('brush' in snap, false);
  assert.equal(CELL_SIZE, CELL);
});

test('paper can be placed freely in empty unvarnished cells', () => {
  const car = createPaintedCar();
  // Well clear of the floor and of every wall.
  assert.equal(car.paintRefusal(10, 4), null);
  assert.equal(car.paint(10, 4), true);
  assert.equal(car.state.painted.size, 1);
});

test('a staircase can be drawn directly', () => {
  const car = createPaintedCar();
  assert.equal(car.paint(5, FLOOR_ROW - 1), true);
  assert.equal(car.paint(6, FLOOR_ROW - 2), true);
  assert.equal(car.paint(7, FLOOR_ROW - 3), true);
  assert.equal(car.isSolid(7, FLOOR_ROW - 3), true);
  // ...and the step you just made is something to stand on.
  assert.equal(car.isPainted(7, FLOOR_ROW - 3), true);
});

test('the Last City wall is buildable while the door face stays varnished', () => {
  const car = createPaintedCar();
  // Directly beneath the third picture.
  assert.equal(car.isGlaze(88, 15), false);
  // The signs on the door stay readable.
  const panel = DOOR.panels[0];
  const pc = Math.floor((panel.x + panel.w / 2) / CELL);
  const pr = Math.floor((panel.y + panel.h / 2) / CELL);
  assert.equal(car.isGlaze(pc, pr), true);
});

test('wash takes back your own paint and eats paper blocks, but never the carriage', () => {
  const car = createPaintedCar();
  car.paint(5, FLOOR_ROW - 1);
  assert.equal(car.wash(5, FLOOR_ROW - 1), true);
  assert.equal(car.isPainted(5, FLOOR_ROW - 1), false);

  // A block from the bay A wall.
  assert.equal(car.isBlock(41, 19), true);
  const before = car.state.blocks.size;
  assert.equal(car.wash(41, 19), true);
  assert.equal(car.state.blocks.size, before - 1);

  // The floor is not the player's to undo.
  car.drainEvents();
  assert.equal(car.wash(5, FLOOR_ROW), false);
  assert.equal(car.isTerrain(5, FLOOR_ROW), true);
  assert.deepEqual(
    car.drainEvents().map((e) => e.reason),
    ['that-is-the-carriage'],
  );
});

test('the paper blocks are too tall to jump, so WASH is the only way past', () => {
  const car = createPaintedCar();
  const GRAVITY = 1700;
  const JUMP = -560;
  const rise = (JUMP * JUMP) / (2 * GRAVITY);
  const feetAtApex = FLOOR_ROW * CELL - rise;

  // Bay A's wall: find its top row and check a jump cannot clear it.
  let topRow = GRID.h;
  for (let cy = 0; cy < GRID.h; cy += 1) {
    if (car.isBlock(41, cy)) topRow = Math.min(topRow, cy);
  }
  assert.ok(topRow < GRID.h, 'bay A must actually have a block wall');
  assert.ok(
    topRow * CELL < feetAtApex,
    `wall top y=${topRow * CELL} is above the jump apex y=${feetAtApex.toFixed(1)} — it could be vaulted`,
  );
});

test('not one picture can be read from the floor', () => {
  const car = createPaintedCar();
  PAINTINGS.forEach((picture) => {
    const cx = picture.x + picture.w / 2;
    const cy = picture.y + picture.h / 2;
    // Stand anywhere along the floor, directly beneath the picture included.
    const standing = { x: cx, y: FLOOR_ROW * CELL - PLAYER_HALF_HEIGHT };
    assert.ok(
      Math.hypot(standing.x - cx, standing.y - cy) > READ_RADIUS,
      `${picture.id} can be read without building anything`,
    );
  });
  assert.equal(
    car.pictureInRange(PAINTINGS[0].x + PAINTINGS[0].w / 2, FLOOR_ROW * CELL - PLAYER_HALF_HEIGHT),
    null,
  );
  assert.equal(car.state.seen.size, 0);
});

test('every picture is reachable by building, varnish and all', () => {
  // Grow the set of cells the player could ever paint: anything empty and
  // unvarnished that touches something solid, then anything touching THAT.
  // This is exactly what the paint rule allows, so membership is a proof that
  // a real staircase exists.
  const car = createPaintedCar();
  const reachable = new Set();
  const queue = [];
  const consider = (cx, cy) => {
    if (!car.inBounds(cx, cy)) return;
    const key = idx(cx, cy);
    if (reachable.has(key)) return;
    if (car.isGlaze(cx, cy) || car.isSolid(cx, cy)) return;
    reachable.add(key);
    queue.push([cx, cy]);
  };

  for (let cx = 0; cx < GRID.w; cx += 1) {
    for (let cy = 0; cy < GRID.h; cy += 1) {
      if (!car.isSolid(cx, cy)) continue;
      for (let dx = -1; dx <= 1; dx += 1) for (let dy = -1; dy <= 1; dy += 1) consider(cx + dx, cy + dy);
    }
  }
  while (queue.length) {
    const [cx, cy] = queue.shift();
    for (let dx = -1; dx <= 1; dx += 1) for (let dy = -1; dy <= 1; dy += 1) consider(cx + dx, cy + dy);
  }

  PAINTINGS.forEach((picture) => {
    const px = picture.x + picture.w / 2;
    const py = picture.y + picture.h / 2;
    const perch = [...reachable].find((key) => {
      const cx = key % GRID.w;
      const cy = Math.floor(key / GRID.w);
      const stand = centreOfCellTop(cx, cy);
      return Math.hypot(stand.x - px, stand.y - py) <= READ_RADIUS;
    });
    assert.ok(perch !== undefined, `${picture.id} cannot be reached by any legal staircase`);
  });
});

test('the puzzle is well posed: exactly one door sign is named by every caption', () => {
  // The clue lives in the captions, so the captions are what has to be
  // unambiguous. Every archive must end on the same word, and no other sign on
  // the door may manage that — otherwise the door has two right answers.
  const namedIn = (sign) =>
    PAINTINGS.filter((p) => new RegExp(`\\b${sign}\\b`, 'i').test(p.caption)).length;

  const inEvery = DOOR.panels.map((p) => p.sign).filter((sign) => namedIn(sign) === PAINTINGS.length);
  assert.deepEqual(inEvery, [SIGN.MOON], 'the answer must be unique and deducible from the text');
  assert.equal(DOOR.correct, SIGN.MOON);

  assert.equal(new Set(PAINTINGS.map((p) => p.primarySign)).size, PAINTINGS.length,
    'the three large archive marks must all look different');
  assert.deepEqual(PAINTINGS.map((p) => p.primarySign), [SIGN.EYE, SIGN.HEIR, SIGN.RAPTURE]);
  PAINTINGS.forEach((p) => assert.equal(p.sharedSign, SIGN.MOON));
  assert.ok(DOOR.panels.every((panel) =>
    panel.sign === SIGN.OEDON
      || panel.sign === SIGN.MOON
      || PAINTINGS.some((p) => p.primarySign === panel.sign)));

  // Every caption really does finish on the answer, which is what the door's
  // prompt promises the player.
  PAINTINGS.forEach((p) => {
    assert.match(p.caption.trim(), /MOON\.$/, `${p.id} should end on the answer`);
  });

  // The eye is the New Harmony logo and is all over the artwork, so it has to
  // be on the door as the trap — but must not be named in every caption.
  assert.ok(
    DOOR.panels.some((p) => p.sign === SIGN.EYE),
    'the obvious wrong answer must be offered',
  );
  assert.ok(namedIn(SIGN.EYE) > 0 && namedIn(SIGN.EYE) < PAINTINGS.length);
});

test('every archive retains source provenance and a substantial caption', () => {
  PAINTINGS.forEach((p) => {
    assert.match(p.file, /^assets\/chapter04\/gallery\/.+\.(jpg|png|webp)$/);
    assert.ok(p.caption.length > 120, `${p.id} needs a caption worth climbing for`);
    assert.ok(p.title.length > 0);
  });
  DOOR.panels.forEach((panel) => {
    assert.match(SIGN_ART[panel.sign], /^assets\/chapter04\/icons\/.+\.webp$/);
  });
});

// ------------------------------------------------------------- thread board

// The intended threading. Two of the three cords have to bend around a torn
// eyelet, and the bends have to bend the opposite way from each other.
const SOLUTION = {
  amber: [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]],
  cyan: [[0, 2], [1, 2], [2, 2], [3, 2], [4, 2]],
  red: [[0, 4], [1, 4], [2, 4], [3, 4], [4, 4]],
};

const BOARD_SOLUTIONS = {
  nave: SOLUTION,
  field: {
    amber: [[0, 6], [1, 6], [2, 6], [3, 6], [3, 5]],
    orange: [[3, 0], [2, 0], [1, 0], [0, 0], [0, 1]],
    green: [[4, 0], [4, 1], [4, 2], [4, 3], [4, 4], [4, 5], [4, 6]],
    cyan: [[3, 1], [2, 1], [1, 1], [1, 2], [0, 2]],
    violet: [[2, 2], [2, 3], [1, 3], [0, 3], [0, 4], [0, 5], [1, 5], [2, 5]],
    pink: [[3, 2], [3, 3], [3, 4], [2, 4], [1, 4]],
  },
  city: {
    green: [[3, 1], [4, 1], [5, 1], [5, 2], [5, 3]],
    violet: [[6, 3], [6, 4], [5, 4], [4, 4]],
    red: [[4, 3], [3, 3], [3, 4], [3, 5], [4, 5], [5, 5], [6, 5], [6, 6], [5, 6], [4, 6]],
    amber: [[3, 6], [2, 6], [1, 6], [0, 6], [0, 5], [0, 4], [1, 4]],
    cyan: [[1, 5], [2, 5], [2, 4], [2, 3], [1, 3], [0, 3], [0, 2]],
    lime: [[1, 2], [2, 2], [2, 1], [1, 1], [0, 1], [0, 0], [1, 0], [2, 0], [3, 0]],
    blue: [[4, 0], [5, 0], [6, 0], [6, 1], [6, 2]],
  },
};

const thread = (car, pictureId, pairId, cells) => {
  car.boardBegin(pictureId, ...cells[0]);
  cells.slice(1).forEach(([c, r]) => car.boardExtend(pictureId, c, r));
  car.boardRelease(pictureId);
};

const threadBoard = (car, pictureId, solution) => {
  Object.entries(solution).forEach(([pairId, cells]) => thread(car, pictureId, pairId, cells));
};

const threadAllBoards = (car) => {
  PAINTINGS.forEach((picture) => threadBoard(car, picture.id, BOARD_SOLUTIONS[picture.id]));
};

test('the teaching board starts empty and accepts three obvious straight routes', () => {
  const car = createPaintedCar();
  assert.equal(car.boardSolved(), false);
  assert.equal(BOARD.torn.length, 0);
  threadBoard(car, PAINTINGS[0].id, SOLUTION);
  assert.equal(car.boardSolved(), true);
});

test('a cord cannot share a hole with another cord, and dragging back undoes it', () => {
  const car = createPaintedCar();
  thread(car, PAINTINGS[0].id, 'amber', SOLUTION.amber);
  assert.equal(car.cordComplete('amber'), true);

  // Cyan tries to run through amber's cord.
  car.boardBegin(PAINTINGS[0].id, 0, 2);
  car.boardExtend(PAINTINGS[0].id, 0, 1);
  car.boardExtend(PAINTINGS[0].id, 0, 0); // amber's endpoint is sitting here
  assert.equal(car.cordCovering(PAINTINGS[0].id, 0, 0), 'amber');
  assert.equal(car.state.board.cords.cyan.length, 2, 'the blocked step was not taken');

  // Backtracking shortens rather than restarting.
  assert.equal(car.boardExtend(PAINTINGS[0].id, 0, 2), true);
  assert.equal(car.state.board.cords.cyan.length, 1);
  car.boardRelease();
  assert.deepEqual(car.state.board.cords.cyan, [], 'a half-drawn cord is not left lying about');
});

test('the intended threading solves the board', () => {
  const car = createPaintedCar();
  threadBoard(car, PAINTINGS[0].id, SOLUTION);
  assert.equal(car.boardSolved(), true);
  assert.deepEqual(car.snapshot().board.joined.sort(), ['amber', 'cyan', 'red']);

  // And pulling one cord back out unsolves it.
  car.boardClearAt(PAINTINGS[0].id, ...SOLUTION.cyan[3]);
  assert.equal(car.boardSolved(), false);
});

test('the first board is solvable and no teaching cord is forced to bend', () => {
  // Brute force every legal threading, so "solvable" is proved rather than
  // asserted, and so a future tweak to the torn holes cannot quietly make the
  // lock impossible.
  const { cols, rows, pairs, torn } = BOARD;
  const isTorn = (c, r) => torn.some(([tc, tr]) => tc === c && tr === r);
  const endpoints = new Set();
  pairs.forEach((p) => {
    endpoints.add(`${p.a}`);
    endpoints.add(`${p.b}`);
  });

  const key = (c, r) => `${c},${r}`;
  const used = new Set();
  pairs.forEach((p) => {
    used.add(key(p.a[0], p.a[1]));
    used.add(key(p.b[0], p.b[1]));
  });

  let found = false;
  const walk = (i, c, r) => {
    if (found) return;
    const pair = pairs[i];
    if (c === pair.b[0] && r === pair.b[1]) {
      if (i === pairs.length - 1) {
        found = true;
        return;
      }
      const next = pairs[i + 1];
      walk(i + 1, next.a[0], next.a[1]);
      return;
    }
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nc = c + dx;
      const nr = r + dy;
      if (nc < 0 || nr < 0 || nc >= cols || nr >= rows) continue;
      if (isTorn(nc, nr)) continue;
      const isTarget = nc === pair.b[0] && nr === pair.b[1];
      if (!isTarget) {
        if (used.has(key(nc, nr))) continue;
        used.add(key(nc, nr));
      }
      walk(i, nc, nr);
      if (!isTarget) used.delete(key(nc, nr));
      if (found) return;
    }
  };
  walk(0, pairs[0].a[0], pairs[0].a[1]);
  assert.equal(found, true, 'the thread board must have at least one legal threading');

  // A cord "bends" if its two ends share a row but a straight run is impossible.
  const forcedToBend = pairs.filter((p) => {
    if (p.a[1] !== p.b[1]) return false;
    const row = p.a[1];
    for (let c = Math.min(p.a[0], p.b[0]); c <= Math.max(p.a[0], p.b[0]); c += 1) {
      if (isTorn(c, row)) return true;
    }
    return false;
  });
  assert.equal(forcedToBend.length, 0, 'the teaching board should not disguise a route with torn holes');
});

test('the door is dark until the board is threaded', () => {
  const car = createPaintedCar();
  PAINTINGS.forEach((p) => assert.equal(car.readPicture(p.id), false));
  assert.equal(car.allSeen(), false);

  car.drainEvents();
  const answer = car.chooseSign(SIGN.MOON);
  assert.equal(answer.ok, false);
  assert.equal(answer.reason, 'board-not-threaded');
  assert.deepEqual(car.drainEvents().map((e) => e.type), ['door-dark']);
  assert.equal(car.state.complete, false);
});

test('the door stays silent until all three pictures have been read', () => {
  const car = createPaintedCar();
  threadBoard(car, PAINTINGS[0].id, SOLUTION);
  assert.equal(car.boardSolved(), true);
  assert.equal(car.boardsSolved(), false);

  car.drainEvents();
  let answer = car.chooseSign(SIGN.MOON);
  assert.equal(answer.ok, false);
  assert.equal(answer.reason, 'board-not-threaded');
  assert.equal(car.state.complete, false);
  assert.deepEqual(car.drainEvents().map((e) => e.type), ['door-dark']);

  threadBoard(car, PAINTINGS[1].id, BOARD_SOLUTIONS.field);
  threadBoard(car, PAINTINGS[2].id, BOARD_SOLUTIONS.city);
  assert.equal(car.boardsSolved(), true);

  car.drainEvents();
  answer = car.chooseSign(SIGN.MOON);
  assert.equal(answer.ok, false);
  assert.equal(answer.reason, 'not-all-pictures-read');
  assert.equal(car.state.complete, false);
  assert.deepEqual(car.drainEvents().map((e) => e.type), ['door-silent']);

  // Read them by standing at each one and taking the plate down.
  PAINTINGS.forEach((p) => {
    assert.ok(car.pictureInRange(p.x + p.w / 2, p.y + p.h / 2), `${p.id} should be in range`);
    car.readPicture(p.id);
  });
  assert.equal(car.allSeen(), true);
  assert.deepEqual(car.snapshot().picturesRead, PAINTINGS.map((p) => p.id));

  // A wrong sign is readable but recoverable; the three archive puzzles stay solved.
  car.drainEvents();
  answer = car.chooseSign(SIGN.EYE);
  assert.equal(answer.ok, false);
  assert.equal(answer.reason, 'wrong-sign');
  assert.equal(car.state.complete, false);
  assert.equal(car.state.killed, false, 'the fused chapter must preserve the investigation');
  assert.equal(car.state.door.wrongTries, 1);
  assert.deepEqual(car.drainEvents().map((e) => e.type), ['door-refused']);
  assert.equal(car.boardsSolved(), true);
  assert.equal(car.allSeen(), true);

  // The moon opens it.
  answer = car.chooseSign(SIGN.MOON);
  assert.equal(answer.ok, true);
  assert.equal(car.state.door.solved, true);
  assert.equal(car.snapshot().complete, true);
  assert.deepEqual(car.drainEvents().map((e) => e.type), ['door-opened']);
});

test('falling costs nothing that was drawn', () => {
  const car = createPaintedCar();
  car.paint(5, FLOOR_ROW - 1);
  car.wash(41, 19);
  car.fell();
  assert.equal(car.snapshot().falls, 1);
  assert.equal(car.isPainted(5, FLOOR_ROW - 1), true);
  assert.equal(car.isBlock(41, 19), false);
});
