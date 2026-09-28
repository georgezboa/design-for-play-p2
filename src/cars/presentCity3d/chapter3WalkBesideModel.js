// Chapter 3 · "walk beside" — the readable take on the locked move-as-one
// design (docs/CAR_03_DESIGN_LOCK_V2_READABLE_PLAY.md), as pure logic.
//
// A scanner field is a straight crossing: a walker waits at the safe line
// (`from`), the scanner arch stands at `gate`, the crossing ends at `to`.
// Anyone who enters the scan volume alone is warned, then flagged and sent
// back to the safe line. Press E beside the lit walker to match their pace:
// while you keep moving forward the pair advances, three pips fill (one per
// PIP_SECONDS of kept pace) and the scanner reads the pair as one party.
//
// Everything is plain numbers on the x/z ground plane so node tests can
// drive a full crossing; the runtime owns meshes, input and collision.

export const PIP_SECONDS = 0.6;
export const PIPS_REQUIRED = 3;
export const WARNING_MS = 600;
export const FLAG_MS = 1500;
export const MATCH_RADIUS = 1.9;
export const SCAN_HALF_DEPTH = 1.1;
const FORWARD_THRESHOLD = 0.35;
const RELEASE_BACKWARD_SECONDS = 0.45;

const sub = (a, b) => ({ x: a.x - b.x, z: a.z - b.z });
const dot = (a, b) => a.x * b.x + a.z * b.z;
const len = (a) => Math.hypot(a.x, a.z);
const xz = (point) => (Array.isArray(point) ? { x: point[0], z: point[2] } : { x: point.x, z: point.z });

export function scannerGeometry(field) {
  const from = xz(field.from);
  const to = xz(field.to);
  const gate = xz(field.gate);
  const span = sub(to, from);
  const length = len(span);
  const u = { x: span.x / length, z: span.z / length };
  const n = { x: -u.z, z: u.x };
  const gateAlong = dot(sub(gate, from), u);
  return { from, to, gate, u, n, length, gateAlong, halfWidth: field.halfWidth, margin: field.margin ?? 2 };
}

export function localCoordinates(geometry, point) {
  const offset = sub(xz(point), geometry.from);
  return { along: dot(offset, geometry.u), lateral: dot(offset, geometry.n) };
}

export function worldFromLocal(geometry, along, lateral = 0) {
  return {
    x: geometry.from.x + geometry.u.x * along + geometry.n.x * lateral,
    z: geometry.from.z + geometry.u.z * along + geometry.n.z * lateral,
  };
}

// The direct-movement zone: the crossing plus a margin at both ends.
export function fieldContains(geometry, point) {
  const { along, lateral } = localCoordinates(geometry, point);
  return along >= -geometry.margin && along <= geometry.length + geometry.margin
    && Math.abs(lateral) <= geometry.halfWidth;
}

export function inScanVolume(geometry, point) {
  const { along, lateral } = localCoordinates(geometry, point);
  return Math.abs(along - geometry.gateAlong) <= SCAN_HALF_DEPTH && Math.abs(lateral) <= geometry.halfWidth;
}

