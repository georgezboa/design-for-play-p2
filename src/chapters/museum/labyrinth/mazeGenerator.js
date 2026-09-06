// Wing-based maze for the Labyrinth Wing.
//
// Each wing in WINGS (labyrinthData.js) is its OWN independently-generated
// perfect-plus-loops maze — same randomized recursive backtracker as a
// single-maze design would use, just run once per wing. Wings are then
// composited into one big world grid, sharing their border with adjacent
// wings (which comes pre-sealed, since a maze's outer ring is never carved)
// so nothing crosses between wings except through a single connector cell
// that this module explicitly opens and then re-locks. LabyrinthScene owns
// unlocking it at runtime once the player has enough keys — that's the
// "advance from scene to scene" progression, without ever leaving one
// continuous, freely-walked labyrinth.

import { CELL, WING_ROOMS_X, WING_ROOMS_Y, LOCAL_W, LOCAL_H, WINGS, GRID_W, GRID_H } from './labyrinthData.js';
import { buildSolvableMovingMazeStates, cloneWalls } from './wingMechanics.js';

function shuffled(arr, rng) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function roomToLocal(rx, ry) {
  return { lx: rx * 2 + 1, ly: ry * 2 + 1 };
}

// One wing's maze, in its own local (LOCAL_W x LOCAL_H) coordinate space.
// Identical algorithm to the original single-maze generator: randomized
// recursive backtracker for a perfect spanning maze, then a loop pass so a
// hunted player always has more than one route out.
function generateLocalMaze(rng) {
  const walls = new Array(LOCAL_H);
  for (let y = 0; y < LOCAL_H; y += 1) walls[y] = new Array(LOCAL_W).fill(true);

  const visited = new Array(WING_ROOMS_Y);
  for (let y = 0; y < WING_ROOMS_Y; y += 1) visited[y] = new Array(WING_ROOMS_X).fill(false);

  for (let ry = 0; ry < WING_ROOMS_Y; ry += 1) {
    for (let rx = 0; rx < WING_ROOMS_X; rx += 1) {
      const { lx, ly } = roomToLocal(rx, ry);
      walls[ly][lx] = false;
    }
  }

  const DIRS = [{ dx: 0, dy: -1 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }, { dx: 1, dy: 0 }];

  function carveEdge(rx, ry, dx, dy) {
    const { lx, ly } = roomToLocal(rx, ry);
    walls[ly + dy][lx + dx] = false;
  }

  const stack = [{ rx: 0, ry: 0 }];
  visited[0][0] = true;
  while (stack.length) {
    const { rx, ry } = stack[stack.length - 1];
    const options = shuffled(DIRS, rng).filter(({ dx, dy }) => {
      const nx = rx + dx;
      const ny = ry + dy;
      return nx >= 0 && nx < WING_ROOMS_X && ny >= 0 && ny < WING_ROOMS_Y && !visited[ny][nx];
    });
    if (!options.length) {
      stack.pop();
      continue;
    }
    const { dx, dy } = options[0];
    carveEdge(rx, ry, dx, dy);
    const nx = rx + dx;
    const ny = ry + dy;
    visited[ny][nx] = true;
    stack.push({ rx: nx, ry: ny });
  }

  const closedEdges = [];
  for (let ry = 0; ry < WING_ROOMS_Y; ry += 1) {
    for (let rx = 0; rx < WING_ROOMS_X; rx += 1) {
      if (rx + 1 < WING_ROOMS_X) closedEdges.push({ rx, ry, dx: 1, dy: 0 });
      if (ry + 1 < WING_ROOMS_Y) closedEdges.push({ rx, ry, dx: 0, dy: 1 });
    }
  }
  const extra = Math.floor(closedEdges.length * 0.14);
  for (const edge of shuffled(closedEdges, rng).slice(0, extra)) {
    const { lx, ly } = roomToLocal(edge.rx, edge.ry);
    walls[ly + edge.dy][lx + edge.dx] = false;
  }

  return walls;
}

