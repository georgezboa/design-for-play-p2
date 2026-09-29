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
//   3 the desk bell rings by itself: someone is at the counter. Swap back so
//     Butch can walk home to the desk. Through the open door: the stores'
//     pigeonholes — the wall opens two more windows below (Act 1).
//
// Every step is reversible (swaps, zooms); nothing can strand Butch.

import { CARRIAGE_TILE, defineAct } from '../panelModel.js';
import { FLOOR, WIRE_OUT, drawDesk } from '../art/act1Art.js';
import {
  DOOR_WIRE_OUT, DOORWAY_ZOOM, KEY_ZOOM, LOCK, LOCK_ZOOM, STORES_ASIDE_X, STORES_WAIT_X, WIRE_CLOSE,
  drawKeyLine, drawLockClose, drawStores, drawStoresDoor,
} from '../art/act05Art.js';
import { ACT05_FX } from '../art/act05Fx.js';
import { BUTCH_DESK } from './act0.js';

const wireLive = { all: [{ flag: 'butchAtStores' }, { notFlag: 'keySent' }] };
/** Where Butch stands at the desk once he is home (Act 1 opens here). */
export const BUTCH_HOME = Object.freeze({ x: 0.62, y: FLOOR });

export const ACT05 = defineAct({
  id: 'act05',
  number: 0.5,
  title: 'TWO WINDOWS',
  heading: 'TWO WINDOWS',
  checkpoint: 'chapter-1-act-05',
  next: 'act1',
  grid: { cols: 2, rows: 1, tile: CARRIAGE_TILE },
  // row-major, and wrong on purpose: the door stands left of the desk
  slots: ['door', 'desk'],
  start: { bell: 0, items: [] },
  assets: ['fields'],
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
          draw: (ctx) => drawStoresDoor(ctx, 'locked'),
          edges: {
            left: [{ type: 'floor', at: FLOOR }],
            right: [{ type: 'wire', at: DOOR_WIRE_OUT, when: wireLive }],
          },
          hotspots: [{
            id: 'lock', kind: 'zoom', to: 'lock', rect: [LOCK.x - 0.035, LOCK.y - 0.07, 0.07, 0.13], zoomRect: LOCK_ZOOM,
            requires: wireLive,
            tag: { x: LOCK.x + 0.03, y: LOCK.y - 0.07, angle: 0.4, scale: 1.1 },
          }],
        },
        lock: {
          draw: drawLockClose,
          edges: { right: [{ type: 'wire', at: WIRE_CLOSE, when: { notFlag: 'keySent' } }] },
        },
        open: {
          draw: (ctx) => drawStoresDoor(ctx, 'open'),
          edges: { left: [{ type: 'floor', at: FLOOR }] },
        },
        stores: { draw: drawStores, zoomOut: false },
      },
    },
    desk: {
      state: 'office',
      states: {
        office: {
          draw: (ctx) => drawDesk(ctx, { key: true }),
          edges: {
            right: [{ type: 'floor', at: FLOOR }],
            left: [{ type: 'wire', at: WIRE_OUT, when: wireLive }],
          },
          hotspots: [{
            id: 'keys', kind: 'zoom', to: 'keys', rect: [0.27, 0.34, 0.08, 0.14], zoomRect: KEY_ZOOM,
            requires: wireLive,
            // hangs to the left of the key, clear of the desk bell below
            tag: { x: 0.296, y: 0.425, angle: 2.75, scale: 1.1 },
          }],
        },
        keys: {
          draw: drawKeyLine,
          edges: { left: [{ type: 'wire', at: WIRE_CLOSE, when: { notFlag: 'keySent' } }] },
        },
      },
    },
  },
  actors: {
    butch: { rig: 'butch', tile: 'desk', state: 'office', x: BUTCH_DESK.x, y: BUTCH_DESK.y, pose: 'sit', facing: -1 },
  },
  steps: [
    {
      id: 'floor',
      when: { link: { a: 'desk', b: 'door', type: 'floor' } },
      hint: { tile: 'desk', edge: { side: 'right', at: FLOOR }, ghost: { drag: { tile: 'desk', leftOf: 'door' } } },
      do: [
        { actorPose: { actor: 'butch', pose: 'stand', facing: 1 } },
        { sfx: 'stool' },
        { wait: 450 },
        {
          walkButch: {
            id: 'toStores',
            path: [
              { tile: 'desk', x: 0.66, y: FLOOR },
              { tile: 'desk', x: 1, y: FLOOR },
              { tile: 'door', x: 0, y: FLOOR, via: 'floor', state: 'locked' },
              { tile: 'door', x: STORES_WAIT_X, y: FLOOR },
            ],
          },
        },
        { actorPose: { actor: 'butch', pose: 'idle', facing: 1 } },
        { sfx: 'rattle' },
        { fx: { name: 'lockGlint' } },
        { wait: 500 },
        { setFlag: 'butchAtStores' },
      ],
      skip: [
        { setSlots: ['desk', 'door'] },
        { setFlag: 'butchAtStores' },
        { placeActor: { actor: 'butch', tile: 'door', state: 'locked', x: STORES_WAIT_X, y: FLOOR, pose: 'idle', facing: 1 } },
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
        { fx: { name: 'keyTurn', ms: 800 } },
        { zoomOut: 'door' },
        { zoomOut: 'desk' },
        { wait: 600 },
        { placeActor: { actor: 'butch', state: 'open' } },
        { setState: { tile: 'door', state: 'open' } },
        { sfx: 'door' },
        { wait: 400 },
        { walkButch: { id: 'aside', speed: 110, path: [{ tile: 'door', x: STORES_ASIDE_X, y: FLOOR }] } },
        { actorPose: { actor: 'butch', pose: 'idle', facing: 1 } },
        { wait: 700 },
        // the desk bell rings on its own: someone is at the counter
        { fx: { name: 'deskBell', tile: 'desk' } },
        { wait: 500 },
        { actorPose: { actor: 'butch', pose: 'idle', facing: -1 } },
        { wait: 400 },
        { unlockInput: true },
      ],
      skip: [
        { setSlots: ['door', 'desk'] },
        { setFlag: ['keySent', 'unlocked'] },
        { setState: { tile: 'door', state: 'open' } },
        { placeActor: { actor: 'butch', tile: 'door', state: 'open', x: STORES_ASIDE_X, y: FLOOR, pose: 'idle', facing: -1 } },
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
              { tile: 'door', x: 0, y: FLOOR },
              { tile: 'desk', x: 1, y: FLOOR, via: 'floor', state: 'office' },
              { tile: 'desk', x: BUTCH_HOME.x, y: BUTCH_HOME.y },
            ],
          },
        },
        { actorPose: { actor: 'butch', pose: 'idle', facing: -1 } },
        { lockInput: true },
        { wait: 700 },
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
