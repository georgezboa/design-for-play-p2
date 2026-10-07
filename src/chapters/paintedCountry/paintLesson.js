// Chapter 4 // THE PAINTED COUNTRY — the first lesson, on safe ground.
//
// Round 6, item 11: the tester clicked an oval drawing near the start, got a
// blue block, then tried to bridge the gap, and only then saw "LEFT-CLICK TO
// PAINT PAPER ACROSS GAPS". Now the lesson comes first, on the cold end's
// floor where nothing can go wrong:
//
//   ghost  a dashed stroke a step above the floor, with a nib painting along
//          it: "LEFT MOUSE · PAINT ALONG THE DOTTED LINE". The cursor is a
//          brush and says LEFT CLICK · PAINT before the first click.
//   hop    the paint is real: "SPACE · JUMP ONTO IT".
//   gap    the application: paint a bridge across the hole. If the player
//          walked past the step without painting, or stands at the gap a
//          while, the gap gets its own dashed stroke.
//   done   he is across.
//
// A paint anywhere off the ghost while it is up is not refused (paint is
// never refused for being in the "wrong" place); it is named, once, so a
// click on a drawing never silently becomes a block.
//
// Pure: no Phaser. PaintedCountryScene.js asks it what to show.

export const PAINT_LESSON = Object.freeze({
  // a five-cell step, two cells above the cold end's floor (one hop up),
  // just right of where Butch starts (x = 200)
  ghost: Object.freeze([13, 14, 15, 16, 17].map((c) => Object.freeze({ c, r: 20 }))),
  need: 4,
  // the first hole: FLOOR_SPANS[0].to .. FLOOR_SPANS[1].from, on the floor row
  gap: Object.freeze({ from: 20, to: 30, row: 22 }),
  pastStepX: 380,
  gapNearX: 300,
  acrossX: 620,
  gapGhostAfter: 7,
  // the verb's key rides beside the nib for this many strokes
  keyStrokes: 3,
});

export function createPaintLesson(spec = PAINT_LESSON) {
  const onGhost = (c, r) => spec.ghost.some((cell) => cell.c === c && cell.r === r);
  const state = {
    step: 'ghost',
    ghostPainted: 0,
    gapTime: 0,
    gapGhost: false,
    skippedStep: false,
    offGhostNamed: false,
    strokes: 0,
  };

  function update({ x, standingOnPaint = false, dt = 0, isPainted = () => false }) {
    const events = [];
    state.ghostPainted = spec.ghost.filter(({ c, r }) => isPainted(c, r)).length;
    if (state.step === 'ghost') {
      if (state.ghostPainted >= spec.need) {
        state.step = 'hop';
        events.push('ghost-done');
      } else if (x >= spec.pastStepX) {
        state.step = 'gap';
        state.skippedStep = true;
        state.gapGhost = true;
        events.push('skipped-step');
      }
    }
    if (state.step === 'hop') {
      if (standingOnPaint) {
        state.step = 'gap';
        events.push('hopped');
      } else if (x >= spec.pastStepX) {
        state.step = 'gap';
      }
    }
    if (state.step === 'gap') {
      if (x >= spec.gapNearX) state.gapTime += dt;
      if (!state.gapGhost && state.gapTime >= spec.gapGhostAfter) {
        state.gapGhost = true;
        events.push('gap-ghost');
      }
      if (x >= spec.acrossX) {
        state.step = 'done';
        events.push('across');
      }
    }
    return events;
  }

  // A cell was painted. Returns 'named-off-ghost' the first time paint lands
  // somewhere other than the dotted step while the step is being taught.
  function onPaint(c, r) {
    if (state.step !== 'ghost' || onGhost(c, r) || state.offGhostNamed) return null;
    state.offGhostNamed = true;
    return 'named-off-ghost';
  }

  // A press of the brush that painted something.
  function onStroke() {
    state.strokes += 1;
  }

  const ghostCells = () => (state.step === 'ghost' ? spec.ghost : []);
  const gapCells = () => {
    if (state.step !== 'gap' || !state.gapGhost) return [];
    const out = [];
    for (let c = spec.gap.from; c < spec.gap.to; c += 1) out.push({ c, r: spec.gap.row });
    return out;
  };

  return {
    state,
    spec,
    update,
    onPaint,
    onStroke,
    ghostCells,
    gapCells,
    get showKeyHint() { return state.strokes < spec.keyStrokes; },
    get done() { return state.step === 'done'; },
  };
}
