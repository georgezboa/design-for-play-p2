// One statue's behavior for the Labyrinth Wing — a Weeping-Angel-style
// "grandmother's footsteps" stalker:
//
//   FROZEN  — the player currently has it inside their vision cone with a
//             clear line of sight. It does not move at all.
//   HUNTING — the player can't currently see it (out of cone, out of
//             range, or blocked by a wall) and it's within activation
//             range. It paths toward the player's cell and closes in.
//   RETURNING — the chase has stretched past its leash. It walks a real maze
//               path back to its post instead of freezing at the boundary.
//   PATROLLING — outside the chase. It walks between distant rooms instead
//                 of becoming a prop at the end of a dead corridor.
//
// Movement uses a BFS path recomputed periodically, so a hunting statue
// always finds a real route through the maze instead of walking into walls.
// This class only ever DECIDES a velocity — the actual moving, and not
// walking through walls, is Arcade Physics' job: LabyrinthScene gives each
// statue a real physics body and a `physics.add.collider(sprite, wallLayer)`,
// so a hunting statue that reaches its target cell but is fighting a wall
// (a corner it clipped, a moment of overlap) slides along it exactly like
// the player does, instead of needing its own collision math.
//
// `justHit` is likewise not this class's decision anymore — LabyrinthScene
// sets it from a `physics.add.overlap(player, statuesGroup, ...)` callback,
// which Phaser fires during its physics step, BEFORE the scene's own
// update() (and therefore before StatueNPC.update()) runs each frame. So
// this class only ever reads/clears that flag; it must never reset it
// itself, or it would wipe out a hit the overlap already registered this
// same frame.

import { TUNING } from './labyrinthData.js';
import { bfs, reconstructPath, worldToCell, cellCenter } from './mazeGenerator.js';
import { hasLineOfSight } from './collision.js';

export function patrolCellsFor(walls, spawnCell, {
  minSteps = TUNING.statuePatrolMinSteps,
  maxSteps = TUNING.statuePatrolMaxSteps,
} = {}) {
  const result = bfs(walls, spawnCell);
  const cells = [];
  const index = (x, y) => y * result.w + x;
  for (let y = 1; y < result.h - 1; y += 2) {
    for (let x = 1; x < result.w - 1; x += 2) {
      const steps = result.dist[index(x, y)];
      if (steps < minSteps || steps > maxSteps) continue;
      cells.push({ x, y, steps });
    }
  }
  cells.sort((a, b) => b.steps - a.steps || a.y - b.y || a.x - b.x);
  return cells;
}

export class StatueNPC {
  // `sprite` is an Arcade Physics sprite (this.physics.add.sprite(...)) that
  // LabyrinthScene owns and already has a collider against the wall layer —
  // this class reads/writes it and never touches x/y directly itself.
  constructor(walls, spawnCell, spawnPos, id, sprite, patrolWalls = walls) {
    this.walls = walls;
    this.id = id;
    this.spawnCell = spawnCell;
    this.spawnPos = spawnPos;
    this.sprite = sprite;
    this.state = 'patrolling';
    this.path = null;
    this.pathIndex = 0;
    this.repathAt = 0;
    this.seen = false;
    this.justHit = false;
    this.patrolCells = patrolCellsFor(patrolWalls, spawnCell);
    this.patrolGoal = null;
    this.patrolCursor = id % Math.max(1, this.patrolCells.length);
    this.canDamage = false;
  }

  get x() {
    return this.sprite.x;
  }

  get y() {
    return this.sprite.y;
  }

  resetToSpawn() {
    this.sprite.body.reset(this.spawnPos.x, this.spawnPos.y);
    this.canDamage = false;
    this.state = 'patrolling';
    this.path = null;
    this.pathIndex = 0;
    this.patrolGoal = null;
  }

  // Teleport somewhere far from the player after landing a hit, instead of
  // vanishing — keeps the pressure of "it's still out there" without an
  // unfair instant re-hit. body.reset() snaps position AND zeroes velocity
  // in one call, so it doesn't drift on the frame it reappears.
  relocateAwayFrom(playerCell) {
    const best = this.spawnCell;
    const pos = cellCenter(best.x, best.y);
    this.sprite.body.reset(pos.x, pos.y);
    this.canDamage = false;
    this.state = 'patrolling';
    this.path = null;
    this.pathIndex = 0;
    this.repathAt = 0;
    this.patrolGoal = null;
  }

  choosePatrolGoal() {
    const here = worldToCell(this.x, this.y);
    const candidates = this.patrolCells
      .filter((cell) => this.walls[cell.y]?.[cell.x] === false)
      .map((cell) => ({
        ...cell,
        fromHere: Math.abs(cell.x - here.x) + Math.abs(cell.y - here.y),
      }))
      .filter((cell) => cell.fromHere >= TUNING.statuePatrolMinSteps)
      .sort((a, b) => b.fromHere - a.fromHere || b.steps - a.steps || a.y - b.y || a.x - b.x);
    if (!candidates.length) return null;
    const broadPool = candidates.slice(0, Math.min(6, candidates.length));
    const goal = broadPool[this.patrolCursor % broadPool.length];
    this.patrolCursor += 1;
    return { x: goal.x, y: goal.y };
  }