// Breadth-first distance/path search over any flat walkable grid. Shared by
// spawn/key placement (things that want to be *far* from an entry point)
// and by statue chase logic (find a path to the player's current cell).
export function bfs(walls, start, goal = null) {
  const w = walls[0].length;
  const h = walls.length;
  const dist = new Array(h * w).fill(-1);
  const prev = new Array(h * w).fill(-1);
  const idx = (x, y) => y * w + x;
  const q = [start];
  dist[idx(start.x, start.y)] = 0;
  let qi = 0;
  while (qi < q.length) {
    const cur = q[qi];
    qi += 1;
    if (goal && cur.x === goal.x && cur.y === goal.y) break;
    for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
      const nx = cur.x + dx;
      const ny = cur.y + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      if (walls[ny][nx]) continue;
      const ni = idx(nx, ny);
      if (dist[ni] !== -1) continue;
      dist[ni] = dist[idx(cur.x, cur.y)] + 1;
      prev[ni] = idx(cur.x, cur.y);
      q.push({ x: nx, y: ny });
    }
  }
  return { dist, prev, w, h };
}

export function reconstructPath(bfsResult, start, goal) {
  const { prev, w } = bfsResult;
  const idx = (x, y) => y * w + x;
  if (bfsResult.dist[idx(goal.x, goal.y)] === -1) return null;
  const path = [];
  let cur = idx(goal.x, goal.y);
  const startIdx = idx(start.x, start.y);
  while (cur !== startIdx) {
    path.push({ x: cur % w, y: Math.floor(cur / w) });
    cur = bfsResult.prev[cur];
    if (cur === -1) return null;
  }
  path.reverse();
  return path;
}

export function cellCenter(cellX, cellY) {
  return { x: cellX * CELL + CELL / 2, y: cellY * CELL + CELL / 2 };
}

export function worldToCell(x, y) {
  return { x: Math.floor(x / CELL), y: Math.floor(y / CELL) };
}

// The single shared-border cell between two adjacent wings — the only
// place a connector can ever be carved, since everything else on that
// border is each wing's own (never-carved) perimeter wall.
function connectorCell(a, b) {
  if (a.row === b.row && Math.abs(a.col - b.col) === 1) {
    const left = a.col < b.col ? a : b;
    const midRoomRow = Math.floor(WING_ROOMS_Y / 2);
    return { x: left.offset.x + (LOCAL_W - 1), y: left.offset.y + (midRoomRow * 2 + 1) };
  }
  if (a.col === b.col && Math.abs(a.row - b.row) === 1) {
    const top = a.row < b.row ? a : b;
    const midRoomCol = Math.floor(WING_ROOMS_X / 2);
    return { x: top.offset.x + (midRoomCol * 2 + 1), y: top.offset.y + (LOCAL_H - 1) };
  }
  throw new Error('Labyrinth Wing: WINGS entries must be grid-adjacent in order.');
}

// The room just inside `wing`, next to a connector cell on its border —
// used as the "you just walked in" reference point for spreading that
// wing's own keys/statues away from its entrance rather than its center.
function entryRoomFor(wing, connector) {
  const lx = connector.x - wing.offset.x;
  const ly = connector.y - wing.offset.y;
  if (lx === 0) return { rx: 0, ry: (ly - 1) / 2 };
  if (lx === LOCAL_W - 1) return { rx: WING_ROOMS_X - 1, ry: (ly - 1) / 2 };
  if (ly === 0) return { rx: (lx - 1) / 2, ry: 0 };
  return { rx: (lx - 1) / 2, ry: WING_ROOMS_Y - 1 };
}

// Picks `count` well-separated far rooms from a local maze, BFS-ranked by
// distance from `fromRoom`. Shared logic for both key and statue placement.
function pickFarRooms(localWalls, fromRoom, count, minSep, exclude = []) {
  const { lx, ly } = roomToLocal(fromRoom.rx, fromRoom.ry);
  const result = bfs(localWalls, { x: lx, y: ly });
  const idx = (x, y) => y * result.w + x;

  const rooms = [];
  for (let ry = 0; ry < WING_ROOMS_Y; ry += 1) {
    for (let rx = 0; rx < WING_ROOMS_X; rx += 1) {
      if (rx === fromRoom.rx && ry === fromRoom.ry) continue;
      if (exclude.some((e) => e.rx === rx && e.ry === ry)) continue;
      const { lx: glx, ly: gly } = roomToLocal(rx, ry);
      const d = result.dist[idx(glx, gly)];
      if (d === -1) continue;
      rooms.push({ rx, ry, d });
    }
  }
  rooms.sort((a, b) => b.d - a.d);

  const picked = [];
  const farHalf = rooms.slice(0, Math.max(1, Math.ceil(rooms.length * 0.7)));
  for (const r of farHalf) {
    if (picked.length >= count) break;
    const tooClose = picked.some((p) => Math.abs(p.rx - r.rx) + Math.abs(p.ry - r.ry) < minSep);
    if (tooClose) continue;
    picked.push(r);
  }
  for (const r of rooms) {
    if (picked.length >= count) break;
    if (picked.includes(r)) continue;
    picked.push(r);
  }
  return picked;
}

