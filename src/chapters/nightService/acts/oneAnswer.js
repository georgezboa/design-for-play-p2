// Chapter 5 · OBJECT PENDING CLASSIFICATION — the one-answer exhibit in the
// Museum lobby's central case (one-answer.html, framed like the Labyrinth).
// A panel-engine act (README.md): four evidence windows the museum has
// "already filed", no save data needed from earlier chapters.
//
//   solution:  stub (TL) → duplicate (TR)
//                              ↓
//              tag  (BL) ←  plate (BR)
//
//   intro   the Archivist's arrangement: one clean record, every window locked
//   punch   click the conductor's hole in Mara's ticket stub: the punch-hole lens
//   unfile  through the lens, the duplicate reservation has no FILED seal in
//           1978 — click it there and the windows unlock
//   plate   zoom into Plate IV: Rosa's drawing, and its lane
//   tag     turn the orchard case's UNCLAIMED tag over: Bellwether
//   route   order the windows city → orchard; the office floor is torn in the
//           present, so the lens must hold 1978 over it while Mara crosses
//   arrive  Mara (the echo, seen from behind) reaches the orchard gate: both
//           lives on one route. The Archivist's own "duplicate" line is struck.
//
// Only one arrangement links: the platform (CITY_AT) joins stub→duplicate,
// the stair (DOWN_AT) duplicate→plate, the lane (ORCHARD_AT) plate→tag, and
// the duplicate's two edges exist only in 1978. Without the "duplicate" the
// city never reaches the orchard: the only solution keeps both of her lives.

import { defineAct } from '../panelModel.js';
import {
  CITY_AT, DOWN_AT, DRAWING_LANE, OFFICE_LENS_AT, ORCHARD_AT, ORCHARD_GATE, PRINT_RECT, SLIP_RECT, STUB_HOLE, TORN_FLOOR,
  drawOfficeFiled, drawOfficeOpen, drawOfficePast, drawPlateDrawing, drawPlateWall, drawStub, drawStubPast,
  drawTagFace, drawTagFiled, drawTagFiledPast, drawTagPast,
} from '../art/oneAnswerArt.js';
import { ONE_ANSWER_FX } from '../art/oneAnswerFx.js';

const lensOverOffice = { lensOver: { tile: 'duplicate', x: OFFICE_LENS_AT[0], y: OFFICE_LENS_AT[1] } };
const plateOpen = { state: { tile: 'plate', is: 'drawing' } };
const officeEdge = { era: 'past', lensAt: [...OFFICE_LENS_AT] };

/** Mara's route: the platform, the office (whole only in 1978), the drawing, the orchard. */
export const MARA_ROUTE = Object.freeze([
  { tile: 'stub', x: 1, y: CITY_AT },
  { tile: 'duplicate', x: 0, y: CITY_AT, via: 'route' },
  { tile: 'duplicate', x: TORN_FLOOR[0] - 0.05, y: CITY_AT },
  { tile: 'duplicate', x: DOWN_AT - 0.02, y: CITY_AT, requires: lensOverOffice, retreat: { x: TORN_FLOOR[0] - 0.05 } },
  { tile: 'duplicate', x: DOWN_AT, y: 0.97, requires: lensOverOffice, retreat: { x: DOWN_AT - 0.02, y: CITY_AT } },
  { tile: 'plate', x: DOWN_AT, y: 0.02, via: 'route', state: 'drawing' },
  ...DRAWING_LANE.slice(1, -1).map(([x, y]) => ({ tile: 'plate', x, y, requires: plateOpen })),
  { tile: 'plate', x: 0, y: ORCHARD_AT, requires: plateOpen },
  { tile: 'tag', x: 1, y: ORCHARD_AT, via: 'route', state: 'face' },
  { tile: 'tag', x: ORCHARD_GATE.x + 0.06, y: ORCHARD_AT },
]);