  updatePatrol(time) {
    if (this.patrolGoal) {
      const target = cellCenter(this.patrolGoal.x, this.patrolGoal.y);
      if (Math.hypot(target.x - this.x, target.y - this.y) <= 7) this.patrolGoal = null;
    }
    if (!this.patrolGoal) {
      this.patrolGoal = this.choosePatrolGoal();
      this.path = null;
      this.pathIndex = 0;
      this.repathAt = 0;
    }
    if (!this.patrolGoal) {
      this.sprite.body.setVelocity(0, 0);
      return;
    }
    this.followPathTo(time, this.patrolGoal, TUNING.statuePatrolSpeed);
  }

  update(time, player, context = {}) {
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.hypot(dx, dy);

    // "Seen" = inside the player's forward cone, in range, and unobstructed.
    // The cone vector must point from the PLAYER toward the statue — the
    // naive (player - statue) delta aims the opposite way and inverts the
    // whole "it only moves while you're not looking" rule.
    let seen = false;
    const visionRange = context.visionRange ?? TUNING.visionRange;
    const activationRadius = context.activationRadius ?? TUNING.activationRadius;
    const returnRadius = context.returnRadius ?? Math.max(TUNING.returnRadius, activationRadius * 1.35);
    if (dist <= visionRange) {
      const toStatue = { x: -dx / (dist || 1), y: -dy / (dist || 1) };
      const dot = toStatue.x * player.facing.x + toStatue.y * player.facing.y;
      const coneCos = Math.cos((TUNING.visionConeDeg * Math.PI) / 180);
      if (dot >= coneCos && hasLineOfSight(this.walls, this.x, this.y, player.x, player.y)) {
        seen = true;
      }
    }
    this.seen = seen;

    if (seen) {
      this.state = 'frozen';
      this.sprite.body.setVelocity(0, 0);
      return;
    }

    // Encounter coordination grants the chase to only one statue in the
    // current wing. Every other statue keeps roaming, so two hunters cannot
    // occupy both ends of one narrow passage and force unavoidable damage.
    // It still obeys the gaze rule above: a visible secondary statue freezes,
    // but touching that frozen body cannot hurt the player.
    if (context.allowHunt === false) {
      if (this.state !== 'patrolling') {
        this.state = 'patrolling';
        this.path = null;
        this.pathIndex = 0;
        this.repathAt = 0;
        this.patrolGoal = null;
      }
      this.updatePatrol(time);
      return;
    }

    if (this.state !== 'idle' && dist > returnRadius) {
      this.state = 'returning';
      this.path = null;
      this.pathIndex = 0;
      this.repathAt = 0;
    }

    if (this.state === 'returning') {
      const homeDistance = Math.hypot(this.spawnPos.x - this.x, this.spawnPos.y - this.y);
      if (dist <= activationRadius) {
        this.state = 'hunting';
        this.path = null;
        this.repathAt = 0;
      } else if (homeDistance <= 7) {
        this.sprite.body.reset(this.spawnPos.x, this.spawnPos.y);
        this.state = 'patrolling';
        this.path = null;
        this.pathIndex = 0;
        this.patrolGoal = null;
        this.updatePatrol(time);
        return;
      } else {
        this.followPathTo(time, this.spawnCell, TUNING.statueSpeed * 0.78);
        return;
      }
    }

    const chaseCommitted = (this.state === 'hunting' || this.state === 'frozen')
      && dist <= returnRadius;
    if (dist > activationRadius && !chaseCommitted) {
      this.state = 'patrolling';
      this.updatePatrol(time);
      return;
    }

    this.state = 'hunting';

    this.followPathTo(time, worldToCell(player.x, player.y), TUNING.statueSpeed, { x: dx, y: dy, distance: dist });
  }

  followPathTo(time, goal, speed, fallback = null) {
    if (time >= this.repathAt) {
      this.repathAt = time + TUNING.repathMs;
      const start = worldToCell(this.x, this.y);
      const result = bfs(this.walls, start, goal);
      this.path = reconstructPath(result, start, goal);
      this.pathIndex = 0;
    }

    let vx = 0;
    let vy = 0;
    const speedPxPerSec = speed * 1000; // tuning is px/ms; Arcade velocity is px/s

    if (this.path && this.path.length) {
      const target = this.path[this.pathIndex];
      if (target) {
        const c = cellCenter(target.x, target.y);
        const tx = c.x - this.x;
        const ty = c.y - this.y;
        const td = Math.hypot(tx, ty);
        if (td < 6) {
          this.pathIndex += 1;
        } else {
          vx = (tx / td) * speedPxPerSec;
          vy = (ty / td) * speedPxPerSec;
        }
      }
    } else if (fallback?.distance > 1) {
      // No path this tick (shouldn't normally happen on a connected maze) —
      // drift straight toward the player; the wall collider still keeps it
      // honest.
      vx = (fallback.x / fallback.distance) * speedPxPerSec;
      vy = (fallback.y / fallback.distance) * speedPxPerSec;
    }

    this.sprite.body.setVelocity(vx, vy);
  }
}
