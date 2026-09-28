import { LABYRINTH_CHAPTER05_CONTRACT } from '../../museum/labyrinth/chapter05LabyrinthContract.js';
import { ONE_ANSWER_CHAPTER05_CONTRACT } from '../oneAnswer/chapter05OneAnswerContract.js';
import { LABYRINTH_EXHIBIT } from '../data/chapterExhibitCatalog.js';

// The two framed sub-worlds the shipping Museum opens:
//   ONE_ANSWER — the lobby's central case, OBJECT PENDING CLASSIFICATION
//                (one-answer.html, a Chapter 1 panel-engine act);
//   LABYRINTH  — Door 4 in the archive corridor (labyrinth.html).
// The collapse needs both, in either order. Echo City survives only as the
// dev-only `?beat=echo` reconstruction: it is sealed here so it can never
// count toward the museum route.
export const CHAPTER05_DIRECTIONS = Object.freeze({
  ONE_ANSWER: ONE_ANSWER_CHAPTER05_CONTRACT.id,
  LABYRINTH: LABYRINTH_CHAPTER05_CONTRACT.id,
  ECHO_CITY: 'echo-city',
});

export const DIRECTION_ORDER = Object.freeze([
  CHAPTER05_DIRECTIONS.ONE_ANSWER,
  CHAPTER05_DIRECTIONS.LABYRINTH,
  CHAPTER05_DIRECTIONS.ECHO_CITY,
]);

export const SEALED_DIRECTION_IDS = Object.freeze([
  CHAPTER05_DIRECTIONS.ECHO_CITY,
]);

export const PLAYABLE_DIRECTION_ORDER = Object.freeze(
  DIRECTION_ORDER.filter((id) => !SEALED_DIRECTION_IDS.includes(id)),
);

export const DIRECTION_DEFINITIONS = Object.freeze({
  [CHAPTER05_DIRECTIONS.ONE_ANSWER]: Object.freeze({
    id: CHAPTER05_DIRECTIONS.ONE_ANSWER,
    title: ONE_ANSWER_CHAPTER05_CONTRACT.title,
    src: ONE_ANSWER_CHAPTER05_CONTRACT.embeddedSrc,
    completeMessage: ONE_ANSWER_CHAPTER05_CONTRACT.completeMessage,
    exitMessage: ONE_ANSWER_CHAPTER05_CONTRACT.exitMessage,
    archiveTitle: ONE_ANSWER_CHAPTER05_CONTRACT.accession,
    modeLabel: ONE_ANSWER_CHAPTER05_CONTRACT.title,
    ingress: 'The archive wants one clean answer about Mara Velez. Four pieces of evidence are under the glass.',
    egress: 'CLASSIFICATION REFUSED',
    beginLabel: 'OPEN THE CASE',
  }),
  [CHAPTER05_DIRECTIONS.LABYRINTH]: Object.freeze({
    id: CHAPTER05_DIRECTIONS.LABYRINTH,
    title: String(LABYRINTH_CHAPTER05_CONTRACT.doorNumber),
    src: LABYRINTH_CHAPTER05_CONTRACT.embeddedSrc,
    completeMessage: LABYRINTH_CHAPTER05_CONTRACT.completeMessage,
    exitMessage: LABYRINTH_CHAPTER05_CONTRACT.exitMessage,
    completionMode: 'eight-key-ring',
    archiveTitle: `DOOR ${LABYRINTH_CHAPTER05_CONTRACT.doorNumber} · ${LABYRINTH_EXHIBIT.title}`,
    modeLabel: LABYRINTH_EXHIBIT.mode,
    ingress: LABYRINTH_EXHIBIT.ingress,
    egress: LABYRINTH_EXHIBIT.egress,
    beginLabel: 'ENTER DOOR 4',
  }),
  [CHAPTER05_DIRECTIONS.ECHO_CITY]: Object.freeze({
    id: CHAPTER05_DIRECTIONS.ECHO_CITY,
    title: '3',
    src: null,
    completeMessage: null,
    exitMessage: null,
    archiveTitle: 'ECHO CITY · RECONSTRUCTION',
    modeLabel: 'RECONSTRUCTION',
    ingress: '',
    available: false,
    // dev only: museum-3d.html?beat=echo&standalone=1 (DEV_MODE)
    standaloneSrc: '/museum-3d.html?beat=echo&standalone=1',
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
