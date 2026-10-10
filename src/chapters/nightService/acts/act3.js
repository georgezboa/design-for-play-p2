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
//   4 the farewell: ours docks at Bellwether and Mara comes down the stair; the
//     camera moves into the platform close-up (A3-platform-close), where
//     Butch steps down and leaves the case on the bench, Mara looks back once
//     and boards the other train through its lit door, and it pulls away; the
//     Conductor's last line; chapter-2-start and the 1-2 film

import { BUTCH_PACE, defineAct } from '../panelModel.js';
import {
  CITY_WINDOW, CLOSE, CLOSE_ZOOM, GAP_SPAN, HEDGE, OVERLOOK_HOUSE, PATH_AT, PLATE, RAIL_AT, STAIR_AT, drawCarriageScene,
  drawCityFrame, drawCityRoom, drawCityRoomPast, drawGap, drawGapPast, drawHawthorn, drawHawthornPast, drawHouse, drawOverlook,
  drawPlatform, drawPlatformClose, drawPlatformPast,
} from '../art/act3Art.js';
import { GEO3 } from '../art/act3Plates.js';
import { ACT3_FX } from '../art/act3Fx.js';

const lensOverGap = { lensOver: { tile: 'gap', x: 0.5, y: RAIL_AT } };
/** The lit window of the orchard house (A3-orchard), where the flight from Act 2 lands. */
const ORCHARD_LIT = GEO3.orchard.litCentre;
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
/** The stair on the hill (A3-overlook): its head at the lane's end, its foot at the bottom edge. */
const STAIR_HEAD = GEO3.overlook.stairHead;
/** Through the hedge (1978 only), to the hill and the stair above the platform. */
const THROUGH_HEDGE = [
  { tile: 'hawthorn', x: 1, y: PATH_AT, requires: lensOverHedge, retreat: { x: HEDGE.wait } },
  { tile: 'orchard', x: 0, y: PATH_AT, via: 'path', state: 'overlook' },
  { tile: 'orchard', x: STAIR_HEAD[0] - 0.04, y: PATH_AT },
  // down the painted stair, once it meets the platform's below
  { tile: 'orchard', x: STAIR_HEAD[0], y: STAIR_HEAD[1], requires: { link: { a: 'orchard', b: 'platform', type: 'stair' } } },
  { tile: 'orchard', x: STAIR_AT, y: 0.97 },
];
const TRAIN_Y = RAIL_AT - 0.004;
/**
 * Our train at the painted viaduct's scale: a 20 m carriage beside its 15 m
 * arches (the rig is 150 tile px long at scale 1; C-train's proportions).
 * It stays well larger than the far train, so the finale reads at a glance
 * (alpha R3 · R5).
 */
export const TRAIN_SCALE = Math.round((GEO3.gap.trainTilePx / 150) * 100) / 100;
/** The other train (it waits behind the platform: painted in the close-up, so unseen on the wide tile). */
export const FAR_TRAIN_SCALE = Math.round(TRAIN_SCALE * 0.55 * 100) / 100;
/**
 * People at the scale of the painted places (rig heights: Mara 66, Butch 70
 * tile px). On the bottom row they stand beside the train; each top-row
 * state scales them to its own painting (actorScale × PEOPLE_SCALE).
 */
