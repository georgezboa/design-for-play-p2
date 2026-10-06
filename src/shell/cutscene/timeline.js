// The pure side of a cutscene: its timeline, the camera, the stage-to-screen
// fit, caption timing and the playback session (clock, pause, skip, the
// preload hold). No DOM, no canvas: node tests import this file directly.
//
// A cutscene definition (see README.md) is plain data:
//   { id, title, length: [min, max], music, shots: [shot, …] }
// and a shot is
//   { id, duration (s), draw(ctx, t, w, h, env), camera?, transition?,
//     captions?: [{ text, at, end, speaker? }], cues?: [{ at, sfx | music | stopMusic }] }
// with every time inside a shot in seconds from the shot's own start.

/** The design space every painter draws in (stage units). */
export const STAGE = Object.freeze({ w: 1600, h: 800 });
/** A caption stays up at least this long (seconds). */
export const CAPTION_MIN_S = 2.5;
/** The longest single clock step: a hitch never skips content. */
export const MAX_STEP_S = 0.25;
/** Join types, best first (docs/CUTSCENES_SPEC.md: slide, ink, crossfade). */
export const TRANSITIONS = Object.freeze(['slide', 'ink', 'fade', 'black', 'cut']);
const MOVING_TRANSITIONS = new Set(['slide', 'ink']);

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const round = (v) => Math.round(v * 1000) / 1000;

export const EASE = Object.freeze({
  linear: (t) => t,
  in: (t) => t * t,
  out: (t) => 1 - (1 - t) * (1 - t),
  inOut: (t) => 0.5 - Math.cos(Math.PI * clamp(t, 0, 1)) / 2,
});

function ease(name) {
  return typeof name === 'function' ? name : EASE[name] ?? EASE.inOut;
}

/**
 * The join from one shot into the next, as it plays under the player's
 * settings: Reduce Motion turns every moving join (slide, ink) into a
 * crossfade of the same length.
 */
export function effectiveTransition(transition, { reducedMotion = false } = {}) {
  const type = TRANSITIONS.includes(transition?.type) ? transition.type : 'fade';
  const duration = type === 'cut' ? 0 : Math.max(0, Number(transition?.duration ?? 0.9));
  if (reducedMotion && MOVING_TRANSITIONS.has(type)) return { type: 'fade', duration };
  return { type, duration };
}

/**
 * Lay the shots end to end. Each join overlaps the end of a shot with the
 * start of the next by the join's duration, so a 6 s shot followed by a
 * 1 s slide hands over at 5 s and the next shot's own clock starts there.
 */
export function buildTimeline(def, { reducedMotion = false } = {}) {
  const shots = [];
  const captions = [];
  const cues = [];
  let start = 0;
  (def?.shots ?? []).forEach((shot, index, list) => {
    const duration = Math.max(0.1, Number(shot.duration) || 0);
    const last = index === list.length - 1;
    const transition = last ? { type: 'end', duration: 0 } : effectiveTransition(shot.transition, { reducedMotion });
    // a join can never be longer than either shot it joins
    if (!last) transition.duration = Math.min(transition.duration, duration * 0.5, Math.max(0.1, Number(list[index + 1].duration) || 0) * 0.5);
    const entry = { index, id: shot.id ?? `shot-${index + 1}`, start: round(start), end: round(start + duration), duration, transition };
    shots.push(entry);
    (shot.captions ?? []).forEach((caption) => {
      const at = Number(caption.at ?? 0);
      const end = Number(caption.end ?? at + (caption.duration ?? 4));
      captions.push({ text: caption.text, speaker: caption.speaker ?? null, start: round(start + at), end: round(start + end), shot: index });
    });
    (shot.cues ?? []).forEach((cue) => cues.push({ ...cue, at: round(start + Number(cue.at ?? 0)), shot: index }));
    start += duration - (last ? 0 : transition.duration);
  });
  const duration = shots.length ? shots[shots.length - 1].end : 0;
  cues.sort((a, b) => a.at - b.at);
  captions.sort((a, b) => a.start - b.start);
  return { id: def?.id ?? null, duration: round(duration), shots, captions, cues, reducedMotion };
}

/**
 * What is on screen at `time` (seconds): one shot, or two during a join.
 * `local` is the shot's own progress 0..1, `seconds` its own clock.
 */
