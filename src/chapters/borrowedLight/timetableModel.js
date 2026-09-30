// Chapter 2 · BORROWED LIGHT — the city's timetable.
//
// Pure model, no Phaser: the bell clock, the punch queue, the one-line rule,
// machine power timers and travel, the memory-light afterglow, the departure
// countdown and the record the train "remembers". The scene renders this and
// moves physics bodies to `machine.level`; node tests drive it directly.
//
// Rules (docs/CH2_BORROWED_LIGHT_SPEC.md §4):
// - A bell rings every BELL_MS. Every queued node fires on the next bell and
//   powers its machine for that machine's `duration`.
// - One line, one borrowed moment. A line can carry one claim at a time: one
//   queued node, or one machine it is powering. Punching a second node on the
//   same line replaces the queued one (the first tag's hole seals). While the
//   line is powering a machine it is BUSY and refuses other nodes, until that
//   machine switches off or the player CUTS it by punching its node again.
// - A cut machine keeps CUT_GRACE_MS of power (flickering for the last
//   FLICKER_MS) and frees its line at once.
// - Machines flicker for FLICKER_MS before switching off, then travel home.
// - Memory light (section B): a node that fired glows for MEMORY_MS after its
//   bell.
// - Departure countdown (section C): counts bells down; a held countdown
//   (Butch falling and respawning) lets its bells pass uncounted.
//
// A node's `line` is its colour. The one-line rule applies per `circuit`
// (default: the colour), so each district of the city can have its own
// amber / teal / rose lines without one district's held bridge blocking
// another's.

export const BELL_MS = 4000;
export const FLICKER_MS = 600;
export const MEMORY_MS = 6000;
export const CUT_GRACE_MS = 2000;
export const LINES = Object.freeze(['amber', 'teal', 'rose']);

const HOLD = 'hold';

function assertDefinition({ nodes, machines }) {
  const machineIds = new Set();
  for (const machine of machines) {
    if (!machine.id || machineIds.has(machine.id)) throw new Error(`timetable: duplicate machine ${machine.id}`);
    machineIds.add(machine.id);
    const holds = machine.duration === HOLD;
    if (!holds && !(Number.isFinite(machine.duration) && machine.duration > FLICKER_MS)) {
      throw new Error(`timetable: machine ${machine.id} needs a duration longer than the flicker`);
    }
  }
  const nodeIds = new Set();
  const machineCircuit = new Map();
  const machineColor = new Map();
  for (const node of nodes) {
    if (!node.id || nodeIds.has(node.id)) throw new Error(`timetable: duplicate node ${node.id}`);
    nodeIds.add(node.id);
    if (!LINES.includes(node.line)) throw new Error(`timetable: node ${node.id} has unknown line ${node.line}`);
    if (!machineIds.has(node.machine)) throw new Error(`timetable: node ${node.id} powers missing machine ${node.machine}`);
    const circuit = circuitOf(node);
    const existing = machineCircuit.get(node.machine);
    if (existing && existing !== circuit) throw new Error(`timetable: machine ${node.machine} is fed by two lines`);
    machineCircuit.set(node.machine, circuit);
    machineColor.set(node.machine, node.line);
  }
  return { machineCircuit, machineColor };
}

const circuitOf = (node) => node.circuit ?? node.line;

