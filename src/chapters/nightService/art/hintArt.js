// The ghost hand (tier-2 hints) and the sliding wall panels (grid growth).
//
// The hand is a paper glove in the chapter's ink style: ivory card with a
// hand-jittered warm outline, a brass cuff button, pointing with the index
// finger. It is drawn translucent over the windows, never over captions.

import { PAL, brassFill, ink, inkEllipse, rivet, roundRectPath, speckle, wood } from './ink.js';

/** Canvas size of the hand (at 1×) and where its fingertip is (the gesture point). */
export const GHOST_HAND = Object.freeze({ w: 92, h: 128, tip: [30, 6] });

export function paintGhostHand(c, paper = null) {
  const outline = [
    // index finger up and a little left, fingertip at GHOST_HAND.tip
    [25, 12], [28, 5], [34, 5], [37, 12], [38, 44],
    // knuckles of the curled fingers
    [44, 40], [52, 42], [55, 50], [61, 48], [68, 54], [71, 62], [76, 62], [80, 70], [79, 88],
    // the heel of the hand into the cuff
    [74, 100], [64, 106], [40, 106], [28, 98],
    // thumb folded across
    [18, 84], [12, 70], [14, 62], [22, 62], [27, 70], [26, 44],
  ];
  c.save();
  c.lineJoin = 'round';
  c.lineCap = 'round';
  // body of the glove
  c.beginPath();
  outline.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.closePath();
  c.shadowColor = 'rgba(0, 0, 0, 0.45)';
  c.shadowBlur = 8;
  c.shadowOffsetY = 3;
  c.fillStyle = '#eee4cb';
  c.fill();
  c.shadowColor = 'transparent';
  c.save();
  c.clip();
  if (paper) {
    c.globalCompositeOperation = 'multiply';
    c.globalAlpha = 0.35;
    c.drawImage(paper, 0, 0, 160, 160);
    c.globalCompositeOperation = 'source-over';
    c.globalAlpha = 1;
  }
  speckle(c, 0, 0, GHOST_HAND.w, GHOST_HAND.h, { count: 90, color: 'rgba(120, 90, 50, 0.18)', size: 1.6, seed: 71 });
  // a soft shade down the palm side
  const g = c.createLinearGradient(70, 0, 30, 0);
  g.addColorStop(0, 'rgba(120, 90, 60, 0.22)');
  g.addColorStop(1, 'rgba(120, 90, 60, 0)');
  c.fillStyle = g;
  c.fillRect(0, 0, GHOST_HAND.w, GHOST_HAND.h);
  c.restore();
  ink(c, outline, { w: 2.2, color: '#5a4430', alpha: 0.95, closed: true, jitter: 0.5, seed: 72 });
  // finger creases and the stitched seams of a glove
  ink(c, [[44, 40], [44, 58]], { w: 1.2, color: '#6a5238', alpha: 0.7, jitter: 0.3, seed: 73 });
  ink(c, [[55, 50], [55, 64]], { w: 1.2, color: '#6a5238', alpha: 0.7, jitter: 0.3, seed: 74 });
  ink(c, [[68, 56], [68, 70]], { w: 1.2, color: '#6a5238', alpha: 0.7, jitter: 0.3, seed: 75 });
  ink(c, [[30, 20], [34, 20]], { w: 1, color: '#6a5238', alpha: 0.55, jitter: 0.2, seed: 76 });
  ink(c, [[42, 78], [48, 92], [60, 96]], { w: 1, color: '#6a5238', alpha: 0.5, jitter: 0.4, seed: 77 });
  // the cuff: a turned-back band with a brass button
  c.beginPath();
  roundRectPath(c, 26, 102, 52, 22, 5);
  c.fillStyle = '#d8ccb0';
  c.fill();
  ink(c, [[26, 102], [78, 102], [78, 124], [26, 124]], { w: 2, color: '#5a4430', closed: true, jitter: 0.4, seed: 78 });
  ink(c, [[29, 108], [75, 108]], { w: 0.9, color: '#6a5238', alpha: 0.6, jitter: 0.2, seed: 79 });
  c.fillStyle = brassFill(c, 60, 110, 10, 10);
  c.beginPath(); c.arc(65, 115, 4, 0, Math.PI * 2); c.fill();
  inkEllipse(c, 65, 115, 4, 4, { w: 1, color: '#5a4430', bleed: false });
  c.restore();
}

/**
 * One leaf of a sliding wall panel over a window slot that is about to open.
 * `side` 'L' or 'R': the brass meeting edge is on the inside.
 */
export function paintShutter(c, w, h, side = 'L', seed = 1) {
  wood(c, 0, 0, w, h, { base: '#2a1b11', seed: 900 + seed, vertical: false, grain: 'rgba(0,0,0,0.3)' });
  const g = side === 'L' ? c.createLinearGradient(w, 0, w - 60, 0) : c.createLinearGradient(0, 0, 60, 0);
  g.addColorStop(0, 'rgba(0,0,0,0.35)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = g;
  c.fillRect(0, 0, w, h);
  // a raised inner panel
  const inset = 22;
  c.fillStyle = 'rgba(0,0,0,0.18)';
  roundRectPath(c, inset, inset, w - inset * 2, h - inset * 2, 10);
  c.fill();
  c.save();
  roundRectPath(c, inset, inset, w - inset * 2, h - inset * 2, 10);
  c.lineWidth = 1.4;
  c.strokeStyle = PAL.ink;
  c.globalAlpha = 0.45;
  c.stroke();
  c.restore();
  // the brass meeting edge, with a finger pull
  const ex = side === 'L' ? w - 7 : 0;
  c.fillStyle = brassFill(c, ex, 0, 7, h, true);
  c.fillRect(ex, 0, 7, h);
  const px = side === 'L' ? w - 26 : 14;
  c.fillStyle = brassFill(c, px, h / 2 - 22, 12, 44, true);
  roundRectPath(c, px, h / 2 - 22, 12, 44, 5);
  c.fill();
  c.fillStyle = '#0d0907';
  roundRectPath(c, px + 3, h / 2 - 16, 6, 32, 3);
  c.fill();
  for (let y = 16; y < h - 8; y += 46) {
    rivet(c, side === 'L' ? 10 : w - 10, y, 3);
    rivet(c, side === 'L' ? w - 16 : 16, y, 2.6);
  }
  ink(c, [[0, 1], [w, 1]], { w: 1.6, alpha: 0.6 });
  ink(c, [[0, h - 1], [w, h - 1]], { w: 1.6, alpha: 0.6 });
}
