// Chapter 2 · BORROWED LIGHT — the city's timetable (v2).
//
// Pure model, no Phaser: the bell clock, the punch queue, the one-line rule,
// two-phase lines, machine power timers and travel, borrowed light, the
// counterweight pair, the memory-light afterglow, the departure countdown and
// the record the train "remembers". The scene renders this and moves physics
// bodies to `machine.level`; node tests drive it directly.
//
// Rules (docs/CH2_BORROWED_LIGHT_SPEC.md §4):
// - A bell rings every BELL_MS (the chase quickens it: setBellMs). Every
//   queued node fires on the next bell and powers its machine for that
//   machine's `duration`.
// - Two-phase lines: a line (circuit) may ring only on odd bells (I) or only
//   on even bells (II). A punch on it waits, queued, for its own bell.
// - One line, one borrowed moment. A line carries one claim at a time: one
//   queued node, or one machine it is powering. Punching a second node on the
//   same line replaces the queued one (the first tag's hole seals). While the
//   line powers a machine it is BUSY and refuses other nodes.
// - Punching the node of a machine its line is already running RENEWS it at
//   the next bell (a second press can never switch a machine off). Only a
//   machine the city HOLDS open can be CUT: it keeps CUT_GRACE_MS of power
//   (flickering for the last FLICKER_MS) and frees its line at once.
//   Chapter 2 (alpha round 4, `cutUntilBell`): a cut machine holds until the
//   next bell that is at least CUT_GRACE_MS away, so "CUT · THE BRIDGE HOLDS
//   UNTIL THE NEXT BELL" is true, and pressing its node again while it runs
//   out does nothing ('cutting') instead of quietly holding it again.
// - Forgiveness: a punch within CATCH_MS after a bell still catches that bell,
//   unless the node is half of a puzzle pair (`noCatch`) or another punch is
//   already waiting in its district (round 3: a caught half split A3's pair).
// - A press never takes a punch back (round 3, R3-1: a second press meant for
//   the next pole silently cancelled the first). Pressing a queued node again
//   is harmless ('already'); taking it back is its own deliberate verb,
//   takeBack() (the scene: hold F on the node).
// - Lifts wait for a rider (R3-3): when a `waitsForRider` machine's bell
//   comes and the scene's shouldWait(machineId) says its rider is still on
//   the way, it holds one ring of its line, and so does everything else
//   queued in its district, so a pair keeps its order.
// - Borrowed light (section B): Butch's lamp can take the light out of a lit
//   `borrowable` machine (it switches off) and carry it, one charge at a
//   time, to a DEAD node (a node with no line of its own), which fires on the
//   next bell. The light remembers where it came from: when the machine it
//   powers switches off, or when Butch falls (dropLight), it goes home and
//   its source is restored. Nothing can be stranded.
// - Counterweight pair (section C): while its brake is released (powered),
//   the pair moves toward the loaded cage's side; locked otherwise.
// - Machines flicker for FLICKER_MS before switching off, then travel home.
// - Memory light (section B): a node that fired glows for MEMORY_MS.
// - Departure countdown (section C): counts bells down; a held countdown
//   (Butch falling and respawning) lets its bells pass uncounted.
//
// A node's `line` is its colour. The one-line rule applies per `circuit`
// (default: the colour), so each district can have its own lines.

export const BELL_MS = 4000;
export const FLICKER_MS = 600;
export const MEMORY_MS = 6000;
export const CUT_GRACE_MS = 2000;
export const CATCH_MS = 120;
// The pre-round-3 rules, still the defaults for other users of this model
// (the finale's bell arena): a 250 ms catch, and a second press more than
// 450 ms after a punch takes it back.
export const LEGACY_CATCH_MS = 250;
export const REPEAT_GUARD_MS = 450;
// Chapter 2's rules (alpha round 3): pass these to createTimetable.
export const CH2_RULES = Object.freeze({ catchMs: CATCH_MS, repress: 'keep', cutUntilBell: true });
export const LINES = Object.freeze(['amber', 'teal', 'rose']);
export const PHASES = Object.freeze(['odd', 'even']);

const HOLD = 'hold';

const circuitOf = (node) => (node.dead ? `dead:${node.machine}` : node.circuit ?? node.line);
// The room a node belongs to: holds and catches look at the whole room.
const districtOfNode = (node) => node.district ?? circuitOf(node);