export const PEOPLE_SCALE = 0.3;
const MARA_RIG = 66;
const maraIn = (tilePx) => Math.round((tilePx / MARA_RIG / PEOPLE_SCALE) * 100) / 100;
/** Mara in the city room (in front of the desk), on the lane (the hedge beside her), on the hill. */
export const MARA_CITY = maraIn(GEO3.city.maraTilePx);
export const MARA_LANE = maraIn(GEO3.hawthorn.maraTilePx);
export const MARA_HILL = maraIn(GEO3.overlook.maraTilePx);
/** Its length on a tile (the rig is 150 tile px at scale 1; tiles are 536 wide on the 3×2 wall). */
export const TRAIN_LENGTH = (150 * TRAIN_SCALE) / 536;
// the present viaduct is missing over GAP_SPAN (rails end 0.02 short of each
// side): where the train waits, its whole length stays on good track
export const SAFE_NEAR = Math.floor((GAP_SPAN[0] - 0.02 - TRAIN_LENGTH / 2) * 100) / 100;
export const SAFE_FAR = Math.ceil((GAP_SPAN[1] + 0.02 + TRAIN_LENGTH / 2) * 100) / 100;
/** The far track (the other train, unseen on the wide tile). */
const FAR_Y = GEO3.platform.back;
/** Our train docks clear of the bench, its nose short of the buffer stop. */
export const DOCK_X = Math.round((GEO3.platform.buffer[0] - TRAIN_LENGTH / 2 - 0.02) * 100) / 100;
/** Mara down the platform's stair, onto its far side. */
const STAIR_FOOT = GEO3.platform.stairFoot;

/**
 * The farewell's close-up (A3-platform-close): Butch at 45% of the tile's
 * height by the bench, the size the painted bench gives a 1.75 m man; Mara at
 * the other train's door, beside the painted doorway (the same scale, further
 * off), as a figure of her own (maraClose) so each keeps its painted size.
 */