export function frameAt(timeline, time) {
  const t = clamp(Number(time) || 0, 0, timeline.duration);
  const live = timeline.shots.filter((shot) => t >= shot.start && t <= shot.end);
  const layer = (shot) => ({ index: shot.index, id: shot.id, seconds: round(t - shot.start), local: clamp((t - shot.start) / shot.duration, 0, 1) });
  let layers = live.map(layer);
  let transition = null;
  if (layers.length > 1) {
    const [from, to] = live.slice(-2);
    const span = from.end - to.start;
    const progress = span > 0 ? clamp((t - to.start) / span, 0, 1) : 1;
    layers = [layer(from), layer(to)];
    transition = { type: from.transition.type, progress: round(progress), from: from.index, to: to.index };
  } else if (!layers.length && timeline.shots.length) {
    layers = [layer(timeline.shots[timeline.shots.length - 1])];
  }
  return {
    time: round(t),
    done: t >= timeline.duration,
    shot: layers[layers.length - 1]?.index ?? 0,
    layers,
    transition,
    captions: captionsAt(timeline, t),
  };
}

export function captionsAt(timeline, time) {
  return timeline.captions.filter((caption) => time >= caption.start && time < caption.end);
}

/**
 * The camera at a shot's progress: { x, y, zoom }, x and y the stage point
 * (0..1) at the centre of the view. Reduce Motion holds the shot's `still`
 * framing (or its first) for the whole shot.
 */
export function cameraAt(camera, local, { reducedMotion = false } = {}) {
  const base = { x: 0.5, y: 0.5, zoom: 1 };
  if (!camera) return base;
  const from = { ...base, ...(camera.from ?? camera) };
  const to = { ...from, ...(camera.to ?? {}) };
  if (reducedMotion) return { ...from, ...(camera.still ?? {}) };
  const k = ease(camera.ease)(clamp(local, 0, 1));
  return {
    x: from.x + (to.x - from.x) * k,
    y: from.y + (to.y - from.y) * k,
    zoom: from.zoom + (to.zoom - from.zoom) * k,
  };
}

/**
 * Fit the stage into a `w` × `h` panel: cover, so the panel is always full,
 * then the camera's zoom about its centre, clamped so the view never leaves
 * the stage. Returns the transform (stage units → panel px) and the stage
 * rect that is visible.
 */
export function stageView(w, h, camera = { x: 0.5, y: 0.5, zoom: 1 }, stage = STAGE) {
  const cover = Math.max(w / stage.w, h / stage.h);
  const scale = cover * Math.max(1, camera.zoom ?? 1);
  const vw = w / scale;
  const vh = h / scale;
  const cx = clamp((camera.x ?? 0.5) * stage.w, vw / 2, stage.w - vw / 2);
  const cy = clamp((camera.y ?? 0.5) * stage.h, vh / 2, stage.h - vh / 2);
  const view = { x: round(cx - vw / 2), y: round(cy - vh / 2), w: round(vw), h: round(vh) };
  return { scale: round(scale * 1e3) / 1e3, tx: round(-view.x * scale), ty: round(-view.y * scale), view };
}

/**
 * Where the painted panel sits on a W × H window (CSS px): a brass-framed
 * window on the walnut carriage wall, as Chapter 1's panels, with the caption
 * bar below it. Its aspect stays between 1.25 : 1 (a tall window) and
 * 2.4 : 1 (an ultrawide one); the caption band grows with TEXT SIZE.
 */
export function panelLayout(width, height, { textScale = 1 } = {}) {
  const W = Math.max(320, Math.round(width));
  const H = Math.max(320, Math.round(height));
  const margin = clamp(Math.min(W, H) * 0.035, 12, 40);
  const frame = clamp(Math.min(W, H) * 0.012, 6, 14);
  // two caption lines at the current text size, plus the bar's padding
  const caption = clamp(Math.round(40 + 24 * 1.4 * 2 * clamp(textScale, 0.8, 1.6)), 96, 170);
  const availW = W - margin * 2;
  const availH = H - margin - caption - frame;
  let w = availW;
  let h = Math.min(availH, w / 1.25);
  if (w / h > 2.4) w = h * 2.4;
  const x = (W - w) / 2;
  const y = Math.max(margin, margin + (availH - h) / 2);
  const panel = { x: round(x), y: round(y), w: round(w), h: round(h), r: round(clamp(Math.min(w, h) * 0.03, 8, 22)) };
  return { W, H, margin: round(margin), frame: round(frame), panel, captionTop: round(panel.y + panel.h + frame), captionWidth: round(Math.min(1180, Math.max(panel.w, Math.min(W - 24, 560)))) };
}

/** How far a layer at `depth` (1 = the stage plane, 0 = infinitely far) moves with the camera. */
export function parallaxOffset(camera, depth, stage = STAGE) {
  const k = 1 - clamp(depth, 0, 1);
  return { x: round(((camera.x ?? 0.5) - 0.5) * stage.w * k), y: round(((camera.y ?? 0.5) - 0.5) * stage.h * k) };
}

