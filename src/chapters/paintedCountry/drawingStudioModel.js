// Chapter 4 // THE PAINTED COUNTRY — Part II, the still life, as rules.
//
// Rosa's pencil still life of the orchard has six places she coloured in.
// The brush holds one colour at a time:
//
//   TAKE  (right-hold an object)  the brush picks up that object's colour;
//   APPLY (left-hold a region)    the region is painted with what the brush holds;
//   WASH  (right-hold a region)   the paint comes off again.
//
// Round 11 (George: "I had no idea which colour each thing wants"): every
// place says what it wants. Rosa noted the colour beside each thing in her
// drawing (`note`, in her words), its colour shows faintly under her pencil,
// and the objects on the shelf go by the same plain names (`plain`). A wrong
// colour is no longer laid down to be washed off again: the paper will not
// take it, and the room says which colour she noted instead. The door opens
// when every region holds the colour she remembered; the objects never run
// dry, so the studio cannot dead-end.

// `plain` is the colour's everyday name (what every tag leads with); `name`
// is the gouache's, kept as the paint's own label.
export const STUDIO_PIGMENTS = Object.freeze([
  { id: 'red', plain: 'RED', name: 'VERMILION', color: 0xc95850 },
  { id: 'orange', plain: 'ORANGE', name: 'MARIGOLD', color: 0xd98a3a },
  { id: 'yellow', plain: 'YELLOW', name: 'OCHRE', color: 0xd7b84a },
  { id: 'green', plain: 'GREEN', name: 'VERDIGRIS', color: 0x5e9172 },
  { id: 'blue', plain: 'BLUE', name: 'INDIGO', color: 0x537ca6 },
  { id: 'violet', plain: 'PURPLE', name: 'MULBERRY', color: 0x84658f },
  // The archive's own colour. It is on the shelf, and it is never right.
  { id: 'grey', plain: 'GREY', name: 'ARCHIVE GREY', color: 0x8f8a82 },
]);

// The objects on the shelf, one per colour. They are not used up.
export const STUDIO_SOURCES = Object.freeze([
  { id: 'red-cup', pigment: 'red', object: 'RED CUP', kind: 'cup' },
  { id: 'marigold-jar', pigment: 'orange', object: 'ORANGE JAR', kind: 'jar' },
  { id: 'ochre-book', pigment: 'yellow', object: 'YELLOW BOOK', kind: 'book' },
  { id: 'green-bottle', pigment: 'green', object: 'GREEN BOTTLE', kind: 'bottle' },
  { id: 'blue-jug', pigment: 'blue', object: 'BLUE JUG', kind: 'vase' },
  { id: 'violet-ribbon', pigment: 'violet', object: 'PURPLE RIBBON', kind: 'ribbon' },
  { id: 'archive-tin', pigment: 'grey', object: 'ARCHIVE TIN', kind: 'tin' },
]);

// Six places in Rosa's drawing, each with the colour she remembered and the
// word she wrote beside it (`note`).
export const STILL_LIFE_REGIONS = Object.freeze([
  { id: 'sky', label: 'THE SKY', wants: 'blue', note: 'blue' },
  { id: 'sun', label: 'THE SUN', wants: 'yellow', note: 'yellow' },
  { id: 'leaves', label: 'THE LEAVES', wants: 'green', note: 'green' },
  { id: 'apple', label: 'THE APPLE', wants: 'red', note: 'red' },
  { id: 'plums', label: 'THE PLUMS', wants: 'violet', note: 'purple' },
  { id: 'fox', label: 'THE FOX', wants: 'orange', note: 'orange' },
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
  // The source on the shelf that holds the colour a place wants.
  const sourceFor = (regionId) => STUDIO_SOURCES.find((item) => item.pigment === region(regionId)?.wants) ?? null;

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
    // the paper will not take a colour she did not note here
    if (state.brush !== spot.wants) {
      emit('apply-refused', { region: regionId, reason: 'wrong-colour', pigment: state.brush, wants: spot.wants });
      return { ok: false, reason: 'wrong-colour', wants: spot.wants };
    }
    const wasComplete = isComplete();
    state.fills[regionId] = state.brush;
    emit('region-painted', { region: regionId, pigment: state.brush, right: true });
    if (!wasComplete && isComplete()) emit('still-life-complete');
    else if (allFilled() && !isComplete()) emit('still-life-looks-wrong', { wrong: wrongRegions() });
    return { ok: true, right: true };
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
    sourceFor,
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
