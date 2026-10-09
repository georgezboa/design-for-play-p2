// Act 0 · ONE WINDOW (1×1). Gorogoa's opening: learn zoom with one picture.
//
//   one window: the lost-property office at night, seen through the rain.
//   Butch is asleep at the desk; the desk bell; claim stub 1978-0412.
//   Round 7: every picture is one of George's painted plates (art/act0Plates.js),
//   and Butch is painted into the office (asleep, then awake).
//
//   0.1 click the desk bell → its polished curve: the Conductor's lantern
//       comes closer in the reflection; strike the plunger (the ring wakes Butch)
//   0.2 zoom out (the ⤢ glyph; the ghost hand shows it): Butch sits up
//   0.3 click the claim stub → 1978-0412; zoom into its punch hole → a
//       porthole; zoom through the glass → the whole carriage outside in the
//       rain: the office is one lit window of it
//   then the view dives back in through that window and the carriage wall
//   slides open a second window beside the first (Act 0.5).

import { BUTCH_PACE, CARRIAGE_TILE, defineAct } from '../panelModel.js';
import { FLOOR } from '../art/act1Art.js';
import {
  drawBellClose, drawCarriageOutside, drawOfficeInside, drawOfficeOutside, drawPorthole, drawTicketClose,
} from '../art/act0Art.js';
import {
  BELL_HIT, BELL_ZOOM, GLASS_HIT, GLASS_ZOOM, HOLE, HOLE_HIT, HOLE_ZOOM, LIT_WINDOW, PLATES0, SPIKE_HIT, SPIKE_ZOOM, STRIKE_HIT,
  drawBellPlate, drawCarriagePlate, drawOfficePlate, drawPortholePlate, drawTicketPlate,
} from '../art/act0Plates.js';
import { ACT0_FX } from '../art/act0Fx.js';

/**
 * Where Butch sits in the office. Round 7: George painted him into the
 * office plates (asleep, then awake), so in Act 0 the rig stays hidden and
 * the painting is the actor; the model still tracks his pose for the script.
 */
export const BUTCH_DESK = Object.freeze({ x: 0.5, y: FLOOR });

