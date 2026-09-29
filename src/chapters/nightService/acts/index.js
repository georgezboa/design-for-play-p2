// The act registry for Chapter 1. Register an act definition here; nothing
// else in the engine needs to change.
//
//   Act 0 ONE WINDOW (1×1) → Act 0.5 TWO WINDOWS (1×2) → Act 1 LOST PROPERTY
//   (2×2) → Act 2 THE LUGGAGE CAR (2×2) → Act 3 TWO TRUE THINGS (3×2) → Chapter 2.
//   Acts 0 → 0.5 → 1 grow the carriage wall in place (see `growFrom`).

import { ACT0 } from './act0.js';
import { ACT05 } from './act05.js';
import { ACT1 } from './act1.js';
import { ACT2 } from './act2.js';
import { ACT3 } from './act3.js';

export const ACTS = Object.freeze({
  act0: ACT0,
  act05: ACT05,
  act1: ACT1,
  act2: ACT2,
  act3: ACT3,
});

export const ACT_ORDER = Object.freeze(['act0', 'act05', 'act1', 'act2', 'act3']);

/** The act a fresh Chapter 1 opens on. */
export const FIRST_ACT = 'act0';

/** Chapter 1 checkpoint id → the act it resumes. */
export const CHECKPOINT_ACTS = Object.freeze({
  // saves from before Act 0 existed resume at the chapter's (new) start
  'prologue-start': 'act0',
  'chapter-1-start': 'act0',
  'chapter-1-act-05': 'act05',
  'chapter-1-act-1': 'act1',
  'chapter-1-act-2': 'act2',
  'chapter-1-act-3': 'act3',
});

export function actById(id) {
  return ACTS[id] ?? ACTS[FIRST_ACT];
}

/** `?act=0|0.5|1|2|3` or `act05` → act id (dev routes only; see nightService-main.js). */
export function resolveActParam(value) {
  if (value === null || value === undefined || value === '') return null;
  const text = String(value).toLowerCase().trim();
  if (ACTS[text]) return text;
  if (['0.5', '05', '.5', 'half'].includes(text)) return 'act05';
  const n = Number(text);
  return Number.isInteger(n) && ACTS[`act${n}`] ? `act${n}` : null;
}

/** Chapter state for a fresh start at an act (what earlier acts would have left). */
export function startCarry(actId) {
  const act = actById(actId);
  return { bell: 0, items: [], flags: [], linkHistory: [], ...(act.start ?? {}) };
}
