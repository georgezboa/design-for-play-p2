// Chapter 4 // THE PAINTED COUNTRY — Part II, the still life, as rules.
//
// Rosa's pencil still life of the orchard has six places she coloured in.
// The brush holds one colour at a time:
//
//   TAKE  (right-hold an object)  the brush picks up that object's colour;
//   APPLY (left-hold a region)    the region is painted with what the brush holds;
//   WASH  (right-hold a region)   the paint comes off again.
//
// Nothing is refused for being the wrong colour: a blue apple is accepted,
// and it looks wrong. The door opens when every region holds the colour she
// remembered. There is always a way back — any region can be washed and
// repainted, and the objects never run dry — so the studio cannot dead-end.

export const STUDIO_PIGMENTS = Object.freeze([
  { id: 'red', name: 'VERMILION', color: 0xc95850 },
  { id: 'orange', name: 'MARIGOLD', color: 0xd98a3a },
  { id: 'yellow', name: 'OCHRE', color: 0xd7b84a },
  { id: 'green', name: 'VERDIGRIS', color: 0x5e9172 },
  { id: 'blue', name: 'INDIGO', color: 0x537ca6 },
  { id: 'violet', name: 'MULBERRY', color: 0x84658f },
  // The archive's own colour. It is on the shelf, and it is never right.
  { id: 'grey', name: 'ARCHIVE GREY', color: 0x8f8a82 },
]);

// The objects on the shelf, one per colour. They are not used up.
export const STUDIO_SOURCES = Object.freeze([
  { id: 'red-cup', pigment: 'red', object: 'RED CUP', kind: 'cup' },
  { id: 'marigold-jar', pigment: 'orange', object: 'MARIGOLD JAR', kind: 'jar' },
  { id: 'ochre-book', pigment: 'yellow', object: 'OCHRE BOOK', kind: 'book' },
  { id: 'green-bottle', pigment: 'green', object: 'GREEN BOTTLE', kind: 'bottle' },
  { id: 'blue-jug', pigment: 'blue', object: 'BLUE JUG', kind: 'vase' },
  { id: 'violet-ribbon', pigment: 'violet', object: 'VIOLET RIBBON', kind: 'ribbon' },
  { id: 'archive-tin', pigment: 'grey', object: 'ARCHIVE TIN', kind: 'tin' },
]);

// Six places in Rosa's drawing, each with the colour she remembered.
export const STILL_LIFE_REGIONS = Object.freeze([
  { id: 'sky', label: 'THE SKY', wants: 'blue' },
  { id: 'sun', label: 'THE SUN', wants: 'yellow' },
  { id: 'leaves', label: 'THE LEAVES', wants: 'green' },
  { id: 'apple', label: 'THE APPLE', wants: 'red' },
  { id: 'plums', label: 'THE PLUMS', wants: 'violet' },
  { id: 'fox', label: 'THE FOX', wants: 'orange' },
]);

const clone = (value) => JSON.parse(JSON.stringify(value));

export function createDrawingStudio() {
  const state = {
    brush: null,
    fills: {},
    taken: [],
    events: [],
  };

  const source = (id) => STUDIO_SOURCES.find((item) => item.id === id) ?? null;
  const pigment = (id) => STUDIO_PIGMENTS.find((item) => item.id === id) ?? null;
  const region = (id) => STILL_LIFE_REGIONS.find((item) => item.id === id) ?? null;
  const emit = (type, detail = {}) => state.events.push({ type, ...detail });

  const allFilled = () => STILL_LIFE_REGIONS.every(({ id }) => Boolean(state.fills[id]));
  const isRight = (id) => state.fills[id] === region(id)?.wants;
  const isComplete = () => STILL_LIFE_REGIONS.every(({ id }) => isRight(id));
  const wrongRegions = () => STILL_LIFE_REGIONS.filter(({ id }) => state.fills[id] && !isRight(id)).map(({ id }) => id);

  function take(sourceId) {
    const item = source(sourceId);
    if (!item) return false;
    state.brush = item.pigment;
    if (!state.taken.includes(item.pigment)) state.taken.push(item.pigment);
    emit('color-taken', { source: item.id, pigment: item.pigment, object: item.object });
    return true;
  }

  function apply(regionId) {
    const spot = region(regionId);
    if (!spot) return { ok: false, reason: 'no-region' };
    if (!state.brush) {
      emit('apply-refused', { region: regionId, reason: 'dry-brush' });
      return { ok: false, reason: 'dry-brush' };
    }
    if (state.fills[regionId]) {
      emit('apply-refused', { region: regionId, reason: 'already-painted' });
      return { ok: false, reason: 'already-painted' };
    }
    const wasComplete = isComplete();
    state.fills[regionId] = state.brush;
    const right = isRight(regionId);
    emit('region-painted', { region: regionId, pigment: state.brush, right });
    if (!wasComplete && isComplete()) emit('still-life-complete');
    else if (allFilled() && !isComplete()) emit('still-life-looks-wrong', { wrong: wrongRegions() });
    return { ok: true, right };
  }

  function wash(regionId) {
    if (!state.fills[regionId]) return false;
    const wasComplete = isComplete();
    const was = state.fills[regionId];
    delete state.fills[regionId];
    emit('region-washed', { region: regionId, pigment: was });
    if (wasComplete) emit('still-life-opened-again');
    return true;
  }

  return {
    state,
    source,
    pigment,
    region,
    take,
    apply,
    wash,
    isRight,
    isComplete,
    allFilled,
    wrongRegions,
    snapshot() {
      return clone({
        brush: state.brush,
        taken: state.taken,
        fills: state.fills,
        wrong: wrongRegions(),
        filled: Object.keys(state.fills).length,
        complete: isComplete(),
      });
    },
    drainEvents() {
      const events = state.events.slice();
      state.events.length = 0;
      return events;
    },
  };
}
