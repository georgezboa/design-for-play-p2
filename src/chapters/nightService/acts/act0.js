// Act 0 · ONE WINDOW (1×1). Gorogoa's opening: learn zoom with one picture.
//
//   one window: the lost-property office at night, seen through the rain.
//   Butch is asleep at the desk; the desk bell; claim stub 1978-0412.
//
//   0.1 click the desk bell → its polished curve: the Conductor's lantern
//       comes closer in the reflection; strike the plunger (the ring wakes Butch)
//   0.2 zoom out (the ⤢ glyph; the ghost hand shows it): Butch sits up
//   0.3 click the claim stub → 1978-0412; zoom into its punch hole → a
//       porthole; zoom through the glass → the whole carriage outside in the
//       rain: the office is one lit window of it
//   then the view dives back in through that window and the carriage wall
//   slides open a second window beside the first (Act 0.5).

import { CARRIAGE_TILE, defineAct } from '../panelModel.js';
import { FLOOR } from '../art/act1Art.js';
import {
  BELL_HIT, BELL_ZOOM, GLASS_ZOOM, HOLE, HOLE_HIT, HOLE_ZOOM, LIT_WINDOW, SPIKE_HIT, SPIKE_ZOOM, STRIKE_HIT,
  drawBellClose, drawCarriageOutside, drawOfficeInside, drawOfficeOutside, drawPorthole, drawTicketClose,
} from '../art/act0Art.js';
import { ACT0_FX } from '../art/act0Fx.js';

export const BUTCH_DESK = Object.freeze({ x: 0.53, y: FLOOR });

export const ACT0 = defineAct({
  id: 'act0',
  number: 0,
  title: 'ONE WINDOW',
  heading: 'ONE WINDOW',
  checkpoint: 'chapter-1-start',
  next: 'act05',
  grid: { cols: 1, rows: 1, tile: CARRIAGE_TILE },
  slots: ['office'],
  start: { bell: 0, items: [] },
  assets: ['fields'],
  fx: ACT0_FX,
  tiles: {
    office: {
      draggable: false,
      state: 'office',
      states: {
        office: {
          draw: drawOfficeOutside,
          hotspots: [
            {
              id: 'bell', kind: 'zoom', to: 'bell', rect: BELL_HIT, zoomRect: BELL_ZOOM,
              requires: { notFlag: 'rung' },
              // tied to the plunger, hanging up and to the left (clear of the claim spike)
              tag: { x: BELL_HIT[0] + 0.024, y: BELL_HIT[1] + 0.02, angle: -2.5, scale: 1.1 },
            },
            {
              id: 'ticket', kind: 'zoom', to: 'ticket', rect: SPIKE_HIT, zoomRect: SPIKE_ZOOM,
              requires: { flag: 'butchAwake' },
              tag: { x: SPIKE_HIT[0] + 0.04, y: SPIKE_HIT[1] + 0.005, angle: 0.4, scale: 1.1 },
            },
          ],
        },
        bell: {
          draw: drawBellClose,
          // the plunger is the only thing to do in here until the bell has rung
          zoomOutWhen: { flag: 'rung' },
          hotspots: [{
            id: 'strike', kind: 'use', rect: STRIKE_HIT, once: true,
            requires: { notFlag: 'rung' },
            tag: { x: 0.56, y: 0.12, angle: 0.35, scale: 1.5 },
            do: [{ fx: { name: 'bellRing' } }, { sfx: 'deskBell' }, { setFlag: 'rung' }],
          }],
        },
        ticket: {
          draw: drawTicketClose,
          hotspots: [{
            id: 'hole', kind: 'zoom', to: 'porthole', rect: HOLE_HIT, zoomRect: HOLE_ZOOM,
            tag: { x: HOLE.x + 0.035, y: HOLE.y - 0.1, angle: 0.5, scale: 1.4 },
          }],
        },
        porthole: {
          draw: drawPorthole,
          hotspots: [{
            id: 'glass', kind: 'zoom', to: 'carriage', rect: GLASS_ZOOM,
            tag: { x: 0.66, y: 0.14, angle: 0.4, scale: 1.4 },
          }],
        },
        carriage: { draw: drawCarriageOutside, zoomOut: false },
        inside: { draw: drawOfficeInside, zoomOut: false },
      },
    },
  },
  actors: {
    butch: { rig: 'butch', tile: 'office', state: 'office', x: BUTCH_DESK.x, y: BUTCH_DESK.y, pose: 'sleep', facing: -1 },
  },
  steps: [
    {
      id: 'bell',
      when: { state: { tile: 'office', is: 'bell' } },
      hint: { tile: 'office', hotspot: 'bell' },
      do: [{ wait: 300 }],
      skip: [{ zoomTo: { tile: 'office', to: 'bell', rect: BELL_ZOOM } }],
    },
    {
      id: 'ring',
      when: { flag: 'rung' },
      hint: { tile: 'office', hotspot: 'strike' },
      do: [{ wait: 900 }],
      skip: [{ setFlag: 'rung' }],
    },
    {
      id: 'wake',
      when: { all: [{ flag: 'rung' }, { state: { tile: 'office', is: 'office' } }] },
      hint: { tile: 'office', zoomOut: true },
      do: [
        { wait: 380 },
        // the ring has woken him: Butch sits up on his stool
        { actorPose: { actor: 'butch', pose: 'sit', facing: -1 } },
        { sfx: 'stool' },
        { wait: 700 },
        { setFlag: 'butchAwake' },
      ],
      skip: [{ zoomOut: 'office' }, { actorPose: { actor: 'butch', pose: 'sit', facing: -1 } }, { setFlag: 'butchAwake' }],
    },
    {
      id: 'stub',
      when: { state: { tile: 'office', is: 'ticket' } },
      hint: { tile: 'office', hotspot: 'ticket' },
      do: [{ sfx: 'paper' }, { wait: 300 }],
      skip: [{ zoomTo: { tile: 'office', to: 'ticket', rect: SPIKE_ZOOM } }],
    },
    {
      id: 'porthole',
      when: { state: { tile: 'office', is: 'porthole' } },
      hint: { tile: 'office', hotspot: 'hole' },
      do: [{ wait: 200 }],
      skip: [{ zoomTo: { tile: 'office', to: 'porthole', rect: HOLE_ZOOM } }],
    },
    {
      id: 'carriage',
      when: { state: { tile: 'office', is: 'carriage' } },
      hint: { tile: 'office', hotspot: 'glass' },
      do: [
        { lockInput: true },
        // the bigger picture: the office was one window of the night train all along
        { wait: 2600 },
        { fx: { name: 'litWindow' } },
        { wait: 1500 },
        { placeActor: { actor: 'butch', tile: 'office', state: 'inside', x: BUTCH_DESK.x, y: BUTCH_DESK.y, pose: 'sit', facing: -1 } },
        { zoomTo: { tile: 'office', to: 'inside', rect: LIT_WINDOW } },
        { wait: 1100 },
        { checkpoint: 'chapter-1-act-05' },
        { nextAct: 'act05' },
      ],
    },
  ],
});

export default ACT0;
