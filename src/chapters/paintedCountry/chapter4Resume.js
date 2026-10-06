// Chapter 4 // THE PAINTED COUNTRY — mid-chapter resume points.
//
// The chapter has one checkpoint (chapter-4-start) and four rooms, about
// thirty minutes in all (alpha round 4: quitting in the studio, the yard or
// the line restarted the gallery). Each room records where the player is
// with the save's resume point (shell/saveSystem.js markResume), and the
// page opens that room again with what was done in it:
//
//   { room: 'gallery', car: {...}, at: { x, y } }   after each plate, and on
//                                                   reaching Bay B and Bay C
//   { room: 'studio', fills: {...}, brush }         on entry and every change
//   { room: 'yard', collected: [...], built: [...], homePlate, x }
//   { room: 'line' }                                on entry (the chase restarts)
//
// Rules only, no Phaser: the scenes call these.

import { BLOCK_RECTS, GRID, PAINTINGS, VARNISH_COATS, VARNISH_RECTS } from './carLayout.js';
import { STILL_LIFE_REGIONS, STUDIO_PIGMENTS } from './drawingStudioModel.js';
import { PIGMENTS, TRAIN_BUILD_EXAMPLE_ORDER } from './chapter4ExpansionModel.js';

export const CH4_CHECKPOINT = 'chapter-4-start';
export const CH4_ROOMS = Object.freeze(['gallery', 'studio', 'yard', 'line']);
export const ROOM_SCENE = Object.freeze({ gallery: 'PaintedCountry', studio: 'DrawingStudio', yard: 'PigmentTrain', line: 'PaintedLine' });
// The registry key a scene reads its resume data from (consumed once).
export const RESUME_REGISTRY_KEY = 'chapter4Resume';

const CELLS = GRID.w * GRID.h;
const cellList = (list) => (Array.isArray(list) ? [...new Set(list.filter((k) => Number.isInteger(k) && k >= 0 && k < CELLS))] : []);
const inList = (list, allowed) => (Array.isArray(list) ? [...new Set(list.filter((id) => allowed.includes(id)))] : []);
const num = (value, lo, hi, fallback) => (Number.isFinite(Number(value)) ? Math.max(lo, Math.min(hi, Number(value))) : fallback);

function blockCells() {
  const cells = [];
  BLOCK_RECTS.forEach(({ col, row, cols, rows }) => {
    for (let cx = col; cx < col + cols; cx += 1) for (let cy = row; cy < row + rows; cy += 1) cells.push(cy * GRID.w + cx);
  });
  return cells;
}

function varnishCells() {
  const cells = [];
  VARNISH_RECTS.forEach(({ col, row, cols, rows }) => {
    for (let cx = col; cx < col + cols; cx += 1) for (let cy = row; cy < row + rows; cy += 1) cells.push(cy * GRID.w + cx);
  });
  return cells;
}

/** A save's resume data cleaned up, or null when it is not a Chapter 4 room. */
export function sanitizeResume(data) {
  if (!data || typeof data !== 'object' || !CH4_ROOMS.includes(data.room)) return null;
  if (data.room === 'gallery') {
    const car = data.car && typeof data.car === 'object' ? data.car : {};
    return {
      room: 'gallery',
      car: {
        painted: cellList(car.painted),
        washed: cellList(car.washed).filter((k) => blockCells().includes(k)),
        varnish: Array.isArray(car.varnish)
          ? car.varnish.filter((pair) => Array.isArray(pair) && varnishCells().includes(pair[0])).map(([k, coats]) => [k, num(coats, 0, VARNISH_COATS, VARNISH_COATS)])
          : null,
        pigment: num(car.pigment, 0, 999, 0),
        plates: inList(car.plates, PAINTINGS.map((p) => p.id)),
        wrongTries: num(car.wrongTries, 0, 99, 0),
      },
      at: data.at && Number.isFinite(data.at.x) && Number.isFinite(data.at.y) ? { x: data.at.x, y: data.at.y } : null,
    };
  }
  if (data.room === 'studio') {
    const fills = {};
    const pigments = STUDIO_PIGMENTS.map((p) => p.id);
    Object.entries(data.fills ?? {}).forEach(([region, pigment]) => {
      if (STILL_LIFE_REGIONS.some((r) => r.id === region) && pigments.includes(pigment)) fills[region] = pigment;
    });
    return { room: 'studio', fills, brush: pigments.includes(data.brush) ? data.brush : null };
  }
  if (data.room === 'yard') {
    const ids = PIGMENTS.map((p) => p.id);
    const collected = inList(data.collected, ids);
    return {
      room: 'yard',
      collected,
      built: inList(data.built, ids).filter((id) => collected.includes(id)),
      homePlate: { washes: num(data.homePlate?.washes, 0, 2, 0), revealed: data.homePlate?.revealed === true },
      x: Number.isFinite(data.x) ? data.x : null,
    };
  }
  return { room: 'line' };
}

