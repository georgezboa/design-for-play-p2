// Chapter 6 · the order of the set pieces (round 12), and a movement in play.
//
// Each movement is one or two set pieces in one world; a piece hands to the
// next without a menu (the stage moves the camera: through a tunnel, up the
// tower, down to the stones). His ticket is 400: 100 a movement, split
// between its pieces; Movement IV leaves the last 12 to the night service.

import { createDeathLedger, DEFAULT_DIFFICULTY } from '../finaleModel.js';
import { createPieceRunner } from './kernel.js';
import { createRoofRun } from './roofRun.js';
import { createReturnToSender } from './returnToSender.js';
import { createBellRooftops } from './bellRooftops.js';
import { createBellTower } from './bellTower.js';
import { createFalseClaims } from './falseClaims.js';
import { createStandoff } from './standoff.js';
import { createPaintedLine } from './paintedLine.js';

export const SET_PIECES = Object.freeze([
  Object.freeze([
    Object.freeze({ id: 'roof-run', name: 'THE ROOF RUN', share: 40, make: createRoofRun, view: 'side', seed: 11 }),
    Object.freeze({ id: 'return-to-sender', name: 'RETURN TO SENDER', share: 60, make: createReturnToSender, view: 'duel', seed: 13 }),
  ]),
  Object.freeze([
    Object.freeze({ id: 'on-the-bell', name: 'ON THE BELL', share: 50, make: createBellRooftops, view: 'rooftops', seed: 17 }),
    Object.freeze({ id: 'bell-tower', name: 'THE BELL TOWER', share: 50, make: createBellTower, view: 'tower', seed: 19 }),
  ]),
  Object.freeze([
    Object.freeze({ id: 'false-claims', name: 'FALSE CLAIMS', share: 55, make: createFalseClaims, view: 'top', seed: 23 }),
    Object.freeze({ id: 'standoff', name: 'THE STANDOFF', share: 45, make: createStandoff, view: 'standoff', seed: 29 }),
  ]),
  Object.freeze([
    Object.freeze({ id: 'painted-line', name: 'THE PAINTED LINE', share: 88, make: createPaintedLine, view: 'rail', seed: 31 }),
  ]),
]);

// The night service takes his last 12 (PAINT_MOVEMENT_DRAIN = 88).
export const NIGHT_SERVICE_SHARE = 12;
export const MOVEMENT_TICKET = 100;

export const pieceSpec = (movement, index) => SET_PIECES[movement]?.[index] ?? null;
export const pieceCount = (movement) => SET_PIECES[movement]?.length ?? 0;
export const findPiece = (id) => {
  for (const [movement, list] of SET_PIECES.entries()) {
    const index = list.findIndex((p) => p.id === id);
    if (index >= 0) return { movement, index, spec: list[index] };
  }
  return null;
};

// One movement in play: its current piece and Butch's layers (kept from
// piece to piece). The stage calls next() once it has played the hand-off.
export function createMovementRun({ movement = 0, difficulty = DEFAULT_DIFFICULTY, ledger = createDeathLedger(), seed = 0, startPiece = 0, startSegment = 0 } = {}) {
  const list = SET_PIECES[movement];
  if (!list) throw new Error(`movement ${movement}: no set pieces`);
  let index = Math.min(Math.max(0, startPiece), list.length - 1);
  let difficultyId = difficulty;
  const make = (i, segment = 0) => list[i].make({ difficulty: difficultyId, seed: list[i].seed + seed, startSegment: segment });
  let piece = make(index, startSegment);
  const runner = createPieceRunner({ piece, difficulty, ledger, movement });
  const run = {
    movement,
    runner,
    get piece() { return runner.piece; },
    get index() { return index; },
    get spec() { return list[index]; },
    get count() { return list.length; },
    get last() { return index === list.length - 1; },
    // The movement's ticket consumed, 0..100.
    ticket() {
      const done = list.slice(0, index).reduce((sum, p) => sum + p.share, 0);
      return done + list[index].share * runner.piece.seg.ticket();
    },
    step(dt, input) { return runner.step(dt, input); },
    // The next piece (false when this was the last).
    next() {
      if (index >= list.length - 1) return false;
      index += 1;
      piece = make(index);
      runner.adopt(piece);
      return true;
    },
    // DEV / tests: go straight to a piece and segment.
    jump(pieceIndex, segment = 0) {
      index = Math.min(Math.max(0, pieceIndex), list.length - 1);
      piece = make(index, segment);
      runner.adopt(piece);
    },
    setDifficulty(id) { difficultyId = id; runner.setDifficulty(id); },
  };
  return run;
}

// Tests and the QA notes: play a whole movement, piece after piece, with a
// bot. Returns the time, deaths and hits, and each piece's own numbers.
export function simulateMovement({ movement, difficulty = DEFAULT_DIFFICULTY, bot, maxSeconds = 900, dt = 1 / 60, seed = 0, onEvent = null } = {}) {
  const run = createMovementRun({ movement, difficulty, seed });
  const pieces = [];
  let time = 0;
  let pieceStart = 0;
  let finished = false;
  while (time < maxSeconds && !finished) {
    const input = bot.decide(run.piece, dt);
    const events = run.step(dt, input);
    time += dt;
    for (const e of events) {
      onEvent?.(e, run, time);
      if (e.type === 'finished') {
        pieces.push({ id: run.spec.id, time: +(time - pieceStart).toFixed(1) });
        pieceStart = time;
        if (!run.next()) finished = true;
      }
    }
  }
  return { finished, time: +time.toFixed(1), deaths: run.runner.deaths, hits: run.runner.hits, pieces, ticket: run.ticket() };
}
