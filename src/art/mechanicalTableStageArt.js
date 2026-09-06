import { C, CAR } from './colors.js';

const LERP = (a, b, t) => a + (b - a) * t;

const RESULT_COPY = Object.freeze({
  underpowered: '(The latch aligns, but the air charge cannot carry the test bearing.)',
  misweighted: '(The unequal suspension knocks the bearing into the return tray.)',
  'reference-pass': '(Route A turns under the same calibrated load.)',
  'no-reference': '(Route B stops, but there is no reference run to compare.)',
  'open-contact': '(The bearing stops at the open copper contact.)',
  misrouted: '(The present bearing enters the wrong machine.)',
  mistimed: '(The two bearings pass without coupling.)',
  'phase-complete': '(The equalizer carries the bearing cleanly.)',
});

function setText(text, value, x, y, color = '#687981', visible = true) {
  text?.setText(value).setPosition(x, y).setColor(color).setVisible(visible);
}

function drawWheel(art, x, y, r, active = false) {
  art.fillStyle(C(CAR.VOID), 1);
  art.fillCircle(x, y, r);
  art.lineStyle(active ? 5 : 4, C(active ? CAR.LAMP_OK : CAR.STEEL_MID), active ? 0.9 : 0.72);
  art.strokeCircle(x, y, r);
  art.lineStyle(2, C(CAR.STEEL_HI), 0.62);
  art.strokeCircle(x, y, r * 0.55);
  art.lineBetween(x - r * 0.7, y, x + r * 0.7, y);
  art.fillStyle(C(CAR.STEEL_DARK), 1);
  art.fillCircle(x, y, r * 0.13);
}

function drawSpring(art, x, top, bottom, compression, active) {
  const start = top + compression * 9;
  for (let i = 0; i < 7; i += 1) {
    const y1 = LERP(start, bottom, i / 7);
    const y2 = LERP(start, bottom, (i + 1) / 7);
    art.lineStyle(3, C(active ? CAR.STEEL_HI : CAR.STEEL_MID), active ? 0.82 : 0.62);
    art.lineBetween(x + (i % 2 ? 14 : -14), y1, x + (i % 2 ? -14 : 14), y2);
  }
  art.fillStyle(C(CAR.STEEL_DARK), 1);
  art.fillRoundedRect(x - 20, start - 6, 40, 9, 3);
  art.fillRoundedRect(x - 20, bottom - 3, 40, 9, 3);
}

function drawCabinStrip(art, px, py) {
  art.fillStyle(C(CAR.VOID), 0.92);
  art.fillRoundedRect(px(32), py(25), px(1016) - px(0), py(82) - py(0), 8);
  art.lineStyle(2, C(CAR.ENAMEL_MID), 0.5);
  art.strokeRoundedRect(px(32), py(25), px(1016) - px(0), py(82) - py(0), 8);
  for (let i = 0; i < 3; i += 1) {
    const x = 72 + i * 330;
    art.fillStyle(C(CAR.GLASS_DARK), 0.88);
    art.fillRoundedRect(px(x), py(37), px(286) - px(0), py(32) - py(0), 4);
    art.lineStyle(1, C(CAR.SKY_HORIZON), 0.28);
    art.lineBetween(px(x + 8), py(61), px(x + 278), py(61));
  }
  art.fillStyle(C(CAR.ENAMEL_DARK), 0.9);
  art.fillRoundedRect(px(60), py(72), px(958) - px(0), py(7) - py(0), 2);
}

function drawClose(art, px, py, hot) {
  art.fillStyle(C(CAR.ENAMEL_DARK), 1);
  art.fillRoundedRect(px(1018), py(96), px(38) - px(0), py(38) - py(0), 5);
  art.lineStyle(2, C(hot ? CAR.LAMP_ALERT : CAR.STEEL_MID), hot ? 1 : 0.75);
  art.strokeRoundedRect(px(1018), py(96), px(38) - px(0), py(38) - py(0), 5);
  art.lineBetween(px(1029), py(107), px(1045), py(123));
  art.lineBetween(px(1045), py(107), px(1029), py(123));
}

/**
 * IV–VI use one physical suspension test rig. Phase IV is intentionally a
 * blockout-first balance puzzle: pressure lifts one end, the trolley supplies
 * the opposing moment, and the central pin visibly aligns with its fork. Later
 * phases reuse that calibrated rig and add only route comparison and timing.
 */
