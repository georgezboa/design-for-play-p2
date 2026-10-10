// Chapter 4 // THE PAINTED COUNTRY — Part I's plates, as a puzzle.
//
// Round 11 (George: washing the frames open was fiddly and dull, and the
// "official record" that had to be washed twice felt bad; "a small game like
// before" — the Colour Link cards of 9743530~1). Each plate the archive
// painted grey still has Rosa's colours under it, in pairs: two dabs of the
// same gouache. Draw a thread of colour from each dab to its match. Where a
// thread runs, the grey lifts and her drawing shows through; when every pair
// is joined and no square of grey is left, the plate comes clear.
//
// The rules, one per line (they are the whole tutorial):
//   · drag from a dab; the thread follows square by square, never diagonally;
//   · threads never cross, and never run through another colour's dab;
//   · running into another thread cuts it back (backing out puts it back);
//   · backing up along your own thread shortens it;
//   · the plate is clear when every pair is joined and every square covered.
// Nothing is ever done twice, and nothing can dead-end: any thread can be
// lifted (or simply redrawn), and a partial thread waits where it was left.
//
// Pure: no Phaser. The gallery model (paintedCarModel.js) holds one board per
// plate; the scene feeds it cells.

const same = (a, b) => a && b && a[0] === b[0] && a[1] === b[1];
const adjacent = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) === 1;
const copyPaths = (paths) => Object.fromEntries(Object.entries(paths).map(([id, path]) => [id, path.map((p) => [p[0], p[1]])]));

export function createThreadBoard(spec, { emit = () => {} } = {}) {
  const { cols, rows, pairs } = spec;
  const state = {
    paths: Object.fromEntries(pairs.map((pair) => [pair.id, []])),
    active: null, // the pair being drawn
    base: null, // the other threads as they were when this drag began
    solved: false,
  };

  const inBoard = (c, r) => c >= 0 && r >= 0 && c < cols && r < rows;
  const pairOf = (id) => pairs.find((pair) => pair.id === id) ?? null;
  const dotAt = (c, r) => pairs.find((pair) => same(pair.a, [c, r]) || same(pair.b, [c, r]))?.id ?? null;
  const threadAt = (c, r) => Object.keys(state.paths).find((id) => state.paths[id].some((p) => same(p, [c, r]))) ?? null;

  function joined(id) {
    const pair = pairOf(id);
    const path = state.paths[id];
    if (!pair || path.length < 2) return false;
    const head = path[0];
    const tail = path[path.length - 1];
    return (same(head, pair.a) && same(tail, pair.b)) || (same(head, pair.b) && same(tail, pair.a));
  }

  const covered = () => {
    let n = 0;
    Object.values(state.paths).forEach((path) => { n += path.length; });
    return n;
  };
  const allJoined = () => pairs.every((pair) => joined(pair.id));
  const isSolved = () => allJoined() && covered() === cols * rows;

  function settle() {
    if (!state.solved && isSolved()) {
      state.solved = true;
      state.active = null;
      state.base = null;
      emit('board-solved', {});
    }
  }

  // Lay the active thread over the others: any thread it runs through is
  // cut back to just before the crossing, from the drag's starting picture,
  // so backing out of another thread gives it back.
  function relayOthers() {
    const mine = state.paths[state.active];
    Object.entries(state.base).forEach(([id, path]) => {
      if (id === state.active) return;
      const cut = path.findIndex((p) => mine.some((q) => same(p, q)));
      state.paths[id] = cut < 0 ? path.map((p) => [p[0], p[1]]) : path.slice(0, cut).map((p) => [p[0], p[1]]);
    });
  }

  /** Press on a cell: pick up a dab (starting its thread afresh) or a thread (from that square). */
  function begin(c, r) {
    if (state.solved || !inBoard(c, r)) return null;
    const dot = dotAt(c, r);
    const id = dot ?? threadAt(c, r);
    if (!id) return null;
    const wasJoined = joined(id);
    if (dot) {
      state.paths[id] = [[c, r]];
    } else {
      const path = state.paths[id];
      const at = path.findIndex((p) => same(p, [c, r]));
      state.paths[id] = path.slice(0, at + 1);
    }
    state.active = id;
    state.base = copyPaths(state.paths);
    if (wasJoined) emit('thread-broken', { pair: id });
    emit('thread-started', { pair: id });
    return id;
  }

  /** Drag onto a cell. Returns true if the thread changed. */
  function extend(c, r) {
    const id = state.active;
    if (!id || state.solved || !inBoard(c, r)) return false;
    const path = state.paths[id];
    const last = path[path.length - 1];
    if (same(last, [c, r])) return false;
    // back over itself: shorten to there
    const back = path.findIndex((p) => same(p, [c, r]));
    if (back >= 0) {
      state.paths[id] = path.slice(0, back + 1);
      relayOthers();
      return true;
    }
    if (joined(id)) return false; // done: it only shortens now
    if (!adjacent(last, [c, r])) return false;
    const dot = dotAt(c, r);
    // (its own starting dab is path[0], handled above as a back-up)
    if (dot && dot !== id) {
      emit('thread-blocked', { pair: id, by: dot, c, r });
      return false;
    }
    path.push([c, r]);
    relayOthers();
    if (joined(id)) {
      emit('thread-joined', { pair: id });
      settle();
    }
    return true;
  }

  /** Let go. A partial thread stays where it was left. */
  function release() {
    state.active = null;
    state.base = null;
  }

  /** Lift the thread that covers a cell (or starts at a dab). */
  function clearAt(c, r) {
    if (state.solved || !inBoard(c, r)) return false;
    const id = threadAt(c, r) ?? dotAt(c, r);
    if (!id || !state.paths[id].length) return false;
    state.paths[id] = [];
    if (state.active === id) release();
    emit('thread-lifted', { pair: id });
    return true;
  }

  /** Dev / QA: lay a full solution in. */
  function solveWith(solution) {
    Object.entries(solution).forEach(([id, path]) => { state.paths[id] = path.map((p) => [p[0], p[1]]); });
    release();
    settle();
    return state.solved;
  }

  /** Done for good (a resumed or developed plate). */
  function markSolved() {
    state.active = null;
    state.base = null;
    state.solved = true;
  }

  return {
    spec,
    state,
    inBoard,
    dotAt,
    threadAt,
    joined,
    covered,
    allJoined,
    isSolved,
    begin,
    extend,
    release,
    clearAt,
    solveWith,
    markSolved,
    snapshot() {
      return {
        cols,
        rows,
        solved: state.solved,
        active: state.active,
        joined: pairs.filter((pair) => joined(pair.id)).map((pair) => pair.id),
        covered: covered(),
        cells: cols * rows,
        paths: copyPaths(state.paths),
      };
    },
  };
}

