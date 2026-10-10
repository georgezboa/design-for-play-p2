// Act 1 · LOST PROPERTY (2×2). Drag and zoom, together, in the full wall.
// Spec §6 Act 1. The wall has just grown from Act 0.5's two windows (the
// office and, through the stores door, the pigeonholes): Butch is already
// awake, standing at his desk after the counter bell called him back.
//
//   TL desk      TR lockers          step 1: swap desk ↔ window, so the desk's
//   BL window    BR door             corridor floor meets the door's threshold;
//                                    Butch walks to the locked door.
//   step 2: zoom into the tagged pigeonhole above the door; its chute meets the
//   door's chute, the ticket drops into the slot, the door unlocks.
//   step 3: Butch goes through; the Conductor hands over the punch; bell #1.
//   Round 7: George's painted plates (art/act1Plates.js).

import { BUTCH_PACE, defineAct } from '../panelModel.js';
import { drawConductorCar, drawCubby, drawDesk, drawDoor, drawLockers, drawWindow } from '../art/act1Art.js';
import {
  A1_BUTCH_SCALE, A1_FLOOR as FLOOR, A1_WALK as WALK, BUTCH_IN_CAR, BUTCH_IN_CHAIR1, BUTCH_ON_WALK1, BUTCH_ROUND_DESK1, BUTCH_STEP_IN, BUTCH_UP1, CAR_ACTOR_SCALE,
  CHUTE_AT, CONDUCTOR_IN_CAR, CONDUCTOR_SCALE, DOOR_STEP, DOOR_WAIT_X, DOORWAY_ZOOM, HANDLE_HIT, LOCKERS_CHUTE_AT, PLATES1, PROPS1, SLOT_Y, TAG_DROP_Y, TAG_HIT, TAG_AT, TAGGED_HIT, TAGGED_ZOOM, WINDOW_FLOOR,
  drawConductorPlate, drawCubbyPlate, drawDeskPlate1, drawDoorPlate1, drawLockersPlate, drawWindowPlate,
} from '../art/act1Plates.js';
import { ACT1_FX } from '../art/act1Fx.js';

