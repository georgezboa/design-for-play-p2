// Act 1 · LOST PROPERTY (2×2). Teaches drag, then zoom. Spec §6 Act 1.
//
//   TL desk      TR lockers          step 1: swap desk ↔ window, so the desk's
//   BL window    BR door             corridor floor meets the door's threshold;
//                                    Butch walks to the locked door.
//   step 2: zoom into the tagged pigeonhole above the door; its chute meets the
//   door's chute, the ticket drops into the slot, the door unlocks.
//   step 3: Butch goes through; the Conductor hands over the punch; bell #1.

import { defineAct } from '../panelModel.js';
import {
  CHUTE_AT, DOOR, DOOR_WAIT_X, FLOOR, SLOT_Y, drawConductorCar, drawCubby, drawDesk, drawDoor, drawLockers,
  drawWindow, taggedCubbyZoomRect, cubbyRect, TAGGED_CUBBY,
} from '../art/act1Art.js';
import { ACT1_FX } from '../art/act1Fx.js';

const cubby = cubbyRect(756, 420, TAGGED_CUBBY.col, TAGGED_CUBBY.row);
const cubbyTag = { x: (cubby.x + cubby.w * 0.56) / 756, y: (cubby.y + cubby.h * 0.5) / 420 };
const doorway = [0.52, 0.16, 0.48, 0.48];