export const ACT0 = defineAct({
  id: 'act0',
  number: 0,
  title: 'ONE WINDOW',
  heading: 'ONE WINDOW',
  checkpoint: 'chapter-1-start',
  next: 'act05',
  // painted at the 2×2 window size, shown large: the one window fills the wall
  grid: { cols: 1, rows: 1, tile: CARRIAGE_TILE, display: 1.7 },
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
          // painted (round 7): Butch asleep at the desk; once the bell has woken him, awake
          plate: PLATES0.office,
          plates: [{ when: { flag: 'butchAwake' }, url: PLATES0.awake }],
          draw: (ctx) => (ctx.plate ? drawOfficePlate(ctx, { glass: true }) : drawOfficeOutside(ctx)),
          hotspots: [
            {
              id: 'bell', kind: 'zoom', to: 'bell', rect: BELL_HIT, zoomRect: BELL_ZOOM,
              requires: { notFlag: 'rung' },
              // tied to the bell's knob, hanging up and to the left (clear of the papers on the spike)
              tag: { x: BELL_HIT[0] + 0.012, y: BELL_HIT[1] + 0.028, angle: -2.45, scale: 1.1 },
            },
            {
              id: 'ticket', kind: 'zoom', to: 'ticket', rect: SPIKE_HIT, zoomRect: SPIKE_ZOOM,
              requires: { flag: 'butchAwake' },
              // from the foot of the stub's spike, hanging down over the desk's front
              // (Butch is on its left, the lamp on its right)
              tag: { x: SPIKE_HIT[0] + SPIKE_HIT[2] * 0.45, y: SPIKE_HIT[1] + SPIKE_HIT[3] * 0.92, angle: 1.3, scale: 1.1 },
            },
          ],
        },
        bell: {
          plate: PLATES0.bell,
          draw: (ctx) => (ctx.plate ? drawBellPlate(ctx) : drawBellClose(ctx)),
          // the plunger is the only thing to do in here until the bell has rung
          zoomOutWhen: { flag: 'rung' },
          hotspots: [{
            id: 'strike', kind: 'use', rect: STRIKE_HIT, once: true, verb: 'RING',
            requires: { notFlag: 'rung' },
            tag: { x: STRIKE_HIT[0] + STRIKE_HIT[2] * 0.82, y: 0.07, angle: 0.35, scale: 1.5 },
            do: [{ fx: { name: 'bellRing' } }, { sfx: 'deskBell' }, { setFlag: 'rung' }],
          }],
        },
        ticket: {
          plate: PLATES0.ticket,
          draw: (ctx) => (ctx.plate ? drawTicketPlate(ctx) : drawTicketClose(ctx)),
          hotspots: [{
            id: 'hole', kind: 'zoom', to: 'porthole', rect: HOLE_HIT, zoomRect: HOLE_ZOOM,
            tag: { x: HOLE.x + 0.012, y: HOLE.y + 0.02, angle: 0.55, scale: 1.4 },
          }],
        },
        porthole: {
          plate: PLATES0.porthole,
          draw: (ctx) => (ctx.plate ? drawPortholePlate(ctx) : drawPorthole(ctx)),
          hotspots: [{
            // anywhere on the glass; the zoom flies into the lit train on the viaduct
            id: 'glass', kind: 'zoom', to: 'carriage', rect: GLASS_HIT, zoomRect: GLASS_ZOOM,
            tag: { x: 0.672, y: 0.2, angle: 0.4, scale: 1.4 },
          }],
        },
        carriage: { plate: PLATES0.carriage, draw: (ctx) => (ctx.plate ? drawCarriagePlate(ctx) : drawCarriageOutside(ctx)), zoomOut: false },
        // back in through the lit window: the awake office, without the glass
        inside: { plate: PLATES0.awake, draw: (ctx) => (ctx.plate ? drawOfficePlate(ctx, { glass: false }) : drawOfficeInside(ctx)), zoomOut: false },
      },
    },
  },
  actors: {
    // painted into the office plates: the rig stays hidden (its pose still carries the script)
    butch: { rig: 'butch', pace: BUTCH_PACE, tile: 'office', state: 'office', x: BUTCH_DESK.x, y: BUTCH_DESK.y, pose: 'sleep', facing: -1, visible: false },
  },
  steps: [
    {
      id: 'bell',
      when: { state: { tile: 'office', is: 'bell' } },
      // the very first beat: the bell's tag pulses after 6 s, before the
      // ghost hand's first demonstration at 8 s (alpha R4 · P1)
      hint: { tile: 'office', hotspot: 'bell', pulseAt: 6000 },
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
        // a beat of the office still asleep, then the ring has woken him
        { wait: 650 },
        // Butch sits up on his stool (the office
        // plate cross-fades to the painting of him awake on `butchAwake`)
        { actorPose: { actor: 'butch', pose: 'sit', facing: -1 } },
        { sfx: 'stool' },
        { setFlag: 'butchAwake' },
        { wait: 900 },
        // who he is, in the fiction: the night service's lost-property clerk
        { caption: { speaker: 'THE CONDUCTOR', text: 'Wake up, Lost Property. A claim has come in on the night service.', ms: 6500 } },
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
        { placeActor: { actor: 'butch', tile: 'office', state: 'inside', x: BUTCH_DESK.x, y: BUTCH_DESK.y, pose: 'sit', facing: -1, visible: false } },
        { zoomTo: { tile: 'office', to: 'inside', rect: LIT_WINDOW } },
        { wait: 1100 },
        { checkpoint: 'chapter-1-act-05' },
        { nextAct: 'act05' },
      ],
    },
  ],
});

export default ACT0;
