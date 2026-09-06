export const INFLATION_PIGMENT = Object.freeze({
  GOLD: 'gold-ochre',
  BONE: 'gold-ochre',
  INDIGO: 'indigo',
  VERDIGRIS: 'verdigris',
});

export const INFLATION_SLOT_CAPACITY = 0.62;
export const INFLATION_TRANSFER_PER_SECOND = 0.72;
export const INFLATION_DONE_AT = 0.96;

const ACTS = Object.freeze([
  { id: 'bread', pigment: INFLATION_PIGMENT.GOLD, sourceX: 378, noteX: 560, repairNoteX: 1280, repairX: 1420 },
  { id: 'medicine', pigment: INFLATION_PIGMENT.INDIGO, sourceX: 418, noteX: 740, repairNoteX: 2060, repairX: 2200 },
  { id: 'timber', pigment: INFLATION_PIGMENT.VERDIGRIS, sourceX: 458, noteX: 920, repairNoteX: 2800, repairX: 2940 },
]);

function makeRegion(act, index, role) {
  if (role === 'source') return {
    id: `ink-${act.id}`, role, act: index, pigment: act.pigment,
    x: act.sourceX, y: 394, w: 32, h: 28, capacity: INFLATION_SLOT_CAPACITY, coverage: 1,
  };
  if (role === 'note') return {
    id: `note-${act.id}`, role, act: index, pigment: act.pigment,
    x: act.noteX, y: 348, w: 88, h: 68, capacity: INFLATION_SLOT_CAPACITY, coverage: 0,
  };
  return {
    id: `repair-${act.id}`, role, act: index, pigment: act.pigment,
    x: act.repairX - 58, y: 322, w: 116, h: 104, capacity: INFLATION_SLOT_CAPACITY, coverage: 0,
  };
}