export const CLOSE_SCALE = Math.round((CLOSE.butchTilePx / (70 * PEOPLE_SCALE)) * 100) / 100;
export const MARA_CLOSE_SCALE = Math.round((CLOSE.maraTilePx / (MARA_RIG * CLOSE_SCALE)) * 1000) / 1000;
/** Where Butch stands to leave the case: just right of the bench's end, facing it. */
export const BENCH_STAND = Math.round((CLOSE.case[0] + CLOSE.case[2] + 0.06) * 1000) / 1000;
const CLOSE_FLOOR = CLOSE.floor;
const [DOOR_FOOT, ...DOOR_TREADS] = CLOSE.steps;

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
  // round 11: from Act 2's last frame (no black between them): the orchard
  // case dissolves into the orchard house it came from, its lit window, and
  // the camera pulls back as that window glides home (PanelScene flightIn)
  enter: { act2: { tile: 'orchard', rect: [ORCHARD_LIT[0] - 0.275, ORCHARD_LIT[1] - 0.26, 0.55, 0.55], ms: 2600 } },
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
        plate: PLATE['city-window'],
        draw: drawCityFrame,
        grip: { rect: [CITY_WINDOW[0] - 0.02, CITY_WINDOW[1] - 0.02, CITY_WINDOW[2] + 0.04, CITY_WINDOW[3] + 0.05] },
        // HOLD · LIFT THE FRAME (if no frame was lifted in Act 2), under the sill
        tag: { u: GEO3.city.sill[0] - 0.06, v: GEO3.city.sill[1] + 0.03 },
        requires: { notFlag: 'windowsJoined' },
      },
      states: {
        default: {
          plate: PLATE.city,
          platePast: PLATE['city-1978'],
          draw: drawCityRoom,
          drawPast: drawCityRoomPast,
          actorScale: MARA_CITY,
          edges: { right: [{ type: 'path', at: PATH_AT }] },
        },
      },
    },
    hawthorn: {
      states: {
        default: {
          plate: PLATE.hawthorn,
          platePast: PLATE['hawthorn-1978'],
          draw: drawHawthorn,
          drawPast: drawHawthornPast,
          actorScale: MARA_LANE,
          edges: {
            left: [{ type: 'path', at: PATH_AT }],
            // today the lane is washed out at the edge; in 1978 it ran on whole
            right: [{ type: 'path', at: PATH_AT, era: 'past', lensAt: [...HEDGE.lens] }],
          },
        },
      },
    },
    orchard: {
      state: 'house',
      zoomStack: [{ state: 'overlook', rect: OVERLOOK_HOUSE }],
      states: {
        house: { plate: PLATE.orchard, draw: drawHouse },
        overlook: {
          plate: PLATE.overlook,
          draw: drawOverlook,
          actorScale: MARA_HILL,
          edges: { left: [{ type: 'path', at: PATH_AT }], bottom: [{ type: 'stair', at: STAIR_AT }] },
          hotspots: [{
            // only while the city window still has to meet the house: once
            // they have, the hill is where Mara is going, and a tag inviting
            // the player back in would undo the zoom-out (alpha R4 · P2)
            id: 'house', kind: 'zoom', to: 'house', rect: OVERLOOK_HOUSE,
            requires: { notFlag: 'windowsJoined' },
            tag: { x: OVERLOOK_HOUSE[0] + OVERLOOK_HOUSE[2] * 0.9, y: OVERLOOK_HOUSE[1] + OVERLOOK_HOUSE[3] * 0.3, angle: 0.4 },
          }],
        },
      },
    },
    carriage: {
      states: { default: { plate: PLATE.carriage, draw: drawCarriageScene, edges: { right: [{ type: 'rail', at: RAIL_AT }] } } },
    },
    gap: {
      states: {
        default: {
          plate: PLATE.gap,
          platePast: PLATE['gap-1978'],
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
          plate: PLATE.platform,
          platePast: PLATE['platform-1978'],
          draw: drawPlatform,
          drawPast: drawPlatformPast,
          edges: { left: [{ type: 'rail', at: RAIL_AT }], top: [{ type: 'stair', at: STAIR_AT, silent: true }] },
        },
        // the farewell plays here, close (the finale zooms in; no way back out)
        close: { plate: PLATE['platform-close'], draw: drawPlatformClose, actorScale: CLOSE_SCALE, zoomOut: false },
      },
    },
  },
  // the painted pieces the farewell's effects draw (preloaded with the plates)
  props: [PLATE['close-case']],
  actors: {
    // first: she stands at the far side, so Butch passes in front of her
    maraClose: { rig: 'mara', tile: 'platform', state: 'close', x: CLOSE.stepsX, y: DOOR_FOOT, visible: false, facing: 1, scale: MARA_CLOSE_SCALE },
    butch: { rig: 'butch', pace: BUTCH_PACE, tile: 'carriage', x: 0.35, y: RAIL_AT, visible: false, scale: PEOPLE_SCALE },
    train: { rig: 'train', tile: 'carriage', x: 0.36, y: TRAIN_Y, facing: 1, scale: TRAIN_SCALE },
    mara: { rig: 'mara', tile: 'city', x: 0.62, y: PATH_AT, visible: false, facing: 1, scale: PEOPLE_SCALE },
    // the other train is painted into the close-up (it waits behind the
    // platform, where the wide painting has its back wall): this actor only
    // keeps the beat of its leaving, out of sight
    farTrain: { rig: 'train', tile: 'platform', state: 'default', x: 0.74, y: FAR_Y, facing: 1, scale: FAR_TRAIN_SCALE, tint: 0x9a9aae, visible: false },
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
        // the orchard's ⤢ glyph breathes while it still shows the house: the
        // lane goes on over the hill, one step back out (alpha R4 · P2)
        zoomOutCue: { state: { tile: 'orchard', is: 'house' } },
        zoomOutTile: 'orchard',
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
              { tile: 'platform', x: 0, y: TRAIN_Y, via: 'rail', state: 'default' },
              { tile: 'platform', x: 0.06, y: TRAIN_Y },
            ],
          },
        },
      ],
      skip: [{ placeActor: { actor: 'train', tile: 'platform', state: 'default', x: 0.06, y: TRAIN_Y } }],
    },
    {
      id: 'farewell',
      when: { arrived: 'run' },
      do: [
        { lockInput: true },
        { ringBell: true },
        // every link of the night lights again along the line
        { fx: { name: 'memoryLights' } },
        { playTrain: { id: 'dock', speed: 110, await: false, path: [{ tile: 'platform', x: DOCK_X, y: TRAIN_Y }] } },
        { wait: 1400 },
        // Mara comes down the stair from the hill onto the platform's far side
        // (placed at the stair head: the player may have moved the hill since)
        { placeActor: { actor: 'mara', tile: 'platform', state: 'default', x: STAIR_AT, y: 0.01, visible: true, pose: 'walk', facing: 1 } },
        {
          walk: {
            actor: 'mara', id: 'down', speed: 46,
            path: [
              { tile: 'platform', x: STAIR_FOOT[0], y: STAIR_FOOT[1] },
              { tile: 'platform', x: STAIR_FOOT[0] - 0.01, y: FAR_Y + 0.008 },
            ],
          },
        },
        { actorPose: { actor: 'mara', pose: 'idle', facing: -1 } },
        { wait: 700 },
        // the camera moves into the painting: the platform close-up, where the
        // rest of the farewell plays large (the wide tile's figures go with
        // the picture they stood in)
        { fx: { name: 'holdActors', tile: 'platform', actors: ['train', 'mara'], over: 2600 } },
        { placeActor: { actor: 'mara', visible: false } },
        { placeActor: { actor: 'maraClose', tile: 'platform', state: 'close', x: CLOSE.stepsX - 0.004, y: DOOR_FOOT, visible: true, pose: 'back', facing: 1 } },
        { zoomTo: { tile: 'platform', to: 'close', rect: CLOSE_ZOOM, ms: 2600 } },
        { wait: 3000 },
        // Butch steps down from our train with the orchard case and carries it to the bench
        { placeActor: { actor: 'butch', tile: 'platform', state: 'close', x: 1.07, y: CLOSE_FLOOR - 0.035, visible: true, pose: 'walk', facing: -1, carrying: 'case' } },
        {
          walkButch: {
            id: 'bench', speed: 80,
            path: [
              { tile: 'platform', x: 0.93, y: CLOSE_FLOOR },
              { tile: 'platform', x: BENCH_STAND, y: CLOSE_FLOOR },
            ],
          },
        },
        { actorPose: { actor: 'butch', pose: 'idle', facing: -1 } },
        { wait: 500 },
        // he sets it down and leaves it there
        { actorPose: { actor: 'butch', carrying: null } },
        { fx: { name: 'leaveCase' } },
        { wait: 560 },
        { setFlag: 'caseOnBench' },
        { sfx: 'thud' },
        { wait: 1100 },
        // she looks back once, and boards the other train through its lit door
        { actorPose: { actor: 'maraClose', pose: 'idle', facing: -1 } },
        { wait: 1500 },
        { actorPose: { actor: 'maraClose', pose: 'back', facing: 1 } },
        { wait: 450 },
        { placeActor: { actor: 'maraClose', y: DOOR_TREADS[0], pose: 'back' } },
        { wait: 300 },
        { placeActor: { actor: 'maraClose', y: DOOR_TREADS[1], pose: 'back' } },
        { wait: 300 },
        { placeActor: { actor: 'maraClose', y: DOOR_TREADS[2], pose: 'back' } },
        { wait: 300 },
        { placeActor: { actor: 'maraClose', y: DOOR_TREADS[3], pose: 'back' } },
        { fx: { name: 'boardTrain', actor: 'maraClose', over: 650 } },
        { wait: 700 },
        { placeActor: { actor: 'maraClose', visible: false } },
        { setFlag: 'maraAboard' },
        { sfx: 'door' },
        { wait: 900 },
        { sfx: 'whistle' },
        { wait: 500 },
        // and her train pulls away
        { walk: { actor: 'farTrain', id: 'away', speed: 70, await: false, path: [{ tile: 'platform', x: 1.5, y: FAR_Y }] } },
        { wait: 1800 },
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
