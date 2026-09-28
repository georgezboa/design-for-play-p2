// DEV-ONLY engine lab (`night-service.html?act=lab`): a 3×2 act that uses
// every Act 2–3 feature so the renderer can be checked before those acts
// exist — a liftable window frame and overlay, the punch-hole lens with a
// 1978 layer and past-era rail edges, the train actor, and the bell. It is
// also a compact example of the act format (see README.md).

import { defineAct } from '../panelModel.js';
import { PAL, brassFill, ink, inkRect, rivet, roundRectPath, vgrad, wood, paperGrain, vignette } from '../art/ink.js';
import { sepiaWash } from '../art/act1Art.js';

const RAIL = 0.85;

function landscape(world, { speed = 0, crop = 0.55, offset = 0 } = {}) {
  return (ctx) => {
    ctx.fields(0, 0, ctx.w, ctx.h * 0.8, { world, speed, crop, offset, zoom: 1.2 });
    ctx.paint(`lab-ground-${world}-${ctx.era}`, (c, env) => {
      c.fillStyle = vgrad(c, ctx.h * 0.8, ctx.h, [[0, '#2a1d14'], [1, '#120c08']]);
      c.fillRect(-20, ctx.h * 0.8, ctx.w + 40, ctx.h * 0.2 + 20);
      ink(c, [[-4, ctx.h * 0.8], [ctx.w + 4, ctx.h * 0.8]], { w: 2.4 });
      paperGrain(c, ctx.w, ctx.h, env.paper, 0.16);
      vignette(c, ctx.w, ctx.h, 0.45);
      if (env.era === 'past') sepiaWash(c, ctx.w, ctx.h);
    });
  };
}

function rails(c, w, h, from, to) {
  const y = RAIL * h;
  wood(c, from, y + 6, to - from, 10, { base: '#3a2517', seed: 5 });
  for (let x = from + 6; x < to; x += 22) { c.fillStyle = '#2a1a10'; c.fillRect(x, y + 2, 10, 16); }
  c.fillStyle = brassFill(c, from, y - 2, to - from, 5);
  c.fillRect(from, y - 2, to - from, 4);
  ink(c, [[from, y - 2], [to, y - 2]], { w: 2.2 });
}

function trackScene({ left = true, right = true, broken = false }) {
  return (ctx) => {
    const { w, h } = ctx;
    ctx.fields(0, 0, w, h * 0.7, { world: 'fields', speed: 14, crop: 0.5, offset: 400 });
    ctx.paint(`lab-track-${left}-${right}-${broken}-${ctx.era}`, (c, env) => {
      c.fillStyle = vgrad(c, h * 0.7, h, [[0, '#1d2a30'], [1, '#0b1216']]);
      c.fillRect(-20, h * 0.7, w + 40, h * 0.3 + 20);
      const past = env.era === 'past';
      if (broken && !past) {
        // the viaduct with its middle fallen away
        rails(c, w, h, -20, w * 0.36);
        rails(c, w, h, w * 0.64, w + 20);
        c.fillStyle = '#0a0f12';
        c.fillRect(w * 0.36, RAIL * h - 6, w * 0.28, h);
        ink(c, [[w * 0.36, RAIL * h - 2], [w * 0.38, RAIL * h + 18], [w * 0.35, h]], { w: 2 });
        ink(c, [[w * 0.64, RAIL * h - 2], [w * 0.62, RAIL * h + 16], [w * 0.65, h]], { w: 2 });
      } else {
        rails(c, w, h, left ? -20 : w * 0.2, right ? w + 20 : w * 0.8);
      }
      // arches under the line
      for (let x = w * 0.08; x < w; x += w * 0.28) {
        if (broken && !past && x > w * 0.3 && x < w * 0.66) continue;
        c.fillStyle = '#26323a';
        c.beginPath(); c.moveTo(x, h); c.lineTo(x, RAIL * h + 16); c.lineTo(x + w * 0.2, RAIL * h + 16); c.lineTo(x + w * 0.2, h); c.arc(x + w * 0.1, h, w * 0.07, 0, Math.PI, true); c.closePath(); c.fill();
        ink(c, [[x, h], [x, RAIL * h + 16], [x + w * 0.2, RAIL * h + 16], [x + w * 0.2, h]], { w: 1.4, alpha: 0.6 });
      }
      paperGrain(c, w, h, env.paper, 0.16);
      vignette(c, w, h, 0.5);
      if (past) sepiaWash(c, w, h);
    });
  };
}

