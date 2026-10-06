// Chapter 1 // NIGHT SERVICE — the pure panel-puzzle model.
//
// Everything that decides whether the player has solved something lives here:
// the grid and its swaps, per-tile zoom stacks, liftable frames and overlays,
// the punch-hole lens, edge links, actors walking across linked tiles, the
// bell, items and the per-act script. There is no Phaser in this file, so the
// whole chapter can be solved from node (tests/nightService/).
//
// PanelScene.js renders a model and forwards input to it; it never decides
// puzzle state on its own. See README.md in this folder for the act format.

/** Facing edges link when their `at` values differ by at most this much. */
export const LINK_TOLERANCE = 0.03;
export const VIEW = Object.freeze({ w: 1920, h: 1080 });
export const SIDES = Object.freeze(['left', 'right', 'top', 'bottom']);
export const OPPOSITE = Object.freeze({ left: 'right', right: 'left', top: 'bottom', bottom: 'top' });
/** One notch per bell: dusk → evening → night → deep night. */
export const TIMES_OF_DAY = Object.freeze(['dusk', 'evening', 'night', 'deep-night']);
export const DEFAULT_LENS_RADIUS = 120;
export const DEFAULT_WALK_SPEED = 170; // tile pixels per second
/**
 * Butch walks a little faster than the paths are authored (alpha R4 · P1):
 * acts give his actor `pace: BUTCH_PACE`, which scales every walk's speed.
 */
export const BUTCH_PACE = 1.3;

const EPSILON = 1e-9;

// ---------------------------------------------------------------------------
// Layout

/**
 * Carriage-window layout for a grid. Pure geometry shared by the model (lens
 * coverage, walking speed) and the renderer (where each window sits).
 * @param {{cols:number, rows:number, gutter?:number, tile?:{w:number,h:number}}} grid
 * @param {{w:number,h:number}} [view]
 */
export function layoutGrid(grid, view = VIEW) {
  const cols = grid.cols ?? 2;
  const rows = grid.rows ?? 2;
  const gutter = grid.gutter ?? 36;
  const top = grid.top ?? 66;
  const bottom = grid.bottom ?? 150;
  const side = grid.side ?? 120;
  const availH = view.h - top - bottom;
  const availW = view.w - side * 2;
  const tileH = grid.tile?.h ?? Math.floor((availH - gutter * (rows - 1)) / rows);
  const tileW = grid.tile?.w ?? Math.floor(Math.min((availW - gutter * (cols - 1)) / cols, tileH * 1.8));
  // `display` shows a small grid's windows larger on screen than the size
  // they are painted at (tile coordinates stay tileW × tileH), so Act 0's one
  // window fills the wall and still grows into Act 1's 2×2 without a repaint.
  const slotW = Math.round(tileW * (grid.display ?? 1));
  const slotH = Math.round(tileH * (grid.display ?? 1));
  const totalW = slotW * cols + gutter * (cols - 1);
  const totalH = slotH * rows + gutter * (rows - 1);
  const x0 = Math.round((view.w - totalW) / 2);
  const y0 = Math.round(top + (availH - totalH) / 2);
  const slots = [];
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      slots.push({
        index: row * cols + col,
        col,
        row,
        x: x0 + col * (slotW + gutter),
        y: y0 + row * (slotH + gutter),
        w: slotW,
        h: slotH,
      });
    }
  }
  // `scale`: screen pixels per tile pixel (1 unless `grid.display` is set)
  return { cols, rows, gutter, tileW, tileH, scale: slotW / tileW, x: x0, y: y0, w: totalW, h: totalH, view, slots };
}

/**
 * The carriage-window size every small grid shares (the 2×2 window), so the
 * wall can grow from one window to two to four without repainting a panel:
 * Acts 0 and 0.5 pass it as `grid.tile`.
 */
export const CARRIAGE_TILE = Object.freeze((() => {
  const two = layoutGrid({ cols: 2, rows: 2 });
  return { w: two.tileW, h: two.tileH };
})());

/**
 * Grid growth between two acts (the carriage wall slides open): where each
 * window of the new act starts and ends. `keep` maps a new tile id to the old
 * tile it continues (it slides from the old slot to its new one); every other
 * tile of the new act opens in place behind a sliding wall panel.
 *
 * @param {object} fromAct   the act that just ended
 * @param {object} toAct     the act that is starting
 * @param {object} [o]
 * @param {Array}  [o.fromSlots]  the old act's final slot order (defaults to its start)
 * @param {Array}  [o.toSlots]    the new act's slot order (defaults to its start)
 * @returns {{from: object, to: object, windows: Array<{tile, kind, from, to}>}}
 */
export function planGrowth(fromAct, toAct, { fromSlots = null, toSlots = null, keep = null, view = VIEW } = {}) {
  const from = layoutGrid(fromAct.grid ?? {}, view);
  const to = layoutGrid(toAct.grid ?? {}, view);
  const oldSlots = fromSlots ?? fromAct.slots;
  const newSlots = toSlots ?? toAct.slots;
  const map = keep ?? toAct.growFrom?.keep ?? {};
  const windows = [];
  newSlots.forEach((tile, index) => {
    if (!tile) return;
    const dest = to.slots[index];
    const oldTile = map[tile];
    const oldIndex = oldTile ? oldSlots.indexOf(oldTile) : -1;
    if (oldIndex >= 0) {
      const src = from.slots[oldIndex];
      windows.push({ tile, kind: 'keep', continues: oldTile, from: { x: src.x, y: src.y, w: src.w, h: src.h }, to: { x: dest.x, y: dest.y, w: dest.w, h: dest.h } });
    } else {
      windows.push({ tile, kind: 'open', from: { x: dest.x, y: dest.y, w: dest.w, h: dest.h }, to: { x: dest.x, y: dest.y, w: dest.w, h: dest.h } });
    }
  });
  return { from, to, windows };
}

/** Screen point of an edge anchor on a slot rectangle. */
export function edgePoint(slot, side, at) {
  if (side === 'left') return { x: slot.x, y: slot.y + at * slot.h };
  if (side === 'right') return { x: slot.x + slot.w, y: slot.y + at * slot.h };
  if (side === 'top') return { x: slot.x + at * slot.w, y: slot.y };
  return { x: slot.x + at * slot.w, y: slot.y + slot.h };
}

/** Screen point of a tile-normalised coordinate inside a slot. */
export function tilePoint(slot, u, v) {
  return { x: slot.x + u * slot.w, y: slot.y + v * slot.h };
}

// ---------------------------------------------------------------------------
// Small helpers

/** Split a single-key effect or trigger object into `[kind, argument]`. */
export function effectKind(effect) {
  if (effect === true) return ['auto', true];
  const key = Object.keys(effect ?? {})[0];
  return [key, effect?.[key]];
}