export function createTimetable({ nodes = [], machines = [] } = {}, {
  bellMs = BELL_MS,
  flickerMs = FLICKER_MS,
  memoryMs = MEMORY_MS,
  cutGraceMs = CUT_GRACE_MS,
  startMs = 0,
} = {}) {
  const { machineCircuit, machineColor } = assertDefinition({ nodes, machines });
  const nodeById = new Map(nodes.map((node) => [node.id, { ...node, circuit: circuitOf(node) }]));
  const defById = new Map(machines.map((machine) => [machine.id, { travel: 600, ...machine }]));

  let timeMs = startMs;
  let sinceBell = 0;
  let bellIndex = 0;
  let memoryLight = false;
  let countdown = null;
  const queue = new Map(); // circuit -> nodeId
  const afterglow = new Map(); // nodeId -> remaining ms
  const history = []; // { nodeId, machineId, bell }
  const state = new Map();
  for (const def of defById.values()) {
    state.set(def.id, {
      powered: false,
      remaining: 0,
      held: false,
      cut: false,
      poweredBy: null,
      level: 0,
      fireCount: 0,
    });
  }

  const circuitOfMachine = (machineId) => machineCircuit.get(machineId) ?? null;
  const lineOf = (machineId) => machineColor.get(machineId) ?? null;

  // A circuit is busy while one of its machines is powered and not cut.
  const busyMachineOn = (circuit) => {
    for (const [id, machine] of state) {
      if (machine.powered && !machine.cut && circuitOfMachine(id) === circuit) return id;
    }
    return null;
  };

  const powerOn = (machineId, nodeId, events, { hold = false } = {}) => {
    const def = defById.get(machineId);
    const machine = state.get(machineId);
    const held = hold || def.duration === HOLD;
    const wasPowered = machine.powered;
    machine.powered = true;
    machine.cut = false;
    machine.held = held;
    machine.remaining = held ? Infinity : def.duration;
    machine.poweredBy = nodeId;
    machine.fireCount += 1;
    events.push({ type: 'power', machineId, nodeId, held, wasPowered });
  };

  const powerOff = (machineId, events) => {
    const machine = state.get(machineId);
    machine.powered = false;
    machine.remaining = 0;
    machine.held = false;
    machine.cut = false;
    machine.poweredBy = null;
    events.push({ type: 'off', machineId });
  };

  const advance = (dt, events) => {
    timeMs += dt;
    sinceBell += dt;
    const travelFor = (id, machine, ms, target) => {
      if (ms <= 0 || machine.level === target) return;
      const def = defById.get(id);
      const step = ms / Math.max(1, def.travel);
      machine.level = target > machine.level
        ? Math.min(1, machine.level + step)
        : Math.max(0, machine.level - step);
      if (machine.level === target) events.push({ type: target ? 'arrived' : 'home', machineId: id });
    };
    for (const [id, machine] of state) {
      let poweredMs = machine.powered ? dt : 0;
      if (machine.powered && !machine.held) {
        const before = machine.remaining;
        machine.remaining -= dt;
        if (before > flickerMs && machine.remaining <= flickerMs && machine.remaining > 0) {
          events.push({ type: 'flicker', machineId: id });
        }
        if (machine.remaining <= 0) {
          poweredMs = Math.max(0, before);
          powerOff(id, events);
        }
      }
      // A machine that switches off mid-step travels out, then home.
      travelFor(id, machine, poweredMs, 1);
      travelFor(id, machine, dt - poweredMs, 0);
    }
    for (const [nodeId, remaining] of afterglow) {
      const next = remaining - dt;
      if (next <= 0) {
        afterglow.delete(nodeId);
        events.push({ type: 'afterglow-end', nodeId });
      } else afterglow.set(nodeId, next);
    }
  };

  const ringBell = (events) => {
    bellIndex += 1;
    sinceBell = 0;
    const fired = [];
    for (const [circuit, nodeId] of queue) {
      const node = nodeById.get(nodeId);
      fired.push({ circuit, nodeId, machineId: node.machine });
    }
    queue.clear();
    events.push({ type: 'bell', index: bellIndex, fired: fired.map((entry) => entry.nodeId) });
    for (const { nodeId, machineId } of fired) {
      powerOn(machineId, nodeId, events);
      history.push({ nodeId, machineId, bell: bellIndex });
      if (memoryLight) afterglow.set(nodeId, memoryMs);
    }
    // A held countdown (Butch respawning) lets its bell pass uncounted.
    if (countdown && countdown.remaining > 0 && countdown.held) {
      events.push({ type: 'countdown-held', remaining: countdown.remaining, total: countdown.total });
    } else if (countdown && countdown.remaining > 0) {
      countdown.remaining -= 1;
      events.push({ type: 'countdown', remaining: countdown.remaining, total: countdown.total });
      if (countdown.remaining === 0) {
        countdown.done = true;
        events.push({ type: 'countdown-end' });
      }
    }
  };

  // Advance the clock. Splits the step at every bell so a long frame cannot
  // blur the order of "fire, then time the machine".
  const update = (dtMs) => {
    const events = [];
    let left = Math.max(0, Number(dtMs) || 0);
    while (left > 0) {
      const toBell = bellMs - sinceBell;
      const step = Math.min(left, toBell);
      advance(step, events);
      left -= step;
      if (sinceBell >= bellMs - 1e-9) ringBell(events);
    }
    return events;
  };

  const punch = (nodeId) => {
    const node = nodeById.get(nodeId);
    if (!node) return { result: 'unknown', nodeId };
    const { line, circuit } = node;
    const machine = state.get(node.machine);

    if (queue.get(circuit) === nodeId) {
      queue.delete(circuit);
      return { result: 'unqueued', nodeId, line };
    }
    if (machine.powered && !machine.cut) {
      if (machine.held || machine.remaining > cutGraceMs) {
        machine.held = false;
        machine.remaining = Math.min(machine.remaining, cutGraceMs);
      }
      machine.cut = true;
      return { result: 'cut', nodeId, line, machineId: node.machine, remaining: machine.remaining };
    }
    const holder = busyMachineOn(circuit);
    if (holder) return { result: 'busy', nodeId, line, holder };
    const cancelled = queue.get(circuit) ?? null;
    queue.set(circuit, nodeId);
    return cancelled
      ? { result: 'replaced', nodeId, line, cancelled }
      : { result: 'queued', nodeId, line };
  };

  // Respawn: every queued punch is forgotten; running machines keep going.
  const clearQueue = () => {
    const cleared = [...queue.values()];
    queue.clear();
    return cleared;
  };

  // City-held (or train-held) power: stays on until cut. Clears any queued
  // claim on that line so the one-line rule still holds.
  const hold = (machineId, nodeId = null) => {
    if (!state.has(machineId)) return [];
    const events = [];
    const circuit = circuitOfMachine(machineId);
    const queued = circuit ? queue.get(circuit) : null;
    if (queued) queue.delete(circuit);
    powerOn(machineId, nodeId, events, { hold: true });
    return events;
  };

  const release = (machineId) => {
    if (!state.get(machineId)?.powered) return [];
    const events = [];
    powerOff(machineId, events);
    return events;
  };

  // Put a machine straight into a state without travel (checkpoint seeding).
  const settle = (machineId, level) => {
    const machine = state.get(machineId);
    if (machine) machine.level = Math.max(0, Math.min(1, level));
  };

  // What the next bell will move: Listen's ghost preview.
  const preview = () => {
    const toBell = bellMs - sinceBell;
    const changes = [];
    for (const nodeId of queue.values()) {
      changes.push({ machineId: nodeById.get(nodeId).machine, nodeId, to: 'on' });
    }
    for (const [id, machine] of state) {
      if (machine.powered && !machine.held && machine.remaining <= toBell) {
        if (!changes.some((change) => change.machineId === id)) changes.push({ machineId: id, nodeId: machine.poweredBy, to: 'off' });
      }
    }
    return changes;
  };

  const nodeStatus = (nodeId) => {
    const node = nodeById.get(nodeId);
    if (!node) return null;
    const machine = state.get(node.machine);
    const queued = queue.get(node.circuit) === nodeId;
    const powering = machine.powered && machine.poweredBy === nodeId;
    return {
      id: nodeId,
      line: node.line,
      machine: node.machine,
      queued,
      powering,
      poweringMachine: machine.powered,
      cut: machine.powered && machine.cut,
      circuit: node.circuit,
      lineBusy: Boolean(busyMachineOn(node.circuit)),
      afterglow: afterglow.has(nodeId) ? afterglow.get(nodeId) / memoryMs : 0,
    };
  };

  const machineStatus = (machineId) => {
    const machine = state.get(machineId);
    if (!machine) return null;
    const def = defById.get(machineId);
    const flicker = machine.powered && !machine.held && machine.remaining <= flickerMs;
    return {
      id: machineId,
      kind: def.kind,
      line: lineOf(machineId),
      powered: machine.powered,
      held: machine.held,
      cut: machine.cut,
      flicker,
      remaining: machine.powered ? (machine.held ? null : Math.max(0, Math.round(machine.remaining))) : 0,
      level: machine.level,
      poweredBy: machine.poweredBy,
      fireCount: machine.fireCount,
    };
  };

  const snapshot = () => ({
    timeMs: Math.round(timeMs),
    bell: bellIndex,
    msToBell: Math.round(bellMs - sinceBell),
    bellPhase: Number((sinceBell / bellMs).toFixed(3)),
    queued: Object.fromEntries(queue),
    machines: Object.fromEntries([...state.keys()].map((id) => {
      const status = machineStatus(id);
      return [id, {
        powered: status.powered,
        held: status.held,
        cut: status.cut,
        flicker: status.flicker,
        remaining: status.remaining,
        level: Number(status.level.toFixed(2)),
      }];
    })),
    afterglow: Object.fromEntries([...afterglow].map(([id, ms]) => [id, Math.round(ms)])),
    memoryLight,
    countdown: countdown ? { remaining: countdown.remaining, total: countdown.total, done: Boolean(countdown.done), held: Boolean(countdown.held) } : null,
  });

  return {
    update,
    punch,
    clearQueue,
    hold,
    release,
    settle,
    preview,
    nodeStatus,
    machineStatus,
    snapshot,
    lineOf,
    circuitOf: circuitOfMachine,
    lineBusy: (circuit) => Boolean(busyMachineOn(circuit)),
    queuedOn: (circuit) => queue.get(circuit) ?? null,
    isQueued: (nodeId) => [...queue.values()].includes(nodeId),
    setMemoryLight: (on) => { memoryLight = Boolean(on); if (!memoryLight) afterglow.clear(); },
    memoryLightOn: () => memoryLight,
    afterglowOf: (nodeId) => (afterglow.has(nodeId) ? afterglow.get(nodeId) / memoryMs : 0),
    startCountdown: (bells = 8) => { countdown = { total: bells, remaining: bells, done: false, held: false }; return { ...countdown }; },
    // While held (a fall and its respawn), bells ring but do not count down.
    holdCountdown: (on = true) => { if (countdown) countdown.held = Boolean(on); return countdown ? countdown.held : false; },
    stopCountdown: () => { countdown = null; },
    countdown: () => (countdown ? { ...countdown } : null),
    history: (fromBell = 0) => history.filter((entry) => entry.bell > fromBell).map((entry) => ({ ...entry })),
    get bellIndex() { return bellIndex; },
    get timeMs() { return timeMs; },
    msToBell: () => bellMs - sinceBell,
    bellPhase: () => sinceBell / bellMs,
    bellMs,
    flickerMs,
    memoryMs,
    cutGraceMs,
    nodeIds: () => [...nodeById.keys()],
    machineIds: () => [...defById.keys()],
  };
}

// Plays back what the train remembers: the machines this section fired, in
// the order they first fired, followed by any required machine the player
// never reached. Pure so the ordering can be tested.
export function rememberedSequence(history, required = []) {
  const order = [];
  for (const { machineId } of history) if (!order.includes(machineId)) order.push(machineId);
  for (const machineId of required) if (!order.includes(machineId)) order.push(machineId);
  return order;
}