/**
 * Check a definition against docs/CUTSCENES_SPEC.md: 4–7 shots, its length
 * range, 3–5 captions of one or two lines, each up for CAPTION_MIN_S or more,
 * never two at once, all inside the cutscene. Returns a list of problems.
 */
export function validateCutscene(def) {
  const problems = [];
  const timeline = buildTimeline(def);
  const n = timeline.shots.length;
  if (n < 4 || n > 7) problems.push(`${def.id}: ${n} shots (4–7)`);
  const [min, max] = def.length ?? [25, 40];
  if (timeline.duration < min || timeline.duration > max) problems.push(`${def.id}: ${timeline.duration} s long (${min}–${max})`);
  const caps = timeline.captions;
  if (caps.length < 3 || caps.length > 5) problems.push(`${def.id}: ${caps.length} captions (3–5)`);
  caps.forEach((caption, i) => {
    const length = round(caption.end - caption.start);
    if (length < CAPTION_MIN_S) problems.push(`${def.id}: caption ${i + 1} is up ${length} s (≥ ${CAPTION_MIN_S})`);
    if (caption.start < 0 || caption.end > timeline.duration) problems.push(`${def.id}: caption ${i + 1} runs outside the cutscene`);
    if (String(caption.text).split('\n').length > 2) problems.push(`${def.id}: caption ${i + 1} has more than two lines`);
    const next = caps[i + 1];
    if (next && next.start < caption.end) problems.push(`${def.id}: captions ${i + 1} and ${i + 2} overlap`);
  });
  def.shots.forEach((shot, i) => {
    if (typeof shot.draw !== 'function') problems.push(`${def.id}: shot ${i + 1} has no painter`);
    const type = shot.transition?.type;
    if (i < n - 1 && type && !TRANSITIONS.includes(type)) problems.push(`${def.id}: shot ${i + 1} has an unknown join "${type}"`);
  });
  return problems;
}

// ---------------------------------------------------------------------------
// playback session: the wall clock, pause reasons, skip, the preload hold

/**
 * One playback of a timeline. Feed it wall-clock milliseconds with tick();
 * it advances by the real time since the last tick (capped at MAX_STEP_S, so
 * a frame that took two seconds to paint never skips a caption), stands
 * still while any pause reason is held, and reports the cues it crossed.
 *
 * status: 'playing' → 'holding' (the last frame, waiting for the next
 * chapter: `ready` false) → 'done'. skip() jumps straight to the end and
 * fires no cues; a skip still waits for `ready`.
 */
export function createSession(timeline, { ready = true, maxStep = MAX_STEP_S } = {}) {
  let time = 0;
  let last = null;
  let status = 'playing';
  let skipped = false;
  let isReady = Boolean(ready);
  const reasons = new Set();
  let cueIndex = 0;

  const settle = () => {
    if (time < timeline.duration) return;
    time = timeline.duration;
    if (status === 'playing') status = isReady ? 'done' : 'holding';
    else if (status === 'holding' && isReady) status = 'done';
  };

  return {
    tick(now) {
      const fired = [];
      if (last === null || reasons.size) { last = now; return fired; }
      const step = Math.min(maxStep, Math.max(0, (now - last) / 1000));
      last = now;
      if (status !== 'playing') { settle(); return fired; }
      time = Math.min(timeline.duration, time + step);
      while (cueIndex < timeline.cues.length && timeline.cues[cueIndex].at <= time) {
        fired.push(timeline.cues[cueIndex]);
        cueIndex += 1;
      }
      settle();
      return fired;
    },
    pause(reason = 'menu') { reasons.add(reason); last = null; },
    resume(reason = 'menu') { reasons.delete(reason); last = null; },
    skip() {
      if (status === 'done') return;
      skipped = true;
      time = timeline.duration;
      cueIndex = timeline.cues.length;
      status = 'playing';
      settle();
    },
    /** The next chapter is ready: a holding session finishes. */
    markReady() { isReady = true; settle(); },
    /** Jump (dev seek): cues before `t` are treated as already fired. */
    seek(t) {
      time = clamp(t, 0, timeline.duration);
      cueIndex = timeline.cues.findIndex((cue) => cue.at > time);
      if (cueIndex < 0) cueIndex = timeline.cues.length;
      if (time < timeline.duration && status === 'holding') status = 'playing';
      settle();
    },
    frame() { return frameAt(timeline, time); },
    get time() { return time; },
    get status() { return status; },
    get paused() { return reasons.size > 0; },
    get pauseReasons() { return [...reasons]; },
    get skipped() { return skipped; },
    get ready() { return isReady; },
  };
}
