// Placement model for CAR 04 // THE BORROWED GRID.
// Pure logic, no Phaser. Ladders snap into authored slots (bridge/conductor),
// the battery snaps into battery sockets. Illegal releases never destroy
// state: the object returns to its previous slot or home rack, and the
// rejection carries the real spatial conflict so the scene can draw it.

const SNAP_RADIUS = 80;

function dist(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.d && a.y + a.h > b.y;
}

export function createPlacement({ ladders, battery, batterySockets, platforms }) {
  const state = {
    // ladderId -> { slotId: string|null, x, y } (x,y = center of the ladder)
    ladders: new Map(),
    // { socketId: string|null, x, y }
    battery: { socketId: null, x: battery.home.x, y: battery.home.y },
  };
  let events = [];

  for (const l of ladders) {
    state.ladders.set(l.id, { slotId: null, x: l.home.x, y: l.home.y });
  }

  function ladderDef(id) {
    return ladders.find((l) => l.id === id);
  }

  function slotOf(ladder, slotId) {
    return ladder.slots.find((s) => s.id === slotId);
  }

  function occupiedSlotIds(exceptLadder) {
    const out = new Set();
    for (const [id, pos] of state.ladders) {
      if (id !== exceptLadder && pos.slotId) out.add(pos.slotId);
    }
    return out;
  }

  function conflictFor(x, y, w, h) {
    const rect = { x: x - w / 2, y: y - h / 2, w, h };
    for (const p of platforms) {
      if (rectsOverlap(rect, p)) return { platform: p.id, rect: p };
    }
    return null;
  }

  return {
    // Evaluate a proposed drop. Never mutates.
    tryLadder(ladderId, x, y) {
      const ladder = ladderDef(ladderId);
      if (!ladder) return { ok: false, reason: 'unknown-ladder' };
      const taken = occupiedSlotIds(ladderId);
      let best = null;
      for (const s of ladder.slots) {
        if (taken.has(s.id)) continue;
        const d = dist(x, y, s.x + s.w / 2, s.y + s.h / 2);
        if (d < SNAP_RADIUS && (!best || d < best.d)) best = { slot: s, d };
      }
      if (best) return { ok: true, slot: best.slot };
      return {
        ok: false,
        reason: 'no-slot',
        conflict: conflictFor(x, y, ladder.w, ladder.h),
      };
    },
    placeLadder(ladderId, slotId) {
      const ladder = ladderDef(ladderId);
      const slot = slotOf(ladder, slotId);
      if (!slot) return { ok: false, reason: 'unknown-slot' };
      const pos = state.ladders.get(ladderId);
      pos.slotId = slotId;
      pos.x = slot.x + slot.w / 2;
      pos.y = slot.y + slot.h / 2;
      events.push({ type: 'ladder-placed', ladder: ladderId, slot: slotId, role: slot.role });
      return { ok: true, slot };
    },
    // Returns where the ladder went back to ('slot' | 'home').
    returnLadder(ladderId) {
      const ladder = ladderDef(ladderId);
      const pos = state.ladders.get(ladderId);
      if (pos.slotId) return 'slot';
      pos.x = ladder.home.x;
      pos.y = ladder.home.y;
      events.push({ type: 'ladder-returned', ladder: ladderId });
      return 'home';
    },
    detachLadder(ladderId) {
      const pos = state.ladders.get(ladderId);
      const from = pos.slotId;
      pos.slotId = null;
      if (from) events.push({ type: 'ladder-detached', ladder: ladderId, from });
      return from;
    },
    tryBattery(x, y) {
      let best = null;
      for (const s of batterySockets) {
        const d = dist(x, y, s.x, s.y);
        if (d < SNAP_RADIUS && (!best || d < best.d)) best = { socket: s, d };
      }
      if (best) return { ok: true, socket: best.socket };
      // Free drop: the battery is cargo — it may rest on any real surface,
      // which is how the player hauls it between sockets across a bay.
      const feet = y + battery.h / 2;
      const support = platforms.find(
        (p) => x > p.x - 10 && x < p.x + p.w + 10 && p.y >= feet - 12 && p.y <= feet + 70
      );
      if (support) return { ok: true, free: { x, y: support.y - battery.h / 2 } };
      return {
        ok: false,
        reason: 'no-socket',
        conflict: conflictFor(x, y, battery.w, battery.h),
      };
    },
    placeBattery(socket) {
      state.battery.socketId = socket.id;
      state.battery.x = socket.x;
      state.battery.y = socket.y;
      events.push({ type: 'battery-placed', socket: socket.id });
      return { ok: true };
    },
    placeBatteryAt(x, y) {
      state.battery.socketId = null;
      state.battery.x = x;
      state.battery.y = y;
      events.push({ type: 'battery-dropped', x, y });
      return { ok: true };
    },
    detachBattery() {
      const from = state.battery.socketId;
      state.battery.socketId = null;
      if (from) events.push({ type: 'battery-detached', socket: from });
      return from;
    },
    returnBattery() {
      if (state.battery.socketId) return 'socket';
      state.battery.x = battery.home.x;
      state.battery.y = battery.home.y;
      events.push({ type: 'battery-returned' });
      return 'home';
    },
    ladderPos(ladderId) {
      return { ...state.ladders.get(ladderId) };
    },
    batteryPos() {
      return { ...state.battery };
    },
    snapshot() {
      return {
        ladders: Object.fromEntries([...state.ladders].map(([k, v]) => [k, { ...v }])),
        battery: { ...state.battery },
      };
    },
    drainEvents() {
      const out = events;
      events = [];
      return out;
    },
    reset() {
      for (const l of ladders) {
        state.ladders.set(l.id, { slotId: null, x: l.home.x, y: l.home.y });
      }
      state.battery = { socketId: null, x: battery.home.x, y: battery.home.y };
      events.push({ type: 'placement-reset' });
    },
  };
}
