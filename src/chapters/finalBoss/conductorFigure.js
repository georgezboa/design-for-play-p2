// The Conductor's face, one design for every movement of the finale (round 3:
// Movement I was a paper doll with a profile dot for an eye and a pocket
// chain that read as a smile on his coat; Movement II was a blank disc).
//
// He faces the player: a tall peaked cap with a brass band and badge, its
// brim throwing a hard shadow across his eyes, two lamp-lit eyes inside that
// shadow, grey sideburns and moustache. The Chapter 1 parts kit
// (nightService/art/figures.js, read-only here) still draws his arms, legs
// and lantern; this file adds the front-facing head and a coat whose watch
// chain hangs like a chain.

import { PAL, ink } from '../nightService/art/ink.js';

export const CONDUCTOR_SKIN = '#cdb592';
const COAT = '#1f2a3a';
const CAP = '#121a28';
const BRIM = '#070a10';
const GREY = '#c4bbad';

// Face centre and half-size of the head part, in part units.
export const HEAD_FACE = Object.freeze({ cx: 14, cy: 16.5, rx: 7.6, ry: 8.8 });

function faceShape(c) {
  c.beginPath();
  c.ellipse(HEAD_FACE.cx, HEAD_FACE.cy, HEAD_FACE.rx, HEAD_FACE.ry, 0, 0, Math.PI * 2);
}

