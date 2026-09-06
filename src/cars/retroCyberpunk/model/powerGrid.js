// Power grid model for CAR 04 // THE BORROWED GRID.
// Pure logic, no Phaser. Nodes are sockets/signals; links are fixed copper
// wires plus ladder conductor placements. Sources are mains terminals and
// battery sockets holding the battery. Power propagates visibly: newly
// reached nodes become powered only after a per-segment delay, so the scene
// can draw current actually travelling and the tests can lock the timing.

export function createPowerGrid({ sockets, wires, segmentDelayMs = 110 }) {
  const nodes = new Map(sockets.map((s) => [s.id, { ...s }]));
  const state = {
    batteries: new Set(), // socket ids currently holding the battery
    conductors: new Map(), // ladderId -> { a, b }
    powered: new Set(), // visibly powered right now
    pending: new Map(), // nodeId -> arriveAt ms
    now: 0,
  };
  let events = [];

  function links() {
    const out = wires.map((w) => [w.a, w.b]);
    for (const { a, b } of state.conductors.values()) out.push([a, b]);
    return out;
  }

  function sources() {
    const out = [];
    for (const n of nodes.values()) {
      if (n.kind === 'mains') out.push(n.id);
      if (n.kind === 'battery' && state.batteries.has(n.id)) out.push(n.id);
    }
    return out;
  }

  // Two-pass reachability. Pass 1 finds what is genuinely fed from real
  // sources (a powered node whose source vanished must depower). Pass 2
  // measures depth from the live frontier (sources + still-fed powered
  // nodes) so closing one link shows current crossing that link, not
  // re-travelling the whole network.
  function reachable() {
    const adj = new Map();
    for (const [a, b] of links()) {
      if (!adj.has(a)) adj.set(a, []);
      if (!adj.has(b)) adj.set(b, []);
      adj.get(a).push(b);
      adj.get(b).push(a);
    }
    const bfs = (seeds) => {
      const depth = new Map();
      const queue = [];
      for (const s of seeds) {
        if (!depth.has(s)) {
          depth.set(s, 0);
          queue.push(s);
        }
      }
      while (queue.length) {
        const cur = queue.shift();
        for (const nxt of adj.get(cur) || []) {
          if (!depth.has(nxt)) {
            depth.set(nxt, depth.get(cur) + 1);
            queue.push(nxt);
          }
        }
      }
      return depth;
    };
    const fed = bfs(sources());
    const frontier = [...fed.keys()].filter((id) => state.powered.has(id));
    const depth = bfs([...sources(), ...frontier]);
    return { fed, depth };
  }

  function recompute() {
    const { fed, depth } = reachable();
    const next = new Set(fed.keys());
    // Depower is immediate: lights, car drive and sound decay together.
    for (const id of [...state.powered]) {
      if (!next.has(id)) {
        state.powered.delete(id);
        events.push({ type: 'power-lost', node: id, at: state.now });
      }
    }
    for (const id of [...state.pending.keys()]) {
      if (!next.has(id)) state.pending.delete(id);
    }
    // Newly reached nodes enter as pending with a travel delay.
    for (const [id, d] of depth) {
      if (!state.powered.has(id) && !state.pending.has(id)) {
        state.pending.set(id, state.now + d * segmentDelayMs);
      }
    }
  }

  function tick(nowMs) {
    state.now = nowMs;
    for (const [id, at] of [...state.pending]) {
      if (at <= nowMs) {
        state.pending.delete(id);
        state.powered.add(id);
        events.push({ type: 'power-arrive', node: id, at });
      }
    }
  }

  recompute(); // mains terminals are live from the first frame

  return {
    tick,
    placeBattery(socketId) {
      const n = nodes.get(socketId);
      if (!n || n.kind !== 'battery') return { ok: false, reason: 'not-a-battery-socket' };
      if (state.batteries.has(socketId)) return { ok: false, reason: 'occupied' };
      state.batteries.add(socketId);
      events.push({ type: 'battery-seated', node: socketId, at: state.now });
      recompute();
      return { ok: true };
    },
    removeBattery(socketId) {
      if (!state.batteries.delete(socketId)) return { ok: false };
      events.push({ type: 'battery-removed', node: socketId, at: state.now });
      recompute();
      return { ok: true };
    },
    placeConductor(ladderId, a, b) {
      if (!nodes.has(a) || !nodes.has(b)) return { ok: false, reason: 'unknown-node' };
      state.conductors.set(ladderId, { a, b });
      events.push({ type: 'conductor-seated', ladder: ladderId, a, b, at: state.now });
      recompute();
      return { ok: true };
    },
    removeConductor(ladderId) {
      if (!state.conductors.delete(ladderId)) return { ok: false };
      events.push({ type: 'conductor-removed', ladder: ladderId, at: state.now });
      recompute();
      return { ok: true };
    },
    isPowered(id) {
      return state.powered.has(id);
    },
    isPending(id) {
      return state.pending.has(id);
    },
    batteryAt() {
      const it = state.batteries.values().next();
      return it.done ? null : it.value;
    },
    snapshot() {
      return {
        batteries: [...state.batteries],
        conductors: Object.fromEntries(
          [...state.conductors].map(([k, v]) => [k, [v.a, v.b]])
        ),
        powered: [...state.powered].sort(),
        pending: Object.fromEntries(state.pending),
      };
    },
    drainEvents() {
      const out = events;
      events = [];
      return out;
    },
    reset() {
      state.batteries.clear();
      state.conductors.clear();
      state.powered.clear();
      state.pending.clear();
      events.push({ type: 'grid-reset', at: state.now });
      recompute();
    },
  };
}