// Does a circuit with this phase ring on bell number `index`?
export const ringsOn = (phase, index) => !phase || (phase === 'odd' ? index % 2 === 1 : index % 2 === 0);

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
  const circuitPhase = new Map();
  for (const node of nodes) {
    if (!node.id || nodeIds.has(node.id)) throw new Error(`timetable: duplicate node ${node.id}`);
    nodeIds.add(node.id);
    if (!LINES.includes(node.line)) throw new Error(`timetable: node ${node.id} has unknown line ${node.line}`);
    if (!machineIds.has(node.machine)) throw new Error(`timetable: node ${node.id} powers missing machine ${node.machine}`);
    if (node.phase != null && !PHASES.includes(node.phase)) throw new Error(`timetable: node ${node.id} has unknown phase ${node.phase}`);
    if (node.dead && node.phase) throw new Error(`timetable: dead node ${node.id} cannot ring on a phase`);
    const circuit = circuitOf(node);
    const existing = machineCircuit.get(node.machine);
    if (existing && existing !== circuit) throw new Error(`timetable: machine ${node.machine} is fed by two lines`);
    machineCircuit.set(node.machine, circuit);
    machineColor.set(node.machine, node.line);
    if (!node.dead) {
      const phase = node.phase ?? null;
      if (circuitPhase.has(circuit) && circuitPhase.get(circuit) !== phase) throw new Error(`timetable: circuit ${circuit} rings on two phases`);
      circuitPhase.set(circuit, phase);
    }
  }
  return { machineCircuit, machineColor, circuitPhase };
}