const asList = (value) => (Array.isArray(value) ? value : value == null ? [] : [value]);
const clone = (value) => (value === undefined ? undefined : JSON.parse(JSON.stringify(value)));
const inRect = (rect, u, v) => u >= rect[0] && v >= rect[1] && u <= rect[0] + rect[2] && v <= rect[1] + rect[3];

/**
 * Where a liftable frame can be taken hold of (tile-normalised): `rect`,
 * minus an optional `hole` (the glass a picture frame surrounds). The default
 * is a generous band all round the window, well past the painted brass.
 */
export const DEFAULT_FRAME_GRIP = Object.freeze({ rect: Object.freeze([0, 0, 1, 1]), hole: Object.freeze([0.09, 0.15, 0.82, 0.7]) });

export function onFrameGrip(grip, u, v) {
  const g = grip ?? DEFAULT_FRAME_GRIP;
  if (!inRect(g.rect, u, v)) return false;
  if (!g.hole) return true;
  const [hx, hy, hw, hh] = g.hole;
  return !(u > hx && v > hy && u < hx + hw && v < hy + hh);
}

/**
 * Points on a grip where a hand would take hold, best first (the middle of
 * the top band, then the sides and the bottom; or the centre of a solid grip).
 * @returns {Array<[number, number]>} tile-normalised points
 */
export function framePoints(grip) {
  const g = grip ?? DEFAULT_FRAME_GRIP;
  const [x, y, w, h] = g.rect;
  if (!g.hole) {
    return [[x + w / 2, y + h / 2], [x + w * 0.25, y + h * 0.3], [x + w * 0.75, y + h * 0.3], [x + w * 0.25, y + h * 0.75], [x + w * 0.75, y + h * 0.75]];
  }
  const [hx, hy, hw, hh] = g.hole;
  const top = (y + hy) / 2;
  const bottom = (hy + hh + y + h) / 2;
  const left = (x + hx) / 2;
  const right = (hx + hw + x + w) / 2;
  return [[x + w / 2, top], [left, y + h / 2], [right, y + h / 2], [x + w / 2, bottom], [x + w * 0.2, top], [x + w * 0.8, top]];
}

function createEmitter() {
  const listeners = new Map();
  return {
    on(name, fn) {
      if (!listeners.has(name)) listeners.set(name, new Set());
      listeners.get(name).add(fn);
      return () => listeners.get(name)?.delete(fn);
    },
    emit(name, payload) {
      listeners.get(name)?.forEach((fn) => fn(payload));
      listeners.get('*')?.forEach((fn) => fn(name, payload));
    },
  };
}

// ---------------------------------------------------------------------------
// The model

/**
 * Create a model for one act definition (see acts/*.js and README.md).
 *
 * @param {object} act    an act definition (`defineAct` output)
 * @param {object} [options]
 * @param {object} [options.carry]   chapter state carried over from the previous
 *                                   act: { bell, items, flags, linkHistory }
 * @param {object} [options.layout]  override layoutGrid(act.grid)
 * @param {string} [options.step]    start at this step id (dev route / tests):
 *                                   earlier steps' `skip` effects are applied
 */
