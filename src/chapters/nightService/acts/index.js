// The act registry for Chapter 1. Replace a stub by importing the real act
// definition here; nothing else in the engine needs to change.

import { ACT1 } from './act1.js';
import { ACT2 } from './act2.js';
import { ACT3 } from './act3.js';
import { LAB_ACT } from './labAct.js';

export const ACTS = Object.freeze({
  act1: ACT1,
  act2: ACT2,
  act3: ACT3,
  // dev-only engine lab: reachable solely through the dev `?act=lab` route
  lab: LAB_ACT,
});

export const ACT_ORDER = Object.freeze(['act1', 'act2', 'act3']);

/** Chapter 1 checkpoint id → the act it resumes. */
export const CHECKPOINT_ACTS = Object.freeze({
  'prologue-start': 'act1',
  'chapter-1-start': 'act1',
  'chapter-1-act-2': 'act2',
  'chapter-1-act-3': 'act3',
});

export function actById(id) {
  return ACTS[id] ?? ACTS.act1;
}

/** `?act=1|2|3` or `act2` → act id (dev routes only; see nightService-main.js). */
export function resolveActParam(value) {
  if (!value) return null;
  const text = String(value).toLowerCase();
  if (ACTS[text]) return text;
  const n = Number(text);
  return Number.isInteger(n) && ACTS[`act${n}`] ? `act${n}` : null;
}

/** Chapter state for a fresh start at an act (what earlier acts would have left). */
export function startCarry(actId) {
  const act = actById(actId);
  return { bell: 0, items: [], flags: [], linkHistory: [], ...(act.start ?? {}) };
}
