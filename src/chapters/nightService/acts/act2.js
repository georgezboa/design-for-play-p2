// Act 2 · THE LUGGAGE CAR (2×2). Teaches the punch lens, then the frame
// lift; hides the Ember Stone. Spec §6 Act 2.
//
//   TL rack      TR window (liftable brass frame over the night fields)
//   BL aisle     BR board
//
//   1 punch the ticket in Butch's hand → the hole becomes the lens
//   2 look through the lens: 1978 tags (CITY / BELLWETHER); mark the orchard case
//   3 zoom into its tag → the postcard → the orchard house at Bellwether
//   4 lift the window frame onto the orchard: the train is AT Bellwether;
//     the rack tilts and the orchard case waits at the drop point
//   5 rack above aisle (drop ↔ drop): the case falls into Butch's arms — bell #3
//   6 (optional) deep zoom: open case → letter to Rosa (A2) → the Ember Stone
//   7 zoom into the case once and back out: the act ends

import { defineAct } from '../panelModel.js';
import {
  AISLE_FLOOR, BENEATH_ZOOM, BUTCH_SCALE, BUTCH_X, CASE_ZOOM, DROP_AT, LETTER_ZOOM, ORCHARD_TAG,
  POSTCARD, TAG_ZOOM, TICKET_AT, drawAisle, drawAislePast, drawBeneath, drawBoard, drawBoardPast,
  drawBrassFrame, drawCarriageView, drawCaseTag, drawLetter, drawOpenCase, drawOrchard, drawRack,
  drawRackPast,
} from '../art/act2Art.js';
import { ACT2_FX } from '../art/act2Fx.js';

// the lens appears over the aisle, clear of the rack, so moving it is the lesson
const LENS_START = { x: 0.62, y: 0.4 };

