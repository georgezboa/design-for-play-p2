export const STUDIO_PIGMENTS = Object.freeze([
  { id: 'red', name: 'VERMILION', color: 0xc95850 },
  { id: 'yellow', name: 'OCHRE', color: 0xd7b84a },
  { id: 'green', name: 'VERDIGRIS', color: 0x5e9172 },
  { id: 'teal', name: 'SEA GLASS', color: 0x4f9794 },
  { id: 'blue', name: 'INDIGO', color: 0x537ca6 },
  { id: 'violet', name: 'MULBERRY', color: 0x84658f },
]);

export const STUDIO_SOURCES = Object.freeze([
  { id: 'red-cup', pigment: 'red', object: 'RED CUP', kind: 'cup', targetCell: '1,2' },
  { id: 'red-apple', pigment: 'red', object: 'RED APPLE', kind: 'ball', targetCell: '2,1' },
  { id: 'red-spool', pigment: 'red', object: 'RED SPOOL', kind: 'spool', targetCell: '2,2' },
  { id: 'yellow-book', pigment: 'yellow', object: 'YELLOW BOOK', kind: 'book', targetCell: '6,1' },
  { id: 'yellow-clock', pigment: 'yellow', object: 'YELLOW CLOCK', kind: 'clock', targetCell: '6,2' },
  { id: 'yellow-tin', pigment: 'yellow', object: 'YELLOW TIN', kind: 'tin', targetCell: '7,2' },
  { id: 'green-plant', pigment: 'green', object: 'GREEN PLANT', kind: 'plant', targetCell: '2,3' },
  { id: 'green-bottle', pigment: 'green', object: 'GREEN BOTTLE', kind: 'bottle', targetCell: '3,3' },
  { id: 'green-box', pigment: 'green', object: 'GREEN BOX', kind: 'box', targetCell: '4,4' },
  { id: 'green-leaf', pigment: 'green', object: 'GREEN LEAF', kind: 'leaf', targetCell: '6,3' },
  { id: 'blue-phone', pigment: 'blue', object: 'BLUE TELEPHONE', kind: 'phone', targetCell: '3,5' },
  { id: 'blue-vase', pigment: 'blue', object: 'BLUE VASE', kind: 'vase', targetCell: '4,5' },
  { id: 'blue-ball', pigment: 'blue', object: 'BLUE BALL', kind: 'ball', targetCell: '5,5' },
  { id: 'teal-kettle', pigment: 'teal', object: 'TEAL KETTLE', kind: 'kettle', targetCell: '3,6' },
  { id: 'teal-bottle', pigment: 'teal', object: 'TEAL BOTTLE', kind: 'bottle', targetCell: '4,6' },
  { id: 'teal-cushion', pigment: 'teal', object: 'TEAL CUSHION', kind: 'cushion', targetCell: '5,6' },
  { id: 'violet-ribbon', pigment: 'violet', object: 'VIOLET RIBBON', kind: 'ribbon', targetCell: '4,7' },
  { id: 'violet-jar', pigment: 'violet', object: 'VIOLET JAR', kind: 'jar', targetCell: '4,8' },
]);

export const REQUIRED_CELLS = Object.freeze(
  STUDIO_SOURCES.map(({ targetCell, pigment, id }) => ({ cell: targetCell, pigment, token: id })),
);

const clone = (value) => JSON.parse(JSON.stringify(value));

export function createDrawingStudio() {
  const state = {
    sources: STUDIO_SOURCES.map((source) => ({ ...source, drained: false })),
    // A pocket palette, not a single hand slot. The studio is about collecting
    // and comparing colors, so making the player shuttle one source at a time
    // adds friction without adding a decision.
    palette: [],
    required: {},
    free: {},
    events: [],
  };

  const source = (id) => state.sources.find((item) => item.id === id) ?? null;
  const pigment = (id) => STUDIO_PIGMENTS.find((item) => item.id === id) ?? null;
  const requiredCell = (cell) => REQUIRED_CELLS.find((item) => item.cell === cell) ?? null;
  const emit = (type, detail = {}) => state.events.push({ type, ...detail });

  function extract(id) {
    const item = source(id);
    if (!item || item.drained) return false;
    item.drained = true;
    state.palette.push(item.id);
    emit('color-extracted', { source: item.id, pigment: item.pigment, object: item.object });
    return true;
  }

  function placeRequired(cell) {
    const wanted = requiredCell(cell);
    if (!wanted || state.required[cell]) return false;
    const token = state.palette.find((id) => source(id)?.pigment === wanted.pigment);
    if (!token) return false;
    if (source(token)?.pigment !== wanted.pigment) {
      emit('wrong-required-color', {
        cell,
        held: source(token)?.pigment ?? null,
        wanted: wanted.pigment,
      });
      return false;
    }
    state.required[cell] = token;
    state.palette.splice(state.palette.indexOf(token), 1);
    emit('required-cell-filled', { cell, pigment: wanted.pigment });
    if (isComplete()) emit('copy-complete');
    return true;
  }

  function liftRequired(cell) {
    if (!state.required[cell]) return false;
    const wasComplete = isComplete();
    const token = state.required[cell];
    state.palette.push(token);
    delete state.required[cell];
    emit('required-cell-lifted', { cell, token });
    if (wasComplete) emit('copy-opened-again');
    return true;
  }

  function placeFree(cell) {
    const token = state.palette.at(-1);
    if (!cell || state.free[cell] || !token) return false;
    state.free[cell] = token;
    const item = source(token);
    state.palette.splice(state.palette.lastIndexOf(token), 1);
    emit('free-cell-filled', { cell, pigment: item?.pigment ?? null });
    return true;
  }

  function liftFree(cell) {
    if (!state.free[cell]) return false;
    const token = state.free[cell];
    state.palette.push(token);
    delete state.free[cell];
    emit('free-cell-lifted', { cell, token });
    return true;
  }

  function isComplete() {
    return REQUIRED_CELLS.every(({ cell, pigment: wanted }) => {
      const token = state.required[cell];
      return token && source(token)?.pigment === wanted;
    });
  }

  function allSourcesDrained() {
    return state.sources.every((item) => item.drained) && state.palette.length === 0;
  }

  // The concealed stone is a cabinet reward: it is uncovered when every
  // physical keepsake has been lifted out of its compartment. The player does
  // not need to spend that carried color first, or the empty cabinet would
  // misleadingly remain blank while all of its objects are already gone.
  function allSourcesExtracted() {
    return state.sources.every((item) => item.drained);
  }

  function tokenLocationCount() {
    const undrained = state.sources.filter((item) => !item.drained).length;
    return undrained + state.palette.length + Object.keys(state.required).length + Object.keys(state.free).length;
  }

  return {
    state,
    source,
    pigment,
    paletteFor: (pigmentId) => state.palette.filter((id) => source(id)?.pigment === pigmentId),
    requiredCell,
    extract,
    placeRequired,
    liftRequired,
    placeFree,
    liftFree,
    isComplete,
    allSourcesDrained,
    allSourcesExtracted,
    tokenLocationCount,
    snapshot() {
      return clone({
        sources: state.sources,
        // `held` remains a compatibility summary for old QA; UI should use
        // `palette` to show every collected source.
        held: state.palette.at(-1) ?? null,
        palette: [...state.palette],
        required: state.required,
        free: state.free,
        complete: isComplete(),
        allSourcesDrained: allSourcesDrained(),
        allSourcesExtracted: allSourcesExtracted(),
        tokenLocationCount: tokenLocationCount(),
      });
    },
    drainEvents() {
      const events = state.events.slice();
      state.events.length = 0;
      return events;
    },
  };
}
