// The opening, painted (round 9; docs/CUTSCENES_PAINTED.md §1). Title → Act 0.
//
// 1 viaduct: the night service crosses the viaduct in the rain; the camera
//   follows it and flies into one lit window —
// 2 lost-property: — which is the office (A0-office-awake). Up the shelves of
//   tagged things to the orchard case on the top shelf, and into it —
// 3 orchard-case: the case's tag, CLAIM 1978-0412.
// 4 the-tag: his hands turn it over: M. VELEZ · BELLWETHER. Pull back out —
// 5 asleep: — to the desk, where his head goes down onto his arms (A0-office)
//   and the lamp burns low; then black, into Act 0 ("Wake up, Lost Property.").

import {
  STAGE_W, STAGE_H, drawFigure, drawPair, drawPlate, drawWords, lampGlow, lampsDown, lerp, linkRect, plateInfo,
  rain, ramp, sway, usePlates, vignette,
} from './kit.js';

// Where things are in the paintings (stage units). The stand-ins used while a
// painting is not in put them elsewhere: GEOM picks the set for what is built.
const REAL = {
  deckY: 293, carriage: 250,
  tag: { x: 800, y: 470, w: 150, rot: 0 },
  hands: { x: 800, y: 420, w: 300, rot: -0.04, back: { x: 800, y: 420 } },
};
const STAND = {
  deckY: 668, carriage: 300,
  tag: { x: 1140, y: 380, w: 120, rot: 0.16 },
  hands: { x: 880, y: 342, w: 400, rot: -0.2, back: { x: 880, y: 342 } },
};
const geom = (id) => (plateInfo(id)?.standIn ? STAND : REAL);

// the office (A0-office-awake / A0-office, both painted by George for Act 0)
const OFFICE = { lamp: [1062, 428], case: linkRect('OP-case', [319, 16, 300, 150]), desk: [770, 435, 260, 130] };

const CARS = 4;
/** The train's head (stage x) at the viaduct shot's progress. */
const headAt = (t) => lerp(160, 1360, t);
/** The 2 : 1 rect round the middle window of the second carriage: where the office is. */
function windowRect(t) {
  const g = geom('OP-viaduct');
  const L = g.carriage;
  const cx = headAt(t) - 1.5 * L;
  const s = L / 960;
  const cy = g.deckY - 157 * s;
  // a 2 : 1 rect inside the glass: the office is what the window shows
  const w = 74 * s * 0.92;
  return [cx - w / 2, cy - w / 4, w, w / 2];
}

function shotViaduct(c, t, w, h, env) {
  drawPlate(c, 'OP-viaduct');
  const g = geom('OP-viaduct');
  const head = headAt(t);
  for (let i = 0; i < CARS; i++) {
    const x = head - (i + 0.5) * g.carriage;
    // the wet parapet catches the windows
    lampGlow(c, x, g.deckY - g.carriage * 0.06, g.carriage * 0.42, { alpha: 0.16, flicker: 0.02, env, seed: i });
    drawFigure(c, 'train:lit', x, g.deckY, g.carriage);
  }
  rain(c, env);
  vignette(c, { alpha: 0.35 });
}

function shotOffice(c, t, w, h, env) {
  c.save();
  sway(c, env, { amp: 0.5 });
  drawPlate(c, 'A0-office-awake');
  lampGlow(c, OFFICE.lamp[0], OFFICE.lamp[1], 300, { alpha: 0.32, env });
  c.restore();
  vignette(c, { alpha: 0.3 });
}

function shotCase(c, t, w, h, env) {
  const g = geom('OP-case').tag;
  c.save();
  sway(c, env, { amp: 0.4 });
  drawPlate(c, 'OP-case');
  drawWords(c, ['CLAIM', '1978-0412', 'ORCHARD CASE', 'UNCLAIMED'], { x: g.x, y: g.y, rot: g.rot }, {
    face: 'print', size: g.w * 0.105, weight: 600, tracking: 0.14, leading: 1.5, ink: '#2b1d12', fade: 0.85 * ramp(t, 0.12, 0.5),
  });
  c.restore();
  vignette(c, { alpha: 0.35 });
}

function shotTag(c, t, w, h, env) {
  const g = geom('OP-tag-front').hands;
  const flip = ramp(t, 0.36, 0.46);
  c.save();
  sway(c, env, { amp: 0.35 });
  drawPair(c, 'OP-tag-front', 'OP-tag-back', flip, { mask: 'fade' });
  drawWords(c, ['CLAIM 1978-0412', 'ORCHARD CASE · UNCLAIMED'], { x: g.x, y: g.y, rot: g.rot }, {
    face: 'print', size: g.w * 0.052, weight: 600, tracking: 0.12, leading: 1.7, ink: '#2b1d12', fade: 0.85 * (1 - flip),
  });
  // the back, in an old hand: the eye reads it in
  drawWords(c, ['M. Velez', 'Bellwether'], { x: g.back.x, y: g.back.y, rot: g.rot }, {
    face: 'hand', size: g.w * 0.11, ink: '#4a2c18', fade: 0.62 * flip, reveal: ramp(t, 0.46, 0.66), leading: 1.25, tracking: 0.02, jitter: 1.4, seed: 4,
  });
  lampGlow(c, w * 0.18, h * 0.05, 520, { alpha: 0.18, env });
  c.restore();
  vignette(c, { alpha: 0.4 });
}