// Builds the full multi-wing layout: composited walls, spawn, exit, keys,
// statues, and the gated wing-to-wing connectors (progression order = the
// order wings are listed in WINGS).
export function buildLayout(rng = Math.random) {
  const walls = new Array(GRID_H);
  for (let y = 0; y < GRID_H; y += 1) walls[y] = new Array(GRID_W).fill(true);

  const wings = WINGS.map((w) => ({
    ...w,
    offset: { x: w.col * (LOCAL_W - 1), y: w.row * (LOCAL_H - 1) },
  }));

  const localMazes = {};
  for (const wing of wings) {
    const local = generateLocalMaze(rng);
    localMazes[wing.id] = local;
    for (let ly = 0; ly < LOCAL_H; ly += 1) {
      for (let lx = 0; lx < LOCAL_W; lx += 1) {
        walls[wing.offset.y + ly][wing.offset.x + lx] = local[ly][lx];
      }
    }
  }
  // Wing 4 is two physical floors occupying the same footprint. Room centres
  // are walkable in both generated mazes, which gives every stair a guaranteed
  // safe landing regardless of either floor's corridor topology.
  const lastWing = wings[wings.length - 1];
  const upperLocal = generateLocalMaze(rng);

  const gates = [];
  const keys = [];
  const statues = [];
  const shields = [];
  const stairs = [];
  const fragmentClues = [];
  const wingStarts = [];
  let cumulativeKeys = 0;
  let spawn = null;
  let exit = null;

  for (let i = 0; i < wings.length; i += 1) {
    const wing = wings[i];
    const local = localMazes[wing.id];

    const incoming = i > 0 ? connectorCell(wings[i - 1], wing) : null;
    const entryRoom = incoming ? entryRoomFor(wing, incoming) : { rx: 0, ry: 0 };
    const entryCell = roomToLocal(entryRoom.rx, entryRoom.ry);
    wingStarts[wing.id] = {
      ...cellCenter(wing.offset.x + entryCell.lx, wing.offset.y + entryCell.ly),
      cell: { x: wing.offset.x + entryCell.lx, y: wing.offset.y + entryCell.ly },
      floor: 0,
    };

    if (i === 0) {
      spawn = { x: wingStarts[wing.id].x, y: wingStarts[wing.id].y };
    }

    const isLast = i === wings.length - 1;
    const lowerKeyCount = isLast ? 1 : wing.keys;
    const picked = pickFarRooms(local, entryRoom, lowerKeyCount, 3);
    for (const p of picked) {
      const { lx, ly } = roomToLocal(p.rx, p.ry);
      const gx = wing.offset.x + lx;
      const gy = wing.offset.y + ly;
      keys.push({ ...cellCenter(gx, gy), cell: { x: gx, y: gy }, collected: false, wing: wing.id, floor: 0 });
    }

    const lowerStatueCount = isLast ? 1 : wing.statues;
    const statuePicked = pickFarRooms(local, entryRoom, lowerStatueCount, 3, picked);
    for (const p of statuePicked) {
      const { lx, ly } = roomToLocal(p.rx, p.ry);
      const gx = wing.offset.x + lx;
      const gy = wing.offset.y + ly;
      statues.push({ spawn: cellCenter(gx, gy), spawnCell: { x: gx, y: gy }, wing: wing.id, floor: 0 });
    }

    // Shields: same far-room spread as keys, kept out of key/statue rooms
    // so nothing overlaps and every pickup is its own clean stop.
    const lowerShieldCount = isLast ? 0 : wing.shields;
    const shieldPicked = pickFarRooms(local, entryRoom, lowerShieldCount, 2, picked.concat(statuePicked));
    for (const p of shieldPicked) {
      const { lx, ly } = roomToLocal(p.rx, p.ry);
      const gx = wing.offset.x + lx;
      const gy = wing.offset.y + ly;
      shields.push({ ...cellCenter(gx, gy), cell: { x: gx, y: gy }, collected: false, wing: wing.id, floor: 0 });
    }

    let upperPicked = [];
    let upperStatues = [];
    let upperShields = [];
    if (isLast) {
      const stairRooms = [{ rx: 7, ry: 4 }, { rx: 1, ry: 7 }];
      for (const room of stairRooms) {
        const { lx, ly } = roomToLocal(room.rx, room.ry);
        const gx = wing.offset.x + lx;
        const gy = wing.offset.y + ly;
        stairs.push({ ...cellCenter(gx, gy), cell: { x: gx, y: gy }, wing: wing.id });
      }
      const upperEntry = stairRooms[0];
      upperPicked = pickFarRooms(upperLocal, upperEntry, 1, 3, stairRooms);
      for (const p of upperPicked) {
        const { lx, ly } = roomToLocal(p.rx, p.ry);
        const gx = wing.offset.x + lx;
        const gy = wing.offset.y + ly;
        keys.push({ ...cellCenter(gx, gy), cell: { x: gx, y: gy }, collected: false, wing: wing.id, floor: 1 });
      }
      upperStatues = pickFarRooms(upperLocal, upperEntry, 1, 3, upperPicked.concat(stairRooms));
      for (const p of upperStatues) {
        const { lx, ly } = roomToLocal(p.rx, p.ry);
        const gx = wing.offset.x + lx;
        const gy = wing.offset.y + ly;
        statues.push({ spawn: cellCenter(gx, gy), spawnCell: { x: gx, y: gy }, wing: wing.id, floor: 1 });
      }
      upperShields = pickFarRooms(upperLocal, upperEntry, 1, 2, upperPicked.concat(upperStatues, stairRooms));
      for (const p of upperShields) {
        const { lx, ly } = roomToLocal(p.rx, p.ry);
        const gx = wing.offset.x + lx;
        const gy = wing.offset.y + ly;
        shields.push({ ...cellCenter(gx, gy), cell: { x: gx, y: gy }, collected: false, wing: wing.id, floor: 1 });
      }
    }

    cumulativeKeys += wing.keys;

    if (isLast) {
      // The Looking Fragment seal is on Floor II and deliberately absent from
      // the survey map. Its route is still authored and guaranteed reachable;
      // three world-space eye residues provide the actual guidance.
      const upperEntry = { rx: 1, ry: 7 };
      const [far] = pickFarRooms(
        upperLocal,
        upperEntry,
        1,
        0,
        upperPicked.concat(upperStatues, upperShields, [{ rx: 7, ry: 4 }, { rx: 1, ry: 7 }]),
      );
      const { lx, ly } = roomToLocal(far.rx, far.ry);
      const gx = wing.offset.x + lx;
      const gy = wing.offset.y + ly;
      exit = { ...cellCenter(gx, gy), cell: { x: gx, y: gy }, floor: 1 };

      const stairLocal = roomToLocal(upperEntry.rx, upperEntry.ry);
      const path = reconstructPath(bfs(upperLocal, { x: stairLocal.lx, y: stairLocal.ly }), { x: stairLocal.lx, y: stairLocal.ly }, { x: lx, y: ly }) ?? [];
      const roomsOnPath = path.filter((p) => p.x % 2 === 1 && p.y % 2 === 1);
      const clueIndices = [0.38, 0.68, 0.88].map((t) => Math.min(roomsOnPath.length - 1, Math.max(0, Math.floor(roomsOnPath.length * t))));
      for (const index of new Set(clueIndices)) {
        const p = roomsOnPath[index];
        if (!p) continue;
        const cgx = wing.offset.x + p.x;
        const cgy = wing.offset.y + p.y;
        fragmentClues.push({ ...cellCenter(cgx, cgy), cell: { x: cgx, y: cgy }, floor: 1 });
      }
    } else {
      const next = wings[i + 1];
      const cell = connectorCell(wing, next);
      // Carve it open (the maze algorithm never touches a wing's outer
      // ring, so without this the two wings are simply unreachable from
      // each other), then immediately re-seal it — LabyrinthScene flips it
      // back open at runtime after the first key found in this wing. Keys
      // left behind still count toward the eight-key final exit and can be
      // recovered by backtracking through the now-open connector.
      walls[cell.y][cell.x] = true;
      gates.push({
        cell,
        requiredKeys: cumulativeKeys - wing.keys + 1,
        fromName: wing.name,
        toName: next.name,
        locked: true,
      });
    }
  }

  // Preserve both Last Gallery floors independently. Runtime copies only the
  // fourth-wing footprint into the shared collision grid when a stair is used.
  const lowerWalls = cloneWalls(walls);
  const upperWalls = cloneWalls(walls);
  for (let ly = 0; ly < LOCAL_H; ly += 1) {
    for (let lx = 0; lx < LOCAL_W; lx += 1) {
      upperWalls[lastWing.offset.y + ly][lastWing.offset.x + lx] = upperLocal[ly][lx];
    }
  }

  // Wing 3 cycles through three deterministic, independently connected
  // configurations. Only corridor cells move; every room centre remains in
  // the same connected component in every state.
  const movingWing = wings[2];
  const localMovingStates = buildSolvableMovingMazeStates(localMazes[movingWing.id]);
  const movingStates = localMovingStates.map((state) => ({
    id: state.id,
    changes: state.changes.map((change) => ({
      x: movingWing.offset.x + change.x,
      y: movingWing.offset.y + change.y,
      solid: change.solid,
    })),
  }));
  const movingCells = [];
  const movingIds = new Set();
  for (const state of movingStates) {
    for (const change of state.changes) {
      const id = `${change.x},${change.y}`;
      if (movingIds.has(id)) continue;
      movingIds.add(id);
      movingCells.push({ x: change.x, y: change.y, solid: lowerWalls[change.y][change.x] });
    }
  }
  const movingRouteCells = [];
  for (let ly = 1; ly < LOCAL_H; ly += 2) {
    for (let lx = 1; lx < LOCAL_W; lx += 2) {
      movingRouteCells.push({ x: movingWing.offset.x + lx, y: movingWing.offset.y + ly });
    }
  }

  // Authored light-station density: abundant teaching light, then sharply
  // fewer safe relight points. Last Gallery has two stations on each floor.
  const torchRooms = {
    0: [[0, 0], [2, 1], [4, 2], [6, 1], [8, 3], [6, 5], [3, 6], [1, 8]],
    1: [[8, 4], [6, 1], [3, 4], [1, 7]],
    2: [[4, 0], [7, 4], [2, 7]],
    3: [[8, 4], [2, 6]],
  };
  const torches = [];
  for (const wing of wings) {
    for (const [rx, ry] of torchRooms[wing.id] ?? []) {
      const { lx, ly } = roomToLocal(rx, ry);
      const gx = wing.offset.x + lx;
      const gy = wing.offset.y + ly;
      const center = cellCenter(gx, gy);
      torches.push({ x: center.x - 20, y: center.y - 20, cell: { x: gx, y: gy }, wing: wing.id, floor: 0 });
      if (wing.id === 3) torches.push({ x: center.x + 20, y: center.y - 20, cell: { x: gx, y: gy }, wing: wing.id, floor: 1 });
    }
  }

  return {
    walls: cloneWalls(lowerWalls),
    floorWalls: [lowerWalls, upperWalls],
    spawn,
    spawnCell: worldToCell(spawn.x, spawn.y),
    wingStarts,
    exit,
    exitCell: exit.cell,
    keys,
    statues,
    shields,
    stairs,
    fragmentClues,
    torches,
    movingMaze: {
      wingId: movingWing.id,
      states: movingStates,
      cells: movingCells,
      routeCells: movingRouteCells,
    },
    gates,
    wings: wings.map((w) => ({
      id: w.id,
      name: w.name,
      // World-space bounds (with the shared border cell on each side) used
      // to tell which wing the player is currently standing in.
      bounds: {
        x0: w.offset.x * CELL,
        y0: w.offset.y * CELL,
        x1: (w.offset.x + LOCAL_W - 1) * CELL,
        y1: (w.offset.y + LOCAL_H - 1) * CELL,
      },
    })),
  };
}
