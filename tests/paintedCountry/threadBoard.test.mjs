import test from 'node:test';
import assert from 'node:assert/strict';
import { createThreadBoard, solveThreadBoard } from '../../src/chapters/paintedCountry/threadBoard.js';

// Round 11, Part I: the plates are colour puzzles (threadBoard.js). Join each
// pair of Rosa's colours square by square; threads never cross; cover every
// square. These are the rules the gallery's three boards are built on.

const LINE3 = { cols: 3, rows: 1, pairs: [{ id: 'red', a: [0, 0], b: [2, 0] }] };
const TWO = {
  cols: 3,
  rows: 2,
  pairs: [{ id: 'red', a: [0, 0], b: [2, 0] }, { id: 'blue', a: [0, 1], b: [2, 1] }],
};

function draw(board, path) {
  board.begin(...path[0]);
  path.slice(1).forEach(([c, r]) => board.extend(c, r));
  board.release();
}

test('a thread runs square by square from a dab to its match, never diagonally', () => {
  const events = [];
  const board = createThreadBoard(LINE3, { emit: (type) => events.push(type) });
  assert.equal(board.begin(1, 0), null, 'an empty square is not a dab');
  assert.equal(board.begin(0, 0), 'red');
  assert.equal(board.extend(2, 0), false, 'no jumping a square');
  assert.equal(board.extend(1, 0), true);
  assert.equal(board.extend(2, 0), true);
  assert.equal(board.joined('red'), true);
  assert.equal(board.isSolved(), true);
  assert.deepEqual(events, ['thread-started', 'thread-joined', 'board-solved']);
});

test('joining every pair is not enough: every square must be covered', () => {
  const board = createThreadBoard({ cols: 3, rows: 2, pairs: [{ id: 'red', a: [0, 0], b: [2, 0] }] });
  draw(board, [[0, 0], [1, 0], [2, 0]]);
  assert.equal(board.joined('red'), true);
  assert.equal(board.isSolved(), false);
  assert.equal(board.state.solved, false);
});

test("a thread never runs through another colour's dab", () => {
  const events = [];
  const board = createThreadBoard(TWO, { emit: (type) => events.push(type) });
  board.begin(0, 0);
  board.extend(1, 0);
  assert.equal(board.extend(1, 1), true);
  assert.equal(board.extend(0, 1), false, "blue's dab");
  assert.ok(events.includes('thread-blocked'));
});

test('backing up along a thread shortens it; a partial thread waits where it was left', () => {
  const board = createThreadBoard(TWO);
  board.begin(0, 0);
  board.extend(1, 0);
  board.extend(1, 1);
  board.extend(1, 0);
  assert.deepEqual(board.state.paths.red, [[0, 0], [1, 0]]);
  board.release();
  assert.deepEqual(board.state.paths.red, [[0, 0], [1, 0]], 'letting go keeps it');
  // picking it up again at its end carries on from there
  assert.equal(board.begin(1, 0), 'red');
  board.extend(2, 0);
  assert.equal(board.joined('red'), true);
});

test('running into another thread cuts it back, and backing out gives it back', () => {
  const board = createThreadBoard(TWO);
  draw(board, [[0, 1], [1, 1]]);
  board.begin(0, 0);
  board.extend(1, 0);
  board.extend(1, 1); // through blue's partial thread
  assert.deepEqual(board.state.paths.blue, [[0, 1]]);
  board.extend(1, 0); // back out
  assert.deepEqual(board.state.paths.blue, [[0, 1], [1, 1]]);
  board.release();
});

test('lifting a thread clears it; picking up a dab starts its colour afresh', () => {
  const board = createThreadBoard(TWO);
  draw(board, [[0, 0], [1, 0], [2, 0]]);
  assert.equal(board.clearAt(1, 0), true);
  assert.deepEqual(board.state.paths.red, []);
  draw(board, [[0, 0], [1, 0]]);
  board.begin(2, 0);
  assert.deepEqual(board.state.paths.red, [[2, 0]], 'from the other dab, the colour starts again');
});

test('a solved board takes no more strokes, and the solver finds the one answer', () => {
  const board = createThreadBoard(TWO);
  draw(board, [[0, 0], [1, 0], [2, 0]]);
  draw(board, [[0, 1], [1, 1], [2, 1]]);
  assert.equal(board.state.solved, true);
  assert.equal(board.begin(0, 0), null);
  assert.equal(board.clearAt(1, 0), false);
  const solutions = solveThreadBoard(TWO, { limit: 3 });
  assert.equal(solutions.length, 1);
  assert.deepEqual(solutions[0].red, [[0, 0], [1, 0], [2, 0]]);
  // a board with no answer has none
  assert.equal(solveThreadBoard({ cols: 2, rows: 2, pairs: [{ id: 'red', a: [0, 0], b: [1, 1] }, { id: 'blue', a: [1, 0], b: [0, 1] }] }).length, 0);
});

test('a solution laid in by QA solves the board', () => {
  const board = createThreadBoard(TWO);
  assert.equal(board.solveWith(solveThreadBoard(TWO, { limit: 1 })[0]), true);
  assert.equal(board.snapshot().covered, 6);
});