export const ACT2 = defineAct({
  id: 'act2',
  number: 2,
  title: 'THE LUGGAGE CAR',
  checkpoint: 'chapter-1-act-2',
  next: 'act3',
  grid: { cols: 2, rows: 2 },
  slots: ['rack', 'window', 'aisle', 'board'],
  start: { bell: 1, items: ['punch'] },
  assets: ['fields', 'memory'],
  fx: ACT2_FX,
  cards: {
    A2: {
      stamp: 'UNSENT · CITY POSTMARK',
      title: 'TO ROSA, AT THE ORCHARD',
      lines: ['I took a room by the terminal: the early shift starts before the first westbound train.', 'I will be home Saturday.'],
    },
  },
  tiles: {
    rack: {
      state: 'rack',
      states: {
        rack: {
          draw: (ctx) => drawRack(ctx, 'rack'),
          drawPast: drawRackPast,
          hotspots: [
            {
              id: 'bellwether', kind: 'use', era: 'past', once: true,
              rect: [ORCHARD_TAG.x - 0.06, ORCHARD_TAG.y - 0.08, 0.14, 0.16],
              requires: { item: 'lens' },
              tag: { x: ORCHARD_TAG.x + 0.07, y: ORCHARD_TAG.y - 0.03, glintOnly: true },
              do: [{ setFlag: 'orchardMarked' }],
            },
            {
              id: 'caseTag', kind: 'zoom', to: 'tag', rect: TAG_ZOOM,
              requires: { flag: 'orchardMarked' },
              tag: { x: ORCHARD_TAG.x - 0.005, y: ORCHARD_TAG.y - 0.02, angle: 0.3, scale: 1.1 },
            },
          ],
        },
        tag: {
          draw: drawCaseTag,
          hotspots: [{
            id: 'postcard', kind: 'zoom', to: 'orchard', rect: POSTCARD,
            tag: { x: POSTCARD[0] + POSTCARD[2] + 0.02, y: POSTCARD[1] + 0.02, angle: 0.5, scale: 1.4 },
          }],
        },
        orchard: { draw: drawOrchard },
        tilting: {
          draw: (ctx) => drawRack(ctx, 'tilting'),
          drawPast: drawRackPast,
          edges: { bottom: [{ type: 'drop', at: DROP_AT, when: { all: [{ flag: 'caseAtEdge' }, { notFlag: 'caseInArms' }] } }] },
        },
      },
    },
    window: {
      frame: {
        id: 'windowFrame',
        draw: drawBrassFrame,
        // the frame lifts once the orchard has been seen (taught when it is the only move)
        requires: { flag: 'orchardSeen' },
      },
      states: { default: { draw: drawCarriageView } },
    },
    aisle: {
      state: 'aisle',
      states: {
        aisle: {
          draw: drawAisle,
          drawPast: drawAislePast,
          actorScale: BUTCH_SCALE,
          edges: { top: [{ type: 'drop', at: DROP_AT, silent: true }] },
          hotspots: [
            {
              id: 'ticket', kind: 'use', once: true,
              rect: [TICKET_AT.x - 0.045, TICKET_AT.y - 0.08, 0.09, 0.16],
              requires: { notItem: 'lens' },
              tag: { x: TICKET_AT.x + 0.02, y: TICKET_AT.y - 0.05, angle: -0.4, glintOnly: true },
            },
            {
              id: 'case', kind: 'zoom', to: 'openCase', rect: CASE_ZOOM,
              requires: { flag: 'caseInArms' },
              tag: { x: CASE_ZOOM[0] + CASE_ZOOM[2] * 0.82, y: CASE_ZOOM[1] + CASE_ZOOM[3] * 0.45, angle: 0.4 },
            },
          ],
        },
        openCase: {
          draw: drawOpenCase,
          hotspots: [{
            id: 'letter', kind: 'zoom', to: 'letter', rect: LETTER_ZOOM,
            tag: { x: LETTER_ZOOM[0] + LETTER_ZOOM[2] * 0.9, y: LETTER_ZOOM[1] + 0.02, angle: 0.5, scale: 1.3 },
          }],
        },
        letter: {
          draw: drawLetter,
          hotspots: [
            { id: 'read', kind: 'read', card: 'A2', rect: [0.16, 0.12, 0.5, 0.6], tag: { x: 0.64, y: 0.2, angle: 0.4, scale: 1.6 } },
            { id: 'beneath', kind: 'zoom', to: 'stone', rect: BENEATH_ZOOM, tag: { x: 0.82, y: 0.78, glintOnly: true } },
          ],
        },
        stone: {
          draw: drawBeneath,
          hotspots: [{
            id: 'ember', kind: 'use', once: true, rect: [0.38, 0.32, 0.24, 0.46],
            requires: { notFlag: 'stone:chapter-1' },
            do: [{ grantStone: 'chapter-1' }, { fx: { name: 'emberTaken' } }],
          }],
        },
      },
    },
    board: {
      state: 'default',
      states: {
        default: { draw: (ctx) => drawBoard(ctx, 'default'), drawPast: drawBoardPast },
        arrived: { draw: (ctx) => drawBoard(ctx, 'arrived'), drawPast: drawBoardPast },
      },
    },
  },
  actors: {
    butch: { rig: 'butch', tile: 'aisle', state: 'aisle', x: BUTCH_X, y: AISLE_FLOOR, pose: 'ticket', facing: 1 },
  },
  steps: [
    {
      id: 'punch',
      when: { hotspot: 'aisle.ticket' },
      hint: { tile: 'aisle', hotspot: 'ticket' },
      do: [
        { lockInput: true },
        { sfx: 'clack' },
        { fx: { name: 'punchPop', to: { tile: 'aisle', u: LENS_START.x, v: LENS_START.y }, ms: 950 } },
        { enableLens: { tile: 'aisle', u: LENS_START.x, v: LENS_START.y } },
        { giveItem: 'lens' },
        { actorPose: { actor: 'butch', pose: 'idle' } },
        { ringBell: true },
        { wait: 900 },
        { unlockInput: true },
      ],
      skip: [{ enableLens: { tile: 'aisle', u: LENS_START.x, v: LENS_START.y } }, { giveItem: 'lens' }, { actorPose: { actor: 'butch', pose: 'idle' } }, { ringBell: true }],
    },
    {
      id: 'mark',
      when: { flag: 'orchardMarked' },
      hint: { tile: 'rack', lens: true },
      do: [{ fx: { name: 'markCase' } }, { wait: 700 }],
      skip: [{ setFlag: 'orchardMarked' }],
    },
    {
      id: 'orchard',
      when: { state: { tile: 'rack', is: 'orchard' } },
      hint: { tile: 'rack', hotspots: ['caseTag', 'postcard'] },
      do: [{ setFlag: 'orchardSeen' }, { sfx: 'reveal' }, { wait: 400 }],
      skip: [
        { setFlag: ['orchardMarked', 'orchardSeen'] },
        { zoomTo: { tile: 'rack', to: 'tag', rect: TAG_ZOOM } },
        { zoomTo: { tile: 'rack', to: 'orchard', rect: POSTCARD } },
      ],
    },
    {
      id: 'arrive',
      when: { overlay: { frame: 'windowFrame', onto: 'rack', ontoState: 'orchard' } },
      hint: { tile: 'window', frame: true },
      do: [
        { lockInput: true },
        // a held breath: the orchard, framed by the carriage window
        { wait: 700 },
        { fx: { name: 'arrive' } },
        { fx: { name: 'drift', rate: 0, ease: 2200 } },
        { wait: 2400 },
        { setState: { tile: 'board', state: 'arrived' } },
        { sfx: 'chime' },
        { wait: 700 },
        { returnFrame: 'windowFrame' },
        { zoomOut: 'rack' },
        { wait: 650 },
        { zoomOut: 'rack' },
        { wait: 650 },
        { setState: { tile: 'rack', state: 'tilting' } },
        { sfx: 'door' },
        { wait: 600 },
        { setFlag: 'caseAtEdge' },
        { wait: 900 },
        { unlockInput: true },
      ],
      skip: [
        { setFlag: ['orchardMarked', 'orchardSeen', 'caseAtEdge'] },
        { setState: { tile: 'board', state: 'arrived' } },
        { setState: { tile: 'rack', state: 'tilting' } },
      ],
    },
    {
      id: 'firstWeight',
      when: { link: { a: 'rack', b: 'aisle', type: 'drop' } },
      hint: { tile: 'rack', edge: { side: 'bottom', at: DROP_AT } },
      do: [
        { lockInput: true },
        { setFlag: 'caseFalling' },
        { fx: { name: 'caseDrop', ms: 820 } },
        { setFlag: 'caseInArms' },
        { actorPose: { actor: 'butch', pose: 'idle', carrying: 'case' } },
        { wait: 1100 },
        { ringBell: true },
        { fx: { name: 'drift', rate: 1, ease: 2600 } },
        { wait: 600 },
        { unlockInput: true },
      ],
      skip: [
        { setFlag: ['caseFalling', 'caseInArms'] },
        { actorPose: { actor: 'butch', pose: 'idle', carrying: 'case' } },
        { ringBell: true },
      ],
    },
    {
      id: 'end',
      when: { all: [{ flag: 'caseInArms' }, { hotspot: 'aisle.case' }, { state: { tile: 'aisle', is: 'aisle' } }] },
      hint: { tile: 'aisle', hotspot: 'case' },
      do: [
        { lockInput: true },
        { wait: 1100 },
        { fx: { name: 'fadeAll', ms: 1700 } },
        { checkpoint: 'chapter-1-act-3' },
        { nextAct: 'act3' },
      ],
    },
  ],
});

export const ACT2_LENS_START = LENS_START;
export default ACT2;
