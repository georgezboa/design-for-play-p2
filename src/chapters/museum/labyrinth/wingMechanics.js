// Pure level-rule helpers for the Labyrinth Wing difficulty curve.
// Kept engine-free so generation and tests can prove that every moving-maze
// state remains completable before Phaser ever paints a tile.

const DIRS = [[0, -1], [0, 1], [-1, 0], [1, 0]];

// Four passage swaps means eight corridor cells visibly change on every
// non-zero layout. That is large enough to read as a moving *section* of the
// maze rather than one door silently trading places with another.
export const MOVING_MAZE_CHANGES_PER_STATE = 8;

export function cloneWalls(walls) {
  return walls.map((row) => row.slice());
}

export function reachableCells(walls, start) {
  const h = walls.length;
  const w = walls[0]?.length ?? 0;
  const seen = new Set();
  if (!start || walls[start.y]?.[start.x] !== false) return seen;
  const q = [start];
  seen.add(`${start.x},${start.y}`);
  for (let i = 0; i < q.length; i += 1) {
    const cur = q[i];
    for (const [dx, dy] of DIRS) {
      const x = cur.x + dx;
      const y = cur.y + dy;
      const id = `${x},${y}`;
      if (x < 0 || y < 0 || x >= w || y >= h || walls[y][x] || seen.has(id)) continue;
      seen.add(id);
      q.push({ x, y });
    }
  }
  return seen;
}

export function allTargetsReachable(walls, targets) {
  if (!targets.length) return true;
  const seen = reachableCells(walls, targets[0]);
  return targets.every((p) => seen.has(`${p.x},${p.y}`));
}

// A moving-wall transition is only fair when the player can still walk from
// their current cell to every authored safe room in that wing.  Checking the
// target layout by itself is not enough: a player can otherwise be left on an
// isolated corridor even though the rooms are connected to one another.
export function playerCanReachTargets(walls, playerCell, targets) {
  const seen = reachableCells(walls, playerCell);
  return seen.size > 0 && targets.every((p) => seen.has(`${p.x},${p.y}`));
}

function corridorCells(walls, solid) {
  const cells = [];
  for (let y = 1; y < walls.length - 1; y += 1) {
    for (let x = 1; x < walls[0].length - 1; x += 1) {
      // Room centres are odd/odd. Only passage cells are allowed to move,
      // so no key, stair, statue post, or player-safe room can become a wall.
      if ((x % 2 === 0) === (y % 2 === 0)) continue;
      if (walls[y][x] === solid) cells.push({ x, y });
    }
  }
  return cells;
}

export function buildSolvableMovingMazeStates(baseWalls) {
  const roomTargets = [];
  for (let y = 1; y < baseWalls.length; y += 2) {
    for (let x = 1; x < baseWalls[0].length; x += 2) roomTargets.push({ x, y });
  }

  const closable = corridorCells(baseWalls, false).filter((cell) => {
    const probe = cloneWalls(baseWalls);
    probe[cell.y][cell.x] = true;
    return allTargetsReachable(probe, roomTargets);
  });
  const openable = corridorCells(baseWalls, true);

  const states = [{ id: 0, changes: [] }];
  const used = new Set();
  for (let stateId = 1; stateId <= 2; stateId += 1) {
    const probe = cloneWalls(baseWalls);
    const changes = [];
    const localUsed = new Set();
    const scoreSpread = (cell) => {
      if (!changes.length) return cell.x + cell.y;
      return Math.min(...changes.map((other) => Math.abs(cell.x - other.x) + Math.abs(cell.y - other.y)));
    };
    const available = (cell) => !used.has(`${cell.x},${cell.y}`) && !localUsed.has(`${cell.x},${cell.y}`);

    for (let pair = 0; pair < MOVING_MAZE_CHANGES_PER_STATE / 2; pair += 1) {
      // Open a blocked corridor far from the previous changes first. Opening
      // can never break connectivity and gives the following closure another
      // route to work with.
      const open = openable
        .filter(available)
        .sort((a, b) => scoreSpread(b) - scoreSpread(a) || a.y - b.y || a.x - b.x)[0];
      if (!open) break;
      probe[open.y][open.x] = false;

      // Close only a corridor that leaves every room centre reachable in the
      // *combined* state, not merely when tested by itself.
      const close = closable
        .filter(available)
        .sort((a, b) => scoreSpread(b) - scoreSpread(a) || a.y - b.y || a.x - b.x)
        .find((cell) => {
          probe[cell.y][cell.x] = true;
          const safe = allTargetsReachable(probe, roomTargets);
          probe[cell.y][cell.x] = false;
          return safe;
        });
      if (!close) {
        probe[open.y][open.x] = true;
        break;
      }

      probe[close.y][close.x] = true;
      localUsed.add(`${open.x},${open.y}`);
      localUsed.add(`${close.x},${close.y}`);
      changes.push({ ...open, solid: false }, { ...close, solid: true });
    }

    if (changes.length !== MOVING_MAZE_CHANGES_PER_STATE) break;
    for (const id of localUsed) used.add(id);
    states.push({ id: stateId, changes });
  }
  return states;
}

export function stateWalls(baseWalls, state) {
  const walls = cloneWalls(baseWalls);
  for (const change of state?.changes ?? []) walls[change.y][change.x] = change.solid;
  return walls;
}

export function stateWouldCrush(state, occupiedCells) {
  return (state?.changes ?? []).some((change) => (
    change.solid && occupiedCells.some((cell) => cell.x === change.x && cell.y === change.y)
  ));
}