export const ACT1 = defineAct({
  id: 'act1',
  number: 1,
  title: 'LOST PROPERTY',
  checkpoint: 'chapter-1-act-1',
  next: 'act2',
  // two more windows open below the office and the stores
  growFrom: { act: 'act05', keep: { desk: 'desk', lockers: 'door' } },
  grid: { cols: 2, rows: 2 },
  // row-major: [TL, TR, BL, BR]
  slots: ['desk', 'lockers', 'window', 'door'],
  start: { bell: 0, items: [] },
  assets: ['fields'],
  // round 7: the claim tag, cut from George's prop sheet (it drops down the chute)
  props: PROPS1,
  fx: ACT1_FX,
  cards: {
    A1: {
      stamp: 'CLAIM 1978-0412',
      // the stub is torn after the V: the full name, VELEZ, is read first on
      // the clerk's note in Act 3 (card A3), and Echo City's VENN is its duplicate
      title: 'MARA V——',
      lines: ['One case, unclaimed.', 'The surname was torn from the paper. The punch number is intact.'],
    },
  },
  tiles: {
    desk: {
      states: {
        default: {
          plate: PLATES1.desk,
          draw: (ctx) => (ctx.plate ? drawDeskPlate1(ctx) : drawDesk(ctx)),
          edges: { right: [{ type: 'floor', at: FLOOR }] },
        },
      },
    },
    lockers: {
      states: {
        wall: {
          plate: PLATES1.lockers,
          draw: (ctx) => (ctx.plate ? drawLockersPlate(ctx) : drawLockers(ctx)),
          // the wall's own chute drops out of the bottom edge left of the door's: it does not meet
          edges: { bottom: [{ type: 'chute', at: LOCKERS_CHUTE_AT }] },
          hotspots: [{
            id: 'tagged',
            kind: 'zoom',
            to: 'cubby',
            // the pigeonhole with the tagged envelope, above its brass chute
            rect: TAGGED_HIT,
            zoomRect: TAGGED_ZOOM,
            requires: { flag: 'butchAtDoor' },
            tag: { x: TAGGED_HIT[0] + TAGGED_HIT[2] * 0.9, y: TAGGED_HIT[1] + 0.03, angle: 0.3, scale: 1.2 },
          }],
        },
        cubby: {
          plate: PLATES1.cubby,
          draw: (ctx) => (ctx.plate ? drawCubbyPlate(ctx) : drawCubby(ctx)),
          // up close, its chute leaves the bottom edge right above the door's
          edges: { bottom: [{ type: 'chute', at: CHUTE_AT }] },
          hotspots: [{
            // the claim tag on the chute's lip (read it: card A1)
            id: 'envelope',
            kind: 'read',
            card: 'A1',
            rect: TAG_HIT,
            // gone down the chute: the card has been shown by then
            requires: { notFlag: 'ticketDropped' },
            pulseOnce: true,
            // hangs off the claim tag's string, out over the pigeonhole's floor
            tag: { x: TAG_HIT[0] + 0.03, y: TAG_HIT[1] + 0.06, angle: 2.6, scale: 1.4 },
          }],
        },
      },
    },
    window: {
      states: {
        default: {
          plate: PLATES1.window,
          draw: (ctx) => (ctx.plate ? drawWindowPlate(ctx) : drawWindow(ctx)),
          // The window bay's floor sits lower than the corridor: a floor that can
          // never meet the door's threshold, so the mismatch reads at a glance.
          edges: { left: [{ type: 'floor', at: WINDOW_FLOOR }], right: [{ type: 'floor', at: WINDOW_FLOOR }] },
        },
      },
    },
    door: {
      state: 'locked',
      states: {
        locked: {
          plate: PLATES1.doorLocked,
          draw: (ctx) => (ctx.plate ? drawDoorPlate1(ctx, 'locked') : drawDoor(ctx, 'locked')),
          edges: { left: [{ type: 'floor', at: FLOOR }], top: [{ type: 'chute', at: CHUTE_AT }] },
          hotspots: [{
            id: 'handle',
            kind: 'use',
            rect: HANDLE_HIT,
            requires: { all: [{ flag: 'butchAtDoor' }, { notFlag: 'ticketDropped' }] },
            verb: 'TRY',
            do: [{ sfx: 'rattle' }, { fx: { name: 'slotFlash' } }],
          }],
        },
        unlocked: {
          plate: PLATES1.doorLocked,
          draw: (ctx) => (ctx.plate ? drawDoorPlate1(ctx, 'unlocked') : drawDoor(ctx, 'unlocked')),
          edges: { left: [{ type: 'floor', at: FLOOR }], top: [{ type: 'chute', at: CHUTE_AT }] },
        },
        open: {
          plate: PLATES1.doorOpen,
          draw: (ctx) => (ctx.plate ? drawDoorPlate1(ctx, 'open') : drawDoor(ctx, 'open')),
          edges: { left: [{ type: 'floor', at: FLOOR }], top: [{ type: 'chute', at: CHUTE_AT, silent: true }] },
        },
        // through the open door: the next car's lamp-lit corridor (round 8:
        // George's A1-conductor), where the Conductor waits with his lantern
        conductor: {
          plate: PLATES1.conductor,
          draw: (ctx) => (ctx.plate ? drawConductorPlate(ctx) : drawConductorCar(ctx)),
          zoomOut: false,
          actorScale: CAR_ACTOR_SCALE,
          // round 11: Butch on the threshold is nearer than the Conductor: drawn in front of him
          depthSort: true,
        },
      },
    },
  },
  actors: {
    // awake, home at the desk (where Act 0.5 left him)
    // 1.75 m beside the painted 2 m door (round 7)
    // in his desk chair, where Act 0.5 left him (round 8: the painted sit-chair frame)
    butch: { rig: 'butch', pace: BUTCH_PACE, scale: A1_BUTCH_SCALE, tile: 'desk', x: BUTCH_IN_CHAIR1.x, y: BUTCH_IN_CHAIR1.y, pose: 'sit-chair', facing: 1 },
    // round 11: waiting with his lantern at his side (raised, it hung in front of Butch's face)
    conductor: { rig: 'conductor', scale: CONDUCTOR_SCALE, tile: 'door', state: 'conductor', x: CONDUCTOR_IN_CAR.x, y: CONDUCTOR_IN_CAR.y, facing: -1, pose: 'lowered' },
  },
  steps: [
    {
      id: 'floor-link',
      when: { link: { a: 'desk', b: 'door', type: 'floor' } },
      hint: { tile: 'desk', edge: { side: 'right', at: FLOOR }, ghost: { drag: { tile: 'desk', leftOf: 'door' } } },
      do: [
        // up out of his chair (standing where his feet were), along the boards in
        // front of the desk, round its end and down the corridor (round 11: the
        // old path cut through the painted pedestal)
        { placeActor: { actor: 'butch', x: BUTCH_UP1.x, y: BUTCH_UP1.y, pose: 'stand', facing: 1 } },
        { sfx: 'stool' },
        { wait: 450 },
        {
          walkButch: {
            id: 'toDoor',
            path: [
              { tile: 'desk', x: BUTCH_ROUND_DESK1.x, y: BUTCH_ROUND_DESK1.y },
              { tile: 'desk', x: BUTCH_ON_WALK1.x, y: BUTCH_ON_WALK1.y },
              { tile: 'desk', x: 1, y: WALK },
              { tile: 'door', x: 0, y: WALK, via: 'floor' },
              { tile: 'door', x: DOOR_WAIT_X, y: WALK },
            ],
          },
        },
        { actorPose: { actor: 'butch', pose: 'idle', facing: 1 } },
        { fx: { name: 'slotFlash' } },
        { setFlag: 'butchAtDoor' },
      ],
      skip: [
        { setFlag: 'butchAtDoor' },
        { placeActor: { actor: 'butch', tile: 'door', x: DOOR_WAIT_X, y: WALK, pose: 'idle', facing: 1 } },
      ],
    },
    {
      id: 'ticket-chute',
      when: { all: [{ flag: 'butchAtDoor' }, { link: { a: 'lockers', b: 'door', type: 'chute' } }] },
      hint: {
        tile: 'lockers',
        hotspot: 'tagged',
        ghost: [
          { click: { tile: 'lockers', hotspot: 'tagged' } },
          { drag: { tile: 'lockers', above: 'door' } },
        ],
      },
      do: [
        // a beat to see the ticket at the chute mouth (and the envelope's tag)
        { wait: 1300 },
        { fx: { name: 'ticketDrop', from: { tile: 'lockers', x: TAG_AT.x, y: TAG_AT.y, mouth: TAG_DROP_Y, chute: CHUTE_AT }, to: { tile: 'door', x: CHUTE_AT, y: SLOT_Y }, ms: 1500 } },
        { setFlag: 'ticketDropped' },
        { sfx: 'clack' },
        { setState: { tile: 'door', state: 'unlocked' } },
        // round 6 · item 4: success leaves checkable evidence — the lamp goes
        // amber, the door comes off its latch — held before the claim card
        { wait: 300 },
        { fx: { name: 'doorUnlocked', ms: 1400 } },
        // the claim this chapter is about: never optional (unless already read)
        { showCard: { card: 'A1', unless: { hotspot: 'lockers.envelope' } } },
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
        // onto the threshold, short of the leaf that swings out at the opening's right
        { walkButch: { id: 'throughDoor', speed: 120, path: [{ tile: 'door', x: DOOR_STEP.x, y: DOOR_STEP.y }] } },
        // from here the scene plays itself
        { lockInput: true },
        { placeActor: { actor: 'butch', visible: false } },
        { wait: 250 },
        // through the doorway into the next car: he steps in over its
        // threshold, the Conductor waits a metre down the corridor's runner
        { placeActor: { actor: 'butch', tile: 'door', state: 'conductor', x: BUTCH_STEP_IN.x, y: BUTCH_STEP_IN.y, visible: true, pose: 'idle', facing: 1 } },
        { zoomTo: { tile: 'door', to: 'conductor', rect: DOORWAY_ZOOM } },
        { wait: 520 },
        { walkButch: { id: 'meetConductor', speed: 32, path: [{ tile: 'door', x: BUTCH_IN_CAR.x, y: BUTCH_IN_CAR.y }] } },
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
        { wait: 1400 },
        // round 11 (George: no black between Acts I and II): the other windows
        // dim and the camera leans in on Butch; Act II opens on this frame,
        // its aisle laid over the corridor with Butch where he stands here,
        // and pulls back into the luggage car (act2 `enter.act1`)
        { fx: { name: 'flight', tile: 'door', actor: 'butch', push: 1.08, ms: 1800 } },
        { checkpoint: 'chapter-1-act-2' },
        { nextAct: 'act2' },
      ],
    },
  ],
});

export default ACT1;
