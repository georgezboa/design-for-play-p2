// Act 0.5 · TWO WINDOWS (1×2). Teaches the swap with only two panels, then
// that zoom level changes which edges match.
//
//   starts wrong:  [ door | desk ]   the desk's floor leaves its RIGHT edge,
//                                    the stores door's threshold enters its LEFT
//   1 swap them: Butch walks across to the stores door. It is locked.
//   2 the key hangs on the office's key line (a brass cash-carrier wire). Zoomed
//     out, the office's wire leaves its LEFT edge low and the door's arrives
//     at its RIGHT edge high: they never meet. Zoom into both — the key line
//     and the lock — and each close-up carries the wire at the same height.
//     The door must stand LEFT of the office (the order puzzle 1 undid):
//     the carrier runs, the key turns, the door opens on the stores.
//   Round 7: George's painted plates (art/act05Plates.js); the key line is the
//   brass rod along the corridor wall, its carrier clip by the desk.
//   3 the desk bell rings by itself: someone is at the counter. Swap back so
//     Butch can walk home to the desk. Through the open door: the stores'
//     pigeonholes — the wall opens two more windows below (Act 1).
//
// Every step is reversible (swaps, zooms); nothing can strand Butch.

import { BUTCH_PACE, CARRIAGE_TILE, defineAct } from '../panelModel.js';
import { drawDesk } from '../art/act1Art.js';
import { drawKeyLine, drawLockClose, drawStores, drawStoresDoor } from '../art/act05Art.js';
import {
  A05_BUTCH_SCALE, A05_FLOOR as FLOOR, A05_WALK as WALK, BUTCH_AT_DESK, BUTCH_IN_CHAIR, DESK_RING, DOOR_WIRE_OUT, DOORWAY_ZOOM, KEY_ZOOM, KEYS_HIT, LOCK_HIT,
  LOCK_ZOOM, PLATES05, PROPS05, STORES_ASIDE_X, STORES_WAIT_X, WIRE_CLOSE, WIRE_OUT,
  drawDeskPlate, drawDoorPlate, drawKeysPlate, drawLockPlate, drawStoresPlate,
} from '../art/act05Plates.js';
import { ACT05_FX } from '../art/act05Fx.js';

const wireLive = { all: [{ flag: 'butchAtStores' }, { notFlag: 'keySent' }] };
/** Where Butch stands at the desk once he is home (Act 1 opens at its own desk painting). */
export const BUTCH_HOME = Object.freeze({ x: BUTCH_AT_DESK.x + 0.02, y: WALK });
/** Seated, his feet are this far right of the seat's back (the sit-chair frame at his scale). */
const CHAIR_FEET_DX = 0.075;

