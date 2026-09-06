import { BORROWED_GRID_CHAPTER05_CONTRACT } from '../../borrowedGrid/chapter05BorrowedGridContract.js';
import { LABYRINTH_CHAPTER05_CONTRACT } from '../../museum/labyrinth/chapter05LabyrinthContract.js';
import { chapterExhibit } from '../data/chapterExhibitCatalog.js';

export const CHAPTER05_DIRECTIONS = Object.freeze({
  BORROWED_GRID: BORROWED_GRID_CHAPTER05_CONTRACT.id,
  ECHO_CITY: 'echo-city',
  PAINTED_COUNTRY: 'painted-country',
  LABYRINTH: LABYRINTH_CHAPTER05_CONTRACT.id,
});

export const DIRECTION_ORDER = Object.freeze([
  CHAPTER05_DIRECTIONS.LABYRINTH,
  CHAPTER05_DIRECTIONS.BORROWED_GRID,
  CHAPTER05_DIRECTIONS.ECHO_CITY,
  CHAPTER05_DIRECTIONS.PAINTED_COUNTRY,
]);

// Echo City and the earlier Painted Country museum echo stay authored and
// buildable as standalone slices, but Door 4 itself now belongs to Labyrinth.
// are deliberately outside the current Chapter 5 museum route. Keeping the
// boundary here prevents either slice from silently affecting the museum's
// completion count while preserving their direct preview entry points.
export const SEALED_DIRECTION_IDS = Object.freeze([
  CHAPTER05_DIRECTIONS.BORROWED_GRID,
  CHAPTER05_DIRECTIONS.ECHO_CITY,
  CHAPTER05_DIRECTIONS.PAINTED_COUNTRY,
]);

export const STANDALONE_DIRECTION_IDS = Object.freeze([
  CHAPTER05_DIRECTIONS.ECHO_CITY,
  CHAPTER05_DIRECTIONS.PAINTED_COUNTRY,
]);

export const PLAYABLE_DIRECTION_ORDER = Object.freeze(
  DIRECTION_ORDER.filter((id) => !SEALED_DIRECTION_IDS.includes(id)),
);

export const DIRECTION_DEFINITIONS = Object.freeze({
  [CHAPTER05_DIRECTIONS.BORROWED_GRID]: Object.freeze({
    id: CHAPTER05_DIRECTIONS.BORROWED_GRID,
    title: String(BORROWED_GRID_CHAPTER05_CONTRACT.doorNumber),
    shortTitle: String(BORROWED_GRID_CHAPTER05_CONTRACT.doorNumber),
    src: BORROWED_GRID_CHAPTER05_CONTRACT.embeddedSrc,
    completeMessage: BORROWED_GRID_CHAPTER05_CONTRACT.completeMessage,
    exitMessage: BORROWED_GRID_CHAPTER05_CONTRACT.exitMessage,
    artifactId: BORROWED_GRID_CHAPTER05_CONTRACT.artifactId,
    archiveTitle: `${chapterExhibit('borrowed-grid').chapter} · ${chapterExhibit('borrowed-grid').title}`,
    modeLabel: chapterExhibit('borrowed-grid').mode,
    ingress: chapterExhibit('borrowed-grid').reconstructionLaw,
    available: false,
  }),
  [CHAPTER05_DIRECTIONS.ECHO_CITY]: Object.freeze({
    id: CHAPTER05_DIRECTIONS.ECHO_CITY,
    title: '3',
    shortTitle: '3',
    src: null,
    completeMessage: null,
    exitMessage: null,
    archiveTitle: `${chapterExhibit('echo-city').chapter} · ${chapterExhibit('echo-city').title}`,
    modeLabel: chapterExhibit('echo-city').mode,
    ingress: chapterExhibit('echo-city').reconstructionLaw,
    available: false,
    standaloneSrc: '/museum-3d.html?beat=echo&standalone=1',
  }),
  [CHAPTER05_DIRECTIONS.PAINTED_COUNTRY]: Object.freeze({
    id: CHAPTER05_DIRECTIONS.PAINTED_COUNTRY,
    // Its archived object occupies the sealed first bay. Door 4 is now the
    // Labyrinth, so keeping a second "4" here would make labels ambiguous.
    title: '1',
    shortTitle: '1',
    src: '/chapter05-painted-country.html?embedded=1',
    completeMessage: 'chapter05-direction:painted-country:complete',
    exitMessage: 'chapter05-direction:painted-country:exit',
    archiveTitle: `${chapterExhibit('painted-country').chapter} · ${chapterExhibit('painted-country').title}`,
    modeLabel: chapterExhibit('painted-country').mode,
    ingress: chapterExhibit('painted-country').reconstructionLaw,
    available: false,
    standaloneSrc: '/chapter05-painted-country.html',
  }),
  [CHAPTER05_DIRECTIONS.LABYRINTH]: Object.freeze({
    id: CHAPTER05_DIRECTIONS.LABYRINTH,
    title: String(LABYRINTH_CHAPTER05_CONTRACT.doorNumber),
    shortTitle: String(LABYRINTH_CHAPTER05_CONTRACT.doorNumber),
    src: LABYRINTH_CHAPTER05_CONTRACT.embeddedSrc,
    completeMessage: LABYRINTH_CHAPTER05_CONTRACT.completeMessage,
    exitMessage: LABYRINTH_CHAPTER05_CONTRACT.exitMessage,
    artifactId: LABYRINTH_CHAPTER05_CONTRACT.artifactId,
    completionMode: 'eight-key-ring',
    archiveTitle: `${chapterExhibit('labyrinth').chapter} · ${chapterExhibit('labyrinth').title}`,
    modeLabel: chapterExhibit('labyrinth').mode,
    ingress: chapterExhibit('labyrinth').ingress,
    egress: chapterExhibit('labyrinth').egress,
  }),
});

export function isDirectionId(value) {
  return DIRECTION_ORDER.includes(value);
}

export function isDirectionPlayable(value) {
  return PLAYABLE_DIRECTION_ORDER.includes(value);
}

export function directionDefinition(id) {
  if (!isDirectionId(id)) throw new Error(`Unknown Chapter 5 direction: ${String(id)}`);
  return DIRECTION_DEFINITIONS[id];
}