// The head at part scale: 28 × 34 units, pivot at the collar (14, 32).
export function paintConductorHead(c, { era = 'present', collar = true, inkAlpha = 0.92 } = {}) {
  const { cx, cy, rx } = HEAD_FACE;
  if (collar) {
    c.fillStyle = COAT;
    c.beginPath(); c.moveTo(7.5, 26.5); c.lineTo(20.5, 26.5); c.lineTo(23.5, 34); c.lineTo(4.5, 34); c.closePath(); c.fill();
    c.fillStyle = PAL.brassLight;
    c.fillRect(8.4, 29.2, 1.6, 1.6); c.fillRect(18, 29.2, 1.6, 1.6);
  }
  // neck, ears, face
  c.fillStyle = CONDUCTOR_SKIN;
  c.fillRect(11, 22, 6, 6.5);
  c.fillStyle = 'rgba(70, 40, 25, 0.35)';
  c.fillRect(11, 25.6, 6, 2.9);
  c.fillStyle = '#bea47e';
  c.beginPath(); c.ellipse(cx - rx - 0.6, cy + 0.4, 1.5, 2.5, 0, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.ellipse(cx + rx + 0.6, cy + 0.4, 1.5, 2.5, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = CONDUCTOR_SKIN;
  faceShape(c); c.fill();
  // modelling: the lantern side (his right, our left) warm, the far cheek cool
  c.save();
  faceShape(c); c.clip();
  const shade = c.createLinearGradient(cx - rx, 0, cx + rx, 0);
  shade.addColorStop(0, 'rgba(255, 200, 130, 0.16)');
  shade.addColorStop(0.55, 'rgba(0, 0, 0, 0)');
  shade.addColorStop(1, 'rgba(60, 36, 28, 0.38)');
  c.fillStyle = shade;
  c.fillRect(cx - rx, cy - 10, rx * 2, 20);
  // the brim's shadow across the eyes: the face is lit from below the cap
  const brimShade = c.createLinearGradient(0, 11, 0, 19.2);
  brimShade.addColorStop(0, 'rgba(8, 6, 10, 0.86)');
  brimShade.addColorStop(0.62, 'rgba(8, 6, 10, 0.55)');
  brimShade.addColorStop(1, 'rgba(8, 6, 10, 0)');
  c.fillStyle = brimShade;
  c.fillRect(cx - rx, 11, rx * 2, 8.2);
  c.restore();
  // eyes, lit from his lantern inside the shadow
  for (const ex of [cx - 3.2, cx + 3.2]) {
    c.fillStyle = 'rgba(232, 214, 176, 0.9)';
    c.beginPath(); c.ellipse(ex, 16.3, 1.55, 0.9, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#1a120c';
    c.beginPath(); c.arc(ex + 0.15, 16.35, 0.78, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#fff3d0';
    c.beginPath(); c.arc(ex + 0.45, 16.05, 0.3, 0, Math.PI * 2); c.fill();
    // the heavy lid that keeps him unreadable
    c.strokeStyle = 'rgba(20, 12, 8, 0.85)';
    c.lineWidth = 0.6;
    c.beginPath(); c.moveTo(ex - 1.7, 15.7); c.quadraticCurveTo(ex, 15.1, ex + 1.7, 15.7); c.stroke();
  }
  // nose and its shadow
  c.strokeStyle = 'rgba(110, 72, 50, 0.7)';
  c.lineWidth = 0.7;
  c.beginPath(); c.moveTo(cx + 0.4, 16.8); c.lineTo(cx + 1.1, 19.4); c.lineTo(cx - 0.3, 19.9); c.stroke();
  // sideburns and moustache, grey
  c.fillStyle = GREY;
  c.fillRect(cx - rx + 0.2, 12.5, 1.8, 6.6);
  c.fillRect(cx + rx - 2, 12.5, 1.8, 6.6);
  c.beginPath();
  c.moveTo(cx, 20.4);
  c.quadraticCurveTo(cx - 3.2, 19.8, cx - 5.1, 21.6);
  c.quadraticCurveTo(cx - 2.6, 22.4, cx, 21.6);
  c.quadraticCurveTo(cx + 2.6, 22.4, cx + 5.1, 21.6);
  c.quadraticCurveTo(cx + 3.2, 19.8, cx, 20.4);
  c.closePath();
  c.fill();
  c.strokeStyle = 'rgba(60, 30, 20, 0.6)';
  c.lineWidth = 0.6;
  c.beginPath(); c.moveTo(cx - 1.6, 23.4); c.lineTo(cx + 1.6, 23.4); c.stroke();
  // cap: tall crown, brass band and badge, and the peak
  c.fillStyle = CAP;
  c.beginPath(); c.moveTo(3.6, 11.6); c.lineTo(2.6, 4.6); c.quadraticCurveTo(14, -1.8, 25.4, 4.6); c.lineTo(24.4, 11.6); c.closePath(); c.fill();
  c.fillStyle = 'rgba(234, 223, 198, 0.08)';
  c.beginPath(); c.moveTo(4, 5.2); c.quadraticCurveTo(14, 0, 24, 5.2); c.lineTo(23.8, 6.4); c.quadraticCurveTo(14, 1.6, 4.2, 6.4); c.closePath(); c.fill();
  c.fillStyle = PAL.brass;
  c.fillRect(3.3, 8.8, 21.4, 1.9);
  c.fillStyle = PAL.brassLight;
  c.fillRect(3.3, 8.8, 21.4, 0.5);
  c.beginPath(); c.arc(14, 5.4, 2.1, 0, Math.PI * 2); c.fill();
  c.fillStyle = PAL.brassDark;
  c.beginPath(); c.arc(14, 5.4, 0.9, 0, Math.PI * 2); c.fill();
  c.fillStyle = BRIM;
  c.beginPath(); c.moveTo(2.4, 11.2); c.quadraticCurveTo(14, 10, 25.6, 11.2); c.quadraticCurveTo(24.6, 14.4, 14, 15.3); c.quadraticCurveTo(3.4, 14.4, 2.4, 11.2); c.closePath(); c.fill();
  c.strokeStyle = 'rgba(234, 223, 198, 0.3)';
  c.lineWidth = 0.5;
  c.beginPath(); c.moveTo(4, 13.2); c.quadraticCurveTo(14, 15.6, 24, 13.2); c.stroke();
  // ink: jaw and cap, as every Chapter 1 part is outlined
  ink(c, [[cx - rx, 15], [cx - rx + 0.8, 20], [cx - 3.6, 24.4], [cx, 25.4], [cx + 3.6, 24.4], [cx + rx - 0.8, 20], [cx + rx, 15]], { w: 1.1, jitter: 0.12, bleed: false, alpha: inkAlpha, seed: 41 });
  ink(c, [[3.6, 11.6], [2.6, 4.6], [8, 1.4], [14, 0.6], [20, 1.4], [25.4, 4.6], [24.4, 11.6]], { w: 1.1, jitter: 0.12, bleed: false, alpha: inkAlpha, seed: 42 });
  ink(c, [[2.4, 11.2], [8, 14.2], [14, 15.3], [20, 14.2], [25.6, 11.2]], { w: 0.9, jitter: 0.1, bleed: false, alpha: inkAlpha * 0.75, seed: 43 });
  if (era === 'past') {
    c.save();
    c.globalCompositeOperation = 'source-atop';
    c.fillStyle = 'rgba(255, 200, 130, 0.14)';
    c.fillRect(0, 0, 28, 34);
    c.restore();
  }
}

export const CONDUCTOR_HEAD_PART = Object.freeze({ w: 28, h: 34, pivot: [14, 32], paint: (c) => paintConductorHead(c) });

// His long coat (the Chapter 1 torso, 36 × 72, pivot [18, 70]) with the
// watch chain hanging from a button to the pocket, a watch at its end.
export const CONDUCTOR_TORSO_PART = Object.freeze({
  w: 36,
  h: 72,
  pivot: [18, 70],
  paint(c) {
    c.fillStyle = COAT;
    c.beginPath();
    c.moveTo(8, 4); c.quadraticCurveTo(18, 0, 28, 4);
    c.lineTo(33, 68); c.quadraticCurveTo(18, 72, 3, 68); c.closePath();
    c.fill();
    c.fillStyle = 'rgba(0,0,0,0.3)';
    c.beginPath(); c.moveTo(8, 4); c.lineTo(3, 68); c.lineTo(11, 69); c.lineTo(13, 5); c.closePath(); c.fill();
    c.fillStyle = PAL.brassLight;
    [14, 24, 34, 44].forEach((y) => {
      [15.5, 22.5].forEach((x) => { c.beginPath(); c.arc(x, y, 1.3, 0, Math.PI * 2); c.fill(); });
    });
    c.strokeStyle = 'rgba(234,223,198,0.55)';
    c.lineWidth = 1;
    c.beginPath(); c.moveTo(12, 4); c.lineTo(19, 16); c.lineTo(25, 4); c.stroke();
    // the waistcoat pocket, its flap, and the watch on its chain
    c.strokeStyle = 'rgba(0,0,0,0.5)';
    c.lineWidth = 0.9;
    c.beginPath(); c.moveTo(24.6, 39.4); c.lineTo(30.4, 39); c.stroke();
    c.strokeStyle = PAL.brassLight;
    c.lineWidth = 0.7;
    c.beginPath(); c.moveTo(22.5, 34); c.quadraticCurveTo(24.2, 37.6, 27.4, 39.2); c.stroke();
    c.fillStyle = PAL.brass;
    c.beginPath(); c.arc(27.6, 40.6, 1.6, 0, Math.PI * 2); c.fill();
    c.fillStyle = 'rgba(255, 240, 200, 0.7)';
    c.beginPath(); c.arc(27.2, 40.2, 0.5, 0, Math.PI * 2); c.fill();
    c.strokeStyle = 'rgba(0,0,0,0.45)';
    c.lineWidth = 1;
    c.beginPath(); c.moveTo(19, 50); c.lineTo(19, 70); c.stroke();
    ink(c, [[8, 4], [3, 68], [18, 71], [33, 68], [28, 4], [18, 1]], { w: 1.6, closed: true, jitter: 0.3, bleed: false, seed: 44 });
  },
});

// Draw the head so its face (centre cx, cy in canvas px) covers a disc of
// `radius` px: the Chapter 2 figure's plain head disc, in Movement II.
export function drawConductorHeadOver(c, cx, cy, radius) {
  const k = radius / 7.2;
  c.save();
  c.translate(cx - HEAD_FACE.cx * k, cy - HEAD_FACE.cy * k);
  c.scale(k, k);
  paintConductorHead(c, { collar: false, inkAlpha: 0.4 });
  c.restore();
}
