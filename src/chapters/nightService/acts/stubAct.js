// Placeholder acts so the chapter runs end to end while Acts 2 and 3 are
// being built on this engine. Each stub is a real (tiny) act: the panels show
// a construction card, and one tagged ticket moves the journey on. A dev-only
// key (N, see PanelScene) also skips any act.

import { defineAct } from '../panelModel.js';
import { PAL, ink, inkRect, paperGrain, vignette, vgrad, wood } from '../art/ink.js';

function drawPlaceholder(label, sub) {
  return (ctx) => {
    const { w, h } = ctx;
    ctx.fields(0, 0, w, h * 0.72, { speed: 14, offset: label.length * 300 });
    ctx.paint(`stub-${label}-${sub}`, (c, env) => {
      c.fillStyle = vgrad(c, 0, h, [[0, 'rgba(10,14,24,0.1)'], [0.7, 'rgba(10,14,24,0.3)'], [0.72, '#2a1a10'], [1, '#150d08']]);
      c.fillRect(-20, -20, w + 40, h + 40);
      wood(c, -20, h * 0.72, w + 40, h * 0.3, { base: '#2a1a10', seed: label.length });
      ink(c, [[-4, h * 0.72], [w + 4, h * 0.72]], { w: 2.6 });
      // construction card pinned to the glass
      const cw = w * 0.54;
      const ch = h * 0.34;
      const cx = (w - cw) / 2;
      const cy = h * 0.18;
      c.save();
      c.shadowColor = 'rgba(0,0,0,0.5)'; c.shadowBlur = 18; c.shadowOffsetY = 6;
      c.fillStyle = PAL.paper;
      c.fillRect(cx, cy, cw, ch);
      c.restore();
      inkRect(c, cx, cy, cw, ch, { w: 2, color: '#5a4630' });
      c.fillStyle = '#3a2a1c';
      c.textAlign = 'center';
      let size = 30;
      c.font = `700 ${size}px Georgia, "Times New Roman", serif`;
      while (c.measureText(label).width > cw - 48 && size > 14) {
        size -= 1;
        c.font = `700 ${size}px Georgia, "Times New Roman", serif`;
      }
      c.fillText(label, w / 2, cy + ch * 0.42);
      c.font = '400 22px "Space Mono", monospace';
      c.fillStyle = '#6b2a22';
      c.fillText(sub, w / 2, cy + ch * 0.72);
      paperGrain(c, w, h, env.paper, 0.18);
      vignette(c, w, h, 0.5);
    });
  };
}

function drawQuiet(index) {
  return (ctx) => drawQuietView(ctx, index);
}

function drawQuietView(ctx, index) {
  const { w, h } = ctx;
  ctx.fields(0, 0, w, h * 0.72, { speed: 14, offset: 700 + index * 900 });
  ctx.paint(`stub-quiet-${Math.round(w)}`, (c, env) => {
    c.fillStyle = vgrad(c, h * 0.72, h, [[0, '#2a1a10'], [1, '#150d08']]);
    c.fillRect(-20, h * 0.72, w + 40, h * 0.3 + 20);
    ink(c, [[-4, h * 0.72], [w + 4, h * 0.72]], { w: 2.6 });
    paperGrain(c, w, h, env.paper, 0.18);
    vignette(c, w, h, 0.55);
  });
}

/**
 * @param {object} o
 * @param {string} o.id           act id ('act2')
 * @param {number} o.number       2 | 3
 * @param {string} o.title        act title
 * @param {{cols:number, rows:number}} o.grid
 * @param {object} o.start        carried chapter state for a fresh start here
 * @param {object[]} o.finish     effects run when the ticket is used
 */
export function makeStubAct({ id, number, title, grid, start, finish, checkpoint }) {
  const count = grid.cols * grid.rows;
  const tiles = {};
  const slots = [];
  for (let i = 0; i < count; i += 1) {
    const tileId = `${id}-${i}`;
    slots.push(tileId);
    tiles[tileId] = {
      draggable: i !== 0,
      states: {
        default: i === 0
          ? {
            draw: drawPlaceholder(`ACT ${number} · ${title}`, 'in construction'),
            hotspots: [{ id: 'continue', kind: 'use', rect: [0.4, 0.58, 0.2, 0.14], tag: { x: 0.49, y: 0.64, angle: -0.2, scale: 1.6 }, do: finish }],
          }
          : { draw: drawQuiet(i) },
      },
    };
  }
  return defineAct({
    id,
    number,
    title,
    stub: true,
    checkpoint,
    grid,
    slots,
    start,
    assets: ['fields'],
    tiles,
    actors: {},
    steps: [],
  });
}

export const ACT2_STUB = makeStubAct({
  id: 'act2',
  number: 2,
  title: 'THE LUGGAGE CAR',
  checkpoint: 'chapter-1-act-2',
  grid: { cols: 2, rows: 2 },
  start: { bell: 1, items: ['punch'] },
  finish: [
    { lockInput: true },
    { sfx: 'clack' },
    { ringBell: true },
    { wait: 900 },
    { fx: { name: 'fadeAll', ms: 1500 } },
    { checkpoint: 'chapter-1-act-3' },
    { nextAct: 'act3' },
  ],
});

export const ACT3_STUB = makeStubAct({
  id: 'act3',
  number: 3,
  title: 'TWO TRUE THINGS',
  checkpoint: 'chapter-1-act-3',
  grid: { cols: 3, rows: 2 },
  start: { bell: 3, items: ['punch', 'lens'] },
  finish: [
    { lockInput: true },
    { sfx: 'clack' },
    { ringBell: true },
    { wait: 1400 },
    { fx: { name: 'fadeAll', ms: 1500 } },
    { endChapter: true },
  ],
});
