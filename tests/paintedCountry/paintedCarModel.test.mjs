import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import {
  CELL_SIZE,
  createPaintedCar,
  idx,
  rectPlateCells,
} from '../../src/chapters/paintedCountry/paintedCarModel.js';
import {
  BLOCK_RECTS,
  CELL,
  DOOR,
  FLOOR_ROW,
  FLOOR_SPANS,
  GRID,
  PAINTINGS,
  PIGMENT_ZONE,
  PLATE_GRID,
  READ_RADIUS,
  SIGN,
  SIGN_LABELS,
  VARNISH_COATS,
  WRONG_ANSWER_LINES,
} from '../../src/chapters/paintedCountry/carLayout.js';
import { MARK_SIGNS } from '../../src/chapters/paintedCountry/art/marksArt.js';

// Chapter 4 · Part I, "Under the gouache" (release 1.0 rework): the Colour
// Link cards are gone, the plates are washed clear instead, the sign set is
// the STORY_BIBLE one, and the door never names its own answer.

const PLAYER_HALF_HEIGHT = 29;
const centreOfCellTop = (cx, cy) => ({ x: cx * CELL + CELL / 2, y: cy * CELL - PLAYER_HALF_HEIGHT });
const washWholePlate = (car, id) => {
  for (let pass = 0; pass < VARNISH_COATS; pass += 1) {
    for (let r = 0; r < PLATE_GRID.rows; r += 1) for (let c = 0; c < PLATE_GRID.cols; c += 1) car.washPlate(id, c, r);
  }
};

test('the sign set is the story bible one: HAWTHORN, TICKET, LANTERN, APPLE and the ROSE decoy', () => {
  assert.deepEqual(Object.values(SIGN).sort(), ['apple', 'hawthorn', 'lantern', 'rose', 'ticket']);
  assert.deepEqual(Object.values(SIGN_LABELS).sort(), ['APPLE', 'HAWTHORN', 'LANTERN', 'ROSE', 'TICKET']);
  assert.equal(DOOR.correct, SIGN.HAWTHORN);
  assert.equal(DOOR.panels.length, 5);
  assert.deepEqual(PAINTINGS.map((p) => p.title), ['1978 · CITY ROOM', 'BELLWETHER ORCHARD', "ROSA'S DRAWING"]);
  assert.deepEqual(PAINTINGS.map((p) => p.primarySign), [SIGN.TICKET, SIGN.LANTERN, SIGN.APPLE]);
});

test('the deduction keeps its logic: 5 signs, 3 distinct large marks, 1 shared small mark, 1 decoy', () => {
  const marksOn = (plate) => [plate.primarySign, plate.sharedSign, plate.roseRect ? SIGN.ROSE : null].filter(Boolean);
  const inAll = DOOR.panels.map((p) => p.sign).filter((sign) => PAINTINGS.every((plate) => marksOn(plate).includes(sign)));
  assert.deepEqual(inAll, [SIGN.HAWTHORN], 'exactly one door sign is on every plate');
  assert.equal(new Set(PAINTINGS.map((p) => p.primarySign)).size, 3);
  PAINTINGS.forEach((p) => assert.equal(p.sharedSign, SIGN.HAWTHORN));
  const roseCount = PAINTINGS.filter((p) => p.roseRect).length;
  assert.ok(roseCount >= 1 && roseCount < PAINTINGS.length, 'the rose tempts but is never on all three');
  const spots = PAINTINGS.map((p) => `${p.hawthornRect.c},${p.hawthornRect.r}`);
  assert.equal(new Set(spots).size, 3, 'her hawthorn hides in a different spot on each plate');
});

test('nothing on screen gives the answer away', () => {
  PAINTINGS.forEach((p) => {
    assert.doesNotMatch(p.caption, /SMALL SEAL|LARGE MARK|hawthorn/i, `${p.id} caption must not name the marks`);
    assert.doesNotMatch(p.caption, /\bmoon\b/i);
    assert.ok(p.caption.length > 80);
  });
  assert.equal(DOOR.prompt, 'WHICH MARK DID SHE LEAVE IN ALL THREE?');
});