// ------------------------------------------------------------------ solver
// Every way to join all the pairs and cover every square (up to `limit`).
// Used by the tests to prove each board is solvable, and has one answer.
export function solveThreadBoard(spec, { limit = 2 } = {}) {
  const { cols, rows, pairs } = spec;
  const owner = new Array(cols * rows).fill(-1);
  const at = (c, r) => r * cols + c;
  pairs.forEach((pair, i) => { owner[at(...pair.a)] = i; owner[at(...pair.b)] = i; });
  const solutions = [];
  const paths = pairs.map((pair) => [pair.a]);
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  // Every empty square must still be reachable by some unfinished pair, and
  // every unfinished pair must still be able to join.
  function viable(from) {
    for (let i = from; i < pairs.length; i += 1) {
      const head = paths[i][paths[i].length - 1];
      const goal = pairs[i].b;
      const seen = new Set([at(...head)]);
      const queue = [head];
      let found = false;
      while (queue.length && !found) {
        const [c, r] = queue.shift();
        for (const [dc, dr] of dirs) {
          const n = [c + dc, r + dr];
          if (n[0] < 0 || n[1] < 0 || n[0] >= cols || n[1] >= rows) continue;
          const k = at(...n);
          if (seen.has(k)) continue;
          if (same(n, goal)) { found = true; break; }
          if (owner[k] !== -1) continue;
          seen.add(k);
          queue.push(n);
        }
      }
      if (!found) return false;
    }
    return true;
  }

  function walk(i) {
    if (solutions.length >= limit) return;
    if (i === pairs.length) {
      if (owner.every((o) => o !== -1)) solutions.push(paths.map((p) => p.map((q) => [q[0], q[1]])));
      return;
    }
    const path = paths[i];
    const [c, r] = path[path.length - 1];
    for (const [dc, dr] of dirs) {
      const n = [c + dc, r + dr];
      if (n[0] < 0 || n[1] < 0 || n[0] >= cols || n[1] >= rows) continue;
      const k = at(...n);
      if (same(n, pairs[i].b)) {
        path.push(n);
        if (viable(i + 1)) walk(i + 1);
        path.pop();
        continue;
      }
      if (owner[k] !== -1) continue;
      owner[k] = i;
      path.push(n);
      if (viable(i)) walk(i);
      path.pop();
      owner[k] = -1;
      if (solutions.length >= limit) return;
    }
  }

  walk(0);
  return solutions.map((sol) => Object.fromEntries(pairs.map((pair, i) => [pair.id, sol[i]])));
}