export const ACT1 = defineAct({
  id: 'act1',
  number: 1,
  title: 'LOST PROPERTY',
  checkpoint: 'chapter-1-start',
  next: 'act2',
  grid: { cols: 2, rows: 2 },
  // row-major: [TL, TR, BL, BR]
  slots: ['desk', 'lockers', 'window', 'door'],
  start: { bell: 0, items: [] },
  assets: ['fields'],
  fx: ACT1_FX,
  cards: {
    A1: {
      stamp: 'CLAIM 1978-0412',
      title: 'MARA VELEZ',
      lines: ['One case, unclaimed.', 'The surname was torn from the paper. The punch number is intact.'],
    },
  },
  tiles: {
    desk: {
      states: {
        default: {
          draw: drawDesk,
          edges: { right: [{ type: 'floor', at: FLOOR }] },
        },
      },
    },
    lockers: {
      states: {
        wall: {
          draw: drawLockers,
          hotspots: [{
            id: 'tagged',
            kind: 'zoom',
            to: 'cubby',
            rect: taggedCubbyZoomRect(),
            requires: { flag: 'butchAtDoor' },
            tag: { x: cubbyTag.x, y: cubbyTag.y, angle: 0.3, scale: 1.2 },
          }],
        },
        cubby: {
          draw: drawCubby,
          edges: { bottom: [{ type: 'chute', at: CHUTE_AT }] },
          hotspots: [{
            id: 'envelope',
            kind: 'read',
            card: 'A1',
            rect: [0.2, 0.36, 0.33, 0.38],
            pulseOnce: true,
            tag: { x: 0.46, y: 0.44, angle: 0.45, scale: 1.7 },
          }],
        },
      },
    },
    window: {
      states: {
        default: {
          draw: drawWindow,
          // The window table sits lower than the corridor: a floor that can
          // never meet the door's threshold, so the mismatch reads at a glance.
          edges: { left: [{ type: 'floor', at: 0.93 }], right: [{ type: 'floor', at: 0.93 }] },
        },
      },
    },
    door: {
      state: 'locked',
      states: {
        locked: {
          draw: (ctx) => drawDoor(ctx, 'locked'),
          edges: { left: [{ type: 'floor', at: FLOOR }], top: [{ type: 'chute', at: CHUTE_AT }] },
          hotspots: [{
            id: 'handle',
            kind: 'use',
            rect: [DOOR.x, 0.4, 0.07, 0.24],
            requires: { all: [{ flag: 'butchAtDoor' }, { notFlag: 'ticketDropped' }] },
            do: [{ sfx: 'rattle' }, { fx: { name: 'slotFlash' } }],
          }],
        },
        unlocked: {
          draw: (ctx) => drawDoor(ctx, 'unlocked'),
          edges: { left: [{ type: 'floor', at: FLOOR }], top: [{ type: 'chute', at: CHUTE_AT }] },
        },
        open: {
          draw: (ctx) => drawDoor(ctx, 'open'),
          edges: { left: [{ type: 'floor', at: FLOOR }], top: [{ type: 'chute', at: CHUTE_AT, silent: true }] },
        },
        conductor: {
          draw: drawConductorCar,
          zoomOut: false,
          actorScale: 1.9,
        },
      },
    },
  },
  actors: {
    butch: { rig: 'butch', tile: 'desk', x: 0.53, y: FLOOR, pose: 'sit', facing: -1 },
    conductor: { rig: 'conductor', tile: 'door', state: 'conductor', x: 0.6, y: 0.84, facing: -1, pose: 'idle' },
  },
  steps: [
    {
      id: 'floor-link',
      when: { link: { a: 'desk', b: 'door', type: 'floor' } },
      hint: { tile: 'desk', edge: { side: 'right', at: FLOOR } },
      do: [
        { actorPose: { actor: 'butch', pose: 'stand', facing: 1 } },
        { sfx: 'stool' },
        { wait: 450 },
        {
          walkButch: {
            id: 'toDoor',
            path: [
              { tile: 'desk', x: 0.6, y: FLOOR },
              { tile: 'desk', x: 1, y: FLOOR },
              { tile: 'door', x: 0, y: FLOOR, via: 'floor' },
              { tile: 'door', x: DOOR_WAIT_X, y: FLOOR },
            ],
          },
        },
        { actorPose: { actor: 'butch', pose: 'idle', facing: 1 } },
        { fx: { name: 'slotFlash' } },
        { setFlag: 'butchAtDoor' },
      ],
      skip: [
        { setFlag: 'butchAtDoor' },
        { placeActor: { actor: 'butch', tile: 'door', x: DOOR_WAIT_X, y: FLOOR, pose: 'idle', facing: 1 } },
      ],
    },
    {
      id: 'ticket-chute',
      when: { all: [{ flag: 'butchAtDoor' }, { link: { a: 'lockers', b: 'door', type: 'chute' } }] },
      hint: { tile: 'lockers', hotspot: 'tagged' },
      do: [
        // a beat to see the ticket at the chute mouth (and the envelope's tag)
        { wait: 1300 },
        { fx: { name: 'ticketDrop', from: { tile: 'lockers', x: CHUTE_AT, y: 0.72 }, to: { tile: 'door', x: CHUTE_AT, y: SLOT_Y }, ms: 1500 } },
        { setFlag: 'ticketDropped' },
        { sfx: 'clack' },
        { setState: { tile: 'door', state: 'unlocked' } },
        { wait: 800 },
      ],
      skip: [{ setFlag: 'ticketDropped' }, { setState: { tile: 'door', state: 'unlocked' } }],
    },
    {
      id: 'conductor',
      when: { flag: 'ticketDropped' },
      do: [
        { sfx: 'door' },
        { setState: { tile: 'door', state: 'open' } },
        { wait: 700 },
        { walkButch: { id: 'throughDoor', speed: 120, path: [{ tile: 'door', x: DOOR.x + DOOR.w * 0.5, y: FLOOR - 0.01 }] } },
        // from here the scene plays itself
        { lockInput: true },
        { placeActor: { actor: 'butch', visible: false } },
        { wait: 250 },
        { zoomTo: { tile: 'door', to: 'conductor', rect: doorway } },
        { wait: 750 },
        { placeActor: { actor: 'butch', tile: 'door', state: 'conductor', x: -0.04, y: 0.84, visible: true, pose: 'walk', facing: 1 } },
        { walkButch: { id: 'meetConductor', speed: 150, path: [{ tile: 'door', x: 0.3, y: 0.84 }] } },
        { actorPose: { actor: 'butch', pose: 'idle', facing: 1 } },
        { wait: 300 },
        {
          dialogue: [
            { speaker: 'THE CONDUCTOR', text: 'Night service is running without a timetable. Take the punch.' },
            { speaker: 'BUTCH', text: 'One case never came off this train. I\'ll find out where it was going.' },
          ],
        },
        { fx: { name: 'punchHandover', ms: 1300 } },
        { giveItem: 'punch' },
        { ringBell: true },
        { wait: 2000 },
        { fx: { name: 'fadeAll', ms: 1700 } },
        { checkpoint: 'chapter-1-act-2' },
        { nextAct: 'act2' },
      ],
    },
  ],
});

export default ACT1;