test('every sign is drawn in the chapter\'s pencil, and the old flat icons and gallery JPGs are gone', () => {
  assert.deepEqual([...MARK_SIGNS].sort(), Object.values(SIGN).sort());
  Object.values(SIGN).forEach((sign) => {
    assert.equal(existsSync(new URL(`../../public/assets/chapter04/icons/sign-${sign}.webp`, import.meta.url)), false);
    assert.equal(existsSync(new URL(`../../public/assets/chapter04/icons/mark-${sign}.webp`, import.meta.url)), false);
  });
  ['middleage', 'duga', 'cyberpunk'].forEach((name) => {
    assert.equal(existsSync(new URL(`../../public/assets/chapter04/gallery/${name}.jpg`, import.meta.url)), false);
  });
});

test('paint is free in bays A and B and the car keeps no inventory', () => {
  const car = createPaintedCar();
  assert.equal(CELL_SIZE, CELL);
  assert.equal(car.paint(10, 4), true);
  assert.equal(car.paint(5, FLOOR_ROW - 1), true);
  assert.equal(car.state.pigment, PIGMENT_ZONE.start);
});

test('wash takes back paint and eats the archive grey, but never the carriage or the door face', () => {
  const car = createPaintedCar();
  car.paint(5, FLOOR_ROW - 1);
  assert.equal(car.wash(5, FLOOR_ROW - 1), true);
  assert.equal(car.isPainted(5, FLOOR_ROW - 1), false);
  assert.equal(car.isBlock(41, 19), true);
  assert.equal(car.wash(41, 19), true);
  assert.equal(car.isBlock(41, 19), false);
  car.drainEvents();
  assert.equal(car.wash(5, FLOOR_ROW), false);
  assert.deepEqual(car.drainEvents().map((e) => e.reason), ['that-is-the-carriage']);
  const panel = DOOR.panels[0];
  const pc = Math.floor((panel.x + panel.w / 2) / CELL);
  const pr = Math.floor((panel.y + panel.h / 2) / CELL);
  assert.equal(car.paint(pc, pr), false);
  assert.equal(car.wash(pc, pr), false);
});

test('escalation 2: varnished official record refuses paint until washed twice', () => {
  const car = createPaintedCar();
  assert.equal(car.isVarnished(70, 20), true);
  assert.equal(car.paint(70, 20), false);
  assert.equal(car.paintRefusal(70, 20), 'varnished');
  assert.equal(car.wash(70, 20), true);
  assert.equal(car.paint(70, 20), false, 'one wash is not enough');
  assert.equal(car.wash(70, 20), true);
  assert.equal(car.isVarnished(70, 20), false);
  assert.equal(car.paint(70, 20), true);
});

test('escalation 3: in bay C paint costs pigment, and washing the grey gives her colour back', () => {
  const car = createPaintedCar();
  const col = PIGMENT_ZONE.fromCol + 1;
  assert.equal(car.state.pigment, 0);
  assert.equal(car.paint(col, FLOOR_ROW - 1), false);
  assert.equal(car.paintRefusal(col, FLOOR_ROW - 1), 'no-pigment');
  // the long wall is grey: wash three cells of it
  const wall = BLOCK_RECTS[1];
  for (let r = FLOOR_ROW - 3; r < FLOOR_ROW; r += 1) assert.equal(car.wash(wall.col, r), true);
  // two pigment per grey cell (alpha round 1 pacing)
  assert.equal(car.state.pigment, 6);
  assert.equal(car.paint(col, FLOOR_ROW - 1), true);
  assert.equal(car.state.pigment, 5);
  // washing your own paint refunds it
  assert.equal(car.wash(col, FLOOR_ROW - 1), true);
  assert.equal(car.state.pigment, 6);
});

test('the long wall reaches the ceiling: there is no way over it, only through', () => {
  const wall = BLOCK_RECTS[1];
  assert.equal(wall.row * CELL, 80);
  assert.equal(wall.row + wall.rows, FLOOR_ROW);
});