export function createPanelModel(act, options = {}) {
  const layout = options.layout ?? layoutGrid(act.grid ?? {}, options.view ?? VIEW);
  const events = createEmitter();
  const sceneOf = (tileId, stateId) => act.tiles[tileId]?.states?.[stateId] ?? null;
  const frameDefs = {};
  Object.entries(act.tiles).forEach(([tileId, tile]) => {
    if (tile.frame) frameDefs[tile.frame.id] = { ...tile.frame, origin: tileId };
  });

  const start = { ...(act.start ?? {}), ...(options.carry ?? {}) };
  let s = freshState();

  function freshState() {
    const tiles = {};
    Object.entries(act.tiles).forEach(([id, def]) => {
      tiles[id] = {
        id,
        state: def.state ?? Object.keys(def.states)[0],
        zoomStack: clone(def.zoomStack ?? []),
        draggable: def.draggable !== false,
      };
    });
    const frames = {};
    Object.values(frameDefs).forEach((frame) => {
      frames[frame.id] = { id: frame.id, origin: frame.origin, host: frame.startsOn ?? frame.origin };
    });
    const actors = {};
    Object.entries(act.actors ?? {}).forEach(([id, def]) => {
      actors[id] = {
        id,
        tile: def.tile,
        state: def.state ?? null,
        x: def.x ?? 0.5,
        y: def.y ?? 0.8,
        visible: def.visible !== false,
        pose: def.pose ?? 'idle',
        facing: def.facing ?? 1,
        walk: null,
        crossing: null,
        blocked: false,
        carrying: def.carrying ?? null,
      };
    });
    return {
      slots: [...act.slots],
      tiles,
      frames,
      lens: {
        enabled: Boolean(start.lens),
        x: start.lens?.x ?? layout.view.w / 2,
        y: start.lens?.y ?? layout.view.h / 2,
        r: start.lens?.r ?? DEFAULT_LENS_RADIUS,
      },
      flags: [...asList(start.flags)],
      items: [...asList(start.items)],
      used: [],
      bell: start.bell ?? 0,
      linkHistory: clone(start.linkHistory ?? []),
      actors,
      arrivals: [],
      stepIndex: 0,
      queue: [],
      blocking: null,
      card: null,
      inputLocked: false,
      dragging: null,
      ended: null,
      time: 0,
      stepStartedAt: 0,
      lastInputAt: 0,
    };
  }

  // ---------- derived queries ----------

  const slotOf = (tileId) => s.slots.indexOf(tileId);
  const slotRect = (tileId) => layout.slots[slotOf(tileId)] ?? null;
  const hasFlag = (flag) => s.flags.includes(flag);
  const hasItem = (item) => s.items.includes(item);
  const scene = (tileId) => sceneOf(tileId, s.tiles[tileId]?.state);
  const hostedFrames = (tileId) => Object.values(s.frames).filter((frame) => frame.host === tileId);
  const overlayOn = (tileId) => hostedFrames(tileId).find((frame) => frame.origin !== tileId)?.id ?? null;
  const frameLifted = (tileId) => Object.values(s.frames).some((frame) => frame.origin === tileId && frame.host !== tileId);
  const floatingFrame = () => Object.values(s.frames).find((frame) => frame.host === null) ?? null;

  function lensCovers(point) {
    if (!s.lens.enabled || !point) return false;
    return Math.hypot(point.x - s.lens.x, point.y - s.lens.y) <= s.lens.r + EPSILON;
  }

  function neighbours(slotIndex) {
    const slot = layout.slots[slotIndex];
    const out = [];
    if (slot.col < layout.cols - 1) out.push({ other: slotIndex + 1, side: 'right' });
    if (slot.row < layout.rows - 1) out.push({ other: slotIndex + layout.cols, side: 'bottom' });
    return out;
  }

  /** Condition evaluator shared by step triggers, hotspot `requires`, edge `when`. */
  function evaluate(cond) {
    if (cond === undefined || cond === null || cond === true) return true;
    if (cond === false) return false;
    if (Array.isArray(cond)) return cond.every(evaluate);
    const [kind, arg] = effectKind(cond);
    switch (kind) {
      case 'auto': return true;
      case 'all': return asList(arg).every(evaluate);
      case 'any': return asList(arg).some(evaluate);
      case 'not': return !evaluate(arg);
      case 'flag': return asList(arg).every(hasFlag);
      case 'notFlag': return !asList(arg).some(hasFlag);
      case 'item': return asList(arg).every(hasItem);
      case 'notItem': return !asList(arg).some(hasItem);
      case 'hotspot': return asList(arg).every((key) => s.used.includes(key));
      case 'butchArrived': return s.arrivals.includes(arg);
      case 'arrived': return s.arrivals.includes(arg);
      case 'state': return asList(arg.is).includes(s.tiles[arg.tile]?.state);
      case 'link': return findLink(arg.a, arg.b, arg.type) !== null;
      case 'overlay': {
        const frame = s.frames[arg.frame];
        if (!frame || frame.host !== arg.onto) return false;
        return arg.ontoState ? asList(arg.ontoState).includes(s.tiles[arg.onto]?.state) : true;
      }
      case 'lensOver': {
        const rect = slotRect(arg.tile);
        return Boolean(rect) && lensCovers(tilePoint(rect, arg.x, arg.y));
      }
      case 'lens': return s.lens.enabled === Boolean(arg);
      case 'slot': return slotOf(arg.tile) === arg.index;
      case 'above': return slotOf(arg.b) - slotOf(arg.a) === layout.cols && slotOf(arg.a) >= 0;
      case 'leftOf': {
        const a = slotOf(arg.a);
        const b = slotOf(arg.b);
        return a >= 0 && b === a + 1 && layout.slots[a].row === layout.slots[b].row;
      }
      case 'bell': return s.bell >= arg;
      case 'dragging': return s.dragging === arg;
      case 'actorAt': {
        const actor = s.actors[arg.actor ?? 'butch'];
        if (!actor || actor.tile !== arg.tile) return false;
        if (arg.minX !== undefined && actor.x < arg.minX) return false;
        return arg.maxX === undefined || actor.x <= arg.maxX;
      }
      default: throw new Error(`[nightService] unknown condition "${kind}"`);
    }
  }

  /**
   * Edges a tile currently exposes on each side: its current state's edges plus
   * any hosted frame's edges, filtered by `when`. Era filtering happens in
   * link computation because it depends on where the lens is.
   */
  function tileEdges(tileId) {
    const out = { left: [], right: [], top: [], bottom: [] };
    const add = (edges, source) => {
      if (!edges) return;
      SIDES.forEach((side) => {
        asList(edges[side]).forEach((edge) => {
          if (edge.when !== undefined && !evaluate(edge.when)) return;
          out[side].push({ era: 'present', ...edge, source });
        });
      });
    };
    add(scene(tileId)?.edges, 'scene');
    hostedFrames(tileId).forEach((frame) => add(frameDefs[frame.id]?.edges, `frame:${frame.id}`));
    return out;
  }

  function edgeLive(tileId, side, edge) {
    if (edge.era !== 'past') return true;
    const rect = slotRect(tileId);
    if (!rect) return false;
    const anchor = edge.lensAt ? tilePoint(rect, edge.lensAt[0], edge.lensAt[1]) : edgePoint(rect, side, edge.at);
    return lensCovers(anchor);
  }

  function computeLinks() {
    const links = [];
    const mismatches = [];
    s.slots.forEach((tileA, slotA) => {
      if (!tileA || tileA === s.dragging) return;
      // Edges that face the carriage wall lead nowhere: report them too, so
      // the renderer can shimmer "this floor ends here".
      const slot = layout.slots[slotA];
      const boundary = [
        slot.col === 0 && 'left',
        slot.col === layout.cols - 1 && 'right',
        slot.row === 0 && 'top',
        slot.row === layout.rows - 1 && 'bottom',
      ].filter(Boolean);
      boundary.forEach((side) => {
        tileEdges(tileA)[side].forEach((edge) => {
          if (!edge.silent && edgeLive(tileA, side, edge)) mismatches.push({ tile: tileA, other: null, slot: slotA, side, at: edge.at, type: edge.type, reason: 'boundary' });
        });
      });
      neighbours(slotA).forEach(({ other, side }) => {
        const tileB = s.slots[other];
        if (!tileB || tileB === s.dragging) return;
        const opp = OPPOSITE[side];
        const edgesA = tileEdges(tileA)[side].filter((edge) => edgeLive(tileA, side, edge));
        const edgesB = tileEdges(tileB)[opp].filter((edge) => edgeLive(tileB, opp, edge));
        const matchedB = new Set();
        edgesA.forEach((edgeA) => {
          const partner = edgesB.find((edgeB) => edgeB.type === edgeA.type && Math.abs(edgeB.at - edgeA.at) <= LINK_TOLERANCE + EPSILON);
          if (partner) {
            matchedB.add(partner);
            if (!links.some((link) => link.a === tileA && link.b === tileB && link.type === edgeA.type)) {
              links.push({
                key: `${tileA}|${tileB}|${edgeA.type}`,
                a: tileA,
                b: tileB,
                type: edgeA.type,
                dir: side === 'right' ? 'h' : 'v',
                at: (edgeA.at + partner.at) / 2,
                slotA,
                slotB: other,
                era: edgeA.era === 'past' || partner.era === 'past' ? 'past' : 'present',
              });
            }
          } else if (!edgeA.silent) {
            const offset = edgesB.some((edgeB) => edgeB.type === edgeA.type);
            mismatches.push({ tile: tileA, other: tileB, slot: slotA, side, at: edgeA.at, type: edgeA.type, reason: offset ? 'offset' : 'open' });
          }
        });
        edgesB.forEach((edgeB) => {
          if (matchedB.has(edgeB) || edgeB.silent) return;
          const offset = edgesA.some((edgeA) => edgeA.type === edgeB.type);
          mismatches.push({ tile: tileB, other: tileA, slot: other, side: opp, at: edgeB.at, type: edgeB.type, reason: offset ? 'offset' : 'open' });
        });
      });
    });
    return { links, mismatches };
  }

  let links = [];
  let mismatches = [];

  function findLink(a, b, type) {
    return links.find((link) => ((link.a === a && link.b === b) || (link.a === b && link.b === a))
      && (type === undefined || link.type === type)) ?? null;
  }

  function refreshLinks({ quiet = false } = {}) {
    const next = computeLinks();
    const before = new Map(links.map((link) => [link.key, link]));
    const after = new Map(next.links.map((link) => [link.key, link]));
    links = next.links;
    mismatches = next.mismatches;
    if (quiet) return;
    before.forEach((link, key) => { if (!after.has(key)) events.emit('link:off', link); });
    after.forEach((link, key) => {
      if (before.has(key)) return;
      if (!s.linkHistory.some((entry) => entry.key === key)) s.linkHistory.push({ key, a: link.a, b: link.b, type: link.type });
      events.emit('link:on', link);
    });
  }

  // ---------- hotspots ----------

  function hotspotEnabled(tileId, hotspot) {
    if (hotspot.hidden) return false;
    if (!evaluate(hotspot.requires)) return false;
    if ((hotspot.once || hotspot.kind === 'pickup') && s.used.includes(`${tileId}.${hotspot.id}`)) return false;
    if (hotspot.kind === 'zoom' && !sceneOf(tileId, hotspot.to)) return false;
    return true;
  }

  /** Every hotspot of a tile's current scene, with its live status. */
  function hotspots(tileId) {
    return asList(scene(tileId)?.hotspots).map((hotspot) => ({
      ...hotspot,
      era: hotspot.era ?? 'present',
      enabled: hotspotEnabled(tileId, hotspot),
    }));
  }

  /**
   * Hit-test a tile-local point. Clicks inside the lens act on the 1978 layer
   * first (era past/both); when no 1978 hotspot is there, the click falls
   * through to the present one underneath, so the lens never swallows a
   * click. Outside the lens only the present counts (era present/both).
   * @param {{x:number,y:number}} [screen] the same point in screen space
   */
  function hotspotAt(tileId, u, v, screen = null) {
    const rect = slotRect(tileId);
    const point = screen ?? (rect ? tilePoint(rect, u, v) : null);
    const inLens = lensCovers(point);
    const list = hotspots(tileId).filter((hotspot) => hotspot.enabled && inRect(hotspot.rect, u, v));
    // the last listed is drawn on top: it wins
    const top = (ok) => [...list].reverse().find(ok) ?? null;
    if (inLens) return top((h) => h.era !== 'present') ?? top((h) => h.era === 'present');
    return top((h) => h.era !== 'past');
  }

  /** The frame a press at a tile-local point takes hold of (liftable now), or null. */
  function frameGripAt(tileId, u, v) {
    const frameId = frameOn(tileId);
    if (!frameId || !canLiftFrame(frameId)) return null;
    return onFrameGrip(frameDefs[frameId]?.grip, u, v) ? frameId : null;
  }

  // ---------- script ----------

  function lockedOut() {
    return Boolean(s.inputLocked || s.ended || s.blocking?.kind === 'dialogue' || s.card?.await);
  }

  function applyEffect(effect) {
    const [kind, arg] = effectKind(effect);
    switch (kind) {
      case 'setState': {
        const tile = s.tiles[arg.tile];
        const from = tile.state;
        tile.state = arg.state;
        events.emit('state', { tile: arg.tile, from, to: arg.state });
        break;
      }
      case 'setFlag': asList(arg).forEach((flag) => { if (!hasFlag(flag)) s.flags.push(flag); }); events.emit('flags', s.flags); break;
      case 'clearFlag': s.flags = s.flags.filter((flag) => !asList(arg).includes(flag)); events.emit('flags', s.flags); break;
      case 'giveItem': asList(arg).forEach((item) => { if (!hasItem(item)) s.items.push(item); events.emit('item', { item, held: true }); }); break;
      case 'takeItem': asList(arg).forEach((item) => { s.items = s.items.filter((held) => held !== item); events.emit('item', { item, held: false }); }); break;
      case 'showCard': {
        // `unless`: skip a card the player has already chosen to read
        if (typeof arg === 'object' && arg.unless !== undefined && evaluate(arg.unless)) break;
        const id = typeof arg === 'string' ? arg : arg.card;
        const wait = typeof arg === 'object' && arg.await;
        s.card = { id, await: Boolean(wait) };
        events.emit('card', { id, card: act.cards?.[id] ?? null });
        if (wait) s.blocking = { kind: 'card' };
        break;
      }
      case 'ringBell': {
        s.bell += 1;
        events.emit('bell', { count: s.bell, timeOfDay: timeOfDay(), memory: s.linkHistory.map((entry) => ({ ...entry })) });
        break;
      }
      case 'unlockDrag': tileList(arg).forEach((id) => { s.tiles[id].draggable = true; }); events.emit('draggable'); break;
      case 'lockTile': tileList(arg).forEach((id) => { s.tiles[id].draggable = false; }); events.emit('draggable'); break;
      case 'lockInput': {
        s.inputLocked = true;
        // whatever is in the player's hands goes back where it came from
        if (s.dragging) {
          const tile = s.dragging;
          s.dragging = null;
          events.emit('drag:end', { tile, swapped: false, from: slotOf(tile), to: slotOf(tile) });
        }
        const floating = floatingFrame();
        if (floating) {
          floating.host = floating.origin;
          events.emit('frame:drop', { frame: floating.id, onto: floating.origin, returned: true });
        }
        events.emit('input', { locked: true });
        break;
      }
      case 'unlockInput': s.inputLocked = false; events.emit('input', { locked: false }); break;
      case 'grantStone': if (!hasFlag(`stone:${arg}`)) s.flags.push(`stone:${arg}`); events.emit('stone', { id: arg }); break;
      case 'checkpoint': events.emit('checkpoint', { id: arg }); break;
      case 'nextAct': s.ended = { kind: 'nextAct', next: arg === true ? null : arg }; events.emit('act:end', { ...s.ended, carry: carry() }); break;
      case 'endChapter': s.ended = { kind: 'endChapter' }; events.emit('chapter:end', { carry: carry() }); break;
      case 'walkButch': startWalk({ actor: 'butch', ...arg }); break;
      case 'walk': startWalk(arg); break;
      case 'playTrain': startWalk({ actor: 'train', speed: 260, ...arg }); break;
      case 'placeActor': {
        const actor = s.actors[arg.actor];
        ['tile', 'x', 'y', 'visible', 'pose', 'facing', 'carrying'].forEach((key) => { if (arg[key] !== undefined) actor[key] = arg[key]; });
        if (arg.state !== undefined) actor.state = arg.state;
        actor.walk = null;
        actor.crossing = null;
        actor.blocked = false;
        events.emit('actor', { id: arg.actor, placed: true });
        break;
      }
      case 'actorPose': {
        const actor = s.actors[arg.actor ?? 'butch'];
        if (arg.pose !== undefined) actor.pose = arg.pose;
        if (arg.facing !== undefined) actor.facing = arg.facing;
        if (arg.carrying !== undefined) actor.carrying = arg.carrying;
        events.emit('actor', { id: actor.id });
        break;
      }
      case 'zoomTo': zoomIn(arg.tile, arg.to, arg.rect ?? [0.25, 0.25, 0.5, 0.5], { forced: true }); break;
      case 'zoomOut': zoomOut(arg.tile ?? arg, { forced: true }); break;
      case 'zoomOutAll': {
        // step all the way back out, one level at a time (however deep the player went)
        const id = arg.tile ?? arg;
        const gap = arg.gap ?? 600;
        const steps = [];
        for (let i = 0; i < (s.tiles[id]?.zoomStack.length ?? 0); i += 1) steps.push({ zoomOut: id }, { wait: gap });
        s.queue.unshift(...steps);
        break;
      }
      case 'dialogue': {
        const lines = asList(arg.lines ?? arg);
        s.blocking = { kind: 'dialogue', lines, index: 0 };
        events.emit('dialogue', { line: lines[0], index: 0, total: lines.length });
        break;
      }
      case 'wait': s.blocking = { kind: 'wait', remaining: Number(arg) || 0 }; break;
      case 'fx': {
        const params = typeof arg === 'string' ? { name: arg } : arg;
        events.emit('fx', params);
        if (params.ms) s.blocking = { kind: 'wait', remaining: params.ms };
        break;
      }
      case 'sfx': events.emit('sfx', { name: arg }); break;
      case 'caption': events.emit('caption', typeof arg === 'string' ? { text: arg } : arg); break;
      case 'enableLens': {
        s.lens.enabled = true;
        if (arg && typeof arg === 'object') Object.assign(s.lens, pick(arg, ['x', 'y', 'r']));
        // `{ tile, u, v }` places the lens at a tile-local point instead
        if (arg?.tile && slotRect(arg.tile)) Object.assign(s.lens, tilePoint(slotRect(arg.tile), arg.u ?? 0.5, arg.v ?? 0.5));
        events.emit('lens', { ...s.lens, appeared: true });
        break;
      }
      case 'disableLens': s.lens.enabled = false; events.emit('lens', { ...s.lens }); break;
      case 'setSlots': {
        // dev jumps (`skip`): put the windows where the skipped steps left them
        s.slots = [...arg];
        events.emit('restore', null);
        break;
      }
      case 'returnFrame': {
        const frame = s.frames[arg];
        frame.host = frame.origin;
        events.emit('frame:drop', { frame: frame.id, onto: frame.origin, returned: true });
        break;
      }
      default: throw new Error(`[nightService] unknown effect "${kind}"`);
    }
  }

  const pick = (object, keys) => Object.fromEntries(keys.filter((key) => object[key] !== undefined).map((key) => [key, object[key]]));
  const tileList = (arg) => (arg === 'all' ? Object.keys(s.tiles) : asList(arg));

  let pumping = false;
  function pump() {
    if (pumping) return;
    pumping = true;
    try {
      for (let guard = 0; guard < 1000; guard += 1) {
        refreshLinks();
        resumeWalks();
        // An open archive card pauses the script: reading is never rushed.
        if (s.blocking || s.ended || s.card) break;
        if (s.queue.length) {
          applyEffect(s.queue.shift());
          continue;
        }
        const step = act.steps[s.stepIndex];
        if (!step || !evaluate(step.when)) break;
        s.stepIndex += 1;
        s.stepStartedAt = s.time;
        events.emit('step', { id: step.id, index: s.stepIndex - 1 });
        s.queue.push(...clone(step.do ?? []));
      }
    } finally {
      pumping = false;
    }
    events.emit('change', null);
  }

  // ---------- actors ----------

  function startWalk({ actor: actorId = 'butch', id = null, path, speed = DEFAULT_WALK_SPEED, await: wait = true }) {
    const actor = s.actors[actorId];
    if (!actor) throw new Error(`[nightService] unknown actor "${actorId}"`);
    // an actor's `pace` scales every walk it takes (Butch: BUTCH_PACE)
    actor.walk = { id, path: clone(path), index: 0, speed: speed * (act.actors?.[actorId]?.pace ?? 1) };
    actor.visible = true;
    actor.crossing = null;
    actor.blocked = false;
    if (actor.pose === 'sit' || actor.pose === 'idle') actor.pose = 'walk';
    events.emit('walk:start', { actor: actorId, id });
    if (wait) s.blocking = { kind: 'walk', actor: actorId, id };
  }

  function crossingAllowed(actor, target) {
    return findLink(actor.tile, target.tile, target.via) !== null;
  }

  function resumeWalks() {
    Object.values(s.actors).forEach((actor) => {
      if (!actor.walk || !actor.blocked) return;
      const target = actor.walk.path[actor.walk.index];
      if (!target) return;
      const free = target.tile === actor.tile ? evaluate(target.requires) : crossingAllowed(actor, target) && evaluate(target.requires);
      if (free) {
        actor.blocked = false;
        events.emit('walk:resume', { actor: actor.id, id: actor.walk.id });
      }
    });
  }

  /**
   * Why a walker is standing still (alpha R3 · R2), or null while it walks
   * (or has nowhere to go). `to` is the tile it wants to cross into (null for
   * a wait inside its own tile), `reason` is 'link' (the facing edge is not
   * joined) or 'requires' (a condition, e.g. the lens over the hedge), and
   * `zoomOut` names the neighbour whose wider view has the missing edge: one
   * step back out of it (its ⤢ glyph) is the way on.
   * @returns {null | {actor:string, tile:string, x:number, y:number, to:string|null, reason:'link'|'requires', zoomOut:string|null}}
   */
  function waitingFor(actorId) {
    const actor = s.actors[actorId];
    if (!actor?.walk || !actor.blocked) return null;
    const target = actor.walk.path[actor.walk.index];
    if (!target) return null;
    const to = target.tile !== actor.tile ? target.tile : null;
    const linked = !to || crossingAllowed(actor, target);
    const reason = linked ? 'requires' : 'link';
    let zoomOut = null;
    const other = to ? s.tiles[to] : null;
    if (!linked && other && target.state && other.state !== target.state && other.zoomStack.some((entry) => entry.state === target.state)) zoomOut = to;
    return { actor: actorId, tile: actor.tile, x: actor.x, y: actor.y, to, reason, zoomOut };
  }

  function setBlocked(actor, blocked) {
    if (actor.blocked === blocked) return;
    actor.blocked = blocked;
    events.emit(blocked ? 'walk:blocked' : 'walk:resume', { actor: actor.id, id: actor.walk?.id, tile: actor.tile });
  }

  function arrive(actor) {
    const id = actor.walk.id;
    actor.walk = null;
    actor.blocked = false;
    if (actor.pose === 'walk') actor.pose = 'idle';
    if (id && !s.arrivals.includes(id)) s.arrivals.push(id);
    events.emit('walk:arrive', { actor: actor.id, id });
    if (s.blocking?.kind === 'walk' && s.blocking.actor === actor.id) s.blocking = null;
  }

  function stepActor(actor, dt) {
    let budget = (actor.walk.speed * dt) / 1000;
    for (let guard = 0; guard < 64 && actor.walk && budget > EPSILON; guard += 1) {
      const target = actor.walk.path[actor.walk.index];
      if (!target) { arrive(actor); break; }
      if (actor.crossing) {
        if (!crossingAllowed(actor, actor.crossing.to)) {
          actor.crossing = null;
          setBlocked(actor, true);
          break;
        }
        const need = (1 - actor.crossing.t) * layout.gutter;
        if (budget < need) {
          actor.crossing.t += budget / layout.gutter;
          budget = 0;
          break;
        }
        budget -= need;
        actor.tile = target.tile;
        actor.x = target.x;
        actor.y = target.y;
        if (target.state !== undefined) actor.state = target.state;
        actor.crossing = null;
        actor.walk.index += 1;
        events.emit('actor:cross', { actor: actor.id, tile: actor.tile });
        continue;
      }
      if (target.requires !== undefined && !evaluate(target.requires)) {
        setBlocked(actor, true);
        // `retreat` names a safe spot to back off to (a train off a missing span)
        if (target.retreat && target.tile === actor.tile) {
          const rx = (target.retreat.x ?? actor.x) - actor.x;
          const ry = (target.retreat.y ?? actor.y) - actor.y;
          const dist = Math.hypot(rx * layout.tileW, ry * layout.tileH);
          if (dist > EPSILON) {
            const k = Math.min(1, budget / dist);
            actor.x += rx * k;
            actor.y += ry * k;
          }
        }
        break;
      }
      if (target.tile !== actor.tile) {
        if (!crossingAllowed(actor, target)) { setBlocked(actor, true); break; }
        setBlocked(actor, false);
        actor.crossing = { from: actor.tile, to: { ...target }, t: 0 };
        continue;
      }
      setBlocked(actor, false);
      const dx = (target.x - actor.x) * layout.tileW;
      const dy = (target.y - actor.y) * layout.tileH;
      const dist = Math.hypot(dx, dy);
      if (Math.abs(dx) > 0.5) actor.facing = dx > 0 ? 1 : -1;
      if (dist <= budget + EPSILON) {
        actor.x = target.x;
        actor.y = target.y;
        budget -= dist;
        actor.walk.index += 1;
        if (target.pose) actor.pose = target.pose;
        if (actor.walk.index >= actor.walk.path.length) arrive(actor);
      } else {
        actor.x += (dx / dist) * (budget / layout.tileW);
        actor.y += (dy / dist) * (budget / layout.tileH);
        budget = 0;
      }
    }
  }

  // ---------- player verbs ----------

  function touch() { s.lastInputAt = s.time; }

  function canDrag(tileId) {
    return !lockedOut() && Boolean(s.tiles[tileId]?.draggable) && slotOf(tileId) >= 0 && !floatingFrame();
  }

  /** Pick a tile up: its links drop while it is in the air. */
  function beginDrag(tileId) {
    if (!canDrag(tileId) || s.dragging) return false;
    touch();
    s.dragging = tileId;
    events.emit('drag:start', { tile: tileId });
    pump();
    return true;
  }

  function cancelDrag() {
    if (!s.dragging) return false;
    const tile = s.dragging;
    s.dragging = null;
    events.emit('drag:end', { tile, swapped: false });
    pump();
    return true;
  }

  /** Drop the dragged tile on a slot: swap with whatever is there. */
  function dropOn(slotIndex) {
    if (!s.dragging) return false;
    const tile = s.dragging;
    const from = slotOf(tile);
    const target = s.slots[slotIndex];
    const allowed = slotIndex !== from && slotIndex >= 0 && slotIndex < s.slots.length
      && (target === null || s.tiles[target]?.draggable);
    s.dragging = null;
    if (allowed) {
      s.slots[from] = target ?? null;
      s.slots[slotIndex] = tile;
      events.emit('swap', { a: tile, b: target, from, to: slotIndex });
    }
    events.emit('drag:end', { tile, swapped: allowed, from, to: allowed ? slotIndex : from });
    pump();
    if (allowed) emitMismatch([tile, target]);
    return allowed;
  }

  /** Swap two slots directly (keyboard, tests). */
  function swap(slotA, slotB) {
    const tile = s.slots[slotA];
    if (!tile || !beginDrag(tile)) return false;
    return dropOn(slotB);
  }

  function emitMismatch(tilesMoved) {
    const relevant = mismatches.filter((entry) => tilesMoved.includes(entry.tile) || tilesMoved.includes(entry.other));
    if (relevant.length) events.emit('link:mismatch', relevant);
  }

  function zoomIn(tileId, to, rect, { forced = false } = {}) {
    const tile = s.tiles[tileId];
    if (!tile || !sceneOf(tileId, to) || (!forced && lockedOut())) return false;
    tile.zoomStack.push({ state: tile.state, rect });
    const from = tile.state;
    tile.state = to;
    events.emit('zoom', { tile: tileId, dir: 'in', from, to, rect });
    pump();
    return true;
  }

  function canZoomOut(tileId) {
    const tile = s.tiles[tileId];
    const sceneDef = scene(tileId);
    // `zoomOut: false` is one-way; `zoomOutWhen` holds the player in a close-up until it is done
    return Boolean(tile?.zoomStack.length) && sceneDef?.zoomOut !== false && evaluate(sceneDef?.zoomOutWhen) && !lockedOut();
  }

  function zoomOut(tileId, { forced = false } = {}) {
    const tile = s.tiles[tileId];
    if (!tile?.zoomStack.length || (!forced && !canZoomOut(tileId))) return false;
    touch();
    const entry = tile.zoomStack.pop();
    const from = tile.state;
    tile.state = entry.state;
    events.emit('zoom', { tile: tileId, dir: 'out', from, to: entry.state, rect: entry.rect });
    pump();
    return true;
  }

  function activateHotspot(tileId, hotspotId) {
    if (lockedOut()) return false;
    const hotspot = hotspots(tileId).find((entry) => entry.id === hotspotId);
    if (!hotspot?.enabled) return false;
    touch();
    const key = `${tileId}.${hotspot.id}`;
    if (!s.used.includes(key)) s.used.push(key);
    events.emit('hotspot', { tile: tileId, id: hotspot.id, kind: hotspot.kind });
    if (hotspot.kind === 'zoom') return zoomIn(tileId, hotspot.to, hotspot.zoomRect ?? hotspot.rect);
    if (hotspot.kind === 'read' && hotspot.card) s.queue.push({ showCard: hotspot.card });
    if (hotspot.kind === 'pickup' && hotspot.item) s.queue.push({ giveItem: hotspot.item });
    s.queue.push(...clone(hotspot.do ?? []));
    pump();
    return true;
  }

  /** Click at a tile-local point: activates the hotspot under it, if any. */
  function clickTile(tileId, u, v, screen = null) {
    const hotspot = hotspotAt(tileId, u, v, screen);
    return hotspot ? activateHotspot(tileId, hotspot.id) : false;
  }

  function canLiftFrame(frameId) {
    const frame = s.frames[frameId];
    const def = frameDefs[frameId];
    if (!frame || !def || frame.host === null || lockedOut() || s.dragging || floatingFrame()) return false;
    return def.liftable !== false && evaluate(def.requires);
  }

  /** The frame lifted from a tile: its own frame, or the overlay it hosts. */
  function frameOn(tileId) {
    const hosted = hostedFrames(tileId);
    return (hosted.find((frame) => frame.origin !== tileId) ?? hosted[0])?.id ?? null;
  }

  function liftFrame(frameId) {
    if (!canLiftFrame(frameId)) return false;
    touch();
    const frame = s.frames[frameId];
    const from = frame.host;
    frame.host = null;
    events.emit('frame:lift', { frame: frameId, from });
    pump();
    return true;
  }

  /** Drop the floating frame on a tile (overlay) or `null` (a gutter: return home). */
  function dropFrame(tileId) {
    const frame = floatingFrame();
    if (!frame) return false;
    touch();
    let onto = tileId && s.tiles[tileId] ? tileId : frame.origin;
    const occupied = hostedFrames(onto).some((other) => other.origin !== onto);
    const def = frameDefs[frame.id];
    const accepted = onto === frame.origin || (!occupied && (!def.accepts || asList(def.accepts).includes(onto)));
    if (!accepted) onto = frame.origin;
    frame.host = onto;
    events.emit('frame:drop', { frame: frame.id, onto, returned: onto === frame.origin, rejected: !accepted });
    pump();
    return accepted;
  }

  /** Where the lens centre may go: the board of windows (screen px). */
  function lensBounds() {
    return { x0: layout.x, y0: layout.y, x1: layout.x + layout.w, y1: layout.y + layout.h };
  }

  function moveLens(x, y) {
    if (!s.lens.enabled || lockedOut()) return false;
    touch();
    // its centre stays on the board (the windows), never out on the bezel
    // or under the caption bar (alpha R3 · R4)
    const b = lensBounds();
    s.lens.x = Math.max(b.x0, Math.min(b.x1, x));
    s.lens.y = Math.max(b.y0, Math.min(b.y1, y));
    events.emit('lens', { ...s.lens });
    pump();
    return true;
  }

  function advanceDialogue() {
    if (s.blocking?.kind !== 'dialogue') return false;
    touch();
    s.blocking.index += 1;
    if (s.blocking.index >= s.blocking.lines.length) {
      s.blocking = null;
      events.emit('dialogue:end', null);
      pump();
    } else {
      events.emit('dialogue', { line: s.blocking.lines[s.blocking.index], index: s.blocking.index, total: s.blocking.lines.length });
    }
    return true;
  }

  function closeCard() {
    if (!s.card) return false;
    touch();
    s.card = null;
    if (s.blocking?.kind === 'card') s.blocking = null;
    events.emit('card:close', null);
    pump();
    return true;
  }

  /** Advance model time: waits, walks and trains. */
  function update(dt) {
    s.time += dt;
    let changed = false;
    if (s.blocking?.kind === 'wait') {
      s.blocking.remaining -= dt;
      if (s.blocking.remaining <= 0) { s.blocking = null; changed = true; }
    }
    Object.values(s.actors).forEach((actor) => {
      if (!actor.walk) return;
      const before = `${actor.tile}:${actor.walk?.index}:${actor.blocked}`;
      stepActor(actor, dt);
      if (!actor.walk || before !== `${actor.tile}:${actor.walk?.index}:${actor.blocked}`) changed = true;
    });
    if (changed || (s.queue.length && !s.blocking)) pump();
  }

  // ---------- persistence and debugging ----------

  function timeOfDay() { return TIMES_OF_DAY[Math.min(s.bell, TIMES_OF_DAY.length - 1)]; }

  /** Chapter state that follows the player into the next act. */
  function carry() {
    return {
      bell: s.bell,
      items: [...s.items],
      flags: s.flags.filter((flag) => flag.startsWith('stone:') || flag.startsWith('chapter:')),
      linkHistory: clone(s.linkHistory),
      // where the windows stood when the act ended (the next act's wall grows from it)
      slots: [...s.slots],
    };
  }

  function snapshot() { return clone(s); }

  function restore(snap) {
    s = clone(snap);
    refreshLinks({ quiet: true });
    events.emit('restore', null);
    events.emit('change', null);
  }

  function currentStep() { return act.steps[s.stepIndex] ?? null; }

  function textState() {
    const butch = s.actors.butch;
    return {
      act: act.number ?? act.id,
      actId: act.id,
      step: currentStep()?.id ?? 'complete',
      stepIndex: s.stepIndex,
      stepCount: act.steps.length,
      grid: { cols: layout.cols, rows: layout.rows, slots: [...s.slots] },
      tiles: Object.fromEntries(Object.values(s.tiles).map((tile) => [tile.id, {
        slot: slotOf(tile.id),
        state: tile.state,
        zoomDepth: tile.zoomStack.length,
        draggable: tile.draggable,
        overlay: overlayOn(tile.id),
        frameLifted: frameLifted(tile.id),
      }])),
      overlays: Object.values(s.frames).filter((frame) => frame.host && frame.host !== frame.origin).map((frame) => ({ frame: frame.id, onto: frame.host })),
      floatingFrame: floatingFrame()?.id ?? null,
      links: links.map(({ a, b, type, dir, at, era }) => ({ a, b, type, dir, at: Number(at.toFixed(3)), era })),
      lens: s.lens.enabled ? { x: Math.round(s.lens.x), y: Math.round(s.lens.y), r: s.lens.r } : null,
      butch: butch ? {
        tile: butch.tile,
        state: butch.state,
        x: Number(butch.x.toFixed(3)),
        y: Number(butch.y.toFixed(3)),
        pose: butch.pose,
        visible: butch.visible,
        walking: Boolean(butch.walk),
        blocked: butch.blocked,
        crossing: Boolean(butch.crossing),
      } : null,
      actors: Object.fromEntries(Object.values(s.actors).filter((actor) => actor.id !== 'butch').map((actor) => [actor.id, {
        tile: actor.tile, x: Number(actor.x.toFixed(3)), y: Number(actor.y.toFixed(3)), visible: actor.visible, walking: Boolean(actor.walk), blocked: actor.blocked,
      }])),
      bell: s.bell,
      timeOfDay: timeOfDay(),
      items: [...s.items],
      flags: [...s.flags],
      dragging: s.dragging,
      dialogue: s.blocking?.kind === 'dialogue' ? { index: s.blocking.index, total: s.blocking.lines.length, speaker: s.blocking.lines[s.blocking.index]?.speaker ?? null } : null,
      card: s.card?.id ?? null,
      blocking: s.blocking?.kind ?? null,
      inputLocked: s.inputLocked,
      ended: s.ended,
    };
  }

  // Dev route / tests: fast-forward to a named step by applying every earlier
  // step's `skip` effects (or its `do` effects without the blocking ones).
  function skipTo(stepId) {
    const target = act.steps.findIndex((step) => step.id === stepId);
    if (target < 0) return false;
    for (let i = 0; i < target; i += 1) {
      const step = act.steps[i];
      const effects = step.skip ?? (step.do ?? []).filter((effect) => {
        const [kind] = effectKind(effect);
        return !['wait', 'dialogue', 'fx', 'sfx', 'walkButch', 'walk', 'playTrain', 'showCard', 'caption', 'nextAct', 'endChapter', 'checkpoint'].includes(kind);
      });
      clone(effects).forEach(applyEffect);
      s.stepIndex = i + 1;
    }
    s.blocking = null;
    s.queue = [];
    pump();
    return true;
  }

  /**
   * Where the player stood inside the step a resume point names (alpha R4 ·
   * P1): after `skipTo(step)`, put the windows back the way they were left
   * (a permutation of the act's tiles) and the lens where it was. A layout
   * that would already complete the step is not restored, so a resume never
   * starts by playing a beat under the act title. Returns what was applied.
   */
  function applyResume({ slots = null, lens = null } = {}) {
    const applied = { slots: false, lens: false };
    const same = Array.isArray(slots) && slots.length === s.slots.length
      && [...slots].map(String).sort().join('|') === [...s.slots].map(String).sort().join('|');
    if (same && !s.dragging) {
      const before = [...s.slots];
      s.slots = slots.map((tile) => tile ?? null);
      refreshLinks({ quiet: true });
      const step = currentStep();
      if (step && evaluate(step.when)) {
        s.slots = before;
        refreshLinks({ quiet: true });
      } else applied.slots = before.join('|') !== s.slots.join('|');
    }
    if (lens && s.lens.enabled && Number.isFinite(lens.x) && Number.isFinite(lens.y)) {
      const b = lensBounds();
      const was = { x: s.lens.x, y: s.lens.y };
      s.lens.x = Math.max(b.x0, Math.min(b.x1, lens.x));
      s.lens.y = Math.max(b.y0, Math.min(b.y1, lens.y));
      refreshLinks({ quiet: true });
      const step = currentStep();
      if (step && evaluate(step.when)) {
        Object.assign(s.lens, was);
        refreshLinks({ quiet: true });
      } else applied.lens = true;
    }
    return applied;
  }

  /** What a resume point records now: the step the player is on, the windows, the lens. */
  function resumePoint() {
    const step = currentStep();
    if (!step) return null;
    return {
      act: act.id,
      step: step.id,
      slots: [...s.slots],
      ...(s.lens.enabled ? { lens: { x: Math.round(s.lens.x), y: Math.round(s.lens.y) } } : {}),
    };
  }

  /** True while the script waits on the player at a step (nothing queued, nothing playing). */
  function waitingOnPlayer() {
    return Boolean(currentStep()) && !s.queue.length && !s.blocking && !s.card && !s.ended && !s.inputLocked && !s.dragging && !floatingFrame();
  }

  refreshLinks({ quiet: true });
  if (options.step) skipTo(options.step);
  else pump();

  return {
    act,
    layout,
    on: events.on,
    // queries
    get state() { return s; },
    slotOf,
    slotRect,
    tileAt: (slotIndex) => s.slots[slotIndex] ?? null,
    scene,
    sceneOf,
    tileEdges,
    links: () => links.map((link) => ({ ...link })),
    mismatches: () => mismatches.map((entry) => ({ ...entry })),
    findLink,
    evaluate,
    hotspots,
    hotspotAt,
    hasFlag,
    hasItem,
    lensCovers,
    overlayOn,
    frameOn,
    frameLifted,
    floatingFrame,
    frameDef: (id) => frameDefs[id] ?? null,
    frameGrip: (id) => frameDefs[id]?.grip ?? DEFAULT_FRAME_GRIP,
    frameGripAt,
    canDrag,
    canZoomOut,
    canLiftFrame,
    waitingFor,
    isLocked: lockedOut,
    currentStep,
    timeOfDay,
    carry,
    textState,
    snapshot,
    restore,
    // verbs
    beginDrag,
    cancelDrag,
    dropOn,
    swap,
    zoomIn: (tileId, hotspotId) => {
      const hotspot = hotspots(tileId).find((entry) => entry.id === hotspotId && entry.kind === 'zoom');
      return hotspot ? activateHotspot(tileId, hotspotId) : false;
    },
    zoomOut: (tileId) => zoomOut(tileId),
    activateHotspot,
    clickTile,
    liftFrame,
    dropFrame,
    moveLens,
    lensBounds,
    advanceDialogue,
    closeCard,
    update,
    skipTo,
    applyResume,
    resumePoint,
    waitingOnPlayer,
  };
}

