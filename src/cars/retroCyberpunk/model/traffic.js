// Traffic model for CAR 04 // THE BORROWED GRID.
// Pure logic, no Phaser. Flying cars are the far-end result of the power
// configuration: a car whose signal is unpowered is dark and parked; power
// brings it to its route where it runs a visible dwell/travel cycle. Cars
// decelerate into stops and lock during dwell so boarding never demands a
// pixel jump. Positions are top-surface docks flush with their platforms.

export function createTraffic({ cars, stops, carSize }) {
  const state = new Map();
  let events = [];

  for (const c of cars) {
    const parked = !!c.parkAt;
    state.set(c.id, {
      def: c,
      mode: parked ? 'parked' : 'dwell', // parked | docking | dwell | travel | parking
      x: parked ? c.parkAt.x : stops[c.routes.on[0]].x,
      y: parked ? c.parkAt.y : stops[c.routes.on[0]].y,
      target: parked ? null : c.routes.on[0],
      next: parked ? null : c.routes.on[1],
      dwellLeft: parked ? 0 : c.dwellMs,
      dx: 0,
      dy: 0,
      everDockedAt: new Set(),
    });
  }

  function moveToward(s, tx, ty, dtMs) {
    const speed = s.def.speed;
    const d = Math.hypot(tx - s.x, ty - s.y);
    if (d < 1) return true;
    // Deceleration lock: ease into the last 70 px so docking reads as a
    // vehicle arriving, not a platform teleporting.
    const slow = Math.min(1, Math.max(0.3, d / 70));
    const step = Math.min(d, (speed * slow * dtMs) / 1000);
    s.x += ((tx - s.x) / d) * step;
    s.y += ((ty - s.y) / d) * step;
    if (d - step < 1) {
      s.x = tx; // dock exactly: the platform surface must stay flush
      s.y = ty;
      return true;
    }
    return false;
  }

  function tickCar(s, dtMs, powered) {
    const c = s.def;
    const route = c.routes.on.map((id) => stops[id]);
    s.dx = 0;
    s.dy = 0;
    const px = s.x;
    const py = s.y;

    const needsPower = c.signal !== null;
    const alive = !needsPower || powered;

    if (!alive && s.mode !== 'parked' && s.mode !== 'parking') {
      s.mode = 'parking';
      events.push({ type: 'car-departing-dark', car: c.id });
    }
    if (alive && s.mode === 'parked') {
      s.mode = 'docking';
      s.target = c.routes.on[0];
      events.push({ type: 'car-called', car: c.id });
    }

    if (s.mode === 'parking') {
      if (moveToward(s, c.parkAt.x, c.parkAt.y, dtMs)) {
        s.mode = 'parked';
        events.push({ type: 'car-parked', car: c.id });
      }
    } else if (s.mode === 'docking') {
      const t = stops[s.target];
      if (moveToward(s, t.x, t.y, dtMs)) {
        s.mode = 'dwell';
        s.dwellLeft = c.dwellMs;
        const idx = route.indexOf(t);
        s.next = c.routes.on[(idx + 1) % route.length];
        if (!s.everDockedAt.has(s.target)) {
          s.everDockedAt.add(s.target);
          events.push({ type: 'car-first-dock', car: c.id, stop: s.target });
        }
        events.push({ type: 'car-docked', car: c.id, stop: s.target });
      }
    } else if (s.mode === 'dwell') {
      s.dwellLeft -= dtMs;
      if (s.dwellLeft <= 0) {
        s.mode = 'travel';
        events.push({ type: 'car-departed', car: c.id, stop: s.target, to: s.next });
        s.target = s.next;
      }
    } else if (s.mode === 'travel') {
      const t = stops[s.target];
      if (moveToward(s, t.x, t.y, dtMs)) {
        s.mode = 'dwell';
        s.dwellLeft = c.dwellMs;
        const idx = route.indexOf(t);
        s.next = c.routes.on[(idx + 1) % route.length];
        if (!s.everDockedAt.has(s.target)) {
          s.everDockedAt.add(s.target);
          events.push({ type: 'car-first-dock', car: c.id, stop: s.target });
        }
        events.push({ type: 'car-docked', car: c.id, stop: s.target });
      }
    }

    s.dx = s.x - px;
    s.dy = s.y - py;
  }

  return {
    tick(dtMs, isPowered) {
      for (const s of state.values()) {
        tickCar(s, dtMs, s.def.signal === null ? true : !!isPowered(s.def.signal));
      }
    },
    car(id) {
      const s = state.get(id);
      return {
        id,
        mode: s.mode,
        x: s.x,
        y: s.y,
        dx: s.dx,
        dy: s.dy,
        dwellLeft: s.dwellLeft,
        target: s.target,
        next: s.next,
        signal: s.def.signal,
      };
    },
    // Boardable platform surface: only while dwelling (locked) or travelling.
    platform(id) {
      const s = state.get(id);
      if (s.mode === 'parked' || s.mode === 'parking') return null;
      return {
        x0: s.x - carSize.w / 2,
        x1: s.x + carSize.w / 2,
        yTop: s.y,
        dx: s.dx,
        dy: s.dy,
        locked: s.mode === 'dwell',
      };
    },
    hasDockedAt(id, stopId) {
      return state.get(id).everDockedAt.has(stopId);
    },
    snapshot() {
      return Object.fromEntries(
        [...state.values()].map((s) => [
          s.def.id,
          {
            mode: s.mode,
            x: Math.round(s.x * 10) / 10,
            y: Math.round(s.y * 10) / 10,
            target: s.target,
            next: s.next,
            dwellLeft: Math.round(s.dwellLeft),
            dockedAt: [...s.everDockedAt],
          },
        ])
      );
    },
    drainEvents() {
      const out = events;
      events = [];
      return out;
    },
    reset() {
      for (const s of state.values()) {
        const c = s.def;
        const parked = !!c.parkAt;
        s.mode = parked ? 'parked' : 'dwell';
        s.x = parked ? c.parkAt.x : stops[c.routes.on[0]].x;
        s.y = parked ? c.parkAt.y : stops[c.routes.on[0]].y;
        s.target = parked ? null : c.routes.on[0];
        s.next = parked ? null : c.routes.on[1];
        s.dwellLeft = parked ? 0 : c.dwellMs;
        s.dx = 0;
        s.dy = 0;
        s.everDockedAt = new Set();
      }
      events.push({ type: 'traffic-reset' });
    },
  };
}
