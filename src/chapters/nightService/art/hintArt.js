// The ghost hand (tier-2 hints) and the unfold's brass pull and paper tag
// (grid growth: the player unfolds the carriage wall, unfold.js).
//
// The hand is a paper glove in the chapter's ink style: ivory card with a
// hand-jittered warm outline, a brass cuff button, pointing with the index
// finger. It is drawn translucent over the windows, never over captions.

import { PAL, brassFill, ink, inkEllipse, rivet, roundRectPath, speckle } from './ink.js';

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

// ---------------------------------------------------------------------------
// The unfold (Acts 0 → 0.5 → 1): a brass pull on the fold and its paper tag.

/** Canvas size of the pull, drawn opening towards -x (PanelScene rotates it). */
export const UNFOLD_PULL = Object.freeze({ w: 96, h: 176, anchor: [70, 88] });
/** Canvas size of the pull's paper tag (screen px at 1920×1080). */
export const UNFOLD_TAG = Object.freeze({ w: 272, h: 70, eyelet: [17, 35] });

/**
 * The pull: a riveted brass plate on the window's edge (anchor = the edge)
 * and a D-shaped grip standing proud of it towards the side the wall opens,
 * with two engraved chevrons pointing the way.
 */
export function paintUnfoldPull(c) {
  const [ax, ay] = UNFOLD_PULL.anchor;
  c.save();
  c.shadowColor = 'rgba(0,0,0,0.6)';
  c.shadowBlur = 10;
  c.shadowOffsetX = 3;
  c.shadowOffsetY = 5;
  // the plate, straddling the edge
  const px = ax - 15;
  const py = ay - 70;
  c.fillStyle = brassFill(c, px, py, 30, 140, true);
  roundRectPath(c, px, py, 30, 140, 9);
  c.fill();
  c.shadowColor = 'transparent';
  c.strokeStyle = 'rgba(40, 26, 10, 0.85)';
  c.lineWidth = 1.6;
  roundRectPath(c, px, py, 30, 140, 9);
  c.stroke();
  rivet(c, ax, py + 13, 4);
  rivet(c, ax, py + 127, 4);
  // the arms of the grip
  [ay - 46, ay + 46].forEach((y) => {
    c.fillStyle = brassFill(c, 18, y - 6, ax - 18, 12);
    roundRectPath(c, 18, y - 6, ax - 18, 12, 5);
    c.fill();
    c.strokeStyle = 'rgba(40, 26, 10, 0.8)';
    c.lineWidth = 1.2;
    roundRectPath(c, 18, y - 6, ax - 18, 12, 5);
    c.stroke();
  });
  // the grip bar
  c.shadowColor = 'rgba(0,0,0,0.55)';
  c.shadowBlur = 8;
  c.shadowOffsetX = 2;
  c.shadowOffsetY = 4;
  c.fillStyle = brassFill(c, 8, ay - 62, 22, 124, true);
  roundRectPath(c, 8, ay - 62, 22, 124, 11);
  c.fill();
  c.shadowColor = 'transparent';
  c.strokeStyle = 'rgba(40, 26, 10, 0.9)';
  c.lineWidth = 1.8;
  roundRectPath(c, 8, ay - 62, 22, 124, 11);
  c.stroke();
  c.strokeStyle = 'rgba(255, 240, 200, 0.55)';
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(13, ay - 50);
  c.lineTo(13, ay + 50);
  c.stroke();
  // chevrons pointing outward (-x), engraved in the plate
  c.strokeStyle = 'rgba(40, 24, 8, 0.85)';
  c.lineWidth = 2.6;
  c.lineCap = 'round';
  c.lineJoin = 'round';
  [-16, 2].forEach((dy) => {
    c.beginPath();
    c.moveTo(ax + 5, ay + dy - 7);
    c.lineTo(ax - 4, ay + dy + 0.5);
    c.lineTo(ax + 5, ay + dy + 8);
    c.stroke();
  });
  c.restore();
}

/** The pull's paper tag: DRAG · UNFOLD, typed, with the eyelet on the left. */
export function paintUnfoldTag(c, paper = null, text = 'DRAG · UNFOLD') {
  const { w, h } = UNFOLD_TAG;
  const [ex, ey] = UNFOLD_TAG.eyelet;
  const body = () => {
    c.beginPath();
    c.moveTo(4, h / 2);
    c.lineTo(26, 6);
    c.lineTo(w - 6, 6);
    c.lineTo(w - 6, h - 6);
    c.lineTo(26, h - 6);
    c.closePath();
  };
  c.save();
  c.shadowColor = 'rgba(0,0,0,0.5)';
  c.shadowBlur = 8;
  c.shadowOffsetY = 3;
  body();
  c.fillStyle = PAL.paper;
  c.fill();
  c.restore();
  if (paper) {
    c.save();
    body();
    c.clip();
    c.globalCompositeOperation = 'multiply';
    c.globalAlpha = 0.35;
    c.drawImage(paper, 0, 0, w * 2, h * 2);
    c.restore();
  }
  c.save();
  body();
  c.clip();
  speckle(c, 0, 0, w, h, { count: 120, color: 'rgba(90, 60, 30, 0.12)', size: 1.2, seed: 41 });
  c.restore();
  body();
  c.strokeStyle = 'rgba(80, 60, 40, 0.7)';
  c.lineWidth = 1.4;
  c.stroke();
  // eyelet with a brass ring
  c.fillStyle = brassFill(c, ex - 7, ey - 7, 14, 14);
  c.beginPath(); c.arc(ex, ey, 7, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#2a1a10';
  c.beginPath(); c.arc(ex, ey, 3.4, 0, Math.PI * 2); c.fill();
  // a ruled line, then the type
  c.strokeStyle = 'rgba(107, 42, 34, 0.45)';
  c.lineWidth = 1;
  c.beginPath(); c.moveTo(40, h - 15); c.lineTo(w - 18, h - 15); c.stroke();
  c.fillStyle = '#3a2216';
  c.font = '700 25px "Space Mono", ui-monospace, monospace';
  c.textBaseline = 'middle';
  c.textAlign = 'center';
  c.fillText(text, (36 + w - 10) / 2, h / 2 - 2);
}
