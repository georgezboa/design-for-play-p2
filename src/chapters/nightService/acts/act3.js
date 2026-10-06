// Act 3 · TWO TRUE THINGS (3×2). Everything combined: the lens as a bridge,
// the bell finale. Spec §6 Act 3.
//
//   top:    city room · hawthorn · orchard house   (lane at 0.62)
//   bottom: carriage  · gap      · platform        (rail at 0.85)
//
//   1 lift the city window onto the orchard house (close): two windows become
//     one; Mara appears in it, turns and leaves. Card A3, the red pencil. Bell #4
//   2 order the top row city → hawthorn → orchard: Mara walks into the lane
//     and stops at the hedge. The lane's last stretch exists only in 1978:
//     hold the lens on the joint and her silhouette crosses (the first,
//     low-stakes past-era EDGE); zoom the orchard out to the hill and she
//     walks on to the stair above the platform
//   3 the finale escalates the idea: order the bottom row carriage → gap →
//     platform and hold the lens on the broken viaduct: in 1978 it is whole;
//     the train crosses (and backs off if the lens moves). Bell #5
//   4 Mara boards the other train as ours arrives; the case on the bench;
//     the Conductor's last line; chapter-2-start and the 1-2 film

import { BUTCH_PACE, defineAct } from '../panelModel.js';
import {
  CITY_WINDOW, GAP_SPAN, HEDGE, OVERLOOK_HOUSE, PATH_AT, PLATFORM_DY, RAIL_AT, STAIR_AT, drawCarriageScene, drawCityFrame, drawCityRoom,
  drawCityRoomPast, drawGap, drawGapPast, drawHawthorn, drawHawthornPast, drawHouse, drawOverlook, drawPlatform,
  drawPlatformPast,
} from '../art/act3Art.js';
import { ACT3_FX } from '../art/act3Fx.js';

const lensOverGap = { lensOver: { tile: 'gap', x: 0.5, y: RAIL_AT } };
const lensOverHedge = { lensOver: { tile: 'hawthorn', x: HEDGE.lens[0], y: HEDGE.lens[1] } };

// The composition goals, as seams that must meet (hints.js unmetSeam): tier 1
// and SHOW ME light both ends of the first one still apart (alpha R1-2).
const LANE_SEAMS = [
  { a: 'city', side: 'right', b: 'hawthorn', at: PATH_AT },
  { a: 'hawthorn', side: 'right', b: 'orchard', at: PATH_AT },
];
const STAIR_SEAM = { a: 'orchard', side: 'bottom', b: 'platform', at: STAIR_AT };
const RAIL_SEAMS = [
  { a: 'carriage', side: 'right', b: 'gap', at: RAIL_AT },
  { a: 'gap', side: 'right', b: 'platform', at: RAIL_AT },
];

/** Mara's first stretch: out of the city room, into the lane, up to the hedge. */
const TO_HEDGE = [
  { tile: 'city', x: 1, y: PATH_AT },
  { tile: 'hawthorn', x: 0, y: PATH_AT, via: 'path' },
  { tile: 'hawthorn', x: HEDGE.wait, y: PATH_AT },
];
/** Through the hedge (1978 only), to the hill and the stair above the platform. */
const THROUGH_HEDGE = [
  { tile: 'hawthorn', x: 1, y: PATH_AT, requires: lensOverHedge, retreat: { x: HEDGE.wait } },
  { tile: 'orchard', x: 0, y: PATH_AT, via: 'path', state: 'overlook' },
  { tile: 'orchard', x: 0.44, y: PATH_AT },
  { tile: 'orchard', x: 0.5, y: 0.68, requires: { link: { a: 'orchard', b: 'platform', type: 'stair' } } },
  { tile: 'orchard', x: STAIR_AT, y: 0.97 },
];
const TRAIN_Y = RAIL_AT - 0.004;
/** Our train is drawn larger than the far one, so the finale reads at a glance (alpha R3 · R5). */
export const TRAIN_SCALE = 1.35;
/** Its length on a tile (the rig is 150 tile px at scale 1; tiles are 536 wide on the 3×2 wall). */
export const TRAIN_LENGTH = (150 * TRAIN_SCALE) / 536;
// the present viaduct is missing over GAP_SPAN (rails end 0.02 short of each
// side): where the train waits, its whole length stays on good track
export const SAFE_NEAR = Math.floor((GAP_SPAN[0] - 0.02 - TRAIN_LENGTH / 2) * 100) / 100;
export const SAFE_FAR = Math.ceil((GAP_SPAN[1] + 0.02 + TRAIN_LENGTH / 2) * 100) / 100;
/** The platform's walking line and the far track, raised with the rail. */
const WALK_Y = 0.8 + PLATFORM_DY;
const FAR_Y = 0.665 + PLATFORM_DY;

