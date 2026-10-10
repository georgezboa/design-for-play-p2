// Chapter 1 // NIGHT SERVICE — the flights between acts (round 11).
//
// George: "the joins between the acts are not smooth; better not to link I
// and II with a black screen". An act that ends with a `flight` hands its
// last frame to the next act (PanelScene.gotoAct), which opens on it: its
// own first window laid over the window the eye was on, its camera pushed in
// so that its figure stands where the last act's figure stood (as tall), or
// on a chosen box; the picture dissolves into it, then the camera pulls back
// while the window glides home and the other windows light up.
//
// The geometry and the timeline are here (pure, tested in
// tests/nightService/round11.test.mjs); PanelScene draws them.

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const ease = (t) => 0.5 - Math.cos(Math.PI * clamp(t, 0, 1)) / 2;

/** The other windows while a flight holds the eye on one: dimmed, never black. */
export const FLIGHT_DIM = 0.78;
/** The deepest push a flight starts from (beyond it the painting is too soft). */
export const FLIGHT_MAX_ZOOM = 3;
/** Under Reduce Motion a flight is a short crossfade in place. */
export const FLIGHT_REDUCED_MS = 420;

/** A camera focus `{ cx, cy, zoom }` (tile px) kept inside the painting: its edges never show. */
export function clampFocus({ cx, cy, zoom }, tileW, tileH) {
  const z = clamp(zoom, 1, FLIGHT_MAX_ZOOM);
  const hw = tileW / (2 * z);
  const hh = tileH / (2 * z);
  return { cx: clamp(cx, hw, tileW - hw), cy: clamp(cy, hh, tileH - hh), zoom: z };
}

/**
 * The focus that puts a figure's feet (`feet`, tile-normalised) on the
 * screen point `anchor.x, anchor.y` at the on-screen height `anchor.h`, in a
 * window centred on `centre` (screen px) whose camera shows `k` screen px per
 * tile px at zoom 1, when the figure is `tall` screen px at zoom 1.
 */
export function matchFocus({ feet, tall, anchor, centre, k, tileW, tileH }) {
  const zoom = clamp(anchor.h / tall, 1, FLIGHT_MAX_ZOOM);
  return clampFocus({
    cx: feet.x * tileW - (anchor.x - centre.x) / (zoom * k),
    cy: feet.y * tileH - (anchor.y - centre.y) / (zoom * k),
    zoom,
  }, tileW, tileH);
}

/** The focus that fills the window with a box `[x, y, w, h]` (tile-normalised). */
export function rectFocus([x, y, w, h], tileW, tileH) {
  return clampFocus({ cx: (x + w / 2) * tileW, cy: (y + h / 2) * tileH, zoom: 1 / Math.max(w, h) }, tileW, tileH);
}

/**
 * Where the arriving window starts: centred on the last act's window `win`
 * (screen px; null: its own slot), at the scale that fits it inside that
 * window (Act 3's narrower windows keep their shape).
 */
export function flightPlacement(win, slot, tileW, tileH, base = 1) {
  if (!win) return { x: slot.x, y: slot.y, scale: 1, centre: { x: slot.x + slot.w / 2, y: slot.y + slot.h / 2 } };
  const scale = Math.min(win.w / (tileW * base), win.h / (tileH * base));
  const centre = { x: win.x + win.w / 2, y: win.y + win.h / 2 };
  return { x: centre.x - slot.w / 2, y: centre.y - slot.h / 2, scale, centre };
}

/**
 * The flight at time `t` (0..1 of its duration): how much of the last act's
 * picture is left (`picture`), how far the camera has pulled back (`pull`)
 * and the window glided home (`glide`), and each other window's cover
 * (`cover(i)`, of `count`). The dissolve happens while the camera is still; the camera
 * starts back while it ends; the other windows light up as the window lands.
 */
export function flightFrame(t, { reduce = false, count = 3 } = {}) {
  if (reduce) {
    const k = ease(t);
    return { picture: 1 - ease(t / 0.9), pull: 1, glide: 1, cover: () => FLIGHT_DIM * (1 - k) };
  }
  return {
    picture: 1 - ease((t - 0.04) / 0.3),
    pull: ease((t - 0.2) / 0.6),
    glide: ease((t - 0.28) / 0.6),
    // (one after another, the last lit as the flight ends, however many there are)
    cover: (i) => FLIGHT_DIM * (1 - ease((t - 0.58 - (0.1 * i) / Math.max(1, count - 1)) / 0.32)),
  };
}

/** The camera between the start focus and the window's own view, `p` of the way back (zoom in log space). */
export function pullFocus(start, p, tileW, tileH) {
  return {
    cx: start.cx + (tileW / 2 - start.cx) * p,
    cy: start.cy + (tileH / 2 - start.cy) * p,
    zoom: Math.exp(Math.log(start.zoom) * (1 - p)),
  };
}

/**
 * Every Chapter 1 act join, as `{ from, to, kind }`: 'grow' (the next act
 * unfolds from this one's wall), 'flight' (this act ends on a flight and the
 * next one answers it), 'black' (a fade to black: only the chapter's end
 * should be), or 'cut'.
 */
export function actJoins(acts, order) {
  return order.map((id) => {
    const act = acts[id];
    const last = act.steps.at(-1)?.do ?? [];
    const end = last.find((e) => e.nextAct !== undefined || e.endChapter);
    const to = end?.nextAct === true ? act.next : end?.nextAct ?? null;
    const fx = last.filter((e) => e.fx).map((e) => (typeof e.fx === 'string' ? e.fx : e.fx.name));
    const next = to ? acts[to] : null;
    let kind = 'cut';
    if (fx.includes('fadeAll')) kind = 'black';
    else if (next?.growFrom?.act === id) kind = 'grow';
    else if (fx.includes('flight') && next?.enter?.[id]) kind = 'flight';
    return { from: id, to: to ?? (end?.endChapter ? 'chapter-end' : null), kind };
  });
}