test('the bay A grey is too tall to jump, so WASH is taught there', () => {
  const car = createPaintedCar();
  const rise = (560 * 560) / (2 * 1700);
  let top = GRID.h;
  for (let cy = 0; cy < GRID.h; cy += 1) if (car.isBlock(41, cy)) top = Math.min(top, cy);
  assert.ok(top * CELL < FLOOR_ROW * CELL - rise);
});

test('not one plate can be reached from the floor', () => {
  const car = createPaintedCar();
  PAINTINGS.forEach((picture) => {
    const cx = picture.x + picture.w / 2;
    const cy = picture.y + picture.h / 2;
    assert.ok(Math.hypot(0, FLOOR_ROW * CELL - PLAYER_HALF_HEIGHT - cy) > READ_RADIUS, picture.id);
  });
  assert.equal(car.pictureInRange(PAINTINGS[0].x + PAINTINGS[0].w / 2, FLOOR_ROW * CELL - PLAYER_HALF_HEIGHT), null);
});

// Dead-end check: grow every cell the player could ever stand on or paint,
// allowing varnish to be washed and treating bay C paint as affordable only
// within the pigment the long wall can give back. Every plate must have a
// perch, and the pigment needed must be far inside what washing recovers.
test('no dead ends: every plate has a legal perch and bay C never runs out of colour', () => {
  const car = createPaintedCar();
  const reachable = new Set();
  const queue = [];
  const consider = (cx, cy) => {
    if (!car.inBounds(cx, cy) || cy < 4) return;
    const k = idx(cx, cy);
    if (reachable.has(k) || car.isSealed(cx, cy) || car.isSolid(cx, cy)) return;
    reachable.add(k);
    queue.push([cx, cy]);
  };
  for (let cx = 0; cx < GRID.w; cx += 1) {
    for (let cy = 0; cy < GRID.h; cy += 1) {
      if (!car.isTerrain(cx, cy) && !car.isBlock(cx, cy)) continue;
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
    const perch = [...reachable].find((k) => {
      const stand = centreOfCellTop(k % GRID.w, Math.floor(k / GRID.w));
      return Math.hypot(stand.x - px, stand.y - py) <= READ_RADIUS;
    });
    assert.ok(perch !== undefined, `${picture.id} has no legal perch`);
  });
  // Bay C budget: bridge the second hole plus a stair up to the third plate.
  const hole = FLOOR_SPANS[2].from - FLOOR_SPANS[1].to;
  const plate = PAINTINGS[2];
  const stairRows = FLOOR_ROW - Math.floor((plate.y + plate.h / 2 + READ_RADIUS - 10 + PLAYER_HALF_HEIGHT) / CELL);
  const needed = hole + stairRows * 2;
  const wall = BLOCK_RECTS[1];
  const recoverable = PIGMENT_ZONE.start + wall.cols * wall.rows * PIGMENT_ZONE.perGrey;
  assert.ok(needed <= 30, `bay C should need a handful of cells, not ${needed}`);
  assert.ok(recoverable >= needed * 3, `bay C must never run dry: ${recoverable} vs ${needed}`);
});

test('a plate develops once its large mark and her hawthorn are both washed clear', () => {
  const car = createPaintedCar();
  const plate = PAINTINGS[0];
  rectPlateCells(plate.markRect).forEach((cell) => car.washPlate(plate.id, cell % PLATE_GRID.cols, Math.floor(cell / PLATE_GRID.cols)));
  assert.equal(car.plateState(plate.id).markFound, true);
  assert.equal(car.plateState(plate.id).developed, false, 'the large mark alone is not the plate');
  rectPlateCells(plate.hawthornRect).forEach((cell) => car.washPlate(plate.id, cell % PLATE_GRID.cols, Math.floor(cell / PLATE_GRID.cols)));
  assert.equal(car.plateState(plate.id).developed, true);
  assert.deepEqual(car.snapshot().picturesRead, [plate.id]);
});

