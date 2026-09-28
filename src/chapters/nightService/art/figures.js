// Figure parts for the panel actors, painted once into small canvases.
//
// Each rig is a list of parts: a canvas painter plus its pivot, so the
// renderer (actorRig.js) can assemble a jointed figure and swing the limbs.
// All sizes are for the figure at scale 1 (Butch ≈ 70 px tall, feet at y 0).
// Parts are painted at RES× so they stay crisp when a panel zooms.

import { PAL, ink, inkEllipse } from './ink.js';

export const RES = 3;

const COAT = '#2c4650';
const COAT_DARK = '#1d3139';
const SKIN = '#d9c3a0';
const CAP = '#1b2436';

function part(w, h, pivot, paint) {
  return { w, h, pivot, paint };
}

// Butch: the lost-property clerk. Coat, cap, a small lamp at the belt.
export const BUTCH_PARTS = {
  thigh: part(9, 17, [4.5, 2], (c) => {
    c.fillStyle = '#23303d';
    c.beginPath();
    c.moveTo(1, 1); c.lineTo(8, 1); c.lineTo(7.2, 16); c.lineTo(1.8, 16); c.closePath();
    c.fill();
    ink(c, [[1, 1], [1.8, 16]], { w: 1.2, jitter: 0.15, bleed: false });
    ink(c, [[8, 1], [7.2, 16]], { w: 1.2, jitter: 0.15, bleed: false });
  }),
  shin: part(12, 17, [4, 1.5], (c) => {
    c.fillStyle = '#23303d';
    c.fillRect(1.5, 0.5, 5.5, 13);
    c.fillStyle = '#120d0a';
    c.beginPath();
    c.moveTo(1, 12.5); c.lineTo(8, 12.5); c.quadraticCurveTo(11.5, 13.5, 11.5, 16); c.lineTo(1, 16); c.closePath();
    c.fill();
    ink(c, [[1.5, 0.5], [1.5, 12.5], [1, 16], [11.5, 16], [11, 13.5], [7, 12.5], [7, 0.5]], { w: 1.1, jitter: 0.15, bleed: false });
  }),
  torso: part(28, 42, [14, 38], (c) => {
    // long coat, shoulders at top, hem at the bottom
    c.fillStyle = COAT;
    c.beginPath();
    c.moveTo(6, 3); c.quadraticCurveTo(14, 0, 22, 3);
    c.lineTo(25, 38); c.quadraticCurveTo(14, 41, 3, 38); c.closePath();
    c.fill();
    // shading down the back
    c.fillStyle = COAT_DARK;
    c.beginPath();
    c.moveTo(6, 3); c.lineTo(3, 38); c.lineTo(9, 39); c.lineTo(10, 4); c.closePath();
    c.fill();
    // lapel + buttons
    c.strokeStyle = 'rgba(234,223,198,0.5)';
    c.lineWidth = 0.9;
    c.beginPath(); c.moveTo(17, 4); c.lineTo(19, 22); c.lineTo(20, 38); c.stroke();
    c.fillStyle = PAL.brassLight;
    [12, 19, 26].forEach((y) => { c.beginPath(); c.arc(21.2, y, 1.1, 0, Math.PI * 2); c.fill(); });
    // satchel strap
    c.strokeStyle = PAL.oxblood;
    c.lineWidth = 2.2;
    c.beginPath(); c.moveTo(8, 4); c.lineTo(22, 27); c.stroke();
    // belt
    c.fillStyle = '#16100c';
    c.fillRect(4, 24, 20.5, 2.4);
    c.fillStyle = PAL.brass;
    c.fillRect(17, 23.6, 3, 3.2);
    ink(c, [[6, 3], [3, 38], [14, 40.5], [25, 38], [22, 3], [14, 0.8]], { w: 1.5, closed: true, jitter: 0.25, bleed: false });
  }),
  head: part(20, 22, [9, 20], (c) => {
    // neck + collar
    c.fillStyle = SKIN;
    c.fillRect(7, 15, 5, 5);
    // face
    c.beginPath();
    c.ellipse(10, 11, 6.2, 7, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = 'rgba(120, 70, 50, 0.25)';
    c.beginPath(); c.ellipse(8, 13, 3, 3, 0, 0, Math.PI * 2); c.fill();
    // hair at the back
    c.fillStyle = '#2a1c14';
    c.beginPath(); c.moveTo(3.8, 7); c.quadraticCurveTo(3, 14, 6, 16); c.lineTo(6.5, 8); c.closePath(); c.fill();
    // cap: crown + peak + brass badge
    c.fillStyle = CAP;
    c.beginPath();
    c.moveTo(3, 7); c.quadraticCurveTo(4, 1, 11, 1.2); c.quadraticCurveTo(17, 1.5, 17, 6); c.lineTo(17, 7.4); c.lineTo(3, 7.8); c.closePath();
    c.fill();
    c.fillStyle = PAL.oxblood;
    c.fillRect(3.2, 5.6, 13.8, 2);
    c.fillStyle = '#0e1320';
    c.beginPath(); c.moveTo(12, 7.2); c.lineTo(19.5, 8); c.lineTo(18, 9.2); c.lineTo(12, 8.8); c.closePath(); c.fill();
    c.fillStyle = PAL.brassLight;
    c.fillRect(13.5, 4, 2.2, 1.8);
    // eye + nose hint
    c.fillStyle = '#1a120c';
    c.fillRect(13.2, 10.4, 1.3, 1.5);
    ink(c, [[16, 11], [17.3, 13.6], [15.6, 14]], { w: 0.8, jitter: 0.1, bleed: false, alpha: 0.7, color: '#6a4a36' });
    ink(c, [[3, 7.8], [4, 13], [6.5, 17], [10, 18], [14, 16.5], [16.2, 12]], { w: 1.2, jitter: 0.15, bleed: false });
    ink(c, [[3, 7.4], [4, 1.6], [11, 1], [17, 2.5], [17.2, 7.2], [19.5, 8]], { w: 1.2, jitter: 0.15, bleed: false });
  }),
  arm: part(9, 26, [4.5, 2.5], (c) => {
    c.fillStyle = COAT;
    c.beginPath();
    c.moveTo(1, 1.5); c.lineTo(8, 1.5); c.lineTo(7, 20); c.lineTo(2, 20); c.closePath();
    c.fill();
    c.fillStyle = COAT_DARK;
    c.fillRect(1.6, 17.5, 5.8, 2.6);
    c.fillStyle = SKIN;
    c.beginPath(); c.arc(4.5, 22.5, 2.8, 0, Math.PI * 2); c.fill();
    ink(c, [[1, 1.5], [2, 20], [7, 20], [8, 1.5]], { w: 1.1, jitter: 0.15, bleed: false });
  }),
  lamp: part(10, 14, [5, 1], (c) => {
    c.strokeStyle = PAL.brass;
    c.lineWidth = 1;
    c.beginPath(); c.arc(5, 3, 2.2, Math.PI, 0); c.stroke();
    c.fillStyle = PAL.brassDark;
    c.fillRect(2, 4, 6, 1.6);
    c.fillStyle = '#ffd98a';
    c.fillRect(2.6, 5.6, 4.8, 5);
    c.fillStyle = PAL.brassDark;
    c.fillRect(2, 10.6, 6, 1.8);
    ink(c, [[2, 4], [2, 12.4], [8, 12.4], [8, 4]], { w: 0.8, jitter: 0.1, bleed: false, closed: true });
  }),
};

// The Conductor: tall, long coat to the shins, peaked cap, a lantern.
const C_COAT = '#1f2a3a';
export const CONDUCTOR_PARTS = {
  legs: part(20, 16, [10, 1], (c) => {
    c.fillStyle = '#141a24';
    c.fillRect(4, 0, 5, 12); c.fillRect(11, 0, 5, 12);
    c.fillStyle = '#0c0907';
    c.fillRect(2.5, 11.5, 7.5, 4); c.fillRect(10.5, 11.5, 8, 4);
    ink(c, [[4, 0], [4, 12], [2.5, 15.5], [18.5, 15.5], [16, 12], [16, 0]], { w: 1.1, jitter: 0.2, bleed: false });
  }),
  torso: part(36, 72, [18, 70], (c) => {
    c.fillStyle = C_COAT;
    c.beginPath();
    c.moveTo(8, 4); c.quadraticCurveTo(18, 0, 28, 4);
    c.lineTo(33, 68); c.quadraticCurveTo(18, 72, 3, 68); c.closePath();
    c.fill();
    c.fillStyle = 'rgba(0,0,0,0.3)';
    c.beginPath(); c.moveTo(8, 4); c.lineTo(3, 68); c.lineTo(11, 69); c.lineTo(13, 5); c.closePath(); c.fill();
    // double row of brass buttons
    c.fillStyle = PAL.brassLight;
    [14, 24, 34, 44].forEach((y) => {
      [15.5, 22.5].forEach((x) => { c.beginPath(); c.arc(x, y, 1.3, 0, Math.PI * 2); c.fill(); });
    });
    // lapels
    c.strokeStyle = 'rgba(234,223,198,0.55)';
    c.lineWidth = 1;
    c.beginPath(); c.moveTo(12, 4); c.lineTo(19, 16); c.lineTo(25, 4); c.stroke();
    // pocket watch chain
    c.strokeStyle = PAL.brassLight;
    c.lineWidth = 0.8;
    c.beginPath(); c.moveTo(12, 38); c.quadraticCurveTo(17, 43, 22, 38); c.stroke();
    // coat split
    c.strokeStyle = 'rgba(0,0,0,0.45)';
    c.beginPath(); c.moveTo(19, 50); c.lineTo(19, 70); c.stroke();
    ink(c, [[8, 4], [3, 68], [18, 71], [33, 68], [28, 4], [18, 1]], { w: 1.6, closed: true, jitter: 0.3, bleed: false });
  }),
  head: part(26, 30, [12, 28], (c) => {
    c.fillStyle = '#cdb592';
    c.fillRect(9, 21, 6, 7);
    c.beginPath(); c.ellipse(12.5, 16, 7, 8.2, 0, 0, Math.PI * 2); c.fill();
    // grey moustache and sideburn
    c.fillStyle = '#bfb6a8';
    c.beginPath(); c.moveTo(13, 19.5); c.quadraticCurveTo(17, 18, 20, 20.5); c.quadraticCurveTo(16, 21.5, 13, 20.8); c.closePath(); c.fill();
    c.fillRect(5.8, 12, 2.2, 6);
    // peaked cap, tall crown
    c.fillStyle = '#121a28';
    c.beginPath();
    c.moveTo(4, 11); c.lineTo(3.5, 4); c.quadraticCurveTo(12, -0.5, 21, 3.5); c.lineTo(21, 11); c.closePath();
    c.fill();
    c.fillStyle = PAL.brass;
    c.fillRect(4, 8.4, 17, 1.6);
    c.fillStyle = '#070a10';
    c.beginPath(); c.moveTo(14, 10.6); c.lineTo(25, 12); c.lineTo(22.5, 13.6); c.lineTo(14, 12.6); c.closePath(); c.fill();
    c.fillStyle = PAL.brassLight;
    c.beginPath(); c.arc(16.5, 5.6, 1.7, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#140e0a';
    c.fillRect(16.4, 14.4, 1.5, 1.6);
    ink(c, [[4, 11], [4.8, 18], [8, 23], [13, 24.5], [17.5, 22], [20, 17]], { w: 1.2, jitter: 0.15, bleed: false });
    ink(c, [[4, 11], [3.5, 4], [12, 0.5], [21, 3.5], [21, 10.6], [25, 12]], { w: 1.2, jitter: 0.15, bleed: false });
  }),
  arm: part(10, 38, [5, 3], (c) => {
    c.fillStyle = C_COAT;
    c.beginPath(); c.moveTo(1, 2); c.lineTo(9, 2); c.lineTo(8, 31); c.lineTo(2, 31); c.closePath(); c.fill();
    c.fillStyle = PAL.brass;
    c.fillRect(2, 27.5, 6, 1.4);
    c.fillStyle = '#cdb592';
    c.beginPath(); c.arc(5, 33.5, 3.2, 0, Math.PI * 2); c.fill();
    ink(c, [[1, 2], [2, 31], [8, 31], [9, 2]], { w: 1.1, jitter: 0.15, bleed: false });
  }),
  lantern: part(16, 26, [8, 1], (c) => {
    c.strokeStyle = PAL.brassLight;
    c.lineWidth = 1.2;
    c.beginPath(); c.arc(8, 4, 3.5, Math.PI, 0); c.stroke();
    c.fillStyle = PAL.brassDark;
    c.beginPath(); c.moveTo(3, 7); c.lineTo(13, 7); c.lineTo(11, 4.5); c.lineTo(5, 4.5); c.closePath(); c.fill();
    c.fillStyle = '#ffe2a0';
    c.fillRect(4, 7.5, 8, 11);
    c.fillStyle = 'rgba(255,160,60,0.9)';
    c.beginPath(); c.ellipse(8, 14, 1.8, 3, 0, 0, Math.PI * 2); c.fill();
    c.strokeStyle = PAL.brassDark;
    c.lineWidth = 0.9;
    [6.6, 9.4].forEach((x) => { c.beginPath(); c.moveTo(x, 7.5); c.lineTo(x, 18.5); c.stroke(); });
    c.fillStyle = PAL.brassDark;
    c.fillRect(3, 18.5, 10, 2.5);
    ink(c, [[3, 7], [3.5, 21], [12.5, 21], [13, 7]], { w: 0.9, jitter: 0.1, bleed: false, closed: true });
  }),
  punch: part(14, 10, [3, 5], (c) => {
    c.fillStyle = PAL.brass;
    c.beginPath(); c.moveTo(1, 3); c.lineTo(12, 1); c.lineTo(13, 3.5); c.lineTo(3, 6); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(1, 5); c.lineTo(12, 8); c.lineTo(11, 9.6); c.lineTo(1, 7); c.closePath(); c.fill();
    c.fillStyle = PAL.brassLight;
    c.beginPath(); c.arc(2.4, 5, 1.8, 0, Math.PI * 2); c.fill();
    ink(c, [[1, 3], [12, 1], [13, 3.5], [3, 6], [12, 8], [11, 9.6], [1, 7]], { w: 0.8, jitter: 0.1, bleed: false });
  }),
};

// Mara, seen only as a silhouette (Act 3): coat, headscarf, a small case.
export const MARA_PARTS = {
  body: part(26, 66, [13, 65], (c) => {
    c.fillStyle = 'rgba(12, 14, 22, 0.92)';
    c.beginPath();
    c.ellipse(13, 9, 5.6, 6.4, 0, 0, Math.PI * 2);
    c.fill();
    c.beginPath();
    c.moveTo(7, 16); c.quadraticCurveTo(13, 13, 19, 16); c.lineTo(23, 52); c.lineTo(3, 52); c.closePath();
    c.fill();
    c.fillRect(8, 52, 3.5, 12); c.fillRect(14.5, 52, 3.5, 12);
    ink(c, [[7, 16], [3, 52], [23, 52], [19, 16]], { w: 1, alpha: 0.5, jitter: 0.2, bleed: false });
  }),
};

// A small ink-drawn locomotive with one carriage (Act 3's train actor).
export const TRAIN_PARTS = {
  body: part(150, 44, [75, 42], (c) => {
    c.fillStyle = '#2a2f3a';
    c.fillRect(4, 10, 64, 24);
    c.fillStyle = PAL.oxblood;
    c.fillRect(74, 8, 72, 26);
    c.fillStyle = '#ffd98a';
    [82, 98, 114, 130].forEach((x) => c.fillRect(x, 13, 10, 8));
    c.fillStyle = '#20252f';
    c.fillRect(46, 2, 20, 10);
    c.fillRect(12, 4, 7, 7);
    ink(c, [[4, 10], [4, 34], [68, 34], [68, 10]], { w: 1.4, closed: true, bleed: false });
    ink(c, [[74, 8], [74, 34], [146, 34], [146, 8]], { w: 1.4, closed: true, bleed: false });
    [16, 34, 52, 88, 132].forEach((x) => {
      c.fillStyle = '#0d0f14';
      c.beginPath(); c.arc(x, 36, 6, 0, Math.PI * 2); c.fill();
      inkEllipse(c, x, 36, 6, 6, { w: 1.1, bleed: false });
    });
  }),
};