function shotAsleep(c, t, w, h, env) {
  c.save();
  sway(c, env, { amp: 1.1, period: 3.8 });
  drawPair(c, 'A0-office-awake', 'A0-office', ramp(t, 0.2, 0.48), { mask: 'fade' });
  const low = ramp(t, 0.35, 1);
  lampGlow(c, OFFICE.lamp[0], OFFICE.lamp[1], 300, { alpha: 0.32 * (1 - 0.6 * low), env, flicker: 0.06 + 0.1 * low });
  c.restore();
  lampsDown(c, low * 0.75, { pool: [OFFICE.lamp[0], OFFICE.lamp[1] + 60, 520] });
  vignette(c, { alpha: 0.35 + 0.25 * low });
}

function shotBlack(c, t, w, h) {
  c.fillStyle = '#020306';
  c.fillRect(0, 0, w, h);
}

const PLATES = ['OP-viaduct', 'A0-office-awake', 'A0-office', 'OP-case', 'OP-tag-front', 'OP-tag-back', 'train:lit'];

export const opening = {
  id: 'opening',
  title: 'Lost Property',
  painted: true,
  chrome: 'painted',
  length: [25, 40],
  music: { id: 'cutscene-opening', src: '/assets/music/ch1/1.1_train_undertow.mp3', volume: 0.42, fade: 3, outFade: 3 },
  prepare: () => usePlates(PLATES),
  prepareTimeoutMs: 6000,
  plates: PLATES,
  shots: [
    {
      id: 'viaduct',
      duration: 8.5,
      draw: shotViaduct,
      camera: { from: { x: 0.32, y: 0.5, zoom: 1.12 }, to: { x: 0.6, y: (geom('OP-viaduct').deckY - geom('OP-viaduct').carriage * 0.2) / 800, zoom: 1.7 }, still: { x: 0.5, y: 0.45, zoom: 1.2 } },
      transition: { type: 'zoom', duration: 1.7, rect: (t) => windowRect(t), reveal: [0.15, 0.7], feather: 0.22 },
      captions: [{ text: 'The night service runs between stored places.\nThe archive calls it the last line.', at: 0.9, end: 6.2 }],
      cues: [{ at: 0, sfx: 'rail', level: 1 }, { at: 0, sfx: 'rain', level: 0.9 }],
    },
    {
      id: 'lost-property',
      duration: 7,
      draw: shotOffice,
      camera: { from: { x: 0.55, y: 0.55, zoom: 1.04 }, to: { x: 0.33, y: 0.28, zoom: 1.5 }, still: { x: 0.45, y: 0.4, zoom: 1.1 } },
      transition: { type: 'zoom', duration: 1.3, rect: OFFICE.case, reveal: [0.3, 0.8] },
      captions: [{ text: 'Everything left on board comes here, to Lost Property.', at: 0.9, end: 5.2 }],
      cues: [{ at: 0, sfx: 'rain', level: 0.45 }],
    },
    {
      id: 'orchard-case',
      duration: 5.5,
      draw: shotCase,
      camera: { from: { x: 0.5, y: 0.5, zoom: 1 }, to: { x: 0.52, y: 0.55, zoom: 1.3 } },
      transition: { type: 'fade', duration: 1 },
      cues: [{ at: 1.2, sfx: 'paper' }],
    },
    {
      id: 'the-tag',
      duration: 8,
      draw: shotTag,
      camera: { from: { x: 0.5, y: 0.5, zoom: 1.04 }, to: { x: 0.52, y: 0.47, zoom: 1.16 } },
      transition: { type: 'pull', duration: 1.4, rect: OFFICE.desk, reveal: [0.2, 0.7] },
      captions: [{ text: 'The clerk, Butch, had filed it a hundred times.\nHe could not leave it alone.', at: 3.3, end: 7.9 }],
      cues: [{ at: 2.9, sfx: 'paper' }],
    },
    {
      id: 'asleep',
      duration: 7.5,
      draw: shotAsleep,
      camera: { from: { x: 0.53, y: 0.56, zoom: 1.2 }, to: { x: 0.52, y: 0.58, zoom: 1.32 } },
      transition: { type: 'cut' },
      captions: [{ text: 'The line keeps running while someone rides it.', at: 1.4, end: 6.1 }],
      cues: [{ at: 0, sfx: 'rail', level: 1.25 }, { at: 4.4, stopMusic: true, fade: 4 }],
    },
    {
      id: 'black',
      duration: 2.2,
      draw: shotBlack,
      blackout: true,
      cues: [{ at: 0, stopSfx: 'rail', fade: 1.6 }, { at: 0.4, stopSfx: 'rain', fade: 1.6 }],
    },
  ],
};

export default opening;
export { STAGE_W, STAGE_H };
