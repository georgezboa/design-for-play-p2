// Act 3 · TWO TRUE THINGS (3×2). Everything combined: the lens as a bridge,
// the bell finale. Spec §6 Act 3.
//
//   top:    city room · hawthorn · orchard house   (lane at 0.62)
//   bottom: carriage  · gap      · platform        (rail at 0.85)
//
//   1 lift the city window onto the orchard house (close): two windows become
//     one; Mara appears in it, turns and leaves. Card A3, the red pencil. Bell #4
//   2 order the top row city → hawthorn → orchard, and zoom the orchard out to
//     the hill: Mara walks the lane to the stair above the platform
//   3 order the bottom row carriage → gap → platform and hold the lens on the
//     broken viaduct: in 1978 it is whole; the train crosses. Bell #5
//   4 Mara boards the other train as ours arrives; the case on the bench;
//     the Conductor's last line; chapter-2-start and the 1-2 film

import { defineAct } from '../panelModel.js';
import {
  OVERLOOK_HOUSE, PATH_AT, RAIL_AT, STAIR_AT, drawCarriageScene, drawCityFrame, drawCityRoom,
  drawCityRoomPast, drawGap, drawGapPast, drawHawthorn, drawHouse, drawOverlook, drawPlatform,
  drawPlatformPast,
} from '../art/act3Art.js';
import { ACT3_FX } from '../art/act3Fx.js';

const lensOverGap = { lensOver: { tile: 'gap', x: 0.5, y: RAIL_AT } };
const TRAIN_Y = RAIL_AT - 0.004;
// the present viaduct is missing between ~0.35 and ~0.65; the train is ~0.26 wide
const SAFE_NEAR = 0.2;
const SAFE_FAR = 0.8;

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
  assets: ['fields', 'memory', 'city'],
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
      frame: { id: 'cityWindow', draw: drawCityFrame },
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
          edges: { left: [{ type: 'path', at: PATH_AT }], right: [{ type: 'path', at: PATH_AT }] },
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
    butch: { rig: 'butch', tile: 'carriage', x: 0.35, y: RAIL_AT, visible: false },
    train: { rig: 'train', tile: 'carriage', x: 0.36, y: TRAIN_Y, facing: 1 },
    mara: { rig: 'mara', tile: 'city', x: 0.62, y: PATH_AT, visible: false, facing: 1 },
    farTrain: { rig: 'train', tile: 'platform', x: 0.74, y: 0.665, facing: 1, scale: 0.72, tint: 0x9a9aae },
  },
  steps: [
    {
      id: 'windows',
      when: { overlay: { frame: 'cityWindow', onto: 'orchard', ontoState: 'house' } },
      hint: { tile: 'city', frame: true },
      do: [
        { lockInput: true },
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
        {
          walk: {
            actor: 'mara', id: 'lane', speed: 95, await: false,
            path: [
              { tile: 'city', x: 1, y: PATH_AT },
              { tile: 'hawthorn', x: 0, y: PATH_AT, via: 'path' },
              { tile: 'hawthorn', x: 1, y: PATH_AT },
              { tile: 'orchard', x: 0, y: PATH_AT, via: 'path', state: 'overlook' },
              { tile: 'orchard', x: 0.44, y: PATH_AT },
              { tile: 'orchard', x: 0.5, y: 0.68, requires: { link: { a: 'orchard', b: 'platform', type: 'stair' } } },
              { tile: 'orchard', x: STAIR_AT, y: 0.97 },
            ],
          },
        },
      ],
      skip: [
        { ringBell: true },
        { placeActor: { actor: 'mara', tile: 'city', x: 0.6, y: PATH_AT, visible: true, pose: 'walk', facing: 1 } },
        {
          walk: {
            actor: 'mara', id: 'lane', speed: 95, await: false,
            path: [
              { tile: 'city', x: 1, y: PATH_AT },
              { tile: 'hawthorn', x: 0, y: PATH_AT, via: 'path' },
              { tile: 'hawthorn', x: 1, y: PATH_AT },
              { tile: 'orchard', x: 0, y: PATH_AT, via: 'path', state: 'overlook' },
              { tile: 'orchard', x: 0.44, y: PATH_AT },
              { tile: 'orchard', x: 0.5, y: 0.68, requires: { link: { a: 'orchard', b: 'platform', type: 'stair' } } },
              { tile: 'orchard', x: STAIR_AT, y: 0.97 },
            ],
          },
        },
      ],
    },
    {
      id: 'lane',
      when: { arrived: 'lane' },
      hint: { actor: 'mara', tile: 'orchard' },
      do: [{ sfx: 'chime' }, { actorPose: { actor: 'mara', pose: 'idle' } }, { wait: 500 }],
      skip: [{ placeActor: { actor: 'mara', tile: 'orchard', state: 'overlook', x: STAIR_AT, y: 0.97, visible: true, pose: 'idle' } }],
    },
    {
      id: 'bridge',
      when: { all: [{ link: { a: 'carriage', b: 'gap', type: 'rail' } }, { link: { a: 'gap', b: 'platform', type: 'rail' } }] },
      hint: { tile: 'gap', lens: true },
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
              { tile: 'platform', x: 0.6, y: 0.69 },
              { tile: 'platform', x: 0.71, y: 0.67 },
            ],
          },
        },
        { actorPose: { actor: 'mara', pose: 'idle', facing: -1 } },
        // she looks back once
        { wait: 1100 },
        { placeActor: { actor: 'mara', visible: false } },
        { sfx: 'whistle' },
        { wait: 500 },
        { walk: { actor: 'farTrain', id: 'away', speed: 70, await: false, path: [{ tile: 'platform', x: 1.5, y: 0.665 }] } },
        { wait: 3000 },
        { placeActor: { actor: 'butch', tile: 'platform', x: 0.44, y: 0.8, visible: true, pose: 'idle', facing: -1, carrying: 'case' } },
        { walkButch: { id: 'bench', speed: 90, path: [{ tile: 'platform', x: 0.24, y: 0.8 }] } },
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