export const ONE_ANSWER_ACT = defineAct({
  id: 'oneAnswer',
  number: 5,
  kicker: 'THE MUSEUM OF ONE ANSWER',
  heading: 'OBJECT PENDING CLASSIFICATION',
  title: 'OBJECT PENDING CLASSIFICATION',
  grid: { cols: 2, rows: 2 },
  // the Archivist's arrangement: the orchard face-down in the corner, the
  // duplicate filed at the bottom, the city line facing the wall
  slots: ['tag', 'stub', 'plate', 'duplicate'],
  start: { bell: 1, items: ['punch'] },
  assets: ['city', 'memory'],
  fx: ONE_ANSWER_FX,
  // dev `N`: file the exhibit at once (never a Chapter 1 checkpoint)
  devSkip: [{ endChapter: true }],
  cards: {
    P1: {
      stamp: 'ACC. 1978-0412 · PENDING',
      title: 'VELEZ, M. — ONE CLEAN RECORD',
      lines: ['Resident of the city. One claim, collected.', 'Orchard case: unclaimed.', 'Second claim: duplicate. Discard.'],
    },
    P2: {
      stamp: 'CLASSIFICATION REFUSED',
      title: 'MARA VELEZ',
      lines: ['City room, Terminal Row — the early shift.', 'Orchard house, Bellwether — home at weekends.', 'Second claim: duplicate. Discard.'],
      strike: 2,
      strikeDelay: 1300,
    },
  },
  tiles: {
    stub: {
      draggable: false,
      states: {
        default: {
          draw: drawStub,
          drawPast: drawStubPast,
          edges: { right: [{ type: 'route', at: CITY_AT }] },
          hotspots: [{
            id: 'hole', kind: 'use', once: true,
            rect: [STUB_HOLE.x - 0.05, STUB_HOLE.y - 0.09, 0.1, 0.18],
            do: [{ setFlag: 'punched' }],
            tag: { x: STUB_HOLE.x + 0.06, y: STUB_HOLE.y - 0.1, angle: -0.3 },
          }],
        },
      },
    },
    duplicate: {
      state: 'filed',
      draggable: false,
      states: {
        filed: {
          draw: drawOfficeFiled,
          drawPast: drawOfficePast,
          edges: {
            left: [{ type: 'route', at: CITY_AT, ...officeEdge }],
            bottom: [{ type: 'route', at: DOWN_AT, ...officeEdge }],
          },
          hotspots: [{
            // in 1978 the reservation carries no seal: unfile it there
            id: 'seal', kind: 'use', era: 'past', once: true, requires: { lens: true },
            rect: [...SLIP_RECT],
            tag: { x: SLIP_RECT[0] + SLIP_RECT[2] + 0.02, y: SLIP_RECT[1] + 0.04, angle: 0.3, glintOnly: true },
          }],
        },
        open: {
          draw: drawOfficeOpen,
          drawPast: drawOfficePast,
          edges: {
            left: [{ type: 'route', at: CITY_AT, ...officeEdge }],
            bottom: [{ type: 'route', at: DOWN_AT, ...officeEdge }],
          },
        },
      },
    },
    plate: {
      state: 'wall',
      draggable: false,
      states: {
        wall: {
          draw: drawPlateWall,
          drawPast: drawPlateWall,
          hotspots: [{
            id: 'print', kind: 'zoom', to: 'drawing', rect: [...PRINT_RECT],
            tag: { x: PRINT_RECT[0] + PRINT_RECT[2] + 0.03, y: PRINT_RECT[1] + 0.02, angle: 0.35 },
          }],
        },
        drawing: {
          draw: drawPlateDrawing,
          drawPast: drawPlateDrawing,
          actorScale: 0.8,
          edges: {
            top: [{ type: 'route', at: DOWN_AT }],
            left: [{ type: 'route', at: ORCHARD_AT }],
          },
        },
      },
    },
    tag: {
      state: 'filed',
      draggable: false,
      states: {
        filed: {
          draw: drawTagFiled,
          drawPast: drawTagFiledPast,
          hotspots: [{
            id: 'turn', kind: 'use', era: 'both', once: true,
            rect: [0.14, 0.12, 0.72, 0.76],
            do: [{ setState: { tile: 'tag', state: 'face' } }, { sfx: 'paper' }],
            tag: { x: 0.2, y: 0.16, angle: -0.4 },
          }],
        },
        face: {
          draw: drawTagFace,
          drawPast: drawTagPast,
          edges: { right: [{ type: 'route', at: ORCHARD_AT }] },
        },
      },
    },
  },
  actors: {
    mara: { rig: 'mara', tile: 'stub', x: 0.36, y: CITY_AT, facing: 1, pose: 'idle' },
  },
  steps: [
    {
      id: 'intro',
      when: true,
      do: [
        { lockInput: true },
        { wait: 900 },
        { fx: { name: 'fileStamp', ms: 1100 } },
        { showCard: 'P1' },
        { unlockInput: true },
      ],
      skip: [],
    },
    {
      id: 'punch',
      when: { hotspot: 'stub.hole' },
      hint: { tile: 'stub', hotspot: 'hole' },
      do: [
        { sfx: 'clack' },
        { enableLens: { tile: 'stub', u: STUB_HOLE.x + 0.14, v: STUB_HOLE.y + 0.12 } },
        { giveItem: 'lens' },
      ],
      skip: [{ setFlag: 'punched' }, { enableLens: { tile: 'stub', u: STUB_HOLE.x + 0.14, v: STUB_HOLE.y + 0.12 } }, { giveItem: 'lens' }],
    },
    {
      id: 'unfile',
      when: { hotspot: 'duplicate.seal' },
      // the ghost hand (hints.js): carry the lens onto the seal, click through it
      hint: { tile: 'duplicate', lens: true, ghost: { click: { tile: 'duplicate', hotspot: 'seal' } } },
      do: [
        { lockInput: true },
        { sfx: 'scratch' },
        { setState: { tile: 'duplicate', state: 'open' } },
        { fx: { name: 'sealBreak', ms: 700 } },
        { unlockDrag: 'all' },
        { unlockInput: true },
        {
          dialogue: [
            { speaker: 'THE ARCHIVIST', text: 'That record is a duplicate.' },
            { speaker: 'BUTCH', text: 'Not in 1978. In 1978 it was her.' },
          ],
        },
        { walk: { actor: 'mara', id: 'route', speed: 80, await: false, path: MARA_ROUTE } },
      ],
      skip: [
        { setState: { tile: 'duplicate', state: 'open' } },
        { unlockDrag: 'all' },
        { walk: { actor: 'mara', id: 'route', speed: 80, await: false, path: MARA_ROUTE } },
      ],
    },
    {
      id: 'plate',
      when: plateOpen,
      hint: { tile: 'plate', hotspot: 'print' },
      do: [{ sfx: 'chime' }],
      skip: [{ setState: { tile: 'plate', state: 'drawing' } }],
    },
    {
      id: 'tag',
      when: { state: { tile: 'tag', is: 'face' } },
      hint: { tile: 'tag', hotspot: 'turn' },
      do: [{ sfx: 'glint' }],
      skip: [{ setState: { tile: 'tag', state: 'face' } }],
    },
    {
      id: 'route',
      when: {
        all: [
          { link: { a: 'stub', b: 'duplicate', type: 'route' } },
          { link: { a: 'duplicate', b: 'plate', type: 'route' } },
          { link: { a: 'plate', b: 'tag', type: 'route' } },
        ],
      },
      hint: {
        tile: 'duplicate',
        lens: true,
        ghost: [
          { drag: [{ tile: 'stub', slot: 0 }, { tile: 'duplicate', slot: 1 }, { tile: 'plate', slot: 3 }, { tile: 'tag', slot: 2 }] },
          { lens: { tile: 'duplicate', u: OFFICE_LENS_AT[0], v: OFFICE_LENS_AT[1] } },
        ],
      },
      do: [{ sfx: 'chime' }],
    },
    {
      id: 'arrive',
      when: { arrived: 'route' },
      hint: { actor: 'mara', ghost: { when: { not: lensOverOffice }, lens: { tile: 'duplicate', u: OFFICE_LENS_AT[0], v: OFFICE_LENS_AT[1] } } },
      do: [
        { lockInput: true },
        { actorPose: { actor: 'mara', pose: 'idle', facing: -1 } },
        { ringBell: true },
        { fx: { name: 'bothLives', ms: 2600 } },
        { showCard: 'P2' },
        {
          dialogue: [
            { speaker: 'THE ARCHIVIST', text: 'The archive does not issue duplicates.' },
            { speaker: 'BUTCH', text: 'It didn\'t. There was only ever one of her.' },
          ],
        },
        { wait: 600 },
        { fx: { name: 'fadeAll', ms: 2000 } },
        { endChapter: true },
      ],
    },
  ],
});

export default ONE_ANSWER_ACT;