export const ACT05 = defineAct({
  id: 'act05',
  number: 0.5,
  title: 'TWO WINDOWS',
  heading: 'TWO WINDOWS',
  checkpoint: 'chapter-1-act-05',
  next: 'act1',
  // painted at the 2×2 window size, shown a little larger (the full wall width)
  grid: { cols: 2, rows: 1, tile: CARRIAGE_TILE, display: 1.16 },
  // row-major, and wrong on purpose: the door stands left of the desk
  slots: ['door', 'desk'],
  start: { bell: 0, items: [] },
  assets: ['fields'],
  // round 7: George's office key, cut from his prop sheet (it rides the carrier)
  props: PROPS05,
  fx: ACT05_FX,
  // the wall grows from Act 0's one window: the office carries on as the desk
  growFrom: { act: 'act0', keep: { desk: 'office' } },
  // the act always ends desk | stores (its last step needs that floor link);
  // the dev `?from=act05` route grows Act 1 from here
  endSlots: ['desk', 'door'],
  tiles: {
    door: {
      state: 'locked',
      states: {
        locked: {
          plate: PLATES05.doorLocked,
          draw: (ctx) => (ctx.plate ? drawDoorPlate(ctx, 'locked') : drawStoresDoor(ctx, 'locked')),
          edges: {
            left: [{ type: 'floor', at: FLOOR }],
            // the door's key line comes down from the ceiling at the right edge, high up
            right: [{ type: 'wire', at: DOOR_WIRE_OUT, when: wireLive }],
          },
          hotspots: [{
            id: 'lock', kind: 'zoom', to: 'lock', rect: LOCK_HIT, zoomRect: LOCK_ZOOM,
            requires: wireLive,
            // tied to the knob, hanging down over the leaf (the frame is on its right)
            tag: { x: LOCK_HIT[0] + LOCK_HIT[2] * 0.4, y: LOCK_HIT[1] + 0.035, angle: 2.6, scale: 1.1 },
          }],
        },
        lock: {
          plate: PLATES05.lock,
          draw: (ctx) => (ctx.plate ? drawLockPlate(ctx) : drawLockClose(ctx)),
          edges: { right: [{ type: 'wire', at: WIRE_CLOSE, when: { notFlag: 'keySent' } }] },
        },
        // round 6 · item 4: the wide view the key leaves behind — the lock
        // lit, the leaf off its latch with lamplight in the crack
        unlocked: {
          plate: PLATES05.doorLocked,
          draw: (ctx) => (ctx.plate ? drawDoorPlate(ctx, 'unlocked') : drawStoresDoor(ctx, 'unlocked')),
          edges: { left: [{ type: 'floor', at: FLOOR }] },
        },
        open: {
          plate: PLATES05.doorOpen,
          draw: (ctx) => (ctx.plate ? drawDoorPlate(ctx, 'open') : drawStoresDoor(ctx, 'open')),
          edges: { left: [{ type: 'floor', at: FLOOR }] },
        },
        stores: { plate: PLATES05.stores, draw: (ctx) => (ctx.plate ? drawStoresPlate(ctx) : drawStores(ctx)), zoomOut: false },
      },
    },
    desk: {
      state: 'office',
      states: {
        office: {
          plate: PLATES05.desk,
          draw: (ctx) => (ctx.plate ? drawDeskPlate(ctx) : drawDesk(ctx, { key: true })),
          edges: {
            right: [{ type: 'floor', at: FLOOR }],
            // the key line runs along the wall and out behind the shelf, at rail height
            left: [{ type: 'wire', at: WIRE_OUT, when: wireLive }],
          },
          hotspots: [{
            id: 'keys', kind: 'zoom', to: 'keys', rect: KEYS_HIT, zoomRect: KEY_ZOOM,
            requires: wireLive,
            // hangs to the right of the key, over the bare wall (the lamp is on its left)
            tag: { x: KEYS_HIT[0] + KEYS_HIT[2] * 0.75, y: KEYS_HIT[1] + 0.03, angle: 0.5, scale: 1.1 },
          }],
        },
        keys: {
          plate: PLATES05.keys,
          draw: (ctx) => (ctx.plate ? drawKeysPlate(ctx) : drawKeyLine(ctx)),
          edges: { left: [{ type: 'wire', at: WIRE_CLOSE, when: { notFlag: 'keySent' } }] },
        },
      },
    },
  },
  actors: {
    // awake, in his desk chair (round 8: the painted sit-chair frame); 1.75 m
    // beside the painted 2 m door when he stands (round 7)
    butch: { rig: 'butch', pace: BUTCH_PACE, scale: A05_BUTCH_SCALE, tile: 'desk', state: 'office', x: BUTCH_IN_CHAIR.x, y: BUTCH_IN_CHAIR.y, pose: 'sit-chair', facing: 1 },
  },
  steps: [
    {
      id: 'floor',
      when: { link: { a: 'desk', b: 'door', type: 'floor' } },
      hint: { tile: 'desk', edge: { side: 'right', at: FLOOR }, ghost: { drag: { tile: 'desk', leftOf: 'door' } } },
      do: [
        // he gets up from his chair (standing where his feet were) and crosses in front of the desk
        { placeActor: { actor: 'butch', x: BUTCH_IN_CHAIR.x + CHAIR_FEET_DX, pose: 'stand', facing: 1 } },
        { sfx: 'stool' },
        { wait: 450 },
        {
          walkButch: {
            id: 'toStores',
            path: [
              { tile: 'desk', x: BUTCH_AT_DESK.x, y: WALK },
              { tile: 'desk', x: 0.66, y: WALK },
              { tile: 'desk', x: 1, y: WALK },
              { tile: 'door', x: 0, y: WALK, via: 'floor', state: 'locked' },
              { tile: 'door', x: STORES_WAIT_X, y: WALK },
            ],
          },
        },
        { actorPose: { actor: 'butch', pose: 'idle', facing: 1 } },
        { sfx: 'rattle' },
        { fx: { name: 'lockGlint' } },
        { wait: 500 },
        { setFlag: 'butchAtStores' },
        // he says so, and the key on the office's line glints (alpha R4 · P2)
        { caption: { speaker: 'BUTCH', text: 'Locked. The key hangs on the line by my desk.', ms: 5200 } },
        { fx: { name: 'pulse', hint: { tile: 'desk', hotspot: 'keys' } } },
      ],
      skip: [
        { setSlots: ['desk', 'door'] },
        { setFlag: 'butchAtStores' },
        { placeActor: { actor: 'butch', tile: 'door', state: 'locked', x: STORES_WAIT_X, y: WALK, pose: 'idle', facing: 1 } },
      ],
    },
    {
      id: 'carrier',
      when: { link: { a: 'door', b: 'desk', type: 'wire' } },
      hint: {
        tile: 'desk',
        hotspots: ['keys'],
        verb: 'zoom',
        ghost: [
          { click: { tile: 'desk', hotspot: 'keys' } },
          { click: { tile: 'door', hotspot: 'lock' } },
          { drag: { tile: 'door', leftOf: 'desk' } },
        ],
      },
      do: [
        { lockInput: true },
        { wait: 500 },
        { setFlag: 'keyInFlight' },
        { fx: { name: 'carrier', ms: 1450 } },
        { setFlag: 'keySent' },
        { clearFlag: 'keyInFlight' },
        { wait: 350 },
        { setFlag: 'unlocked' },
        // round 6 · item 4: the result holds in the close-up — the key turns,
        // the bolt draws back, the plate lights — before the camera steps back
        { fx: { name: 'keyTurn', ms: 1650 } },
        // ... and the wide view keeps the evidence: the door off its latch
        { zoomOut: { tile: 'door', to: 'unlocked' } },
        { placeActor: { actor: 'butch', state: 'unlocked' } },
        { wait: 280 },
        { zoomOut: 'desk' },
        { wait: 700 },
        { fx: { name: 'doorAjar', ms: 900 } },
        { placeActor: { actor: 'butch', state: 'open' } },
        { setState: { tile: 'door', state: 'open' } },
        { sfx: 'door' },
        { wait: 400 },
        { walkButch: { id: 'aside', speed: 110, path: [{ tile: 'door', x: STORES_ASIDE_X, y: WALK }] } },
        { actorPose: { actor: 'butch', pose: 'idle', facing: 1 } },
        { wait: 700 },
        // the desk bell rings on its own: someone is at the counter
        { fx: { name: 'deskBell', tile: 'desk', at: DESK_RING } },
        { wait: 500 },
        { actorPose: { actor: 'butch', pose: 'idle', facing: -1 } },
        { wait: 400 },
        { unlockInput: true },
        // the next goal, in his words (he is in the stores; the desk is next door)
        { caption: { speaker: 'BUTCH', text: 'The counter bell. Someone’s waiting at my desk.', ms: 5600 } },
      ],
      skip: [
        { setSlots: ['door', 'desk'] },
        { setFlag: ['keySent', 'unlocked'] },
        { setState: { tile: 'door', state: 'open' } },
        { placeActor: { actor: 'butch', tile: 'door', state: 'open', x: STORES_ASIDE_X, y: WALK, pose: 'idle', facing: -1 } },
      ],
    },
    {
      id: 'home',
      when: { link: { a: 'desk', b: 'door', type: 'floor' } },
      hint: { actor: 'butch', tile: 'desk', edge: { side: 'right', at: FLOOR }, ghost: { drag: { tile: 'desk', leftOf: 'door' } } },
      do: [
        { wait: 300 },
        {
          walkButch: {
            id: 'home',
            path: [
              { tile: 'door', x: 0, y: WALK },
              { tile: 'desk', x: 1, y: WALK, via: 'floor', state: 'office' },
              { tile: 'desk', x: BUTCH_HOME.x, y: BUTCH_HOME.y },
              // back to his chair: Act 1 opens with him in it
              { tile: 'desk', x: BUTCH_IN_CHAIR.x + CHAIR_FEET_DX, y: BUTCH_IN_CHAIR.y },
            ],
          },
        },
        { lockInput: true },
        { placeActor: { actor: 'butch', x: BUTCH_IN_CHAIR.x, y: BUTCH_IN_CHAIR.y, pose: 'sit-chair', facing: 1 } },
        { sfx: 'stool' },
        { wait: 900 },
        // through the open door: the stores, and its wall of pigeonholes
        { zoomTo: { tile: 'door', to: 'stores', rect: DOORWAY_ZOOM } },
        { wait: 1200 },
        { checkpoint: 'chapter-1-act-1' },
        { nextAct: 'act1' },
      ],
    },
  ],
});

export default ACT05;