/** What the gallery car looks like now, for a resume point. */
export function galleryResumeData(car, at = null) {
  const s = car.state;
  const washed = blockCells().filter((k) => !s.blocks.has(k));
  return {
    room: 'gallery',
    car: {
      painted: [...s.painted],
      washed,
      varnish: [...s.varnish.entries()],
      pigment: s.pigment,
      plates: PAINTINGS.map((p) => p.id).filter((id) => s.plates[id]?.developed),
      wrongTries: s.door.wrongTries,
    },
    at: at ? { x: Math.round(at.x), y: Math.round(at.y) } : null,
  };
}

/** Lay a gallery resume point back onto a fresh car (createPaintedCar). */
export function applyGalleryResume(car, data) {
  const clean = sanitizeResume(data);
  if (clean?.room !== 'gallery') return false;
  const s = car.state;
  const { painted, washed, varnish, pigment, plates, wrongTries } = clean.car;
  washed.forEach((k) => s.blocks.delete(k));
  painted.forEach((k) => { if (!car.isSolid(k % GRID.w, Math.floor(k / GRID.w))) s.painted.add(k); });
  if (varnish) {
    s.varnish = new Map(varnish.filter(([, coats]) => coats > 0));
  }
  s.pigment = pigment;
  plates.forEach((id) => car.developPlate(id));
  s.door.wrongTries = wrongTries;
  car.drainEvents();
  return true;
}

/** Lay a studio resume point onto a fresh studio (createDrawingStudio). */
export function applyStudioResume(studio, data) {
  const clean = sanitizeResume(data);
  if (clean?.room !== 'studio') return false;
  Object.entries(clean.fills).forEach(([region, pigment]) => { studio.state.fills[region] = pigment; });
  studio.state.taken = [...new Set([...(studio.state.taken ?? []), ...Object.values(clean.fills)])];
  studio.state.brush = clean.brush;
  studio.drainEvents();
  return true;
}

/** Lay a yard resume point onto a fresh yard (createChapter4Expansion). */
export function applyYardResume(chapter, data) {
  const clean = sanitizeResume(data);
  if (clean?.room !== 'yard') return false;
  clean.collected.forEach((id) => chapter.collect(id));
  // Build in an order the rules accept (wheels, bodies, then the rest).
  TRAIN_BUILD_EXAMPLE_ORDER.filter((id) => clean.built.includes(id)).forEach((id) => chapter.placePart(id));
  for (let i = 0; i < clean.homePlate.washes && !chapter.state.homePlate.revealed; i += 1) chapter.washHomePlate();
  if (clean.homePlate.revealed) while (!chapter.state.homePlate.revealed) chapter.washHomePlate();
  chapter.drainEvents();
  return true;
}

/** The yard as a resume point. */
export function yardResumeData(chapter, x = null) {
  const snap = chapter.snapshot();
  return {
    room: 'yard',
    collected: snap.pigments.filter((p) => p.collected).map((p) => p.id),
    built: snap.pigments.filter((p) => p.built).map((p) => p.id),
    homePlate: { ...snap.homePlate },
    x: Number.isFinite(x) ? Math.round(x) : null,
  };
}

/**
 * The room this page load should open: the active slot's resume point when
 * the save stands on chapter-4-start and no dev route overrides it.
 */
export function chapter4ResumeOnLoad({ store, devRoute = null } = {}) {
  if (devRoute || !store) return null;
  try {
    return sanitizeResume(store.readResume(CH4_CHECKPOINT));
  } catch {
    return null;
  }
}

/** Record a resume point (a no-op off this checkpoint, or without storage). */
export function recordChapter4Resume(store, data) {
  const clean = sanitizeResume(data);
  if (!store || !clean) return null;
  try {
    return store.markResume(CH4_CHECKPOINT, clean);
  } catch {
    return null;
  }
}
