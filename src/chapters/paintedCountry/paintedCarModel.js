// Chapter 4 // THE PAINTED COUNTRY — Part I, "Under the gouache", as rules.
//
// Two verbs, both free-hand:
//
//   PAINT — fill a cell. It becomes real paper you can stand on. This is Rosa
//           remembering the place back into existence.
//   WASH  — take something back off the paper: first any varnish, then your
//           own paint, then the archive's grey gouache.
//
// The escalation (see carLayout.js): varnished "official record" cells refuse
// paint until they are washed twice; in Bay C the brush is dry, so paint
// costs pigment that only washing the archive's grey gives back.
//
// The gallery is solved on the plates: each is under grey, and washing it in
// the viewer reveals a large mark and, hidden somewhere else on it, Mara's
// small hawthorn. The door asks which mark she left in all three. A wrong
// mark never kills: after two misses the door names Rosa's rose, or gently
// points back at the plates.

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
  VARNISH_COATS,
  VARNISH_RECTS,
} from './carLayout.js';

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

function createPlateState(plate) {
  const grey = new Set();
  for (let i = 0; i < PLATE_GRID.cols * PLATE_GRID.rows; i += 1) grey.add(i);
  // On a plate the grey is itself one wash, so the varnish over it is one
  // coat: an official-record cell takes two washes in all, like the air.
  const varnish = new Map();
  plate.varnishRects.forEach((rect) => rectPlateCells(rect).forEach((cell) => varnish.set(cell, VARNISH_COATS - 1)));
  return { grey, varnish, markFound: false, hawthornFound: false, developed: false };
}

export function createPaintedCar() {
  const terrain = terrainCells();
  const sealed = rectCells(SEALED_RECTS);

  const state = {
    painted: new Set(),
    blocks: rectCells(BLOCK_RECTS),
    varnish: new Map([...rectCells(VARNISH_RECTS)].map((key) => [key, VARNISH_COATS])),
    pigment: PIGMENT_ZONE.start,
    seen: new Set(),
    plates: Object.fromEntries(PAINTINGS.map((plate) => [plate.id, createPlateState(plate)])),
    door: { chosen: null, solved: false, wrongTries: 0, lastHint: null },
    complete: false,
    // No wrong answer ends the run; kept false for QA snapshots.
    killed: false,
    falls: 0,
    events: [],
  };

  const emit = (type, payload = {}) => state.events.push({ type, ...payload });

  const inBounds = (cx, cy) => cx >= 0 && cy >= 0 && cx < GRID.w && cy < GRID.h;
  const isTerrain = (cx, cy) => terrain.has(idx(cx, cy));
  const isSealed = (cx, cy) => sealed.has(idx(cx, cy));
  const isBlock = (cx, cy) => state.blocks.has(idx(cx, cy));
  const isPainted = (cx, cy) => state.painted.has(idx(cx, cy));
  const varnishAt = (cx, cy) => state.varnish.get(idx(cx, cy)) ?? 0;
  const isVarnished = (cx, cy) => varnishAt(cx, cy) > 0;
  const inPigmentZone = (cx) => cx >= PIGMENT_ZONE.fromCol;
  const isSolid = (cx, cy) =>
    inBounds(cx, cy) && (isTerrain(cx, cy) || isBlock(cx, cy) || isPainted(cx, cy));

  function paintRefusal(cx, cy) {
    if (!inBounds(cx, cy)) return 'off-sheet';
    if (isSealed(cx, cy)) return 'sealed';
    if (isVarnished(cx, cy)) return 'varnished';
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
    && (isVarnished(cx, cy) || isPainted(cx, cy) || isBlock(cx, cy));

  // Varnish first, then your own paint, then the archive's grey. The floor is
  // the carriage and is never the player's to undo.
  function wash(cx, cy) {
    if (!inBounds(cx, cy)) return false;
    const key = idx(cx, cy);
    if (isSealed(cx, cy)) {
      emit('wash-refused', { cx, cy, reason: 'sealed' });
      return false;
    }
    const coats = varnishAt(cx, cy);
    if (coats > 0) {
      if (coats > 1) state.varnish.set(key, coats - 1);
      else state.varnish.delete(key);
      emit(coats > 1 ? 'varnish-thinned' : 'varnish-stripped', { cx, cy, coatsLeft: coats - 1 });
      return true;
    }
    if (state.painted.delete(key)) {
      if (inPigmentZone(cx)) state.pigment += 1;
      emit('unpainted', { cx, cy, pigment: state.pigment });
      return true;
    }
    if (state.blocks.delete(key)) {
      if (inPigmentZone(cx)) {
        state.pigment += 1;
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
  const cellClear = (plate, cell) => !plate.grey.has(cell) && !plate.varnish.has(cell);
  const rectClear = (plate, rect) => rectPlateCells(rect).every((cell) => cellClear(plate, cell));

  function developPlate(id) {
    const plate = plateState(id);
    if (!plate || plate.developed) return false;
    plate.developed = true;
    plate.grey.clear();
    plate.varnish.clear();
    if (!state.seen.has(id)) {
      state.seen.add(id);
      emit('picture-read', { id });
    }
    emit('plate-developed', { id });
    return true;
  }

  function checkPlate(id) {
    const spec = plateSpec(id);
    const plate = plateState(id);
    if (!plate.markFound && rectClear(plate, spec.markRect)) {
      plate.markFound = true;
      emit('plate-mark-found', { id, sign: spec.primarySign });
    }
    if (!plate.hawthornFound && rectClear(plate, spec.hawthornRect)) {
      plate.hawthornFound = true;
      emit('plate-hawthorn-found', { id });
    }
    if (plate.markFound && plate.hawthornFound) developPlate(id);
  }

  // One brush-cell of washing on a plate. Returns 'thinned', 'washed' or null.
  function washPlate(id, c, r) {
    const spec = plateSpec(id);
    const plate = plateState(id);
    if (!spec || !plate || plate.developed) return null;
    if (c < 0 || r < 0 || c >= PLATE_GRID.cols || r >= PLATE_GRID.rows) return null;
    const cell = plateCell(c, r);
    const coats = plate.varnish.get(cell) ?? 0;
    let result = null;
    if (coats > 0) {
      if (coats > 1) plate.varnish.set(cell, coats - 1);
      else plate.varnish.delete(cell);
      emit('plate-varnish-thinned', { id, c, r, coatsLeft: coats - 1 });
      result = 'thinned';
    } else if (plate.grey.delete(cell)) {
      result = 'washed';
    }
    if (result) checkPlate(id);
    return result;
  }

  // Kept for QA and the old API: reading a plate is washing it to its marks.
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
    isVarnished,
    varnishAt,
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
    washPlate,
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
        varnishLeft: state.varnish.size,
        pigment: { zoneFromCol: PIGMENT_ZONE.fromCol, amount: state.pigment },
        picturesRead: PAINTINGS.map((p) => p.id).filter((id) => state.seen.has(id)),
        allPicturesRead: allSeen(),
        plates: Object.fromEntries(PAINTINGS.map((plate) => {
          const p = state.plates[plate.id];
          return [plate.id, {
            greyLeft: p.grey.size,
            varnishLeft: p.varnish.size,
            markFound: p.markFound,
            hawthornFound: p.hawthornFound,
            developed: p.developed,
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