export function createPaintedCountryInflationModel() {
  const state = {
    phase: 'money', phaseTimer: 0,
    moneyGiven: 0, pricePressure: 0, servedResidents: [], repaired: [],
    brush: [{ pigment: null, load: 0 }, { pigment: null, load: 0 }],
    regions: ACTS.flatMap((act, index) => [makeRegion(act, index, 'source'), makeRegion(act, index, 'note'), makeRegion(act, index, 'repair')]),
    events: [], complete: false,
  };

  const byId = (id) => state.regions.find((region) => region.id === id);
  const emit = (type, payload = {}) => state.events.push({ type, ...payload });
  const activeIndex = () => state.phase === 'money' ? state.moneyGiven : state.repaired.length;

  function visible(region) {
    const index = activeIndex();
    if (state.phase === 'money') return region.act === index && (region.role === 'source' || region.role === 'note');
    if (state.phase === 'crisis') return false;
    if (state.phase === 'repair') return region.act === index && (region.role === 'note' || region.role === 'repair');
    return false;
  }

  function bounds(region) {
    if (region.role === 'note' && state.phase === 'repair') {
      const act = ACTS[region.act];
      return { x: act.repairNoteX - 44, y: 340, w: region.w, h: region.h };
    }
    return region;
  }

  function regionAt(x, y, pad = 12) {
    return state.regions.find((region) => {
      if (!visible(region)) return false;
      const box = bounds(region);
      return x >= box.x - pad && x <= box.x + box.w + pad && y >= box.y - pad && y <= box.y + box.h + pad;
    }) ?? null;
  }

  function slotFor(pigment) {
    return state.brush.find((slot) => slot.pigment === pigment && slot.load > 0.0001);
  }

  function slotToFill(pigment) {
    return state.brush.find((slot) => slot.pigment === pigment) ?? state.brush.find((slot) => slot.load <= 0.0001);
  }

  function wash(regionId, seconds) {
    const region = byId(regionId);
    if (!region || !visible(region)) return 0;
    const canWash = region.role === 'source' || (state.phase === 'repair' && region.role === 'note');
    if (!canWash || region.coverage <= 0) return 0;
    const slot = slotToFill(region.pigment);
    if (!slot) {
      emit('brush-full', { id: region.id });
      return 0;
    }
    const room = INFLATION_SLOT_CAPACITY - slot.load;
    const held = region.coverage * region.capacity;
    const amount = Math.min(INFLATION_TRANSFER_PER_SECOND * seconds, room, held);
    if (amount <= 0) return 0;
    slot.pigment = region.pigment;
    slot.load += amount;
    region.coverage = Math.max(0, region.coverage - amount / region.capacity);
    emit('washed', { id: region.id, amount });
    return amount;
  }

  function paint(regionId, seconds) {
    const region = byId(regionId);
    if (!region || !visible(region)) return 0;
    const canPaint = (state.phase === 'money' && region.role === 'note') || (state.phase === 'repair' && region.role === 'repair');
    if (!canPaint) return 0;
    const slot = slotFor(region.pigment);
    if (!slot) {
      emit('wrong-or-empty-brush', { id: region.id, pigment: region.pigment });
      return 0;
    }
    const room = (1 - region.coverage) * region.capacity;
    const amount = Math.min(INFLATION_TRANSFER_PER_SECOND * seconds, slot.load, room);
    if (amount <= 0) return 0;
    slot.load -= amount;
    region.coverage = Math.min(1, region.coverage + amount / region.capacity);
    if (slot.load <= 0.0001) {
      slot.load = 0;
      slot.pigment = null;
    }
    emit('painted', { id: region.id, amount });
    if (region.coverage >= INFLATION_DONE_AT) {
      // The final wet dab settles into the paper. Clear a sub-stroke residue so
      // the forgiving completion threshold does not permanently occupy one of
      // the two physical brush cells.
      if (slot.load <= 0.05) {
        slot.load = 0;
        slot.pigment = null;
      }
      finishRegion(region);
    }
    return amount;
  }

  function finishRegion(region) {
    region.coverage = 1;
    if (state.phase === 'money' && region.role === 'note' && state.moneyGiven === region.act) {
      state.servedResidents.push(ACTS[region.act].id);
      state.moneyGiven += 1;
      state.pricePressure = state.moneyGiven;
      emit('note-issued', { id: region.id, act: region.act });
      if (state.moneyGiven === ACTS.length) {
        state.phase = 'crisis';
        state.phaseTimer = 1.8;
        emit('inflation-crisis');
      }
    } else if (state.phase === 'repair' && region.role === 'repair' && state.repaired.length === region.act) {
      state.repaired.push(ACTS[region.act].id);
      state.pricePressure = Math.max(0, ACTS.length - state.repaired.length);
      emit('supply-restored', { id: region.id, act: region.act });
      if (state.repaired.length === ACTS.length) {
        state.phase = 'complete';
        state.complete = true;
        emit('fable-complete');
      }
    }
  }

  function update(seconds) {
    if (state.phase !== 'crisis') return;
    state.phaseTimer = Math.max(0, state.phaseTimer - seconds);
    if (state.phaseTimer > 0) return;
    state.phase = 'repair';
    emit('repair-phase');
  }

  function target() {
    const index = activeIndex();
    if (state.phase === 'money') {
      const source = byId(`ink-${ACTS[index]?.id}`);
      const note = byId(`note-${ACTS[index]?.id}`);
      return source?.coverage > 0.01 && !slotFor(source.pigment) ? source : note;
    }
    if (state.phase === 'repair') {
      const note = byId(`note-${ACTS[index]?.id}`);
      const repair = byId(`repair-${ACTS[index]?.id}`);
      return note?.coverage > 0.01 && !slotFor(note.pigment) ? note : repair;
    }
    return null;
  }

  return {
    state, byId, bounds, visible, regionAt, paint, wash, update, target,
    drainEvents() {
      const events = state.events.slice();
      state.events.length = 0;
      return events;
    },
    snapshot() {
      return {
        phase: state.phase,
        moneyGiven: state.moneyGiven,
        pricePressure: state.pricePressure,
        servedResidents: [...state.servedResidents],
        repaired: [...state.repaired],
        brush: state.brush.map((slot) => ({ pigment: slot.pigment, load: Number(slot.load.toFixed(3)) })),
        activeRegion: target()?.id ?? null,
        complete: state.complete,
        regions: state.regions.filter(visible).map((region) => ({ id: region.id, coverage: Number(region.coverage.toFixed(3)), ...bounds(region) })),
      };
    },
  };
}