export const ACT3 = defineAct({
  id: 'act3',
  number: 3,
  title: 'TWO TRUE THINGS',
  checkpoint: 'chapter-1-act-3',
  grid: { cols: 3, rows: 2 },
  // scrambled on both rows; the orchard already sits above the platform's slot column
  slots: ['hawthorn', 'orchard', 'city', 'gap', 'platform', 'carriage'],
  // the lens rests over the city room's bed (1978: her coat, her open case),
  // clear of the orchard window
  start: { bell: 3, items: ['punch', 'lens'], lens: { x: 1372, y: 262 } },
  assets: ['fields', 'memory'],
  fx: ACT3_FX,
  cards: {
    A3: {
      stamp: 'CLERK\'S NOTE · 1981',
      title: 'MARA VELEZ',
      lines: ['Maintained the city room for work.', 'Returned to Bellwether on weekends.', 'Second claim: duplicate. Discard.'],
      strike: 2,
      strikeDelay: 1300,
    },
  },
  tiles: {
    city: {
      // the whole window (sash, glass and sill) is the grip: hold it (or drag
      // it) to lift it. Once the two windows have met it stays put, so a drag
      // anywhere on the room moves the room (the lane needs it moved)
      frame: {
        id: 'cityWindow',
        draw: drawCityFrame,
        grip: { rect: [CITY_WINDOW[0] - 0.02, CITY_WINDOW[1] - 0.02, CITY_WINDOW[2] + 0.04, CITY_WINDOW[3] + 0.06] },
        // HOLD · LIFT THE FRAME (if no frame was lifted in Act 2), under the sill
        tag: { u: 0.36, v: 0.74 },
        requires: { notFlag: 'windowsJoined' },
      },
      states: {
        default: {
          draw: drawCityRoom,
          drawPast: drawCityRoomPast,
          edges: { right: [{ type: 'path', at: PATH_AT }] },
        },
      },
    },
    hawthorn: {
      states: {
        default: {
          draw: drawHawthorn,
          drawPast: drawHawthornPast,
          edges: {
            left: [{ type: 'path', at: PATH_AT }],
            // today a hedge; in 1978 the lane ran on through an open gate
            right: [{ type: 'path', at: PATH_AT, era: 'past', lensAt: [...HEDGE.lens] }],
          },
        },
      },
    },
    orchard: {
      state: 'house',
      zoomStack: [{ state: 'overlook', rect: OVERLOOK_HOUSE }],
      states: {
        house: { draw: drawHouse },
        overlook: {
          draw: drawOverlook,
          edges: { left: [{ type: 'path', at: PATH_AT }], bottom: [{ type: 'stair', at: STAIR_AT }] },
          hotspots: [{
            id: 'house', kind: 'zoom', to: 'house', rect: OVERLOOK_HOUSE,
            tag: { x: OVERLOOK_HOUSE[0] + OVERLOOK_HOUSE[2] * 0.9, y: OVERLOOK_HOUSE[1] + OVERLOOK_HOUSE[3] * 0.3, angle: 0.4 },
          }],
        },
      },
    },
    carriage: {
      states: { default: { draw: drawCarriageScene, edges: { right: [{ type: 'rail', at: RAIL_AT }] } } },
    },
    gap: {
      states: {
        default: {
          draw: drawGap,
          drawPast: drawGapPast,
          edges: {
            left: [{ type: 'rail', at: RAIL_AT, era: 'past', lensAt: [0.5, RAIL_AT] }],
            right: [{ type: 'rail', at: RAIL_AT, era: 'past', lensAt: [0.5, RAIL_AT] }],
          },
        },
      },
    },
    platform: {
      states: {
        default: {
          draw: drawPlatform,
          drawPast: drawPlatformPast,
          edges: { left: [{ type: 'rail', at: RAIL_AT }], top: [{ type: 'stair', at: STAIR_AT, silent: true }] },
        },
      },
    },
  },
  actors: {
    butch: { rig: 'butch', pace: BUTCH_PACE, tile: 'carriage', x: 0.35, y: RAIL_AT, visible: false },
    train: { rig: 'train', tile: 'carriage', x: 0.36, y: TRAIN_Y, facing: 1, scale: TRAIN_SCALE },
    mara: { rig: 'mara', tile: 'city', x: 0.62, y: PATH_AT, visible: false, facing: 1 },
    farTrain: { rig: 'train', tile: 'platform', x: 0.74, y: FAR_Y, facing: 1, scale: 0.72, tint: 0x9a9aae },
  },
  steps: [
    {
      id: 'windows',
      when: { overlay: { frame: 'cityWindow', onto: 'orchard', ontoState: 'house' } },
      hint: {
        tile: 'city',
        frame: true,
        ghost: [
          { when: { state: { tile: 'orchard', is: 'house' } }, frame: { from: 'city', to: 'orchard' } },
          { click: { tile: 'orchard', hotspot: 'house' } },
        ],
      },
      do: [
        { lockInput: true },
        { setFlag: 'windowsJoined' },
        // the pause before the reveal
        { wait: 900 },
        { fx: { name: 'windowsJoin', ms: 1500 } },
        { fx: { name: 'maraWindow', ms: 3300 } },
        { wait: 300 },
        { showCard: 'A3' },
        { ringBell: true },
        { wait: 900 },
        { returnFrame: 'cityWindow' },
        { sfx: 'settle' },
        { placeActor: { actor: 'mara', tile: 'city', x: 0.6, y: PATH_AT, visible: true, pose: 'walk', facing: 1 } },
        { unlockInput: true },
        { walk: { actor: 'mara', id: 'toHedge', speed: 95, await: false, path: TO_HEDGE } },
      ],
      skip: [
        { setFlag: 'windowsJoined' },
        { ringBell: true },
        { placeActor: { actor: 'mara', tile: 'city', x: 0.6, y: PATH_AT, visible: true, pose: 'walk', facing: 1 } },
        { walk: { actor: 'mara', id: 'toHedge', speed: 95, await: false, path: TO_HEDGE } },
      ],
    },
    {
      id: 'hedge',
      when: { arrived: 'toHedge' },
      hint: { actor: 'mara', tile: 'hawthorn', seams: [LANE_SEAMS[0]], ghost: { drag: [{ tile: 'city', slot: 0 }, { tile: 'hawthorn', slot: 1 }] } },
      do: [
        { actorPose: { actor: 'mara', pose: 'idle' } },
        { sfx: 'settle' },
        // she waits at the hedge; the lens is the way through
        { walk: { actor: 'mara', id: 'lane', speed: 95, await: false, path: THROUGH_HEDGE } },
      ],
      skip: [
        { placeActor: { actor: 'mara', tile: 'hawthorn', x: HEDGE.wait, y: PATH_AT, visible: true, pose: 'idle', facing: 1 } },
        { walk: { actor: 'mara', id: 'lane', speed: 95, await: false, path: THROUGH_HEDGE } },
      ],
    },
    {
      id: 'lane',
      when: { arrived: 'lane' },
      hint: {
        actor: 'mara',
        tile: 'hawthorn',
        seams: [...LANE_SEAMS, STAIR_SEAM],
        ghost: [
          { when: { all: [{ actorAt: { actor: 'mara', tile: 'hawthorn' } }, { not: lensOverHedge }] }, lens: { tile: 'hawthorn', u: HEDGE.lens[0], v: HEDGE.lens[1] } },
          { drag: [{ tile: 'city', slot: 0 }, { tile: 'hawthorn', slot: 1 }, { tile: 'orchard', slot: 2 }] },
          { zoomOut: 'orchard' },
          { drag: { tile: 'platform', slot: 5 } },
        ],
      },
      do: [{ sfx: 'chime' }, { actorPose: { actor: 'mara', pose: 'idle' } }, { wait: 500 }],
      // she waits on the hill: the orchard window is zoomed out to it
      skip: [{ zoomOut: 'orchard' }, { placeActor: { actor: 'mara', tile: 'orchard', state: 'overlook', x: STAIR_AT, y: 0.97, visible: true, pose: 'idle' } }],
    },
    {
      id: 'bridge',
      when: { all: [{ link: { a: 'carriage', b: 'gap', type: 'rail' } }, { link: { a: 'gap', b: 'platform', type: 'rail' } }] },
      hint: {
        tile: 'gap',
        lens: true,
        seams: RAIL_SEAMS,
        ghost: [
          { drag: [{ tile: 'carriage', slot: 3 }, { tile: 'gap', slot: 4 }, { tile: 'platform', slot: 5 }] },
          { lens: { tile: 'gap', u: 0.5, v: RAIL_AT } },
        ],
      },
      do: [
        // hold, whistle, then the crossing through 1978
        { wait: 900 },
        { sfx: 'whistle' },
        { wait: 600 },
        {
          playTrain: {
            id: 'run', speed: 120,
            path: [
              { tile: 'carriage', x: 1, y: TRAIN_Y },
              { tile: 'gap', x: 0, y: TRAIN_Y, via: 'rail' },
              // wait on the near abutment; across only while 1978 holds the span,
              // and if the lens moves, back off the missing span to safety
              { tile: 'gap', x: SAFE_NEAR, y: TRAIN_Y },
              { tile: 'gap', x: SAFE_FAR, y: TRAIN_Y, requires: lensOverGap, retreat: { x: SAFE_NEAR } },
              { tile: 'gap', x: 1, y: TRAIN_Y },
              { tile: 'platform', x: 0, y: TRAIN_Y, via: 'rail' },
              { tile: 'platform', x: 0.06, y: TRAIN_Y },
            ],
          },
        },
      ],
      skip: [{ placeActor: { actor: 'train', tile: 'platform', x: 0.06, y: TRAIN_Y } }],
    },
    {
      id: 'farewell',
      when: { arrived: 'run' },
      do: [
        { lockInput: true },
        { ringBell: true },
        // every link of the night lights again along the line
        { fx: { name: 'memoryLights' } },
        { playTrain: { id: 'dock', speed: 110, await: false, path: [{ tile: 'platform', x: 0.42, y: TRAIN_Y }] } },
        { wait: 3600 },
        // Mara comes down the stair onto the platform and crosses to the other train
        // (placed at the stair head: the player may have moved the hill since)
        { placeActor: { actor: 'mara', tile: 'platform', state: null, x: STAIR_AT, y: 0.03, visible: true, pose: 'walk', facing: 1 } },
        {
          walk: {
            actor: 'mara', id: 'board', speed: 70,
            path: [
              { tile: 'platform', x: 0.6, y: 0.69 + PLATFORM_DY },
              { tile: 'platform', x: 0.71, y: 0.67 + PLATFORM_DY },
            ],
          },
        },
        { actorPose: { actor: 'mara', pose: 'idle', facing: -1 } },
        // she looks back once
        { wait: 1100 },
        { placeActor: { actor: 'mara', visible: false } },
        { sfx: 'whistle' },
        { wait: 500 },
        { walk: { actor: 'farTrain', id: 'away', speed: 70, await: false, path: [{ tile: 'platform', x: 1.5, y: FAR_Y }] } },
        { wait: 3000 },
        { placeActor: { actor: 'butch', tile: 'platform', x: 0.44, y: WALK_Y, visible: true, pose: 'idle', facing: -1, carrying: 'case' } },
        { walkButch: { id: 'bench', speed: 90, path: [{ tile: 'platform', x: 0.24, y: WALK_Y }] } },
        { actorPose: { actor: 'butch', pose: 'idle', carrying: null, facing: 1 } },
        { setFlag: 'caseOnBench' },
        { sfx: 'thud' },
        { wait: 1100 },
        {
          dialogue: [
            { speaker: 'THE CONDUCTOR', text: 'She\'s always one stop ahead.' },
            { speaker: 'THE CONDUCTOR', text: 'The line keeps going.' },
          ],
        },
        { wait: 1200 },
        { fx: { name: 'fadeAll', ms: 2200 } },
        { endChapter: true },
      ],
    },
  ],
});

export default ACT3;