function drawWindowFrame(ctx) {
  const { w, h } = ctx;
  ctx.paint('lab-frame', (c) => {
    c.save();
    c.lineWidth = 22;
    c.strokeStyle = brassFill(c, 0, 0, w, h);
    roundRectPath(c, 26, 22, w - 52, h - 44, 30);
    c.stroke();
    c.lineWidth = 2;
    c.strokeStyle = PAL.ink;
    roundRectPath(c, 14, 10, w - 28, h - 20, 38);
    c.stroke();
    roundRectPath(c, 38, 34, w - 76, h - 68, 22);
    c.stroke();
    c.restore();
    for (let i = 0; i <= 8; i += 1) { rivet(c, 26 + ((w - 52) * i) / 8, 22, 3); rivet(c, 26 + ((w - 52) * i) / 8, h - 22, 3); }
  }, { bleed: 0 });
}

const lensAt = [0.5, RAIL];

export const LAB_ACT = defineAct({
  id: 'lab',
  number: 0,
  title: 'ENGINE LAB',
  dev: true,
  grid: { cols: 3, rows: 2 },
  slots: ['yard', 'house', 'city', 'depot', 'viaduct', 'platform'],
  start: { bell: 1, items: ['punch', 'lens'], lens: { x: 960, y: 300 } },
  assets: ['fields', 'memory', 'city'],
  tiles: {
    yard: {
      frame: { id: 'yardFrame', draw: drawWindowFrame, edges: { right: [{ type: 'glow', at: 0.5 }] } },
      states: { default: { draw: landscape('fields', { speed: 20 }) } },
    },
    house: {
      states: {
        default: {
          draw: landscape('memory', { crop: 0.45 }),
          drawPast: landscape('memory', { crop: 0.45, offset: 60 }),
          hotspots: [{ id: 'window', kind: 'use', era: 'past', rect: [0.35, 0.3, 0.3, 0.3], tag: { x: 0.52, y: 0.42, angle: 0.3 }, do: [{ setFlag: 'sawWindow' }, { sfx: 'glint' }] }],
          edges: { left: [{ type: 'glow', at: 0.5, when: { overlay: { frame: 'yardFrame', onto: 'house' } } }] },
        },
      },
    },
    city: { states: { default: { draw: landscape('city', { crop: 0.5 }) } } },
    depot: { states: { default: { draw: trackScene({ left: false }), edges: { right: [{ type: 'rail', at: RAIL }] } } } },
    viaduct: {
      states: {
        default: {
          draw: trackScene({ broken: true }),
          drawPast: trackScene({}),
          edges: {
            left: [{ type: 'rail', at: RAIL, era: 'past', lensAt }],
            right: [{ type: 'rail', at: RAIL, era: 'past', lensAt }],
          },
        },
      },
    },
    platform: { states: { default: { draw: trackScene({ right: false }), edges: { left: [{ type: 'rail', at: RAIL }] } } } },
  },
  actors: {
    train: { rig: 'train', tile: 'depot', x: 0.3, y: RAIL - 0.005, facing: 1 },
  },
  steps: [
    {
      id: 'overlay',
      when: { overlay: { frame: 'yardFrame', onto: 'house' } },
      hint: { tile: 'yard' },
      do: [{ ringBell: true }, { caption: { text: 'Overlay composite matched.', ms: 2400 } }],
    },
    {
      id: 'bridge',
      when: { all: [{ link: { a: 'depot', b: 'viaduct', type: 'rail' } }, { link: { a: 'viaduct', b: 'platform', type: 'rail' } }] },
      hint: { tile: 'viaduct' },
      do: [
        {
          playTrain: {
            id: 'run',
            path: [
              { tile: 'depot', x: 1, y: RAIL - 0.005 },
              { tile: 'viaduct', x: 0, y: RAIL - 0.005, via: 'rail' },
              { tile: 'viaduct', x: 0.5, y: RAIL - 0.005, requires: { lensOver: { tile: 'viaduct', x: 0.5, y: RAIL } } },
              { tile: 'viaduct', x: 1, y: RAIL - 0.005, requires: { lensOver: { tile: 'viaduct', x: 0.5, y: RAIL } } },
              { tile: 'platform', x: 0, y: RAIL - 0.005, via: 'rail' },
              { tile: 'platform', x: 0.5, y: RAIL - 0.005 },
            ],
          },
        },
        { ringBell: true },
        { caption: { text: 'The train crossed through 1978.', ms: 3000 } },
      ],
    },
  ],
});
