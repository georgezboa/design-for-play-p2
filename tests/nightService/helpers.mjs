// Shared helpers for the NIGHT SERVICE model tests.

import { createPanelModel, effectKind } from '../../src/chapters/nightService/panelModel.js';

/** Run the model until nothing is blocking (walks finish, waits elapse, dialogue advances). */
export function settle(model, { maxMs = 60000, dialogue = true, cards = true, step = 50 } = {}) {
  let elapsed = 0;
  while (elapsed < maxMs) {
    const s = model.state;
    if (s.ended) return elapsed;
    if (s.blocking?.kind === 'dialogue') {
      if (!dialogue) return elapsed;
      model.advanceDialogue();
      continue;
    }
    if (s.blocking?.kind === 'card' || (cards && s.card)) {
      if (!cards) return elapsed;
      model.closeCard();
      continue;
    }
    const walking = Object.values(s.actors).some((actor) => actor.walk && !actor.blocked);
    if (!s.blocking && !walking) return elapsed;
    if (s.blocking?.kind === 'walk' && s.actors[s.blocking.actor]?.blocked) return elapsed;
    model.update(step);
    elapsed += step;
  }
  return elapsed;
}

export function record(model) {
  const log = [];
  model.on('*', (name, payload) => log.push([name, payload]));
  return log;
}

/** Enumerate every player action available in the model's current state. */
export function availableActions(model) {
  const actions = [];
  const s = model.state;
  if (s.ended) return actions;
  if (s.blocking?.kind === 'dialogue') return [{ kind: 'advance' }];
  if (s.card) return [{ kind: 'closeCard' }];
  const floating = model.floatingFrame();
  if (floating) {
    Object.keys(s.tiles).forEach((tile) => actions.push({ kind: 'dropFrame', tile }));
    actions.push({ kind: 'dropFrame', tile: null });
    return actions;
  }
  s.slots.forEach((tile, a) => {
    if (!tile || !model.canDrag(tile)) return;
    s.slots.forEach((other, b) => {
      if (b <= a || (other && !model.canDrag(other))) return;
      actions.push({ kind: 'swap', a, b });
    });
  });
  Object.keys(s.tiles).forEach((tile) => {
    model.hotspots(tile).filter((h) => h.enabled).forEach((h) => actions.push({ kind: 'hotspot', tile, id: h.id, era: h.era }));
    if (model.canZoomOut(tile)) actions.push({ kind: 'zoomOut', tile });
    const frame = model.frameOn(tile);
    if (frame && model.canLiftFrame(frame)) actions.push({ kind: 'liftFrame', frame });
  });
  return actions;
}

export function apply(model, action) {
  switch (action.kind) {
    case 'advance': return model.advanceDialogue();
    case 'closeCard': return model.closeCard();
    case 'swap': return model.swap(action.a, action.b);
    case 'hotspot': {
      if (action.era === 'past') {
        const h = model.hotspots(action.tile).find((entry) => entry.id === action.id);
        const rect = model.slotRect(action.tile);
        model.moveLens(rect.x + (h.rect[0] + h.rect[2] / 2) * rect.w, rect.y + (h.rect[1] + h.rect[3] / 2) * rect.h);
      }
      return model.activateHotspot(action.tile, action.id);
    }
    case 'zoomOut': return model.zoomOut(action.tile);
    case 'liftFrame': return model.liftFrame(action.frame);
    case 'dropFrame': return model.dropFrame(action.tile);
    case 'lens': return model.moveLens(action.x, action.y);
    default: throw new Error(`unknown action ${action.kind}`);
  }
}

/** Puzzle-relevant fingerprint of a state (ignores time and history). */
export function fingerprint(model) {
  const s = model.state;
  return JSON.stringify({
    slots: s.slots,
    tiles: Object.values(s.tiles).map((t) => [t.state, t.zoomStack.map((z) => z.state), t.draggable]),
    frames: Object.values(s.frames).map((f) => f.host),
    lens: s.lens.enabled ? [Math.round(s.lens.x / 40), Math.round(s.lens.y / 40)] : null,
    flags: [...s.flags].sort(),
    items: [...s.items].sort(),
    step: s.stepIndex,
    actors: Object.values(s.actors).map((a) => [a.tile, a.state, a.x.toFixed(2), a.y.toFixed(2), Boolean(a.walk), a.blocked]),
    blocking: s.blocking?.kind ?? null,
    queue: s.queue.length,
    ended: Boolean(s.ended),
  });
}

/**
 * Breadth-first search over player actions (with the model settled after each)
 * for a state where the act has ended. Returns the action list or null.
 */
export function solveBfs(act, snapshot, { maxStates = 4000, extraActions = () => [] } = {}) {
  const probe = createPanelModel(act);
  probe.restore(snapshot);
  settle(probe);
  const queue = [{ snap: probe.snapshot(), path: [] }];
  const seen = new Set([fingerprint(probe)]);
  while (queue.length && seen.size < maxStates) {
    const { snap, path } = queue.shift();
    probe.restore(snap);
    const actions = [...availableActions(probe), ...extraActions(probe)];
    for (const action of actions) {
      probe.restore(snap);
      apply(probe, action);
      settle(probe);
      if (probe.state.ended) return [...path, action];
      const key = fingerprint(probe);
      if (seen.has(key)) continue;
      seen.add(key);
      queue.push({ snap: probe.snapshot(), path: [...path, action] });
    }
  }
  return null;
}

export { createPanelModel, effectKind };