export function renderMechanicalTableStage({ panel, snap, hover, pressed, now }) {
  const { left, top, width, height, graphics: art } = panel;
  const sx = width / 1080;
  const sy = height / 520;
  const px = (x) => left + x * sx;
  const py = (y) => top + y * sy;
  const hot = (id) => hover === id || pressed === id;
  const pulse = 0.72 + Math.sin(now / 230) * 0.22;
  const phaseFour = snap.phase === 4;
  const balance = snap.balance ?? { error: 0, aligned: true, launchReady: true };
  const activeOutcome = snap.bearing?.outcome ?? snap.result;

  panel.base?.setPosition(left + width / 2, top + height / 2)
    .setDisplaySize(width, height).setAlpha(0.08);
  panel.title.setText({ 4: 'IV  /  BALANCE THE TRUCK', 5: 'V  /  FIND THE BREAK', 6: 'VI  /  MEET THE PAST' }[snap.phase])
    .setPosition(px(38), py(101)).setFontSize('15px');
  panel.help.setText('TOUCH THE HARDWARE   ·   READ THE MACHINE   ·   E / ESC CLOSE')
    .setPosition(left + width / 2, py(493)).setFontSize('9px');
  Object.values(panel.partTexts ?? {}).forEach((text) => text.setVisible(false));
  panel.bogiePhoto?.setVisible(false);
  art.clear();

  art.fillStyle(C(CAR.VOID), 0.93);
  art.fillRoundedRect(left, top, width, height, 15);
  art.lineStyle(3, C(CAR.ENAMEL_MID), 0.72);
  art.strokeRoundedRect(left, top, width, height, 15);
  drawCabinStrip(art, px, py);

  // One large machine occupies the whole service opening. There are no
  // disconnected control boxes: pump, suspension, equalizer, release and
  // output all share the same frame and the same lines of force.
  art.fillStyle(C(CAR.VOID_LIFT), 0.66);
  art.fillRoundedRect(px(52), py(132), px(976) - px(0), py(318) - py(0), 10);
  art.lineStyle(3, C(CAR.ENAMEL_MID), 0.58);
  art.strokeRoundedRect(px(52), py(132), px(976) - px(0), py(318) - py(0), 10);
  art.lineStyle(7, C(CAR.STEEL_DARK), 0.9);
  art.lineBetween(px(150), py(423), px(935), py(423));

  // Reservoir + hand pump. Four visible increments let the player reason
  // about energy instead of discovering a hidden threshold.
  art.fillStyle(C(CAR.ENAMEL_DARK), 1);
  art.fillRoundedRect(px(82), py(218), px(116) - px(0), py(176) - py(0), 9);
  art.lineStyle(hot('pump') ? 4 : 2, C(hot('pump') ? CAR.BRASS_HI : CAR.STEEL_MID), 0.96);
  art.strokeRoundedRect(px(82), py(218), px(116) - px(0), py(176) - py(0), 9);
  art.fillStyle(C(CAR.GLASS_DARK), 0.96);
  art.fillRoundedRect(px(116), py(260), px(46) - px(0), py(104) - py(0), 5);
  const fill = 88 * snap.pressure;
  art.fillStyle(C(CAR.LAMP_OK), 0.28 + snap.pressure * 0.55);
  art.fillRect(px(123), py(354 - fill), px(32) - px(0), py(fill) - py(0));
  art.lineStyle(2, C(CAR.BRASS_MID), 0.9);
  art.strokeRoundedRect(px(116), py(260), px(46) - px(0), py(104) - py(0), 5);
  for (let i = 1; i <= 4; i += 1) {
    const y = 354 - i * 22;
    const reached = snap.pressure >= i * 0.25;
    art.lineStyle(i === 2 ? 3 : 2, C(reached ? CAR.LAMP_OK : i === 2 ? CAR.BRASS_MID : CAR.STEEL_DARK), reached ? 0.96 : 0.62);
    art.lineBetween(px(119), py(y), px(159), py(y));
  }
  const pumpDown = pressed === 'pump';
  art.fillStyle(C(CAR.BRASS_MID), 1);
  art.fillCircle(px(100), py(250), 8 * sx);
  art.lineStyle(7, C(hot('pump') ? CAR.BRASS_HI : CAR.STEEL_HI), 1);
  art.lineBetween(px(100), py(250), px(54), py(pumpDown ? 277 : 218));
  art.fillStyle(C(CAR.BRASS_MID), 1);
  art.fillCircle(px(53), py(pumpDown ? 278 : 217), 8 * sx);

  // The pneumatic line ends at the left suspension bellows, making every pump
  // stroke visibly lift one end of the same equalizer.
  art.lineStyle(5, C(CAR.LAMP_OK), 0.18 + snap.pressure * 0.68);
  art.lineBetween(px(162), py(316), px(335), py(316));
  art.lineBetween(px(335), py(316), px(335), py(292));

  const wheelActive = Boolean(snap.stageComplete || activeOutcome === 'reference-pass');
  drawWheel(art, px(382), py(385), 53 * sx, wheelActive);
  drawWheel(art, px(662), py(385), 53 * sx, wheelActive);

  const error = Math.max(-0.5, Math.min(0.5, Number(balance.error) || 0));
  const beamTilt = phaseFour ? error * 52 : 0;
  const leftBeamY = 263 + beamTilt;
  const rightBeamY = 263 - beamTilt;
  drawSpring(art, px(404), py(272 + beamTilt), py(340), Math.max(0, error), !phaseFour || balance.aligned);
  drawSpring(art, px(640), py(272 - beamTilt), py(340), Math.max(0, -error), !phaseFour || balance.aligned);

  // Full equalizing beam and central pivot. The fixed fork is the target; the
  // moving pin is attached to the beam. When geometry aligns, it locks teal.
  art.lineStyle(18, C(CAR.STEEL_DARK), 1);
  art.lineBetween(px(305), py(leftBeamY), px(735), py(rightBeamY));
  art.lineStyle(4, C(CAR.BRASS_MID), 0.82);
  art.lineBetween(px(305), py(leftBeamY - 6), px(735), py(rightBeamY - 6));
  art.fillStyle(C(CAR.ENAMEL_MID), 1);
  art.fillTriangle(px(490), py(345), px(550), py(345), px(520), py(267));
  art.fillStyle(C(CAR.BRASS_MID), 1);
  art.fillCircle(px(520), py(267), 10 * sx);

  const pinY = 205 + beamTilt * 1.25;
  art.lineStyle(balance.aligned ? 6 : 4, C(balance.aligned ? CAR.LAMP_OK : CAR.STEEL_MID), balance.aligned ? 1 : 0.78);
  art.lineBetween(px(520), py(182), px(520), py(pinY - 8));
  art.fillStyle(C(balance.aligned ? CAR.LAMP_OK : CAR.BRASS_MID), balance.aligned ? 1 : 0.9);
  art.fillCircle(px(520), py(pinY), 9 * sx);
  art.lineStyle(balance.aligned ? 5 : 3, C(balance.aligned ? CAR.LAMP_OK : CAR.BRASS_DARK), balance.aligned ? 1 : 0.74);
  art.lineBetween(px(496), py(205), px(509), py(205));
  art.lineBetween(px(531), py(205), px(544), py(205));
  art.lineBetween(px(496), py(190), px(496), py(220));
  art.lineBetween(px(544), py(190), px(544), py(220));

  // One trolley, three physical notches. Clicking the rail moves the same
  // object; it never reads as three software buttons.
  const detentX = { left: 390, center: 520, right: 650 };
  const weightX = detentX[snap.weight];
  art.lineStyle(5, C(CAR.STEEL_MID), 0.78);
  art.lineBetween(px(334), py(167), px(706), py(167));
  Object.entries(detentX).forEach(([name, x]) => {
    const id = `weight-${name}`;
    art.lineStyle(hot(id) ? 5 : 3, C(hot(id) ? CAR.BRASS_HI : CAR.BRASS_DARK), hot(id) ? 1 : 0.68);
    art.lineBetween(px(x), py(157), px(x), py(178));
  });
  art.fillStyle(C(CAR.ENAMEL_HI), 1);
  art.fillRoundedRect(px(weightX - 43), py(130), px(86) - px(0), py(42) - py(0), 5);
  art.lineStyle(3, C(CAR.STEEL_HI), 0.9);
  art.strokeRoundedRect(px(weightX - 43), py(130), px(86) - px(0), py(42) - py(0), 5);
  [-28, 28].forEach((dx) => {
    art.fillStyle(C(CAR.VOID), 1);
    art.fillCircle(px(weightX + dx), py(175), 8 * sx);
    art.lineStyle(2, C(CAR.STEEL_HI), 0.82);
    art.strokeCircle(px(weightX + dx), py(175), 8 * sx);
  });
  art.lineStyle(4, C(CAR.STEEL_MID), 0.7);
  art.lineBetween(px(weightX), py(180), px(weightX), py(218 + (weightX - 520) * -0.12));

  // Test-bearing rail and guarded release form the right end of the same rig.
  art.lineStyle(7, C(CAR.BRASS_DARK), 0.78);
  art.lineBetween(px(715), py(255), px(980), py(255));
  const releaseReady = phaseFour ? balance.launchReady : Boolean(snap.ghost?.releaseWindowActive);
  art.fillStyle(C(CAR.ENAMEL_DARK), 1);
  art.fillRoundedRect(px(760), py(300), px(80) - px(0), py(88) - py(0), 8);
  art.lineStyle(hot('release') || releaseReady ? 4 : 2, C(releaseReady ? CAR.LAMP_OK : hot('release') ? CAR.BRASS_HI : CAR.STEEL_MID), 0.95);
  art.strokeRoundedRect(px(760), py(300), px(80) - px(0), py(88) - py(0), 8);
  const capY = pressed === 'release' ? 333 : 319;
  art.fillStyle(C(releaseReady ? CAR.LAMP_OK : CAR.BRASS_MID), 1);
  art.fillRoundedRect(px(775), py(capY), px(50) - px(0), py(16) - py(0), 6);
  for (let y = capY + 19; y < 372; y += 8) {
    art.lineStyle(3, C(CAR.STEEL_HI), 0.9);
    art.lineBetween(px(782), py(y), px(818), py(y + 4));
  }

  // V adds one branch selector and one visible B contact gap to the already
  // understood calibrated rig. VI inherits the repaired route and adds only
  // the upper replay rail/cam.
  let routeY = 255;
  const bridgeVisible = snap.phase >= 5 && (snap.phase === 6 || snap.breakObserved || snap.bridgeConnected);
  if (snap.phase >= 5) {
    routeY = snap.route === 'a' ? 230 : 286;
    art.fillStyle(C(CAR.ENAMEL_DARK), 1);
    art.fillRoundedRect(px(852), py(300), px(72) - px(0), py(88) - py(0), 8);
    art.fillStyle(C(CAR.BRASS_MID), 1);
    art.fillCircle(px(872), py(344), 9 * sx);
    art.lineStyle(8, C(hot('route') ? CAR.BRASS_HI : CAR.STEEL_HI), 1);
    art.lineBetween(px(872), py(344), px(905), py(snap.route === 'a' ? 321 : 367));
    art.lineStyle(5, C(snap.route === 'a' ? CAR.LAMP_OK : CAR.BRASS_DARK), snap.route === 'a' ? 0.94 : 0.4);
    art.lineBetween(px(715), py(230), px(980), py(230));
    art.lineStyle(5, C(snap.route === 'b' ? CAR.LAMP_OK : CAR.BRASS_DARK), snap.route === 'b' ? 0.94 : 0.4);
    art.lineBetween(px(715), py(286), px(980), py(286));
  }

  if (bridgeVisible) {
    [900, 948].forEach((x) => {
      art.fillStyle(C(CAR.ENAMEL_HI), 1);
      art.fillRoundedRect(px(x - 9), py(268), px(18) - px(0), py(36) - py(0), 4);
      art.fillStyle(C(CAR.BRASS_MID), 1);
      art.fillCircle(px(x), py(286), 5 * sx);
    });
    if (snap.bridgeConnected) {
      art.lineStyle(7, C(hot('bridge') ? CAR.BRASS_HI : CAR.BRASS_MID), 1);
      art.lineBetween(px(900), py(286), px(948), py(286));
    } else {
      art.lineStyle(7, C(hot('bridge') ? CAR.BRASS_HI : CAR.BRASS_MID), 1);
      art.lineBetween(px(948), py(293), px(926), py(326));
      art.fillStyle(C(CAR.LAMP_ALERT), 0.7 + (snap.breakObserved ? pulse * 0.28 : 0));
      art.fillCircle(px(924), py(286), 6 * sx);
    }
  }

  panel.outputA?.setPosition(px(984), py(snap.phase >= 5 ? 230 : 255)).setVisible(true)
    .setTint(C(snap.stageComplete && snap.route === 'a' ? CAR.LAMP_OK : CAR.BRASS_MID))
    .setScale(3.1 * sx).setRotation(snap.stageComplete && snap.route === 'a' ? now / 260 : 0);
  panel.outputB?.setPosition(px(984), py(286)).setVisible(snap.phase >= 5)
    .setTint(C(snap.stageComplete && snap.route === 'b' ? CAR.LAMP_OK : CAR.STEEL_MID))
    .setScale(3.1 * sx).setRotation(snap.stageComplete && snap.route === 'b' ? now / 260 : 0);

  const progress = snap.bearing?.progress ?? 0;
  let end = { x: 984, y: snap.phase >= 5 ? routeY : 255 };
  if (activeOutcome === 'underpowered') end = { x: 748, y: 255 };
  if (activeOutcome === 'misweighted') end = { x: 520, y: 330 };
  if (['open-contact', 'no-reference'].includes(activeOutcome)) end = { x: 924, y: 286 };
  if (['mistimed', 'misrouted'].includes(activeOutcome)) end = { x: 950, y: 410 };
  panel.bearing?.setPosition(px(LERP(710, end.x, progress)), py(LERP(255, end.y, progress)))
    .setVisible(Boolean(snap.bearing)).setScale(1.65 * sx).setRotation(now / 95)
    .setTint(C(activeOutcome === 'phase-complete' ? CAR.LAMP_OK : CAR.BRASS_HI));

  if (snap.lastObservation && !snap.bearing && snap.lastObservation !== 'phase-complete') {
    const mark = snap.lastObservation === 'underpowered' ? { x: 748, y: 255 }
      : snap.lastObservation === 'misweighted' ? { x: 520, y: 330 }
        : ['open-contact', 'no-reference'].includes(snap.lastObservation) ? { x: 924, y: 286 }
          : { x: 950, y: 410 };
    art.lineStyle(2, C(snap.lastObservation === 'open-contact' ? CAR.LAMP_ALERT : CAR.BRASS_DARK), 0.5);
    art.strokeCircle(px(mark.x), py(mark.y), 14 * sx);
  }

  if (snap.ghost) {
    art.lineStyle(3, C(CAR.LAMP_OK), 0.3);
    art.lineBetween(px(310), py(115), px(960), py(115));
    const gx = LERP(310, 960, snap.ghost.progress);
    panel.ghostBearing?.setPosition(px(gx), py(115)).setVisible(true)
      .setScale(1.45 * sx).setAlpha(snap.ghost.windowActive ? 0.95 : 0.44).setRotation(-now / 120);
    const camX = LERP(310, 960, snap.ghost.releaseProgress);
    art.lineStyle(snap.ghost.releaseWindowActive ? 5 : 3, C(snap.ghost.releaseWindowActive ? CAR.LAMP_OK : CAR.BRASS_DARK), snap.ghost.releaseWindowActive ? 1 : 0.55);
    art.lineBetween(px(camX - 14), py(101), px(camX - 14), py(129));
    art.lineBetween(px(camX + 14), py(101), px(camX + 14), py(129));
  } else panel.ghostBearing?.setVisible(false);

  setText(panel.partTexts.reference, 'AIR CHARGE', px(138), py(412));
  setText(panel.partTexts.isolate, phaseFour && balance.aligned ? 'PIN ALIGNED' : 'EQUALIZER', px(520), py(365), phaseFour && balance.aligned ? '#75d4cd' : '#687981');
  setText(panel.partTexts.test, 'RELEASE', px(800), py(407), releaseReady ? '#75d4cd' : '#687981');
  setText(panel.partTexts.gauge, snap.phase >= 5 ? `TEST ROUTE ${snap.route.toUpperCase()}` : '', px(888), py(407), '#9fb7c0', snap.phase >= 5);

  panel.status.setText(RESULT_COPY[activeOutcome] ?? '').setPosition(left + width / 2, py(111))
    .setFontSize('11px')
    .setColor(activeOutcome && !['phase-complete', 'reference-pass'].includes(activeOutcome) ? '#e45a5f' : '#9ce8e2');

  const hits = [
    { id: 'close', x: px(1012), y: py(90), w: 50 * sx, h: 50 * sy },
    { id: 'pump', x: px(38), y: py(196), w: 166 * sx, h: 210 * sy },
    { id: 'release', x: px(748), y: py(288), w: 104 * sx, h: 112 * sy },
    { id: 'weight-left', x: px(326), y: py(122), w: 128 * sx, h: 98 * sy },
    { id: 'weight-center', x: px(456), y: py(122), w: 128 * sx, h: 98 * sy },
    { id: 'weight-right', x: px(586), y: py(122), w: 128 * sx, h: 98 * sy },
  ];
  if (snap.phase >= 5) hits.push({ id: 'route', x: px(842), y: py(294), w: 92 * sx, h: 102 * sy });
  if (bridgeVisible) hits.push({ id: 'bridge', x: px(884), y: py(258), w: 82 * sx, h: 82 * sy });
  drawClose(art, px, py, hot('close'));
  return hits;
}
