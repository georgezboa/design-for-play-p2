// Chapter 4 // THE PAINTED COUNTRY — Part I, "Under the gouache", as rules.
//
// Two verbs, both free-hand:
//
//   PAINT — fill a cell. It becomes real paper you can stand on. This is Rosa
//           remembering the place back into existence.
//   WASH  — take something back off the paper: your own paint, or the
//           archive's grey gouache.
//
// The escalation (see carLayout.js): in Bay C the brush is dry, so paint
// costs pigment that only washing the archive's grey gives back.
//
// The gallery is solved on the plates: each is under grey, and under the
// grey are Rosa's colours in pairs. Joining every pair and covering every
// square (threadBoard.js) lifts the grey, and the plate shows a large mark
// and, somewhere else on it, Mara's small hawthorn. The door asks which mark
// she left in all three. A wrong mark never kills: after two misses the door
// names Rosa's rose, or gently points back at the plates.
//
// Round 11: nothing is done twice. The varnished "official record" (two
// washes before paint would take) and the cell-by-cell washing of the plates
// are gone.

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
  SEALED_RECTS,
  SIGN,
} from './carLayout.js';
import { createThreadBoard } from './threadBoard.js';

export const CELL_SIZE = CELL;

// A ceiling on painted cells so a stuck button cannot fill the car with
// collision bodies. Far past anything a solution needs.
export const MAX_PAINTED = 1500;

export const idx = (cx, cy) => cy * GRID.w + cx;
export const colOf = (worldX) => Math.floor(worldX / CELL);
export const rowOf = (worldY) => Math.floor(worldY / CELL);

function rectCells(rects) {
  const set = new Set();
  rects.forEach(({ col, row, cols, rows }) => {
    for (let cx = col; cx < col + cols; cx += 1) {
      for (let cy = row; cy < row + rows; cy += 1) set.add(idx(cx, cy));
    }
  });
  return set;
}

function terrainCells() {
  const set = new Set();
  FLOOR_SPANS.forEach(({ from, to }) => {
    for (let cx = from; cx < to; cx += 1) {
      for (let cy = FLOOR_ROW; cy < GRID.h; cy += 1) set.add(idx(cx, cy));
    }
  });
  return set;
}

// ------------------------------------------------------------------ plates
export const plateCell = (c, r) => r * PLATE_GRID.cols + c;

export function rectPlateCells(rect) {
  const cells = [];
  if (!rect) return cells;
  for (let c = rect.c; c < rect.c + rect.w; c += 1) {
    for (let r = rect.r; r < rect.r + rect.h; r += 1) cells.push(plateCell(c, r));
  }
  return cells;
}

