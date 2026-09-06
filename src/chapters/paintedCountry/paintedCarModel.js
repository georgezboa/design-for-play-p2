// Chapter 4 // THE PAINTED COUNTRY — the whole car, as rules.
//
// The player draws ANYWHERE rather than triggering fixed targets. Two verbs,
// both free-hand:
//
//   LEFT  — paint a cell. It becomes real paper you can stand on.
//   RIGHT — wash a cell. It removes your own paint, and eats paper blocks.
//
// Paint appears immediately in any empty, unvarnished cell inside the player's
// brush reach. Players can still build stairs and bridges, but a valid click is
// never rejected merely because the new cell is not touching existing paper.
//
// Varnished cells refuse paint entirely, which is how the car says "not this
// way" without taking the brush out of the player's hand.
//
// There is no pigment, no inventory, no counter and no timer. What the player
// has to work out is the gallery: three pictures hung too high to read from the
// floor, and a door that wants to know which sign was in every one of them.

import {
  BLOCK_RECTS,
  BOARDS,
  CELL,
  DOOR,
  FLOOR_ROW,
  FLOOR_SPANS,
  GLAZE_RECTS,
  GRID,
  PAINTINGS,
  READ_RADIUS,
} from './carLayout.js';

export const CELL_SIZE = CELL;

// A ceiling on painted cells. Not a resource the player spends — it is far
// past anything a real solution needs, and exists only so a stuck mouse button
// cannot fill the car with collision bodies.
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