export function createWalkBeside(field) {
  const geometry = scannerGeometry(field);
  const speed = field.walkerSpeed ?? 1.5;
  const side = field.sideOffset ?? 1;
  const scanEntry = geometry.gateAlong - SCAN_HALF_DEPTH;
  const exitAlong = geometry.gateAlong + SCAN_HALF_DEPTH + 0.35;
  const state = {
    walkerAlong: 0,
    walkerMoving: false,
    matched: false,
    sideSign: 1,
    pipSeconds: 0,
    pips: 0,
    aloneMs: 0,
    scanner: 'idle',
    flags: 0,
    passed: false,
    backwardSeconds: 0,
  };

  const walker = () => worldFromLocal(geometry, state.walkerAlong, 0);
  const besidePosition = () => worldFromLocal(geometry, state.walkerAlong, side * state.sideSign);

  const release = (events) => {
    if (!state.matched) return;
    state.matched = false;
    state.pipSeconds = 0;
    state.pips = 0;
    state.backwardSeconds = 0;
    events.push('released');
  };

  return {
    geometry,
    walkerPosition: walker,
    besidePosition,
    contains: (point) => fieldContains(geometry, point),
    // Returns the player's lateral side for the safe-line return point.
    safeReturnPoint(point) {
      const { lateral } = localCoordinates(geometry, point);
      return worldFromLocal(geometry, Math.max(0.2, scanEntry - 1.4), Math.max(-geometry.halfWidth + 0.6, Math.min(geometry.halfWidth - 0.6, lateral)));
    },
    eligible(point) {
      if (state.passed || state.matched) return false;
      return len(sub(xz(point), walker())) <= MATCH_RADIUS;
    },
    // E: match when eligible, release when matched (never inside the scan
    // volume once the pips are full, so a crossing can't strand the walker).
    toggleMatch(point) {
      const events = [];
      if (state.passed) return events;
      if (state.matched) {
        if (state.pips >= PIPS_REQUIRED && state.walkerAlong >= scanEntry - 0.05) return events;
        release(events);
        return events;
      }
      if (!this.eligible(point)) return events;
      state.matched = true;
      // Fields name the side Butch walks on (the camera side, clear of
      // stalls); otherwise he keeps whichever side he came from.
      state.sideSign = field.side ?? (localCoordinates(geometry, point).lateral >= 0 ? 1 : -1);
      state.pipSeconds = 0;
      state.pips = 0;
      state.aloneMs = 0;
      state.backwardSeconds = 0;
      events.push('matched');
      return events;
    },
    // `input` is the player's intended world direction on the ground
    // (unit-ish vector, zero when idle). `player` is the current position.
    update(dt, { player, input = { x: 0, z: 0 } }) {
      const events = [];
      if (state.passed) return events;
      const forward = dot(input, geometry.u);
      state.walkerMoving = false;
      if (state.matched) {
        if (forward < -FORWARD_THRESHOLD) state.backwardSeconds += dt;
        else state.backwardSeconds = 0;
        if (state.backwardSeconds >= RELEASE_BACKWARD_SECONDS
          && !(state.pips >= PIPS_REQUIRED && state.walkerAlong >= scanEntry - 0.05)) {
          release(events);
        }
      }
      if (state.matched && forward > FORWARD_THRESHOLD) {
        const before = state.pips;
        state.pipSeconds += dt;
        state.pips = Math.min(PIPS_REQUIRED, Math.floor(state.pipSeconds / PIP_SECONDS));
        if (state.pips > before) events.push('pip');
        // The pair waits at the scanner edge until they are in step.
        const limit = state.pips >= PIPS_REQUIRED ? geometry.length : scanEntry - 0.2;
        const next = Math.min(limit, state.walkerAlong + speed * dt);
        state.walkerMoving = next > state.walkerAlong + 1e-6;
        state.walkerAlong = Math.max(state.walkerAlong, next);
        if (state.walkerAlong >= exitAlong && state.pips >= PIPS_REQUIRED) {
          state.passed = true;
          state.matched = false;
          state.scanner = 'ok';
          events.push('passed');
          return events;
        }
      }
      // Scanner reading.
      if (state.matched && state.pips >= PIPS_REQUIRED) {
        if (state.scanner !== 'ok') events.push('pattern-ok');
        state.scanner = 'ok';
        state.aloneMs = 0;
      } else if (!state.matched && inScanVolume(geometry, player)) {
        state.aloneMs += dt * 1000;
        if (state.aloneMs >= FLAG_MS) {
          state.flags += 1;
          state.aloneMs = 0;
          state.scanner = 'flagged';
          events.push('flagged');
        } else if (state.aloneMs >= WARNING_MS) {
          if (state.scanner !== 'warning') events.push('warning');
          state.scanner = 'warning';
        } else {
          state.scanner = 'alone';
        }
      } else {
        state.aloneMs = 0;
        state.scanner = state.matched ? 'matching' : 'idle';
      }
      return events;
    },
    snapshot() {
      const walkerAt = walker();
      return {
        walker: { x: Number(walkerAt.x.toFixed(2)), z: Number(walkerAt.z.toFixed(2)), along: Number(state.walkerAlong.toFixed(2)), moving: state.walkerMoving },
        matched: state.matched,
        pips: state.pips,
        pipProgress: Math.min(1, state.pipSeconds / (PIP_SECONDS * PIPS_REQUIRED)),
        scanner: state.scanner,
        flags: state.flags,
        passed: state.passed,
      };
    },
  };
}