export function createPaintedCar() {
  const terrain = terrainCells();
  const sealed = rectCells(SEALED_RECTS);

  const state = {
    painted: new Set(),
    blocks: rectCells(BLOCK_RECTS),
    pigment: PIGMENT_ZONE.start,
    seen: new Set(),
    plates: {},
    door: { chosen: null, solved: false, wrongTries: 0, lastHint: null },
    complete: false,
    // No wrong answer ends the run; kept false for QA snapshots.
    killed: false,
    falls: 0,
    events: [],
  };

  const emit = (type, payload = {}) => state.events.push({ type, ...payload });
  // One puzzle board per plate; its events carry the plate's id.
  PAINTINGS.forEach((plate) => {
    state.plates[plate.id] = {
      developed: false,
      board: createThreadBoard(plate.board, { emit: (type, payload) => emit(type, { id: plate.id, ...payload }) }),
    };
  });

  const inBounds = (cx, cy) => cx >= 0 && cy >= 0 && cx < GRID.w && cy < GRID.h;
  const isTerrain = (cx, cy) => terrain.has(idx(cx, cy));
  const isSealed = (cx, cy) => sealed.has(idx(cx, cy));
  const isBlock = (cx, cy) => state.blocks.has(idx(cx, cy));
  const isPainted = (cx, cy) => state.painted.has(idx(cx, cy));
  const inPigmentZone = (cx) => cx >= PIGMENT_ZONE.fromCol;
  const isSolid = (cx, cy) =>
    inBounds(cx, cy) && (isTerrain(cx, cy) || isBlock(cx, cy) || isPainted(cx, cy));

  function paintRefusal(cx, cy) {
    if (!inBounds(cx, cy)) return 'off-sheet';
    if (isSealed(cx, cy)) return 'sealed';
    if (isSolid(cx, cy)) return 'already-solid';
    if (state.painted.size >= MAX_PAINTED) return 'sheet-full';
    if (inPigmentZone(cx) && state.pigment <= 0) return 'no-pigment';
    return null;
  }

  const canPaint = (cx, cy) => paintRefusal(cx, cy) === null;

  function paint(cx, cy) {
    const refusal = paintRefusal(cx, cy);
    if (refusal) {
      emit('paint-refused', { cx, cy, reason: refusal });
      return false;
    }
    state.painted.add(idx(cx, cy));
    if (inPigmentZone(cx)) state.pigment -= 1;
    emit('painted', { cx, cy, pigment: state.pigment });
    return true;
  }

  const canWash = (cx, cy) => inBounds(cx, cy) && !isSealed(cx, cy)
    && (isPainted(cx, cy) || isBlock(cx, cy));

  // Your own paint first, then the archive's grey. The floor is the carriage
  // and is never the player's to undo.
  function wash(cx, cy) {
    if (!inBounds(cx, cy)) return false;
    const key = idx(cx, cy);
    if (isSealed(cx, cy)) {
      emit('wash-refused', { cx, cy, reason: 'sealed' });
      return false;
    }
    if (state.painted.delete(key)) {
      if (inPigmentZone(cx)) state.pigment += 1;
      emit('unpainted', { cx, cy, pigment: state.pigment });
      return true;
    }
    if (state.blocks.delete(key)) {
      if (inPigmentZone(cx)) {
        state.pigment += PIGMENT_ZONE.perGrey ?? 1;
        emit('pigment-recovered', { cx, cy, pigment: state.pigment });
      }
      emit('block-washed', { cx, cy });
      return true;
    }
    if (isTerrain(cx, cy)) emit('wash-refused', { cx, cy, reason: 'that-is-the-carriage' });
    return false;
  }

  // ------------------------------------------------------------- the plates
  function pictureInRange(playerX, playerY) {
    return (
      PAINTINGS.find((picture) => {
        const cx = picture.x + picture.w / 2;
        const cy = picture.y + picture.h / 2;
        return Math.hypot(playerX - cx, playerY - cy) <= READ_RADIUS;
      }) ?? null
    );
  }

  const plateSpec = (id) => PAINTINGS.find((plate) => plate.id === id) ?? null;
  const plateState = (id) => state.plates[id] ?? null;
  const plateBoard = (id) => state.plates[id]?.board ?? null;

  function developPlate(id) {
    const plate = plateState(id);
    if (!plate || plate.developed) return false;
    plate.developed = true;
    plate.board.markSolved();
    if (!state.seen.has(id)) {
      state.seen.add(id);
      emit('picture-read', { id });
    }
    emit('plate-developed', { id });
    return true;
  }

  // The plate comes clear the moment its last colour joins and its last
  // square is covered.
  const afterBoard = (id, result) => {
    if (plateBoard(id)?.state.solved) developPlate(id);
    return result;
  };
  const live = (id) => {
    const plate = plateState(id);
    return plate && !plate.developed ? plate.board : null;
  };
  // Press on a dab (or a thread), drag square by square, let go, lift.
  const threadBegin = (id, c, r) => afterBoard(id, live(id)?.begin(c, r) ?? null);
  const threadExtend = (id, c, r) => afterBoard(id, live(id)?.extend(c, r) ?? false);
  const threadRelease = (id) => live(id)?.release();
  const threadClear = (id, c, r) => afterBoard(id, live(id)?.clearAt(c, r) ?? false);

  // Kept for QA and the old API: a plate is read once its colours are joined.
  function readPicture(id) {
    const plate = plateState(id);
    if (!plate) return false;
    if (!plate.developed) {
      emit('picture-locked', { id });
      return false;
    }
    return true;
  }

  const allSeen = () => state.seen.size === PAINTINGS.length;
  const platesDeveloped = () => PAINTINGS.every((plate) => state.plates[plate.id].developed);

  // ---------------------------------------------------------------- the door
  function chooseSign(sign) {
    if (state.door.solved) return { ok: true, reason: 'already-open' };
    if (!platesDeveloped()) {
      emit('door-silent', { seen: state.seen.size, of: PAINTINGS.length });
      return { ok: false, reason: 'not-all-pictures-read' };
    }
    state.door.chosen = sign;
    if (sign === DOOR.correct) {
      state.door.solved = true;
      state.complete = true;
      emit('door-opened', { sign });
      return { ok: true, reason: 'correct' };
    }
    state.door.wrongTries += 1;
    const hint = state.door.wrongTries < 2 ? 'first' : sign === SIGN.ROSE ? 'rosa' : 'gentle';
    state.door.lastHint = hint;
    emit('door-refused', { sign, tries: state.door.wrongTries, hint });
    return { ok: false, reason: 'wrong-sign', hint };
  }

  return {
    state,
    inBounds,
    isTerrain,
    isSealed,
    // The door face used to be called glaze; both names mean "untouchable".
    isGlaze: isSealed,
    isBlock,
    isPainted,
    inPigmentZone,
    isSolid,
    canPaint,
    canWash,
    paintRefusal,
    paint,
    wash,
    pictureInRange,
    plateSpec,
    plateState,
    plateBoard,
    threadBegin,
    threadExtend,
    threadRelease,
    threadClear,
    developPlate,
    readPicture,
    picturesRead: () => PAINTINGS.filter((p) => state.seen.has(p.id)),
    allSeen,
    platesDeveloped,
    chooseSign,
    fell() {
      state.falls += 1;
      emit('fell', { falls: state.falls });
    },
    drainEvents() {
      const events = state.events.slice();
      state.events.length = 0;
      return events;
    },
    snapshot() {
      return {
        painted: state.painted.size,
        blocksLeft: state.blocks.size,
        pigment: { zoneFromCol: PIGMENT_ZONE.fromCol, amount: state.pigment },
        picturesRead: PAINTINGS.map((p) => p.id).filter((id) => state.seen.has(id)),
        allPicturesRead: allSeen(),
        plates: Object.fromEntries(PAINTINGS.map((plate) => {
          const p = state.plates[plate.id];
          const board = p.board.snapshot();
          return [plate.id, {
            developed: p.developed,
            joined: board.joined,
            covered: board.covered,
            cells: board.cells,
            active: board.active,
          }];
        })),
        door: { ...state.door },
        complete: state.complete,
        killed: state.killed,
        falls: state.falls,
      };
    },
  };
}