export function createPaintedCar() {
  const terrain = terrainCells();
  const glaze = rectCells(GLAZE_RECTS);

  const state = {
    painted: new Set(),
    blocks: rectCells(BLOCK_RECTS),
    seen: new Set(),
    // Kept explicit so text QA can prove this is not secretly a resource game.
    paintSupply: 'infinite',
    boards: Object.fromEntries(
      PAINTINGS.map((picture) => {
        const board = BOARDS.find((candidate) => candidate.id === picture.board) ?? BOARDS[0];
        return [
          picture.id,
          {
            cords: Object.fromEntries(board.pairs.map((pair) => [pair.id, []])),
            drawing: null,
          },
        ];
      }),
    ),
    door: { chosen: null, solved: false, wrongTries: 0 },
    complete: false,
    // Kept in the snapshot for compatibility with older QA. The fused chapter
    // no longer erases the whole investigation for one wrong archive answer.
    killed: false,
    falls: 0,
    events: [],
  };

  // `state.board` remains an alias for the first, easiest card so older
  // focused tests and tooling can still inspect the original board.
  state.board = state.boards[PAINTINGS[0].id];

  const emit = (type, payload = {}) => state.events.push({ type, ...payload });

  const inBounds = (cx, cy) => cx >= 0 && cy >= 0 && cx < GRID.w && cy < GRID.h;
  const isTerrain = (cx, cy) => terrain.has(idx(cx, cy));
  const isGlaze = (cx, cy) => glaze.has(idx(cx, cy));
  const isBlock = (cx, cy) => state.blocks.has(idx(cx, cy));
  const isPainted = (cx, cy) => state.painted.has(idx(cx, cy));
  const isSolid = (cx, cy) =>
    inBounds(cx, cy) && (isTerrain(cx, cy) || isBlock(cx, cy) || isPainted(cx, cy));

  function paintRefusal(cx, cy) {
    if (!inBounds(cx, cy)) return 'off-sheet';
    if (isGlaze(cx, cy)) return 'varnished';
    if (isSolid(cx, cy)) return 'already-solid';
    if (state.painted.size >= MAX_PAINTED) return 'sheet-full';
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
    emit('painted', { cx, cy });
    return true;
  }

  // A wash takes back the player's own paint, and eats paper blocks. It can
  // never remove the carriage itself — the floor is not the player's to undo.
  const canWash = (cx, cy) => inBounds(cx, cy) && (isPainted(cx, cy) || isBlock(cx, cy));

  function wash(cx, cy) {
    if (!inBounds(cx, cy)) return false;
    const key = idx(cx, cy);
    if (state.painted.delete(key)) {
      emit('unpainted', { cx, cy });
      return true;
    }
    if (state.blocks.delete(key)) {
      emit('block-washed', { cx, cy });
      return true;
    }
    if (isTerrain(cx, cy)) emit('wash-refused', { cx, cy, reason: 'that-is-the-carriage' });
    return false;
  }

  // Getting close enough to a plate to take it off the wall and look at it,
  // which is only possible standing on something the player built.
  function pictureInRange(playerX, playerY) {
    return (
      PAINTINGS.find((picture) => {
        const cx = picture.x + picture.w / 2;
        const cy = picture.y + picture.h / 2;
        return Math.hypot(playerX - cx, playerY - cy) <= READ_RADIUS;
      }) ?? null
    );
  }

  function readPicture(id) {
    const picture = PAINTINGS.find((p) => p.id === id);
    if (!picture) return false;
    if (!boardSolved(picture.id)) {
      emit('picture-locked', { id: picture.id });
      return false;
    }
    if (!state.seen.has(id)) {
      state.seen.add(id);
      emit('picture-read', { id });
    }
    return true;
  }

  const allSeen = () => state.seen.size === PAINTINGS.length;

  // ------------------------------------------------------- the color-link boards
  const pictureForBoard = (value) =>
    PAINTINGS.find((picture) => picture.id === value || picture.board === value) ?? PAINTINGS[0];
  const boardForPicture = (pictureId) => {
    const picture = pictureForBoard(pictureId);
    return BOARDS.find((board) => board.id === picture.board) ?? BOARDS[0];
  };
  const boardStateFor = (pictureId) => state.boards[pictureForBoard(pictureId).id];

  // The optional picture id keeps the original two-number API working for the
  // first card while allowing the scene to route input to any archive.
  const boardCall = (pictureIdOrC, maybeC, maybeR) =>
    typeof pictureIdOrC === 'string'
      ? { pictureId: pictureForBoard(pictureIdOrC).id, c: maybeC, r: maybeR }
      : { pictureId: PAINTINGS[0].id, c: pictureIdOrC, r: maybeC };

  const inBoard = (pictureIdOrC, maybeC, maybeR) => {
    const { pictureId, c, r } = boardCall(pictureIdOrC, maybeC, maybeR);
    const board = boardForPicture(pictureId);
    return c >= 0 && r >= 0 && c < board.cols && r < board.rows;
  };
  const isTorn = (pictureIdOrC, maybeC, maybeR) => {
    const { pictureId, c, r } = boardCall(pictureIdOrC, maybeC, maybeR);
    return boardForPicture(pictureId).torn.some(([tc, tr]) => tc === c && tr === r);
  };
  const endpointAt = (pictureIdOrC, maybeC, maybeR) => {
    const { pictureId, c, r } = boardCall(pictureIdOrC, maybeC, maybeR);
    const pair = boardForPicture(pictureId).pairs.find(
      (candidate) =>
        (candidate.a[0] === c && candidate.a[1] === r) ||
        (candidate.b[0] === c && candidate.b[1] === r),
    );
    return pair ? pair.id : null;
  };
  const cordCovering = (pictureIdOrC, maybeC, maybeR) => {
    const { pictureId, c, r } = boardCall(pictureIdOrC, maybeC, maybeR);
    const current = boardStateFor(pictureId);
    return (
      boardForPicture(pictureId).pairs.find((pair) =>
        current.cords[pair.id].some(([cc, rr]) => cc === c && rr === r),
      )?.id ?? null
    );
  };

  const cordComplete = (pictureIdOrPairId, maybePairId) => {
    const pictureId = maybePairId === undefined ? PAINTINGS[0].id : pictureForBoard(pictureIdOrPairId).id;
    const pairId = maybePairId === undefined ? pictureIdOrPairId : maybePairId;
    const board = boardForPicture(pictureId);
    const current = boardStateFor(pictureId);
    const pair = board.pairs.find((candidate) => candidate.id === pairId);
    const cord = current.cords[pairId];
    if (!pair || cord.length < 2) return false;
    const [sc, sr] = cord[0];
    const [ec, er] = cord[cord.length - 1];
    const isA = sc === pair.a[0] && sr === pair.a[1];
    const isB = ec === pair.b[0] && er === pair.b[1];
    const isBA = sc === pair.b[0] && sr === pair.b[1] && ec === pair.a[0] && er === pair.a[1];
    return (isA && isB) || isBA;
  };

  const boardSolved = (pictureId = PAINTINGS[0].id) => {
    const id = pictureForBoard(pictureId).id;
    return boardForPicture(id).pairs.every((pair) => cordComplete(id, pair.id));
  };
  const boardsSolved = () => PAINTINGS.every((picture) => boardSolved(picture.id));

  // Begin a cord. Grabbing either end of a pair starts that pair again from
  // scratch, so a tangle is undone by simply redrawing it.
  function boardBegin(pictureIdOrC, maybeC, maybeR) {
    const { pictureId, c, r } = boardCall(pictureIdOrC, maybeC, maybeR);
    if (!inBoard(pictureId, c, r)) return null;
    const pairId = endpointAt(pictureId, c, r);
    if (!pairId) return null;
    const current = boardStateFor(pictureId);
    current.cords[pairId] = [[c, r]];
    current.drawing = pairId;
    emit('cord-started', { pictureId, pair: pairId });
    return pairId;
  }

  function boardExtend(pictureIdOrC, maybeC, maybeR) {
    const { pictureId, c, r } = boardCall(pictureIdOrC, maybeC, maybeR);
    const current = boardStateFor(pictureId);
    const board = boardForPicture(pictureId);
    const pairId = current.drawing;
    if (!pairId || !inBoard(pictureId, c, r) || isTorn(pictureId, c, r)) return false;
    const cord = current.cords[pairId];
    const [lc, lr] = cord[cord.length - 1];
    if (lc === c && lr === r) return false;

    // Dragging back over yourself shortens the cord — the natural way to fix a
    // wrong turn without starting over.
    if (cord.length >= 2) {
      const [pc, pr] = cord[cord.length - 2];
      if (pc === c && pr === r) {
        cord.pop();
        return true;
      }
    }
    if (Math.abs(c - lc) + Math.abs(r - lr) !== 1) return false;

    const occupant = cordCovering(pictureId, c, r);
    if (occupant) {
      if (occupant !== pairId) emit('cord-blocked', { pair: pairId, by: occupant });
      return false;
    }
    const endpoint = endpointAt(pictureId, c, r);
    if (endpoint && endpoint !== pairId) {
      emit('cord-blocked', { pair: pairId, by: endpoint });
      return false;
    }

    cord.push([c, r]);
    if (cordComplete(pictureId, pairId)) {
      current.drawing = null;
      emit('cord-joined', { pictureId, pair: pairId });
      if (boardSolved(pictureId)) emit('board-solved', { pictureId, board: board.id });
    }
    return true;
  }

  // Letting go part-way leaves nothing behind: a half-drawn cord would only sit
  // in the way of the next attempt.
  function boardRelease(pictureId = PAINTINGS[0].id) {
    const id = pictureForBoard(pictureId).id;
    const current = boardStateFor(id);
    const pairId = current.drawing;
    current.drawing = null;
    if (!pairId) return;
    if (!cordComplete(id, pairId)) current.cords[pairId] = [];
  }

  function boardClearAt(pictureIdOrC, maybeC, maybeR) {
    const { pictureId, c, r } = boardCall(pictureIdOrC, maybeC, maybeR);
    const pairId = cordCovering(pictureId, c, r);
    if (!pairId) return false;
    boardStateFor(pictureId).cords[pairId] = [];
    emit('cord-pulled', { pictureId, pair: pairId });
    return true;
  }

  // The door will not answer a player who has not looked at the pictures. That
  // is the difference between solving it and guessing it one sign in four.
  function chooseSign(sign) {
    if (state.door.solved) return { ok: true, reason: 'already-open' };
    // The board is a shutter over the signs: until it is threaded there is
    // physically nothing to press.
    if (!boardsSolved()) {
      emit('door-dark');
      return { ok: false, reason: 'board-not-threaded' };
    }
    if (!allSeen()) {
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
    emit('door-refused', { sign, tries: state.door.wrongTries });
    return { ok: false, reason: 'wrong-sign' };
  }

  return {
    state,
    inBounds,
    isTerrain,
    isGlaze,
    isBlock,
    isPainted,
    isSolid,
    canPaint,
    canWash,
    paintRefusal,
    paint,
    wash,
    pictureInRange,
    readPicture,
    picturesRead: () => PAINTINGS.filter((p) => state.seen.has(p.id)),
    allSeen,
    chooseSign,
    inBoard,
    isTorn,
    endpointAt,
    cordCovering,
    cordComplete,
    boardSolved,
    boardBegin,
    boardExtend,
    boardRelease,
    boardClearAt,
    boardSpec: (pictureId) => boardForPicture(pictureId),
    boardState: (pictureId) => boardStateFor(pictureId),
    boardsSolved,
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
        paintSupply: state.paintSupply,
        painted: state.painted.size,
        blocksLeft: state.blocks.size,
        picturesRead: PAINTINGS.map((p) => p.id).filter((id) => state.seen.has(id)),
        allPicturesRead: allSeen(),
        boards: Object.fromEntries(
          PAINTINGS.map((picture) => [
            picture.id,
            {
              solved: boardSolved(picture.id),
              joined: boardForPicture(picture.id).pairs
                .filter((pair) => cordComplete(picture.id, pair.id))
                .map((pair) => pair.id),
              drawing: boardStateFor(picture.id).drawing,
            },
          ]),
        ),
        board: {
          solved: boardSolved(PAINTINGS[0].id),
          joined: BOARDS[0].pairs.filter((p) => cordComplete(PAINTINGS[0].id, p.id)).map((p) => p.id),
          drawing: state.board.drawing,
        },
        door: { ...state.door },
        complete: state.complete,
        killed: state.killed,
        falls: state.falls,
      };
    },
  };
}