/** Identity helper that documents an act definition (and validates it). */
export function defineAct(act) {
  const problems = validateAct(act);
  if (problems.length) throw new Error(`[nightService] invalid act "${act?.id}": ${problems.join('; ')}`);
  return act;
}

/** Structural checks for an act definition. Returns a list of problems. */
export function validateAct(act) {
  const problems = [];
  if (!act?.id) problems.push('missing id');
  const cols = act?.grid?.cols ?? 2;
  const rows = act?.grid?.rows ?? 2;
  if (!Array.isArray(act?.slots) || act.slots.length !== cols * rows) problems.push(`slots must list ${cols * rows} entries`);
  const tiles = act?.tiles ?? {};
  (act?.slots ?? []).forEach((id) => { if (id !== null && !tiles[id]) problems.push(`slot names unknown tile "${id}"`); });
  Object.entries(tiles).forEach(([id, tile]) => {
    if (!tile.states || !Object.keys(tile.states).length) problems.push(`tile "${id}" has no states`);
    const initial = tile.state ?? Object.keys(tile.states ?? {})[0];
    if (tile.states && !tile.states[initial]) problems.push(`tile "${id}" starts in unknown state "${initial}"`);
    Object.entries(tile.states ?? {}).forEach(([stateId, sceneDef]) => {
      (sceneDef.hotspots ?? []).forEach((hotspot) => {
        if (!hotspot.id) problems.push(`hotspot without id in ${id}:${stateId}`);
        if (!Array.isArray(hotspot.rect) || hotspot.rect.length !== 4) problems.push(`hotspot ${id}.${hotspot.id} needs rect [x,y,w,h]`);
        if (hotspot.kind === 'zoom' && !tile.states[hotspot.to]) problems.push(`zoom hotspot ${id}.${hotspot.id} targets unknown state "${hotspot.to}"`);
      });
      Object.entries(sceneDef.edges ?? {}).forEach(([side, edges]) => {
        if (!SIDES.includes(side)) problems.push(`edge side "${side}" in ${id}:${stateId}`);
        asList(edges).forEach((edge) => {
          if (!edge.type || typeof edge.at !== 'number' || edge.at < 0 || edge.at > 1) problems.push(`bad edge on ${id}:${stateId}.${side}`);
        });
      });
    });
  });
  if (!Array.isArray(act?.steps)) problems.push('steps must be an array');
  const ids = new Set();
  (act?.steps ?? []).forEach((step) => {
    if (!step.id) problems.push('step without id');
    if (ids.has(step.id)) problems.push(`duplicate step id "${step.id}"`);
    ids.add(step.id);
  });
  return problems;
}