test('varnished plate cells take two washes, and her hawthorn on the last plate is under varnish', () => {
  const car = createPaintedCar();
  const plate = PAINTINGS[2];
  const { c, r } = plate.hawthornRect;
  assert.equal(car.washPlate(plate.id, c, r), 'thinned');
  assert.equal(car.plateState(plate.id).grey.has(r * PLATE_GRID.cols + c), true);
  assert.equal(car.washPlate(plate.id, c, r), 'washed');
});

test('the door waits for all three plates, never kills, and names the rose after two misses', () => {
  const car = createPaintedCar();
  assert.equal(car.chooseSign(SIGN.HAWTHORN).reason, 'not-all-pictures-read');
  PAINTINGS.forEach((p) => washWholePlate(car, p.id));
  assert.equal(car.platesDeveloped(), true);
  car.drainEvents();
  let answer = car.chooseSign(SIGN.TICKET);
  assert.deepEqual(answer, { ok: false, reason: 'wrong-sign', hint: 'first' });
  answer = car.chooseSign(SIGN.ROSE);
  assert.equal(answer.hint, 'rosa');
  assert.equal(WRONG_ANSWER_LINES.rosa, "That's Rosa's. Mara signed with the hawthorn.");
  answer = car.chooseSign(SIGN.APPLE);
  assert.equal(answer.hint, 'gentle');
  assert.match(WRONG_ANSWER_LINES.gentle(SIGN.APPLE), /apple/);
  assert.equal(car.state.killed, false);
  assert.equal(car.state.complete, false);
  answer = car.chooseSign(SIGN.HAWTHORN);
  assert.deepEqual(answer, { ok: true, reason: 'correct' });
  assert.equal(car.snapshot().complete, true);
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

// Alpha round 1 (P1 pacing): plates 2 and 3 were cell-by-cell staircase
// chores. The tallest stair each plate needs, stood on straight under it:
// plate 1 one cell, plate 2 a single jumpable column (≤ 4 cells, the jump
// rises 92 px), plate 3 at most five cells over the hole (was 1 / 6 / 7).
test('pacing: the stair each plate needs stays short', () => {
  const rise = (560 * 560) / (2 * 1700);
  const stairFor = (plate) => {
    const cy = plate.y + plate.h / 2;
    for (let rows = 0; rows < 12; rows += 1) {
      const standY = (FLOOR_ROW - rows) * CELL - PLAYER_HALF_HEIGHT;
      if (standY - cy <= READ_RADIUS) return rows;
    }
    return Infinity;
  };
  const [city, orchard, drawing] = PAINTINGS.map(stairFor);
  assert.equal(city, 1);
  assert.ok(orchard >= 2 && orchard * CELL <= rise, `orchard needs ${orchard} cells`);
  assert.ok(drawing <= 3, `drawing needs ${drawing} cells`);
  assert.equal(PIGMENT_ZONE.perGrey, 2);
});

// Alpha round 2: plate 3 is one hop from a bridge, but it still needs the
// bridge: no jump from the last floor before the hole reaches it.
test('pacing: plate 3 hangs over the hole, out of reach of a jump from the floor', () => {
  const rise = (560 * 560) / (2 * 1700);
  const drawing = PAINTINGS.find((plate) => plate.id === 'drawing');
  const cx = drawing.x + drawing.w / 2;
  const cy = drawing.y + drawing.h / 2;
  const floorEdge = FLOOR_SPANS.find((span) => span.to * CELL <= drawing.x + drawing.w && span.to * CELL >= drawing.x - CELL);
  assert.ok(floorEdge, 'the plate hangs past the end of a floor span');
  const edgeX = floorEdge.to * CELL + 12; // a body overhanging the edge
  const apexY = FLOOR_ROW * CELL - PLAYER_HALF_HEIGHT - rise;
  assert.ok(Math.hypot(cx - edgeX, cy - apexY) > READ_RADIUS);
  // Stood on three painted cells under it, it reads.
  const standY = (FLOOR_ROW - 3) * CELL - PLAYER_HALF_HEIGHT;
  assert.ok(Math.hypot(0, cy - standY) <= READ_RADIUS);
});