export function createTimetable({ nodes = [], machines = [] } = {}, {
  bellMs: initialBellMs = BELL_MS,
  flickerMs = FLICKER_MS,
  memoryMs = MEMORY_MS,
  cutGraceMs = CUT_GRACE_MS,
  catchMs = LEGACY_CATCH_MS,
  // 'keep': pressing a punched node again never takes it back (Chapter 2);
  // 'take-back': the legacy rule, after REPEAT_GUARD_MS.
  repress = 'take-back',
  repeatGuardMs = REPEAT_GUARD_MS,
  // A cut holds until the next bell at least cutGraceMs away (Chapter 2).
  cutUntilBell = false,
  startMs = 0,
  // (machineId) => true while a lift's rider is still walking to it.
  shouldWait = null,
} = {}) {
  const { machineCircuit, machineColor, circuitPhase } = assertDefinition({ nodes, machines });
  const nodeById = new Map(nodes.map((node) => [node.id, {
    ...node,
    dead: Boolean(node.dead),
    phase: node.dead ? null : node.phase ?? null,
    circuit: circuitOf(node),
    district: districtOfNode(node),
    noCatch: Boolean(node.noCatch),
  }]));
  const defById = new Map(machines.map((machine) => [machine.id, { travel: 600, ...machine }]));

  let bellMs = initialBellMs;
  let timeMs = startMs;
  let sinceBell = 0;
  let bellIndex = 0;
  let memoryLight = false;
  let countdown = null;
  let carried = null; // { source, sourceNode, restore, from }
  const queue = new Map(); // circuit -> nodeId
  const queuedAt = new Map(); // nodeId -> timeMs of the punch
  const waited = new Set(); // nodeIds that already held a bell for their rider
  const holds = new Map(); // district -> bell index its queue waits for
  let waitFor = shouldWait;
  const given = new Map(); // dead nodeId -> charge waiting for the bell
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
      light: null, // the borrowed charge powering it, if any
      lentOut: false, // a source whose light Butch has taken
      load: null, // counterweight: 'a' | 'b' | null
    });
  }

  const circuitOfMachine = (machineId) => machineCircuit.get(machineId) ?? null;
  const lineOf = (machineId) => machineColor.get(machineId) ?? null;
  const phaseOfCircuit = (circuit) => circuitPhase.get(circuit) ?? null;
  const nextIndex = () => bellIndex + 1;
  // The bell a node queued now would fire on: its line's next bell, or later
  // if its district is holding for a lift's rider.
  const fireBellOf = (node) => {
    let k = Math.max(nextIndex(), holds.get(node.district) ?? 0);
    const phase = node.dead ? null : phaseOfCircuit(node.circuit);
    while (!ringsOn(phase, k)) k += 1;
    return k;
  };
  // Bells until a queued node fires: 1 (the next), 2, …
  const bellsUntilNode = (node) => fireBellOf(node) - bellIndex;
  // Another punch waiting in this node's district (a pair in the making).
  const districtBusy = (node) => [...queue.values()].some((id) => id !== node.id && nodeById.get(id).district === node.district)
    || [...given.keys()].some((id) => id !== node.id && nodeById.get(id).district === node.district)
    || holds.has(node.district);
  const pressTakesBack = (nodeId) => repress === 'take-back' && timeMs - (queuedAt.get(nodeId) ?? -Infinity) >= repeatGuardMs;
  // A punch just after a bell catches it, only when it cannot split a pair
  // and is not a lift leaving before its rider gets there.
  const canCatch = (node) => sinceBell < catchMs && bellIndex > 0 && !node.noCatch
    && ringsOn(phaseOfCircuit(node.circuit), bellIndex) && !districtBusy(node)
    && !(defById.get(node.machine).waitsForRider && waitFor?.(node.machine));

  // A circuit is busy while one of its machines is powered by it and not cut.
  const busyMachineOn = (circuit) => {
    for (const [id, machine] of state) {
      if (machine.powered && !machine.cut && !machine.light && circuitOfMachine(id) === circuit) return id;
    }
    return null;
  };

  const powerOn = (machineId, nodeId, events, { hold = false, light = null, elapsed = 0 } = {}) => {
    const def = defById.get(machineId);
    const machine = state.get(machineId);
    const held = hold || def.duration === HOLD;
    const wasPowered = machine.powered;
    machine.powered = true;
    machine.cut = false;
    machine.held = held;
    machine.remaining = held ? Infinity : Math.max(flickerMs + 1, def.duration - elapsed);
    machine.poweredBy = nodeId;
    machine.fireCount += 1;
    machine.light = light;
    machine.lentOut = false;
    events.push({ type: 'power', machineId, nodeId, held, wasPowered, borrowed: Boolean(light) });
  };

  // The light goes home: its source is restored (re-held if the city held it).
  const sendHome = (charge, events, reason) => {
    if (!charge) return;
    const source = state.get(charge.source);
    if (source) {
      source.lentOut = false;
      if (charge.restore === HOLD && !source.powered) powerOn(charge.source, charge.sourceNode, events, { hold: true });
    }
    events.push({ type: 'light-return', source: charge.source, sourceNode: charge.sourceNode, reason });
  };

  const powerOff = (machineId, events, { keepLight = false } = {}) => {
    const machine = state.get(machineId);
    const light = machine.light;
    machine.powered = false;
    machine.remaining = 0;
    machine.held = false;
    machine.cut = false;
    machine.poweredBy = null;
    machine.light = null;
    events.push({ type: 'off', machineId });
    if (light && !keepLight) sendHome(light, events, 'spent');
    return light;
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
      const def = defById.get(id);
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
      if (def.kind === 'counterweight') {
        // The brake is released while powered: the loaded cage sinks. A
        // ballasted pair (a ledge the city holds up) sinks on its own.
        const load = machine.load ?? def.ballast ?? null;
        if (poweredMs > 0 && load) travelFor(id, machine, poweredMs, load === 'a' ? 1 : 0);
        continue;
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

  const fire = (nodeId, events, { light = null, elapsed = 0 } = {}) => {
    const node = nodeById.get(nodeId);
    powerOn(node.machine, nodeId, events, { light, elapsed });
    history.push({ nodeId, machineId: node.machine, bell: bellIndex });
    if (memoryLight) afterglow.set(nodeId, memoryMs);
  };

  const ringBell = (events) => {
    bellIndex += 1;
    sinceBell = 0;
    for (const [district, until] of holds) if (until < bellIndex) holds.delete(district);
    const heldNow = (node) => (holds.get(node.district) ?? 0) > bellIndex;
    const due = [];
    const waiting = [];
    for (const [circuit, nodeId] of queue) {
      if (ringsOn(phaseOfCircuit(circuit), bellIndex) && !heldNow(nodeById.get(nodeId))) due.push(nodeId);
      else waiting.push(nodeId);
    }
    const dueGiven = [...given].filter(([nodeId]) => !heldNow(nodeById.get(nodeId)));
    // A lift whose rider is still on the way holds this ring of its line,
    // and its whole district waits with it (a pair keeps its order).
    for (const nodeId of [...due, ...dueGiven.map(([id]) => id)]) {
      const node = nodeById.get(nodeId);
      const def = defById.get(node.machine);
      const machine = state.get(node.machine);
      if (!def.waitsForRider || waited.has(nodeId) || machine.powered || machine.level > 0 || !waitFor?.(node.machine)) continue;
      waited.add(nodeId);
      let until = bellIndex + 1;
      while (!ringsOn(node.dead ? null : phaseOfCircuit(node.circuit), until)) until += 1;
      holds.set(node.district, Math.max(holds.get(node.district) ?? 0, until));
      events.push({ type: 'lift-wait', machineId: node.machine, nodeId, untilBell: until });
    }
    const fired = due.filter((nodeId) => !heldNow(nodeById.get(nodeId)));
    due.filter((nodeId) => heldNow(nodeById.get(nodeId))).forEach((nodeId) => waiting.push(nodeId));
    const givenNow = dueGiven.filter(([nodeId]) => !heldNow(nodeById.get(nodeId)));
    fired.forEach((nodeId) => { queue.delete(nodeById.get(nodeId).circuit); queuedAt.delete(nodeId); waited.delete(nodeId); });
    givenNow.forEach(([nodeId]) => { given.delete(nodeId); waited.delete(nodeId); });
    events.push({ type: 'bell', index: bellIndex, parity: bellIndex % 2 ? 'odd' : 'even', fired: [...fired, ...givenNow.map(([id]) => id)], waiting });
    for (const nodeId of fired) fire(nodeId, events);
    for (const [nodeId, charge] of givenNow) fire(nodeId, events, { light: charge });
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

  // How long a cut made now would hold (Chapter 2: until the next bell at
  // least the grace away), and in how many bells it goes.
  const cutWindow = () => {
    const toBell = bellMs - sinceBell;
    if (!cutUntilBell) return { remaining: cutGraceMs, bells: null };
    return toBell >= cutGraceMs ? { remaining: toBell, bells: 1 } : { remaining: toBell + bellMs, bells: 2 };
  };
  // A running cut: ms left, and which bell takes it (1 = the next).
  const cutLeft = (machine) => ({ remaining: Math.max(0, machine.remaining), bells: machine.remaining > bellMs - sinceBell + 1 ? 2 : 1 });

  // What a punch on this node would do, without doing it. The scene shows it
  // on the targeted node's prompt so a punch is never a surprise.
  const punchPreview = (nodeId) => {
    const node = nodeById.get(nodeId);
    if (!node) return { result: 'unknown', nodeId };
    const { line, circuit } = node;
    const machine = state.get(node.machine);
    if (node.dead) {
      if (given.has(nodeId)) return { result: 'given', nodeId, line };
      return { result: 'dead', nodeId, line, lit: machine.powered };
    }
    // Pressing a queued node again never takes it back (R3-1).
    if (queue.get(circuit) === nodeId) {
      if (pressTakesBack(nodeId)) return { result: 'unqueue', nodeId, line };
      return { result: 'already', nodeId, line, inBells: bellsUntilNode(node), waiting: waited.has(nodeId) };
    }
    if (machine.powered && !machine.cut && !machine.light) {
      return machine.held ? { result: 'cut', nodeId, line, ...cutWindow() } : { result: 'renew', nodeId, line };
    }
    if (cutUntilBell && machine.powered && machine.cut) return { result: 'cutting', nodeId, line, ...cutLeft(machine) };
    const holder = busyMachineOn(circuit);
    if (holder) return { result: 'busy', nodeId, line, holder };
    const cancelled = queue.get(circuit) ?? null;
    return cancelled
      ? { result: 'replace', nodeId, line, cancelled, inBells: bellsUntilNode(node) }
      : { result: 'queue', nodeId, line, inBells: bellsUntilNode(node) };
  };

  const punch = (nodeId) => {
    const node = nodeById.get(nodeId);
    if (!node) return { result: 'unknown', nodeId };
    const { line, circuit } = node;
    const machine = state.get(node.machine);
    if (node.dead) return { result: given.has(nodeId) ? 'given' : 'dead', nodeId, line };

    // A second press, however late, is the same punch: never a take-back
    // (Chapter 2). The legacy rule takes it back after the repeat guard.
    if (queue.get(circuit) === nodeId) {
      if (pressTakesBack(nodeId)) return takeBack(nodeId);
      return { result: 'already', nodeId, line, inBells: bellsUntilNode(node) };
    }
    if (machine.powered && !machine.cut && !machine.light) {
      if (machine.held) {
        machine.held = false;
        const win = cutWindow();
        machine.remaining = cutUntilBell ? win.remaining : Math.min(machine.remaining, cutGraceMs);
        machine.cut = true;
        return { result: 'cut', nodeId, line, machineId: node.machine, remaining: machine.remaining, ...(cutUntilBell ? { bells: win.bells } : {}) };
      }
      // Its own line is running it: renew at the next bell (or now, if a bell
      // has only just rung).
      if (canCatch(node)) {
        const events = [];
        fire(nodeId, events, { elapsed: sinceBell });
        return { result: 'renewed', nodeId, line, caught: true, events };
      }
      queue.set(circuit, nodeId);
      queuedAt.set(nodeId, timeMs);
      return { result: 'renew', nodeId, line, inBells: bellsUntilNode(node) };
    }
    // A cut machine running out: pressing its node again changes nothing.
    if (cutUntilBell && machine.powered && machine.cut) return { result: 'cutting', nodeId, line, ...cutLeft(machine) };
    const holder = busyMachineOn(circuit);
    if (holder) return { result: 'busy', nodeId, line, holder };
    // Just after a bell that would have fired it: catch that bell.
    if (!queue.has(circuit) && canCatch(node)) {
      const events = [];
      fire(nodeId, events, { elapsed: sinceBell });
      return { result: 'caught', nodeId, line, events };
    }
    const cancelled = queue.get(circuit) ?? null;
    if (cancelled) { queuedAt.delete(cancelled); waited.delete(cancelled); }
    queue.set(circuit, nodeId);
    queuedAt.set(nodeId, timeMs);
    const inBells = bellsUntilNode(node);
    return cancelled
      ? { result: 'replaced', nodeId, line, cancelled, inBells }
      : { result: 'queued', nodeId, line, inBells };
  };

  // The deliberate take-back (the scene: hold F on a punched node).
  const takeBack = (nodeId) => {
    const node = nodeById.get(nodeId);
    if (!node) return { result: 'unknown', nodeId };
    if (queue.get(node.circuit) !== nodeId) return { result: 'not-queued', nodeId, line: node.line };
    queue.delete(node.circuit);
    queuedAt.delete(nodeId);
    if (waited.delete(nodeId)) holds.delete(node.district);
    return { result: 'unqueued', nodeId, line: node.line };
  };

  // ---- borrowed light -----------------------------------------------------
  // `riding`: the machine Butch stands on (or rides). Borrowing its light
  // would switch it off under him, so the lamp refuses: STEP OFF FIRST.
  const borrowPreview = (nodeId, { riding = null } = {}) => {
    const node = nodeById.get(nodeId);
    if (!node) return { result: 'unknown', nodeId };
    const def = defById.get(node.machine);
    const machine = state.get(node.machine);
    if (given.has(nodeId)) return carried ? { result: 'full', nodeId } : { result: 'retrieve', nodeId };
    if (carried) {
      if (!node.dead) return { result: 'live', nodeId };
      if (node.machine === carried.source) return { result: 'return', nodeId };
      if (machine.powered) return { result: 'lit', nodeId };
      return { result: 'give', nodeId };
    }
    if (!def.borrowable) return { result: 'fixed', nodeId };
    if (!machine.powered) return { result: 'dark', nodeId };
    if (riding && riding === node.machine) return { result: 'step-off', nodeId, machineId: node.machine };
    return { result: 'borrow', nodeId, machineId: node.machine };
  };

  // E at a node: borrow its machine's light, take back a light given to it,
  // give the carried light to a dead node, or take it home to its source.
  const lamp = (nodeId, options = {}) => {
    const preview = borrowPreview(nodeId, options);
    const node = nodeById.get(nodeId);
    const events = [];
    switch (preview.result) {
      case 'borrow': {
        const machine = state.get(node.machine);
        const light = machine.light;
        const restore = light ? light.restore : machine.held ? HOLD : null;
        const sourceNode = light ? light.sourceNode : machine.poweredBy ?? nodeId;
        powerOff(node.machine, events, { keepLight: true });
        carried = light ? { ...light, from: nodeId } : { source: node.machine, sourceNode, restore, from: nodeId };
        if (!light) state.get(node.machine).lentOut = true;
        return { result: 'borrowed', nodeId, machineId: node.machine, source: carried.source, events };
      }
      case 'retrieve': {
        carried = given.get(nodeId);
        given.delete(nodeId);
        return { result: 'retrieved', nodeId, source: carried.source, events };
      }
      case 'give': {
        given.set(nodeId, { ...carried, from: nodeId });
        const charge = carried;
        carried = null;
        return { result: 'given', nodeId, machineId: node.machine, source: charge.source, events };
      }
      case 'return': {
        const charge = carried;
        carried = null;
        sendHome(charge, events, 'returned');
        return { result: 'returned', nodeId, source: charge.source, events };
      }
      default:
        return { ...preview, events };
    }
  };

  // A fall: every borrowed light goes home at once (carried, given and
  // waiting for a bell, or powering a machine), so the world is back to how
  // the city left it and the respawn lamp can never be stranded.
  const dropLight = () => {
    const events = [];
    if (carried) { const charge = carried; carried = null; sendHome(charge, events, 'fall'); }
    for (const [nodeId, charge] of [...given]) { given.delete(nodeId); sendHome(charge, events, 'fall'); }
    for (const [id, machine] of state) if (machine.powered && machine.light) powerOff(id, events);
    return events;
  };

  // ---- respawn, city power, counterweight ----------------------------------
  // Respawn: every queued punch is forgotten; running machines keep going.
  const clearQueue = () => {
    const cleared = [...queue.values()];
    queue.clear();
    queuedAt.clear();
    waited.clear();
    holds.clear();
    return cleared;
  };

  // City-held (or train-held) power: stays on until cut. Clears any queued
  // claim on that line so the one-line rule still holds.
  const hold = (machineId, nodeId = null) => {
    if (!state.has(machineId)) return [];
    const events = [];
    const circuit = circuitOfMachine(machineId);
    const queued = circuit ? queue.get(circuit) : null;
    if (queued) { queue.delete(circuit); queuedAt.delete(queued); }
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

  // Respawn reset of a machine Butch was relying on: unpowered, at rest.
  const resetMachine = (machineId) => {
    const machine = state.get(machineId);
    if (!machine) return [];
    const events = [];
    if (machine.powered) powerOff(machineId, events);
    machine.level = 0;
    machine.load = null;
    return events;
  };

  // Counterweight: which cage carries Butch ('a', 'b' or null).
  const setLoad = (machineId, side) => {
    const machine = state.get(machineId);
    if (machine) machine.load = side === 'a' || side === 'b' ? side : null;
  };

  // The chase quickens the bell. The meter keeps its phase, so nothing jumps.
  const setBellMs = (ms) => {
    const next = Math.max(flickerMs * 2, Number(ms) || BELL_MS);
    if (next === bellMs) return bellMs;
    sinceBell = (sinceBell / bellMs) * next;
    bellMs = next;
    return bellMs;
  };

  // What the next bell will move: Listen's ghost preview. Punches waiting
  // for the other phase's bell are listed with inBells: 2.
  const preview = () => {
    const toBell = bellMs - sinceBell;
    const changes = [];
    for (const [circuit, nodeId] of queue) {
      changes.push({ machineId: nodeById.get(nodeId).machine, nodeId, to: 'on', inBells: bellsUntilNode(nodeById.get(nodeId)) });
    }
    for (const nodeId of given.keys()) changes.push({ machineId: nodeById.get(nodeId).machine, nodeId, to: 'on', inBells: bellsUntilNode(nodeById.get(nodeId)), borrowed: true });
    for (const [id, machine] of state) {
      if (machine.powered && !machine.held && machine.remaining <= toBell) {
        if (!changes.some((change) => change.machineId === id)) changes.push({ machineId: id, nodeId: machine.poweredBy, to: 'off', inBells: 1 });
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
      phase: node.phase,
      dead: node.dead,
      queued,
      inBells: queued ? bellsUntilNode(node) : null,
      waiting: waited.has(nodeId),
      given: given.has(nodeId),
      powering,
      poweringMachine: machine.powered,
      charged: Boolean(machine.powered && machine.light),
      lentOut: machine.lentOut,
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
      borrowed: Boolean(machine.light),
      lightSource: machine.light?.source ?? null,
      lentOut: machine.lentOut,
      load: machine.load,
      // A lift holding a bell for its rider (its node waited once).
      waiting: [...waited].some((nodeId) => nodeById.get(nodeId).machine === machineId),
    };
  };

  const snapshot = () => ({
    timeMs: Math.round(timeMs),
    bell: bellIndex,
    bellMs,
    nextBell: nextIndex() % 2 ? 'odd' : 'even',
    msToBell: Math.round(bellMs - sinceBell),
    bellPhase: Number((sinceBell / bellMs).toFixed(3)),
    queued: Object.fromEntries(queue),
    given: [...given.keys()],
    carried: carried ? { source: carried.source, from: carried.from } : null,
    machines: Object.fromEntries([...state.keys()].map((id) => {
      const status = machineStatus(id);
      return [id, {
        powered: status.powered,
        held: status.held,
        cut: status.cut,
        flicker: status.flicker,
        remaining: status.remaining,
        level: Number(status.level.toFixed(2)),
        ...(status.borrowed ? { borrowed: status.lightSource } : {}),
        ...(status.lentOut ? { lentOut: true } : {}),
        ...(status.load ? { load: status.load } : {}),
      }];
    })),
    afterglow: Object.fromEntries([...afterglow].map(([id, ms]) => [id, Math.round(ms)])),
    memoryLight,
    countdown: countdown ? { remaining: countdown.remaining, total: countdown.total, done: Boolean(countdown.done), held: Boolean(countdown.held) } : null,
  });

  return {
    update,
    punch,
    punchPreview,
    takeBack,
    lamp,
    borrowPreview,
    setShouldWait: (fn) => { waitFor = typeof fn === 'function' ? fn : null; },
    holdOf: (district) => holds.get(district) ?? null,
    dropLight,
    carried: () => (carried ? { ...carried } : null),
    clearQueue,
    hold,
    release,
    settle,
    resetMachine,
    setLoad,
    setBellMs,
    preview,
    nodeStatus,
    machineStatus,
    snapshot,
    lineOf,
    circuitOf: circuitOfMachine,
    phaseOf: (machineId) => phaseOfCircuit(circuitOfMachine(machineId)),
    lineBusy: (circuit) => Boolean(busyMachineOn(circuit)),
    queuedOn: (circuit) => queue.get(circuit) ?? null,
    isQueued: (nodeId) => [...queue.values()].includes(nodeId),
    setMemoryLight: (on) => { memoryLight = Boolean(on); if (!memoryLight) afterglow.clear(); },
    memoryLightOn: () => memoryLight,
    afterglowOf: (nodeId) => (afterglow.has(nodeId) ? afterglow.get(nodeId) / memoryMs : 0),
    startCountdown: (bells = 12) => { countdown = { total: bells, remaining: bells, done: false, held: false }; return { ...countdown }; },
    // While held (a fall and its respawn), bells ring but do not count down.
    holdCountdown: (on = true) => { if (countdown) countdown.held = Boolean(on); return countdown ? countdown.held : false; },
    stopCountdown: () => { countdown = null; },
    countdown: () => (countdown ? { ...countdown } : null),
    history: (fromBell = 0) => history.filter((entry) => entry.bell > fromBell).map((entry) => ({ ...entry })),
    get bellIndex() { return bellIndex; },
    get timeMs() { return timeMs; },
    get bellMs() { return bellMs; },
    msToBell: () => bellMs - sinceBell,
    sinceBell: () => sinceBell,
    bellPhase: () => sinceBell / bellMs,
    nextBellParity: () => (nextIndex() % 2 ? 'odd' : 'even'),
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
